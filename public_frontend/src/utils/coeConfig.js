export const TOTAL_CANTONS_BY_PROVINCE = [
  ['Azuay', 15], ['Bolívar', 7], ['Cañar', 7], ['Carchi', 6], ['Chimborazo', 10], ['Cotopaxi', 7],
  ['El Oro', 14], ['Esmeraldas', 8], ['Galápagos', 3], ['Guayas', 25], ['Imbabura', 6], ['Loja', 16],
  ['Los Ríos', 13], ['Manabí', 22], ['Morona Santiago', 13], ['Napo', 5], ['Orellana', 4], ['Pastaza', 4],
  ['Pichincha', 8], ['Santa Elena', 3], ['Santo Domingo de los Tsáchilas', 2], ['Sucumbíos', 7],
  ['Tungurahua', 9], ['Zamora Chinchipe', 9],
]

export const TOTAL_CANTONS_NATIONAL = TOTAL_CANTONS_BY_PROVINCE.reduce((total, [, cantons]) => total + cantons, 0)

export function normalizeTerritory(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

export function isActiveCoe(row) {
  return normalizeTerritory(row?.Estado) === 'activado'
}

export function uniqueActiveCoeRows(items, keys) {
  const seen = new Set()
  return [...items]
    .filter(isActiveCoe)
    .sort((left, right) => String(right?.FechaInicial ?? '').localeCompare(String(left?.FechaInicial ?? '')))
    .filter((row) => {
      const key = keys.map((field) => normalizeTerritory(row?.[field])).join('|')
      if (!key.replaceAll('|', '') || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildMunicipalCoeSummary(items) {
  const activeRows = uniqueActiveCoeRows(items, ['Provincia', 'Canton'])
  const activeByProvince = new Map()
  activeRows.forEach((row) => {
    const province = normalizeTerritory(row?.Provincia)
    if (!province) return
    activeByProvince.set(province, (activeByProvince.get(province) || 0) + 1)
  })

  const rows = TOTAL_CANTONS_BY_PROVINCE.map(([province, totalCantons]) => {
    const activeCantons = activeByProvince.get(normalizeTerritory(province)) || 0
    return {
      Provincia: province,
      TotalCantones: totalCantons,
      CantonesActivos: activeCantons,
      PorcentajeActivacion: totalCantons ? Math.round((activeCantons / totalCantons) * 100) : 0,
    }
  })
  const totalActive = rows.reduce((total, row) => total + row.CantonesActivos, 0)
  return {
    rows,
    totalCantons: TOTAL_CANTONS_NATIONAL,
    totalActive,
    globalPercentage: TOTAL_CANTONS_NATIONAL ? Math.round((totalActive / TOTAL_CANTONS_NATIONAL) * 100) : 0,
  }
}

export function coeActivationClass(value) {
  const percentage = Number(value) || 0
  if (percentage === 0) return 'coe-pct-red'
  if (percentage <= 50) return 'coe-pct-orange'
  if (percentage < 80) return 'coe-pct-yellow'
  return 'coe-pct-green'
}
