package com.crowdshield.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
public class Alert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "zone_id", nullable = false)
    private Integer zoneId;
    
    @Column(nullable = false, length = 50)
    private String type;
    
    @Column(nullable = false, length = 255)
    private String message;
    
    @Column(length = 20)
    private String status;
    
    private LocalDateTime timestamp;
    
    @Column(name = "latitude")
    private Double latitude;
    
    @Column(name = "longitude")
    private Double longitude;
    
    // Constructors
    public Alert() {}
    
    public Alert(Integer zoneId, String type, String message, String status, LocalDateTime timestamp) {
        this.zoneId = zoneId;
        this.type = type;
        this.message = message;
        this.status = status;
        this.timestamp = timestamp;
    }
    
    public Alert(Integer zoneId, String type, String message, String status, LocalDateTime timestamp, Double latitude, Double longitude) {
        this.zoneId = zoneId;
        this.type = type;
        this.message = message;
        this.status = status;
        this.timestamp = timestamp;
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
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
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
