// Build-time image precompression (run manually: `node scripts/precompress-images.mjs`).
//
// We intentionally keep `images.unoptimized: true` in next.config (no Vercel
// image-optimization billing), so files under public/ are served as-is. This
// script downsizes oversized images to display-appropriate dimensions and
// re-encodes them IN PLACE — same filename + same format — so NO code
// references change (zero regression risk).
//
// Safety: PNGs are re-encoded LOSSLESS (no palette quantization → no banding on
// gradients); JPEGs at high quality. Max widths are generous (>=2.5x the
// rendered size) so there is no visible quality loss. A file is only
// overwritten when the result is actually smaller.
import sharp from "sharp";
import { readdir, stat, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../public/", import.meta.url));

// Per-path max widths, chosen well above each asset's rendered size.
const RULES = [
  { test: (p) => p.includes("/images/interview/types/"), maxWidth: 512 }, // rendered <=176px
  { test: (p) => /\/images\/interview\/mode-/.test(p), maxWidth: 768 }, // mode cards
  { test: (p) => p.includes("/portfolio-backgrounds/"), maxWidth: 1920 }, // full-bleed bg
  { test: (p) => p.includes("/interview/backgrounds/"), maxWidth: 1920 }, // full-bleed bg
];
const DEFAULT_MAX_WIDTH = 1440;
const MIN_BYTES = 100 * 1024; // ignore anything already small

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function targetWidth(path) {
  for (const r of RULES) if (r.test(path)) return r.maxWidth;
  return DEFAULT_MAX_WIDTH;
}

let before = 0;
let after = 0;
let processed = 0;
let skipped = 0;

for await (const path of walk(ROOT)) {
  const ext = extname(path).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;

  const { size } = await stat(path);
  if (size < MIN_BYTES) {
    skipped++;
    continue;
  }

  const input = sharp(path, { failOn: "error" });
  const meta = await input.metadata();
  const maxW = targetWidth(path);

  let pipeline = input;
  if (meta.width && meta.width > maxW) {
    pipeline = pipeline.resize({ width: maxW, withoutEnlargement: true });
  }
  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, effort: 10 }); // lossless
  } else {
    pipeline = pipeline.jpeg({ quality: 88, mozjpeg: true });
  }

  const buf = await pipeline.toBuffer();
  if (buf.length < size) {
    await writeFile(path, buf);
    before += size;
    after += buf.length;
    processed++;
    const rel = path.slice(ROOT.length);
    console.log(
      `  ${(size / 1024).toFixed(0).padStart(5)}KB -> ${(buf.length / 1024)
        .toFixed(0)
        .padStart(5)}KB  ${rel}`,
    );
  } else {
    skipped++;
  }
}

console.log(
  `\nProcessed ${processed} images: ${(before / 1048576).toFixed(1)}MB -> ${(
    after / 1048576
  ).toFixed(1)}MB saved ${((before - after) / 1048576).toFixed(1)}MB (skipped ${skipped})`,
);
