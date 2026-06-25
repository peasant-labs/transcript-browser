/* Probe the TB minimal example DOM so the capture script targets the right selectors: prints the
   tab + view-toggle labels, the .txn-* box sizes, and the .txn-stream scroll metrics (scrollHeight
   vs clientHeight — the signal that the host bounds the viewer so the stream scrolls internally and
   the sticky scrubber can reveal). Run this first whenever the example markup changes.

   env: TB_URL (default http://localhost:5173/), CHROME_PATH (required),
        PUPPETEER_CORE (optional explicit module path to puppeteer-core if a bare import won't resolve). */
const puppeteer = (await import(process.env.PUPPETEER_CORE || 'puppeteer-core')).default

const CHROME = process.env.CHROME_PATH
const URL = process.env.TB_URL || 'http://localhost:5173/'

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  defaultViewport: { width: 1460, height: 1000, deviceScaleFactor: 1 },
})
const page = await browser.newPage()
await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
const errs = []
page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()) })
page.on('pageerror', (e) => errs.push('pageerr: ' + e.message))
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 1000))

const report = await page.evaluate(() => {
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), y: Math.round(b.y) } }
  const count = (sel) => document.querySelectorAll(sel).length
  const tabs = [...document.querySelectorAll('.txn-tab')].map((t) => t.textContent.trim())
  const viewtoggle = [...document.querySelectorAll('.txn-viewtoggle .bs-seg-opt')].map((t) => t.textContent.trim())
  const themeBtn = !!document.querySelector('.theme-btn')
  const dataTheme = document.querySelector('[data-theme]')?.getAttribute('data-theme')
  return {
    dataTheme,
    themeBtn,
    boxes: {
      'main': box('main'),
      '.txn-app': box('.txn-app'),
      '.txn-stream': box('.txn-stream'),
      '.txn-scorecard': box('.txn-scorecard'),
      '.txn-tabs': box('.txn-tabs'),
      '.txn-viewtoggle': box('.txn-viewtoggle'),
    },
    counts: {
      '.txn-tab': count('.txn-tab'),
      '.txn-viewtoggle .bs-seg-opt': count('.txn-viewtoggle .bs-seg-opt'),
      '.txn-labelbtn': count('.txn-labelbtn'),
      '.txn-viewsw': count('.txn-viewsw'),
      '.txn-scrub': count('.txn-scrub'),
    },
    tabs,
    viewtoggle,
    streamScroll: (() => { const s = document.querySelector('.txn-stream'); return s ? { scrollHeight: s.scrollHeight, clientHeight: s.clientHeight } : null })(),
  }
})
console.log(JSON.stringify(report, null, 2))
console.log('console errors:', errs.length ? errs.slice(0, 8) : 'none')
await browser.close()
