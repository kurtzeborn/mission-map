# Mission Map

An interactive world map displaying LDS mission boundaries and headquarters locations.

## Features

- 🗺️ Interactive world map with mission markers
- 📍 Mission headquarters locations
- 🔄 Automated data updates via Azure Functions
- ☁️ Azure Static Web Apps + Table Storage

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Static Web    │────▶│  Azure Functions │────▶│  Table Storage  │
│   (Leaflet)     │     │  (API + Update)  │     │  (Mission Data) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## Local Development

### Prerequisites
- Node.js 20+
- Azure CLI
- Azure Functions Core Tools v4

### Setup

```bash
# Install dependencies
cd web && npm install
cd ../functions && npm install

# Start local development
npm run dev
```

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Azure deployment instructions.

## Data Sources

Mission data is sourced from publicly available information on [churchofjesuschrist.org](https://www.churchofjesuschrist.org/maps/missions).

The data update function scrapes mission listings and geocodes headquarters cities.

## License

MIT
