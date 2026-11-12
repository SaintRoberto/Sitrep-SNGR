import jsPDFPackage from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ECUADOR_PROVINCES, normalizeProvinceName, shortProvinceLabel } from './impactMap.js'
import { cleanHighImpactResponseLines, highImpactEventMetaItems } from './highImpactEvents.js'

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
  headerLogoWhite: 'republica-ecuador-white.png',
  footer: 'footer-institucional.png',
  fontRegular: 'BarlowCondensed-Regular.ttf',
  fontMedium: 'BarlowCondensed-Medium.ttf',
  fontBold: 'BarlowCondensed-Bold.ttf',
  fontBlack: 'BarlowCondensed-Black.ttf',
}

const EVENT_ICON_FILES = {
  iconRain: 'rainy.png',
  iconFlood: 'flood.png',
  iconLandslide: 'landslide.png',
  headerStorm: 'storm-header.png',
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

function eventIconUrl(file, baseUrl) {
  const productionBase = import.meta.env?.VITE_API_ENV === 'prod' ? import.meta.env?.VITE_API_PROD_URL : ''
  const base = baseUrl || import.meta.env?.VITE_ASSET_BASE_URL || productionBase || import.meta.env?.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/report24-icons/${encodeURIComponent(file)}`
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
  const iconEntries = Object.entries(EVENT_ICON_FILES)
  const iconValues = await Promise.all(iconEntries.map(([, file]) => asDataUrl(eventIconUrl(file, baseUrl))))
  return {
    ...Object.fromEntries(entries.map(([key], index) => [key, values[index]])),
    ...Object.fromEntries(iconEntries.map(([key], index) => [key, iconValues[index]])),
  }
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

function drawSectionBadgeIcon(doc, badge, centerX, centerY) {
  doc.setDrawColor(...COLORS.navy)
  doc.setFillColor(...COLORS.navy)
  doc.setLineWidth(0.38)
  if (badge === 'pin') {
    doc.circle(centerX, centerY - 0.7, 1.45, 'F')
    doc.triangle(centerX - 1.1, centerY - 0.2, centerX + 1.1, centerY - 0.2, centerX, centerY + 2.6, 'F')
    doc.setFillColor(...COLORS.white)
    doc.circle(centerX, centerY - 0.7, 0.52, 'F')
    return
  }
  if (badge === 'important') {
    const offsets = [-1.35, 0, 1.35]
    offsets.forEach((offset) => {
      doc.circle(centerX - 1.75, centerY + offset, 0.34, 'F')
      doc.line(centerX - 0.9, centerY + offset, centerX + 2, centerY + offset)
    })
    return
  }
  if (badge === 'summary') {
    doc.line(centerX - 2.1, centerY + 1.8, centerX + 2.2, centerY + 1.8)
    doc.line(centerX - 2.1, centerY + 1.8, centerX - 2.1, centerY - 1.8)
    doc.rect(centerX - 1.45, centerY + 0.2, 0.75, 1.6, 'F')
    doc.rect(centerX - 0.25, centerY - 0.8, 0.75, 2.6, 'F')
    doc.rect(centerX + 0.95, centerY - 1.7, 0.75, 3.5, 'F')
    return
  }
  if (badge === 'detail') {
    doc.circle(centerX - 1.1, centerY - 0.9, 0.72, 'F')
    doc.circle(centerX + 1.1, centerY - 0.9, 0.72, 'F')
    doc.roundedRect(centerX - 2.2, centerY + 0.1, 2.2, 1.7, 0.6, 0.6, 'F')
    doc.roundedRect(centerX, centerY + 0.1, 2.2, 1.7, 0.6, 0.6, 'F')
  }
}

function sectionBand(doc, x, y, width, title, badge = null) {
  doc.setFillColor(...COLORS.navy)
  doc.roundedRect(x, y, width, 7, 3.5, 3.5, 'F')
  if (badge) {
    doc.setFillColor(...COLORS.white)
    doc.circle(x + 4, y + 3.5, 3.5, 'F')
    drawSectionBadgeIcon(doc, badge, x + 4, y + 3.5)
  }
  font(doc, 'bold', 9.2, COLORS.white)
  doc.text(title.toUpperCase(), x + (badge ? 8.5 : 4), y + 4.8)
}

function renderInstitutionalHeaderBand(doc, assets) {
  doc.setFillColor(5, 45, 91)
  doc.rect(0, 0, PAGE.width, 18, 'F')

  // Tres áreas claras: identidad, panorama de lluvia y autoridad institucional.
  doc.addImage(assets.headerStorm, 'PNG', 56, 0, 91, 17.4)
  doc.setFillColor(6, 53, 103)
  doc.rect(0, 0, 56, 17.4, 'F')
  doc.setFillColor(4, 39, 79)
  doc.rect(147, 0, PAGE.width - 147, 17.4, 'F')
  doc.triangle(147, 0, 147, 17.4, 136, 17.4, 'F')

  doc.setFillColor(41, 132, 190)
  doc.rect(0, 17.35, PAGE.width, 0.65, 'F')
  doc.addImage(assets.headerLogoWhite, 'PNG', 8, 1.4, 41, 15)
}

function renderHeader(doc, assets, meta) {
  renderInstitutionalHeaderBand(doc, assets)
  font(doc, 'bold', 10, COLORS.white)
  doc.text('Secretaría Nacional de Gestión de Riesgos', 201, 6.8, { align: 'right' })
  font(doc, 'medium', 7.8, [205, 225, 242])
  doc.text('Dirección de Monitoreo de Eventos Adversos', 201, 11.8, { align: 'right' })

  doc.setFillColor(...COLORS.paleBlue)
  doc.roundedRect(6, 19.5, 198, 15, 2, 2, 'F')
  const prefix = 'REPORTE DE LLUVIAS CON INCIDENCIA DEL EVENTO '
  const accent = 'EL NIÑO'
  let titleSize = 15.5
  let prefixWidth = 0
  let accentWidth = 0
  do {
    font(doc, 'black', titleSize, COLORS.darkNavy)
    prefixWidth = doc.getTextWidth(prefix)
    font(doc, 'black', titleSize, COLORS.orange)
    accentWidth = doc.getTextWidth(accent)
    if (prefixWidth + accentWidth <= 188) break
    titleSize -= 0.4
  } while (titleSize > 12)
  const titleX = 105 - (prefixWidth + accentWidth) / 2
  font(doc, 'black', titleSize, COLORS.darkNavy)
  doc.text(prefix, titleX, 26.5)
  font(doc, 'black', titleSize, COLORS.orange)
  doc.text(accent, titleX + prefixWidth, 26.5)
  font(doc, 'bold', 10.5, COLORS.navy)
  doc.text(meta.titlePeriod, 105, 32.1, { align: 'center' })
}

function renderContinuationHeader(doc, assets, pageNumber) {
  renderInstitutionalHeaderBand(doc, assets)
  font(doc, 'bold', 9.5, COLORS.white)
  doc.text('REPORTE DE LLUVIAS - INFOGRAFÍA 24 HORAS', 201, 6.8, { align: 'right' })
  font(doc, 'medium', 7.4, [205, 225, 242])
  doc.text(`Dirección de Monitoreo de Eventos Adversos / Página ${pageNumber}`, 201, 11.8, { align: 'right' })
}

function eventSummary(options) {
  const total = sum(options.tipoLluviasItems, 'NumeroEventos') || sum(options.items, 'NumeroEventos')
  const types = EVENT_TYPES.map(([key, label]) => ({ key, label, value: sum(options.tipoLluviasItems, key) }))
    .filter((type) => type.value > 0)
    .sort((a, b) => b.value - a.value)
  return { total, types }
}

function eventIconAsset(assets, type) {
  if (type === 'landslide') return assets.iconLandslide
  if (type === 'flood') return assets.iconFlood
  return assets.iconRain
}

function drawEventIcon(doc, assets, type, centerX, top, size = 14) {
  doc.addImage(eventIconAsset(assets, type), 'PNG', centerX - size / 2, top, size, size)
}

function renderMetricCard(doc, assets, { x, y, width, height, value, label, detail, type, fill, color }) {
  doc.setFillColor(...fill)
  doc.roundedRect(x, y, width, height, 2.2, 2.2, 'F')
  const centerX = x + width / 2
  drawEventIcon(doc, assets, type, centerX, y + 1.5, 15)
  font(doc, 'black', 17.5, color)
  doc.text(String(value), centerX, y + 23.8, { align: 'center' })
  font(doc, 'bold', 7.5, color)
  const labelLines = doc.splitTextToSize(label.toUpperCase(), width - 5).slice(0, 2)
  doc.text(labelLines, centerX, y + 28.9, { align: 'center', lineHeightFactor: 0.9 })
  if (detail) {
    font(doc, 'medium', 6.2, color)
    doc.text(detail, centerX, y + (labelLines.length > 1 ? 36 : 33.8), { align: 'center' })
  }
}

function renderImportantPoints(doc, options, summary) {
  const x = 6
  const y = 44
  const width = 90
  sectionBand(doc, x, y, width, 'Puntos importantes', 'important')
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

function renderMetricCards(doc, assets, summary) {
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
  renderMetricCard(doc, assets, {
    x, y, width, height: 38, value: fmt(summary.total), label: 'Eventos adversos',
    detail: '', type: 'rain', color: COLORS.navy, fill: COLORS.cardBlue,
  })
  renderMetricCard(doc, assets, card(primary, 1, 'Sin tipo', COLORS.blue, COLORS.cardPurple))
  renderMetricCard(doc, assets, card(secondary, 2, 'Sin otro tipo', COLORS.orange, COLORS.lightOrange))
}

function table(doc, {
  x, y, width, head, body, columnStyles = {}, fontSize = 6.4, didParseBodyCell = null,
  verticalHeadColumns = [], headMinHeight = 4.5, cellPadding = 0.65, minCellHeight = 4.5,
}) {
  const verticalColumns = new Set(verticalHeadColumns)
  const isHorizontalEntityHeader = (index) => /^(no\.?|nro\.?|provincia)$/i.test(String(head[index] || '').trim())
  const isVerticalHeader = (index) => verticalColumns.has(index) && !isHorizontalEntityHeader(index)
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
      if (section === 'head' && isHorizontalEntityHeader(column.index)) {
        cell.styles.valign = 'middle'
        cell.styles.halign = 'center'
      }
      if (section === 'head' && isVerticalHeader(column.index)) cell.text = ['']
      if (section === 'body' && row.index === body.length - 1) {
        Object.assign(cell.styles, { fillColor: COLORS.navy, textColor: COLORS.white, fontStyle: 'bold' })
      } else if (section === 'body' && didParseBodyCell) {
        didParseBodyCell({ cell, column, row })
      }
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section !== 'head' || !isVerticalHeader(column.index)) return
      font(doc, 'bold', Math.max(3.6, fontSize - 0.3), COLORS.white)
      doc.text(String(head[column.index]), cell.x + cell.width / 2 + 0.7, cell.y + cell.height - 1.5, { angle: 90, align: 'left' })
    },
  })
  return doc.lastAutoTable.finalY
}

function renderSummaryTable(doc, options, summary, meta) {
  const x = 6
  const y = 85
  const width = 112
  sectionBand(doc, x, y, width, 'Eventos adversos y afectaciones - resumen', 'summary')
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
  rows.push(['', 'Total', fmt(sum(options.tipoLluviasItems, 'NumeroEventos')), ...visibleTypes.map((type) => fmt(sum(options.tipoLluviasItems, type.key)))])
  const fixedWidth = 42
  const typeWidth = visibleTypes.length ? (width - fixedWidth) / visibleTypes.length : 0
  const columnStyles = {
    0: { cellWidth: 7 },
    1: { cellWidth: 24, halign: 'left' },
    2: { cellWidth: 11 },
  }
  visibleTypes.forEach((_, index) => {
    columnStyles[index + 3] = { cellWidth: typeWidth, cellPadding: 0.25, overflow: 'linebreak' }
  })
  const tableFontSize = Math.max(3.8, Math.min(6.2, 7 - visibleTypes.length * 0.28))
  const bottom = table(doc, {
    x, y: y + 15.5, width,
    head: ['No.', 'Provincia', 'Nro. de eventos adversos', ...visibleTypes.map((type) => type.label)],
    body: rows,
    columnStyles,
    fontSize: tableFontSize,
    headMinHeight: visibleTypes.length > 3 ? 12 : 7,
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
  const estimatedHeight = 15 + (visibleColumns.length > 5 ? 14 : 7) + (ranked.length + 1) * 3.7 + 9
  const currentPage = doc.internal.getCurrentPageInfo().pageNumber
  let y = currentPage === 1 ? Math.max(132, startY) : Math.max(25, startY)
  if (currentPage > 1 && y > 25 && y + estimatedHeight > 270) {
    doc.addPage('a4', 'portrait')
    y = 25
  }
  sectionBand(doc, x, y, width, 'Detalle de afectaciones por provincias', 'detail')
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
    columnStyles[index + 2] = { cellWidth: numericWidth, cellPadding: 0.18, overflow: 'linebreak' }
  })
  const tableFontSize = Math.max(3.5, Math.min(6.1, 7 - numericColumns * 0.2))
  const bottom = table(doc, {
    x, y: y + 15, width,
    head: visibleColumns.map((column) => column.label),
    body: rows,
    columnStyles,
    fontSize: tableFontSize,
    headMinHeight: visibleColumns.length > 5 ? 12 : 7,
    cellPadding: 0.18,
    minCellHeight: ranked.length > 12 ? 2.9 : 3.4,
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
  const normalize = (value) => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const declaredType = normalize(event?.TipoEvento)
  if (declaredType.includes('inund')) return 'flood'
  if (declaredType.includes('desliz') || declaredType.includes('derrumbe')) return 'landslide'
  if (declaredType.includes('lluv')) return 'rain'

  const fallbackText = normalize(`${eventLocation(event)} ${eventDescription(event)}`)
  if (fallbackText.includes('inund') || fallbackText.includes('desbord')) return 'flood'
  if (fallbackText.includes('desliz') || fallbackText.includes('derrumbe')) return 'landslide'
  return 'rain'
}

function eventBlockLayout(doc, event, width) {
  font(doc, 'bold', 6.5, COLORS.darkNavy)
  const titleLines = doc.splitTextToSize(eventLocation(event), width - 27)
  font(doc, 'bold', 4.6, COLORS.darkNavy)
  const availableMetaWidth = width - 27
  let metaRow = 0
  let metaX = 0
  const metaTags = highImpactEventMetaItems(event).map((item) => {
    const tagWidth = doc.getTextWidth(item.value) + 2.8
    if (metaX && metaX + tagWidth > availableMetaWidth) {
      metaRow += 1
      metaX = 0
    }
    const tag = { ...item, x: metaX, y: metaRow * 3.9, width: tagWidth }
    metaX += tagWidth + 1.1
    return tag
  })
  const metaHeight = metaTags.length ? (metaRow + 1) * 3.9 : 0
  font(doc, 'normal', 5.4, COLORS.black)
  const bodyLines = doc.splitTextToSize(eventDescription(event), width - 27)
  font(doc, 'bold', 5.5, COLORS.darkNavy)
  const affectationLines = eventAffectations(event)
    .flatMap((line) => doc.splitTextToSize(`▲ ${line}.`, width - 27))
  const responseLines = cleanHighImpactResponseLines(event?.CoordinacionYRespuesta)
    .flatMap((line) => doc.splitTextToSize(line, width - 27))
  const textHeight = 3.5 + titleLines.length * 2.7 + metaHeight + bodyLines.length * 2.25
    + affectationLines.length * 2.35 + responseLines.length * 2.3 + 3
  return { titleLines, metaTags, metaHeight, bodyLines, affectationLines, responseLines, height: Math.max(22, textHeight) }
}

function renderEventBlock(doc, assets, event, x, y, width, layout) {
  const iconX = x + 8
  drawEventIcon(doc, assets, eventIconType(event), iconX, y + 2.2, 13)
  doc.setFillColor(...COLORS.red)
  doc.circle(x + 18, y + 4.4, 1.7, 'F')
  doc.triangle(x + 16.8, y + 5.1, x + 19.2, y + 5.1, x + 18, y + 7.4, 'F')
  doc.setFillColor(...COLORS.white)
  doc.circle(x + 18, y + 4.2, 0.55, 'F')
  font(doc, 'bold', 6.5, COLORS.darkNavy)
  doc.text(layout.titleLines, x + 22, y + 3.3)
  let textY = y + 3.8 + layout.titleLines.length * 2.7
  if (layout.metaTags.length) {
    font(doc, 'bold', 4.6, COLORS.darkNavy)
    const tagColors = {
      type: { fill: [255, 240, 228], border: [242, 196, 159], text: [154, 61, 0] },
      datetime: { fill: [231, 242, 252], border: [184, 212, 238], text: [7, 59, 112] },
    }
    layout.metaTags.forEach((tag) => {
      const colors = tagColors[tag.kind]
      doc.setFillColor(...colors.fill)
      doc.setDrawColor(...colors.border)
      doc.roundedRect(x + 22 + tag.x, textY - 1.35 + tag.y, tag.width, 3.15, 1.2, 1.2, 'FD')
      font(doc, 'bold', 4.6, colors.text)
      doc.text(tag.value, x + 23.4 + tag.x, textY + 0.55 + tag.y)
    })
    textY += layout.metaHeight + 0.8
  }
  font(doc, 'normal', 5.4, COLORS.black)
  doc.text(layout.bodyLines, x + 22, textY)
  let nextY = textY + layout.bodyLines.length * 2.25 + 1.2
  if (layout.affectationLines.length) {
    font(doc, 'bold', 5.5, eventIconType(event) === 'landslide' ? COLORS.orange : COLORS.darkNavy)
    doc.text(layout.affectationLines, x + 22, nextY)
    nextY += layout.affectationLines.length * 2.35 + 0.8
  }
  if (layout.responseLines.length) {
    font(doc, 'bold', 5.4, COLORS.darkNavy)
    doc.text(layout.responseLines, x + 22, nextY)
  }
}

function highImpactBand(doc, x, y, continuation = false) {
  doc.setFillColor(...COLORS.paleBlue)
  doc.roundedRect(x, y + 2, 198, 12.5, 2, 2, 'F')
  doc.setFillColor(...COLORS.navy)
  doc.roundedRect(x + 4.5, y, 145, 8, 4, 4, 'F')
  doc.circle(x + 5, y + 4, 5, 'F')
  doc.setFillColor(...COLORS.white)
  doc.triangle(x + 5, y + 0.9, x + 1.8, y + 6.6, x + 8.2, y + 6.6, 'F')
  font(doc, 'black', 7, COLORS.navy)
  doc.text('!', x + 5, y + 5.8, { align: 'center' })
  font(doc, 'bold', 9.2, COLORS.white)
  doc.text(`EVENTOS ADVERSOS ${continuation ? ' - CONTINUACIÓN' : ''}`, x + 12, y + 5.3)
  font(doc, 'normal', 6.8, COLORS.darkNavy)
  doc.text('A continuación, se detallan los eventos adversos relevantes de los últimos días:', x + 10, y + 12)
}

function groupEventsByZone(events) {
  const zones = new Map()
  events.forEach((event) => {
    const zone = String(event?.Zona ?? '').trim() || 'Sin zona'
    if (!zones.has(zone)) zones.set(zone, [])
    zones.get(zone).push(event)
  })
  const zoneNumber = (zone) => {
    const match = String(zone).match(/\d+/)
    return match ? Number(match[0]) : Number.POSITIVE_INFINITY
  }
  return [...zones.entries()].sort(([left], [right]) => (
    zoneNumber(left) - zoneNumber(right)
    || String(left).localeCompare(String(right), 'es', { numeric: true })
  ))
}

function zoneTitle(zone) {
  return /^zona\b/i.test(zone) || /^sin zona$/i.test(zone) ? zone : `Zona ${zone}`
}

function zonePanelLayout(doc, events, width) {
  const eventLayouts = events.map((event) => eventBlockLayout(doc, event, width))
  const height = zonePanelHeight(eventLayouts)
  return { eventLayouts, height }
}

function zonePanelHeight(eventLayouts) {
  return 8.2 + eventLayouts.reduce((total, layout) => total + layout.height + 0.8, 0) + 1
}

function renderZonePanel(doc, assets, zone, events, x, y, width, layout) {
  doc.setFillColor(...COLORS.white)
  doc.setDrawColor(211, 224, 238)
  doc.setLineWidth(0.18)
  doc.roundedRect(x, y, width, layout.height, 2, 2, 'FD')
  doc.setFillColor(205, 225, 245)
  doc.roundedRect(x, y, width, 8, 2, 2, 'F')
  font(doc, 'bold', 9, COLORS.darkNavy)
  doc.text(zoneTitle(zone), x + 5, y + 5.6)
  let currentY = y + 9
  events.forEach((event, index) => {
    const eventLayout = layout.eventLayouts[index]
    renderEventBlock(doc, assets, event, x + 1.5, currentY, width - 3, eventLayout)
    currentY += eventLayout.height + 0.8
    if (index < events.length - 1) {
      doc.setDrawColor(226, 234, 243)
      doc.setLineWidth(0.15)
      doc.line(x + 4, currentY - 0.4, x + width - 4, currentY - 0.4)
    }
  })
}

function largestFittingChunk(eventLayouts, availableHeight, leaveAtLeast = 0) {
  const maximum = Math.max(0, eventLayouts.length - leaveAtLeast)
  let count = 0
  for (let index = 1; index <= maximum; index += 1) {
    if (zonePanelHeight(eventLayouts.slice(0, index)) > availableHeight) break
    count = index
  }
  return count
}

function renderHighImpact(doc, assets, options, startY) {
  const x = 6
  const width = 198
  const gap = 2
  const columnWidth = (width - gap) / 2
  const bottom = 269
  const currentPage = doc.internal.getCurrentPageInfo().pageNumber
  let y = currentPage === 1 ? Math.max(187, startY) : Math.max(25, startY)
  const events = options.highImpactEvents
  const firstPanelHeight = events.length
    ? zonePanelLayout(doc, [events[0]], columnWidth).height
    : 45
  if (y + 16 + firstPanelHeight > bottom) {
    doc.addPage('a4', 'portrait')
    y = 25
  }
  highImpactBand(doc, x, y)
  if (!events.length) {
    doc.setFillColor(...COLORS.white)
    doc.setDrawColor(211, 224, 238)
    doc.roundedRect(x, y + 16, width, 45, 2, 2, 'FD')
    font(doc, 'medium', 8, COLORS.black)
    doc.text('No se registraron eventos adversos de alto impacto para el período consultado.', 105, y + 39, { align: 'center' })
    return
  }
  let columnY = [y + 16, y + 16]
  let zonesPlacedOnPage = new Set()
  const zoneQueue = groupEventsByZone(events).map(([zone, zoneEvents]) => ({
    zone,
    events: zoneEvents,
    layout: zonePanelLayout(doc, zoneEvents, columnWidth),
    offset: 0,
  }))

  while (zoneQueue.length) {
    const zonesInPass = zoneQueue.length

    for (let passIndex = 0; passIndex < zonesInPass; passIndex += 1) {
      const state = zoneQueue.shift()
      if (zonesPlacedOnPage.has(state.zone)) {
        zoneQueue.push(state)
        continue
      }

      const remainingEvents = state.events.slice(state.offset)
      const remainingLayouts = state.layout.eventLayouts.slice(state.offset)
      const columns = columnY[0] <= columnY[1] ? [0, 1] : [1, 0]
      let selectedColumn = -1
      let take = 0

      for (const column of columns) {
        const available = bottom - columnY[column]
        const fitting = largestFittingChunk(remainingLayouts, available)
        if (fitting) {
          selectedColumn = column
          take = fitting
          break
        }
      }

      if (selectedColumn < 0 && columnY.every((value) => Math.abs(value - (y + 16)) < 0.5)) {
        selectedColumn = 0
        take = 1
      }

      if (selectedColumn < 0) {
        zoneQueue.push(state)
        continue
      }

      const chunkEvents = remainingEvents.slice(0, take)
      const chunkLayouts = remainingLayouts.slice(0, take)
      const chunkLayout = { eventLayouts: chunkLayouts, height: zonePanelHeight(chunkLayouts) }
      const columnX = x + selectedColumn * (columnWidth + gap)
      renderZonePanel(doc, assets, state.zone, chunkEvents, columnX, columnY[selectedColumn], columnWidth, chunkLayout)
      columnY[selectedColumn] += chunkLayout.height + 2
      state.offset += take
      zonesPlacedOnPage.add(state.zone)

      if (state.offset < state.events.length) zoneQueue.push(state)
    }

    if (zoneQueue.length) {
      doc.addPage('a4', 'portrait')
      y = 25
      highImpactBand(doc, x, y, true)
      columnY = [y + 16, y + 16]
      zonesPlacedOnPage = new Set()
    }
  }
}

function renderFooter(doc, assets) {
  doc.addImage(assets.footer, 'PNG', 0, 274, 210, 23)
  doc.setFillColor(...COLORS.white)
  doc.rect(0, 274, 150, 23, 'F')
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
  renderMetricCards(doc, assets, summary)
  renderMap(doc, normalized)
  const summaryBottom = renderSummaryTable(doc, normalized, summary, meta)
  const detailBottom = renderProvinceDetail(doc, normalized, summaryBottom, meta)
  renderHighImpact(doc, assets, normalized, detailBottom)
  decoratePages(doc, assets, meta)
  return doc
}

export async function exportReport24InfographicPdf(options = {}) {
  const doc = await buildReport24InfographicPdf(options)
  doc.save('infografia_reporte_24_horas.pdf')
}
