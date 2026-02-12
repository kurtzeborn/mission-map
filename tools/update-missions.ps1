# Trigger Mission Data Update
# This script calls the Azure Function to refresh mission data from source

param(
    [Parameter(Mandatory = $false)]
    [string]$FunctionUrl = "http://localhost:7071",
    
    [Parameter(Mandatory = $false)]
    [string]$ApiKey = ""
)

$ErrorActionPreference = "Stop"

Write-Host "🔄 Triggering Mission Data Update" -ForegroundColor Cyan

$headers = @{
    "Content-Type" = "application/json"
}

if ($ApiKey) {
    $headers["x-api-key"] = $ApiKey
}

$endpoint = "$FunctionUrl/api/missions/update"
Write-Host "📍 Endpoint: $endpoint" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri $endpoint -Method POST -Headers $headers
    
    Write-Host ""
    Write-Host "✅ Update Complete!" -ForegroundColor Green
    Write-Host "  Added:   $($response.added) missions"
    Write-Host "  Updated: $($response.updated) missions"
    Write-Host "  Total:   $($response.total) missions"
    Write-Host "  Time:    $($response.timestamp)"
}
catch {
    Write-Host "❌ Update failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
