const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

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
        trim: true
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

const User = mongoose.model('User', userSchema);

module.exports = User;