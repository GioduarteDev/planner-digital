import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

// Only called by editor-browser's isolated, in-memory API. No real user data.
export async function verifyScrapbook({ cdp, evaluate, click, until, delay, elements, pressShortcut, getMedia, failNextWrite }) {
  const scraps = () => elements.filter(item => item.data.paperieKind === 'scrapbook-v1')
  const history = async key => {
    const label = key === 'z' ? 'Desfazer' : 'Refazer'
    await until(() => evaluate(`!document.querySelector('[aria-label="${label}"]').disabled`), `${label} not ready`)
    await pressShortcut(key)
  }
  const open = async () => { await click('[aria-label="Elementos"]'); await click('.scrapbook-entry') }
  const choosePalette = async id => {
    await evaluate(`(() => { const select=document.querySelector('[aria-label="Paleta dos recortes"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,${JSON.stringify(id)}); select.dispatchEvent(new Event('change',{bubbles:true})); })()`)
    await until(() => evaluate(`document.querySelector('.scrapbook-card').getAttribute('aria-label').includes(${JSON.stringify({ cream: 'Creme vintage', rose: 'Rosa delicado', matcha: 'Matcha' }[id])})`), 'Palette did not update')
  }
  const insert = async id => {
    const count = scraps().length
    await click(`[data-scrapbook-insert="${id}"]`)
    await until(() => scraps().length === count + 1, 'Scrapbook insertion not persisted')
    await until(() => evaluate('document.querySelector(".scrapbook-library").getAttribute("aria-busy")==="false"'), 'Insertion still pending')
    return scraps().at(-1)
  }
  const filter = async name => {
    await evaluate(`[...document.querySelectorAll('.scrapbook-filters button')].find(button=>button.textContent===${JSON.stringify(name)}).click()`)
    await until(() => evaluate(`document.querySelector('.scrapbook-filters [aria-pressed=true]').textContent===${JSON.stringify(name)}`), 'Filter did not switch')
  }
  await open()
  assert.equal(await evaluate('document.querySelectorAll(".scrapbook-card").length'), 14)
  for (const name of ['Molduras', 'Papéis', 'Detalhes', 'Todos']) {
    await filter(name)
    assert.equal(await evaluate('document.querySelectorAll(".scrapbook-card").length'), { Molduras: 3, 'Papéis': 5, Detalhes: 6, Todos: 14 }[name])
  }
  for (const palette of ['cream', 'rose', 'matcha']) {
    await choosePalette(palette)
    assert.equal(await evaluate('document.querySelectorAll(".scrapbook-thumbnail svg").length'), 14)
    assert(await evaluate('(() => { const ids=[...document.querySelectorAll(".scrapbook-thumbnail [id]")].map(item=>item.id);return new Set(ids).size===ids.length; })()'), 'SVG definitions collide')
    const item = await insert('label')
    assert.equal(item.data.paletteId, palette)
  }
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/scrapbook-library-light.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  const selected = scraps().at(-1)
  const frame = `[data-element-id="${selected.id}"]`
  await click(`${frame} .canvas-move-handle`)
  const start = { x: selected.x, y: selected.y }
  await evaluate(`document.querySelector('${frame} .canvas-move-handle').focus()`)
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await until(() => selected.x === start.x + 1, 'Keyboard movement failed')
  const drag = async (selector, dx, dy) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`)
    const p = await evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x + dx, y: p.y + dy, button: 'left', buttons: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x + dx, y: p.y + dy, button: 'left', clickCount: 1 })
  }
  await drag(`${frame} .canvas-move-handle`, 35, 25)
  await until(() => selected.x > start.x + 1 && selected.y > start.y, 'Pointer move not saved')
  const width = selected.width
  await drag(`${frame} .canvas-element-resize-handle`, 30, 25)
  await until(() => selected.width > width, 'Resize not saved')
  await click('[aria-label="Girar elemento"]')
  await until(() => selected.rotation === 15, 'Rotation not saved')
  await history('z'); await until(() => selected.rotation === 0, 'Undo rotation failed')
  await history('y'); await until(() => selected.rotation === 15, 'Redo rotation failed')
  const layer = selected.z_index
  await click('[aria-label="Enviar para trás"]')
  await until(() => selected.z_index < scraps()[0].z_index, 'Layer order not saved')
  await history('z'); await until(() => selected.z_index === layer, 'Undo layer failed')
  await click('[aria-label="Bloquear elemento"]')
  await until(() => selected.locked, 'Lock not persisted')
  assert(await evaluate(`!document.querySelector('${frame} .canvas-move-handle')&&!document.querySelector('${frame} .canvas-element-resize-handle')`), 'Locked material retains transform handles')
  assert(await evaluate(`document.querySelector('[aria-label="Girar elemento"]').disabled`), 'Locked element rotation enabled')
  await click('[aria-label="Desbloquear elemento"]')
  await until(() => !selected.locked, 'Unlock not saved')
  await click('[aria-label="Duplicar elemento"]')
  await until(() => scraps().length === 4, 'Duplicate missing')
  assert.deepEqual(scraps().at(-1).data, selected.data)
  await history('z'); await until(() => scraps().length === 3, 'Duplicate undo failed')
  await history('y'); await until(() => scraps().length === 4, 'Duplicate redo failed')
  const copy = scraps().at(-1)
  await click(`[data-element-id="${copy.id}"] .canvas-move-handle`)
  await click('[aria-label="Excluir elemento"]')
  await until(() => scraps().length === 3, 'Deletion missing')
  await history('z'); await until(() => scraps().length === 4, 'Delete undo failed')
  await history('y'); await until(() => scraps().length === 3, 'Delete redo failed')
  // Exercise every persisted material, including translucent vellum and open frames.
  const ids = await evaluate('[...document.querySelectorAll("[data-scrapbook-insert]")].map(item=>item.dataset.scrapbookInsert)')
  for (const id of ids.filter(id => id !== 'label')) await insert(id)
  const vellum = scraps().find(item => item.data.materialId === 'vellum')
  assert.equal(await evaluate(`document.querySelector('[data-element-id="${vellum.id}"] [clip-path]').getAttribute('opacity')`), '0.48')
  const saved = structuredClone(scraps())
  await cdp('Page.reload')
  await until(() => evaluate(`document.querySelectorAll('.free-canvas-element .scrapbook-art').length===${saved.length}`), 'Scrapbooks lost on reload')
  assert.deepEqual(scraps(), saved)

  // Reuse the Photos library; layering must not change its file or geometry.
  await click('[aria-label="Fotos"]')
  await click('.tool-media-preview')
  await until(() => getMedia().length === 1, 'Fixture photo not inserted')
  const photo = getMedia()[0]
  const originalPhoto = structuredClone(photo)
  const polaroid = scraps().find(item => item.data.materialId === 'polaroid')
  // Arrange only fixture shapes around the original photo, without changing it.
  for (const [materialId, inset] of [['frame', 25], ['photo-corners', 28], ['polaroid', 18]]) {
    for (const item of scraps()) Object.assign(item, { x: 450, y: 800 })
    const material = scraps().find(item => item.data.materialId === materialId)
    Object.assign(material, { x: photo.x - inset, y: photo.y - inset })
    await cdp('Page.reload')
    await until(() => evaluate('!!document.querySelector(".media-canvas-item img")'), 'Photo lost on reload')
    const point = await evaluate(`(() => { const el=document.querySelector('[data-element-id="${material.id}"]');el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height*.4;const hit=document.elementFromPoint(x,y);return {x,y,hit:!!hit?.closest('.media-canvas-item'),target:hit?.outerHTML.slice(0,180)};})()`)
    assert(point.hit, `${materialId} photo aperture intercepts clicks: ${JSON.stringify(point)}`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await until(() => evaluate('!!document.querySelector(".media-canvas-item.is-selected")'), 'Original photo not selectable through frame')
    assert.deepEqual(photo, originalPhoto, 'Frame changed original media')
  }
  // Select the painted border with a real pointer, then remove only the frame.
  const border = await evaluate(`(() => {const r=document.querySelector('[data-element-id="${polaroid.id}"]').getBoundingClientRect();return {x:r.x+r.width*.5,y:r.y+r.height*.9};})()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...border, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...border, button: 'left', clickCount: 1 })
  await until(() => evaluate(`document.querySelector('[data-element-id="${polaroid.id}"]').classList.contains('is-selected')`), 'Frame border not selectable')
  await click('[aria-label="Excluir elemento"]')
  await until(() => !scraps().some(item => item.id === polaroid.id), 'Frame deletion failed')
  assert.deepEqual(getMedia(), [originalPhoto], 'Frame deletion altered original file')

  await open()
  failNextWrite()
  const count = scraps().length
  await click('[data-scrapbook-insert="clip"]')
  await until(() => evaluate('document.querySelector(".scrapbook-status").textContent.includes("Não foi possível")'), 'Failed save not surfaced')
  assert.equal(scraps().length, count, 'Failed insertion retained phantom material')
  await insert('clip')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('[aria-label="Ativar tema escuro"]')
  assert(await evaluate('(() => {const r=document.querySelector(".scrapbook-library").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;})()'), 'Compact library overflows')
  await evaluate('document.querySelector("[data-scrapbook-insert=bookmark]").focus()')
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert(await evaluate('document.activeElement.matches("[data-scrapbook-insert=botanical]")'), 'Keyboard order broken')
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid')
  const beforeKeyboard = scraps().length
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? { text: '\r' } : {}) })
  await until(() => scraps().length === beforeKeyboard + 1, 'Keyboard insertion failed')
  await writeFile('test-results/scrapbook-compact-dark.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await click('[aria-label="Ativar tema claro"]')
  await click('.element-library-back')
  await evaluate(`[...document.querySelectorAll('.element-action-grid button')].find(button=>button.textContent.includes('Post-its')).click()`)
  await click('.color-element-grid button')
  await until(() => elements.some(item => item.element_type === 'postit'), 'Legacy post-it broken')
  assert(await evaluate('!!document.querySelector(".canvas-postit-element")'), 'Legacy renderer missing')
  await delay(200)
  assert.deepEqual(getMedia(), [originalPhoto])
  console.log('PASS: 14 scrapbook materials / 3 palettes, filters, faithful previews, unique SVG IDs, movement/resize/rotation/layers/lock/duplicate/delete, undo/redo, reload, save failure/retry, photo originals and aperture hit testing, keyboard, compact dark mode and legacy post-its.')
}
