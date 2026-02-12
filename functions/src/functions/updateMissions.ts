import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getMissionsTableClient, getMetadataTableClient, initializeTables, MissionEntity } from '../storage';

// Simple geocoding using a static mapping for common cities
// In production, you'd use Azure Maps or another geocoding service
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
    // United States
    'Salt Lake City, UT': { lat: 40.7608, lng: -111.8910 },
    'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
    'New York, NY': { lat: 40.7128, lng: -74.0060 },
    'Houston, TX': { lat: 29.7604, lng: -95.3698 },
    'Phoenix, AZ': { lat: 33.4484, lng: -112.0740 },
    'San Diego, CA': { lat: 32.7157, lng: -117.1611 },
    'Denver, CO': { lat: 39.7392, lng: -104.9903 },
    'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
    'Portland, OR': { lat: 45.5152, lng: -122.6784 },
    'Las Vegas, NV': { lat: 36.1699, lng: -115.1398 },
    // International
    'London': { lat: 51.5074, lng: -0.1278 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Berlin': { lat: 52.5200, lng: 13.4050 },
    'Rome': { lat: 41.9028, lng: 12.4964 },
    'Madrid': { lat: 40.4168, lng: -3.7038 },
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Seoul': { lat: 37.5665, lng: 126.9780 },
    'Sydney': { lat: -33.8688, lng: 151.2093 },
    'Melbourne': { lat: -37.8136, lng: 144.9631 },
    'São Paulo': { lat: -23.5505, lng: -46.6333 },
    'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
    'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
    'Mexico City': { lat: 19.4326, lng: -99.1332 },
    'Lima': { lat: -12.0464, lng: -77.0428 },
    'Bogotá': { lat: 4.7110, lng: -74.0721 },
    'Santiago': { lat: -33.4489, lng: -70.6693 },
    'Manila': { lat: 14.5995, lng: 120.9842 },
    'Hong Kong': { lat: 22.3193, lng: 114.1694 },
    'Singapore': { lat: 1.3521, lng: 103.8198 },
    'Bangkok': { lat: 13.7563, lng: 100.5018 },
    'Accra': { lat: 5.6037, lng: -0.1870 },
    'Lagos': { lat: 6.5244, lng: 3.3792 },
    'Nairobi': { lat: -1.2921, lng: 36.8219 },
    'Johannesburg': { lat: -26.2041, lng: 28.0473 },
    'Cape Town': { lat: -33.9249, lng: 18.4241 }
};

// Slugify mission name for row key
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// Determine region from country
function getRegion(country: string): string {
    const regionMap: Record<string, string> = {
        'United States': 'North America',
        'Canada': 'North America',
        'Mexico': 'North America',
        'Brazil': 'South America',
        'Argentina': 'South America',
        'Chile': 'South America',
        'Peru': 'South America',
        'Colombia': 'South America',
        'United Kingdom': 'Europe',
        'France': 'Europe',
        'Germany': 'Europe',
        'Italy': 'Europe',
        'Spain': 'Europe',
        'Portugal': 'Europe',
        'Japan': 'Asia',
        'South Korea': 'Asia',
        'Philippines': 'Asia',
        'Taiwan': 'Asia',
        'Hong Kong': 'Asia',
        'Singapore': 'Asia',
        'Thailand': 'Asia',
        'Australia': 'Oceania',
        'New Zealand': 'Oceania',
        'Ghana': 'Africa',
        'Nigeria': 'Africa',
        'Kenya': 'Africa',
        'South Africa': 'Africa'
    };
    return regionMap[country] || 'Other';
}

// Sample mission data - in production this would be scraped/fetched
function getSampleMissions(): Omit<MissionEntity, 'partitionKey' | 'rowKey' | 'createdAt' | 'updatedAt'>[] {
    return [
        { name: 'California Los Angeles Mission', headquarters: 'Los Angeles, CA', country: 'United States', region: 'North America', latitude: 34.0522, longitude: -118.2437, status: 'active' },
        { name: 'Utah Salt Lake City Mission', headquarters: 'Salt Lake City, UT', country: 'United States', region: 'North America', latitude: 40.7608, longitude: -111.8910, status: 'active' },
        { name: 'Utah Provo Mission', headquarters: 'Provo, UT', country: 'United States', region: 'North America', latitude: 40.2338, longitude: -111.6585, status: 'active' },
        { name: 'Texas Houston Mission', headquarters: 'Houston, TX', country: 'United States', region: 'North America', latitude: 29.7604, longitude: -95.3698, status: 'active' },
        { name: 'Arizona Phoenix Mission', headquarters: 'Phoenix, AZ', country: 'United States', region: 'North America', latitude: 33.4484, longitude: -112.0740, status: 'active' },
        { name: 'Brazil São Paulo South Mission', headquarters: 'São Paulo', country: 'Brazil', region: 'South America', latitude: -23.5505, longitude: -46.6333, status: 'active' },
        { name: 'Brazil São Paulo North Mission', headquarters: 'São Paulo', country: 'Brazil', region: 'South America', latitude: -23.5005, longitude: -46.6833, status: 'active' },
        { name: 'Brazil Rio de Janeiro Mission', headquarters: 'Rio de Janeiro', country: 'Brazil', region: 'South America', latitude: -22.9068, longitude: -43.1729, status: 'active' },
        { name: 'Argentina Buenos Aires Mission', headquarters: 'Buenos Aires', country: 'Argentina', region: 'South America', latitude: -34.6037, longitude: -58.3816, status: 'active' },
        { name: 'Chile Santiago Mission', headquarters: 'Santiago', country: 'Chile', region: 'South America', latitude: -33.4489, longitude: -70.6693, status: 'active' },
        { name: 'Peru Lima Mission', headquarters: 'Lima', country: 'Peru', region: 'South America', latitude: -12.0464, longitude: -77.0428, status: 'active' },
        { name: 'Mexico Mexico City Mission', headquarters: 'Mexico City', country: 'Mexico', region: 'North America', latitude: 19.4326, longitude: -99.1332, status: 'active' },
        { name: 'England London Mission', headquarters: 'London', country: 'United Kingdom', region: 'Europe', latitude: 51.5074, longitude: -0.1278, status: 'active' },
        { name: 'England London South Mission', headquarters: 'London', country: 'United Kingdom', region: 'Europe', latitude: 51.4574, longitude: -0.1778, status: 'active' },
        { name: 'France Paris Mission', headquarters: 'Paris', country: 'France', region: 'Europe', latitude: 48.8566, longitude: 2.3522, status: 'active' },
        { name: 'Germany Berlin Mission', headquarters: 'Berlin', country: 'Germany', region: 'Europe', latitude: 52.5200, longitude: 13.4050, status: 'active' },
        { name: 'Italy Rome Mission', headquarters: 'Rome', country: 'Italy', region: 'Europe', latitude: 41.9028, longitude: 12.4964, status: 'active' },
        { name: 'Spain Madrid Mission', headquarters: 'Madrid', country: 'Spain', region: 'Europe', latitude: 40.4168, longitude: -3.7038, status: 'active' },
        { name: 'Japan Tokyo Mission', headquarters: 'Tokyo', country: 'Japan', region: 'Asia', latitude: 35.6762, longitude: 139.6503, status: 'active' },
        { name: 'Japan Tokyo South Mission', headquarters: 'Tokyo', country: 'Japan', region: 'Asia', latitude: 35.6262, longitude: 139.7003, status: 'active' },
        { name: 'South Korea Seoul Mission', headquarters: 'Seoul', country: 'South Korea', region: 'Asia', latitude: 37.5665, longitude: 126.9780, status: 'active' },
        { name: 'Philippines Manila Mission', headquarters: 'Manila', country: 'Philippines', region: 'Asia', latitude: 14.5995, longitude: 120.9842, status: 'active' },
        { name: 'Philippines Quezon City Mission', headquarters: 'Quezon City', country: 'Philippines', region: 'Asia', latitude: 14.6760, longitude: 121.0437, status: 'active' },
        { name: 'Taiwan Taipei Mission', headquarters: 'Taipei', country: 'Taiwan', region: 'Asia', latitude: 25.0330, longitude: 121.5654, status: 'active' },
        { name: 'Hong Kong Mission', headquarters: 'Hong Kong', country: 'Hong Kong', region: 'Asia', latitude: 22.3193, longitude: 114.1694, status: 'active' },
        { name: 'Australia Sydney Mission', headquarters: 'Sydney', country: 'Australia', region: 'Oceania', latitude: -33.8688, longitude: 151.2093, status: 'active' },
        { name: 'Australia Melbourne Mission', headquarters: 'Melbourne', country: 'Australia', region: 'Oceania', latitude: -37.8136, longitude: 144.9631, status: 'active' },
        { name: 'New Zealand Auckland Mission', headquarters: 'Auckland', country: 'New Zealand', region: 'Oceania', latitude: -36.8509, longitude: 174.7645, status: 'active' },
        { name: 'Ghana Accra Mission', headquarters: 'Accra', country: 'Ghana', region: 'Africa', latitude: 5.6037, longitude: -0.1870, status: 'active' },
        { name: 'Nigeria Lagos Mission', headquarters: 'Lagos', country: 'Nigeria', region: 'Africa', latitude: 6.5244, longitude: 3.3792, status: 'active' },
        { name: 'South Africa Johannesburg Mission', headquarters: 'Johannesburg', country: 'South Africa', region: 'Africa', latitude: -26.2041, longitude: 28.0473, status: 'active' },
        { name: 'South Africa Cape Town Mission', headquarters: 'Cape Town', country: 'South Africa', region: 'Africa', latitude: -33.9249, longitude: 18.4241, status: 'active' },
        { name: 'Kenya Nairobi Mission', headquarters: 'Nairobi', country: 'Kenya', region: 'Africa', latitude: -1.2921, longitude: 36.8219, status: 'active' }
    ];
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
        
        // Get sample missions (replace with real scraping logic)
        const missions = getSampleMissions();
        const now = new Date().toISOString();
        
        let added = 0;
        let updated = 0;
        
        for (const mission of missions) {
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
        
        context.log(`Update complete: ${added} added, ${updated} updated`);
        
        return {
            status: 200,
            jsonBody: {
                success: true,
                added,
                updated,
                total: missions.length,
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
            
            const missions = getSampleMissions();
            const now = new Date().toISOString();
            
            for (const mission of missions) {
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
