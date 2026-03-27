import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { exportEventosLluviasPdf } from './utils/pdfReport'

const API_ENV = import.meta.env.VITE_API_ENV || 'local'
const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL || 'http://localhost:5000'
const API_PROD_URL = import.meta.env.VITE_API_PROD_URL || ''
const PUBLIC_API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || ''
const DEBUG = import.meta.env.DEBUG === 'true' || false

const API_BASE_URL = API_ENV === 'prod' ? API_PROD_URL : API_LOCAL_URL

const ENDPOINTS = {
  lluvias: '/api/public/eventos-por-lluvias',
  noLluvias: '/api/public/eventos-no-por-lluvias',
  incendios: '/api/public/eventos-por-incendios-forestales',
  tipoLluvias: '/api/public/eventos-por-tipo-lluvias',
}

const TIPO_LABELS = {
  lluvias: 'lluvias',
  noLluvias: 'eventos no por lluvias',
  incendios: 'incendios forestales',
}

const DETAIL_COLS = [
  ['__no__', 'No.'],
  ['Provincia', 'Provincia'],
  ['NumeroEventos', 'Nro. Eventos'],
  ['ImpactadasPersonas', 'Personas Impactadas'],
  ['Extraviados', 'Personas Extraviadas'],
  ['Fallecidos', 'Personas Fallecidas'],
  ['Heridos', 'Personas Heridas'],
  ['AfectadosPersonas', 'Personas Afectadas'],
  ['DamnificadosPersonas', 'Personas Damnificadas'],
  ['AfectadosFamilias', 'Familias Afectadas'],
  ['DamnificadosFamilias', 'Familias Damnificadas'],
  ['AfectadosViviendas', 'Viviendas Afectadas'],
  ['DestruidosViviendas', 'Viviendas Destruidas'],
  ['AfectadosPuentes', 'Puentes Afectados'],
  ['DestruidosPuentes', 'Puentes Destruidos'],
  ['AfectadosPrivados', 'Bienes Privados Afectados'],
  ['DestruidosPrivados', 'Bienes Privados Destruidos'],
  ['AfectadosPublicos', 'Bienes Publicos Afectados'],
  ['DestruidosPublicos', 'Bienes Publicos Destruidos'],
  ['AfectadosEducativos', 'Centros Educativos Afectados'],
  ['DestruidosEducativos', 'Centros Educativos Destruidos'],
  ['FuncionalEducativos', 'Centros Educativos Funcionales'],
  ['AfectadosSalud', 'Centros Salud Afectados'],
  ['DestruidosSalud', 'Centros Salud Destruidos'],
  ['Evacuados', 'Evacuados'],
  ['AfectadosKilometros', 'Km Vias Afectadas'],
  ['AfectadosMetros', 'Metros Vias Afectadas'],
  ['AfectadosHectareas', 'Hectareas Afectadas'],
  ['PerdidosHectareas', 'Hectareas Perdidas'],
  ['QuemadasHectareas', 'Hectareas Quemadas'],
  ['AfectadosAnimales', 'Animales Afectados'],
  ['MuertosAnimales', 'Animales Muertos'],
]

const TIPO_LLUVIAS_COLS = [
  ['Provincia', 'Provincia'],
  ['NumeroEventos', 'Nro. Eventos'],
  ['Inundacion', 'Inundacion'],
  ['Deslizamiento', 'Deslizamiento'],
  ['Lluvias_Intensas', 'Lluvias Intensas'],
  ['Erosion_Hidrica', 'Erosion Hidrica'],
  ['Hundimiento', 'Hundimiento'],
  ['Aluvion', 'Aluvion'],
  ['Vendaval', 'Vendaval'],
  ['Caidas_Colapso', 'Caidas Colapso'],
  ['Tormenta_Electrica', 'Tormenta Electrica'],
  ['Granizada', 'Granizada'],
  ['Reptacion', 'Reptacion'],
  ['Avalancha', 'Avalancha'],
  ['Nevada', 'Nevada'],
  ['Exceso_Humedad', 'Exceso Humedad'],
  ['Torbellino', 'Torbellino'],
  ['Colapso_Infraestructura', 'Colapso Infraestructura'],
]

const EVENT_TYPES = [
  ['Inundacion', 'inundaciones'],
  ['Deslizamiento', 'deslizamientos'],
  ['Lluvias_Intensas', 'lluvias intensas'],
  ['Erosion_Hidrica', 'erosion hidrica'],
  ['Hundimiento', 'hundimientos'],
  ['Aluvion', 'aluviones'],
  ['Vendaval', 'vendavales'],
  ['Caidas_Colapso', 'caidas (colapsos)'],
  ['Tormenta_Electrica', 'tormentas electricas'],
  ['Granizada', 'granizadas'],
]

const SUMMARY_FIELDS = [
  ['AfectadosPersonas', 'Personas afectadas'],
  ['AfectadosFamilias', 'Familias afectadas'],
  ['AfectadosViviendas', 'Viviendas afectadas'],
  ['AfectadosPuentes', 'Puentes afectados'],
  ['DestruidosPuentes', 'Puentes destruidos'],
  ['AfectadosKilometros', 'Km vias afectadas'],
]

function n(v) {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}

function sortByNumeroEventosDesc(rows) {
  return [...rows].sort((a, b) => n(b?.NumeroEventos) - n(a?.NumeroEventos))
}

function formatInt(v) {
  return Math.round(v).toLocaleString('es-EC')
}

function formatPct(v) {
  return Number(v).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function prettifyLabel(key) {
  return String(key || '')
    .replaceAll('_', ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
}

function getTopNumericColumns(items, limit = 8, excludeKeys = []) {
  if (!items.length) return []

  const excluded = new Set(excludeKeys)
  const sums = new Map()

  items.forEach((row) => {
    Object.entries(row || {}).forEach(([key, value]) => {
      if (excluded.has(key)) return
      const valueNum = n(value)
      if (!Number.isFinite(valueNum)) return
      sums.set(key, (sums.get(key) || 0) + valueNum)
    })
  })

  return [...sums.entries()]
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, total]) => ({ key, label: prettifyLabel(key), total }))
}

function buildDynamicCols(items) {
  const first = items[0] || {}
  const keys = Object.keys(first)

  const priority = ['Provincia', 'NumeroEventos', 'ProvinciaID']
  const ordered = [
    ...priority.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !priority.includes(key)),
  ]

  return [
    ['__no__', 'No.'],
    ...ordered.map((key) => [key, prettifyLabel(key)]),
  ]
}

function buildPuntosImportantes(items, analysisRows, tipo) {
  const totalEventos = analysisRows.reduce((acc, row) => acc + n(row.NumeroEventos), 0)
  const provincias = new Set(items.map((row) => String(row.Provincia || '').trim()).filter(Boolean)).size
  const cantones = new Set(items.map((row) => String(row.Canton || row.CantonNombre || '').trim()).filter(Boolean)).size
  const parroquias = new Set(items.map((row) => String(row.Parroquia || row.ParroquiaNombre || '').trim()).filter(Boolean)).size

  let rankedTypes = []

  if (tipo === 'lluvias') {
    rankedTypes = EVENT_TYPES
      .map(([key, label]) => {
        const total = analysisRows.reduce((acc, row) => acc + n(row[key]), 0)
        const pct = totalEventos > 0 ? (total / totalEventos) * 100 : 0
        return { label, total, pct }
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
  } else {
    rankedTypes = getTopNumericColumns(analysisRows, 8, ['NumeroEventos', 'ProvinciaID'])
      .map((x) => ({
        label: x.label,
        total: x.total,
        pct: totalEventos > 0 ? (x.total / totalEventos) * 100 : 0,
      }))
  }

  const typesText = rankedTypes.length
    ? rankedTypes.map((x) => `${x.label} (${formatPct(x.pct)}%)`).join(', ')
    : 'sin datos suficientes'

  const byProvincia = new Map()
  items.forEach((row) => {
    const provincia = String(row.Provincia || '').trim()
    if (!provincia) return
    const base = n(row.ImpactadasPersonas) || n(row.NumeroEventos)
    byProvincia.set(provincia, (byProvincia.get(provincia) || 0) + base)
  })

  const topProvincias = [...byProvincia.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([provincia]) => provincia)

  return {
    line1: `Desde el 1 de enero de 2026 hasta la presente fecha se han registrado ${formatInt(totalEventos)} eventos por ${TIPO_LABELS[tipo] || 'evento'} afectando a ${formatInt(provincias)} provincias, ${formatInt(cantones)} cantones y ${formatInt(parroquias)} parroquias. Los eventos mas recurrentes corresponden a: ${typesText} entre los principales.`,
    line2: topProvincias.length
      ? `En lo que va del anio 2026, las provincias con mayor impacto a la poblacion son: ${topProvincias.join(', ')}.`
      : 'En lo que va del anio 2026, no hay datos suficientes para identificar provincias con mayor impacto a la poblacion.',
  }
}

function buildSection4(items) {
  const fixedCards = SUMMARY_FIELDS.map(([key, label]) => ({ key, label, value: items.reduce((acc, row) => acc + n(row[key]), 0) }))
  const hasFixedData = fixedCards.some((card) => card.value > 0)

  const cards = hasFixedData
    ? fixedCards
    : getTopNumericColumns(items, 6, ['NumeroEventos', 'ProvinciaID']).map((x) => ({ key: x.key, label: x.label, value: x.total }))

  const normalizedCards = cards.length ? cards : [{ key: 'sin_datos', label: 'Sin datos', value: 0 }]

  const lead = normalizedCards[0]
  const second = normalizedCards[1]
  const paragraph = second
    ? `Los principales impactos reportados son ${lead.label.toLowerCase()} (${formatInt(lead.value)}) y ${second.label.toLowerCase()} (${formatInt(second.value)}).`
    : `El principal impacto reportado es ${lead.label.toLowerCase()} (${formatInt(lead.value)}).`

  return { cards: normalizedCards.slice(0, 6), paragraph }
}

function buildDetalleAnalisis(rows) {
  const byProvincia = new Map()
  rows.forEach((row) => {
    const provincia = String(row.Provincia || '').trim()
    if (!provincia) return
    const current = byProvincia.get(provincia) || { eventos: 0, impactadas: 0 }
    current.eventos += n(row.NumeroEventos)
    current.impactadas += n(row.ImpactadasPersonas)
    byProvincia.set(provincia, current)
  })

  const ranking = [...byProvincia.entries()]
    .map(([provincia, agg]) => ({ provincia, ...agg }))
    .sort((a, b) => b.impactadas - a.impactadas || b.eventos - a.eventos)
    .slice(0, 8)

  if (!ranking.length) {
    return 'No hay datos suficientes para generar el analisis del detalle de afectaciones por provincia.'
  }

  const first = ranking[0]
  const rest = ranking.slice(1)
  const restText = rest.length ? `; seguido de ${rest.map((x) => `${x.provincia} (${formatInt(x.impactadas)} impactadas en ${formatInt(x.eventos)} eventos)`).join('; ')}.` : '.'
  return `La provincia con mayor impacto es ${first.provincia} (${formatInt(first.impactadas)} personas impactadas en ${formatInt(first.eventos)} eventos)${restText}`
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function downloadExcelXml(filename, sheetName, columns, rows) {
  const headerCells = columns
    .map(([, label]) => `<Cell ss:StyleID="sHeader"><Data ss:Type="String">${escapeXml(label)}</Data></Cell>`)
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map(([key]) => {
          const raw = row[key]
          const asNum = Number(String(raw ?? '').replace(',', '.'))
          const isNumber = Number.isFinite(asNum) && String(raw ?? '').trim() !== ''
          const type = isNumber ? 'Number' : 'String'
          const value = isNumber ? String(asNum) : escapeXml(raw ?? '')
          const style = isNumber ? 'sNumber' : 'sCell'
          return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${value}</Data></Cell>`
        })
        .join('')
      return `<Row>${cells}</Row>`
    })
    .join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="sHeader">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0A2A6E" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="sCell">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="sNumber">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function App() {
  const [tipo, setTipo] = useState('lluvias')
  const [provinciaId, setProvinciaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [responseData, setResponseData] = useState(null)
  const [tipoLluviasItems, setTipoLluviasItems] = useState([])
  const [showRawJson, setShowRawJson] = useState(false)

  const buildApiUrl = (endpointPath, provinciaValue = '') => {
    const base = `${API_BASE_URL}${endpointPath}`
    const params = new URLSearchParams()
    if (PUBLIC_API_KEY) params.set('api_key', PUBLIC_API_KEY)
    const trimmedProvincia = provinciaValue.trim()
    if (trimmedProvincia) params.set('ProvinciaID', trimmedProvincia)
    const query = params.toString()
    return query ? `${base}?${query}` : base
  }

  const requestUrl = useMemo(() => buildApiUrl(ENDPOINTS[tipo], provinciaId), [tipo, provinciaId])

  const items = responseData?.items ?? []
  const analysisRows = tipo === 'lluvias' ? tipoLluviasItems : items
  const currentDetailCols = useMemo(() => (tipo === 'lluvias' ? DETAIL_COLS : buildDynamicCols(items)), [tipo, items])
  const detailRows = useMemo(() => {
    const ordered = sortByNumeroEventosDesc(items)
    return ordered.map((row, idx) => ({ __no__: idx + 1, ...row }))
  }, [items])
  const tipoLluviasRowsOrdered = useMemo(() => sortByNumeroEventosDesc(tipoLluviasItems), [tipoLluviasItems])
  const puntosImportantes = useMemo(() => buildPuntosImportantes(items, analysisRows, tipo), [items, analysisRows, tipo])
  const section4 = useMemo(() => buildSection4(items), [items])
  const detalleAnalisis = useMemo(() => buildDetalleAnalisis(detailRows), [detailRows])

  useEffect(() => {
    setResponseData(null)
    setTipoLluviasItems([])
    setError('')
    setShowRawJson(false)
  }, [tipo])

  const onConsultar = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!PUBLIC_API_KEY) throw new Error('Falta VITE_PUBLIC_API_KEY en el frontend.')

      if (tipo === 'lluvias') {
        const trimmedProvincia = provinciaId.trim()
        const tipoLluviasUrl = buildApiUrl(ENDPOINTS.tipoLluvias, trimmedProvincia)

        const [responseMain, responseTipos] = await Promise.all([fetch(requestUrl), fetch(tipoLluviasUrl)])
        const [dataMain, dataTipos] = await Promise.all([responseMain.json(), responseTipos.json()])

        if (!responseMain.ok) throw new Error(dataMain?.error || 'Error consultando API')
        if (!responseTipos.ok) throw new Error(dataTipos?.error || 'Error consultando eventos por tipo de lluvias')

        setResponseData(dataMain)
        setTipoLluviasItems(dataTipos?.items || [])
      } else {
        const response = await fetch(requestUrl)
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || 'Error consultando API')
        setResponseData(data)
        setTipoLluviasItems([])
      }
    } catch (err) {
      setResponseData(null)
      setTipoLluviasItems([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDescargarPrincipal = async () => {
    if (!items.length) {
      setError('Primero consulta datos para generar la descarga.')
      return
    }

    if (tipo !== 'lluvias') {
      downloadExcelXml(`detalle_${tipo}.xml`, 'DetalleConsulta', currentDetailCols, detailRows)
      return
    }

    setLoading(true)
    setError('')
    try {
      if (!PUBLIC_API_KEY) throw new Error('Falta VITE_PUBLIC_API_KEY en el frontend.')
      const trimmedProvincia = provinciaId.trim()
      const tipoLluviasUrl = buildApiUrl(ENDPOINTS.tipoLluvias, trimmedProvincia)

      const response = await fetch(tipoLluviasUrl)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Error consultando eventos por tipo de lluvias')

      exportEventosLluviasPdf({
        items,
        tipoLluviasItems: data?.items || [],
        provinciaId: provinciaId.trim() || null,
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Consulta de Eventos SITREP</h1>
        <p className="muted">Ambiente actual: <strong>{API_ENV}</strong></p>
        <p className="muted">API Base URL: <code>{API_BASE_URL || 'No configurada'}</code></p>

        <form onSubmit={onConsultar} className="form-grid">
          <label>
            Tipo de evento
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="lluvias">Eventos por lluvias</option>
              <option value="noLluvias">Eventos no por lluvias</option>
              <option value="incendios">Eventos por incendios forestales</option>
            </select>
          </label>

          <label>
            ProvinciaID (opcional)
            <input type="number" min="1" placeholder="Ej: 1" value={provinciaId} onChange={(e) => setProvinciaId(e.target.value)} />
          </label>

          <button type="submit" disabled={loading || !API_BASE_URL}>{loading ? 'Consultando...' : 'Consultar'}</button>
          <button type="button"  onClick={onDescargarPrincipal} disabled={true}>
            {'Descargar PDF'}
          </button>
          <button type="button" onClick={() => setShowRawJson((v) => !v)} disabled={!responseData}>{showRawJson ? 'Ocultar JSON' : 'Ver JSON'}</button>
        </form>

        {DEBUG && <p className="request-url">GET {requestUrl}</p>}
        {error && <p className="error">{error}</p>}

        {items.length > 0 && (
          <section className="preview">
            <h2>Vista Previa SITREP</h2>

            <div className="block-title">1. Puntos importantes</div>
            <ul className="important-list">
              <li>{puntosImportantes.line1}</li>
              <li>{puntosImportantes.line2}</li>
            </ul>

            <div className="block-title">3. Eventos Adversos y Afectaciones por Provincia</div>
            {tipo === 'lluvias' ? (
              <>
                <button
                  type="button"
                  onClick={() => downloadExcelXml('eventos_adversos_resumen.xml', 'EventosAdversos', TIPO_LLUVIAS_COLS, tipoLluviasRowsOrdered)}
                  disabled={!tipoLluviasRowsOrdered.length}
                >
                  Descargar Excel - Seccion 3
                </button>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{TIPO_LLUVIAS_COLS.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {tipoLluviasRowsOrdered.map((row, idx) => (
                        <tr key={`tipo-${idx}`}>
                          {TIPO_LLUVIAS_COLS.map(([key]) => <td key={`tipo-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => downloadExcelXml(`eventos_adversos_${tipo}.xml`, 'EventosAdversos', currentDetailCols, detailRows)}
                  disabled={!detailRows.length}
                >
                  Descargar Excel - Seccion 3
                </button>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{currentDetailCols.map(([, label]) => <th key={`s3-${label}`}>{label}</th>)}</tr>
                    </thead>
                    <tbody>
                      {detailRows.map((row, idx) => (
                        <tr key={`s3-${idx}`}>
                          {currentDetailCols.map(([key]) => <td key={`s3-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="block-title">4. Eventos Peligrosos y Afectaciones - Resumen</div>
            <p className="muted">{section4.paragraph}</p>
            <div className="summary-grid">
              {section4.cards.map((card) => (
                <div key={card.key}><span>{card.label}</span><strong>{formatInt(card.value)}</strong></div>
              ))}
            </div>

            <div className="block-title">5. Detalle de afectaciones por Provincia (de 1 de enero del anio 2026 a la fecha)</div>
            <p className="muted">{detalleAnalisis}</p>
            <button
              type="button"
              onClick={() => downloadExcelXml(`detalle_${tipo}.xml`, 'DetalleAfectaciones', currentDetailCols, detailRows)}
              disabled={!items.length}
            >
              Descargar Excel - Seccion 5
            </button>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{currentDetailCols.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {detailRows.map((row, idx) => (
                    <tr key={idx}>
                      {currentDetailCols.map(([key]) => <td key={`${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showRawJson && responseData && (
          <div className="result">
            <p>Total: <strong>{responseData.total ?? 0}</strong></p>
            <pre>{JSON.stringify(responseData, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
