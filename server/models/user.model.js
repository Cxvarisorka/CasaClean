const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// How long an email-verification link stays valid (in hours).
const VERIFICATION_TOKEN_TTL_HOURS = 24;

// How long a password-reset link stays valid (in minutes). Deliberately much
// shorter than the verification window — a reset link is a live credential.
const PASSWORD_RESET_TTL_MINUTES = 30;

// Signin lockout: after this many consecutive failed password attempts the
// account is locked for LOCK_TIME_MINUTES (on top of the per-IP rate limit,
// which a distributed credential-stuffing run can sidestep).
const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_TIME_MINUTES = 15;

const userSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: [true, "Fullname is required!"]
    },
    email: {
        type: String,
        required: [true, "Email is required!"],
        unique: true,
        lowercase: true,                 // normalise so logins are case-insensitive
        trim: true
    },
    phone: {
        type: String,
        required: [function () { return this.provider === "local" }, "Phone number is required!"],
        trim: true,
        // sparse: Google users are created without a phone. A non-sparse unique
        // index puts every phone-less document into the index as null, so the
        // SECOND Google user ever would collide (E11000) and be unable to sign
        // up. Local users always have a phone, so their uniqueness is unchanged.
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: [function () { return this.provider === "local" }, "Password is required!"],
        minlength: [8, "Password must be at least 8 characters!"],
        select: false                    // never returned by default queries
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    // Only the SHA-256 *hash* of the verification token is stored. The raw token
    // travels in the email link, so even a DB leak can't be used to verify
    // accounts. select:false keeps it out of normal query results.
    verificationToken: {
        type: String,
        select: false
    },
    verificationTokenExpires: {
        type: Date,
        select: false
    },
    // Password reset — same hashed-token pattern as email verification: only
    // the SHA-256 hash is stored, the raw token lives in the emailed link.
    passwordResetToken: {
        type: String,
        select: false
    },
    passwordResetExpires: {
        type: Date,
        select: false
    },
    // Session revocation. The JWT carries this number as its `v` claim; the
    // protect middleware rejects tokens whose claim doesn't match the live
    // value. Incrementing it (on password change/reset) instantly invalidates
    // every outstanding session for the account.
    tokenVersion: {
        type: Number,
        default: 0,
        select: false
    },
    // Per-account signin throttling (complements the per-IP rate limiter).
    failedLoginAttempts: {
        type: Number,
        default: 0,
        select: false
    },
    lockUntil: {
        type: Date,
        select: false
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    provider: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },
    avatar: String,
    // --- Payments (Stripe) ------------------------------------------------------
    // The user's Stripe Customer id, created lazily on their first payment (see
    // ensureStripeCustomer). Saved cards and PaymentIntents are attached to it.
    // sparse+unique: most users won't have one until they pay, and null values
    // must not collide on the unique index.
    stripeCustomerId: {
        type: String,
        unique: true,
        sparse: true
    },
    // The card the user picked as their default for one-click future bookings.
    // A Stripe PaymentMethod id ("pm_..."); cleared if that card is removed.
    defaultPaymentMethodId: {
        type: String
    }
}, {
    timestamps: true
});

// Hash the password before saving, but only when it actually changed
// (otherwise updates would re-hash an already-hashed value).
userSchema.pre('save', async function() {
    if(!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
});

// Instance method to compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = async function (candidate) {
    return await bcrypt.compare(candidate, this.password);
};

/**
 * Generate a one-time email-verification token.
 *
 * Returns the RAW token (to be embedded in the email link) while persisting
 * only its SHA-256 hash on the document, together with an expiry timestamp.
 * The caller is responsible for saving the document afterwards.
 *
 * @returns {string} the raw, un-hashed token for the verification URL
 */
userSchema.methods.createVerificationToken = function () {
    const rawToken = crypto.randomBytes(32).toString("hex");

    this.verificationToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    this.verificationTokenExpires = Date.now() + VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000;

    return rawToken;
};

/**
 * Generate a one-time password-reset token (same pattern as the verification
 * token: the raw value goes in the emailed link, only its hash is persisted).
 * The caller is responsible for saving the document afterwards.
 *
 * @returns {string} the raw, un-hashed token for the reset URL
 */
userSchema.methods.createPasswordResetToken = function () {
    const rawToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

    this.passwordResetExpires = Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000;

    return rawToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.VERIFICATION_TOKEN_TTL_HOURS = VERIFICATION_TOKEN_TTL_HOURS;
module.exports.PASSWORD_RESET_TTL_MINUTES = PASSWORD_RESET_TTL_MINUTES;
module.exports.MAX_LOGIN_ATTEMPTS = MAX_LOGIN_ATTEMPTS;
module.exports.LOCK_TIME_MINUTES = LOCK_TIME_MINUTES;