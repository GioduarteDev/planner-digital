import assert from 'node:assert/strict'

export async function verifyRichText({ cdp, evaluate, click, until, delay, pageBlocks, elements }) {
  const sheetPoint = async (selector, x, y) => evaluate(`(() => {
    const sheet=document.querySelector(${JSON.stringify(selector)});
    const rect=sheet.getBoundingClientRect();
    const zoom=rect.width/sheet.offsetWidth;
    return {x:rect.left+${x}*zoom,y:rect.top+${y}*zoom,zoom};
  })()`)
  const pointerClick = async point => {
    await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 })
    await delay(120)
  }
  const type = text => cdp('Input.insertText', { text })
  const key = async (value, code) => {
    await cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: value, code })
    await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: value, code })
  }
  const chooseSheetInsert = async (label, x, y, selector = '.planner-sheet') => {
    await click('[data-tool="text"]')
    const button = await evaluate('Array.from(document.querySelectorAll(".tool-action-grid button")).map(button => button.textContent)')
    assert(button.some(text => text.includes(`${label} na folha`)), `Missing free-canvas ${label} action`)
    await evaluate(`document.querySelectorAll('.tool-action-grid button')[${label === 'Checkbox' ? 2 : 3}].click()`)
    const point = await sheetPoint(selector, x, y)
    await pointerClick(point)
    await until(() => evaluate('document.activeElement?.closest(".free-canvas-element")?.querySelector(".canvas-rich-text")?.contains(document.activeElement)'), `${label} insertion did not focus the rich editor`)
    return point
  }

  await evaluate('window.blockAlerts=[];window.alert=message=>window.blockAlerts.push(message)')
  pageBlocks.push(
    { id: 201, page_id: 1, block_type: 'checkbox', data: { text: 'Tarefa legada', checked: false }, position: 2 },
    { id: 202, page_id: 1, block_type: 'list', data: { items: ['Item legado'] }, position: 3 },
  )
  await cdp('Page.reload')
  await until(() => evaluate('document.querySelector(".block-checkbox-row .block-line-input")?.value === "Tarefa legada" && document.querySelector(".block-list-items input")?.value === "Item legado"'), 'Existing checkbox/list blocks did not reload')
  const topPoint = await chooseSheetInsert('Checkbox', 90, 130)
  await type('Tarefa do topo')
  await until(() => elements.some(item => item.element_type === 'text' && item.data.richHtml?.includes('Tarefa do topo')), 'Top checkbox text did not save')
  let richElements = elements.filter(item => item.element_type === 'text' && item.data.richTextVersion === 1)
  const top = richElements.at(-1)
  assert(top, 'Top checkbox canvas element missing')
  assert(Math.abs(top.x - 90) <= 3 && Math.abs(top.y - 130) <= 3, `Top checkbox coordinate ignored zoom: ${top.x},${top.y}`)
  const topDomId = await evaluate(`Array.from(document.querySelectorAll('.free-canvas-element')).find(item=>item.querySelector('.canvas-rich-text')?.textContent.includes('Tarefa do topo'))?.dataset.elementId`)
  assert(topDomId, 'Top checkbox local canvas element missing')
  assert(await evaluate(`(() => {const e=document.querySelector('[data-element-id="${topDomId}"]');return e.querySelector('input[type=checkbox]') && e.querySelector('.canvas-rich-text').contains(document.activeElement)})()`), 'Top checkbox is not a real focused control')

  await click('[data-tool="text"]')
  await evaluate('document.querySelectorAll(".tool-action-grid button")[2].click()')
  const middlePoint = await sheetPoint('.planner-sheet', 370, 530)
  await pointerClick(middlePoint)
  await delay(250)
  await until(() => evaluate('document.activeElement?.closest(".free-canvas-element")?.querySelector(".canvas-rich-text")?.contains(document.activeElement)'), 'Middle checkbox insertion did not focus the editor')
  await type('Tarefa do meio')
  await until(() => elements.some(item => item.data.richHtml?.includes('Tarefa do meio')), 'Middle checkbox text did not save')
  richElements = elements.filter(item => item.element_type === 'text' && item.data.richTextVersion === 1)
  const middle = richElements.at(-1)
  assert(middle && Math.abs(middle.x - 370) <= 3 && Math.abs(middle.y - 530) <= 3, 'Middle checkbox was not positioned at the chosen point')
  const middleDomId = await evaluate(`Array.from(document.querySelectorAll('.free-canvas-element')).find(item=>item.querySelector('.canvas-rich-text')?.textContent.includes('Tarefa do meio'))?.dataset.elementId`)
  assert(middleDomId, 'Middle checkbox local canvas element missing')

  await click('[data-tool="text"]')
  await evaluate('document.querySelectorAll(".tool-action-grid button")[3].click()')
  const listPoint = await sheetPoint('.planner-sheet', 470, 730)
  await pointerClick(listPoint)
  await until(() => evaluate('document.activeElement?.closest(".free-canvas-element")?.querySelector(".canvas-rich-text")?.contains(document.activeElement)'), 'List insertion did not focus the editor')
  await type('Primeiro item')
  await key('Enter', 'Enter')
  await type('Segundo item')
  await until(() => elements.some(item => item.data.richHtml?.includes('Primeiro item') && item.data.richHtml?.includes('Segundo item')), 'List items did not save')
  richElements = elements.filter(item => item.element_type === 'text' && item.data.richTextVersion === 1)
  const listElement = richElements.at(-1)
  assert(listElement && Math.abs(listElement.x - 470) <= 3 && Math.abs(listElement.y - 730) <= 3, 'List was not positioned at the chosen point')
  const listDomId = await evaluate(`Array.from(document.querySelectorAll('.free-canvas-element')).find(item=>item.querySelector('.canvas-rich-text ul')?.textContent.includes('Segundo item'))?.dataset.elementId`)
  assert(listDomId, 'List local canvas element missing')
  const listDomDebug = await evaluate(`JSON.stringify({html:document.querySelector('[data-element-id="${listDomId}"] .canvas-rich-text').innerHTML,active:document.activeElement?.outerHTML})`)
  assert(await evaluate(`document.querySelector('[data-element-id="${listDomId}"] .canvas-rich-text ul li:nth-child(2)')?.textContent === "Segundo item"`), `Enter did not create an editable next list item: ${listDomDebug}`)

  await click('[data-tool="text"]')
  const plainPoint = await sheetPoint('.planner-sheet', 220, 280)
  await pointerClick(plainPoint)
  await until(() => evaluate('document.activeElement?.closest(".free-canvas-element")?.querySelector(".canvas-rich-text")?.contains(document.activeElement)'), 'Plain rich text insertion did not focus')
  await type('Hello world')
  await until(() => elements.some(item => item.data.richHtml?.includes('Hello world')), 'Plain rich text did not save')
  richElements = elements.filter(item => item.element_type === 'text' && item.data.richTextVersion === 1)
  const plain = richElements.at(-1)
  assert(plain, 'Rich text element for inline toolbar test missing')
  const plainDomId = await evaluate(`Array.from(document.querySelectorAll('.free-canvas-element')).find(item=>item.querySelector('.canvas-rich-text')?.textContent.includes('Hello world'))?.dataset.elementId`)

  await evaluate(`(() => {
    const editor=document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text');
    const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())&&!node.textContent.includes('Hello world')){}
    if(!node)throw new Error('Insertion text node missing');
    const range=document.createRange();range.setStart(node,6);range.setEnd(node,6);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    editor.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Checkbox"]').click();
  })()`)
  await until(() => elements.find(item => item.id === plain.id)?.data.richHtml?.includes('data-matcha-checkbox="true"'), 'Context checkbox was not inserted into the existing text')
  await evaluate(`(() => {
    const editor=document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text');
    const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    editor.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Lista"]').click();
  })()`)
  await type('Lista no texto')
  await key('Enter', 'Enter')
  await type('Novo item')
  await until(() => elements.find(item => item.id === plain.id)?.data.richHtml?.includes('Novo item'), 'Context list did not save multiple items')
  const contextListDebug = await evaluate(`JSON.stringify(document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text').innerHTML)`)
  await evaluate(`(() => {
    const editor=document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text');
    const item=Array.from(editor.querySelectorAll('li')).at(-1);if(!item)throw new Error('List item missing: '+editor.innerHTML);item.textContent='';
    editor.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));
    const range=document.createRange();range.selectNodeContents(item);range.collapse(false);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
  })()`).catch(error => { throw new Error(`${error.message}; persisted=${contextListDebug}`) })
  await key('Backspace', 'Backspace')
  await delay(200)
  const remainingListItems = await evaluate(`Array.from(document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text ul:last-of-type').querySelectorAll('li')).map(item=>item.textContent)`)
  assert.deepEqual(remainingListItems, ['Lista no texto'], 'Backspace did not remove the empty list item')

  await evaluate(`(() => {
    const editor=document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text');
    const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode())&&!node.textContent.includes('Hello')){}
    if(!node)throw new Error('Text selection node missing');
    const start=node.textContent.indexOf('Hello');const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+5);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    editor.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
    document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Negrito"]').click();
    document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Itálico"]').click();
    document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Sublinhado"]').click();
    document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Tachado"]').click();
  })()`)
  await until(() => {
    const html = elements.find(item => item.id === plain.id)?.data.richHtml ?? ''
    return ['<b>', '<i>', '<u>', '<s>'].every(tag => html.includes(tag))
  }, `Inline emphasis formatting did not persist: ${elements.find(item => item.id === plain.id)?.data.richHtml ?? ''}`)

  const selectHello = `(() => {
    const editor=document.querySelector('[data-element-id="${plainDomId}"] .canvas-rich-text');
    const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())&&!node.textContent.includes('Hello')){}
    if(!node)throw new Error('Styled text selection node missing');
    const start=node.textContent.indexOf('Hello');const range=document.createRange();range.setStart(node,start);range.setEnd(node,start+5);
    const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
    editor.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));
  })()`
  await evaluate(selectHello)
  await evaluate(`(() => {
    const input=document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Tamanho do trecho"]');
    input.focus();input.value='31';input.blur();
  })()`)
  await until(() => elements.find(item => item.id === plain.id)?.data.richHtml?.includes('font-size: 31px'), 'Selected text size did not persist')

  await evaluate(selectHello)
  await evaluate(`(() => {
    const select=document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Fonte do trecho"]');
    select.value=select.options[2].value;select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`)
  await until(() => elements.find(item => item.id === plain.id)?.data.richHtml?.includes('Matcha Kalam'), 'Selected text font did not persist')

  await evaluate(selectHello)
  await evaluate(`(() => {
    const input=document.querySelector('[data-element-id="${plainDomId}"] [aria-label="Cor do trecho"]');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'#734e91');
    input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`)
  await until(() => elements.find(item => item.id === plain.id)?.data.richHtml?.includes('rgb(115, 78, 145)'), 'Selected text color did not persist')

  await evaluate(`document.querySelector('[data-element-id="${topDomId}"] input[type=checkbox]').click()`)
  await until(() => elements.find(item => item.id === top.id)?.data.richHtml?.includes('checked=""'), `Checkbox check was not persisted: ${elements.find(item => item.id === top.id)?.data.richHtml ?? ''}`)
  assert.equal(await evaluate(`document.querySelector('[data-element-id="${topDomId}"] input[type=checkbox]').checked`), true)
  await evaluate(`document.querySelector('[data-element-id="${topDomId}"] input[type=checkbox]').click()`)
  await until(() => !elements.find(item => item.id === top.id)?.data.richHtml?.includes('checked=""'), 'Checkbox uncheck was not persisted')

  await cdp('Page.reload')
  await until(() => evaluate(`!!document.querySelector('[data-element-id="${top.id}"] input[type=checkbox]') && !!document.querySelector('[data-element-id="${plain.id}"] .canvas-rich-text ul')`), 'Rich inline content did not reload')
  assert.equal(await evaluate(`document.querySelector('[data-element-id="${top.id}"] input[type=checkbox]').checked`), false)
  assert(await evaluate(`document.querySelector('[data-element-id="${plain.id}"] .canvas-rich-text').innerHTML.includes('<b>')`), 'Formatting was lost after reload')
  assert.equal(await evaluate(`document.querySelector('[data-element-id="${listElement.id}"] .canvas-rich-text ul li').textContent`), 'Primeiro item')
  assert.deepEqual(elements.find(item => item.id === top.id) && [elements.find(item => item.id === top.id).x, elements.find(item => item.id === top.id).y], [top.x, top.y])

  await click('[data-tool="select"]')
  await evaluate(`document.querySelector('[data-element-id="${middle.id}"]').click()`)
  const beforeMove = { x: elements.find(item => item.id === middle.id).x, y: elements.find(item => item.id === middle.id).y }
  const moveStart = await evaluate(`(() => {const r=document.querySelector('[data-element-id="${middle.id}"] .canvas-move-handle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...moveStart, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: moveStart.x + 35, y: moveStart.y + 25, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: moveStart.x + 35, y: moveStart.y + 25, button: 'left', clickCount: 1 })
  await until(() => elements.find(item => item.id === middle.id)?.x !== beforeMove.x, 'Canvas text could not be moved')
  const beforeResize = elements.find(item => item.id === middle.id).width
  const resizeStart = await evaluate(`(() => {const r=document.querySelector('[data-element-id="${middle.id}"] .canvas-element-resize-handle').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`)
  await cdp('Input.dispatchMouseEvent', { type: 'mousePressed', ...resizeStart, button: 'left', clickCount: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: resizeStart.x + 35, y: resizeStart.y + 20, button: 'left', buttons: 1 })
  await cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: resizeStart.x + 35, y: resizeStart.y + 20, button: 'left', clickCount: 1 })
  await until(() => elements.find(item => item.id === middle.id)?.width > beforeResize, 'Canvas text could not be resized')
  const savedPosition = { x: elements.find(item => item.id === middle.id).x, y: elements.find(item => item.id === middle.id).y, width: elements.find(item => item.id === middle.id).width }
  await cdp('Page.reload')
  await until(() => evaluate(`!!document.querySelector('[data-element-id="${middle.id}"] .canvas-rich-text')`), 'Moved text missing after reload')
  assert.deepEqual(await evaluate(`(() => {const e=document.querySelector('[data-element-id="${middle.id}"]');return {x:Number.parseFloat(e.style.left),y:Number.parseFloat(e.style.top),width:Number.parseFloat(e.style.width)}})()`), savedPosition, 'Position/size did not persist after reload')

  await evaluate('document.querySelector(\'[aria-label="Zoom do papel"]\').value="0.75";document.querySelector(\'[aria-label="Zoom do papel"]\').dispatchEvent(new Event("change",{bubbles:true}))')
  await delay(200)
  await click('.workspace-mode-switch button:nth-child(2)')
  await until(() => evaluate('document.querySelectorAll(".planner-sheet").length === 2'), 'Open agenda mode did not load')
  const rightPoint = await sheetPoint('.workspace-companion .planner-sheet', 300, 410)
  await click('.workspace-companion [data-tool="text"]')
  await evaluate('Array.from(document.querySelectorAll(".workspace-companion .tool-action-grid button")).find(button=>button.textContent.includes("Lista na folha"))?.click()')
  await pointerClick(rightPoint)
  await until(() => elements.some(item => item.page_id === 2 && item.element_type === 'text' && item.data.richHtml?.includes('<ul>')), 'Zoomed open-agenda list did not insert on the chosen page')
  const spreadList = elements.find(item => item.page_id === 2 && item.data.richHtml?.includes('<ul>'))
  assert(spreadList && Math.abs(spreadList.x - 300) <= 3 && Math.abs(spreadList.y - 410) <= 3, 'Zoomed spread list coordinates are incorrect')

  assert.equal(pageBlocks.find(block => block.id === 101)?.data.text, 'Anotações preservadas', 'Existing text block changed')
  assert.equal(await evaluate('window.blockAlerts?.length ?? 0'), 0, 'Unexpected persistence error was shown')
  assert.equal(await evaluate('document.querySelector(".block-checkbox-row .block-line-input")?.value'), 'Tarefa legada', 'Existing checkbox block changed')
  assert.equal(await evaluate('document.querySelector(".block-list-items input")?.value'), 'Item legado', 'Existing list block changed')
  console.log('PASS: free checkbox at two coordinates; list at chosen point; real inline checkbox/list; edit/check/uncheck; formatting; move/resize; reload persistence; zoomed open agenda; legacy blocks preserved')
}
