import cv2
import numpy as np
from ultralytics import YOLO
import requests
import json
import time
from datetime import datetime
import argparse
from typing import Union

class CrowdDetector:
    def __init__(self, video_source: Union[int, str] = 0, api_url: str = "https://crowdshield-ais-powered-crowd-disaster.onrender.com/api/density", zone_id: int = 1):
        """_
        Initialize the crowd detector with YOLOv8 model and API configuration
        
        Args:
            video_source: Camera index (0 for default webcam) or RTSP/HTTP URL
            api_url: Backend API endpoint for sending density data
            zone_id: Zone identifier for this camera
        """
        self.video_source = video_source
        if not api_url.endswith('/api/density'):
            print(f"Warning: API URL does not end with '/api/density'. Appending it.")
            self.api_url = api_url.rstrip('/') + '/api/density'
        self.api_url = api_url
        self.zone_id = zone_id
        
        # Load YOLOv8 model (will download automatically if not available)
        print("Loading YOLOv8 model...")
        self.model = YOLO('yolov8n.pt')  # Using nano version for speed
        
        # Class names for COCO dataset (person is class 0)
        self.class_names = self.model.names
        
        # Density thresholds
        self.density_thresholds = {
            'Low': 50,
            'Medium': 100,
            'High': float('inf')
        }
        
        # Initialize video capture
        self.cap = cv2.VideoCapture(self.video_source)
        if not self.cap.isOpened():
            print(f"❌ Error: Cannot open video source: {self.video_source}")
            raise ValueError(f"Cannot open video source: {self.video_source}")
            
        print(f"✅ Video source opened successfully: {video_source}")
        
    def classify_density(self, count):
        """Classify crowd density based on count"""
        if count < self.density_thresholds['Low']:
            return 'Low'
        elif count < self.density_thresholds['Medium']:
            return 'Medium'
        else:
            return 'High'
    
    def send_to_backend(self, count, density_level):
        """Send crowd data to backend API"""
        data = {
            "zoneId": self.zone_id,
            "timestamp": datetime.now().isoformat(),
            "count": count,
            "density": density_level
        }
        
        try:
            response = requests.post(
                self.api_url,
                json=data,
                headers={'Content-Type': 'application/json'},
                timeout=5
            )
            
            if response.status_code == 200:
                print(f"✅ Data sent successfully: {count} people, {density_level} density")
            elif response.status_code >= 400:
                print(f"❌ API Error: {response.status_code} - {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Network error: {e}")
    
    def process_frame(self, frame):
        """Process a single frame for crowd detection"""
        # Run YOLOv8 inference
        results = self.model(frame, verbose=False)
        
        # Count people (class 0 in COCO dataset)
        person_count = 0
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    if class_id == 0:  # Person class
                        person_count += 1
        
        return person_count, results[0].plot() if results else frame
    
    def run(self):
        """Main detection loop"""
        print("Starting crowd detection...")
        print("Press 'q' to quit")
        
        frame_count = 0
        send_interval = 5  # Send data every 5 seconds
        
        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    print("❌ Failed to grab frame. End of video stream or camera error.")
                    break
                
                # Process frame
                person_count, processed_frame = self.process_frame(frame)
                
                # Classify density
                density_level = self.classify_density(person_count)
                
                # Display results
                cv2.putText(processed_frame, f"People: {person_count}", (10, 30),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                cv2.putText(processed_frame, f"Density: {density_level}", (10, 70),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                
                # Show frame
                cv2.imshow('Crowd Detection', processed_frame)
                
                # Send data to backend at intervals
                if frame_count > 0 and frame_count % (30 * send_interval) == 0:  # Assuming 30 FPS
                    self.send_to_backend(person_count, density_level)
                
                frame_count += 1
                
                # Break on 'q' key
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                    
        except KeyboardInterrupt:
            print("\nℹ️ Detection stopped by user.")
        finally:
            self.cap.release()
            cv2.destroyAllWindows()
    
    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, 'cap'):
            self.cap.release()
        cv2.destroyAllWindows()

def main():
    parser = argparse.ArgumentParser(description='Real-time Crowd Detection with YOLOv8')
    parser.add_argument('--source', type=str, default='0',
                       help='Video source (0 for webcam, or RTSP/HTTP URL)')
    parser.add_argument('--api-url', type=str, default='https://crowdshield-ais-powered-crowd-disaster.onrender.com/api/density',
                       help='Backend API URL')
    parser.add_argument('--zone-id', type=int, default=1,
                       help='Zone identifier')
    
    args = parser.parse_args()
    
    # Convert source to int if it's a camera index
    try:
        video_source = int(args.source)
    except ValueError:
        video_source = args.source
    
    # Initialize and run detector
    detector = CrowdDetector(
        video_source=video_source,
        api_url=args.api_url,
        zone_id=args.zone_id
    )
    
    detector.run()

if __name__ == "__main__":
    main()
