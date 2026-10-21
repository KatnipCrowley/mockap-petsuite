import puppeteer from 'file:///C:/Users/arman/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
import { startFlow } from 'file:///C:/Users/arman/AppData/Local/npm-cache/_npx/0f94ee7615faf582/node_modules/lighthouse/core/index.js'
import { spawn } from 'node:child_process'

const base = 'http://127.0.0.1:4190/mockap-petsuite/'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4190', '--base', '/mockap-petsuite/'], { stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(base)).ok) break } catch { /* wait */ }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  browser = await puppeteer.launch({ executablePath: 'C:/Users/arman/AppData/Local/ms-playwright/chromium-1248/chrome-win64/chrome.exe', headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.goto(base)
  await page.waitForSelector('.demo-role')
  await page.evaluate(() => [...document.querySelectorAll('.demo-role')].find(el => el.textContent === 'Tutor')?.click())
  await page.click('.login-card button.primary')
  await page.waitForSelector('.home-page')
  const audit = async name => {
    const flow = await startFlow(page)
    await flow.snapshot({ name, onlyCategories: ['accessibility'] })
    const { steps } = await flow.createFlowResult()
    const lhr = steps[0].lhr
    console.log(`${name}: ${Math.round((lhr.categories.accessibility?.score ?? 0) * 100)}`)
    for (const audit of Object.values(lhr.audits)) {
      if (audit.score === null || audit.score >= 1 || !audit.details?.items?.length) continue
      console.log(`  ${audit.id}: ${audit.details.items.length} failures`)
      for (const item of audit.details.items.slice(0, 3)) console.log(`    ${item.node?.snippet || item.node?.selector || item.url || ''} ${item.node?.explanation || ''}`)
    }
  }
  const nav = async name => { await page.evaluate(label => [...document.querySelectorAll('.nav-item')].find(el => el.getAttribute('aria-label') === label)?.click(), name) }
  console.log('Chips Inicio:', await page.evaluate(() => [...document.querySelectorAll('.pet-hero .chip')].map(element => ({ classes: element.className, color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }))))
  await audit('Inicio del tutor')
  await nav('Directorio'); await page.waitForSelector('.business-card'); await audit('Directorio')
  await nav('Muro comunal'); await page.waitForSelector('.community-post'); await audit('Muro comunal')
  await nav('Mis mascotas'); await page.waitForSelector('.pet-qr-section .primary'); await page.click('.pet-qr-section .primary')
  const href = await page.$eval('.qr-link-actions a[href]', el => el.href)
  await page.goto(href); await page.waitForSelector('.public-emergency-card'); await audit('Ficha pública')
} finally { await browser?.close(); server.kill() }
