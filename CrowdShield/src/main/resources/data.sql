-- Insert sample DensityData
INSERT INTO density_data (zone_id, timestamp, count, density) VALUES
(1, NOW(), 45, 'Medium'),
(2, NOW(), 20, 'Low'),
(3, NOW(), 8, 'Very Low'),
(4, NOW(), 60, 'High'),
(1, DATE_SUB(NOW(), INTERVAL 1 HOUR), 35, 'Medium'),
(2, DATE_SUB(NOW(), INTERVAL 1 HOUR), 15, 'Low'),
(3, DATE_SUB(NOW(), INTERVAL 1 HOUR), 25, 'Medium'),
(4, DATE_SUB(NOW(), INTERVAL 1 HOUR), 50, 'High');

-- Insert sample Alerts
INSERT INTO alerts (zone_id, type, message, status, timestamp) VALUES
(1, 'Congestion', 'High crowd density detected in Zone 1', 'active', NOW()),
(4, 'Congestion', 'Very high crowd density detected in Zone 4', 'active', NOW()),
(2, 'Safety', 'Safety protocol activated in Zone 2', 'resolved', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(3, 'Maintenance', 'Maintenance required in Zone 3', 'active', DATE_SUB(NOW(), INTERVAL 30 MINUTE)),
(1, 'Emergency', 'Emergency situation in Zone 1', 'resolved', DATE_SUB(NOW(), INTERVAL 3 HOUR));

-- Insert sample Routes
INSERT INTO routes (start_point, end_point, route_details, is_active) VALUES
('Gate 1', 'Main Hall', 'Direct route through corridor A', 1),
('Gate 2', 'Main Hall', 'Alternative route via corridor B', 1),
('Main Hall', 'Exit 1', 'Emergency exit route', 0),
('Gate 3', 'Main Hall', 'Scenic route through garden', 1),
('Main Hall', 'Exit 2', 'Secondary exit route', 1),
('Gate 1', 'Exit 3', 'Quick exit route', 0);

