import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fairtradeTokenFile } from "./fairtrade-token-paths.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const fairtradePath = fairtradeTokenFile("tokens.css");
const css = `${readFileSync(fairtradePath, "utf8")}\n${readFileSync(join(ROOT, "packages/browser/src/styles.css"), "utf8")}`;

function parseBlock(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out = new Map();
  for (const match of css.matchAll(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "gm"))) {
    for (const token of match[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
      out.set(token[1], token[2].trim());
    }
  }
  return out;
}

const dark = parseBlock(":root");
const light = new Map([...dark, ...parseBlock('[data-theme="light"]')]);

function resolve(tokens, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`cycle while resolving ${name}`);
  seen.add(name);
  const raw = tokens.get(name);
  if (!raw) throw new Error(`missing ${name}`);
  const varMatch = raw.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (varMatch) return resolve(tokens, varMatch[1], seen);
  return raw;
}

function parseColor(value) {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgb = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)$/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] == null ? 1 : Number(rgb[4])];
  throw new Error(`unsupported color ${value}`);
}

function composite(over, under) {
  const alpha = over[3];
  return [
    Math.round(over[0] * alpha + under[0] * (1 - alpha)),
    Math.round(over[1] * alpha + under[1] * (1 - alpha)),
    Math.round(over[2] * alpha + under[2] * (1 - alpha)),
    1,
  ];
}

function luminance([r, g, b]) {
  const channel = (v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function colorFor(tokens, name, base = null) {
  const color = parseColor(resolve(tokens, name));
  if (color[3] === 1) return color;
  if (!base) throw new Error(`${name} is translucent but no composite base was provided`);
  return composite(color, parseColor(resolve(tokens, base)));
}

const functionalPairs = [
  ["--chart-1", "--chart-surface"],
  ["--chart-2", "--chart-surface"],
  ["--chart-3", "--chart-surface"],
  ["--chart-4", "--chart-surface"],
  ["--chart-amber", "--chart-surface"],
  ["--edge", "--surface"],
  ["--edge-error", "--surface"],
];
const reportOnlyPairs = [
  ["--rail", "--surface"],
  ["--chart-grid", "--chart-surface"],
  ["--chart-axis", "--chart-surface"],
];

let failed = false;
for (const [themeName, tokens] of [["dark", dark], ["light", light]]) {
  for (const [fg, bg, bgBase] of functionalPairs) {
    try {
      const value = ratio(colorFor(tokens, fg), colorFor(tokens, bg, bgBase));
      if (value < 3) throw new Error(`${value.toFixed(2)} < 3`);
    } catch (error) {
      failed = true;
      console.error(`Contrast gate failed: ${themeName} functional pair ${fg}/${bg}: ${error.message}`);
    }
  }
  for (const [fg, bg, bgBase] of reportOnlyPairs) {
    try {
      const value = ratio(colorFor(tokens, fg), colorFor(tokens, bg, bgBase));
      console.warn(`Contrast report-only: ${themeName} decorative pair ${fg}/${bg} = ${value.toFixed(2)}`);
    } catch (error) {
      failed = true;
      console.error(`Contrast gate failed: ${themeName} report-only pair ${fg}/${bg}: ${error.message}`);
    }
  }
}

if (failed) process.exit(1);
console.log("Domain contrast gate passed.");
