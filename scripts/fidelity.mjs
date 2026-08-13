import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

/**
 * Fidelity gate (SOLE BLOCKING layer).
 *
 * Targets the built Storybook: for each story, Playwright navigates the story
 * iframe at a fixed viewport in both [data-theme] panes and runs deterministic
 * computed-style / DOM assertions covering the seven discrepancy classes the
 * token-only gates were blind to:
 *   fonts · two-panel layout · BrandMark · casing · semantic tone colour ·
 *   per-provider accent · icon identity (lucide class names).
 *
 * It does NOT pixel-diff against any foreign artifact — a 16px glyph swap or a
 * silent font fallback is invisible to pixels but exact here. (A per-story
 * self-baseline snapshot is a separate, advisory concern and is not run here.)
 */

const ROOT = new URL("..", import.meta.url).pathname;
const STORYBOOK_DIR = join(ROOT, "storybook-static");
const INDEX_JSON = join(STORYBOOK_DIR, "index.json");
const LABELS_FILE = join(ROOT, "packages/browser/src/lib/labels.ts");
const CODEBLOCK_THEME_FILE = join(ROOT, "packages/browser/src/testdata/codeblock-themes.yaml");

function die(message, details = []) {
  console.error(`fidelity gate failed: ${message}`);
  for (const d of details) console.error(`  - ${d}`);
  process.exit(1);
}

if (!existsSync(INDEX_JSON)) die("storybook-static/index.json is missing; run storybook:build first");

// ── Static check: the centralized chrome-label module is all-lowercase ──────
// String literals in lib/labels.ts (the single source of chrome strings) must
// carry no uppercase letter. Comments are ignored.
{
  const labelHits = [];
  readFileSync(LABELS_FILE, "utf8").split(/\n/).forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, "");
    if (/^\s*\*/.test(line) || /^\s*\/\*/.test(line)) return; // jsdoc/comment line
    for (const m of line.matchAll(/"([^"]*)"|'([^']*)'/g)) {
      const value = m[1] ?? m[2] ?? "";
      // skip import specifiers / type-only module paths
      if (/@peasant-labs|\.js$|\.\//.test(value)) continue;
      if (/[A-Z]/.test(value)) labelHits.push(`lib/labels.ts:${i + 1}: "${value}"`);
    }
  });
  if (labelHits.length > 0) die("lib/labels.ts contains non-lowercase chrome strings", labelHits);
}

// ── Static server over the storybook build (mirrors sbsmoke) ────────────────
const mime = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".json", "application/json"],
  [".svg", "image/svg+xml"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);
const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const file = normalize(join(STORYBOOK_DIR, pathname));
  if (!file.startsWith(STORYBOOK_DIR) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "content-type": mime.get(extname(file)) ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const index = JSON.parse(readFileSync(INDEX_JSON, "utf8"));
const stories = Object.values(index.entries ?? {}).filter((e) => e.type === "story");
if (stories.length === 0) die("no stories in storybook-static/index.json");

const codeBlockThemeFixture = (() => {
  const source = readFileSync(CODEBLOCK_THEME_FILE, "utf8");
  const values = [...source.matchAll(/expected(Light|Dark):\s*['"]?([^'"\n]+)['"]?/g)];
  const light = values.find((match) => match[1] === "Light")?.[2]?.trim();
  const dark = values.find((match) => match[1] === "Dark")?.[2]?.trim();
  if (!light || !dark) die("codeblock theme fixture must declare expectedLight and expectedDark");
  return { light, dark };
})();

function commandPath(command) {
  try {
    return execFileSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}
const executablePath =
  process.env.CHROME_PATH ||
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  commandPath("google-chrome-stable") ||
  commandPath("chromium") ||
  commandPath("chromium-browser") ||
  ["/usr/bin/google-chrome-stable", "/usr/bin/chromium"].find((c) => existsSync(c));

const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
const failures = [];

// The in-page assertion bundle. Runs inside each story iframe and returns a
// list of human-readable error strings. Token comparisons use a probe element
// injected INTO each [data-theme] pane so the value resolves in that theme.
const ASSERT = ({ EXPECTED_GLYPHS, ACCENTS, CODEBLOCK_THEME }) => {
  const errors = [];
  const root = document.querySelector("#storybook-root") ?? document.body;
  const marker = root.querySelector("[data-sbsmoke]")?.getAttribute("data-sbsmoke") ?? "";
  const panes = [...root.querySelectorAll('[data-theme="dark"], [data-theme="light"]')];
  if (panes.length === 0) panes.push(root);

  const resolve = (pane, prop, expr) => {
    const probe = document.createElement("span");
    probe.style.setProperty(prop, expr);
    probe.style.position = "absolute";
    pane.appendChild(probe);
    const v = getComputedStyle(probe)[prop === "background-color" ? "backgroundColor" : prop];
    probe.remove();
    return v;
  };

  // A drifted icon at a known slot must be BOUND to its container (a pane-wide
  // `.lucide-x` presence is not enough — the same glyph appears elsewhere) and
  // the WRONG glyph must be ABSENT in that slot, so a swap fails closed.
  const checkSlot = (pane, tag, containerSel, { expect, wrong = [], brand = false, required = true, label }) => {
    const c = pane.querySelector(containerSel);
    if (!c) {
      if (required) errors.push(`${tag}: ${label} container "${containerSel}" not found`);
      return;
    }
    if (brand) {
      if (!c.querySelector(".brand, .pv-icon")) errors.push(`${tag}: ${label} has no brand mark`);
    } else if (expect) {
      const ok = (Array.isArray(expect) ? expect : [expect]).some((g) => c.querySelector(`.lucide-${g}`));
      if (!ok) errors.push(`${tag}: ${label} missing expected glyph (${[].concat(expect).join("|")})`);
    }
    for (const w of wrong) {
      if (c.querySelector(`.lucide-${w}`)) errors.push(`${tag}: ${label} has drifted glyph .lucide-${w}`);
    }
  };

  for (const pane of panes) {
    const theme = pane.getAttribute("data-theme") ?? "?";
    const tag = `${marker || "story"}[${theme}]`;

    // 1) Fonts — EVERY mono-chrome element must resolve to Atkinson MONO
    // specifically (--font-mono), not merely some Atkinson face (checked across
    // all such elements, not a single sample, so any drift fails).
    const monoWanted = resolve(pane, "font-family", "var(--font-mono)");
    const seenFonts = new Set();
    for (const el of pane.querySelectorAll(".tb-eyebrow, .tb-tabstrip-tab")) {
      const ff = getComputedStyle(el).fontFamily;
      if (seenFonts.has(ff)) continue;
      seenFonts.add(ff);
      if (!/atkinson/i.test(ff)) errors.push(`${tag}: chrome font-family "${ff}" is not Atkinson`);
      else if (monoWanted && ff !== monoWanted) errors.push(`${tag}: chrome font "${ff}" != mono "${monoWanted}"`);
    }

    // 4) Casing — the full rendered chrome surface (tabs, eyebrows, graph role
    // labels, segmented toggles, rail captions) carries no uppercase letter.
    // The lead chrome segment is checked (content after a "·"/"/" separator —
    // e.g. a subagent's agent name — is USER CONTENT and skipped).
    for (const el of pane.querySelectorAll(
      ".tb-tabstrip-tab, .tb-eyebrow, .tb-gnode-role, .txn-rolelabel, .tb-segmented-btn, .tb-rail-tag-caption",
    )) {
      const lead = (el.textContent ?? "").split(/[·/]/)[0].replace(/\d+/g, "");
      if (/[A-Z]/.test(lead)) errors.push(`${tag}: non-lowercase chrome "${(el.textContent ?? "").trim()}"`);
    }

    if (marker.startsWith("screen-")) {
      // 2) Layout — two side <aside> panels (split), not a tabbed rail.
      const asides = pane.querySelectorAll("aside").length;
      if (asides !== 2) errors.push(`${tag}: expected 2 <aside> split panels, found ${asides}`);
      // 3) BrandMark — bound to the sticky-header brand slot (a pane-wide brand
      // check would be masked by the ubiquitous per-turn provider icons).
      checkSlot(pane, tag, ".tb-stickyhead-provider", { brand: true, label: "header brand slot" });
      // 6) Breadcrumb separator = chevron-right, bound to the crumb container.
      checkSlot(pane, tag, ".crumb", { expect: EXPECTED_GLYPHS.breadcrumbSeparator, label: "breadcrumb" });
    }

    // 6) Icon identity — every ratified drift location, container-bound + wrong-absent.
    if (marker === "screen-full-trace") {
      checkSlot(pane, tag, '[aria-label="Trajectory view mode"]', { expect: "network", wrong: ["workflow"], label: "view-mode toggle" });
    }
    if (marker === "screen-diffs") {
      checkSlot(pane, tag, 'nav[aria-label="Diffs outline"]', { expect: "pencil", wrong: ["file-diff"], label: "diffs outline" });
    }
    if (marker === "screen-files") {
      checkSlot(pane, tag, 'nav[aria-label="Files outline"]', { expect: "file-text", wrong: ["folder"], label: "files outline" });
      checkSlot(pane, tag, ".tb-filesview-table", {
        expect: ["chevrons-up-down", "chevron-up", "chevron-down"],
        wrong: ["arrow-up-down", "arrow-up", "arrow-down"],
        label: "files sort",
      });
    }
    if (marker === "screen-annotations") {
      // Per-type annotation glyphs (data-dependent; each rendered type is bound).
      checkSlot(pane, tag, '[data-anntype="retry"]', { expect: "refresh-cw", wrong: ["rotate-ccw"], required: false, label: "annotation retry" });
      checkSlot(pane, tag, '[data-anntype="revert"]', { expect: "rotate-ccw", wrong: ["undo-2"], required: false, label: "annotation revert" });
      checkSlot(pane, tag, '[data-anntype="subagent"]', { expect: "corner-down-right", wrong: ["bot"], required: false, label: "annotation subagent" });
    }
    if (marker === "screen-highlights") {
      // Final-response brand glyph in BOTH the view card AND the outline row;
      // the bespoke sparkles glyph must be absent from both.
      checkSlot(pane, tag, '.tb-hl-card[data-kind="final"]', { brand: true, wrong: ["sparkles"], label: "final-response (view)" });
      checkSlot(pane, tag, '.tb-outline-srow[data-kind="final"]', { brand: true, wrong: ["sparkles"], label: "final-response (outline)" });
    }

    // 5) Tone — each SEMANTIC slot's chip computed colour equals its canonical
    // token. Bound to the story's declared semantic slot (data-tone-chip), NOT to
    // the chip's own class, so an outcome→tone SWAP (e.g. failed rendered ok)
    // fails: resolved→--olive, partial→--amber, failed/error→--clay.
    if (marker === "toned-chips") {
      const slots = { ok: "olive", warn: "amber", err: "clay", "err-pill": "clay" };
      for (const [slot, token] of Object.entries(slots)) {
        const chip = pane.querySelector(`[data-tone-chip="${slot}"] .chip`);
        if (!chip) {
          errors.push(`${tag}: missing chip in semantic slot [data-tone-chip="${slot}"]`);
          continue;
        }
        const want = resolve(pane, "color", `var(--${token})`);
        const got = getComputedStyle(chip).color;
        if (want && got !== want) errors.push(`${tag}: ${slot} chip colour ${got} != var(--${token}) ${want}`);
      }
    }

    // 7) Role accents — ALL THREE roles, not just assistant: user = teal,
    // subagent = mauve, assistant = canonical provider accent for each harness.
    if (marker === "provider-accent") {
      const checkAccent = (sel, token, who) => {
        const row = pane.querySelector(sel);
        if (!row) {
          errors.push(`${tag}: missing accent rolelabel for ${who}`);
          return;
        }
        const want = resolve(pane, "color", `var(--${token})`);
        const got = getComputedStyle(row).color;
        if (want && got !== want) errors.push(`${tag}: ${who} accent ${got} != var(--${token}) ${want}`);
      };
      // Canonical model: the role accent tints the .txn-rolelabel (user=teal via
      // .txn-turn.user, subagent=mauve via .txn-turn.sub, assistant=per-provider
      // via an inline var). Assert the rolelabel's computed colour.
      checkAccent('[data-accent-role="user"] .txn-rolelabel', "teal", "user");
      checkAccent('[data-accent-role="subagent"] .txn-rolelabel', "mauve", "subagent");
      for (const [harness, token] of Object.entries(ACCENTS)) {
        checkAccent(`[data-accent-harness="${harness}"] .txn-rolelabel`, token, harness);
      }
    }

    if (marker === "brand-marks" && pane.querySelectorAll(".brand").length < 5) {
      errors.push(`${tag}: expected 5 brand marks, found ${pane.querySelectorAll(".brand").length}`);
    }

    if (marker === "codeblock-themes") {
      const token = pane.querySelector(".tb-codeblock-host .shiki-token");
      if (!token) {
        errors.push(`${tag}: highlighted CodeBlock token did not mount`);
      } else {
        const expectedHex = theme === "dark" ? CODEBLOCK_THEME.dark : CODEBLOCK_THEME.light;
        const colorProbe = document.createElement("span");
        colorProbe.style.color = expectedHex;
        pane.appendChild(colorProbe);
        const expectedColor = getComputedStyle(colorProbe).color;
        colorProbe.remove();
        const actualColor = getComputedStyle(token).color;
        if (actualColor !== expectedColor) errors.push(`${tag}: CodeBlock token colour ${actualColor} != fixture ${expectedHex} (${expectedColor})`);
      }
    }
  }
  return errors;
};

const EXPECTED_GLYPHS = {
  breadcrumbSeparator: "chevron-right",
  viewModeToggle: "network",
  diffsOutline: "pencil",
  filesOutline: "file-text",
};
const ACCENTS = {
  "claude-code": "amber",
  "gemini-cli": "teal",
  codex: "olive",
  opencode: "mauve",
  cursor: "clay",
};

try {
  for (const story of stories) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleErrors = [];
    page.on("pageerror", (e) => consoleErrors.push(e.message));
    const resp = await page.goto(`${baseUrl}/iframe.html?id=${story.id}`, { waitUntil: "networkidle" });
    if (!resp?.ok()) consoleErrors.push(`HTTP ${resp?.status() ?? "no response"}`);
    await page.waitForSelector("#storybook-root", { state: "attached", timeout: 10000 });
    const errors = await page.evaluate(ASSERT, { EXPECTED_GLYPHS, ACCENTS, CODEBLOCK_THEME: codeBlockThemeFixture });
    const all = [...errors, ...consoleErrors];
    if (all.length > 0) failures.push(`${story.id}:\n    ${all.join("\n    ")}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) die("per-story fidelity assertions failed", failures);
console.log(`Fidelity gate passed (${stories.length} stories; fonts, layout, BrandMark, casing, tone, accent, icon-identity, CodeBlock themes).`);
