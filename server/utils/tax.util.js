// VAT treatment
// -------------
// Decides how much a given customer actually pays, and how that amount splits
// into net + VAT.
//
// Catalogue prices in this product are NET — the number on the site is the price
// before VAT, and VAT is ADDED ON TOP for whoever owes it. There are two
// treatments:
//
//   standard        an individual (or an unverified business). Pays the
//                   catalogue price PLUS VAT — €100 of cleaning at 22% is
//                   charged as €122.
//
//   reverse-charge  a business with a VAT number Stripe has verified against
//                   VIES. No VAT is added — they pay the catalogue price (€100)
//                   and account for the VAT themselves.
//
// Two rules make this safe:
//
//   1. FAIL-CLOSED. Only a stored, Stripe-verified VAT number earns the
//      reverse charge. `pending`, `unverified`, a missing number, or an account
//      that merely *claims* to be a business is taxed normally. The treatment is
//      resolved from the database, never from a request body — otherwise a
//      customer could hand themselves a discount by posting customerType.
//
//   2. THE SPLIT ALWAYS RECONCILES. netAmount + vatAmount === totalAmount to the
//      cent, in both treatments (see addVatExclusive in vat.util.js).

const { getVatRate, roundMoney, addVatExclusive } = require('./vat.util');

const STANDARD = 'standard';
const REVERSE_CHARGE = 'reverse-charge';

const CUSTOMER_TYPES = ['individual', 'business'];
// Mirrors Stripe's tax-ID verification states. Only 'verified' grants relief.
const VAT_STATUSES = ['none', 'pending', 'verified', 'unverified'];

/**
 * Does this customer qualify for the reverse charge right now?
 *
 * Deliberately takes the whole user document rather than a claimed type, so
 * every caller reads the same stored, verified facts.
 */
const qualifiesForReverseCharge = (user) =>
  user?.customerType === 'business' &&
  user?.vatStatus === 'verified' &&
  Boolean(user?.vatNumber);

/**
 * Resolve the VAT treatment for a customer.
 *
 * @param {Object|null} user  a User document (or null for a walk-in booking)
 * @returns {{ treatment: string, customerType: string, vatNumber: string,
 *            catalogueVatRate: number, vatRate: number }}
 */
const resolveTaxTreatment = (user) => {
  // The rate added to every catalogue price. With no rate configured there is
  // nothing to add and nothing to relieve — both treatments collapse to "one
  // honest total", which is exactly the pre-VAT behaviour.
  const catalogueVatRate = getVatRate();
  const reverseCharge = catalogueVatRate > 0 && qualifiesForReverseCharge(user);

  const isBusiness = user?.customerType === 'business';

  return {
    treatment: reverseCharge ? REVERSE_CHARGE : STANDARD,
    customerType: isBusiness ? 'business' : 'individual',
    vatNumber: reverseCharge ? user.vatNumber : '',
    // Snapshotted so the record keeps the company name as it was registered at
    // booking time, not as it reads later.
    companyName: isBusiness ? user.companyName || '' : '',
    catalogueVatRate,
    // What the customer is actually charged VAT at.
    vatRate: reverseCharge ? 0 : catalogueVatRate
  };
};

/**
 * Apply a treatment to a NET catalogue total, producing the amount payable and
 * its tax breakdown.
 *
 * @param {number} netTotal   the catalogue total (VAT-exclusive)
 * @param {Object} treatment  from resolveTaxTreatment()
 * @returns {{ totalAmount: number, tax: Object }}
 */
const applyTaxTreatment = (netTotal, treatment = {}) => {
  const net = roundMoney(netTotal);
  // A booking priced before VAT handling existed carries no snapshot. Repricing
  // one must keep the total exactly as-is rather than invent a rate for it, so
  // an absent treatment degrades to "standard, 0%".
  treatment = treatment || {};

  if (treatment.treatment === REVERSE_CHARGE) {
    // No VAT is added — the business pays the catalogue price and accounts for
    // the tax itself.
    return {
      totalAmount: net,
      tax: {
        treatment: REVERSE_CHARGE,
        customerType: treatment.customerType,
        vatNumber: treatment.vatNumber,
        companyName: treatment.companyName || '',
        catalogueVatRate: treatment.catalogueVatRate,
        vatRate: 0,
        netAmount: net,
        vatAmount: 0
      }
    };
  }

  const { vat, gross } = addVatExclusive(net, treatment.vatRate);
  return {
    totalAmount: gross,
    tax: {
      treatment: STANDARD,
      customerType: treatment.customerType,
      vatNumber: '',
      companyName: treatment.companyName || '',
      catalogueVatRate: treatment.catalogueVatRate,
      vatRate: treatment.vatRate,
      netAmount: net,
      vatAmount: vat
    }
  };
};

/**
 * Convenience: resolve + apply in one step.
 *
 * @param {number} netTotal
 * @param {Object|null} user
 */
const priceForCustomer = (netTotal, user) =>
  applyTaxTreatment(netTotal, resolveTaxTreatment(user));

module.exports = {
  STANDARD,
  REVERSE_CHARGE,
  CUSTOMER_TYPES,
  VAT_STATUSES,
  qualifiesForReverseCharge,
  resolveTaxTreatment,
  applyTaxTreatment,
  priceForCustomer
};
