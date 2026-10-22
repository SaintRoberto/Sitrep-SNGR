import fs from 'node:fs/promises'
import path from 'node:path'
import { buildWaterBodiesPdf } from '../../public_frontend/src/utils/waterBodiesPdf.js'


function parseEnv(source) {
  return Object.fromEntries(source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, '')]
    }))
}

const root = path.resolve(import.meta.dirname, '..', '..')
const env = parseEnv(await fs.readFile(path.join(root, 'public_frontend', '.env'), 'utf8'))
const apiBase = env.VITE_API_LOCAL_URL || 'http://127.0.0.1:5000'
const apiKey = env.VITE_PUBLIC_API_KEY
const request = async (endpoint) => {
  const separator = endpoint.includes('?') ? '&' : '?'
  const response = await fetch(`${apiBase}${endpoint}${separator}api_key=${encodeURIComponent(apiKey)}`)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
  return payload.items || []
}

const [overflowed, rising] = await Promise.all([
  request('/api/public/cuerpos-hidricos-desbordados-por-lluvias'),
  request('/api/public/cuerpos-hidricos-tendencia-a-aumentar-por-lluvias'),
])

const document = await buildWaterBodiesPdf({
  waterBodiesOverflowed: overflowed,
  waterBodiesRising: rising,
  sitrepNumber: '178',
  endDate: '2026-10-22T07:00',
  assetBaseUrl: 'http://127.0.0.1:5173/',
})
const outputDirectory = path.join(root, 'output', 'pdf')
await fs.mkdir(outputDirectory, { recursive: true })
const outputPath = path.join(outputDirectory, 'Reporte de estado de cuerpos hídricos.pdf')
await fs.writeFile(outputPath, Buffer.from(document.output('arraybuffer')))
console.log(JSON.stringify({ outputPath, overflowed: overflowed.length, rising: rising.length }))
