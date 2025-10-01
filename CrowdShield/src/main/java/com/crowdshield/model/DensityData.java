package com.crowdshield.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "density_data")
public class DensityData {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "zone_id", nullable = false)
    private Integer zoneId;
    
    private LocalDateTime timestamp;
    
    @Column(nullable = false)
    private Integer count;
    
    @Column(nullable = false)
    private String density;
    
    @Column(name = "latitude")
    private Double latitude;
    
    @Column(name = "longitude")
    private Double longitude;
    
    // Constructors
    public DensityData() {}
    
    public DensityData(Integer zoneId, LocalDateTime timestamp, Integer count, String density) {
        this.zoneId = zoneId;
        this.timestamp = timestamp;
        this.count = count;
        this.density = density;
    }
    
    public DensityData(Integer zoneId, LocalDateTime timestamp, Integer count, String density, Double latitude, Double longitude) {
        this.zoneId = zoneId;
        this.timestamp = timestamp;
        this.count = count;
        this.density = density;
        this.latitude = latitude;
        this.longitude = longitude;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getZoneId() {
        return zoneId;
    }
    
    public void setZoneId(Integer zoneId) {
        this.zoneId = zoneId;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public Integer getCount() {
        return count;
    }
    
    public void setCount(Integer count) {
        this.count = count;
    }
    
    public String getDensity() {
        return density;
    }
    
    public void setDensity(String density) {
        this.density = density;
    }
    
    public Double getLatitude() {
        return latitude;
    }
    
    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }
    
    public Double getLongitude() {
        return longitude;
    }
    
    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
}
