# CrowdShield Database Integration

## Overview
The CrowdShield system now automatically saves all detected alerts to a MySQL database and provides a comprehensive alert history viewer.

## Features

### 1. Automatic Alert Saving
- **Real-time Detection**: When the AI monitoring system detects any of the 4 alert types (Fire Emergency, Overcrowding, Medical Emergency, Stampede Risk), the alert is automatically saved to the MySQL database.
- **Duplicate Prevention**: The system prevents duplicate alerts from being saved within 30 seconds to avoid spam.
- **Database Structure**: Alerts are saved with the following information:
  - Zone ID
  - Alert Type
  - Message
  - Status (active/resolved)
  - Timestamp

### 2. Alert Types Monitored
- **Fire Emergency**: Simulated detection (always shows "No fire detected")
- **Overcrowding**: Detects when 4+ people are in camera view
- **Medical Emergency**: Simulated detection (always shows "No medical emergencies")
- **Stampede Risk**: Detects when 6+ people are in camera view

### 3. Database Integration Points

#### JavaScript Functions
- `saveAlertToDatabase(alertResult)`: Saves detected alerts to MySQL via REST API
- `analyzeForAlertType(alertType, predictions)`: Enhanced to automatically save alerts when detected
- `addNewAlert(alertData)`: Updated with duplicate prevention for database saves

#### Backend API Endpoints
- `POST /api/alerts`: Saves new alerts to database
- `GET /api/alerts/history`: Retrieves complete alert history
- `GET /api/alerts`: Gets active alerts

### 4. Alert History Viewer
- **Main Dashboard**: Shows recent alerts in the "Alert History" section
- **Full Database Viewer**: Dedicated page (`alert-history.html`) showing complete database records
- **Real-time Updates**: Both views automatically refresh to show new alerts
- **Statistics**: Shows total alerts, active/resolved counts, and today's alerts

## How It Works

### 1. Detection Flow
```
Camera Feed → AI Analysis → Alert Detection → Database Save → History Update
```

### 2. Database Schema
The alerts are stored in the `alerts` table with these columns:
- `id` (Primary Key)
- `zone_id` (Integer)
- `type` (String - Alert type)
- `message` (String - Alert description)
- `status` (String - active/resolved)
- `timestamp` (DateTime)

### 3. Usage Instructions

#### Starting Monitoring
1. Open the CrowdShield dashboard
2. Go to "Live Alerts" page
3. Click "Monitor" on any alert type (Fire, Overcrowding, Medical, Stampede)
4. The system will start camera feed and AI detection
5. Any detected alerts are automatically saved to database

#### Viewing Alert History
1. **Recent Alerts**: Check the "Alert History" section on the Live Alerts page
2. **Full Database**: Click "View Full Database" button to open the complete alert history viewer
3. **Auto-refresh**: Both views update automatically every 30 seconds

### 4. Database Configuration
The system connects to MySQL database with these settings (in `application.properties`):
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/crowdshield
spring.datasource.username=root
spring.datasource.password=admin
```

## Files Modified/Created

### Modified Files
- `script.js`: Added database integration functions
- `home.html`: Added link to full database viewer

### New Files
- `alert-history.html`: Complete database viewer page
- `DATABASE_INTEGRATION.md`: This documentation

## Testing the Integration

### 1. Start the Backend
```bash
cd CrowdShield
mvn spring-boot:run
```

### 2. Open Dashboard
- Open `home.html` in browser
- Login with any credentials

### 3. Test Alert Detection
- Go to Live Alerts page
- Click "Monitor" on Overcrowding alert
- Allow camera access
- Have 4+ people appear in camera view
- Alert will be automatically saved to database

### 4. View Saved Alerts
- Check "Alert History" section for recent alerts
- Click "View Full Database" for complete history
- Refresh to see new alerts appear

## Benefits

1. **Persistent Storage**: All alerts are permanently stored in MySQL database
2. **Historical Analysis**: Complete record of all incidents for analysis
3. **Real-time Updates**: Live dashboard shows alerts as they happen
4. **Duplicate Prevention**: Smart filtering prevents alert spam
5. **Comprehensive Viewer**: Dedicated page for database management
6. **Statistics**: Real-time statistics on alert patterns

## Future Enhancements

1. **Alert Resolution**: Add functionality to mark alerts as resolved
2. **Advanced Filtering**: Filter alerts by date, type, zone, etc.
3. **Export Functionality**: Export alert data to CSV/PDF
4. **Alert Analytics**: Charts and graphs showing alert patterns
5. **Email Notifications**: Send email alerts for critical incidents