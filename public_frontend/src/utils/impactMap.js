import { ECUADOR_PROVINCES as RAW_ECUADOR_PROVINCES } from './ecuadorProvinceGeometry.js'

const CHIMBORAZO_GAP_BOUNDARY = [
  [311.3, 336.3], [308.1, 337.7], [314.7, 342.5], [315.9, 341.8],
  [316.2, 345.0], [317.6, 345.1], [311.2, 359.6], [312.3, 361.2],
  [309.4, 355.8], [302.9, 351.2], [302.4, 347.9], [298.0, 345.9],
  [293.0, 346.6],
]

function closeChimborazoGeometryGap(province) {
  if (province.name !== 'Chimborazo') return province
  const ring = province.paths?.[0]?.[0]
  if (!ring) return province
  const start = ring.findIndex(([x, y]) => x === 312.0 && y === 331.9)
  const end = ring.findIndex(([x, y]) => x === 292.0 && y === 342.5)
  if (start < 0 || end <= start) return province
  const correctedRing = [...ring.slice(0, start + 1), ...CHIMBORAZO_GAP_BOUNDARY, ...ring.slice(end)]
  return { ...province, paths: [[correctedRing], ...province.paths.slice(1)] }
}

const ECUADOR_PROVINCES = RAW_ECUADOR_PROVINCES.map(closeChimborazoGeometryGap)

export const IMPACT_COLORS = {
  none: { hex: '#f3f7fb', rgb: [243, 247, 251] },
  low: { hex: '#42ba3c', rgb: [66, 186, 60] },
  yellowGreen: { hex: '#b8ec8a', rgb: [184, 236, 138] },
  medium: { hex: '#ffe063', rgb: [255, 224, 99] },
  high: { hex: '#ffa05a', rgb: [255, 160, 90] },
  maximum: { hex: '#ff3150', rgb: [255, 49, 80] },
}

export function normalizeProvinceName(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export function buildProvinceImpactMap(items) {
  const totals = new Map()
  items.forEach((row) => {
    const province = normalizeProvinceName(row?.Provincia)
    if (!province) return
    const value = Number(String(row?.ImpactadasPersonas ?? 0).replace(',', '.')) || 0
    totals.set(province, (totals.get(province) || 0) + value)
  })
  const values = [...totals.values()]
  return { totals, maximum: Math.max(0, ...values) }
}

export function provinceImpactValue(summary, provinceName) {
  return summary.totals.get(normalizeProvinceName(provinceName))
}

export function impactLevel(value, maximum, hasData = true) {
  if (!hasData) return 'none'
  const numericValue = Number(value || 0)
  if (!Number.isFinite(numericValue) || numericValue < 1) return 'none'
  if (numericValue <= 160) return 'low'
  if (numericValue <= 1600) return 'yellowGreen'
  if (numericValue <= 8000) return 'medium'
  if (numericValue <= 80000) return 'high'
  return 'maximum'
}

export function impactColor(value, maximum, hasData = true) {
  return IMPACT_COLORS[impactLevel(value, maximum, hasData)]
}

export function impactCellClass(value, maximum) {
  return `impact-${impactLevel(value, maximum, true)}`
}

export function provincePathData(province) {
  return province.paths
    .flatMap((polygon) => polygon.map((ring) => ring.map(([x, y], index) => `${index ? 'L' : 'M'}${x},${y}`).join(' ') + ' Z'))
    .join(' ')
}

export function shortProvinceLabel(name) {
  const labels = {
    'Santo Domingo de los Tsáchilas': 'SANTO DOMINGO',
    'Morona Santiago': 'MORONA STGO.',
    'Zamora Chinchipe': 'ZAMORA CH.',
  }
  return labels[name] || name.toUpperCase()
}

export function impactLegend() {
  return [
    { level: 'none', label: 'Nivel0', color: IMPACT_COLORS.none },
    { level: 'low', label: 'Nivel1 (1-160)', color: IMPACT_COLORS.low },
    { level: 'yellowGreen', label: 'Nivel2 (161-1600)', color: IMPACT_COLORS.yellowGreen },
    { level: 'medium', label: 'Nivel3 (1601-8000)', color: IMPACT_COLORS.medium },
    { level: 'high', label: 'Nivel4 (8001-80000)', color: IMPACT_COLORS.high },
    { level: 'maximum', label: 'Nivel5 (80001 o mas)', color: IMPACT_COLORS.maximum },
  ]
}

export { ECUADOR_PROVINCES }
