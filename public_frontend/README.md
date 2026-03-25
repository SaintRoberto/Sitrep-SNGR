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
```

- Si `VITE_API_ENV=local`, usa `VITE_API_LOCAL_URL`.
- Si `VITE_API_ENV=prod`, usa `VITE_API_PROD_URL`.

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
- `/api/public/eventos-no-por-lluvias`
- `/api/public/eventos-por-incendios-forestales`

`ProvinciaID` se envia como query param opcional.
