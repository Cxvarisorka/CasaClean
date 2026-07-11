const mongoose = require('mongoose');
const dns = require('dns/promises');

// Some ISP resolvers fail the SRV/TXT lookups a mongodb+srv:// URI requires,
// so by default resolution goes through Google's public DNS. Environments with
// private/internal DNS (or blocked 8.8.8.8 egress) can override the list via
// DNS_SERVERS (comma-separated), or set it EMPTY (DNS_SERVERS=) to keep the
// system resolver untouched.
const dnsServers = (process.env.DNS_SERVERS ?? '8.8.8.8,8.8.4.4')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

if (dnsServers.length > 0) {
    dns.setServers(dnsServers);
}

const connectDB = async () => {
    // A failed DB connection is unrecoverable for this process: every request
    // would error. Let it throw so the caller can abort startup instead of
    // booting a server that can't serve anything.
    const connection = await mongoose.connect(process.env.MONGO_URI);
    console.log("DB succesfully connected");
    return connection;
};

module.exports = connectDB;
