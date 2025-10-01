# CrowdShield Testing Checklist - Step by Step

## 🎯 Quick Start Commands

### 1. Start MySQL Server
```bash
# Start MySQL service (Windows)
net start mysql

# Or if using MySQL as service
mysql.server start

# Verify MySQL is running
mysql -u root -p
```

### 2. Create Database
```sql
-- Connect to MySQL and create database
CREATE DATABASE crowdshield;
USE crowdshield;

-- Verify database creation
SHOW DATABASES;
```

### 3. Configure Database Credentials
Edit `CrowdShield/src/main/resources/application.properties`:
```properties
spring.datasource.username=your_mysql_username
spring.datasource.password=your_mysql_password
```

### 4. Start Spring Boot Backend
```bash
cd CrowdShield
mvn clean spring-boot:run

# Alternative: Build and run
mvn clean install
java -jar target/crowdshield-0.0.1-SNAPSHOT.jar
```

### 5. Verify Backend Startup
Check console output for:
```
Started CrowdShieldApplication in X.XXX seconds
Hibernate: create table alerts...
Hibernate: create table density_data...
Hibernate: create table routes...
Executing SQL script from class path resource [data.sql]
```

---

## 🔍 API Testing Commands

### Test API Endpoints with curl

#### 1. Test Density API
```bash
curl -X GET http://localhost:8080/api/density
```

**Expected Output:** JSON array with density data
```json
[
  {
    "id": 1,
    "zoneId": 1,
    "timestamp": "2024-01-15T10:30:00",
    "count": 45,
    "density": 0.85
  }
]
```

#### 2. Test Alerts API
```bash
curl -X GET http://localhost:8080/api/alerts
```

**Expected Output:** JSON array with active alerts
```json
[
  {
    "id": 1,
    "zoneId": 1,
    "type": "Congestion",
    "message": "High crowd density detected in Zone 1",
    "status": "active",
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

#### 3. Test Routes API
```bash
curl -X GET http://localhost:8080/api/routes
```

**Expected Output:** JSON array with active routes
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

---

## 🗄️ Database Verification

### Check Database Tables and Data
```sql
USE crowdshield;

-- Verify tables exist
SHOW TABLES;

-- Check density_data table
SELECT * FROM density_data;

-- Check alerts table  
SELECT * FROM alerts;

-- Check routes table
SELECT * FROM routes;

-- Count records in each table
SELECT 'density_data' as table_name, COUNT(*) as count FROM density_data
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'routes', COUNT(*) FROM routes;
```

**Expected Results:**
- density_data: 8 records
- alerts: 5 records  
- routes: 6 records

---

## 🖥️ Frontend Integration Testing

### 1. Open Frontend
```bash
# Open home.html in browser
open home.html
# or
start home.html
```

### 2. Verify Backend Connection
**Browser Console Check:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for API call logs:
   ```
   Density Data from Backend: [...]
   Alerts from Backend: [...]
   Routes from Backend: [...]
   ```

### 3. Test Real-Time Updates
**Browser Console Commands:**
```javascript
// Manual API testing from browser console
fetch("http://localhost:8080/api/density")
  .then(r => r.json())
  .then(console.log)

fetch("http://localhost:8080/api/alerts")  
  .then(r => r.json())
  .then(console.log)

fetch("http://localhost:8080/api/routes")
  .then(r => r.json())
  .then(console.log)
```

### 4. Verify Auto-Refresh
Check console for periodic logs:
```
Density Data from Backend: [...]  // Every 10 seconds
Alerts from Backend: [...]        // Every 15 seconds  
Routes from Backend: [...]        // Every 20 seconds
```

---

## 🧪 Postman Testing

### Postman Collection Setup
1. Open Postman
2. Create new collection "CrowdShield APIs"
3. Add these requests:

#### Request 1: GET Density
```
GET http://localhost:8080/api/density
```

#### Request 2: GET Alerts  
```
GET http://localhost:8080/api/alerts
```

#### Request 3: GET Routes
```
GET http://localhost:8080/api/routes
```

### Test Scripts for Postman
Add this test script to each request:
```javascript
// Tests
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is JSON array", function () {
    pm.response.to.be.json;
    pm.expect(pm.response.json()).to.be.an('array');
});

pm.test("Contains expected data structure", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.length).to.be.greaterThan(0);
});
```

---

## 🐛 Troubleshooting Commands

### 1. Check Spring Boot Logs
```bash
# Look for these in console:
- "Started CrowdShieldApplication"
- "Hibernate: create table"
- "Executing SQL script"
- No database connection errors
```

### 2. Verify Database Connection
```bash
# Test MySQL connection
mysql -u root -p -e "USE crowdshield; SELECT 1;"
```

### 3. Check Port Availability
```bash
# Check if port 8080 is used
netstat -ano | findstr :8080

# Or on Linux/Mac
lsof -i :8080
```

### 4. Clear and Rebuild
```bash
# If issues, clean and rebuild
cd CrowdShield
mvn clean
mvn compile
mvn spring-boot:run
```

---

## ✅ Success Indicators

### Backend Success:
- ✅ Spring Boot starts without errors
- ✅ Database tables created automatically
- ✅ Sample data inserted from data.sql
- ✅ APIs return HTTP 200 with JSON data
- ✅ CORS enabled for frontend access

### Frontend Success:
- ✅ No CORS errors in browser console
- ✅ Real data displayed (not dummy data)
- ✅ Auto-refresh working (check console logs)
- ✅ Charts update with backend data
- ✅ Alerts show real database content

### Database Success:
- ✅ Tables: density_data, alerts, routes exist
- ✅ Sample data present in all tables
- ✅ New inserts appear in frontend automatically
- ✅ Status changes reflect in real-time

---

## 🚀 Demo Ready Commands

### Quick Demo Script:
```bash
# Terminal 1 - Start backend
cd CrowdShield && mvn spring-boot:run

# Terminal 2 - Test APIs
curl http://localhost:8080/api/density
curl http://localhost:8080/api/alerts  
curl http://localhost:8080/api/routes

# Terminal 3 - Add live test data
mysql -u root -p -e "
USE crowdshield;
INSERT INTO alerts (zone_id, type, message, status, timestamp)
VALUES (2, 'Demo', 'Live test alert from demo', 'active', NOW());
"

# Open frontend and show real-time updates
open home.html
```

This checklist provides everything needed for a complete demo showing:
1. Backend running with real MySQL database
2. REST APIs serving live data
3. Frontend displaying real backend data
4. Real-time updates working
5. Full integration tested
