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

const PAGE = { width: 297, height: 210, margin: 8, headerBottom: 26, footerTop: 198 }
const COLORS = {
  navy: [31, 60, 105],
  darkNavy: [9, 42, 91],
  blue: [49, 103, 176],
  pale: [221, 230, 244],
  orange: [241, 113, 33],
  lightOrange: [251, 231, 217],
  white: [255, 255, 255],
  black: [20, 25, 32],
  gray: [108, 117, 130],
  line: [205, 214, 226],
  red: [236, 24, 34],
}

const EVENT_TYPES = [
  ['Inundacion', 'Inundación'],
  ['Deslizamiento', 'Deslizamiento'],
  ['Lluvias_Intensas', 'Lluvias intensas'],
  ['Erosion_Hidrica', 'Erosión hídrica'],
  ['Hundimiento', 'Hundimiento'],
  ['Aluvion', 'Aluvión (flujos)'],
  ['Vendaval', 'Vendaval'],
  ['Caidas_Colapso', 'Caídas (colapso)'],
  ['Tormenta_Electrica', 'Tormenta eléctrica'],
  ['Granizada', 'Granizada'],
  ['Reptacion', 'Reptación'],
  ['Avalancha', 'Avalancha'],
  ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso de humedad'],
  ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso de infraestructura'],
]

const METRICS = [
  ['Fallecidos', 'Personas\nfallecidas', '01 persona fallecida.png'],
  ['AfectadosPersonas', 'Personas\nafectadas', '04 personas afectadas.png'],
  ['DamnificadosPersonas', 'Personas\ndamnificadas', '06 personas damnificadas.png'],
  ['AfectadosViviendas', 'Viviendas\nafectadas', 'vivienda afectada.png'],
  ['DestruidosViviendas', 'Viviendas\ndestruidas', 'vivienda destruida.png'],
  ['AfectadosPuentes', 'Puentes\nafectados', 'puente afectado.png'],
  ['DestruidosPuentes', 'Puentes\ndestruidos', 'puente destruido.png'],
  ['AfectadosKilometros', 'Km de vías\nafectadas', 'metros vias afectados.png', true],
]

const TEMPLATE_FILES = {
  footer: 'footer-institucional.png',
  fontMedium: 'BarlowCondensed-Medium.ttf',
  fontBold: 'BarlowCondensed-Bold.ttf',
  fontBlack: 'BarlowCondensed-Black.ttf',
  fontItalic: 'BarlowCondensed-LightItalic.ttf',
}

const FONT_SIZE = {
  text14px: 10.5,
  heading24px: 18,
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
  const numeric = n(value)
  return numeric.toLocaleString('es-EC', {
    minimumFractionDigits: decimals ? 2 : 0,
    maximumFractionDigits: decimals ? 2 : 0,
  })
}

function localDate(value, fallback = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(value || ''))
  if (!match) return fallback
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 0), Number(match[5] || 0))
}

function metadata(options) {
  const start = localDate(options.startDate)
  const end = localDate(options.endDate)
  const date = (value, withTime = false) => value.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  })
  return {
    start,
    end,
    startText: date(start),
    endText: date(end, true),
    reference: options.sitrepNumber ? `Referencia SITREP No. ${options.sitrepNumber}` : 'Infografía SITREP',
  }
}

function assetUrl(folder, file, baseUrl) {
  const base = baseUrl || import.meta.env?.BASE_URL || '/'
  return `${base.endsWith('/') ? base : `${base}/`}assets/${folder}/${encodeURIComponent(file)}`
}

async function asDataUrl(url, maxDimension = null) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar el recurso de la infografía: ${url}`)
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

async function asBase64(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`No se pudo cargar la fuente de la infografía: ${url}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ''
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  return btoa(binary)
}

async function loadAssets(baseUrl, logoUrl = new URL('../assets/LOGOECUADOR.png', import.meta.url).href) {
  const templateEntries = Object.entries(TEMPLATE_FILES)
  const templateValues = await Promise.all(templateEntries.map(([key, file]) => (
    key.startsWith('font') ? asBase64(assetUrl('sitrep-template', file, baseUrl)) : asDataUrl(assetUrl('sitrep-template', file, baseUrl))
  )))
  const iconFiles = [...new Set(METRICS.map(([, , icon]) => icon))]
  const icons = await Promise.all(iconFiles.map((file) => asDataUrl(assetUrl('iconos%20SITREP', file, baseUrl), 96)))
  return {
    logo: await asDataUrl(logoUrl),
    ...Object.fromEntries(templateEntries.map(([key], index) => [key, templateValues[index]])),
    icons: Object.fromEntries(iconFiles.map((file, index) => [file, icons[index]])),
  }
}

function registerFonts(doc, assets) {
  [['Medium', 'normal', assets.fontMedium], ['Bold', 'bold', assets.fontBold], ['Black', 'black', assets.fontBlack], ['Italic', 'italic', assets.fontItalic]]
    .forEach(([name, style, source]) => {
      doc.addFileToVFS(`BarlowCondensed-${name}.ttf`, source)
      doc.addFont(`BarlowCondensed-${name}.ttf`, 'BarlowCondensed', style)
    })
}

function font(doc, style = 'normal', size = 7, color = COLORS.black) {
  doc.setFont('BarlowCondensed', style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

function sectionBand(doc, x, y, width, title, dark = false) {
  doc.setFillColor(...(dark ? COLORS.darkNavy : COLORS.pale))
  doc.rect(x, y, width, 6.5, 'F')
  font(doc, 'bold', FONT_SIZE.text14px, dark ? COLORS.white : COLORS.black)
  doc.text(title, x + width / 2, y + 4.5, { align: 'center' })
}

function renderHeader(doc, assets, meta, pageNumber, pageCount) {
  doc.setFillColor(...COLORS.navy)
  doc.roundedRect(5, 4, 222, 20, 3, 3, 'F')
  const titleLead = 'AFECTACIONES POR LLUVIAS EN EL ECUADOR DESDE DECLARACIÓN '
  font(doc, 'black', FONT_SIZE.heading24px, COLORS.white)
  doc.text(titleLead, 17, 12.2)
  const alertX = 17 + doc.getTextWidth(titleLead)
  font(doc, 'black', FONT_SIZE.heading24px, COLORS.red)
  doc.text('ALERTA ROJA', alertX, 12.2)
  font(doc, 'black', FONT_SIZE.heading24px, COLORS.white)
  doc.text(`Inicio ${meta.startText} al ${meta.endText}  ${meta.reference}`, 17, 19)
  doc.addImage(assets.logo, 'PNG', 231, 7, 61, 10.3)
  font(doc, 'bold', 6.4, COLORS.navy)
  doc.text(`Página ${pageNumber} de ${pageCount}`, 291, 22.3, { align: 'right' })
}

function renderFooter(doc, assets) {
  doc.setFillColor(196, 81, 16)
  doc.rect(5, PAGE.footerTop - 1.5, 287, 1.4, 'F')
  font(doc, 'bold', 7.2, COLORS.navy)
  doc.text('Producto elaborado por:', 8, 202)
  doc.text('Dirección de Monitoreo de Eventos Adversos', 8, 206)
  font(doc, 'normal', 5.3, COLORS.navy)
  doc.text('Para acceder a los informes de situación e infografías generadas por la SNGR visite:', 73, 202)
  doc.text('https://www.gestionderiesgos.gob.ec/informes-de-situacion-actual-por-eventos-adversos-ecuador/', 73, 205)
  doc.addImage(assets.footer, 'PNG', 165, 198.2, 127, 11.2)
}

function decorate(doc, assets, meta) {
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    renderHeader(doc, assets, meta, page, pages)
    renderFooter(doc, assets)
  }
}

function renderNarrative(doc, options, meta) {
  const totalEvents = sum(options.tipoLluviasItems, 'NumeroEventos') || sum(options.items, 'NumeroEventos')
  const provinces = n(options.dpaTotals?.TotalProvincias) || new Set(options.items.map((row) => row?.Provincia).filter(Boolean)).size
  const cantons = n(options.dpaTotals?.TotalCantones)
  const parishes = n(options.dpaTotals?.TotalParroquias)
  const ranked = EVENT_TYPES.map(([key, label]) => ({ label, value: sum(options.tipoLluviasItems, key) }))
    .filter((item) => item.value > 0).sort((a, b) => b.value - a.value)
  const rankedText = ranked.slice(0, 5).map((item) => `${item.label} (${fmt(totalEvents ? item.value / totalEvents * 100 : 0, true)}%)`).join(', ')
  const provinceRanking = options.items.map((row) => ({ province: row?.Provincia, value: n(row?.ImpactadasPersonas) }))
    .filter((row) => row.province).sort((a, b) => b.value - a.value).slice(0, 8).map((row) => row.province)
  font(doc, 'normal', FONT_SIZE.text14px, COLORS.black)
  const summary = `Desde el ${meta.startText} hasta la fecha, por lluvias se han registrado ${fmt(totalEvents)} eventos adversos en ${fmt(provinces)} provincias${cantons ? `, afectando a ${fmt(cantons)} cantones` : ''}${parishes ? ` y ${fmt(parishes)} parroquias` : ''}.`
  doc.text(summary, 9, 29.2)
  doc.text(`Los eventos más recurrentes son: ${rankedText || 'sin datos reportados'}.`, 9, 33.8)
  font(doc, 'normal', FONT_SIZE.text14px, COLORS.navy)
  doc.text('Las provincias con mayor impacto a personas son:', 9, 38.5)
  font(doc, 'bold', FONT_SIZE.text14px, COLORS.orange)
  doc.text(doc.splitTextToSize(provinceRanking.join(', ') || 'Sin datos reportados', 210), 69, 38.5)
}

function raisedCard(doc, x, y, width, height) {
  doc.setFillColor(175, 180, 188)
  doc.roundedRect(x + 1.2, y + 1.4, width, height, 1.5, 1.5, 'F')
  doc.setFillColor(...COLORS.white)
  doc.setDrawColor(218, 222, 228)
  doc.setLineWidth(0.2)
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD')
  doc.setFillColor(244, 246, 249)
  doc.roundedRect(x + 0.8, y + height - 1.5, width - 1.6, 0.8, 0.4, 0.4, 'F')
}

function renderMetricCards(doc, options, assets) {
  const y = 43
  const x = 51.5
  const width = 29.2
  const gap = 0.65
  METRICS.forEach(([key, label, icon, decimal], index) => {
    const cardX = x + index * (width + gap)
    raisedCard(doc, cardX, y, width, 22.5)
    doc.addImage(assets.icons[icon], 'PNG', cardX + 1.4, y + 8.9, 7.8, 7.8)
    font(doc, 'bold', 14.5, COLORS.orange)
    doc.text(fmt(sum(options.items, key), Boolean(decimal)), cardX + width / 2, y + 8.4, { align: 'center' })
    font(doc, 'normal', FONT_SIZE.text14px, COLORS.gray)
    doc.text(label.split('\n'), cardX + 10, y + 13.8)
  })
}

function drawProvince(doc, province, x, y, width, height, fill) {
  const scaleX = width / 600
  const scaleY = height / 600
  doc.setFillColor(...fill)
  doc.setDrawColor(83, 98, 117)
  doc.setLineWidth(0.12)
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

function renderMap(doc, items) {
  const x = 10
  const y = 65
  const width = 74
  const height = 74
  const summary = buildProvinceImpactMap(items)
  ECUADOR_PROVINCES.forEach((province) => {
    const value = provinceImpactValue(summary, province.name)
    drawProvince(doc, province, x, y, width, height, impactColor(value, summary.maximum, value !== undefined).rgb)
  })
  ECUADOR_PROVINCES.forEach((province) => {
    const [labelX, labelY] = province.label
    font(doc, 'bold', province.name.includes('Santo Domingo') ? 2.2 : 2.8, [45, 56, 72])
    doc.text(shortProvinceLabel(province.name), x + labelX * width / 600, y + labelY * height / 600, { align: 'center' })
  })
  const legendX = 10
  const legendY = 139.5
  const legendWidth = 92
  const legendHeight = 10.5
  doc.setFillColor(...COLORS.white)
  doc.setDrawColor(143, 177, 216)
  doc.roundedRect(legendX, legendY, legendWidth, legendHeight, 1, 1, 'FD')
  font(doc, 'bold', 6, COLORS.navy)
  doc.text('Escala de afectación', legendX + 2.3, legendY + 3.6)
  doc.text('(Población impactada)', legendX + 2.3, legendY + 7.1)
  impactLegend().forEach((entry, index) => {
    const column = Math.floor(index / 3)
    const row = index % 3
    const rowX = legendX + 25 + column * 33
    const rowY = legendY + 1.1 + row * 3.05
    doc.setFillColor(...entry.color.rgb)
    doc.setDrawColor(213, 221, 232)
    doc.rect(rowX, rowY, 4.6, 2.35, 'FD')
    font(doc, 'normal', 5.5, COLORS.navy)
    doc.text(entry.label, rowX + 5.7, rowY + 1.8)
  })
}

function drawSector(doc, centerX, centerY, radius, start, end, color, explode = 0) {
  const middle = (start + end) / 2
  const originX = centerX + Math.cos(middle) * explode
  const originY = centerY + Math.sin(middle) * explode
  const points = []
  const steps = Math.max(3, Math.ceil((end - start) / (Math.PI / 20)))
  for (let index = 0; index <= steps; index += 1) {
    const angle = start + (end - start) * index / steps
    points.push([originX + Math.cos(angle) * radius, originY + Math.sin(angle) * radius])
  }
  const absolute = [[originX, originY], ...points]
  const vectors = absolute.slice(1).map(([x, y], index) => [x - absolute[index][0], y - absolute[index][1]])
  doc.setFillColor(...color)
  doc.setDrawColor(...COLORS.white)
  doc.setLineWidth(0.7)
  doc.lines(vectors, originX, originY, [1, 1], 'FD', true)
}

function renderEventDonut(doc, rows) {
  sectionBand(doc, 105, 70, 79, 'Cantidad de eventos adversos por lluvias', true)
  const ranked = EVENT_TYPES.map(([key, label]) => ({ label, value: sum(rows, key) }))
    .filter((item) => item.value > 0).sort((a, b) => b.value - a.value)
  const total = ranked.reduce((acc, item) => acc + item.value, 0)
  if (!total) {
    font(doc, 'normal', 8, COLORS.gray); doc.text('Sin datos reportados', 145, 108, { align: 'center' })
    return
  }
  const palette = [[42, 83, 147], [54, 101, 172], [74, 119, 187], [95, 138, 197], [119, 154, 205], [142, 171, 214], [164, 187, 223], [186, 202, 231]]
  const slices = []
  let angle = -Math.PI / 2
  ranked.forEach((item) => {
    const end = angle + item.value / total * Math.PI * 2
    slices.push({ ...item, start: angle, end, middle: (angle + end) / 2 })
    angle = end
  })
  const centerX = 145
  const centerY = 112
  const radius = 20.5
  doc.setFillColor(69, 83, 109); doc.circle(centerX + 0.9, centerY + 1.5, radius + 0.3, 'F')
  slices.forEach((slice, index) => {
    drawSector(doc, centerX, centerY, radius, slice.start, slice.end, palette[index % palette.length], index < 3 ? 1.05 : 0)
  })
  doc.setFillColor(...COLORS.white); doc.circle(centerX, centerY, 9.4, 'F')
  font(doc, 'bold', 13.5, COLORS.black); doc.text(fmt(total), centerX, centerY - 1.2, { align: 'center' })
  font(doc, 'bold', 8.7, COLORS.navy); doc.text(['eventos', 'adversos'], centerX, centerY + 3.1, { align: 'center' })

  slices.slice(0, 2).forEach((slice) => {
    const labelRadius = 15.2
    const labelX = centerX + Math.cos(slice.middle) * labelRadius
    const labelY = centerY + Math.sin(slice.middle) * labelRadius - 1.2
    font(doc, 'bold', 7.2, COLORS.white)
    doc.text([slice.label, fmt(slice.value)], labelX, labelY, { align: 'center' })
  })
  const smallSlices = slices.slice(2, 8)
  const leftCount = Math.ceil(smallSlices.length / 2)
  smallSlices.forEach((slice, index) => {
    const anchorX = centerX + Math.cos(slice.middle) * (radius - 0.8)
    const anchorY = centerY + Math.sin(slice.middle) * (radius - 0.8)
    const isLeft = index < leftCount
    const sideIndex = isLeft ? index : index - leftCount
    const targetX = isLeft ? 106 : 183
    const elbowX = isLeft ? 119 : 171
    const targetY = 81 + sideIndex * 9.2
    doc.setDrawColor(...COLORS.navy); doc.setLineWidth(0.28)
    doc.line(anchorX, anchorY, elbowX, targetY + 0.5)
    doc.line(elbowX, targetY + 0.5, targetX, targetY + 0.5)
    font(doc, 'bold', 6, COLORS.blue)
    const labelLines = [...doc.splitTextToSize(slice.label, 12.5), fmt(slice.value)]
    doc.text(labelLines, targetX, targetY, { align: isLeft ? 'left' : 'right' })
  })
}

function renderProvinceTable(doc, items) {
  sectionBand(doc, 190, 70, 100, 'Detalle de afectaciones a nivel provincial', true)
  const rows = items.map((row) => ({
    province: String(row?.Provincia || '').replace(/Santo Domingo de (los|Los) Ts[aá]chilas/i, 'Santo Domingo'),
    deceased: n(row?.Fallecidos),
    impacted: n(row?.ImpactadasPersonas),
    affectedHomes: n(row?.AfectadosViviendas),
    destroyedHomes: n(row?.DestruidosViviendas),
    roads: n(row?.AfectadosKilometros),
  })).filter((row) => row.province).sort((a, b) => b.impacted - a.impacted)
  const body = rows.map((row) => [row.province, fmt(row.deceased), fmt(row.impacted), fmt(row.affectedHomes), fmt(row.destroyedHomes), fmt(row.roads, true)])
  body.push(['Total', fmt(rows.reduce((a, x) => a + x.deceased, 0)), fmt(rows.reduce((a, x) => a + x.impacted, 0)), fmt(rows.reduce((a, x) => a + x.affectedHomes, 0)), fmt(rows.reduce((a, x) => a + x.destroyedHomes, 0)), fmt(rows.reduce((a, x) => a + x.roads, 0), true)])
  const maximum = Math.max(1, ...rows.map((row) => row.impacted))
  autoTable(doc, {
    startY: 77,
    margin: { left: 190, right: 7 },
    tableWidth: 100,
    head: [['Provincia', 'Personas\nfallecidas', 'Personas\nimpactadas', 'Viviendas\nafectadas', 'Viviendas\ndestruidas', 'Km vías\nafectadas']],
    body,
    theme: 'plain',
    styles: { font: 'BarlowCondensed', fontSize: 6.6, cellPadding: 0.08, halign: 'center', minCellHeight: 2.55 },
    headStyles: { fillColor: COLORS.white, textColor: COLORS.navy, fontStyle: 'bold', fontSize: 6.3, lineWidth: 0 },
    alternateRowStyles: { fillColor: COLORS.lightOrange },
    columnStyles: { 0: { halign: 'left', cellWidth: 22 }, 1: { cellWidth: 11 }, 2: { cellWidth: 16.75 }, 3: { cellWidth: 16.75 }, 4: { cellWidth: 16.75 }, 5: { cellWidth: 16.75 } },
    didParseCell: ({ cell, row, column, section }) => {
      if (section !== 'body') return
      if (row.index === body.length - 1) {
        cell.styles.fillColor = COLORS.blue; cell.styles.textColor = COLORS.white; cell.styles.fontStyle = 'bold'
      } else if (column.index === 2) {
        const ratio = rows[row.index].impacted / maximum
        cell.styles.fillColor = ratio > 0.5 ? [245, 183, 64] : ratio > 0.1 ? [252, 216, 134] : [255, 242, 215]
      }
    },
  })
}

function renderProvinceChart(doc, items) {
  sectionBand(doc, 7, 152, 119, 'Número de eventos vs Personas Impactadas por provincia', true)
  const rows = items.map((row) => ({ label: String(row?.Provincia || ''), events: n(row?.NumeroEventos), people: n(row?.ImpactadasPersonas) }))
    .filter((row) => row.label && (row.events || row.people)).sort((a, b) => b.people - a.people || b.events - a.events)
  if (!rows.length) return
  const x = 11; const y = 161; const width = 111; const height = 17
  const maxPeople = Math.max(1, ...rows.map((row) => row.people)); const maxEvents = Math.max(1, ...rows.map((row) => row.events))
  for (let index = 0; index <= 4; index += 1) {
    const gy = y + height - index * height / 4
    doc.setDrawColor(224, 228, 233); doc.setLineWidth(0.1); doc.line(x, gy, x + width, gy)
    font(doc, 'normal', 3.2, COLORS.gray)
    doc.text(fmt(Math.round(maxPeople * index / 4)), x - 1.2, gy + 0.8, { align: 'right' })
    doc.text(fmt(Math.round(maxEvents * index / 4)), x + width + 1.2, gy + 0.8)
  }
  const slot = width / rows.length
  const barWidth = Math.max(1, slot * 0.5)
  const bars = rows.map((row, index) => {
    const barX = x + index * slot + (slot - barWidth) / 2
    const barHeight = row.people / maxPeople * height
    return { x: barX, width: barWidth, height: barHeight, top: y + height - barHeight }
  })
  const centers = bars.map((bar) => bar.x + bar.width / 2)
  const points = centers.map((centerX, index) => [centerX, y + height - rows[index].events / maxEvents * height])
  const valueLabel = (text, centerX, top, fillColor) => {
    font(doc, 'normal', 3.25, COLORS.gray)
    const labelWidth = Math.max(4, doc.getTextWidth(text) + 1)
    doc.setFillColor(...fillColor)
    doc.rect(centerX - labelWidth / 2, top, labelWidth, 2.8, 'F')
    doc.text(text, centerX, top + 1.95, { align: 'center' })
  }
  font(doc, 'normal', 3.2, COLORS.gray)
  const maxProvinceLabelWidth = Math.max(...rows.map((row) => doc.getTextWidth(row.label.toUpperCase())))
  const labelAngle = 65
  const labelRadians = labelAngle * Math.PI / 180
  const peopleLabels = []
  rows.forEach((row, index) => {
    const bar = bars[index]
    const centerX = centers[index]
    doc.setFillColor(69, 114, 190); doc.rect(bar.x, bar.top, bar.width, bar.height, 'F')
    if (row.people) peopleLabels.push({
      text: fmt(row.people), centerX,
      top: Math.min(y + height - 3, Math.max(y + 3.1, bar.top + 0.45)),
    })
    const provinceLabel = row.label.toUpperCase()
    const labelAnchorY = y + height + 2
    const labelWidth = doc.getTextWidth(provinceLabel)
    const rightAlignedX = centerX + labelWidth * (1 - Math.cos(labelRadians))
    const rightAlignedY = labelAnchorY + labelWidth * Math.sin(labelRadians)
    doc.text(provinceLabel, rightAlignedX, rightAlignedY, { angle: labelAngle, align: 'right' })
  })
  doc.setDrawColor(...COLORS.orange); doc.setLineWidth(0.65)
  for (let index = 1; index < points.length; index += 1) doc.line(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1])
  points.forEach(([px, py]) => { doc.setFillColor(...COLORS.orange); doc.circle(px, py, 0.55, 'F') })
  peopleLabels.forEach((label) => valueLabel(label.text, label.centerX, label.top, [218, 227, 244]))
  points.forEach(([px, py], index) => {
    if (rows[index].events) valueLabel(fmt(rows[index].events), px, Math.max(y + 0.2, py - 3.4), COLORS.lightOrange)
  })
  const labelDepth = maxProvinceLabelWidth * Math.sin(labelRadians)
  const legendY = Math.min(194.2, y + height + Math.max(12, labelDepth + 3.2))
  const legendX = x + width / 2 - 28
  doc.setFillColor(69, 114, 190); doc.rect(legendX, legendY - 1.8, 4.5, 2.1, 'F')
  font(doc, 'normal', 4.2, COLORS.gray); doc.text('Personas Impactadas', legendX + 5.5, legendY)
  doc.setDrawColor(...COLORS.orange); doc.setLineWidth(0.6); doc.line(legendX + 34, legendY - 0.9, legendX + 39, legendY - 0.9)
  doc.setFillColor(...COLORS.orange); doc.circle(legendX + 36.5, legendY - 0.9, 0.55, 'F')
  doc.text('Nro. de eventos', legendX + 40, legendY)
}

function renderHydrometeorology(doc, data) {
  sectionBand(doc, 129, 152, 161, 'Situación meteorológica', true)
  if (!data) {
    font(doc, 'normal', FONT_SIZE.text14px, COLORS.gray); doc.text('No se adjuntó boletín hidrometeorológico.', 132, 165)
    return
  }
  const image = data.mapImage || data.images?.[0] || data.tableImage
  const textWidth = image ? 125 : 154
  font(doc, 'normal', 8.2, COLORS.black)
  const lines = doc.splitTextToSize(String(data.text || data.label || 'Boletín procesado.'), textWidth).slice(0, 11)
  doc.text(lines, 132, 163)
  if (image) {
    const properties = doc.getImageProperties(image)
    const box = { x: 259, y: 160, width: 28, height: 33 }
    const scale = Math.min(box.width / properties.width, box.height / properties.height)
    const width = properties.width * scale
    const height = properties.height * scale
    doc.addImage(image, properties.fileType || 'PNG', box.x + (box.width - width) / 2, box.y, width, height)
  }
}

function numericSeries(items) {
  const excluded = new Set(['ProvinciaID', 'Provincia', 'Provincias', 'Familias Beneficiadas', 'Personas Beneficiadas', 'Total Bienes'])
  const totals = new Map()
  items.forEach((row) => Object.entries(row || {}).forEach(([key, value]) => {
    if (excluded.has(key)) return
    const number = n(value)
    if (number > 0) totals.set(key, (totals.get(key) || 0) + number)
  }))
  return [...totals.entries()].map(([label, value]) => ({ label: label.replaceAll('_', ' '), value })).sort((a, b) => b.value - a.value).slice(0, 12)
}

function renderAssistanceChart(doc, x, y, width, height, items, color) {
  const rows = numericSeries(items)
  if (!rows.length) {
    font(doc, 'normal', 6.5, COLORS.gray); doc.text('Sin desglose de bienes reportado.', x + width / 2, y + height / 2, { align: 'center' })
    return
  }
  const maximum = Math.max(...rows.map((row) => row.value), 1)
  const slot = width / rows.length
  rows.forEach((row, index) => {
    const barHeight = row.value / maximum * height
    const center = x + slot * index + slot / 2
    doc.setFillColor(...color); doc.rect(center - slot * 0.28, y + height - barHeight, slot * 0.56, barHeight, 'F')
    font(doc, 'normal', 4.1, COLORS.gray); doc.text(fmt(row.value), center, y + height - barHeight - 1, { align: 'center' })
    doc.text(doc.splitTextToSize(row.label, 15), center + 1, y + height + 2, { angle: 70, align: 'right' })
  })
}

function renderAssistance(doc, options) {
  sectionBand(doc, 6, 26, 195, 'Asistencia Humanitaria')
  const sngrTotal = sum(options.asistenciaItems, 'Total Bienes')
  const systemTotal = sum(options.asistenciaSNDGIRDItems, 'Total Bienes')
  font(doc, 'bold', 9.5, COLORS.black)
  doc.text(doc.splitTextToSize(`Por eventos producidos por lluvias desde el ${metadata(options).startText}, la SNGR y el SNDGIRD han entregado asistencia humanitaria a la población afectada.`, 140), 10, 41)
  const cards = [
    [12, sngrTotal, 'TOTAL DE BIENES DE ASISTENCIA\nHUMANITARIA ENTREGADO - SNGR'],
    [90, systemTotal, 'TOTAL DE BIENES DE ASISTENCIA\nHUMANITARIA ENTREGADO - SNDGIRD'],
  ]
  cards.forEach(([x, value, label]) => {
    font(doc, 'bold', 24, COLORS.orange); doc.text(fmt(value), x + 22, 68)
    font(doc, 'bold', 9, COLORS.navy); doc.text(label.split('\n'), x, 79)
  })
  font(doc, 'bold', 8.2, COLORS.black); doc.text(`La SNGR ha entregado un total de ${fmt(sngrTotal)} bienes:`, 10, 94)
  renderAssistanceChart(doc, 10, 99, 137, 23, options.asistenciaItems, COLORS.orange)
  font(doc, 'bold', 8.2, COLORS.black); doc.text(`Las instituciones del SNDGIRD han entregado un total de ${fmt(systemTotal)} bienes:`, 10, 145)
  renderAssistanceChart(doc, 10, 150, 137, 23, options.asistenciaSNDGIRDItems, [85, 154, 211])
}

function joinedPlaces(rows, keys) {
  return rows.map((row) => keys.map((key) => row?.[key]).filter(Boolean).join(' - ')).filter(Boolean).join(', ')
}

function renderCoeAndDeclarations(doc, options) {
  const x = 205; const width = 86
  const national = uniqueActiveCoeRows(options.nationalCoeItems, ['TipoCOE'])
  const provincial = uniqueActiveCoeRows(options.provincialCoeItems, ['Provincia'])
  const municipal = buildMunicipalCoeSummary(options.municipalCoeItems)
  const parish = uniqueActiveCoeRows(options.parishCoeItems, ['Provincia', 'Canton', 'Parroquia'])
  sectionBand(doc, x, 26, width, 'COE ACTIVADOS')
  const counts = [
    [national.length, 'COE\nNacional'], [provincial.length, 'COE Provinciales'],
    [municipal.totalActive, 'COE Cantonales'], [parish.length, 'COE Parroquiales'],
  ]
  counts.forEach(([value, label], index) => {
    const cx = x + 7 + (index % 2) * 39
    const cy = 44 + Math.floor(index / 2) * 23
    font(doc, 'bold', 22, COLORS.black); doc.text(fmt(value), cx, cy + 7)
    font(doc, 'bold', 7.7, COLORS.navy); doc.text(label.split('\n'), cx + 13, cy + 2)
  })
  font(doc, 'normal', 4.8, COLORS.black)
  const provinceText = joinedPlaces(provincial, ['Provincia'])
  doc.text(doc.splitTextToSize(provinceText || 'Sin COE provinciales activos.', width - 5), x + 2.5, 86)
  const municipalText = joinedPlaces(uniqueActiveCoeRows(options.municipalCoeItems, ['Provincia', 'Canton']), ['Canton', 'Provincia'])
  doc.text(doc.splitTextToSize(municipalText || 'Sin COE cantonales activos.', width - 5).slice(0, 10), x + 2.5, 99)

  sectionBand(doc, x, 121, width, 'DECLARATORIAS DE ALERTAS Y EMERGENCIAS')
  const alertRows = options.alertDeclarations || []
  const emergencyRows = options.emergencyDeclarations || []
  const alertCount = alertRows.length
  const emergencyCount = emergencyRows.length
  const cantonalAlerts = alertRows.filter((row) => String(row?.Ambito || '').toLowerCase().includes('cant'))
  const blocks = [
    [alertCount, 'Declaratorias de alerta:', alertRows[0]?.Observacion || joinedPlaces(alertRows, ['NivelAlerta', 'Provincia', 'Canton'])],
    [emergencyCount, 'Declaratorias de emergencia:', emergencyRows[0]?.Observacion || joinedPlaces(emergencyRows, ['Provincia', 'Canton'])],
    [cantonalAlerts.length, 'Alertas cantonales:', joinedPlaces(cantonalAlerts, ['Provincia', 'Canton', 'NivelAlerta'])],
  ]
  blocks.forEach(([value, title, detail], index) => {
    const top = 133 + index * 20.5
    font(doc, 'bold', 20, COLORS.black); doc.text(fmt(value), x + 2, top + 8)
    doc.setFillColor(...COLORS.pale); doc.rect(x + 14, top, width - 14, 17.5, 'F')
    font(doc, 'bold', 8.3, COLORS.red); doc.text(title, x + 16, top + 5)
    font(doc, 'normal', 5.2, COLORS.black)
    doc.text(doc.splitTextToSize(String(detail || 'Sin detalle reportado.'), width - 19).slice(0, 4), x + 16, top + 9.2)
  })
}

export async function buildInfographicPdf(options = {}) {
  const normalized = {
    items: [], tipoLluviasItems: [], asistenciaItems: [], asistenciaSNDGIRDItems: [], dpaTotals: null,
    nationalCoeItems: [], provincialCoeItems: [], municipalCoeItems: [], parishCoeItems: [],
    alertDeclarations: [], emergencyDeclarations: [], ...options,
  }
  const assets = await loadAssets(normalized.assetBaseUrl, normalized.logoUrl)
  const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true })
  registerFonts(doc, assets)
  const meta = metadata(normalized)
  renderNarrative(doc, normalized, meta)
  renderMetricCards(doc, normalized, assets)
  renderMap(doc, normalized.items)
  renderEventDonut(doc, normalized.tipoLluviasItems)
  renderProvinceTable(doc, normalized.items)
  renderProvinceChart(doc, normalized.items)
  renderHydrometeorology(doc, normalized.hydrometeorology)
  doc.addPage('a4', 'landscape')
  renderAssistance(doc, normalized)
  renderCoeAndDeclarations(doc, normalized)
  decorate(doc, assets, meta)
  return doc
}

export async function exportInfographicPdf(options = {}) {
  const doc = await buildInfographicPdf(options)
  const suffix = options?.provinciaId ? `provincia_${options.provinciaId}` : 'nacional'
  doc.save(`infografia_sitrep_lluvias_${suffix}.pdf`)
}
