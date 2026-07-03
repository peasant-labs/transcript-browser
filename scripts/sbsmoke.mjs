import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const ROOT = new URL("..", import.meta.url).pathname;
const STORYBOOK_DIR = join(ROOT, "storybook-static");
const INDEX_JSON = join(STORYBOOK_DIR, "index.json");

function die(message) {
  console.error(`sbsmoke failed: ${message}`);
  process.exit(1);
}

if (!existsSync(INDEX_JSON)) die("storybook-static/index.json is missing; run storybook:build first");

const mime = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".json", "application/json"],
  [".svg", "image/svg+xml"],
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
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const index = JSON.parse(readFileSync(INDEX_JSON, "utf8"));
const stories = Object.values(index.entries ?? {}).filter((entry) => entry.type === "story");
if (stories.length === 0) die("no stories found in storybook-static/index.json");

function commandPath(command) {
  try {
    return execFileSync("sh", ["-c", `command -v ${command}`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

const executablePath =
  process.env.CHROME_PATH ||
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  commandPath("google-chrome-stable") ||
  commandPath("google-chrome") ||
  commandPath("chromium") ||
  commandPath("chromium-browser") ||
  [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].find((candidate) => existsSync(candidate));
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true });
const failures = [];

const storyMarkers = new Map([
  ["transcript-browser-domain-smoke--transcript-viewer", "transcript-viewer"],
  ["transcript-browser-domain-smoke--analytics-overview", "analytics-overview"],
]);

try {
  for (const story of stories) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource:")) errors.push(msg.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (res) => {
      if (res.status() >= 400) {
        const url = new URL(res.url());
        errors.push(`HTTP ${res.status()} ${url.pathname}`);
      }
    });
    const response = await page.goto(`${baseUrl}/iframe.html?id=${story.id}`, { waitUntil: "networkidle" });
    if (!response?.ok()) errors.push(`HTTP ${response?.status() ?? "no response"}`);
    await page.waitForSelector("#storybook-root", { state: "attached", timeout: 10000 });
    const expectedMarker = storyMarkers.get(story.id);
    if (expectedMarker) {
      try {
        await page.waitForSelector(`[data-sbsmoke="${expectedMarker}"]`, { state: "attached", timeout: 10000 });
      } catch (error) {
        const snapshot = await page.locator("body").evaluate((body) => body.textContent?.trim().slice(0, 500) ?? "");
        errors.push(`expected marker ${expectedMarker} did not attach: ${error.message}; body: ${snapshot}`);
      }
    }
    const hasBothThemes = await page.evaluate(() => {
      const root = document.querySelector("#storybook-root");
      return Boolean(root?.querySelector('[data-theme="dark"]') && root?.querySelector('[data-theme="light"]'));
    });
    if (!hasBothThemes) errors.push("story did not render both data-theme=dark and data-theme=light containers");
    if (expectedMarker) {
      const markerCount = await page.locator(`[data-sbsmoke="${expectedMarker}"]`).count();
      if (markerCount !== 2) {
        errors.push(`expected two rendered ${expectedMarker} story roots, found ${markerCount}`);
      }
      const markerText = await page
        .locator(`[data-sbsmoke="${expectedMarker}"]`)
        .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim().length ?? 0));
      if (markerText.some((length) => length === 0)) {
        errors.push(`${expectedMarker} story root rendered without text content`);
      }
      if (expectedMarker === "transcript-viewer") {
        const graphCount = await page.locator(".tb-detail-graphwrap").count();
        if (graphCount !== 2) {
          errors.push(`expected two rendered trajectory graph wrappers, found ${graphCount}`);
        }
      }
      if (expectedMarker === "analytics-overview") {
        // Assert the design-system dashboard renders STRUCTURALLY, not just
        // that the overview has text. `@peasant-labs/fairtrade/analytics`'s
        // ProjectOverview paints 4 always-on time-series charts through the
        // shared ChartBar/ChartLine (each a `<figure class="chart">` root),
        // plus its own hand-rolled outcome donut (`.gan-donut-svg`) and the
        // typical-vs-tail grid (`.gan-typical`) — the retired package's stats
        // Sparkline is gone. Counting roots (not svgs) mirrors the
        // trajectory-graph check and avoids recharts' width-measurement
        // flakiness in headless.
        const perPane = await page
          .locator(`[data-sbsmoke="analytics-overview"]`)
          .evaluateAll((panes) => panes.map((pane) => ({
            charts: pane.querySelectorAll(".chart").length,
            donuts: pane.querySelectorAll(".gan-donut-svg").length,
            typicals: pane.querySelectorAll(".gan-typical").length,
          })));
        if (perPane.length !== 2) {
          errors.push(`expected analytics-overview in both themes, found ${perPane.length} panes`);
        }
        perPane.forEach((counts, i) => {
          if (counts.charts < 4) {
            errors.push(`analytics-overview pane ${i} rendered ${counts.charts} .chart roots, expected >= 4`);
          }
          if (counts.donuts !== 1 || counts.typicals !== 1) {
            errors.push(`analytics-overview pane ${i}: donut=${counts.donuts} typical=${counts.typicals}, expected 1 of each`);
          }
        });
        if (perPane.length === 2 && perPane[0].charts !== perPane[1].charts) {
          errors.push(`analytics-overview chart-root count differs between themes: ${perPane[0].charts} vs ${perPane[1].charts}`);
        }
      }
    }
    if (errors.length > 0) failures.push(`${story.id}: ${errors.join(" | ")}`);
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) die(failures.join("\n"));
console.log(`sbsmoke passed (${stories.length} stories).`);
