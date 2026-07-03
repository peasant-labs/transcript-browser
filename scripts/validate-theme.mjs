import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SOURCE_DIRS = ["packages/browser/src", "examples/minimal/src"];
const CSS_FILES = ["packages/browser/src/styles.css"];

function rel(path) {
  return relative(ROOT, path);
}

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function fail(message, details = []) {
  console.error(`Theme validation failed: ${message}`);
  for (const detail of details) console.error(`  - ${detail}`);
  process.exitCode = 1;
}

function listFiles(dir) {
  const out = [];
  const stack = [join(ROOT, dir)];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) stack.push(path);
      else out.push(path);
    }
  }
  return out;
}

function lineHits(file, regex, label) {
  const hits = [];
  const lines = readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, index) => {
    if (regex.test(line)) hits.push(`${rel(file)}:${index + 1}: ${label}: ${line.trim()}`);
    regex.lastIndex = 0;
  });
  return hits;
}

const allSource = [];
for (const dir of SOURCE_DIRS) allSource.push(...listFiles(dir));

const oldContractHits = allSource.flatMap((file) =>
  lineHits(file, /--tb-|tb-dark|data-tb-theme|\btb-focus\b/, "retired theme/focus contract"),
);
if (oldContractHits.length > 0) fail("old transcript-browser theme/focus contract remains", oldContractHits);

// Sub-16px font floor (a11y). The lint must catch every FORM a sub-16px size
// can take, not just bare `px`, so a size can't evade the floor via units:
//   CSS:  font-size: 12px | font-size: 0.8rem   (rem = 16px base)
//   TSX:  fontSize: 12 (unitless = px in React)
//         fontSize: "12px" | "0.8rem"           (string value)
//         fontSize={12} | fontSize="12px"        (JSX expr/attr)
// `em` is parent-relative (intentional for prose scaling, e.g. inline <code>)
// and is deliberately NOT linted — the floor concerns absolute body text.
const FLOOR_PX = 16;

/** px-equivalent of a numeric `value`+`unit`, or null if not a linted unit. */
function pxEquivalent(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const u = (unit ?? "").toLowerCase();
  if (u === "rem") return n * 16;
  if (u === "px" || u === "") return n;
  return null; // em / %, etc. — relative, not linted
}

const cssTexts = CSS_FILES.map((file) => [file, read(file)]);
const fontHits = [];
// CSS: `font-size:` with a px OR rem value (em intentionally skipped).
for (const [file, css] of cssTexts) {
  css.split(/\n/).forEach((line, index) => {
    for (const match of line.matchAll(/font-size:\s*([0-9.]+)(px|rem|em)?/gi)) {
      const px = pxEquivalent(match[1], match[2]);
      if (px != null && px < FLOOR_PX) fontHits.push(`${file}:${index + 1}: ${match[0].trim()}`);
    }
  });
}
// TSX/TS: `fontSize` in a style object (`:`) or JSX attr (`=`), unitless,
// quoted-string, or `{…}` expression — px/rem forms are converted, em skipped.
for (const file of allSource.filter((path) => /\.(ts|tsx)$/.test(path))) {
  const lines = readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/fontSize\s*[:=]\s*\{?\s*["']?([0-9.]+)\s*(px|rem|em)?["']?\s*\}?/gi)) {
      const px = pxEquivalent(match[1], match[2]);
      if (px != null && px < FLOOR_PX) fontHits.push(`${rel(file)}:${index + 1}: ${match[0].trim()}`);
    }
  });
}
if (fontHits.length > 0) fail("font-size below 16px found", fontHits);

// Focus-outline suppression. Catch CSS `outline: none|0` AND inline-style /
// JSX outline suppression (`outline: "none"`, `outlineStyle: "none"`,
// `outline: 0`) — not just CSS, so a control can't drop its focus ring inline.
const focusHits = [];
for (const [file, css] of cssTexts) {
  css.split(/\n/).forEach((line, index) => {
    if (/outline:\s*(none|0)\b/.test(line)) focusHits.push(`${file}:${index + 1}: ${line.trim()}`);
  });
}
for (const file of allSource.filter((path) => /\.(ts|tsx)$/.test(path))) {
  const lines = readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, index) => {
    if (/outline\s*:\s*["']?\s*(none|0)\b/i.test(line) || /outlineStyle\s*:\s*["']\s*none\s*["']/i.test(line)) {
      focusHits.push(`${rel(file)}:${index + 1}: ${line.trim()}`);
    }
  });
}
if (focusHits.length > 0) fail("focus outline suppression found", focusHits);

const browserCss = read("packages/browser/src/styles.css");
if (!/\.tb-turn-accent-user\s*\{[^}]*var\(--teal/s.test(browserCss)) {
  fail("browser user turn accent must resolve to --teal");
}
if (!/\.tb-turn-accent-assistant\s*\{[^}]*var\(--amber/s.test(browserCss)) {
  fail("browser assistant turn accent must resolve to --amber");
}
if (/assistant[^;\n]*(--clay|clay)/i.test(browserCss)) {
  fail("assistant role must not use clay");
}

if (process.exitCode == null) {
  console.log("Domain theme validation passed.");
}
