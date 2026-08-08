// VAT on unattended recurring charges.
//
// A subscription is priced fresh every cycle rather than frozen at signup, for
// the same reason recurrence eligibility is re-checked: the customer's tax
// status is a live fact. A business that registers a VAT number should stop
// paying VAT from the next charge, and one whose registration lapses must start
// paying it again — without anyone touching the plan.
//
// This is the path with no human in the loop, so getting it wrong is the most
// expensive: it either under-collects tax on every future charge, or silently
// overcharges a customer who is no longer watching the checkout screen.
//
// Reference figures: a €120 net catalogue cycle (60/h x 2h x 1 cleaner),
// charged as €146.40 with VAT and €120 under the reverse charge.

const { stripeMock, sendEmailMock, waitForEmails } = require('../setup/testEnv');
const { createUser, createCity, createService, dateStr } = require('../setup/fixtures');
const { createSubscription } = require('../setup/subscriptionFixtures');

const User = require('../../models/user.model');
const Booking = require('../../models/booking.model');
const Invoice = require('../../models/invoice.model');
const Subscription = require('../../models/subscription.model');
const { runSubscriptionCharges } = require('../../jobs/subscriptionCharge.job');
const { toMinorUnits } = require('../../utils/money.util');

const VAT_RATE = '22';
const CATALOGUE = 120;
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

/** A subscription that is due right now, owned by a user with `profile`. */
const dueSubscription = async (profile = {}, overrides = {}) => {
  const user = await createUser(profile);
  const service = await createService({ pricePerHour: 60, recurringEnabled: true });
  const city = await createCity();
  const subscription = await createSubscription(user, service, city, {
    nextServiceDate: dateStr(1),
    nextChargeAt: new Date(Date.now() - 60_000),
    ...overrides
  });
  return { user, service, city, subscription };
};

const mockOwnedCard = (subscription) => {
  stripeMock.paymentMethods.retrieve.mockResolvedValue({
    id: subscription.paymentMethodId,
    customer: subscription.stripeCustomerId
  });
};

/** Make the next charge succeed, with a distinct intent id per cycle. */
const mockCharge = (id) =>
  stripeMock.paymentIntents.create.mockResolvedValue({ id, status: 'succeeded' });

/** Re-arm a subscription so the sweep finds it due again. */
const makeDueAgain = (subscription) =>
  Subscription.updateOne(
    { _id: subscription._id },
    { $set: { nextChargeAt: new Date(Date.now() - 60_000), processingAt: null } }
  );

/**
 * Run the sweep and wait for the cycle receipt to actually go out.
 *
 * Invoicing and mail are deliberately fire-and-forget (a slow SMTP host must
 * never stall a charge worker), so the sweep resolves before the invoice row
 * exists. Without this the leftover work lands during the NEXT test, after the
 * harness has wiped the collections — which shows up as a bogus invoice-number
 * collision rather than as a failure in the test that caused it.
 *
 * `cyclesSoFar` is cumulative within a test: one successful charge, one receipt.
 */
const chargeAndSettle = async (cyclesSoFar = 1) => {
  const result = await runSubscriptionCharges();
  await waitForEmails(cyclesSoFar);
  return result;
};

/** The euro amount Stripe was asked for on the most recent charge. */
const lastChargedEuros = () => {
  const calls = stripeMock.paymentIntents.create.mock.calls;
  return calls[calls.length - 1][0].amount / 100;
};

const VERIFIED = {
  customerType: 'business',
  companyName: 'Bianchi Uffici Srl',
  vatNumber: 'IT09876543210',
  vatStatus: 'verified',
  stripeTaxIdId: 'txi_recurring_verified'
};

describe('a recurring cycle is priced on the customer’s current VAT status', () => {
  it('charges an individual the full catalogue price', async () => {
    const { subscription } = await dueSubscription();
    mockOwnedCard(subscription);
    mockCharge('pi_cycle_individual');

    await chargeAndSettle();

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: toMinorUnits(WITH_VAT), currency: 'eur' }),
      expect.anything()
    );

    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_individual' });
    expect(booking.totalAmount).toBe(WITH_VAT);
    expect(booking.amountPaid).toBe(WITH_VAT);
    expect(booking.tax.treatment).toBe('standard');
    expect(booking.tax.netAmount).toBe(CATALOGUE);
    expect(booking.tax.vatAmount).toBe(26.4);
  });

  it('charges a verified business the catalogue price, unattended', async () => {
    const { subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);
    mockCharge('pi_cycle_business');

    await chargeAndSettle();

    expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: toMinorUnits(CATALOGUE) }),
      expect.anything()
    );

    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_business' });
    expect(booking.totalAmount).toBe(CATALOGUE);
    expect(booking.amountPaid).toBe(CATALOGUE);
    expect(booking.tax.treatment).toBe('reverse-charge');
    expect(booking.tax.vatRate).toBe(0);
    expect(booking.tax.vatAmount).toBe(0);
    // Snapshotted onto the cycle's own booking, so the invoice can be addressed
    // to the company as it was registered when the charge ran.
    expect(booking.tax.vatNumber).toBe('IT09876543210');
    expect(booking.tax.companyName).toBe('Bianchi Uffici Srl');
  });

  it('keeps charging VAT while verification is still pending', async () => {
    const { subscription } = await dueSubscription({
      customerType: 'business',
      companyName: 'Pending Srl',
      vatNumber: 'IT01234567890',
      vatStatus: 'pending'
    });
    mockOwnedCard(subscription);
    mockCharge('pi_cycle_pending');

    await chargeAndSettle();

    expect(lastChargedEuros()).toBe(WITH_VAT);
    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_pending' });
    expect(booking.tax.treatment).toBe('standard');
  });

  it('reads the plan owner’s status, not the details copied onto the plan', async () => {
    // The subscription document carries customerName/Email copied at signup.
    // Pricing must go back to the User for the tax facts.
    const { user, subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);
    mockCharge('pi_cycle_owner');

    await chargeAndSettle();

    expect(lastChargedEuros()).toBe(CATALOGUE);
    expect(String((await Booking.findOne({ paymentIntentId: 'pi_cycle_owner' })).user)).toBe(
      String(user._id)
    );
  });
});

describe('a status change between cycles moves the next charge', () => {
  it('stops charging VAT once VIES verifies the number', async () => {
    const { user, subscription } = await dueSubscription({
      customerType: 'business',
      companyName: 'Bianchi Uffici Srl',
      vatNumber: 'IT09876543210',
      vatStatus: 'pending',
      stripeTaxIdId: 'txi_cycle_pending'
    });
    mockOwnedCard(subscription);

    mockCharge('pi_cycle_before_verify');
    await chargeAndSettle();
    expect(lastChargedEuros()).toBe(WITH_VAT);

    // The webhook lands between cycles.
    await User.updateOne({ _id: user._id }, { $set: { vatStatus: 'verified' } });

    await makeDueAgain(subscription);
    mockCharge('pi_cycle_after_verify');
    await chargeAndSettle(2);

    expect(lastChargedEuros()).toBe(CATALOGUE);
    const second = await Booking.findOne({ paymentIntentId: 'pi_cycle_after_verify' });
    expect(second.tax.treatment).toBe('reverse-charge');

    // The already-charged cycle is untouched — a booking is a completed
    // transaction, not a view over the customer's current profile.
    const first = await Booking.findOne({ paymentIntentId: 'pi_cycle_before_verify' });
    expect(first.totalAmount).toBe(WITH_VAT);
    expect(first.tax.treatment).toBe('standard');
  });

  it('starts charging VAT again when a registration lapses', async () => {
    const { user, subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);

    mockCharge('pi_cycle_while_verified');
    await chargeAndSettle();
    expect(lastChargedEuros()).toBe(CATALOGUE);

    await User.updateOne({ _id: user._id }, { $set: { vatStatus: 'unverified' } });

    await makeDueAgain(subscription);
    mockCharge('pi_cycle_after_lapse');
    await chargeAndSettle(2);

    // Back to the catalogue price. Nobody edited the plan.
    expect(lastChargedEuros()).toBe(WITH_VAT);
    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_after_lapse' });
    expect(booking.totalAmount).toBe(WITH_VAT);
    expect(booking.tax.treatment).toBe('standard');
    expect(booking.tax.vatAmount).toBe(26.4);
  });

  it('starts charging VAT again when the number is removed entirely', async () => {
    const { user, subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);

    mockCharge('pi_cycle_pre_removal');
    await chargeAndSettle();
    expect(lastChargedEuros()).toBe(CATALOGUE);

    // customer.tax_id.deleted clears the number and the status together.
    await User.updateOne(
      { _id: user._id },
      { $set: { vatNumber: '', vatStatus: 'none' }, $unset: { stripeTaxIdId: '' } }
    );

    await makeDueAgain(subscription);
    mockCharge('pi_cycle_post_removal');
    await chargeAndSettle(2);

    expect(lastChargedEuros()).toBe(WITH_VAT);
  });

  it('charges VAT if the account behind the plan is gone', async () => {
    const { user, subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);

    // Deleting the user must fail CLOSED — an unresolvable customer is taxed,
    // not granted relief by the absence of a contradicting record.
    await User.deleteOne({ _id: user._id });

    mockCharge('pi_cycle_orphan');
    await chargeAndSettle();

    expect(lastChargedEuros()).toBe(WITH_VAT);
    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_orphan' });
    expect(booking.tax.treatment).toBe('standard');
  });
});

describe('the invoice for a recurring cycle', () => {
  it('states the reverse charge for a verified business', async () => {
    const { subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);
    mockCharge('pi_cycle_invoice_rc');

    await chargeAndSettle();

    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_invoice_rc' });
    const invoice = await Invoice.findOne({ booking: booking._id }).lean();

    expect(invoice).not.toBeNull();
    expect(invoice.reverseCharge).toBe(true);
    expect(invoice.vatRate).toBe(0);
    expect(invoice.vatAmount).toBe(0);
    expect(invoice.subtotal).toBe(CATALOGUE);
    expect(invoice.total).toBe(CATALOGUE);
    expect(invoice.customer.name).toBe('Bianchi Uffici Srl');
    expect(invoice.customer.vatNumber).toBe('IT09876543210');

    // Items are stated net, so they sum to the subtotal.
    const sum = invoice.lineItems.reduce((total, item) => total + item.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(invoice.subtotal);

    const sent = sendEmailMock.mock.calls[0][0];
    expect(sent.text).toMatch(/reverse charge/i);
  });

  it('breaks VAT out normally for an individual’s cycle', async () => {
    const { subscription } = await dueSubscription();
    mockOwnedCard(subscription);
    mockCharge('pi_cycle_invoice_std');

    await chargeAndSettle();

    const booking = await Booking.findOne({ paymentIntentId: 'pi_cycle_invoice_std' });
    const invoice = await Invoice.findOne({ booking: booking._id }).lean();

    expect(invoice.reverseCharge).toBe(false);
    expect(invoice.vatRate).toBe(22);
    expect(invoice.subtotal).toBe(CATALOGUE);
    expect(invoice.vatAmount).toBe(26.4);
    expect(invoice.total).toBe(WITH_VAT);
  });

  it('numbers each cycle separately — one invoice per charge', async () => {
    const { subscription } = await dueSubscription(VERIFIED);
    mockOwnedCard(subscription);

    mockCharge('pi_cycle_inv_1');
    await chargeAndSettle();

    await makeDueAgain(subscription);
    mockCharge('pi_cycle_inv_2');
    await chargeAndSettle(2);

    const invoices = await Invoice.find({}).sort({ createdAt: 1 }).lean();
    expect(invoices).toHaveLength(2);
    expect(new Set(invoices.map((i) => i.number)).size).toBe(2);
    // Both cycles carried the relief.
    expect(invoices.every((i) => i.reverseCharge === true)).toBe(true);
    expect(invoices.every((i) => i.total === CATALOGUE)).toBe(true);
  });
});
