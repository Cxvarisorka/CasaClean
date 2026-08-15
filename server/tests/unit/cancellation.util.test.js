// Unit tests for the late-cancellation policy.
//
// This is the arithmetic that decides how much of a customer's money we keep
// when they cancel close to the appointment, so it is pinned down here rather
// than only observed through the HTTP response of the cancel endpoint.

const {
  CANCELLATION_WINDOW_HOURS,
  bookingStartsAt,
  isLateCancellation,
  lateCancellationSettlement
} = require('../../utils/cancellation.util');

// A paid booking as the model stores it: gross `totalAmount`, a `tax` snapshot
// (whose `netAmount` marks it as priced under VAT handling) and POPULATED add-on
// documents, which is what the controller hands the settlement.
const booking = (overrides = {}) => ({
  bookingDate: '2026-08-20',
  bookingTime: '10:00',
  hours: 4,
  cleaners: 1,
  totalAmount: 80, // €20/h × 4h × 1 cleaner
  tax: { netAmount: 80, vatAmount: 0, vatRate: 0 },
  specialRequests: [],
  cleaningTools: [],
  ...overrides
});

describe('bookingStartsAt / isLateCancellation', () => {
  test('builds the start moment from the stored local-format strings', () => {
    const at = bookingStartsAt({ bookingDate: '2026-08-20', bookingTime: '12:20' });
    expect(at.getFullYear()).toBe(2026);
    expect(at.getMonth()).toBe(7); // zero-based August
    expect(at.getDate()).toBe(20);
    expect(at.getHours()).toBe(12);
    expect(at.getMinutes()).toBe(20);
  });

  test('the window is one day by default', () => {
    expect(CANCELLATION_WINDOW_HOURS).toBe(24);
  });

  // The boundary is what the customer is promised, so both sides of it are
  // asserted rather than a comfortable value in the middle.
  test('a booking further out than the window is not a late cancellation', () => {
    const startsAt = new Date(Date.now() + 25 * 60 * 60 * 1000);
    expect(isLateCancellation(fromDate(startsAt))).toBe(false);
  });

  test('a booking inside the window is', () => {
    const startsAt = new Date(Date.now() + 23 * 60 * 60 * 1000);
    expect(isLateCancellation(fromDate(startsAt))).toBe(true);
  });

  test('a booking already in the past is', () => {
    const startsAt = new Date(Date.now() - 60 * 60 * 1000);
    expect(isLateCancellation(fromDate(startsAt))).toBe(true);
  });
});

describe('lateCancellationSettlement', () => {
  test('keeps exactly one hour of the booked crew and refunds the rest', () => {
    // €20/h × 4h × 1 cleaner = €80; one hour of that crew is €20.
    expect(lateCancellationSettlement(booking())).toEqual({ fee: 20, refundAmount: 60 });
  });

  test('an hour of a two-cleaner crew costs twice as much', () => {
    // €20/h × 3h × 2 cleaners = €120; an hour of BOTH cleaners is €40.
    const settlement = lateCancellationSettlement(
      booking({ hours: 3, cleaners: 2, totalAmount: 120, tax: { netAmount: 120, vatRate: 0 } })
    );
    expect(settlement).toEqual({ fee: 40, refundAmount: 80 });
  });

  test('half-hour durations divide correctly', () => {
    // €20/h × 1.5h = €30; the hour is still €20, leaving the half hour.
    const settlement = lateCancellationSettlement(
      booking({ hours: 1.5, totalAmount: 30, tax: { netAmount: 30, vatRate: 0 } })
    );
    expect(settlement).toEqual({ fee: 20, refundAmount: 10 });
  });

  test('a booking of exactly one hour keeps the whole charge', () => {
    const settlement = lateCancellationSettlement(
      booking({ hours: 1, totalAmount: 20, tax: { netAmount: 20, vatRate: 0 } })
    );
    expect(settlement).toEqual({ fee: 20, refundAmount: 0 });
  });

  test('add-ons are refunded in full — only the blocked hour is kept', () => {
    // €80 of labour + a €15 add-on and a €5 tool = €100 charged. The fee is the
    // labour hour (€20), NOT a quarter of the €100.
    const settlement = lateCancellationSettlement(
      booking({
        totalAmount: 100,
        tax: { netAmount: 100, vatRate: 0 },
        specialRequests: [{ price: 15 }],
        cleaningTools: [{ price: 5 }]
      })
    );
    expect(settlement).toEqual({ fee: 20, refundAmount: 80 });
  });

  test('the fee is gross when VAT was charged on top', () => {
    // €80 labour + €20 add-on = €100 net, +22% VAT = €122 charged. The add-on
    // grosses up to €24.40, leaving €97.60 of labour — an hour is €24.40.
    const settlement = lateCancellationSettlement(
      booking({
        totalAmount: 122,
        tax: { netAmount: 100, vatAmount: 22, vatRate: 22 },
        specialRequests: [{ price: 20 }]
      })
    );
    expect(settlement).toEqual({ fee: 24.4, refundAmount: 97.6 });
  });

  test('a reverse-charge business is settled on the net it actually paid', () => {
    // No VAT was added, so nothing is grossed up: €80 labour, an hour is €20.
    const settlement = lateCancellationSettlement(
      booking({
        totalAmount: 100,
        tax: { treatment: 'reverse-charge', netAmount: 100, vatAmount: 0, vatRate: 0 },
        specialRequests: [{ price: 20 }]
      })
    );
    expect(settlement).toEqual({ fee: 20, refundAmount: 80 });
  });

  test("a legacy booking's VAT-inclusive add-on prices are used as charged", () => {
    // No tax.netAmount => priced before VAT handling, when catalogue prices were
    // already inclusive. €100 charged − €20 add-on = €80 labour over 4h.
    const settlement = lateCancellationSettlement(
      booking({ totalAmount: 100, tax: undefined, specialRequests: [{ price: 20 }] })
    );
    expect(settlement).toEqual({ fee: 20, refundAmount: 80 });
  });

  test('fee and refund always add up to what was charged', () => {
    // A total that does not divide evenly — the two halves must still reconcile
    // to the cent rather than drift apart through independent rounding.
    const { fee, refundAmount } = lateCancellationSettlement(
      booking({ hours: 3, totalAmount: 100, tax: { netAmount: 100, vatRate: 0 } })
    );
    expect(fee).toBe(33.33);
    expect(Math.round((fee + refundAmount) * 100)).toBe(10000);
  });

  describe('unreconcilable figures fall back to an hour of the whole charge', () => {
    test('when an add-on has been repriced past the labour since', () => {
      // A €15 add-on since repriced to €500 would make the labour negative.
      const settlement = lateCancellationSettlement(
        booking({ specialRequests: [{ price: 500 }] })
      );
      expect(settlement).toEqual({ fee: 20, refundAmount: 60 });
    });

    test('when the add-on references reached us unpopulated', () => {
      // Object ids carry no price. Treating them as free would inflate the fee,
      // so the whole charge is divided instead — never more than the hour.
      const settlement = lateCancellationSettlement(
        booking({ totalAmount: 100, tax: { netAmount: 100, vatRate: 0 }, specialRequests: ['64b7f0c2f1a2b3c4d5e6f7a8'] })
      );
      expect(settlement).toEqual({ fee: 25, refundAmount: 75 });
    });
  });

  test('an unusable duration keeps the charge rather than inventing a refund', () => {
    expect(lateCancellationSettlement(booking({ hours: 0 }))).toEqual({ fee: 80, refundAmount: 0 });
  });

  test('an unpaid/zero booking settles to nothing either way', () => {
    expect(lateCancellationSettlement(booking({ totalAmount: 0 }))).toEqual({
      fee: 0,
      refundAmount: 0
    });
  });
});

/** The stored date/time string pair for a given moment. */
function fromDate(date) {
  return {
    bookingDate: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('-'),
    bookingTime: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  };
}
