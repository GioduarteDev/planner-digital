import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Cloud, CloudRain, CloudSun, MapPin, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dateKey, type Event, type Task } from './todayData'
import { weatherByCity, weatherByCoordinates, weatherDescription, type Weather } from './weatherService'

export function WeatherWidget() {
  const [city, setCity] = useState(() => localStorage.getItem('matcha-weather-city') ?? '')
  const [refresh, setRefresh] = useState(0)
  const [draft, setDraft] = useState(city)
  const [weather, setWeather] = useState<Weather | null>(null)
  const [loading, setLoading] = useState(Boolean(city))
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(!city)
  useEffect(() => {
    if (!city) return
    let cancelled = false
    weatherByCity(city).then(result => { if (!cancelled) { setWeather(result); setError(''); setLoading(false) } })
      .catch(caught => { if (!cancelled) { setError(caught instanceof Error ? caught.message : 'Não foi possível carregar o clima.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [city, refresh])
  function search(event: FormEvent) { event.preventDefault(); if (!draft.trim()) return; setLoading(true); setError(''); setCity(draft.trim()); setRefresh(value => value + 1); localStorage.setItem('matcha-weather-city', draft.trim()); setEditing(false) }
  function locate() {
    if (!navigator.geolocation) { setError('Localização indisponível neste navegador.'); return }
    setLoading(true); setError('')
    navigator.geolocation.getCurrentPosition(position => {
      weatherByCoordinates(position.coords.latitude, position.coords.longitude, 'Minha localização')
        .then(result => { setWeather(result); setLoading(false); setEditing(false) })
        .catch(() => { setLoading(false); setError('Não foi possível carregar o clima. Digite uma cidade.') })
    }, () => { setLoading(false); setError('Localização não autorizada. Digite uma cidade.') }, { timeout: 9000 })
  }
  const Icon = weather ? weather.code === 0 ? Sun : weather.code <= 3 ? CloudSun : weather.code >= 51 ? CloudRain : Cloud : CloudSun
  return <aside className="today-weather" aria-label="Clima atual"><div className="today-weather-top"><span>NA SUA JANELA</span><button type="button" onClick={() => setEditing(value => !value)} aria-label="Escolher cidade"><MapPin size={15} /></button></div>
    {weather && !editing && <div className="today-weather-reading"><Icon size={31} strokeWidth={1.5} /><strong>{Math.round(weather.temperature)}°</strong><div><b>{weather.city}</b><span>{weatherDescription(weather.code)} · ↑{Math.round(weather.max)}° ↓{Math.round(weather.min)}°</span></div></div>}
    {loading && <p role="status">Olhando pela janela…</p>}
    {editing && <form onSubmit={search}><input aria-label="Cidade para o clima" placeholder="Sua cidade" value={draft} onChange={event => setDraft(event.target.value)} /><button type="submit">Ver clima</button><button type="button" onClick={locate} aria-label="Usar minha localização"><MapPin size={16} /></button></form>}
    {error && <p role="alert" className="today-weather-error">{error}</p>}
  </aside>
}

export function MiniCalendar({ tasks, events }: { tasks: Task[]; events: Event[] }) {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const today = dateKey(new Date())
  return <section className="today-mini-calendar" aria-label="Mini calendário"><header><div><CalendarDays size={18} /><h2>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2></div><nav><button type="button" aria-label="Mês anterior" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><button type="button" aria-label="Próximo mês" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={16} /></button></nav></header>
    <div className="today-mini-days">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span key={index} className="today-weekday">{day}</span>)}
      {Array.from({ length: firstWeekday }, (_, index) => <span key={`gap-${index}`} />)}
      {Array.from({ length: count }, (_, index) => { const key = dateKey(new Date(month.getFullYear(), month.getMonth(), index + 1)); const marked = tasks.some(task => task.due_date === key) || events.some(event => event.starts_at.slice(0, 10) === key)
        return <button type="button" key={key} className={key === today ? 'is-today' : ''} aria-label={`${index + 1} de ${month.toLocaleDateString('pt-BR', { month: 'long' })}${marked ? ', com compromissos' : ''}`} onClick={() => navigate(`/calendar?date=${key}`)}>{index + 1}{marked && <i />}</button> })}</div>
    <button type="button" className="today-calendar-link" onClick={() => navigate('/calendar')}>Abrir calendário <ChevronRight size={14} /></button></section>
}

export function TodayTasks({ tasks, onToggle, loading }: { tasks: Task[]; onToggle: (id: number) => void; loading: boolean }) {
  const navigate = useNavigate()
  const today = dateKey(new Date())
  const due = tasks.filter(task => task.due_date === today).sort((a, b) => Number(a.done) - Number(b.done))
  return <section className="today-task-receipt"><header><span>TO DO · {new Date().toLocaleDateString('pt-BR')}</span><h2>Para hoje</h2><small>{due.filter(task => task.done).length}/{due.length} concluídas</small></header>
    <div className="today-receipt-lines">{loading ? <p>Preparando sua lista…</p> : due.length ? due.map((task, index) => <label key={task.id}><span>{String(index + 1).padStart(2, '0')}</span><input type="checkbox" checked={task.done} onChange={() => onToggle(task.id)} /><span className={task.done ? 'is-done' : ''}>{task.text}</span></label>) : <p className="today-receipt-empty">Seu dia ainda tem espaço para respirar. ✳</p>}</div>
    <footer><button type="button" onClick={() => navigate('/tasks')}>Ver todas as tarefas <ChevronRight size={14} /></button></footer></section>
}
