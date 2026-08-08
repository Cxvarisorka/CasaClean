// Unit tests for the VAT treatment rules.
//
// This module decides how much money a customer is actually asked for, so the
// two properties that matter are pinned hard: it FAILS CLOSED (only a verified
// business escapes VAT), and the split always reconciles to the cent.

const {
  STANDARD,
  REVERSE_CHARGE,
  qualifiesForReverseCharge,
  resolveTaxTreatment,
  applyTaxTreatment,
  priceForCustomer
} = require('../../utils/tax.util');
const { roundMoney } = require('../../utils/invoice.util');

// The rate is read from the environment on every call, so each test states the
// rate it assumes rather than depending on suite ordering.
const withRate = (rate, fn) => {
  const previous = process.env.INVOICE_VAT_RATE;
  if (rate === undefined) delete process.env.INVOICE_VAT_RATE;
  else process.env.INVOICE_VAT_RATE = String(rate);
  try {
    return fn();
  } finally {
    if (previous === undefined) delete process.env.INVOICE_VAT_RATE;
    else process.env.INVOICE_VAT_RATE = previous;
  }
};

const verifiedBusiness = {
  customerType: 'business',
  vatStatus: 'verified',
  vatNumber: 'IT01234567890',
  companyName: 'Acme Srl'
};

describe('qualifiesForReverseCharge', () => {
  it('accepts only a business with a verified VAT number', () => {
    expect(qualifiesForReverseCharge(verifiedBusiness)).toBe(true);
  });

  it('rejects every partial claim — this is the whole security boundary', () => {
    const rejected = [
      null,
      undefined,
      {},
      // Says it's a business, has nothing to back it up.
      { customerType: 'business' },
      { customerType: 'business', vatStatus: 'verified' },
      { customerType: 'business', vatNumber: 'IT01234567890' },
      // VIES has not answered yet — charge VAT until it does.
      { ...verifiedBusiness, vatStatus: 'pending' },
      // VIES said no.
      { ...verifiedBusiness, vatStatus: 'unverified' },
      { ...verifiedBusiness, vatStatus: 'none' },
      // A verified number on a personal account must not grant relief.
      { ...verifiedBusiness, customerType: 'individual' }
    ];

    for (const user of rejected) {
      expect(qualifiesForReverseCharge(user)).toBe(false);
    }
  });
});

describe('resolveTaxTreatment', () => {
  it('gives a verified business the reverse charge', () =>
    withRate(22, () => {
      const treatment = resolveTaxTreatment(verifiedBusiness);
      expect(treatment.treatment).toBe(REVERSE_CHARGE);
      expect(treatment.vatRate).toBe(0);
      expect(treatment.catalogueVatRate).toBe(22);
      expect(treatment.vatNumber).toBe('IT01234567890');
      expect(treatment.companyName).toBe('Acme Srl');
    }));

  it('taxes an individual at the configured rate', () =>
    withRate(22, () => {
      const treatment = resolveTaxTreatment({ customerType: 'individual' });
      expect(treatment.treatment).toBe(STANDARD);
      expect(treatment.vatRate).toBe(22);
      // Never echo a VAT number onto a standard-rate transaction.
      expect(treatment.vatNumber).toBe('');
    }));

  it('collapses to the standard treatment when no rate is configured', () =>
    withRate(undefined, () => {
      // With no VAT there is nothing to add and nothing to relieve, so even a
      // verified business pays the plain catalogue price — the pre-VAT behaviour.
      const treatment = resolveTaxTreatment(verifiedBusiness);
      expect(treatment.treatment).toBe(STANDARD);
      expect(treatment.vatRate).toBe(0);
    }));

  it('treats a walk-in booking (no account) as an individual', () =>
    withRate(22, () => {
      expect(resolveTaxTreatment(null).treatment).toBe(STANDARD);
      expect(resolveTaxTreatment(null).customerType).toBe('individual');
    }));
});

describe('applyTaxTreatment', () => {
  it('charges an individual the catalogue price PLUS VAT', () =>
    withRate(22, () => {
      const { totalAmount, tax } = priceForCustomer(100, { customerType: 'individual' });
      expect(totalAmount).toBe(122);
      expect(tax.netAmount).toBe(100);
      expect(tax.vatAmount).toBe(22);
      expect(tax.vatRate).toBe(22);
    }));

  it('charges a verified business the catalogue price — no VAT is added', () =>
    withRate(22, () => {
      const { totalAmount, tax } = priceForCustomer(100, verifiedBusiness);
      expect(totalAmount).toBe(100);
      expect(tax.treatment).toBe(REVERSE_CHARGE);
      expect(tax.netAmount).toBe(100);
      expect(tax.vatAmount).toBe(0);
      expect(tax.vatRate).toBe(0);
      // Kept so the document can state the rate it was relieved of.
      expect(tax.catalogueVatRate).toBe(22);
    }));

  it('always reconciles: net + vat === total, in both treatments', () => {
    for (const rate of [5, 8.5, 20, 22, 27]) {
      withRate(rate, () => {
        for (const net of [0.01, 9.99, 44.8, 120, 187.5, 1000.07]) {
          for (const user of [{ customerType: 'individual' }, verifiedBusiness]) {
            const { totalAmount, tax } = priceForCustomer(net, user);
            expect(roundMoney(tax.netAmount + tax.vatAmount)).toBe(totalAmount);
            // The catalogue price is never restated — it IS the net.
            expect(tax.netAmount).toBe(roundMoney(net));
          }
        }
      });
    }
  });

  it('never charges a business more than an individual', () => {
    withRate(22, () => {
      const individual = priceForCustomer(187.5, { customerType: 'individual' });
      const business = priceForCustomer(187.5, verifiedBusiness);
      expect(business.totalAmount).toBeLessThan(individual.totalAmount);
      // Exactly the catalogue price, which is the individual's net.
      expect(business.totalAmount).toBe(individual.tax.netAmount);
      expect(business.totalAmount).toBe(187.5);
    });
  });

  it('re-applies a stored treatment, so an edit keeps the original basis', () =>
    withRate(22, () => {
      // The booking's own snapshot is handed straight back in as the treatment
      // (what the admin edit path does when a booking is repriced).
      const original = priceForCustomer(100, verifiedBusiness).tax;
      const repriced = applyTaxTreatment(200, original);
      expect(repriced.totalAmount).toBe(200);
      expect(repriced.tax.treatment).toBe(REVERSE_CHARGE);

      // And an individual's edit still carries the VAT.
      const standard = priceForCustomer(100, { customerType: 'individual' }).tax;
      expect(applyTaxTreatment(200, standard).totalAmount).toBe(244);
    }));

  it('falls back to the standard treatment for a legacy booking with no snapshot', () => {
    // Bookings priced before VAT handling existed have no stored tax; repricing
    // them must not invent a rate.
    const repriced = applyTaxTreatment(120, undefined);
    expect(repriced.totalAmount).toBe(120);
    expect(repriced.tax.treatment).toBe(STANDARD);
    expect(repriced.tax.vatAmount).toBe(0);
  });

  it('never records a VAT number on a standard-treatment booking', () =>
    withRate(22, () => {
      // A business can claim a number long before VIES confirms it. Snapshotting
      // it anyway would put an unearned relief basis on the invoice.
      const { tax } = priceForCustomer(120, {
        customerType: 'business',
        companyName: 'Pending Srl',
        vatNumber: 'IT01234567890',
        vatStatus: 'pending'
      });
      expect(tax.treatment).toBe(STANDARD);
      expect(tax.vatNumber).toBe('');
      // The company name IS kept — the invoice is still addressed to the
      // business, it simply pays VAT.
      expect(tax.companyName).toBe('Pending Srl');
      expect(tax.customerType).toBe('business');
    }));

  it('keeps no company details for an individual', () =>
    withRate(22, () => {
      const { tax } = priceForCustomer(120, {
        customerType: 'individual',
        companyName: 'Left Over Srl',
        vatNumber: 'IT01234567890'
      });
      expect(tax.companyName).toBe('');
      expect(tax.vatNumber).toBe('');
    }));

  it('withholds relief from a verified business when no rate is configured', () =>
    withRate(undefined, () => {
      // Nothing is added to the price, so there is nothing to be relieved of.
      const { totalAmount, tax } = priceForCustomer(120, verifiedBusiness);
      expect(totalAmount).toBe(120);
      expect(tax.treatment).toBe(STANDARD);
      expect(tax.catalogueVatRate).toBe(0);
      expect(tax.netAmount).toBe(120);
      expect(tax.vatAmount).toBe(0);
    }));

  it('handles a zero total without producing NaN or a negative charge', () =>
    withRate(22, () => {
      for (const user of [{ customerType: 'individual' }, verifiedBusiness]) {
        const { totalAmount, tax } = priceForCustomer(0, user);
        expect(totalAmount).toBe(0);
        expect(tax.netAmount).toBe(0);
        expect(tax.vatAmount).toBe(0);
      }
    }));

  it('is stable under repeated re-application, so repeated edits never drift', () =>
    withRate(22, () => {
      // An admin can edit the same booking many times. Re-applying a stored
      // treatment to the SAME catalogue net must land on the same number every
      // time — it must not compound the VAT.
      const stored = priceForCustomer(100, { customerType: 'individual' }).tax;
      let result = applyTaxTreatment(100, stored);
      for (let i = 0; i < 5; i += 1) result = applyTaxTreatment(100, result.tax);
      expect(result.totalAmount).toBe(122);
      expect(result.tax.netAmount).toBe(100);
    }));
});
