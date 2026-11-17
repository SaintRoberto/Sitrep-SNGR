export function cleanHighImpactResponseLines(value) {
  const lines = String(value ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const activitiesIndex = lines.findIndex((line) => /^actividades de ejecuci[oó]n\s*:/i.test(line))
  if (activitiesIndex < 0) return lines
  return lines.slice(activitiesIndex)
}

export function cleanHighImpactResponse(value) {
  return cleanHighImpactResponseLines(value).join('\n')
}

export function highImpactResponseActions(event) {
  if (Array.isArray(event?.Actividades)) {
    return event.Actividades.map((activity) => {
      const date = formatHighImpactEventDate(activity?.Fecha)
      const institution = String(activity?.Institucion ?? '').trim()
      const description = String(activity?.Descripcion ?? '').trim()
      const owner = [date, institution].filter(Boolean).join(' ')
      return { prefix: owner ? `${owner}:` : '', description }
    }).filter((action) => action.prefix || action.description)
  }
  return cleanHighImpactResponseLines(event?.CoordinacionYRespuesta)
    .map((description) => ({ prefix: '', description }))
}

function responseSentence(value) {
  const text = String(value ?? '').trim()
  if (!text || /[.!?]$/.test(text)) return text
  return `${text}.`
}

function responseDescription(activity, institution) {
  const description = removeRepeatedInstitutionPrefix(institution, activity?.Descripcion)
  const normalizedState = String(activity?.Estado ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
  const finalized = /^finalizad[oa]$/.test(normalizedState)
  return {
    description: finalized ? String(description).trim().replace(/[.\s]+$/, '') : responseSentence(description),
    finalized,
  }
}

function removeRepeatedInstitutionPrefix(institution, description) {
  const institutionText = String(institution ?? '').trim()
  const descriptionText = String(description ?? '').trim()
  if (!institutionText || !descriptionText) return descriptionText

  const variants = new Set([institutionText])
  if (/^GAD-[CPM]\s+/i.test(institutionText)) variants.add(institutionText.replace(/^GAD-[CPM]\s+/i, 'GAD '))

  const compactInstitution = institutionText.replace(/[^A-Z]/gi, '').toUpperCase()
  const knownAliases = {
    PPNN: ['Policía Nacional', 'Policia Nacional'],
    CCFFAA: ['FFAA', 'Fuerzas Armadas'],
  }
  ;(knownAliases[compactInstitution] || []).forEach((alias) => variants.add(alias))

  const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
  for (const variant of [...variants].sort((left, right) => right.length - left.length)) {
    const match = new RegExp(`^${escapePattern(variant)}(?=$|\\s|[,:;-])\\s*[:;,–—-]?\\s*`, 'iu').exec(descriptionText)
    if (match) return descriptionText.slice(match[0].length).trim()
  }
  return descriptionText
}

export function highImpactResponseActionGroups(event) {
  if (!Array.isArray(event?.Actividades)) {
    return cleanHighImpactResponseLines(event?.CoordinacionYRespuesta).map((description) => ({
      date: '',
      actions: [{ institution: '', description: responseSentence(description) }],
    }))
  }

  const groups = new Map()
  event.Actividades.forEach((activity) => {
    const date = formatHighImpactEventDate(activity?.Fecha)
    if (!groups.has(date)) groups.set(date, { date, actions: [] })
    const institution = String(activity?.Institucion ?? '').trim()
    const response = responseDescription(activity, institution)
    groups.get(date).actions.push({
      institution,
      description: response.description,
      finalized: response.finalized,
    })
  })
  return [...groups.values()].filter((group) => group.actions.some((action) => action.institution || action.description))
}

export function highImpactResponseActionLines(event) {
  return highImpactResponseActionGroups(event).map((group) => group.actions.map((action, index) => {
    const date = index === 0 && group.date ? `${group.date}:` : ''
    const description = `${action.description}${action.finalized ? ' (finalizado).' : ''}`
    return [date, action.institution, description].filter(Boolean).join(' ')
  }).join(' '))
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
