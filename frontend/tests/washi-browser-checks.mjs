import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { WASHI_OPTIONS } from '../src/pages/Agenda/editorCatalog.ts'

export async function verifyWashis({ cdp, evaluate, click, until, elements, pressShortcut }) {
  // Saved legacy payloads: local fixture only, with IDs outside the API allocator.
  const originals = WASHI_OPTIONS.map(([pattern, color], index) => ({
    id: 1000 + index, user_id: 1, page_id: 1, surface_type: 'page', surface_key: '', element_type: 'washi',
    x: 30 + index % 3 * 270, y: 60 + Math.floor(index / 3) * 70, width: 260, height: 54,
    rotation: 0, z_index: index, locked: false, data: { pattern, color },
  }))
  elements.push(...structuredClone(originals))
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".free-canvas-element .canvas-washi-element").length === 20'), 'Saved legacy tapes did not render')
  assert(await evaluate('[...document.querySelectorAll(".free-canvas-element .canvas-washi-element")].every(item=>item.children.length === 7 && getComputedStyle(item).opacity === "0.9")'), 'Legacy marks/opacity changed')
  const open = async () => {
    await click('[aria-label="Washi tapes"]')
    await until(() => evaluate('!!document.querySelector(".washi-library")'), 'Washi library missing')
  }
  await open()
  assert.equal(await evaluate('document.querySelectorAll("[data-washi-id]").length'), 48)
  assert.equal(await evaluate('document.querySelectorAll("[data-legacy-washi]").length'), 20)
  for (const [id] of WASHI_OPTIONS) assert(await evaluate(`!!document.querySelector('[data-legacy-washi="${id}"] .canvas-washi-element.washi-${id}')`), `Legacy thumbnail ${id} does not match its renderer`)
  const categories = ['fruit', 'garden', 'romantic', 'geometry', 'sky', 'vintage', 'korean']
  let total = 0
  for (const category of categories) {
    await click(`[data-washi-category="${category}"]`)
    const count = await evaluate('document.querySelectorAll("[data-washi-id]").length')
    assert(count > 0); total += count
    assert.equal(await evaluate('document.querySelectorAll(".washi-gallery svg").length'), count)
  }
  assert.equal(total, 48)
  await click('[data-washi-category="fruit"]')
  const set = async (label, value, range = false) => {
    await evaluate(`(() => { const field=document.querySelector('[aria-label="${label}"]'); Object.getOwnPropertyDescriptor(${range ? 'HTMLInputElement' : 'HTMLSelectElement'}.prototype,'value').set.call(field,${JSON.stringify(String(value))}); field.dispatchEvent(new Event('${range ? 'input' : 'change'}',{bubbles:true})); })()`)
  }
  for (const edge of ['straight', 'irregular', 'torn']) {
    await set('Acabamento da washi', edge)
    await until(() => evaluate(`document.querySelector('[aria-label="Acabamento da washi"]').value === '${edge}'`), 'Edge control failed')
  }
  await set('Largura da washi', 80)
  await set('Cor do papel da washi', 'lilac')
  await set('Transparência da washi', 55, true)
  await until(() => evaluate('document.querySelector(".washi-card svg").style.opacity === "0.45"'), 'Opacity preview did not update')
  assert.equal(await evaluate('document.querySelector(".washi-card svg").getAttribute("viewBox")'), '0 0 300 80')
  const previewPath = await evaluate('document.querySelector(".washi-card clipPath path").getAttribute("d")')
  assert(await evaluate('(() => { const ids=[...document.querySelectorAll(".washi-library svg [id]")].map(item=>item.id); return new Set(ids).size === ids.length; })()'), 'SVG IDs collide')
  await mkdir('test-results', { recursive: true })
  // Photograph default colors as well as customized preview behavior.
  await set('Cor do papel da washi', 'original')
  await set('Transparência da washi', 10, true)
  await writeFile('test-results/washi-fruit.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  await set('Cor do papel da washi', 'lilac')
  await set('Transparência da washi', 55, true)
  await until(() => evaluate('document.querySelector(".washi-card svg").style.opacity === "0.45"'), 'Custom opacity not restored')
  const newTapes = () => elements.filter(item => item.data.paperieKind === 'washi-v1')
  await evaluate(`(() => { const button=document.querySelector('[data-washi-id="strawberries-cream"]'); button.click(); button.click(); button.click(); })()`)
  await until(async () => await evaluate('document.querySelector(".washi-library").getAttribute("aria-busy") === "false"') && newTapes().length === 1, 'Rapid clicks duplicated or lost a tape')
  let tape = newTapes()[0]
  assert.equal(tape.height, 80)
  assert.equal(tape.data.edge, 'torn')
  assert.equal(tape.data.color, '#e4dcf0')
  assert(Math.abs(tape.data.opacity - .45) < .0001)
  assert.equal(await evaluate(`document.querySelector('[data-element-id="${tape.id}"] clipPath path').getAttribute('d')`), previewPath)
  await pressShortcut('z'); await until(() => newTapes().length === 0, 'Insertion undo failed')
  await until(() => evaluate('!document.querySelector("[aria-label=Refazer]").disabled'), 'Redo not ready')
  await pressShortcut('y'); await until(() => newTapes().length === 1, 'Insertion redo failed')
  tape = newTapes()[0]
  const frame = `[data-element-id="${tape.id}"]`
  await click(`${frame} .canvas-move-handle`)
  await evaluate(`document.querySelector('${frame} .canvas-move-handle').focus()`)
  const x = tape.x
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await until(() => tape.x === x + 1, 'Keyboard movement failed')
  const drag = async (selector, dx, dy) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`)
    const point = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x+dx, y: point.y+dy, button: 'left', buttons: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x+dx, y: point.y+dy, button: 'left', clickCount: 1 })
  }
  await drag(`${frame} .canvas-move-handle`, 30, 20)
  await until(() => tape.x > x + 1, 'Pointer movement failed')
  const width = tape.width
  await drag(`${frame} .canvas-element-resize-handle`, 35, 25)
  await until(() => tape.width > width, 'Resize failed')
  await click('[aria-label="Girar elemento"]'); await until(() => tape.rotation === 15, 'Rotation failed')
  await pressShortcut('z'); await until(() => tape.rotation === 0, 'Rotation undo failed')
  await until(() => evaluate('!document.querySelector("[aria-label=Refazer]").disabled'), 'Redo not ready')
  await pressShortcut('y'); await until(() => tape.rotation === 15, 'Rotation redo failed')
  await click('[aria-label="Enviar para trás"]'); await until(() => tape.z_index < elements.find(item=>item.id===1000).z_index, 'Layer update failed')
  await click('[aria-label="Duplicar elemento"]'); await until(() => newTapes().length === 2, 'Duplicate failed')
  assert.deepEqual(newTapes()[0].data, newTapes()[1].data)
  await until(() => evaluate('document.querySelectorAll(".free-canvas-element .paperie-washi-art").length === 2'), 'Duplicate response pending')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".free-canvas-element .paperie-washi-art").length === 2'), 'New tapes lost on reload')
  assert.equal(await evaluate('document.querySelectorAll(".free-canvas-element .canvas-washi-element").length'), 20)
  for (const original of originals) assert.deepEqual(elements.find(item => item.id === original.id).data, original.data)
  await open()
  await click('[data-washi-category="legacy"]')
  await click('[data-legacy-washi="lace"]')
  await until(() => elements.filter(item=>item.element_type==='washi').length === 23, 'Legacy insertion failed')
  assert.equal(elements.at(-1).data.pattern, 'lace')
  await open()
  await click('[data-washi-category="korean"]')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('[aria-label="Ativar tema escuro"]')
  await until(() => evaluate('document.querySelector(".editor-workspace-v6").dataset.agendaTheme === "dark"'), 'Dark theme failed')
  assert(await evaluate('(() => { const r=document.querySelector(".washi-library").getBoundingClientRect(); return r.left>=0 && r.right<=innerWidth; })()'), 'Compact library overflow')
  await evaluate('document.querySelectorAll("[data-washi-id]")[0].focus()')
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert(await evaluate('document.activeElement.matches("[data-washi-id]")'), 'Keyboard focus lost')
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid')
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 })
  await until(() => newTapes().length === 3, 'Keyboard insertion failed')
  await writeFile('test-results/washi-compact-dark.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  console.log('PASS: 48 new categorized washis; 20 saved legacy variants; identical thumbnails; edges/width/color/opacity; rapid clicks; insertion, move/resize/rotate/layers/duplicate, undo/redo, reload, keyboard and compact dark mode.')
}
