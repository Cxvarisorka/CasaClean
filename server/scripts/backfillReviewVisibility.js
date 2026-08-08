/*
 * One-off backfill: publish reviews written before moderation existed.
 * ---------------------------------------------------------------------------
 * Reviews are now created hidden (`isPublished: false`) and an admin approves
 * them before they show on the public site. Documents written before that field
 * existed have no `isPublished` at all, which reads as "hidden" — so without
 * this, reviews you already trusted would silently vanish from the public
 * listing.
 *
 * Run once, from `server/`:   node scripts/backfillReviewVisibility.js
 * It only touches documents where the field is MISSING, so re-running it is
 * harmless and it never overrides a decision an admin has already made.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectDB = require('../config/db.config');
const Review = require('../models/review.model');

const run = async () => {
    await connectDB();

    const result = await Review.updateMany(
        { isPublished: { $exists: false } },
        { $set: { isPublished: true, publishedAt: new Date() } }
    );

    console.log(`Published ${result.modifiedCount} pre-existing review(s).`);
};

run()
    .catch((err) => {
        console.error('Backfill failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.connection.close());
