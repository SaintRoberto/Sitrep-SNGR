export function cleanHighImpactResponseLines(value) {
  const lines = String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const activitiesIndex = lines.findIndex((line) => /^actividades de ejecuci[oó]n\s*:/i.test(line))
  if (activitiesIndex < 0) return lines
  return lines.slice(activitiesIndex)
}

export function cleanHighImpactResponse(value) {
  return cleanHighImpactResponseLines(value).join('\n')
}

export function formatHighImpactEventDate(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const calendarDate = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw)
  if (calendarDate) return `${calendarDate[1]}-${calendarDate[2]}-${calendarDate[3]}`
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return [
    parsed.getUTCFullYear(),
    String(parsed.getUTCMonth() + 1).padStart(2, '0'),
    String(parsed.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

export function highImpactEventMetaItems(event) {
  const date = formatHighImpactEventDate(event?.Fecha)
  const time = String(event?.Hora ?? '').trim()
  return [
    { kind: 'type', value: String(event?.TipoEvento ?? '').trim() },
    { kind: 'datetime', value: [date, time].filter(Boolean).join(' ') },
  ].filter((item) => item.value)
}

export function highImpactEventMetaText(event) {
  return highImpactEventMetaItems(event).map((item) => item.value).join('  •  ')
}
