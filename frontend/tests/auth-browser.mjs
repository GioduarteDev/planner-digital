// Isolated auth browser regression. Uses fixture responses and never contacts user data.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { spawn } from 'node:child_process'

let loggedIn = false
let requestDelay = 0
const errors = []
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/__api')) {
    const path = url.pathname.slice(6)
    let raw = ''; for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : {}
    if (requestDelay) await new Promise(done => setTimeout(done, requestDelay))
    if (path === '/auth/login' && body.email === 'invalid@example.com') {
      res.writeHead(401, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: 'E-mail ou senha incorretos.' })); return
    }
    if (path === '/auth/register' && body.email === 'used@example.com') {
      res.writeHead(400, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: 'Já existe uma conta com este e-mail.' })); return
    }
    if (path === '/auth/login' || path === '/auth/register') {
      loggedIn = true
      res.writeHead(path.endsWith('register') ? 201 : 200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ user: { id: 1, name: body.name || 'Lia', email: body.email, username: null, created_at: new Date().toISOString() } })); return
    }
    if (path === '/auth/me') {
      res.writeHead(loggedIn ? 200 : 401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(loggedIn ? { id: 1, name: 'Lia' } : { detail: 'Não autenticado.' })); return
    }
      if (path === '/auth/logout' && req.method === 'POST') {
        loggedIn = false
        res.writeHead(204); res.end(); return
      }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify([])); return
  }
  const asset = url.pathname.startsWith('/assets/') || url.pathname === '/matcha-planner-icon.png' ? url.pathname.slice(1) : 'index.html'
  try {
    const bytes = await readFile(resolve('dist', asset))
    res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' })[extname(asset)] ?? 'application/octet-stream' })
    res.end(bytes)
  } catch { res.writeHead(404); res.end() }
})

await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const profileDir = await mkdtemp(join(tmpdir(), 'matcha-auth-test-'))
const browser = spawn(process.env.EDITOR_TEST_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(done => setTimeout(done, ms))
async function until(check, message) { for (let i = 0; i < 100; i++) { const value = await check(); if (value) return value; await delay(100) } throw new Error(message) }
let socket
try {
  const port = await until(async () => { try { return (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return null } }, 'Browser did not start')
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(response => response.json())
  socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
  await new Promise(done => socket.addEventListener('open', done, { once: true }))
  let nextId = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); if (message.id && pending.has(message.id)) { const { done, fail } = pending.get(message.id); pending.delete(message.id); message.error ? fail(new Error(JSON.stringify(message.error))) : done(message.result) } })
  const cdp = (method, params = {}) => new Promise((done, fail) => { const id = ++nextId; pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const setInput = (selector, value) => evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await cdp('Runtime.enable'); await cdp('Page.enable')
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const realFetch=window.fetch;window.fetch=(url,options)=>{const target=new URL(typeof url==='string'?url:url.url,location.href);if(target.port==='8000')return realFetch('/__api'+target.pathname+target.search,options);return realFetch(url,options)};` })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.navigate', { url: `${origin}/login` })
  await until(() => evaluate('!!document.querySelector(".auth-editorial-shell")'), 'Login did not render')
  assert.equal(await evaluate('document.querySelectorAll(".auth-carousel-dots button").length'), 4)
  assert.equal(await evaluate('document.querySelector("#auth-title").textContent'), 'Entrar')
  await delay(500)
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/auth-login-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))

  await evaluate('document.querySelector(".auth-submit").click()')
  assert.equal(await evaluate('document.querySelectorAll(".auth-field-error").length'), 2)
  await setInput('#auth-email', 'invalid@example.com'); await setInput('#auth-password', 'wrong-password')
  await evaluate('document.querySelector(".auth-submit").click()')
  await until(() => evaluate('document.querySelector(".auth-form-error")?.textContent.includes("incorretos")'), 'Invalid credential error missing')
  await evaluate('document.querySelector(".auth-password-toggle").click()')
  assert.equal(await evaluate('document.querySelector("#auth-password").type'), 'text')
  await evaluate('document.querySelector(".auth-carousel-controls > button:last-child").click()')
  assert.equal(await evaluate('document.querySelector(".auth-slide-copy h2").textContent'), 'Crie do seu jeito')
  await evaluate('document.querySelector(".auth-carousel").dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowRight",bubbles:true}))')
  assert.equal(await evaluate('document.querySelector(".auth-slide-copy h2").textContent'), 'Guarde sua vida')

  await setInput('#auth-email', 'lia@example.com'); await setInput('#auth-password', 'correct-password')
  requestDelay = 350
  await evaluate('document.querySelector(".auth-submit").click()')
  await until(() => evaluate('document.querySelector(".auth-submit").disabled && document.querySelector(".auth-submit").textContent.includes("Entrando")'), 'Login loading state missing')
  await until(() => evaluate('location.pathname === "/"'), 'Login redirect failed')
  requestDelay = 0
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".app-shell")'), 'Authenticated session did not survive reload')
  await evaluate('document.querySelector("[aria-label^=\\"Perfil de\\"]").click()')
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.textContent.includes("Sair da conta")).click()')
  await until(() => evaluate('location.pathname === "/login"'), 'Logout did not return to login')
  await cdp('Page.navigate', { url: `${origin}/calendar` })
  await until(() => evaluate('location.pathname === "/login"'), 'Protected route was accessible without a session')

  await cdp('Page.navigate', { url: `${origin}/register` })
  await until(() => evaluate('document.querySelector("#auth-title")?.textContent === "Criar conta"'), 'Register did not render')
  await delay(500)
  await writeFile('test-results/auth-register-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await evaluate('document.querySelector(".auth-submit").click()')
  assert.equal(await evaluate('document.querySelectorAll(".auth-field-error").length'), 4)
  await setInput('#auth-name', 'Lia'); await setInput('#auth-email', 'not-an-email'); await setInput('#auth-password', '12345678'); await setInput('#auth-confirm-password', '87654321')
  await evaluate('document.querySelector(".auth-submit").click()')
  assert.equal(await evaluate('document.querySelector("#auth-email-error").textContent'), 'Digite um e-mail válido.')
  assert.equal(await evaluate('document.querySelector("#auth-confirm-password-error").textContent'), 'As senhas não coincidem.')
  await setInput('#auth-email', 'used@example.com'); await setInput('#auth-confirm-password', '12345678')
  await evaluate('document.querySelector(".auth-submit").click()')
  await until(() => evaluate('document.querySelector(".auth-form-error")?.textContent.includes("Já existe")'), 'Register API error missing')
  await setInput('#auth-email', 'new@example.com')
  requestDelay = 350
  await evaluate('document.querySelector(".auth-submit").click()')
  await until(() => evaluate('document.querySelector(".auth-submit").disabled && document.querySelector(".auth-submit").textContent.includes("Criando")'), 'Register loading state missing')
  await until(() => evaluate('location.pathname === "/"'), 'Register redirect failed')
  requestDelay = 0; loggedIn = false

  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await cdp('Page.navigate', { url: `${origin}/login` }); await until(() => evaluate('!!document.querySelector(".auth-panel")'), 'Mobile auth missing'); await delay(150)
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Auth overflows mobile width')
  await writeFile('test-results/auth-login-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await cdp('Emulation.setDeviceMetricsOverride', { width: 768, height: 1024, deviceScaleFactor: 1, mobile: false }); await delay(150)
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Auth overflows tablet width')
  await writeFile('test-results/auth-login-tablet.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  assert.deepEqual(errors, [])
  console.log('PASS: login/register validation, API errors, loading, redirects, password toggle, carousel controls/keyboard and responsive widths; no runtime exceptions.')
} finally { socket?.close(); browser.kill(); server.close() }
