import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  HeadingLevel,
  ImageRun,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextDirection,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { buildMunicipalCoeSummary, uniqueActiveCoeRows } from './coeConfig.js'
import {
  buildProvinceImpactMap,
  ECUADOR_PROVINCES,
  impactColor,
  impactLegend,
  provinceImpactValue,
  shortProvinceLabel,
} from './impactMap.js'

const COLORS = {
  navy: '1F3C69',
  darkNavy: '052B67',
  blue: '265499',
  pale: 'DAE3F4',
  alternate: 'E0E7F4',
  orange: 'EF7024',
  lightOrange: 'FCE8DA',
  gray: '808080',
  line: 'CDCDCD',
  black: '141414',
  white: 'FFFFFF',
  red: 'FF3150',
  yellow: 'FFE063',
  green: '42BA3C',
}

const PAGE_WIDTH_DXA = 11906
const PAGE_MARGIN_LEFT_DXA = 1135
const PAGE_MARGIN_RIGHT_DXA = 1020
const CONTENT_WIDTH_DXA = 9750
const FONT = 'Barlow Condensed'
const BORDERLESS = Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
  .map((side) => [side, { style: BorderStyle.NONE, size: 0, color: COLORS.white }]))

const EVENT_TYPES = [
  ['Inundacion', 'Inundación'], ['Deslizamiento', 'Deslizamiento'], ['Lluvias_Intensas', 'Lluvias intensas'],
  ['Erosion_Hidrica', 'Erosión hídrica'], ['Hundimiento', 'Hundimiento'], ['Aluvion', 'Aluvión (flujos)'],
  ['Vendaval', 'Vendaval'], ['Caidas_Colapso', 'Caídas (colapso)'], ['Tormenta_Electrica', 'Tormenta eléctrica'],
  ['Granizada', 'Granizada'], ['Reptacion', 'Reptación'], ['Avalancha', 'Avalancha'], ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso humedad'], ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso infraestructura'],
].map(([key, label]) => ({ key, label }))

const SINGLE_LINE_DETAIL_KEYS = new Set([
  'ImpactadasPersonas',
  'AfectadosPersonas',
  'DamnificadosPersonas',
  'AfectadosFamilias',
  'AfectadosViviendas',
  'AfectadosKilometros',
  'AfectadosMetros',
  'AfectadosHectareas',
  'PerdidosHectareas',
])

const DETAIL_COLUMNS = [
  ['Provincia', 'Provincia', 'text'], ['NumeroEventos', 'Nro. de eventos', 'number'],
  ['ImpactadasPersonas', 'Personas impactadas', 'number'], ['Extraviados', 'Personas extraviadas', 'number'],
  ['Fallecidos', 'Personas fallecidas', 'number'], ['Heridos', 'Personas heridas', 'number'],
  ['AfectadosPersonas', 'Personas afectadas', 'number'], ['DamnificadosPersonas', 'Personas damnificadas', 'number'],
  ['AfectadosFamilias', 'Familias afectadas', 'number'], ['DamnificadosFamilias', 'Familias damnificadas', 'number'],
  ['AfectadosViviendas', 'Viviendas afectadas', 'number'], ['DestruidosViviendas', 'Viviendas destruidas', 'number'],
  ['AfectadosPuentes', 'Puentes afectados', 'number'], ['DestruidosPuentes', 'Puentes destruidos', 'number'],
  ['AfectadosPrivados', 'Bienes privados afectados', 'number'], ['DestruidosPrivados', 'Bienes privados destruidos', 'number'],
  ['AfectadosPublicos', 'Bienes públicos afectados', 'number'], ['DestruidosPublicos', 'Bienes públicos destruidos', 'number'],
  ['AfectadosEducativos', 'Centros educativos afectados', 'number'], ['DestruidosEducativos', 'Centros educativos destruidos', 'number'],
  ['FuncionalEducativos', 'Centros educativos funcionales', 'number'], ['AfectadosSalud', 'Centros de salud afectados', 'number'],
  ['DestruidosSalud', 'Centros de salud destruidos', 'number'], ['Evacuados', 'Evacuados', 'number'],
  ['AfectadosKilometros', 'Km vías afectadas', 'decimal'], ['AfectadosMetros', 'Metros vías afectadas', 'decimal'],
  ['AfectadosHectareas', 'Hectáreas afectadas', 'decimal'], ['PerdidosHectareas', 'Hectáreas perdidas', 'decimal'],
  ['QuemadasHectareas', 'Hectáreas quemadas', 'decimal'], ['AfectadosAnimales', 'Animales afectados', 'number'],
  ['MuertosAnimales', 'Animales muertos', 'number'],
].map(([key, label, type]) => ({ key, label, type, singleLine: SINGLE_LINE_DETAIL_KEYS.has(key) }))

const INDICATORS = [
  ['ImpactadasPersonas', 'Personas Impactadas', 'Afectación a Personas', 'total personas.png'],
  ['Extraviados', 'Personas Extraviadas', 'Afectación a Personas', '03 personas desaparecidas2.png'],
  ['Fallecidos', 'Personas Fallecidas', 'Afectación a Personas', '01 persona fallecida.png'],
  ['Heridos', 'Personas Heridas', 'Afectación a Personas', '02 personas heridas.png'],
  ['AfectadosPersonas', 'Personas Afectadas', 'Afectación a Personas', '04 personas afectadas.png'],
  ['DamnificadosPersonas', 'Personas Damnificadas', 'Afectación a Personas', '06 personas damnificadas.png'],
  ['AfectadosFamilias', 'Familias Afectadas', 'Afectación a Personas', '05 familias afectadas.png'],
  ['DamnificadosFamilias', 'Familias Damnificadas', 'Afectación a Personas', '07 familias damnificadas.png'],
  ['Evacuados', 'Evacuados', 'Afectación a Personas', 'personas evacuadas.png'],
  ['AfectadosViviendas', 'Viviendas Afectadas', 'Afectación a Viviendas', 'vivienda afectada.png'],
  ['DestruidosViviendas', 'Viviendas Destruidas', 'Afectación a Viviendas', 'vivienda destruida.png'],
  ['AfectadosKilometros', 'Km Vías Afectadas', 'Afectación a servicios básicos esenciales e infraestructura', 'metros vias afectados.png', true],
  ['AfectadosMetros', 'Metros Vías Afectadas', 'Afectación a servicios básicos esenciales e infraestructura', 'metros vias afectados.png', true],
  ['AfectadosPuentes', 'Puentes Afectados', 'Afectación a servicios básicos esenciales e infraestructura', 'puente afectado.png'],
  ['DestruidosPuentes', 'Puentes Destruidos', 'Afectación a servicios básicos esenciales e infraestructura', 'puente destruido.png'],
  ['AfectadosPrivados', 'Bienes Privados Afectados', 'Afectación a servicios básicos esenciales e infraestructura', 'bienes privados afectados3.png'],
  ['DestruidosPrivados', 'Bienes Privados Destruidos', 'Afectación a servicios básicos esenciales e infraestructura', 'bienes privados destruidos.png'],
  ['AfectadosPublicos', 'Bienes Públicos Afectados', 'Afectación a servicios básicos esenciales e infraestructura', 'Infraestructura pública afectada.png'],
  ['DestruidosPublicos', 'Bienes Públicos Destruidos', 'Afectación a servicios básicos esenciales e infraestructura', 'Infraestructura pública destruida.png'],
  ['AfectadosEducativos', 'Centros Educativos Afectados', 'Infraestructura sectorial', 'establecimiento educativo afectado.png'],
  ['DestruidosEducativos', 'Centros Educativos Destruidos', 'Infraestructura sectorial', 'establecimiento educativo destruido.png'],
  ['FuncionalEducativos', 'Centros Educativos Funcionales', 'Infraestructura sectorial', 'educacion_mtt5.png'],
  ['AfectadosSalud', 'Centros Salud Afectados', 'Infraestructura sectorial', 'establecimiento de salud afectados.png'],
  ['DestruidosSalud', 'Centros Salud Destruidos', 'Infraestructura sectorial', 'establecimiento de salud destruidos.png'],
  ['AfectadosHectareas', 'Hectáreas Afectadas', 'Afectaciones a medios de vida', 'hectareas cob vegetal afectadas2.png', true],
  ['PerdidosHectareas', 'Hectáreas Perdidas', 'Afectaciones a medios de vida', 'hectareas cob vegetal destruidas 2.png', true],
  ['QuemadasHectareas', 'Hectáreas Quemadas', 'Afectaciones a medios de vida', 'hectareas cob vegetal afectadas2 2.png', true],
  ['AfectadosAnimales', 'Animales Afectados', 'Afectaciones a medios de vida', 'animales afectados.png'],
  ['MuertosAnimales', 'Animales Muertos', 'Afectaciones a medios de vida', 'animales muertos.png'],
].map(([key, label, group, icon, decimal = false]) => ({ key, label, group, icon, decimal }))

const GROUPS = ['Afectación a Personas', 'Afectación a Viviendas',
  'Afectación a servicios básicos esenciales e infraestructura', 'Infraestructura sectorial', 'Afectaciones a medios de vida']

const REQUIRED_POINTS = [
  [
    ['Mediante Informe Técnico Ejecutivo ', false], ['ERFEN ', true],
    ['Nro. 007-2026, del 28 de agosto 2026, el Comité Nacional ERFEN (CN-ERFEN) declaró oficialmente el evento El Niño en el país. ', true],
    ['Con base a este antecedente, la ', false], ['SNGR ', true], ['emitió, el 29 de agosto de 2026, la declaratoria por nivel de ', false],
    { text: 'ALERTA ROJA ', bold: true, color: COLORS.white, shading: { fill: COLORS.red, type: ShadingType.CLEAR, color: 'auto' } },
    ['a nivel nacional, con base a la ', false], ['Resolución Nro. SNGR-238-2026.', true],
  ],
  [
    ['Durante los primeros días de octubre, ', false], ['INAMHI ', true],
    ['informó que, de acuerdo con las proyecciones realizadas sobre la evolución de las lluvias asociadas al ', false],
    ['El Niño, el Ecuador ', true], ['ingresó a una etapa inicial de transición y acoplamiento atmosférico, en respuesta a las condiciones cálidas presentes en el Pacífico.', false],
  ],
]

function n(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value ?? '').trim()
  const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function fmt(value, decimals = false) {
  const number = n(value)
  const useDecimals = decimals || !Number.isInteger(number)
  return number.toLocaleString('es-EC', { minimumFractionDigits: useDecimals ? 2 : 0, maximumFractionDigits: useDecimals ? 2 : 0 })
}

function fmtInteger(value) {
  return n(value).toLocaleString('es-EC', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pct(value) {
  return `${n(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function sum(items, key) {
  return items.reduce((total, row) => total + n(row?.[key]), 0)
}

function has(items, key) {
  return items.some((row) => row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== '')
}

function unique(items, keys) {
  return new Set(items.map((row) => keys.map((key) => row?.[key]).find((value) => String(value ?? '').trim()))
    .filter((value) => String(value ?? '').trim()).map(String)).size
}

function humanize(key) {
  return String(key).replaceAll('_', ' ').replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2').trim()
}

function localDate(value, fallback) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(value || ''))
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)) : fallback
}

function periodMetadata(publishedAt, sitrepNumber, startDate, endDate) {
  const start = localDate(startDate, new Date(publishedAt.getFullYear(), 0, 1))
  const end = localDate(endDate, publishedAt)
  const longOptions = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
  const numericOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }
  const sourceDate = end.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const sourceTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  return {
    year: end.getFullYear(),
    startLong: start.toLocaleString('es-EC', longOptions),
    endLong: end.toLocaleString('es-EC', longOptions),
    startNumeric: start.toLocaleString('es-EC', numericOptions),
    endNumeric: end.toLocaleString('es-EC', numericOptions),
    title: `${sitrepNumber ? `SitRep ${sitrepNumber}` : 'SitRep'} – Lluvias con incidencia del Evento El Niño, del 29 de agosto de 2026 a la fecha`,
    coverage: `Este informe cubre el período desde el ${start.toLocaleString('es-EC', numericOptions)} hasta el ${end.toLocaleString('es-EC', numericOptions)}`,
    source: `Fuente: Unidades de Monitoreo SNGR - Instituciones del SNDGIRD. ${sourceDate} - ${sourceTime}`,
  }
}

function assetUrl(folder, file, baseUrl) {
  const productionBase = import.meta.env?.VITE_API_ENV === 'prod' ? import.meta.env?.VITE_API_PROD_URL : ''
  const base = baseUrl || import.meta.env?.VITE_ASSET_BASE_URL || productionBase || import.meta.env?.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/${folder}/${encodeURIComponent(file)}`
}

async function imageData(url, maxDimension = null) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar el recurso Word: ${url}`)
  const blob = await response.blob()
  if (maxDimension && typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/png')
  }
  return new Uint8Array(await blob.arrayBuffer())
}

function textRun(text, bold = false, options = {}) {
  return new TextRun({
    text: String(text ?? ''), bold, font: FONT, size: options.size || 18,
    color: options.color || COLORS.black, italics: options.italics, shading: options.shading,
  })
}

function paragraphFromSegments(segments, options = {}) {
  return new Paragraph({
    children: segments.map((segment) => textRun(segment.text ?? segment[0], segment.bold ?? segment[1], segment)),
    alignment: options.alignment || AlignmentType.JUSTIFIED,
    spacing: { before: options.before || 0, after: options.after ?? 100, line: options.line || 250 },
    keepNext: options.keepNext,
    bullet: options.bullet ? { level: 0 } : undefined,
  })
}

function sectionTitle(number, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [textRun(`${number}. ${title}`, false, { size: 26, color: COLORS.blue })],
    spacing: { before: 160, after: 100 },
    border: { bottom: { color: COLORS.navy, style: BorderStyle.SINGLE, size: 7, space: 4 } },
    keepNext: true,
  })
}

function subsectionTitle(title, color = COLORS.darkNavy) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [textRun(title, true, { size: 20, color })],
    spacing: { before: 130, after: 70 },
    keepNext: true,
  })
}

function sourceLine(metadata, note = '') {
  return new Paragraph({
    children: [textRun(`${metadata.source}${note}`, true, { size: 12 })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 70, after: 120 },
  })
}

function proportionalWidths(columns, total = CONTENT_WIDTH_DXA, firstWide = false) {
  const weights = columns.map((column, index) => {
    if (column.width) return column.width
    if (firstWide && index === 0) return 2.3
    if (/observaci|descripci|anteced|situaci|coordinaci|ubicaci|provincia/i.test(`${column.key} ${column.label}`)) return 2.4
    if (/fecha|nombre|parroquia|cant[oó]n/i.test(`${column.key} ${column.label}`)) return 1.45
    return 1
  })
  const weightTotal = weights.reduce((acc, value) => acc + value, 0)
  const widths = weights.map((value) => Math.floor(total * value / weightTotal))
  widths[widths.length - 1] += total - widths.reduce((acc, value) => acc + value, 0)
  return widths
}

function keepNumericValueTogether(value) {
  return String(value).replace(/([.,])/g, '\u2060$1\u2060')
}

function detailTableWidths(columns, rows) {
  const protectedWidths = columns.map((column) => {
    if (!column.singleLine) return null
    const longestValue = rows.reduce((longest, row, rowIndex) => {
      const raw = row?.[column.key]
      const formatted = column.format ? column.format(raw, row, rowIndex) : String(raw ?? '')
      return Math.max(longest, String(formatted).length)
    }, 1)
    return Math.max(320, longestValue * 52 + 100)
  })
  const protectedTotal = protectedWidths.reduce((total, width) => total + (width || 0), 0)
  const flexibleWeights = columns.map((column, index) => {
    if (protectedWidths[index]) return 0
    if (column.key === '__no__') return 0.55
    if (column.key === 'Provincia') return 1.8
    return 1
  })
  const flexibleWeightTotal = flexibleWeights.reduce((total, weight) => total + weight, 0)
  const flexibleSpace = Math.max(0, CONTENT_WIDTH_DXA - protectedTotal)
  const widths = columns.map((_column, index) => protectedWidths[index]
    || Math.floor(flexibleSpace * flexibleWeights[index] / flexibleWeightTotal))
  widths[widths.length - 1] += CONTENT_WIDTH_DXA - widths.reduce((total, width) => total + width, 0)
  return widths
}

function verticalHeaderContentHeight(columns, fontSize) {
  const labels = columns.map((column) => String(column.label || ''))
  const fontPixels = fontSize * 2 / 3
  let contentPixels
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    context.font = `600 ${fontPixels}px "${FONT}", "Arial Narrow", Arial, sans-serif`
    contentPixels = Math.max(...labels.map((label) => context.measureText(label).width))
  } else {
    contentPixels = Math.max(...labels.map((label) => label.length)) * fontPixels * 0.55
  }
  return Math.ceil((contentPixels + 10) * 15)
}

function tableCell(value, options = {}) {
  const children = Array.isArray(value)
    ? value
    : [new Paragraph({
      children: [textRun(value, options.bold, { size: options.fontSize || 14, color: options.color || COLORS.black })],
      alignment: options.alignment || AlignmentType.CENTER,
      spacing: { before: 0, after: 0, line: 210 },
    })]
  return new TableCell({
    children,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    shading: options.fill ? { fill: options.fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    textDirection: options.textDirection,
    margins: options.margins || { top: 70, bottom: 70, left: 75, right: 75 },
  })
}

function indicatorBand(title) {
  return new Table({
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        children: [new Paragraph({
          children: [textRun(title, false, { size: 20, color: COLORS.navy })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 22, after: 22 },
        })],
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        shading: { fill: COLORS.pale, type: ShadingType.CLEAR, color: 'auto' },
        borders: BORDERLESS,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        verticalAlign: VerticalAlign.CENTER,
      })],
    })],
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH_DXA],
    layout: TableLayoutType.FIXED,
    borders: BORDERLESS,
  })
}

function indicatorCell(item, assets, width = CONTENT_WIDTH_DXA / 2) {
  if (!item) return new TableCell({
    children: [new Paragraph({ spacing: { before: 0, after: 0 } })],
    width: { size: width, type: WidthType.DXA },
    borders: BORDERLESS,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
  })

  const iconWidth = 650
  const labelWidth = 2760
  const valueWidth = width - iconWidth - labelWidth
  const icon = assets.icons?.[item.icon]
  const iconParagraph = new Paragraph({
    children: icon ? [new ImageRun({ type: 'png', data: icon, transformation: { width: 27, height: 27 } })] : [],
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
  })
  const content = new Table({
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          children: [iconParagraph], width: { size: iconWidth, type: WidthType.DXA }, borders: BORDERLESS,
          margins: { top: 25, bottom: 25, left: 20, right: 30 }, verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({
            children: [textRun(`${item.label}:`, false, { size: 18, color: COLORS.orange })],
            alignment: AlignmentType.LEFT, spacing: { before: 0, after: 0 },
          })],
          width: { size: labelWidth, type: WidthType.DXA }, borders: BORDERLESS,
          margins: { top: 25, bottom: 25, left: 0, right: 20 }, verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({
            children: [textRun(fmt(item.value, item.decimal), true, { size: 22, color: COLORS.navy })],
            alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 0 },
          })],
          width: { size: valueWidth, type: WidthType.DXA }, borders: BORDERLESS,
          margins: { top: 25, bottom: 25, left: 15, right: 100 }, verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    })],
    width: { size: width, type: WidthType.DXA },
    columnWidths: [iconWidth, labelWidth, valueWidth],
    layout: TableLayoutType.FIXED,
    borders: BORDERLESS,
  })

  return new TableCell({
    children: [content],
    width: { size: width, type: WidthType.DXA },
    borders: BORDERLESS,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    verticalAlign: VerticalAlign.CENTER,
  })
}

function dataTable(columns, rows, options = {}) {
  if (!columns.length) return null
  const widths = options.widths || proportionalWidths(columns, CONTENT_WIDTH_DXA, options.firstWide)
  const hasVerticalHeaders = Boolean(options.verticalHeaders)
  const headerFontSize = options.headerFontSize || (hasVerticalHeaders ? 12 : 13)
  const header = new TableRow({
    tableHeader: true,
    height: hasVerticalHeaders
      ? { value: options.verticalHeaderHeight || verticalHeaderContentHeight(columns, headerFontSize), rule: HeightRule.ATLEAST }
      : undefined,
    children: columns.map((column, index) => {
      const verticalHeader = typeof options.verticalHeaders === 'function'
        ? options.verticalHeaders(column, index)
        : options.verticalHeaders
      return tableCell(column.label, {
        width: widths[index], bold: true, fill: options.headerFill || COLORS.navy, color: COLORS.white,
        fontSize: headerFontSize,
        textDirection: verticalHeader ? TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT : undefined,
        margins: options.headerMargins,
      })
    }),
  })
  const body = rows.map((row, rowIndex) => new TableRow({
    cantSplit: true,
    children: columns.map((column, columnIndex) => {
      const raw = Array.isArray(row) ? row[columnIndex] : row?.[column.key]
      const formatted = column.format ? column.format(raw, row, rowIndex) : String(raw ?? '')
      const displayed = column.singleLine ? keepNumericValueTogether(formatted) : formatted
      const isTotal = options.totalRowIndex === rowIndex
      return tableCell(displayed, {
        width: widths[columnIndex],
        bold: isTotal || column.bold || ['number', 'decimal'].includes(column.type),
        fill: isTotal ? COLORS.navy : (rowIndex % 2 ? COLORS.alternate : COLORS.white),
        color: isTotal ? COLORS.white : COLORS.black,
        fontSize: options.fontSize || 13,
        alignment: column.align || (column.type === 'text' ? AlignmentType.LEFT : AlignmentType.CENTER),
        margins: options.cellMargins,
      })
    }),
  }))
  return new Table({
    rows: [header, ...body],
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    margins: { top: 70, bottom: 70, left: 75, right: 75 },
    borders: Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
      .map((side) => [side, { color: COLORS.line, style: BorderStyle.SINGLE, size: 3 }])),
  })
}

function verticalDataHeader(column) {
  return Boolean(column)
}

function addTable(children, table) {
  if (table) children.push(table, new Paragraph({ spacing: { after: 70 } }))
}

function detectColumns(items, priority = []) {
  const keys = [...new Set(items.flatMap((row) => Object.keys(row || {})))]
  return [...priority.filter((key) => keys.includes(key)), ...keys.filter((key) => !priority.includes(key))]
    .filter((key) => {
      const values = items.map((row) => row?.[key]).filter((value) => String(value ?? '').trim())
      const numeric = values.length && values.every((value) => Number.isFinite(Number(String(value).replace(',', '.'))))
      return values.length && (!numeric || sum(items, key) !== 0)
    }).map((key) => {
      const values = items.map((row) => row?.[key]).filter((value) => String(value ?? '').trim())
      const numeric = values.length && values.every((value) => Number.isFinite(Number(String(value).replace(',', '.'))))
      return { key, label: humanize(key), type: numeric ? 'number' : 'text', format: numeric ? (value) => fmt(value) : undefined }
    })
}

function importantPoints({ items, tipoLluviasItems, asistenciaItems, dpaTotals, metadata }) {
  const points = []
  const total = sum(tipoLluviasItems, 'NumeroEventos') || sum(items, 'NumeroEventos')
  const types = EVENT_TYPES.map((type) => ({ ...type, total: sum(tipoLluviasItems, type.key) }))
    .filter((type) => type.total > 0).sort((a, b) => b.total - a.total).slice(0, 5)
  if (total > 0) {
    const provinces = Number.isFinite(Number(dpaTotals?.TotalProvincias)) ? Number(dpaTotals.TotalProvincias) : unique(items, ['Provincia'])
    const cantons = Number.isFinite(Number(dpaTotals?.TotalCantones)) ? Number(dpaTotals.TotalCantones) : unique(items, ['Canton', 'CantonNombre'])
    const parishes = Number.isFinite(Number(dpaTotals?.TotalParroquias)) ? Number(dpaTotals.TotalParroquias) : unique(items, ['Parroquia', 'ParroquiaNombre'])
    points.push([
      ['Desde el 1 de enero de 2026 a las 00:00 hasta la fecha, se han registrado ', false], [`${fmt(total)} eventos adversos por lluvias`, true],
      [` afectando a ${fmt(provinces)} provincias, ${fmt(cantons)} cantones y ${fmt(parishes)} parroquias. `, false],
      ['Los eventos más recurrentes corresponden a: ', false],
      [types.map((type) => `${type.label.toLowerCase()} (${pct(type.total / total * 100)})`).join(', ') + '.', true],
    ])
  }
  const top = items.map((row) => ({ provincia: String(row?.Provincia || '').trim(), impactadas: n(row?.ImpactadasPersonas), eventos: n(row?.NumeroEventos) }))
    .filter((row) => row.provincia && (row.impactadas || row.eventos)).sort((a, b) => b.impactadas - a.impactadas || b.eventos - a.eventos).slice(0, 8)
  if (top.length) points.push([[`En lo que va del año ${metadata.year}, las provincias con mayor impacto a la población son: `, false], [`${top.map((row) => row.provincia).join(', ')}.`, true]])
  if (has(items, 'ImpactadasPersonas')) points.push([['En total, los eventos reportados impactaron a ', false], [`${fmt(sum(items, 'ImpactadasPersonas'))} personas.`, true]])
  const goods = sum(asistenciaItems, 'Total Bienes')
  if (goods > 0) points.push([['La SNGR ha entregado a la población un total de ', false], [`${fmt(goods)} bienes de asistencia humanitaria.`, true]])
  return points
}

function indicatorGroups(items, viasItems) {
  const grouped = new Map(GROUPS.map((group) => [group, []]))
  INDICATORS.forEach((item) => {
    const value = sum(items, item.key)
    if (has(items, item.key) && value !== 0) grouped.get(item.group).push({ ...item, value })
  })
  const infrastructure = grouped.get('Afectación a servicios básicos esenciales e infraestructura')
  viasItems.map((row) => ({ label: String(row?.['Categoria de Vía'] || row?.Categoria || row?.categoria || '').trim(), value: n(row?.Kilometros || row?.kilometros) }))
    .filter((row) => row.label && row.value !== 0).reverse().forEach((row) => infrastructure.unshift({ ...row, icon: 'metros vias afectados.png', decimal: true }))
  return GROUPS.map((name) => ({ name, items: grouped.get(name) })).filter((group) => group.items.length)
}

function declarationDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw)
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replaceAll('.', '')
}

function reportLines(value) {
  return String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function affectationText(value) {
  const [label, ...amountParts] = String(value ?? '').split('=')
  return amountParts.length ? `${amountParts.join('=').trim()} ${label.trim()}` : String(value ?? '').trim()
}

function chartImage(rows, title, firstKey, secondKey, firstLabel, secondLabel) {
  if (typeof document === 'undefined' || !rows.length) return null
  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = 700
  const context = canvas.getContext('2d')
  const plot = { x: 95, y: 80, width: 1210, height: 390 }
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#808080'
  context.font = '32px Arial Narrow, Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText(title, canvas.width / 2, 42)
  const maxFirst = Math.max(1, ...rows.map((row) => n(row[firstKey])))
  const maxSecond = Math.max(1, ...rows.map((row) => n(row[secondKey])))
  context.font = '17px Arial Narrow, Arial, sans-serif'
  for (let index = 0; index <= 4; index += 1) {
    const y = plot.y + plot.height - plot.height * index / 4
    context.strokeStyle = '#E1E1E1'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(plot.x, y)
    context.lineTo(plot.x + plot.width, y)
    context.stroke()
    context.fillStyle = '#777777'
    context.textAlign = 'right'
    context.fillText(fmt(Math.round(maxFirst * index / 4)), plot.x - 10, y + 5)
    context.textAlign = 'left'
    context.fillText(fmt(Math.round(maxSecond * index / 4)), plot.x + plot.width + 10, y + 5)
  }
  const slot = plot.width / rows.length
  const points = []
  rows.forEach((row, index) => {
    const centerX = plot.x + slot * index + slot / 2
    const barHeight = n(row[firstKey]) / maxFirst * plot.height
    context.fillStyle = '#4572BE'
    context.fillRect(centerX - Math.max(8, slot * 0.22), plot.y + plot.height - barHeight, Math.max(16, slot * 0.44), barHeight)
    context.fillStyle = '#59616B'
    context.font = 'bold 17px Arial Narrow, Arial, sans-serif'
    context.textAlign = 'center'
    context.fillText(fmt(row[firstKey]), centerX, Math.max(plot.y + 16, plot.y + plot.height - barHeight - 7))
    points.push([centerX, plot.y + plot.height - n(row[secondKey]) / maxSecond * plot.height])
    context.save()
    context.translate(centerX + 3, plot.y + plot.height + 42)
    context.rotate(-Math.PI / 3)
    context.font = 'bold 15px Arial Narrow, Arial, sans-serif'
    context.textAlign = 'right'
    context.fillText(String(row.label || ''), 0, 0)
    context.restore()
  })
  context.strokeStyle = '#EF7024'
  context.lineWidth = 4
  context.beginPath()
  points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y))
  context.stroke()
  points.forEach(([x, y], index) => {
    context.fillStyle = '#EF7024'
    context.beginPath()
    context.arc(x, y, 6, 0, Math.PI * 2)
    context.fill()
    context.font = 'bold 17px Arial Narrow, Arial, sans-serif'
    context.textAlign = 'center'
    const label = fmt(rows[index][secondKey])
    const labelY = Math.min(plot.y + plot.height + 25, y + 28)
    const labelWidth = context.measureText(label).width + 10
    context.fillStyle = '#EF7024'
    context.fillRect(x - labelWidth / 2, labelY - 18, labelWidth, 23)
    context.fillStyle = '#FFFFFF'
    context.fillText(label, x, labelY)
  })
  context.font = '18px Arial Narrow, Arial, sans-serif'
  context.fillStyle = '#4572BE'
  context.fillRect(450, 654, 28, 13)
  context.fillStyle = '#666666'
  context.textAlign = 'left'
  context.fillText(firstLabel, 490, 667)
  context.strokeStyle = '#EF7024'
  context.lineWidth = 4
  context.beginPath()
  context.moveTo(770, 661)
  context.lineTo(810, 661)
  context.stroke()
  context.fillText(secondLabel, 825, 667)
  return canvas.toDataURL('image/png')
}

function provinceMapImage(items) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 900
  canvas.height = 900
  const context = canvas.getContext('2d')
  const summary = buildProvinceImpactMap(items)
  context.fillStyle = '#FFFFFF'
  context.fillRect(0, 0, canvas.width, canvas.height)
  const scale = 1.28
  const offsetX = 35
  const offsetY = 18
  ECUADOR_PROVINCES.forEach((province) => {
    const value = provinceImpactValue(summary, province.name)
    context.fillStyle = impactColor(value, summary.maximum, value !== undefined).hex
    context.strokeStyle = '#5F6B7A'
    context.lineWidth = 1.4
    province.paths.forEach((polygon) => {
      const ring = polygon[0] || []
      if (ring.length < 3) return
      context.beginPath()
      ring.forEach(([x, y], index) => {
        const px = offsetX + x * scale
        const py = offsetY + y * scale
        if (index === 0) context.moveTo(px, py)
        else context.lineTo(px, py)
      })
      context.closePath()
      context.fill()
      context.stroke()
    })
  })
  context.fillStyle = '#263242'
  context.textAlign = 'center'
  ECUADOR_PROVINCES.forEach((province) => {
    const [x, y] = province.label
    context.font = `bold ${province.name === 'Santo Domingo de los Tsáchilas' ? 9 : 12}px Arial Narrow, Arial, sans-serif`
    context.fillText(shortProvinceLabel(province.name), offsetX + x * scale, offsetY + y * scale)
  })
  const legend = impactLegend()
  context.fillStyle = 'rgba(255,255,255,0.94)'
  context.strokeStyle = '#8FB1D8'
  context.fillRect(585, 610, 285, 210)
  context.strokeRect(585, 610, 285, 210)
  context.fillStyle = '#1F3C69'
  context.textAlign = 'left'
  context.font = 'bold 15px Arial Narrow, Arial, sans-serif'
  context.fillText('Escala de afectación', 602, 637)
  legend.forEach((entry, index) => {
    const y = 657 + index * 25
    context.fillStyle = entry.color.hex
    context.fillRect(603, y, 32, 17)
    context.strokeStyle = '#D5DDE8'
    context.strokeRect(603, y, 32, 17)
    context.fillStyle = '#1F3C69'
    context.font = '13px Arial Narrow, Arial, sans-serif'
    context.fillText(entry.label, 644, y + 14)
  })
  return canvas.toDataURL('image/png')
}

function addGenericTable(children, items, priority = [], total = false, options = {}) {
  if (!items.length) return
  const columns = detectColumns(items, priority)
    .filter((column) => !options.excludeKeys?.includes(column.key))
  const rows = [...items]
  if (total) {
    rows.push(Object.fromEntries(columns.map((column, index) => [column.key, column.type === 'number' ? sum(items, column.key) : index === 0 ? 'Total general' : ''])))
  }
  addTable(children, dataTable(columns, rows, {
    ...options,
    totalRowIndex: total ? rows.length - 1 : -1,
    fontSize: columns.length > 10 ? 10 : 13,
  }))
}

function buildHeader(assets, publishedAt) {
  const publication = publishedAt.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = publishedAt.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
  const left = new Paragraph({ children: [new ImageRun({ type: 'png', data: assets.headerLogo, transformation: { width: 136, height: 69 } })] })
  const right = new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [
      textRun('Secretaría Nacional\nDe Gestión de Riesgos\nDirección de Monitoreo de Eventos Adversos', true, { size: 18, color: '273191' }),
      textRun(`\nFecha y hora de publicación: ${publication} - ${time} / Página `, false, { size: 10, color: '9B9B9B' }),
      PageNumber.CURRENT, textRun(' de ', false, { size: 10, color: '9B9B9B' }), PageNumber.TOTAL_PAGES,
    ],
  })
  return new Header({ children: [new Table({
    rows: [new TableRow({ children: [tableCell([left], { width: 3200 }), tableCell([right], { width: 6550 })] })],
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA }, columnWidths: [3200, 6550], layout: TableLayoutType.FIXED,
    borders: Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map((side) => [side, { style: BorderStyle.NONE, size: 0, color: COLORS.white }])),
  })] })
}

function buildFooter(assets) {
  return new Footer({ children: [new Paragraph({
    alignment: AlignmentType.CENTER,
    indent: { left: -PAGE_MARGIN_LEFT_DXA, right: -PAGE_MARGIN_RIGHT_DXA },
    spacing: { before: 0, after: 0 },
    children: [new ImageRun({ type: 'png', data: assets.footer, transformation: { width: 793, height: 103 } })],
  })] })
}

function fittedImageSize(aspectRatio, maxWidth, maxHeight) {
  const safeAspectRatio = Number(aspectRatio) > 0 ? Number(aspectRatio) : 1
  let width = maxWidth
  let height = Math.round(width / safeAspectRatio)
  if (height > maxHeight) {
    height = maxHeight
    width = Math.round(height * safeAspectRatio)
  }
  return { width: Math.max(1, width), height: Math.max(1, height) }
}

function roundedRectPath(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + safeRadius, y)
  context.lineTo(x + width - safeRadius, y)
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius)
  context.lineTo(x + width, y + height - safeRadius)
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height)
  context.lineTo(x + safeRadius, y + height)
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius)
  context.lineTo(x, y + safeRadius)
  context.quadraticCurveTo(x, y, x + safeRadius, y)
  context.closePath()
}

function affectationLevelImage(level) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 420
  canvas.height = 360
  const context = canvas.getContext('2d')
  roundedRectPath(context, 9, 9, 402, 342, 34)
  context.fillStyle = '#F4DDDA'
  context.fill()
  context.strokeStyle = '#B23E35'
  context.lineWidth = 7
  context.stroke()

  context.fillStyle = '#141414'
  context.textAlign = 'center'
  context.font = '700 34px "Arial Narrow", Arial, sans-serif'
  context.fillText('NIVEL DE AFECTACIÓN', 210, 62)
  context.font = '700 124px "Arial Narrow", Arial, sans-serif'
  context.fillText(String(level), 210, 210)
  context.font = '19px "Arial Narrow", Arial, sans-serif'
  context.fillText('Calificación realizada con base al', 210, 294)
  context.fillText('Manual del COE 2017', 210, 319)
  return canvas.toDataURL('image/png')
}

function affectationLevelFallback(level) {
  return new Table({
    rows: [new TableRow({ children: [tableCell([
      new Paragraph({ children: [textRun('NIVEL DE AFECTACIÓN', true, { size: 15 })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }),
      new Paragraph({ children: [textRun(String(level), true, { size: 48 })], alignment: AlignmentType.CENTER, spacing: { after: 20 } }),
      new Paragraph({ children: [textRun('Calificación realizada con base al\nManual del COE 2017', false, { size: 9 })], alignment: AlignmentType.CENTER }),
    ], { width: 1800, fill: 'F4DDDA' })] })],
    width: { size: 1800, type: WidthType.DXA },
    columnWidths: [1800],
    layout: TableLayoutType.FIXED,
    borders: Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
      .map((side) => [side, { style: BorderStyle.SINGLE, size: 10, color: 'B23E35' }])),
  })
}

function importantPointsLead(level) {
  const noBorders = Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
    .map((side) => [side, { style: BorderStyle.NONE, size: 0, color: COLORS.white }]))
  const levelImage = affectationLevelImage(level)
  const levelContent = levelImage
    ? [new Paragraph({
      children: [new ImageRun({ type: 'png', data: levelImage, transformation: { width: 118, height: 101 } })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    })]
    : [affectationLevelFallback(level)]

  return new Table({
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          children: REQUIRED_POINTS.map((point) => paragraphFromSegments(point, { bullet: true })),
          width: { size: 7850, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 0, bottom: 0, left: 0, right: 150 },
          borders: noBorders,
        }),
        new TableCell({
          children: levelContent,
          width: { size: 1900, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 0, bottom: 0, left: 70, right: 0 },
          borders: noBorders,
        }),
      ],
    })],
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [7850, 1900],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
  })
}

function hydrometeorologyContent(data) {
  if (!data?.text) return []
  const title = sectionTitle('2', 'Situación Hidrometeorológica actual')

  if (data.type === 'forecast') {
    const children = [title, paragraphFromSegments([[data.text, false]])]
    ;(data.maps || []).forEach((map) => {
      const size = fittedImageSize(map.aspectRatio, 245, 330)
      children.push(new Paragraph({ children: [textRun(map.region, true, { size: 16, color: COLORS.navy })], alignment: AlignmentType.CENTER, spacing: { before: 70, after: 40 }, keepNext: true }))
      children.push(new Paragraph({ children: [new ImageRun({ type: 'png', data: map.image, transformation: size })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }))
    })
    return children
  }

  const textParagraphs = String(data.text)
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => new Paragraph({
      children: [textRun(line, false, { size: 16 })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 0, after: 55, line: 225 },
    }))

  const mapSize = fittedImageSize(data.mapAspectRatio, 235, 370)
  const temperatureTableSize = fittedImageSize(data.tableAspectRatio, 360, 175)
  const noBorders = Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical']
    .map((side) => [side, { style: BorderStyle.NONE, size: 0, color: COLORS.white }]))
  const mapBorders = Object.fromEntries(['top', 'bottom', 'left', 'right']
    .map((side) => [side, { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' }]))

  const mapCellChildren = data.mapImage
    ? [new Paragraph({
      children: [new ImageRun({ type: 'png', data: data.mapImage, transformation: mapSize })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
    })]
    : [new Paragraph({ children: [textRun('Mapa no disponible', false, { size: 14, color: COLORS.gray })], alignment: AlignmentType.CENTER })]

  const rightCellChildren = [...textParagraphs]
  if (data.tableImage) {
    rightCellChildren.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: data.tableImage, transformation: temperatureTableSize })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 50, after: 0 },
    }))
  }

  const layout = new Table({
    rows: [new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          children: mapCellChildren,
          width: { size: 3350, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          borders: mapBorders,
        }),
        new TableCell({
          children: rightCellChildren,
          width: { size: 6400, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 0, bottom: 0, left: 180, right: 0 },
          borders: noBorders,
        }),
      ],
    })],
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [3350, 6400],
    layout: TableLayoutType.FIXED,
    borders: noBorders,
  })

  return [title, layout, new Paragraph({ spacing: { after: 90 } })]
}

export async function buildEventosLluviasWord({
  items = [], tipoLluviasItems = [], asistenciaItems = [], asistenciaSNDGIRDItems = [], alojamientosItems = [], alojamientosCerradosItems = [],
  eventosMesItems = [], viasCategoriaItems = [], dpaTotals = null, sitrepNumber = null, affectationLevel = null,
  hydrometeorology = null, waterBodiesOverflowed = [], waterBodiesRising = [], alertDeclarations = [], emergencyDeclarations = [],
  nationalCoeItems = [], provincialCoeItems = [], municipalCoeItems = [], parishCoeItems = [], highImpactEvents = [],
  analystName = '', analystEmail = '', publishedAt = new Date(), startDate = null, endDate = null, assetBaseUrl = null,
} = {}) {
  const groups = indicatorGroups(items, viasCategoriaItems)
  const iconNames = [...new Set(groups.flatMap((group) => group.items.map((item) => item.icon)).filter(Boolean))]
  const [headerLogo, footer, ...iconData] = await Promise.all([
    imageData(assetUrl('sitrep-template', 'republica-ecuador.png', assetBaseUrl)),
    imageData(assetUrl('sitrep-template', 'footer-institucional.png', assetBaseUrl)),
    ...iconNames.map((icon) => imageData(assetUrl('iconos%20SITREP', icon, assetBaseUrl), 96)),
  ])
  const assets = { headerLogo, footer, icons: Object.fromEntries(iconNames.map((icon, index) => [icon, iconData[index]])) }
  const metadata = periodMetadata(publishedAt, sitrepNumber, startDate, endDate)
  const children = []

  children.push(new Paragraph({ children: [textRun(metadata.title, false, { size: 30, color: COLORS.orange })], alignment: AlignmentType.RIGHT, spacing: { after: 30 } }))
  children.push(new Paragraph({ children: [textRun('INFORME DE SITUACIÓN NACIONAL', false, { size: 18 })], alignment: AlignmentType.RIGHT, spacing: { after: 20 } }))
  children.push(new Paragraph({ children: [textRun(metadata.coverage, false, { size: 13 })], alignment: AlignmentType.RIGHT, spacing: { after: 160 } }))

  children.push(sectionTitle('1', 'Puntos importantes'))
  const hasAffectationLevel = affectationLevel !== null && affectationLevel !== undefined && String(affectationLevel) !== ''
  if (hasAffectationLevel) {
    children.push(importantPointsLead(affectationLevel), new Paragraph({ spacing: { after: 20 } }))
  } else {
    REQUIRED_POINTS.forEach((point) => children.push(paragraphFromSegments(point, { bullet: true })))
  }
  importantPoints({ items, tipoLluviasItems, asistenciaItems, dpaTotals, metadata }).forEach((point) => children.push(paragraphFromSegments(point, { bullet: true })))

  children.push(...hydrometeorologyContent(hydrometeorology))

  if (waterBodiesOverflowed.length || waterBodiesRising.length) {
    children.push(subsectionTitle('ESTADO DE CUERPOS DE AGUA.', COLORS.blue))
    children.push(paragraphFromSegments([
      ['Al cierre de este informe, las Unidades de Monitoreo de la SNGR han identificado: ', false],
      [`${fmt(waterBodiesRising.length)} cuerpos hídricos con tendencia a subir de nivel`, true], [' y ', false],
      [`${fmt(waterBodiesOverflowed.length)} cuerpos hídricos desbordados.`, true],
    ]))
    const waterColumns = [
      { key: '__no__', label: 'No.', format: (_value, _row, index) => index + 1 },
      { key: 'Provincia', label: 'Provincia', type: 'text' }, { key: 'Canton', label: 'Cantón', type: 'text' },
      { key: 'Parroquia', label: 'Parroquia', type: 'text' }, { key: 'Sector', label: 'Sector', type: 'text' },
      { key: 'CuerpoHidrico', label: 'Nombre de cuerpo hídrico', type: 'text' }, { key: 'FechaNovedad', label: 'Fecha de incremento de nivel' },
    ]
    if (waterBodiesOverflowed.length) {
      children.push(subsectionTitle(`${fmt(waterBodiesOverflowed.length)} CUERPOS HÍDRICOS DESBORDADOS`, COLORS.red))
      addTable(children, dataTable(waterColumns, waterBodiesOverflowed, { headerFill: COLORS.red, fontSize: 12 }))
    }
    if (waterBodiesRising.length) {
      children.push(subsectionTitle(`${fmt(waterBodiesRising.length)} CUERPOS HÍDRICOS CON TENDENCIA A SUBIR DE NIVEL`, COLORS.orange))
      addTable(children, dataTable(waterColumns, waterBodiesRising, { headerFill: COLORS.orange, fontSize: 12 }))
    }
    children.push(sourceLine(metadata))
  }

  const eventColumns = [
    { key: '__no__', label: 'No.', format: (_value, _row, index) => index + 1 },
    { key: 'Provincia', label: 'Provincia', type: 'text' },
    { key: 'NumeroEventos', label: 'Nro. de eventos adversos', type: 'number', format: fmtInteger },
    ...EVENT_TYPES.filter((type) => has(tipoLluviasItems, type.key) && sum(tipoLluviasItems, type.key) !== 0)
      .map((type) => ({ ...type, type: 'number', format: fmtInteger })),
  ]
  if (tipoLluviasItems.length && sum(tipoLluviasItems, 'NumeroEventos')) {
    children.push(sectionTitle('3', 'Eventos Adversos y Afectaciones - Resumen'))
    children.push(paragraphFromSegments([
      [`Desde el ${metadata.startNumeric} hasta el ${metadata.endNumeric}, por lluvias se registraron un total de `, false],
      [`${fmt(sum(tipoLluviasItems, 'NumeroEventos'))} eventos adversos, `, true], ['distribuidos de la siguiente manera:', false],
    ]))
    const eventRows = [...tipoLluviasItems].sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
    eventRows.push(Object.fromEntries(eventColumns.map((column, index) => [column.key, index === 1 ? 'Total general' : index > 1 ? sum(tipoLluviasItems, column.key) : ''])))
    addTable(children, dataTable(eventColumns, eventRows, { totalRowIndex: eventRows.length - 1, fontSize: eventColumns.length > 12 ? 9 : 11 }))
    children.push(sourceLine(metadata))
  }

  if (groups.length) {
    children.push(paragraphFromSegments([['Por los eventos detallados en la tabla anterior, se han registrado las siguientes afectaciones:', false]]))
    groups.forEach((group) => {
      children.push(indicatorBand(group.name))
      const rows = []
      for (let index = 0; index < group.items.length; index += 2) rows.push([group.items[index], group.items[index + 1]])
      const indicatorRows = rows.map((pair) => new TableRow({
        cantSplit: true,
        children: pair.map((item) => indicatorCell(item, assets)),
      }))
      children.push(new Table({
        rows: indicatorRows,
        width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
        columnWidths: [4875, 4875],
        layout: TableLayoutType.FIXED,
        borders: BORDERLESS,
      }), new Paragraph({ spacing: { after: 55 } }))
    })
    children.push(sourceLine(metadata))
  }

  const detailColumns = [{ key: '__no__', label: 'No.', format: (_value, _row, index) => index + 1 },
    ...DETAIL_COLUMNS.filter((column) => column.key === 'Provincia' || (has(items, column.key) && sum(items, column.key) !== 0))
      .map((column) => ({ ...column, format: column.type === 'text' ? undefined : (value) => fmt(value, column.type === 'decimal') }))]
  if (items.length && detailColumns.length > 2) {
    children.push(sectionTitle('4', 'Detalle de afectaciones por provincias'))
    const sorted = [...items].sort((a, b) => n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas) || n(b?.NumeroEventos) - n(a?.NumeroEventos))
    const top = sorted.slice(0, 4)
    if (top.length) children.push(paragraphFromSegments([
      ['Las provincias con mayor impacto a la población son: ', false],
      [top.map((row) => `${row.Provincia} con ${fmt(row.ImpactadasPersonas)} personas impactadas en ${fmt(row.NumeroEventos)} eventos`).join('; ') + '.', true],
    ]))
    sorted.push(Object.fromEntries(detailColumns.map((column, index) => [column.key, index === 1 ? 'Total general' : index > 1 ? sum(items, column.key) : ''])))
    addTable(children, dataTable(detailColumns, sorted, {
      widths: detailTableWidths(detailColumns, sorted),
      totalRowIndex: sorted.length - 1,
      fontSize: 9,
      headerFontSize: 12,
      verticalHeaders: verticalDataHeader,
      headerMargins: { top: 35, bottom: 35, left: 25, right: 25 },
      cellMargins: { top: 55, bottom: 55, left: 25, right: 25 },
    }))
    children.push(sourceLine(metadata, '. Nota: Personas impactadas incluye personas afectadas y damnificadas.'))

    children.push(subsectionTitle('Número de eventos vs Personas Impactadas por provincia', COLORS.gray))
    const provinceChartRows = [...items]
      .map((row) => ({ label: String(row?.Provincia || ''), events: n(row?.NumeroEventos), people: n(row?.ImpactadasPersonas) }))
      .filter((row) => row.label && (row.events || row.people))
      .sort((a, b) => b.people - a.people || b.events - a.events)
    const provinceChart = chartImage(provinceChartRows, 'Número de eventos vs Personas Impactadas por provincia', 'events', 'people', 'Nro. de eventos', 'Personas Impactadas')
    if (provinceChart) children.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: provinceChart, transformation: { width: 650, height: 325 } })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }))
    addTable(children, dataTable([
      { key: 'Provincia', label: 'Provincia', type: 'text' },
      { key: 'NumeroEventos', label: 'Nro. de eventos', type: 'number', format: fmt },
      { key: 'ImpactadasPersonas', label: 'Personas impactadas', type: 'number', format: fmt },
    ], [...items].sort((a, b) => n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas)), { widths: [4875, 2437, 2438] }))
    children.push(sourceLine(metadata))
  }

  if (eventosMesItems.length) {
    const monthRows = eventosMesItems.map((row) => ({ month: row?.mes, events: n(row?.eventos), people: n(row?.personas_impactadas) }))
    const totalEvents = monthRows.reduce((acc, row) => acc + row.events, 0)
    const totalPeople = monthRows.reduce((acc, row) => acc + row.people, 0)
    children.push(subsectionTitle('Recurrencia de eventos vs personas impactadas por mes', COLORS.gray))
    const monthlyChart = chartImage(monthRows.map((row) => ({ ...row, label: row.month })), 'Recurrencia de eventos vs personas impactadas por mes', 'events', 'people', 'Nro. de eventos', 'Personas Impactadas')
    if (monthlyChart) children.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: monthlyChart, transformation: { width: 650, height: 325 } })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }))
    const columns = [
      { key: 'month', label: 'Mes', type: 'text' }, { key: 'events', label: 'Número de eventos', type: 'number', format: fmt },
      { key: 'people', label: 'Personas impactadas', type: 'number', format: fmt },
      { key: 'eventPct', label: '% recurrencia eventos', format: (_v, row) => pct(totalEvents ? row.events / totalEvents * 100 : 0) },
      { key: 'peoplePct', label: '% personas impactadas', format: (_v, row) => pct(totalPeople ? row.people / totalPeople * 100 : 0) },
    ]
    monthRows.push({ month: 'Total general', events: totalEvents, people: totalPeople, eventPct: '100%', peoplePct: '100%' })
    addTable(children, dataTable(columns, monthRows, { totalRowIndex: monthRows.length - 1, fontSize: 12 }))
    children.push(sourceLine(metadata))
  }

  const addShelter = (number, title, shelterItems, priority, action) => {
    if (!shelterItems.length) return
    children.push(sectionTitle(number, title))
    children.push(paragraphFromSegments([['Desde el ', false], ['29 de agosto del 2026, ', true], [`se han ${action} `, false], [`${fmt(shelterItems.length)} alojamientos temporales.`, true]]))
    addGenericTable(children, shelterItems, priority)
    children.push(sourceLine(metadata))
  }
  addShelter('5.1', 'Alojamientos Temporales Abiertos', alojamientosItems, ['Provincia', 'Canton', 'Parroquia', 'Tipo', 'Nombre', 'Apertura'], 'activado')
  addShelter('5.2', 'Alojamientos Temporales Cerrados', alojamientosCerradosItems, ['Provincia', 'Canton', 'Parroquia', 'Tipo', 'Nombre', 'Apertura', 'Cierre'], 'cerrado')

  if ((asistenciaItems.length && sum(asistenciaItems, 'Total Bienes')) || (asistenciaSNDGIRDItems.length && sum(asistenciaSNDGIRDItems, 'Total Bienes'))) {
    children.push(sectionTitle('6', 'Asistencia Humanitaria'))
    if (asistenciaItems.length && sum(asistenciaItems, 'Total Bienes')) {
      children.push(paragraphFromSegments([['Por eventos producidos por lluvias desde el ', false], [metadata.startLong, true], [' hasta el ', false], [`${metadata.endLong}, `, true], ['la SNGR ha entregado a la población un total de ', false], [`${fmt(sum(asistenciaItems, 'Total Bienes'))} bienes de asistencia:`, true]]))
      addGenericTable(children, asistenciaItems, ['Provincias', 'Provincia', 'Familias Beneficiadas', 'Personas Beneficiadas', 'Total Bienes'], true, {
        verticalHeaders: verticalDataHeader,
        excludeKeys: ['ProvinciaID'],
      })
      children.push(sourceLine(metadata))
    }
    if (asistenciaSNDGIRDItems.length && sum(asistenciaSNDGIRDItems, 'Total Bienes')) {
      children.push(paragraphFromSegments([['El resto del SNDGIRD ha entregado a la población un total de ', false], [`${fmt(sum(asistenciaSNDGIRDItems, 'Total Bienes'))} bienes de asistencia:`, true]]))
      addGenericTable(children, asistenciaSNDGIRDItems, ['Provincias', 'Provincia', 'Familias Beneficiadas', 'Personas Beneficiadas', 'Total Bienes'], true, {
        verticalHeaders: verticalDataHeader,
        excludeKeys: ['ProvinciaID'],
      })
      children.push(sourceLine(metadata))
    }
  }

  if (alertDeclarations.length || emergencyDeclarations.length || nationalCoeItems.length || provincialCoeItems.length || municipalCoeItems.length || parishCoeItems.length) {
    children.push(sectionTitle('7', 'Declaratorias emitidas y COE activados'))
    const alertColumns = [
      { key: 'Ambito', label: 'Nivel de gobierno', type: 'text' }, { key: 'Provincia', label: 'Provincia', type: 'text' },
      { key: 'Canton', label: 'Cantón', type: 'text' }, { key: 'Parroquia', label: 'Parroquia', type: 'text' },
      { key: 'FechaInicio', label: 'Fecha declaratoria', format: declarationDate }, { key: 'NivelAlerta', label: 'Nivel de alerta' },
      { key: 'Observacion', label: 'Descripción', type: 'text' },
    ]
    if (alertDeclarations.length) {
      children.push(subsectionTitle('Declaratorias de niveles de alertas en todo el país:'))
      addTable(children, dataTable(alertColumns, alertDeclarations, { fontSize: 10 }))
    }
    if (emergencyDeclarations.length) {
      children.push(subsectionTitle('Declaratorias de emergencia en todo el país:'))
      addTable(children, dataTable(alertColumns.filter((column) => column.key !== 'NivelAlerta'), emergencyDeclarations, { fontSize: 10 }))
    }
    children.push(paragraphFromSegments([['Además, mediante ', false], ['Decreto ejecutivo Nro. 485, firmado el 31 de agosto de 2026, por el presidente del Ecuador Daniel Noboa Azin, se declara ', true], ['como prioridad nacional la continuidad y el fortalecimiento de las acciones de prevención, preparación, respuesta y recuperación frente a los posibles efectos del fenómeno El Niño.', false]]))
    const national = uniqueActiveCoeRows(nationalCoeItems, ['TipoCOE'])[0]
    const provincial = uniqueActiveCoeRows(provincialCoeItems, ['Provincia'])
    const parish = uniqueActiveCoeRows(parishCoeItems, ['Provincia', 'Canton', 'Parroquia'])
    const municipal = buildMunicipalCoeSummary(municipalCoeItems)
    children.push(subsectionTitle('Comités de Operaciones de Emergencias (COE) activados:'))
    if (national) children.push(paragraphFromSegments([[`COE Nacional activo desde el ${declarationDate(national.FechaInicial)}.`, true]], { bullet: true }))
    if (provincial.length) {
      children.push(paragraphFromSegments([[`${fmt(provincial.length)} COE provinciales:`, true]], { bullet: true }))
      addGenericTable(children, provincial, ['Provincia', 'FechaInicial', 'Estado'])
    }
    if (municipal.totalActive) {
      children.push(paragraphFromSegments([[`A nivel nacional se registran ${fmt(municipal.totalActive)} COE cantonales activos de ${fmt(municipal.totalCantons)} cantones (${municipal.globalPercentage}%).`, true]], { bullet: true }))
      const municipalRows = [...municipal.rows, { Provincia: 'Total general', TotalCantones: municipal.totalCantons, CantonesActivos: municipal.totalActive, PorcentajeActivacion: municipal.globalPercentage }]
      addGenericTable(children, municipalRows, ['Provincia', 'TotalCantones', 'CantonesActivos', 'PorcentajeActivacion'])
    }
    if (parish.length) {
      children.push(paragraphFromSegments([[`${fmt(parish.length)} COE parroquiales:`, true]], { bullet: true }))
      addGenericTable(children, parish, ['Provincia', 'Canton', 'Parroquia', 'FechaInicial', 'Estado'])
    }
    children.push(sourceLine(metadata))
  }

  if (highImpactEvents.length) {
    children.push(sectionTitle('8', 'Eventos adversos de alto impacto'))
    children.push(paragraphFromSegments([['A continuación, se detallan los eventos adversos relevantes de los últimos días:', false]]))
    let activeZone = null
    highImpactEvents.forEach((item) => {
      const zone = String(item?.Zona ?? '').trim() || 'Sin zona'
      if (zone !== activeZone) {
        children.push(subsectionTitle(`Zona ${zone}`, '0B1F78'))
        activeZone = zone
      }
      children.push(paragraphFromSegments([[`${String(item?.Ubicacion || 'Ubicación no registrada').trim()}.`, true]], { bullet: true, keepNext: true }))
      if (String(item?.Antecedentes ?? '').trim()) children.push(paragraphFromSegments([[item.Antecedentes, false]]))
      if (String(item?.SituacionActual ?? '').trim()) children.push(paragraphFromSegments([[item.SituacionActual, false]]))
      reportLines(item?.Afectaciones).forEach((line) => children.push(paragraphFromSegments([[`${affectationText(line)}.`, true]], { bullet: true })))
      reportLines(item?.CoordinacionYRespuesta).forEach((line) => children.push(paragraphFromSegments([[line, false]])))
    })
    children.push(sourceLine(metadata))
  }

  if (items.length && has(items, 'ImpactadasPersonas')) {
    children.push(new Paragraph({ children: [new PageBreak()] }))
    children.push(sectionTitle('9', 'Mapa de Personas Impactadas por lluvias a Nivel Nacional'))
    const mapImage = provinceMapImage(items)
    if (mapImage) children.push(new Paragraph({
      children: [new ImageRun({ type: 'png', data: mapImage, transformation: { width: 590, height: 590 } })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 90 },
    }))
  }

  return new Document({
    creator: 'Secretaría Nacional de Gestión de Riesgos',
    title: metadata.title,
    description: 'Informe de Situación Nacional editable',
    styles: {
      default: { document: { run: { font: FONT, size: 18, color: COLORS.black }, paragraph: { spacing: { after: 100, line: 250 } } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 26, color: COLORS.blue }, paragraph: { spacing: { before: 160, after: 100 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: FONT, size: 20, bold: true, color: COLORS.darkNavy }, paragraph: { spacing: { before: 130, after: 70 }, outlineLevel: 1 } },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: { width: PAGE_WIDTH_DXA, height: 16838 },
          margin: { top: 1550, right: PAGE_MARGIN_RIGHT_DXA, bottom: 1550, left: PAGE_MARGIN_LEFT_DXA, header: 320, footer: 260, gutter: 0 },
        },
      },
      headers: { default: buildHeader(assets, publishedAt) },
      footers: { default: buildFooter(assets) },
      children,
    }],
  })
}

export async function exportEventosLluviasWord(options) {
  const document = await buildEventosLluviasWord(options)
  const blob = await Packer.toBlob(document)
  const suffix = options?.provinciaId ? `provincia_${options.provinciaId}` : 'todas'
  const url = URL.createObjectURL(blob)
  const anchor = window.document.createElement('a')
  anchor.href = url
  anchor.download = `sitrep_lluvias_editable_${suffix}.docx`
  window.document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
