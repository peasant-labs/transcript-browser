/* Screenshot the REAL transcript-browser assembled app (minimal example):
     wire SessionDetailPayload -> adaptTranscript() -> <TranscriptViewer> (lifted fairtrade composite),
     with TB's @xyflow TrajectoryGraph plugged into graphSlot.

   Mirrors the surface set + nav of fairtrade scripts/shootdemo.mjs so the shots pair 1:1 with the
   DEMO captures. Differences handled here:
     - no app-switcher / no #inuse-stage scroll-snap wrapper (the viewer renders directly inside the
       host's 100vh flex column), so there is no stage-snap scroll to settle before a capture.
     - the host height-constrains the viewer (100vh flex column; the lifted .txn-app is height:100%),
       so .txn-stream scrolls INTERNALLY exactly like the demo — which is what lets the sticky scrubber
       reveal on scroll. The tall trace canvas is captured with shotTall(): it grows the viewport by the
       inner stream's overflow and live-captures (captureBeyondViewport:false) so the WHOLE stream rasters
       on the compositor with no off-screen blanks; the one-screen surfaces use shot().
     - theme is toggled via the host .theme-btn (sets [data-theme] + passes the theme prop), not a URL param.

   Each surface is wrapped so one failure records a gap and continues — maximising artifacts + an honest
   gap list for the UAT manifest, rather than aborting the whole run.

   env:
     TB_URL          dev-server URL of the minimal example      (default http://localhost:5173/ — Vite default)
     CHROME_PATH     Chrome/Chromium binary puppeteer drives    (required)
     PUPPETEER_CORE  explicit module path to puppeteer-core     (optional; only if a bare import won't resolve)
   usage: TB_URL=http://localhost:5173/ CHROME_PATH=/path/to/chrome node tb-shoot.mjs <theme> <outdir>
*/
import { mkdirSync, statSync } from 'node:fs'
// puppeteer-core is resolved from the host's node_modules. The transcript-browser repo does not
// depend on it directly (the demo side, fairtrade, does), so set PUPPETEER_CORE to an explicit
// module path if a bare 'puppeteer-core' does not resolve from where you run this. See README.
const puppeteer = (await import(process.env.PUPPETEER_CORE || 'puppeteer-core')).default

const CHROME = process.env.CHROME_PATH
const URL = process.env.TB_URL || 'http://localhost:5173/'
const theme = process.argv[2] || 'dark'
const out = process.argv[3] || `/tmp/tb-${theme}`
mkdirSync(out, { recursive: true })

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 1460, height: 1000, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
const errs = []
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()) })
page.on('pageerror', (e) => errs.push('pageerr: ' + e.message))
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 900))

const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const results = [] // { name, status, info }

/* ── theme: default is dark; click .theme-btn once to reach light, then verify [data-theme] ── */
if (theme === 'light') {
  await page.evaluate(() => document.querySelector('.theme-btn')?.click())
  await pause(500)
}
const activeTheme = await page.evaluate(() => document.querySelector('[data-theme]')?.getAttribute('data-theme'))
if (activeTheme !== theme) {
  console.error(`WARN: requested theme="${theme}" but [data-theme]="${activeTheme}" — toggle may have failed`)
}

/* ── nav helpers (same selectors as the lifted composite the demo drives) ── */
const waitFor = async (sel, timeoutMs = 3000) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) { const el = await page.$(sel); if (el) return el; await pause(80) }
  throw new Error(`selector "${sel}" never mounted (${timeoutMs}ms)`)
}
const txnTab = async (label) => {
  const ok = await page.evaluate((label) => {
    const b = [...document.querySelectorAll('.txn-tab')].find((x) => x.textContent.toLowerCase().includes(label))
    if (!b) return false; b.click(); return true
  }, label)
  if (!ok) throw new Error(`tab "${label}" not found`)
  await pause(450)
}
const txnViewMode = async (mode) => {
  const ok = await page.evaluate((mode) => {
    const b = [...document.querySelectorAll('.txn-viewtoggle .bs-seg-opt')].find((x) => x.textContent.toLowerCase().includes(mode))
    if (!b) return false; b.click(); return true
  }, mode)
  if (!ok) throw new Error(`view-mode "${mode}" not found`)
  await pause(550)
}
const expandAllTools = async () => {
  const ok = await page.evaluate(() => {
    const sw = [...document.querySelectorAll('.txn-viewsw')].find((x) => x.textContent.toLowerCase().includes('expand all'))
    if (!sw) return false
    ;(sw.querySelector('button, [role="switch"], .toggle') || sw).click(); return true
  })
  if (!ok) throw new Error('"expand all tool calls" switch not found')
  await pause(500)
}

/* grow the viewport so the full target element is on-screen, then live-capture it (no off-screen raster).
   restores the base viewport afterwards. */
const shot = async (name, sel = '.txn-app') => {
  const el = await waitFor(sel)
  const box0 = await el.boundingBox()
  if (!box0) throw new Error(`"${sel}" has no box`)
  const baseVp = page.viewport()
  const needH = Math.ceil(box0.y + box0.height + 24)
  const tallH = Math.min(Math.max(baseVp.height, needH), 8000)
  if (tallH !== baseVp.height) { await page.setViewport({ ...baseVp, height: tallH }); await pause(300) }
  const el2 = await page.$(sel)
  const box = await el2.boundingBox()
  if (!box || box.width < 4 || box.height < 4) {
    if (tallH !== baseVp.height) { await page.setViewport(baseVp); await pause(120) }
    throw new Error(`"${sel}" blank/zero-size: ${JSON.stringify(box)}`)
  }
  await el2.screenshot({ path: `${out}/${name}.png`, captureBeyondViewport: false })
  if (tallH !== baseVp.height) { await page.setViewport(baseVp); await pause(150) }
  const bytes = statSync(`${out}/${name}.png`).size
  results.push({ name, status: 'ok', info: `${Math.round(box.width)}x${Math.round(box.height)} ${(bytes / 1024).toFixed(1)}KB` })
  console.log('shot', name.padEnd(22), `${Math.round(box.width)}x${Math.round(box.height)}`.padEnd(11), `${(bytes / 1024).toFixed(1)}KB`)
}

/* Capture a surface whose content scrolls inside an inner container (`scroller`) IN FULL.
   The host bounds the viewer (100vh flex column), so `.txn-app` is locked to the viewport
   height and `.txn-stream` scrolls INTERNALLY — a plain shot() would only grab the top fold.
   Mirrors the demo harness's shotTall: grow the viewport by EXACTLY the scroller's overflow
   (scrollHeight - clientHeight) so the inner stream's clientHeight expands to fit its content
   with no overflow (and no trailing empty band), then live-capture the whole element on the
   compositor (captureBeyondViewport:false needs every pixel on-screen). Restores the base
   viewport afterwards so the scroll-reveal surfaces that follow (scrubber/rails) behave normally.
   Capped at CAP px; a stream taller than that fails LOUD rather than silently clipping the tail. */
const CAP = 8000
const shotTall = async (name, sel = '.txn-app', scroller = '.txn-stream') => {
  await waitFor(sel)
  const baseVp = page.viewport()
  const extra = await page.evaluate((s) => { const el = document.querySelector(s); return el ? Math.max(0, el.scrollHeight - el.clientHeight) : 0 }, scroller)
  const tallH = Math.min(baseVp.height + extra + 24, CAP)
  if (tallH !== baseVp.height) { await page.setViewport({ ...baseVp, height: tallH }); await pause(350) }
  const el = await page.$(sel)
  const box = await el.boundingBox()
  if (!box || box.width < 4 || box.height < 4) {
    if (tallH !== baseVp.height) { await page.setViewport(baseVp); await pause(120) }
    throw new Error(`"${sel}" blank/zero-size after growing viewport to ${tallH}px: ${JSON.stringify(box)}`)
  }
  if (box.y + box.height > tallH + 0.5) {
    if (tallH !== baseVp.height) { await page.setViewport(baseVp); await pause(120) }
    throw new Error(`"${sel}" stream taller than the ${CAP}px raster cap (extends to y=${Math.round(box.y + box.height)}) — would clip the tail. Raise CAP or split the capture.`)
  }
  await el.screenshot({ path: `${out}/${name}.png`, captureBeyondViewport: false })
  if (tallH !== baseVp.height) { await page.setViewport(baseVp); await pause(150) }
  const bytes = statSync(`${out}/${name}.png`).size
  results.push({ name, status: 'ok', info: `${Math.round(box.width)}x${Math.round(box.height)} ${(bytes / 1024).toFixed(1)}KB (full stream)` })
  console.log('shot', name.padEnd(22), `${Math.round(box.width)}x${Math.round(box.height)}`.padEnd(11), `${(bytes / 1024).toFixed(1)}KB (full stream)`)
}

const surface = async (name, fn) => {
  try { await fn() } catch (e) {
    results.push({ name, status: 'GAP', info: e.message })
    console.error('GAP ', name.padEnd(22), e.message)
  }
}

/* ── deep walk: every tab + sub-surface, mirroring shootdemo order ── */

// highlights tab — carries the scorecard at its head
await surface('txn-highlights', async () => { await txnTab('highlights'); await shot('txn-highlights') })
await surface('txn-scorecard', async () => { await shot('txn-scorecard', '.txn-scorecard') })

// full trace — list canvas: subagent nesting + thinking + per-kind tool renderers + markers.
// The host bounds the viewer so the stream scrolls internally; shotTall grows the viewport by the
// stream's overflow to capture the WHOLE inline stream (every turn card + thinking + tool render +
// phase/task/checkpoint marker + nested subagent turn), pairing 1:1 with the demo's full-stream shot.
await surface('txn-trace-canvas', async () => {
  await txnTab('full trace'); await txnViewMode('list'); await expandAllTools()
  await shotTall('txn-trace-canvas')
})

// scrubber — sticky condensed header; reveals when the inner stream scrolls past its sticky threshold.
// The host height-constrains the viewer, so .txn-stream scrolls internally (like the demo): scroll it,
// then clip .txn-scrub. If it never mounts, record the gap with an actionable reason.
await surface('txn-scrubber', async () => {
  await page.evaluate(() => {
    const sc = document.querySelector('.txn-stream')
    if (sc) { sc.scrollTop = 240; sc.dispatchEvent(new Event('scroll', { bubbles: true })) }
  })
  await pause(500)
  const scrub = await page.$('.txn-scrub')
  if (!scrub) {
    await page.evaluate(() => { const sc = document.querySelector('.txn-stream'); if (sc) sc.scrollTop = 0 })
    throw new Error('.txn-scrub did not mount after scrolling .txn-stream — the sticky scrubber reveals once the inner stream scrolls past its threshold; verify the host bounds the viewer height so .txn-stream overflows internally (scrollHeight > clientHeight)')
  }
  await shot('txn-scrubber', '.txn-scrub')
  await page.evaluate(() => { const sc = document.querySelector('.txn-stream'); if (sc) sc.scrollTop = 0 })
  await pause(200)
})

// rails — left outline rail + right filters rail (full .txn-app at scroll-top)
await surface('txn-rails', async () => {
  await page.evaluate(() => { const sc = document.querySelector('.txn-stream'); if (sc) sc.scrollTop = 0; window.scrollTo(0, 0) })
  await pause(200)
  await shot('txn-rails')
})

// per-turn label popover overlay
await surface('txn-label-popover', async () => {
  const ok = await page.evaluate(() => { const b = document.querySelector('.txn-labelbtn'); if (!b) return false; b.click(); return true })
  if (!ok) throw new Error('.txn-labelbtn not found')
  await waitFor('.txn-label-pop', 2000)
  await shot('txn-label-popover')
  await page.keyboard.press('Escape'); await pause(250)
})

// trajectory graph view-mode (TB @xyflow engine in the lifted graphSlot)
await surface('txn-graph', async () => {
  await txnViewMode('graph'); await pause(500); await shot('txn-graph'); await txnViewMode('list')
})

// remaining tabs
await surface('txn-diffs', async () => { await txnTab('diffs'); await shot('txn-diffs') })
await surface('txn-files', async () => { await txnTab('files'); await shot('txn-files') })
await surface('txn-annotations', async () => { await txnTab('annotations'); await shot('txn-annotations') })

console.log(`\nTHEME=${theme} active=[data-theme]=${activeTheme}`)
console.log('captured:', results.filter((r) => r.status === 'ok').length, 'gaps:', results.filter((r) => r.status === 'GAP').length)
console.log('console errors:', errs.length ? errs.slice(0, 6) : 'none')
// emit a machine-readable summary for the manifest builder
console.log('RESULTS_JSON=' + JSON.stringify(results))
await browser.close()
