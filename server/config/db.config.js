const mongoose = require('mongoose');
const dns = require('dns/promises');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
    // A failed DB connection is unrecoverable for this process: every request
    // would error. Let it throw so the caller can abort startup instead of
    // booting a server that can't serve anything.
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log("DB succesfully connected");
    return connection;
};

module.exports = connectDB;