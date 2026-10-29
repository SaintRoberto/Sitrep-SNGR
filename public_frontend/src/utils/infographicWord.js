import {
  AlignmentType, BorderStyle, Document, Footer, HeightRule, ImageRun, Packer, PageBreak, Paragraph,
  ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx'
import { ShapeGroupRun, ShapeRun } from 'docx/shapes'
import { buildMunicipalCoeSummary, uniqueActiveCoeRows } from './coeConfig.js'
import { buildProvinceImpactMap, ECUADOR_PROVINCES, impactColor, impactLegend, provinceImpactValue, provincePathData, shortProvinceLabel } from './impactMap.js'

const C = { navy: '1F3C69', dark: '092A5B', blue: '3167B0', pale: 'DDE6F4', orange: 'F17121', red: 'EC1822', gray: '6C7582', white: 'FFFFFF', black: '141920', line: 'CDD6E2' }
const NONE = Object.fromEntries(['top', 'bottom', 'left', 'right', 'insideHorizontal', 'insideVertical'].map((side) => [side, { style: BorderStyle.NONE, size: 0, color: C.white }]))
const EVENTS = [['Inundacion', 'Inundación'], ['Deslizamiento', 'Deslizamiento'], ['Lluvias_Intensas', 'Lluvias intensas'], ['Erosion_Hidrica', 'Erosión hídrica'], ['Hundimiento', 'Hundimiento'], ['Aluvion', 'Aluvión'], ['Vendaval', 'Vendaval'], ['Caidas_Colapso', 'Caídas'], ['Tormenta_Electrica', 'Tormenta eléctrica'], ['Granizada', 'Granizada']]
const LOGO_URL = new URL('../assets/LOGOECUADOR.png', import.meta.url).href
const ASSISTANCE_LOGO_URL = new URL('../assets/asistenciaLogo.png', import.meta.url).href
const ICONS = {
  AfectadosPersonas: '04 personas afectadas.png', DamnificadosPersonas: '06 personas damnificadas.png', Fallecidos: '01 persona fallecida.png',
  AfectadosViviendas: 'vivienda afectada.png', DestruidosViviendas: 'vivienda destruida.png', AfectadosPuentes: 'puente afectado.png',
  DestruidosPuentes: 'puente destruido.png', AfectadosKilometros: 'metros vias afectados.png',
  shelter: 'alojamientos temporales_mtt4.png', families: 'total familias.png', shelteredPeople: 'total personas.png',
}

function n(value) { const number = Number(String(value ?? 0).replace(',', '.')); return Number.isFinite(number) ? number : 0 }
function sum(rows, key) { return (rows || []).reduce((total, row) => total + n(row?.[key]), 0) }
function fmt(value, decimals = false) { return n(value).toLocaleString('es-EC', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 }) }
function localDate(value) { const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(String(value || '')); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : new Date() }
function dateText(value, time = false) { return localDate(value).toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}) }) }
function run(value, { bold = false, color = C.black, size = 15, italics = false } = {}) { return new TextRun({ text: String(value ?? ''), bold, color, size, italics, font: 'Barlow Condensed' }) }
function p(children, { align = AlignmentType.LEFT, before = 0, after = 20 } = {}) { return new Paragraph({ alignment: align, spacing: { before, after, line: 190 }, children: Array.isArray(children) ? children : [run(children)] }) }
function cell(children, { width, fill, margin = 45, borders = NONE, verticalAlign = VerticalAlign.CENTER } = {}) { return new TableCell({ width: { size: width, type: WidthType.DXA }, shading: fill ? { fill, type: ShadingType.CLEAR } : undefined, borders, verticalAlign, margins: { top: margin, bottom: margin, left: margin, right: margin }, children: Array.isArray(children) ? children : [children] }) }
function table(rows, widths) { return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: NONE, rows: rows.map((cells) => new TableRow({ children: cells })) }) }
function fixedRowTable(cells, widths, height) { return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: NONE, rows: [new TableRow({ height: { value: height, rule: HeightRule.EXACT }, children: cells })] }) }
function minRowTable(cells, widths, height) { return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, layout: TableLayoutType.FIXED, borders: NONE, rows: [new TableRow({ height: { value: height, rule: HeightRule.ATLEAST }, children: cells })] }) }
function band(title) { return p([run(title, { bold: true, color: C.white, size: 16 })], { align: AlignmentType.CENTER, after: 0 }) }
function image(data, width, height) { return p([new ImageRun({ data, type: 'png', transformation: { width, height } })], { align: AlignmentType.CENTER, after: 0 }) }
async function imageData(url) { const response = await fetch(url); if (!response.ok) throw new Error(`No se pudo cargar el recurso Word: ${url}`); return new Uint8Array(await response.arrayBuffer()) }
async function loadAssets() {
  const base = import.meta.env?.BASE_URL || '/'
  const entries = await Promise.all(Object.entries(ICONS).map(async ([key, file]) => [key, await imageData(`${base.endsWith('/') ? base : `${base}/`}assets/iconos%20SITREP/${encodeURIComponent(file)}`)]))
  return { logo: await imageData(LOGO_URL), assistanceLogo: await imageData(ASSISTANCE_LOGO_URL), icons: Object.fromEntries(entries) }
}

async function canvasPng(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height); await draw(context, canvas)
  const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo generar una gráfica para Word.')), 'image/png'))
  return new Uint8Array(await blob.arrayBuffer())
}
function chartFont(context, size, bold = false, color = '#475569') { context.font = `${bold ? '700' : '400'} ${size}px "Arial Narrow", Arial, sans-serif`; context.fillStyle = color }
async function generateFooterLandscape() {
  return canvasPng(1000, 105, (ctx) => {
    const main = [[10, 79], [42, 77], [58, 48], [91, 31], [130, 37], [166, 69], [220, 76], [270, 76], [304, 64], [332, 76], [405, 78], [447, 72], [492, 80], [548, 80], [567, 43], [603, 40], [641, 79], [728, 79], [770, 72], [825, 78], [875, 66], [956, 69]]
    const details = [[[34, 77], [41, 49], [58, 34], [79, 42]], [[214, 76], [234, 50], [252, 52], [267, 75]], [[548, 44], [568, 25], [591, 31], [612, 55]], [[828, 77], [843, 34], [870, 16], [897, 29], [909, 67]], [[870, 16], [878, 4], [897, 0], [917, 8], [927, 21]]]
    ctx.strokeStyle = '#4b4b4b'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.lineCap = 'round'
    ;[main, ...details].forEach((points) => { ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke() })
  })
}
function infographicFooter(landscape) {
  const topBorder = { ...NONE, top: { style: BorderStyle.SINGLE, size: 14, color: 'C45110' } }
  const footerCell = (children, width) => cell(children, { width, margin: 30, borders: topBorder, verticalAlign: VerticalAlign.TOP })
  const footerParagraph = (children, after = 0) => new Paragraph({ spacing: { after, line: 140 }, children })
  return new Footer({ children: [table([[
    footerCell([footerParagraph([run('Producto elaborado por:', { bold: true, color: C.navy, size: 15 })], 8), footerParagraph([run('Dirección de Monitoreo de Eventos Adversos', { bold: true, color: C.navy, size: 15 })])], 3500),
    footerCell([footerParagraph([run('Para acceder a todos los informes de situación e infografías generadas por la SNGR visite', { color: C.navy, size: 11 })], 2), footerParagraph([run('el siguiente enlace:', { color: C.navy, size: 11 })], 2), footerParagraph([run('https://www.gestionderiesgos.gob.ec/informes-de-situacion-actual-por-eventos-adversos-ecuador/', { color: C.blue, size: 10 })])], 6500),
    footerCell([image(landscape, 390, 28)], 6000),
  ]], [3500, 6500, 6000])] })
}
async function generateImpactMap(items) {
  return canvasPng(1600, 1080, (ctx) => {
    const summary = buildProvinceImpactMap(items); const scale = 2.1; const offsetX = 30; const offsetY = -80
    ctx.save(); ctx.translate(offsetX, offsetY); ctx.scale(scale, scale); ctx.lineJoin = 'round'
    ECUADOR_PROVINCES.forEach((province) => { const value = provinceImpactValue(summary, province.name); ctx.fillStyle = impactColor(value, summary.maximum, value !== undefined).hex; ctx.strokeStyle = '#536275'; ctx.lineWidth = 0.75; const path = new Path2D(provincePathData(province)); ctx.fill(path, 'evenodd'); ctx.stroke(path) })
    ECUADOR_PROVINCES.forEach((province) => { const [x, y] = province.label; chartFont(ctx, province.name.includes('Santo Domingo') ? 6 : 7.3, true, '#263448'); ctx.textAlign = 'center'; ctx.fillText(shortProvinceLabel(province.name), x, y) })
    ctx.restore()
    const legendX = 1080; const legendY = 740; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8fb1d8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(legendX, legendY, 390, 310, 14); ctx.fill(); ctx.stroke(); chartFont(ctx, 25, true, '#1f3c69'); ctx.textAlign = 'left'; ctx.fillText('Escala de afectación', legendX + 24, legendY + 38); chartFont(ctx, 20, true, '#1f3c69'); ctx.fillText('(Población impactada)', legendX + 24, legendY + 67)
    impactLegend().forEach((entry, index) => { const y = legendY + 88 + index * 35; ctx.fillStyle = entry.color.hex; ctx.fillRect(legendX + 24, y, 54, 24); ctx.strokeStyle = '#d5dde8'; ctx.strokeRect(legendX + 24, y, 54, 24); chartFont(ctx, 17, false, '#1f3c69'); ctx.fillText(entry.label, legendX + 92, y + 18) })
  })
}
async function generateEventDonut(rows) {
  return canvasPng(1400, 1150, (ctx) => {
    const ranked = EVENTS.map(([key, label]) => ({ label, value: sum(rows, key) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value); const total = ranked.reduce((a, b) => a + b.value, 0)
    if (!total) { chartFont(ctx, 34, false); ctx.textAlign = 'center'; ctx.fillText('Sin datos reportados', 700, 575); return }
    const colors = ['#2a5393', '#3665ac', '#4a77bb', '#5f8ac5', '#779acd', '#8eabd6', '#a4bbdf', '#bacae7']; let angle = -Math.PI / 2; const cx = 720; const cy = 700; const radius = 360; const slices = []
    ctx.save(); ctx.shadowColor = 'rgba(30, 45, 70, 0.55)'; ctx.shadowBlur = 4; ctx.fillStyle = '#45536d'; ctx.beginPath(); ctx.arc(cx + 16, cy + 24, radius + 3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    ranked.forEach((item, index) => { const end = angle + item.value / total * Math.PI * 2; const middle = (angle + end) / 2; const explode = index < 2 ? 12 : 0; const ox = Math.cos(middle) * explode; const oy = Math.sin(middle) * explode; slices.push({ ...item, index, start: angle, end, middle, ox, oy }); ctx.beginPath(); ctx.moveTo(cx + ox, cy + oy); ctx.arc(cx + ox, cy + oy, radius, angle, end); ctx.closePath(); ctx.fillStyle = colors[index % colors.length]; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 10; ctx.stroke(); angle = end })
    slices.slice(0, 2).forEach((slice) => { const x = cx + slice.ox + Math.cos(slice.middle) * 245; const y = cy + slice.oy + Math.sin(slice.middle) * 245; chartFont(ctx, 30, true, '#fff'); ctx.textAlign = 'center'; ctx.fillText(slice.label, x, y - 7); ctx.fillText(fmt(slice.value), x, y + 30) })
    const small = slices.slice(2, 10).map((slice) => ({ ...slice, edgeX: cx + Math.cos(slice.middle) * radius, edgeY: cy + Math.sin(slice.middle) * radius, outerX: cx + Math.cos(slice.middle) * (radius + 28), outerY: cy + Math.sin(slice.middle) * (radius + 28) })).sort((a, b) => a.edgeX - b.edgeX)
    small.forEach((slice, index) => {
      const targetX = 90 + index * 1220 / Math.max(1, small.length - 1); const middle = (small.length - 1) / 2; const labelY = 48 + Math.abs(index - middle) * 28
      const words = slice.label.split(/\s+/); const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [slice.label]
      const connectorY = labelY + lines.length * 38 + 25; ctx.strokeStyle = '#315f9e'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(slice.edgeX, slice.edgeY); ctx.lineTo(slice.outerX, slice.outerY); ctx.lineTo(targetX, connectorY); ctx.stroke()
      chartFont(ctx, 36, true, '#265499'); ctx.textAlign = 'center'; lines.forEach((line, lineIndex) => ctx.fillText(line, targetX, labelY + lineIndex * 38)); chartFont(ctx, 32, true, '#265499'); ctx.fillText(fmt(slice.value), targetX, labelY + lines.length * 38)
    })
    ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); chartFont(ctx, 56, true, '#141920'); ctx.textAlign = 'center'; ctx.fillText(fmt(total), cx, cy - 15); chartFont(ctx, 31, true, '#1f3c69'); ctx.fillText('eventos', cx, cy + 30); ctx.fillText('adversos', cx, cy + 68)
  })
}
async function generateProvinceChart(items) {
  return canvasPng(2000, 720, (ctx) => {
    const rows = items.map((row) => ({ label: String(row?.Provincia || ''), people: n(row?.ImpactadasPersonas), events: n(row?.NumeroEventos) })).filter((row) => row.label && (row.people || row.events)).sort((a, b) => b.people - a.people || b.events - a.events); if (!rows.length) return
    const box = { x: 125, y: 38, width: 1750, height: 390 }; const maxPeople = Math.max(1, ...rows.map((row) => row.people)); const maxEvents = Math.max(1, ...rows.map((row) => row.events)); const slot = box.width / rows.length
    for (let i = 0; i <= 4; i += 1) {
      const y = box.y + box.height - i * box.height / 4
      ctx.strokeStyle = '#d9e1eb'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.width, y); ctx.stroke()
      chartFont(ctx, 20, false, '#617083'); ctx.textAlign = 'right'; ctx.fillText(fmt(Math.round(maxPeople * i / 4)), box.x - 18, y + 7)
      ctx.textAlign = 'left'; ctx.fillText(fmt(Math.round(maxEvents * i / 4)), box.x + box.width + 18, y + 7)
    }
    const points = []
    rows.forEach((row, index) => {
      const center = box.x + slot * (index + 0.5); const h = row.people / maxPeople * box.height; const top = box.y + box.height - h; const barWidth = Math.max(17, slot * 0.47)
      ctx.fillStyle = '#4778c4'; ctx.fillRect(center - barWidth / 2, top, barWidth, h)
      const peopleLabel = fmt(row.people); chartFont(ctx, 17, true, '#45628d'); const peopleWidth = Math.max(barWidth + 3, ctx.measureText(peopleLabel).width + 12); const peopleY = Math.min(box.y + box.height - 6, Math.max(box.y + 25, top + 25))
      ctx.fillStyle = '#e7edf7'; ctx.fillRect(center - peopleWidth / 2, peopleY - 20, peopleWidth, 27); chartFont(ctx, 17, true, '#45628d'); ctx.textAlign = 'center'; ctx.fillText(peopleLabel, center, peopleY)
      points.push([center, box.y + box.height - row.events / maxEvents * box.height])
      ctx.save(); ctx.translate(center + 5, box.y + box.height + 28); ctx.rotate(-Math.PI / 3); chartFont(ctx, 17, true, '#536176'); ctx.textAlign = 'right'; ctx.fillText(row.label.toUpperCase(), 0, 0); ctx.restore()
    })
    ctx.strokeStyle = '#f26b1d'; ctx.lineWidth = 8; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath(); points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke()
    points.forEach(([x, y], index) => {
      ctx.fillStyle = '#f26b1d'; ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill()
      const eventLabel = fmt(rows[index].events); chartFont(ctx, 19, true, '#9a4b22'); const labelWidth = Math.max(48, ctx.measureText(eventLabel).width + 18); const labelY = Math.max(box.y + 25, y - 24)
      ctx.fillStyle = '#fbe9dd'; ctx.fillRect(x - labelWidth / 2, labelY - 22, labelWidth, 30); chartFont(ctx, 19, true, '#9a4b22'); ctx.textAlign = 'center'; ctx.fillText(eventLabel, x, labelY)
    })
    ctx.fillStyle = '#4778c4'; ctx.fillRect(610, 670, 54, 25); chartFont(ctx, 23, false, '#536176'); ctx.textAlign = 'left'; ctx.fillText('Personas impactadas', 684, 691)
    ctx.strokeStyle = '#f26b1d'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(1160, 682); ctx.lineTo(1220, 682); ctx.stroke(); ctx.fillStyle = '#f26b1d'; ctx.beginPath(); ctx.arc(1190, 682, 8, 0, Math.PI * 2); ctx.fill(); chartFont(ctx, 23, false, '#536176'); ctx.fillText('Nro. de eventos', 1240, 691)
  })
}
function assistanceSeries(items) { const excluded = new Set(['ProvinciaID', 'Provincia', 'Provincias', 'Familias Beneficiadas', 'Personas Beneficiadas', 'Total Bienes']); const totals = new Map(); items.forEach((row) => Object.entries(row || {}).forEach(([key, value]) => { if (!excluded.has(key) && n(value) > 0) totals.set(key, (totals.get(key) || 0) + n(value)) })); return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12) }
async function generateAssistanceChart(items, color) {
  return canvasPng(1800, 560, (ctx) => { const rows = assistanceSeries(items); if (!rows.length) { chartFont(ctx, 30); ctx.textAlign = 'center'; ctx.fillText('Sin desglose de bienes reportado.', 900, 280); return } const max = Math.max(...rows.map((row) => row[1]), 1); const baseY = 400; const slot = 1650 / rows.length; rows.forEach(([label, value], index) => { const center = 90 + slot * (index + 0.5); const height = value / max * 320; ctx.fillStyle = color; ctx.fillRect(center - slot * 0.3, baseY - height, slot * 0.6, height); chartFont(ctx, 20); ctx.textAlign = 'center'; ctx.fillText(fmt(value), center, baseY - height - 12); ctx.save(); ctx.translate(center + 5, baseY + 20); ctx.rotate(-Math.PI / 3); chartFont(ctx, 17); ctx.textAlign = 'right'; ctx.fillText(label.replaceAll('_', ' '), 0, 0); ctx.restore() }) })
}

function header(options, page, assets) {
  const ref = options.sitrepNumber ? `Referencia SITREP No. ${options.sitrepNumber}` : 'Referencia SITREP'
  const heading = new ShapeRun({ type: 'roundedRectangle', transformation: { width: 790, height: 70 }, fill: C.navy, line: 'none', adjustments: { cornerRadius: 10 }, textOptions: { verticalAlignment: 'center', margins: { top: 5, right: 18, bottom: 5, left: 18 } }, children: [
    new Paragraph({ spacing: { after: 2 }, children: [new TextRun({ text: 'AFECTACIONES POR LLUVIAS CON INCIDENCIA DEL EVENTO EL NIÑO EN EL ECUADOR', bold: true, italics: true, color: C.white, size: 32, font: 'Barlow Condensed' })] }),
    new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: `Inicio ${dateText(options.startDate)} al ${dateText(options.endDate, true)} ${ref}`, bold: true, italics: true, color: C.white, size: 23, font: 'Barlow Condensed' })] }),
  ] })
  return table([[cell([p([heading], { after: 0 })], { width: 12500, margin: 20 }), cell([image(assets.logo, 205, 35), p([run(`Página ${page} de 2`, { bold: true, color: C.navy, size: 13 })], { align: AlignmentType.RIGHT, after: 0 })], { width: 3500 })]], [12500, 3500])
}
function section(title, content, width) { return cell([table([[cell([band(title)], { width, fill: C.dark, margin: 40 })]], [width]), ...content], { width, margin: 20, verticalAlign: VerticalAlign.TOP }) }

function narrative(options) {
  const total = sum(options.tipoLluviasItems, 'NumeroEventos') || sum(options.items, 'NumeroEventos'); const provinces = n(options.dpaTotals?.TotalProvincias) || new Set(options.items.map((row) => row?.Provincia).filter(Boolean)).size
  const cantons = n(options.dpaTotals?.TotalCantones); const parishes = n(options.dpaTotals?.TotalParroquias)
  const ranked = EVENTS.map(([key, label]) => ({ label, value: sum(options.tipoLluviasItems, key) })).filter((item) => item.value).sort((a, b) => b.value - a.value).slice(0, 5)
  const provinceNames = [...options.items].sort((a, b) => n(b?.ImpactadasPersonas) - n(a?.ImpactadasPersonas)).slice(0, 8).map((row) => row?.Provincia).filter(Boolean)
  return [p([run(`Desde el ${dateText(options.startDate)} hasta la fecha, por lluvias se han registrado ${fmt(total)} eventos adversos en ${fmt(provinces)} provincias${cantons ? `, afectando a ${fmt(cantons)} cantones` : ''}${parishes ? ` y ${fmt(parishes)} parroquias` : ''}.`, { size: 16 })], { after: 5 }), p([run(`Los eventos más recurrentes son: ${ranked.map((item) => `${item.label} (${fmt(total ? item.value / total * 100 : 0, true)}%)`).join(', ') || 'sin datos reportados'}.`, { size: 16 })], { after: 5 }), p([run('Las provincias con mayor impacto a personas son: ', { color: C.navy, size: 16 }), run(provinceNames.join(', ') || 'Sin datos reportados', { bold: true, color: C.orange, size: 16 })], { after: 120 })]
}
function metricCell(options, assets, [key, label, decimal], width, primary = false) {
  const valueColor = key === 'DamnificadosPersonas' ? C.red : C.orange
  const cardWidth = primary ? 205 : 96; const cardHeight = primary ? 52 : 70
  const valueParagraph = new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: fmt(sum(options.items, key), decimal), bold: true, color: valueColor, size: primary ? 36 : 34, font: 'Barlow Condensed' })] })
  const labelParagraph = new Paragraph({ alignment: primary ? AlignmentType.LEFT : AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: label, bold: true, color: primary ? valueColor : C.gray, size: primary ? 15 : 14, font: 'Barlow Condensed' })] })
  const shape = new ShapeGroupRun({ transformation: { width: cardWidth, height: cardHeight }, children: [
    { type: 'roundedRectangle', transformation: { width: cardWidth, height: cardHeight }, fill: C.white, line: { color: C.line, width: 1 }, effects: { shadow: { color: '7D8590', transparency: 35, blur: 1, distance: 6, angle: 90 } }, adjustments: { cornerRadius: 9 } },
    { type: 'picture', image: { type: 'png', data: assets.icons[key] }, transformation: { offset: { left: primary ? 9 : 6, top: primary ? 10 : 20 }, width: primary ? 31 : 27, height: primary ? 31 : 27 } },
    { type: 'rectangle', transformation: { offset: { left: primary ? 43 : 34, top: primary ? 3 : 1 }, width: primary ? 72 : 55, height: primary ? 43 : 31 }, fill: 'none', line: 'none', textOptions: { verticalAlignment: 'center', margins: { top: 0, right: 0, bottom: 0, left: 0 }, shrinkTextOnOverflow: true }, children: [valueParagraph] },
    { type: 'rectangle', transformation: { offset: { left: primary ? 119 : 32, top: primary ? 5 : 31 }, width: primary ? 80 : 61, height: primary ? 39 : 34 }, fill: 'none', line: 'none', textOptions: { verticalAlignment: 'center', margins: { top: 0, right: 1, bottom: 0, left: 1 }, shrinkTextOnOverflow: true }, children: [labelParagraph] },
  ] })
  return cell([p([shape], { align: AlignmentType.CENTER, after: 0 })], { width, margin: 10 })
}
function primaryMetrics(options, assets) {
  const affected = ['AfectadosPersonas', 'Personas afectadas']; const damaged = ['DamnificadosPersonas', 'Personas damnificadas']; const total = sum(options.items, 'AfectadosPersonas') + sum(options.items, 'DamnificadosPersonas')
  const totalShape = new ShapeGroupRun({ transformation: { width: 400, height: 38 }, children: [
    { type: 'roundedRectangle', transformation: { offset: { left: 57.5, top: 0 }, width: 285, height: 34 }, fill: C.white, line: { color: C.line, width: 1 }, effects: { shadow: { color: '7D8590', transparency: 42, blur: 1, distance: 5, angle: 90 } }, adjustments: { cornerRadius: 10 }, textOptions: { verticalAlignment: 'center', margins: { top: 2, right: 5, bottom: 2, left: 5 } }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [new TextRun({ text: 'TOTAL de Personas impactadas: ', bold: true, size: 13, font: 'Barlow Condensed' }), new TextRun({ text: '(afectadas + damnificadas)     ', size: 10, font: 'Barlow Condensed' }), new TextRun({ text: fmt(total), bold: true, size: 24, font: 'Barlow Condensed' })] })] },
    { type: 'line', transformation: { offset: { left: 20, top: 0 }, width: 0, height: 22 }, line: { color: C.red, width: 2 } },
    { type: 'line', transformation: { offset: { left: 20, top: 22 }, width: 34, height: 0 }, line: { color: C.red, width: 2, endArrow: { type: 'triangle', width: 'small', length: 'small' } } },
    { type: 'line', transformation: { offset: { left: 380, top: 0 }, width: 0, height: 22 }, line: { color: C.red, width: 2 } },
    { type: 'line', transformation: { offset: { left: 346, top: 22 }, width: 34, height: 0 }, line: { color: C.red, width: 2, startArrow: { type: 'triangle', width: 'small', length: 'small' } } },
  ] })
  return [fixedRowTable([metricCell(options, assets, affected, 3200, true), metricCell(options, assets, damaged, 3200, true)], [3200, 3200], 840), table([[cell([p([totalShape], { align: AlignmentType.CENTER, after: 0 })], { width: 6400, margin: 10 })]], [6400])]
}
function secondaryMetrics(options, assets) {
  const metrics = [['Fallecidos', 'Personas fallecidas'], ['AfectadosViviendas', 'Viviendas afectadas'], ['DestruidosViviendas', 'Viviendas destruidas'], ['AfectadosPuentes', 'Puentes afectados'], ['DestruidosPuentes', 'Puentes destruidos'], ['AfectadosKilometros', 'Km vías afectadas', true]]
  return fixedRowTable(metrics.map((metric) => metricCell(options, assets, metric, 1583)), [1583, 1583, 1583, 1583, 1583, 1585], 1070)
}
function provinceTable(options) {
  const rows = options.items.map((row) => [String(row?.Provincia || '').replace(/Santo Domingo de (los|Los) Ts[aá]chilas/i, 'Santo Domingo'), n(row?.Fallecidos), n(row?.ImpactadasPersonas), n(row?.AfectadosViviendas), n(row?.DestruidosViviendas), n(row?.AfectadosKilometros)]).filter((row) => row[0]).sort((a, b) => b[2] - a[2])
  const data = [['Provincia', 'Fallecidas', 'Impactadas', 'Viv. afect.', 'Viv. destr.', 'Km vías'], ...rows.map((row) => row.map((value, i) => i === 0 ? value : i === 5 ? fmt(value, true) : fmt(value))), ['Total', ...[1, 2, 3, 4].map((i) => fmt(rows.reduce((total, row) => total + row[i], 0))), fmt(rows.reduce((total, row) => total + row[5], 0), true)]]; const widths = [1250, 550, 800, 800, 800, 800]
  const maximumImpact = Math.max(1, ...rows.map((row) => row[2]))
  const impactFill = (value) => {
    const intensity = Math.max(0, Math.min(1, n(value) / maximumImpact)); const start = [255, 249, 238]; const end = [248, 181, 51]
    return start.map((channel, index) => Math.round(channel + (end[index] - channel) * intensity).toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  return table(data.map((row, ri) => row.map((value, ci) => {
    const isTotal = ri === data.length - 1; const isImpactBody = ci === 2 && ri > 0 && !isTotal
    const fill = isTotal ? C.blue : isImpactBody ? impactFill(rows[ri - 1][2]) : ri % 2 ? C.white : 'F1F6FC'
    return cell([p([run(value, { bold: ri === 0 || isTotal, color: isTotal ? C.white : C.black, size: 11 })], { align: ci ? AlignmentType.CENTER : AlignmentType.LEFT })], { width: widths[ci], fill, margin: 15 })
  })), widths)
}
function hydro(options) {
  const data = options.hydrometeorology; if (!data) return [p([run('No se adjuntó boletín hidrometeorológico.', { color: C.gray })])]
  const images = data.type === 'forecast' ? (data.maps || []).map((map) => [map.region, map.image]) : [[data.label || '', data.mapImage || data.images?.[0] || data.tableImage]].filter(([, value]) => value)
  const rawText = String(data.text || data.label || 'Boletín procesado.').replace(/\r\n?/g, '\n').trim()
  let blocks = rawText.split(/\n\s*\n|\n+/).map((value) => value.trim()).filter(Boolean)
  if (blocks.length === 1) blocks = rawText.split(/(?<=\.)\s+(?=(?:Entre|Adicional(?:mente)?|Durante|Desde|Para|En la región)\b)/i).map((value) => value.trim()).filter(Boolean)
  const descriptions = blocks.map((value) => p([run(value, { size: 16 })], { after: 90 }))
  if (!images.length) return descriptions
  if (data.type !== 'forecast') return [table([[cell(descriptions, { width: 7350, margin: 60, verticalAlign: VerticalAlign.TOP }), cell([image(images[0][1], 145, 122)], { width: 2050, margin: 20, verticalAlign: VerticalAlign.TOP })]], [7350, 2050])]
  return [...descriptions, table([images.slice(0, 4).map(([label, value]) => cell([p([run(label, { bold: true, color: C.navy, size: 11 })], { align: AlignmentType.CENTER }), image(value, 115, 75)], { width: Math.floor(9400 / images.length) }))], Array(images.length).fill(Math.floor(9400 / images.length)))]
}

function scope(row) { return String(row?.Ambito || row?.Ámbito || row?.Tipo || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() }
function details(rows) { return [...new Set(rows.map((row) => row?.Observacion || row?.Descripción || row?.Descripcion || [row?.Provincia, row?.Canton, row?.NivelAlerta].filter(Boolean).join(' - ')).filter(Boolean))].join(' ') || 'Sin registros reportados.' }
function infographicDetails(rows, maximum = 500) { const value = details(rows); return value.length > maximum ? `${value.slice(0, maximum - 3).trim()}...` : value }
function pageTwoBand(title, width) { return table([[cell([p([run(title, { bold: true, color: C.black, size: 17 })], { align: AlignmentType.CENTER, after: 0 })], { width, fill: C.pale, margin: 42 })]], [width]) }
function assistanceMetric(value, label, assets, width) { return cell([table([[cell([image(assets.assistanceLogo, 58, 58)], { width: 1100, margin: 10 }), cell([p([run(fmt(value), { bold: true, italics: true, color: C.orange, size: 50 })], { after: 10 }), p([run(label, { bold: true, color: C.navy, size: 15 })], { after: 0 })], { width: width - 1100, margin: 15 })]], [1100, width - 1100])], { width, margin: 35, verticalAlign: VerticalAlign.CENTER }) }
function shelterMetric(value, label, icon, width) { return cell([image(icon, 58, 58), p([run(fmt(value), { bold: true, italics: true, color: C.orange, size: 51 })], { align: AlignmentType.CENTER, after: 8 }), p([run(label, { bold: true, color: C.navy, size: 15 })], { align: AlignmentType.CENTER, after: 0 })], { width, margin: 30, verticalAlign: VerticalAlign.TOP }) }

function pageOne(options, g, assets) {
  const left = cell([...primaryMetrics(options, assets), table([[cell([image(g.map, 410, 300)], { width: 6400, margin: 0 })]], [6400])], { width: 6400, margin: 20, verticalAlign: VerticalAlign.TOP })
  const right = cell([secondaryMetrics(options, assets), table([[section('CANTIDAD DE EVENTOS ADVERSOS POR LLUVIAS', [image(g.donut, 295, 242)], 4500), section('DETALLE DE AFECTACIONES A NIVEL PROVINCIAL', [provinceTable(options)], 5000)]], [4500, 5000])], { width: 9600, margin: 20, verticalAlign: VerticalAlign.TOP })
  return [header(options, 1, assets), ...narrative(options), table([[left, right]], [6400, 9600]), table([[section('NÚMERO DE EVENTOS VS PERSONAS IMPACTADAS POR PROVINCIA', [image(g.province, 426, 154)], 6400), section('SITUACIÓN METEOROLÓGICA', hydro(options), 9600)]], [6400, 9600])]
}
function pageTwo(options, g, assets) {
  const sngr = sum(options.asistenciaItems, 'Total Bienes'); const system = sum(options.asistenciaSNDGIRDItems, 'Total Bienes'); const national = uniqueActiveCoeRows(options.nationalCoeItems, ['TipoCOE']); const provincial = uniqueActiveCoeRows(options.provincialCoeItems, ['Provincia']); const municipal = buildMunicipalCoeSummary(options.municipalCoeItems); const parish = uniqueActiveCoeRows(options.parishCoeItems, ['Provincia', 'Canton', 'Parroquia'])
  const counts = [[national.length, 'COE Nacional'], [provincial.length, 'COE Provinciales'], [municipal.totalActive, 'COE Cantonales'], [parish.length, 'COE Parroquiales']]; const alerts = options.alertDeclarations; const emergencies = options.emergencyDeclarations; const by = (rows, name) => rows.filter((row) => scope(row).includes(name))
  const declarations = [[by(alerts, 'nac'), 'Declaratoria de alerta roja Nacional', C.red], [by(alerts, 'prov'), 'Declaratorias de alerta roja Provinciales', C.red], [by(alerts, 'cant'), 'Declaratorias de alerta roja Cantonales', C.red], [by(emergencies, 'prov'), 'Declaratorias de Emergencias Provinciales', C.black], [by(emergencies, 'cant'), 'Declaratorias de Emergencias Cantonales', C.black]]
  const shelters = options.alojamientosItems; const shelterValues = [[shelters.length, 'Total de Alojamientos Activados', assets.icons.shelter], [sum(shelters, 'Familias'), 'Número de Familias Alojadas', assets.icons.families], [sum(shelters, 'Personas'), 'Número de Personas Alojadas', assets.icons.shelteredPeople]]
  const assistance = cell([
    pageTwoBand('ASISTENCIA HUMANITARIA', 7800),
    p([run(`Por eventos producidos por lluvias desde el ${dateText(options.startDate)} a la fecha, la SNGR y el SNDGIRD han entregado asistencia humanitaria a la población afectada, la cual se detalla a continuación:`, { bold: true, size: 16 })], { before: 65, after: 120 }),
    fixedRowTable([assistanceMetric(sngr, 'TOTAL DE BIENES DE ASISTENCIA HUMANITARIA ENTREGADO - SNGR', assets, 3900), assistanceMetric(system, 'TOTAL DE BIENES DE ASISTENCIA HUMANITARIA ENTREGADO - SNDGIRD', assets, 3900)], [3900, 3900], 1500),
    p([run(`La SNGR ha entregado a población afectada un total de ${fmt(sngr)} bienes de asistencia humanitaria; a continuación se detallan algunos tipos de bienes:`, { bold: true, size: 16 })], { before: 95, after: 25 }),
    image(g.sngr, 500, 185),
    p([run(`Las instituciones del SNDGIRD han entregado un total de ${fmt(system)} bienes de asistencia humanitaria:`, { bold: true, size: 16 })], { before: 100, after: 25 }),
    image(g.system, 500, 185),
  ], { width: 7900, margin: 20, verticalAlign: VerticalAlign.TOP })
  const right = cell([
    pageTwoBand('COE ACTIVADOS', 8000),
    fixedRowTable(counts.map(([value, label]) => cell([p([run(fmt(value), { bold: true, italics: true, color: C.black, size: 76 })], { align: AlignmentType.CENTER, after: 8 }), p([run(label, { bold: true, color: C.navy, size: 16 })], { align: AlignmentType.CENTER, after: 0 })], { width: 2000, margin: 15, verticalAlign: VerticalAlign.TOP })), [2000, 2000, 2000, 2000], 1200),
    p([], { after: 90 }),
    pageTwoBand('DECLARATORIAS DE ALERTAS Y EMERGENCIAS', 8000),
    ...declarations.flatMap(([rows, label, color], index) => [minRowTable([cell([p([run(rows.length, { bold: true, italics: true, color: C.black, size: 72 })], { align: AlignmentType.CENTER, after: 0 })], { width: 700, margin: 20, verticalAlign: VerticalAlign.TOP }), cell([p([run(`${label}:`, { bold: true, color, size: 16 })], { after: 12 }), p([run(infographicDetails(rows), { color: C.black, size: 16 })], { after: 0 })], { width: 7300, fill: C.pale, margin: 55, verticalAlign: VerticalAlign.TOP })], [700, 7300], 760), ...(index < declarations.length - 1 ? [p([], { after: 25 })] : [])]),
    p([], { after: 90 }),
    pageTwoBand('ALOJAMIENTOS ACTIVOS', 8000),
    fixedRowTable(shelterValues.map(([value, label, icon]) => shelterMetric(value, label, icon, 2666)), [2666, 2666, 2666], 2050),
    p([run(shelters.length ? `Alojamientos implementados en ${[...new Set(shelters.map((row) => row?.Provincia).filter(Boolean))].join(', ')}.` : 'Sin alojamientos activos reportados.', { color: C.gray, size: 12 })], { align: AlignmentType.CENTER, before: 45, after: 0 }),
  ], { width: 8100, margin: 20, verticalAlign: VerticalAlign.TOP })
  return [header(options, 2, assets), table([[assistance, right]], [7900, 8100])]
}

export async function buildInfographicWord(options = {}) {
  const data = { items: [], tipoLluviasItems: [], asistenciaItems: [], asistenciaSNDGIRDItems: [], alojamientosItems: [], nationalCoeItems: [], provincialCoeItems: [], municipalCoeItems: [], parishCoeItems: [], alertDeclarations: [], emergencyDeclarations: [], ...options }
  const [assets, map, donut, province, sngr, system, footerLandscape] = await Promise.all([loadAssets(), generateImpactMap(data.items), generateEventDonut(data.tipoLluviasItems), generateProvinceChart(data.items), generateAssistanceChart(data.asistenciaItems, '#f17121'), generateAssistanceChart(data.asistenciaSNDGIRDItems, '#559ad3'), generateFooterLandscape()]); const g = { map, donut, province, sngr, system }
  const page = { size: { width: 16838, height: 11906 }, margin: { top: 120, right: 180, bottom: 240, left: 180, header: 0, footer: 50, gutter: 0 } }
  const footer = infographicFooter(footerLandscape)
  const pageBreak = new Paragraph({ spacing: { before: 0, after: 0, line: 1 }, children: [new PageBreak()] })
  const endMarker = new Paragraph({ spacing: { before: 0, after: 0, line: 1 }, children: [new TextRun({ text: '', size: 2 })] })
  return new Document({ creator: 'Secretaría Nacional de Gestión de Riesgos', title: 'Infografía SITREP de lluvias editable', description: 'Infografía editable; mapas y gráficas se conservan como imágenes.', sections: [{ properties: { page }, footers: { default: footer }, children: [...pageOne(data, g, assets), pageBreak, ...pageTwo(data, g, assets), endMarker] }] })
}
export async function exportInfographicWord(options = {}) {
  const blob = await Packer.toBlob(await buildInfographicWord(options)); const suffix = options?.provinciaId ? `provincia_${options.provinciaId}` : 'nacional'; const url = URL.createObjectURL(blob); const anchor = window.document.createElement('a')
  anchor.href = url; anchor.download = `infografia_sitrep_lluvias_editable_${suffix}.docx`; window.document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url)
}
