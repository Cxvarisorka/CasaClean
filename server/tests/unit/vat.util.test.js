// Unit tests for the VAT/money helpers. These are the parts that decide what a
// customer is actually charged as "VAT" and "Total", so the arithmetic is
// pinned down here rather than only observed through a charged amount.

const {
  getVatRate,
  roundMoney,
  addVatExclusive,
  formatDateLong
} = require('../../utils/vat.util');

// Each test restores the environment it touched — getVatRate reads
// process.env on every call by design (no boot-time snapshot).
const withEnv = (vars, fn) => {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

describe('getVatRate', () => {
  it('is 0 (no VAT) when unset, zero, negative or unparseable', () => {
    for (const value of [undefined, '', '0', '-5', 'twenty-two']) {
      withEnv({ INVOICE_VAT_RATE: value }, () => {
        expect(getVatRate()).toBe(0);
      });
    }
  });

  it('rejects a rate of 100 or more (a sanity bound — that is a typo, not a rate)', () => {
    withEnv({ INVOICE_VAT_RATE: '100' }, () => expect(getVatRate()).toBe(0));
    withEnv({ INVOICE_VAT_RATE: '250' }, () => expect(getVatRate()).toBe(0));
  });

  it('accepts a normal rate, including a fractional one', () => {
    withEnv({ INVOICE_VAT_RATE: '22' }, () => expect(getVatRate()).toBe(22));
    withEnv({ INVOICE_VAT_RATE: '8.5' }, () => expect(getVatRate()).toBe(8.5));
  });
});

describe('addVatExclusive', () => {
  it('leaves the amount whole when no rate is configured', () => {
    expect(addVatExclusive(100, 0)).toEqual({ net: 100, vat: 0, gross: 100 });
  });

  it('adds the tax ON TOP of the catalogue price', () => {
    // The rule this product bills by: €100 of cleaning at 22% is charged €122.
    expect(addVatExclusive(100, 22)).toEqual({ net: 100, vat: 22, gross: 122 });
  });

  it('always reconciles to the cent, so a charged total adds up', () => {
    for (const amount of [0.01, 9.99, 44.8, 187.5, 233.33, 1000.07]) {
      for (const rate of [5, 8.5, 20, 22, 27]) {
        const { net, vat, gross } = addVatExclusive(amount, rate);
        expect(roundMoney(net + vat)).toBe(gross);
        // The catalogue price is the fixed quantity — it is never restated.
        expect(net).toBe(roundMoney(amount));
      }
    }
  });

  it('rounds float dust out of the net', () => {
    expect(addVatExclusive(0.1 + 0.2, 0).net).toBe(0.3);
  });
});

describe('formatDateLong', () => {
  it('formats a plain booking date string without shifting the day', () => {
    // Parsed as UTC and formatted as UTC — a local-timezone round trip could
    // print the 13th for a booking on the 14th.
    expect(formatDateLong('2026-08-14')).toBe('14 August 2026');
    expect(formatDateLong('2026-01-01')).toBe('1 January 2026');
  });

  it('formats a Date and tolerates junk', () => {
    expect(formatDateLong(new Date('2026-08-07T09:14:00Z'))).toBe('7 August 2026');
    expect(formatDateLong('')).toBe('');
    expect(formatDateLong('not-a-date')).toBe('not-a-date');
  });
});
