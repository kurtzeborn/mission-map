# Local Development

## Prerequisites

- Node.js 20+
- Azure Functions Core Tools v4 (`npm install -g azure-functions-core-tools@4`)
- Azurite (Azure Storage Emulator) or Azure Storage Explorer

## Quick Start

### 1. Start Storage Emulator

```powershell
# Option A: Use Azurite (npm)
npm install -g azurite
azurite --silent --location .azurite

# Option B: Use Azure Storage Emulator (Windows only)
# Start from Start Menu
```

### 2. Start Backend (Functions)

```powershell
cd functions
npm install
cp local.settings.json.template local.settings.json
npm start
```

Functions will be available at `http://localhost:7071`

### 3. Start Frontend

```powershell
cd web
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

The Vite dev server proxies `/api` requests to the Functions backend.

### 4. Initialize Sample Data

```powershell
cd tools
node update-missions.js
```

## Project Structure

```
mission-map/
├── web/                 # Frontend (Vite + Leaflet)
│   ├── index.html       # Main HTML
│   ├── app.js           # Map application
│   └── style.css        # Styles
├── functions/           # Azure Functions (TypeScript)
│   └── src/
│       ├── functions/   # HTTP endpoints
│       └── storage.ts   # Table Storage helpers
├── infra/               # Bicep infrastructure
│   ├── main.bicep       # Resource definitions
│   └── deploy.ps1       # Deployment script
├── tools/               # Data management scripts
│   ├── update-missions.js
│   └── scrape-missions.js
└── docs/                # Documentation
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/missions` | Get all active missions |
| POST | `/api/missions/update` | Trigger data update |

## Testing

```powershell
cd functions
npm test
```

## Troubleshooting

### "Table not found" errors
Run the update endpoint first to create tables:
```powershell
curl -X POST http://localhost:7071/api/missions/update
```

### CORS errors
Check that `http://localhost:5173` is in the CORS settings in `host.json`.

### Storage connection issues
Ensure Azurite is running and `local.settings.json` has correct connection string.
