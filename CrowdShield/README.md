# CrowdShield Backend

A Spring Boot backend application for the CrowdShield hackathon project that provides crowd management APIs.

## Prerequisites

- Java 17 or higher
- Maven
- MySQL Server

## Setup Instructions

1. **Create MySQL Database**:
   ```sql
   CREATE DATABASE crowdshield;
   ```

2. **Update Database Credentials**:
   Edit `src/main/resources/application.properties` with your MySQL credentials:
   ```properties
   spring.datasource.username=your_username
   spring.datasource.password=your_password
   ```

3. **Build and Run**:
   ```bash
   cd CrowdShield
   mvn clean install
   mvn spring-boot:run
   ```

4. **Verify Setup**:
   The application will run on `http://localhost:8080`

## API Endpoints

- `GET /api/density` - Returns latest crowd density data
- `GET /api/alerts` - Returns all active alerts
- `GET /api/routes` - Returns all active routes

## Sample Data

The application includes sample data that will be automatically inserted when the application starts:
- 8 density data records across 4 zones
- 5 alert records with different statuses
- 6 route records with active/inactive status

## Database Schema

- **density_data**: Crowd density information by zone
- **alerts**: Alert notifications with status
- **routes**: Route information with active status

## Technologies Used

- Spring Boot 3.2.0
- Spring Data JPA
- MySQL Connector
- Maven
