import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { exportEventosLluviasPdf } from './utils/pdfReport'

const API_ENV = import.meta.env.VITE_API_ENV || 'local'
const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL || 'http://localhost:5000'
const API_PROD_URL = import.meta.env.VITE_API_PROD_URL || ''
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || ''
const DEBUG = import.meta.env.DEBUG === 'true' || false
const activacion = false

const API_BASE_URL = API_ENV === 'prod' ? API_PROD_URL : API_LOCAL_URL

const ENDPOINTS = {
  lluvias: '/api/public/eventos-por-lluvias',
  noLluvias: '/api/public/eventos-no-por-lluvias',
  incendios: '/api/public/eventos-por-incendios-forestales',
  tipoLluvias: '/api/public/eventos-por-tipo-lluvias',
  lluviasTotalPorDpa: '/api/public/eventos-por-lluvias-total-por-dpa',
  asistenciaHumanitariaLluvias: '/api/public/asistencia-humanitaria-por-sndgird-por-lluvias',
  alojamientosTemporalesLluvias: '/api/public/alojamientos-temporales-abiertos-por-lluvias',
  alojamientosTemporalesCerradosLluvias: '/api/public/alojamientos-temporales-cerrados-por-lluvias'
}

const TIPO_LABELS = {
  lluvias: 'lluvias',
  noLluvias: 'eventos no por lluvias',
  incendios: 'incendios forestales',
}

const DETAIL_COLS = [
  ['__no__', 'No.'],
  ['Provincia', 'Provincia'],
  ['NumeroEventos', 'Nro. Eventos'],
  ['ImpactadasPersonas', 'Personas Impactadas'],
  ['Extraviados', 'Personas Extraviadas'],
  ['Fallecidos', 'Personas Fallecidas'],
  ['Heridos', 'Personas Heridas'],
  ['AfectadosPersonas', 'Personas Afectadas'],
  ['DamnificadosPersonas', 'Personas Damnificadas'],
  ['AfectadosFamilias', 'Familias Afectadas'],
  ['DamnificadosFamilias', 'Familias Damnificadas'],
  ['AfectadosViviendas', 'Viviendas Afectadas'],
  ['DestruidosViviendas', 'Viviendas Destruidas'],
  ['AfectadosPuentes', 'Puentes Afectados'],
  ['DestruidosPuentes', 'Puentes Destruidos'],
  ['AfectadosPrivados', 'Bienes Privados Afectados'],
  ['DestruidosPrivados', 'Bienes Privados Destruidos'],
  ['AfectadosPublicos', 'Bienes Publicos Afectados'],
  ['DestruidosPublicos', 'Bienes Publicos Destruidos'],
  ['AfectadosEducativos', 'Centros Educativos Afectados'],
  ['DestruidosEducativos', 'Centros Educativos Destruidos'],
  ['FuncionalEducativos', 'Centros Educativos Funcionales'],
  ['AfectadosSalud', 'Centros Salud Afectados'],
  ['DestruidosSalud', 'Centros Salud Destruidos'],
  ['Evacuados', 'Evacuados'],
  ['AfectadosKilometros', 'Km Vias Afectadas'],
  ['AfectadosMetros', 'Metros Vias Afectadas'],
  ['AfectadosHectareas', 'Hectareas Afectadas'],
  ['PerdidosHectareas', 'Hectareas Perdidas'],
  ['QuemadasHectareas', 'Hectareas Quemadas'],
  ['AfectadosAnimales', 'Animales Afectados'],
  ['MuertosAnimales', 'Animales Muertos'],
]

const TIPO_LLUVIAS_COLS = [
  ['Provincia', 'Provincia'],
  ['NumeroEventos', 'Nro. Eventos'],
  ['Inundacion', 'Inundacion'],
  ['Deslizamiento', 'Deslizamiento'],
  ['Lluvias_Intensas', 'Lluvias Intensas'],
  ['Erosion_Hidrica', 'Erosion Hidrica'],
  ['Hundimiento', 'Hundimiento'],
  ['Aluvion', 'Aluvion'],
  ['Vendaval', 'Vendaval'],
  ['Caidas_Colapso', 'Caidas Colapso'],
  ['Tormenta_Electrica', 'Tormenta Electrica'],
  ['Granizada', 'Granizada'],
  ['Reptacion', 'Reptacion'],
  ['Avalancha', 'Avalancha'],
  ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso Humedad'],
  ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso Infraestructura'],
]

const EVENT_TYPES = [
  ['Inundacion', 'inundaciones'],
  ['Deslizamiento', 'deslizamientos'],
  ['Lluvias_Intensas', 'lluvias intensas'],
  ['Erosion_Hidrica', 'erosion hidrica'],
  ['Hundimiento', 'hundimientos'],
  ['Aluvion', 'aluviones'],
  ['Vendaval', 'vendavales'],
  ['Caidas_Colapso', 'caidas (colapsos)'],
  ['Tormenta_Electrica', 'tormentas electricas'],
  ['Granizada', 'granizadas'],
]

function n(v) {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}

function sortByNumeroEventosDesc(rows) {
  return [...rows].sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
}

function withTotalsRow(columns, rows) {
  const totalRow = { __isTotal__: true }

  columns.forEach(([key]) => {
    if (key === '__no__') {
      totalRow[key] = ''
      return
    }

    if (key === 'Provincia') {
      totalRow[key] = 'Total General'
      return
    }

    const values = rows
      .map((row) => row?.[key])
      .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')

    const isNumeric = values.length > 0 && values.every((v) => Number.isFinite(Number(String(v).replace(',', '.'))))
    if (!isNumeric) {
      totalRow[key] = ''
      return
    }

    const total = rows.reduce((acc, row) => acc + n(row?.[key]), 0)
    totalRow[key] = key === 'AfectadosKilometros' ? Number(total.toFixed(2)) : total
  })

  return [...rows, totalRow]
}

function formatInt(v) {
  return Math.round(v).toLocaleString('es-EC')
}

function formatPct(v) {
  return Number(v).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function prettifyLabel(key) {
  return String(key || '')
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function getTopNumericColumns(items, limit = 8, excludeKeys = []) {
  if (!items.length) return []

  const excluded = new Set(excludeKeys)
  const sums = new Map()

  items.forEach((row) => {
    Object.entries(row || {}).forEach(([key, value]) => {
      if (excluded.has(key)) return
      const valueNum = n(value)
      if (!Number.isFinite(valueNum)) return
      sums.set(key, (sums.get(key) || 0) + valueNum)
    })
  })

  return [...sums.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, total]) => ({ key, label: prettifyLabel(key), total }))
}

function buildDynamicCols(items, priority = ['Provincia', 'NumeroEventos', 'ProvinciaID']) {
  const first = items[0] || {}
  const keys = Object.keys(first)
  const ordered = [
    ...priority.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !priority.includes(key)),
  ]

  return [
    ['__no__', 'No.'],
    ...ordered.map((key) => [key, prettifyLabel(key)]),
  ]
}

function buildPuntosImportantes(items, analysisRows, tipo, dpaTotals = null) {
  const totalEventosAnalysis = analysisRows.reduce((acc, row) => acc + n(row.NumeroEventos), 0)
  const totalEventosItems = items.reduce((acc, row) => acc + n(row.NumeroEventos), 0)
  const totalEventos = totalEventosAnalysis > 0 ? totalEventosAnalysis : totalEventosItems
  const provincias = Number.isFinite(Number(dpaTotals?.TotalProvincias))
    ? Number(dpaTotals.TotalProvincias)
    : new Set(items.map((row) => String(row.Provincia || '').trim()).filter(Boolean)).size
  const cantones = Number.isFinite(Number(dpaTotals?.TotalCantones))
    ? Number(dpaTotals.TotalCantones)
    : new Set(items.map((row) => String(row.Canton || row.CantonNombre || '').trim()).filter(Boolean)).size
  const parroquias = Number.isFinite(Number(dpaTotals?.TotalParroquias))
    ? Number(dpaTotals.TotalParroquias)
    : new Set(items.map((row) => String(row.Parroquia || row.ParroquiaNombre || '').trim()).filter(Boolean)).size

  let rankedTypes = []

  if (tipo === 'lluvias') {
    rankedTypes = EVENT_TYPES
      .map(([key, label]) => {
        const total = analysisRows.reduce((acc, row) => acc + n(row[key]), 0)
        const pct = totalEventos > 0 ? (total / totalEventos) * 100 : 0
        return { label, total, pct }
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  } else {
    rankedTypes = getTopNumericColumns(analysisRows, 8, ['NumeroEventos', 'ProvinciaID'])
      .map((x) => ({
        label: x.label,
        total: x.total,
        pct: totalEventos > 0 ? (x.total / totalEventos) * 100 : 0,
      }))
  }

  const typesText = rankedTypes.length
    ? rankedTypes.map((x) => `${x.label} (${formatPct(x.pct)}%)`).join(', ')
    : 'sin datos suficientes'

  const byProvincia = new Map()
  items.forEach((row) => {
    const provincia = String(row.Provincia || '').trim()
    if (!provincia) return
    const base = n(row.ImpactadasPersonas) || n(row.NumeroEventos)
    byProvincia.set(provincia, (byProvincia.get(provincia) || 0) + base)
  })

  const topProvincias = [...byProvincia.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([provincia]) => provincia)

  return {
    line1: `Desde el 1 de enero de 2026 hasta la presente fecha se han registrado ${formatInt(totalEventos)} eventos por ${TIPO_LABELS[tipo] || 'evento'} afectando a ${formatInt(provincias)} provincias, ${formatInt(cantones)} cantones y ${formatInt(parroquias)} parroquias. Los eventos mas recurrentes corresponden a: ${typesText} entre los principales.`,
    line2: topProvincias.length
      ? `En lo que va del anio 2026, las provincias con mayor impacto a la poblacion son: ${topProvincias.join(', ')}.`
      : 'En lo que va del anio 2026, no hay datos suficientes para identificar provincias con mayor impacto a la poblacion.',
  }
}

function buildSection4(columns, rows) {
  const cards = columns
    .filter(([key]) => key !== '__no__')
    .map(([key, label]) => {
      const values = rows
        .map((row) => row?.[key])
        .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')

      const isNumeric = values.length > 0 && values.every((v) => Number.isFinite(Number(String(v).replace(',', '.'))))
      if (!isNumeric) return null

      const total = rows.reduce((acc, row) => acc + n(row?.[key]), 0)
      const roundedTotal = key === 'AfectadosKilometros' ? Number(total.toFixed(2)) : total
      return { key, label, value: roundedTotal }
    })
    .filter(Boolean)

  const nonZero = cards.filter((x) => x.value > 0).sort((a, b) => b.value - a.value)
  const normalizedCards = cards.length ? cards : [{ key: 'sin_datos', label: 'Sin datos', value: 0 }]

  const lead = nonZero[0]
  const second = nonZero[1]
  const paragraph = lead && second
    ? `Por los eventos detallados en la tabla, se han registrado las siguitentes afectaciones:`
    : lead
      ? `El principal impacto reportado es ${lead.label.toLowerCase()} (${formatInt(lead.value)}).`
      : 'No hay datos suficientes para generar el resumen de afectaciones.'

  return { cards: normalizedCards, paragraph }
}

function buildDetalleAnalisis(rows) {
  const byProvincia = new Map()
  rows.forEach((row) => {
    const provincia = String(row.Provincia || '').trim()
    if (!provincia) return
    const current = byProvincia.get(provincia) || { eventos: 0, impactadas: 0 }
    current.eventos += n(row.NumeroEventos)
    current.impactadas += n(row.ImpactadasPersonas)
    byProvincia.set(provincia, current)
  })

  const ranking = [...byProvincia.entries()]
    .map(([provincia, agg]) => ({ provincia, ...agg }))
    .sort((a, b) => b.impactadas - a.impactadas || b.eventos - a.eventos)
    .slice(0, 8)

  if (!ranking.length) {
    return 'No hay datos suficientes para generar el analisis del detalle de afectaciones por provincia.'
  }

  const first = ranking[0]
  const rest = ranking.slice(1)
  const restText = rest.length ? `; seguido de ${rest.map((x) => `${x.provincia} (${formatInt(x.impactadas)} impactadas en ${formatInt(x.eventos)} eventos)`).join('; ')}.` : '.'
  return `La provincia con mayor impacto es ${first.provincia} (${formatInt(first.impactadas)} personas impactadas en ${formatInt(first.eventos)} eventos)${restText}`
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function downloadExcelXml(filename, sheetName, columns, rows) {
  const headerCells = columns
    .map(([, label]) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(label)}</Data></Cell>`)
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map(([key]) => {
          const raw = row[key]
          const asNum = Number(String(raw ?? '').replace(',', '.'))
          const isNumber = Number.isFinite(asNum) && String(raw ?? '').trim() !== ''
          const type = isNumber ? 'Number' : 'String'
          const value = isNumber ? String(asNum) : escapeXml(raw ?? '')
          const style = isNumber ? 'sNumber' : 'sCell'
          return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${value}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="sHeader">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0A2A6E" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="sCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="sNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function formatCardValue(key, value) {
  if (key === 'AfectadosKilometros') {
    return Number(value || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return formatInt(value)
}

function formatDateYmd(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw

  const y = parsed.getUTCFullYear()
  const m = String(parsed.getUTCMonth() + 1).padStart(2, '0')
  const d = String(parsed.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatTableCellValue(key, value) {
  if (key === 'Apertura' || key === 'Cierre') return formatDateYmd(value)
  return value
}

function App() {
  const [tipo, setTipo] = useState('lluvias')
  const [provinciaId, setProvinciaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [responseData, setResponseData] = useState(null)
  const [tipoLluviasItems, setTipoLluviasItems] = useState([])
  const [asistenciaItems, setAsistenciaItems] = useState([])
  const [dpaTotals, setDpaTotals] = useState(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [alojamientosItems, setAlojamientosItems] = useState([])
  const [alojamientosCerradosItems, setAlojamientosCerradosItems] = useState([])

  const buildApiUrl = (endpointPath, provinciaValue = '') => {
    const base = `${API_BASE_URL}${endpointPath}`
    const params = new URLSearchParams()
    if (PUBLIC_API_KEY) params.set('api_key', PUBLIC_API_KEY)
    const trimmedProvincia = provinciaValue.trim()
    if (trimmedProvincia) params.set('ProvinciaID', trimmedProvincia)
    const query = params.toString()
    return query ? `${base}?${query}` : base
  }
  const requestUrl = useMemo(() => buildApiUrl(ENDPOINTS[tipo], provinciaId), [tipo, provinciaId])

  const items = responseData?.items ?? []
  const analysisRows = tipo === 'lluvias' ? tipoLluviasItems : items
  const currentDetailCols = useMemo(() => (tipo === 'lluvias' ? DETAIL_COLS : buildDynamicCols(items)), [tipo, items])
  const detailRows = useMemo(() => {
    const ordered = sortByNumeroEventosDesc(items)
    return ordered.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [items])
  const tipoLluviasRowsOrdered = useMemo(() => sortByNumeroEventosDesc(tipoLluviasItems), [tipoLluviasItems])
  const section3Cols = useMemo(() => (tipo === 'lluvias' ? TIPO_LLUVIAS_COLS : currentDetailCols), [tipo, currentDetailCols])
  const section3BaseRows = useMemo(() => (tipo === 'lluvias' ? tipoLluviasRowsOrdered : detailRows), [tipo, tipoLluviasRowsOrdered, detailRows])
  const section3RowsWithTotals = useMemo(() => withTotalsRow(section3Cols, section3BaseRows), [section3Cols, section3BaseRows])
  const totalEventosAdversos = useMemo(
    () => {
      const fromSection3 = section3BaseRows.reduce((acc, row) => acc + n(row?.NumeroEventos), 0)
      if (fromSection3 > 0) return fromSection3
      return items.reduce((acc, row) => acc + n(row?.NumeroEventos), 0)
    },
    [section3BaseRows, items]
  )
  const section5RowsWithTotals = useMemo(() => withTotalsRow(currentDetailCols, detailRows), [currentDetailCols, detailRows])
  const puntosImportantes = useMemo(
    () => buildPuntosImportantes(items, analysisRows, tipo, dpaTotals),
    [items, analysisRows, tipo, dpaTotals]
  )
  const section4 = useMemo(() => buildSection4(currentDetailCols, detailRows), [currentDetailCols, detailRows])
  const detalleAnalisis = useMemo(() => buildDetalleAnalisis(detailRows), [detailRows])
  const section6Cols = useMemo(
    () =>
      buildDynamicCols(asistenciaItems, [
        'Provincias',
        'Provincia',
        'Familias Beneficiadas',
        'Personas Beneficiadas',
        'Total Bienes',
        'ProvinciaID',
      ]),
    [asistenciaItems]
  )
  const section6Rows = useMemo(() => {
    const sorted = [...asistenciaItems].sort((a, b) => n(b?.['Total Bienes']) - n(a?.['Total Bienes']))
    return sorted.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [asistenciaItems])
  const section6ColsFiltered = useMemo(
    () =>
      section6Cols.filter(([key]) => {
        if (key === '__no__' || key === 'Provincia' || key === 'Provincias') return true

        const values = section6Rows
          .map((row) => row?.[key])
          .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
        const isNumeric = values.length > 0 && values.every((v) => Number.isFinite(Number(String(v).replace(',', '.'))))
        if (!isNumeric) return true

        const total = section6Rows.reduce((acc, row) => acc + n(row?.[key]), 0)
        return total !== 0
      }),
    [section6Cols, section6Rows]
  )
  const section6RowsWithTotals = useMemo(() => withTotalsRow(section6ColsFiltered, section6Rows), [section6ColsFiltered, section6Rows])
  const section6TotalGeneral = useMemo(
    () => section6Rows.reduce((acc, row) => acc + n(row?.['Total Bienes']), 0),
    [section6Rows]
  )
  const shouldShowSection6 = useMemo(() => section6Rows.length > 0 && section6TotalGeneral > 0, [section6Rows.length, section6TotalGeneral])
  const section5Rows = useMemo(() => {
    return alojamientosItems.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [alojamientosItems])
  const section5OrderedCols = useMemo(
    () =>
      buildDynamicCols(alojamientosItems, [
        'Provincia',
        'Canton',
        'Parroquia',
        'Tipo',
        'Nombre',
        'Apertura',
        'Familias',
        'Personas',
      ]),
    [alojamientosItems]
  )
  const section5AlojRowsWithTotals = useMemo(() => withTotalsRow(section5OrderedCols, section5Rows), [section5OrderedCols, section5Rows])
  const shouldShowSection5 = useMemo(() => section5Rows.length > 0, [section5Rows.length])


  const section5RowsCerrados = useMemo(() => {
    return alojamientosCerradosItems.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [alojamientosCerradosItems])


  const section5OrderedColsCerrados = useMemo(
    () =>
      buildDynamicCols(alojamientosCerradosItems, [
        'Provincia',
        'Canton',
        'Parroquia',
        'Tipo',
        'Nombre',        
        'Apertura',
        'Cierre',
      ]),
    [alojamientosCerradosItems]
  )

  const section5AlojamientosCerradosRows = useMemo(() => withTotalsRow(section5OrderedColsCerrados, section5RowsCerrados), [section5OrderedColsCerrados, section5RowsCerrados])
  const alojamientosAnalisis = useMemo(() => {
    const anioActual = new Date().getFullYear()
    const totalAbiertos = alojamientosItems.length
    const totalCerrados = alojamientosCerradosItems.length
    const totalActivados = totalAbiertos + totalCerrados
    return `En lo que va del ${anioActual} por lluvias se han activado ${formatInt(totalActivados)}, de los cuales ${formatInt(totalAbiertos)} se encuentra abiertos y ${formatInt(totalCerrados)} se encuentran cerrados.`
  }, [alojamientosItems, alojamientosCerradosItems])

  useEffect(() => {
    setResponseData(null)
    setTipoLluviasItems([])
    setAsistenciaItems([])
    setDpaTotals(null)
    setError('')
    setShowRawJson(false)
  }, [tipo])

  const onConsultar = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!PUBLIC_API_KEY) throw new Error('Falta VITE_PUBLIC_API_KEY en el frontend.')

      if (tipo === 'lluvias') {
        const trimmedProvincia = provinciaId.trim()
        const tipoLluviasUrl = buildApiUrl(ENDPOINTS.tipoLluvias, trimmedProvincia)
        const dpaTotalsUrl = buildApiUrl(ENDPOINTS.lluviasTotalPorDpa, trimmedProvincia)
        const asistenciaUrl = buildApiUrl(ENDPOINTS.asistenciaHumanitariaLluvias, trimmedProvincia)
        const alojamientosUrl = buildApiUrl(ENDPOINTS.alojamientosTemporalesLluvias, trimmedProvincia)
        const alojamientosCerradosUrl = buildApiUrl(ENDPOINTS.alojamientosTemporalesCerradosLluvias, trimmedProvincia)

        const [responseMain, responseTipos, responseDpa, responseAsistencia, responseAlojamientos, responseAlojamientosCerrados] = await Promise.all([
          fetch(requestUrl),
          fetch(tipoLluviasUrl),
          fetch(dpaTotalsUrl),
          fetch(asistenciaUrl),
          fetch(alojamientosUrl),
          fetch(alojamientosCerradosUrl),

        ])
        const [dataMain, dataTipos, dataDpa, dataAsistencia, dataAlojamientos, dataAlojamientosCerrados] = await Promise.all([
          responseMain.json(),
          responseTipos.json(),
          responseDpa.json(),
          responseAsistencia.json(),
          responseAlojamientos.json(),
          responseAlojamientosCerrados.json(),
        ])

        if (!responseMain.ok) throw new Error(dataMain?.error || 'Error consultando API')
        if (!responseTipos.ok) throw new Error(dataTipos?.error || 'Error consultando eventos por tipo de lluvias')
        if (!responseDpa.ok) throw new Error(dataDpa?.error || 'Error consultando totales DPA')
        if (!responseAsistencia.ok) throw new Error(dataAsistencia?.error || 'Error consultando asistencia humanitaria')
        if (!responseAlojamientos.ok) throw new Error(dataAlojamientos?.error || 'Error consultando alojamientos temporales')
        if (!responseAlojamientosCerrados.ok) throw new Error(dataAlojamientosCerrados?.error || 'Error consultando alojamientos temporales cerrados')

        setResponseData(dataMain)
        setTipoLluviasItems(dataTipos?.items || [])
        setAsistenciaItems(dataAsistencia?.items || [])
        setDpaTotals((dataDpa?.items || [])[0] || null)
        setAlojamientosItems(dataAlojamientos?.items || [])
        setAlojamientosCerradosItems(dataAlojamientosCerrados?.items || []) // Limpiar alojamientos cerrados al consultar eventos por lluvias
      } else {
        const response = await fetch(requestUrl)
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Error consultando API')
        setResponseData(data)
        setTipoLluviasItems([])
        setAsistenciaItems([])
        setDpaTotals(null)
        setAlojamientosItems([])
        setAlojamientosCerradosItems([])
      }
    } catch (err) {
      setResponseData(null)
      setTipoLluviasItems([])
      setAsistenciaItems([])
      setDpaTotals(null)
      setAlojamientosItems([])
      setAlojamientosCerradosItems([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDescargarPrincipal = async () => {
    if (!items.length) {
      setError('Primero consulta datos para generar la descarga.')
      return
    }

    if (tipo !== 'lluvias') {
      downloadExcelXml(`detalle_${tipo}.xml`, 'DetalleConsulta', currentDetailCols, section5RowsWithTotals)
      return
    }

    setLoading(true)
    setError('')
    try {
      if (!PUBLIC_API_KEY) throw new Error('Falta VITE_PUBLIC_API_KEY en el frontend.')
      const trimmedProvincia = provinciaId.trim()
      const tipoLluviasUrl = buildApiUrl(ENDPOINTS.tipoLluvias, trimmedProvincia)
      const dpaTotalsUrl = buildApiUrl(ENDPOINTS.lluviasTotalPorDpa, trimmedProvincia)
      const asistenciaUrl = buildApiUrl(ENDPOINTS.asistenciaHumanitariaLluvias, trimmedProvincia)

      const [responseTipos, responseDpa, responseAsistencia] = await Promise.all([
        fetch(tipoLluviasUrl),
        fetch(dpaTotalsUrl),
        fetch(asistenciaUrl),
      ])
      const [dataTipos, dataDpa, dataAsistencia] = await Promise.all([
        responseTipos.json(),
        responseDpa.json(),
        responseAsistencia.json(),
      ])
      if (!responseTipos.ok) throw new Error(dataTipos?.error || 'Error consultando eventos por tipo de lluvias')
      if (!responseDpa.ok) throw new Error(dataDpa?.error || 'Error consultando totales DPA')
      if (!responseAsistencia.ok) throw new Error(dataAsistencia?.error || 'Error consultando asistencia humanitaria')

      exportEventosLluviasPdf({
        items,
        tipoLluviasItems: dataTipos?.items || [],
        asistenciaItems: dataAsistencia?.items || [],
        dpaTotals: (dataDpa?.items || [])[0] || null,
        provinciaId: provinciaId.trim() || null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Consulta de Eventos SITREP</h1>
        <p className="muted">Ambiente actual: <strong>{API_ENV}</strong></p>
        <p className="muted">API Base URL: <code>{API_BASE_URL || 'No configurada'}</code></p>

        <form onSubmit={onConsultar} className="form-grid">
          <label>
            Tipo de evento
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="lluvias">Eventos por lluvias</option>
              <option value="noLluvias">Eventos no por lluvias</option>
              <option value="incendios">Eventos por incendios forestales</option>
            </select>
          </label>

          <label>
            ProvinciaID (opcional)
            <input type="number" min="1" placeholder="Ej: 1" value={provinciaId} onChange={(e) => setProvinciaId(e.target.value)} />
          </label>

          <button type="submit" disabled={loading || !API_BASE_URL}>{loading ? 'Consultando...' : 'Consultar'}</button>
          <button type="button" onClick={onDescargarPrincipal} disabled>
            {'Descargar PDF'}
          </button>
          <button type="button" onClick={() => setShowRawJson((v) => !v)} disabled>
            {showRawJson ? 'Ocultar JSON' : 'Ver JSON'}
          </button>
        </form>

        {DEBUG && <p className="request-url">GET {requestUrl}</p>}
        {error && <p className="error">{error}</p>}

        {items.length > 0 && (
          <section className="preview">
            <h2>Vista Previa SITREP</h2>

            <div className="block-title">1. Puntos importantes</div>
            <ul className="important-list">
              <li>{puntosImportantes.line1}</li>
              <li>{puntosImportantes.line2}</li>
            </ul>

            <div className="block-title">3. Eventos Adversos y Afectaciones por Provincia</div>
            {tipo === 'lluvias' ? (
              <>
                <button
                  type="button"
                  onClick={() => downloadExcelXml('eventos_adversos_resumen.xml', 'EventosAdversos', section3Cols, section3RowsWithTotals)}
                  disabled={!section3BaseRows.length}
                >
                  Descargar Excel - Seccion 3
                </button>
                <div className="table-wrap">
                  <p>Desde el 1 de enero del 2026 a la fecha se registraron un total de {formatInt(totalEventosAdversos)} eventos
                    adversos, distribuidos de la siguiente manera:
                  </p>
                  <table>
                    <thead>
                      <tr>{section3Cols.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {section3RowsWithTotals.map((row, idx) => (
                        <tr key={`tipo-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                          {section3Cols.map(([key]) => <td key={`tipo-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => downloadExcelXml(`eventos_adversos_${tipo}.xml`, 'EventosAdversos', section3Cols, section3RowsWithTotals)}
                  disabled={!section3BaseRows.length}
                >
                  Descargar Excel - Seccion 3
                </button>
                <div className="table-wrap">
                  <p>Desde el 1 de enero del 2026 a la fecha se registraron un total de {formatInt(totalEventosAdversos)} eventos
                    adversos, distribuidos de la siguiente manera:
                  </p>
                  <table>
                    <thead>
                      <tr>{section3Cols.map(([, label]) => <th key={`s3-${label}`}>{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {section3RowsWithTotals.map((row, idx) => (
                        <tr key={`s3-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                          {section3Cols.map(([key]) => <td key={`s3-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="block-title">4.1 Eventos Peligrosos y Afectaciones - Resumen</div>
            <p className="muted">{section4.paragraph}</p>
            <div className="summary-grid">
              {section4.cards.map((card) => (
                <div key={card.key}><span>{card.label}</span><strong>{formatCardValue(card.key, card.value)}</strong></div>
              ))}
            </div>

            <div className="block-title">4.2 Detalle de afectaciones por Provincia (de 1 de enero del anio 2026 a la fecha)</div>
            <p className="muted">{detalleAnalisis}</p>
            <button
              type="button"
              onClick={() => downloadExcelXml(`detalle_${tipo}.xml`, 'DetalleAfectaciones', currentDetailCols, section5RowsWithTotals)}
              disabled={!items.length}
            >
              Descargar Excel - Seccion 4.1
            </button>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{currentDetailCols.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {section5RowsWithTotals.map((row, idx) => (
                    <tr key={idx} className={row.__isTotal__ ? 'total-row' : ''}>
                      {currentDetailCols.map(([key]) =>
                        <td key={`${idx}-${key}`}>{row[key] ?? '0'}</td>)}

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>



            <>
              <div className="block-title">5.1 Alojamientos Temporales</div>
              <p className="muted">{alojamientosAnalisis}</p>
              <button
                type="button"
                onClick={() => downloadExcelXml('alojamientos_temporales_abiertos.xml', 'AlojamientosTemporales', section5OrderedCols, section5AlojRowsWithTotals)}
                disabled={!shouldShowSection5}
              >
                Descargar Excel - Seccion 5.1
              </button>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{section5OrderedCols.map(([, label]) => <th key={`s5-${label}`}>{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {section5AlojRowsWithTotals.map((row, idx) => (
                      <tr key={`s5-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                        {section5OrderedCols.map(([key]) => <td key={`s5-${idx}-${key}`}>{formatTableCellValue(key, row[key]) ?? '0'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>

             <>
              <div className="block-title">5.2 Alojamientos Temporales Cerrados</div>
              <button
                type="button"
                onClick={() => downloadExcelXml('alojamientos_temporales_cerrados.xml', 'AlojamientosTemporales', section5OrderedColsCerrados, section5AlojamientosCerradosRows)}
                disabled={!shouldShowSection5}
              >
                Descargar Excel - Seccion 5.2
              </button>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{section5OrderedColsCerrados.map(([, label]) => <th key={`s5-${label}`}>{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {section5AlojamientosCerradosRows.map((row, idx) => (
                      <tr key={`s5-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                        {section5OrderedColsCerrados.map(([key]) => <td key={`s5-${idx}-${key}`}>{formatTableCellValue(key, row[key]) ?? '0'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>


            {tipo === 'lluvias' && shouldShowSection6 && activacion === true && (
              <>
                <div className="block-title">6. Asistencia Humanitaria</div>
                <button
                  type="button"
                  onClick={() => downloadExcelXml('asistencia_humanitaria.xml', 'AsistenciaHumanitaria', section6ColsFiltered, section6RowsWithTotals)}
                  disabled={!shouldShowSection6}
                >
                  Descargar Excel - Seccion 6
                </button>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{section6ColsFiltered.map(([, label]) => <th key={`s6-${label}`}>{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {section6RowsWithTotals.map((row, idx) => (
                        <tr key={`s6-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                          {section6ColsFiltered.map(([key]) => <td key={`s6-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {showRawJson && responseData && (
          <div className="result">
            <p>Total: <strong>{responseData.total ?? 0}</strong></p>
            <pre>{JSON.stringify(responseData, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
