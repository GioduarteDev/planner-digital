import assert from 'node:assert/strict'

export async function verifyToolbarTools({ cdp, evaluate, click, until, elements }) {
  const railTools = [
    'Selecionar', 'Visualizar agenda', 'Texto', 'Desenhar', 'Marca-texto', 'Borracha',
    'Stickers', 'Elementos', 'Símbolos & Charminhos', 'Washi tapes', 'Hábitos', 'Fotos',
    'Papel', 'Tarefas', 'Templates', 'Mais', 'Desfazer', 'Refazer',
  ]
  for (const name of railTools) {
    assert(await evaluate(`!![...document.querySelectorAll('.editor-tool-rail button')].find(button => button.getAttribute('aria-label') === ${JSON.stringify(name)})`), `Missing toolbar tool: ${name}`)
  }
  assert(await evaluate('!!document.querySelector(\'[role="group"][aria-label="Configurações de visualização e tema da Agenda"]\')'), 'Existing agenda view/theme settings are not accessible')
  assert(await evaluate('!!document.querySelector(\'[aria-label^="Ativar tema"]\')'), 'Existing theme toggle is missing')

  await click('[aria-label="Hábitos"]')
  assert.equal(await evaluate('document.querySelectorAll(".habit-widget-library-card").length'), 6, 'Habits tool must expose exactly six insertable widgets')
  await click('.habit-widget-library-help')
  assert(await evaluate('!!document.querySelector(".habit-widget-library-description")'), 'Context help did not open')
  await click('.habit-widget-library-insert')
  await until(() => elements.some(element => element.element_type === 'widget:water-tracker'), 'Habit widget insertion did not persist')
  await until(() => evaluate('!!document.querySelector(".habit-widget-water")'), 'Inserted widget did not render')

  await click('[aria-label="Símbolos & Charminhos"]')
  await until(() => evaluate('!!document.querySelector(".symbol-library")'), 'Direct symbols tool did not open its panel')
  await click('[aria-label="Washi tapes"]')
  await until(() => evaluate('!!document.querySelector(".washi-library")'), 'Direct washi tool did not open its panel')

  await click('[aria-label="Borracha"]')
  assert.equal(await evaluate('document.querySelector("[data-tool=eraser]").getAttribute("aria-pressed")'), 'true', 'Eraser mode did not become active')
  assert.equal(await evaluate('!!document.querySelector(".drawing-tool-drawer")'), true, 'Eraser did not open the drawing panel')
  await click('[aria-label="Selecionar"]')
  assert.equal(await evaluate('document.querySelector("[data-tool=select]").getAttribute("aria-pressed")'), 'true', 'Selection mode did not become active')
  assert.equal(await evaluate('!!document.querySelector(".editor-tool-drawer")'), false, 'Selection did not close the active panel')

  for (const [width, height] of [[1440, 1000], [768, 1024], [390, 844]]) {
    await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width === 390 })
    const rail = await evaluate(`(() => { const r=document.querySelector('.editor-tool-rail').getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:document.querySelector('.editor-tool-rail').scrollWidth,clientWidth:document.querySelector('.editor-tool-rail').clientWidth}; })()`)
    assert(rail.left >= 0 && rail.right <= width && rail.top >= 0 && rail.bottom <= height, `Toolbar is outside the viewport at ${width}px: ${JSON.stringify(rail)}`)
    if (width <= 900) assert(rail.scrollWidth >= rail.clientWidth, 'Compact toolbar overflow is not horizontally reachable')
    await click('[aria-label="Desenhar"]')
    const panel = await evaluate(`(() => { const r=document.querySelector('.drawing-tool-drawer').getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollHeight:document.querySelector('.drawing-tool-drawer .tool-drawer-content').scrollHeight,clientHeight:document.querySelector('.drawing-tool-drawer .tool-drawer-content').clientHeight,railTop:document.querySelector('.editor-tool-rail').getBoundingClientRect().top}; })()`)
    assert(panel.left >= 0 && panel.right <= width && panel.top >= 0 && panel.bottom <= height, `Drawing panel is outside the viewport at ${width}px: ${JSON.stringify(panel)}`)
    if (width <= 900) assert(panel.bottom <= panel.railTop + 1, `Drawing panel overlaps the toolbar at ${width}px`)
    await click('[aria-label="Fechar ferramenta"]')
  }
  console.log('PASS: direct Select, eraser, habits, symbols and washi access; six widget cards; panel close; toolbar and drawing panel fit at 1440/768/390px')
}
