#!/bin/bash
# Deploy Mission Map Infrastructure
# Usage: ./deploy.sh -g rg-mission-map -l westus2

set -e

# Defaults
RESOURCE_GROUP=""
LOCATION="westus2"
ENVIRONMENT_NAME="prod"

# Parse arguments
while getopts "g:l:e:" opt; do
    case $opt in
        g) RESOURCE_GROUP="$OPTARG" ;;
        l) LOCATION="$OPTARG" ;;
        e) ENVIRONMENT_NAME="$OPTARG" ;;
        \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
    esac
done

if [ -z "$RESOURCE_GROUP" ]; then
    echo "❌ Resource group name is required. Usage: ./deploy.sh -g <resource-group-name>"
    exit 1
fi

echo "🚀 Deploying Mission Map Infrastructure"

# Check Azure CLI login
if ! az account show &> /dev/null; then
    echo "❌ Not logged in to Azure CLI. Run 'az login' first."
    exit 1
fi

SUBSCRIPTION=$(az account show --query name -o tsv)
echo "📍 Using subscription: $SUBSCRIPTION"

# Create resource group if it doesn't exist
if [ "$(az group exists --name $RESOURCE_GROUP)" = "false" ]; then
    echo "📦 Creating resource group: $RESOURCE_GROUP"
    az group create --name $RESOURCE_GROUP --location $LOCATION
else
    echo "✅ Resource group exists: $RESOURCE_GROUP"
fi

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Deploy Bicep template
echo "🔧 Deploying Bicep template..."

OUTPUTS=$(az deployment group create \
    --resource-group $RESOURCE_GROUP \
    --template-file "$SCRIPT_DIR/main.bicep" \
    --parameters environmentName=$ENVIRONMENT_NAME \
    --query "properties.outputs" \
    --output json)

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "📋 Outputs:"
echo "  Storage Account:    $(echo $OUTPUTS | jq -r '.storageAccountName.value')"
echo "  Function App:       $(echo $OUTPUTS | jq -r '.functionAppName.value')"
echo "  Function URL:       https://$(echo $OUTPUTS | jq -r '.functionAppHostname.value')"
echo "  Static Web App:     $(echo $OUTPUTS | jq -r '.staticWebAppName.value')"
echo "  Website URL:        https://$(echo $OUTPUTS | jq -r '.staticWebAppHostname.value')"
echo ""

# Save deployment token
DEPLOYMENT_TOKEN=$(echo $OUTPUTS | jq -r '.staticWebAppDeploymentToken.value')
echo -n "$DEPLOYMENT_TOKEN" > "$SCRIPT_DIR/deployment-token.txt"
echo "🔑 Static Web App Deployment Token saved to: deployment-token.txt"

echo ""
echo "📝 Next steps:"
echo "  1. Add the deployment token to GitHub Secrets as AZURE_STATIC_WEB_APPS_API_TOKEN"
echo "  2. Deploy the Function App code"
echo "  3. Deploy the Static Web App"
echo "  4. Run the data update function to populate missions"
