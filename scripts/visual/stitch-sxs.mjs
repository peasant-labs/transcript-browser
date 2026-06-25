/* Build labeled, HEIGHT-MATCHED side-by-side composites (DEMO | TB-APP) per surface per theme.
   Dependency-free: decodes the two PNGs as data: URLs onto a <canvas> inside headless Chrome
   (the same canvas-decode trick scripts/png-diff.mjs uses), draws them with labels, exports a PNG.

   HEIGHT-MATCH (so rows line up for row-by-row comparison, no ragged panes):
     - both panes are drawn at the SAME height = max(demoH, tbH), TOP-ALIGNED.
     - the shorter pane is PADDED (never scaled/distorted) down to that height with its OWN
       background colour, sampled from the capture's border (margins/gutters). The pad colour
       comes from the pixels themselves — no design-token value is hardcoded — so it stays
       seamless across dark/light and across the demo vs TB surfaces.
     - a faint dashed hairline marks where the shorter capture actually ends, so the padded
       region is obvious and not mistaken for empty UI.
   Where the TB side has no capture (a recorded gap), it draws a full-height placeholder panel
   with the reason, so the side-by-side set stays complete and self-explanatory.

   It pairs the DEMO captures (<uat-shots-dir>/demo/<theme>/) — produced by fairtrade's
   scripts/shootdemo.mjs — against the TB-APP captures (<uat-shots-dir>/tb/<theme>/) — produced by
   tb-shoot.mjs. Whichever surfaces have a TB capture are drawn as a real side-by-side; any surface
   missing a TB capture falls back to a labeled placeholder panel so the set stays complete.

   env: CHROME_PATH (required), PUPPETEER_CORE (optional explicit path to puppeteer-core).
   usage: CHROME_PATH=/path/to/chrome node stitch-sxs.mjs <uat-shots-dir>
*/
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
const puppeteer = (await import(process.env.PUPPETEER_CORE || 'puppeteer-core')).default

const CHROME = process.env.CHROME_PATH
const UAT = process.argv[2]
const THEMES = ['dark', 'light']
// The surface set, mirroring shootdemo.mjs's transcript surfaces 1:1. Each entry is
// [surface, gapReason]: gapReason is shown ONLY if the TB capture is missing (null = none authored,
// a generic placeholder is drawn instead). With the bounded-host example all 10 are captured, so the
// placeholder path is just a defensive fallback for future regressions.
const SURFACES = [
  ['txn-highlights', null],
  ['txn-scorecard', null],
  ['txn-trace-canvas', null],
  ['txn-scrubber', null],
  ['txn-rails', null],
  ['txn-label-popover', null],
  ['txn-graph', null],
  ['txn-diffs', null],
  ['txn-files', null],
  ['txn-annotations', null],
]

const dataUrl = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64')

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.goto('about:blank')

let made = 0
for (const theme of THEMES) {
  const outDir = `${UAT}/sxs/${theme}`
  mkdirSync(outDir, { recursive: true })
  for (const [surface, gap] of SURFACES) {
    const demoPath = `${UAT}/demo/${theme}/${surface}.png`
    const tbPath = `${UAT}/tb/${theme}/${surface}.png`
    if (!existsSync(demoPath)) { console.error('skip (no demo):', theme, surface); continue }
    const demoUrl = dataUrl(demoPath)
    const tbUrl = existsSync(tbPath) ? dataUrl(tbPath) : null
    const meta = await page.evaluate(async (demoUrl, tbUrl, gap, title) => {
      const load = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u })
      const a = await load(demoUrl)
      const b = tbUrl ? await load(tbUrl) : null

      /* sample a robust "page background" = the most common colour around an image's border
         (margins/gutters), weighted toward the BOTTOM row where the padding goes. Used to pad
         the shorter pane seamlessly. Colour is read from the capture — no token is hardcoded. */
      const sampleBg = (img) => {
        const tc = document.createElement('canvas'); tc.width = img.width; tc.height = img.height
        const tx = tc.getContext('2d'); tx.drawImage(img, 0, 0)
        const W = img.width, H = img.height
        const counts = new Map()
        const tally = (px, py) => { const d = tx.getImageData(px, py, 1, 1).data; const k = d[0] + ',' + d[1] + ',' + d[2]; counts.set(k, (counts.get(k) || 0) + 1) }
        const sx = Math.max(1, Math.floor(W / 100)), sy = Math.max(1, Math.floor(H / 100))
        for (let px = 0; px < W; px += sx) { tally(px, H - 1); tally(px, H - 2); tally(px, 0) }
        for (let py = 0; py < H; py += sy) { tally(0, py); tally(W - 1, py) }
        let best = '20,20,22', bestN = -1
        for (const [k, n] of counts) if (n > bestN) { bestN = n; best = k }
        return 'rgb(' + best + ')'
      }

      const pad = 28, gapW = 28, labelH = 64, frame = '#161616', ink = '#f2f2f2', sub = '#9aa0a6'
      const bW = b ? b.width : Math.max(560, Math.round(a.width * 0.8))
      const targetH = Math.max(a.height, b ? b.height : a.height)   // HEIGHT-MATCH to the taller pane
      const w = a.width + bW + gapW + pad * 2
      const h = targetH + labelH + pad * 2
      const c = document.createElement('canvas'); c.width = w; c.height = h
      const x = c.getContext('2d')
      x.fillStyle = frame; x.fillRect(0, 0, w, h)
      // title bar
      x.fillStyle = ink; x.font = 'bold 22px ui-sans-serif, system-ui, sans-serif'
      x.fillText(title, pad, 34)
      // column captions
      x.font = 'bold 16px ui-monospace, monospace'; x.fillStyle = sub
      x.fillText('DEMO  (fairtrade mockup-consumes-lifted)', pad, labelH - 8)
      x.fillText('TB-APP  (wire → adaptTranscript → TranscriptViewer)', pad + a.width + gapW, labelH - 8)

      const bodyY = labelH + pad
      const tbX = pad + a.width + gapW

      // DEMO pane — bg-pad to targetH, then draw top-aligned
      x.fillStyle = sampleBg(a); x.fillRect(pad, bodyY, a.width, targetH)
      x.drawImage(a, pad, bodyY)

      if (b) {
        // TB pane — bg-pad to targetH, draw top-aligned so rows line up from the top
        x.fillStyle = sampleBg(b); x.fillRect(tbX, bodyY, b.width, targetH)
        x.drawImage(b, tbX, bodyY)
        // dashed hairline at the shorter pane's content bottom → padded region is obvious
        x.strokeStyle = 'rgba(150,150,150,0.5)'; x.lineWidth = 1; x.setLineDash([6, 5])
        if (a.height < targetH) { const yy = bodyY + a.height + 0.5; x.beginPath(); x.moveTo(pad, yy); x.lineTo(pad + a.width, yy); x.stroke() }
        if (b.height < targetH) { const yy = bodyY + b.height + 0.5; x.beginPath(); x.moveTo(tbX, yy); x.lineTo(tbX + b.width, yy); x.stroke() }
        x.setLineDash([])
      } else {
        // full-height placeholder panel with the gap reason
        x.fillStyle = '#202022'; x.fillRect(tbX, bodyY, bW, targetH)
        x.strokeStyle = '#3a3a3d'; x.lineWidth = 2; x.strokeRect(tbX + 1, bodyY + 1, bW - 2, targetH - 2)
        x.fillStyle = '#e06c5e'; x.font = 'bold 18px ui-monospace, monospace'
        x.fillText('⚠ surface not exercised by the minimal example', tbX + 20, bodyY + 40)
        x.fillStyle = sub; x.font = '14px ui-monospace, monospace'
        const reason = gap || 'No TB capture for this surface — see the run log and the MANIFEST gaps section.'
        reason.split('\n').forEach((line, i) => x.fillText(line, tbX + 20, bodyY + 74 + i * 22))
      }
      return { url: c.toDataURL('image/png'), aH: a.height, bH: b ? b.height : null, targetH }
    }, demoUrl, tbUrl, gap, `${surface}  ·  ${theme}`)
    const b64 = meta.url.replace(/^data:image\/png;base64,/, '')
    writeFileSync(`${outDir}/${surface}.png`, Buffer.from(b64, 'base64'))
    made++
    const padNote = meta.bH == null ? 'demo|GAP' : (meta.aH === meta.bH ? 'equal' : `pad ${meta.aH < meta.bH ? 'DEMO' : 'TB'} +${Math.abs(meta.aH - meta.bH)}px → ${meta.targetH}`)
    console.log('sxs', `${theme}/${surface}`.padEnd(34), padNote)
  }
}
console.log(`\nbuilt ${made} height-matched side-by-side composites under ${UAT}/sxs/`)
await browser.close()
