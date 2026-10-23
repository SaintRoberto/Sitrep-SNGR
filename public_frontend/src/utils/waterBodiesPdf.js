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
  mapBase: ['water-report', 'ecuador-reservas-map-v2.png'],
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

const MAINLAND_GEO_BOUNDS = {
  west: -81.1,
  east: -75.15,
  north: 1.5,
  south: -5.02,
}

const GALAPAGOS_GEO_BOUNDS = {
  west: -92.2,
  east: -89.1,
  north: 1,
  south: -1.6,
}

const GALAPAGOS_MAP_FRAME = { x: 44, y: 52, width: 30, height: 30 }

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
  doc.rect(170, 0.5, PAGE.width - 170, 1.5, 'F')
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

function activeProvinceStates(overflowRows, risingRows) {
  const states = new Map()
  const mark = (rows, status) => rows.forEach((row) => {
    const key = normalizeProvinceName(row.Provincia)
    if (!key) return
    const state = states.get(key) || { overflowed: false, rising: false }
    state[status] = true
    states.set(key, state)
  })
  mark(overflowRows, 'overflowed')
  mark(risingRows, 'rising')
  return states
}

function activeProvinceColor(state) {
  return state.overflowed && state.rising
    ? [55, 116, 198]
    : [173, 215, 245]
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

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).trim().replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function pointInsideBounds(latitude, longitude, bounds) {
  return latitude >= bounds.south && latitude <= bounds.north
    && longitude >= bounds.west && longitude <= bounds.east
}

function pointInsideRing(point, ring) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [x, y] = ring[index]
    const [previousX, previousY] = ring[previous]
    const intersects = ((y > point[1]) !== (previousY > point[1]))
      && point[0] < ((previousX - x) * (point[1] - y)) / (previousY - y || Number.EPSILON) + x
    if (intersects) inside = !inside
  }
  return inside
}

function nearestPointOnSegment(point, start, end) {
  const deltaX = end[0] - start[0]
  const deltaY = end[1] - start[1]
  const lengthSquared = deltaX * deltaX + deltaY * deltaY
  if (!lengthSquared) return start
  const ratio = Math.max(0, Math.min(1, (
    (point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY
  ) / lengthSquared))
  return [start[0] + ratio * deltaX, start[1] + ratio * deltaY]
}

function nearestRingBoundary(point, ring) {
  let nearest = ring[0]
  let distance = Infinity
  for (let index = 0; index < ring.length; index += 1) {
    const candidate = nearestPointOnSegment(point, ring[index], ring[(index + 1) % ring.length])
    const candidateDistance = Math.hypot(point[0] - candidate[0], point[1] - candidate[1])
    if (candidateDistance < distance) {
      nearest = candidate
      distance = candidateDistance
    }
  }
  return { point: nearest, distance }
}

function keepMarkerInsideProvince(point, province, map, padding = 1.55) {
  if (!province?.paths?.length) return point
  const rings = province.paths
    .map((polygon) => (polygon[0] || []).map(([x, y]) => mapPoint(map, x, y)))
    .filter((ring) => ring.length >= 3)
  if (!rings.length) return point

  let selectedRing = rings.find((ring) => pointInsideRing(point, ring))
  if (!selectedRing) {
    selectedRing = rings.reduce((closestRing, ring) => (
      nearestRingBoundary(point, ring).distance < nearestRingBoundary(point, closestRing).distance ? ring : closestRing
    ), rings[0])
  }

  const boundary = nearestRingBoundary(point, selectedRing)
  if (pointInsideRing(point, selectedRing) && boundary.distance >= padding) return point

  const provinceAnchor = mapPoint(map, ...(province.label || [map.bounds.minX, map.bounds.minY]))
  const anchor = pointInsideRing(provinceAnchor, selectedRing)
    ? provinceAnchor
    : selectedRing.reduce((sum, vertex) => [sum[0] + vertex[0] / selectedRing.length, sum[1] + vertex[1] / selectedRing.length], [0, 0])
  const start = pointInsideRing(point, selectedRing) ? point : boundary.point

  for (let step = 1; step <= 100; step += 1) {
    const ratio = step / 100
    const candidate = [
      start[0] + (anchor[0] - start[0]) * ratio,
      start[1] + (anchor[1] - start[1]) * ratio,
    ]
    if (pointInsideRing(candidate, selectedRing) && nearestRingBoundary(candidate, selectedRing).distance >= padding) {
      return candidate
    }
  }
  return provinceAnchor
}

function coordinateMarker(row, map, provinceKey, province) {
  const latitude = parseCoordinate(row.Latitud)
  const longitude = parseCoordinate(row.Longitud)
  if (latitude === null || longitude === null) return null

  if (provinceKey === 'galapagos' && pointInsideBounds(latitude, longitude, GALAPAGOS_GEO_BOUNDS)) {
    return [
      Math.max(GALAPAGOS_MAP_FRAME.x + 1.55, Math.min(GALAPAGOS_MAP_FRAME.x + GALAPAGOS_MAP_FRAME.width - 1.55,
        GALAPAGOS_MAP_FRAME.x
        + ((longitude - GALAPAGOS_GEO_BOUNDS.west) / (GALAPAGOS_GEO_BOUNDS.east - GALAPAGOS_GEO_BOUNDS.west)) * GALAPAGOS_MAP_FRAME.width,
      )),
      Math.max(GALAPAGOS_MAP_FRAME.y + 1.55, Math.min(GALAPAGOS_MAP_FRAME.y + GALAPAGOS_MAP_FRAME.height - 1.55,
        GALAPAGOS_MAP_FRAME.y
        + ((GALAPAGOS_GEO_BOUNDS.north - latitude) / (GALAPAGOS_GEO_BOUNDS.north - GALAPAGOS_GEO_BOUNDS.south)) * GALAPAGOS_MAP_FRAME.height,
      )),
    ]
  }

  if (!pointInsideBounds(latitude, longitude, MAINLAND_GEO_BOUNDS)) return null
  const geometryX = map.bounds.minX
    + ((longitude - MAINLAND_GEO_BOUNDS.west) / (MAINLAND_GEO_BOUNDS.east - MAINLAND_GEO_BOUNDS.west))
      * (map.bounds.maxX - map.bounds.minX)
  const geometryY = map.bounds.minY
    + ((MAINLAND_GEO_BOUNDS.north - latitude) / (MAINLAND_GEO_BOUNDS.north - MAINLAND_GEO_BOUNDS.south))
      * (map.bounds.maxY - map.bounds.minY)
  return keepMarkerInsideProvince(mapPoint(map, geometryX, geometryY), province, map)
}

function markerPositions(rows, map, lookup) {
  const used = new Map()
  return rows.map((row) => {
    const key = normalizeProvinceName(row.Provincia)
    const province = lookup.get(key)
    const coordinates = coordinateMarker(row, map, key, province)
    if (coordinates) {
      return {
        ...row,
        markerX: coordinates[0],
        markerY: coordinates[1],
        markerUsesCoordinates: true,
      }
    }
    const occurrence = used.get(key) || 0
    used.set(key, occurrence + 1)
    const [offsetX, offsetY] = POINT_OFFSETS[occurrence % POINT_OFFSETS.length]
    if (key === 'galapagos') {
      return {
        ...row,
        markerX: GALAPAGOS_MAP_FRAME.x + GALAPAGOS_MAP_FRAME.width / 2 + offsetX * 0.16,
        markerY: GALAPAGOS_MAP_FRAME.y + GALAPAGOS_MAP_FRAME.height / 2 + offsetY * 0.16,
      }
    }
    const [labelX, labelY] = province?.label || [300, 300]
    const [centerX, centerY] = mapPoint(map, labelX, labelY)
    const fallbackMarker = keepMarkerInsideProvince([
      centerX + offsetX * map.scaleX,
      centerY + offsetY * map.scaleY,
    ], province, map)
    return {
      ...row,
      markerX: fallbackMarker[0],
      markerY: fallbackMarker[1],
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

function drawCallout(doc, group, x, map, side) {
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

  const target = group.provinceKey === 'galapagos'
    ? [GALAPAGOS_MAP_FRAME.x + GALAPAGOS_MAP_FRAME.width / 2, GALAPAGOS_MAP_FRAME.y + GALAPAGOS_MAP_FRAME.height / 2]
    : mapPoint(map, ...group.label)
  const startX = side === 'left' ? x + width : x
  const startY = group.y + group.height / 2
  drawLeaderArrow(doc, startX, startY, target[0], target[1], color)
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
  // Keep the western islands inside the page while leaving the mainland large
  // enough for the province markers and callout leaders.
  doc.addImage(assets.mapBase, 'PNG', -10, 18.5, 317, 158.5)
  const mainland = ECUADOR_PROVINCES.filter((province) => normalizeProvinceName(province.name) !== 'galapagos')
  const map = createStretchedMapLayout({ x: 90.1, y: 17.8, width: 144.9, height: 159.6 }, mainland)
  const allRows = [...overflowRows, ...risingRows]
  const provinceStates = activeProvinceStates(overflowRows, risingRows)

  // Preserve the supplied cartography and highlight only provinces represented
  // by the current endpoint data.
  mainland.forEach((province) => {
    const state = provinceStates.get(normalizeProvinceName(province.name))
    if (state) drawProvince(doc, province, map, activeProvinceColor(state), 0.78)
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
  leftGroups.forEach((group) => drawCallout(doc, group, 7, map, 'left'))
  rightGroups.forEach((group) => drawCallout(doc, group, PAGE.width - 7 - group.width, map, 'right'))

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
  const startY = options.intro ? 45 : 38.5

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
    doc.text(options.intro, PAGE.left, 29.5)
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
