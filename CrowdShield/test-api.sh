#!/bin/bash

# Test script for CrowdShield API endpoints
echo "Testing CrowdShield API endpoints..."

# Test density endpoint
echo -e "\n1. Testing /api/density endpoint:"
curl -s http://localhost:8080/api/density | python -m json.tool

# Test alerts endpoint
echo -e "\n2. Testing /api/alerts endpoint:"
curl -s http://localhost:8080/api/alerts | python -m json.tool

# Test routes endpoint
echo -e "\n3. Testing /api/routes endpoint:"
curl -s http://localhost:8080/api/routes | python -m json.tool

echo -e "\nAPI testing completed!"
