import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getMissionsTableClient, getMetadataTableClient, entityToMission, MissionEntity } from '../storage';

export async function getMissions(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log('Getting all missions');
    
    try {
        const tableClient = getMissionsTableClient();
        const metadataClient = getMetadataTableClient();
        
        const missions: MissionEntity[] = [];
        
        // Fetch all missions
        const entities = tableClient.listEntities<MissionEntity>({
            queryOptions: { filter: "status eq 'active'" }
        });
        
        for await (const entity of entities) {
            missions.push(entity);
        }
        
        // Get last updated timestamp
        let lastUpdated: string | null = null;
        try {
            const metadata = await metadataClient.getEntity<{ value: string }>('system', 'lastUpdated');
            lastUpdated = metadata.value;
        } catch (error) {
            // Metadata may not exist yet
        }
        
        return {
            status: 200,
            jsonBody: {
                missions: missions.map(entityToMission),
                count: missions.length,
                lastUpdated
            }
        };
    } catch (error: any) {
        context.error('Error fetching missions:', error);
        
        // If table doesn't exist, return empty
        if (error.statusCode === 404) {
            return {
                status: 200,
                jsonBody: {
                    missions: [],
                    count: 0,
                    lastUpdated: null
                }
            };
        }
        
        return {
            status: 500,
            jsonBody: { error: 'Failed to fetch missions' }
        };
    }
}

app.http('getMissions', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'missions',
    handler: getMissions
});
