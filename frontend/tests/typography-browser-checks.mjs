import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

export async function verifyTypography({ cdp, evaluate, click, until, elements, pressShortcut, failNextWrite }) {
  const originalText = '  Ação & café\n\nᢉ𐭩   ♡ e\u0301 👩🏽‍💻 (｡•ᴗ•｡)  '
  const old = { id: 1200, user_id: 1, surface_type: 'page', page_id: 1, element_type: 'text', x: 50, y: 120, width: 420, height: 115, z_index: 1, rotation: 0, locked: false, data: { text: originalText, custom: 'preserve me' } }
  const untouched = { ...old, id: 1201, y: 300, data: { text: 'Texto antigo em Georgia', fontFamily: 'Georgia', fontSize: 19, lineHeight: 1.55 } }
  elements.push(structuredClone(old), structuredClone(untouched))
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".canvas-inline-text").length === 2'), 'Legacy text missing')
  const legacyStyle = await evaluate('getComputedStyle(document.querySelector(".canvas-inline-text")).fontFamily')
  const titleStyle = await evaluate('getComputedStyle(document.querySelector(".block-heading-input")).fontFamily')
  await evaluate('document.querySelector(".canvas-inline-text").focus(); document.querySelector(".canvas-inline-text").setSelectionRange(4,12)')
  await click('[aria-label="Texto"]')
  assert.equal(elements.find(item=>item.id===1200).data.fontFamily, undefined, 'Opening controls restyled legacy text')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".canvas-inline-text")).fontFamily'), legacyStyle)
  assert.equal(await evaluate('document.querySelectorAll("[data-font-id]").length'), 9)
  const loaded = await evaluate(`(async () => { const families=['Caveat','Kalam','Patrick Hand','Nunito','Quicksand','Fraunces','Cormorant Garamond']; return Promise.all(families.map(async name=>({name,loaded:(await document.fonts.load('24px "Matcha '+name+'"','Ação chá')).length>0}))); })()`)
  assert(loaded.every(font=>font.loaded), JSON.stringify(loaded))
  for (const category of ['Manuscritas', 'Fofinhas', 'Elegantes', 'Simples', 'Todas']) {
    await click(`[data-font-category="${category}"]`)
    assert(await evaluate('document.querySelectorAll("[data-font-id]").length>0'))
  }
  await click('[data-font-id="caveat"]')
  await until(() => elements.find(item=>item.id===1200).data.fontFamily?.includes('Matcha Caveat'), 'Family not saved')
  assert.equal(await evaluate('document.querySelector(".canvas-inline-text").value'), originalText)
  assert.deepEqual(await evaluate('(() => { const input=document.querySelector(".canvas-inline-text"); return [input.selectionStart,input.selectionEnd]; })()'), [4, 12], 'Formatting lost the selection')
  const set = async (label, value, type = 'number') => {
    await evaluate(`(() => { const field=document.querySelector('[aria-label="${label}"]'); Object.getOwnPropertyDescriptor(${type === 'select' ? 'HTMLSelectElement' : 'HTMLInputElement'}.prototype,'value').set.call(field,${JSON.stringify(String(value))}); field.dispatchEvent(new Event('${type === 'select' ? 'change' : 'input'}',{bubbles:true})); })()`)
  }
  await set('Tamanho da fonte', 32)
  await set('Cor do texto', '#a25c75', 'color')
  await click('[aria-label="Negrito"]')
  await click('[aria-label="Itálico"]')
  await set('Espaçamento entre linhas', 2, 'select')
  await click('[aria-label="Centralizado"]')
  await until(() => { const data=elements.find(item=>item.id===1200).data; return data.fontSize===32 && data.color==='#a25c75' && data.fontWeight==='bold' && data.fontStyle==='italic' && data.lineHeight===2 && data.textAlign==='center' }, 'Style controls did not persist')
  const newerText = originalText + '\nMais palavras sem perder nada.'
  await evaluate(`(() => { const input=document.querySelector('[data-element-id="1200"] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(newerText)}); input.dispatchEvent(new Event('input',{bubbles:true})); })()`)
  await until(() => elements.find(item=>item.id===1200).data.text===newerText, 'Typing did not save')
  await click('[aria-label="Desfazer"]')
  await until(() => elements.find(item=>item.id===1200).data.textAlign === undefined, 'Style undo failed')
  assert.equal(elements.find(item=>item.id===1200).data.text, newerText, 'Style undo restored stale text')
  await until(() => evaluate('!document.querySelector("[aria-label=Refazer]").disabled'), 'Redo not ready')
  await click('[aria-label="Refazer"]')
  await until(() => elements.find(item=>item.id===1200).data.textAlign==='center', 'Style redo failed')
  assert.equal(elements.find(item=>item.id===1200).data.text, newerText)
  assert.equal(elements.find(item=>item.id===1200).data.custom, 'preserve me')

  // One synchronous burst: style then Unicode input, before React re-renders.
  await evaluate(`(() => { document.querySelector('[data-font-id=quicksand]').click(); const input=document.querySelector('[data-element-id="1200"] textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input,${JSON.stringify(newerText + ' 🍓')}); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('[aria-label="À direita"]').click(); })()`)
  await until(() => { const data=elements.find(item=>item.id===1200).data; return data.text===newerText+' 🍓' && data.fontFamily.includes('Quicksand') && data.textAlign==='right' }, 'Rapid typing/style updates overwrote each other')
  failNextWrite()
  await click('[data-font-id="fraunces"]')
  await until(() => evaluate('document.querySelector(".minimal-save-status").textContent.includes("Erro")'), 'Style save failure not shown')
  await evaluate(`[...document.querySelectorAll('button')].find(button=>button.textContent.includes('Tentar salvar novamente')).click()`)
  await until(() => elements.find(item=>item.id===1200).data.fontFamily.includes('Fraunces'), 'Style retry failed')
  await click('[data-font-id="cormorant"]')
  await until(() => elements.find(item=>item.id===1200).data.fontFamily.includes('Cormorant'), 'Romantic serif not saved')
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/agenda-typography.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
  assert.deepEqual(elements.find(item=>item.id===1201).data, untouched.data, 'Unselected legacy text changed')
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".block-heading-input")).fontFamily'), titleStyle, 'Global typography changed')

  await evaluate(`(() => { const input=document.querySelector('[data-element-id="1200"] textarea'); input.focus(); input.setSelectionRange(2,5); })()`)
  await click('[aria-label="Voltar a escrever"]')
  assert(await evaluate('document.activeElement.matches(".canvas-inline-text")'), 'Resume did not restore text focus')
  assert.deepEqual(await evaluate('[document.activeElement.selectionStart,document.activeElement.selectionEnd]'), [2,5])
  await click('[aria-label="Texto"]')
  await click('button[data-font-id="kalam"]') // Selected text only.
  await evaluate(`Array.from(document.querySelectorAll('.agenda-writing-target button')).find(button=>button.textContent.includes('Estilo para novos textos')).click()`)
  await click('[data-font-id="kalam"]')
  // Place new writing on blank paper using real pointer input.
  await evaluate(`(() => { const sheet=document.querySelector('.is-focused .planner-sheet'); const r=sheet.getBoundingClientRect(); const scale=r.width/sheet.offsetWidth; window.scrollBy(0,r.top+650*scale-650); })()`)
  const point = await evaluate(`(() => { const sheet=document.querySelector('.is-focused .planner-sheet'); const r=sheet.getBoundingClientRect(); const scale=r.width/sheet.offsetWidth; return {x:r.x+80*scale,y:r.y+650*scale}; })()`)
  for (const type of ['mousePressed','mouseReleased']) await cdp('Input.dispatchMouseEvent', { type, ...point, button: 'left', clickCount: 1 })
  await until(() => evaluate('document.activeElement?.matches(".canvas-inline-text")'), 'New writing did not focus')
  const createdText = '  Novo dia\n👨‍👩‍👧‍👦  e\u0301\n\n♡  '
  await cdp('Input.insertText', { text: createdText })
  await until(() => elements.some(item=>item.data.text===createdText), 'New styled text not saved')
  const created = elements.find(item=>item.data.text===createdText)
  assert(created.data.fontFamily.includes('Kalam'))
  const count = elements.length
  await pressShortcut('z')
  assert.equal(elements.length, count, 'Native textarea undo changed canvas entities')
  await pressShortcut('y')
  await until(() => elements.some(item=>item.data.text===createdText), 'Native redo lost Unicode')
  await click('[aria-label="Desfazer"]')
  await until(() => elements.length===count-1, 'Local text creation undo failed')
  await until(() => evaluate('document.querySelectorAll(".canvas-inline-text").length === 2'), 'Local draft remained after undo')
  await until(() => evaluate('!document.querySelector("[aria-label=Refazer]").disabled'), 'Creation redo not ready')
  await click('[aria-label="Refazer"]')
  await until(() => elements.some(item=>item.data.text===createdText), 'Creation redo lost text content')
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelectorAll(".canvas-inline-text").length===3'), 'Text lost on reload')
  assert(elements.find(item=>item.data.text===createdText).data.fontFamily.includes('Kalam'))
  assert.deepEqual(elements.find(item=>item.id===1201).data, untouched.data)
  console.log('PASS: 7 local licensed fonts, live categories/previews, style controls, unchanged legacy/global text, selection, Unicode/spaces, rapid autosave, retry, style undo/redo, native editing undo, draft creation undo/redo and reload.')
}
