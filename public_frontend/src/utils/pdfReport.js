import jsPDFPackage from 'jspdf'
import autoTable from 'jspdf-autotable'

const JsPDF = jsPDFPackage.jsPDF || jsPDFPackage

const C = {
  navy: [31, 60, 105], darkNavy: [5, 43, 103], blue: [38, 84, 153], pale: [218, 227, 244],
  alternate: [224, 231, 244], orange: [239, 112, 36], lightOrange: [252, 232, 218],
  gray: [128, 128, 128], line: [205, 205, 205], black: [20, 20, 20], white: [255, 255, 255],
  red: [245, 101, 101], yellow: [255, 229, 122], green: [101, 190, 121],
}

const PAGE = { width: 210, height: 297, left: 20, right: 18, top: 27, firstTop: 47, bottom: 267, footerTop: 270 }
PAGE.contentWidth = PAGE.width - PAGE.left - PAGE.right

const TEMPLATE_FILES = {
  headerLogo: 'republica-ecuador.png', headerBand: 'franja-superior.png', footer: 'footer-institucional.png',
  fontRegular: 'BarlowCondensed-Regular.ttf', fontBold: 'BarlowCondensed-SemiBold.ttf',
  fontItalic: 'BarlowCondensed-LightItalic.ttf',
}

const EVENT_TYPES = [
  ['Inundacion', 'Inundación'], ['Deslizamiento', 'Deslizamiento'], ['Lluvias_Intensas', 'Lluvias intensas'],
  ['Erosion_Hidrica', 'Erosión hídrica'], ['Hundimiento', 'Hundimiento'], ['Aluvion', 'Aluvión (flujos)'],
  ['Vendaval', 'Vendaval'], ['Caidas_Colapso', 'Caídas (colapso)'], ['Tormenta_Electrica', 'Tormenta eléctrica'],
  ['Granizada', 'Granizada'], ['Reptacion', 'Reptación'], ['Avalancha', 'Avalancha'], ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso humedad'], ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso infraestructura'],
].map(([key, label]) => ({ key, label }))

const DETAIL_COLUMNS = [
  ['__no__', 'No.', 'index'], ['Provincia', 'Provincia', 'text'], ['NumeroEventos', 'Nro. de eventos', 'number', true],
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
  const titleOptions = { day: 'numeric', month: 'long', year: 'numeric' }
  const startLong = start.toLocaleString('es-EC', longOptions)
  const endLong = end.toLocaleString('es-EC', longOptions)
  const startNumeric = start.toLocaleString('es-EC', numericOptions)
  const endNumeric = end.toLocaleString('es-EC', numericOptions)
  const startTitle = start.toLocaleDateString('es-EC', titleOptions)
  const endTitle = end.toLocaleDateString('es-EC', titleOptions)
  const sourceDate = end.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const sourceTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
  return {
    year: end.getFullYear(), startLong, endLong, startNumeric, endNumeric,
    title: `${sitrepNumber ? `SitRep ${sitrepNumber}` : 'SitRep'} - Por lluvias, del ${startTitle} al ${endTitle}`,
    coverage: `Este informe cubre el período desde el ${startNumeric} hasta el ${endNumeric}`,
    source: `Fuente: Unidades de Monitoreo SNGR - Instituciones del SNDGIRD. ${sourceDate} - ${sourceTime}`,
  }
}

function assetUrl(folder, file, baseUrl) {
  const base = baseUrl || import.meta.env?.BASE_URL || '/'
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
  font(doc, 'normal', 5.7, C.black)
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
    let text = `Desde el ${metadata.startLong} hasta el ${metadata.endLong} se han registrado ${fmt(total)} eventos adversos por lluvias`
    if (provinces) text += ` afectando a ${fmt(provinces)} provincias`
    if (cantons) text += `, ${fmt(cantons)} cantones`
    if (parishes) text += ` y ${fmt(parishes)} parroquias`
    if (types.length) text += `. Los eventos más recurrentes corresponden a: ${types.map((type) => `${type.label.toLowerCase()} (${pct((type.total / total) * 100)})`).join(', ')}`
    bullets.push(`${text}.`)
  }
  const top = ranking(items)
  if (top.length) bullets.push(`En lo que va del año ${metadata.year}, las provincias con mayor impacto a la población son: ${top.map((row) => row.provincia).join(', ')}.`)
  if (has(items, 'ImpactadasPersonas')) bullets.push(`En total, los eventos reportados impactaron a ${fmt(sum(items, 'ImpactadasPersonas'))} personas.`)
  const goods = sum(asistenciaItems, 'Total Bienes')
  if (goods > 0) bullets.push(`La SNGR ha entregado a la población un total de ${fmt(goods)} bienes de asistencia humanitaria${unique(asistenciaItems, ['Provincias', 'Provincia']) ? ` en ${fmt(unique(asistenciaItems, ['Provincias', 'Provincia']))} provincias` : ''}.`)
  return bullets
}

function renderImportantPoints(doc, currentY, context) {
  const bullets = importantPoints(context)
  if (!bullets.length) return currentY
  currentY = renderSectionTitle(doc, currentY, '1', 'Puntos importantes')
  bullets.forEach((text) => {
    font(doc, 'normal', 8.7, C.black)
    const lines = doc.splitTextToSize(text, PAGE.contentWidth - 9)
    currentY = ensurePageSpace(doc, currentY, lines.length * 4.05 + 2)
    doc.setFillColor(...C.darkNavy)
    doc.circle(PAGE.left + 1.2, currentY - 1.3, 0.65, 'F')
    doc.text(lines, PAGE.left + 8, currentY)
    currentY += lines.length * 4.05 + 1.2
  })
  return currentY + 2
}

function renderAffectationLevel(doc, currentY, level) {
  if (level === undefined || level === null || level === '') return currentY
  currentY = ensurePageSpace(doc, currentY, 35)
  const x = PAGE.width - PAGE.right - 37
  doc.setDrawColor(...C.orange); doc.setFillColor(...C.lightOrange); doc.roundedRect(x, currentY, 37, 30, 3, 3, 'FD')
  font(doc, 'bold', 7); doc.text('NIVEL DE AFECTACIÓN', x + 18.5, currentY + 5, { align: 'center' })
  font(doc, 'bold', 28); doc.text(String(level), x + 18.5, currentY + 18, { align: 'center' })
  font(doc, 'normal', 4.4); doc.text(['Calificación realizada con base al', 'Manual del COE 2017'], x + 18.5, currentY + 24.5, { align: 'center' })
  return currentY + 33
}

function renderHydrometeorology(doc, currentY, data) {
  if (!data?.text) return currentY
  currentY = renderSectionTitle(doc, currentY, '2', 'Situación Hidrometeorológica actual')
  const imageWidth = data.image ? 48 : 0
  font(doc, 'normal', 8.5)
  const startY = currentY
  currentY = wrapped(doc, data.text, PAGE.left, currentY, PAGE.contentWidth - imageWidth - (imageWidth ? 4 : 0), 4)
  if (data.image) {
    const imageHeight = data.imageHeight || 50
    doc.addImage(data.image, 'PNG', PAGE.width - PAGE.right - imageWidth, startY - 3, imageWidth, imageHeight)
    currentY = Math.max(currentY, startY + imageHeight)
  }
  return currentY + 3
}

function renderWaterBodies(doc, currentY, rows) {
  if (!rows?.length) return currentY
  currentY = renderSectionTitle(doc, currentY, '2.1', 'Estado de cuerpos de agua')
  return renderGenericTable(doc, currentY, rows, { fontSize: 7, vertical: false })
}

function heat(ratio) {
  if (ratio >= 0.999999) return C.red
  if (ratio >= 0.4) return [255, 173, 111]
  if (ratio >= 0.15) return C.yellow
  return C.green
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
  currentY = renderSectionTitle(doc, currentY, '3', 'Eventos Adversos y Afectaciones - Resumen')
  const totalEvents = sum(items, 'NumeroEventos')
  font(doc, 'normal', 8.4)
  currentY = wrapped(doc, `Desde el ${metadata.startNumeric} hasta el ${metadata.endNumeric}, por lluvias se registraron un total de ${fmt(totalEvents)} eventos adversos, distribuidos de la siguiente manera:`, PAGE.left, currentY, PAGE.contentWidth) + 2
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
      if (row.index === body.length - 2) Object.assign(cell.styles, { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' })
      else if (row.index === body.length - 1) {
        if (column.index < 3) { cell.styles.fillColor = C.white; cell.text = [''] }
        else cell.styles.fillColor = heat(sum(items, columns[column.index].key) / maxEventTypeTotal)
      } else if (columns[column.index]?.key === 'NumeroEventos') cell.styles.fillColor = heat(n(sorted[row.index]?.NumeroEventos) / maxEvents)
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
    let text = `La provincia con mayor impacto a la población es ${first.provincia} con ${fmt(first.impactadas)} personas impactadas en ${fmt(first.eventos)} eventos`
    if (rest.length) text += `, seguido de ${rest.map((row) => `${row.provincia} con ${fmt(row.impactadas)} personas impactadas en ${fmt(row.eventos)} eventos`).join(', ')}`
    font(doc, 'normal', 8.3); currentY = wrapped(doc, `${text}.`, PAGE.left, currentY, PAGE.contentWidth, 3.9) + 2
  }
  const sorted = [...items].sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
  const body = sorted.map((row, index) => columns.map((column) => column.type === 'index' ? index + 1
    : column.type === 'text' ? String(row?.[column.key] ?? '') : fmt(row?.[column.key] ?? 0, column.type === 'decimal')))
  body.push(columns.map((column) => column.type === 'index' ? '' : column.type === 'text' ? 'Total general' : fmt(sum(items, column.key), column.type === 'decimal')))
  const fixed = 29.5, numericWidth = (PAGE.contentWidth - fixed) / Math.max(columns.length - 2, 1)
  const columnStyles = { 0: { cellWidth: 5.5 }, 1: { cellWidth: 24, halign: 'left', overflow: 'linebreak' } }
  columns.slice(2).forEach((_, index) => {
    columnStyles[index + 2] = { cellWidth: numericWidth, cellPadding: 0.1, overflow: 'hidden' }
  })
  const maxEvents = Math.max(1, ...sorted.map((row) => n(row?.NumeroEventos)))
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
      if (row.index === body.length - 1) Object.assign(cell.styles, { fillColor: C.navy, textColor: C.white, fontStyle: 'bold' })
      else if (columns[column.index]?.heat) cell.styles.fillColor = heat(n(sorted[row.index]?.[columns[column.index].key]) / (columns[column.index].key === 'NumeroEventos' ? maxEvents : maxPeople))
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
    const barHeight = (row.people / maxPeople) * height
    return { x: barX, width: barWidth, height: barHeight, top: y + height - barHeight }
  })
  const barCenters = bars.map((bar) => bar.x + bar.width / 2)
  const tickPositions = [...barCenters]
  const eventValues = rows.map((row) => row.events)
  if (rows.length !== bars.length || bars.length !== barCenters.length || barCenters.length !== eventValues.length
    || tickPositions.some((tick, index) => tick !== barCenters[index])) {
    throw new Error('Las provincias, barras, centros, ticks y eventos de la gráfica no están alineados.')
  }
  font(doc, 'normal', 12, C.gray); doc.text('Número de eventos vs Personas Impactadas por provincia', PAGE.width / 2, currentY + 4, { align: 'center' })
  for (let index = 0; index <= 4; index += 1) {
    const gridY = y + height - (height * index / 4)
    doc.setDrawColor(225, 225, 225); doc.setLineWidth(0.12); doc.line(x, gridY, x + width, gridY)
    font(doc, 'normal', 4.1, C.gray)
    doc.text(fmt(Math.round(maxPeople * index / 4)), x - 1.5, gridY + 1, { align: 'right' })
    doc.text(fmt(Math.round(maxEvents * index / 4)), x + width + 1.5, gridY + 1)
  }
  const valueLabel = (text, centerX, top, fillColor) => {
    font(doc, 'normal', 3.8, C.gray)
    const labelWidth = Math.max(4.5, doc.getTextWidth(text) + 1.2)
    doc.setFillColor(...fillColor); doc.rect(centerX - labelWidth / 2, top, labelWidth, 3.4, 'F')
    doc.text(text, centerX, top + 2.35, { align: 'center' })
  }
  const points = barCenters.map((centerX, index) => [centerX, y + height - (eventValues[index] / maxEvents) * height])
  const peopleLabels = []
  font(doc, 'normal', 3.9, C.gray)
  const maxProvinceLabelWidth = Math.max(...rows.map((row) => doc.getTextWidth(row.label.toUpperCase())))
  const labelAngle = 65
  const labelRadians = labelAngle * Math.PI / 180
  const provinceLabelOffset = 3
  rows.forEach((row, index) => {
    const bar = bars[index]
    const centerX = barCenters[index]
    doc.setFillColor(69, 114, 190); doc.rect(bar.x, bar.top, bar.width, bar.height, 'F')
    if (row.people) peopleLabels.push({
      text: fmt(row.people), centerX,
      top: Math.min(y + height - 3.8, Math.max(y + 4, bar.top + 0.7)),
    })
    const provinceLabel = row.label.toUpperCase()
    const labelAnchorY = y + height + provinceLabelOffset
    const labelWidth = doc.getTextWidth(provinceLabel)
    const rightAlignedX = tickPositions[index] + labelWidth * (1 - Math.cos(labelRadians))
    const rightAlignedY = labelAnchorY + labelWidth * Math.sin(labelRadians)
    doc.text(provinceLabel, rightAlignedX, rightAlignedY, { angle: labelAngle, align: 'right' })
  })
  doc.setDrawColor(...C.orange); doc.setLineWidth(0.7)
  for (let index = 1; index < points.length; index += 1) doc.line(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1])
  points.forEach(([px, py], index) => {
    doc.setFillColor(...C.orange); doc.circle(px, py, 0.7, 'F')
  })
  peopleLabels.forEach((label) => valueLabel(label.text, label.centerX, label.top, C.alternate))
  points.forEach(([px, py], index) => {
    if (rows[index].events) valueLabel(fmt(rows[index].events), px, Math.max(y + 0.4, py - 4.2), C.lightOrange)
  })
  font(doc, 'normal', 3.9, C.gray)
  const labelDepth = maxProvinceLabelWidth * Math.sin(labelRadians)
  const legendY = y + height + Math.max(17, labelDepth + provinceLabelOffset + 4), legendX = PAGE.width / 2 - 31
  doc.setFillColor(69, 114, 190); doc.rect(legendX, legendY - 2.1, 5, 2.4, 'F')
  font(doc, 'normal', 5.2, C.gray); doc.text('Personas Impactadas', legendX + 6.5, legendY)
  doc.setDrawColor(...C.orange); doc.setLineWidth(0.7); doc.line(legendX + 39, legendY - 1, legendX + 45, legendY - 1)
  doc.setFillColor(...C.orange); doc.circle(legendX + 42, legendY - 1, 0.65, 'F')
  font(doc, 'normal', 5.2, C.gray); doc.text('Nro. de eventos', legendX + 46.5, legendY)
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
      if (columnKey === 'eventPct') cell.styles.fillColor = heat(rows[row.index].events / maxMonthlyEvents)
      if (columnKey === 'peoplePct') cell.styles.fillColor = heat(rows[row.index].people / maxMonthlyPeople)
    },
  })
  const x = PAGE.left + 93, y = currentY + 9, width = PAGE.contentWidth - 96, height = Math.min(36, Math.max(24, doc.lastAutoTable.finalY - y))
  const maxEvents = Math.max(...rows.map((row) => row.events), 1), maxPeople = Math.max(...rows.map((row) => row.people), 1), slot = width / rows.length
  font(doc, 'normal', 7.5, C.gray); doc.text('Recurrencia de eventos vs personas impactadas por mes', x + width / 2, currentY + 4, { align: 'center' })
  const points = []
  rows.forEach((row, index) => {
    const bx = x + index * slot + slot * 0.25, bw = slot * 0.5, bh = row.events / maxEvents * height
    doc.setFillColor(69, 114, 190); doc.rect(bx, y + height - bh, bw, bh, 'F')
    points.push([bx + bw / 2, y + height - row.people / maxPeople * height])
    font(doc, 'normal', 5.2, C.gray); doc.text(row.month, bx + bw / 2, y + height + 3.2, { align: 'center' })
  })
  doc.setDrawColor(...C.orange); doc.setLineWidth(0.6)
  for (let index = 1; index < points.length; index += 1) doc.line(points[index - 1][0], points[index - 1][1], points[index][0], points[index][1])
  return sourceLine(doc, Math.max(doc.lastAutoTable.finalY, y + height + 5) + 3, metadata)
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
      if (section === 'body' && ['number', 'decimal'].includes(columns[column.index]?.type)) keepNumericCellSingleLine(doc, cell, otherWidth)
    },
    didDrawCell: ({ cell, column, section }) => {
      if (section === 'head' && options.vertical !== false && column.index !== textIndex) verticalHeader(doc, columns[column.index].label, cell, 5.2)
    },
  })
  return doc.lastAutoTable.finalY + 3
}

function renderTemporaryShelterSection(doc, currentY, number, title, items, priority, metadata) {
  if (!items.length) return currentY
  currentY = renderSectionTitle(doc, currentY, number, title)
  currentY = renderGenericTable(doc, currentY, items, { priority, fontSize: 7, vertical: false })
  return sourceLine(doc, currentY, metadata) + 2
}

function renderTemporaryShelters(doc, currentY, openItems, closedItems, metadata) {
  currentY = renderTemporaryShelterSection(
    doc, currentY, '5.1', 'Alojamientos Temporales Abiertos', openItems,
    ['Provincia', 'Canton', 'Parroquia', 'Tipo', 'Nombre', 'Apertura'], metadata,
  )
  return renderTemporaryShelterSection(
    doc, currentY +1, '5.2', 'Alojamientos Temporales Cerrados', closedItems,
    ['Provincia', 'Canton', 'Parroquia', 'Tipo', 'Nombre', 'Apertura', 'Cierre'], metadata,
  )
}

function renderAssistanceTable(doc, currentY, items, intro, metadata) {
  if (!items.length || sum(items, 'Total Bienes') <= 0) return currentY
  font(doc, 'normal', 8.4); currentY = wrapped(doc, intro, PAGE.left, currentY, PAGE.contentWidth) + 2
  currentY = renderGenericTable(doc, currentY, items, { priority: ['Provincias', 'Provincia', 'Familias Beneficiadas', 'Personas Beneficiadas', 'Total Bienes', 'ProvinciaID'], total: true, fontSize: 5.6 })
  return sourceLine(doc, currentY, metadata) + 2
}

function renderAssistance(doc, currentY, sngr, sndgird, metadata) {
  const hasSngr = sngr.length && sum(sngr, 'Total Bienes') > 0, hasSndgird = sndgird.length && sum(sndgird, 'Total Bienes') > 0
  if (!hasSngr && !hasSndgird) return currentY
  currentY = renderSectionTitle(doc, currentY, '6', 'Asistencia Humanitaria')
  if (hasSngr) currentY = renderAssistanceTable(doc, currentY, sngr, `Por eventos producidos por lluvias desde el ${metadata.startLong} hasta el ${metadata.endLong}, la SNGR ha entregado a la población un total de ${fmt(sum(sngr, 'Total Bienes'))} bienes de asistencia:`, metadata)
  if (hasSndgird) currentY = renderAssistanceTable(doc, currentY, sndgird, `El resto del SNDGIRD ha entregado a la población un total de ${fmt(sum(sndgird, 'Total Bienes'))} bienes de asistencia:`, metadata)
  return currentY
}

export async function buildEventosLluviasPdf({
  items = [], tipoLluviasItems = [], asistenciaItems = [], asistenciaSNDGIRDItems = [], alojamientosItems = [], alojamientosCerradosItems = [],
  eventosMesItems = [], viasCategoriaItems = [], dpaTotals = null, sitrepNumber = null, affectationLevel = null,
  hydrometeorology = null, waterBodies = [], publishedAt = new Date(), startDate = null, endDate = null, assetBaseUrl = null,
} = {}) {
  const assets = await loadPdfAssets(assetBaseUrl)
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  registerFonts(doc, assets)
  const metadata = periodMetadata(publishedAt, sitrepNumber, startDate, endDate)
  let currentY = PAGE.firstTop
  currentY = renderImportantPoints(doc, currentY, { items, tipoLluviasItems, asistenciaItems, dpaTotals, metadata })
  currentY = renderAffectationLevel(doc, currentY, affectationLevel)
  currentY = renderHydrometeorology(doc, currentY, hydrometeorology)
  currentY = renderWaterBodies(doc, currentY, waterBodies)
  currentY = renderEventsTable(doc, currentY, tipoLluviasItems, metadata)
  currentY = renderAffectationsSummary(doc, currentY, items, viasCategoriaItems, assets, metadata)
  currentY = renderProvinceDetail(doc, currentY, items, metadata)
  currentY = renderProvinceImpactChart(doc, currentY, items, metadata)
  currentY = renderMonthlySummary(doc, currentY, eventosMesItems, metadata)
  currentY = renderTemporaryShelters(doc, currentY, alojamientosItems, alojamientosCerradosItems, metadata)
  renderAssistance(doc, currentY, asistenciaItems, asistenciaSNDGIRDItems, metadata)
  decoratePages(doc, { assets, metadata, publishedAt })
  return doc
}

export async function exportEventosLluviasPdf(options) {
  const doc = await buildEventosLluviasPdf(options)
  const suffix = options?.provinciaId ? `provincia_${options.provinciaId}` : 'todas'
  doc.save(`sitrep_lluvias_preview_style_${suffix}.pdf`)
}
