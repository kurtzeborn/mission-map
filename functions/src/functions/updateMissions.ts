import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getMissionsTableClient, getMetadataTableClient, initializeTables, MissionEntity } from '../storage';
import missions from '../data/missions.json';
import coordinates from '../data/coordinates.json';
import regions from '../data/regions.json';

type Coordinates = Record<string, { lat: number; lng: number }>;
type Regions = Record<string, string[]>;

const cityCoordinates = coordinates as Coordinates;
const regionMapping = regions as Regions;

// Slugify mission name for row key
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Determine region from country
function getRegion(country: string): string {
    for (const [region, countries] of Object.entries(regionMapping)) {
        if (countries.includes(country)) {
            return region;
        }
    }
    return 'Other';
}

// Get coordinates for a city
function getCoordinates(headquarters: string): { lat: number; lng: number } | null {
    return cityCoordinates[headquarters] || null;
}

// Build mission entities from JSON data
function getMissionEntities(): Omit<MissionEntity, 'partitionKey' | 'rowKey' | 'createdAt' | 'updatedAt'>[] {
    return missions.map(mission => {
        const coords = getCoordinates(mission.headquarters);
        const region = getRegion(mission.country);
        
        return {
            name: mission.name,
            headquarters: mission.headquarters,
            country: mission.country,
            region,
            latitude: coords?.lat,
            longitude: coords?.lng,
            status: 'active' as const
        };
    });
}

export async function updateMissions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Updating mission data');
    
    // Simple API key check (set in environment)
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.UPDATE_API_KEY;
    
    if (expectedKey && apiKey !== expectedKey) {
        return {
            status: 401,
            jsonBody: { error: 'Unauthorized' }
        };
    }
    
    try {
        // Initialize tables
        await initializeTables();
        
        const tableClient = getMissionsTableClient();
        const metadataClient = getMetadataTableClient();
        
        const missionData = getMissionEntities();
        const now = new Date().toISOString();
        
        let added = 0;
        let updated = 0;
        let skipped = 0;
        
        for (const mission of missionData) {
            // Skip missions without coordinates
            if (!mission.latitude || !mission.longitude) {
                context.warn(`Skipping ${mission.name}: no coordinates for ${mission.headquarters}`);
                skipped++;
                continue;
            }
            
            const rowKey = slugify(mission.name);
            const entity: MissionEntity = {
                partitionKey: mission.region,
                rowKey,
                ...mission,
                createdAt: now,
                updatedAt: now
            };
            
            try {
                // Try to get existing
                await tableClient.getEntity(entity.partitionKey, entity.rowKey);
                // Update existing
                entity.createdAt = ''; // Will be ignored in merge
                await tableClient.updateEntity(entity, 'Merge');
                updated++;
            } catch (error: any) {
                if (error.statusCode === 404) {
                    // Create new
                    entity.createdAt = now;
                    await tableClient.createEntity(entity);
                    added++;
                } else {
                    throw error;
                }
            }
        }
        
        // Update last updated timestamp
        await metadataClient.upsertEntity({
            partitionKey: 'system',
            rowKey: 'lastUpdated',
            value: now
        });
        
        context.log(`Update complete: ${added} added, ${updated} updated, ${skipped} skipped`);
        
        return {
            status: 200,
            jsonBody: {
                success: true,
                added,
                updated,
                skipped,
                total: missionData.length,
                timestamp: now
            }
        };
    } catch (error: any) {
        context.error('Error updating missions:', error);
        return {
            status: 500,
            jsonBody: { error: 'Failed to update missions', details: error.message }
        };
    }
}

app.http('updateMissions', {
    methods: ['POST'],
    authLevel: 'anonymous',
    route: 'missions/update',
    handler: updateMissions
});

// Timer trigger for automatic updates (runs weekly on Sunday at 2 AM UTC)
app.timer('scheduledMissionUpdate', {
    schedule: '0 0 2 * * 0',
    handler: async (timer, context) => {
        context.log('Running scheduled mission update');
        
        try {
            await initializeTables();
            const tableClient = getMissionsTableClient();
            const metadataClient = getMetadataTableClient();
            
            const missionData = getMissionEntities();
            const now = new Date().toISOString();
            
            for (const mission of missionData) {
                if (!mission.latitude || !mission.longitude) continue;
                
                const rowKey = slugify(mission.name);
                const entity: MissionEntity = {
                    partitionKey: mission.region,
                    rowKey,
                    ...mission,
                    createdAt: now,
                    updatedAt: now
                };
                
                await tableClient.upsertEntity(entity);
            }
            
            await metadataClient.upsertEntity({
                partitionKey: 'system',
                rowKey: 'lastUpdated',
                value: now
            });
            
            context.log('Scheduled update complete');
        } catch (error) {
            context.error('Scheduled update failed:', error);
        }
    }
});
