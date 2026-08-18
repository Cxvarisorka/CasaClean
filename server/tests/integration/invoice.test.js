// Invoicing — end to end.
//
// Covers the promise the feature makes: every successful payment produces
// exactly one numbered invoice, the customer is emailed it with the PDF
// attached, and the panel can download the identical document. Also pins the
// two things that would quietly cost money or leak data if they broke —
// idempotency across the finalize/webhook race, and cross-customer access.

const {
  api,
  stripeMock,
  sendEmailMock,
  customerEmails,
  waitForCustomerEmails
} = require('../setup/testEnv');
const {
  createUser,
  createAdmin,
  cookieFor,
  createCity,
  createService,
  createSpecialRequest,
  createPaidBooking,
  validBookingBody,
  dateTimeIn
} = require('../setup/fixtures');

const Booking = require('../../models/booking.model');
const Invoice = require('../../models/invoice.model');
const Counter = require('../../models/counter.model');
const {
  issueInvoiceForBooking,
  markInvoiceRefunded
} = require('../../services/invoice.service');

/**
 * Drive the online payment flow to a captured charge: a Stripe customer, and a
 * PaymentIntent that both creates and retrieves as already succeeded (so the
 * finalize endpoint promotes the draft into a paid Booking).
 */
const mockPaidIntent = (id = 'pi_test_invoice_1') => {
  stripeMock.customers.create.mockResolvedValue({ id: 'cus_test_invoice' });
  const intent = (params = {}) => ({
    id,
    client_secret: `${id}_secret`,
    status: 'succeeded',
    amount: params.amount ?? 4000,
    customer: params.customer ?? 'cus_test_invoice',
    payment_method: 'pm_test_invoice'
  });
  stripeMock.paymentIntents.create.mockImplementation(async (params) => intent(params));
  stripeMock.paymentIntents.retrieve.mockImplementation(async () => intent());
};

describe('invoice issuing', () => {
  it('numbers invoices sequentially within the year series', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);

    const first = await createPaidBooking(user, service, city);
    const second = await createPaidBooking(user, service, city);

    const a = await issueInvoiceForBooking(first._id);
    const b = await issueInvoiceForBooking(second._id);

    const year = String(new Date().getUTCFullYear());
    expect(a.number).toBe(`CC-${year}-000001`);
    expect(b.number).toBe(`CC-${year}-000002`);
    expect(a.series).toBe(year);
    expect(b.sequence).toBe(2);
  });

  it('is idempotent — a second issue returns the same invoice and burns no number', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city);

    const first = await issueInvoiceForBooking(booking._id);
    const again = await issueInvoiceForBooking(booking._id);

    expect(String(again._id)).toBe(String(first._id));
    expect(again.number).toBe(first.number);
    expect(await Invoice.countDocuments({ booking: booking._id })).toBe(1);
  });

  it('survives a concurrent double-issue (the finalize/webhook race)', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city);

    const [a, b] = await Promise.all([
      issueInvoiceForBooking(booking._id),
      issueInvoiceForBooking(booking._id)
    ]);

    expect(String(a._id)).toBe(String(b._id));
    expect(await Invoice.countDocuments({ booking: booking._id })).toBe(1);
  });

  it('refuses to invoice a booking that was never paid', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city, {
      paymentStatus: 'unpaid',
      paidAt: undefined,
      amountPaid: undefined
    });

    await expect(issueInvoiceForBooking(booking._id)).rejects.toMatchObject({
      statusCode: 400
    });
    expect(await Invoice.countDocuments({})).toBe(0);
  });

  it('itemises the booking so the lines reconcile to the amount charged', async () => {
    const [user, city, addOn] = await Promise.all([
      createUser(),
      createCity(),
      createSpecialRequest({ name: 'Fridge cleaning', price: 15 })
    ]);
    const service = await createService({ name: 'Deep cleaning', pricePerHour: 20 });

    // 20/h x 3h x 2 cleaners = 120, + 15 add-on = 135.
    const booking = await createPaidBooking(user, service, city, {
      durationMinutes: 180,
      cleaners: 2,
      totalAmount: 135,
      amountPaid: 135,
      specialRequests: [addOn._id]
    });

    const invoice = await issueInvoiceForBooking(booking._id);

    expect(invoice.lineItems).toHaveLength(2);
    // One unit at the whole labour charge: a duration is an exact number of
    // minutes, so cleaner-hours is no longer a whole quantity and a qty × unit
    // pair built from it wouldn't multiply back to the amount. The length and
    // crew that produced the figure are stated in `detail` instead.
    expect(invoice.lineItems[0]).toMatchObject({
      description: 'Deep cleaning',
      detail: '3 h × 2 cleaners',
      quantity: 1,
      unitPrice: 120,
      amount: 120
    });
    expect(invoice.lineItems[1]).toMatchObject({ description: 'Fridge cleaning', amount: 15 });

    const sum = invoice.lineItems.reduce((total, item) => total + item.amount, 0);
    expect(sum).toBe(invoice.total);
    expect(invoice.total).toBe(135);
  });

  it('snapshots the customer and service, so later catalogue edits never restate it', async () => {
    const [user, city] = await Promise.all([createUser(), createCity({ name: 'Milano' })]);
    const service = await createService({ name: 'Deep cleaning' });
    const booking = await createPaidBooking(user, service, city);

    const invoice = await issueInvoiceForBooking(booking._id);

    // Rename the service AFTER issuing — the document must not follow.
    service.name = 'Renamed service';
    await service.save();

    const stored = await Invoice.findById(invoice._id).lean();
    expect(stored.service.name).toBe('Deep cleaning');
    expect(stored.service.city).toBe('Milano');
    expect(stored.customer.name).toBe(user.fullname);
    expect(stored.customer.email).toBe(user.email);
  });

  it('splits a legacy booking inclusively rather than inventing a higher total', async () => {
    const previous = process.env.INVOICE_VAT_RATE;
    process.env.INVOICE_VAT_RATE = '22';
    try {
      const [user, city, service] = await Promise.all([
        createUser(),
        createCity(),
        createService()
      ]);
      const booking = await createPaidBooking(user, service, city, {
        totalAmount: 120,
        amountPaid: 120
      });

      const invoice = await issueInvoiceForBooking(booking._id);

      // This booking carries no `tax` snapshot, so it predates VAT handling: the
      // €120 was already collected and the invoice has to document THAT amount,
      // deriving the net out of it. A priced booking adds the VAT on top instead
      // (see tax.test.js) — here there is nothing left to charge.
      expect(invoice.total).toBe(120);
      expect(invoice.vatRate).toBe(22);
      expect(invoice.subtotal).toBe(98.36);
      expect(invoice.vatAmount).toBe(21.64);
    } finally {
      if (previous === undefined) delete process.env.INVOICE_VAT_RATE;
      else process.env.INVOICE_VAT_RATE = previous;
    }
  });
});

describe('invoice delivery after payment', () => {
  it('emails the customer one invoice email with the PDF attached', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const cookie = cookieFor(user);

    mockPaidIntent();

    const intent = await api
      .post('/api/v1/payment/booking/intent')
      .set('Cookie', cookie)
      .send(validBookingBody(service, city));
    expect(intent.status).toBe(201);

    const finalize = await api
      .post('/api/v1/payment/booking/finalize')
      .set('Cookie', cookie)
      .send({ paymentIntentId: intent.body.data.paymentIntentId });
    expect(finalize.status).toBe(201);

    // The invoice is delivered fire-and-forget so the Stripe webhook is never
    // held up by SMTP — wait for the dispatch instead of racing it.
    const [sent] = await waitForCustomerEmails(1);

    const invoice = await Invoice.findOne({ booking: finalize.body.data.booking._id });
    expect(invoice).toBeTruthy();

    // Exactly one email to the customer — a confirmation plus a near-identical
    // receipt would read as a glitch. (The team's internal booking alert is a
    // separate audience and is asserted in adminBookingAlert.test.js.)
    expect(customerEmails()).toHaveLength(1);
    expect(sent.email).toBe(user.email);
    expect(sent.subject).toContain(invoice.number);
    expect(sent.attachments).toHaveLength(1);
    expect(sent.attachments[0].contentType).toBe('application/pdf');
    expect(sent.attachments[0].filename).toBe(`invoice-${invoice.number}.pdf`);
    // A real PDF, not an empty buffer.
    expect(sent.attachments[0].content.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('still confirms the booking by email when invoicing fails', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const cookie = cookieFor(user);

    mockPaidIntent();
    // Break numbering — the paid booking must still be acknowledged.
    const spy = jest
      .spyOn(Counter, 'next')
      .mockRejectedValue(new Error('counter unavailable'));

    try {
      const intent = await api
        .post('/api/v1/payment/booking/intent')
        .set('Cookie', cookie)
        .send(validBookingBody(service, city));
      const finalize = await api
        .post('/api/v1/payment/booking/finalize')
        .set('Cookie', cookie)
        .send({ paymentIntentId: intent.body.data.paymentIntentId });

      expect(finalize.status).toBe(201);
      const [sent] = await waitForCustomerEmails(1);

      expect(await Invoice.countDocuments({})).toBe(0);
      // Fell back to the plain confirmation email — never silence.
      expect(customerEmails()).toHaveLength(1);
      expect(sent.email).toBe(user.email);
      expect(sent.subject).toContain('confirmed');
      expect(sent.attachments).toBeUndefined();
    } finally {
      spy.mockRestore();
    }
  });

  it('marks the invoice refunded when the booking is cancelled and refunded', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city);
    const invoice = await issueInvoiceForBooking(booking._id);
    expect(invoice.status).toBe('issued');

    const refundedAt = new Date();
    await markInvoiceRefunded(booking._id, refundedAt);

    const stored = await Invoice.findById(invoice._id).lean();
    expect(stored.status).toBe('refunded');
    expect(new Date(stored.refundedAt).getTime()).toBe(refundedAt.getTime());

    // Re-applying is a no-op, so a duplicate Stripe delivery can't restamp it.
    const second = await markInvoiceRefunded(booking._id, new Date(Date.now() + 60_000));
    expect(second).toBeNull();
  });

  it('leaves the invoice issued when a late cancellation kept the one-hour fee', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    // 2h ahead: inside the window, so €20 of the €40 charge comes back and €20
    // is kept. The invoice documents money that WAS charged and kept, so
    // stamping it 'refunded' would misstate it.
    const booking = await createPaidBooking(user, service, city, {
      bookingDate: dateTimeIn(2).bookingDate,
      bookingTime: dateTimeIn(2).bookingTime
    });
    const invoice = await issueInvoiceForBooking(booking._id);
    stripeMock.refunds.create.mockResolvedValue({ id: 're_invoice_partial' });

    const res = await api
      .patch(`/api/v1/booking/${booking._id}/cancel`)
      .set('Cookie', cookieFor(user));
    expect(res.status).toBe(200);
    expect((await Booking.findById(booking._id)).paymentStatus).toBe('partially-refunded');

    expect((await Invoice.findById(invoice._id).lean()).status).toBe('issued');
  });

  it('can still issue an invoice for a partially refunded booking', async () => {
    const [user, city, service] = await Promise.all([
      createUser(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city, {
      paymentStatus: 'partially-refunded',
      refundAmount: 20,
      refundedAt: new Date()
    });

    const invoice = await issueInvoiceForBooking(booking._id);
    // Money was charged and partly kept, so the document stands as issued.
    expect(invoice.status).toBe('issued');
    expect(invoice.total).toBe(40);
  });
});

describe('invoice endpoints', () => {
  const setup = async () => {
    const [user, admin, city, service] = await Promise.all([
      createUser(),
      createAdmin(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city);
    const invoice = await issueInvoiceForBooking(booking._id);
    return { user, admin, city, service, booking, invoice };
  };

  it('lets the owner list and read their own invoices', async () => {
    const { user, invoice } = await setup();

    const list = await api.get('/api/v1/invoice/my').set('Cookie', cookieFor(user));
    expect(list.status).toBe(200);
    expect(list.body.invoiceCount).toBe(1);
    expect(list.body.data.invoices[0].number).toBe(invoice.number);

    const one = await api
      .get(`/api/v1/invoice/${invoice._id}`)
      .set('Cookie', cookieFor(user));
    expect(one.status).toBe(200);
    expect(one.body.data.invoice.number).toBe(invoice.number);
  });

  it("hides another customer's invoice behind a 404, not a 403", async () => {
    const { invoice } = await setup();
    const stranger = await createUser();

    const one = await api
      .get(`/api/v1/invoice/${invoice._id}`)
      .set('Cookie', cookieFor(stranger));
    expect(one.status).toBe(404);

    const pdf = await api
      .get(`/api/v1/invoice/${invoice._id}/pdf`)
      .set('Cookie', cookieFor(stranger));
    expect(pdf.status).toBe(404);

    // And their own list stays empty.
    const list = await api.get('/api/v1/invoice/my').set('Cookie', cookieFor(stranger));
    expect(list.body.data.invoices).toHaveLength(0);
  });

  it('requires authentication, and the admin list requires the admin role', async () => {
    const { user, invoice } = await setup();

    expect((await api.get(`/api/v1/invoice/${invoice._id}`)).status).toBe(401);
    expect((await api.get('/api/v1/invoice')).status).toBe(401);
    expect((await api.get('/api/v1/invoice').set('Cookie', cookieFor(user))).status).toBe(403);
  });

  it('downloads the PDF as an attachment named after the invoice', async () => {
    const { admin, invoice } = await setup();

    const res = await api
      .get(`/api/v1/invoice/${invoice._id}/pdf`)
      .set('Cookie', cookieFor(admin));

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(
      `attachment; filename="invoice-${invoice.number}.pdf"`
    );
    // Never cached by a shared proxy.
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('lets an admin issue an invoice for a booking that never got one', async () => {
    const [user, admin, city, service] = await Promise.all([
      createUser(),
      createAdmin(),
      createCity(),
      createService()
    ]);
    // A manual/offline booking an admin entered — real work, still needs a document.
    const booking = await createPaidBooking(user, service, city, {
      paymentMethod: 'manual',
      paymentStatus: 'manual',
      paymentIntentId: undefined
    });

    const res = await api
      .post(`/api/v1/invoice/booking/${booking._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ send: false });

    expect(res.status).toBe(201);
    expect(res.body.data.invoice.paymentMethod).toBe('manual');
    // send:false means no customer email went out.
    expect(sendEmailMock).not.toHaveBeenCalled();

    // Re-issuing is idempotent and reports it.
    const again = await api
      .post(`/api/v1/invoice/booking/${booking._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ send: false });
    expect(again.status).toBe(200);
    expect(again.body.data.invoice.number).toBe(res.body.data.invoice.number);
    expect(await Invoice.countDocuments({ booking: booking._id })).toBe(1);
  });

  it('resends an invoice on demand and records the delivery', async () => {
    const { admin, invoice } = await setup();

    const res = await api
      .post(`/api/v1/invoice/${invoice._id}/send`)
      .set('Cookie', cookieFor(admin))
      .send({});

    expect(res.status).toBe(200);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    const stored = await Invoice.findById(invoice._id).lean();
    expect(stored.emailCount).toBe(1);
    expect(stored.emailedTo).toBe(stored.customer.email);
    expect(stored.emailedAt).toBeTruthy();
  });

  it('reports a failed resend instead of claiming success', async () => {
    const { admin, invoice } = await setup();
    sendEmailMock.mockRejectedValueOnce(new Error('SMTP is down'));

    const res = await api
      .post(`/api/v1/invoice/${invoice._id}/send`)
      .set('Cookie', cookieFor(admin))
      .send({});

    expect(res.status).toBe(502);
    expect(res.body.message).toContain('SMTP is down');

    const stored = await Invoice.findById(invoice._id).lean();
    expect(stored.emailCount).toBe(0);
  });

  it('rejects a resend body trying to redirect the email elsewhere', async () => {
    const { admin, invoice } = await setup();

    const res = await api
      .post(`/api/v1/invoice/${invoice._id}/send`)
      .set('Cookie', cookieFor(admin))
      .send({ email: 'attacker@example.com' });

    expect(res.status).toBe(400);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('never exposes an invoice as editable — there is no update route', async () => {
    const { admin, invoice } = await setup();

    const res = await api
      .patch(`/api/v1/invoice/${invoice._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ total: 1 });
    expect(res.status).toBe(404);

    const stored = await Booking.findById(invoice.booking).lean();
    expect(stored).toBeTruthy();
  });
});

// Deleting an invoice is the one destructive operation on this model, so the
// tests pin exactly what it may and may not touch: only an admin reaches it, the
// booking it billed survives, and the number it burns is never handed out again.
describe('invoice deletion', () => {
  const setup = async () => {
    const [user, admin, city, service] = await Promise.all([
      createUser(),
      createAdmin(),
      createCity(),
      createService()
    ]);
    const booking = await createPaidBooking(user, service, city);
    const invoice = await issueInvoiceForBooking(booking._id);
    return { user, admin, booking, invoice, service, city };
  };

  it('lets an admin delete an invoice without touching the booking it billed', async () => {
    const { admin, booking, invoice } = await setup();

    const res = await api
      .delete(`/api/v1/invoice/${invoice._id}`)
      .set('Cookie', cookieFor(admin));

    expect(res.status).toBe(200);
    expect(await Invoice.findById(invoice._id)).toBeNull();

    // The money and the reservation are unaffected — this removes a document,
    // not a payment.
    const stored = await Booking.findById(booking._id).lean();
    expect(stored).toBeTruthy();
    expect(stored.paymentStatus).toBe('paid');
    expect(stored.status).toBe('confirmed');
  });

  it('refuses a customer deleting the record of their own charge', async () => {
    const { user, invoice } = await setup();

    const res = await api
      .delete(`/api/v1/invoice/${invoice._id}`)
      .set('Cookie', cookieFor(user));

    // Owner access covers reading and downloading; deleting is admin-only, so
    // this is a 403 from restrictTo rather than the read path's 404.
    expect(res.status).toBe(403);
    expect(await Invoice.findById(invoice._id)).toBeTruthy();
  });

  it('refuses an unauthenticated delete', async () => {
    const { invoice } = await setup();

    const res = await api.delete(`/api/v1/invoice/${invoice._id}`);
    expect(res.status).toBe(401);
    expect(await Invoice.findById(invoice._id)).toBeTruthy();
  });

  it('404s on an unknown or malformed id rather than throwing a CastError', async () => {
    const { admin } = await setup();

    const missing = await api
      .delete('/api/v1/invoice/64b7f2c1e4b0a1a2b3c4d5e6')
      .set('Cookie', cookieFor(admin));
    expect(missing.status).toBe(404);

    const malformed = await api
      .delete('/api/v1/invoice/not-an-object-id')
      .set('Cookie', cookieFor(admin));
    expect(malformed.status).toBe(404);
  });

  it('frees the booking to be re-invoiced, on a fresh number', async () => {
    const { admin, booking, invoice } = await setup();
    const year = String(new Date().getUTCFullYear());

    await api.delete(`/api/v1/invoice/${invoice._id}`).set('Cookie', cookieFor(admin));

    // The unique `booking` index no longer blocks issuing, which is the repair
    // path this endpoint exists for.
    const res = await api
      .post(`/api/v1/invoice/booking/${booking._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ send: false });

    expect(res.status).toBe(201);
    // The counter never rewinds: the deleted number is gone from the series for
    // good rather than being reused by a different document.
    expect(res.body.data.invoice.number).not.toBe(invoice.number);
    expect(invoice.number).toBe(`CC-${year}-000001`);
    expect(res.body.data.invoice.number).toBe(`CC-${year}-000002`);
    expect(await Counter.findById(`invoice:${year}`).lean()).toMatchObject({ seq: 2 });
  });
});
