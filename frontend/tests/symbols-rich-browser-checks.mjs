import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { SYMBOL_CATALOG, SYMBOL_CATEGORIES } from '../src/pages/Agenda/symbolCatalog.ts'

// Runs exclusively against editor-browser's isolated in-memory API fixture.
export async function verifyRichSymbols({ cdp, evaluate, click, until, delay, elements, origin, getSettings, pressShortcut }) {
  const open = async () => {
    if (await evaluate('!!document.querySelector("[data-tool=symbols]")')) await click('[data-tool="symbols"]')
    else { await click('[aria-label="Elementos"]'); await click('.symbol-library-entry') }
  }
  const search = async value => {
    await evaluate(`(() => { const input=document.querySelector('.symbol-search input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
    await delay(70)
  }
  await open()
  await until(() => evaluate('!!document.querySelector(".symbol-favorite-button:not(:disabled)")'), 'Favorites not ready')
  assert.equal(await evaluate('document.querySelectorAll(".symbol-card").length'), SYMBOL_CATALOG.length)
  for (const category of SYMBOL_CATEGORIES.filter(c => c.id !== 'favorites')) {
    await click(`[data-symbol-category="${category.id}"]`)
    assert.equal(await evaluate('document.querySelectorAll(".symbol-card").length'), SYMBOL_CATALOG.filter(s => s.category === category.id).length)
  }
  await click('[data-symbol-category="all"]')
  await search('papelaria estudo')
  assert(await evaluate('!!document.querySelector("[data-symbol-id=study-pencil]")'))
  await search('')
  for (const { id, value } of SYMBOL_CATALOG) {
    assert.equal(await evaluate(`document.querySelector('[data-symbol-id="${id}"] .symbol-preview-glyph text').textContent`), value)
  }
  const initialCount = elements.length
  await click('[data-symbol-id="spaced-heart"] [aria-label^="Prévia"]')
  assert.equal(await evaluate('document.querySelector(".symbol-detail-preview text").textContent'), 'ᢉ𐭩   ♡')
  assert.equal(elements.length, initialCount, 'Preview inserted content')
  assert.equal(await evaluate('document.activeElement.className'), 'symbol-detail-preview', 'Preview did not receive keyboard focus')
  await click('[aria-label="Fechar prévia"]')
  assert.equal(await evaluate('document.activeElement.getAttribute("aria-label")'), 'Prévia de Coração espaçado')

  await cdp('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] })
  await cdp('Page.bringToFront')
  await cdp('Emulation.setFocusEmulationEnabled', { enabled: true })
  for (const id of ['spaced-heart', 'heart-with-mark', 'heart-mending', 'kao-table-flip', 'divider-moon-long']) {
    await click(`[data-symbol-id="${id}"] [aria-label^="Copiar"]`)
    await until(() => evaluate('document.querySelector(".symbol-insert-status").textContent.includes("copiado")'), 'Copy did not finish')
    assert.equal(await evaluate('navigator.clipboard.readText()'), SYMBOL_CATALOG.find(s => s.id === id).value)
  }
  assert.equal(elements.length, initialCount, 'Copy inserted content')
  await evaluate(`window.originalClipboardWrite=navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText=async()=>{throw new Error('denied')}`)
  await click('[data-symbol-id="heart-mending"] [aria-label^="Copiar"]')
  await until(() => evaluate('!!document.querySelector(".symbol-manual-copy textarea")'), 'Manual copy fallback missing')
  assert.equal(await evaluate('document.querySelector(".symbol-manual-copy textarea").value'), '❤️‍🩹')
  await evaluate('navigator.clipboard.writeText=window.originalClipboardWrite')

  for (const [id, mode] of [['heart-mending', 'text'], ['divider-moon-long', 'decorative'], ['kao-shrug-classic', 'text']]) {
    const count = elements.length
    await click(`[data-symbol-mode="${mode}"]`)
    await click(`[data-symbol-id="${id}"] .symbol-card-insert`)
    await until(() => elements.length === count + 1, 'Insertion failed')
    const symbol = SYMBOL_CATALOG.find(s => s.id === id)
    assert.equal(elements.at(-1).data[mode === 'text' ? 'text' : 'symbol'], symbol.value)
    await until(() => evaluate('!document.querySelector(".symbol-card-insert:disabled")'), 'Insert still pending')
  }
  await click('[data-symbol-id="heart-mending"] .symbol-favorite-button')
  await until(() => getSettings().symbol_favorites_v1?.includes('heart-mending'), 'New favorite not saved')
  await pressShortcut('z')
  await until(() => elements.length === initialCount + 2, 'Text undo failed')
  await pressShortcut('y')
  await until(() => elements.length === initialCount + 3, 'Text redo failed')
  const saved = structuredClone(elements)
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".canvas-paperie-symbol").length === 1'), 'Decorative separator missing after reload')
  assert.deepEqual(elements, saved)
  await open()
  await click('[data-symbol-category="favorites"]')
  assert(await evaluate('!!document.querySelector("[data-symbol-id=heart-mending]")'), 'Favorite missing after reload')
  for (const width of [1440, 768, 390]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1100, deviceScaleFactor: 1, mobile: false })
    for (const category of ['hearts', 'coquette', 'funny-kaomojis', 'separators']) {
      await click(`[data-symbol-category="${category}"]`)
      await delay(100)
      const errors = await evaluate(`(() => { const gallery=document.querySelector('.symbol-gallery'); const cards=[...gallery.querySelectorAll('.symbol-card')]; const errors=[]; const boxes=cards.map(c=>c.getBoundingClientRect()); for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)errors.push('cards overlap');} if(gallery.scrollWidth>gallery.clientWidth+1)errors.push('horizontal overflow'); for(const card of cards){const svg=card.querySelector('.symbol-preview-glyph'), text=svg.querySelector('text').getBoundingClientRect(), frame=svg.getBoundingClientRect(), box=card.getBoundingClientRect(), name=card.querySelector('.symbol-card-name').getBoundingClientRect(), actions=card.querySelector('.symbol-card-actions').getBoundingClientRect(); if(name.bottom>actions.top+1 || actions.bottom>box.bottom+1)errors.push(card.dataset.symbolId+' controls overlap'); if(text.left<frame.left-1||text.right>frame.right+1||text.top<frame.top-1||text.bottom>frame.bottom+1)errors.push(card.dataset.symbolId);}return errors; })()`)
      assert.deepEqual(errors, [], `Glyphs overflow at ${width}px in ${category}`)
      if (width !== 768) {
        await evaluate(`document.querySelector('.symbol-gallery').scrollTop=0; document.querySelector('.symbol-gallery-heading').scrollIntoView({block:'center'})`)
        assert(await evaluate(`(() => {const drawer=document.querySelector('.editor-tool-drawer'),r=drawer.getBoundingClientRect();return [...document.querySelectorAll('.book-page-arrow,.page-tab-add')].every(button=>{const b=button.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;return x<r.left||x>r.right||y<r.top||y>r.bottom||!!document.elementFromPoint(x,y)?.closest('.editor-tool-drawer');});})()`), 'Agenda control overlays symbol panel')
        await mkdir('test-results', { recursive: true })
        await writeFile(`test-results/symbols-refined-${category}-${width}.png`, Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
      }
    }
  }
  console.log(`PASS: ${SYMBOL_CATALOG.length} exact Unicode values; categories; search; preview/focus; real clipboard and denied fallback; text/stamp insertion; undo/redo; favorites and reload; glyph bounds at 1440/768/390px`)
}
