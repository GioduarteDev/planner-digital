import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../../services/api'
import type { PlanningData } from './planningModel'

export default function usePlanningData() {
  const [data, setData] = useState<PlanningData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())
  const sequence = useRef(0)
  const cancel = useCallback(() => { sequence.current++ }, [])
  const reload = useCallback(() => {
    const request = ++sequence.current
    return Promise.all([
      apiRequest<PlanningData['tasks']>('/tasks'), apiRequest<PlanningData['events']>('/events'),
      apiRequest<PlanningData['projects']>('/projects'), apiRequest<PlanningData['subjects']>('/subjects'),
      apiRequest<PlanningData['studies']>('/studies'),
    ]).then(([tasks, events, projects, subjects, studies]) => {
      if (sequence.current !== request) return
      setData({ tasks, events, projects, subjects, studies }); setError(''); setNow(new Date())
    }).catch(err => { if (sequence.current === request) setError(err instanceof Error ? err.message : 'Não foi possível carregar os dados.') })
      .finally(() => { if (sequence.current === request) setLoading(false) })
  }, [])
  useEffect(() => {
    void reload()
    const refresh = () => { void reload() }
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    window.addEventListener('focus', refresh)
    return () => { cancel(); window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [reload, cancel])
  return { data, error, loading, now, reload }
}
