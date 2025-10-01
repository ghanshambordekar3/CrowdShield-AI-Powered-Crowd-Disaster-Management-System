# CrowdShield Project Structure

```
CrowdShield/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/
│   │   │       └── crowdshield/
│   │   │           ├── CrowdShieldApplication.java      # Main application class
│   │   │           ├── controller/
│   │   │           │   └── ApiController.java           # REST API endpoints
│   │   │           ├── model/
│   │   │           │   ├── DensityData.java            # JPA Entity for density data
│   │   │           │   ├── Alert.java                  # JPA Entity for alerts
│   │   │           │   └── Route.java                  # JPA Entity for routes
│   │   │           └── repository/
│   │   │               ├── DensityDataRepository.java   # Repository for density data
│   │   │               ├── AlertRepository.java         # Repository for alerts
│   │   │               └── RouteRepository.java         # Repository for routes
│   │   └── resources/
│   │       ├── application.properties                   # Spring Boot configuration
│   │       └── data.sql                                # Sample test data
│   └── test/
│       └── java/
│           └── com/
│               └── crowdshield/
├── pom.xml                                             # Maven configuration
├── README.md                                           # Setup instructions
├── test-api.sh                                         # Linux/Mac test script
├── test-api.bat                                        # Windows test script
└── PROJECT_STRUCTURE.md                                # This file
```

## API Endpoints Summary

### 1. GET /api/density
Returns the latest crowd density data from all zones, ordered by timestamp (newest first).

**Sample Response:**
```json
[
  {
    "id": 1,
    "zoneId": "ZONE_A",
    "timestamp": "2024-01-15T10:30:00",
    "count": 45,
    "density": "HIGH"
  },
  {
    "id": 2,
    "zoneId": "ZONE_B",
    "timestamp": "2024-01-15T10:30:00",
    "count": 20,
    "density": "MEDIUM"
  }
]
```

### 2. GET /api/alerts
Returns all active alerts (status = "ACTIVE").

**Sample Response:**
```json
[
  {
    "id": 1,
    "zoneId": "ZONE_A",
    "type": "CROWD",
    "message": "High crowd density detected in Zone A",
    "status": "ACTIVE",
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

### 3. GET /api/routes
Returns all active routes (isActive = true).

**Sample Response:**
```json
[
  {
    "id": 1,
    "startPoint": "Gate 1",
    "endPoint": "Main Hall",
    "routeDetails": "Direct route through corridor A",
    "isActive": true
  }
]
```

## Database Schema

### density_data table
- id (PK, auto-increment)
- zone_id (VARCHAR)
- timestamp (DATETIME)
- count (INT)
- density (VARCHAR)

### alerts table
- id (PK, auto-increment)
- zone_id (VARCHAR)
- type (VARCHAR)
- message (VARCHAR)
- status (VARCHAR)
- timestamp (DATETIME)

### routes table
- id (PK, auto-increment)
- start_point (VARCHAR)
- end_point (VARCHAR)
- route_details (VARCHAR)
- is_active (BOOLEAN)
