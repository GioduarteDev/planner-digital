export type Weather = { city: string; temperature: number; min: number; max: number; code: number }
type GeoResult = { results?: { name: string; latitude: number; longitude: number; admin1?: string }[] }
type Forecast = { current: { temperature_2m: number; weather_code: number }; daily: { temperature_2m_max: number[]; temperature_2m_min: number[] } }

async function getJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 9000)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error('O clima está indisponível agora.')
    return await response.json() as T
  } finally { window.clearTimeout(timeout) }
}

export async function weatherByCoordinates(latitude: number, longitude: number, city: string): Promise<Weather> {
  const params = new URLSearchParams({ latitude: String(latitude), longitude: String(longitude),
    current: 'temperature_2m,weather_code', daily: 'temperature_2m_max,temperature_2m_min', timezone: 'auto', forecast_days: '1' })
  const forecast = await getJson<Forecast>(`https://api.open-meteo.com/v1/forecast?${params}`)
  return { city, temperature: forecast.current.temperature_2m, code: forecast.current.weather_code,
    min: forecast.daily.temperature_2m_min[0], max: forecast.daily.temperature_2m_max[0] }
}

export async function weatherByCity(city: string): Promise<Weather> {
  const result = await getJson<GeoResult>(`https://geocoding-api.open-meteo.com/v1/search?${new URLSearchParams({ name: city, count: '1', language: 'pt' })}`)
  const found = result.results?.[0]
  if (!found) throw new Error('Cidade não encontrada. Tente incluir o estado.')
  return weatherByCoordinates(found.latitude, found.longitude, [found.name, found.admin1].filter(Boolean).join(', '))
}

export function weatherDescription(code: number) {
  if (code === 0) return 'Céu limpo'
  if (code <= 3) return 'Algumas nuvens'
  if (code <= 48) return 'Neblina'
  if (code <= 67) return 'Chuva leve'
  if (code <= 77) return 'Neve'
  if (code <= 82) return 'Pancadas de chuva'
  if (code <= 86) return 'Neve'
  return 'Tempestade'
}
