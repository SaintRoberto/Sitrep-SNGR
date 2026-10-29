import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { exportEventosLluviasPdf } from './utils/pdfReport'
import { exportEventosLluviasWord } from './utils/wordReport.js'
import { exportInfographicPdf } from './utils/infographicPdf.js'
import { exportInfographicWord } from './utils/infographicWord.js'
import { exportWaterBodiesPdf } from './utils/waterBodiesPdf.js'
import { processHydrometeorologyPdf } from './utils/hydrometeorologyPdf.js'
import { buildMunicipalCoeSummary, coeActivationClass, uniqueActiveCoeRows } from './utils/coeConfig.js'
import {
  buildProvinceImpactMap,
  ECUADOR_PROVINCES,
  impactCellClass,
  impactColor,
  impactLegend,
  provinceImpactValue,
  provincePathData,
  shortProvinceLabel,
} from './utils/impactMap.js'

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
  asistenciaHumanitariaLluvias: '/api/public/asistencia-humanitaria-por-sngr-por-lluvias',
  alojamientosTemporalesLluvias: '/api/public/alojamientos-temporales-abiertos-por-lluvias',
  alojamientosTemporalesCerradosLluvias: '/api/public/alojamientos-temporales-cerrados-por-lluvias',
  asistenciaHumanitariaLluviasSNDGIRD: '/api/public/asistencia-humanitaria-por-sndgird-por-lluvias',
  personasFallecidasLluvias: '/api/public/personas-fallecidas-por-lluvias',
  getEventosporLluviasCategoria: '/api/public/eventos-por-lluvias-km-vias-por-categoria',
  eventosLluviasTotalPorMes: '/api/public/eventos-lluvias-total-por-mes',
  cuerposHidricosDesbordados: '/api/public/cuerpos-hidricos-desbordados-por-lluvias',
  cuerposHidricosTendencia: '/api/public/cuerpos-hidricos-tendencia-a-aumentar-por-lluvias',
  nivelesAlertaLluvias: '/api/public/niveles-alerta-por-lluvias',
  declaratoriasEmergenciaLluvias: '/api/public/declaratorias-emergencia-por-lluvias',
  coesActivadosLluvias: '/api/public/coes-activados-por-lluvias',
  eventosAltoImpactoLluvias: '/api/public/eventos-alto-impacto-por-lluvias',
}


const WATER_BODY_COLS = [
  ['__no__', 'No.'],
  ['Provincia', 'Provincia'],
  ['Canton', 'Canton'],
  ['Parroquia', 'Parroquia'],
  ['Sector', 'Sector'],
  ['CuerpoHidrico', 'Nombre de cuerpo hidrico'],
  ['FechaNovedad', 'Fecha de incremento de nivel'],
]

const ALERT_DECLARATION_COLS = [
  ['Ambito', 'Nivel de gobierno'],
  ['Provincia', 'Provincia'],
  ['Canton', 'Cantón'],
  ['Parroquia', 'Parroquia'],
  ['FechaInicio', 'Fecha declaratoria'],
  ['NivelAlerta', 'Nivel de alerta'],
  ['Observacion', 'Descripción'],
]

const EMERGENCY_DECLARATION_COLS = [
  ['Ambito', 'Nivel de gobierno'],
  ['Provincia', 'Provincia'],
  ['Canton', 'Cantón'],
  ['Parroquia', 'Parroquia'],
  ['FechaInicio', 'Fecha declaratoria'],
  ['Observacion', 'Descripción'],
]

const COE_PROVINCIAL_COLS = [
  ['__no__', 'Nro.'], ['Provincia', 'Provincia'], ['FechaInicial', 'Fecha de Activación'], ['Estado', 'Estado'],
]

const COPAE_COLS = [
  ['__no__', 'Nro.'], ['Provincia', 'Provincia'], ['Canton', 'Cantón'], ['Parroquia', 'Parroquia'],
  ['FechaInicial', 'Fecha de Activación'], ['Estado', 'Estado'],
]

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

const INDICATOR_ICON_FILES = {
  ImpactadasPersonas: 'total personas.png',
  Extraviados: '03 personas desaparecidas2.png',
  Fallecidos: '01 persona fallecida.png',
  Heridos: '02 personas heridas.png',
  AfectadosPersonas: '04 personas afectadas.png',
  DamnificadosPersonas: '06 personas damnificadas.png',
  AfectadosFamilias: '05 familias afectadas.png',
  DamnificadosFamilias: '07 familias damnificadas.png',
  AfectadosViviendas: 'vivienda afectada.png',
  DestruidosViviendas: 'vivienda destruida.png',
  AfectadosPuentes: 'puente afectado.png',
  DestruidosPuentes: 'puente destruido.png',
  AfectadosPrivados: 'bienes privados afectados3.png',
  DestruidosPrivados: 'bienes privados destruidos.png',
  AfectadosPublicos: 'Infraestructura pública afectada.png',
  DestruidosPublicos: 'Infraestructura pública destruida.png',
  AfectadosEducativos: 'establecimiento educativo afectado.png',
  DestruidosEducativos: 'establecimiento educativo destruido.png',
  FuncionalEducativos: 'educacion_mtt5.png',
  AfectadosSalud: 'establecimiento de salud afectados.png',
  DestruidosSalud: 'establecimiento de salud destruidos.png',
  Evacuados: 'personas evacuadas.png',
  AfectadosKilometros: 'metros vias afectados.png',
  AfectadosMetros: 'metros vias afectados.png',
  AfectadosHectareas: 'hectareas cob vegetal afectadas2.png',
  PerdidosHectareas: 'hectareas cob vegetal destruidas 2.png',
  QuemadasHectareas: 'hectareas cob vegetal afectadas2 2.png',
  AfectadosAnimales: 'animales afectados.png',
  MuertosAnimales: 'animales muertos.png',
}

function getIndicatorIcon(key) {
  const fileName = INDICATOR_ICON_FILES[key]
  return fileName
    ? `${import.meta.env.BASE_URL}assets/iconos%20SITREP/${encodeURIComponent(fileName)}`
    : null
}

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

const EVENTOS_MES_COLS = [
  ['mes', 'Mes'],
  ['eventos', 'Numero de Eventos'],
  ['personas_impactadas', 'Personas Impactadas'],
  ['pct_eventos', '% de recurrencia Eventos'],
  ['pct_personas_impactadas', '% de Personas Impactadas'],
]

const MESES_ORDENADOS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

const MES_RANK = new Map(MESES_ORDENADOS.map((mes, idx) => [mes.toLowerCase(), idx]))
const ASSISTANCE_HIDDEN_KEYS = new Set(['ProvinciaID'])

function n(v) {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}

function sortByNumeroEventosDesc(rows) {
  return [...rows].sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
}

function sortByPersonasImpactadasDesc(rows) {
  return [...rows].sort((a, b) => (
    n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas)
    || n(b?.NumeroEventos) - n(a?.NumeroEventos)
  ))
}

function withTotalsRow(columns, rows) {
  const totalRow = { __isTotal__: true }

  columns.forEach(([key]) => {
    if (key === '__no__') {
      totalRow[key] = ''
      return
    }

    if (key === 'Provincia' || key === 'Provincias') {
      totalRow[key] = 'Total general'
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

function formatPctText(v) {
  return `${formatPct(v)}%`
}

function getPctClass(v, maximum) {
  const value = n(v)
  if (maximum > 0 && value === maximum) return 'pct-very-high'
  const percentageOfMaximum = maximum > 0 ? (value / maximum) * 100 : 0
  if (percentageOfMaximum < 3) return 'pct-low'
  if (percentageOfMaximum < 10) return 'pct-mid'
  if (percentageOfMaximum < 30) return 'pct-yellow'
  return 'pct-high'
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

function buildPuntosImportantes(items, analysisRows, tipo, dpaTotals = null, desde = '', hasta = '') {
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
    line1: `Desde el ${formatDateLong(desde)} hasta el ${formatDateLong(hasta)} se han registrado ${formatInt(totalEventos)} eventos por ${TIPO_LABELS[tipo] || 'evento'} afectando a ${formatInt(provincias)} provincias, ${formatInt(cantones)} cantones y ${formatInt(parroquias)} parroquias. Los eventos mas recurrentes corresponden a: ${typesText} entre los principales.`,
    line2: topProvincias.length
      ? `Durante el período seleccionado, las provincias con mayor impacto a la población son: ${topProvincias.join(', ')}.`
      : 'Durante el período seleccionado no hay datos suficientes para identificar provincias con mayor impacto a la población.',
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
      return { key, label, value: roundedTotal, icon: getIndicatorIcon(key) }
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

function normalizeCategoriaVia(value) {
  const text = String(value || '').trim().toLowerCase()
  if (text.includes('primer')) return 'Primer orden'
  if (text.includes('segundo')) return 'Segundo orden'
  if (text.includes('tercer')) return 'Tercer orden'
  return String(value || '').trim() || 'Sin categoria'
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
  if (key === 'FechaNovedad') {
    const raw = String(value ?? '').trim()
    if (!raw) return ''
    const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw)
    if (Number.isNaN(parsed.getTime())) return raw
    return parsed.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
  }
  return value
}

function formatDeclarationDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replaceAll('.', '')
}

function alertLevelClass(value) {
  const level = String(value ?? '').trim().toLowerCase()
  if (level.includes('rojo')) return 'alert-level-red'
  if (level.includes('naranja')) return 'alert-level-orange'
  if (level.includes('amarillo')) return 'alert-level-yellow'
  return ''
}

function splitReportLines(value) {
  return String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function formatAffectationLine(value) {
  const [label, ...amountParts] = String(value ?? '').split('=')
  if (!amountParts.length) return String(value ?? '').trim()
  const amount = amountParts.join('=').trim()
  return `${amount} ${label.trim()}`
}

const GOVERNMENT_LEVEL_ORDER = new Map([
  ['nacional', 0],
  ['regional', 1],
  ['provincial', 2],
  ['cantonal', 3],
])

function sortByGovernmentLevel(rows) {
  return [...rows].sort((left, right) => {
    const leftLevel = String(left?.Ambito ?? '').trim().toLowerCase()
    const rightLevel = String(right?.Ambito ?? '').trim().toLowerCase()
    const levelDifference = (GOVERNMENT_LEVEL_ORDER.get(leftLevel) ?? 4) - (GOVERNMENT_LEVEL_ORDER.get(rightLevel) ?? 4)
    if (levelDifference !== 0) return levelDifference
    return String(left?.FechaInicio ?? '').localeCompare(String(right?.FechaInicio ?? ''), 'es')
  })
}

function toDateTimeInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(String(value || ''))
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0))
}

function formatDateLong(value) {
  const date = parseDateInput(value)
  return date ? date.toLocaleString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }) : String(value || '')
}

function formatDateNumeric(value) {
  const date = parseDateInput(value)
  return date ? date.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }) : String(value || '')
}

function EventsPeopleChart({ title, rows }) {
  if (!rows.length) return null

  const width = Math.max(920, rows.length * 54 + 170)
  const height = 590
  const plot = { left: 66, top: 66, right: width - 82, bottom: 420 }
  const plotWidth = plot.right - plot.left
  const plotHeight = plot.bottom - plot.top
  const maxEvents = Math.max(1, ...rows.map((row) => n(row.events)))
  const maxPeople = Math.max(1, ...rows.map((row) => n(row.people)))
  const slot = plotWidth / rows.length
  const barWidth = Math.min(48, Math.max(12, slot * 0.46))
  const points = rows.map((row, index) => ({
    x: plot.left + slot * index + slot / 2,
    y: plot.bottom - n(row.people) / maxPeople * plotHeight,
  }))
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ')
  const ticks = [0, 1, 2, 3, 4]

  return (
    <div className="events-people-chart-wrap">
      <svg
        className="events-people-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <text className="chart-main-title" x={width / 2} y="30" textAnchor="middle">{title}</text>

        {ticks.map((tick) => {
          const y = plot.bottom - plotHeight * tick / 4
          return (
            <g key={`tick-${tick}`}>
              <line className="chart-grid-line" x1={plot.left} y1={y} x2={plot.right} y2={y} />
              <text className="chart-axis-label" x={plot.left - 10} y={y + 4} textAnchor="end">
                {formatInt(maxEvents * tick / 4)}
              </text>
              <text className="chart-axis-label" x={plot.right + 10} y={y + 4} textAnchor="start">
                {formatInt(maxPeople * tick / 4)}
              </text>
            </g>
          )
        })}

        {rows.map((row, index) => {
          const x = plot.left + slot * index + slot / 2
          const barHeight = n(row.events) / maxEvents * plotHeight
          return (
            <g key={`bar-${row.label}-${index}`}>
              <rect className="chart-event-bar" x={x - barWidth / 2} y={plot.bottom - barHeight} width={barWidth} height={barHeight} />
              <text className="chart-bar-value" x={x} y={Math.max(plot.top + 12, plot.bottom - barHeight - 7)} textAnchor="middle">
                {formatInt(row.events)}
              </text>
              <text
                className="chart-category-label"
                transform={`translate(${x + 3} ${plot.bottom + 43}) rotate(-58)`}
                textAnchor="end"
              >
                {row.label}
              </text>
            </g>
          )
        })}

        <polyline className="chart-people-line" points={linePoints} />
        {points.map((point, index) => {
          const label = formatInt(rows[index].people)
          const labelWidth = Math.max(18, label.length * 7 + 10)
          const labelY = Math.min(plot.bottom + 28, point.y + 28)
          return (
            <g key={`point-${rows[index].label}-${index}`}>
              <circle className="chart-people-point" cx={point.x} cy={point.y} r="5" />
              <rect className="chart-people-label-bg" x={point.x - labelWidth / 2} y={labelY - 16} width={labelWidth} height="22" />
              <text className="chart-people-value" x={point.x} y={labelY} textAnchor="middle">{label}</text>
            </g>
          )
        })}

        <g className="chart-legend" transform={`translate(${width / 2 - 175} 558)`}>
          <rect className="chart-event-bar" x="0" y="-11" width="26" height="12" />
          <text x="36" y="0">Nro. de eventos</text>
          <line className="chart-people-line" x1="205" y1="-5" x2="245" y2="-5" />
          <text x="255" y="0">Personas Impactadas</text>
        </g>
      </svg>
    </div>
  )
}

function WaterBodiesContent({ overflowedRows, risingRows }) {
  const renderTable = (rows, kind, title) => (
    rows.length > 0 && (
      <div className={`water-table-block ${kind}`}>
        <div className="water-table-title">{formatInt(rows.length)} {title}</div>
        <div className="table-wrap">
          <table>
            <thead><tr>{WATER_BODY_COLS.map(([, label]) => <th key={`${kind}-${label}`}>{label}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => (
              <tr key={`${kind}-${rowIndex}`}>
                {WATER_BODY_COLS.map(([key]) => <td key={`${kind}-${rowIndex}-${key}`}>{formatTableCellValue(key, row[key]) ?? ''}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    )
  )

  return (
    <div className="water-bodies-section">
      <h3>ESTADO DE CUERPOS DE AGUA</h3>
      <p>
        Al cierre de este informe, las Unidades de Monitoreo de la SNGR han identificado:{' '}
        <strong>{formatInt(overflowedRows.length)} cuerpos hídricos desbordados</strong> y{' '}
        <strong>{formatInt(risingRows.length)} cuerpos hídricos con tendencia a subir de nivel.</strong>
      </p>
      {renderTable(overflowedRows, 'overflowed', 'CUERPOS HÍDRICOS DESBORDADOS')}
      {renderTable(risingRows, 'rising', 'CUERPOS HÍDRICOS CON TENDENCIA A SUBIR DE NIVEL')}
    </div>
  )
}

function WaterBodiesHtmlReport({ overflowedRows, risingRows }) {
  return (
    <section className="preview water-bodies-preview">
      <WaterBodiesContent overflowedRows={overflowedRows} risingRows={risingRows} />
    </section>
  )
}

function formatWhatsAppCutoff(value) {
  const raw = String(value || '').trim()
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!match) return raw
  const [, year, month, day, hours, minutes] = match
  return `${day}/${month}/${year} – ${hours}h${minutes}`
}

function whatsappWaterSection(rows, emoji, title) {
  const grouped = new Map()
  rows.forEach((row) => {
    const province = String(row?.Provincia || 'Sin provincia').trim()
    if (!grouped.has(province)) grouped.set(province, [])
    grouped.get(province).push(row)
  })

  const lines = [`${emoji} *${String(rows.length).padStart(2, '0')} ${title}*`]
  grouped.forEach((provinceRows, province) => {
    lines.push('', `*${province}*`)
    provinceRows.forEach((row) => {
      const location = [row?.Canton, row?.Parroquia, row?.Sector]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join('/')
      const waterBody = String(row?.CuerpoHidrico || 'Sin nombre registrado').trim()
      lines.push(`• ${location} - *${waterBody}*`)
    })
  })
  return lines.join('\n')
}

function buildWaterBodiesWhatsAppMessage(overflowedRows, risingRows, cutoff, author) {
  return [
    '*MONITOREO DE AMENAZAS – CUERPOS HÍDRICOS*',
    '*LOCALIZACIÓN: Nacional*',
    `FECHA Y HORA DE MONITOREO (CORTE): *${formatWhatsAppCutoff(cutoff)}*`,
    '',
    whatsappWaterSection(overflowedRows, '🔴', 'CUERPOS HÍDRICOS DESBORDADOS'),
    '',
    whatsappWaterSection(risingRows, '🟠', 'CUERPOS HÍDRICOS CON TENDENCIA A AUMENTAR DE NIVEL'),
    '',
    `ELABORADO POR: ${String(author || '').trim() || 'Pendiente de ingresar'} - SNGR /Dirección de Monitoreo`,
  ].join('\n')
}

function App() {
  const maxSelectableDateTime = useMemo(() => toDateTimeInputValue(new Date()), [])
  const [tipo, setTipo] = useState('lluvias')
  const [provinciaId, setProvinciaId] = useState('')
  const [reportOutputType, setReportOutputType] = useState('sitrep')
  const [thematicReportType, setThematicReportType] = useState('water-bodies')
  const [sitrepNumber, setSitrepNumber] = useState('')
  const [highImpactEventCount, setHighImpactEventCount] = useState('15')
  const [waterReportNumber, setWaterReportNumber] = useState('')
  const [waterReportAuthor, setWaterReportAuthor] = useState('')
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppCopyStatus, setWhatsAppCopyStatus] = useState('')
  const [affectationLevel, setAffectationLevel] = useState('')
  const [analystName, setAnalystName] = useState('')
  const [analystEmail, setAnalystEmail] = useState('')
  const [desde, setDesde] = useState(() => `${new Date().getFullYear()}-01-01T00:00`)
  const [hasta, setHasta] = useState(() => toDateTimeInputValue(new Date()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [responseData, setResponseData] = useState(null)
  const [tipoLluviasItems, setTipoLluviasItems] = useState([])
  const [asistenciaItems, setAsistenciaItems] = useState([])
  const [dpaTotals, setDpaTotals] = useState(null)
  const [showRawJson, setShowRawJson] = useState(false)
  const [alojamientosItems, setAlojamientosItems] = useState([])
  const [alojamientosCerradosItems, setAlojamientosCerradosItems] = useState([])
  const [asistenciaSNDGIRDItems, setAsistenciaSNDGIRDItems] = useState([])
  const [personasFalleciasItems, setpersonasFalleciasItems] = useState([])
  const [eventosMesItems, setEventosMesItems] = useState([])
  const [viasCategoriaItems, setViasCategoriaItems] = useState([])
  const [cuerposHidricosDesbordadosItems, setCuerposHidricosDesbordadosItems] = useState([])
  const [cuerposHidricosTendenciaItems, setCuerposHidricosTendenciaItems] = useState([])
  const [nivelesAlertaItems, setNivelesAlertaItems] = useState([])
  const [declaratoriasEmergenciaItems, setDeclaratoriasEmergenciaItems] = useState([])
  const [coeNacionalItems, setCoeNacionalItems] = useState([])
  const [coeProvincialItems, setCoeProvincialItems] = useState([])
  const [coeMunicipalItems, setCoeMunicipalItems] = useState([])
  const [copaeItems, setCopaeItems] = useState([])
  const [eventosAltoImpactoItems, setEventosAltoImpactoItems] = useState([])
  const [hydrometeorology, setHydrometeorology] = useState(null)
  const [hydrometeorologyFile, setHydrometeorologyFile] = useState('')
  const [hydrometeorologyLoading, setHydrometeorologyLoading] = useState(false)
  const hydrometeorologyRequest = useRef(0)

  const buildApiUrl = useCallback((endpointPath, provinciaValue = '') => {
    const base = `${API_BASE_URL}${endpointPath}`
    const params = new URLSearchParams()
    if (PUBLIC_API_KEY) params.set('api_key', PUBLIC_API_KEY)
    const trimmedProvincia = provinciaValue.trim()
    if (trimmedProvincia) params.set('ProvinciaID', trimmedProvincia)
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    const query = params.toString()
    return query ? `${base}?${query}` : base
  }, [desde, hasta])
  const requestUrl = useMemo(() => buildApiUrl(ENDPOINTS[tipo], provinciaId), [buildApiUrl, tipo, provinciaId])
  const buildHighImpactEventsUrl = useCallback(() => {
    const url = buildApiUrl(ENDPOINTS.eventosAltoImpactoLluvias)
    const count = highImpactEventCount.trim()
    if (!count) return url
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}cantidad=${encodeURIComponent(count)}`
  }, [buildApiUrl, highImpactEventCount])
  const dateRangeValid = Boolean(desde && hasta && desde <= hasta)

  const validateDateRange = () => {
    if (!desde || !hasta) throw new Error('Selecciona las fechas Desde y Hasta.')
    if (desde > hasta) throw new Error('La fecha Desde no puede ser posterior a la fecha Hasta.')
  }

  const validateAffectationLevel = () => {
    if (!/^[1-5]$/.test(affectationLevel.trim())) {
      throw new Error('Ingresa un nivel de afectación numérico entre 1 y 5.')
    }
  }

  const validateHighImpactEventCount = () => {
    const count = highImpactEventCount.trim()
    if (count && (!/^\d+$/.test(count) || Number(count) < 1 || Number(count) > 50)) {
      throw new Error('Ingresa una cantidad de eventos de alto impacto entre 1 y 50.')
    }
  }

  const validateAnalystName = () => {
    if (!analystName.trim()) throw new Error('Ingresa el nombre y cargo del analista que elabora el SitRep.')
  }

  const onHydrometeorologyFile = async (event) => {
    const input = event.currentTarget
    const file = input.files?.[0] || null
    const requestId = hydrometeorologyRequest.current + 1
    hydrometeorologyRequest.current = requestId
    setHydrometeorology(null)
    setHydrometeorologyFile(file?.name || '')
    setError('')
    if (!file) return
    setHydrometeorologyLoading(true)
    try {
      const result = await processHydrometeorologyPdf(file)
      if (hydrometeorologyRequest.current === requestId) setHydrometeorology(result)
    } catch (err) {
      if (hydrometeorologyRequest.current === requestId) {
        setHydrometeorologyFile('')
        setError(err.message)
        input.value = ''
      }
    } finally {
      if (hydrometeorologyRequest.current === requestId) setHydrometeorologyLoading(false)
    }
  }

  const items = useMemo(() => responseData?.items ?? [], [responseData])
  const analysisRows = tipo === 'lluvias' ? tipoLluviasItems : items
  const currentDetailCols = useMemo(() => (tipo === 'lluvias' ? DETAIL_COLS : buildDynamicCols(items)), [tipo, items])
  const detailRows = useMemo(() => {
    const ordered = sortByPersonasImpactadasDesc(items)
    return ordered.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [items])
  const provinceChartRows = useMemo(() => items
    .map((row) => ({
      label: String(row?.Provincia || '').trim(),
      events: n(row?.NumeroEventos),
      people: n(row?.ImpactadasPersonas),
    }))
    .filter((row) => row.label && (row.events || row.people))
    .sort((a, b) => b.people - a.people || b.events - a.events), [items])
  const provinceImpactSummary = useMemo(() => buildProvinceImpactMap(items), [items])
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
    () => buildPuntosImportantes(items, analysisRows, tipo, dpaTotals, desde, hasta),
    [items, analysisRows, tipo, dpaTotals, desde, hasta]
  )
  const section4 = useMemo(() => buildSection4(currentDetailCols, detailRows), [currentDetailCols, detailRows])
  const section41ViasCategoria = useMemo(() => {
    const rows = viasCategoriaItems.map((row) => {
      const categoria = normalizeCategoriaVia(row?.['Categoria de Vía'] || row?.Categoria || row?.categoria)
      const kilometros = n(row?.Kilometros || row?.kilometros)
      return { categoria, kilometros }
    })

    const byCategoria = new Map()
    rows.forEach((row) => {
      byCategoria.set(row.categoria, (byCategoria.get(row.categoria) || 0) + row.kilometros)
    })

    const ordered = ['Primer orden', 'Segundo orden', 'Tercer orden']
      .map((categoria) => ({ categoria, kilometros: byCategoria.get(categoria) || 0 }))
      .filter((row) => row.kilometros > 0)

    const total = ordered.reduce((acc, row) => acc + row.kilometros, 0)
    return { rows: ordered, total }
  }, [viasCategoriaItems])
  const detalleAnalisis = useMemo(() => buildDetalleAnalisis(detailRows), [detailRows])
  const section43Rows = useMemo(() => {
    const sorted = [...eventosMesItems].sort((a, b) => {
      const rankA = MES_RANK.get(String(a?.mes || '').toLowerCase()) ?? Number.MAX_SAFE_INTEGER
      const rankB = MES_RANK.get(String(b?.mes || '').toLowerCase()) ?? Number.MAX_SAFE_INTEGER
      if (rankA !== rankB) return rankA - rankB
      return String(a?.mes || '').localeCompare(String(b?.mes || ''), 'es')
    })

    const totalEventos = sorted.reduce((acc, row) => acc + n(row?.eventos), 0)
    const totalImpactadas = sorted.reduce((acc, row) => acc + n(row?.personas_impactadas), 0)

    const rows = sorted.map((row) => {
      const eventos = n(row?.eventos)
      const personasImpactadas = n(row?.personas_impactadas)
      const pctEventos = totalEventos > 0 ? (eventos / totalEventos) * 100 : 0
      const pctPersonas = totalImpactadas > 0 ? (personasImpactadas / totalImpactadas) * 100 : 0

      return {
        mes: String(row?.mes || '').trim(),
        eventos,
        personas_impactadas: personasImpactadas,
        pct_eventos: pctEventos,
        pct_personas_impactadas: pctPersonas,
      }
    })

    return [
      ...rows,
      {
        __isTotal__: true,
        mes: 'Total',
        eventos: totalEventos,
        personas_impactadas: totalImpactadas,
        pct_eventos: rows.length ? 100 : 0,
        pct_personas_impactadas: rows.length ? 100 : 0,
      },
    ]
  }, [eventosMesItems])
  const monthlyChartRows = useMemo(() => section43Rows
    .filter((row) => !row.__isTotal__)
    .map((row) => ({ label: row.mes, events: row.eventos, people: row.personas_impactadas })), [section43Rows])
  const section43ColorMaximums = useMemo(() => {
    const rows = section43Rows.filter((row) => !row.__isTotal__)
    return {
      eventos: Math.max(0, ...rows.map((row) => n(row.pct_eventos))),
      personas: Math.max(0, ...rows.map((row) => n(row.pct_personas_impactadas))),
    }
  }, [section43Rows])
  const section43RowsForExport = useMemo(
    () =>
      section43Rows.map((row) => ({
        ...row,
        pct_eventos: formatPctText(row.pct_eventos),
        pct_personas_impactadas: formatPctText(row.pct_personas_impactadas),
      })),
    [section43Rows]
  )
  const section43Analisis = useMemo(() => {
    const baseRows = section43Rows.filter((row) => !row.__isTotal__)
    if (!baseRows.length) return 'No hay datos suficientes para la seccion mensual de eventos por lluvias.'

    const top = [...baseRows].sort((a, b) => b.pct_personas_impactadas - a.pct_personas_impactadas)[0]
    const pct = formatPctText(top.pct_personas_impactadas)
    return `Desde el ${formatDateNumeric(desde)} hasta el ${formatDateNumeric(hasta)}, el mayor impacto de personas se observa en ${top.mes} con ${pct}.`
  }, [section43Rows, desde, hasta])
  const section6Cols = useMemo(
    () =>
      buildDynamicCols(asistenciaItems, [
        'Provincias',
        'Provincia',
        'Familias Beneficiadas',
        'Personas Beneficiadas',
        'Total Bienes',
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
        if (ASSISTANCE_HIDDEN_KEYS.has(key)) return false
        if (key === '__no__') return true

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
  const shouldShowSection5Closed = useMemo(() => section5RowsCerrados.length > 0, [section5RowsCerrados.length])
  const alojamientosAnalisis = useMemo(() => {
    const anioActual = new Date().getFullYear()
    const totalAbiertos = alojamientosItems.length
    const totalCerrados = alojamientosCerradosItems.length
    const totalActivados = totalAbiertos + totalCerrados
    return `En lo que va del ${anioActual} por lluvias se han activado ${formatInt(totalActivados)}, de los cuales ${formatInt(totalAbiertos)} se encuentra abiertos y ${formatInt(totalCerrados)} se encuentran cerrados.`
  }, [alojamientosItems, alojamientosCerradosItems])


  const sectionFallecidosRows = useMemo(() => {
    return personasFalleciasItems.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [personasFalleciasItems])

  const sectionFallecidosOrderedCols = useMemo(
    () =>
      buildDynamicCols(personasFalleciasItems, [
        'Provincia',
        'Canton',
        'Parroquia',
        'Tipo',
        'Nombre',
        'Apertura',
        'Familias',
        'Personas',
      ]),
    [personasFalleciasItems]
  )
  const sectionFallecidosRowsWithTotals = useMemo(() => withTotalsRow(sectionFallecidosOrderedCols, sectionFallecidosRows), [sectionFallecidosOrderedCols, sectionFallecidosRows])
  const shouldShowSectionFallecidos = useMemo(() => sectionFallecidosRows.length > 0, [sectionFallecidosRows.length])


  const sectionFallecidosRowsCerrados = useMemo(() => {
    return alojamientosCerradosItems.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [alojamientosCerradosItems])


  const sectionFallecidosOrderedColsCerrados = useMemo(
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

  const sectionFallecidosAlojamientosCerradosRows = useMemo(() => withTotalsRow(sectionFallecidosOrderedColsCerrados, sectionFallecidosRowsCerrados), [sectionFallecidosOrderedColsCerrados, sectionFallecidosRowsCerrados])
  const personasFalleciasAnalisis = useMemo(() => {
    const anioActual = new Date().getFullYear()
    const totalAbiertos = alojamientosItems.length
    const totalCerrados = alojamientosCerradosItems.length
    const totalActivados = totalAbiertos + totalCerrados
    return `En lo que va del ${anioActual} por lluvias se han activado ${formatInt(totalActivados)}, de los cuales ${formatInt(totalAbiertos)} se encuentra abiertos y ${formatInt(totalCerrados)} se encuentran cerrados.`
  }, [alojamientosItems, alojamientosCerradosItems])



  const section6SNDGIRDCols = useMemo(
    () =>
      buildDynamicCols(asistenciaSNDGIRDItems, [
        'Provincias',
        'Provincia',
        'Familias Beneficiadas',
        'Personas Beneficiadas',
        'Total Bienes',
      ]),
    [asistenciaSNDGIRDItems]
  )
  const section6SNDGIRDRows = useMemo(() => {
    const sorted = [...asistenciaSNDGIRDItems].sort((a, b) => n(b?.['Total Bienes']) - n(a?.['Total Bienes']))
    return sorted.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [asistenciaSNDGIRDItems])
  const section6SNDGIRDColsFiltered = useMemo(
    () =>
      section6SNDGIRDCols.filter(([key]) => {
        if (ASSISTANCE_HIDDEN_KEYS.has(key)) return false
        if (key === '__no__') return true

        const values = section6SNDGIRDRows
          .map((row) => row?.[key])
          .filter((v) => v !== undefined && v !== null && String(v).trim() !== '')
        const isNumeric = values.length > 0 && values.every((v) => Number.isFinite(Number(String(v).replace(',', '.'))))
        if (!isNumeric) return true

        const total = section6SNDGIRDRows.reduce((acc, row) => acc + n(row?.[key]), 0)
        return total !== 0
      }),
    [section6SNDGIRDCols, section6SNDGIRDRows]
  )
  const section6SNDGIRDRowsWithTotals = useMemo(() => withTotalsRow(section6SNDGIRDColsFiltered, section6SNDGIRDRows), [section6SNDGIRDColsFiltered, section6SNDGIRDRows])
  const section6SNDGIRDTotalGeneral = useMemo(
    () => section6SNDGIRDRows.reduce((acc, row) => acc + n(row?.['Total Bienes']), 0),
    [section6SNDGIRDRows]
  )
  const shouldShowSection6SNDGIRD = useMemo(() => section6SNDGIRDRows.length > 0 && section6SNDGIRDTotalGeneral > 0, [section6SNDGIRDRows.length, section6SNDGIRDTotalGeneral])
  const cuerposHidricosDesbordadosRows = useMemo(
    () => cuerposHidricosDesbordadosItems.map((row, index) => ({
      __no__: index + 1,
      Provincia: row?.Provincia ?? '',
      Canton: row?.Canton ?? '',
      Parroquia: row?.Parroquia ?? '',
      Sector: row?.Sector ?? '',
      CuerpoHidrico: row?.CuerpoHidrico ?? '',
      FechaNovedad: row?.FechaNovedad ?? '',
    })),
    [cuerposHidricosDesbordadosItems]
  )
  const cuerposHidricosTendenciaRows = useMemo(
    () => cuerposHidricosTendenciaItems.map((row, index) => ({
      __no__: index + 1,
      Provincia: row?.Provincia ?? '',
      Canton: row?.Canton ?? '',
      Parroquia: row?.Parroquia ?? '',
      Sector: row?.Sector ?? '',
      CuerpoHidrico: row?.CuerpoHidrico ?? '',
      FechaNovedad: row?.FechaNovedad ?? '',
    })),
    [cuerposHidricosTendenciaItems]
  )
  const whatsAppWaterMessage = useMemo(
    () => buildWaterBodiesWhatsAppMessage(cuerposHidricosDesbordadosRows, cuerposHidricosTendenciaRows, hasta, waterReportAuthor),
    [cuerposHidricosDesbordadosRows, cuerposHidricosTendenciaRows, hasta, waterReportAuthor]
  )
  const shouldShowWaterBodies = cuerposHidricosDesbordadosItems.length > 0 || cuerposHidricosTendenciaItems.length > 0
  const orderedNivelesAlertaItems = useMemo(() => sortByGovernmentLevel(nivelesAlertaItems), [nivelesAlertaItems])
  const coeNacionalActivo = useMemo(() => uniqueActiveCoeRows(coeNacionalItems, ['TipoCOE'])[0] || null, [coeNacionalItems])
  const coeProvincialesActivos = useMemo(
    () => uniqueActiveCoeRows(coeProvincialItems, ['Provincia']).sort((left, right) => String(left?.Provincia || '').localeCompare(String(right?.Provincia || ''), 'es')),
    [coeProvincialItems]
  )
  const coeMunicipalesResumen = useMemo(() => buildMunicipalCoeSummary(coeMunicipalItems), [coeMunicipalItems])
  const copaeActivos = useMemo(
    () => uniqueActiveCoeRows(copaeItems, ['Provincia', 'Canton', 'Parroquia']).sort((left, right) => String(left?.Provincia || '').localeCompare(String(right?.Provincia || ''), 'es')),
    [copaeItems]
  )
  const shouldShowCoeSection = Boolean(coeNacionalActivo || coeProvincialesActivos.length || coeMunicipalesResumen.totalActive || copaeActivos.length)
  const eventosAltoImpactoPorZona = useMemo(() => {
    const zones = new Map()
    eventosAltoImpactoItems.forEach((item) => {
      const zone = String(item?.Zona ?? '').trim() || 'Sin zona'
      if (!zones.has(zone)) zones.set(zone, [])
      zones.get(zone).push(item)
    })
    return [...zones.entries()]
  }, [eventosAltoImpactoItems])

  useEffect(() => {
    setResponseData(null)
    setTipoLluviasItems([])
    setAsistenciaItems([])
    setDpaTotals(null)
    setError('')
    setShowRawJson(false)
    setEventosMesItems([])
    setViasCategoriaItems([])
    setCuerposHidricosDesbordadosItems([])
    setCuerposHidricosTendenciaItems([])
    setNivelesAlertaItems([])
    setDeclaratoriasEmergenciaItems([])
    setCoeNacionalItems([])
    setCoeProvincialItems([])
    setCoeMunicipalItems([])
    setCopaeItems([])
    setEventosAltoImpactoItems([])
  }, [tipo])

  const onConsultar = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!PUBLIC_API_KEY) throw new Error('Falta VITE_PUBLIC_API_KEY en el frontend.')
      validateDateRange()
      if (tipo === 'lluvias') validateHighImpactEventCount()

      if (tipo === 'lluvias') {
        const trimmedProvincia = provinciaId.trim()
        const tipoLluviasUrl = buildApiUrl(ENDPOINTS.tipoLluvias, trimmedProvincia)
        const dpaTotalsUrl = buildApiUrl(ENDPOINTS.lluviasTotalPorDpa, trimmedProvincia)
        const asistenciaUrl = buildApiUrl(ENDPOINTS.asistenciaHumanitariaLluvias, trimmedProvincia)
        const alojamientosUrl = buildApiUrl(ENDPOINTS.alojamientosTemporalesLluvias, trimmedProvincia)
        const alojamientosCerradosUrl = buildApiUrl(ENDPOINTS.alojamientosTemporalesCerradosLluvias, trimmedProvincia)
        const asistenciaSNDGIRDUrl = buildApiUrl(ENDPOINTS.asistenciaHumanitariaLluviasSNDGIRD, trimmedProvincia)
        const personasFallecidasUrl = buildApiUrl(ENDPOINTS.personasFallecidasLluvias, trimmedProvincia)
        const eventosMesUrl = buildApiUrl(ENDPOINTS.eventosLluviasTotalPorMes, trimmedProvincia)
        const viasCategoriaUrl = buildApiUrl(ENDPOINTS.getEventosporLluviasCategoria, trimmedProvincia)
        const cuerposHidricosDesbordadosUrl = buildApiUrl(ENDPOINTS.cuerposHidricosDesbordados)
        const cuerposHidricosTendenciaUrl = buildApiUrl(ENDPOINTS.cuerposHidricosTendencia)
        const nivelesAlertaUrl = buildApiUrl(ENDPOINTS.nivelesAlertaLluvias)
        const declaratoriasEmergenciaUrl = buildApiUrl(ENDPOINTS.declaratoriasEmergenciaLluvias)
        const coeUrl = (tipoCoe) => `${buildApiUrl(ENDPOINTS.coesActivadosLluvias)}&tipo=${encodeURIComponent(tipoCoe)}`
        const eventosAltoImpactoUrl = buildHighImpactEventsUrl()

        const [responseMain, responseTipos, responseDpa, responseAsistencia, responseAlojamientos, responseAlojamientosCerrados, responseAsistenciaSNDGIRD, responsePersonasFallecidas, responseEventosMes, responseViasCategoria, responseCuerposDesbordados, responseCuerposTendencia, responseNivelesAlerta, responseDeclaratoriasEmergencia, responseCoeNacional, responseCoeProvincial, responseCoeMunicipal, responseCopae, responseEventosAltoImpacto] = await Promise.all([
          fetch(requestUrl),
          fetch(tipoLluviasUrl),
          fetch(dpaTotalsUrl),
          fetch(asistenciaUrl),
          fetch(alojamientosUrl),
          fetch(alojamientosCerradosUrl),
          fetch(asistenciaSNDGIRDUrl),
          fetch(personasFallecidasUrl),
          fetch(eventosMesUrl),
          fetch(viasCategoriaUrl),
          fetch(cuerposHidricosDesbordadosUrl),
          fetch(cuerposHidricosTendenciaUrl),
          fetch(nivelesAlertaUrl),
          fetch(declaratoriasEmergenciaUrl),
          fetch(coeUrl('COE-N')),
          fetch(coeUrl('COE-P')),
          fetch(coeUrl('COE-M')),
          fetch(coeUrl('COPAE')),
          fetch(eventosAltoImpactoUrl)

        ])
        const [dataMain, dataTipos, dataDpa, dataAsistencia, dataAlojamientos, dataAlojamientosCerrados, dataAsistenciaSNDGIRD, dataPersonasFallecidas, dataEventosMes, dataViasCategoria, dataCuerposDesbordados, dataCuerposTendencia, dataNivelesAlerta, dataDeclaratoriasEmergencia, dataCoeNacional, dataCoeProvincial, dataCoeMunicipal, dataCopae, dataEventosAltoImpacto] = await Promise.all([
          responseMain.json(),
          responseTipos.json(),
          responseDpa.json(),
          responseAsistencia.json(),
          responseAlojamientos.json(),
          responseAlojamientosCerrados.json(),
          responseAsistenciaSNDGIRD.json(),
          responsePersonasFallecidas.json(),
          responseEventosMes.json(),
          responseViasCategoria.json(),
          responseCuerposDesbordados.json(),
          responseCuerposTendencia.json(),
          responseNivelesAlerta.json(),
          responseDeclaratoriasEmergencia.json(),
          responseCoeNacional.json(),
          responseCoeProvincial.json(),
          responseCoeMunicipal.json(),
          responseCopae.json(),
          responseEventosAltoImpacto.json()
        ])

        if (!responseMain.ok) throw new Error(dataMain?.error || 'Error consultando API')
        if (!responseTipos.ok) throw new Error(dataTipos?.error || 'Error consultando eventos por tipo de lluvias')
        if (!responseDpa.ok) throw new Error(dataDpa?.error || 'Error consultando totales DPA')
        if (!responseAsistencia.ok) throw new Error(dataAsistencia?.error || 'Error consultando asistencia humanitaria SNGR')
        if (!responseAlojamientos.ok) throw new Error(dataAlojamientos?.error || 'Error consultando alojamientos temporales')
        if (!responseAlojamientosCerrados.ok) throw new Error(dataAlojamientosCerrados?.error || 'Error consultando alojamientos temporales cerrados')
        if (!responseAsistenciaSNDGIRD.ok) throw new Error(dataAsistenciaSNDGIRD?.error || 'Error consultando asistencia humanitaria SNDGIRD')
        if (!responsePersonasFallecidas.ok) throw new Error(dataPersonasFallecidas?.error || 'Error consultando personas fallecidas por lluvias')
        if (!responseEventosMes.ok) throw new Error(dataEventosMes?.error || 'Error consultando eventos por lluvias total por mes')
        if (!responseViasCategoria.ok) throw new Error(dataViasCategoria?.error || 'Error consultando km de vias por categoria')
        if (!responseCuerposDesbordados.ok) throw new Error(dataCuerposDesbordados?.error || 'Error consultando cuerpos hidricos desbordados')
        if (!responseCuerposTendencia.ok) throw new Error(dataCuerposTendencia?.error || 'Error consultando cuerpos hidricos con tendencia a aumentar')
        if (!responseNivelesAlerta.ok) throw new Error(dataNivelesAlerta?.error || 'Error consultando declaratorias de niveles de alerta')
        if (!responseDeclaratoriasEmergencia.ok) throw new Error(dataDeclaratoriasEmergencia?.error || 'Error consultando declaratorias de emergencia')
        if (!responseCoeNacional.ok) throw new Error(dataCoeNacional?.error || 'Error consultando COE nacional')
        if (!responseCoeProvincial.ok) throw new Error(dataCoeProvincial?.error || 'Error consultando COE provinciales')
        if (!responseCoeMunicipal.ok) throw new Error(dataCoeMunicipal?.error || 'Error consultando COE cantonales')
        if (!responseCopae.ok) throw new Error(dataCopae?.error || 'Error consultando COPAE parroquiales')
        if (!responseEventosAltoImpacto.ok) throw new Error(dataEventosAltoImpacto?.error || 'Error consultando eventos adversos de alto impacto')

        setResponseData(dataMain)
        setTipoLluviasItems(dataTipos?.items || [])
        setAsistenciaItems(dataAsistencia?.items || [])
        setDpaTotals((dataDpa?.items || [])[0] || null)
        setAlojamientosItems(dataAlojamientos?.items || [])
        setAlojamientosCerradosItems(dataAlojamientosCerrados?.items || []) // Limpiar alojamientos cerrados al consultar eventos por lluvias
        setAsistenciaSNDGIRDItems(dataAsistenciaSNDGIRD?.items || [])
        setpersonasFalleciasItems(dataPersonasFallecidas?.items || []) // Limpiar personas fallecidas al consultar eventos por lluvias
        setEventosMesItems(dataEventosMes?.items || [])
        setViasCategoriaItems(dataViasCategoria?.items || [])
        setCuerposHidricosDesbordadosItems(dataCuerposDesbordados?.items || [])
        setCuerposHidricosTendenciaItems(dataCuerposTendencia?.items || [])
        setNivelesAlertaItems(dataNivelesAlerta?.items || [])
        setDeclaratoriasEmergenciaItems(dataDeclaratoriasEmergencia?.items || [])
        setCoeNacionalItems(dataCoeNacional?.items || [])
        setCoeProvincialItems(dataCoeProvincial?.items || [])
        setCoeMunicipalItems(dataCoeMunicipal?.items || [])
        setCopaeItems(dataCopae?.items || [])
        setEventosAltoImpactoItems(dataEventosAltoImpacto?.items || [])
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
        setAsistenciaSNDGIRDItems([])
        setpersonasFalleciasItems([])
        setEventosMesItems([])
        setViasCategoriaItems([])
        setCuerposHidricosDesbordadosItems([])
        setCuerposHidricosTendenciaItems([])
        setNivelesAlertaItems([])
        setDeclaratoriasEmergenciaItems([])
        setCoeNacionalItems([])
        setCoeProvincialItems([])
        setCoeMunicipalItems([])
        setCopaeItems([])
        setEventosAltoImpactoItems([])
      }
    } catch (err) {
      setResponseData(null)
      setTipoLluviasItems([])
      setAsistenciaItems([])
      setDpaTotals(null)
      setAlojamientosItems([])
      setAlojamientosCerradosItems([])
      setAsistenciaSNDGIRDItems([])
      setpersonasFalleciasItems([])
      setEventosMesItems([])
      setViasCategoriaItems([])
      setCuerposHidricosDesbordadosItems([])
      setCuerposHidricosTendenciaItems([])
      setNivelesAlertaItems([])
      setDeclaratoriasEmergenciaItems([])
      setCoeNacionalItems([])
      setCoeProvincialItems([])
      setCoeMunicipalItems([])
      setCopaeItems([])
      setEventosAltoImpactoItems([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDescargarPrincipal = async (format = 'pdf') => {
    if (!items.length) {
      setError('Primero consulta datos para generar la descarga.')
      return
    }

    if (tipo !== 'lluvias') {
      downloadExcelXml(`detalle_${tipo}.xml`, 'DetalleConsulta', currentDetailCols, section5RowsWithTotals)
      return
    }

    if (!hydrometeorology) {
      setError('Selecciona y procesa el boletín PDF del INAMHI antes de generar el SITREP.')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (!PUBLIC_API_KEY) throw new Error('Falta VITE_PUBLIC_API_KEY en el frontend.')
      validateDateRange()
      validateAffectationLevel()
      validateHighImpactEventCount()
      validateAnalystName()
      const trimmedProvincia = provinciaId.trim()
      const mainUrl = buildApiUrl(ENDPOINTS.lluvias, trimmedProvincia)
      const tipoLluviasUrl = buildApiUrl(ENDPOINTS.tipoLluvias, trimmedProvincia)
      const dpaTotalsUrl = buildApiUrl(ENDPOINTS.lluviasTotalPorDpa, trimmedProvincia)
      const asistenciaUrl = buildApiUrl(ENDPOINTS.asistenciaHumanitariaLluvias, trimmedProvincia)
      const asistenciaSNDGIRDUrl = buildApiUrl(ENDPOINTS.asistenciaHumanitariaLluviasSNDGIRD, trimmedProvincia)
      const alojamientosUrl = buildApiUrl(ENDPOINTS.alojamientosTemporalesLluvias, trimmedProvincia)
      const alojamientosCerradosUrl = buildApiUrl(ENDPOINTS.alojamientosTemporalesCerradosLluvias, trimmedProvincia)
      const personasFallecidasUrl = buildApiUrl(ENDPOINTS.personasFallecidasLluvias, trimmedProvincia)
      const eventosMesUrl = buildApiUrl(ENDPOINTS.eventosLluviasTotalPorMes, trimmedProvincia)
      const viasCategoriaUrl = buildApiUrl(ENDPOINTS.getEventosporLluviasCategoria, trimmedProvincia)
      const cuerposHidricosDesbordadosUrl = buildApiUrl(ENDPOINTS.cuerposHidricosDesbordados)
      const cuerposHidricosTendenciaUrl = buildApiUrl(ENDPOINTS.cuerposHidricosTendencia)
      const nivelesAlertaUrl = buildApiUrl(ENDPOINTS.nivelesAlertaLluvias)
      const declaratoriasEmergenciaUrl = buildApiUrl(ENDPOINTS.declaratoriasEmergenciaLluvias)
      const coeUrl = (tipoCoe) => `${buildApiUrl(ENDPOINTS.coesActivadosLluvias)}&tipo=${encodeURIComponent(tipoCoe)}`
      const eventosAltoImpactoUrl = buildHighImpactEventsUrl()

      const [responseMain, responseTipos, responseDpa, responseAsistencia, responseAsistenciaSNDGIRD, responseAlojamientos, responseAlojamientosCerrados, responsePersonasFallecidas, responseEventosMes, responseViasCategoria, responseCuerposDesbordados, responseCuerposTendencia, responseNivelesAlerta, responseDeclaratoriasEmergencia, responseCoeNacional, responseCoeProvincial, responseCoeMunicipal, responseCopae, responseEventosAltoImpacto] = await Promise.all([
        fetch(mainUrl),
        fetch(tipoLluviasUrl),
        fetch(dpaTotalsUrl),
        fetch(asistenciaUrl),
        fetch(asistenciaSNDGIRDUrl),
        fetch(alojamientosUrl),
        fetch(alojamientosCerradosUrl),
        fetch(personasFallecidasUrl),
        fetch(eventosMesUrl),
        fetch(viasCategoriaUrl),
        fetch(cuerposHidricosDesbordadosUrl),
        fetch(cuerposHidricosTendenciaUrl),
        fetch(nivelesAlertaUrl),
        fetch(declaratoriasEmergenciaUrl),
        fetch(coeUrl('COE-N')),
        fetch(coeUrl('COE-P')),
        fetch(coeUrl('COE-M')),
        fetch(coeUrl('COPAE')),
        fetch(eventosAltoImpactoUrl)
      ])
      const [dataMain, dataTipos, dataDpa, dataAsistencia, dataAsistenciaSNDGIRD, dataAlojamientos, dataAlojamientosCerrados, dataPersonasFallecidas, dataEventosMes, dataViasCategoria, dataCuerposDesbordados, dataCuerposTendencia, dataNivelesAlerta, dataDeclaratoriasEmergencia, dataCoeNacional, dataCoeProvincial, dataCoeMunicipal, dataCopae, dataEventosAltoImpacto] = await Promise.all([
        responseMain.json(),
        responseTipos.json(),
        responseDpa.json(),
        responseAsistencia.json(),
        responseAsistenciaSNDGIRD.json(),
        responseAlojamientos.json(),
        responseAlojamientosCerrados.json(),
        responsePersonasFallecidas.json(),
        responseEventosMes.json(),
        responseViasCategoria.json(),
        responseCuerposDesbordados.json(),
        responseCuerposTendencia.json(),
        responseNivelesAlerta.json(),
        responseDeclaratoriasEmergencia.json(),
        responseCoeNacional.json(),
        responseCoeProvincial.json(),
        responseCoeMunicipal.json(),
        responseCopae.json(),
        responseEventosAltoImpacto.json()
      ])
      if (!responseMain.ok) throw new Error(dataMain?.error || 'Error consultando eventos por lluvias')
      if (!responseTipos.ok) throw new Error(dataTipos?.error || 'Error consultando eventos por tipo de lluvias')
      if (!responseDpa.ok) throw new Error(dataDpa?.error || 'Error consultando totales DPA')
      if (!responseAsistencia.ok) throw new Error(dataAsistencia?.error || 'Error consultando asistencia humanitaria')
      if (!responseAsistenciaSNDGIRD.ok) throw new Error(dataAsistenciaSNDGIRD?.error || 'Error consultando asistencia humanitaria SNGR')
      if (!responseAlojamientos.ok) throw new Error(dataAlojamientos?.error || 'Error consultando alojamientos temporales')
      if (!responseAlojamientosCerrados.ok) throw new Error(dataAlojamientosCerrados?.error || 'Error consultando alojamientos temporales cerrados')
      if (!responsePersonasFallecidas.ok) throw new Error(dataPersonasFallecidas?.error || 'Error consultando personas fallecidas por lluvias')
      if (!responseEventosMes.ok) throw new Error(dataEventosMes?.error || 'Error consultando eventos por lluvias total por mes')
      if (!responseViasCategoria.ok) throw new Error(dataViasCategoria?.error || 'Error consultando km de vías por categoría')

      if (!responseCuerposDesbordados.ok) throw new Error(dataCuerposDesbordados?.error || 'Error consultando cuerpos hidricos desbordados')
      if (!responseCuerposTendencia.ok) throw new Error(dataCuerposTendencia?.error || 'Error consultando cuerpos hidricos con tendencia a aumentar')
      if (!responseNivelesAlerta.ok) throw new Error(dataNivelesAlerta?.error || 'Error consultando declaratorias de niveles de alerta')
      if (!responseDeclaratoriasEmergencia.ok) throw new Error(dataDeclaratoriasEmergencia?.error || 'Error consultando declaratorias de emergencia')
      if (!responseCoeNacional.ok) throw new Error(dataCoeNacional?.error || 'Error consultando COE nacional')
      if (!responseCoeProvincial.ok) throw new Error(dataCoeProvincial?.error || 'Error consultando COE provinciales')
      if (!responseCoeMunicipal.ok) throw new Error(dataCoeMunicipal?.error || 'Error consultando COE cantonales')
      if (!responseCopae.ok) throw new Error(dataCopae?.error || 'Error consultando COPAE parroquiales')
      if (!responseEventosAltoImpacto.ok) throw new Error(dataEventosAltoImpacto?.error || 'Error consultando eventos adversos de alto impacto')

      const reportOptions = {
        items: dataMain?.items || [],
        tipoLluviasItems: dataTipos?.items || [],
        asistenciaItems: dataAsistencia?.items || [],
        asistenciaSNDGIRDItems: dataAsistenciaSNDGIRD?.items || [],
        alojamientosItems: dataAlojamientos?.items || [],
        alojamientosCerradosItems: dataAlojamientosCerrados?.items || [],
        eventosMesItems: dataEventosMes?.items || [],
        viasCategoriaItems: dataViasCategoria?.items || [],
        waterBodiesOverflowed: dataCuerposDesbordados?.items || [],
        waterBodiesRising: dataCuerposTendencia?.items || [],
        alertDeclarations: dataNivelesAlerta?.items || [],
        emergencyDeclarations: dataDeclaratoriasEmergencia?.items || [],
        nationalCoeItems: dataCoeNacional?.items || [],
        provincialCoeItems: dataCoeProvincial?.items || [],
        municipalCoeItems: dataCoeMunicipal?.items || [],
        parishCoeItems: dataCopae?.items || [],
        highImpactEvents: dataEventosAltoImpacto?.items || [],
        analystName: analystName.trim(),
        analystEmail: analystEmail.trim(),
        dpaTotals: (dataDpa?.items || [])[0] || null,
        provinciaId: provinciaId.trim() || null,
        sitrepNumber: sitrepNumber.trim() || null,
        affectationLevel: affectationLevel.trim(),
        personasFallecidasItems: dataPersonasFallecidas?.items || [],
        startDate: desde,
        endDate: hasta,
        hydrometeorology,
      }
      if (format === 'word') await exportEventosLluviasWord(reportOptions)
      else await exportEventosLluviasPdf(reportOptions)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDescargarInfografia = async (format = 'pdf') => {
    if (tipo !== 'lluvias') {
      setError('La infografía está disponible para la consulta de eventos por lluvias.')
      return
    }
    if (!items.length) {
      setError('Primero consulta datos para generar la infografía.')
      return
    }
    if (!hydrometeorology) {
      setError('Selecciona y procesa el boletín PDF del INAMHI antes de generar la infografía.')
      return
    }

    setLoading(true)
    setError('')
    try {
      validateDateRange()
      const reportOptions = {
        items,
        tipoLluviasItems,
        asistenciaItems,
        asistenciaSNDGIRDItems,
        alojamientosItems,
        dpaTotals,
        alertDeclarations: nivelesAlertaItems,
        emergencyDeclarations: declaratoriasEmergenciaItems,
        nationalCoeItems: coeNacionalItems,
        provincialCoeItems: coeProvincialItems,
        municipalCoeItems: coeMunicipalItems,
        parishCoeItems: copaeItems,
        provinciaId: provinciaId.trim() || null,
        sitrepNumber: sitrepNumber.trim() || null,
        startDate: desde,
        endDate: hasta,
        hydrometeorology,
      }
      if (format === 'word') await exportInfographicWord(reportOptions)
      else await exportInfographicPdf(reportOptions)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDescargarCuerposHidricos = async () => {
    if (reportOutputType !== 'water-bodies') {
      setError('Selecciona “Cuerpos hídricos” como tipo de reporte.')
      return
    }
    if (tipo !== 'lluvias') {
      setError('El reporte de cuerpos hídricos está disponible para la consulta de eventos por lluvias.')
      return
    }
    if (!waterReportNumber.trim()) {
      setError('Ingresa el número del reporte de cuerpos hídricos.')
      return
    }
    if (!shouldShowWaterBodies) {
      setError('Primero consulta los datos de cuerpos hídricos para generar el reporte.')
      return
    }

    setLoading(true)
    setError('')
    try {
      validateDateRange()
      await exportWaterBodiesPdf({
        waterBodiesOverflowed: cuerposHidricosDesbordadosItems,
        waterBodiesRising: cuerposHidricosTendenciaItems,
        sitrepNumber: waterReportNumber.trim(),
        endDate: hasta,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onCopyWhatsAppMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsAppWaterMessage)
      setWhatsAppCopyStatus('Mensaje copiado al portapapeles.')
    } catch {
      setWhatsAppCopyStatus('No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.')
    }
  }

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Consulta de Eventos </h1>
        <form onSubmit={onConsultar} className="form-grid">
          {tipo === 'lluvias' && (
            <fieldset className="report-type-selector">
              <legend>¿Qué reporte desea generar?</legend>
              <label className={reportOutputType === 'sitrep' ? 'report-type-option selected' : 'report-type-option'}>
                <input
                  type="radio"
                  name="report-output-type"
                  value="sitrep"
                  checked={reportOutputType === 'sitrep'}
                  onChange={(event) => setReportOutputType(event.target.value)}
                />
                <span>SITREP</span>
              </label>
              <label className={reportOutputType === 'water-bodies' ? 'report-type-option selected' : 'report-type-option'}>
                <input
                  type="radio"
                  name="report-output-type"
                  value="water-bodies"
                  checked={reportOutputType === 'water-bodies'}
                  onChange={(event) => {
                    setReportOutputType(event.target.value)
                    setProvinciaId('')
                  }}
                />
                <span>Cuerpos hídricos</span>
              </label>
            </fieldset>
          )}

          {reportOutputType === 'water-bodies' ? (
            <>
              <div className="water-report-heading-fields">
                <label>
                  Tipo de reporte
                  <select value={thematicReportType} onChange={(event) => setThematicReportType(event.target.value)}>
                    <option value="water-bodies">Estado de cuerpos hídricos</option>
                    <option value="forest-fires">Estado de incendios forestales</option>
                  </select>
                </label>
                {thematicReportType === 'water-bodies' && (
                  <label>
                    Reporte No. de cuerpos hídricos
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="Ej: 178"
                      value={waterReportNumber}
                      onChange={(event) => setWaterReportNumber(event.target.value.replace(/\D/g, ''))}
                    />
                  </label>
                )}
              </div>

              <div className="water-report-fields">
                <label>
                  Desde
                  <input type="datetime-local" step="60" required max={hasta || maxSelectableDateTime} value={desde} onChange={(e) => setDesde(e.target.value)} />
                </label>
                <label>
                  Hasta
                  <input type="datetime-local" step="60" required value={hasta} onChange={(e) => setHasta(e.target.value)} />
                </label>
              </div>
              {thematicReportType === 'water-bodies' && (
                <label className="water-report-author-field">
                  Elaborado por
                  <input
                    type="text"
                    required
                    placeholder="Ej: Joao Aspiazu"
                    value={waterReportAuthor}
                    onChange={(event) => setWaterReportAuthor(event.target.value)}
                  />
                </label>
              )}
            </>
          ) : (
            <>
              <label>
                Tipo de evento
                <select value={tipo} onChange={(event) => {
                  const nextType = event.target.value
                  setTipo(nextType)
                  if (nextType !== 'lluvias') setReportOutputType('sitrep')
                }}>
                  <option value="lluvias">Eventos por lluvias</option>
                  <option value="noLluvias">Eventos no por lluvias</option>
                  <option value="incendios">Eventos por incendios forestales</option>
                </select>
              </label>
              <label>
                ProvinciaID (opcional)
                <input type="number" min="1" placeholder="Ej: 1" value={provinciaId} onChange={(e) => setProvinciaId(e.target.value)} />
              </label>
              <label>
                Desde
                <input type="datetime-local" step="60" required max={hasta || maxSelectableDateTime} value={desde} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label>
                Hasta
                <input type="datetime-local" step="60" required min={desde} max={maxSelectableDateTime} value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </label>
            </>
          )}

          {reportOutputType === 'sitrep' && (
            <>
              <label>
                Nombre y cargo del analista
                <input
                  type="text"
                  required
                  placeholder="Ej: Cristian Mazorra Olmedo - Analista de Monitoreo"
                  value={analystName}
                  onChange={(e) => setAnalystName(e.target.value)}
                />
              </label>

              <label>
                Correo electrónico del analista
                <input
                  type="email"
                  placeholder="Ej: analista@gestionderiesgos.gob.ec"
                  value={analystEmail}
                  onChange={(e) => setAnalystEmail(e.target.value)}
                />
              </label>
            </>
          )}

          {tipo === 'lluvias' && reportOutputType === 'sitrep' && (
            <div className="sitrep-settings-row">
              <label>
                Nro. de SITREP / Infografía (opcional)
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Ej: 34"
                  value={sitrepNumber}
                  onChange={(e) => setSitrepNumber(e.target.value)}
                />
              </label>

              <label>
                Cantidad de eventos de alto impacto
                <input
                  type="number"
                  min="1"
                  max="50"
                  step="1"
                  value={highImpactEventCount}
                  onChange={(e) => setHighImpactEventCount(e.target.value)}
                />
              </label>

              <label>
                Nivel de afectación
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="1"
                  required
                  placeholder="Ej: 3"
                  value={affectationLevel}
                  onChange={(e) => setAffectationLevel(e.target.value)}
                />
              </label>
            </div>
          )}

          {tipo === 'lluvias' && reportOutputType === 'sitrep' && (
            <label className="hydrometeorology-upload">
              Boletín hidrometeorológico del INAMHI
              <input type="file" accept="application/pdf,.pdf" onChange={onHydrometeorologyFile} disabled={hydrometeorologyLoading} />
              <span className="file-status" aria-live="polite">
                {hydrometeorologyLoading
                  ? 'Procesando PDF...'
                  : hydrometeorology
                    ? `${hydrometeorology.filename} - ${hydrometeorology.label}`
                    : hydrometeorologyFile || 'Ningún archivo seleccionado'}
              </span>
            </label>
          )}

          <button type="submit" disabled={loading || !API_BASE_URL || !dateRangeValid}>{loading ? 'Consultando...' : 'Consultar'}</button>
          {reportOutputType === 'sitrep' && (
            <div className="sitrep-download-row">
              <button type="button" onClick={() => onDescargarPrincipal('pdf')} disabled={loading || hydrometeorologyLoading || !dateRangeValid}>
                {'Descargar SITREP PDF'}
              </button>
              <button type="button" onClick={() => onDescargarPrincipal('word')} disabled={loading || hydrometeorologyLoading || !dateRangeValid}>
                {'Descargar SITREP Word editable'}
              </button>
            </div>
          )}
          {tipo === 'lluvias' && reportOutputType === 'sitrep' && (
            <div className="infographic-download-row">
              <button type="button" className="infographic-button" onClick={() => onDescargarInfografia('pdf')} disabled={loading || hydrometeorologyLoading || !dateRangeValid}>
                {'Descargar Infografía PDF'}
              </button>
              <button type="button" className="infographic-button" onClick={() => onDescargarInfografia('word')} disabled={loading || hydrometeorologyLoading || !dateRangeValid}>
                {'Descargar Infografía Word'}
              </button>
            </div>
          )}
          {tipo === 'lluvias' && reportOutputType === 'water-bodies' && (
            <button type="button" className="water-report-button" onClick={onDescargarCuerposHidricos} disabled={!waterReportNumber.trim() || loading || !dateRangeValid || !shouldShowWaterBodies}>
              {'Descargar Reporte de estado de cuerpos hídricos'}
            </button>
          )}
          {tipo === 'lluvias' && reportOutputType === 'water-bodies' && thematicReportType === 'water-bodies' && (
            <button
              type="button"
              className="whatsapp-message-button"
              disabled={!shouldShowWaterBodies || !waterReportAuthor.trim()}
              onClick={() => {
                setWhatsAppCopyStatus('')
                setShowWhatsAppModal(true)
              }}
            >
              Generar mensaje para WhatsApp
            </button>
          )}
        
        </form>

        {DEBUG && <p className="request-url">GET {requestUrl}</p>}
        {error && <p className="error">{error}</p>}

        {reportOutputType === 'water-bodies' && thematicReportType === 'water-bodies' && shouldShowWaterBodies && (
          <WaterBodiesHtmlReport
            overflowedRows={cuerposHidricosDesbordadosRows}
            risingRows={cuerposHidricosTendenciaRows}
          />
        )}

        {reportOutputType === 'sitrep' && items.length > 0 && (
          <section className="preview">
            <h2>{sitrepNumber.trim() ? `Vista Previa SITREP No. ${sitrepNumber.trim()}` : 'Vista Previa SITREP'}</h2>

            <div className="block-title">1. Puntos importantes</div>
            <ul className="important-list">
              <li>{puntosImportantes.line1}</li>
              <li>{puntosImportantes.line2}</li>
            </ul>

            {tipo === 'lluvias' && (
              <>
                {hydrometeorology && (
                  <>
                    <div className="block-title pt-4">2. Situación Hidrometeorológica actual</div>
                    {hydrometeorology.type === 'warning' ? (
                      <div className="hydrometeorology-layout warning-layout">
                        <div className="hydrometeorology-map">
                          <img src={hydrometeorology.mapImage} alt="Mapa de amenaza meteorológica extraído del boletín" />
                        </div>
                        <div className="hydrometeorology-warning-content">
                        <div className="hydrometeorology-text">
                          {hydrometeorology.text.split(/\n\s*\n/).map((paragraph, index) => <p key={`hydro-${index}`}>{paragraph}</p>)}
                        </div>
                          <img src={hydrometeorology.tableImage} alt="Tabla de estimación meteorológica extraída del boletín" />
                        </div>
                      </div>
                    ) : (
                      <div className="forecast-layout">
                        <p className="forecast-summary">{hydrometeorology.text}</p>
                        <div className="forecast-maps">
                          {hydrometeorology.maps.map((map) => (
                            <figure key={map.region}>
                              <figcaption>{map.region}</figcaption>
                              <img src={map.image} alt={`Mapa meteorológico de la región ${map.region.toLowerCase()}`} />
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {shouldShowWaterBodies && (
                  <WaterBodiesContent
                    overflowedRows={cuerposHidricosDesbordadosRows}
                    risingRows={cuerposHidricosTendenciaRows}
                  />
                )}
              </>
            )}

            <div className="block-title pt-4">3. Eventos Adversos y Afectaciones por Provincia</div>
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
                  <p>Desde el {formatDateLong(desde)} hasta el {formatDateLong(hasta)} se registraron un total de {formatInt(totalEventosAdversos)} eventos
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
                  <p>Desde el {formatDateLong(desde)} hasta el {formatDateLong(hasta)} se registraron un total de {formatInt(totalEventosAdversos)} eventos
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

            <div className="block-title pt-4">4.1 Eventos Peligrosos y Afectaciones - Resumen</div>
            <p className="muted">{section4.paragraph}</p>
            <div className="summary-grid">
              {section4.cards.map((card) => (
                <div key={card.key}>
                  <span className="summary-card-label">
                    {card.icon && <img src={card.icon} alt="" aria-hidden="true" />}
                    <span>{card.label}</span>
                  </span>
                  <strong>{formatCardValue(card.key, card.value)}</strong>
                </div>
              ))}
            </div>
            {tipo === 'lluvias' && section41ViasCategoria.rows.length > 0 && (
              <div className="vias-categoria-card">
                <h3>Vias afectadas (kilometros)</h3>
                {section41ViasCategoria.rows.map((row) => (
                  <div key={`via-cat-${row.categoria}`} className="vias-categoria-row">
                    <span>{row.categoria}:</span>
                    <strong>{Number(row.kilometros).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  </div>
                ))}
                <div className="vias-categoria-total">
                  <span>Total Vias afectadas (kilometros):</span>
                  <strong>{Number(section41ViasCategoria.total).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
              </div>
            )}

            <div className="block-title pt-4">4.2 Detalle de afectaciones por Provincia ({formatDateNumeric(desde)} al {formatDateNumeric(hasta)})</div>
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
                      {currentDetailCols.map(([key]) => (
                        <td
                          key={`${idx}-${key}`}
                          className={!row.__isTotal__ && key === 'ImpactadasPersonas'
                            ? impactCellClass(row[key], provinceImpactSummary.maximum)
                            : ''}
                        >
                          {row[key] ?? '0'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {provinceChartRows.length > 0 && (
              <section className="html-chart-section">
                <div className="block-title pt-4">Número de eventos vs Personas Impactadas por provincia</div>
                <EventsPeopleChart
                  title="Número de eventos vs Personas Impactadas por provincia"
                  rows={provinceChartRows}
                />
                <div className="table-wrap province-chart-table-wrap">
                  <table className="province-chart-table">
                    <thead>
                      <tr>
                        <th>Provincia</th>
                        <th>Nro. de eventos</th>
                        <th>Personas impactadas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provinceChartRows.map((row) => (
                        <tr key={`province-chart-${row.label}`}>
                          <td>{row.label}</td>
                          <td>{formatInt(row.events)}</td>
                          <td>{formatInt(row.people)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <>

            <div className="block-title pt-4">4.3 Numero de Eventos vs Personas Impactadas por fecha</div>
            <p className="muted">{section43Analisis}</p>
            {monthlyChartRows.length > 0 && (
              <EventsPeopleChart
                title="Recurrencia de eventos vs personas impactadas por mes"
                rows={monthlyChartRows}
              />
            )}
            <button
              type="button"
              onClick={() => downloadExcelXml('eventos_lluvias_total_por_mes.xml', 'EventosLluviasPorMes', EVENTOS_MES_COLS, section43RowsForExport)}
              disabled={!section43Rows.length || section43Rows.every((row) => row.__isTotal__)}
            >
              Descargar Excel - Seccion 4.3
            </button>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{EVENTOS_MES_COLS.map(([, label]) => <th key={`s43-${label}`}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {section43Rows.map((row, idx) => (
                    <tr key={`s43-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                      <td>{row.mes || '-'}</td>
                      <td>{formatInt(row.eventos)}</td>
                      <td>{formatInt(row.personas_impactadas)}</td>
                      <td className={row.__isTotal__ ? '' : getPctClass(row.pct_eventos, section43ColorMaximums.eventos)}>{formatPctText(row.pct_eventos)}</td>
                      <td className={row.__isTotal__ ? '' : getPctClass(row.pct_personas_impactadas, section43ColorMaximums.personas)}>{formatPctText(row.pct_personas_impactadas)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

              <div className="block-title pt-4">4.5 Personas Fallecidas</div>
              <button
                type="button"
                onClick={() => downloadExcelXml('personas_fallecidas.xml', 'PersonasFallecidas', sectionFallecidosOrderedCols, sectionFallecidosRowsWithTotals)}>
                Descargar Excel - Seccion 4.5
              </button>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{sectionFallecidosOrderedCols.map(([, label]) => <th key={`s5-${label}`}>{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sectionFallecidosRowsWithTotals.map((row, idx) => (
                      <tr key={`s5-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                        {sectionFallecidosOrderedCols.map(([key]) => <td key={`s5-${idx}-${key}`}>{formatTableCellValue(key, row[key]) ?? '0'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>


            <>
              <div className="block-title pt-4">5.1 Alojamientos Temporales Abiertos</div>
              <p className="muted">{alojamientosAnalisis}</p>
              {shouldShowSection5 && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadExcelXml('alojamientos_temporales_abiertos.xml', 'AlojamientosTemporales', section5OrderedCols, section5AlojRowsWithTotals)}
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
              )}
            </>

            <>
              <div className="block-title pt-4">5.2 Alojamientos Temporales Cerrados</div>
              {shouldShowSection5Closed && (
                <>
                  <button
                    type="button"
                    onClick={() => downloadExcelXml('alojamientos_temporales_cerrados.xml', 'AlojamientosTemporales', section5OrderedColsCerrados, section5AlojamientosCerradosRows)}
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
              )}
            </>


            {tipo === 'lluvias' && shouldShowSection6 && (
              <>
                <div className="block-title pt-4">6.1 Asistencia Humanitaria SNGR</div>
                <button
                  type="button"
                  onClick={() => downloadExcelXml('asistencia_humanitaria.xml', 'AsistenciaHumanitaria', section6ColsFiltered, section6RowsWithTotals)}
                  disabled={!shouldShowSection6}
                >
                  Descargar Excel - Seccion 6.1
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

            <>
              <div className="block-title pt-4">6.2 Asistencia Humanitaria SNDGIRD</div>
              <button
                type="button"
                onClick={() => downloadExcelXml('asistencia_humanitaria.xml', 'AsistenciaHumanitaria', section6SNDGIRDColsFiltered, section6SNDGIRDRowsWithTotals)}
                disabled={!shouldShowSection6SNDGIRD}
              >
                Descargar Excel - Seccion 6.2
              </button>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>{section6SNDGIRDColsFiltered.map(([, label]) => <th key={`s6-${label}`}>{label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {section6SNDGIRDRowsWithTotals.map((row, idx) => (
                      <tr key={`s6-${idx}`} className={row.__isTotal__ ? 'total-row' : ''}>
                        {section6SNDGIRDColsFiltered.map(([key]) => <td key={`s6-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>

            {tipo === 'lluvias' && (nivelesAlertaItems.length > 0 || declaratoriasEmergenciaItems.length > 0 || shouldShowCoeSection) && (
              <>
                <div className="block-title pt-4">7. Declaratorias emitidas y COE activados</div>

                {orderedNivelesAlertaItems.length > 0 && (
                  <div className="declaration-block">
                    <h3>Declaratorias de niveles de alertas en todo el país:</h3>
                    <div className="table-wrap">
                      <table className="declaration-table alert-declaration-table">
                        <thead><tr>{ALERT_DECLARATION_COLS.map(([, label]) => <th key={`alerta-${label}`}>{label}</th>)}</tr></thead>
                        <tbody>{orderedNivelesAlertaItems.map((row, rowIndex) => (
                          <tr key={`alerta-${rowIndex}`}>
                            {ALERT_DECLARATION_COLS.map(([key]) => (
                              <td key={`alerta-${rowIndex}-${key}`} className={key === 'NivelAlerta' ? alertLevelClass(row?.[key]) : ''}>
                                {key === 'FechaInicio' ? formatDeclarationDate(row?.[key]) : (row?.[key] ?? '--')}
                              </td>
                            ))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}

                {declaratoriasEmergenciaItems.length > 0 && (
                  <div className="declaration-block">
                    <h3>Declaratorias de emergencia en todo el país:</h3>
                    <div className="table-wrap">
                      <table className="declaration-table emergency-declaration-table">
                        <thead><tr>{EMERGENCY_DECLARATION_COLS.map(([, label]) => <th key={`emergencia-${label}`}>{label}</th>)}</tr></thead>
                        <tbody>{declaratoriasEmergenciaItems.map((row, rowIndex) => (
                          <tr key={`emergencia-${rowIndex}`}>
                            {EMERGENCY_DECLARATION_COLS.map(([key]) => (
                              <td key={`emergencia-${rowIndex}-${key}`}>
                                {key === 'FechaInicio' ? formatDeclarationDate(row?.[key]) : (row?.[key] ?? '--')}
                              </td>
                            ))}
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}

                <p className="declaration-note">
                  Además, mediante <strong>Decreto ejecutivo Nro. 485, firmado el 31 de agosto de 2026, por el presidente del Ecuador Daniel Noboa Azin, resuelve declarar</strong> como prioridad nacional la continuidad y el fortalecimiento de las acciones de prevención y preparación frente a los posibles efectos del fenómeno El Niño en el territorio nacional, así como la ejecución de las acciones de respuesta y recuperación que correspondan, en función de la evolución del evento y los escenarios de riesgos, en el marco de la Alerta Roja declarada en todo el territorio nacional, mediante Resolución No. SNGR-238-2026, del 29 de agosto de 2026.
                </p>

                {shouldShowCoeSection && (
                  <div className="coe-activated-section">
                    <h3 className="coe-section-title">Comités de Operaciones de Emergencias (COE) activados:</h3>
                    <p className="coe-intro">
                      Desde el {formatDeclarationDate(desde)} hasta el {formatDeclarationDate(hasta)} se han activado los siguientes COE:
                    </p>

                    {coeNacionalActivo && (
                      <p className="coe-block-title">COE Nacional activo desde el {formatDeclarationDate(coeNacionalActivo.FechaInicial)}.</p>
                    )}

                    {coeProvincialesActivos.length > 0 && (
                      <div className="coe-block">
                        <h4>{formatInt(coeProvincialesActivos.length)} COE provinciales:</h4>
                        <div className="table-wrap coe-table-wrap coe-provincial-wrap">
                          <table className="coe-table coe-provincial-table">
                            <thead><tr>{COE_PROVINCIAL_COLS.map(([, label]) => <th key={`coe-p-${label}`}>{label}</th>)}</tr></thead>
                            <tbody>{coeProvincialesActivos.map((row, rowIndex) => (
                              <tr key={`coe-p-${rowIndex}`}>
                                {COE_PROVINCIAL_COLS.map(([key]) => (
                                  <td key={`coe-p-${rowIndex}-${key}`} className={key === 'Estado' ? 'coe-status-active' : ''}>
                                    {key === '__no__' ? rowIndex + 1 : key === 'FechaInicial' ? formatDeclarationDate(row?.[key]) : (row?.[key] ?? '--')}
                                  </td>
                                ))}
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {coeMunicipalesResumen.totalActive > 0 && (
                      <div className="coe-block">
                        <h4>
                          A nivel nacional, se registran {formatInt(coeMunicipalesResumen.totalActive)} COE Cantonales activos de un total de {formatInt(coeMunicipalesResumen.totalCantons)} cantones, lo que representa una activación global del {coeMunicipalesResumen.globalPercentage}%.
                        </h4>
                        <div className="table-wrap coe-table-wrap coe-municipal-wrap">
                          <table className="coe-table coe-municipal-table">
                            <thead><tr><th>Provincia</th><th>Total de Cantones</th><th>Nro. de COE Cantonales Activos</th><th>% de COE cantonales activos</th></tr></thead>
                            <tbody>
                              {coeMunicipalesResumen.rows.map((row) => (
                                <tr key={`coe-m-${row.Provincia}`}>
                                  <td>{row.Provincia}</td>
                                  <td>{formatInt(row.TotalCantones)}</td>
                                  <td>{formatInt(row.CantonesActivos)}</td>
                                  <td className={coeActivationClass(row.PorcentajeActivacion)}>{row.PorcentajeActivacion}%</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td>Total general</td>
                                <td>{formatInt(coeMunicipalesResumen.totalCantons)}</td>
                                <td>{formatInt(coeMunicipalesResumen.totalActive)}</td>
                                <td>{coeMunicipalesResumen.globalPercentage}%</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {copaeActivos.length > 0 && (
                      <div className="coe-block">
                        <h4>{formatInt(copaeActivos.length)} COE parroquiales:</h4>
                        <div className="table-wrap coe-table-wrap">
                          <table className="coe-table copae-table">
                            <thead><tr>{COPAE_COLS.map(([, label]) => <th key={`copae-${label}`}>{label}</th>)}</tr></thead>
                            <tbody>{copaeActivos.map((row, rowIndex) => (
                              <tr key={`copae-${rowIndex}`}>
                                {COPAE_COLS.map(([key]) => (
                                  <td key={`copae-${rowIndex}-${key}`} className={key === 'Estado' ? 'coe-status-active' : ''}>
                                    {key === '__no__' ? rowIndex + 1 : key === 'FechaInicial' ? formatDeclarationDate(row?.[key]) : (row?.[key] ?? '--')}
                                  </td>
                                ))}
                              </tr>
                            ))}</tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {tipo === 'lluvias' && eventosAltoImpactoItems.length > 0 && (
              <div className="high-impact-section">
                <div className="block-title pt-4">8. Eventos adversos de alto impacto</div>
                <p className="high-impact-intro">A continuación, se detallan los eventos adversos relevantes de los últimos días:</p>
                {eventosAltoImpactoPorZona.map(([zone, zoneItems]) => (
                  <div className="high-impact-zone" key={`zona-${zone}`}>
                    <h3>Zona {zone}</h3>
                    <ul className="high-impact-list">
                      {zoneItems.map((item, itemIndex) => {
                        const affectations = splitReportLines(item?.Afectaciones).map(formatAffectationLine)
                        const responseActions = String(item?.CoordinacionYRespuesta ?? '').trim()
                        return (
                          <li key={`impacto-${item?.EventoAdversoID ?? `${zone}-${itemIndex}`}`}>
                            <p className="high-impact-description">
                              <strong>{item?.Ubicacion || 'Ubicación no registrada'}.</strong>{' '}
                              {String(item?.Antecedentes ?? '').trim()}
                            </p>
                            {String(item?.SituacionActual ?? '').trim() && <p>{String(item.SituacionActual).trim()}</p>}
                            {affectations.length > 0 && (
                              <div className="high-impact-affectations">
                                {affectations.map((line, lineIndex) => <p key={`afectacion-${lineIndex}`}>- {line}.</p>)}
                              </div>
                            )}
                            {responseActions && <p className="high-impact-response">{responseActions}</p>}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {tipo === 'lluvias' && items.length > 0 && (
              <div className="impact-map-section sitrep-final-section">
                <div className="block-title pt-4">9. Mapa de Personas Impactadas por lluvias a Nivel Nacional</div>
                <div className="province-impact-section">
                  <div className="province-impact-comparison">
                    <div className="province-impact-map-panel">
                      <svg className="impact-map-svg" viewBox="0 0 600 600" role="img" aria-label="Mapa de personas impactadas por provincia">
                        {ECUADOR_PROVINCES.map((province) => {
                          const value = provinceImpactValue(provinceImpactSummary, province.name)
                          const fill = impactColor(value, provinceImpactSummary.maximum, value !== undefined).hex
                          return (
                            <g key={`mapa-${province.name}`}>
                              <path
                                d={provincePathData(province)}
                                fill={fill}
                                fillRule="evenodd"
                                stroke="#3f4b3f"
                                strokeWidth="1.1"
                              />
                              <text className="impact-map-label" x={province.label[0]} y={province.label[1]}>
                                {shortProvinceLabel(province.name)}
                              </text>
                            </g>
                          )
                        })}
                      </svg>
                    </div>
                  </div>

                  <div className="province-impact-scale">
                    <strong>Escala de afectación (Población impactada)</strong>
                    <div className="province-impact-scale-items">
                      {impactLegend().map((entry) => (
                        <div key={`escala-${entry.level}`}>
                          <span style={{ background: entry.color.hex }} />
                          <small>{entry.label}</small>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="impact-map-credit">SitRep generado por la Dirección de Monitoreo de Eventos Adversos de la Secretaría Nacional de Gestión de Riesgos.</p>
                <div className="sitrep-signoffs">
                  <div>
                    <h4>SitRep elaborado por:</h4>
                    <p><strong>Nombre:</strong> {analystName.trim() || 'Pendiente de ingresar'}</p>
                    <p><strong>Correo electrónico:</strong> {analystEmail.trim() || 'Pendiente de ingresar'}</p>
                    <p><strong>Teléfono:</strong> 04 2593500 ext. 1602</p>
                  </div>
                  <div>
                    <h4>SitRep aprobado por:</h4>
                    <p><strong>Nombre:</strong> Stalin Jiménez - Director de Monitoreo de Eventos Adversos</p>
                    <p><strong>Correo electrónico:</strong> director.monitoreo@gestionderiesgos.gob.ec</p>
                    <p><strong>Teléfono:</strong> 04 2593500 ext. 1602</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {showWhatsAppModal && (
          <div className="whatsapp-modal-backdrop" role="presentation" onMouseDown={() => setShowWhatsAppModal(false)}>
            <section
              className="whatsapp-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="whatsapp-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="whatsapp-modal-header">
                <h2 id="whatsapp-modal-title">Mensaje para WhatsApp</h2>
                <button type="button" className="whatsapp-modal-close" aria-label="Cerrar" onClick={() => setShowWhatsAppModal(false)}>×</button>
              </div>
              <p>El mensaje está generado con los datos de las tablas de cuerpos hídricos.</p>
              <textarea className="whatsapp-message-text" readOnly value={whatsAppWaterMessage} aria-label="Mensaje de cuerpos hídricos para WhatsApp" />
              <div className="whatsapp-modal-actions">
                <button type="button" onClick={onCopyWhatsAppMessage}>Copiar mensaje</button>
                <button type="button" className="secondary" onClick={() => setShowWhatsAppModal(false)}>Cerrar</button>
              </div>
              {whatsAppCopyStatus && <p className="whatsapp-copy-status" aria-live="polite">{whatsAppCopyStatus}</p>}
            </section>
          </div>
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
