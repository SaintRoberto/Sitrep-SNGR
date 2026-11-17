# Frontend SITREP (React + Vite)

## Requisitos
- Node.js 20+
- npm 10+

## Instalacion
```bash
npm install
```

## Variables de entorno
Copia `.env.example` a `.env` y ajusta:

```env
VITE_API_ENV=local
VITE_API_LOCAL_URL=http://localhost:5000
VITE_API_PROD_URL=https://tu-dominio-api.com
VITE_IMPACT_MAP_USE_TRAFFIC_COLORS=false
```

- Si `VITE_API_ENV=local`, usa `VITE_API_LOCAL_URL`.
- Si `VITE_API_ENV=prod`, usa `VITE_API_PROD_URL`.
- Los mapas usan tonalidades azules por defecto. Para reactivar temporalmente la escala verde-amarillo-rojo, usa `VITE_IMPACT_MAP_USE_TRAFFIC_COLORS=true` y reinicia el frontend.

## Desarrollo
```bash
npm run dev
```

## Build web
Antes de compilar, elige el ambiente en `.env`:
- Local: `VITE_API_ENV=local`
- Produccion: `VITE_API_ENV=prod`

Luego ejecuta:
```bash
npm run build
```

## Endpoints usados
- `/api/public/eventos-por-lluvias`
- `/api/public/eventos-alto-impacto-por-lluvias/:eventoAdversoId/actividades`
- `/api/public/eventos-no-por-lluvias`
- `/api/public/eventos-por-incendios-forestales`

`ProvinciaID` se envia como query param opcional.
