# Data Sources and Updates

## Mission Data Sources

The mission data in this project is compiled from publicly available sources:

### Primary Sources
- [Church Maps](https://www.churchofjesuschrist.org/maps/missions) - Official interactive map
- [Church Newsroom](https://newsroom.churchofjesuschrist.org) - Mission announcements

### Community Sources
- Wikipedia articles on LDS missions
- Returned missionary community forums
- MissionaryMail.com and similar sites

## Data Schema

Each mission record contains:

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full mission name (e.g., "California Los Angeles Mission") |
| `headquarters` | string | City where mission office is located |
| `country` | string | Country name |
| `region` | string | Geographic region (North America, Europe, etc.) |
| `latitude` | number | HQ latitude coordinate |
| `longitude` | number | HQ longitude coordinate |
| `status` | string | "active" or "closed" |

## Update Process

### Automatic Updates
A timer-triggered Azure Function runs weekly to refresh data.

### Manual Updates
```powershell
cd tools
.\update-missions.ps1 -FunctionUrl "https://your-function-app.azurewebsites.net"
```

### Adding New Missions

1. Edit `tools/scrape-missions.js` to add new mission data
2. Add city coordinates to `CITY_COORDINATES` if not present
3. Run the scrape script to generate updated JSON
4. Trigger an update to push to storage

## Known Limitations

1. **Boundary data unavailable** - Only headquarters locations are mapped
2. **Manual geocoding** - City coordinates are manually maintained
3. **Update lag** - New missions may take time to be added
4. **Historical data** - Closed missions are marked but not removed

## Contributing Data

To contribute mission data corrections or additions:

1. Fork the repository
2. Update `tools/scrape-missions.js` with corrections
3. Submit a pull request with sources cited

## Data Accuracy

This is a community project and data accuracy is not guaranteed. Official mission information should be verified through [ChurchofJesusChrist.org](https://www.churchofjesuschrist.org).
