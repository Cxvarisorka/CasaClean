/**
 * Tiny in-process TTL cache for the public catalogue lists.
 *
 * WHY THIS EXISTS
 * The booking wizard pulls all four catalogue lists (services, cities, add-ons,
 * cleaning tools) on load, and every one of them was a fresh round trip to
 * MongoDB for data an admin changes maybe weekly. The queries themselves are
 * index-served and cheap; what this removes is the network latency to the
 * database, paid once per visitor per page.
 *
 * WHAT IT DELIBERATELY IS NOT
 * This is a cache for *anonymous and non-admin* reads of *public* catalogue
 * pages only. Two rules keep it from ever showing anyone the wrong thing:
 *
 *   1. Admin requests bypass it entirely, in both directions. The panel must see
 *      its own writes immediately, and an `?includeDisabled=true` response
 *      contains soft-disabled records that must never reach the public.
 *   2. Every write to a catalogue resource invalidates that resource's entries,
 *      so the TTL is a backstop rather than the primary freshness mechanism.
 *
 * SCOPE LIMIT: the store is per-process. On a single instance (the current
 * deployment) that is exactly right and costs no infrastructure. If the API is
 * ever scaled beyond one instance, each instance keeps its own copy and a write
 * only invalidates the instance that served it — the others stay stale for up to
 * TTL_MS. That is tolerable for a catalogue at a 60s TTL, but if it isn't, this
 * is the seam to move behind Redis.
 */

// Long enough to absorb a burst of visitors landing on the wizard, short enough
// that a cross-instance stale window is measured in seconds.
const TTL_MS = 60 * 1000;

// Hard ceiling so a client walking ?page=1..N can't grow the map without bound.
// Catalogue pagination is small in practice (a handful of pages per resource),
// so hitting this at all means someone is probing.
const MAX_ENTRIES = 200;

const store = new Map();

/**
 * The value for `key`, or undefined when absent or expired.
 * Expired entries are dropped on read rather than swept on a timer.
 */
const get = (key) => {
    const entry = store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
    }

    return entry.value;
};

/** Cache `value` under `key`. */
const set = (key, value) => {
    // Evict the oldest insertion when full. Map preserves insertion order, so
    // the first key is the oldest — good enough for a bounded, uniform-cost set
    // of catalogue pages; no need for real LRU accounting.
    if (store.size >= MAX_ENTRIES && !store.has(key)) {
        const oldest = store.keys().next().value;
        if (oldest !== undefined) store.delete(oldest);
    }

    store.set(key, { value, expiresAt: Date.now() + TTL_MS });
};

/**
 * Drop every entry for one resource. Called from that resource's write paths,
 * so a create/edit/delete is visible on the public list immediately.
 *
 * @param {string} resource  the key prefix, e.g. "city"
 */
const invalidate = (resource) => {
    const prefix = `${resource}:`;
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
};

/** Drop everything. Test seam — suites must not leak cached pages into each other. */
const clear = () => store.clear();

/**
 * Build a cache key. Every input that changes the response body must appear here
 * or two different responses would collide on one key.
 */
const buildKey = (resource, page, limit) => `${resource}:${page}:${limit}`;

// Browser/CDN caching for the same responses. `stale-while-revalidate` lets a
// client show the cached catalogue instantly and refresh behind the scenes, so a
// repeat visitor never waits on this data at all.
const PUBLIC_CACHE_CONTROL = `public, max-age=${TTL_MS / 1000}, stale-while-revalidate=300`;
// Anything not publicly cacheable is an admin view that may contain
// soft-disabled records — never let a shared cache hold on to it.
const PRIVATE_CACHE_CONTROL = 'private, no-store';

/**
 * Serve a catalogue list, through the cache when the request is publicly
 * cacheable and straight from `build()` when it isn't.
 *
 * @param {Object}   res
 * @param {Object}   opts
 * @param {string}   opts.resource   cache-key prefix, e.g. "city"
 * @param {number}   opts.page
 * @param {number}   opts.limit
 * @param {boolean}  opts.cacheable  false for admin/includeDisabled requests
 * @param {Function} opts.build      async () => the response payload
 */
const serveList = async (res, { resource, page, limit, cacheable, build }) => {
    if (!cacheable) {
        const payload = await build();
        return res.status(200).set('Cache-Control', PRIVATE_CACHE_CONTROL).json(payload);
    }

    const key = buildKey(resource, page, limit);
    const hit = get(key);
    if (hit) {
        return res.status(200).set('Cache-Control', PUBLIC_CACHE_CONTROL).json(hit);
    }

    const payload = await build();
    set(key, payload);
    return res.status(200).set('Cache-Control', PUBLIC_CACHE_CONTROL).json(payload);
};

/**
 * Whether a catalogue list request may be served from (and stored in) the shared
 * cache. An admin is excluded even without ?includeDisabled, so the panel always
 * reads through to the database and sees its own writes with no TTL delay.
 */
const isCacheable = (req, includeDisabled) =>
    !includeDisabled && req.user?.role !== 'admin';

module.exports = {
    get,
    set,
    invalidate,
    clear,
    buildKey,
    serveList,
    isCacheable,
    TTL_MS,
    MAX_ENTRIES,
    PUBLIC_CACHE_CONTROL,
    PRIVATE_CACHE_CONTROL
};
