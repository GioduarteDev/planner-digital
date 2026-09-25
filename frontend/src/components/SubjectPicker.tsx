import { useEffect, useState } from 'react'
import { apiRequest } from '../services/api'

export default function SubjectPicker({ value, onChange }: {
  value: number | null
  onChange: (id: number | null, name: string) => void
}) {
  const [subjects, setSubjects] = useState<{ id: number; name: string }[]>([])
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    apiRequest<{ id: number; name: string }[]>('/subjects')
      .then(data => { if (active) setSubjects(data) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])
  return <label>Matéria vinculada
    <select value={value ?? ''} disabled={error} onChange={e => {
      const id = e.target.value ? Number(e.target.value) : null
      onChange(id, subjects.find(s => s.id === id)?.name ?? '')
    }}>
      <option value="">Sem matéria vinculada</option>
      {value !== null && !subjects.some(s => s.id === value) && <option value={value}>Matéria atual</option>}
      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    {error && <small role="alert">Não foi possível carregar as matérias. O vínculo atual será mantido.</small>}
  </label>
}
