package com.crowdshield.repository;

import com.crowdshield.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByStatus(String status);
    List<Alert> findByStatusAndZoneId(String status, Integer zoneId);
    List<Alert> findAllByOrderByTimestampDesc();
}
