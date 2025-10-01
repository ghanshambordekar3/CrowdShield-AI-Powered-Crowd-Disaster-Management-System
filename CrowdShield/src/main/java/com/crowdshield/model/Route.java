package com.crowdshield.model;

import jakarta.persistence.*;

@Entity
@Table(name = "routes")
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "start_point")
    private String startPoint;
    
    @Column(name = "end_point")
    private String endPoint;
    
    @Column(name = "route_details")
    private String routeDetails;
    
    @Column(name = "is_active")
    private Boolean isActive;
    
    // Constructors
    public Route() {}
    
    public Route(String startPoint, String endPoint, String routeDetails, Boolean isActive) {
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.routeDetails = routeDetails;
        this.isActive = isActive;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getStartPoint() {
        return startPoint;
    }
    
    public void setStartPoint(String startPoint) {
        this.startPoint = startPoint;
    }
    
    public String getEndPoint() {
        return endPoint;
    }
    
    public void setEndPoint(String endPoint) {
        this.endPoint = endPoint;
    }
    
    public String getRouteDetails() {
        return routeDetails;
    }
    
    public void setRouteDetails(String routeDetails) {
        this.routeDetails = routeDetails;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}
