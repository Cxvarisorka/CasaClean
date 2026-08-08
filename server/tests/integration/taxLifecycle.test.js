// VAT treatment across a customer's whole lifecycle.
//
// tax.test.js proves the rule at a single point in time. This suite proves it
// stays correct as the customer's status MOVES: a number is registered, VIES
// answers, the registration is dropped, Stripe deletes it, a webhook is missed
// and pulled in by the backstop. The price the customer is charged has to
// follow every one of those transitions, in both directions.
//
// The reference figures throughout are the ones the product is specified in:
// a €120 net catalogue booking, which anything other than a stored,
// Stripe-verified number pays as €146.40 (120 x 1.22). A verified business pays
// the catalogue €120 and accounts for the VAT itself.

const { api, stripeMock } = require('../setup/testEnv');
const {
  createUser,
  createAdmin,
  cookieFor,
  createCity,
  createService,
  validBookingBody
} = require('../setup/fixtures');

const User = require('../../models/user.model');
const Booking = require('../../models/booking.model');

const VAT_RATE = '22';
// A €120 net catalogue booking: 60/h x 2h x 1 cleaner.
const CATALOGUE = 120;
// What that costs once VAT is added on top — the price everyone but a verified
// business pays.
const WITH_VAT = 146.4;

let previousRate;
beforeAll(() => {
  previousRate = process.env.INVOICE_VAT_RATE;
  process.env.INVOICE_VAT_RATE = VAT_RATE;
});
afterAll(() => {
  if (previousRate === undefined) delete process.env.INVOICE_VAT_RATE;
  else process.env.INVOICE_VAT_RATE = previousRate;
});

/**
 * Stripe stand-ins for the on-session payment flow. `retrieve` echoes back the
 * customer `create` was handed, because finalize checks that the intent belongs
 * to the caller.
 */
const mockPaidIntent = (id = 'pi_lifecycle_1') => {
  stripeMock.customers.create.mockResolvedValue({ id: 'cus_lifecycle' });

  let created = {};
  const intent = (params = {}) => ({
    id,
    client_secret: `${id}_secret`,
    status: 'succeeded',
    amount: params.amount ?? created.amount ?? 0,
    customer: params.customer ?? created.customer ?? 'cus_lifecycle',
    payment_method: 'pm_lifecycle'
  });
  stripeMock.paymentIntents.create.mockImplementation(async (params) => {
    created = intent(params);
    return created;
  });
  stripeMock.paymentIntents.retrieve.mockImplementation(async () => intent());
};

/** What Stripe would actually be asked to charge for this customer, in euros. */
const quotedAmount = async (user, service, city) => {
  const res = await api
    .post('/api/v1/payment/booking/intent')
    .set('Cookie', cookieFor(user))
    .send(validBookingBody(service, city));
  expect(res.status).toBe(201);
  return res.body.data.amount;
};

const deliverWebhook = async (type, object) => {
  const payload = JSON.stringify({
    id: `evt_${type}_${Date.now()}_${Math.random()}`,
    object: 'event',
    type,
    data: { object }
  });
  const signature = stripeMock.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET
  });
  return api
    .post('/webhooks/stripe')
    .set('stripe-signature', signature)
    .set('content-type', 'application/json')
    .send(payload);
};

describe('what each VAT state is charged', () => {
  // Every state a User can be in, and the price it must produce. Only the last
  // row earns the reverse charge; everything else pays the catalogue price.
  const cases = [
    ['a private individual', {}, WITH_VAT],
    [
      'a business that has not entered a number yet',
      { customerType: 'business', companyName: 'No Number Srl', vatStatus: 'none' },
      WITH_VAT
    ],
    [
      'a business whose number is still pending at VIES',
      {
        customerType: 'business',
        companyName: 'Pending Srl',
        vatNumber: 'IT01234567890',
        vatStatus: 'pending'
      },
      WITH_VAT
    ],
    [
      'a business whose number VIES rejected',
      {
        customerType: 'business',
        companyName: 'Rejected Srl',
        vatNumber: 'IT01234567890',
        vatStatus: 'unverified'
      },
      WITH_VAT
    ],
    [
      // The dangerous shape: the status field says verified but there is no
      // number behind it. qualifiesForReverseCharge requires all three facts.
      'a business marked verified with no number on file',
      { customerType: 'business', companyName: 'Hollow Srl', vatStatus: 'verified' },
      WITH_VAT
    ],
    [
      // An individual can't carry a verified number in practice, but if one is
      // ever written directly it must not earn relief either.
      'an individual carrying a verified number',
      { customerType: 'individual', vatNumber: 'IT09876543210', vatStatus: 'verified' },
      WITH_VAT
    ],
    [
      'a business with a Stripe-verified number',
      {
        customerType: 'business',
        companyName: 'Bianchi Uffici Srl',
        vatNumber: 'IT09876543210',
        vatStatus: 'verified'
      },
      CATALOGUE
    ]
  ];

  it.each(cases)('charges %s €%s', async (_label, profile, expected) => {
    const [user, city] = await Promise.all([createUser(profile), createCity()]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();

    expect(await quotedAmount(user, service, city)).toBe(expected);
  });

  it('asks Stripe for the relieved amount, not the taxed price with a note', async () => {
    const [user, city] = await Promise.all([
      createUser({
        customerType: 'business',
        companyName: 'Bianchi Uffici Srl',
        vatNumber: 'IT09876543210',
        vatStatus: 'verified'
      }),
      createCity()
    ]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();

    await quotedAmount(user, service, city);

    // 120.00 EUR in minor units, not 146.40. The relief happens at the charge.
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 12000, currency: 'eur' })
    );
  });
});

describe('gaining the reverse charge', () => {
  it('takes effect only once the VIES webhook lands, not when the number is submitted', async () => {
    const [user, city] = await Promise.all([createUser(), createCity()]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_gaining' });
    stripeMock.customers.createTaxId.mockResolvedValue({
      id: 'txi_gaining',
      type: 'eu_vat',
      value: 'IT09876543210',
      verification: { status: 'pending' }
    });

    await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', companyName: 'Acme Srl', vatNumber: 'IT09876543210' });

    // Submitted but unverified — still the full catalogue price.
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);

    await deliverWebhook('customer.tax_id.updated', {
      id: 'txi_gaining',
      verification: { status: 'verified' }
    });

    // VIES has answered; the next booking carries no VAT.
    expect(await quotedAmount(user, service, city)).toBe(CATALOGUE);
  });

  it('applies relief through the refresh backstop when the webhook never arrives', async () => {
    const [user, city] = await Promise.all([
      createUser({
        customerType: 'business',
        companyName: 'Missed Webhook Srl',
        vatNumber: 'IT09876543210',
        vatStatus: 'pending',
        stripeTaxIdId: 'txi_missed',
        stripeCustomerId: 'cus_missed'
      }),
      createCity()
    ]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();

    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);

    stripeMock.customers.retrieveTaxId.mockResolvedValue({
      id: 'txi_missed',
      verification: { status: 'verified' }
    });
    const refreshed = await api
      .post('/api/v1/auth/me/tax-profile/refresh')
      .set('Cookie', cookieFor(user))
      .send({});

    expect(refreshed.status).toBe(200);
    expect((await User.findById(user._id).lean()).vatStatus).toBe('verified');
    expect(await quotedAmount(user, service, city)).toBe(CATALOGUE);
  });

  it('never grants relief from an unreachable VIES, however the answer arrives', async () => {
    const [user, city] = await Promise.all([
      createUser({
        customerType: 'business',
        vatNumber: 'IT09876543210',
        vatStatus: 'pending',
        stripeTaxIdId: 'txi_unavailable',
        stripeCustomerId: 'cus_unavailable'
      }),
      createCity()
    ]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();

    stripeMock.customers.retrieveTaxId.mockResolvedValue({
      id: 'txi_unavailable',
      verification: { status: 'unavailable' }
    });
    await api
      .post('/api/v1/auth/me/tax-profile/refresh')
      .set('Cookie', cookieFor(user))
      .send({});

    expect((await User.findById(user._id).lean()).vatStatus).toBe('unverified');
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);
  });
});

describe('losing the reverse charge restores the catalogue price', () => {
  /** A user already carrying a Stripe-verified VAT number. */
  const verifiedBusiness = () =>
    createUser({
      customerType: 'business',
      companyName: 'Bianchi Uffici Srl',
      vatNumber: 'IT09876543210',
      vatStatus: 'verified',
      stripeTaxIdId: 'txi_verified_life',
      stripeCustomerId: 'cus_verified_life'
    });

  it('when the customer switches back to a personal account', async () => {
    const [user, city] = await Promise.all([verifiedBusiness(), createCity()]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();
    stripeMock.customers.deleteTaxId.mockResolvedValue({ deleted: true });

    expect(await quotedAmount(user, service, city)).toBe(CATALOGUE);

    await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'individual' });

    // The registration is gone from Stripe too, not just from our copy —
    // otherwise flipping the type back would silently restore the relief.
    expect(stripeMock.customers.deleteTaxId).toHaveBeenCalledWith(
      'cus_verified_life',
      'txi_verified_life'
    );
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);
  });

  it('when the customer clears the number but stays a business', async () => {
    const [user, city] = await Promise.all([verifiedBusiness(), createCity()]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();
    stripeMock.customers.deleteTaxId.mockResolvedValue({ deleted: true });

    await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', vatNumber: '' });

    const stored = await User.findById(user._id).lean();
    expect(stored.customerType).toBe('business');
    expect(stored.vatStatus).toBe('none');
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);
  });

  it('when VIES later invalidates a number that was verified', async () => {
    const [user, city] = await Promise.all([verifiedBusiness(), createCity()]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();

    expect(await quotedAmount(user, service, city)).toBe(CATALOGUE);

    // A registration can lapse; Stripe re-reports it.
    await deliverWebhook('customer.tax_id.updated', {
      id: 'txi_verified_life',
      verification: { status: 'unverified' }
    });

    expect((await User.findById(user._id).lean()).vatStatus).toBe('unverified');
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);
  });

  it('when the tax id is deleted on Stripe', async () => {
    const [user, city] = await Promise.all([verifiedBusiness(), createCity()]);
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();

    await deliverWebhook('customer.tax_id.deleted', { id: 'txi_verified_life' });

    const stored = await User.findById(user._id).lean();
    expect(stored.vatNumber).toBe('');
    expect(stored.vatStatus).toBe('none');
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);
  });

  it('replacing a verified number with a different one drops back to pending', async () => {
    const user = await verifiedBusiness();
    const city = await createCity();
    const service = await createService({ pricePerHour: 60 });
    mockPaidIntent();
    stripeMock.customers.deleteTaxId.mockResolvedValue({ deleted: true });
    stripeMock.customers.createTaxId.mockResolvedValue({
      id: 'txi_replacement',
      type: 'eu_vat',
      value: 'IT11112222333',
      verification: { status: 'pending' }
    });

    await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', vatNumber: 'IT11112222333' });

    const stored = await User.findById(user._id).lean();
    expect(stored.vatStatus).toBe('pending');
    // The new number has to earn its own verification — relief does not carry
    // over from the number it replaced.
    expect(await quotedAmount(user, service, city)).toBe(WITH_VAT);
  });
});

describe('GET /auth/me reports the treatment the wizard will be charged', () => {
  it('tells an individual it pays the catalogue price', async () => {
    const user = await createUser();

    const res = await api.get('/api/v1/auth/me').set('Cookie', cookieFor(user));

    expect(res.status).toBe(200);
    expect(res.body.data.tax).toMatchObject({
      treatment: 'standard',
      reverseCharge: false,
      vatRate: 22,
      catalogueVatRate: 22
    });
  });

  it('tells a verified business no VAT will be added', async () => {
    const user = await createUser({
      customerType: 'business',
      companyName: 'Bianchi Uffici Srl',
      vatNumber: 'IT09876543210',
      vatStatus: 'verified'
    });

    const res = await api.get('/api/v1/auth/me').set('Cookie', cookieFor(user));

    expect(res.body.data.tax).toMatchObject({
      treatment: 'reverse-charge',
      reverseCharge: true,
      vatRate: 0,
      // Still reported, so the wizard can show the rate that was relieved.
      catalogueVatRate: 22
    });
  });

  it('still says standard while verification is pending', async () => {
    const user = await createUser({
      customerType: 'business',
      vatNumber: 'IT01234567890',
      vatStatus: 'pending'
    });

    const res = await api.get('/api/v1/auth/me').set('Cookie', cookieFor(user));

    expect(res.body.data.tax.reverseCharge).toBe(false);
    expect(res.body.data.tax.vatRate).toBe(22);
  });

  it('never leaks a vatStatus a request tried to set', async () => {
    const user = await createUser({ customerType: 'business', vatNumber: 'IT09876543210' });

    const res = await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', vatStatus: 'verified' });

    // The schema is .strict() and has no vatStatus field at all.
    expect(res.status).toBe(400);
    expect((await User.findById(user._id).lean()).vatStatus).not.toBe('verified');
  });
});

describe('an admin edit re-prices on the booking’s OWN treatment', () => {
  const bookingFor = (user, service, city, tax, totalAmount) =>
    Booking.create({
      user: user._id,
      serviceId: service._id,
      cityId: city._id,
      customerName: user.fullname,
      customerEmail: user.email,
      customerPhone: user.phone,
      streetName: 'Via Roma',
      houseNumber: '12',
      propertySize: '80',
      doorbellName: 'Rossi',
      bookingDate: '2026-12-01',
      bookingTime: '10:00',
      hours: 2,
      cleaners: 1,
      totalAmount,
      tax,
      status: 'confirmed',
      paymentMethod: 'card',
      paymentStatus: 'paid',
      amountPaid: totalAmount,
      paidAt: new Date()
    });

  it('keeps the reverse charge after the customer’s registration lapses', async () => {
    const [admin, city] = await Promise.all([createAdmin(), createCity()]);
    // The customer WAS verified when they booked; they no longer are.
    const customer = await createUser({
      customerType: 'business',
      companyName: 'Bianchi Uffici Srl',
      vatNumber: 'IT09876543210',
      vatStatus: 'unverified'
    });
    const service = await createService({ pricePerHour: 60 });
    const booking = await bookingFor(
      customer,
      service,
      city,
      {
        treatment: 'reverse-charge',
        customerType: 'business',
        vatNumber: 'IT09876543210',
        companyName: 'Bianchi Uffici Srl',
        catalogueVatRate: 22,
        vatRate: 0,
        netAmount: CATALOGUE,
        vatAmount: 0
      },
      CATALOGUE
    );

    // Extend it to 4 hours: catalogue 240, charged as-is under the relief.
    const res = await api
      .patch(`/api/v1/booking/${booking._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ hours: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.booking.totalAmount).toBe(240);
    expect(res.body.data.booking.tax.treatment).toBe('reverse-charge');
    expect(res.body.data.booking.tax.vatAmount).toBe(0);
  });

  it('does not hand an individual’s booking relief the customer earned later', async () => {
    const [admin, city] = await Promise.all([createAdmin(), createCity()]);
    // Verified NOW — but not when this booking was priced.
    const customer = await createUser({
      customerType: 'business',
      companyName: 'Late Srl',
      vatNumber: 'IT09876543210',
      vatStatus: 'verified'
    });
    const service = await createService({ pricePerHour: 60 });
    const booking = await bookingFor(
      customer,
      service,
      city,
      {
        treatment: 'standard',
        customerType: 'individual',
        catalogueVatRate: 22,
        vatRate: 22,
        netAmount: CATALOGUE,
        vatAmount: 26.4
      },
      WITH_VAT
    );

    const res = await api
      .patch(`/api/v1/booking/${booking._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ hours: 4 });

    expect(res.status).toBe(200);
    // 240 catalogue + 22% — the customer's current status is irrelevant to a
    // booking that was already priced.
    expect(res.body.data.booking.totalAmount).toBe(292.8);
    expect(res.body.data.booking.tax.treatment).toBe('standard');
    expect(res.body.data.booking.tax.netAmount).toBe(240);
    expect(res.body.data.booking.tax.vatAmount).toBe(52.8);
  });

  it('leaves a pre-VAT booking’s total untouched rather than inventing a rate', async () => {
    const [admin, city] = await Promise.all([createAdmin(), createCity()]);
    const customer = await createUser();
    const service = await createService({ pricePerHour: 60 });
    // No `tax` at all — a booking made before VAT handling existed.
    const booking = await bookingFor(customer, service, city, undefined, WITH_VAT);

    const res = await api
      .patch(`/api/v1/booking/${booking._id}`)
      .set('Cookie', cookieFor(admin))
      .send({ hours: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.booking.totalAmount).toBe(240);
    expect(res.body.data.booking.tax.treatment).toBe('standard');
    // Degrades to 0%, not to whatever rate happens to be configured today.
    expect(res.body.data.booking.tax.vatAmount).toBe(0);
    expect(res.body.data.booking.tax.netAmount).toBe(240);
  });
});
