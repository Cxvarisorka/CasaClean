/*
 * round-logo.cjs
 * --------------
 * One-off asset tool: takes the square-ish logo PNG, center-crops it to a
 * square, and applies an anti-aliased circular alpha mask so the favicon reads
 * as a round badge (CSS can't round a favicon — the image itself must be cut).
 * Pure Node (zlib only), no external deps.
 *
 *   node scripts/round-logo.cjs <input.png> <output.png>
 */
const fs = require("fs");
const zlib = require("zlib");

const [, , INPUT, OUTPUT] = process.argv;
if (!INPUT || !OUTPUT) {
  console.error("usage: node round-logo.cjs <input.png> <output.png>");
  process.exit(1);
}

// --- CRC32 (PNG flavour) ---------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
};

// --- Decode PNG (8-bit RGBA, non-interlaced) -------------------------------
function decodePng(buf) {
  let off = 8; // skip signature
  let width, height, colorType, bitDepth;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    off += 12 + len;
  }
  if (bitDepth !== 8 || colorType !== 6) {
    throw new Error(`expected 8-bit RGBA PNG, got bitDepth=${bitDepth} colorType=${colorType}`);
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4;
  const stride = width * bpp;
  const out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const inRow = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const outRow = out.subarray(y * stride, y * stride + stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, (y - 1) * stride + stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? outRow[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = inRow[x];
      switch (filter) {
        case 1: v += a; break;
        case 2: v += b; break;
        case 3: v += (a + b) >> 1; break;
        case 4: v += paeth(a, b, c); break;
      }
      outRow[x] = v & 0xff;
    }
  }
  return { width, height, pixels: out };
}

// --- Encode PNG (8-bit RGBA, filter 0) -------------------------------------
function encodePng(width, height, pixels) {
  const stride = width * 4;
  const rawWithFilters = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    rawWithFilters[y * (stride + 1)] = 0; // no filter
    pixels.copy(rawWithFilters, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = zlib.deflateSync(rawWithFilters, { level: 9 });

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, "ascii");
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  // 10,11,12 = compression/filter/interlace = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Center-crop to square + circular mask ---------------------------------
const src = decodePng(fs.readFileSync(INPUT));
const size = Math.min(src.width, src.height);
const ox = Math.floor((src.width - size) / 2);
const oy = Math.floor((src.height - size) / 2);

const out = Buffer.alloc(size * size * 4);
const cx = (size - 1) / 2;
const cy = (size - 1) / 2;
const r = size / 2;
const edge = 1.5; // anti-alias band width in px

for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const si = ((y + oy) * src.width + (x + ox)) * 4;
    const di = (y * size + x) * 4;
    out[di] = src.pixels[si];
    out[di + 1] = src.pixels[si + 1];
    out[di + 2] = src.pixels[si + 2];
    const dist = Math.hypot(x - cx, y - cy);
    // 1 inside, fading to 0 across the edge band at the circle boundary.
    let mask = (r - dist) / edge + 0.5;
    mask = Math.max(0, Math.min(1, mask));
    out[di + 3] = Math.round(src.pixels[si + 3] * mask);
  }
}

fs.writeFileSync(OUTPUT, encodePng(size, size, out));
console.log(`wrote ${OUTPUT} (${size}x${size} round)`);
