const mongoose = require('mongoose');
const dns = require('dns/promises');

const { isProduction } = require('../utils/env.util');

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

/*
 * Driver options. Every one of these was previously a default, and two of the
 * defaults were actively harmful:
 *
 *   - serverSelectionTimeoutMS defaulted to 30s, so a primary election (or a
 *     brief network partition) left every in-flight request hanging for half a
 *     minute before failing. 5s fails fast enough for the client to retry.
 *   - autoIndex defaulted to true, which makes Mongoose build indexes on first
 *     use of every model. Production index management is explicit (app.js calls
 *     syncIndexes on boot), so in production that is duplicated work on a path
 *     where an unexpected foreground index build is the last thing we want.
 *     Kept ON in dev/test, where it is what makes a fresh clone and the
 *     in-memory test database work with no setup step.
 *
 * maxPoolSize is deliberately well below the driver's default of 100: a single
 * starter instance cannot usefully saturate 100 sockets, and a shared Atlas tier
 * has a hard connection cap that a couple of deploys' worth of lingering pools
 * can exhaust.
 *
 * Wire compression is worth it because the app and the database are a network
 * hop apart (Render Frankfurt <-> Atlas) and the documents are repetitive JSON —
 * catalogue records carry a translations map per language, which compresses very
 * well. It is deliberately `zlib` and not zstd/snappy: those are faster and
 * compress better, but the driver declares them as OPTIONAL PEER DEPENDENCIES
 * (@mongodb-js/zstd, snappy) and THROWS at connect time if a configured
 * compressor's native module is missing. zlib ships inside Node, so it can never
 * fail that way. Level 1 rather than the default 6 — this runs on the libuv
 * threadpool that bcrypt and the response compressor already share, so the goal
 * is "cheap and good enough", not maximum ratio. Set MONGO_COMPRESSION=off to
 * disable it if the instance ever turns out to be CPU-bound rather than
 * network-bound.
 */
const compressionEnabled = process.env.MONGO_COMPRESSION !== 'off';

const connectionOptions = {
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE) || 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: !isProduction,
    ...(compressionEnabled ? { compressors: ['zlib'], zlibCompressionLevel: 1 } : {})
};

const connectDB = async () => {
    // A failed DB connection is unrecoverable for this process: every request
    // would error. Let it throw so the caller can abort startup instead of
    // booting a server that can't serve anything.
    const connection = await mongoose.connect(process.env.MONGO_URI, connectionOptions);
    console.log("DB succesfully connected");
    return connection;
};

module.exports = connectDB;
// Exported for the boot-time index sync, which needs to know whether Mongoose
// already built indexes on its own (dev/test) or whether it is the only thing
// managing them (production).
module.exports.autoIndexEnabled = connectionOptions.autoIndex;
