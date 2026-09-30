// Run via backend/test_academic_inbox.py --browser against its isolated database.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, extname } from 'node:path'
import { spawn } from 'node:child_process'
import { verifyIntegrity } from './integrity-browser.mjs'
import { addDays, mondayOf } from '../src/pages/Planning/planningModel.ts'

assert(process.env.ACADEMIC_TEST_API, 'Use the isolated backend test runner')
const errors = [], httpErrors = []
let failInbox = false
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname.startsWith('/__api')) {
    if (failInbox && url.pathname === '/__api/inbox') { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ detail: 'Falha temporária de teste' })); return }
    const chunks = []; for await (const chunk of req) chunks.push(chunk)
    const body = Buffer.concat(chunks)
    try {
      const response = await fetch(process.env.ACADEMIC_TEST_API + url.pathname.slice(6) + url.search, { method: req.method, headers: { 'Content-Type': 'application/json' }, ...(body.length ? { body } : {}) })
      if (response.status >= 400 && ![404].includes(response.status)) httpErrors.push([req.method, url.pathname, response.status])
      res.writeHead(response.status, { 'Content-Type': response.headers.get('content-type') || 'application/json' }); res.end(Buffer.from(await response.arrayBuffer()))
    } catch (err) { res.writeHead(502); res.end(String(err)) }
    return
  }
  const asset = url.pathname.startsWith('/assets/') || url.pathname === '/matcha-planner-icon.png' ? url.pathname.slice(1) : 'index.html'
  try { const bytes = await readFile(resolve('dist', asset)); res.writeHead(200, { 'Content-Type': ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.png': 'image/png' })[extname(asset)] ?? 'application/octet-stream' }); res.end(bytes) }
  catch { res.writeHead(404); res.end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
const profileDir = await mkdtemp(join(tmpdir(), 'matcha-academic-test-'))
const browser = spawn(process.env.EDITOR_TEST_BROWSER ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profileDir}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(done => setTimeout(done, ms))
async function until(check, message) { for (let i = 0; i < 100; i++) { const value = await check(); if (value) return value; await delay(100) } throw new Error(message) }
let socket
try {
  const port = await until(async () => { try { return (await readFile(join(profileDir, 'DevToolsActivePort'), 'utf8')).split('\n')[0] } catch { return null } }, 'Browser did not start')
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json())
  socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl)
  await new Promise(done => socket.addEventListener('open', done, { once: true }))
  let nextId = 0; const pending = new Map()
  socket.addEventListener('message', event => { const message = JSON.parse(event.data); if (message.method === 'Page.javascriptDialogOpening') { errors.push('Dialog: ' + message.params.message); void cdp('Page.handleJavaScriptDialog', { accept: true }) } if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text); if (message.id && pending.has(message.id)) { const { done, fail } = pending.get(message.id); pending.delete(message.id); if (message.error) fail(new Error(JSON.stringify(message.error))); else done(message.result) } })
  const cdp = (method, params = {}) => new Promise((done, fail) => { const id = ++nextId; const timer = setTimeout(() => { pending.delete(id); fail(new Error('CDP timeout: ' + method)) }, 20000); pending.set(id, { done: value => { clearTimeout(timer); done(value) }, fail: error => { clearTimeout(timer); fail(error) } }); socket.send(JSON.stringify({ id, method, params })) })
  const evaluate = async expression => { const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails)); return result.result.value }
  const fill = async (selector, value) => evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); if(!input) throw new Error('Missing field '+${JSON.stringify(selector)}); const proto=input.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:input.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true})); })()`)
  const clickText = async (selector, value) => {
    await until(() => evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].some(e=>e.textContent.trim().startsWith(${JSON.stringify(value)}) || e.firstChild?.textContent?.trim()===${JSON.stringify(value)} || e.textContent.trim().startsWith(${JSON.stringify(value)}))`), 'Missing button ' + value)
    await evaluate(`(() => { const el=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.textContent.trim().startsWith(${JSON.stringify(value)}) || e.firstChild?.textContent?.trim()===${JSON.stringify(value)} || e.textContent.trim().startsWith(${JSON.stringify(value)})); el.click(); })()`)
  }
  const navigate = async path => { await cdp('Page.navigate', { url: origin + path }); await until(() => evaluate('!!document.querySelector(".quick-capture-button, .library-page, .library-hero")'), `Page missing at ${path}`) }
  const api = (path, method = 'GET', body) => evaluate(`fetch('/__api'+${JSON.stringify(path)},{method:${JSON.stringify(method)},headers:{'Content-Type':'application/json'},${body === undefined ? '' : `body:JSON.stringify(${JSON.stringify(body)})`}}).then(async r=>{if(!r.ok)throw new Error(await r.text());return r.status===204?null:r.json()})`)
  await cdp('Runtime.enable'); await cdp('Page.enable')
  await cdp('Emulation.setTimezoneOverride', { timezoneId: 'America/Sao_Paulo' })
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `const realFetch=window.fetch;window.fetch=(url,options)=>{const target=new URL(typeof url==='string'?url:url.url,location.href);if(target.port==='8000')return realFetch('/__api'+target.pathname+target.search,options);return realFetch(url,options)};window.confirm=()=>true;` })
  await navigate('/organization')
  await until(() => evaluate('!!document.querySelector(".academic-center")'), 'Academic center missing')
  const today = await evaluate("new Date().toLocaleDateString('en-CA')")
  const a = await api('/subjects', 'POST', { name: 'Álgebra UI', professor: 'Ana', semester: '2026.2', color: '#a7b992' })
  const b = await api('/subjects', 'POST', { name: 'História UI', professor: 'Bia', semester: '2026.2', color: '#d3b49a' })
  const task = await api('/tasks', 'POST', { text: 'Lista de álgebra', subject_id: a.id, due_date: today })
  await api('/tasks', 'POST', { text: 'Leitura de história', subject_id: b.id, due_date: today })
  await api('/studies', 'POST', { subject: a.name, subject_id: a.id, topic: 'Equações', study_date: today, duration_minutes: 90 })
  await api('/studies', 'POST', { subject: b.name, subject_id: b.id, topic: 'Brasil', study_date: today, duration_minutes: 30 })
  await api('/events', 'POST', { title: 'Prova de álgebra', subject_id: a.id, starts_at: `${today}T23:30:00-03:00`, reminder_minutes: 15 })
  const project = await api('/projects', 'POST', { title: 'Projeto de álgebra', subject_id: a.id, due_date: today })
  await api(`/tasks/${task.id}`, 'PATCH', { project_id: project.id })
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector(".academic-subjects")?.textContent.includes("Álgebra UI")'), 'Subjects did not persist')
  await evaluate(`[...document.querySelectorAll('.academic-subject')].find(e=>e.textContent.includes('Álgebra UI')).click()`)
  await until(() => evaluate('document.querySelector(".academic-summary")?.textContent.includes("1h 30min")'), 'Study aggregate incorrect')
  assert(await evaluate('document.querySelector(".academic-detail").textContent.includes("Lista de álgebra")'))
  assert(!await evaluate('document.querySelector(".academic-sections").textContent.includes("Leitura de história")'))
  assert(await evaluate('document.querySelector(".academic-timeline").textContent.includes("Hoje")'))
  await evaluate('document.querySelector(".academic-row input[type=checkbox]").click()')
  await until(async () => (await api('/tasks')).find(t => t.id === task.id).done, 'Task not completed in API')
  await until(() => evaluate('document.querySelector(".academic-summary")?.textContent.includes("1 concluídas")'), 'Academic total not updated')
  await evaluate(`[...document.querySelectorAll('.academic-subject')].find(e=>e.textContent.includes('História UI')).click()`)
  await until(() => evaluate('document.querySelector(".academic-summary")?.textContent.includes("0h 30min")'), 'Second subject aggregate incorrect')
  // Create from the existing subject CRUD and verify optional metadata.
  await clickText('.organization-tabs button', 'Matérias')
  await fill('.organization-inline-form label:nth-child(1) input', 'Carla')
  await fill('.organization-inline-form label:nth-child(2) input', '2027.1')
  await fill('.organization-inline-form label:nth-child(3) input', 'Física UI')
  await evaluate('document.querySelector(".organization-inline-form button[type=submit]").click()')
  await until(async () => (await api('/subjects')).some(s => s.name === 'Física UI' && s.professor === 'Carla' && s.semester === '2027.1'), 'Subject metadata not saved')

  // Global capture with Enter, optional fields, persistence and editing.
  async function capture(text, details = false) {
    await evaluate('document.querySelector(".quick-capture-button").click()')
    await until(() => evaluate('!!document.querySelector("dialog[open] textarea")'), 'Capture did not open')
    await fill('dialog textarea', text)
    if (details) {
      await evaluate('document.querySelector("dialog details").open=true')
      await fill('dialog input[type=date]', today)
      await fill('dialog input[type=time]', '14:30')
      await until(() => evaluate(`!!document.querySelector('dialog select option[value="${a.id}"]')`), 'Capture subjects not loaded')
      await fill('dialog select', String(a.id))
      await fill('dialog .capture-fields textarea', 'Observação UI')
    }
    await evaluate('document.querySelector("dialog textarea").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))')
    await until(() => evaluate('!document.querySelector("dialog[open]")'), 'Capture did not save')
  }
  await capture('Somente texto UI')
  await capture('Captura completa UI', true)
  await navigate('/inbox')
  await until(() => evaluate('document.querySelector(".inbox-list")?.textContent.includes("Captura completa UI")'), 'Inbox did not show capture')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector(".inbox-list")?.textContent.includes("Observação UI")'), 'Inbox lost data after F5')
  await evaluate(`[...document.querySelectorAll('.inbox-card')].find(e=>e.textContent.includes('Somente texto UI')).querySelector('button').click()`)
  await fill('.inbox-card .capture-form textarea', 'Texto editado UI')
  await evaluate('document.querySelector(".inbox-card .capture-form button[type=submit]").click()')
  await until(() => evaluate('document.querySelector(".inbox-list")?.textContent.includes("Texto editado UI")'), 'Inbox edit failed')

  for (const [target, path] of [['task', '/tasks'], ['event', '/calendar'], ['study', '/studies'], ['project', '/organization'], ['note', '/inbox']]) {
    await capture(`Conversão UI ${target}`, true)
    await until(() => evaluate(`document.querySelector('.inbox-list')?.textContent.includes('Conversão UI ${target}')`), 'New item did not appear')
    await evaluate(`[...document.querySelectorAll('.inbox-card')].find(e=>e.querySelector('h2')?.textContent==='Conversão UI ${target}').querySelectorAll('button')[2].click()`)
    await fill('.inbox-convert select', target)
    if (target === 'study') await fill('.inbox-convert input[type=number]', '25')
    await evaluate('document.querySelector(".inbox-convert button").click()')
    await until(() => evaluate('!document.querySelector(".inbox-convert")'), 'Conversion did not finish')
    const item = (await api('/inbox')).find(i => i.text === `Conversão UI ${target}`)
    assert.equal(item.converted_type, target); assert.equal(item.status, 'processed')
    const before = target === 'note' ? 0 : (await api(target === 'study' ? '/studies' : `/${target}s`)).length
    const repeated = await api(`/inbox/${item.id}/convert`, 'POST', { target })
    assert.equal(repeated.converted_id, item.converted_id)
    if (target !== 'note') assert.equal((await api(target === 'study' ? '/studies' : `/${target}s`)).length, before)
    await navigate(path)
    if (target === 'project') await clickText('.organization-tabs button', 'Projetos')
    if (target === 'note') await fill('.inbox-page > .capture-actions select', 'processed')
    await until(() => evaluate(`document.body.textContent.includes('Conversão UI ${target}')`), `Missing ${target} in destination`)
    await navigate('/inbox')
    await until(() => evaluate('!!document.querySelector(".inbox-list")'), 'Inbox not ready')
  }
  await navigate('/organization')
  await until(() => evaluate('document.querySelector(".academic-subjects")?.textContent.includes("Álgebra UI")'), 'Academic reload failed')
  await evaluate(`[...document.querySelectorAll('.academic-subject')].find(e=>e.textContent.includes('Álgebra UI')).click()`)
  await until(() => evaluate('document.querySelector(".academic-summary")?.textContent.includes("1h 55min")'), 'Converted study not aggregated')
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/academic-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await delay(250)
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Academic mobile overflow')
  await writeFile('test-results/academic-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  await navigate('/inbox')
  await until(() => evaluate('!!document.querySelector(".inbox-list")'), 'Inbox missing')
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Inbox mobile overflow')
  await writeFile('test-results/inbox-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  failInbox = true
  await clickText('.inbox-page button', 'Atualizar')
  await until(() => evaluate('document.querySelector(".inbox-page [role=alert]")?.textContent.includes("Falha temporária")'), 'Inbox error not visible')
  failInbox = false
  await clickText('.inbox-page button', 'Atualizar')
  await until(() => evaluate('!document.querySelector(".inbox-page [role=alert]")'), 'Inbox did not recover')
  // Central de Prazos: real dates, source navigation and completion.
  const deadlineTasks = []
  for (const [offset, group] of [[-1, 'Atrasados'], [0, 'Hoje'], [1, 'Amanhã'], [3, 'Próximos 7 dias'], [10, 'Depois']]) {
    const record = await api('/tasks', 'POST', { text: `Prazo UI ${offset}`, due_date: addDays(today, offset), subject_id: a.id, project_id: project.id })
    deadlineTasks.push({ ...record, group })
  }
  await navigate('/deadlines')
  await until(() => evaluate('document.querySelector(".deadline-list")?.textContent.includes("Prazo UI -1")'), 'Deadline data did not load')
  for (const record of deadlineTasks) {
    const group = await evaluate(`[...document.querySelectorAll('.deadline-item')].find(e=>e.textContent.includes(${JSON.stringify(record.text)}))?.closest('.deadline-group').querySelector('h2').textContent`)
    assert(group.startsWith(record.group), `Wrong group for ${record.text}: ${group}`)
  }
  await evaluate(`document.querySelector('[aria-label="Concluir Prazo UI 0"]').click()`)
  await until(() => evaluate(`!document.querySelector('[aria-label="Concluir Prazo UI 0"]')`), 'Completed task still in deadlines')
  const finished = (await api('/tasks')).find(t => t.id === deadlineTasks[1].id)
  assert(finished.done && finished.completed_at)
  await api(`/tasks/${deadlineTasks[0].id}`, 'PATCH', { due_date: addDays(today, 10) })
  await clickText('.planning-heading button', 'Atualizar')
  await until(() => evaluate(`[...document.querySelectorAll('.deadline-item')].find(e=>e.textContent.includes('Prazo UI -1'))?.closest('.deadline-group').querySelector('h2').textContent.startsWith('Depois')`), 'Changed date did not regroup')
  await evaluate(`[...document.querySelectorAll('.deadline-title')].find(e=>e.textContent==='Prazo UI 1').click()`)
  await until(() => evaluate('location.pathname==="/tasks" && document.body.textContent.includes("Prazo UI 1")'), 'Deadline link did not open real Tasks')
  await navigate('/deadlines')
  await cdp('Page.reload')
  await until(() => evaluate('document.body.textContent.includes("Prazo UI 10")'), 'Deadline reload failed')
  assert(!await evaluate(`!!document.querySelector('[aria-label="Concluir Prazo UI 0"]')`))
  await writeFile('test-results/deadlines-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Deadlines mobile overflow')
  // Weekly manual history, navigation autosave, completion refresh and F5.
  await navigate('/weekly-review')
  await until(() => evaluate('!!document.querySelector(".weekly-form input")'), 'Weekly form not ready')
  await fill('.weekly-form label:nth-child(1) input', 'Prioridade UI 1')
  await fill('.weekly-form label:nth-child(2) input', 'Prioridade UI 2')
  await fill('.weekly-form label:nth-child(3) input', 'Prioridade UI 3')
  await fill('.weekly-form textarea', 'Reflexão UI persistente')
  await fill('.weekly-form label:nth-child(5) input', 'Objetivo UI')
  await clickText('.weekly-form button', 'Salvar revisão')
  await until(() => evaluate('document.querySelector(".weekly-save-state")?.textContent.includes("Revisão salva")'), 'Weekly save failed')
  await clickText('.weekly-navigation button', '← Semana anterior')
  await until(() => evaluate('!!document.querySelector(".weekly-form input") && document.querySelector(".weekly-form input").value!=="Prioridade UI 1"'), 'Previous week did not load separately')
  await fill('.weekly-form label:nth-child(1) input', 'Semana anterior UI')
  await clickText('.weekly-navigation button', 'Semana atual')
  await until(() => evaluate('document.querySelector(".weekly-form input")?.value==="Prioridade UI 1"'), 'Weekly history did not restore')
  assert.equal((await api(`/weekly-reviews/${addDays(mondayOf(today), -7)}`)).priorities[0], 'Semana anterior UI')
  const completedBefore = await evaluate('Number(document.querySelector(".weekly-page .planning-stats strong").textContent)')
  await api(`/tasks/${deadlineTasks[2].id}`, 'PATCH', { done: true })
  await clickText('.weekly-page button', 'Atualizar indicadores')
  await until(() => evaluate(`Number(document.querySelector('.weekly-page .planning-stats strong').textContent)===${completedBefore + 1}`), 'Weekly completion total did not refresh')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector(".weekly-form textarea")?.value==="Reflexão UI persistente"'), 'Weekly review did not persist after F5')
  assert.equal(await evaluate('document.querySelector(".weekly-form label:nth-child(5) input").value'), 'Objetivo UI')
  await writeFile('test-results/weekly-mobile.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth + 2'), 'Weekly mobile overflow')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await writeFile('test-results/weekly-desktop.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })).data, 'base64'))

  await verifyIntegrity({ api, navigate, evaluate, fill, clickText, until, cdp, today, subject: a, otherSubject: b, project })

  // Smoke checks of existing pages with the real, isolated API, followed by F5.
  for (const path of ['/today', '/tasks', '/calendar', '/studies', '/search', '/profile', '/inbox', '/']) {
    await navigate(path); await delay(200); await cdp('Page.reload'); await until(() => evaluate('!!document.querySelector(".quick-capture-button, .library-page, .library-hero")'), `F5 failed: ${path}`)
  }
  assert.deepEqual(errors, [])
  assert.deepEqual(httpErrors, [])
  console.log('PASS: real API + browser; two subjects, metadata, totals, task completion, timeline, global capture, Enter, edit, all conversions, duplicate retries, F5, destination pages, responsive layouts, error recovery and existing-page smoke checks.')
} finally { socket?.close(); browser.kill(); server.close() }
