# CrowdShield Real-Time Deployment Guide

## System Requirements
- Python 3.8+
- Java 17+ (for Spring Boot backend)
- Node.js (for frontend dependencies if needed)
- Webcam or RTSP camera feed

## Installation Steps

### 1. Python Dependencies
```bash
pip install ultralytics opencv-python requests numpy
```

### 2. Backend Setup (Spring Boot)
```bash
cd CrowdShield
mvn clean install
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 3. Python Detection Service
```bash
# Using default webcam (camera index 0)
python detect.py --source 0 --api-url http://localhost:8080/api/density --zone-id 1

# Using RTSP camera feed
python detect.py --source "rtsp://username:password@camera-ip:554/stream" --api-url http://localhost:8080/api/density --zone-id 1

# Using HTTP camera feed
python detect.py --source "http://camera-ip/video" --api-url http://localhost:8080/api/density --zone-id 1
```

### 4. Frontend Setup
Simply open `home.html` in a web browser or serve it using a local server:
```bash
# Using Python HTTP server
python -m http.server 8000

# Using Node.js serve
npx serve .
```

Then navigate to `http://localhost:8000`

## Configuration Options

### Python Detection Service Arguments:
- `--source`: Video source (0 for webcam, RTSP/HTTP URL)
- `--api-url`: Backend API endpoint (default: http://localhost:8080/api/density)
- `--zone-id`: Zone identifier (default: 1)

### Multiple Camera Setup:
For multiple zones, run multiple instances with different zone IDs:
```bash
# Zone 1 - Webcam
python detect.py --source 0 --zone-id 1

# Zone 2 - RTSP Camera
python detect.py --source "rtsp://camera2-ip/stream" --zone-id 2

# Zone 3 - HTTP Camera  
python detect.py --source "http://camera3-ip/video" --zone-id 3
```

## Troubleshooting

### Common Issues:

1. **Camera not detected:**
   - Check camera permissions
   - Verify camera index (try 0, 1, 2, etc.)
   - Test with `cv2.VideoCapture(0).isOpened()`

2. **YOLOv8 model download:**
   - First run will automatically download yolov8n.pt
   - Ensure internet connection
   - Manual download: https://github.com/ultralytics/assets/releases

3. **Backend connection errors:**
   - Verify Spring Boot is running on port 8080
   - Check database connection in application.properties

4. **Performance issues:**
   - Reduce frame processing rate in detect.py
   - Use smaller YOLO model (yolov8n.pt is already the smallest)

### Performance Optimization:
- Adjust `send_interval` in detect.py for data transmission frequency
- Modify YOLO model size (nano, small, medium, large)
- Use GPU acceleration if available (requires CUDA)

## Monitoring

### Log Files:
- Backend logs: Check Spring Boot console output
- Python service: Console output shows detection counts and API responses
- Frontend: Browser console shows data fetching status

### Health Check:
- Backend: `GET http://localhost:8080/api/density`
- Python service: Look for "✅ Data sent successfully" messages
- Frontend: Verify charts update every 5 seconds

## Security Considerations

1. **Camera Feeds:**
   - Use secure RTSP with authentication
   - Restrict camera network access
   - Use VPN for remote cameras

2. **API Security:**
   - Add authentication to backend endpoints
   - Use HTTPS in production
   - Implement rate limiting

3. **Data Privacy:**
   - No personal data is stored or processed
   - Only crowd counts and density levels are recorded
   - Consider GDPR compliance for EU deployments

## Scaling

### Horizontal Scaling:
- Deploy multiple Python detection services for different zones
- Use load balancer for backend if needed
- Consider Redis for real-time data distribution

### Database Scaling:
- MySQL configuration for high write throughput
- Add database replication for redundancy
- Implement data archiving for historical analytics

## Maintenance

### Regular Tasks:
- Monitor disk space for database growth
- Check camera connectivity
- Update dependencies periodically
- Backup database regularly

### Updates:
- Pull latest code changes
- Run database migrations if needed
- Restart services after updates

## Support

For issues:
1. Check logs for error messages
2. Verify all services are running
3. Test individual components separately
4. Check network connectivity between services
