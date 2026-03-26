import { useMemo, useState } from 'react'
import './App.css'
import { exportEventosLluviasPdf } from './utils/pdfReport'

const API_ENV = import.meta.env.VITE_API_ENV || 'local'
const API_LOCAL_URL = import.meta.env.VITE_API_LOCAL_URL || 'http://localhost:5000'
const API_PROD_URL = import.meta.env.VITE_API_PROD_URL || ''

const API_BASE_URL = API_ENV === 'prod' ? API_PROD_URL : API_LOCAL_URL

const ENDPOINTS = {
  lluvias: '/api/public/eventos-por-lluvias',
  noLluvias: '/api/public/eventos-no-por-lluvias',
  incendios: '/api/public/eventos-por-incendios-forestales',
  tipoLluvias: '/api/public/eventos-por-tipo-lluvias',
}

const DETAIL_COLS = [
  ['Provincia', 'Provincia'],
  ['NumeroEventos', 'Nro. Eventos'],
  ['ImpactadasPersonas', 'Personas Impactadas'],
  ['AfectadosFamilias', 'Familias Afectadas'],
  ['AfectadosPersonas', 'Personas Afectadas'],
  ['DamnificadosFamilias', 'Familias Damnificadas'],
  ['DamnificadosPersonas', 'Personas Damnificadas'],
  ['AfectadosViviendas', 'Viviendas Afectadas'],
  ['AfectadosPuentes', 'Puentes Afectados'],
  ['DestruidosPuentes', 'Puentes Destruidos'],
  ['AfectadosPrivados', 'Bienes Privados'],
  ['AfectadosKilometros', 'Km Vias Afectadas'],
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

function n(v) {
  const x = Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(x) ? x : 0
}

function buildResumen(items) {
  return {
    personasAfectadas: items.reduce((a, r) => a + n(r.AfectadosPersonas), 0),
    familiasAfectadas: items.reduce((a, r) => a + n(r.AfectadosFamilias), 0),
    viviendasAfectadas: items.reduce((a, r) => a + n(r.AfectadosViviendas), 0),
    puentesAfectados: items.reduce((a, r) => a + n(r.AfectadosPuentes), 0),
    puentesDestruidos: items.reduce((a, r) => a + n(r.DestruidosPuentes), 0),
    kmViasAfectadas: items.reduce((a, r) => a + n(r.AfectadosKilometros), 0),
  }
}

function formatInt(v) {
  return Math.round(v).toLocaleString('es-EC')
}

function formatPct(v) {
  return Number(v).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function buildPuntosImportantes(items, tipoLluviasItems) {
  const totalEventos = tipoLluviasItems.reduce((acc, row) => acc + n(row.NumeroEventos), 0)
  const provincias = new Set(items.map((row) => String(row.Provincia || '').trim()).filter(Boolean)).size
  const cantones = new Set(items.map((row) => String(row.Canton || row.CantonNombre || '').trim()).filter(Boolean)).size
  const parroquias = new Set(items.map((row) => String(row.Parroquia || row.ParroquiaNombre || '').trim()).filter(Boolean)).size

  const rankedTypes = EVENT_TYPES
    .map(([key, label]) => {
      const total = tipoLluviasItems.reduce((acc, row) => acc + n(row[key]), 0)
      const pct = totalEventos > 0 ? (total / totalEventos) * 100 : 0
      return { label, total, pct }
    })
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const typesText = rankedTypes.length
    ? rankedTypes.map((x) => `${x.label} (${formatPct(x.pct)}%)`).join(', ')
    : 'sin datos'

  const byProvincia = new Map()
  items.forEach((row) => {
    const provincia = String(row.Provincia || '').trim()
    if (!provincia) return
    byProvincia.set(provincia, (byProvincia.get(provincia) || 0) + n(row.ImpactadasPersonas))
  })

  const topProvincias = [...byProvincia.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([provincia]) => provincia)

  return {
    line1: `Desde el 1 de enero de 2026 hasta la presente fecha se han registrado ${formatInt(totalEventos)} eventos adversos por lluvias afectando a ${formatInt(provincias)} provincias, ${formatInt(cantones)} cantones y ${formatInt(parroquias)} parroquias. Los eventos mas recurrentes corresponden a: ${typesText} entre los principales.`,
    line2: topProvincias.length
      ? `En lo que va del anio 2026, las provincias con mayor impacto a la poblacion son: ${topProvincias.join(', ')}.`
      : 'En lo que va del anio 2026, no hay datos suficientes para identificar provincias con mayor impacto a la poblacion.',
  }
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

  const requestUrl = useMemo(() => {
    const base = `${API_BASE_URL}${ENDPOINTS[tipo]}`
    const trimmedProvincia = provinciaId.trim()

    if (!trimmedProvincia) return base

    const params = new URLSearchParams({ ProvinciaID: trimmedProvincia })
    return `${base}?${params.toString()}`
  }, [tipo, provinciaId])

  const items = responseData?.items ?? []
  const resumen = useMemo(() => buildResumen(items), [items])
  const puntosImportantes = useMemo(() => buildPuntosImportantes(items, tipoLluviasItems), [items, tipoLluviasItems])

  const onConsultar = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (tipo === 'lluvias') {
        const trimmedProvincia = provinciaId.trim()
        const tipoLluviasBase = `${API_BASE_URL}${ENDPOINTS.tipoLluvias}`
        const tipoLluviasUrl = trimmedProvincia
          ? `${tipoLluviasBase}?${new URLSearchParams({ ProvinciaID: trimmedProvincia }).toString()}`
          : tipoLluviasBase

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

  const onDescargarPdf = async () => {
    if (!items.length) {
      setError('Primero consulta datos para generar el PDF.')
      return
    }
    if (tipo !== 'lluvias') {
      setError('El PDF SITREP actual esta habilitado para Eventos por lluvias.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const tipoLluviasBase = `${API_BASE_URL}${ENDPOINTS.tipoLluvias}`
      const trimmedProvincia = provinciaId.trim()
      const tipoLluviasUrl = trimmedProvincia
        ? `${tipoLluviasBase}?${new URLSearchParams({ ProvinciaID: trimmedProvincia }).toString()}`
        : tipoLluviasBase

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
          <button type="button" onClick={onDescargarPdf} disabled={loading || !items.length}>Descargar PDF</button>
          <button type="button" onClick={() => setShowRawJson((v) => !v)} disabled={!responseData}>{showRawJson ? 'Ocultar JSON' : 'Ver JSON'}</button>
        </form>

        <p className="request-url">GET {requestUrl}</p>
        {error && <p className="error">{error}</p>}

        {tipo === 'lluvias' && items.length > 0 && (
          <section className="preview">
            <h2>Vista Previa SITREP</h2>            

            <div className="block-title">1. Puntos importantes</div>
            <ul className="important-list">
              <li>{puntosImportantes.line1}</li>
              <li>{puntosImportantes.line2}</li>
            </ul>

            <div className="block-title">3. Eventos Adversos y Afectaciones por Provincia</div>
            <button
              type="button"
              onClick={() => downloadExcelXml('eventos_adversos_resumen.xml', 'EventosAdversos', TIPO_LLUVIAS_COLS, tipoLluviasItems)}
              disabled={!tipoLluviasItems.length}
            >
              Descargar Excel - Seccion 3
            </button>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{TIPO_LLUVIAS_COLS.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {tipoLluviasItems.map((row, idx) => (
                    <tr key={`tipo-${idx}`}>
                      {TIPO_LLUVIAS_COLS.map(([key]) => <td key={`tipo-${idx}-${key}`}>{row[key] ?? '0'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="block-title">4. Eventos Peligrosos y Afectaciones - Resumen</div>
            <div className="summary-grid">
              <div><span>Personas afectadas</span><strong>{resumen.personasAfectadas}</strong></div>
              <div><span>Familias afectadas</span><strong>{resumen.familiasAfectadas}</strong></div>
              <div><span>Viviendas afectadas</span><strong>{resumen.viviendasAfectadas}</strong></div>
              <div><span>Puentes afectados</span><strong>{resumen.puentesAfectados}</strong></div>
              <div><span>Puentes destruidos</span><strong>{resumen.puentesDestruidos}</strong></div>
              <div><span>Km vias afectadas</span><strong>{resumen.kmViasAfectadas.toFixed(2)}</strong></div>
            </div>

            <div className="block-title">5. Detalle de afectaciones por Provincia (de 1 de enero del anio 2026 a la fecha)</div>
            <button
              type="button"
              onClick={() => downloadExcelXml('detalle_afectaciones.xml', 'DetalleAfectaciones', DETAIL_COLS, items)}
              disabled={!items.length}
            >
              Descargar Excel - Seccion 5
            </button>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>{DETAIL_COLS.map(([, label]) => <th key={label}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => (
                    <tr key={idx}>
                      {DETAIL_COLS.map(([key]) => <td key={`${idx}-${key}`}>{row[key] ?? '0'}</td>)}
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
