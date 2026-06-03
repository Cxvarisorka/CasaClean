/*
 * Image registry
 * --------------
 * Centralized, optimized Unsplash URLs so imagery is never hardcoded across
 * components. `img()` builds a sized, auto-formatted CDN URL; IMAGES groups the
 * curated photographs by role. Every consumer renders these through the <Image>
 * primitive, which gracefully falls back to a brand gradient if a URL fails.
 */

const CDN = "https://images.unsplash.com";

/**
 * Build an optimized Unsplash URL.
 * @param {string} id - the photo id (e.g. "photo-1522708323590-d24dbb6b0267")
 * @param {object} [opts]
 * @param {number} [opts.w=1200] @param {number} [opts.h] @param {number} [opts.q=80]
 */
export const img = (id, { w = 1200, h, q = 80 } = {}) =>
  `${CDN}/${id}?auto=format&fit=crop&q=${q}&w=${w}${h ? `&h=${h}` : ""}`;

export const IMAGES = {
  // Hero & marketing interiors
  heroInterior: img("photo-1522708323590-d24dbb6b0267", { w: 1100, h: 1300 }),
  livingModern: img("photo-1586023492125-27b2c045efd7", { w: 1200 }),
  interiorLux: img("photo-1600210492486-724fe5c67fb0", { w: 1200 }),
  dining: img("photo-1600607687939-ce8a6c25118c", { w: 1200 }),

  // Before / after showcase
  beforeRoom: img("photo-1493809842364-78817add7ffb", { w: 1200, h: 800 }),
  afterRoom: img("photo-1505693416388-ac5ce068fe85", { w: 1200, h: 800 }),

  // Service-specific
  turnover: img("photo-1583847268964-b28dc8f51f92", { w: 900, h: 600 }),
  linens: img("photo-1522771739844-6a9f6d5f14af", { w: 900, h: 600 }),
  restock: img("photo-1584813470613-5b1c1cad3d69", { w: 900, h: 600 }),
  inspection: img("photo-1600566753190-17f0baa2a6c3", { w: 900, h: 600 }),
  deepClean: img("photo-1581578731548-c64695cc6952", { w: 900, h: 600 }),
  guestReady: img("photo-1631049307264-da0ec9d70304", { w: 900, h: 600 }),

  // Backgrounds (used behind overlays)
  ctaBackdrop: img("photo-1600585154340-be6161a56a0c", { w: 1600, h: 900 }),
  pageBackdrop: img("photo-1560448204-e02f11c3d0e2", { w: 1600, h: 700 }),
  kitchen: img("photo-1556911220-bff31c812dba", { w: 1200 }),
  bathroom: img("photo-1620626011761-996317b8d101", { w: 1200 }),

  // Blog covers
  blog: {
    "back-to-back-turnovers": img("photo-1581578731548-c64695cc6952", { w: 1200, h: 750 }),
    "linen-par-levels": img("photo-1522771739844-6a9f6d5f14af", { w: 1200, h: 750 }),
    "guest-ready-checklist": img("photo-1600566753086-00f18fb6b3ea", { w: 1200, h: 750 }),
    "scaling-to-ten-listings": img("photo-1560448204-e02f11c3d0e2", { w: 1200, h: 750 }),
    "automated-restocking": img("photo-1584813470613-5b1c1cad3d69", { w: 1200, h: 750 }),
    "damage-disputes": img("photo-1554995207-c18c203602cb", { w: 1200, h: 750 }),
  },
};

// Portrait photos for people (square crops).
export const PORTRAITS = {
  w1: img("photo-1494790108377-be9c29b29330", { w: 200, h: 200 }),
  w2: img("photo-1438761681033-6461ffad8d80", { w: 200, h: 200 }),
  w3: img("photo-1534528741775-53994a69daeb", { w: 200, h: 200 }),
  m1: img("photo-1500648767791-00dcc994a43e", { w: 200, h: 200 }),
  m2: img("photo-1472099645785-5658abf4ff4e", { w: 200, h: 200 }),
  m3: img("photo-1519085360753-af0119f7cbe7", { w: 200, h: 200 }),
};
