// Browser regression against an isolated in-memory API fixture. Never contacts user data.
// Run after npm run build: node tests/editor-browser.mjs
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { spawn } from 'node:child_process'

const pages = [1, 2, 3, 4, 5].map(id => ({ id, agenda_id: 1, title: `Página ${id}`, content: '',
  favorite: id === 2, folder_id: null, position: id, paper_type: 'blank', paper_settings: {} }))
const elements = []
const tasks = [{ id: 401, page_id: 1, text: 'Revisar vocabulário', done: false, due_date: null, priority: 'medium' }]
let agendaSettings = {}
let profileSettings = {}
let mediaVisible = false
const writes = []
const runtimeErrors = []
let failNextWrite = false
let nextElementId = 1
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/__api')) {
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = raw ? JSON.parse(raw) : {}
    const path = url.pathname.slice(6)
    let result = []
    if (path === '/auth/me' || path === '/profile') result = { id: 1, name: 'Teste do editor', email: 'editor@example.test' }
    if (path === '/profile') result.settings = profileSettings
    if (path === '/profile/settings') { profileSettings = { ...profileSettings, ...body.settings }; result = { settings: profileSettings } }
    if (path === '/library/media') result = [{ id: 900, name: 'Sticker', file_url: `${origin}/matcha-planner-icon.png` }]
    if (path === '/agendas/1') result = { id: 1, title: 'Meu diário', cover_color: '#9CA362' }
    if (path === '/agendas/1') {
      if (req.method === 'PATCH') agendaSettings = body.settings ?? agendaSettings
      result.settings = agendaSettings
    }
    if (path === '/tasks') result = tasks
    if (path === '/tasks/401' && req.method === 'PATCH') { tasks[0].done = body.done; result = tasks[0] }
    if (path === '/pages/1/media' && mediaVisible) result = ['image', 'sticker'].map((media_type, index) => ({
      id: 701 + index, page_id: 1, media_type, original_name: media_type, mime_type: 'image/png', size_bytes: 100,
      file_url: `http://127.0.0.1:${server.address().port}/matcha-planner-icon.png`,
      x: index ? 340 : 150, y: 180, width: 115, height: 115, rotation: 0, z_index: 3, locked: false,
      created_at: '2026-09-18T00:00:00Z',
    }))
    if (path === '/agendas/1/pages') {
      if (req.method === 'POST') {
        result = { id: pages.length + 1, agenda_id: 1, title: body.title ?? `Página ${pages.length + 1}`,
          content: '', favorite: false, folder_id: null, position: pages.length + 1,
          paper_type: body.paper_type ?? 'blank', paper_settings: body.paper_settings ?? {} }
        pages.push(result)
      } else result = pages
    }
    if (path === '/pages/1/blocks') result = [{ id: 101, page_id: 1, block_type: 'heading', data: { text: 'Anotações preservadas' }, position: 1 }]
    if (path === '/pages/2/blocks') result = [{ id: 102, page_id: 2, block_type: 'paragraph', data: { text: 'Segunda folha' }, position: 1 }]
    if (/^\/pages\/\d+$/.test(path) && req.method === 'PATCH') { result = pages.find(page => page.id === Number(path.split('/').at(-1))); Object.assign(result, body) }
    if (path === '/canvas/elements') {
      if (req.method === 'POST') {
        result = { ...body, id: nextElementId++, user_id: 1 }
        elements.push(result)
      } else result = elements.filter(item => item.page_id === Number(url.searchParams.get('page_id')))
    }
    if (/^\/canvas\/elements\/\d+$/.test(path)) {
      result = elements.find(item => item.id === Number(path.split('/').at(-1)))
      if (req.method === 'PATCH' && failNextWrite) {
        failNextWrite = false
        res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: 'Falha de teste' })); return
      }
      if (req.method === 'PATCH') { Object.assign(result, body); writes.push({ id: result.id, ...body }) }
      if (req.method === 'DELETE') { const index = elements.findIndex(item => item.id === Number(path.split('/').at(-1))); if (index >= 0) elements.splice(index, 1); result = {} }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(result)); return
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
const profile = await mkdtemp(join(tmpdir(), 'matcha-editor-test-'))
const browser = spawn(process.env.EDITOR_TEST_BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(done => setTimeout(done, ms))
async function until(check, message) {
  for (let i = 0; i < 100; i++) { const value = await check(); if (value) return value; await delay(100) }
  throw new Error(message)
}
let socket
try {
  const port = await until(async () => {
    try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return null }
  }, 'Browser did not start')
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())
  socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
  await new Promise(done => socket.addEventListener('open', done, { once: true }))
  let nextId = 0
  const pending = new Map()
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params.exceptionDetails.text)
    if (message.id && pending.has(message.id)) {
      const { done, fail } = pending.get(message.id); pending.delete(message.id)
      if (message.error) fail(new Error(JSON.stringify(message.error))); else done(message.result)
    }
  })
  const cdp = (method, params = {}) => new Promise((done, fail) => {
    const id = ++nextId; pending.set(id, { done, fail }); socket.send(JSON.stringify({ id, method, params }))
  })
  const evaluate = async expression => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const click = async selector => {
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `Missing ${selector}`)
    await evaluate(`document.activeElement?.blur(); document.querySelector(${JSON.stringify(selector)}).click()`)
    await delay(100)
  }
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `
    const realFetch = window.fetch;
    window.fetch = (url, options) => {
      const target = new URL(typeof url === 'string' ? url : url.url, location.href);
      return realFetch(target.port === '8000' ? '/__api' + target.pathname + target.search : url, options);
    };
  ` })
  await cdp('Page.navigate', { url: `${origin}/agenda/1` })
  await until(() => evaluate('document.querySelectorAll(".planner-sheet").length === 1'), 'Editor did not load')
  await until(() => evaluate('document.querySelector(".block-heading-input")?.value === "Anotações preservadas"'), 'Existing text blocks did not load')
  await click('[aria-label="Elementos"]')
  await evaluate(`Array.from(document.querySelectorAll('.editor-tool-drawer button')).find(b => b.textContent.includes('Post-its')).click()`)
  await delay(100)
  await click('.color-element-grid button')
  await until(() => evaluate('!!document.querySelector(".canvas-move-handle")'), 'Post-it was not created')
  assert.equal(elements[0].page_id, 1)
  const rect = await evaluate(`(() => { const r=document.querySelector('.canvas-move-handle').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: rect.x, y: rect.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: rect.x + 130, y: rect.y + 80, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: rect.x + 130, y: rect.y + 80, button: 'left', clickCount: 1 })
  await until(() => writes.length > 0, 'Drag did not persist')
  assert(elements[0].x > 180 && elements[0].y > 170, 'Post-it did not move')
  const saved = { x: elements[0].x, y: elements[0].y }
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".canvas-move-handle")'), 'Post-it missing after reload')
  assert.deepEqual(await evaluate(`(() => { const s=document.querySelector('.free-canvas-element').style; return {x:parseFloat(s.left),y:parseFloat(s.top)} })()`), saved)
  await click('.free-canvas-element')
  await click('[aria-label="Bloquear elemento"]')
  await until(() => elements[0].locked, 'Lock did not persist')
  assert(await evaluate(`document.querySelector('.canvas-postit-element').readOnly && !document.querySelector('.canvas-move-handle')`))
  await click('[aria-label="Desbloquear elemento"]')
  await until(() => !elements[0].locked, 'Unlock did not persist')
  failNextWrite = true
  await evaluate(`document.querySelector('.canvas-move-handle').focus()`)
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await until(() => evaluate(`document.querySelector('.minimal-save-status').textContent.includes('Erro')`), 'Failed save was not visible')
  await evaluate(`Array.from(document.querySelectorAll('button')).find(n=>n.textContent.includes('Tentar salvar novamente')).click()`)
  await until(() => elements[0].x === saved.x + 1, 'Retry did not persist keyboard movement')
  saved.x += 1
  await click('[aria-label="Papel"]')
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  await until(() => evaluate('!document.querySelector(".editor-tool-drawer")'), 'Escape did not close panel')
  await click('[aria-label="Texto"]')
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 600, y: 750, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 600, y: 750, button: 'left', clickCount: 1 })
  await until(() => evaluate('!document.querySelector(".editor-tool-drawer")'), 'Outside click did not close panel')
  await click('.workspace-mode-switch button:nth-child(2)')
  await until(() => evaluate('document.querySelectorAll(".planner-sheet").length === 2'), 'Spread did not render two pages')
  const ringPlacement = await evaluate(`(() => { const rings=document.querySelector('.binding-rings'); if(!rings) return {missing:true}; const a=document.querySelector('.agenda-workspace .planner-sheet').getBoundingClientRect(); const b=document.querySelector('.workspace-companion .planner-sheet').getBoundingClientRect(); const r=rings.getBoundingClientRect(); return {pointer:getComputedStyle(rings).pointerEvents, expected:(a.right+b.left)/2,actual:r.left+r.width/2,count:rings.children.length} })()`)
  assert(ringPlacement.pointer === 'none' && Math.abs(ringPlacement.expected - ringPlacement.actual) < 15 && ringPlacement.count >= 5, `Binding rings are missing or misplaced: ${JSON.stringify(ringPlacement)}`)
  assert.deepEqual(await evaluate(`Array.from(document.querySelectorAll('.minimal-page-title-input')).map(n=>n.value)`), ['Página 1', 'Página 2'])
  await mkdir('test-results', { recursive: true })
  const screenshot = await cdp('Page.captureScreenshot', { format: 'png' })
  await writeFile('test-results/editor-spread.png', Buffer.from(screenshot.data, 'base64'))
  await click('.free-canvas-element')
  const spreadHandle = await evaluate(`(() => { const r=document.querySelector('.canvas-move-handle').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: spreadHandle.x, y: spreadHandle.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 0, y: 0, button: 'left', clickCount: 1 })
  await until(() => elements[0].x === 0 && elements[0].y === 0, 'Scaled drag did not clamp to page bounds')
  saved.x = 0; saved.y = 0
  await click('.workspace-mode-switch button:first-child')
  await until(() => evaluate('Array.from(document.querySelectorAll(".planner-sheet")).filter(n=>n.checkVisibility()).length === 1'), 'Single mode failed')
  assert.deepEqual(await evaluate(`(() => { const s=document.querySelector('.free-canvas-element').style; return {x:parseFloat(s.left),y:parseFloat(s.top)} })()`), saved)
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(200)
  const mobile = await cdp('Page.captureScreenshot', { format: 'png' })
  await writeFile('test-results/editor-mobile.png', Buffer.from(mobile.data, 'base64'))
  assert(await evaluate('document.querySelector(".planner-sheet").getBoundingClientRect().width <= innerWidth'), 'Paper overflowed mobile screen')
  assert(await evaluate('document.querySelector(".minimal-editor-header").getBoundingClientRect().bottom <= document.querySelector(".planner-sheet").getBoundingClientRect().top'), 'Metadata overlapped the paper on mobile')
  assert(await evaluate('document.querySelector(".block-heading-input")?.value === "Anotações preservadas"'), 'Existing blocks disappeared after mode switching')
  await click('.workspace-page-turner button:last-of-type')
  await until(() => evaluate('document.querySelector(".minimal-page-title-input").value === "Página 2"'), 'Next page failed')
  await click('.workspace-page-turner button:first-of-type')
  await until(() => evaluate('document.querySelector(".minimal-page-title-input").value === "Página 1"'), 'Previous page failed')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await click('[aria-label="Templates"]')
  await until(() => evaluate('!!document.querySelector(".template-section-options")'), 'Templates panel did not open')
  assert.equal(await evaluate('document.querySelectorAll(".built-in-template").length'), 12)
  assert.equal(await evaluate('document.querySelectorAll(".template-section-options button").length'), 10)
  await evaluate(`Array.from(document.querySelectorAll('.template-filter-row button')).find(button => button.textContent.trim() === 'Weekly').click()`)
  await until(() => evaluate('document.querySelectorAll(".built-in-template").length === 3'), 'Weekly template filter did not narrow the catalog')
  await evaluate(`Array.from(document.querySelectorAll('.template-filter-row button')).find(button => button.textContent.trim() === 'Todos').click()`)
  await until(() => evaluate('document.querySelectorAll(".built-in-template").length === 12'), 'All template filter did not restore the catalog')
  await writeFile('test-results/editor-template-gallery.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  assert.equal(await evaluate('document.querySelectorAll(".template-preview-dialog").length'), 0)
  assert.equal(await evaluate('document.querySelectorAll(".built-in-template-actions button").length'), 24)
  await click('[data-template-id="daily-study-focus"] .built-in-template-actions button:first-child')
  await until(() => evaluate('!!document.querySelector(".template-daily-focus")'), 'Daily Study Focus template was not applied')
  await until(() => evaluate('!!document.querySelector(".is-template-base .template-inline-field")'), 'Inline template fields were not created')
  assert(await evaluate(`(() => { const base=document.querySelector('.template-daily-focus').closest('.free-canvas-element'); return base.classList.contains('is-template-base') && !base.querySelector('.canvas-move-handle') })()`), 'Template base is not fixed')
  assert.equal(elements.find(item => item.element_type === 'template:daily-study-focus').z_index, -20)
  await writeFile('test-results/editor-template-daily.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await click('[aria-label="Templates"]')
  await click('.template-section-options button:first-child')
  await until(() => evaluate('!!document.querySelector(".study-widget")'), 'Study Planner was not inserted')
  assert(elements.some(item => item.element_type === 'section:study-planner'))
  const studyId = elements.find(item => item.element_type === 'section:study-planner').id
  const studyHandle = await evaluate(`(() => { const r=document.querySelector('.study-widget').closest('.free-canvas-element').querySelector('.canvas-move-handle').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: studyHandle.x, y: studyHandle.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: studyHandle.x + 20, y: studyHandle.y + 20, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: studyHandle.x + 20, y: studyHandle.y + 20, button: 'left', clickCount: 1 })
  await until(() => elements.find(item => item.id === studyId).x > 30, 'Study Planner move did not persist')
  const studyResize = await evaluate(`(() => { const r=document.querySelector('.study-widget').closest('.free-canvas-element').querySelector('.canvas-element-resize-handle').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: studyResize.x, y: studyResize.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: studyResize.x + 25, y: studyResize.y + 25, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: studyResize.x + 25, y: studyResize.y + 25, button: 'left', clickCount: 1 })
  await until(() => elements.find(item => item.id === studyId).width > 470, 'Study Planner resize did not persist')
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".study-widget")'), 'Study Planner did not survive reload')
  assert.equal(await evaluate(`parseFloat(document.querySelector('.study-widget').closest('.free-canvas-element').style.width)`), elements.find(item => item.id === studyId).width)
  await click('[aria-label="Templates"]')
  await click('.template-section-options button:nth-child(2)')
  await until(() => evaluate('!!document.querySelector(".task-receipt")'), 'Task Receipt was not inserted')
  await writeFile('test-results/editor-widgets.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  const receiptId = elements.find(item => item.element_type === 'widget:task-receipt').id
  const receiptStart = { ...elements.find(item => item.id === receiptId) }
  const receiptMove = await evaluate(`(() => { const r=document.querySelector('.task-receipt').closest('.free-canvas-element').querySelector('.canvas-move-handle').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: receiptMove.x, y: receiptMove.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: receiptMove.x + 18, y: receiptMove.y + 18, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: receiptMove.x + 18, y: receiptMove.y + 18, button: 'left', clickCount: 1 })
  await until(() => elements.find(item => item.id === receiptId).x > receiptStart.x, 'Task Receipt move did not persist')
  const receiptResize = await evaluate(`(() => { const r=document.querySelector('.task-receipt').closest('.free-canvas-element').querySelector('.canvas-element-resize-handle').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: receiptResize.x, y: receiptResize.y, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: receiptResize.x + 20, y: receiptResize.y + 20, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: receiptResize.x + 20, y: receiptResize.y + 20, button: 'left', clickCount: 1 })
  await until(() => elements.find(item => item.id === receiptId).width > receiptStart.width, 'Task Receipt resize did not persist')
  await click('.task-receipt-item input')
  await until(() => tasks[0].done, 'Task Receipt did not update real task')
  await click('[aria-label="Excluir elemento"]')
  await until(() => !elements.some(item => item.id === receiptId), 'Task Receipt was not removed from the page')
  assert.equal(tasks[0].done, true, 'Removing the receipt changed its source task')
  assert.equal(await evaluate('document.querySelectorAll(".task-receipt").length'), 0)
  await click('[aria-label="Templates"]')
  await click('[data-section-template="habit-tracker"]')
  await until(() => evaluate('!!document.querySelector(".section-habits")'), 'Habit Tracker section was not inserted')
  await click('.section-habit-row button')
  await until(() => elements.find(item => item.element_type === 'section:habit-tracker')?.data.habits?.[0]?.days?.[0] === true, 'Habit Tracker state did not persist')
  for (const [sectionId, elementType, selector] of [
    ['mini-calendar', 'section:mini-calendar', '.section-mini-calendar'],
    ['notes-block', 'section:notes-block', '.section-notes'],
    ['goal-block', 'section:goal-block', '.section-goal'],
    ['time-blocking', 'section:time-blocking', '.section-time-blocking'],
    ['priorities-block', 'section:priorities-block', '.section-priorities'],
    ['checklist-block', 'section:checklist-block', '.section-checklist'],
    ['quote-block', 'section:quote-block', '.section-quote'],
  ]) {
    await click('[aria-label="Templates"]')
    await click(`[data-section-template="${sectionId}"]`)
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(selector)})`), `${sectionId} section was not inserted`)
    assert(elements.some(item => item.element_type === elementType))
  }
  await click('[aria-label="Adicionar marcador"]')
  await until(() => evaluate('!!document.querySelector(".page-tabs-panel")'), 'Page tab editor did not open')
  await evaluate(`(() => { const input=document.querySelector('[aria-label="Nome do marcador"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'Estudos'); input.dispatchEvent(new Event('input',{bubbles:true})); const select=document.querySelector('[aria-label="Destino do marcador"]'); select.value='page:2'; select.dispatchEvent(new Event('change',{bubbles:true})); })()`)
  await delay(100)
  await click('.page-tab-save')
  await until(() => agendaSettings.page_tabs_v1?.length === 1, 'Page tab did not persist')
  await click('.page-tab')
  await until(() => evaluate('document.querySelector(".minimal-page-title-input")?.value.endsWith("2")'), 'Page tab did not navigate')
  await click('.planner-sheet')
  await until(() => evaluate('!!document.querySelector(".canvas-inline-text")'), 'Clicking blank paper did not create direct text')
  await evaluate(`(() => { const input=document.querySelector('.canvas-inline-text'); const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set; setter.call(input,'Primeira anotação livre'); input.dispatchEvent(new Event('input',{bubbles:true})); input.blur(); })()`)
  await until(() => elements.some(item => item.element_type === 'text' && item.data.text === 'Primeira anotação livre'), 'Direct text did not persist')
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".page-tab")'), 'Page tab did not survive reload')
  await click('.page-tab')
  await until(() => evaluate('document.querySelector(".canvas-inline-text")?.value === "Primeira anotação livre"'), 'Direct text did not survive reload')
  await click('[aria-label="Templates"]')
  await click('[data-template-id="daily-study-focus"] .built-in-template-actions button:last-child')
  await until(() => evaluate('document.querySelector(".minimal-page-title-input")?.value === "Daily Study Focus"'), 'Built-in Daily Study Focus page was not created')
  await until(() => evaluate('!!document.querySelector(".template-daily-focus")'), 'Daily Study Focus base was not persisted on the new page')
  await click('[aria-label="Templates"]')
  await click('[data-template-id="roadmap-blue"] .built-in-template-actions button:last-child')
  await until(() => evaluate('document.querySelector(".minimal-page-title-input")?.value.includes("Open Planner Roadmap")'), 'Roadmap spread was not created')
  await until(() => evaluate('document.querySelectorAll(".planner-sheet").length === 2'), 'Roadmap did not open as a real two-page spread')
  await until(() => evaluate('!!document.querySelector(".tpl-ref-roadmap.is-spread-left") && !!document.querySelector(".tpl-ref-roadmap.is-spread-right")'), 'Roadmap left/right layouts were not persisted')
  const roadmapBases = elements.filter(item => item.element_type === 'template:roadmap-blue')
  assert.equal(roadmapBases.length, 2)
  assert.deepEqual(roadmapBases.map(item => item.data.spreadSide), ['left', 'right'])
  assert(roadmapBases.every(item => item.width < item.height), 'Roadmap spread sides must be portrait pages')
  await writeFile('test-results/editor-template-roadmap.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await click('.workspace-mode-switch button:first-child')
  await until(() => evaluate('Array.from(document.querySelectorAll(".planner-sheet")).filter(n=>n.checkVisibility()).length === 1'), 'Single mode failed after Roadmap validation')
  const remainingReferenceTemplates = [
    ['monthly-project', 'Monthly Project Planner', '.tpl-ref-project', true],
    ['daily-study-grid', 'Daily Korean Study', '.tpl-ref-study', false],
    ['weekly-planning-clean', 'Week Planner Clean', '.tpl-ref-week-clean', false],
    ['weekly-dotted-cat', 'Weekly Dotted', '.tpl-ref-dots', false],
    ['weekly-cute-pastel', 'Weekly Cute Pastel', '.tpl-ref-cute', false],
    ['monthly-focus-tracker', 'Monthly Focus Tracker', '.tpl-ref-monthly', false],
    ['weekly-scrapbook', 'Weekly Scrapbook Journal', '.tpl-ref-scrap', true],
    ['daily-time-block-study', 'Daily Time-Block Study', '.tpl-ref-timeblock', false],
  ]
  for (const [templateId, title, layoutSelector, landscape] of remainingReferenceTemplates) {
    await click('[aria-label="Templates"]')
    await click(`[data-template-id="${templateId}"] .built-in-template-actions button:last-child`)
    await until(() => evaluate(`document.querySelector(".minimal-page-title-input")?.value === ${JSON.stringify(title)}`), `${title} page was not created`)
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(layoutSelector)})`), `${title} reference layout was not persisted`)
    assert.equal(pages.at(-1).paper_settings.orientation, landscape ? 'landscape' : 'portrait')
    if (templateId === 'monthly-focus-tracker') {
      const base = elements.find(item => item.page_id === pages.at(-1).id && item.element_type === 'template:monthly-focus-tracker')
      assert(base, 'Monthly template base is missing')
      await evaluate(`(() => { const input=document.querySelector('[data-template-field="month"]'); const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; setter.call(input,'outubro'); input.dispatchEvent(new Event('input',{bubbles:true})); input.blur(); })()`)
      await until(() => base.data.month === 'outubro', 'Editable month did not persist')
      await cdp('Page.reload')
      await until(() => evaluate(`document.querySelector('[data-template-field="month"]')?.value === 'outubro'`), 'Edited month did not survive reload')

    }
    if (templateId === 'weekly-cute-pastel' || templateId === 'monthly-focus-tracker') await writeFile(`test-results/editor-template-${templateId}.png`, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  }
  await writeFile('test-results/editor-template-scrapbook.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  mediaVisible = true
  await cdp('Page.navigate', { url: `${origin}/agenda/1?page=1` })
  await until(() => evaluate('document.querySelectorAll(".media-canvas-item").length === 2'), 'Photo and sticker fixture did not load')
  await click('.media-canvas-item:first-child')
  assert(await evaluate('!!document.querySelector(".media-layer-controls")'), 'Photo menu did not appear on selection')
  await click('.planner-sheet')
  await until(() => evaluate('!document.querySelector(".media-layer-controls")'), 'Photo menu stayed after blank click')
  await click('.media-canvas-item:nth-child(2)')
  assert(await evaluate('!!document.querySelector(".media-layer-controls")'), 'Sticker menu did not appear on selection')
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' })
  await until(() => evaluate('!document.querySelector(".media-layer-controls")'), 'Sticker menu stayed after Escape')
  assert(await evaluate('!!document.querySelector(".template-daily-focus")'), 'Template did not survive reload with media')
  assert(elements.some(item => item.element_type === 'postit' && item.z_index > -20), 'Post-it is not above template')
  for (const [category, expectedType] of [['Formas', 'shape'], ['Washi', 'washi'], ['Carimbos', 'stamp']]) {
    await click('[aria-label="Elementos"]')
    await evaluate(`Array.from(document.querySelectorAll('.element-action-grid button')).find(button => button.textContent.includes(${JSON.stringify(category)})).click()`)
    await delay(100)
    await click('.element-library-grid button')
    await until(() => elements.some(item => item.element_type === expectedType), `${category} was not inserted above template`)
  }
  await click('[aria-label="Canetas"]')
  await until(() => evaluate('!!document.querySelector(".drawing-input-layer")'), 'Drawing layer did not open')
  await evaluate(`fetch('http://localhost:8000/canvas/elements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ surface_type: 'page', page_id: 1, element_type: 'drawing:fineliner', x: 0, y: 0, width: 886, height: 1253, rotation: 0, z_index: 0, locked: false, data: { tool: 'fineliner', color: '#3f3934', width: 3, opacity: 1, points: [{x:220,y:480},{x:260,y:500},{x:300,y:475}] } }) })`)
  await until(() => elements.some(item => item.element_type.startsWith('drawing:')), 'Drawing was not persisted above template')
  await cdp('Page.reload')
  await until(
    () => evaluate('!!document.querySelector(".drawing-layer")?.childElementCount'),
    'Drawing did not survive reload',
  )
  // Required writing flows use real hit testing and keyboard input, not synthetic .click().
  const physicalClick = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'center'})`)
    const point = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2} })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  }
  const typeInto = async (selector, text) => {
    await physicalClick(selector)
    assert(await evaluate(`document.activeElement === document.querySelector(${JSON.stringify(selector)})`), `Focus missing: ${selector}`)
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 })
    await cdp('Input.insertText', { text })
  }
  const paperClick = async (x, y) => {
    await evaluate(`(() => { const sheet=document.querySelector('.is-focused .planner-sheet'); const r=sheet.getBoundingClientRect(); const scale=r.width/sheet.offsetWidth; window.scrollBy(0,r.top+${y}*scale-450) })()`)
    const point = await evaluate(`(() => { const sheet=document.querySelector('.is-focused .planner-sheet'); const r=sheet.getBoundingClientRect(); const scale=r.width/sheet.offsetWidth; return {x:r.left+${x}*scale,y:r.top+${y}*scale} })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
    assert(await evaluate('document.activeElement?.matches(".canvas-inline-text")'), 'Blank paper did not focus a new text immediately')
  }
  await cdp('Page.navigate', { url: `${origin}/agenda/1?page=3` })
  await until(() => evaluate('!!document.querySelector(".planner-sheet")'), 'Writing route missing')
  await click('[aria-label="Templates"]')
  await click('[data-template-id="weekly-planning-clean"] .built-in-template-actions button:first-child')
  await until(() => elements.some(item => item.page_id === 3 && item.element_type === 'template:weekly-planning-clean'), 'Week Planner missing')
  await paperClick(35, 270)
  await cdp('Input.insertText', { text: 'teste livre' })
  await paperClick(35, 400)
  await cdp('Input.insertText', { text: 'segundo ponto' })
  await until(() => elements.some(item => item.page_id === 3 && item.data.text === 'segundo ponto'), 'Second point not saved')
  const firstText = elements.find(item => item.page_id === 3 && item.data.text === 'teste livre')
  assert(firstText, 'Second text was appended to first text')
  assert(Math.abs(firstText.x - 35) <= 2 && Math.abs(firstText.y - 270) <= 2, 'Text position differs from click')
  assert(await evaluate('!document.querySelector(".is-focused .canvas-element-toolbar")'), 'Toolbar covers writing')
  await typeInto('[data-template-field="priorities"]', 'Finalizar o projeto')
  await physicalClick('.minimal-page-title-input')
  const weekBase = elements.find(item => item.page_id === 3 && item.element_type === 'template:weekly-planning-clean')
  await until(() => weekBase.data.priorities === 'Finalizar o projeto', 'Priorities were not saved')
  await click('[aria-label="Elementos"]')
  await evaluate(`Array.from(document.querySelectorAll('.element-action-grid button')).find(button => button.textContent.includes('Carimbos')).click()`)
  await click('.element-library-grid button')
  await until(() => elements.some(item => item.page_id === 3 && item.element_type === 'stamp'), 'Decoration insertion failed')
  await paperClick(35, 600)
  assert(await evaluate('!document.querySelector(".canvas-element-toolbar")'), 'Decoration controls remain visible')
  const firstLocal = await evaluate(`Array.from(document.querySelectorAll('.canvas-inline-text')).find(input => input.value === 'teste livre').closest('[data-element-id]').dataset.elementId`)
  await typeInto(`[data-element-id="${firstLocal}"] .canvas-inline-text`, 'teste livre editado')
  await until(() => firstText.data.text === 'teste livre editado', 'Existing text edit failed')
  await physicalClick('.minimal-page-title-input')
  await cdp('Page.reload')
  await until(() => evaluate(`Array.from(document.querySelectorAll('.canvas-inline-text')).some(input => input.value === 'teste livre editado')`), 'Week free text lost on reload')
  assert.equal(await evaluate('document.querySelector("[data-template-field=priorities]").value'), 'Finalizar o projeto')
  await writeFile('test-results/editor-writing-week.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))

  await cdp('Page.navigate', { url: `${origin}/agenda/1?page=4` })
  await until(() => evaluate('!!document.querySelector(".planner-sheet")'), 'Monthly route missing')
  await click('[aria-label="Templates"]')
  await click('[data-template-id="monthly-project"] .built-in-template-actions button:first-child')
  await until(() => elements.some(item => item.page_id === 4 && item.element_type === 'template:monthly-project'), 'Monthly Project missing')
  assert.equal(await evaluate('document.querySelector("[data-template-field=month]").value'), new Date().toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase())
  await typeInto('[data-template-field="month"]', 'fevereiro')
  await typeInto('[data-template-field="year"]', '2028')
  await until(() => evaluate('Array.from(document.querySelectorAll("[data-calendar-day]")).filter(node => node.textContent).length === 29'), 'Leap-year calendar did not regenerate')
  await typeInto('[data-template-field="project-idea"]', 'Criar meu planner')
  await typeInto('[data-template-field="notes"]', 'Notas do projeto')
  await physicalClick('.minimal-page-title-input')
  await click('[aria-label="Opções NOTES"]')
  await click('[aria-label="Remover NOTES"]')
  assert(await evaluate('!!document.querySelector("[data-removed-block=notes]")'), 'Optional notes block was not removed')
  await click('.template-add-section')
  await click('[data-section-template="goal-block"]')
  await until(() => elements.some(item => item.page_id === 4 && item.element_type === 'section:goal-block'), 'New section not added')
  await typeInto('[aria-label="Meta principal"]', 'Publicar em março')
  await paperClick(30, 650)
  await cdp('Input.insertText', { text: 'nota mensal livre' })
  await click('[aria-label="Elementos"]')
  await evaluate(`Array.from(document.querySelectorAll('.element-action-grid button')).find(button => button.textContent.includes('Post-its')).click()`)
  await click('.color-element-grid button')
  await typeInto('.canvas-postit-element', 'lembrete no post-it')
  await physicalClick('.minimal-page-title-input')
  const monthBase = elements.find(item => item.page_id === 4 && item.element_type === 'template:monthly-project')
  await until(() => monthBase.data['project-idea'] === 'Criar meu planner' && elements.some(item => item.page_id === 4 && item.data.text === 'lembrete no post-it'), 'Monthly changes not persisted')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector("[data-template-field=month]")?.value === "fevereiro"'), 'Month lost after reload')
  assert.equal(await evaluate('document.querySelector("[data-template-field=year]").value'), '2028')
  assert.equal(await evaluate('document.querySelector("[data-template-field=project-idea]").value'), 'Criar meu planner')
  assert(await evaluate('!!document.querySelector("[data-removed-block=notes]")'), 'Removed block returned')
  assert.equal(await evaluate(`document.querySelector('[aria-label="Meta principal"]').value`), 'Publicar em março')
  assert.equal(await evaluate('document.querySelector(".canvas-postit-element").value'), 'lembrete no post-it')
  assert(await evaluate(`Array.from(document.querySelectorAll('.canvas-inline-text')).some(input => input.value === 'nota mensal livre')`), 'Monthly free text lost')
  await writeFile('test-results/editor-writing-month.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  assert.deepEqual(runtimeErrors, [])
  // Writing mode must place a separate, focused text over an existing post-it.
  await click('[aria-label="Texto"]')
  await physicalClick('.canvas-postit-element')
  assert(await evaluate('document.activeElement?.matches(".canvas-inline-text")'), 'Writing over post-it did not focus free text')
  await cdp('Input.insertText', { text: 'Texto sobre post-it' })
  await physicalClick('.minimal-page-title-input')
  await until(() => elements.some(item => item.data.text === 'Texto sobre post-it'), 'Text over post-it not saved')
  assert.equal(await evaluate('document.querySelector(".canvas-postit-element").value'), 'lembrete no post-it')
  await cdp('Page.navigate', { url: `${origin}/agenda/1?page=1` })
  await until(() => evaluate('document.querySelectorAll(".media-canvas-item").length === 2'), 'Page sticker missing')
  await click('[aria-label="Texto"]')
  await physicalClick('.media-canvas-item:last-child')
  assert(await evaluate('document.activeElement?.matches(".canvas-inline-text")'), 'Writing over page sticker did not focus text')
  await cdp('Input.insertText', { text: 'Texto sobre adesivo da página' })
  await physicalClick('.minimal-page-title-input')
  await until(() => elements.some(item => item.page_id === 1 && item.data.text === 'Texto sobre adesivo da página'), 'Page sticker text not saved')
  await cdp('Page.reload')
  await until(() => evaluate('Array.from(document.querySelectorAll(".canvas-inline-text")).some(input => input.value === "Texto sobre adesivo da página")'), 'Page sticker text lost after reload')
  await cdp('Page.navigate', { url: `${origin}/calendar` })
  await until(() => evaluate('!!document.querySelector(".calendar-day")'), 'Calendar did not load')
  await click('.creative-note-create button')
  await physicalClick('.calendar-day:nth-of-type(20)')
  assert(await evaluate('document.activeElement?.getAttribute("aria-label") === "Texto livre do calendário"'), 'Calendar did not focus free text')
  await cdp('Input.insertText', { text: 'Anotação livre no calendário' })
  await physicalClick('.creative-panel-heading')
  await until(() => Object.values(profileSettings.calendar_creative ?? {}).some(month => month.texts.some(item => item.text === 'Anotação livre no calendário')), 'Calendar text not saved')
  await click('.creative-sticker-picker button')
  await physicalClick('.calendar-creative-sticker')
  assert(await evaluate('document.activeElement?.getAttribute("aria-label") === "Texto livre do calendário"'), 'Writing over calendar sticker failed')
  await cdp('Input.insertText', { text: 'Sobre adesivo' })
  await physicalClick('.creative-panel-heading')
  await until(() => Object.values(profileSettings.calendar_creative ?? {}).some(month => month.texts.some(item => item.text === 'Sobre adesivo')), 'Sticker text not saved')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".calendar-free-text").length === 2'), 'Calendar texts lost after reload')
  assert(await evaluate('document.querySelector(".calendar-days").textContent.includes("Sobre adesivo")'))
  assert.deepEqual(runtimeErrors, [])
  console.log('PASS: direct template gallery, editable template fields, 10 required page templates, 10 section templates, direct text, post-it, photo, sticker, shape, washi, stamp and drawing over templates; persistence, spread, receipt isolation, geometry and runtime verified.')
} finally {
  socket?.close(); browser.kill(); server.close()
}


