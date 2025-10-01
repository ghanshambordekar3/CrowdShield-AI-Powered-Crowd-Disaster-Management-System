# CrowdShield End-to-End Testing Guide

## Prerequisites
1. MySQL Server running with database `crowdshield` created
2. Spring Boot backend running on `http://localhost:8080`
3. Frontend dashboard opened in browser

## Step 1: Start Backend Server
```bash
cd CrowdShield
mvn spring-boot:run
```

## Step 2: Verify Backend APIs
Test the APIs using curl or the provided test scripts:

### Test Density API
```bash
curl http://localhost:8080/api/density
```
Should return JSON array with density data.

### Test Alerts API
```bash
curl http://localhost:8080/api/alerts
```
Should return JSON array with active alerts.

### Test Routes API
```bash
curl http://localhost:8080/api/routes
```
Should return JSON array with active routes.

## Step 3: Test Frontend Integration
1. Open `home.html` in your browser
2. Login with any credentials (frontend validation only)
3. Observe the dashboard loading real data from backend

## Step 4: Real-Time Updates Test
The frontend will automatically:
- Refresh density data every 10 seconds
- Refresh alerts every 15 seconds  
- Refresh routes every 20 seconds

Check browser console to see API calls and responses.

## Step 5: Database Manipulation Test
### Add New Alert (Test Real-Time Updates)
Connect to MySQL and insert a new alert:
```sql
USE crowdshield;
INSERT INTO alerts (zone_id, type, message, status, timestamp) 
VALUES (1, 'Emergency', 'Test emergency alert from database', 'active', NOW());
```

The alert should appear on the frontend within 15 seconds.

### Update Density Data
```sql
USE crowdshield;
INSERT INTO density_data (zone_id, timestamp, count, density) 
VALUES (1, NOW(), 75, 0.95);
```

The density chart should update within 10 seconds.

### Toggle Route Status
```sql
USE crowdshield;
UPDATE routes SET is_active = NOT is_active WHERE id = 1;
```

Routes display should update within 20 seconds.

## Step 6: Error Handling Test
### Test Backend Offline
1. Stop the Spring Boot server
2. Observe frontend error handling in console
3. Restart server and verify reconnection

### Test Invalid Data
Try inserting invalid data to test backend validation.

## Expected Results

### ✅ Successful Integration Indicators:
- Frontend displays real data from MySQL database
- Charts update with live density information
- Alerts appear in real-time when inserted into database
- Routes status changes reflect immediately
- Auto-refresh works correctly (check browser console)
- Error handling for backend connectivity issues

### 🔍 Monitoring Points:
1. Browser console for API call logs
2. Spring Boot console for database operations
3. MySQL for data persistence
4. Network tab for HTTP request/response inspection

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Backend has CORS enabled, should work out of the box
2. **Database Connection**: Verify MySQL is running and credentials are correct
3. **Port Conflicts**: Ensure port 8080 is available
4. **Data Not Appearing**: Check if `data.sql` was executed (Spring Boot should auto-run it)

### Debug Steps:
1. Check browser console for errors
2. Verify backend is running and APIs return data
3. Check MySQL for inserted sample data
4. Verify frontend is making correct API calls
