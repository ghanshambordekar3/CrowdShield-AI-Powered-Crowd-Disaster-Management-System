# CrowdShield Backend Setup Guide

## Prerequisites
- Java 17 or higher
- Maven
- MySQL Server

## Step 1: Create MySQL Database
```sql
CREATE DATABASE crowdshield;
```

## Step 2: Update Database Credentials
Edit `src/main/resources/application.properties` with your MySQL credentials:
```properties
spring.datasource.username=your_username
spring.datasource.password=your_password
```

## Step 3: Build and Run the Application
```bash
cd CrowdShield
mvn clean install
mvn spring-boot:run
```

## Step 4: Test the APIs
The application will run on `http://localhost:8080`

Use the test scripts:
- Windows: `test-api.bat`
- Linux/Mac: `./test-api.sh`

Or test manually:
```bash
# Test density endpoint
curl http://localhost:8080/api/density

# Test alerts endpoint  
curl http://localhost:8080/api/alerts

# Test routes endpoint
curl http://localhost:8080/api/routes
```

## API Endpoints

### 1. GET /api/density
Returns latest crowd density data from all zones.

### 2. GET /api/alerts  
Returns all active alerts (status = "active").

### 3. GET /api/routes
Returns all active routes (isActive = true).

## Database Schema

### density_data table
- id (PK, auto-increment)
- zone_id (INT, not null)
- timestamp (DATETIME)
- count (INT, not null)
- density (FLOAT, not null)

### alerts table
- id (PK, auto-increment)
- zone_id (INT, not null)
- type (VARCHAR(50), not null)
- message (VARCHAR(255), not null)
- status (VARCHAR(20))
- timestamp (DATETIME)

### routes table
- id (PK, auto-increment)
- start_point (VARCHAR(100), not null)
- end_point (VARCHAR(100), not null)
- route_details (TEXT, not null)
- is_active (BOOLEAN)

## Sample Data
The application includes sample data that will be automatically inserted when the application starts.

## Frontend Integration
The APIs are configured with CORS to allow frontend integration. Use `fetch()` in your JavaScript code:
```javascript
// Example frontend code
fetch('http://localhost:8080/api/density')
  .then(response => response.json())
  .then(data => console.log(data));
