package com.crowdshield.util;

import java.util.Map;
import java.util.HashMap;

public class LocationUtils {
    
    private static final Map<Integer, String> ZONE_NAMES = new HashMap<>();
    private static final Map<Integer, Double[]> ZONE_COORDINATES = new HashMap<>();
    
    static {
        ZONE_NAMES.put(1, "Nashik Central");
        ZONE_NAMES.put(2, "Nashik Road");
        ZONE_NAMES.put(3, "College Road");
        ZONE_NAMES.put(4, "Gangapur Road");
        ZONE_NAMES.put(5, "Panchavati");
        
        ZONE_COORDINATES.put(1, new Double[]{19.9975, 73.7898});
        ZONE_COORDINATES.put(2, new Double[]{20.0059, 73.7749});
        ZONE_COORDINATES.put(3, new Double[]{19.9923, 73.7749});
        ZONE_COORDINATES.put(4, new Double[]{20.0104, 73.7749});
        ZONE_COORDINATES.put(5, new Double[]{19.9844, 73.7749});
    }
    
    public static String formatLocationMessage(Integer zoneId, Double latitude, Double longitude) {
        String location = ZONE_NAMES.getOrDefault(zoneId, "Nashik");
        
        if (latitude != null && longitude != null) {
            return location + String.format(" (%.4f, %.4f)", latitude, longitude);
        } else {
            Double[] coords = ZONE_COORDINATES.get(zoneId);
            if (coords != null) {
                return location + String.format(" (%.4f, %.4f)", coords[0], coords[1]);
            }
        }
        
        return location;
    }
    
    public static Double[] getZoneCoordinates(Integer zoneId) {
        return ZONE_COORDINATES.get(zoneId);
    }
}