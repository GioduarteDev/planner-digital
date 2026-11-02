import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

function contrast(a, b) {
  const luminance = hex => {
    const [r, g, blue] = hex.replace('#', '').match(/../g).map(part => parseInt(part, 16) / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
    return .2126 * r + .7152 * g + .0722 * blue
  }
  const first = luminance(a), second = luminance(b)
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05)
}

// Called only by editor-browser.mjs, which owns the isolated in-memory API.
export async function verifyPaperie({ cdp, evaluate, click, until, delay, pressShortcut, elements, pages, getSettings }) {
  async function openSymbols() {
    if (await evaluate('!!document.querySelector("[data-tool=symbols]")')) await click('[data-tool="symbols"]')
    else { await click('[aria-label="Elementos"]'); await click('.symbol-library-entry') }
    await until(() => evaluate('!!document.querySelector(".symbol-favorite-button:not(:disabled)")'), 'Favorites did not load')
  }
  const fieldValue = async value => {
    await evaluate(`(() => { const input=document.querySelector('[aria-label="Buscar símbolos"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
    await delay(50)
  }
  const selectSymbol = async id => {
    const count = elements.length
    await click(`[data-symbol-id="${id}"] .symbol-card-insert`)
    await until(() => elements.length > count, 'Insertion was not saved')
    await until(() => evaluate('!document.querySelector(".symbol-card-insert:disabled") && document.querySelector(".symbol-insert-status").textContent.includes("inserido")'), 'Insertion response did not reach the editor')
  }
  await openSymbols()
  for (const category of ['hearts', 'aesthetic', 'celestial', 'nature', 'kaomojis', 'emojis', 'separators', 'favorites', 'all']) {
    await click(`[data-symbol-category="${category}"]`)
    assert.equal(await evaluate(`document.querySelector('[data-symbol-category="${category}"]').getAttribute('aria-pressed')`), 'true')
    if (category !== 'favorites') assert(await evaluate('document.querySelectorAll(".symbol-card").length > 0'))
  }
  await fieldValue('coração')
  const accented = await evaluate('[...document.querySelectorAll(".symbol-card")].map(item=>item.dataset.symbolId)')
  await fieldValue('coracao')
  assert.deepEqual(await evaluate('[...document.querySelectorAll(".symbol-card")].map(item=>item.dataset.symbolId)'), accented)
  await fieldValue('')

  // Real Tab/Space/Enter events exercise browser button activation and focus.
  await evaluate('document.querySelector("[data-symbol-id=spaced-heart] .symbol-card-insert").focus()')
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert(await evaluate('document.activeElement.matches("[data-symbol-id=spaced-heart] .symbol-favorite-button")'), 'Tab did not reach the heart')
  assert.equal(await evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid')
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32 })
  await until(() => getSettings().symbol_favorites_v1?.includes('spaced-heart'), 'Space did not favorite')
  assert.equal(elements.length, 0, 'Heart activation inserted content')
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, ...(type === 'keyDown' ? { text: '\r' } : {}) })
  await until(() => getSettings().symbol_favorites_v1?.length === 0, 'Enter did not remove the favorite')
  await click('[data-symbol-id="spaced-heart"] .symbol-favorite-button')

  await click('[data-symbol-mode="text"]')
  await selectSymbol('spaced-heart')
  const text = elements.find(item => item.element_type === 'text')
  assert.equal(text.data.text, 'ᢉ𐭩   ♡')
  await pressShortcut('z')
  await until(() => elements.length === 0, 'Text insertion undo failed')
  await pressShortcut('y')
  await until(() => elements.some(item => item.data.text === 'ᢉ𐭩   ♡'), 'Text insertion redo failed')

  await click('[data-symbol-mode="decorative"]')
  await selectSymbol('spaced-heart')
  await until(() => elements.some(item => item.data.variant === 'spaced-heart'), 'Spaced decoration missing')
  const spacedId = elements.find(item => item.data.variant === 'spaced-heart').id
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('[data-element-id="${spacedId}"] .canvas-paperie-symbol text')).whiteSpace`), 'pre', 'Decoration collapses original spaces')
  await selectSymbol('sparkle-hands')
  const stamp = elements.find(item => item.data.variant === 'sparkle-hands')
  const frame = `[data-element-id="${stamp.id}"]`
  await until(() => evaluate(`!!document.querySelector('${frame} svg text')`), 'Decorative SVG missing')
  const fit = () => evaluate(`(() => { const svg=document.querySelector('${frame} svg'); const text=svg.querySelector('text').getBoundingClientRect(); const frame=svg.getBoundingClientRect(); return text.left>=frame.left-1 && text.right<=frame.right+1 && text.top>=frame.top-1 && text.bottom<=frame.bottom+1; })()`)
  assert(await fit(), 'Long kaomoji overflows its frame')
  await click(`${frame} .canvas-move-handle`)
  const start = { x: stamp.x, y: stamp.y }
  await evaluate(`document.querySelector('${frame} .canvas-move-handle').focus()`)
  await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight' })
  await until(() => stamp.x === start.x + 1, 'Keyboard movement not saved')
  const drag = async (selector, dx, dy) => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`)
    const p = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...p, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x+dx, y: p.y+dy, button: 'left', buttons: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x+dx, y: p.y+dy, button: 'left', clickCount: 1 })
  }
  await drag(`${frame} .canvas-move-handle`, 25, 15)
  await until(() => stamp.x > start.x + 1 && stamp.y > start.y, 'Pointer movement not saved')
  await click('[aria-label="Girar elemento"]')
  await until(() => stamp.rotation === 15, 'Rotation not saved')
  await pressShortcut('z'); await until(() => stamp.rotation === 0, 'Rotation undo failed')
  await pressShortcut('y'); await until(() => stamp.rotation === 15, 'Rotation redo failed')
  // Restore rotation so bounding boxes can be compared without rotated corners.
  await pressShortcut('z'); await until(() => stamp.rotation === 0, 'Rotation reset failed')
  const beforeResize = stamp.width
  await drag(`${frame} .canvas-element-resize-handle`, 35, 35)
  await until(() => stamp.width > beforeResize, 'Resize not saved')
  assert(await fit(), 'Resized kaomoji overflows its frame')
  const resizedWidth = stamp.width
  await pressShortcut('z'); await until(() => stamp.width === beforeResize, 'Resize undo failed')
  await pressShortcut('y'); await until(() => stamp.width === resizedWidth, 'Resize redo failed')
  await click('[aria-label="Duplicar elemento"]')
  await until(() => elements.filter(item => item.data.variant === 'sparkle-hands').length === 2, 'Duplication not saved')
  const copies = elements.filter(item => item.data.variant === 'sparkle-hands')
  assert.equal(copies[0].data.symbol, copies[1].data.symbol)
  await pressShortcut('z'); await until(() => elements.filter(item => item.data.variant === 'sparkle-hands').length === 1, 'Duplicate undo failed')
  await pressShortcut('y'); await until(() => elements.filter(item => item.data.variant === 'sparkle-hands').length === 2, 'Duplicate redo failed')

  const saved = structuredClone(elements)
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".canvas-paperie-symbol").length === 3'), 'Decorations lost on reload')
  assert.deepEqual(elements, saved)
  assert.equal(await evaluate('document.querySelector(".canvas-inline-text").value'), 'ᢉ𐭩   ♡')
  await openSymbols()
  await click('[data-symbol-category="favorites"]')
  assert.equal(await evaluate('document.querySelector("[data-symbol-id=spaced-heart] .symbol-favorite-button").getAttribute("aria-pressed")'), 'true')
  for (const width of [1440, 768, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1100, deviceScaleFactor: 1, mobile: width === 390 })
    for (const theme of ['dark', 'light']) {
      await click(`[aria-label="Ativar tema ${theme === 'dark' ? 'escuro' : 'claro'}"]`)
      await until(() => getSettings().editor_theme === theme, 'Theme not saved')
      await delay(100)
      assert.equal(await evaluate('document.querySelector(".editor-workspace-v6").dataset.agendaTheme'), theme)
      assert(await evaluate(`(() => { const r=document.querySelector('.symbol-library').getBoundingClientRect(); return r.width>0 && r.left>=0 && r.right<=innerWidth; })()`), `Library overflows at ${width}px`)
      await until(async () => await evaluate('getComputedStyle(document.querySelector(".symbol-card")).backgroundColor') === (theme === 'dark' ? 'rgb(41, 50, 49)' : 'rgb(255, 250, 242)'), 'Theme transition did not settle')
      const palette = await evaluate(`(() => { const style=getComputedStyle(document.querySelector('.symbol-library')); return Object.fromEntries(['ink','muted','matcha','rose','paper','soft'].map(name=>[name,style.getPropertyValue('--paperie-'+name).trim()])); })()`)
      for (const color of ['ink', 'muted', 'matcha']) assert(contrast(palette[color], palette.paper) >= 4.5, `Insufficient ${theme} ${color} text contrast`)
      assert(contrast(palette.rose, palette.soft) >= 3, `Insufficient ${theme} heart contrast`)
      if (width === 390 || width === 1440) {
        await mkdir('test-results', { recursive: true })
        await writeFile(`test-results/paperie-review-${width}-${theme}.png`, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
      }
    }
  }
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1100, deviceScaleFactor: 1, mobile: false })
  await click('[aria-label="Papel"]')
  await click('.paper-type-card:nth-child(3)')
  await until(() => pages[0].paper_type === 'grid', 'Legacy paper change did not persist')
  await click('[aria-label="Elementos"]')
  await evaluate(`Array.from(document.querySelectorAll('.element-action-grid button')).find(button=>button.textContent.includes('Carimbos')).click()`)
  const countBeforeStamp = elements.length
  await click('.element-library-grid button')
  await until(() => elements.length > countBeforeStamp, 'Legacy stamp insertion failed')
  assert(await evaluate('!!document.querySelector(".canvas-stamp-element")'), 'Legacy stamp renderer was changed')
  await click('[aria-label="Stickers"]')
  assert(await evaluate('!!document.querySelector(".editor-tool-drawer") && !document.querySelector(".symbol-library")'), 'Stickers panel did not open independently')
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".planner-sheet")'), 'Legacy page did not reload')
  await click('[aria-label="Papel"]')
  assert(await evaluate('document.querySelector(".paper-type-card:nth-child(3)").classList.contains("active")'), 'Paper preference lost on reload')
  assert(getSettings().symbol_favorites_v1.includes('spaced-heart'), 'Legacy tools erased favorites')
  console.log('PASS: Paperie Unicode spaces; accented search; categories; keyboard Tab/Space/Enter; text/decorative insertion; move/rotate/resize/duplicate with undo/redo and reload; favorites; light/dark at 1440/768/390px.')
}

export async function verifyCalendarWriting({ cdp, evaluate, click, until, origin }) {
  const physicalClick = async selector => {
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',inline:'center'})`)
    const point = await evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`)
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 })
  }
  await cdp('Page.navigate', { url: `${origin}/calendar` })
  await until(() => evaluate('!!document.querySelector(".calendar-day")'), 'Calendar did not load')
  await click('.creative-note-create button')
  await physicalClick('.calendar-day:nth-of-type(20)')
  assert(await evaluate('document.activeElement?.getAttribute("aria-label") === "Texto livre do calendário"'), 'Calendar did not focus free text')
  await cdp('Input.insertText', { text: 'Baseline calendar note' })
  await physicalClick('.creative-panel-heading')
  await click('.creative-sticker-picker button')
  await physicalClick('.calendar-creative-sticker')
  assert(await evaluate('document.activeElement?.getAttribute("aria-label") === "Texto livre do calendário"'), 'Writing over calendar sticker failed')
}
