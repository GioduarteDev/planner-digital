import { apiRequest } from '../../services/api'

export type Profile = {
  name: string
  settings: Record<string, unknown>
}

export type Task = {
  completed_at: string | null
  due_at: string | null
  subject_id: number | null
  project_id: number | null
  category_id: number | null
  show_in_calendar: boolean
  id: number
  text: string
  done: boolean
  due_date: string | null
  page_id: number | null
}

export type Event = {
  id: number
  title: string
  starts_at: string
}

export type Study = {
  id: number
  subject: string
  study_date: string
  duration_minutes: number
}

export type Media = {
  id: number
  name: string
  file_url: string
  media_type: string
}

export type Moment = {
  mood: string
  music: string
  artist: string
  album: string
  reading: string
  watching: string
  watchingType: string
  note: string
  photoId: number | null
}

type DailyEntry = {
  mood: string
  quick_note: string
  music_data: Record<string, unknown>
  reading_data: Record<string, unknown>
  watching_data: Record<string, unknown>
  photo_media_id: number | null
}

export type Habit = {
  id: number
  user_id: number
  name: string
  description: string
  days_of_week: number[]
  time_of_day: string | null
  color: string
  active: boolean
  created_at: string
  updated_at: string | null
}

export type HabitCompletion = {
  id: number
  habit_id: number
  completion_date: string
  completed_at: string
}

export type HabitCreate = {
  name: string
  description?: string
  days_of_week: number[]
  time_of_day?: string | null
  color?: string
}

export const emptyMoment: Moment = {
  mood: '',
  music: '',
  artist: '',
  album: '',
  reading: '',
  watching: '',
  watchingType: 'série',
  note: '',
  photoId: null,
}

export const dateKey = (
  date: Date,
) =>
  `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

export const quotes = [
  {
    category: 'calma',
    text: 'Há beleza em fazer uma coisa de cada vez.',
  },
  {
    category: 'coragem',
    text: 'Começar pequeno também é começar.',
  },
  {
    category: 'descanso',
    text: 'Uma pausa pode ser parte do caminho.',
  },
  {
    category: 'criatividade',
    text: 'Guarde espaço para o inesperado florescer.',
  },
  {
    category: 'estudos',
    text: 'Aprender é voltar com curiosidade, um dia após o outro.',
  },
  {
    category: 'cuidado',
    text: 'Hoje, cuide de si com a mesma gentileza que oferece aos outros.',
  },
  {
    category: 'calma',
    text: 'Você não precisa correr para que o dia tenha valor.',
  },
  {
    category: 'coragem',
    text: 'Faça o próximo movimento, não o caminho inteiro.',
  },
  {
    category: 'esperança',
    text: 'Todo amanhecer traz alguma coisa que ainda não aconteceu.',
  },
  {
    category: 'estudos',
    text: 'Um pouco aprendido hoje ainda é conhecimento construído.',
  },
  {
    category: 'cuidado',
    text: 'Nem todo dia precisa ser produtivo para ser importante.',
  },
  {
    category: 'criatividade',
    text: 'Uma ideia pequena pode ser o começo de algo enorme.',
  },
  {
    category: 'calma',
    text: 'Respire antes de transformar tudo em urgência.',
  },
  {
    category: 'coragem',
    text: 'Você pode sentir medo e continuar mesmo assim.',
  },
  {
    category: 'descanso',
    text: 'Descansar também é cuidar do que você quer construir.',
  },
  {
    category: 'esperança',
    text: 'Ainda existem bons capítulos que você não viveu.',
  },
  {
    category: 'foco',
    text: 'Escolha uma coisa e dê a ela a sua presença.',
  },
  {
    category: 'estudos',
    text: 'Constância humilde vence muitos dias perfeitos que nunca chegam.',
  },
  {
    category: 'cuidado',
    text: 'Seu ritmo não precisa parecer com o de ninguém.',
  },
  {
    category: 'criatividade',
    text: 'Deixe alguma parte do dia ser só sua.',
  },
  {
    category: 'calma',
    text: 'O silêncio também pode organizar pensamentos.',
  },
  {
    category: 'coragem',
    text: 'Você já atravessou dias que pareciam impossíveis.',
  },
  {
    category: 'esperança',
    text: 'Nem tudo precisa estar resolvido para algo bom começar.',
  },
  {
    category: 'foco',
    text: 'Hoje basta cuidar bem do que está ao seu alcance.',
  },
  {
    category: 'estudos',
    text: 'Entender devagar ainda é entender.',
  },
  {
    category: 'cuidado',
    text: 'Seja paciente com a versão de você que ainda está aprendendo.',
  },
  {
    category: 'criatividade',
    text: 'Faça espaço para brincar com suas próprias ideias.',
  },
  {
    category: 'descanso',
    text: 'Um dia mais lento continua sendo um dia vivido.',
  },
  {
    category: 'calma',
    text: 'Nem toda resposta precisa aparecer hoje.',
  },
  {
    category: 'coragem',
    text: 'Tente antes de decidir que não consegue.',
  },
  {
    category: 'esperança',
    text: 'Há caminhos que só aparecem depois do primeiro passo.',
  },
  {
    category: 'foco',
    text: 'Menos coisas, feitas com presença.',
  },
  {
    category: 'estudos',
    text: 'Repetir faz parte de aprender, não é voltar para trás.',
  },
  {
    category: 'cuidado',
    text: 'Você também merece receber a delicadeza que oferece.',
  },
  {
    category: 'criatividade',
    text: 'Seu jeito de fazer as coisas também é parte da obra.',
  },
  {
    category: 'descanso',
    text: 'Pausas não apagam o progresso.',
  },
  {
    category: 'calma',
    text: 'Algumas coisas ficam mais claras quando você para de apertá-las.',
  },
  {
    category: 'coragem',
    text: 'Você não precisa ter certeza para começar.',
  },
  {
    category: 'esperança',
    text: 'Uma manhã comum ainda pode esconder uma surpresa bonita.',
  },
  {
    category: 'foco',
    text: 'Termine o pequeno antes de carregar o mundo.',
  },
  {
    category: 'estudos',
    text: 'Cada dúvida respondida abre espaço para uma nova descoberta.',
  },
  {
    category: 'cuidado',
    text: 'Faça caber você dentro da sua própria rotina.',
  },
  {
    category: 'criatividade',
    text: 'Nem tudo precisa ser útil para ser precioso.',
  },
  {
    category: 'descanso',
    text: 'Seu corpo também faz parte dos seus planos.',
  },
  {
    category: 'calma',
    text: 'Existe força em não transformar todo atraso em desastre.',
  },
  {
    category: 'coragem',
    text: 'O desconforto de começar passa mais rápido que o arrependimento de adiar.',
  },
  {
    category: 'esperança',
    text: 'Você ainda pode se surpreender com o rumo das coisas.',
  },
  {
    category: 'foco',
    text: 'Hoje, proteja sua atenção como algo precioso.',
  },
  {
    category: 'estudos',
    text: 'Aprender também é aceitar não saber por enquanto.',
  },
  {
    category: 'cuidado',
    text: 'Um pouco de gentileza muda o peso de um dia difícil.',
  },
  {
    category: 'criatividade',
    text: 'Crie primeiro. Julgue depois.',
  },
  {
    category: 'descanso',
    text: 'Você não precisa merecer uma pausa.',
  },
  {
    category: 'calma',
    text: 'Faça espaço entre uma preocupação e outra.',
  },
  {
    category: 'coragem',
    text: 'O primeiro rascunho não precisa provar nada.',
  },
  {
    category: 'esperança',
    text: 'Coisas bonitas também levam tempo.',
  },
  {
    category: 'foco',
    text: 'Uma tarefa concluída vale mais que dez começadas pela ansiedade.',
  },
  {
    category: 'estudos',
    text: 'Curiosidade é uma forma bonita de disciplina.',
  },
  {
    category: 'cuidado',
    text: 'Há dias em que sobreviver à lista já é suficiente.',
  },
  {
    category: 'criatividade',
    text: 'Seu repertório cresce toda vez que você observa o mundo com atenção.',
  },
  {
    category: 'descanso',
    text: 'Amanhã não precisa receber uma versão esgotada de você.',
  },
  {
    category: 'calma',
    text: 'Você pode deixar algumas coisas para depois sem perder quem você é.',
  },
  {
    category: 'coragem',
    text: 'Ser iniciante também é um lugar legítimo.',
  },
  {
    category: 'esperança',
    text: 'Alguma coisa boa pode começar num dia completamente comum.',
  },
  {
    category: 'foco',
    text: 'Dê ao presente menos ruído e mais espaço.',
  },
  {
    category: 'estudos',
    text: 'Pequenos períodos de atenção também constroem domínio.',
  },
  {
    category: 'cuidado',
    text: 'Você não precisa se tratar como uma máquina para avançar.',
  },
  {
    category: 'criatividade',
    text: 'Experimente antes de procurar a versão perfeita.',
  },
  {
    category: 'descanso',
    text: 'Há produtividade em recuperar energia.',
  },
  {
    category: 'calma',
    text: 'Hoje pode ser simples e ainda assim ser bonito.',
  },
  {
    category: 'coragem',
    text: 'Continue sem exigir de si uma confiança perfeita.',
  },
  {
    category: 'esperança',
    text: 'O que hoje parece lento ainda pode estar crescendo.',
  },
  {
    category: 'foco',
    text: 'Faça menos promessas e cuide melhor das escolhas.',
  },
]

export function quoteForDate(
  key: string,
) {
  let hash = 0

  for (
    const char of key
  ) {
    hash =
      (
        hash * 31 +
        char.charCodeAt(0)
      ) >>> 0
  }

  return quotes[
    hash %
      quotes.length
  ]
}

export function readMoment(
  settings: Record<
    string,
    unknown
  >,
  key: string,
): Moment {
  const history =
    settings.today_v2

  if (
    !history ||
    typeof history !==
      'object' ||
    Array.isArray(
      history,
    )
  ) {
    return {
      ...emptyMoment,
    }
  }

  const record =
    (
      history as Record<
        string,
        unknown
      >
    )[key]

  if (
    !record ||
    typeof record !==
      'object' ||
    Array.isArray(
      record,
    )
  ) {
    return {
      ...emptyMoment,
    }
  }

  return {
    ...emptyMoment,
    ...(record as Partial<Moment>),
  }
}

function momentFromEntry(
  entry: DailyEntry,
): Moment {
  return {
    mood:
      entry.mood,

    note:
      entry.quick_note,

    music:
      typeof entry
        .music_data
        .music ===
      'string'
        ? entry
            .music_data
            .music
        : '',

    artist:
      typeof entry
        .music_data
        .artist ===
      'string'
        ? entry
            .music_data
            .artist
        : '',

    album:
      typeof entry
        .music_data
        .album ===
      'string'
        ? entry
            .music_data
            .album
        : '',

    reading:
      typeof entry
        .reading_data
        .reading ===
      'string'
        ? entry
            .reading_data
            .reading
        : '',

    watching:
      typeof entry
        .watching_data
        .watching ===
      'string'
        ? entry
            .watching_data
            .watching
        : '',

    watchingType:
      typeof entry
        .watching_data
        .watchingType ===
      'string'
        ? entry
            .watching_data
            .watchingType
        : 'série',

    photoId:
      entry.photo_media_id,
  }
}

export async function loadMoment(
  settings: Record<
    string,
    unknown
  >,
  key: string,
) {
  try {
    const entries = await apiRequest<DailyEntry[]>(
      `/daily-entries?start=${key}&end=${key}`,
    )
    const entry = entries[0]

    return entry
      ? momentFromEntry(entry)
      : readMoment(settings, key)
  } catch {
    return readMoment(
      settings,
      key,
    )
  }
}

let pending:
  Promise<unknown> =
  Promise.resolve()

export function saveMoment(
  key: string,
  moment: Moment,
) {
  const operation =
    pending
      .catch(
        () =>
          undefined,
      )
      .then(
        async () => {
          await apiRequest(
            `/daily-entries/${key}`,
            {
              method:
                'PUT',

              body:
                JSON.stringify(
                  {
                    mood:
                      moment.mood,

                    quick_note:
                      moment.note,

                    music_data:
                      {
                        music:
                          moment.music,

                        artist:
                          moment.artist,

                        album:
                          moment.album,
                      },

                    reading_data:
                      {
                        reading:
                          moment.reading,
                      },

                    watching_data:
                      {
                        watching:
                          moment.watching,

                        watchingType:
                          moment.watchingType,
                      },

                    photo_media_id:
                      moment.photoId,
                  },
                ),
            },
          )
        },
      )

  pending =
    operation

  return operation
}

export async function loadHabitsForDate(
  key: string,
) {
  return apiRequest<
    Habit[]
  >(
    `/habits?active=true&on_date=${encodeURIComponent(
      key,
    )}`,
  )
}

export async function loadHabitCompletions(
  key: string,
) {
  return apiRequest<
    HabitCompletion[]
  >(
    `/habit-completions?completion_date=${encodeURIComponent(
      key,
    )}`,
  )
}

export async function createHabit(
  data: HabitCreate,
) {
  return apiRequest<Habit>(
    '/habits',
    {
      method: 'POST',

      body:
        JSON.stringify({
          name:
            data.name,

          description:
            data.description ??
            '',

          days_of_week:
            data.days_of_week,

          time_of_day:
            data.time_of_day ??
            null,

          color:
            data.color ??
            '#9CA362',
        }),
    },
  )
}

export async function updateHabit(
  habitId: number,
  data:
    Partial<HabitCreate> & {
      active?: boolean
    },
) {
  return apiRequest<Habit>(
    `/habits/${habitId}`,
    {
      method:
        'PATCH',

      body:
        JSON.stringify(
          data,
        ),
    },
  )
}

export async function deleteHabit(
  habitId: number,
) {
  return apiRequest<void>(
    `/habits/${habitId}`,
    {
      method:
        'DELETE',
    },
  )
}

export async function completeHabit(
  habitId: number,
  key: string,
) {
  return apiRequest<
    HabitCompletion
  >(
    `/habits/${habitId}/completions/${key}`,
    {
      method:
        'PUT',
    },
  )
}

export async function uncompleteHabit(
  habitId: number,
  key: string,
) {
  return apiRequest<void>(
    `/habits/${habitId}/completions/${key}`,
    {
      method:
        'DELETE',
    },
  )
}