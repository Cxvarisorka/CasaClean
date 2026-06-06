const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// How long an email-verification link stays valid (in hours).
const VERIFICATION_TOKEN_TTL_HOURS = 24;

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
        unique: true
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
    avatar: String
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

userSchema.index({ role: 1, isVerified: 1 });

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.VERIFICATION_TOKEN_TTL_HOURS = VERIFICATION_TOKEN_TTL_HOURS;