import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE = [10, 42, 110]
const LIGHT_BLUE = [238, 243, 251]
const BORDER_BLUE = [215, 225, 242]

const PAGE = {
  left: 10,
  right: 10,
  top: 12,
  width: 297 - 10 - 10,
}

const DETAIL_COLUMNS = [
  { key: '__no__', label: 'No.', type: 'index', vertical: false },
  { key: 'Provincia', label: 'Provincia', aliases: ['Provincia', 'Canton', 'CantonNombre'], type: 'text', vertical: false },
  { key: 'NumeroEventos', label: 'No. de\nEvento', aliases: ['NumeroEventos'], type: 'number', vertical: false, heat: true },
  { key: 'ImpactadasPersonas', label: 'Personas Impactadas', aliases: ['ImpactadasPersonas'], type: 'number', vertical: true, heat: true },
  { key: 'Extraviados', label: 'Personas Extraviadas', aliases: ['Extraviados'], type: 'number', vertical: true },
  { key: 'Fallecidos', label: 'Personas Fallecidas', aliases: ['Fallecidos'], type: 'number', vertical: true },
  { key: 'Heridos', label: 'Personas Heridas', aliases: ['Heridos'], type: 'number', vertical: true },
  { key: 'AfectadosPersonas', label: 'Personas Afectadas', aliases: ['AfectadosPersonas'], type: 'number', vertical: true },
  { key: 'DamnificadosPersonas', label: 'Personas Damnificadas', aliases: ['DamnificadosPersonas'], type: 'number', vertical: true },
  { key: 'AfectadosFamilias', label: 'Familias Afectadas', aliases: ['AfectadosFamilias'], type: 'number', vertical: true },
  { key: 'DamnificadosFamilias', label: 'Familias Damnificadas', aliases: ['DamnificadosFamilias'], type: 'number', vertical: true },
  { key: 'AfectadosViviendas', label: 'Viviendas Afectadas', aliases: ['AfectadosViviendas'], type: 'number', vertical: true },
  { key: 'DestruidosViviendas', label: 'Viviendas Destruidas', aliases: ['DestruidosViviendas'], type: 'number', vertical: true },
  { key: 'AfectadosPuentes', label: 'Puentes Afectados', aliases: ['AfectadosPuentes'], type: 'number', vertical: true },
  { key: 'DestruidosPuentes', label: 'Puentes Destruidos', aliases: ['DestruidosPuentes'], type: 'number', vertical: true },
  { key: 'AfectadosPrivados', label: 'Bienes Privados Afectados', aliases: ['AfectadosPrivados'], type: 'number', vertical: true },
  { key: 'DestruidosPrivados', label: 'Bienes Privados Destruidos', aliases: ['DestruidosPrivados'], type: 'number', vertical: true },
  { key: 'AfectadosPublicos', label: 'Bienes Publicos Afectados', aliases: ['AfectadosPublicos'], type: 'number', vertical: true },
  { key: 'DestruidosPublicos', label: 'Bienes Publicos Destruidos', aliases: ['DestruidosPublicos'], type: 'number', vertical: true },
  { key: 'AfectadosEducativos', label: 'Centros Educativos Afectados', aliases: ['AfectadosEducativos'], type: 'number', vertical: true },
  { key: 'DestruidosEducativos', label: 'Centros Educativos Destruidos', aliases: ['DestruidosEducativos'], type: 'number', vertical: true },
  { key: 'FuncionalEducativos', label: 'Centros Educativos Funcionales', aliases: ['FuncionalEducativos'], type: 'number', vertical: true },
  { key: 'AfectadosSalud', label: 'Centros Salud Afectados', aliases: ['AfectadosSalud'], type: 'number', vertical: true },
  { key: 'DestruidosSalud', label: 'Centros Salud Destruidos', aliases: ['DestruidosSalud'], type: 'number', vertical: true },
  { key: 'Evacuados', label: 'Evacuados', aliases: ['Evacuados'], type: 'number', vertical: true },
  { key: 'AfectadosKilometros', label: 'Km Vias Afectadas', aliases: ['AfectadosKilometros'], type: 'number', vertical: true },
  { key: 'AfectadosMetros', label: 'Metros Vias Afectadas', aliases: ['AfectadosMetros'], type: 'number', vertical: true },
  { key: 'AfectadosHectareas', label: 'Hectareas Afectadas', aliases: ['AfectadosHectareas'], type: 'number', vertical: true },
  { key: 'PerdidosHectareas', label: 'Hectareas Perdidas', aliases: ['PerdidosHectareas'], type: 'number', vertical: true },
  { key: 'QuemadasHectareas', label: 'Hectareas Quemadas', aliases: ['QuemadasHectareas'], type: 'number', vertical: true },
  { key: 'AfectadosAnimales', label: 'Animales Afectados', aliases: ['AfectadosAnimales'], type: 'number', vertical: true },
  { key: 'MuertosAnimales', label: 'Animales Muertos', aliases: ['MuertosAnimales'], type: 'number', vertical: true },
]

const EVENT_TYPE_COLUMNS = [
  { key: 'Inundacion', label: 'inundaciones' },
  { key: 'Deslizamiento', label: 'deslizamientos' },
  { key: 'Lluvias_Intensas', label: 'lluvias intensas' },
  { key: 'Erosion_Hidrica', label: 'erosion hidrica' },
  { key: 'Hundimiento', label: 'hundimientos' },
  { key: 'Aluvion', label: 'aluviones' },
  { key: 'Vendaval', label: 'vendavales' },
  { key: 'Caidas_Colapso', label: 'caidas (colapsos)' },
  { key: 'Tormenta_Electrica', label: 'tormentas electricas' },
  { key: 'Granizada', label: 'granizadas' },
  { key: 'Reptacion', label: 'reptacion' },
  { key: 'Avalancha', label: 'avalanchas' },
  { key: 'Nevada', label: 'nevadas' },
  { key: 'Exceso_Humedad', label: 'exceso de humedad' },
  { key: 'Torbellino', label: 'torbellinos' },
  { key: 'Colapso_Infraestructura', label: 'colapso de infraestructura' },
]

const TIPO_LLUVIAS_TABLE_COLUMNS = [
  { key: '__no__', label: 'No.', type: 'index', vertical: false },
  { key: 'Provincia', label: 'Provincia', type: 'text', vertical: false },
  { key: 'NumeroEventos', label: 'No. de\nEvento', type: 'number', vertical: false },
  { key: 'Inundacion', label: 'Inundacion', type: 'number', vertical: true },
  { key: 'Deslizamiento', label: 'Deslizamiento', type: 'number', vertical: true },
  { key: 'Lluvias_Intensas', label: 'Lluvias Intensas', type: 'number', vertical: true },
  { key: 'Erosion_Hidrica', label: 'Erosion Hidrica', type: 'number', vertical: true },
  { key: 'Hundimiento', label: 'Hundimiento', type: 'number', vertical: true },
  { key: 'Aluvion', label: 'Aluvion', type: 'number', vertical: true },
  { key: 'Vendaval', label: 'Vendaval', type: 'number', vertical: true },
  { key: 'Caidas_Colapso', label: 'Caidas Colapso', type: 'number', vertical: true },
  { key: 'Tormenta_Electrica', label: 'Tormenta Electrica', type: 'number', vertical: true },
  { key: 'Granizada', label: 'Granizada', type: 'number', vertical: true },
  { key: 'Reptacion', label: 'Reptacion', type: 'number', vertical: true },
  { key: 'Avalancha', label: 'Avalancha', type: 'number', vertical: true },
  { key: 'Nevada', label: 'Nevada', type: 'number', vertical: true },
  { key: 'Exceso_Humedad', label: 'Exceso Humedad', type: 'number', vertical: true },
  { key: 'Torbellino', label: 'Torbellino', type: 'number', vertical: true },
  { key: 'Colapso_Infraestructura', label: 'Colapso Infraestructura', type: 'number', vertical: true },
]

function toNumber(value) {
  const normalized = String(value ?? '').replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

function formatInt(value) {
  return Math.round(value).toLocaleString('es-EC')
}

function formatPct(value) {
  return Number(value).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getFieldByAliases(row, aliases, fallback = 'N/D') {
  for (const alias of aliases || []) {
    if (row?.[alias] !== undefined && row?.[alias] !== null && row?.[alias] !== '') return row[alias]
  }
  return fallback
}

function summarize(items) {
  return {
    personasAfectadas: items.reduce((acc, row) => acc + toNumber(row.AfectadosPersonas), 0),
    familiasAfectadas: items.reduce((acc, row) => acc + toNumber(row.AfectadosFamilias), 0),
    viviendasAfectadas: items.reduce((acc, row) => acc + toNumber(row.AfectadosViviendas), 0),
    puentesAfectados: items.reduce((acc, row) => acc + toNumber(row.AfectadosPuentes), 0),
    puentesDestruidos: items.reduce((acc, row) => acc + toNumber(row.DestruidosPuentes), 0),
    kmViasAfectadas: items.reduce((acc, row) => acc + toNumber(row.AfectadosKilometros), 0),
  }
}

function buildImpactRanking(items, maxProvincias = 8) {
  const byProvincia = new Map()

  for (const row of items) {
    const provincia = String(getFieldByAliases(row, ['Provincia'], 'N/D'))
    const current = byProvincia.get(provincia) || { impactadas: 0, eventos: 0 }
    current.impactadas += toNumber(row.ImpactadasPersonas)
    current.eventos += toNumber(row.NumeroEventos)
    byProvincia.set(provincia, current)
  }

  return [...byProvincia.entries()]
    .filter(([name]) => name && name !== 'N/D')
    .map(([name, agg]) => ({ provincia: name, impactadas: agg.impactadas, eventos: agg.eventos }))
    .sort((a, b) => b.impactadas - a.impactadas || b.eventos - a.eventos)
    .slice(0, maxProvincias)
}

function buildImpactTokens(items, maxProvincias = 8) {
  const ranking = buildImpactRanking(items, maxProvincias)

  if (!ranking.length) {
    return [{ text: 'No se registran datos suficientes para determinar las provincias con mayor impacto a la poblacion.', bold: false }]
  }

  const tokens = []
  const first = ranking[0]

  tokens.push({ text: 'La provincia con mayor impacto a la poblacion es ', bold: false })
  tokens.push({ text: first.provincia, bold: true })
  tokens.push({ text: ' con ', bold: false })
  tokens.push({ text: `${formatInt(first.impactadas)} personas impactadas`, bold: true })
  tokens.push({ text: ' en ', bold: false })
  tokens.push({ text: `${formatInt(first.eventos)}`, bold: true })
  tokens.push({ text: ' eventos ', bold: false })

  const rest = ranking.slice(1)
  if (rest.length) {
    tokens.push({ text: ', seguido de: ', bold: false })

    rest.forEach((p, idx) => {
      tokens.push({ text: p.provincia, bold: true })
      tokens.push({ text: ' con ', bold: false })
      tokens.push({ text: `${formatInt(p.impactadas)} personas impactadas`, bold: true })
      tokens.push({ text: ' en ', bold: false })
      tokens.push({ text: `${formatInt(p.eventos)}`, bold: true })
      tokens.push({ text: ' eventos ', bold: false })
      tokens.push({ text: idx === rest.length - 1 ? '.' : '; ', bold: false })
    })
  } else {
    tokens.push({ text: '.', bold: false })
  }

  return tokens
}

function countUniqueByAliases(items, aliases) {
  const set = new Set()
  for (const row of items) {
    const value = String(getFieldByAliases(row, aliases, '')).trim()
    if (value) set.add(value)
  }
  return set.size
}

function summarizeEventosAdversos(tipoLluviasItems) {
  const totalsByType = {}
  EVENT_TYPE_COLUMNS.forEach((eventType) => {
    totalsByType[eventType.key] = tipoLluviasItems.reduce((acc, row) => acc + toNumber(row[eventType.key]), 0)
  })

  const totalEventos = tipoLluviasItems.reduce((acc, row) => acc + toNumber(row.NumeroEventos), 0)
  const ordered = EVENT_TYPE_COLUMNS
    .map((eventType) => ({
      key: eventType.key,
      label: eventType.label,
      total: totalsByType[eventType.key],
      pct: totalEventos > 0 ? (totalsByType[eventType.key] / totalEventos) * 100 : 0,
    }))
    .filter((eventType) => eventType.total > 0)
    .sort((a, b) => b.total - a.total)

  return { totalEventos, ordered }
}

function buildPuntosImportantesLines(items, tipoLluviasItems, dpaTotals = null) {
  const adverse = summarizeEventosAdversos(tipoLluviasItems)
  const totalEventosFallback = items.reduce((acc, row) => acc + toNumber(row.NumeroEventos), 0)
  const totalEventos = adverse.totalEventos > 0 ? adverse.totalEventos : totalEventosFallback
  const provinciasCount = Number.isFinite(Number(dpaTotals?.TotalProvincias))
    ? Number(dpaTotals.TotalProvincias)
    : countUniqueByAliases(items, ['Provincia'])
  const cantonesCount = Number.isFinite(Number(dpaTotals?.TotalCantones))
    ? Number(dpaTotals.TotalCantones)
    : countUniqueByAliases(items, ['Canton', 'CantonNombre'])
  const parroquiasCount = Number.isFinite(Number(dpaTotals?.TotalParroquias))
    ? Number(dpaTotals.TotalParroquias)
    : countUniqueByAliases(items, ['Parroquia', 'ParroquiaNombre'])
  const principales = adverse.ordered.slice(0, 8)

  const principalesText = principales.length
    ? `${principales.map((x) => `${x.label} (${formatPct(x.pct)}%)`).join(', ')} entre los principales.`
    : 'sin eventos recurrentes identificables.'

  const line1 = `Desde el 1 de enero de 2026 hasta la presente fecha se han registrado ${formatInt(totalEventos)} eventos adversos por lluvias afectando a ${formatInt(provinciasCount)} provincias, ${formatInt(cantonesCount)} cantones y ${formatInt(parroquiasCount)} parroquias. Los eventos mas recurrentes corresponden a: ${principalesText}`

  const topImpactProvincias = buildImpactRanking(items, 8).map((x) => x.provincia)
  const line2 = topImpactProvincias.length
    ? `En lo que va del anio 2026, las provincias con mayor impacto a la poblacion son: ${topImpactProvincias.join(', ')}.`
    : 'En lo que va del anio 2026, no hay datos suficientes para identificar provincias con mayor impacto a la poblacion.'

  return { line1, line2, adverse, totalEventos }
}

function drawBulletText(doc, text, x, y, maxWidth, lineHeight = 4.1) {
  const bulletX = x
  const textX = x + 4
  const lines = doc.splitTextToSize(text, maxWidth - 4)
  doc.text('-', bulletX, y)
  doc.text(lines, textX, y)
  return y + lines.length * lineHeight + 1
}

function buildTipoLluviasTableData(items) {
  const dataRows = items.map((row, index) => {
    const out = { __isTotal__: false }
    TIPO_LLUVIAS_TABLE_COLUMNS.forEach((col) => {
      if (col.type === 'index') out[col.key] = index + 1
      else if (col.type === 'text') out[col.key] = String(row[col.key] ?? 'N/D')
      else out[col.key] = toNumber(row[col.key])
    })
    return out
  })

  const totals = { __isTotal__: true }
  TIPO_LLUVIAS_TABLE_COLUMNS.forEach((col) => {
    if (col.type === 'index') totals[col.key] = ''
    else if (col.type === 'text') totals[col.key] = 'Total General'
    else totals[col.key] = dataRows.reduce((acc, r) => acc + toNumber(r[col.key]), 0)
  })

  return [...dataRows, totals]
}

function drawVerticalHeaderLabel(doc, col, cell) {
  const label = String(col.label || '').replace(/\\s+/g, ' ').trim()
  const centerX = cell.x + cell.width / 2
  const startY = cell.y + cell.height - 2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(255, 255, 255)
  doc.text(label, centerX, startY, { angle: 90, align: 'left' })
}
function buildTableData(items) {
  const dataRows = items.map((row, index) => {
    const out = { __isTotal__: false }

    DETAIL_COLUMNS.forEach((col) => {
      if (col.type === 'index') out[col.key] = index + 1
      else if (col.type === 'text') out[col.key] = String(getFieldByAliases(row, col.aliases, 'N/D'))
      else out[col.key] = toNumber(getFieldByAliases(row, col.aliases, 0))
    })

    return out
  })

  const totals = { __isTotal__: true }
  DETAIL_COLUMNS.forEach((col) => {
    if (col.type === 'index') totals[col.key] = ''
    else if (col.type === 'text') totals[col.key] = 'Total General'
    else totals[col.key] = dataRows.reduce((acc, r) => acc + toNumber(r[col.key]), 0)
  })

  return [...dataRows, totals]
}

function heatColorByPercent(percent) {
  if (percent <= 0.02) return [102, 187, 106]
  if (percent <= 0.2) return [253, 216, 53]
  if (percent <= 0.5) return [249, 168, 37]
  if (percent <= 0.75) return [244, 81, 30]
  return [229, 57, 53]
}

function drawRichTextTokens(doc, tokens, x, y, maxWidth, lineHeight = 4.2) {
  let cursorX = x
  let cursorY = y

  for (const token of tokens) {
    const words = token.text.split(' ')
    doc.setFont('helvetica', token.bold ? 'bold' : 'normal')

    for (let i = 0; i < words.length; i += 1) {
      const word = i === words.length - 1 ? words[i] : `${words[i]} `
      const wordWidth = doc.getTextWidth(word)

      if (cursorX + wordWidth > x + maxWidth) {
        cursorX = x
        cursorY += lineHeight
      }

      doc.text(word, cursorX, cursorY)
      cursorX += wordWidth
    }
  }

  doc.setFont('helvetica', 'normal')
  return cursorY + lineHeight
}

function drawWrappedText(doc, text, x, y, maxWidth, lineHeight = 4.2) {
  const lines = doc.splitTextToSize(text, maxWidth)
  doc.text(lines, x, y)
  return y + lines.length * lineHeight
}

function drawSectionTitle(doc, text, y) {
  doc.setTextColor(...BLUE)
  doc.setFontSize(12)
  doc.text(text, PAGE.left, y)
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.4)
  doc.line(PAGE.left, y + 1.5, PAGE.left + PAGE.width, y + 1.5)
  return y + 6
}

function drawSummaryCard(doc, x, y, w, h, label, value) {
  doc.setDrawColor(...BORDER_BLUE)
  doc.setFillColor(...LIGHT_BLUE)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'FD')

  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  doc.text(label, x + 3, y + 6)

  doc.setTextColor(...BLUE)
  doc.setFontSize(14)
  doc.text(String(value), x + w - 3, y + 6.5, { align: 'right' })
}

function drawSummaryGrid(doc, resumen, startY) {
  const cards = [
    ['Personas afectadas', formatInt(resumen.personasAfectadas)],
    ['Familias afectadas', formatInt(resumen.familiasAfectadas)],
    ['Viviendas afectadas', formatInt(resumen.viviendasAfectadas)],
    ['Puentes afectados', formatInt(resumen.puentesAfectados)],
    ['Puentes destruidos', formatInt(resumen.puentesDestruidos)],
    ['Km vias afectadas', resumen.kmViasAfectadas.toFixed(2)],
  ]

  const cols = 3
  const gap = 5
  const cardH = 12
  const cardW = (PAGE.width - gap * (cols - 1)) / cols

  cards.forEach((item, idx) => {
    const col = idx % cols
    const row = Math.floor(idx / cols)
    const x = PAGE.left + col * (cardW + gap)
    const y = startY + row * (cardH + 4)
    drawSummaryCard(doc, x, y, cardW, cardH, item[0], item[1])
  })

  const rows = Math.ceil(cards.length / cols)
  return startY + rows * cardH + (rows - 1) * 4 + 3
}

export function exportEventosLluviasPdf({ items = [], tipoLluviasItems = [], dpaTotals = null, provinciaId }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const now = new Date()
  const dateLabel = now.toLocaleDateString('es-EC')
  const timeLabel = now.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })

  const resumen = summarize(items)
  const puntosImportantes = buildPuntosImportantesLines(items, tipoLluviasItems, dpaTotals)
  const introTokens = buildImpactTokens(items, 8)
  const fechaInicioEventosAdversos = getFieldByAliases(
    tipoLluviasItems[0] || {},
    ['fecha_inicio', 'FechaInicio', 'Fecha_Inicio'],
    'N/A'
  )
  const tipoLluviasTableData = buildTipoLluviasTableData(tipoLluviasItems)
  const tableData = buildTableData(items)
  const tipoLluviasBodyRows = tipoLluviasTableData.map((r) => TIPO_LLUVIAS_TABLE_COLUMNS.map((c) => r[c.key]))
  const bodyRows = tableData.map((r) => DETAIL_COLUMNS.map((c) => r[c.key]))
  const filtroText = provinciaId ? `ProvinciaID: ${provinciaId}` : 'ProvinciaID: Todos'

  const maxEventos = Math.max(1, ...tableData.filter((r) => !r.__isTotal__).map((r) => toNumber(r.NumeroEventos)))
  const maxImpactadas = Math.max(1, ...tableData.filter((r) => !r.__isTotal__).map((r) => toNumber(r.ImpactadasPersonas)))

  let y = PAGE.top

  doc.setTextColor(...BLUE)
  doc.setFontSize(16)
  doc.text('SITREP - Lluvias', PAGE.left, y)
  y += 6

  doc.setTextColor(71, 85, 105)
  doc.setFontSize(9)
  y = drawWrappedText(doc, `Fecha de emision: ${dateLabel} ${timeLabel}`, PAGE.left, y, PAGE.width)
  y = drawWrappedText(doc, filtroText, PAGE.left, y, PAGE.width)
  y += 2

  y = drawSectionTitle(doc, '1. Puntos importantes', y)
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  y = drawBulletText(doc, puntosImportantes.line1, PAGE.left, y, PAGE.width)
  y = drawBulletText(doc, puntosImportantes.line2, PAGE.left, y, PAGE.width)
  y += 2

  y = drawSectionTitle(doc, '3. Eventos Adversos y Afectaciones - Resumen', y)
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  y = drawWrappedText(
    doc,
    `Desde ${fechaInicioEventosAdversos} a la fecha se registraron un total de ${formatInt(puntosImportantes.totalEventos)} eventos adversos, distribuidos de la siguiente manera:`,
    PAGE.left,
    y,
    PAGE.width
  )
  y += 1
  autoTable(doc, {
    startY: y,
    head: [TIPO_LLUVIAS_TABLE_COLUMNS.map((c) => c.label)],
    body: tipoLluviasBodyRows,
    theme: 'grid',
    margin: { left: PAGE.left, right: PAGE.right },
    styles: { fontSize: 7, cellPadding: 0.8, halign: 'center', valign: 'middle', lineWidth: 0.15 },
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      lineColor: [200, 210, 230],
      minCellHeight: 40,
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    didParseCell: (hookData) => {
      const { cell, column, row, section } = hookData
      if (section === 'head') {
        const col = TIPO_LLUVIAS_TABLE_COLUMNS[column.index]
        if (col?.vertical) {
          cell.text = ['']
          cell.styles.minCellHeight = 40
        }
      }
      if (section === 'body') {
        const isTotalRow = row.index === tipoLluviasBodyRows.length - 1
        if (isTotalRow) {
          cell.styles.fillColor = BLUE
          cell.styles.textColor = [255, 255, 255]
          cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawCell: (hookData) => {
      const { cell, column, section } = hookData
      if (section !== 'head') return
      const col = TIPO_LLUVIAS_TABLE_COLUMNS[column.index]
      if (!col?.vertical) return
      drawVerticalHeaderLabel(doc, col, cell)
    },
  })
  y = doc.lastAutoTable.finalY + 3

  y += 3
  y = drawSectionTitle(doc, '4. Eventos Peligrosos y Afectaciones - Resumen', y)
  y = drawSummaryGrid(doc, resumen, y)

  y += 3
  y = drawSectionTitle(doc, '5. Detalle de afectaciones por provincia (de 1 de enero del anio 2026 a la fecha)', y)
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(9)
  y = drawRichTextTokens(doc, introTokens, PAGE.left, y, PAGE.width)
  y += 2

  autoTable(doc, {
    startY: y,
    head: [DETAIL_COLUMNS.map((c) => c.label)],
    body: bodyRows,
    theme: 'grid',
    margin: { left: PAGE.left, right: PAGE.right },
    styles: { fontSize: 7, cellPadding: 0.8, halign: 'center', valign: 'middle', lineWidth: 0.15 },
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      lineColor: [200, 210, 230],
      minCellHeight: 40,
    },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    didParseCell: (hookData) => {
      const { cell, column, row, section } = hookData

      if (section === 'head') {
        const col = DETAIL_COLUMNS[column.index]
        if (col?.vertical) {
          cell.text = ['']
          cell.styles.minCellHeight = 40
        }
      }

      if (section === 'body') {
        const isTotalRow = row.index === bodyRows.length - 1
        const colDef = DETAIL_COLUMNS[column.index]

        if (isTotalRow) {
          cell.styles.fillColor = BLUE
          cell.styles.textColor = [255, 255, 255]
          cell.styles.fontStyle = 'bold'
          return
        }

        if (colDef?.heat) {
          const rawVal = toNumber(cell.raw)
          const ratio = colDef.key === 'NumeroEventos' ? rawVal / maxEventos : rawVal / maxImpactadas
          cell.styles.fillColor = heatColorByPercent(ratio)
          cell.styles.textColor = [20, 20, 20]
          if (ratio > 0.75) cell.styles.textColor = [255, 255, 255]
        }
      }
    },
    didDrawCell: (hookData) => {
      const { cell, column, section } = hookData
      if (section !== 'head') return

      const col = DETAIL_COLUMNS[column.index]
      if (!col?.vertical) return
      drawVerticalHeaderLabel(doc, col, cell)
    },
  })

  const fileSuffix = provinciaId ? `provincia_${provinciaId}` : 'todas'
  doc.save(`sitrep_lluvias_preview_style_${fileSuffix}.pdf`)
}

