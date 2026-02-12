// Mission Map Application
const API_BASE = window.location.hostname === 'localhost' 
    ? '/api' 
    : 'https://missionmap-func-prod.azurewebsites.net/api';

// Initialize map
const map = L.map('map').setView([20, 0], 2);

// Add tile layer (OpenStreetMap - free)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18
}).addTo(map);

// Mission marker icon
const missionIcon = L.divIcon({
    className: 'mission-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -8]
});

// Store all markers for filtering
let missionMarkers = [];

// Load missions from API
async function loadMissions() {
    try {
        const response = await fetch(`${API_BASE}/missions`);
        if (!response.ok) throw new Error('Failed to load missions');
        
        const data = await response.json();
        displayMissions(data.missions);
        updateStats(data);
    } catch (error) {
        console.error('Error loading missions:', error);
        // Load sample data for development
        loadSampleData();
    }
}

// Display missions on map
function displayMissions(missions) {
    // Clear existing markers
    missionMarkers.forEach(marker => map.removeLayer(marker));
    missionMarkers = [];

    missions.forEach(mission => {
        if (mission.latitude && mission.longitude) {
            const marker = L.marker([mission.latitude, mission.longitude], {
                icon: missionIcon
            });

            // Popup content
            const popupContent = `
                <div class="popup-title">${mission.name}</div>
                <div class="popup-location">${mission.headquarters || mission.country}</div>
            `;
            marker.bindPopup(popupContent);

            // Click handler for sidebar
            marker.on('click', () => showMissionDetails(mission));

            marker.addTo(map);
            missionMarkers.push(marker);
        }
    });

    document.getElementById('mission-count').textContent = 
        `${missions.length} missions worldwide`;
}

// Show mission details in sidebar
function showMissionDetails(mission) {
    document.getElementById('mission-name').textContent = mission.name;
    document.getElementById('mission-hq').textContent = mission.headquarters || '-';
    document.getElementById('mission-country').textContent = mission.country || '-';
    document.getElementById('mission-region').textContent = mission.region || '-';
    
    document.getElementById('sidebar').classList.remove('hidden');
}

// Close sidebar
document.getElementById('close-sidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('hidden');
});

// Update statistics
function updateStats(data) {
    if (data.lastUpdated) {
        const date = new Date(data.lastUpdated);
        document.getElementById('last-updated').textContent = 
            date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
    }
}

// Sample data for development/fallback
function loadSampleData() {
    const sampleMissions = [
        { name: "California Los Angeles Mission", headquarters: "Los Angeles, CA", country: "United States", region: "North America", latitude: 34.0522, longitude: -118.2437 },
        { name: "Utah Salt Lake City Mission", headquarters: "Salt Lake City, UT", country: "United States", region: "North America", latitude: 40.7608, longitude: -111.8910 },
        { name: "Brazil São Paulo South Mission", headquarters: "São Paulo", country: "Brazil", region: "South America", latitude: -23.5505, longitude: -46.6333 },
        { name: "England London Mission", headquarters: "London", country: "United Kingdom", region: "Europe", latitude: 51.5074, longitude: -0.1278 },
        { name: "Japan Tokyo Mission", headquarters: "Tokyo", country: "Japan", region: "Asia", latitude: 35.6762, longitude: 139.6503 },
        { name: "Philippines Manila Mission", headquarters: "Manila", country: "Philippines", region: "Asia", latitude: 14.5995, longitude: 120.9842 },
        { name: "Australia Sydney Mission", headquarters: "Sydney", country: "Australia", region: "Oceania", latitude: -33.8688, longitude: 151.2093 },
        { name: "Ghana Accra Mission", headquarters: "Accra", country: "Ghana", region: "Africa", latitude: 5.6037, longitude: -0.1870 },
        { name: "Mexico Mexico City Mission", headquarters: "Mexico City", country: "Mexico", region: "North America", latitude: 19.4326, longitude: -99.1332 },
        { name: "Germany Berlin Mission", headquarters: "Berlin", country: "Germany", region: "Europe", latitude: 52.5200, longitude: 13.4050 },
        { name: "Argentina Buenos Aires Mission", headquarters: "Buenos Aires", country: "Argentina", region: "South America", latitude: -34.6037, longitude: -58.3816 },
        { name: "South Korea Seoul Mission", headquarters: "Seoul", country: "South Korea", region: "Asia", latitude: 37.5665, longitude: 126.9780 },
        { name: "France Paris Mission", headquarters: "Paris", country: "France", region: "Europe", latitude: 48.8566, longitude: 2.3522 },
        { name: "Nigeria Lagos Mission", headquarters: "Lagos", country: "Nigeria", region: "Africa", latitude: 6.5244, longitude: 3.3792 },
        { name: "Peru Lima Mission", headquarters: "Lima", country: "Peru", region: "South America", latitude: -12.0464, longitude: -77.0428 }
    ];

    displayMissions(sampleMissions);
    document.getElementById('last-updated').textContent = 'Sample Data';
}

// Initialize
loadMissions();
