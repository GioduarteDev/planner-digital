import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

// Uses only the editor fixture's in-memory elements and disposable browser profile.
export async function verifyTornPapers({ cdp, evaluate, click, until, elements, pressShortcut }) {
  const papers = () => elements.filter(item => item.data.paperieKind === 'torn-paper-v1')
  const open = async () => { await click('[aria-label="Elementos"]'); await click('.torn-papers-entry') }
  const collection = async id => {
    await evaluate(`(() => { const input=document.querySelector('[aria-label="Coleção de papéis rasgados"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(input,${JSON.stringify(id)}); input.dispatchEvent(new Event('change',{bubbles:true})); })()`)
    await until(() => evaluate(`document.querySelector('.torn-paper-card').dataset.tornCollection === ${JSON.stringify(id)}`), 'Collection did not change')
  }
  await open()
  assert.equal(await evaluate('document.querySelectorAll(".torn-paper-card").length'), 8)
  const collections = await evaluate('[...document.querySelectorAll(".torn-papers-select option")].map(item=>item.value)')
  assert.equal(collections.length, 13)
  for (const id of collections) {
    await collection(id)
    assert.equal(await evaluate('document.querySelectorAll(".torn-paper-card svg clipPath path").length'), 8)
    assert(await evaluate('(() => { const ids=[...document.querySelectorAll(".torn-papers-library svg [id]")].map(item=>item.id); return new Set(ids).size===ids.length; })()'), 'Thumbnail SVG IDs collide')
  }
  await collection('vintage-news')
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/torn-papers-news.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  const insert = async id => {
    const count = papers().length
    await click(`[data-torn-format="${id}"]`)
    await until(() => papers().length === count + 1, 'Paper not persisted')
    await until(() => evaluate('document.querySelector(".torn-papers-library").getAttribute("aria-busy") === "false"'), 'Insertion not complete')
  }
  await insert('horizontal')
  const first = papers()[0]
  assert.equal(first.element_type, 'shape')
  assert.equal(first.data.collectionId, 'vintage-news')
  assert(await evaluate(`!!document.querySelector('[data-element-id="${first.id}"] .torn-paper-art')`), 'Persisted paper did not use preview renderer')
  await collection('strawberry')
  await insert('scrap')
  const selected = papers()[1]
  const frame = `[data-element-id="${selected.id}"]`
  await click(`${frame} .canvas-move-handle`)
  const start = { x: selected.x, y: selected.y }
  await evaluate(`document.querySelector('${frame} .canvas-move-handle').focus()`)
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await until(() => selected.x === start.x + 1, 'Keyboard movement failed')
  const drag = async (selector, dx, dy) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`)
    const p = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x+dx, y: p.y+dy, button: 'left', buttons: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x+dx, y: p.y+dy, button: 'left', clickCount: 1 })
  }
  await drag(`${frame} .canvas-move-handle`, 30, 20)
  await until(() => selected.x > start.x + 1 && selected.y > start.y, 'Pointer movement not saved')
  const width = selected.width
  await drag(`${frame} .canvas-element-resize-handle`, 30, 30)
  await until(() => selected.width > width, 'Resize not saved')
  await click('[aria-label="Girar elemento"]')
  await until(() => selected.rotation === 15, 'Rotation not saved')
  await pressShortcut('z'); await until(() => selected.rotation === 0, 'Rotation undo failed')
  await until(() => evaluate('!document.querySelector("[aria-label=Refazer]").disabled'), 'Redo not ready')
  await pressShortcut('y'); await until(() => selected.rotation === 15, 'Rotation redo failed')
  const originalLayer = selected.z_index
  await click('[aria-label="Enviar para trás"]')
  await until(() => selected.z_index < first.z_index, 'Layer order not saved')
  await pressShortcut('z'); await until(() => selected.z_index === originalLayer, 'Layer undo failed')
  await click('[aria-label="Duplicar elemento"]')
  await until(() => papers().length === 3, 'Duplicate not saved')
  assert.deepEqual(papers()[2].data, selected.data)
  await until(() => evaluate('!document.querySelector("[aria-label=Desfazer]").disabled'), 'Undo not ready')
  await pressShortcut('z'); await until(() => papers().length === 2, 'Duplicate undo failed')
  await until(() => evaluate('!document.querySelector("[aria-label=Refazer]").disabled'), 'Redo not ready')
  await pressShortcut('y'); await until(() => papers().length === 3, 'Duplicate redo failed')
  await until(() => evaluate('document.querySelectorAll(".free-canvas-element .torn-paper-art").length === 3'), 'Duplicate response not applied')
  const saved = structuredClone(papers())
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".free-canvas-element .torn-paper-art").length === 3'), 'Papers lost on reload')
  assert.deepEqual(papers(), saved)

  // Check keyboard activation and all shapes after reload without changing old tools.
  await open()
  await collection('sheet-music')
  for (const id of ['corner', 'edge', 'vertical', 'block', 'page', 'label']) await insert(id)
  await collection('witchy')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('[aria-label="Ativar tema escuro"]')
  await until(() => evaluate('document.querySelector(".editor-workspace-v6").dataset.agendaTheme === "dark"'), 'Dark theme missing')
  assert(await evaluate('(() => { const r=document.querySelector(".torn-papers-library").getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth; })()'), 'Library overflows compact view')
  await evaluate('document.querySelector("[data-torn-format=page]").focus()')
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert(await evaluate('document.activeElement.matches("[data-torn-format=label]")'), 'Tab did not reach torn label')
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid')
  const count = papers().length
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await until(() => papers().length === count + 1, 'Keyboard insertion failed')
  await writeFile('test-results/torn-papers-compact-dark.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await click('[aria-label="Ativar tema claro"]')
  await click('[aria-label="Elementos"]')
  await click('[aria-label="Elementos"]')
  await evaluate(`[...document.querySelectorAll('.element-action-grid button')].find(button=>button.textContent.includes('Post-its')).click()`)
  await click('.color-element-grid button')
  await until(() => elements.some(item => item.element_type === 'postit'), 'Legacy post-it insertion failed')
  await until(() => evaluate('!!document.querySelector(".canvas-postit-element")'), 'Legacy post-it renderer missing')
  await evaluate(`(() => { const field=document.querySelector('.canvas-postit-element'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,'Post-it preservado'); field.dispatchEvent(new Event('input',{bubbles:true})); field.blur(); })()`)
  await until(() => elements.some(item => item.element_type === 'postit' && item.data.text === 'Post-it preservado'), 'Post-it content did not save')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector(".canvas-postit-element")?.value === "Post-it preservado"'), 'Legacy post-it lost on reload')
  assert.equal(papers().length, count + 1)
  console.log('PASS: 8 torn-paper formats, 13 collections, unique SVG IDs, insert/move/resize/rotate/duplicate/layers, undo/redo, reload, keyboard, compact dark theme and legacy post-it persistence.')
}
