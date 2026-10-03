// Isolated Library browser regression. Uses fixture responses and never contacts user data.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { spawn } from 'node:child_process'

const agenda = { id: 1, title: 'Meu diário', cover_color: '#9CA362', cover_image_url: null, settings: {}, created_at: '2026-09-01T12:00:00', updated_at: '2026-09-20T12:00:00' }
let fixtureCount = 1
const runtimeErrors = []
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/__api')) {
    const path = url.pathname.slice(6)
    let value = []
    if (path === '/auth/me') value = { id: 1, name: 'Giovanna' }
    if (path === '/profile') value = { id: 1, name: 'Giovanna Duarte', email: 'giovanna@example.com', username: 'gioduarte', profile_photo_url: null }
    if (path === '/events') value = []
    if (path === '/agendas') value = Array.from({ length: fixtureCount }, (_, i) => ({ ...agenda, id: i + 1, title: i ? `Agenda ${i + 1}` : agenda.title, cover_color: ['#b7c8af', '#d5c8e8', '#ebc2d1', '#eee0b3', '#bdcfe8', '#edcbb9'][i] }))
    if (path === '/library/media') value = []
    if (path === '/agendas/1' && req.method === 'PATCH') value = agenda
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); return
  }
  const asset = url.pathname.startsWith('/assets/') || ['/matcha-planner-icon.png', '/matcha-planner-favicon.jpg'].includes(url.pathname) ? url.pathname.slice(1) : 'index.html'
  try { const bytes = await readFile(resolve('dist', asset)); res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png', '.jpg': 'image/jpeg' })[extname(asset)] ?? 'application/octet-stream' }); res.end(bytes) }
  catch { res.writeHead(404); res.end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const profileDir = await mkdtemp(join(tmpdir(), 'matcha-library-test-'))
const browser = spawn(process.env.EDITOR_TEST_BROWSER ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(done => setTimeout(done, ms))
async function until(check, message) { for (let i = 0; i < 100; i++) { const value = await check(); if (value) return value; await delay(100) } throw new Error(message) }
let socket
try {
  const port = await until(async () => { try { return (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return null } }, 'Browser did not start')
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json())
  socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
  await new Promise(done => socket.addEventListener('open', done, { once: true }))
  let nextId = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text); if (message.id && pending.has(message.id)) { const { done, fail } = pending.get(message.id); pending.delete(message.id); message.error ? fail(new Error(JSON.stringify(message.error))) : done(message.result) } })
  const cdp = (method, params = {}) => new Promise((done, fail) => { const id = ++nextId; pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  await cdp('Runtime.enable'); await cdp('Page.enable')
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const realFetch=window.fetch;window.fetch=(url,options)=>{const target=new URL(typeof url==='string'?url:url.url,location.href);if(target.port==='8000')return realFetch('/__api'+target.pathname+target.search,options);return realFetch(url,options)};` })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: `${origin}/stationery` })
  await until(() => evaluate('location.pathname === "/" && !!document.querySelector(".room-dock")'), 'Stationery did not redirect to Library')
  assert.equal(await evaluate('Array.from(document.querySelectorAll("nav a, nav button")).some(item => item.textContent.includes("Papelaria"))'), false)
  await until(() => evaluate('document.querySelector(".agenda-book-title-button")?.textContent.includes("Meu diário")'), 'Library agenda did not load')
  assert.equal(await evaluate('document.querySelectorAll(".agenda-book-card").length'), 1)
  assert.equal(await evaluate('document.querySelector(".agenda-book-cover").textContent.trim()'), '')
  assert.equal(await evaluate('document.body.textContent.includes("PEQUENOS PLANOS")'), false)
  assert.equal(await evaluate('document.body.textContent.includes("pedacinho da sua história")'), false)
  assert.equal(await evaluate('!!document.querySelector(".library-shelf-board")'), false)
  assert.equal(await evaluate('document.querySelector(".library-profile-copy span").textContent.trim()'), 'Olá, Giovanna!')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".app-shell-footer")).backgroundColor'), 'rgb(244, 192, 159)')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".app-shell-footer-credits")).backgroundColor'), 'rgb(223, 166, 178)')
  assert(await evaluate('document.querySelector(".app-shell-footer").getBoundingClientRect().height < 340'), 'Global footer is taller than the compact editorial composition')
  await evaluate('document.querySelector(".agenda-book-menu-button").click()')
  assert.equal(await evaluate('document.querySelectorAll(".agenda-book-menu [role=menuitem]").length'), 6)
  assert.equal(await evaluate('document.querySelectorAll(".room-dock button").length'), 5)
  await evaluate('document.querySelector(".agenda-book-menu-button").click()')
  await mkdir('test-results', { recursive: true })
  await delay(250)
  await writeFile('test-results/library-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await writeFile('test-results/library-full.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await delay(250)
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Library overflows mobile width')
  await writeFile('test-results/library-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  fixtureCount = 6
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".agenda-book-card").length === 6'), 'Six-book collection did not load')
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Six books overflow mobile')
  await writeFile('test-results/library-six-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await delay(150)
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".agenda-grid")).gridTemplateColumns.split(" ").length'), 3)
  await writeFile('test-results/library-six-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await evaluate('document.querySelector(".library-filters button:nth-child(2)").click()')
  assert.equal(await evaluate('document.querySelectorAll(".agenda-book-card").length'), 0)
  assert(await evaluate('document.querySelector(".new-agenda-button").disabled'), 'Six-agenda limit is missing')
  fixtureCount = 0
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".library-empty-state")'), 'Empty state did not load')
  await evaluate('document.querySelector(".new-agenda-button").click()')
  assert(await evaluate('!!document.querySelector("[role=dialog]")'), 'Create dialog did not open')
  assert.deepEqual(runtimeErrors, [])
  console.log('PASS: real Library route, single-book composition, clean header/hero, physical book actions, compact peach/pink footer and mobile width; no runtime exceptions.')
} finally { socket?.close(); browser.kill(); server.close() }
