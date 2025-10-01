package com.crowdshield.repository;

import com.crowdshield.model.DensityData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DensityDataRepository extends JpaRepository<DensityData, Long> {
    
    @Query("SELECT d FROM DensityData d ORDER BY d.timestamp DESC")
    List<DensityData> findLatestDensityData();
    
    List<DensityData> findByZoneId(Integer zoneId);
    List<DensityData> findByZoneId(Integer zoneId, Pageable pageable);

    @Query("SELECT DISTINCT d.zoneId FROM DensityData d")
    List<Integer> findDistinctZoneIds();
}
