import {
  useEffect,
  useState,
} from 'react'

import {
  apiRequest,
} from '../../services/api'

import './StationeryPage.css'


type PresetType =
  | 'palette'
  | 'color'
  | 'text_style'
  | 'drawing_style'
  | 'paper_style'
  | 'component'


type Preset = {
  id: number
  user_id: number
  preset_type: PresetType
  name: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}


type StationeryKit = {
  id: number
  user_id: number
  name: string
  description: string
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}


const PRESET_LABELS:
  Record<PresetType, string> = {
    palette: 'Paleta',
    color: 'Cor',
    text_style: 'Texto',
    drawing_style: 'Desenho',
    paper_style: 'Papel',
    component: 'Componente',
  }


const DEFAULT_PALETTE = [
  '#f4cfd3',
  '#dceaf2',
  '#dcece3',
  '#e5dded',
  '#f3e8bd',
]


function getString(
  value: unknown,
  fallback = '',
) {
  return typeof value === 'string'
    ? value
    : fallback
}


function getNumber(
  value: unknown,
  fallback: number,
) {
  return typeof value === 'number'
    ? value
    : fallback
}


function getStringArray(
  value: unknown,
) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (
      item,
    ): item is string =>
      typeof item === 'string',
  )
}


function isPresetType(
  value: string,
): value is PresetType {
  return (
    value === 'palette'
    || value === 'color'
    || value === 'text_style'
    || value === 'drawing_style'
    || value === 'paper_style'
    || value === 'component'
  )
}


function StationeryPage() {
  const [
    presets,
    setPresets,
  ] =
    useState<Preset[]>([])


  const [
    kits,
    setKits,
  ] =
    useState<StationeryKit[]>([])


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true)


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    presetName,
    setPresetName,
  ] =
    useState('')


  const [
    presetType,
    setPresetType,
  ] =
    useState<PresetType>(
      'palette',
    )


  const [
    singleColor,
    setSingleColor,
  ] =
    useState(
      '#f4cfd3',
    )


  const [
    paletteColors,
    setPaletteColors,
  ] =
    useState<string[]>(
      DEFAULT_PALETTE,
    )


  const [
    fontFamily,
    setFontFamily,
  ] =
    useState(
      'Arial',
    )


  const [
    fontSize,
    setFontSize,
  ] =
    useState(16)


  const [
    fontWeight,
    setFontWeight,
  ] =
    useState(
      '400',
    )


  const [
    drawingColor,
    setDrawingColor,
  ] =
    useState(
      '#3f3934',
    )


  const [
    drawingWidth,
    setDrawingWidth,
  ] =
    useState(3)


  const [
    paperType,
    setPaperType,
  ] =
    useState(
      'grid',
    )


  const [
    paperColor,
    setPaperColor,
  ] =
    useState(
      '#fffdf8',
    )


  const [
    lineColor,
    setLineColor,
  ] =
    useState(
      '#ded6ce',
    )


  const [
    lineSpacing,
    setLineSpacing,
  ] =
    useState(24)


  const [
    componentLabel,
    setComponentLabel,
  ] =
    useState('')


  const [
    kitName,
    setKitName,
  ] =
    useState('')


  const [
    kitDescription,
    setKitDescription,
  ] =
    useState('')


  const [
    selectedPresetIds,
    setSelectedPresetIds,
  ] =
    useState<number[]>([])


  const [
    editingPresetId,
    setEditingPresetId,
  ] =
    useState<number | null>(
      null,
    )


  const [
    editingKitId,
    setEditingKitId,
  ] =
    useState<number | null>(
      null,
    )


  const [
    isSavingPreset,
    setIsSavingPreset,
  ] =
    useState(false)


  const [
    isSavingKit,
    setIsSavingKit,
  ] =
    useState(false)


  useEffect(() => {
    let cancelled =
      false


    async function loadData() {
      try {
        setError('')


        const [
          presetData,
          kitData,
        ] =
          await Promise.all([
            apiRequest<Preset[]>(
              '/presets',
            ),

            apiRequest<
              StationeryKit[]
            >(
              '/stationery-kits',
            ),
          ])


        if (cancelled) {
          return
        }


        setPresets(
          presetData,
        )

        setKits(
          kitData,
        )
      } catch (loadError) {
        if (cancelled) {
          return
        }


        console.error(
          loadError,
        )


        if (
          loadError
          instanceof Error
        ) {
          setError(
            loadError.message,
          )
        } else {
          setError(
            'Não foi possível carregar sua papelaria.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(
            false,
          )
        }
      }
    }


    void loadData()


    return () => {
      cancelled =
        true
    }
  }, [])


  function resetPresetForm() {
    setEditingPresetId(
      null,
    )

    setPresetName('')
    setPresetType('palette')
    setSingleColor('#f4cfd3')

    setPaletteColors(
      DEFAULT_PALETTE,
    )

    setFontFamily('Arial')
    setFontSize(16)
    setFontWeight('400')
    setDrawingColor('#3f3934')
    setDrawingWidth(3)
    setPaperType('grid')
    setPaperColor('#fffdf8')
    setLineColor('#ded6ce')
    setLineSpacing(24)
    setComponentLabel('')
  }


  function resetKitForm() {
    setEditingKitId(
      null,
    )

    setKitName('')
    setKitDescription('')

    setSelectedPresetIds(
      [],
    )
  }


  function buildPresetData():
    Record<string, unknown> {
    if (
      presetType
      === 'palette'
    ) {
      return {
        colors:
          paletteColors,
      }
    }


    if (
      presetType
      === 'color'
    ) {
      return {
        color:
          singleColor,
      }
    }


    if (
      presetType
      === 'text_style'
    ) {
      return {
        font_family:
          fontFamily,

        font_size:
          fontSize,

        font_weight:
          fontWeight,
      }
    }


    if (
      presetType
      === 'drawing_style'
    ) {
      return {
        color:
          drawingColor,

        width:
          drawingWidth,
      }
    }


    if (
      presetType
      === 'paper_style'
    ) {
      return {
        paper_type:
          paperType,

        background_color:
          paperColor,

        line_color:
          lineColor,

        spacing:
          lineSpacing,
      }
    }


    return {
      label:
        componentLabel,
    }
  }


  async function savePreset() {
    if (
      presetName
        .trim()
      === ''
    ) {
      alert(
        'Digite um nome para o preset.',
      )

      return
    }


    try {
      setIsSavingPreset(
        true,
      )


      const payload:
        Record<string, unknown> = {
          name:
            presetName.trim(),

          data:
            buildPresetData(),
        }


      if (
        editingPresetId
        === null
      ) {
        payload.preset_type =
          presetType
      }


      const body =
        JSON.stringify(
          payload,
        )


      if (
        editingPresetId
        === null
      ) {
        const created =
          await apiRequest<Preset>(
            '/presets',
            {
              method:
                'POST',

              body,
            },
          )


        setPresets(
          (
            current,
          ) => [
            created,
            ...current,
          ],
        )
      } else {
        const updated =
          await apiRequest<Preset>(
            `/presets/${editingPresetId}`,
            {
              method:
                'PATCH',

              body,
            },
          )


        setPresets(
          (
            current,
          ) =>
            current.map(
              (preset) =>
                preset.id
                === updated.id
                  ? updated
                  : preset,
            ),
        )
      }


      resetPresetForm()
    } catch (saveError) {
      console.error(
        saveError,
      )


      if (
        saveError
        instanceof Error
      ) {
        alert(
          saveError.message,
        )
      } else {
        alert(
          'Não foi possível salvar o preset.',
        )
      }
    } finally {
      setIsSavingPreset(
        false,
      )
    }
  }


  function editPreset(
    preset: Preset,
  ) {
    setEditingPresetId(
      preset.id,
    )

    setPresetName(
      preset.name,
    )

    setPresetType(
      preset.preset_type,
    )


    if (
      preset.preset_type
      === 'palette'
    ) {
      const colors =
        getStringArray(
          preset.data.colors,
        )

      setPaletteColors(
        colors.length > 0
          ? colors
          : DEFAULT_PALETTE,
      )
    }


    if (
      preset.preset_type
      === 'color'
    ) {
      setSingleColor(
        getString(
          preset.data.color,
          '#f4cfd3',
        ),
      )
    }


    if (
      preset.preset_type
      === 'text_style'
    ) {
      setFontFamily(
        getString(
          preset.data
            .font_family,
          'Arial',
        ),
      )

      setFontSize(
        getNumber(
          preset.data
            .font_size,
          16,
        ),
      )

      setFontWeight(
        getString(
          preset.data
            .font_weight,
          '400',
        ),
      )
    }


    if (
      preset.preset_type
      === 'drawing_style'
    ) {
      setDrawingColor(
        getString(
          preset.data.color,
          '#3f3934',
        ),
      )

      setDrawingWidth(
        getNumber(
          preset.data.width,
          3,
        ),
      )
    }


    if (
      preset.preset_type
      === 'paper_style'
    ) {
      setPaperType(
        getString(
          preset.data
            .paper_type,
          'grid',
        ),
      )

      setPaperColor(
        getString(
          preset.data
            .background_color,
          '#fffdf8',
        ),
      )

      setLineColor(
        getString(
          preset.data
            .line_color,
          '#ded6ce',
        ),
      )

      setLineSpacing(
        getNumber(
          preset.data.spacing,
          24,
        ),
      )
    }


    if (
      preset.preset_type
      === 'component'
    ) {
      setComponentLabel(
        getString(
          preset.data.label,
        ),
      )
    }


    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }


  async function deletePreset(
    presetId: number,
  ) {
    const confirmed =
      window.confirm(
        'Excluir este preset?',
      )


    if (!confirmed) {
      return
    }


    try {
      await apiRequest<void>(
        `/presets/${presetId}`,
        {
          method:
            'DELETE',
        },
      )


      setPresets(
        (
          current,
        ) =>
          current.filter(
            (preset) =>
              preset.id
              !== presetId,
          ),
      )


      setSelectedPresetIds(
        (
          current,
        ) =>
          current.filter(
            (id) =>
              id
              !== presetId,
          ),
      )


      if (
        editingPresetId
        === presetId
      ) {
        resetPresetForm()
      }
    } catch (deleteError) {
      console.error(
        deleteError,
      )


      if (
        deleteError
        instanceof Error
      ) {
        alert(
          deleteError.message,
        )
      }
    }
  }


  function togglePresetForKit(
    presetId: number,
  ) {
    setSelectedPresetIds(
      (
        current,
      ) =>
        current.includes(
          presetId,
        )
          ? current.filter(
              (id) =>
                id
                !== presetId,
            )
          : [
              ...current,
              presetId,
            ],
    )
  }


  async function saveKit() {
    if (
      kitName
        .trim()
      === ''
    ) {
      alert(
        'Digite um nome para o kit.',
      )

      return
    }


    try {
      setIsSavingKit(
        true,
      )


      const body =
        JSON.stringify({
          name:
            kitName.trim(),

          description:
            kitDescription
              .trim(),

          data: {
            preset_ids:
              selectedPresetIds,
          },
        })


      if (
        editingKitId
        === null
      ) {
        const created =
          await apiRequest<
            StationeryKit
          >(
            '/stationery-kits',
            {
              method:
                'POST',

              body,
            },
          )


        setKits(
          (
            current,
          ) => [
            created,
            ...current,
          ],
        )
      } else {
        const updated =
          await apiRequest<
            StationeryKit
          >(
            `/stationery-kits/${editingKitId}`,
            {
              method:
                'PATCH',

              body,
            },
          )


        setKits(
          (
            current,
          ) =>
            current.map(
              (kit) =>
                kit.id
                === updated.id
                  ? updated
                  : kit,
            ),
        )
      }


      resetKitForm()
    } catch (saveError) {
      console.error(
        saveError,
      )


      if (
        saveError
        instanceof Error
      ) {
        alert(
          saveError.message,
        )
      } else {
        alert(
          'Não foi possível salvar o kit.',
        )
      }
    } finally {
      setIsSavingKit(
        false,
      )
    }
  }


  function editKit(
    kit: StationeryKit,
  ) {
    setEditingKitId(
      kit.id,
    )

    setKitName(
      kit.name,
    )

    setKitDescription(
      kit.description,
    )


    const rawIds =
      kit.data
        .preset_ids


    const ids:
      number[] = []


    if (
      Array.isArray(
        rawIds,
      )
    ) {
      rawIds.forEach(
        (item) => {
          if (
            typeof item
            === 'number'
          ) {
            ids.push(
              item,
            )
          }
        },
      )
    }


    setSelectedPresetIds(
      ids,
    )
  }


  async function deleteKit(
    kitId: number,
  ) {
    const confirmed =
      window.confirm(
        'Excluir este kit de papelaria?',
      )


    if (!confirmed) {
      return
    }


    try {
      await apiRequest<void>(
        `/stationery-kits/${kitId}`,
        {
          method:
            'DELETE',
        },
      )


      setKits(
        (
          current,
        ) =>
          current.filter(
            (kit) =>
              kit.id
              !== kitId,
          ),
      )


      if (
        editingKitId
        === kitId
      ) {
        resetKitForm()
      }
    } catch (deleteError) {
      console.error(
        deleteError,
      )


      if (
        deleteError
        instanceof Error
      ) {
        alert(
          deleteError.message,
        )
      }
    }
  }


  function renderPresetPreview(
    preset: Preset,
  ) {
    if (
      preset.preset_type
      === 'palette'
    ) {
      const colors =
        getStringArray(
          preset.data.colors,
        )


      return (
        <div className="stationery-color-row">
          {colors.map(
            (
              color,
              index,
            ) => (
              <span
                key={
                  `${color}-${index}`
                }
                style={{
                  backgroundColor:
                    color,
                }}
              />
            ),
          )}
        </div>
      )
    }


    if (
      preset.preset_type
      === 'color'
    ) {
      return (
        <div className="stationery-color-row">
          <span
            style={{
              backgroundColor:
                getString(
                  preset.data
                    .color,
                  '#ffffff',
                ),
            }}
          />
        </div>
      )
    }


    if (
      preset.preset_type
      === 'text_style'
    ) {
      return (
        <p
          className="stationery-text-preview"
          style={{
            fontFamily:
              getString(
                preset.data
                  .font_family,
                'Arial',
              ),

            fontSize:
              `${getNumber(
                preset.data
                  .font_size,
                16,
              )}px`,

            fontWeight:
              getString(
                preset.data
                  .font_weight,
                '400',
              ),
          }}
        >
          Aa Planner
        </p>
      )
    }


    if (
      preset.preset_type
      === 'paper_style'
    ) {
      return (
        <div
          className="stationery-paper-preview"
          style={{
            backgroundColor:
              getString(
                preset.data
                  .background_color,
                '#fffdf8',
              ),
          }}
        />
      )
    }


    return (
      <small className="stationery-generic-preview">
        {
          PRESET_LABELS[
            preset.preset_type
          ]
        }
      </small>
    )
  }


  return (
    <main className="stationery-page">
      <section className="stationery-hero">
        <div>
          <span>
            Minha coleção
          </span>

          <h1>
            Papelaria
          </h1>

          <p>
            Crie suas próprias
            paletas, estilos,
            papéis e kits para
            deixar o planner com
            a sua cara.
          </p>
        </div>

        <div
          className="stationery-hero-stickers"
          aria-hidden="true"
        >
          <span>
            ✿
          </span>

          <span>
            ♡
          </span>

          <span>
            ✦
          </span>
        </div>
      </section>


      {error && (
        <div className="stationery-error">
          {error}
        </div>
      )}


      <section className="stationery-layout">
        <div className="stationery-editor">
          <div className="stationery-card">
            <div className="stationery-card-heading">
              <span>
                Preset
              </span>

              <h2>
                {editingPresetId
                  === null
                  ? 'Criar estilo'
                  : 'Editar estilo'}
              </h2>
            </div>


            <label>
              Nome

              <input
                type="text"
                maxLength={120}
                value={
                  presetName
                }
                placeholder="Ex.: Pastel de primavera"
                onChange={(
                  event,
                ) =>
                  setPresetName(
                    event
                      .target
                      .value,
                  )
                }
              />
            </label>


            <label>
              Tipo

              <select
                value={
                  presetType
                }
                disabled={
                  editingPresetId
                  !== null
                }
                onChange={(
                  event,
                ) => {
                  const value =
                    event.target.value

                  if (
                    isPresetType(
                      value,
                    )
                  ) {
                    setPresetType(
                      value,
                    )
                  }
                }}
              >
                <option value="palette">
                  Paleta
                </option>

                <option value="color">
                  Cor
                </option>

                <option value="text_style">
                  Estilo de texto
                </option>

                <option value="drawing_style">
                  Estilo de desenho
                </option>

                <option value="paper_style">
                  Papel
                </option>

                <option value="component">
                  Componente
                </option>
              </select>
            </label>


            {presetType
              === 'palette' && (
              <div className="stationery-palette-editor">
                <span>
                  Cores
                </span>

                <div className="stationery-color-pickers">
                  {paletteColors.map(
                    (
                      color,
                      index,
                    ) => (
                      <input
                        key={
                          index
                        }
                        type="color"
                        value={
                          color
                        }
                        aria-label={
                          `Cor ${index + 1}`
                        }
                        onChange={(
                          event,
                        ) => {
                          const next =
                            [
                              ...paletteColors,
                            ]

                          next[index] =
                            event
                              .target
                              .value

                          setPaletteColors(
                            next,
                          )
                        }}
                      />
                    ),
                  )}
                </div>
              </div>
            )}


            {presetType
              === 'color' && (
              <label>
                Cor

                <input
                  type="color"
                  value={
                    singleColor
                  }
                  onChange={(
                    event,
                  ) =>
                    setSingleColor(
                      event
                        .target
                        .value,
                    )
                  }
                />
              </label>
            )}


            {presetType
              === 'text_style' && (
              <>
                <label>
                  Fonte

                  <input
                    type="text"
                    value={
                      fontFamily
                    }
                    placeholder="Arial"
                    onChange={(
                      event,
                    ) =>
                      setFontFamily(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label>
                  Tamanho

                  <input
                    type="number"
                    min={8}
                    max={96}
                    value={
                      fontSize
                    }
                    onChange={(
                      event,
                    ) =>
                      setFontSize(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                  />
                </label>

                <label>
                  Peso

                  <select
                    value={
                      fontWeight
                    }
                    onChange={(
                      event,
                    ) =>
                      setFontWeight(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="400">
                      Normal
                    </option>

                    <option value="600">
                      Semibold
                    </option>

                    <option value="700">
                      Negrito
                    </option>
                  </select>
                </label>
              </>
            )}


            {presetType
              === 'drawing_style' && (
              <>
                <label>
                  Cor da caneta

                  <input
                    type="color"
                    value={
                      drawingColor
                    }
                    onChange={(
                      event,
                    ) =>
                      setDrawingColor(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label>
                  Espessura

                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={
                      drawingWidth
                    }
                    onChange={(
                      event,
                    ) =>
                      setDrawingWidth(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                  />

                  <small>
                    {
                      drawingWidth
                    } px
                  </small>
                </label>
              </>
            )}


            {presetType
              === 'paper_style' && (
              <>
                <label>
                  Tipo de papel

                  <select
                    value={
                      paperType
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaperType(
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="blank">
                      Branco
                    </option>

                    <option value="lined">
                      Pautado
                    </option>

                    <option value="grid">
                      Quadriculado
                    </option>

                    <option value="dotted">
                      Pontilhado
                    </option>
                  </select>
                </label>

                <label>
                  Fundo

                  <input
                    type="color"
                    value={
                      paperColor
                    }
                    onChange={(
                      event,
                    ) =>
                      setPaperColor(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label>
                  Linha

                  <input
                    type="color"
                    value={
                      lineColor
                    }
                    onChange={(
                      event,
                    ) =>
                      setLineColor(
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </label>

                <label>
                  Espaçamento

                  <input
                    type="number"
                    min={8}
                    max={80}
                    value={
                      lineSpacing
                    }
                    onChange={(
                      event,
                    ) =>
                      setLineSpacing(
                        Number(
                          event
                            .target
                            .value,
                        ),
                      )
                    }
                  />
                </label>
              </>
            )}


            {presetType
              === 'component' && (
              <label>
                Nome do componente

                <input
                  type="text"
                  value={
                    componentLabel
                  }
                  placeholder="Ex.: Post-it rosa"
                  onChange={(
                    event,
                  ) =>
                    setComponentLabel(
                      event
                        .target
                        .value,
                    )
                  }
                />
              </label>
            )}


            <div className="stationery-form-actions">
              <button
                type="button"
                className="stationery-primary-button"
                disabled={
                  isSavingPreset
                }
                onClick={() => {
                  void savePreset()
                }}
              >
                {isSavingPreset
                  ? 'Salvando...'
                  : editingPresetId
                      === null
                    ? 'Salvar preset'
                    : 'Salvar alterações'}
              </button>


              {editingPresetId
                !== null && (
                <button
                  type="button"
                  onClick={
                    resetPresetForm
                  }
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>


          <div className="stationery-card">
            <div className="stationery-card-heading">
              <span>
                Kit
              </span>

              <h2>
                {editingKitId
                  === null
                  ? 'Montar papelaria'
                  : 'Editar papelaria'}
              </h2>
            </div>


            <label>
              Nome

              <input
                type="text"
                maxLength={120}
                value={
                  kitName
                }
                placeholder="Ex.: Study pastel"
                onChange={(
                  event,
                ) =>
                  setKitName(
                    event
                      .target
                      .value,
                  )
                }
              />
            </label>


            <label>
              Descrição

              <textarea
                maxLength={2000}
                rows={3}
                value={
                  kitDescription
                }
                placeholder="Um kit leve para páginas de estudo..."
                onChange={(
                  event,
                ) =>
                  setKitDescription(
                    event
                      .target
                      .value,
                  )
                }
              />
            </label>


            <div className="stationery-kit-picker">
              <span>
                Presets do kit
              </span>


              {presets.length
                === 0 && (
                <small>
                  Crie um preset
                  primeiro.
                </small>
              )}


              {presets.map(
                (preset) => (
                  <label
                    key={
                      preset.id
                    }
                    className="stationery-kit-option"
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedPresetIds
                          .includes(
                            preset.id,
                          )
                      }
                      onChange={() =>
                        togglePresetForKit(
                          preset.id,
                        )
                      }
                    />

                    <span>
                      {
                        preset.name
                      }
                    </span>

                    <small>
                      {
                        PRESET_LABELS[
                          preset
                            .preset_type
                        ]
                      }
                    </small>
                  </label>
                ),
              )}
            </div>


            <div className="stationery-form-actions">
              <button
                type="button"
                className="stationery-primary-button"
                disabled={
                  isSavingKit
                }
                onClick={() => {
                  void saveKit()
                }}
              >
                {isSavingKit
                  ? 'Salvando...'
                  : editingKitId
                      === null
                    ? 'Criar kit'
                    : 'Salvar alterações'}
              </button>


              {editingKitId
                !== null && (
                <button
                  type="button"
                  onClick={
                    resetKitForm
                  }
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>


        <div className="stationery-library">
          <section>
            <div className="stationery-section-heading">
              <div>
                <span>
                  Coleção
                </span>

                <h2>
                  Meus presets
                </h2>
              </div>

              <strong>
                {
                  presets.length
                }
              </strong>
            </div>


            {isLoading && (
              <p>
                Carregando...
              </p>
            )}


            {!isLoading
              && presets.length
                === 0 && (
                <div className="stationery-empty">
                  Nenhum preset
                  criado ainda.
                </div>
              )}


            <div className="stationery-preset-grid">
              {presets.map(
                (preset) => (
                  <article
                    key={
                      preset.id
                    }
                    className="stationery-preset-card"
                  >
                    <div className="stationery-preset-top">
                      <span>
                        {
                          PRESET_LABELS[
                            preset
                              .preset_type
                          ]
                        }
                      </span>

                      {
                        renderPresetPreview(
                          preset,
                        )
                      }
                    </div>

                    <h3>
                      {
                        preset.name
                      }
                    </h3>

                    <div className="stationery-item-actions">
                      <button
                        type="button"
                        onClick={() =>
                          editPreset(
                            preset,
                          )
                        }
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void deletePreset(
                            preset.id,
                          )
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>


          <section>
            <div className="stationery-section-heading">
              <div>
                <span>
                  Conjuntos
                </span>

                <h2>
                  Kits de papelaria
                </h2>
              </div>

              <strong>
                {
                  kits.length
                }
              </strong>
            </div>


            {kits.length
              === 0 && (
              <div className="stationery-empty">
                Nenhum kit
                montado ainda.
              </div>
            )}


            <div className="stationery-kit-grid">
              {kits.map(
                (kit) => {
                  const rawIds =
                    kit.data
                      .preset_ids

                  let count =
                    0

                  if (
                    Array.isArray(
                      rawIds,
                    )
                  ) {
                    rawIds.forEach(
                      (item) => {
                        if (
                          typeof item
                          === 'number'
                        ) {
                          count +=
                            1
                        }
                      },
                    )
                  }


                  return (
                    <article
                      key={
                        kit.id
                      }
                      className="stationery-kit-card"
                    >
                      <div className="stationery-kit-cover">
                        <span>
                          ✿
                        </span>

                        <span>
                          ♡
                        </span>

                        <span>
                          ✦
                        </span>
                      </div>

                      <h3>
                        {
                          kit.name
                        }
                      </h3>

                      <p>
                        {
                          kit.description
                          || 'Seu kit personalizado.'
                        }
                      </p>

                      <small>
                        {
                          count
                        } presets
                      </small>

                      <div className="stationery-item-actions">
                        <button
                          type="button"
                          onClick={() =>
                            editKit(
                              kit,
                            )
                          }
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void deleteKit(
                              kit.id,
                            )
                          }}
                        >
                          Excluir
                        </button>
                      </div>
                    </article>
                  )
                },
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}


export default StationeryPage