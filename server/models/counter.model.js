const mongoose = require('mongoose');

// Counter
// -------
// Atomic named sequences. Currently backs invoice numbering, which needs a gap-
// free, strictly increasing series per year — something an ObjectId or a
// countDocuments() + 1 can't give you (both break under concurrency, and the
// latter reuses a number after a delete).
//
// One document per sequence, keyed by a caller-chosen string (`invoice:2026`).
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
  },
  { collection: 'counters', versionKey: false }
);

/**
 * Reserve and return the next value of a sequence.
 *
 * `$inc` with `upsert` is a single atomic operation, so concurrent callers can
 * never receive the same number. The upsert itself can still lose a race when
 * the document doesn't exist yet (both writers try to insert `_id`), which
 * surfaces as a duplicate-key error — retry once and the second attempt takes
 * the plain `$inc` path.
 *
 * @param {string} key  sequence name, e.g. "invoice:2026"
 * @returns {Promise<number>} the reserved value (first call returns 1)
 */
counterSchema.statics.next = async function next(key) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const doc = await this.findOneAndUpdate(
        { _id: key },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      return doc.seq;
    } catch (err) {
      if (err.code !== 11000 || attempt === 1) throw err;
    }
  }
  // Unreachable: the loop either returns or rethrows.
  throw new Error(`Could not reserve a value for counter "${key}".`);
};

const Counter = mongoose.model('Counter', counterSchema);
module.exports = Counter;
