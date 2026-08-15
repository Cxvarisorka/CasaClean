// Unit tests for the invoice money/config helpers. These are the parts that
// decide what a customer sees as "VAT" and "Total", so the arithmetic is
// pinned down here rather than only observed through a rendered PDF.

const {
  readLines,
  getSeller,
  getVatRate,
  getNumberPrefix,
  roundMoney,
  addVatExclusive,
  splitVatInclusive,
  formatInvoiceNumber,
  formatDateLong
} = require('../../utils/invoice.util');

// Each test restores the environment it touched — getSeller/getVatRate read
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

describe('readLines', () => {
  it('splits a pipe-separated address and drops blank segments', () => {
    expect(readLines('Via Roma 42| 20121 Milano || Italy ')).toEqual([
      'Via Roma 42',
      '20121 Milano',
      'Italy'
    ]);
  });

  it('returns an empty list for missing config', () => {
    expect(readLines(undefined)).toEqual([]);
    expect(readLines('')).toEqual([]);
  });
});

describe('getVatRate', () => {
  it('is 0 (no VAT line) when unset, zero, negative or unparseable', () => {
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

  it('always reconciles to the cent, so a printed total adds up', () => {
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

describe('splitVatInclusive (legacy bookings only)', () => {
  it('leaves the total whole when no rate is configured', () => {
    expect(splitVatInclusive(120, 0)).toEqual({ net: 120, vat: 0, gross: 120 });
  });

  it('derives the net FROM the gross — it never adds tax on top', () => {
    const { net, vat, gross } = splitVatInclusive(120, 22);
    expect(gross).toBe(120);
    expect(net).toBe(98.36);
    expect(vat).toBe(21.64);
  });

  it('always reconciles to the cent, so a printed total adds up', () => {
    // Amounts chosen to land on awkward thirds/halves of a cent.
    for (const total of [0.01, 9.99, 44.8, 187.5, 233.33, 1000.07]) {
      for (const rate of [5, 8.5, 20, 22, 27]) {
        const { net, vat, gross } = splitVatInclusive(total, rate);
        expect(roundMoney(net + vat)).toBe(gross);
      }
    }
  });

  it('rounds float dust out of the gross', () => {
    expect(splitVatInclusive(0.1 + 0.2, 0).gross).toBe(0.3);
  });
});

describe('formatInvoiceNumber', () => {
  it('zero-pads the sequence to six digits', () => {
    expect(formatInvoiceNumber('CC', 2026, 42)).toBe('CC-2026-000042');
    expect(formatInvoiceNumber('CC', 2026, 1)).toBe('CC-2026-000001');
  });

  it('does not truncate a sequence past the padding width', () => {
    expect(formatInvoiceNumber('CC', 2026, 1234567)).toBe('CC-2026-1234567');
  });
});

describe('getNumberPrefix', () => {
  it('defaults to CC and ignores a whitespace-only override', () => {
    withEnv({ INVOICE_NUMBER_PREFIX: undefined }, () => expect(getNumberPrefix()).toBe('CC'));
    withEnv({ INVOICE_NUMBER_PREFIX: '   ' }, () => expect(getNumberPrefix()).toBe('CC'));
    withEnv({ INVOICE_NUMBER_PREFIX: ' INV ' }, () => expect(getNumberPrefix()).toBe('INV'));
  });
});

describe('getSeller', () => {
  it('falls back to platform defaults when nothing is configured', () => {
    withEnv(
      {
        INVOICE_COMPANY_NAME: undefined,
        INVOICE_COMPANY_ADDRESS: undefined,
        INVOICE_VAT_NUMBER: undefined,
        INVOICE_COMPANY_WEBSITE: undefined
      },
      () => {
        const seller = getSeller();
        expect(seller.name).toBe('CasaClean');
        expect(seller.addressLines).toEqual([]);
        expect(seller.vatNumber).toBe('');
        // CLIENT_URL is the sensible stand-in for a missing website.
        expect(seller.website).toBe(process.env.CLIENT_URL);
      }
    );
  });

  it('reads the configured company identity', () => {
    withEnv(
      {
        INVOICE_COMPANY_NAME: 'CasaClean Services Ltd.',
        INVOICE_COMPANY_ADDRESS: 'Via Roma 42|20121 Milano',
        INVOICE_VAT_NUMBER: 'IT01234567890'
      },
      () => {
        const seller = getSeller();
        expect(seller.name).toBe('CasaClean Services Ltd.');
        expect(seller.addressLines).toEqual(['Via Roma 42', '20121 Milano']);
        expect(seller.vatNumber).toBe('IT01234567890');
      }
    );
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
