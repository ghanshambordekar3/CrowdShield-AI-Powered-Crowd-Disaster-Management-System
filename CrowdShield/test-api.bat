@echo off
echo Testing CrowdShield API endpoints...

echo.
echo 1. Testing /api/density endpoint:
curl -s http://localhost:8080/api/density

echo.
echo 2. Testing /api/alerts endpoint:
curl -s http://localhost:8080/api/alerts

echo.
echo 3. Testing /api/routes endpoint:
curl -s http://localhost:8080/api/routes

echo.
echo API testing completed!
pause
