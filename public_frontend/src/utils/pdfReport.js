import jsPDFPackage from 'jspdf'
import autoTable from 'jspdf-autotable'
import { buildMunicipalCoeSummary, uniqueActiveCoeRows } from './coeConfig.js'
import {
  buildProvinceImpactMap,
  ECUADOR_PROVINCES,
  impactColor,
  impactLegend,
  provinceImpactValue,
  shortProvinceLabel,
} from './impactMap.js'

const JsPDF = jsPDFPackage.jsPDF || jsPDFPackage

const C = {
  navy: [31, 60, 105], darkNavy: [5, 43, 103], blue: [38, 84, 153], pale: [218, 227, 244],
  alternate: [224, 231, 244], orange: [239, 112, 36], lightOrange: [252, 232, 218],
  gray: [128, 128, 128], line: [205, 205, 205], black: [20, 20, 20], white: [255, 255, 255],
  red: [255, 49, 80], orangeScale: [255, 160, 90], yellow: [255, 224, 99],
  yellowGreen: [184, 236, 138], green: [66, 186, 60],
}

const PAGE = { width: 210, height: 297, left: 20, right: 18, top: 27, firstTop: 47, bottom: 267, footerTop: 270 }
PAGE.contentWidth = PAGE.width - PAGE.left - PAGE.right

const TEMPLATE_FILES = {
  headerLogo: 'republica-ecuador.png', headerBand: 'franja-superior.png', footer: 'footer-institucional.png',
  fontRegular: 'BarlowCondensed-Regular.ttf', fontBold: 'BarlowCondensed-SemiBold.ttf',
  fontItalic: 'BarlowCondensed-LightItalic.ttf',
}

const WATER_BODY_COLUMNS = [
  { key: '__no__', label: 'No.', width: 7 },
  { key: 'Provincia', label: 'Provincia', width: 25 },
  { key: 'Canton', label: 'Canton', width: 24 },
  { key: 'Parroquia', label: 'Parroquia', width: 30 },
  { key: 'Sector', label: 'Sector', width: 25 },
  { key: 'CuerpoHidrico', label: 'Nombre de cuerpo hidrico', width: 31 },
  { key: 'FechaNovedad', label: 'Fecha de incremento de nivel', width: 30 },
]

const ALERT_DECLARATION_COLUMNS = [
  { key: 'Ambito', label: 'Nivel de gobierno', width: 14 },
  { key: 'Provincia', label: 'Provincia', width: 15 },
  { key: 'Canton', label: 'Cantón', width: 15 },
  { key: 'Parroquia', label: 'Parroquia', width: 15 },
  { key: 'FechaInicio', label: 'Fecha declaratoria', width: 18 },
  { key: 'NivelAlerta', label: 'Nivel de alerta', width: 10 },
  { key: 'Observacion', label: 'Descripción', width: 85 },
]

const EMERGENCY_DECLARATION_COLUMNS = [
  { key: 'Ambito', label: 'Nivel de gobierno', width: 14 },
  { key: 'Provincia', label: 'Provincia', width: 16 },
  { key: 'Canton', label: 'Cantón', width: 17 },
  { key: 'Parroquia', label: 'Parroquia', width: 15 },
  { key: 'FechaInicio', label: 'Fecha declaratoria', width: 18 },
  { key: 'Observacion', label: 'Descripción', width: 92 },
]

const EVENT_TYPES = [
  ['Inundacion', 'Inundación'], ['Deslizamiento', 'Deslizamiento'], ['Lluvias_Intensas', 'Lluvias intensas'],
  ['Erosion_Hidrica', 'Erosión hídrica'], ['Hundimiento', 'Hundimiento'], ['Aluvion', 'Aluvión (flujos)'],
  ['Vendaval', 'Vendaval'], ['Caidas_Colapso', 'Caídas (colapso)'], ['Tormenta_Electrica', 'Tormenta eléctrica'],
  ['Granizada', 'Granizada'], ['Reptacion', 'Reptación'], ['Avalancha', 'Avalancha'], ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso humedad'], ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso infraestructura'],
].map(([key, label]) => ({ key, label }))

const DETAIL_COLUMNS = [
  ['__no__', 'No.', 'index'], ['Provincia', 'Provincia', 'text'], ['NumeroEventos', 'Nro. de eventos', 'number'],
  ['ImpactadasPersonas', 'Personas Impactadas', 'number', true], ['Extraviados', 'Personas Extraviadas', 'number'],
  ['Fallecidos', 'Personas Fallecidas', 'number'], ['Heridos', 'Personas Heridas', 'number'],
  ['AfectadosPersonas', 'Personas Afectadas', 'number'], ['DamnificadosPersonas', 'Personas Damnificadas', 'number'],
  ['AfectadosFamilias', 'Familias Afectadas', 'number'], ['DamnificadosFamilias', 'Familias Damnificadas', 'number'],
  ['AfectadosViviendas', 'Viviendas Afectadas', 'number'], ['DestruidosViviendas', 'Viviendas Destruidas', 'number'],
  ['AfectadosPuentes', 'Puentes Afectados', 'number'], ['DestruidosPuentes', 'Puentes Destruidos', 'number'],
  ['AfectadosPrivados', 'Bienes Privados Afectados', 'number'], ['DestruidosPrivados', 'Bienes Privados Destruidos', 'number'],
  ['AfectadosPublicos', 'Bienes Públicos Afectados', 'number'], ['DestruidosPublicos', 'Bienes Públicos Destruidos', 'number'],
  ['AfectadosEducativos', 'Centros Educativos Afectados', 'number'],
  ['DestruidosEducativos', 'Centros Educativos Destruidos', 'number'],
  ['FuncionalEducativos', 'Centros Educativos Funcionales', 'number'], ['AfectadosSalud', 'Centros Salud Afectados', 'number'],
  ['DestruidosSalud', 'Centros Salud Destruidos', 'number'], ['Evacuados', 'Evacuados', 'number'],
  ['AfectadosKilometros', 'Km Vías Afectadas', 'decimal'], ['AfectadosMetros', 'Metros Vías Afectadas', 'decimal'],
  ['AfectadosHectareas', 'Hectáreas Afectadas', 'decimal'], ['PerdidosHectareas', 'Hectáreas Perdidas', 'decimal'],
  ['QuemadasHectareas', 'Hectáreas Quemadas', 'decimal'], ['AfectadosAnimales', 'Animales Afectados', 'number'],
  ['MuertosAnimales', 'Animales Muertos', 'number'],
].map(([key, label, type, heat = false]) => ({ key, label, type, heat }))

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

const REQUIRED_IMPORTANT_POINTS = [
  [
    { text: 'Mediante Informe Técnico Ejecutivo' },
    { text: 'ERFEN', bold: true },
    { text: 'Nro. 007-2026, del 28 de agosto 2026,' },
    { text: 'el Comité Nacional ERFEN (CN-ERFEN) declaró oficialmente el evento El Niño en el país.', bold: true },
    { text: 'Con base a este antecedente, la' },
    { text: 'SNGR', bold: true },
    { text: 'emitió, el 29 de agosto de 2026, la declaratoria por nivel de' },
    { text: 'ALERTA ROJA', bold: true, highlight: true },
    { text: 'a nivel nacional, con base a la' },
    { text: 'Resolución Nro. SNGR-238-2026.', bold: true },
  ],
  [
    { text: 'Durante los primeros días de octubre,' },
    { text: 'INAMHI', bold: true },
    { text: 'informó que, de acuerdo con las proyecciones realizadas sobre la evolución de las lluvias asociadas al' },
    { text: 'El Niño, el Ecuador', bold: true },
    { text: 'ingresó a una etapa inicial de transición y acoplamiento atmosférico, en respuesta a las condiciones cálidas presentes en el Pacífico.' },
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

function pct(value) {
  return `${n(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}

function humanize(key) {
  return String(key).replaceAll('_', ' ').replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2').trim()
}

function isBoldEntityColumn(column) {
  return /provincia|cant[oó]n|instituci[oó]n/i.test(`${column?.key || ''} ${column?.label || ''}`)
}

function has(items, key) {
  return items.some((row) => Object.prototype.hasOwnProperty.call(row || {}, key)
    && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '')
}

function sum(items, key) {
  return items.reduce((total, row) => total + n(row?.[key]), 0)
}

function unique(items, keys) {
  return new Set(items.map((row) => keys.map((key) => row?.[key]).find((value) => value !== undefined && value !== null && String(value).trim() !== ''))
    .filter((value) => value !== undefined && String(value).trim() !== '').map(String)).size
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
  const startLong = start.toLocaleString('es-EC', longOptions)
  const endLong = end.toLocaleString('es-EC', longOptions)
  const startNumeric = start.toLocaleString('es-EC', numericOptions)
  const endNumeric = end.toLocaleString('es-EC', numericOptions)
  const sourceDate = end.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const sourceTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  return {
    year: end.getFullYear(), startLong, endLong, startNumeric, endNumeric,
    title: `${sitrepNumber ? `SitRep ${sitrepNumber}` : 'SitRep'} – Lluvias con incidencia del Evento El Niño, del 29 de agosto de 2026 a la fecha`,
    coverage: `Este informe cubre el período desde el ${startNumeric} hasta el ${endNumeric}`,
    source: `Fuente: Unidades de Monitoreo SNGR - Instituciones del SNDGIRD. ${sourceDate} - ${sourceTime}`,
  }
}

function assetUrl(folder, file, baseUrl) {
  const productionBase = import.meta.env?.VITE_API_ENV === 'prod'
    ? import.meta.env?.VITE_API_PROD_URL
    : ''
  const base = baseUrl
    || import.meta.env?.VITE_ASSET_BASE_URL
    || productionBase
    || import.meta.env?.BASE_URL
    || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/${folder}/${encodeURIComponent(file)}`
}

async function dataUrl(url, maxDimension = null) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar el recurso PDF: ${url}`)
  const blob = await response.blob()

  if (maxDimension && typeof document !== 'undefined' && typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/png')
  }

  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return `data:${response.headers.get('content-type') || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function base64(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar la fuente PDF: ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

async function loadPdfAssets(baseUrl) {
  const templateEntries = Object.entries(TEMPLATE_FILES)
  const templateValues = await Promise.all(templateEntries.map(([key, file]) => (
    key.startsWith('font') ? base64(assetUrl('sitrep-template', file, baseUrl)) : dataUrl(assetUrl('sitrep-template', file, baseUrl))
  )))
  const iconFiles = [...new Set(INDICATORS.map((item) => item.icon))]
  const iconValues = await Promise.all(iconFiles.map((file) => dataUrl(assetUrl('iconos%20SITREP', file, baseUrl), 96)))
  return {
    ...Object.fromEntries(templateEntries.map(([key], index) => [key, templateValues[index]])),
    icons: Object.fromEntries(iconFiles.map((file, index) => [file, iconValues[index]])),
  }
}

function registerFonts(doc, assets) {
  [['Regular', 'normal', assets.fontRegular], ['SemiBold', 'bold', assets.fontBold], ['Italic', 'italic', assets.fontItalic]]
    .forEach(([name, style, source]) => {
      doc.addFileToVFS(`BarlowCondensed-${name}.ttf`, source)
      doc.addFont(`BarlowCondensed-${name}.ttf`, 'BarlowCondensed', style)
    })
}

function font(doc, style = 'normal', size = 9, color = C.black) {
  doc.setFont('BarlowCondensed', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

function renderHeader(doc, { assets, metadata, publishedAt, pageNumber, pageCount }) {
  doc.addImage(assets.headerBand, 'PNG', 79, 0, 131, 6.3)
  doc.addImage(assets.headerLogo, 'PNG', 20, 3.3, 36, 18.3)
  font(doc, 'bold', 10.7, [39, 49, 145])
  doc.text('Secretaría Nacional', 193, 8.7, { align: 'right' })
  doc.text('De Gestión de Riesgos', 193, 13.4, { align: 'right' })
  doc.text('Dirección de Monitoreo de Eventos Adversos', 193, 18.1, { align: 'right' })
  const publication = publishedAt.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = publishedAt.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
  font(doc, 'normal', 4.8, [155, 155, 155])
  doc.text(`Fecha y Hora de publicación: ${publication} - ${time} / Página ${pageNumber} de ${pageCount}`, 193, 22.5, { align: 'right' })
  if (pageNumber === 1) {
    font(doc, 'normal', 14.5, C.orange)
    doc.text(metadata.title, 193, 30.2, { align: 'right' })
    font(doc, 'normal', 7.5, C.black)
    doc.text('INFORME DE SITUACIÓN NACIONAL', 193, 35.1, { align: 'right' })
    font(doc, 'normal', 5.5, C.black)
    doc.text(metadata.coverage, 193, 38.4, { align: 'right' })
  }
}

function renderFooter(doc, assets) {
  doc.addImage(assets.footer, 'PNG', 0, PAGE.footerTop, PAGE.width, 27.2)
}

function decoratePages(doc, context) {
  const pageCount = doc.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber)
    renderHeader(doc, { ...context, pageNumber, pageCount })
    renderFooter(doc, context.assets)
  }
}

function ensurePageSpace(doc, currentY, height) {
  if (currentY + height <= PAGE.bottom) return currentY
  doc.addPage('a4', 'portrait')
  return PAGE.top
}

function wrapped(doc, text, x, y, width, lineHeight = 4) {
  const lines = doc.splitTextToSize(String(text), width)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function renderSectionTitle(doc, currentY, number, title) {
  currentY = ensurePageSpace(doc, currentY, 12)
  font(doc, 'normal', 12.7, C.blue)
  doc.text(`${number}.`, PAGE.left, currentY)
  doc.text(title, PAGE.left + 6.5, currentY)
  doc.setDrawColor(...C.navy)
  doc.setLineWidth(0.45)
  doc.line(PAGE.left, currentY + 1.7, PAGE.width - PAGE.right, currentY + 1.7)
  return currentY + 7.5
}

function sourceLine(doc, currentY, metadata, note = '') {
  currentY = ensurePageSpace(doc, currentY, 6)
  font(doc, 'bold', 5.7, C.black)
  doc.text(`${metadata.source}${note}`, PAGE.width / 2, currentY, { align: 'center' })
  return currentY + 4
}

function ranking(items, limit = 8) {
  return items.map((row) => ({ provincia: String(row?.Provincia || '').trim(), impactadas: n(row?.ImpactadasPersonas), eventos: n(row?.NumeroEventos) }))
    .filter((row) => row.provincia && (row.impactadas || row.eventos))
    .sort((a, b) => b.impactadas - a.impactadas || b.eventos - a.eventos).slice(0, limit)
}

function importantPoints({ items, tipoLluviasItems, asistenciaItems, dpaTotals, metadata }) {
  const bullets = []
  const total = sum(tipoLluviasItems, 'NumeroEventos') || sum(items, 'NumeroEventos')
  const types = EVENT_TYPES.map((type) => ({ ...type, total: sum(tipoLluviasItems, type.key) }))
    .filter((type) => type.total > 0).sort((a, b) => b.total - a.total).slice(0, 5)
  if (total > 0) {
    const provinces = Number.isFinite(Number(dpaTotals?.TotalProvincias)) ? Number(dpaTotals.TotalProvincias) : unique(items, ['Provincia'])
    const cantons = Number.isFinite(Number(dpaTotals?.TotalCantones)) ? Number(dpaTotals.TotalCantones) : unique(items, ['Canton', 'CantonNombre'])
    const parishes = Number.isFinite(Number(dpaTotals?.TotalParroquias)) ? Number(dpaTotals.TotalParroquias) : unique(items, ['Parroquia', 'ParroquiaNombre'])
    const segments = [
      { text: 'Desde el 1 de enero de 2026 a las 00:00 hasta la fecha, se han registrado' },
      { text: fmt(total), bold: true },
      { text: 'eventos adversos por lluvias' },
    ]
    if (provinces || cantons || parishes) segments.push({ text: 'afectando a' })
    if (provinces) segments.push({ text: `${fmt(provinces)} provincias${cantons || parishes ? ',' : '.'}`, bold: true })
    if (cantons) segments.push({ text: `${fmt(cantons)} cantones${parishes ? ' y' : '.'}`, bold: true })
    if (parishes) segments.push({ text: `${fmt(parishes)} parroquias.`, bold: true })
    if (types.length) {
      segments.push({ text: 'Los eventos más recurrentes corresponden a:' })
      types.forEach((type, index) => segments.push({
        text: `${type.label.toLowerCase()} (${pct((type.total / total) * 100)})${index === types.length - 1 ? '.' : ','}`,
        bold: true,
      }))
    }
    bullets.push(segments)
  }
  const top = ranking(items)
  if (top.length) bullets.push([
    { text: `En lo que va del año ${metadata.year}, las provincias con mayor impacto a la población son:` },
    { text: `${top.map((row) => row.provincia).join(', ')}.`, bold: true },
  ])
  if (has(items, 'ImpactadasPersonas')) bullets.push([
    { text: 'En total, los eventos reportados impactaron a' },
    { text: `${fmt(sum(items, 'ImpactadasPersonas'))} personas.`, bold: true },
  ])
  const goods = sum(asistenciaItems, 'Total Bienes')
  if (goods > 0) {
    const assistedProvinces = unique(asistenciaItems, ['Provincias', 'Provincia'])
    bullets.push([
      { text: 'La SNGR', bold: true },
      { text: 'ha entregado a la población un total de' },
      { text: `${fmt(goods)} bienes de asistencia humanitaria`, bold: true },
      ...(assistedProvinces ? [{ text: `en ${fmt(assistedProvinces)} provincias`, bold: true }] : []),
      { text: '.' },
    ])
  }
  return bullets
}

function renderRequiredImportantPoint(doc, currentY, segments, width) {
  const left = PAGE.left + 8
  const size = 8.7
  const lineHeight = 4.05
  let x = left
  let y = currentY

  doc.setFillColor(...C.darkNavy)
  doc.circle(PAGE.left + 1.2, y - 1.3, 0.65, 'F')

  segments.forEach((segment) => {
    const words = String(segment.text || '').trim().split(/\s+/).filter(Boolean)
    words.forEach((word) => {
      font(doc, segment.bold ? 'bold' : 'normal', size, segment.highlight ? C.white : C.black)
      let displayed = x === left ? word : ` ${word}`
      let wordWidth = doc.getTextWidth(displayed)
      if (x + wordWidth > left + width) {
        y += lineHeight
        x = left
        displayed = word
        wordWidth = doc.getTextWidth(displayed)
      }
      if (segment.highlight) {
        doc.setFillColor(...C.red)
        doc.rect(x - 0.2, y - 3.15, wordWidth + 0.4, 3.8, 'F')
      }
      doc.text(displayed, x, y)
      x += wordWidth
    })
  })

  return y + lineHeight + 1.2
}

function renderImportantPoints(doc, currentY, context) {
  const bullets = importantPoints(context)
  currentY = ensurePageSpace(doc, currentY, 58)
  currentY = renderSectionTitle(doc, currentY, '1', 'Puntos importantes')

  const hasAffectationLevel = context.affectationLevel !== undefined
    && context.affectationLevel !== null && context.affectationLevel !== ''
  const boxX = PAGE.width - PAGE.right - 32
  const requiredTextWidth = hasAffectationLevel ? boxX - (PAGE.left + 8) - 4 : PAGE.contentWidth - 9
  const boxBottom = renderAffectationLevel(doc, currentY, context.affectationLevel)
  let requiredY = currentY
  REQUIRED_IMPORTANT_POINTS.forEach((segments) => {
    requiredY = renderRequiredImportantPoint(doc, requiredY, segments, requiredTextWidth)
  })
  currentY = Math.max(requiredY, boxBottom)

  bullets.forEach((segments) => {
    font(doc, 'normal', 8.7, C.black)
    const text = segments.map((segment) => segment.text).join(' ')
    const lines = doc.splitTextToSize(text, PAGE.contentWidth - 9)
    currentY = ensurePageSpace(doc, currentY, lines.length * 4.05 + 2)
    currentY = renderRequiredImportantPoint(doc, currentY, segments, PAGE.contentWidth - 9)
  })
  return currentY + 2
}

function renderAffectationLevel(doc, currentY, level) {
  if (level === undefined || level === null || level === '') return currentY
  const width = 27
  const x = PAGE.width - PAGE.right - width
  const y = currentY - 4
  const height = 26
  doc.setLineWidth(0.45)
  doc.setDrawColor(178, 62, 53)
  doc.setFillColor(244, 221, 218)
  doc.roundedRect(x, y, width, height, 2.5, 2.5, 'FD')
  font(doc, 'bold', 8)
  doc.text('NIVEL DE AFECTACIÓN', x + width / 2, y + 5, { align: 'center' })
  font(doc, 'bold', 36)
  doc.text(String(level), x + width / 2, y + 17, { align: 'center' })
  font(doc, 'normal', 5)
  doc.text(['Calificación realizada con base al', 'Manual del COE 2017'], x + width / 2, y + 23, { align: 'center' })
  return y + height + 1
}

function hydrometeorologySegments(text) {
  const expression = /(bolet[ií]n\s+meteorol[oó]gico\s+Nro\.?\s*[^\s,.;:]+|(?:desde\s+las?\s+)?\d{1,2}H\d{2}\s+del\s+\d{1,2}\s+hasta\s+las?\s+\d{1,2}H\d{2}\s+del\s+\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}|(?:regi[oó]n\s+)?(?:litoral|amaz[oó]nica|interandina)|zonas?\s+occidentales)[,.;:]?/gi
  const source = String(text || '')
  const segments = []
  let start = 0
  source.replace(expression, (match, _group, offset) => {
    if (offset > start) segments.push({ text: source.slice(start, offset) })
    segments.push({ text: match, bold: true })
    start = offset + match.length
    return match
  })
  if (start < source.length) segments.push({ text: source.slice(start) })
  return segments
}

function renderHydrometeorology(doc, currentY, data) {
  if (!data?.text) return currentY
  if (data.type === 'forecast') return renderHydrometeorologyForecast(doc, currentY, data)

  const visualWidth = 47
  const gap = 4
  const textWidth = PAGE.contentWidth - visualWidth - gap
  font(doc, 'normal', 7.4)
  const lines = doc.splitTextToSize(data.text, textWidth)
  const textHeight = lines.length * 3.45
  const mapHeight = data.mapImage ? Math.min(65, visualWidth / (data.mapAspectRatio || 0.78)) : 0
  const tableWidth = Math.min(textWidth, 78)
  const tableHeight = data.tableImage ? Math.min(30, tableWidth / (data.tableAspectRatio || 2)) : 0
  const rightHeight = textHeight + tableHeight + (tableHeight ? 3 : 0)
  currentY = ensurePageSpace(doc, currentY, Math.max(mapHeight, rightHeight) + 13)
  currentY = renderSectionTitle(doc, currentY + 2, '2', 'Situación Hidrometeorológica actual')
  const startY = currentY
  const textX = PAGE.left + visualWidth + gap
  if (data.mapImage) doc.addImage(data.mapImage, 'PNG', PAGE.left, startY, visualWidth, mapHeight)
  const textBottom = renderRichParagraph(doc, startY, hydrometeorologySegments(data.text), {
    left: textX,
    width: textWidth,
    fontSize: 7.4,
    lineHeight: 3.45,
    estimatedHeight: textHeight,
  })
  let rightBottom = textBottom
  if (data.tableImage) {
    const tableX = textX + (textWidth - tableWidth) / 2
    const tableY = textBottom + 1
    doc.addImage(data.tableImage, 'PNG', tableX, tableY, tableWidth, tableHeight)
    rightBottom = tableY + tableHeight
  }
  return Math.max(startY + mapHeight, rightBottom) + 3
}

function renderHydrometeorologyForecast(doc, currentY, data) {
  const maps = Array.isArray(data.maps) ? data.maps.slice(0, 4) : []
  if (maps.length !== 4) return currentY
  const gap = 2.5
  const slotWidth = (PAGE.contentWidth - gap * 3) / 4
  const imageHeights = maps.map((map) => Math.min(64, slotWidth / (map.aspectRatio || 0.72)))
  const mapsHeight = 5 + Math.max(...imageHeights)
  font(doc, 'normal', 7.6)
  const summaryLines = doc.splitTextToSize(data.text, PAGE.contentWidth)
  const requiredHeight = 13 + mapsHeight + summaryLines.length * 3.6 + 5
  currentY = ensurePageSpace(doc, currentY, requiredHeight)
  currentY = renderSectionTitle(doc, currentY + 2, '2', 'Situación Hidrometeorológica actual')
  const startY = currentY
  const summaryBottom = renderRichParagraph(doc, startY, hydrometeorologySegments(data.text), {
    fontSize: 7.6,
    lineHeight: 3.6,
    estimatedHeight: summaryLines.length * 3.6,
  })
  const mapsY = summaryBottom + 1
  maps.forEach((map, index) => {
    const x = PAGE.left + index * (slotWidth + gap)
    font(doc, 'bold', 6.7, C.navy)
    doc.text(map.region, x + slotWidth / 2, mapsY + 2.7, { align: 'center' })
    const imageHeight = imageHeights[index]
    doc.addImage(map.image, 'PNG', x, mapsY + 5, slotWidth, imageHeight)
  })
  return mapsY + mapsHeight + 3
}

function renderWaterBodyTable(doc, currentY, rows, title, titleColor) {
  if (!rows.length) return currentY
  currentY = ensurePageSpace(doc, currentY, 32)
  doc.setFillColor(...titleColor)
  doc.rect(PAGE.left, currentY, PAGE.contentWidth, 5.2, 'F')
  font(doc, 'bold', 6.3, C.white)
  doc.text(title, PAGE.left + 2, currentY + 3.6)
  currentY += 5.2

  const columns = WATER_BODY_COLUMNS
  const body = rows.map((row, index) => columns.map((column) => column.key === '__no__' ? index + 1 : String(row?.[column.key] ?? '')))
  const columnStyles = Object.fromEntries(columns.map((column, index) => [index, {
    cellWidth: column.width,
    ...(column.key === 'Provincia' ? { halign: 'left' } : {}),
  }]))

  autoTable(doc, {
    startY: currentY,
    head: [columns.map((column) => column.label)],
    body,
    theme: 'grid',
    tableWidth: PAGE.contentWidth,
    margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.height - PAGE.bottom },
    styles: { font: 'BarlowCondensed', fontSize: 5.8, cellPadding: 0.55, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: C.line },
    headStyles: { fillColor: [252, 232, 218], textColor: C.black, fontStyle: 'bold', minCellHeight: 7 },
    bodyStyles: { fillColor: C.white },
    columnStyles,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didParseCell: ({ cell, column, section }) => {
      if (section === 'body' && isBoldEntityColumn(columns[column.index])) cell.styles.fontStyle = 'bold'
    },
  })
  return doc.lastAutoTable.finalY + 3
}

function renderWaterBodies(doc, currentY, overflowedRows, risingRows, metadata) {
  if (!overflowedRows.length && !risingRows.length) return currentY
  currentY = ensurePageSpace(doc, currentY, 18)
  font(doc, 'normal', 10.5, C.blue)
  doc.text('ESTADO DE CUERPOS DE AGUA.', PAGE.left, currentY)
  currentY += 5
  currentY = renderRichParagraph(doc, currentY, [
    { text: 'Al cierre de este informe, las Unidades de Monitoreo de la' },
    { text: 'SNGR', bold: true },
    { text: 'han identificado:' },
    { text: `${fmt(risingRows.length)} cuerpos hídricos con tendencia a subir de nivel`, bold: true },
    { text: 'y' },
    { text: `${fmt(overflowedRows.length)} cuerpos hídricos desbordados.`, bold: true },
  ], { fontSize: 7.7, lineHeight: 3.6, estimatedHeight: 10 })
  currentY = renderWaterBodyTable(doc, currentY, overflowedRows, `${fmt(overflowedRows.length)} CUERPOS HÍDRICOS DESBORDADOS`, C.red)
  currentY = renderWaterBodyTable(doc, currentY, risingRows, `${fmt(risingRows.length)} CUERPOS HÍDRICOS CON TENDENCIA A SUBIR DE NIVEL`, C.orange)
  return sourceLine(doc, currentY, metadata) + 2
}

function heat(value, maximum) {
  const numericValue = n(value)
  if (maximum > 0 && numericValue === maximum) return C.red
  const percentageOfMaximum = maximum > 0 ? (numericValue / maximum) * 100 : 0
  if (percentageOfMaximum < 3) return C.green
  if (percentageOfMaximum < 10) return C.yellowGreen
  if (percentageOfMaximum < 30) return C.yellow
  return C.orangeScale
}

function provinceImpactHeat(value, maximum) {
  const numericValue = n(value)
  if (maximum > 0 && numericValue === maximum) return C.red
  const percentageOfMaximum = maximum > 0 ? (numericValue / maximum) * 100 : 0
  if (percentageOfMaximum < 0.3) return C.green
  if (percentageOfMaximum <= 1) return C.yellowGreen
  if (percentageOfMaximum <= 30) return C.yellow
  return C.orangeScale
}

function verticalHeader(doc, text, cell, size = 5.5) {
  font(doc, 'normal', size, C.white)
  doc.text(String(text), cell.x + cell.width / 2 + 0.7, cell.y + cell.height - 2, { angle: 90, align: 'left' })
}

function keepNumericCellSingleLine(doc, cell, cellWidth) {
  const text = cell.text.join('')
  cell.text = [text]
  cell.styles.overflow = 'hidden'
  if (!text) return
  const currentSize = Number(cell.styles.fontSize) || 5
  doc.setFont('BarlowCondensed', cell.styles.fontStyle || 'normal')
  doc.setFontSize(currentSize)
  const textWidth = doc.getTextWidth(text)
  const availableWidth = Math.max(0.5, cellWidth - 0.2)
  if (textWidth > availableWidth) cell.styles.fontSize = Math.max(2.4, currentSize * (availableWidth / textWidth) * 0.96)
}

function eventColumns(items) {
  if (!items.length) return []
  const known = new Set(EVENT_TYPES.map((type) => type.key))
  const dynamic = [...new Set(items.flatMap((row) => Object.keys(row || {})))]
    .filter((key) => !['Provincia', 'ProvinciaID', 'NumeroEventos'].includes(key) && !known.has(key))
    .map((key) => ({ key, label: humanize(key) }))
  const types = [...EVENT_TYPES, ...dynamic].filter((type) => has(items, type.key) && sum(items, type.key) !== 0)
  return [{ key: '__no__', label: 'No.', type: 'index' }, { key: 'Provincia', label: 'Provincia', type: 'text' },
    { key: 'NumeroEventos', label: 'Nro. de eventos adversos', type: 'number' },
    ...types.map((type) => ({ ...type, type: 'number', vertical: true }))]
}

function renderEventsTable(doc, currentY, items, metadata) {
  const columns = eventColumns(items)
  if (!columns.length || !has(items, 'NumeroEventos') || sum(items, 'NumeroEventos') === 0) return currentY
  currentY = renderSectionTitle(doc, currentY + 2, '3', 'Eventos Adversos y Afectaciones - Resumen')
  const totalEvents = sum(items, 'NumeroEventos')
  currentY = renderRichParagraph(doc, currentY, [
    { text: `Desde el ${metadata.startNumeric} hasta el ${metadata.endNumeric}, por lluvias se registraron un total de` },
    { text: `${fmt(totalEvents)} eventos adversos,`, bold: true },
    { text: 'distribuidos de la siguiente manera:' },
  ], { fontSize: 8.4, lineHeight: 4, estimatedHeight: 10 })
  currentY = ensurePageSpace(doc, currentY, 45)
  const sorted = [...items].sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
  const body = sorted.map((row, index) => columns.map((column) => column.type === 'index' ? index + 1
    : column.type === 'text' ? String(row?.[column.key] ?? '') : fmt(row?.[column.key] ?? 0)))
  body.push(columns.map((column) => column.type === 'index' ? '' : column.type === 'text' ? 'Total general' : fmt(sum(items, column.key))))
  body.push(columns.map((column) => ['index', 'text'].includes(column.type) || column.key === 'NumeroEventos' ? '' : pct(totalEvents ? (sum(items, column.key) / totalEvents) * 100 : 0)))
  const fixed = 40, eventWidth = (PAGE.contentWidth - fixed) / Math.max(columns.length - 3, 1)
  const columnStyles = {
    0: { cellWidth: 6 },
    1: { cellWidth: 24, halign: 'left', overflow: 'linebreak' },
    2: { cellWidth: 10, cellPadding: 0.1, overflow: 'hidden' },
  }
  columns.slice(3).forEach((_, index) => {
    columnStyles[index + 3] = { cellWidth: eventWidth, cellPadding: 0.1, overflow: 'hidden' }
  })
  const maxEvents = Math.max(1, ...sorted.map((row) => n(row?.NumeroEventos)))
  const maxEventTypeTotal = Math.max(1, ...columns.slice(3).map((column) => sum(items, column.key)))
  autoTable(doc, {
    startY: currentY, head: [columns.map((column) => column.label)], body, theme: 'grid', tableWidth: PAGE.contentWidth,
    margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.height - PAGE.bottom },
    styles: { font: 'BarlowCondensed', fontSize: 6.1, cellPadding: 0.55, halign: 'center', valign: 'middle', lineWidth: 0.12, lineColor: C.line, minCellHeight: 4 },
    headStyles: { fillColor: C.navy, textColor: C.white, minCellHeight: 30, fontSize: 6 },
    alternateRowStyles: { fillColor: C.alternate }, columnStyles, rowPageBreak: 'avoid', showHead: 'everyPage',
    didParseCell: ({ cell, column, row, section }) => {
      if (section === 'head' && columns[column.index]?.vertical) cell.text = ['']
      if (section !== 'body') return
      if (column.index >= 1) cell.styles.fontStyle = 'bold'
      if (row.index === body.length - 2) Object.assign(cell.styles, { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' })
      else if (row.index === body.length - 1) {
        if (column.index < 3) { cell.styles.fillColor = C.white; cell.text = [''] }
        else cell.styles.fillColor = heat(sum(items, columns[column.index].key), maxEventTypeTotal)
      } else if (columns[column.index]?.key === 'NumeroEventos') cell.styles.fillColor = heat(n(sorted[row.index]?.NumeroEventos), maxEvents)
      if (column.index >= 2) keepNumericCellSingleLine(doc, cell, column.index === 2 ? 10 : eventWidth)
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section === 'head' && columns[column.index]?.vertical) verticalHeader(doc, columns[column.index].label, cell, Math.min(5.8, eventWidth * 1.15))
    },
  })
  return sourceLine(doc, doc.lastAutoTable.finalY + 3, metadata) + 2
}

function indicatorGroups(items, viasItems) {
  const grouped = new Map(GROUPS.map((group) => [group, []]))
  INDICATORS.forEach((item) => {
    const value = sum(items, item.key)
    if (has(items, item.key) && value !== 0) grouped.get(item.group).push({ ...item, value })
  })
  const infrastructure = grouped.get('Afectación a servicios básicos esenciales e infraestructura')
  viasItems.map((row) => ({ label: String(row?.['Categoria de Vía'] || row?.Categoria || row?.categoria || '').trim(), value: n(row?.Kilometros || row?.kilometros) }))
    .filter((row) => row.label && row.value !== 0).reverse().forEach((row) => infrastructure.unshift({ key: `via_${row.label}`, ...row, icon: 'metros vias afectados.png', decimal: true }))
  return GROUPS.map((name) => ({ name, items: grouped.get(name) })).filter((group) => group.items.length)
}

function renderIndicator(doc, assets, item, x, y, width) {
  if (assets.icons[item.icon]) doc.addImage(assets.icons[item.icon], 'PNG', x, y + 0.4, 6.5, 6.5)
  font(doc, 'normal', 8.8, C.orange); doc.text(`${item.label}:`, x + 9, y + 5.2)
  font(doc, 'bold', 11.3, C.navy); doc.text(fmt(item.value, item.decimal), x + width - 2, y + 5.2, { align: 'right' })
}

function renderAffectationsSummary(doc, currentY, items, viasItems, assets, metadata) {
  const groups = indicatorGroups(items, viasItems)
  if (!groups.length) return currentY
  font(doc, 'normal', 8.4)
  currentY = ensurePageSpace(doc, currentY, 12)
  currentY = wrapped(doc, 'Por los eventos detallados en la tabla anterior, se han registrado las siguientes afectaciones:', PAGE.left, currentY, PAGE.contentWidth) + 2
  const gap = 7, width = (PAGE.contentWidth - gap) / 2
  groups.forEach((group) => {
    currentY = ensurePageSpace(doc, currentY, Math.min(5.5 + Math.ceil(group.items.length / 2) * 8.2, 22))
    doc.setFillColor(...C.pale); doc.rect(PAGE.left, currentY, PAGE.contentWidth, 5.2, 'F')
    font(doc, 'normal', 9.5, C.navy); doc.text(group.name, PAGE.width / 2, currentY + 3.8, { align: 'center' }); currentY += 5.8
    for (let index = 0; index < group.items.length; index += 2) {
      const previousY = currentY
      currentY = ensurePageSpace(doc, currentY, 8.4)
      if (currentY !== previousY) {
        doc.setFillColor(...C.pale); doc.rect(PAGE.left, currentY, PAGE.contentWidth, 5.2, 'F')
        font(doc, 'normal', 9.5, C.navy); doc.text(`${group.name} (continuación)`, PAGE.width / 2, currentY + 3.8, { align: 'center' }); currentY += 5.8
      }
      renderIndicator(doc, assets, group.items[index], PAGE.left + 2, currentY, width - 2)
      if (group.items[index + 1]) renderIndicator(doc, assets, group.items[index + 1], PAGE.left + width + gap, currentY, width - 2)
      currentY += 8.2
    }
    currentY += 1.2
  })
  return sourceLine(doc, currentY, metadata) + 2
}

function renderProvinceDetail(doc, currentY, items, metadata) {
  const columns = DETAIL_COLUMNS.filter((column) => ['__no__', 'Provincia'].includes(column.key)
    || (has(items, column.key) && sum(items, column.key) !== 0))
  if (!items.length || columns.length < 2) return currentY
  currentY = ensurePageSpace(doc, currentY, 70)
  currentY = renderSectionTitle(doc, currentY, '4', 'Detalle de afectaciones por provincias')
  const top = ranking(items, 4)
  if (top.length) {
    const [first, ...rest] = top
    const segments = [
      { text: 'La provincia con mayor impacto a la población es' },
      { text: `${first.provincia} con ${fmt(first.impactadas)} personas impactadas en ${fmt(first.eventos)} eventos${rest.length ? ',' : '.'}`, bold: true },
    ]
    if (rest.length) {
      segments.push({ text: 'seguido de' })
      rest.forEach((row, index) => segments.push({
        text: `${row.provincia} con ${fmt(row.impactadas)} personas impactadas en ${fmt(row.eventos)} eventos${index === rest.length - 1 ? '.' : ','}`,
        bold: true,
      }))
    }
    currentY = renderRichParagraph(doc, currentY, segments, { fontSize: 8.3, lineHeight: 3.9, estimatedHeight: 14 })
  }
  const sorted = [...items].sort((a, b) => (
    n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas)
    || n(b?.NumeroEventos) - n(a?.NumeroEventos)
  ))
  const body = sorted.map((row, index) => columns.map((column) => column.type === 'index' ? index + 1
    : column.type === 'text' ? String(row?.[column.key] ?? '') : fmt(row?.[column.key] ?? 0, column.type === 'decimal')))
  body.push(columns.map((column) => column.type === 'index' ? '' : column.type === 'text' ? 'Total general' : fmt(sum(items, column.key), column.type === 'decimal')))
  const fixed = 29.5, numericWidth = (PAGE.contentWidth - fixed) / Math.max(columns.length - 2, 1)
  const columnStyles = { 0: { cellWidth: 5.5 }, 1: { cellWidth: 24, halign: 'left', overflow: 'linebreak' } }
  columns.slice(2).forEach((_, index) => {
    columnStyles[index + 2] = { cellWidth: numericWidth, cellPadding: 0.1, overflow: 'hidden' }
  })
  const maxPeople = Math.max(1, ...sorted.map((row) => n(row?.ImpactadasPersonas)))
  autoTable(doc, {
    startY: currentY, head: [columns.map((column) => column.label)], body, theme: 'grid', tableWidth: PAGE.contentWidth,
    margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.height - PAGE.bottom },
    styles: { font: 'BarlowCondensed', fontSize: Math.max(4.7, Math.min(6, numericWidth * 1.15)), cellPadding: 0.35, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: C.line, minCellHeight: 3.7 },
    headStyles: { fillColor: C.navy, textColor: C.white, minCellHeight: 32, fontSize: 5.3 },
    alternateRowStyles: { fillColor: C.alternate }, columnStyles, rowPageBreak: 'avoid', showHead: 'everyPage',
    didParseCell: ({ cell, column, row, section }) => {
      if (section === 'head' && column.index >= 2) cell.text = ['']
      if (section !== 'body') return
      if (column.index >= 1) cell.styles.fontStyle = 'bold'
      if (row.index === body.length - 1) Object.assign(cell.styles, { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' })
      else if (columns[column.index]?.key === 'ImpactadasPersonas') cell.styles.fillColor = provinceImpactHeat(n(sorted[row.index]?.ImpactadasPersonas), maxPeople)
      if (column.index >= 2) keepNumericCellSingleLine(doc, cell, numericWidth)
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section === 'head' && column.index >= 2) verticalHeader(doc, columns[column.index].label, cell, Math.max(4.4, Math.min(5.3, numericWidth)))
    },
  })
  return sourceLine(doc, doc.lastAutoTable.finalY + 3, metadata, '. Nota: Personas impactadas incluye personas afectadas y damnificadas.') + 2
}

function renderProvinceImpactChart(doc, currentY, items, metadata) {
  const rows = items.map((row) => ({ label: String(row?.Provincia || '').trim(), events: n(row?.NumeroEventos), people: n(row?.ImpactadasPersonas) }))
    .filter((row) => row.label && (row.events || row.people)).sort((a, b) => b.people - a.people || b.events - a.events)
  if (!rows.length || !has(items, 'ImpactadasPersonas')) return currentY
  currentY = ensurePageSpace(doc, currentY, 78)
  const x = PAGE.left + 14, y = currentY + 11, width = PAGE.contentWidth - 28, height = 40
  const maxEvents = Math.max(...rows.map((row) => row.events), 1), maxPeople = Math.max(...rows.map((row) => row.people), 1), slot = width / rows.length
  const barWidth = Math.max(1.2, slot * 0.5)
  const bars = rows.map((row, index) => {
    const barX = x + index * slot + (slot - barWidth) / 2
    const barHeight = (row.events / maxEvents) * height
    return { x: barX, width: barWidth, height: barHeight, top: y + height - barHeight }
  })
  const barCenters = bars.map((bar) => bar.x + bar.width / 2)
  const tickPositions = [...barCenters]
  const peopleValues = rows.map((row) => row.people)
  if (rows.length !== bars.length || bars.length !== barCenters.length || barCenters.length !== peopleValues.length
    || tickPositions.some((tick, index) => tick !== barCenters[index])) {
    throw new Error('Las provincias, barras, centros, ticks y eventos de la gráfica no están alineados.')
  }
  font(doc, 'normal', 12, C.gray); doc.text('Número de eventos vs Personas Impactadas por provincia', PAGE.width / 2, currentY + 4, { align: 'center' })
  for (let index = 0; index <= 4; index += 1) {
    const gridY = y + height - (height * index / 4)
    doc.setDrawColor(225, 225, 225); doc.setLineWidth(0.12); doc.line(x, gridY, x + width, gridY)
    font(doc, 'bold', 4.1, C.gray)
    doc.text(fmt(Math.round(maxEvents * index / 4)), x - 1.5, gridY + 1, { align: 'right' })
    doc.text(fmt(Math.round(maxPeople * index / 4)), x + width + 1.5, gridY + 1)
  }
  const valueLabelMinWidth = 4
  const valueLabelHorizontalPadding = 0.2
  const valueLabelHeight = 3.8
  const valueLabelTextOffsetY = 2.65
  const valueLabelGap = 0.2
  const collisionOffsetY = 4
  const valueLabelMetrics = (text) => {
    font(doc, 'bold', 6, C.gray)
    return {
      width: Math.max(valueLabelMinWidth, doc.getTextWidth(text) + valueLabelHorizontalPadding),
      height: valueLabelHeight,
    }
  }
  const valueLabel = (text, centerX, top, fillColor) => {
    const metrics = valueLabelMetrics(text)
    doc.setFillColor(...fillColor); doc.rect(centerX - metrics.width / 2, top, metrics.width, metrics.height, 'F')
    doc.text(text, centerX, top + valueLabelTextOffsetY, { align: 'center' })
  }
  const points = barCenters.map((centerX, index) => [centerX, y + height - (peopleValues[index] / maxPeople) * height])
  const eventLabels = rows.map(() => null)
  font(doc, 'bold', 3.9, C.gray)
  const maxProvinceLabelWidth = Math.max(...rows.map((row) => doc.getTextWidth(row.label.toUpperCase())))
  const labelAngle = 65
  const labelRadians = labelAngle * Math.PI / 180
  // Distancia entre la base de la gráfica y los nombres de las provincias.
  // Este valor es independiente del desplazamiento de las etiquetas que se cruzan.
  const provinceLabelOffset = 5
  rows.forEach((row, index) => {
    const bar = bars[index]
    const centerX = barCenters[index]
    doc.setFillColor(69, 114, 190); doc.rect(bar.x, bar.top, bar.width, bar.height, 'F')
    if (row.events) eventLabels[index] = {
      text: fmt(row.events), centerX,
      top: Math.max(y - valueLabelHeight - 0.4, bar.top - valueLabelHeight - valueLabelGap),
    }
    const provinceLabel = row.label.toUpperCase()
    const labelAnchorY = y + height + provinceLabelOffset
    const labelWidth = doc.getTextWidth(provinceLabel)
    const rightAlignedX = tickPositions[index] + labelWidth * (1 - Math.cos(labelRadians))
    const rightAlignedY = labelAnchorY + labelWidth * Math.sin(labelRadians)
    doc.text(provinceLabel, rightAlignedX, rightAlignedY, { angle: labelAngle, align: 'right' })
  })
  doc.setDrawColor(...C.orange); doc.setLineWidth(0.7)
  for (let index = 1; index < points.length; index += 1) doc.line(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1])
  points.forEach(([px, py]) => {
    doc.setFillColor(...C.orange); doc.circle(px, py, 0.7, 'F')
  })
  eventLabels.filter(Boolean).forEach((label) => valueLabel(label.text, label.centerX, label.top, C.alternate))
  points.forEach(([px, py], index) => {
    if (!rows[index].people) return
    const text = fmt(rows[index].people)
    let labelTop = Math.max(y - valueLabelHeight - 0.4, py - valueLabelHeight - valueLabelGap)
    const eventLabel = eventLabels[index]
    if (eventLabel) {
      const peopleMetrics = valueLabelMetrics(text)
      const eventMetrics = valueLabelMetrics(eventLabel.text)
      const eventLeft = eventLabel.centerX - eventMetrics.width / 2
      const eventRight = eventLabel.centerX + eventMetrics.width / 2
      const peopleLeft = px - peopleMetrics.width / 2
      const peopleRight = px + peopleMetrics.width / 2
      const overlapsHorizontally = peopleRight > eventLeft && peopleLeft < eventRight
      const overlapsVertically = labelTop + peopleMetrics.height > eventLabel.top
        && labelTop < eventLabel.top + eventMetrics.height
      if (overlapsHorizontally && overlapsVertically) labelTop += collisionOffsetY
    }
    valueLabel(text, px, labelTop, C.lightOrange)
  })
  font(doc, 'normal', 3.9, C.gray)
  const labelDepth = maxProvinceLabelWidth * Math.sin(labelRadians)
  const legendY = y + height + Math.max(17, labelDepth + provinceLabelOffset + 4), legendX = PAGE.width / 2 - 31
  doc.setFillColor(69, 114, 190); doc.rect(legendX, legendY - 2.1, 5, 2.4, 'F')
  font(doc, 'normal', 5.2, C.gray); doc.text('Nro. de eventos', legendX + 6.5, legendY)
  doc.setDrawColor(...C.orange); doc.setLineWidth(0.7); doc.line(legendX + 39, legendY - 1, legendX + 45, legendY - 1)
  doc.setFillColor(...C.orange); doc.circle(legendX + 42, legendY - 1, 0.65, 'F')
  font(doc, 'normal', 5.2, C.gray); doc.text('Personas Impactadas', legendX + 46.5, legendY)
  return sourceLine(doc, legendY + 6, metadata)
}

function renderMonthlySummary(doc, currentY, items, metadata) {
  const rows = items.map((row) => ({ month: String(row?.mes || '').trim(), events: n(row?.eventos), people: n(row?.personas_impactadas) })).filter((row) => row.month)
  if (!rows.length) return currentY
  const totalEvents = rows.reduce((total, row) => total + row.events, 0), totalPeople = rows.reduce((total, row) => total + row.people, 0)
  const top = [...rows].sort((a, b) => b.people - a.people)[0]
  currentY = ensurePageSpace(doc, currentY, 68)
  font(doc, 'normal', 8.4)
  currentY = wrapped(doc, `Desde el ${metadata.startNumeric} hasta el ${metadata.endNumeric}, el mayor impacto a la población se registró en ${top.month}, con ${pct(totalPeople ? (top.people / totalPeople) * 100 : 0)}.`, PAGE.left, currentY, PAGE.contentWidth) + 3
  const columns = [
    { key: 'month', label: 'Mes', total: 'Total general' },
    ...(totalEvents !== 0 ? [
      { key: 'events', label: 'Número de eventos', total: fmt(totalEvents) },
    ] : []),
    ...(totalPeople !== 0 ? [
      { key: 'people', label: 'Personas impactadas', total: fmt(totalPeople) },
    ] : []),
    ...(totalEvents !== 0 ? [
      { key: 'eventPct', label: '% de recurrencia Eventos', total: '100%' },
    ] : []),
    ...(totalPeople !== 0 ? [
      { key: 'peoplePct', label: '% de Personas Impactadas', total: '100%' },
    ] : []),
  ]
  const body = rows.map((row) => columns.map((column) => {
    if (column.key === 'month') return row.month
    if (column.key === 'events') return fmt(row.events)
    if (column.key === 'people') return fmt(row.people)
    if (column.key === 'eventPct') return pct(row.events / totalEvents * 100)
    return pct(row.people / totalPeople * 100)
  }))
  body.push(columns.map((column) => column.total))
  const maxMonthlyEvents = Math.max(1, ...rows.map((row) => row.events))
  const maxMonthlyPeople = Math.max(1, ...rows.map((row) => row.people))
  autoTable(doc, {
    startY: currentY, head: [columns.map((column) => column.label)], body,
    theme: 'grid', margin: { left: PAGE.left }, tableWidth: 84,
    styles: { font: 'BarlowCondensed', fontSize: 6.8, cellPadding: 1, halign: 'center', lineWidth: 0.12, lineColor: C.line },
    headStyles: { fillColor: C.navy, textColor: C.white }, alternateRowStyles: { fillColor: C.alternate },
    didParseCell: ({ cell, column, row, section }) => {
      if (section !== 'body') return
      if (row.index === body.length - 1) {
        Object.assign(cell.styles, { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' })
        return
      }
      const columnKey = columns[column.index]?.key
      if (columnKey !== 'month') cell.styles.fontStyle = 'bold'
      if (columnKey === 'eventPct') cell.styles.fillColor = heat(rows[row.index].events, maxMonthlyEvents)
      if (columnKey === 'peoplePct') cell.styles.fillColor = heat(rows[row.index].people, maxMonthlyPeople)
    },
  })
  const x = PAGE.left + 93, y = currentY + 9, width = PAGE.contentWidth - 96, height = Math.min(36, Math.max(24, doc.lastAutoTable.finalY - y))
  const maxEvents = Math.max(...rows.map((row) => row.events), 1), maxPeople = Math.max(...rows.map((row) => row.people), 1), slot = width / rows.length
  font(doc, 'normal', 7.5, C.gray); doc.text('Recurrencia de eventos vs personas impactadas por mes', x + width / 2, currentY + 4, { align: 'center' })
  const points = []
  const eventLabels = []
  const labelHeight = 3.8
  const labelGap = 0.7
  const collisionOffsetY = 5
  const labelMetrics = (text) => {
    font(doc, 'bold', 5, C.gray)
    return { width: Math.max(4, doc.getTextWidth(text) + 0.8), height: labelHeight }
  }
  const drawLabel = (text, centerX, top, fillColor, textColor) => {
    const metrics = labelMetrics(text)
    doc.setFillColor(...fillColor)
    doc.rect(centerX - metrics.width / 2, top, metrics.width, metrics.height, 'F')
    font(doc, 'bold', 5, textColor)
    doc.text(text, centerX, top + 2.65, { align: 'center' })
  }
  rows.forEach((row, index) => {
    const bx = x + index * slot + slot * 0.25, bw = slot * 0.5, bh = row.events / maxEvents * height
    const centerX = bx + bw / 2
    doc.setFillColor(69, 114, 190); doc.rect(bx, y + height - bh, bw, bh, 'F')
    points.push([centerX, y + height - row.people / maxPeople * height])
    eventLabels.push({
      text: fmt(row.events),
      centerX,
      top: Math.max(y - labelHeight - 0.4, y + height - bh - labelHeight - labelGap),
    })
    font(doc, 'normal', 5.2, C.gray); doc.text(row.month, centerX, y + height + 8, { align: 'center' })
  })
  doc.setDrawColor(...C.orange); doc.setLineWidth(0.6)
  for (let index = 1; index < points.length; index += 1) doc.line(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1])
  points.forEach(([px, py]) => {
    doc.setFillColor(...C.orange)
    doc.circle(px, py, 0.65, 'F')
  })
  eventLabels.forEach((label) => drawLabel(label.text, label.centerX, label.top, C.pale, C.blue))
  points.forEach(([px, py], index) => {
    const text = fmt(rows[index].people)
    let labelTop = Math.max(y - labelHeight - 0.4, py - labelHeight - labelGap)
    const eventLabel = eventLabels[index]
    const peopleMetrics = labelMetrics(text)
    const eventMetrics = labelMetrics(eventLabel.text)
    const overlapsHorizontally = px + peopleMetrics.width / 2 > eventLabel.centerX - eventMetrics.width / 2
      && px - peopleMetrics.width / 2 < eventLabel.centerX + eventMetrics.width / 2
    const overlapsVertically = labelTop + peopleMetrics.height > eventLabel.top
      && labelTop < eventLabel.top + eventMetrics.height
    if (overlapsHorizontally && overlapsVertically) labelTop += collisionOffsetY
    drawLabel(text, px, labelTop, C.lightOrange, C.black)
  })

  const legendY = y + height + 15
  const legendX = x + width / 2 - 31
  doc.setFillColor(69, 114, 190)
  doc.rect(legendX, legendY - 2.1, 7, 2.6, 'F')
  font(doc, 'normal', 5.2, C.gray)
  doc.text('Nro. de eventos', legendX + 9, legendY)
  doc.setDrawColor(...C.orange)
  doc.setLineWidth(0.7)
  doc.line(legendX + 42, legendY - 1, legendX + 49, legendY - 1)
  doc.setFillColor(...C.orange)
  doc.circle(legendX + 45.5, legendY - 1, 0.7, 'F')
  font(doc, 'normal', 5.2, C.gray)
  doc.text('Personas Impactadas', legendX + 51, legendY)

  return sourceLine(doc, Math.max(doc.lastAutoTable.finalY, legendY + 4) + 3, metadata)
}

function detectColumns(items, priority = []) {
  const keys = [...new Set(items.flatMap((row) => Object.keys(row || {})))]
  return [...priority.filter((key) => keys.includes(key)), ...keys.filter((key) => !priority.includes(key))]
    .filter((key) => {
      const values = items.map((row) => row?.[key]).filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      const numeric = values.length && values.every((value) => Number.isFinite(Number(String(value).replace(',', '.'))))
      return values.length && (!numeric || sum(items, key) !== 0)
    }).map((key) => {
      const values = items.map((row) => row?.[key]).filter((value) => value !== undefined && value !== null && String(value).trim() !== '')
      return { key, label: humanize(key), type: values.length && values.every((value) => Number.isFinite(Number(String(value).replace(',', '.')))) ? 'number' : 'text' }
    })
}

function renderGenericTable(doc, currentY, items, options = {}) {
  if (!items.length) return currentY
  const columns = (options.columns || detectColumns(items, options.priority))
    .filter((column) => !options.excludeKeys?.includes(column.key))
    .filter((column) => !['number', 'decimal'].includes(column.type) || sum(items, column.key) !== 0)
  if (!columns.length) return currentY
  currentY = ensurePageSpace(doc, currentY, 30)
  const body = items.map((row) => columns.map((column) => ['number', 'decimal'].includes(column.type)
    ? fmt(row?.[column.key], column.type === 'decimal') : String(row?.[column.key] ?? '')))
  if (options.total) body.push(columns.map((column, index) => ['number', 'decimal'].includes(column.type)
    ? fmt(sum(items, column.key), column.type === 'decimal') : index === 0 ? 'Total general' : ''))
  const provinceIndex = columns.findIndex((column) => /provincia/i.test(`${column.key} ${column.label}`))
  const textIndex = provinceIndex >= 0 ? provinceIndex : Math.max(0, columns.findIndex((column) => column.type === 'text'))
  const textWidth = provinceIndex >= 0 ? 24 : Math.min(44, PAGE.contentWidth * 0.34)
  const otherWidth = (PAGE.contentWidth - textWidth) / Math.max(columns.length - 1, 1), columnStyles = {}
  columns.forEach((column, index) => {
    columnStyles[index] = index === textIndex
      ? { cellWidth: textWidth, halign: 'left', overflow: 'linebreak' }
      : { cellWidth: otherWidth, ...(['number', 'decimal'].includes(column.type) ? { cellPadding: 0.1, overflow: 'hidden' } : {}) }
  })
  autoTable(doc, {
    startY: currentY, head: [columns.map((column) => column.label)], body, theme: 'grid', tableWidth: PAGE.contentWidth,
    margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.height - PAGE.bottom },
    styles: { font: 'BarlowCondensed', fontSize: options.fontSize || 6.2, cellPadding: 0.55, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: C.line },
    headStyles: { fillColor: C.navy, textColor: C.white, minCellHeight: options.vertical === false ? 7 : 25 },
    alternateRowStyles: { fillColor: C.alternate }, columnStyles, showHead: 'everyPage', rowPageBreak: 'avoid',
    didParseCell: ({ cell, column, row, section }) => {
      if (section === 'head' && options.vertical !== false && column.index !== textIndex) cell.text = ['']
      if (section === 'body' && options.total && row.index === body.length - 1) Object.assign(cell.styles, { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' })
      const isRequestedBoldColumn = options.boldColumns?.includes(columns[column.index]?.key)
      if (section === 'body' && (isBoldEntityColumn(columns[column.index]) || ['number', 'decimal'].includes(columns[column.index]?.type) || isRequestedBoldColumn)) cell.styles.fontStyle = 'bold'
      if (section === 'body' && ['number', 'decimal'].includes(columns[column.index]?.type)) keepNumericCellSingleLine(doc, cell, otherWidth)
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section === 'head' && options.vertical !== false && column.index !== textIndex) verticalHeader(doc, columns[column.index].label, cell, 5.2)
    },
  })
  return doc.lastAutoTable.finalY + 3
}

function renderTemporaryShelterSection(doc, currentY, number, title, items, priority, metadata, action) {
  if (!items.length) return currentY
  currentY = renderSectionTitle(doc, currentY, number, title)
  const shelterCount = items.length
  const actionText = shelterCount === 1 ? `se ha ${action.singular}` : `se han ${action.plural}`
  const shelterText = shelterCount === 1 ? 'alojamiento temporal' : 'alojamientos temporales'
  currentY = renderRichParagraph(doc, currentY, [
    { text: 'Desde el' },
    { text: '29 de agosto del 2026,', bold: true },
    { text: actionText },
    { text: `${fmt(shelterCount)} ${shelterText}.`, bold: true },
  ], { fontSize: 8.4, lineHeight: 4, estimatedHeight: 6 })
  currentY = renderGenericTable(doc, currentY, items, {
    priority,
    fontSize: 7,
    vertical: false,
    boldColumns: ['Apertura', 'Cierre'],
  })
  return sourceLine(doc, currentY, metadata) + 2
}

function renderTemporaryShelters(doc, currentY, openItems, closedItems, metadata) {
  currentY = renderTemporaryShelterSection(
    doc, currentY, '5.1', 'Alojamientos Temporales Abiertos', openItems,
    ['Provincia', 'Canton', 'Parroquia', 'Tipo', 'Nombre', 'Apertura'], metadata,
    { singular: 'activado', plural: 'activado' },
  )
  return renderTemporaryShelterSection(
    doc, currentY + 2, '5.2', 'Alojamientos Temporales Cerrados', closedItems,
    ['Provincia', 'Canton', 'Parroquia', 'Tipo', 'Nombre', 'Apertura', 'Cierre'], metadata,
    { singular: 'cerrado', plural: 'cerrado' },
  )
}

function renderAssistanceTable(doc, currentY, items, introSegments, metadata) {
  if (!items.length || sum(items, 'Total Bienes') <= 0) return currentY
  currentY = renderRichParagraph(doc, currentY, introSegments, {
    fontSize: 8.4,
    lineHeight: 4,
    estimatedHeight: 10,
  })
  currentY = renderGenericTable(doc, currentY, items, {
    priority: ['Provincias', 'Provincia', 'Familias Beneficiadas', 'Personas Beneficiadas', 'Total Bienes'],
    excludeKeys: ['ProvinciaID'],
    total: true,
    fontSize: 5.6,
  })
  return sourceLine(doc, currentY, metadata) + 2
}

function renderAssistance(doc, currentY, sngr, sndgird, metadata) {
  const hasSngr = sngr.length && sum(sngr, 'Total Bienes') > 0, hasSndgird = sndgird.length && sum(sndgird, 'Total Bienes') > 0
  if (!hasSngr && !hasSndgird) return currentY
  currentY = renderSectionTitle(doc, currentY +2, '6', 'Asistencia Humanitaria')
  if (hasSngr) currentY = renderAssistanceTable(doc, currentY, sngr, [
    { text: 'Por eventos producidos por lluvias desde el' },
    { text: metadata.startLong, bold: true },
    { text: 'hasta el' },
    { text: `${metadata.endLong},`, bold: true },
    { text: 'la' },
    { text: 'SNGR', bold: true },
    { text: 'ha entregado a la población un total de' },
    { text: `${fmt(sum(sngr, 'Total Bienes'))} bienes de asistencia:`, bold: true },
  ], metadata)
  if (hasSndgird) currentY = renderAssistanceTable(doc, currentY, sndgird, [
    { text: 'El resto del' },
    { text: 'SNDGIRD', bold: true },
    { text: 'ha entregado a la población un total de' },
    { text: `${fmt(sum(sndgird, 'Total Bienes'))} bienes de asistencia:`, bold: true },
  ], metadata)
  return currentY
}

function declarationDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return parsed.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).replaceAll('.', '')
}

function alertLevelColor(value) {
  const level = String(value ?? '').trim().toLowerCase()
  if (level.includes('rojo')) return [242, 13, 18]
  if (level.includes('naranja')) return C.orange
  if (level.includes('amarillo')) return C.yellow
  return null
}

function governmentLevelRank(value) {
  const order = { nacional: 0, regional: 1, provincial: 2, cantonal: 3 }
  return order[String(value ?? '').trim().toLowerCase()] ?? 4
}

function sortDeclarationsByGovernmentLevel(items) {
  return [...items].sort((left, right) => {
    const levelDifference = governmentLevelRank(left?.Ambito) - governmentLevelRank(right?.Ambito)
    if (levelDifference !== 0) return levelDifference
    return String(left?.FechaInicio ?? '').localeCompare(String(right?.FechaInicio ?? ''), 'es')
  })
}

function renderRichParagraph(doc, currentY, segments, options = {}) {
  const left = options.left || PAGE.left
  const width = options.width || PAGE.contentWidth
  const size = options.fontSize || 8.2
  const lineHeight = options.lineHeight || 4
  currentY = ensurePageSpace(doc, currentY, options.estimatedHeight || 32)
  let x = left
  let y = currentY

  segments.forEach((segment) => {
    const words = String(segment.text || '').trim().split(/\s+/).filter(Boolean)
    words.forEach((word) => {
      font(doc, segment.bold ? 'bold' : 'normal', size, C.black)
      let displayed = x === left ? word : ` ${word}`
      let wordWidth = doc.getTextWidth(displayed)
      if (x + wordWidth > left + width) {
        y += lineHeight
        x = left
        displayed = word
        wordWidth = doc.getTextWidth(displayed)
      }
      doc.text(displayed, x, y)
      x += wordWidth
    })
  })
  return y + lineHeight + 2
}

function renderDeclarationTable(doc, currentY, title, items, columns, colorAlerts = false) {
  if (!items.length) return currentY
  currentY = ensurePageSpace(doc, currentY, 28)
  font(doc, 'bold', 9.4, C.black)
  doc.text(title, PAGE.left + 2, currentY)
  doc.setDrawColor(...C.black)
  doc.setLineWidth(0.2)
  doc.line(PAGE.left + 2, currentY + 0.8, PAGE.left + 2 + doc.getTextWidth(title), currentY + 0.8)
  currentY += 7

  const body = items.map((row) => columns.map((column) => (
    column.key === 'FechaInicio' ? declarationDate(row?.[column.key]) : String(row?.[column.key] ?? '--')
  )))
  const columnStyles = Object.fromEntries(columns.map((column, index) => [index, {
    cellWidth: column.width,
    ...(column.key === 'Observacion' ? { halign: 'left' } : {}),
  }]))

  autoTable(doc, {
    startY: currentY,
    head: [columns.map((column) => column.label)],
    body,
    theme: 'grid',
    tableWidth: PAGE.contentWidth,
    margin: { left: PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.height - PAGE.bottom },
    styles: { font: 'BarlowCondensed', fontSize: 6.2, cellPadding: 0.75, halign: 'center', valign: 'middle', lineWidth: 0.12, lineColor: C.line },
    headStyles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: 'bold', minCellHeight: 9 },
    bodyStyles: { fillColor: C.white },
    columnStyles,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didParseCell: ({ cell, column, row, section }) => {
      if (section !== 'body') return
      if (isBoldEntityColumn(columns[column.index])) cell.styles.fontStyle = 'bold'
      if (!colorAlerts || columns[column.index]?.key !== 'NivelAlerta') return
      const fillColor = alertLevelColor(items[row.index]?.NivelAlerta)
      if (fillColor) {
        cell.styles.fillColor = fillColor
        cell.styles.textColor = String(items[row.index]?.NivelAlerta || '').toLowerCase().includes('amarillo') ? C.black : C.white
      }
    },
  })
  return doc.lastAutoTable.finalY + 7
}

function coePercentageColor(value) {
  const percentage = Number(value) || 0
  if (percentage === 0) return C.red
  if (percentage <= 50) return [246, 173, 85]
  if (percentage < 80) return C.yellow
  return C.green
}

function renderCoeSubtitle(doc, currentY, title) {
  currentY = ensurePageSpace(doc, currentY, 10)
  font(doc, 'bold', 8.2, C.black)
  doc.text(`-  ${title}`, PAGE.left + 4, currentY)
  return currentY + 4
}

function renderCoeTable(doc, currentY, items, columns, options = {}) {
  if (!items.length) return currentY
  const body = items.map((row, rowIndex) => columns.map((column) => {
    if (column.key === '__no__') return rowIndex + 1
    if (column.key === 'FechaInicial') return declarationDate(row?.[column.key])
    if (column.key === 'PorcentajeActivacion') return `${Number(row?.[column.key]) || 0}%`
    return String(row?.[column.key] ?? '--')
  }))
  const columnStyles = Object.fromEntries(columns.map((column, index) => [index, { cellWidth: column.width }]))

  autoTable(doc, {
    startY: currentY,
    head: [columns.map((column) => column.label)],
    body,
    theme: 'grid',
    tableWidth: options.tableWidth || PAGE.contentWidth,
    margin: { left: options.left || PAGE.left, right: PAGE.right, top: PAGE.top, bottom: PAGE.height - PAGE.bottom },
    styles: { font: 'BarlowCondensed', fontSize: options.fontSize || 6.2, cellPadding: 0.7, halign: 'center', valign: 'middle', lineWidth: 0.12, lineColor: C.line },
    headStyles: { fillColor: C.darkNavy, textColor: C.white, fontStyle: 'bold', minCellHeight: 8 },
    bodyStyles: { fillColor: C.white },
    columnStyles,
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didParseCell: ({ cell, column, row, section }) => {
      if (section !== 'body') return
      if (isBoldEntityColumn(columns[column.index]) || /total|porcentaje/i.test(columns[column.index]?.key || '')) cell.styles.fontStyle = 'bold'
      if (columns[column.index]?.key === 'Estado') cell.styles.textColor = [239, 68, 68]
      if (options.percentageColumn === column.index) cell.styles.fillColor = coePercentageColor(items[row.index]?.PorcentajeActivacion)
      if (options.totalRowIndex === row.index) {
        cell.styles.fillColor = C.pale
        cell.styles.textColor = C.black
        cell.styles.fontStyle = 'bold'
      }
    },
  })
  return doc.lastAutoTable.finalY + 6
}

function renderActivatedCoes(doc, currentY, nationalItems, provincialItems, municipalItems, parishItems, metadata) {
  const national = uniqueActiveCoeRows(nationalItems, ['TipoCOE'])[0] || null
  const provincial = uniqueActiveCoeRows(provincialItems, ['Provincia'])
    .sort((left, right) => String(left?.Provincia || '').localeCompare(String(right?.Provincia || ''), 'es'))
  const municipal = buildMunicipalCoeSummary(municipalItems)
  const parish = uniqueActiveCoeRows(parishItems, ['Provincia', 'Canton', 'Parroquia'])
    .sort((left, right) => String(left?.Provincia || '').localeCompare(String(right?.Provincia || ''), 'es'))
  if (!national && !provincial.length && !municipal.totalActive && !parish.length) return currentY

  currentY = ensurePageSpace(doc, currentY, 20)
  font(doc, 'bold', 9.4, C.black)
  const heading = 'Comités de Operaciones de Emergencias (COE) activados:'
  doc.text(heading, PAGE.left + 2, currentY)
  doc.setDrawColor(...C.black)
  doc.setLineWidth(0.2)
  doc.line(PAGE.left + 2, currentY + 0.8, PAGE.left + 2 + doc.getTextWidth(heading), currentY + 0.8)
  currentY += 5
  font(doc, 'normal', 8.2, C.black)
  currentY = wrapped(doc, `Desde el ${metadata.startLong} hasta el ${metadata.endLong} se han activado los siguientes COE:`, PAGE.left + 2, currentY, PAGE.contentWidth - 2) + 2

  if (national) {
    currentY = renderCoeSubtitle(doc, currentY, `COE Nacional activo desde el ${declarationDate(national.FechaInicial)}.`)
  }

  if (provincial.length) {
    currentY = renderCoeSubtitle(doc, currentY, `${fmt(provincial.length)} COE provinciales:`)
    currentY = renderCoeTable(doc, currentY, provincial, [
      { key: '__no__', label: 'Nro.', width: 10 },
      { key: 'Provincia', label: 'Provincia', width: 50 },
      { key: 'FechaInicial', label: 'Fecha de Activación', width: 32 },
      { key: 'Estado', label: 'Estado', width: 25 },
    ], { tableWidth: 117, left: PAGE.left + 20 })
  }

  if (municipal.totalActive) {
    currentY = renderCoeSubtitle(doc, currentY, `A nivel nacional, se registran ${fmt(municipal.totalActive)} COE Cantonales activos de un total de ${fmt(municipal.totalCantons)} cantones, lo que representa una activación global del ${municipal.globalPercentage}%.`)
    const municipalRows = [
      ...municipal.rows,
      { Provincia: 'Total general', TotalCantones: municipal.totalCantons, CantonesActivos: municipal.totalActive, PorcentajeActivacion: municipal.globalPercentage },
    ]
    currentY = renderCoeTable(doc, currentY, municipalRows, [
      { key: 'Provincia', label: 'Provincia', width: 52 },
      { key: 'TotalCantones', label: 'Total de Cantones', width: 32 },
      { key: 'CantonesActivos', label: 'Nro. de COE Cantonales Activos', width: 44 },
      { key: 'PorcentajeActivacion', label: '% de COE cantonales activos', width: 40 },
    ], { tableWidth: 168, left: PAGE.left + 2, percentageColumn: 3, totalRowIndex: municipalRows.length - 1 })
  }

  if (parish.length) {
    currentY = renderCoeSubtitle(doc, currentY, `${fmt(parish.length)} COE parroquiales:`)
    currentY = renderCoeTable(doc, currentY, parish, [
      { key: '__no__', label: 'Nro.', width: 8 },
      { key: 'Provincia', label: 'Provincia', width: 31 },
      { key: 'Canton', label: 'Cantón', width: 31 },
      { key: 'Parroquia', label: 'Parroquia', width: 38 },
      { key: 'FechaInicial', label: 'Fecha de Activación', width: 35 },
      { key: 'Estado', label: 'Estado', width: 25 },
    ], { tableWidth: 168, left: PAGE.left + 2 })
  }
  return currentY
}

function renderDeclarations(doc, currentY, alertDeclarations, emergencyDeclarations, nationalCoeItems, provincialCoeItems, municipalCoeItems, parishCoeItems, metadata) {
  const hasCoeData = nationalCoeItems.length || provincialCoeItems.length || municipalCoeItems.length || parishCoeItems.length
  if (!alertDeclarations.length && !emergencyDeclarations.length && !hasCoeData) return currentY
  currentY = renderSectionTitle(doc, currentY + 2, '7', 'Declaratorias emitidas y COE activados')
  const orderedAlerts = sortDeclarationsByGovernmentLevel(alertDeclarations)
  currentY = renderDeclarationTable(doc, currentY, 'Declaratorias de niveles de alertas en todo el país:', orderedAlerts, ALERT_DECLARATION_COLUMNS, true)
  currentY = renderDeclarationTable(doc, currentY, 'Declaratorias de emergencia en todo el país:', emergencyDeclarations, EMERGENCY_DECLARATION_COLUMNS)
  currentY = renderRichParagraph(doc, currentY, [
    { text: 'Además, mediante' },
    { text: 'Decreto ejecutivo Nro. 485, firmado el 31 de agosto de 2026, por el presidente del Ecuador Daniel Noboa Azin, resuelve declarar', bold: true },
    { text: 'como prioridad nacional la continuidad y el fortalecimiento de las acciones de prevención y preparación frente a los posibles efectos del fenómeno El Niño en el territorio nacional, así como la ejecución de las acciones de respuesta y recuperación que correspondan, en función de la evolución del evento y los escenarios de riesgos, en el marco de la Alerta Roja declarada en todo el territorio nacional, mediante Resolución No. SNGR-238-2026, del 29 de agosto de 2026.' },
  ], { fontSize: 8.2, lineHeight: 4, estimatedHeight: 32 })
  currentY = renderActivatedCoes(doc, currentY, nationalCoeItems, provincialCoeItems, municipalCoeItems, parishCoeItems, metadata)
  return sourceLine(doc, currentY, metadata)
}

function reportLines(value) {
  return String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
}

function affectationText(value) {
  const [label, ...amountParts] = String(value ?? '').split('=')
  if (!amountParts.length) return String(value ?? '').trim()
  return `${amountParts.join('=').trim()} ${label.trim()}`
}

function renderPagedText(doc, currentY, text, options = {}) {
  const left = options.left ?? PAGE.left
  const width = options.width ?? PAGE.contentWidth
  const lineHeight = options.lineHeight ?? 3.8
  const after = options.after ?? 1.5
  const lines = doc.splitTextToSize(String(text ?? '').trim(), width)
  if (!lines.length) return currentY
  font(doc, options.style || 'normal', options.fontSize || 8.2, options.color || C.black)
  lines.forEach((line) => {
    if (currentY + lineHeight > PAGE.bottom) {
      doc.addPage('a4', 'portrait')
      currentY = PAGE.top
      font(doc, options.style || 'normal', options.fontSize || 8.2, options.color || C.black)
    }
    doc.text(line, left, currentY)
    currentY += lineHeight
  })
  return currentY + after
}

function renderHighImpactEvents(doc, currentY, items, metadata) {
  if (!items.length) return currentY
  currentY = renderSectionTitle(doc, currentY + 4, '8', 'Eventos adversos de alto impacto')
  currentY = renderPagedText(doc, currentY, 'A continuación, se detallan los eventos adversos relevantes de los últimos días:', { fontSize: 8.7, after: 2.5 })

  let activeZone = null
  items.forEach((item) => {
    const zone = String(item?.Zona ?? '').trim() || 'Sin zona'
    if (zone !== activeZone) {
      currentY = ensurePageSpace(doc, currentY, 12)
      font(doc, 'italic', 9.2, [11, 31, 120])
      doc.text(`Zona ${zone}`, PAGE.left + 5, currentY)
      currentY += 5
      activeZone = zone
    }

    currentY = ensurePageSpace(doc, currentY, 22)
    doc.setFillColor(23, 74, 139)
    doc.circle(PAGE.left + 2.2, currentY - 1.1, 0.75, 'F')
    currentY = renderPagedText(doc, currentY, `${String(item?.Ubicacion || 'Ubicación no registrada').trim()}.`, {
      left: PAGE.left + 7,
      width: PAGE.contentWidth - 7,
      style: 'bold',
      fontSize: 8.6,
      color: [11, 31, 120],
      after: 0.8,
    })

    if (String(item?.Antecedentes ?? '').trim()) {
      currentY = renderPagedText(doc, currentY, item.Antecedentes, { left: PAGE.left + 7, width: PAGE.contentWidth - 7, fontSize: 8.2, after: 1 })
    }
    if (String(item?.SituacionActual ?? '').trim()) {
      currentY = renderPagedText(doc, currentY, item.SituacionActual, { left: PAGE.left + 7, width: PAGE.contentWidth - 7, fontSize: 8.2, after: 1 })
    }

    reportLines(item?.Afectaciones).forEach((line) => {
      currentY = renderPagedText(doc, currentY, `-  ${affectationText(line)}.`, {
        left: PAGE.left + 12,
        width: PAGE.contentWidth - 12,
        style: 'bold',
        fontSize: 8.2,
        after: 0.2,
      })
    })

    if (String(item?.CoordinacionYRespuesta ?? '').trim()) {
      reportLines(item.CoordinacionYRespuesta).forEach((line) => {
        currentY = renderPagedText(doc, currentY, line, {
          left: PAGE.left + 7,
          width: PAGE.contentWidth - 7,
          fontSize: 8.2,
          after: 0.8,
        })
      })
    }
    currentY += 2
  })
  return sourceLine(doc, currentY, metadata)
}

function drawProvinceGeometry(doc, province, mapX, mapY, mapWidth, mapHeight, fillColor) {
  const scaleX = mapWidth / 600
  const scaleY = mapHeight / 600
  doc.setFillColor(...fillColor)
  doc.setDrawColor(95, 107, 122)
  doc.setLineWidth(0.18)
  province.paths.forEach((polygon) => {
    const ring = polygon[0] || []
    if (ring.length < 3) return
    const [startX, startY] = ring[0]
    const vectors = ring.slice(1).map(([x, y], index) => {
      const [previousX, previousY] = ring[index]
      return [(x - previousX) * scaleX, (y - previousY) * scaleY]
    })
    doc.lines(vectors, mapX + startX * scaleX, mapY + startY * scaleY, [1, 1], 'FD', true)
  })
}

function renderSitrepSignoffs(doc, currentY, analystName, analystEmail) {
  const gap = 16
  const boxWidth = (PAGE.contentWidth - gap) / 2
  const boxes = [
    {
      title: 'SitRep elaborado por:',
      lines: [
        `Nombre: ${String(analystName || '').trim() || 'Pendiente de ingresar'}`,
        `Correo electrónico: ${String(analystEmail || '').trim() || 'Pendiente de ingresar'}`,
        'Teléfono: 04 2593500 ext. 1602',
      ],
    },
    {
      title: 'SitRep aprobado por:',
      lines: [
        'Nombre: Stalin Jiménez - Director de Monitoreo de Eventos Adversos',
        'Correo electrónico: director.monitoreo@gestionderiesgos.gob.ec',
        'Teléfono: 04 2593500 ext. 1602',
      ],
    },
  ]
  boxes.forEach((box, index) => {
    const x = PAGE.left + index * (boxWidth + gap)
    doc.setFillColor(217, 217, 217)
    doc.rect(x, currentY + 4, boxWidth, 5, 'F')
    font(doc, 'italic', 6.4, C.black)
    doc.text(box.title, x + boxWidth / 2, currentY + 3.5, { align: 'center' })
    font(doc, 'normal', 5.8, C.black)
    let lineY = currentY + 8
    box.lines.forEach((line) => {
      const wrappedLines = doc.splitTextToSize(line, boxWidth - 4)
      doc.text(wrappedLines, x + 2, lineY)
      lineY += wrappedLines.length * 3
    })
  })
  return currentY + 24
}

function renderProvinceImpactMap(doc, currentY, items, analystName, analystEmail) {
  if (!items.length || !has(items, 'ImpactadasPersonas')) return currentY
  doc.addPage('a4', 'portrait')
  currentY = renderSectionTitle(doc, PAGE.top, '9', 'Mapa de Personas Impactadas por lluvias a Nivel Nacional')
  const summary = buildProvinceImpactMap(items)
  const mapWidth = 145
  const mapX = PAGE.left + (PAGE.contentWidth - mapWidth) / 2
  const mapY = currentY + 2
  const mapHeight = mapWidth

  ECUADOR_PROVINCES.forEach((province) => {
    const value = provinceImpactValue(summary, province.name)
    drawProvinceGeometry(doc, province, mapX, mapY, mapWidth, mapHeight, impactColor(value, summary.maximum, value !== undefined).rgb)
  })

  ECUADOR_PROVINCES.forEach((province) => {
    const [labelX, labelY] = province.label
    font(doc, 'bold', province.name === 'Santo Domingo de los Tsáchilas' ? 3.5 : 4.5, [38, 50, 66])
    doc.text(shortProvinceLabel(province.name), mapX + labelX * mapWidth / 600, mapY + labelY * mapHeight / 600, { align: 'center' })
  })

  const legendWidth = 36
  const legendHeight = 55
  const legendX = mapX + mapWidth - legendWidth
  const legendY = mapY + mapHeight - legendHeight + 2
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(143, 177, 216)
  doc.roundedRect(legendX, legendY, legendWidth, legendHeight - 20, 1, 1, 'FD')
  font(doc, 'bold', 4.2, C.navy)
  doc.text('Escala de afectación (Población impactada)', legendX + 2.5, legendY + 3.5)
  const legendEntries = impactLegend()
  legendEntries.forEach((entry, index) => {
    const entryY = legendY + 6 + index * 4.55
    doc.setFillColor(...entry.color.rgb)
    doc.setDrawColor(213, 221, 232)
    doc.rect(legendX + 2.5, entryY, 5.5, 3.5, 'FD')
    font(doc, 'normal', 3.2, C.navy)
    doc.text(entry.label, legendX + 10, entryY + 2.5)
  })

  currentY = legendY + legendHeight + 4
  font(doc, 'bold', 6.2, C.black)
  doc.text('SitRep generado por la Dirección de Monitoreo de Eventos Adversos de la Secretaría Nacional de Gestión de Riesgos.', PAGE.width / 2, currentY, { align: 'center' })
  currentY += 7
  return renderSitrepSignoffs(doc, currentY, analystName, analystEmail)
}

export async function buildEventosLluviasPdf({
  items = [], tipoLluviasItems = [], asistenciaItems = [], asistenciaSNDGIRDItems = [], alojamientosItems = [], alojamientosCerradosItems = [],
  eventosMesItems = [], viasCategoriaItems = [], dpaTotals = null, sitrepNumber = null, affectationLevel = null,
  hydrometeorology = null, waterBodiesOverflowed = [], waterBodiesRising = [], alertDeclarations = [], emergencyDeclarations = [],
  nationalCoeItems = [], provincialCoeItems = [], municipalCoeItems = [], parishCoeItems = [],
  highImpactEvents = [],
  analystName = '',
  analystEmail = '',
  publishedAt = new Date(), startDate = null, endDate = null, assetBaseUrl = null,
} = {}) {
  const assets = await loadPdfAssets(assetBaseUrl)
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  registerFonts(doc, assets)
  const metadata = periodMetadata(publishedAt, sitrepNumber, startDate, endDate)
  let currentY = PAGE.firstTop
  currentY = renderImportantPoints(doc, currentY, { items, tipoLluviasItems, asistenciaItems, dpaTotals, metadata, affectationLevel })
  currentY = renderHydrometeorology(doc, currentY, hydrometeorology)
  currentY = renderWaterBodies(doc, currentY, waterBodiesOverflowed, waterBodiesRising, metadata)
  currentY = renderEventsTable(doc, currentY, tipoLluviasItems, metadata)
  currentY = renderAffectationsSummary(doc, currentY, items, viasCategoriaItems, assets, metadata)
  currentY = renderProvinceDetail(doc, currentY, items, metadata)
  currentY = renderProvinceImpactChart(doc, currentY, items, metadata)
  currentY = renderMonthlySummary(doc, currentY, eventosMesItems, metadata)
  currentY = renderTemporaryShelters(doc, currentY, alojamientosItems, alojamientosCerradosItems, metadata)
  currentY = renderAssistance(doc, currentY, asistenciaItems, asistenciaSNDGIRDItems, metadata)
  currentY = renderDeclarations(doc, currentY, alertDeclarations, emergencyDeclarations, nationalCoeItems, provincialCoeItems, municipalCoeItems, parishCoeItems, metadata)
  currentY = renderHighImpactEvents(doc, currentY, highImpactEvents, metadata)
  renderProvinceImpactMap(doc, currentY, items, analystName, analystEmail)
  decoratePages(doc, { assets, metadata, publishedAt })
  return doc
}

export async function exportEventosLluviasPdf(options) {
  const doc = await buildEventosLluviasPdf(options)
  const suffix = options?.provinciaId ? `provincia_${options.provinciaId}` : 'todas'
  doc.save(`sitrep_lluvias_preview_style_${suffix}.pdf`)
}
