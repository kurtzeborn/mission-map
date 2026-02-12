# Deploy Mission Map Infrastructure
# Usage: .\deploy.ps1 -ResourceGroupName "rg-mission-map" -Location "westus2"

param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory = $false)]
    [string]$Location = "westus2",
    
    [Parameter(Mandatory = $false)]
    [string]$EnvironmentName = "prod"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying Mission Map Infrastructure" -ForegroundColor Cyan

# Check Azure CLI login
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "❌ Not logged in to Azure CLI. Run 'az login' first." -ForegroundColor Red
    exit 1
}

Write-Host "📍 Using subscription: $($account.name)" -ForegroundColor Gray

# Create resource group if it doesn't exist
$rgExists = az group exists --name $ResourceGroupName | ConvertFrom-Json
if (-not $rgExists) {
    Write-Host "📦 Creating resource group: $ResourceGroupName" -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location
} else {
    Write-Host "✅ Resource group exists: $ResourceGroupName" -ForegroundColor Green
}

# Deploy Bicep template
Write-Host "🔧 Deploying Bicep template..." -ForegroundColor Yellow

$deploymentResult = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file "$PSScriptRoot\main.bicep" `
    --parameters environmentName=$EnvironmentName `
    --query "properties.outputs" `
    --output json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Outputs:" -ForegroundColor Cyan
Write-Host "  Storage Account:    $($deploymentResult.storageAccountName.value)"
Write-Host "  Function App:       $($deploymentResult.functionAppName.value)"
Write-Host "  Function URL:       https://$($deploymentResult.functionAppHostname.value)"
Write-Host "  Static Web App:     $($deploymentResult.staticWebAppName.value)"
Write-Host "  Website URL:        https://$($deploymentResult.staticWebAppHostname.value)"
Write-Host ""
Write-Host "🔑 Static Web App Deployment Token saved to: deployment-token.txt" -ForegroundColor Yellow
$deploymentResult.staticWebAppDeploymentToken.value | Out-File -FilePath "$PSScriptRoot\deployment-token.txt" -NoNewline

Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "  1. Add the deployment token to GitHub Secrets as AZURE_STATIC_WEB_APPS_API_TOKEN"
Write-Host "  2. Deploy the Function App code"
Write-Host "  3. Deploy the Static Web App"
Write-Host "  4. Run the data update function to populate missions"
