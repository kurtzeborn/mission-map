import { TableClient, TableServiceClient } from '@azure/data-tables';

const connectionString = process.env.STORAGE_CONNECTION_STRING || 'UseDevelopmentStorage=true';

// Table names
export const MISSIONS_TABLE = 'missions';
export const METADATA_TABLE = 'metadata';

// Get or create table client
export function getMissionsTableClient(): TableClient {
    return TableClient.fromConnectionString(connectionString, MISSIONS_TABLE);
}

export function getMetadataTableClient(): TableClient {
    return TableClient.fromConnectionString(connectionString, METADATA_TABLE);
}

// Initialize tables
export async function initializeTables(): Promise<void> {
    const serviceClient = TableServiceClient.fromConnectionString(connectionString);
    
    try {
        await serviceClient.createTable(MISSIONS_TABLE);
        console.log(`Created table: ${MISSIONS_TABLE}`);
    } catch (error: any) {
        if (error.statusCode !== 409) throw error; // 409 = already exists
    }
    
    try {
        await serviceClient.createTable(METADATA_TABLE);
        console.log(`Created table: ${METADATA_TABLE}`);
    } catch (error: any) {
        if (error.statusCode !== 409) throw error;
    }
}

// Mission entity interface
export interface MissionEntity {
    partitionKey: string;  // Region (e.g., "North America", "Europe")
    rowKey: string;        // Mission ID (slugified name)
    name: string;
    headquarters?: string;
    country: string;
    region: string;
    latitude?: number;
    longitude?: number;
    status: 'active' | 'closed';
    createdAt: string;
    updatedAt: string;
}

// Convert entity to API response
export function entityToMission(entity: MissionEntity) {
    return {
        id: entity.rowKey,
        name: entity.name,
        headquarters: entity.headquarters,
        country: entity.country,
        region: entity.region,
        latitude: entity.latitude,
        longitude: entity.longitude,
        status: entity.status
    };
}
