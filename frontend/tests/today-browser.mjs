// Isolated browser regression. Uses fixture responses and never contacts user data.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { spawn } from 'node:child_process'

const key = new Date().toLocaleDateString('en-CA')
let settings = { matcha_profile: { favoriteColor: '#9CA362' } }
let dailyEntry = null
const tasks = [{ id: 1, page_id: 1, text: 'Cuidar das plantas', due_date: key, done: false }]
const events = [{ id: 1, title: 'Café com amiga', starts_at: new Date(Date.now() + 86400000).toISOString() }]
const studies = [{ id: 1, subject: 'Coreano', study_date: key, duration_minutes: 45 }]
const errors = []
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/__weather')) {
    const value = url.pathname.endsWith('geocode')
      ? { results: url.searchParams.get('name') === 'Cidade inexistente' ? [] : [{ name: 'Campinas', latitude: -22.9, longitude: -47.06, admin1: 'São Paulo' }] }
      : { current: { temperature_2m: 24.4, weather_code: 2 }, daily: { temperature_2m_max: [27], temperature_2m_min: [17] } }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); return
  }
  if (url.pathname === '/uploads/test.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' })
    res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'))
    return
  }
  if (url.pathname.startsWith('/__api')) {
    const path = url.pathname.slice(6)
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = raw && req.headers['content-type']?.includes('application/json') ? JSON.parse(raw) : {}
    let value = []
    if (path === '/auth/me') value = { id: 1, name: 'Giovanna Duarte' }
    if (path === '/profile') value = { id: 1, name: 'Giovanna Duarte', settings }
    if (path === '/profile/settings' && req.method === 'PATCH') { settings = { ...settings, ...body.settings }; value = { id: 1, name: 'Giovanna Duarte', settings } }
    if (path === `/daily-entries/${key}` && req.method === 'GET' && dailyEntry === null) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: 'Registro diário não encontrado.' })); return }
    if (path === `/daily-entries/${key}` && req.method === 'GET') value = dailyEntry
    if (path === `/daily-entries/${key}` && req.method === 'PUT') { dailyEntry = { ...body, entry_date: key }; value = dailyEntry }
    if (path === '/tasks') value = tasks
    if (path === '/tasks/1' && req.method === 'PATCH') { tasks[0].done = body.done; value = tasks[0] }
    if (path === '/events') value = events
    if (path === '/studies') value = studies
    if (path === '/library/media') value = req.method === 'POST'
      ? { id: 2, name: 'Foto do dia', media_type: 'image', file_url: '/uploads/test.png' }
      : []
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); return
  }
  const asset = url.pathname.startsWith('/assets/') || url.pathname === '/matcha-planner-icon.png' ? url.pathname.slice(1) : 'index.html'
  try { const bytes = await readFile(resolve('dist', asset)); res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' })[extname(asset)] ?? 'application/octet-stream' }); res.end(bytes) }
  catch { res.writeHead(404); res.end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const profileDir = await mkdtemp(join(tmpdir(), 'matcha-today-test-'))
const browser = spawn(process.env.EDITOR_TEST_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(done => setTimeout(done, ms))
async function until(check, message) { for (let i = 0; i < 100; i++) { const value = await check(); if (value) return value; await delay(100) } throw new Error(message) }
let socket
try {
  const port = await until(async () => { try { return (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return null } }, 'Browser did not start')
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())
  socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
  await new Promise(done => socket.addEventListener('open', done, { once: true }))
  let nextId = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); if (message.id && pending.has(message.id)) { const { done, fail } = pending.get(message.id); pending.delete(message.id); if (message.error) fail(new Error(JSON.stringify(message.error))); else done(message.result) } })
  const cdp = (method, params = {}) => new Promise((done, fail) => { const id = ++nextId; pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  await cdp('Runtime.enable'); await cdp('Page.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const realFetch=window.fetch;window.fetch=(url,options)=>{const target=new URL(typeof url==='string'?url:url.url,location.href);if(target.port==='8000')return realFetch('/__api'+target.pathname+target.search,options);if(target.hostname.includes('open-meteo.com'))return realFetch('/__weather/'+(target.hostname.startsWith('geocoding')?'geocode':'forecast')+target.search,options);return realFetch(url,options)};` })
  await cdp('Page.navigate', { url: `${origin}/today` })
  await until(() => evaluate('document.querySelector(".today-hero h1")?.textContent.includes("Giovanna")'), 'Greeting did not load real name')
  assert(await evaluate('document.querySelector(".today-receipt-lines")?.textContent.includes("Cuidar das plantas")'))
  assert(await evaluate('document.querySelector(".today-upcoming")?.textContent.includes("Café com amiga")'))
  assert(await evaluate('document.querySelector(".today-studies")?.textContent.includes("45 min")'))
  await evaluate(`(() => { const input=document.querySelector('[aria-label="Cidade para o clima"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Campinas'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await evaluate('document.querySelector(".today-weather form button[type=submit]").click()')
  await until(() => evaluate('document.querySelector(".today-weather-reading")?.textContent.includes("24°")'), 'Manual city weather did not load')
  assert.equal(await evaluate('localStorage.getItem("matcha-weather-city")'), 'Campinas')
  await evaluate(`document.querySelector('[aria-label="Escolher cidade"]').click()`)
  await evaluate(`(() => { const input=document.querySelector('[aria-label="Cidade para o clima"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Cidade inexistente'); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.today-weather form button[type=submit]').click() })()`)
  await until(() => evaluate('!!document.querySelector(".today-weather-error")'), 'Weather error state did not appear')
  await evaluate(`document.querySelector('[aria-label="Escolher cidade"]').click()`)
  await evaluate(`Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_ok,fail)=>fail({code:1})}})`)
  assert.equal(await evaluate('document.querySelectorAll(".today-dock a").length'), 4)
  assert(await evaluate('!!document.querySelector(".today-console-screen")'), 'Mission console is missing')
  assert.equal(await evaluate('document.querySelectorAll(".today-command-center > aside").length'), 2)
  assert(await evaluate('!!document.querySelector(".today-desktop-shell")'), 'Desktop dashboard shell is missing')
  await evaluate(`document.querySelector('[aria-label="Usar minha localização"]').click()`)
  await until(() => evaluate('document.querySelector(".today-weather-error")?.textContent.includes("não autorizada")'), 'Denied geolocation state did not appear')
  await evaluate(`(() => { const input=document.querySelector('[aria-label="Cidade para o clima"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Campinas'); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('.today-weather form button[type=submit]').click() })()`)
  await until(() => evaluate('document.querySelector(".today-weather-reading")?.textContent.includes("24°") && !document.querySelector(".today-weather-error")'), 'Weather did not recover after error')
  await evaluate('document.querySelector(".today-receipt-lines input").click()')
  await until(() => tasks[0].done, 'Task completion did not reach backend')
  await evaluate('document.querySelector(".today-mood button").click()')
  await until(() => dailyEntry?.mood === 'calm', 'Mood did not persist in daily entry')
  assert.equal(settings.matcha_profile.favoriteColor, '#9CA362')
  const quote = await evaluate('document.querySelector(".today-quote p").textContent')
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/today-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await writeFile('test-results/today-full.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  const uploadPath = join(profileDir, 'today-photo.png')
  await writeFile(uploadPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'))
  const documentNode = await cdp('DOM.getDocument')
  const uploadNode = await cdp('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: '.today-photo-upload input' })
  await cdp('DOM.setFileInputFiles', { nodeId: uploadNode.nodeId, files: [uploadPath] })
  await until(() => dailyEntry?.photo_media_id === 2, 'Uploaded photo was not selected and persisted')
  assert(await evaluate('document.querySelector(".today-polaroid img")?.alt === "Foto do dia"'))
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector(".today-mood button")?.classList.contains("is-selected")'), 'Mood did not survive reload')
  assert.equal(await evaluate('document.querySelector(".today-quote p").textContent'), quote)
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(300)
  await writeFile('test-results/today-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Today overflows mobile width')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false })
  await delay(200)
  await writeFile('test-results/today-tablet.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Today overflows tablet width')
  assert.deepEqual(errors, [])
  console.log('PASS: real greeting, tasks, events, studies, task PATCH, weather city and errors, denied geolocation, daily-entry persistence, profile settings preservation, quote stability, mobile width; no runtime exceptions.')
} finally { socket?.close(); browser.kill(); server.close() }
