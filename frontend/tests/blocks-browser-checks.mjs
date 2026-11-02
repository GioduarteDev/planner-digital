import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'

export async function verifyBlocks({ cdp, evaluate, click, until, delay, pageBlocks, elements, failSave }) {
  const legacyCheckbox = {
    id: 203, page_id: 1, block_type: 'checkbox',
    data: { text: 'Tarefa antiga', checked: false }, position: 2,
  }
  const legacyList = {
    id: 204, page_id: 1, block_type: 'list',
    data: { items: ['Item antigo'] }, position: 3,
  }
  pageBlocks.push(legacyCheckbox, legacyList)
  await cdp('Page.reload')
  await until(() => evaluate(
    'document.querySelector(".block-checkbox-row .block-line-input")?.value === "Tarefa antiga" && document.querySelector(".block-list-items input")?.value === "Item antigo"',
  ), 'Existing checkbox/list blocks did not load')
  const originalHeading = structuredClone(pageBlocks[0])

  await evaluate(`(() => {
    const input=document.querySelector('.block-checkbox-row .block-line-input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Tarefa editada');
    input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.blur();
  })()`)
  await until(() => legacyCheckbox.data.text === 'Tarefa editada', 'Existing checkbox text did not persist')
  await click('.block-checkbox-row input[type=checkbox]')
  await until(() => legacyCheckbox.data.checked === true, 'Existing checkbox state did not persist')
  await evaluate(`(() => {
    const input=document.querySelector('.block-list-items input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Item editado');
    input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.blur();
  })()`)
  await until(() => legacyList.data.items[0] === 'Item editado', 'Existing list item did not persist')
  await cdp('Page.reload')
  await until(() => evaluate(
    'document.querySelector(".block-checkbox-row .block-line-input")?.value === "Tarefa editada" && document.querySelector(".block-list-items input")?.value === "Item editado"',
  ), 'Existing checkbox/list edits were lost after reload')
  assert.equal(await evaluate('document.querySelector(".block-checkbox-row input[type=checkbox]").checked'), true)
  assert.deepEqual(pageBlocks[0], originalHeading)

  await evaluate(`fetch('http://localhost:8000/canvas/elements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({surface_type:'page',page_id:1,element_type:'template:weekly-planning-clean',x:0,y:0,width:886,height:1253,rotation:0,z_index:-20,locked:true,data:{templateId:'weekly-planning-clean'}})})`)
  await cdp('Page.reload')
  await until(() => evaluate('!!document.querySelector(".is-template-base") && !!document.querySelector(".block-checkbox-row")'), 'Template or legacy blocks missing after reload')
  await click('[data-tool="select"]')
  const exposed = await evaluate(`(() => {
    const input=document.querySelector('.block-checkbox-row input[type=checkbox]');
    input.scrollIntoView({block:'center'});
    const rect=input.getBoundingClientRect();
    return document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2)===input;
  })()`)
  assert.equal(exposed, true, 'Legacy checkbox is covered by the template')
  await mkdir('test-results', { recursive: true })
  await writeFile('test-results/blocks-over-template.png', Buffer.from((await cdp('Page.captureScreenshot', { format: 'png' })).data, 'base64'))

  failSave()
  await evaluate(`(() => {
    const input=document.querySelector('.block-list-items input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Salvar novamente');
    input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();input.blur();
  })()`)
  await until(() => evaluate('document.querySelector(".minimal-save-status")?.textContent.includes("Erro")'), 'Failed legacy block save was reported as successful')
  assert.equal(legacyList.data.items[0], 'Item editado', 'Failed save changed persisted list data')
  await evaluate(`document.querySelector('.block-list-items input').focus();document.querySelector('.block-list-items input').blur()`)
  await until(() => legacyList.data.items[0] === 'Salvar novamente', 'Failed legacy block save could not be retried')
  assert.deepEqual(pageBlocks[0], originalHeading)
  assert(elements.some(item => item.element_type.startsWith('template:')), 'Template was removed while checking legacy blocks')
  await delay(50)
  console.log('PASS: existing checkbox/list blocks load, remain editable and persistent, stay visible over templates, and report/retry save failures')
}
