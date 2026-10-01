import type { PaperType } from './editorModel'

export type TemplateCategory = 'Study' | 'Weekly' | 'Daily' | 'Monthly' | 'Projects' | 'Journal' | 'Productivity' | 'Habits' | 'Goals'
export type TemplateLayout = 'dashboard-blue' | 'dashboard-kawaii' | 'roadmap' | 'project-month' | 'study-grid' | 'weekly-clean' | 'weekly-dots' | 'weekly-cute' | 'daily-focus' | 'monthly-focus' | 'weekly-scrapbook' | 'weekly-open-journal' | 'daily-time-block'

export type BuiltInTemplate = {
  id: string
  name: string
  category: TemplateCategory
  type: 'page'
  description: string
  paperType: PaperType
  accent: string
  layout: TemplateLayout
  supportedMode: 'single' | 'spread' | 'both'
  orientation: 'portrait' | 'landscape'
}

export type TemplateFieldDefinition = {
  id: string
  type: 'text' | 'multiline' | 'date'
  placeholder?: string
  editable: true
}

/** Inline content belongs to the template base; independent optional sections use CanvasElement. */
export function getTemplateConfiguration(template: BuiltInTemplate) {
  const fields: TemplateFieldDefinition[] = [
    { id: 'title', type: 'text', editable: true },
    { id: 'month', type: 'text', editable: true },
    { id: 'year', type: 'text', editable: true },
    { id: 'templateDate', type: 'date', editable: true },
  ]
  const content = template.id === 'monthly-project'
    ? ['project-idea', 'action-plan', 'notes', 'month-goals']
    : ['priorities', 'notes', 'goals', 'focus', 'reflection']
  fields.push(...content.map(id => ({ id, type: 'multiline' as const, placeholder: 'Escreva aqui…', editable: true as const })))
  return { ...template, mode: template.supportedMode, fields,
    optionalBlocks: SECTION_TEMPLATES.map(section => section.id), defaultSettings: { hiddenBlocks: [] } }
}

export function getTemplateDefaultSettings(template: BuiltInTemplate, pageDate = '') {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(pageDate) && !Number.isNaN(new Date(`${pageDate}T12:00:00`).getTime())
    ? pageDate : new Date().toLocaleDateString('en-CA')
  return { ...getTemplateConfiguration(template).defaultSettings, templateDate: date, editableVersion: 2 }
}

export type SectionTemplate = {
  id: string
  name: string
  category: TemplateCategory
  elementType: string
  description: string
  width: number
  height: number
}

export type TemplateEditableField = {
  key: string
  placeholder: string
  value?: string
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  { id: 'dashboard-blue', name: 'Focus Strategy', category: 'Productivity', type: 'page', description: 'Painel de foco, progresso e pequenas recompensas.', paperType: 'dotted', accent: 'var(--attic-window)', layout: 'dashboard-blue', supportedMode: 'single', orientation: 'portrait' },
  { id: 'dashboard-kawaii', name: 'Personal Desktop', category: 'Journal', type: 'page', description: 'Desktop pastel com recados, clima e memória.', paperType: 'blank', accent: 'var(--wisteria)', layout: 'dashboard-kawaii', supportedMode: 'single', orientation: 'portrait' },
  { id: 'roadmap-blue', name: 'Open Planner Roadmap', category: 'Goals', type: 'page', description: 'Spread aberto com foco, timeline, reflexão e abas.', paperType: 'dotted', accent: 'var(--attic-window)', layout: 'roadmap', supportedMode: 'spread', orientation: 'landscape' },
  { id: 'monthly-project', name: 'Monthly Project Planner', category: 'Projects', type: 'page', description: 'Calendário, ideia, plano de ação e process tracker.', paperType: 'blank', accent: 'var(--butter-yellow)', layout: 'project-month', supportedMode: 'both', orientation: 'landscape' },
  { id: 'daily-study-grid', name: 'Daily Korean Study', category: 'Study', type: 'page', description: 'Tabela de matérias, tarefas, checks e timetable.', paperType: 'grid', accent: 'var(--rainy-day)', layout: 'study-grid', supportedMode: 'single', orientation: 'portrait' },
  { id: 'weekly-planning-clean', name: 'Week Planner Clean', category: 'Weekly', type: 'page', description: 'Semana, prioridades, tarefas, hábitos e notas.', paperType: 'blank', accent: 'var(--matcha)', layout: 'weekly-clean', supportedMode: 'single', orientation: 'portrait' },
  { id: 'weekly-dotted-cat', name: 'Weekly Dotted', category: 'Weekly', type: 'page', description: 'Semana pontilhada com motivação e área decorativa.', paperType: 'dotted', accent: 'var(--wisteria)', layout: 'weekly-dots', supportedMode: 'single', orientation: 'portrait' },
  { id: 'weekly-cute-pastel', name: 'Weekly Cute Pastel', category: 'Weekly', type: 'page', description: 'Semana delicada com metas, prioridades e habit tracker.', paperType: 'blank', accent: 'var(--ballet-slipper)', layout: 'weekly-cute', supportedMode: 'single', orientation: 'portrait' },
  { id: 'daily-study-focus', name: 'Daily Study Focus', category: 'Daily', type: 'page', description: 'Objetivos, clima, humor, tarefas, timeline e notas.', paperType: 'grid', accent: 'var(--clover)', layout: 'daily-focus', supportedMode: 'single', orientation: 'portrait' },
  { id: 'monthly-focus-tracker', name: 'Monthly Focus Tracker', category: 'Monthly', type: 'page', description: 'Calendário, metas, duração e tracker de 31 dias.', paperType: 'blank', accent: 'var(--milk-shake)', layout: 'monthly-focus', supportedMode: 'single', orientation: 'portrait' },
  { id: 'weekly-scrapbook', name: 'Weekly Scrapbook Journal', category: 'Journal', type: 'page', description: 'Semana livre com post-its, humor, notas e colagem.', paperType: 'blank', accent: 'var(--apricot-jam)', layout: 'weekly-scrapbook', supportedMode: 'both', orientation: 'landscape' },
  { id: 'weekly-open-journal', name: 'Weekly Open Journal', category: 'Weekly', type: 'page', description: 'Diário semanal aberto para intenções, planos diários e memórias.', paperType: 'blank', accent: 'var(--apricot-jam)', layout: 'weekly-open-journal', supportedMode: 'spread', orientation: 'landscape' },
  { id: 'daily-time-block-study', name: 'Daily Time-Block Study', category: 'Study', type: 'page', description: 'Metas, prioridades, mood, color code e time blocking.', paperType: 'grid', accent: 'var(--seafoam)', layout: 'daily-time-block', supportedMode: 'single', orientation: 'portrait' },
]

export const SECTION_TEMPLATES: SectionTemplate[] = [
  { id: 'study-planner', name: 'Study Planner', category: 'Study', elementType: 'section:study-planner', description: 'Objetivos, matérias e time blocking.', width: 470, height: 720 },
  { id: 'task-receipt', name: 'Task Receipt', category: 'Productivity', elementType: 'widget:task-receipt', description: 'Checklist ligado às tarefas da agenda.', width: 300, height: 410 },
  { id: 'habit-tracker', name: 'Habit Tracker', category: 'Habits', elementType: 'section:habit-tracker', description: 'Hábitos semanais com marcação persistente.', width: 430, height: 300 },
  { id: 'mini-calendar', name: 'Mini Calendar', category: 'Monthly', elementType: 'section:mini-calendar', description: 'Calendário compacto para compor a página.', width: 360, height: 330 },
  { id: 'notes-block', name: 'Notes Block', category: 'Journal', elementType: 'section:notes-block', description: 'Papel pautado para notas rápidas.', width: 380, height: 280 },
  { id: 'goal-block', name: 'Goal Block', category: 'Goals', elementType: 'section:goal-block', description: 'Meta principal, etapas e progresso.', width: 400, height: 300 },
  { id: 'priorities-block', name: 'Priorities', category: 'Productivity', elementType: 'section:priorities-block', description: 'Três prioridades para manter o foco.', width: 390, height: 290 },
  { id: 'checklist-block', name: 'Checklist', category: 'Productivity', elementType: 'section:checklist-block', description: 'Lista editável com marcação persistente.', width: 390, height: 340 },
  { id: 'quote-block', name: 'Quote', category: 'Journal', elementType: 'section:quote-block', description: 'Trecho ou lembrete para guardar.', width: 390, height: 250 },
  { id: 'time-blocking', name: 'Time Blocking', category: 'Productivity', elementType: 'section:time-blocking', description: 'Blocos de manhã, tarde e noite.', width: 430, height: 390 },
]

export const TEMPLATE_CATEGORIES: Array<'All' | TemplateCategory> = ['All', 'Study', 'Weekly', 'Daily', 'Monthly', 'Projects', 'Journal', 'Productivity', 'Habits', 'Goals']

export function getBuiltInTemplate(id: string) {
  return BUILT_IN_TEMPLATES.find(template => template.id === id)
}

export function getTemplateEditableFields(
  template: BuiltInTemplate,
  width: number,
  height: number,
  spreadSide?: 'left' | 'right',
): TemplateEditableField[] {
  const now = new Date()
  const month = now.toLocaleDateString('pt-BR', { month: 'long' }).toLocaleUpperCase('pt-BR')
  const year = String(now.getFullYear())
  const date = now.toLocaleDateString('pt-BR')
  const make = (key: string, placeholder: string, x: number, y: number, fieldWidth: number, fieldHeight = 74, value?: string, fontSize = 18): TemplateEditableField => ({
    key, placeholder, value, x: Math.round(width * x), y: Math.round(height * y),
    width: Math.round(width * fieldWidth), height: Math.round(fieldHeight), fontSize,
  })

  if (template.layout === 'roadmap') return spreadSide === 'right'
    ? [make('intention', 'Escreva sua intenção…', .12, .13, .7, 90), make('reflection', 'Registre o que importa…', .12, .62, .72, 150)]
    : [make('focus', 'Defina o foco de hoje…', .08, .08, .62, 78), make('learning', 'O que você aprendeu?', .08, .82, .72, 90)]

  const common: Record<string, TemplateEditableField[]> = {
    'project-month': [make('month', 'Mês', .08, .78, .22, 70, month, 26), make('projectIdea', 'Escreva uma ideia…', .08, .25, .23, 105), make('actionPlan', 'Adicione os próximos passos…', .35, .25, .23, 135), make('monthGoals', 'Defina sua meta…', .7, .8, .2, 75)],
    'study-grid': [make('date', 'Data', .08, .045, .32, 62, date, 16), make('memo', 'Adicione uma nota…', .08, .14, .52, 78)],
    'weekly-clean': [make('weekFocus', 'Foco da semana…', .08, .08, .55, 66), make('priorities', 'Defina suas prioridades…', .61, .18, .29, 110), make('notes', 'Adicione uma nota…', .08, .78, .43, 105)],
    'weekly-dots': [make('motivation', 'Uma frase para a semana…', .31, .075, .61, 72)],
    'weekly-cute': [make('weeklyTitle', 'Nomeie sua semana…', .38, .04, .48, 62), make('goals', 'Defina suas metas…', .57, .14, .31, 100), make('notes', 'Adicione uma nota…', .57, .57, .31, 90)],
    'daily-focus': [make('date', 'Data', .55, .035, .34, 58, date, 16), make('objectives', 'Objetivos do dia…', .07, .1, .4, 82), make('notes', 'Adicione uma nota…', .58, .77, .32, 105)],
    'monthly-focus': [make('month', 'Mês', .07, .035, .17, 58, month, 18), make('year', 'Ano', .8, .035, .12, 58, year, 18), make('focus', 'Foco do mês…', .33, .14, .34, 82), make('goals', 'Defina suas metas…', .33, .31, .34, 120)],
    'weekly-scrapbook': [make('weekTitle', 'Nomeie esta semana…', .66, .05, .27, 58), make('journal', 'Escreva uma lembrança…', .67, .77, .27, 88)],
    'weekly-open-journal': [make('open-journal:week-title', 'Dê um nome para esta semana…', .08, .06, .74, 62), make('open-journal:intention', 'Escreva sua intenção…', .08, .2, .36, 90), make('open-journal:reflection', 'Guarde uma memória da semana…', .58, .76, .34, 100)],
    'daily-time-block': [make('date', 'Data', .08, .035, .27, 58, date, 16), make('goal', 'Meta do dia…', .08, .13, .36, 80), make('priority', 'Prioridade…', .54, .13, .36, 80)],
    'dashboard-blue': [make('focus', 'Defina sua missão principal…', .08, .13, .56, 82), make('notes', 'Adicione uma nota…', .55, .62, .34, 120)],
    'dashboard-kawaii': [make('hello', 'Escreva um recado…', .08, .13, .48, 75), make('memory', 'Guarde um momento…', .52, .54, .36, 88)],
  }
  return common[template.layout] ?? []
}
