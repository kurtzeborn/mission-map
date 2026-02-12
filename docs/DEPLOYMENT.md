# Deployment Guide

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Node.js 20+
- Azure Functions Core Tools v4
- GitHub account with repo access

## Quick Deploy

### 1. Create Azure Resources

```powershell
# Create a new resource group for mission-map resources
cd infra
.\deploy.ps1 -ResourceGroupName "rg-mission-map" -Location "westus2"
```

Or on Linux/macOS:
```bash
./deploy.sh -g rg-mission-map -l westus2
```

This creates:
- **Storage Account** (Standard LRS - free tier eligible)
- **Static Web App** (Free tier)
- **Function App** (Consumption plan - free tier)
- **Application Insights** (included)

### 2. Configure GitHub Secrets

Add these secrets to your GitHub repository:

| Secret | Description |
|--------|-------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | From `infra/deployment-token.txt` |
| `AZURE_FUNCTIONAPP_PUBLISH_PROFILE` | From Azure Portal → Function App → Get publish profile |

### 3. Deploy Code

Push to `main` branch to trigger automatic deployment via GitHub Actions.

Manual deployment:

```bash
# Deploy Function App
cd functions
npm run build
func azure functionapp publish <function-app-name>

# Deploy Static Web App
cd web
npm run build
# Use SWA CLI or GitHub Actions
```

### 4. Initialize Data

```powershell
# Populate initial mission data
cd tools
.\update-missions.ps1 -FunctionUrl "https://<function-app-name>.azurewebsites.net"
```

## Azure Resources Cost

All resources use free tier where possible:

| Resource | SKU | Monthly Cost |
|----------|-----|--------------|
| Storage Account | Standard LRS | ~$0.02/GB |
| Static Web App | Free | $0 |
| Function App | Consumption | $0 (1M requests/month free) |
| App Insights | Basic | $0 (5GB/month free) |

**Estimated monthly cost: < $1**

## Environment Variables

### Function App Settings

| Setting | Description |
|---------|-------------|
| `STORAGE_CONNECTION_STRING` | Azure Storage connection string |
| `UPDATE_API_KEY` | Optional API key for update endpoint |

## Monitoring

- **Application Insights** - View in Azure Portal
- **Function App Logs** - Azure Portal → Function App → Log stream
- **Static Web App** - Deployment logs in GitHub Actions
