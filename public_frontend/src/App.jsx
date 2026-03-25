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

function App() {
  const [tipo, setTipo] = useState('lluvias')
  const [provinciaId, setProvinciaId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [responseData, setResponseData] = useState(null)
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

  const onConsultar = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(requestUrl)
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Error consultando API')
      setResponseData(data)
    } catch (err) {
      setResponseData(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const onDescargarPdf = () => {
    if (!items.length) {
      setError('Primero consulta datos para generar el PDF.')
      return
    }
    if (tipo !== 'lluvias') {
      setError('El PDF SITREP actual esta habilitado para Eventos por lluvias.')
      return
    }

    exportEventosLluviasPdf({ items, provinciaId: provinciaId.trim() || null })
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
            <h2>Vista Previa SITREP (sin PDF)</h2>

            <div className="block-title">4. Eventos Peligrosos y Afectaciones - Resumen</div>
            <div className="summary-grid">
              <div><span>Personas afectadas</span><strong>{resumen.personasAfectadas}</strong></div>
              <div><span>Familias afectadas</span><strong>{resumen.familiasAfectadas}</strong></div>
              <div><span>Viviendas afectadas</span><strong>{resumen.viviendasAfectadas}</strong></div>
              <div><span>Puentes afectados</span><strong>{resumen.puentesAfectados}</strong></div>
              <div><span>Puentes destruidos</span><strong>{resumen.puentesDestruidos}</strong></div>
              <div><span>Km vias afectadas</span><strong>{resumen.kmViasAfectadas.toFixed(2)}</strong></div>
            </div>

            <div className="block-title">5. Detalle de afectaciones por canton (de 1 de enero del anio 2026 a la fecha)</div>
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
