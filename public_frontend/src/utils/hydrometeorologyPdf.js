import * as pdfjs from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'

// Vite crea y publica un Worker real para evitar el fallback "fake worker",
// cuya importación dinámica falla en desarrollo y en servidores con MIME estricto.
pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()

const REGIONS = ['LITORAL', 'INTERANDINA', 'AMAZÓNICA', 'INSULAR']
const MAX_FILE_SIZE = 30 * 1024 * 1024

function normalizeText(value) {
  return String(value || '')
    .replace(/\u00ad/g, '')
    .replace(/-\s*\n\s*(?=[a-záéíóúñ])/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function cleanField(value) {
  return normalizeText(value).replace(/\s+/g, ' ').replace(/[.;:,]+$/, '').trim()
}

function matchField(text, expression) {
  return cleanField(text.match(expression)?.[1] || '')
}

function canvasToData(canvas, box) {
  const x = Math.max(0, Math.round(box.x))
  const y = Math.max(0, Math.round(box.y))
  const width = Math.max(1, Math.min(canvas.width - x, Math.round(box.width)))
  const height = Math.max(1, Math.min(canvas.height - y, Math.round(box.height)))
  const result = document.createElement('canvas')
  result.width = width
  result.height = height
  result.getContext('2d').drawImage(canvas, x, y, width, height, 0, 0, width, height)
  return { image: result.toDataURL('image/png'), aspectRatio: width / height, canvas: result }
}

function positionedText(viewport, textContent) {
  const scale = viewport.scale || 1
  return textContent.items
    .filter((item) => String(item.str || '').trim())
    .map((item) => {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5])
      return {
        text: String(item.str).trim(),
        x,
        y: y - Math.abs(item.height || item.transform[3] || 0),
        width: Math.abs(item.width || 0) * scale,
        height: Math.abs(item.height || item.transform[3] || 0) * scale,
      }
    })
}

function findText(items, expression) {
  return items.find((item) => expression.test(item.text)) || null
}

function textInBox(items, { left, right, top, bottom }) {
  const selected = items.filter((item) => item.x >= left && item.x <= right && item.y >= top && item.y <= bottom)
  const lines = []
  selected.sort((a, b) => a.y - b.y || a.x - b.x).forEach((item) => {
    let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= Math.max(2, item.height * 0.45))
    if (!line) {
      line = { y: item.y, height: item.height, parts: [] }
      lines.push(line)
    }
    line.parts.push(item)
  })
  lines.sort((a, b) => a.y - b.y)
  const heights = lines.map((line) => line.height).filter(Boolean).sort((a, b) => a - b)
  const medianHeight = heights[Math.floor(heights.length / 2)] || 10
  let previousY = null
  return lines.map((line) => {
    const prefix = previousY !== null && line.y - previousY > medianHeight * 1.5 ? '\n' : ''
    previousY = line.y
    return `${prefix}${line.parts.sort((a, b) => a.x - b.x).map((part) => part.text).join(' ')}`
  }).join('\n')
}

async function readPage(page, scale = 2) {
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
  const textContent = await page.getTextContent()
  return {
    canvas,
    viewport,
    items: positionedText(viewport, textContent),
    text: normalizeText(textContent.items.map((item) => item.str).join(' ')),
  }
}

function extractWarningText(pageData) {
  const raw = pageData.text
  const number = matchField(raw, /Bolet[ií]n\s+Meteorol[oó]gico\s+Nro\.?\s*([^\s]+)/i)
  const status = matchField(raw, /Estatus\s*:\s*([^\n]+?)(?=Fecha y hora|PREDICCI[ÓO]N|NIVEL)/i)
  const issuedAt = matchField(raw, /Fecha y hora de emisi[oó]n\s*:\s*(.+?)(?=Vigencia\s*:)/i)
  const validity = matchField(raw, /Vigencia\s*:\s*(.+?)(?=NIVEL\s+AMENAZA)/i)
  const phenomenon = matchField(raw, /FEN[ÓO]MENO\s*:\s*(.+?)(?=DESCRIPCI[ÓO]N)/i)

  const descriptionAnchor = findText(pageData.items, /^DESCRIPCI[ÓO]N$/i)
  const estimateAnchor = findText(pageData.items, /Estimaci[oó]n de/i)
  let description = ''
  if (descriptionAnchor && estimateAnchor) {
    description = textInBox(pageData.items, {
      left: descriptionAnchor.x - 3,
      right: pageData.canvas.width * 0.96,
      top: descriptionAnchor.y + descriptionAnchor.height,
      bottom: estimateAnchor.y - 3,
    })
  }
  const paragraphs = normalizeText(description).split(/\n\s*\n/).map((part) => cleanField(part)).filter(Boolean).slice(0, 2)

  const affected = raw.match(/ZONAS AFECTADAS\s*(.+?)(?=Secretar[ií]a|Elaborado por|ATENCI[ÓO]N A)/i)?.[1] || ''
  const affectedText = cleanField(affected.replace(/[•▪]/g, '\n'))
  const introFields = [
    number && `boletín meteorológico Nro. ${number}`,
    status && `estatus ${status.toLowerCase()}`,
    phenomenon && `fenómeno: ${phenomenon}`,
    issuedAt && `emitido el ${issuedAt}`,
    validity && `vigencia ${validity}`,
  ].filter(Boolean)
  if (introFields.length < 4 || paragraphs.length < 1) {
    throw new Error('No se pudieron identificar los datos esenciales de la advertencia meteorológica.')
  }
  const introduction = `Según el ${introFields.join(', ')}.`
  return [introduction, ...paragraphs, affectedText].filter(Boolean).join('\n\n')
}

function cropWarning(pageData) {
  const { canvas, items } = pageData
  const description = findText(items, /^DESCRIPCI[ÓO]N$/i)
  const estimate = findText(items, /Estimaci[oó]n de/i)
  const figure = findText(items, /^Fig\.?\s*1\s*:/i)
  const following = findText(items, /^(Este escenario|Entre los principales factores)/i)
  if (!description || !estimate || !figure) throw new Error('No se pudo localizar el mapa o la tabla de la advertencia.')

  const left = canvas.width * 0.065
  const mapRight = Math.max(left + 50, description.x - canvas.width * 0.008)
  const mapTop = Math.max(0, description.y - canvas.height * 0.005)
  const mapBottom = Math.max(mapTop + 50, figure.y - canvas.height * 0.008)
  const tableTop = Math.max(0, estimate.y - canvas.height * 0.012)
  const tableBottom = following?.y ? following.y - canvas.height * 0.008 : tableTop + canvas.height * 0.14
  const regionHeader = items.find((item) => (
    /^REGI[ÓO]N$/i.test(item.text)
    && item.y >= estimate.y
    && item.y <= tableBottom
  ))
  const tableContentLeft = regionHeader?.x ?? estimate.x
  const tableLeft = Math.max(
    mapRight + canvas.width * 0.008,
    tableContentLeft - canvas.width * 0.035,
  )

  const map = canvasToData(canvas, { x: left, y: mapTop, width: mapRight - left, height: mapBottom - mapTop })
  const table = canvasToData(canvas, {
    x: tableLeft,
    y: tableTop,
    width: canvas.width * 0.94 - tableLeft,
    height: Math.max(30, tableBottom - tableTop),
  })
  return { map, table }
}

function isMapBlue(r, g, b) {
  return r >= 75 && r <= 180 && g >= 95 && g <= 200 && b >= 145 && b <= 235 && g - r >= 10 && b - r >= 30 && b - g >= 12
}

function findMapBox(canvas) {
  const scanWidth = 320
  const scanHeight = Math.max(1, Math.round(canvas.height * scanWidth / canvas.width))
  const scan = document.createElement('canvas')
  scan.width = scanWidth
  scan.height = scanHeight
  const context = scan.getContext('2d', { willReadFrequently: true })
  context.drawImage(canvas, 0, 0, scanWidth, scanHeight)
  const pixels = context.getImageData(0, 0, scanWidth, scanHeight).data
  const mask = new Uint8Array(scanWidth * scanHeight)
  const yStart = Math.round(scanHeight * 0.1)
  const yEnd = Math.round(scanHeight * 0.92)
  const xEnd = Math.round(scanWidth * 0.55)
  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = 0; x < xEnd; x += 1) {
      const index = y * scanWidth + x
      const offset = index * 4
      if (isMapBlue(pixels[offset], pixels[offset + 1], pixels[offset + 2])) mask[index] = 1
    }
  }

  const visited = new Uint8Array(mask.length)
  const components = []
  const stack = []
  for (let index = 0; index < mask.length; index += 1) {
    if (!mask[index] || visited[index]) continue
    visited[index] = 1
    stack.push(index)
    let count = 0
    let minX = scanWidth; let minY = scanHeight; let maxX = 0; let maxY = 0
    while (stack.length) {
      const current = stack.pop()
      const x = current % scanWidth
      const y = Math.floor(current / scanWidth)
      count += 1
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
      const neighbors = [current - 1, current + 1, current - scanWidth, current + scanWidth]
      neighbors.forEach((next) => {
        if (next < 0 || next >= mask.length || visited[next] || !mask[next]) return
        const nextX = next % scanWidth
        if (Math.abs(nextX - x) > 1) return
        visited[next] = 1
        stack.push(next)
      })
    }
    if (count >= 8) components.push({ count, minX, minY, maxX, maxY })
  }
  const largestComponent = Math.max(0, ...components.map((component) => component.count))
  const meaningful = components.filter((component) => component.count >= Math.max(8, largestComponent * 0.015))
  if (!meaningful.length) throw new Error('No se pudo identificar el área cartográfica de una página del pronóstico.')
  const minX = Math.min(...meaningful.map((part) => part.minX))
  const minY = Math.min(...meaningful.map((part) => part.minY))
  const maxX = Math.max(...meaningful.map((part) => part.maxX))
  const maxY = Math.max(...meaningful.map((part) => part.maxY))
  const scaleX = canvas.width / scanWidth
  const scaleY = canvas.height / scanHeight
  const pad = canvas.width * 0.035
  return {
    x: Math.max(0, minX * scaleX - pad),
    y: Math.max(0, minY * scaleY - pad),
    width: Math.min(canvas.width, (maxX + 1) * scaleX + pad) - Math.max(0, minX * scaleX - pad),
    height: Math.min(canvas.height, (maxY + 1) * scaleY + pad) - Math.max(0, minY * scaleY - pad),
  }
}

function classifyMap(canvas) {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  let total = 0; let rain = 0; let gray = 0; let yellow = 0
  for (let offset = 0; offset < pixels.length; offset += 16) {
    const r = pixels[offset]; const g = pixels[offset + 1]; const b = pixels[offset + 2]
    total += 1
    if (r < 100 && g < 145 && b > 110 && b < 230 && b - r > 45 && b - g > 20) rain += 1
    if (r > 65 && r < 195 && Math.abs(r - g) < 18 && Math.abs(g - b) < 18) gray += 1
    if (r > 190 && g > 140 && b < 100) yellow += 1
  }
  const rainRatio = rain / total
  const storm = rainRatio > 0.0028 && gray / total > 0.009 && yellow / total > 0.002
  if (storm) return 'lluvias con tormentas'
  if (rainRatio > 0.0015) return 'lluvias dispersas'
  if (gray / total > 0.006) return 'nubosidad variable'
  return 'condiciones mayormente despejadas'
}

function parsePdfDate(value) {
  const match = String(value || '').match(/(?:D:)?(\d{4})(\d{2})(\d{2})/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function forecastDate(metadata, filename) {
  const info = metadata?.info || {}
  let date = parsePdfDate(info.ModDate || info.CreationDate)
  if (!date) {
    const match = filename.match(/(\d{1,2})[-_.](\d{1,2})[-_.](\d{4})/)
    if (match) date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
  }
  if (!date || Number.isNaN(date.getTime())) return 'Fecha no indicada'
  const label = new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function nationalSummary(date, maps) {
  const groups = new Map()
  maps.forEach((map) => {
    if (!groups.has(map.condition)) groups.set(map.condition, [])
    groups.get(map.condition).push(map.region.charAt(0) + map.region.slice(1).toLowerCase())
  })
  const clauses = [...groups.entries()].map(([condition, regions]) => {
    const locations = regions.length === 1 ? `la región ${regions[0]}` : `las regiones ${regions.slice(0, -1).join(', ')} y ${regions.at(-1)}`
    return `${condition} en ${locations}`
  })
  return `De acuerdo con el informe meteorológico emitido el ${date}: Se observan ${clauses.join('; ')}.`
}

async function processWarning(pdf) {
  const page = await pdf.getPage(1)
  const pageData = await readPage(page, 2)
  const { map, table } = cropWarning(pageData)
  return {
    type: 'warning',
    label: 'Advertencia meteorológica',
    text: extractWarningText(pageData),
    mapImage: map.image,
    mapAspectRatio: map.aspectRatio,
    tableImage: table.image,
    tableAspectRatio: table.aspectRatio,
  }
}

async function processForecast(pdf, metadata, filename) {
  if (pdf.numPages < 4) throw new Error('El pronóstico por localidades debe contener las cuatro regiones.')
  const maps = []
  for (let index = 0; index < 4; index += 1) {
    const page = await pdf.getPage(index + 1)
    const pageData = await readPage(page, 1.5)
    const crop = canvasToData(pageData.canvas, findMapBox(pageData.canvas))
    maps.push({
      region: REGIONS[index],
      image: crop.image,
      aspectRatio: crop.aspectRatio,
      condition: classifyMap(crop.canvas),
    })
  }
  const date = forecastDate(metadata, filename)
  return {
    type: 'forecast',
    label: 'Pronóstico por localidades',
    date,
    maps,
    text: nationalSummary(date, maps),
  }
}

export async function processHydrometeorologyPdf(file) {
  if (!file) throw new Error('Selecciona un archivo PDF.')
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('El archivo debe ser un PDF.')
  if (file.size === 0) throw new Error('El PDF está vacío.')
  if (file.size > MAX_FILE_SIZE) throw new Error('El PDF supera el límite de 30 MB.')

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') throw new Error('El archivo no contiene una estructura PDF válida.')
  let pdf
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise
    if (!pdf.numPages) throw new Error('El PDF no contiene páginas.')
    const firstPage = await pdf.getPage(1)
    const firstText = normalizeText((await firstPage.getTextContent()).items.map((item) => item.str).join(' '))
    const metadata = await pdf.getMetadata().catch(() => ({ info: {} }))
    if (/Bolet[ií]n\s+Meteorol[oó]gico|Estatus\s*:\s*ADVERTENCIA|FEN[ÓO]MENO\s*:/i.test(firstText)) {
      return { ...(await processWarning(pdf)), filename: file.name }
    }
    if (/PRON[ÓO]STICO\s+POR\s+LOCALIDADES/i.test(firstText) || (pdf.numPages >= 4 && firstText.length < 80)) {
      return { ...(await processForecast(pdf, metadata, file.name)), filename: file.name }
    }
    throw new Error('El PDF no corresponde a una advertencia ni a un pronóstico por localidades del INAMHI.')
  } catch (error) {
    if (error?.message?.startsWith('El PDF') || error?.message?.startsWith('No se') || error?.message?.includes('pronóstico')) throw error
    console.error('Error al procesar el boletín hidrometeorológico:', error)
    const detail = String(error?.message || '').trim()
    throw new Error(`No se pudo abrir o procesar el PDF.${detail ? ` Detalle: ${detail}` : ''}`)
  } finally {
    await pdf?.destroy?.()
  }
}
