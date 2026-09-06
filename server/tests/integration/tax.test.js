// VAT / reverse charge — end to end.
//
// The rule: catalogue prices are VAT-exclusive. An individual pays them PLUS
// VAT; a business whose VAT number Stripe has VERIFIED pays the catalogue price
// with no VAT added.
//
// The security property that matters here is that the relief is unreachable by
// claim. A customer can say they are a business; only Stripe's VIES answer can
// take the VAT off their charge. Several tests below exist purely to hold that
// line.

const { api, stripeMock, waitForCustomerEmails } = require('../setup/testEnv');
const {
  createUser,
  createAdmin,
  cookieFor,
  createCity,
  createService,
  createSpecialRequest,
  validBookingBody
} = require('../setup/fixtures');

const User = require('../../models/user.model');
const Booking = require('../../models/booking.model');

const VAT_RATE = '22';

// The rate is read from the environment per call, so set it for this suite only
// — every other suite documents the no-VAT behaviour and must stay that way.
let previousRate;
beforeAll(() => {
  previousRate = process.env.INVOICE_VAT_RATE;
  process.env.INVOICE_VAT_RATE = VAT_RATE;
});
afterAll(() => {
  if (previousRate === undefined) delete process.env.INVOICE_VAT_RATE;
  else process.env.INVOICE_VAT_RATE = previousRate;
});

const mockTaxId = (status = 'pending', id = 'txi_test_1') =>
  stripeMock.customers.createTaxId.mockResolvedValue({
    id,
    type: 'eu_vat',
    value: 'IT01234567890',
    verification: { status }
  });

const mockPaidIntent = (id = 'pi_test_vat_1') => {
  stripeMock.customers.create.mockResolvedValue({ id: 'cus_test_vat' });

  // The finalize endpoint checks that the intent belongs to the caller's Stripe
  // customer, so `retrieve` has to echo back whatever customer `create` was
  // handed — a fixed id would 403 any user who already has one (like the
  // verified-business fixture below).
  let created = {};
  const intent = (params = {}) => ({
    id,
    client_secret: `${id}_secret`,
    status: 'succeeded',
    amount: params.amount ?? created.amount ?? 4000,
    customer: params.customer ?? created.customer ?? 'cus_test_vat',
    payment_method: 'pm_test_vat'
  });
  stripeMock.paymentIntents.create.mockImplementation(async (params) => {
    created = intent(params);
    return created;
  });
  stripeMock.paymentIntents.retrieve.mockImplementation(async () => intent());
};

/** A user already carrying a Stripe-verified VAT number. */
const verifiedBusiness = () =>
  createUser({
    customerType: 'business',
    companyName: 'Bianchi Uffici Srl',
    vatNumber: 'IT09876543210',
    vatStatus: 'verified',
    stripeTaxIdId: 'txi_verified_1',
    stripeCustomerId: 'cus_verified_1'
  });

describe('PATCH /auth/me/tax-profile', () => {
  it('registers a VAT number with Stripe and starts out pending', async () => {
    const user = await createUser();
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_tax_1' });
    mockTaxId('pending');

    const res = await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', companyName: 'Acme Srl', vatNumber: 'it 012 345 678-90' });

    expect(res.status).toBe(200);
    // Normalised to the form Stripe and VIES expect.
    expect(stripeMock.customers.createTaxId).toHaveBeenCalledWith('cus_tax_1', {
      type: 'eu_vat',
      value: 'IT01234567890'
    });

    const stored = await User.findById(user._id).lean();
    expect(stored.customerType).toBe('business');
    expect(stored.companyName).toBe('Acme Srl');
    expect(stored.vatNumber).toBe('IT01234567890');
    // Pending, NOT verified — and the message says so.
    expect(stored.vatStatus).toBe('pending');
    expect(res.body.message).toMatch(/verifying/i);
  });

  it('rejects a body that tries to set vatStatus directly', async () => {
    const user = await createUser();

    const res = await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', vatNumber: 'IT01234567890', vatStatus: 'verified' });

    // .strict() rejects the unknown field outright — the status is Stripe's
    // answer, and there is no request shape that can write it.
    expect(res.status).toBe(400);
    expect(stripeMock.customers.createTaxId).not.toHaveBeenCalled();
    expect((await User.findById(user._id).lean()).vatStatus).toBe('none');
  });

  it('rejects a number that is not even shaped like a VAT number', async () => {
    const user = await createUser();
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_tax_2' });

    const res = await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', vatNumber: '12345' });

    expect(res.status).toBe(400);
    expect(stripeMock.customers.createTaxId).not.toHaveBeenCalled();
  });

  it('drops the VAT registration when switching back to a personal account', async () => {
    const user = await verifiedBusiness();
    stripeMock.customers.deleteTaxId.mockResolvedValue({ deleted: true });

    const res = await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'individual' });

    expect(res.status).toBe(200);
    expect(stripeMock.customers.deleteTaxId).toHaveBeenCalledWith('cus_verified_1', 'txi_verified_1');

    // Leaving a verified number attached to a personal account would let the
    // customer flip the type back and forth to dodge VAT.
    const stored = await User.findById(user._id).lean();
    expect(stored.customerType).toBe('individual');
    expect(stored.vatNumber).toBe('');
    expect(stored.vatStatus).toBe('none');
  });

  it('does not reset a verified status when the same number is resubmitted', async () => {
    const user = await verifiedBusiness();

    const res = await api
      .patch('/api/v1/auth/me/tax-profile')
      .set('Cookie', cookieFor(user))
      .send({ customerType: 'business', companyName: 'Renamed Srl', vatNumber: 'IT09876543210' });

    expect(res.status).toBe(200);
    expect(stripeMock.customers.createTaxId).not.toHaveBeenCalled();

    const stored = await User.findById(user._id).lean();
    expect(stored.vatStatus).toBe('verified');
    expect(stored.companyName).toBe('Renamed Srl');
  });
});

describe('customer.tax_id webhooks', () => {
  const deliver = async (type, object) => {
    const payload = JSON.stringify({
      id: `evt_${type}_${Date.now()}`,
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

  it('flips a pending number to verified when VIES answers', async () => {
    const user = await createUser({
      customerType: 'business',
      vatNumber: 'IT01234567890',
      vatStatus: 'pending',
      stripeTaxIdId: 'txi_pending_1'
    });

    const res = await deliver('customer.tax_id.updated', {
      id: 'txi_pending_1',
      verification: { status: 'verified' }
    });

    expect(res.status).toBe(200);
    expect((await User.findById(user._id).lean()).vatStatus).toBe('verified');
  });

  it('records a rejection, and treats an unreachable VIES as unverified', async () => {
    const rejected = await createUser({ vatStatus: 'pending', stripeTaxIdId: 'txi_bad_1' });
    const unavailable = await createUser({ vatStatus: 'pending', stripeTaxIdId: 'txi_bad_2' });

    await deliver('customer.tax_id.updated', {
      id: 'txi_bad_1',
      verification: { status: 'unverified' }
    });
    // 'unavailable' means VIES could not be reached — never optimistically grant
    // relief on it.
    await deliver('customer.tax_id.updated', {
      id: 'txi_bad_2',
      verification: { status: 'unavailable' }
    });

    expect((await User.findById(rejected._id).lean()).vatStatus).toBe('unverified');
    expect((await User.findById(unavailable._id).lean()).vatStatus).toBe('unverified');
  });

  it('clears the registration when the tax id is deleted on Stripe', async () => {
    const user = await verifiedBusiness();

    await deliver('customer.tax_id.deleted', { id: 'txi_verified_1' });

    const stored = await User.findById(user._id).lean();
    expect(stored.vatStatus).toBe('none');
    expect(stored.vatNumber).toBe('');
  });
});

describe('pricing by customer type', () => {
  const bookAndFinalize = async (user, service, city, body = {}) => {
    const cookie = cookieFor(user);
    const intent = await api
      .post('/api/v1/payment/booking/intent')
      .set('Cookie', cookie)
      .send(validBookingBody(service, city, body));
    expect(intent.status).toBe(201);

    const finalize = await api
      .post('/api/v1/payment/booking/finalize')
      .set('Cookie', cookie)
      .send({ paymentIntentId: intent.body.data.paymentIntentId });
    expect(finalize.status).toBe(201);

    return { intent: intent.body.data, booking: finalize.body.data.booking };
  };

  it('charges an individual the catalogue price PLUS VAT', async () => {
    const [user, city] = await Promise.all([createUser(), createCity()]);
    const service = await createService({ pricePerHour: 30 });
    mockPaidIntent();

    // 30/h x 2h x 1 cleaner = 60 net -> 73.20 charged.
    const { intent, booking } = await bookAndFinalize(user, service, city);

    expect(intent.amount).toBe(73.2);
    expect(booking.totalAmount).toBe(73.2);
    expect(booking.tax.treatment).toBe('standard');
    expect(booking.tax.vatRate).toBe(22);
    expect(booking.tax.netAmount).toBe(60);
    expect(booking.tax.vatAmount).toBe(13.2);

    // Stripe is asked for the VAT-inclusive amount, in minor units.
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 7320, currency: 'eur' }),
      undefined
    );
  });

  it('charges a verified business the catalogue price — no VAT is added', async () => {
    const [user, city] = await Promise.all([verifiedBusiness(), createCity()]);
    const service = await createService({ pricePerHour: 30 });
    mockPaidIntent();

    const { intent, booking } = await bookAndFinalize(user, service, city);

    // 60 net, and nothing on top: the business accounts for the VAT itself.
    expect(intent.amount).toBe(60);
    expect(booking.totalAmount).toBe(60);
    expect(booking.amountPaid).toBe(60);
    expect(booking.tax.treatment).toBe('reverse-charge');
    expect(booking.tax.vatRate).toBe(0);
    expect(booking.tax.vatAmount).toBe(0);
    expect(booking.tax.vatNumber).toBe('IT09876543210');
    expect(booking.tax.companyName).toBe('Bianchi Uffici Srl');

    // Stripe is asked for €60 in minor units — the relief happens at the charge,
    // not just on the paperwork.
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 6000, currency: 'eur' }),
      undefined
    );
  });

  it('still charges VAT while verification is pending', async () => {
    const [city] = await Promise.all([createCity()]);
    const user = await createUser({
      customerType: 'business',
      companyName: 'Not Yet Srl',
      vatNumber: 'IT01234567890',
      vatStatus: 'pending'
    });
    const service = await createService({ pricePerHour: 30 });
    mockPaidIntent();

    const { intent, booking } = await bookAndFinalize(user, service, city);

    // Being wrong in this direction costs a refund request; being wrong the
    // other way means under-collecting tax we still owe.
    expect(intent.amount).toBe(73.2);
    expect(booking.tax.treatment).toBe('standard');
  });

  it('ignores a customerType smuggled into the booking body', async () => {
    const [user, city] = await Promise.all([createUser(), createCity()]);
    const service = await createService({ pricePerHour: 30 });
    mockPaidIntent();

    const res = await api
      .post('/api/v1/payment/booking/intent')
      .set('Cookie', cookieFor(user))
      .send(
        validBookingBody(service, city, {
          customerType: 'business',
          vatNumber: 'IT09876543210'
        })
      );

    // The strict schema rejects the unknown fields outright; even if it didn't,
    // pricing reads the stored user, never the body.
    expect(res.status).toBe(400);
  });

  it('prices an admin on-behalf booking against the LINKED customer', async () => {
    const [admin, business, city] = await Promise.all([
      createAdmin(),
      verifiedBusiness(),
      createCity()
    ]);
    const service = await createService({ pricePerHour: 30 });

    const res = await api
      .post('/api/v1/booking')
      .set('Cookie', cookieFor(admin))
      .send({
        userId: String(business._id),
        ...validBookingBody(service, city)
      });

    expect(res.status).toBe(201);
    // The admin is an individual; the booking must follow the customer's status,
    // so no VAT is added even though the admin would pay it.
    expect(res.body.data.booking.totalAmount).toBe(60);
    expect(res.body.data.booking.tax.treatment).toBe('reverse-charge');
  });

  it('treats a walk-in booking with no linked account as an individual', async () => {
    const [admin, city] = await Promise.all([createAdmin(), createCity()]);
    const service = await createService({ pricePerHour: 30 });

    const res = await api
      .post('/api/v1/booking')
      .set('Cookie', cookieFor(admin))
      .send({
        customerName: 'Walk In',
        customerEmail: 'walkin@test.casaclean.local',
        customerPhone: '+393311234567',
        ...validBookingBody(service, city)
      });

    expect(res.status).toBe(201);
    expect(res.body.data.booking.totalAmount).toBe(73.2);
    expect(res.body.data.booking.tax.treatment).toBe('standard');
  });
});

describe('reverse-charge charging details', () => {
  it('charges a verified business net, with add-ons at their catalogue price', async () => {
    const [user, city, addOn] = await Promise.all([
      verifiedBusiness(),
      createCity(),
      createSpecialRequest({ name: 'Fridge cleaning', price: 12.2 })
    ]);
    const service = await createService({ name: 'Deep cleaning', pricePerHour: 30 });
    mockPaidIntent();

    const cookie = cookieFor(user);
    const intent = await api
      .post('/api/v1/payment/booking/intent')
      .set('Cookie', cookie)
      .send(
        validBookingBody(service, city, { specialRequests: [String(addOn._id)] })
      );
    const finalize = await api
      .post('/api/v1/payment/booking/finalize')
      .set('Cookie', cookie)
      .send({ paymentIntentId: intent.body.data.paymentIntentId });

    // 60 + 12.20 = 72.20 net, charged as-is under the reverse charge.
    expect(finalize.body.data.booking.totalAmount).toBe(72.2);

    // The customer still gets exactly one confirmation email for the payment.
    await waitForCustomerEmails(1);
  });

  it('charges one honest total when no rate is configured', async () => {
    // The whole feature is invisible without INVOICE_VAT_RATE: a verified
    // business and an individual are charged identically.
    const saved = process.env.INVOICE_VAT_RATE;
    delete process.env.INVOICE_VAT_RATE;
    try {
      const [business, city] = await Promise.all([verifiedBusiness(), createCity()]);
      const service = await createService({ pricePerHour: 30 });
      mockPaidIntent('pi_test_vat_norate');

      const res = await api
        .post('/api/v1/payment/booking/intent')
        .set('Cookie', cookieFor(business))
        .send(validBookingBody(service, city));

      expect(res.body.data.amount).toBe(60);

      const booking = await Booking.findById(
        (
          await api
            .post('/api/v1/payment/booking/finalize')
            .set('Cookie', cookieFor(business))
            .send({ paymentIntentId: res.body.data.paymentIntentId })
        ).body.data.booking._id
      ).lean();

      expect(booking.totalAmount).toBe(60);
      expect(booking.tax.treatment).toBe('standard');
      expect(booking.tax.vatRate).toBe(0);
      expect(booking.tax.vatAmount).toBe(0);
      expect(booking.tax.netAmount).toBe(60);
    } finally {
      process.env.INVOICE_VAT_RATE = saved;
    }
  });
});

// An exact-minute duration is where pricing, VAT and Stripe can most easily
// disagree: 85/60 x 20 is 28.3333..., and every layer has to land on the same
// cent. This walks one such booking from the quote to the charge.
describe('exact-minute pricing, end to end', () => {
  it('prices and charges a 1 h 25 m booking with VAT on top', async () => {
    const [user, city] = await Promise.all([createUser(), createCity()]);
    const service = await createService({ pricePerHour: 20 });
    mockPaidIntent('pi_test_minutes_vat');

    const intent = await api
      .post('/api/v1/payment/booking/intent')
      .set('Cookie', cookieFor(user))
      .send(validBookingBody(service, city, { durationMinutes: 85 }));

    // Net 28.33, VAT at 22% is 6.23, so the customer owes 34.56.
    expect(intent.status).toBe(201);
    expect(intent.body.data.amount).toBe(34.56);

    // Stripe is asked for exactly that, in integer cents.
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 3456 }),
      undefined
    );

    const finalize = await api
      .post('/api/v1/payment/booking/finalize')
      .set('Cookie', cookieFor(user))
      .send({ paymentIntentId: intent.body.data.paymentIntentId });
    expect(finalize.status).toBe(201);

    const booking = await Booking.findById(finalize.body.data.booking._id).lean();
    expect(booking.durationMinutes).toBe(85);
    expect(booking.totalAmount).toBe(34.56);
    expect(booking.tax.netAmount).toBe(28.33);
    expect(booking.tax.vatAmount).toBe(6.23);
    expect(booking.tax.netAmount + booking.tax.vatAmount).toBeCloseTo(booking.totalAmount, 2);
  });

  it('gives a VIES-verified business the same minute-exact net, with no VAT added', async () => {
    const [business, city] = await Promise.all([verifiedBusiness(), createCity()]);
    const service = await createService({ pricePerHour: 20 });
    mockPaidIntent('pi_test_minutes_rc');

    const intent = await api
      .post('/api/v1/payment/booking/intent')
      .set('Cookie', cookieFor(business))
      .send(validBookingBody(service, city, { durationMinutes: 85 }));

    // Reverse charge: the catalogue net itself, to the cent.
    expect(intent.body.data.amount).toBe(28.33);
    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2833 }),
      undefined
    );

    const finalize = await api
      .post('/api/v1/payment/booking/finalize')
      .set('Cookie', cookieFor(business))
      .send({ paymentIntentId: intent.body.data.paymentIntentId });

    const booking = await Booking.findById(finalize.body.data.booking._id).lean();
    expect(booking.totalAmount).toBe(28.33);
    expect(booking.tax.treatment).toBe('reverse-charge');
    expect(booking.tax.vatAmount).toBe(0);
    expect(booking.tax.netAmount).toBe(28.33);
  });
});
