package com.crowdshield.controller;

import com.crowdshield.model.Alert;
import com.crowdshield.model.DensityData;
import com.crowdshield.model.Route;
import com.crowdshield.repository.AlertRepository;
import com.crowdshield.repository.DensityDataRepository;
import com.crowdshield.repository.RouteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@CrossOrigin(origins = "https://crowd-shield-ai-powered-crowd-disas-tau.vercel.app/")
@RequestMapping("/api")
public class ApiController {

    @Autowired
    private DensityDataRepository densityDataRepository;

    @Autowired
    private AlertRepository alertRepository;

    @Autowired
    private RouteRepository routeRepository;

    // Fetch latest density data
    @GetMapping("/density")
    public ResponseEntity<List<DensityData>> getLatestDensityData() {
        try {
            List<DensityData> data = densityDataRepository.findLatestDensityData();
            return ResponseEntity.ok(data != null ? data : new java.util.ArrayList<>());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new java.util.ArrayList<>());
        }
    }
    
    // Forecast based on recent density data per zone
    @GetMapping("/forecast")
    public ResponseEntity<Object> getForecast() {
    try {
    List<Integer> zones = densityDataRepository.findDistinctZoneIds();
    java.util.Map<String, Object> payload = new java.util.HashMap<>();
    java.util.List<java.util.Map<String, Object>> zoneForecasts = new java.util.ArrayList<>();
    for (Integer zoneId : zones) {
    List<DensityData> recent = densityDataRepository.findByZoneId(zoneId,
    PageRequest.of(0, 5, Sort.by(Sort.Direction.DESC, "timestamp")));
    if (recent == null || recent.isEmpty()) continue;
    double avg = recent.stream().mapToInt(d -> d.getCount() != null ? d.getCount() : 0).average().orElse(0);
    // Simple extrapolation
    double next1 = avg * 1.05;
    double next2 = avg * 1.10;
    double next3 = avg * 0.95;
    java.util.Map<String, Object> z = new java.util.HashMap<>();
    z.put("zoneId", zoneId);
    z.put("history", recent);
    z.put("forecast", new double[]{next1, next2, next3});
    zoneForecasts.add(z);
    }
    payload.put("generatedAt", java.time.LocalDateTime.now().toString());
    payload.put("zones", zoneForecasts);
    return ResponseEntity.ok(payload);
    } catch (Exception e) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
    .body(java.util.Map.of("error", e.getMessage()));
    }
    }

    // Post new density data
    @PostMapping("/density")
    public ResponseEntity<String> postDensityData(@RequestBody DensityData densityData) {
        if (densityData.getZoneId() == null || densityData.getCount() == null || densityData.getDensity() == null) {
            return ResponseEntity.badRequest().body("Missing required fields: zoneId, count, or density");
        }
        try {
            densityData.setTimestamp(LocalDateTime.now());
            DensityData saved = densityDataRepository.save(densityData);
            if (saved == null || saved.getId() == null) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Failed to save density data");
            }
            return ResponseEntity.ok("Density data saved successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving density data: " + e.getMessage());
        }
    }

    // Fetch active alerts
    @GetMapping("/alerts")
    public ResponseEntity<List<Alert>> getActiveAlerts() {
        try {
            List<Alert> alerts = alertRepository.findByStatus("active");
            return ResponseEntity.ok(alerts != null ? alerts : new java.util.ArrayList<>());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new java.util.ArrayList<>());
        }
    }

    // Post new alert
    @PostMapping("/alerts")
    public ResponseEntity<String> postAlert(@RequestBody Alert alert) {
        if (alert.getZoneId() == null || alert.getType() == null || alert.getMessage() == null) {
            return ResponseEntity.badRequest().body("Missing required fields: zoneId, type, or message");
        }
        try {
            if (alert.getStatus() == null || alert.getStatus().isBlank()) {
                alert.setStatus("active");
            }
            alert.setTimestamp(LocalDateTime.now());
            alertRepository.save(alert);
            return ResponseEntity.ok("Alert saved successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error saving alert: " + e.getMessage());
        }
    }

    // Fetch active routes
    @GetMapping("/routes")
    public ResponseEntity<List<Route>> getActiveRoutes() {
        try {
            List<Route> routes = routeRepository.findByIsActive(true);
            return ResponseEntity.ok(routes != null ? routes : new java.util.ArrayList<>());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new java.util.ArrayList<>());
        }
    }

    // Fetch full alert history
    @GetMapping("/alerts/history")
    public ResponseEntity<List<Alert>> getAlertHistory() {
        try {
            List<Alert> history = alertRepository.findAllByOrderByTimestampDesc();
            return ResponseEntity.ok(history != null ? history : new java.util.ArrayList<>());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new java.util.ArrayList<>());
        }
    }

    // Calculate safe routes based on start and destination coordinates
    @PostMapping("/routes/calculate")
    public ResponseEntity<Object> calculateSafeRoutes(@RequestBody java.util.Map<String, Object> request) {
        try {
            // Extract coordinates from request
            java.util.Map<String, Object> start = (java.util.Map<String, Object>) request.get("start");
            java.util.Map<String, Object> dest = (java.util.Map<String, Object>) request.get("destination");

            if (start == null || dest == null) {
                return ResponseEntity.badRequest().body(java.util.Map.of("error", "Start and destination coordinates required"));
            }

            Double startLat = Double.valueOf(start.get("lat").toString());
            Double startLng = Double.valueOf(start.get("lng").toString());
            Double destLat = Double.valueOf(dest.get("lat").toString());
            Double destLng = Double.valueOf(dest.get("lng").toString());

            // Get current density data to avoid high-density areas
            List<DensityData> recentDensity = densityDataRepository.findLatestDensityData();

            // Calculate safe route waypoints
            java.util.List<java.util.Map<String, Object>> waypoints = calculateSafeWaypoints(
                startLat, startLng, destLat, destLng, recentDensity);

            // Calculate route metrics
            double distance = calculateHaversineDistance(startLat, startLng, destLat, destLng);
            String safetyLevel = calculateSafetyLevel(waypoints, recentDensity);

            // Prepare response
            java.util.Map<String, Object> route = new java.util.HashMap<>();
            route.put("waypoints", waypoints);
            route.put("distance", distance);
            route.put("safety", safetyLevel);
            route.put("estimatedTime", Math.round(distance * 12)); // Rough estimate: 12 min per km

            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("route", route);
            response.put("generatedAt", LocalDateTime.now().toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(java.util.Map.of("error", e.getMessage()));
        }
    }

    private java.util.List<java.util.Map<String, Object>> calculateSafeWaypoints(
            Double startLat, Double startLng, Double destLat, Double destLng,
            List<DensityData> densityData) {

        java.util.List<java.util.Map<String, Object>> waypoints = new java.util.ArrayList<>();

        // Add start point
        java.util.Map<String, Object> startPoint = new java.util.HashMap<>();
        startPoint.put("lat", startLat);
        startPoint.put("lng", startLng);
        waypoints.add(startPoint);

        // Calculate intermediate points to avoid high-density areas
        double midLat = (startLat + destLat) / 2;
        double midLng = (startLng + destLng) / 2;

        // Check if midpoint has high density and adjust if needed
        boolean midPointSafe = isPointSafe(midLat, midLng, densityData);

        if (!midPointSafe) {
            // Try alternative routes by offsetting the midpoint
            double offset = 0.005; // ~500m offset
            java.util.List<double[]> alternatives = java.util.Arrays.asList(
                new double[]{midLat + offset, midLng},
                new double[]{midLat - offset, midLng},
                new double[]{midLat, midLng + offset},
                new double[]{midLat, midLng - offset}
            );

            for (double[] alt : alternatives) {
                if (isPointSafe(alt[0], alt[1], densityData)) {
                    midLat = alt[0];
                    midLng = alt[1];
                    break;
                }
            }
        }

        // Add intermediate point
        java.util.Map<String, Object> midPoint = new java.util.HashMap<>();
        midPoint.put("lat", midLat);
        midPoint.put("lng", midLng);
        waypoints.add(midPoint);

        // Add destination point
        java.util.Map<String, Object> destPoint = new java.util.HashMap<>();
        destPoint.put("lat", destLat);
        destPoint.put("lng", destLng);
        waypoints.add(destPoint);

        return waypoints;
    }

    private boolean isPointSafe(double lat, double lng, List<DensityData> densityData) {
        final double DANGER_RADIUS = 0.002; // ~200m radius

        for (DensityData data : densityData) {
            if (data.getDensity() != null && data.getDensity().equalsIgnoreCase("High")) {
                // Use actual coordinates if available, otherwise use zone-based defaults
                double dataLat = data.getLatitude() != null ? data.getLatitude() : getZoneLatitude(data.getZoneId());
                double dataLng = data.getLongitude() != null ? data.getLongitude() : getZoneLongitude(data.getZoneId());

                double distance = calculateHaversineDistance(lat, lng, dataLat, dataLng);
                if (distance < DANGER_RADIUS) {
                    return false;
                }
            }
        }
        return true;
    }

    private String calculateSafetyLevel(java.util.List<java.util.Map<String, Object>> waypoints,
                                       List<DensityData> densityData) {
        int safePoints = 0;
        for (java.util.Map<String, Object> point : waypoints) {
            double lat = Double.valueOf(point.get("lat").toString());
            double lng = Double.valueOf(point.get("lng").toString());
            if (isPointSafe(lat, lng, densityData)) {
                safePoints++;
            }
        }

        double safetyRatio = (double) safePoints / waypoints.size();
        if (safetyRatio >= 0.8) return "High";
        else if (safetyRatio >= 0.6) return "Medium";
        else return "Low";
    }

    private double calculateHaversineDistance(double lat1, double lng1, double lat2, double lng2) {
        final int EARTH_RADIUS = 6371; // Radius in kilometers

        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLng / 2) * Math.sin(dLng / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return EARTH_RADIUS * c;
    }
    
    // Zone-based coordinate mapping for Nashik areas
    private double getZoneLatitude(Integer zoneId) {
        switch (zoneId != null ? zoneId : 1) {
            case 1: return 19.9975; // Nashik Central
            case 2: return 20.0059; // Nashik Road
            case 3: return 19.9923; // College Road
            case 4: return 20.0104; // Gangapur Road
            case 5: return 19.9844; // Panchavati
            default: return 19.9975; // Default to center
        }
    }
    
    private double getZoneLongitude(Integer zoneId) {
        switch (zoneId != null ? zoneId : 1) {
            case 1: return 73.7898; // Nashik Central
            case 2: return 73.7749; // Nashik Road
            case 3: return 73.7749; // College Road
            case 4: return 73.7749; // Gangapur Road
            case 5: return 73.7749; // Panchavati
            default: return 73.7898; // Default to center
        }
    }
}
