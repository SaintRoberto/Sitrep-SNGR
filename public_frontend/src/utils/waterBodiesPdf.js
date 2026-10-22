import jsPDFPackage from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ECUADOR_PROVINCES, normalizeProvinceName } from './impactMap.js'

const JsPDF = jsPDFPackage.jsPDF || jsPDFPackage

const COLORS = {
  navy: [4, 40, 98],
  pill: [45, 53, 93],
  red: [255, 17, 17],
  orange: [244, 124, 43],
  paleRed: [252, 226, 213],
  paleOrange: [255, 241, 199],
  line: [198, 198, 198],
  white: [255, 255, 255],
  black: [20, 20, 20],
}

const PAGE = { width: 297, height: 210, left: 7, right: 7, top: 36, bottom: 198 }
const TEMPLATE_FILES = {
  logo: ['water-report', 'gobierno-ecuador-sngr.png'],
  mapBase: ['water-report', 'ecuador-reservas-map.png'],
  fontLight: ['sitrep-template', 'BarlowCondensed-Light.ttf'],
  fontRegular: ['sitrep-template', 'BarlowCondensed-Regular.ttf'],
  fontBold: ['sitrep-template', 'BarlowCondensed-SemiBold.ttf'],
}

const TABLE_COLUMNS = [
  { key: '__no__', label: 'No.', width: 8 },
  { key: 'Provincia', label: 'Provincia', width: 26 },
  { key: 'Canton', label: 'Cantón', width: 29 },
  { key: 'Parroquia', label: 'Parroquia', width: 46 },
  { key: 'Sector', label: 'Sector', width: 50 },
  { key: 'CuerpoHidrico', label: 'Nombre cuerpo hídrico', width: 29 },
  { key: 'FechaNovedad', label: 'Fecha de novedad', width: 23 },
  { key: 'Estado', label: 'Observaciones', width: 58 },
]

const POINT_OFFSETS = [
  [0, 0], [8, -5], [-8, 5], [11, 7], [-11, -7], [4, 12], [-4, -12], [14, -3], [-14, 3],
]

function assetUrl(folder, file, baseUrl) {
  const productionBase = import.meta.env?.VITE_API_ENV === 'prod' ? import.meta.env?.VITE_API_PROD_URL : ''
  const base = baseUrl || import.meta.env?.VITE_ASSET_BASE_URL || productionBase || import.meta.env?.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/${folder}/${encodeURIComponent(file)}`
}

async function asBase64(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar el recurso del reporte: ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

async function asDataUrl(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar el recurso del reporte: ${url}`)
  const blob = await response.blob()
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function loadAssets(baseUrl) {
  const entries = Object.entries(TEMPLATE_FILES)
  const values = await Promise.all(entries.map(([key, [folder, file]]) => (
    key.startsWith('font') ? asBase64(assetUrl(folder, file, baseUrl)) : asDataUrl(assetUrl(folder, file, baseUrl))
  )))
  return Object.fromEntries(entries.map(([key], index) => [key, values[index]]))
}

function registerFonts(doc, assets) {
  doc.addFileToVFS('BarlowCondensed-Light.ttf', assets.fontLight)
  doc.addFont('BarlowCondensed-Light.ttf', 'BarlowCondensedLight', 'normal')
  doc.addFileToVFS('BarlowCondensed-Regular.ttf', assets.fontRegular)
  doc.addFont('BarlowCondensed-Regular.ttf', 'BarlowCondensed', 'normal')
  doc.addFileToVFS('BarlowCondensed-SemiBold.ttf', assets.fontBold)
  doc.addFont('BarlowCondensed-SemiBold.ttf', 'BarlowCondensed', 'bold')
}

function font(doc, style = 'normal', size = 9, color = COLORS.black) {
  doc.setFont('BarlowCondensed', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value
  const raw = String(value || '').trim()
  if (!raw) return null
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function cutoffText(value) {
  const date = parseDate(value) || new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year}  ${hours}h${minutes}`
}

function drawReportPill(doc, reportNumber) {
  doc.setFillColor(...COLORS.pill)
  doc.roundedRect(145, 7.1, 43, 8.5, 4.2, 4.2, 'F')
  font(doc, 'bold', 12, COLORS.white)
  doc.text(`Reporte No. ${reportNumber || '-'}`, 166.5, 12.9, { align: 'center' })
}

function dateCell(value) {
  const date = parseDate(value)
  if (!date) return String(value ?? '')
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function normalizeRows(overflowed, rising) {
  const toRows = (items, start, fallbackState) => items.map((row, index) => ({
    ...row,
    __no__: start + index,
    Provincia: String(row?.Provincia ?? '').trim(),
    Canton: String(row?.Canton ?? '').trim(),
    Parroquia: String(row?.Parroquia ?? '').trim(),
    Sector: String(row?.Sector ?? '').trim(),
    CuerpoHidrico: String(row?.CuerpoHidrico ?? '').trim(),
    FechaNovedad: dateCell(row?.FechaNovedad),
    Estado: String(row?.Estado || fallbackState),
  }))
  const overflowRows = toRows(overflowed, 1, 'Desbordado')
  return {
    overflowRows,
    risingRows: toRows(rising, overflowRows.length + 1, 'Con tendencia a aumentar de nivel'),
  }
}

function header(doc, assets, reportNumber, cutoff) {
  font(doc, 'bold', 16, COLORS.navy)
  doc.text('REPORTE DE ESTADO DE CUERPOS HÍDRICOS', PAGE.left, 8.4)
  font(doc, 'bold', 14, COLORS.navy)
  doc.text(`Fecha y hora de corte: ${cutoff}`, PAGE.left, 14.9)

  doc.setFillColor(...COLORS.navy)
  doc.rect(170, 2.8, 126, 2.2, 'F')
  doc.addImage(assets.logo, 'PNG', 216, 4.9, 74, 11.6)
  drawReportPill(doc, reportNumber)
}

function footer(doc) {
  doc.setDrawColor(...COLORS.orange)
  doc.setLineWidth(0.35)
  doc.line(0, 195.5, PAGE.width, 195.5)
  font(doc, 'bold', 6.2, COLORS.navy)
  doc.text(
    'Fuente: Unidades de Monitoreo de Eventos Adversos; Instituciones del SNDGIRD / Elaborado por: Dirección de Monitoreo de Eventos Adversos SNGR',
    PAGE.left,
    204,
  )
}

function provinceLookup() {
  return new Map(ECUADOR_PROVINCES.map((province) => [normalizeProvinceName(province.name), province]))
}

function activeProvinceCounts(rows) {
  const counts = new Map()
  rows.forEach((row) => {
    const key = normalizeProvinceName(row.Provincia)
    if (key) counts.set(key, (counts.get(key) || 0) + 1)
  })
  return counts
}

function activeProvinceColor(count, maximum) {
  if (!count) return [241, 245, 249]
  const ratio = maximum > 1 ? (count - 1) / (maximum - 1) : 1
  return [Math.round(189 - 95 * ratio), Math.round(218 - 73 * ratio), Math.round(244 - 25 * ratio)]
}

function geometryBounds(provinces) {
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  provinces.forEach((province) => province.paths.forEach((polygon) => (polygon[0] || []).forEach(([x, y]) => {
    bounds.minX = Math.min(bounds.minX, x)
    bounds.minY = Math.min(bounds.minY, y)
    bounds.maxX = Math.max(bounds.maxX, x)
    bounds.maxY = Math.max(bounds.maxY, y)
  })))
  return bounds
}

function createMapLayout(frame, provinces) {
  const bounds = geometryBounds(provinces)
  const scale = Math.min(
    frame.width / (bounds.maxX - bounds.minX),
    frame.height / (bounds.maxY - bounds.minY),
  )
  return {
    ...frame,
    bounds,
    scale,
    scaleX: scale,
    scaleY: scale,
    offsetX: frame.x + (frame.width - (bounds.maxX - bounds.minX) * scale) / 2,
    offsetY: frame.y + (frame.height - (bounds.maxY - bounds.minY) * scale) / 2,
  }
}

function createStretchedMapLayout(frame, provinces) {
  const bounds = geometryBounds(provinces)
  return {
    ...frame,
    bounds,
    scaleX: frame.width / (bounds.maxX - bounds.minX),
    scaleY: frame.height / (bounds.maxY - bounds.minY),
    offsetX: frame.x,
    offsetY: frame.y,
  }
}

function mapPoint(map, x, y) {
  return [
    map.offsetX + (x - map.bounds.minX) * map.scaleX,
    map.offsetY + (y - map.bounds.minY) * map.scaleY,
  ]
}

function drawProvince(doc, province, map, fillColor, opacity = 1) {
  if (opacity < 1 && doc.GState) {
    doc.saveGraphicsState()
    doc.setGState(new doc.GState({ opacity }))
  }
  doc.setFillColor(...fillColor)
  doc.setDrawColor(83, 101, 121)
  doc.setLineWidth(0.16)
  province.paths.forEach((polygon) => {
    const ring = polygon[0] || []
    if (ring.length < 3) return
    const [startX, startY] = ring[0]
    const vectors = ring.slice(1).map(([x, y], index) => {
      const [previousX, previousY] = ring[index]
      return [(x - previousX) * map.scaleX, (y - previousY) * map.scaleY]
    })
    const [x, y] = mapPoint(map, startX, startY)
    doc.lines(vectors, x, y, [1, 1], 'FD', true)
  })
  if (opacity < 1 && doc.GState) doc.restoreGraphicsState()
}

function markerPositions(rows, map, lookup) {
  const used = new Map()
  return rows.map((row) => {
    const key = normalizeProvinceName(row.Provincia)
    const province = lookup.get(key)
    const occurrence = used.get(key) || 0
    used.set(key, occurrence + 1)
    const [offsetX, offsetY] = POINT_OFFSETS[occurrence % POINT_OFFSETS.length]
    if (key === 'galapagos') {
      return {
        ...row,
        markerX: 34.8 + offsetX * 0.16,
        markerY: 68.5 + offsetY * 0.16,
      }
    }
    const [labelX, labelY] = province?.label || [300, 300]
    const [centerX, centerY] = mapPoint(map, labelX, labelY)
    return {
      ...row,
      markerX: centerX + offsetX * map.scaleX,
      markerY: centerY + offsetY * map.scaleY,
    }
  })
}

function groupedCallouts(overflowRows, risingRows, lookup) {
  const groups = new Map()
  const add = (rows, kind) => rows.forEach((row) => {
    const provinceKey = normalizeProvinceName(row.Provincia)
    const key = `${provinceKey}:${kind}`
    if (!groups.has(key)) groups.set(key, {
      province: row.Provincia,
      provinceKey,
      kind,
      rows: [],
      label: lookup.get(provinceKey)?.label || [300, 300],
    })
    groups.get(key).rows.push(row)
  })
  add(overflowRows, 'overflow')
  add(risingRows, 'rising')
  return [...groups.values()].sort((left, right) => left.label[1] - right.label[1])
}

function calloutMetrics(doc, group) {
  font(doc, 'bold', 9, COLORS.black)
  const rowWidths = group.rows.map((row) => (
    doc.getTextWidth(String(row.__no__).padStart(2, '0')) + 2.2 + doc.getTextWidth(row.CuerpoHidrico || 'Sin nombre')
  ))
  const status = group.kind === 'overflow' ? 'Desbordados' : 'Con Incremento'
  const contentWidth = Math.max(doc.getTextWidth(group.province), doc.getTextWidth(status), ...rowWidths)
  return {
    ...group,
    width: Math.min(52, Math.max(25, contentWidth + 3.2)),
    height: 9.8 + group.rows.length * 3.8,
  }
}

function distributeCallouts(groups) {
  const columns = [[], []]
  const heights = [0, 0]
  const largestFirst = [...groups].sort((left, right) => right.rows.length - left.rows.length)
  largestFirst.forEach((group) => {
    const column = heights[0] <= heights[1] ? 0 : 1
    columns[column].push(group)
    heights[column] += group.height + 2.5
  })
  return columns.map((column, columnIndex) => {
    column.sort((left, right) => left.label[1] - right.label[1])
    const total = column.reduce((sum, group) => sum + group.height, 0) + Math.max(0, column.length - 1) * 2.5
    const minimumY = columnIndex === 0 && total <= 105 ? 80 : 31
    let y = Math.max(minimumY, 111 - total / 2)
    return column.map((group) => {
      const positioned = { ...group, y }
      y += group.height + 2.5
      return positioned
    })
  })
}

function drawLeaderArrow(doc, startX, startY, endX, endY, color) {
  doc.setDrawColor(...color)
  doc.setFillColor(...color)
  doc.setLineWidth(0.42)
  doc.line(startX, startY, endX, endY)
  const angle = Math.atan2(endY - startY, endX - startX)
  const size = 2.1
  const wing = 0.72
  doc.triangle(
    endX,
    endY,
    endX - size * Math.cos(angle - wing),
    endY - size * Math.sin(angle - wing),
    endX - size * Math.cos(angle + wing),
    endY - size * Math.sin(angle + wing),
    'F',
  )
}

function drawCallout(doc, group, x, markerRows, side) {
  const width = group.width
  const color = group.kind === 'overflow' ? COLORS.red : COLORS.orange
  const pale = group.kind === 'overflow' ? COLORS.paleRed : COLORS.paleOrange
  doc.setFillColor(170, 170, 170)
  doc.rect(x + 0.75, group.y + 0.75, width, group.height, 'F')
  doc.setFillColor(...pale)
  doc.setDrawColor(...color)
  doc.setLineWidth(0.42)
  doc.rect(x, group.y, width, group.height, 'FD')
  font(doc, 'bold', 9, COLORS.black)
  doc.text(group.province, x + 1.3, group.y + 3.6)
  doc.setDrawColor(35, 35, 35)
  doc.setLineWidth(0.18)
  doc.line(x, group.y + 4.7, x + width, group.y + 4.7)
  font(doc, 'bold', 9, color)
  doc.text(group.kind === 'overflow' ? 'Desbordados' : 'Con Incremento', x + 1.3, group.y + 8)
  group.rows.forEach((row, index) => {
    const number = String(row.__no__).padStart(2, '0')
    const rowY = group.y + 11.5 + index * 3.8
    font(doc, 'bold', 9, COLORS.black)
    doc.setTextColor(...color)
    doc.text(number, x + 1.3, rowY)
    doc.setTextColor(...COLORS.black)
    doc.text(row.CuerpoHidrico || 'Sin nombre', x + 6.2, rowY)
  })

  const groupMarkers = markerRows.filter((row) => normalizeProvinceName(row.Provincia) === group.provinceKey)
  const target = groupMarkers[Math.min(groupMarkers.length - 1, Math.floor(groupMarkers.length / 2))]
  if (!target) return
  const startX = side === 'left' ? x + width : x
  const startY = group.y + group.height / 2
  drawLeaderArrow(doc, startX, startY, target.markerX, target.markerY, color)
}

function drawSummaryBox(doc, x, color, title, value) {
  doc.setFillColor(125, 125, 125)
  doc.rect(x + 0.9, 18.4, 40, 25, 'F')
  doc.setFillColor(...color)
  doc.setDrawColor(...COLORS.white)
  doc.setLineWidth(0.35)
  doc.rect(x, 17.5, 40, 25, 'FD')
  font(doc, 'bold', 8, COLORS.white)
  const lines = doc.splitTextToSize(title, 35)
  doc.text(lines, x + 20, 23, { align: 'center' })
  font(doc, 'bold', 28, COLORS.white)
  doc.text(String(value), x + 20, 39.2, { align: 'center' })
}

function renderMapPage(doc, overflowRows, risingRows, assets) {
  doc.setFillColor(248, 249, 250)
  doc.rect(0, 17.5, PAGE.width, 178, 'F')
  doc.addImage(assets.mapBase, 'PNG', -41.5, 17.5, 350.7, 177.8)
  const mainland = ECUADOR_PROVINCES.filter((province) => normalizeProvinceName(province.name) !== 'galapagos')
  const map = createStretchedMapLayout({ x: 69.2, y: 16.7, width: 160.3, height: 178.9 }, mainland)
  const allRows = [...overflowRows, ...risingRows]
  const counts = activeProvinceCounts(allRows)
  const maximum = Math.max(1, ...counts.values())

  // Preserve the supplied cartography and highlight only provinces represented
  // by the current endpoint data.
  mainland.forEach((province) => {
    const count = counts.get(normalizeProvinceName(province.name)) || 0
    if (count) drawProvince(doc, province, map, activeProvinceColor(count, maximum), 0.72)
  })

  const lookup = provinceLookup()
  const positionedRows = markerPositions(allRows, map, lookup)
  const overflowMarkers = positionedRows.slice(0, overflowRows.length)
  const risingMarkers = positionedRows.slice(overflowRows.length)
  overflowMarkers.forEach((row) => {
    doc.setFillColor(...COLORS.red)
    doc.setDrawColor(...COLORS.white)
    doc.setLineWidth(0.3)
    doc.circle(row.markerX, row.markerY, 1.15, 'FD')
  })
  risingMarkers.forEach((row) => {
    doc.setFillColor(...COLORS.orange)
    doc.setDrawColor(...COLORS.white)
    doc.setLineWidth(0.3)
    doc.circle(row.markerX, row.markerY, 1.15, 'FD')
  })

  const groups = groupedCallouts(overflowRows, risingRows, lookup).map((group) => calloutMetrics(doc, group))
  const [leftGroups, rightGroups] = distributeCallouts(groups)
  leftGroups.forEach((group) => drawCallout(doc, group, 7, group.kind === 'overflow' ? overflowMarkers : risingMarkers, 'left'))
  rightGroups.forEach((group) => drawCallout(doc, group, PAGE.width - 7 - group.width, group.kind === 'overflow' ? overflowMarkers : risingMarkers, 'right'))

  drawSummaryBox(doc, 4, COLORS.red, 'Cuerpos hídricos\ndesbordados', overflowRows.length)
  drawSummaryBox(doc, 44, COLORS.orange, 'Cuerpos hídricos con\naumento de nivel', risingRows.length)

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(50, 50, 50)
  doc.setLineWidth(0.25)
  doc.rect(7, 181.5, 52, 13.5, 'FD')
  font(doc, 'bold', 5.7, COLORS.black)
  doc.text('Estado de cuerpos hídricos', 9, 186)
  doc.line(7, 187.2, 59, 187.2)
  doc.setFillColor(...COLORS.red)
  doc.circle(10.5, 190, 1.05, 'F')
  font(doc, 'normal', 5.3, COLORS.black)
  doc.text('Desbordados', 13, 191)
  doc.setFillColor(...COLORS.orange)
  doc.circle(10.5, 193.2, 1.05, 'F')
  doc.text('Con tendencia a aumentar de nivel', 13, 194.2)
}

function renderTableSection(doc, rows, options, decoration) {
  if (!rows.length) return
  doc.addPage('a4', 'landscape')
  const firstTablePage = doc.getCurrentPageInfo().pageNumber
  // Paint the institutional frame before autoTable starts. On the first page
  // of a table, autoTable's page hook can run with an active clipping state in
  // some jsPDF versions, which made the header invisible when rasterized.
  header(doc, decoration.assets, decoration.reportNumber, decoration.cutoff)
  footer(doc)
  const startY = options.intro ? 49 : 38.5

  const bandColor = options.kind === 'overflow' ? COLORS.red : COLORS.orange
  const pale = options.kind === 'overflow' ? COLORS.paleRed : COLORS.paleOrange
  const title = options.kind === 'overflow'
    ? `${rows.length} CUERPOS HÍDRICOS DESBORDADOS`
    : `${rows.length} CUERPOS HÍDRICOS CON TENDENCIA A AUMENTAR DE NIVEL`
  let sectionPage = 0

  autoTable(doc, {
    startY,
    head: [TABLE_COLUMNS.map((column) => column.label)],
    body: rows.map((row) => TABLE_COLUMNS.map((column) => (
      column.key === '__no__' ? String(row.__no__).padStart(2, '0') : String(row?.[column.key] ?? '')
    ))),
    theme: 'grid',
    margin: { left: 20, right: 8, top: 37, bottom: 17 },
    tableWidth: 269,
    styles: {
      font: 'BarlowCondensedLight',
      fontStyle: 'normal',
      fontSize: 10,
      textColor: COLORS.black,
      lineColor: COLORS.line,
      lineWidth: 0.18,
      cellPadding: { top: 0.05, right: 0.55, bottom: 0.05, left: 0.55 },
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      font: 'BarlowCondensed',
      fontSize: 9,
      fillColor: pale,
      textColor: COLORS.black,
      fontStyle: 'bold',
      minCellHeight: 7.5,
    },
    columnStyles: Object.fromEntries(TABLE_COLUMNS.map((column, index) => [index, { cellWidth: column.width }])),
    showHead: 'everyPage',
    rowPageBreak: 'avoid',
    didDrawPage: ({ table }) => {
      if (sectionPage > 0) {
        header(doc, decoration.assets, decoration.reportNumber, decoration.cutoff)
        footer(doc)
      }
      const pageStart = table.pageNumber === 1 ? startY : 38.5
      doc.setFillColor(...bandColor)
      doc.rect(20, pageStart - 6.2, 269, 6.2, 'F')
      font(doc, 'bold', 11.5, COLORS.white)
      doc.text(title, 28, pageStart - 1.4)
      sectionPage += 1
    },
  })
  const lastTablePage = doc.getNumberOfPages()
  if (options.intro) {
    doc.setPage(firstTablePage)
    font(doc, 'normal', 8.5, COLORS.black)
    doc.text(options.intro, PAGE.left, 43)
  }
  doc.setPage(lastTablePage)
}

export async function buildWaterBodiesPdf({
  waterBodiesOverflowed = [],
  waterBodiesRising = [],
  sitrepNumber = null,
  publishedAt = null,
  endDate = null,
  assetBaseUrl = null,
} = {}) {
  const assets = await loadAssets(assetBaseUrl)
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  registerFonts(doc, assets)
  const { overflowRows, risingRows } = normalizeRows(waterBodiesOverflowed, waterBodiesRising)
  const cutoff = cutoffText(endDate || publishedAt)

  header(doc, assets, sitrepNumber, cutoff)
  footer(doc)
  renderMapPage(doc, overflowRows, risingRows, assets)
  renderTableSection(doc, overflowRows, {
    kind: 'overflow',
    intro: 'A continuación, las novedades presentadas durante el monitoreo de cuerpos hídricos a nivel nacional:',
  }, { assets, reportNumber: sitrepNumber, cutoff })
  renderTableSection(doc, risingRows, { kind: 'rising' }, { assets, reportNumber: sitrepNumber, cutoff })
  const lastPage = doc.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= lastPage; pageNumber += 1) {
    doc.setPage(pageNumber)
    drawReportPill(doc, sitrepNumber)
  }
  doc.setPage(lastPage)
  return doc
}

export async function exportWaterBodiesPdf(options) {
  const doc = await buildWaterBodiesPdf(options)
  doc.save('Reporte de estado de cuerpos hídricos.pdf')
}
