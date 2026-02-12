/**
 * Trigger mission data update via Azure Function
 * 
 * Usage:
 *   node update-missions.js [--url <function-url>] [--key <api-key>]
 * 
 * Examples:
 *   node update-missions.js                          # Local development
 *   node update-missions.js --url https://missionmap-func-prod.azurewebsites.net
 */

const args = process.argv.slice(2);

function getArg(flag, defaultValue = '') {
    const index = args.indexOf(flag);
    if (index !== -1 && args[index + 1]) {
        return args[index + 1];
    }
    return defaultValue;
}

const functionUrl = getArg('--url', 'http://localhost:7071');
const apiKey = getArg('--key', '');

async function updateMissions() {
    console.log('🔄 Triggering Mission Data Update');
    console.log(`📍 Endpoint: ${functionUrl}/api/missions/update`);

    const headers = {
        'Content-Type': 'application/json'
    };

    if (apiKey) {
        headers['x-api-key'] = apiKey;
    }

    try {
        const response = await fetch(`${functionUrl}/api/missions/update`, {
            method: 'POST',
            headers
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        
        console.log('');
        console.log('✅ Update Complete!');
        console.log(`  Added:   ${result.added} missions`);
        console.log(`  Updated: ${result.updated} missions`);
        console.log(`  Total:   ${result.total} missions`);
        console.log(`  Time:    ${result.timestamp}`);
        
    } catch (error) {
        console.error(`❌ Update failed: ${error.message}`);
        process.exit(1);
    }
}

updateMissions();
