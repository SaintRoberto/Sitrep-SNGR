import jsPDFPackage from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ECUADOR_PROVINCES, normalizeProvinceName, shortProvinceLabel } from './impactMap.js'

const JsPDF = jsPDFPackage.jsPDF || jsPDFPackage

const PAGE = { width: 210, height: 297, margin: 6 }
const COLORS = {
  navy: [8, 61, 116],
  darkNavy: [5, 48, 96],
  blue: [16, 101, 169],
  paleBlue: [230, 240, 250],
  cardBlue: [223, 235, 249],
  cardPurple: [225, 228, 250],
  orange: [227, 92, 14],
  lightOrange: [252, 231, 213],
  grayMap: [232, 235, 239],
  grayLine: [164, 170, 178],
  alternate: [225, 237, 248],
  white: [255, 255, 255],
  black: [18, 29, 42],
  red: [231, 25, 43],
}

const EVENT_TYPES = [
  ['Inundacion', 'Inundaciones'],
  ['Deslizamiento', 'Deslizamientos'],
  ['Lluvias_Intensas', 'Lluvias intensas'],
  ['Erosion_Hidrica', 'Erosión hídrica'],
  ['Hundimiento', 'Hundimientos'],
  ['Aluvion', 'Aluviones'],
  ['Vendaval', 'Vendavales'],
  ['Caidas_Colapso', 'Caídas / colapsos'],
  ['Tormenta_Electrica', 'Tormentas eléctricas'],
  ['Granizada', 'Granizadas'],
  ['Reptacion', 'Reptación'],
  ['Avalancha', 'Avalancha'],
  ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso de humedad'],
  ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso de infraestructura'],
]

const DETAIL_COLUMNS = [
  ['__no__', 'No.'],
  ['Provincia', 'Provincia'],
  ['NumeroEventos', 'Nro. de eventos'],
  ['ImpactadasPersonas', 'Personas impactadas'],
  ['Extraviados', 'Personas extraviadas'],
  ['Fallecidos', 'Personas fallecidas'],
  ['Heridos', 'Personas heridas'],
  ['AfectadosPersonas', 'Personas afectadas'],
  ['DamnificadosPersonas', 'Personas damnificadas'],
  ['AfectadosFamilias', 'Familias afectadas'],
  ['DamnificadosFamilias', 'Familias damnificadas'],
  ['AfectadosViviendas', 'Viviendas afectadas'],
  ['DestruidosViviendas', 'Viviendas destruidas'],
  ['AfectadosPuentes', 'Puentes afectados'],
  ['DestruidosPuentes', 'Puentes destruidos'],
  ['AfectadosPrivados', 'Bienes privados afectados'],
  ['DestruidosPrivados', 'Bienes privados destruidos'],
  ['AfectadosPublicos', 'Bienes públicos afectados'],
  ['DestruidosPublicos', 'Bienes públicos destruidos'],
  ['AfectadosEducativos', 'Centros educativos afectados'],
  ['DestruidosEducativos', 'Centros educativos destruidos'],
  ['FuncionalEducativos', 'Centros educativos funcionales'],
  ['AfectadosSalud', 'Centros de salud afectados'],
  ['DestruidosSalud', 'Centros de salud destruidos'],
  ['Evacuados', 'Personas evacuadas'],
  ['AfectadosKilometros', 'Km vías afectadas', true],
  ['AfectadosMetros', 'Metros vías afectadas', true],
  ['AfectadosHectareas', 'Hectáreas afectadas', true],
  ['PerdidosHectareas', 'Hectáreas perdidas', true],
  ['QuemadasHectareas', 'Hectáreas quemadas', true],
  ['AfectadosAnimales', 'Animales afectados'],
  ['MuertosAnimales', 'Animales muertos'],
].map(([key, label, decimal = false]) => ({ key, label, decimal }))

const TEMPLATE_FILES = {
  headerLogo: 'republica-ecuador.png',
  footer: 'footer-institucional.png',
  fontRegular: 'BarlowCondensed-Regular.ttf',
  fontMedium: 'BarlowCondensed-Medium.ttf',
  fontBold: 'BarlowCondensed-Bold.ttf',
  fontBlack: 'BarlowCondensed-Black.ttf',
}

function n(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const raw = String(value ?? '').trim()
  const normalized = raw.includes(',') ? raw.replaceAll('.', '').replace(',', '.') : raw
  const number = Number(normalized)
  return Number.isFinite(number) ? number : 0
}

function sum(items, key) {
  return items.reduce((total, row) => total + n(row?.[key]), 0)
}

function fmt(value, decimals = false) {
  return n(value).toLocaleString('es-EC', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
}

function localDate(value, fallback = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(value || ''))
  if (!match) return fallback
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0))
}

function dateText(value, long = false) {
  if (long) {
    return value.toLocaleString('es-EC', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    })
  }
  return value.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function metadata(options) {
  const start = localDate(options.startDate)
  const end = localDate(options.endDate)
  return {
    start,
    end,
    startNumeric: dateText(start),
    endNumeric: dateText(end),
    titlePeriod: `Del ${dateText(start, true)} al ${dateText(end, true)}`,
    source: `Fuente: Unidades de Monitoreo SNGR - Instituciones del SNDGIRD. ${end.toLocaleDateString('es-EC')} - ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}.`,
  }
}

function assetUrl(file, baseUrl) {
  const productionBase = import.meta.env?.VITE_API_ENV === 'prod' ? import.meta.env?.VITE_API_PROD_URL : ''
  const base = baseUrl || import.meta.env?.VITE_ASSET_BASE_URL || productionBase || import.meta.env?.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/sitrep-template/${encodeURIComponent(file)}`
}

async function asDataUrl(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar el recurso de la infografía 24hr: ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return `data:${response.headers.get('content-type') || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function asBase64(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar la fuente de la infografía 24hr: ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

async function loadAssets(baseUrl) {
  const entries = Object.entries(TEMPLATE_FILES)
  const values = await Promise.all(entries.map(([key, file]) => (
    key.startsWith('font') ? asBase64(assetUrl(file, baseUrl)) : asDataUrl(assetUrl(file, baseUrl))
  )))
  return Object.fromEntries(entries.map(([key], index) => [key, values[index]]))
}

function registerFonts(doc, assets) {
  [['Regular', 'normal', assets.fontRegular], ['Medium', 'medium', assets.fontMedium], ['Bold', 'bold', assets.fontBold], ['Black', 'black', assets.fontBlack]]
    .forEach(([name, style, source]) => {
      doc.addFileToVFS(`BarlowCondensed-${name}.ttf`, source)
      doc.addFont(`BarlowCondensed-${name}.ttf`, 'BarlowCondensed', style)
    })
}

function font(doc, style = 'normal', size = 8, color = COLORS.black) {
  doc.setFont('BarlowCondensed', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

function sectionBand(doc, x, y, width, title, badge = null) {
  doc.setFillColor(...COLORS.navy)
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, 'F')
  if (badge) {
    doc.setFillColor(...COLORS.white)
    doc.circle(x + 4, y + 3.5, 3.5, 'F')
    if (badge === 'pin') {
      doc.setFillColor(...COLORS.navy)
      doc.circle(x + 4, y + 2.8, 1.45, 'F')
      doc.triangle(x + 2.9, y + 3.3, x + 5.1, y + 3.3, x + 4, y + 6.1, 'F')
      doc.setFillColor(...COLORS.white)
      doc.circle(x + 4, y + 2.8, 0.52, 'F')
    } else {
      font(doc, 'bold', String(badge).length > 2 ? 6.2 : 8, COLORS.navy)
      doc.text(String(badge), x + 4, y + 4.7, { align: 'center' })
    }
  }
  font(doc, 'bold', 9.2, COLORS.white)
  doc.text(title.toUpperCase(), x + (badge ? 8.5 : 4), y + 4.8)
}

function renderHeader(doc, assets, meta) {
  doc.setFillColor(...COLORS.darkNavy)
  doc.rect(0, 0, PAGE.width, 18, 'F')
  doc.addImage(assets.headerLogo, 'PNG', 8, 1.5, 41, 15)
  font(doc, 'bold', 10.5, COLORS.white)
  doc.text('Secretaría Nacional de Gestión de Riesgos', 202, 7.3, { align: 'right' })
  font(doc, 'medium', 8.5, COLORS.white)
  doc.text('Dirección de Monitoreo de Eventos Adversos', 202, 12.6, { align: 'right' })

  doc.setFillColor(...COLORS.paleBlue)
  doc.roundedRect(6, 19.5, 198, 15, 2, 2, 'F')
  font(doc, 'black', 15.5, COLORS.darkNavy)
  const prefix = 'REPORTE DE LLUVIAS CON INCIDENCIA DEL EVENTO '
  doc.text(prefix, 105, 26.5, { align: 'center' })
  const prefixWidth = doc.getTextWidth(prefix)
  font(doc, 'black', 15.5, COLORS.orange)
  doc.text('EL NIÑO', 105 + prefixWidth / 2 + 0.5, 26.5, { align: 'left' })
  font(doc, 'bold', 10.5, COLORS.navy)
  doc.text(meta.titlePeriod, 105, 32.1, { align: 'center' })
  font(doc, 'bold', 8.8, COLORS.darkNavy)
  doc.text('INFORME DE SITUACIÓN NACIONAL', 105, 38, { align: 'center' })
  font(doc, 'normal', 6.8, COLORS.black)
  doc.text(`Este informe cubre el período desde el ${meta.startNumeric} hasta el ${meta.endNumeric}`, 105, 41.3, { align: 'center' })
}

function renderContinuationHeader(doc, assets, pageNumber) {
  doc.setFillColor(...COLORS.darkNavy)
  doc.rect(0, 0, PAGE.width, 18, 'F')
  doc.addImage(assets.headerLogo, 'PNG', 8, 1.5, 41, 15)
  font(doc, 'bold', 9.5, COLORS.white)
  doc.text('REPORTE DE LLUVIAS - INFOGRAFÍA 24 HORAS', 202, 7.3, { align: 'right' })
  font(doc, 'medium', 7.5, COLORS.white)
  doc.text(`Dirección de Monitoreo de Eventos Adversos / Página ${pageNumber}`, 202, 12.6, { align: 'right' })
}

function eventSummary(options) {
  const total = sum(options.tipoLluviasItems, 'NumeroEventos') || sum(options.items, 'NumeroEventos')
  const types = EVENT_TYPES.map(([key, label]) => ({ key, label, value: sum(options.tipoLluviasItems, key) }))
    .filter((type) => type.value > 0)
    .sort((a, b) => b.value - a.value)
  return { total, types }
}

function drawRainIcon(doc, centerX, top, color = COLORS.blue) {
  doc.setFillColor(...color)
  doc.circle(centerX - 3, top + 4.5, 3.1, 'F')
  doc.circle(centerX + 0.5, top + 3, 4, 'F')
  doc.circle(centerX + 4, top + 5, 2.8, 'F')
  doc.rect(centerX - 5.5, top + 4.5, 12, 3, 'F')
  doc.setDrawColor(...color)
  doc.setLineWidth(0.8)
  ;[-4, 0, 4].forEach((dx) => doc.line(centerX + dx, top + 9, centerX + dx - 1.2, top + 12.5))
}

function drawFloodIcon(doc, centerX, top, color = COLORS.blue) {
  doc.setFillColor(...color)
  doc.triangle(centerX - 5.8, top + 4.2, centerX, top, centerX + 5.8, top + 4.2, 'F')
  doc.rect(centerX - 4.2, top + 4.2, 8.4, 5.3, 'F')
  doc.setFillColor(...COLORS.white)
  doc.rect(centerX - 1.1, top + 6.2, 2.2, 3.3, 'F')
  doc.setDrawColor(...color)
  doc.setLineWidth(0.65)
  ;[0, 2.7].forEach((dy) => {
    doc.line(centerX - 6.5, top + 11.3 + dy, centerX - 2.2, top + 10 + dy)
    doc.line(centerX - 2.2, top + 10 + dy, centerX + 2.2, top + 11.3 + dy)
    doc.line(centerX + 2.2, top + 11.3 + dy, centerX + 6.5, top + 10 + dy)
  })
}

function drawLandslideIcon(doc, centerX, top, color = COLORS.orange) {
  doc.setFillColor(...color)
  doc.triangle(centerX - 8, top + 14, centerX - 1, top, centerX + 7, top + 14, 'F')
  doc.circle(centerX + 5, top + 3, 1.5, 'F')
  doc.circle(centerX + 8, top + 6.5, 1.2, 'F')
  doc.circle(centerX + 9, top + 10, 1, 'F')
}

function renderMetricCard(doc, { x, y, width, height, value, label, detail, type, fill, color }) {
  doc.setFillColor(210, 217, 226)
  doc.roundedRect(x + 0.7, y + 0.9, width, height, 2.2, 2.2, 'F')
  doc.setFillColor(...fill)
  doc.setDrawColor(...color)
  doc.setLineWidth(0.22)
  doc.roundedRect(x, y, width, height, 2.2, 2.2, 'FD')
  const centerX = x + width / 2
  doc.setFillColor(...COLORS.white)
  doc.circle(centerX, y + 9, 6.6, 'F')
  if (type === 'flood') drawFloodIcon(doc, centerX, y + 2.3, color)
  else if (type === 'landslide') drawLandslideIcon(doc, centerX, y + 2.2, color)
  else drawRainIcon(doc, centerX, y + 2.4, color)
  font(doc, 'black', 17.5, color)
  doc.text(String(value), centerX, y + 23.3, { align: 'center' })
  font(doc, 'bold', 7.5, color)
  doc.text(label.toUpperCase(), centerX, y + 28.9, { align: 'center' })
  if (detail) {
    font(doc, 'medium', 6.2, color)
    doc.text(detail, centerX, y + 33.7, { align: 'center' })
  }
}

function renderImportantPoints(doc, options, summary) {
  const x = 6
  const y = 44
  const width = 90
  sectionBand(doc, x, y, width, 'Puntos importantes', '1')
  doc.setFillColor(235, 243, 251)
  doc.roundedRect(x, y + 7.5, width, 30.5, 2, 2, 'F')
  const provinces = n(options.dpaTotals?.TotalProvincias) || new Set(options.items.map((row) => row?.Provincia).filter(Boolean)).size
  const cantons = n(options.dpaTotals?.TotalCantones)
  const parishes = n(options.dpaTotals?.TotalParroquias)
  const recurring = summary.types.slice(0, 3).map((type) => `${type.label.toLowerCase()} (${fmt(summary.total ? type.value / summary.total * 100 : 0, true)}%)`).join(' y ')
  const topProvinces = [...options.items]
    .sort((a, b) => n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas) || n(b?.NumeroEventos) - n(a?.NumeroEventos))
    .slice(0, 4).map((row) => row?.Provincia).filter(Boolean).join(', ')
  const points = [
    `Se han registrado ${fmt(summary.total)} eventos por lluvias afectando a ${fmt(provinces)} provincias${cantons ? `, ${fmt(cantons)} cantones` : ''}${parishes ? ` y ${fmt(parishes)} parroquias` : ''}. Los eventos más recurrentes corresponden a: ${recurring || 'sin datos reportados'}.`,
    `Durante el período, las provincias con mayor impacto a la población son: ${topProvinces || 'sin datos reportados'}.`,
  ]
  let currentY = y + 13
  points.forEach((point) => {
    doc.setFillColor(...COLORS.navy)
    doc.circle(x + 5, currentY - 0.8, 0.8, 'F')
    font(doc, 'medium', 6.3, COLORS.black)
    const lines = doc.splitTextToSize(point, width - 13).slice(0, 5)
    doc.text(lines, x + 9, currentY)
    currentY += lines.length * 2.7 + 2
  })
}

function renderMetricCards(doc, summary) {
  const y = 44
  const gap = 2
  const x = 98
  const width = (106 - gap * 2) / 3
  const primary = summary.types[0]
  const secondary = summary.types[1]
  const card = (type, index, fallbackLabel, color, fill) => ({
    x: x + index * (width + gap), y, width, height: 38,
    value: type ? `${Math.round(summary.total ? type.value / summary.total * 100 : 0)}%` : '0%',
    label: type?.label || fallbackLabel,
    detail: `${fmt(type?.value || 0)} ${(type?.value || 0) === 1 ? 'evento' : 'eventos'}`,
    type: type?.key === 'Deslizamiento' ? 'landslide' : 'flood', color, fill,
  })
  renderMetricCard(doc, {
    x, y, width, height: 38, value: fmt(summary.total), label: 'Eventos adversos',
    detail: '', type: 'rain', color: COLORS.navy, fill: COLORS.cardBlue,
  })
  renderMetricCard(doc, card(primary, 1, 'Sin tipo', COLORS.blue, COLORS.cardPurple))
  renderMetricCard(doc, card(secondary, 2, 'Sin otro tipo', COLORS.orange, COLORS.lightOrange))
}

function table(doc, {
  x, y, width, head, body, columnStyles = {}, fontSize = 6.4, didParseBodyCell = null,
  verticalHeadColumns = [], headMinHeight = 4.5, cellPadding = 0.65, minCellHeight = 4.5,
}) {
  const verticalColumns = new Set(verticalHeadColumns)
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: 'grid',
    tableWidth: width,
    margin: { left: x, top: 25, bottom: 31 },
    styles: { font: 'BarlowCondensed', fontSize, cellPadding, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: [190, 203, 219], minCellHeight },
    headStyles: { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: 'bold', fontSize: fontSize - 0.2, minCellHeight: headMinHeight },
    alternateRowStyles: { fillColor: COLORS.alternate },
    columnStyles,
    didParseCell: ({ cell, column, row, section }) => {
      if (section === 'head' && verticalColumns.has(column.index)) cell.text = ['']
      if (section === 'body' && row.index === body.length - 1) {
        Object.assign(cell.styles, { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: 'bold' })
      } else if (section === 'body' && didParseBodyCell) {
        didParseBodyCell({ cell, column, row })
      }
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section !== 'head' || !verticalColumns.has(column.index)) return
      font(doc, 'bold', Math.max(3.6, fontSize - 0.3), COLORS.white)
      doc.text(String(head[column.index]), cell.x + cell.width / 2 + 0.7, cell.y + cell.height - 1.5, { angle: 90 })
    },
  })
  return doc.lastAutoTable.finalY
}

function renderSummaryTable(doc, options, summary, meta) {
  const x = 6
  const y = 85
  const width = 112
  sectionBand(doc, x, y, width, 'Eventos adversos y afectaciones - resumen', '3')
  font(doc, 'normal', 6.8, COLORS.black)
  const intro = `Desde el ${meta.startNumeric} hasta el ${meta.endNumeric}, por lluvias se registraron un total de ${fmt(summary.total)} eventos adversos, distribuidos de la siguiente manera:`
  const introLines = doc.splitTextToSize(intro, width).slice(0, 2)
  doc.text(introLines, x + 1, y + 10)
  const visibleTypes = summary.types
  const provinceRows = [...options.tipoLluviasItems]
    .filter((row) => row?.Provincia)
    .sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
  const mapValues = eventMapValues(options.tipoLluviasItems)
  const palette = eventPalette(mapValues)
  const rows = provinceRows
    .map((row, index) => [index + 1, row.Provincia, fmt(row.NumeroEventos), ...visibleTypes.map((type) => fmt(row?.[type.key]))])
  rows.push(['', 'Total general', fmt(sum(options.tipoLluviasItems, 'NumeroEventos')), ...visibleTypes.map((type) => fmt(sum(options.tipoLluviasItems, type.key)))])
  const fixedWidth = 42
  const typeWidth = visibleTypes.length ? (width - fixedWidth) / visibleTypes.length : 0
  const columnStyles = {
    0: { cellWidth: 7 },
    1: { cellWidth: 24, halign: 'left' },
    2: { cellWidth: 11 },
  }
  visibleTypes.forEach((_, index) => {
    columnStyles[index + 3] = { cellWidth: typeWidth, cellPadding: 0.1, overflow: 'hidden' }
  })
  const tableFontSize = Math.max(3.8, Math.min(6.2, 7 - visibleTypes.length * 0.28))
  const bottom = table(doc, {
    x, y: y + 15.5, width,
    head: ['No.', 'Provincia', 'Nro. de eventos adversos', ...visibleTypes.map((type) => type.label)],
    body: rows,
    columnStyles,
    fontSize: tableFontSize,
    verticalHeadColumns: visibleTypes.map((_, index) => index + 3),
    headMinHeight: visibleTypes.length ? 25 : 7,
    cellPadding: 0.3,
    minCellHeight: provinceRows.length > 12 ? 3.1 : 3.7,
    didParseBodyCell: ({ cell, column, row }) => {
      if (column.index !== 2 || row.index >= provinceRows.length) return
      const eventCount = n(provinceRows[row.index]?.NumeroEventos)
      cell.styles.fillColor = palette.colorFor(eventCount)
      cell.styles.textColor = COLORS.black
      cell.styles.fontStyle = 'bold'
    },
  })
  font(doc, 'medium', 4.8, COLORS.black)
  doc.text(meta.source, x + width / 2, bottom + 3.1, { align: 'center' })
  return bottom + 5
}

function eventMapValues(items) {
  const totals = new Map()
  items.forEach((row) => {
    const key = normalizeProvinceName(row?.Provincia)
    if (key) totals.set(key, (totals.get(key) || 0) + n(row?.NumeroEventos))
  })
  return totals
}

function eventPalette(values) {
  const levels = [...new Set([...values.values()].filter((value) => value > 0))].sort((a, b) => b - a)
  const colors = [[227, 92, 14], [247, 143, 25], [255, 201, 83], [255, 224, 145]]
  return { levels, colorFor: (value) => value ? colors[Math.min(Math.max(0, levels.indexOf(value)), colors.length - 1)] : COLORS.grayMap }
}

function drawProvince(doc, province, x, y, width, height, fill) {
  const scaleX = width / 600
  const scaleY = height / 600
  doc.setFillColor(...fill)
  doc.setDrawColor(...COLORS.grayLine)
  doc.setLineWidth(0.13)
  province.paths.forEach((polygon) => {
    const ring = polygon[0] || []
    if (ring.length < 3) return
    const vectors = ring.slice(1).map(([px, py], index) => {
      const [previousX, previousY] = ring[index]
      return [(px - previousX) * scaleX, (py - previousY) * scaleY]
    })
    doc.lines(vectors, x + ring[0][0] * scaleX, y + ring[0][1] * scaleY, [1, 1], 'FD', true)
  })
}

function renderMap(doc, options) {
  const x = 121
  const y = 85
  const width = 83
  sectionBand(doc, x, y, width, 'Mapa de provincias con eventos', 'pin')
  const mapX = 120.5
  const mapY = 92.5
  const mapWidth = 84
  const mapHeight = 84
  const values = eventMapValues(options.tipoLluviasItems)
  const palette = eventPalette(values)
  ECUADOR_PROVINCES.forEach((province) => {
    drawProvince(doc, province, mapX, mapY, mapWidth, mapHeight, palette.colorFor(values.get(normalizeProvinceName(province.name)) || 0))
  })
  ECUADOR_PROVINCES.forEach((province) => {
    const value = values.get(normalizeProvinceName(province.name)) || 0
    if (!value) return
    const [labelX, labelY] = province.label
    font(doc, 'bold', province.name.includes('Santo Domingo') ? 3.2 : 4.4, COLORS.black)
    doc.text(shortProvinceLabel(province.name), mapX + labelX * mapWidth / 600, mapY + labelY * mapHeight / 600, { align: 'center' })
  })
}

function renderProvinceDetail(doc, options, startY, meta) {
  const x = 6
  const width = 112
  const ranked = [...options.items]
    .filter((row) => row?.Provincia)
    .sort((a, b) => n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas) || n(b?.NumeroEventos) - n(a?.NumeroEventos))
  const visibleColumns = DETAIL_COLUMNS.filter((column) => (
    ['__no__', 'Provincia', 'NumeroEventos'].includes(column.key)
    || sum(options.items, column.key) !== 0
  ))
  const estimatedHeight = 15 + (visibleColumns.length > 5 ? 26 : 7) + (ranked.length + 1) * 3.7 + 9
  const currentPage = doc.internal.getCurrentPageInfo().pageNumber
  let y = currentPage === 1 ? Math.max(132, startY) : Math.max(25, startY)
  if (currentPage > 1 && y > 25 && y + estimatedHeight > 270) {
    doc.addPage('a4', 'portrait')
    y = 25
  }
  sectionBand(doc, x, y, width, 'Detalle de afectaciones por provincias', '4.2')
  const narrative = ranked.slice(0, 3).map((row) => `${row.Provincia} con ${fmt(row.ImpactadasPersonas)} personas impactadas en ${fmt(row.NumeroEventos)} eventos`).join('; ')
  font(doc, 'medium', 6.5, COLORS.black)
  doc.text(doc.splitTextToSize(`Las provincias son: ${narrative || 'sin afectaciones reportadas'}.`, width - 2).slice(0, 2), x + 1, y + 10)
  const rows = ranked.map((row, index) => visibleColumns.map((column) => {
    if (column.key === '__no__') return index + 1
    if (column.key === 'Provincia') return row.Provincia
    return fmt(row?.[column.key], column.decimal)
  }))
  rows.push(visibleColumns.map((column) => {
    if (column.key === '__no__') return ''
    if (column.key === 'Provincia') return 'Total general'
    return fmt(sum(options.items, column.key), column.decimal)
  }))
  const fixedWidth = 31
  const numericColumns = Math.max(1, visibleColumns.length - 2)
  const numericWidth = (width - fixedWidth) / numericColumns
  const columnStyles = {
    0: { cellWidth: 7 },
    1: { cellWidth: 24, halign: 'left' },
  }
  visibleColumns.slice(2).forEach((_, index) => {
    columnStyles[index + 2] = { cellWidth: numericWidth, cellPadding: 0.1, overflow: 'hidden' }
  })
  const useVerticalHeaders = visibleColumns.length > 5
  const tableFontSize = Math.max(3.5, Math.min(6.1, 7 - numericColumns * 0.2))
  const mapValues = eventMapValues(options.tipoLluviasItems)
  const palette = eventPalette(mapValues)
  const eventColumnIndex = visibleColumns.findIndex((column) => column.key === 'NumeroEventos')
  const bottom = table(doc, {
    x, y: y + 15, width,
    head: visibleColumns.map((column) => column.label),
    body: rows,
    columnStyles,
    fontSize: tableFontSize,
    verticalHeadColumns: useVerticalHeaders ? visibleColumns.slice(2).map((_, index) => index + 2) : [],
    headMinHeight: useVerticalHeaders ? 26 : 7,
    cellPadding: 0.18,
    minCellHeight: ranked.length > 12 ? 2.9 : 3.4,
    didParseBodyCell: ({ cell, column, row }) => {
      if (column.index !== eventColumnIndex || row.index >= ranked.length) return
      const eventCount = n(ranked[row.index]?.NumeroEventos)
      cell.styles.fillColor = palette.colorFor(eventCount)
      cell.styles.textColor = COLORS.black
      cell.styles.fontStyle = 'bold'
    },
  })
  font(doc, 'medium', 4.7, COLORS.black)
  doc.text(meta.source, x + width / 2, bottom + 2.8, { align: 'center' })
  font(doc, 'normal', 4.5, COLORS.black)
  doc.text('Nota: Personas impactadas incluye personas afectadas y damnificadas.', x + width / 2, bottom + 5, { align: 'center' })
  return bottom + 7
}

function eventLocation(event) {
  return String(event?.Ubicacion || [event?.Provincia, event?.Canton, event?.Parroquia, event?.Sector].filter(Boolean).join(' / ') || 'Ubicación no registrada').trim()
}

function eventDescription(event) {
  return [event?.Antecedentes, event?.SituacionActual].filter((value) => String(value || '').trim()).join(' ')
    || 'Sin descripción registrada.'
}

function eventAffectations(event) {
  return String(event?.Afectaciones || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    .map((line) => {
      const [label, ...amount] = line.split('=')
      return amount.length ? `${amount.join('=').trim()} ${label.trim()}` : line
    })
}

function eventIconType(event) {
  const text = `${eventLocation(event)} ${eventDescription(event)}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (text.includes('desliz') || text.includes('derrumbe')) return 'landslide'
  if (text.includes('inund') || text.includes('desbord')) return 'flood'
  return 'rain'
}

function drawEventIcon(doc, type, x, y) {
  if (type === 'landslide') drawLandslideIcon(doc, x, y, COLORS.orange)
  else if (type === 'flood') drawFloodIcon(doc, x, y, COLORS.blue)
  else drawRainIcon(doc, x, y, COLORS.blue)
}

function eventBlockLayout(doc, event, width) {
  font(doc, 'bold', 6.5, COLORS.darkNavy)
  const titleLines = doc.splitTextToSize(eventLocation(event), width - 29)
  font(doc, 'normal', 5.4, COLORS.black)
  const bodyLines = doc.splitTextToSize(eventDescription(event), width - 29)
  font(doc, 'bold', 5.5, COLORS.darkNavy)
  const affectationLines = eventAffectations(event)
    .flatMap((line) => doc.splitTextToSize(`▲ ${line}.`, width - 29))
  const textHeight = 4 + titleLines.length * 2.7 + bodyLines.length * 2.3 + affectationLines.length * 2.4 + 4
  return { titleLines, bodyLines, affectationLines, height: Math.max(23, textHeight) }
}

function renderEventBlock(doc, event, x, y, width, layout) {
  doc.setFillColor(...COLORS.paleBlue)
  doc.roundedRect(x, y, width, layout.height, 1.5, 1.5, 'F')
  const iconX = x + 8
  drawEventIcon(doc, eventIconType(event), iconX, y + 3)
  doc.setFillColor(...COLORS.red)
  doc.circle(x + 18, y + 5, 1.7, 'F')
  doc.setFillColor(...COLORS.white)
  doc.circle(x + 18, y + 4.7, 0.55, 'F')
  font(doc, 'bold', 6.5, COLORS.darkNavy)
  doc.text(layout.titleLines, x + 22, y + 3.5)
  const textY = y + 4 + layout.titleLines.length * 2.7
  font(doc, 'normal', 5.4, COLORS.black)
  doc.text(layout.bodyLines, x + 22, textY)
  if (layout.affectationLines.length) {
    font(doc, 'bold', 5.5, eventIconType(event) === 'landslide' ? COLORS.orange : COLORS.darkNavy)
    doc.text(layout.affectationLines, x + 22, textY + layout.bodyLines.length * 2.3 + 1.5)
  }
}

function renderHighImpact(doc, options, startY) {
  const x = 6
  const width = 198
  const gap = 2
  const columnWidth = (width - gap) / 2
  const bottom = 269
  const currentPage = doc.internal.getCurrentPageInfo().pageNumber
  let y = currentPage === 1 ? Math.max(187, startY) : Math.max(25, startY)
  if (y + 30 > bottom) {
    doc.addPage('a4', 'portrait')
    y = 25
  }
  sectionBand(doc, x, y, width, 'Eventos adversos de alto impacto', '8')
  font(doc, 'normal', 6.8, COLORS.darkNavy)
  doc.text('A continuación, se detallan los eventos adversos relevantes de los últimos días:', x + 5, y + 11)
  const events = options.highImpactEvents
  if (!events.length) {
    doc.setFillColor(...COLORS.paleBlue)
    doc.roundedRect(x, y + 14, width, 60, 2, 2, 'F')
    font(doc, 'medium', 8, COLORS.black)
    doc.text('No se registraron eventos adversos de alto impacto para el período consultado.', 105, y + 43, { align: 'center' })
    return
  }
  let columnY = [y + 14, y + 14]
  events.forEach((event) => {
    const layout = eventBlockLayout(doc, event, columnWidth)
    let column = columnY[0] <= columnY[1] ? 0 : 1
    if (columnY[column] + layout.height > bottom) column = column === 0 ? 1 : 0
    if (columnY[column] + layout.height > bottom) {
      doc.addPage('a4', 'portrait')
      y = 25
      sectionBand(doc, x, y, width, 'Eventos adversos de alto impacto - continuación', '8')
      columnY = [y + 10, y + 10]
      column = 0
    }
    const columnX = x + column * (columnWidth + gap)
    renderEventBlock(doc, event, columnX, columnY[column], columnWidth, layout)
    columnY[column] += layout.height + 2
  })
}

function renderFooter(doc, assets) {
  doc.addImage(assets.footer, 'PNG', 0, 274, 210, 23)
}

function decoratePages(doc, assets, meta) {
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    if (page === 1) renderHeader(doc, assets, meta)
    else renderContinuationHeader(doc, assets, page)
    renderFooter(doc, assets)
  }
}

export async function buildReport24InfographicPdf(options = {}) {
  const normalized = {
    items: [],
    tipoLluviasItems: [],
    highImpactEvents: [],
    dpaTotals: null,
    ...options,
  }
  const assets = await loadAssets(normalized.assetBaseUrl)
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  registerFonts(doc, assets)
  const meta = metadata(normalized)
  const summary = eventSummary(normalized)
  renderImportantPoints(doc, normalized, summary)
  renderMetricCards(doc, summary)
  renderMap(doc, normalized)
  const summaryBottom = renderSummaryTable(doc, normalized, summary, meta)
  const detailBottom = renderProvinceDetail(doc, normalized, summaryBottom, meta)
  renderHighImpact(doc, normalized, detailBottom)
  decoratePages(doc, assets, meta)
  return doc
}

export async function exportReport24InfographicPdf(options = {}) {
  const doc = await buildReport24InfographicPdf(options)
  doc.save('infografia_reporte_24_horas.pdf')
}
