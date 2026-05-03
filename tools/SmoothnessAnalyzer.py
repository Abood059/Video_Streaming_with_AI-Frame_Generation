import cv2
import numpy as np

class SmoothnessAnalyzer:
    def __init__(self, video_path):
        self.video_path = video_path

    def analyze(self):
        cap = cv2.VideoCapture(self.video_path)
        prev_gray = None
        motion_variations = []
        
        print(f"[Smoothness] Analyzing temporal flow using OpenCV Farneback...")

        while True:
            ret, frame = cap.read()
            if not ret: break

            # Convert frame to grayscale to reduce computational overhead
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            if prev_gray is not None:
                # Calculate optical flow using OpenCV Farneback algorithm
                flow = cv2.calcOpticalFlowFarneback(
                    prev_gray, gray, None, 
                    0.5, 3, 15, 3, 5, 1.2, 0
                )
                
                # Calculate displacement magnitude for each pixel
                mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
                motion_variations.append(np.mean(mag))
            
            prev_gray = gray

        cap.release()

        # Mathematically analyze smoothness using NumPy
        motion_std = np.std(motion_variations)
        # Smoothness score (lower standard deviation means higher score)
        smoothness_score = max(0, 100 - (motion_std * 20)) 
        
        return motion_std, smoothness_score

if __name__ == "__main__":
    analyzer = SmoothnessAnalyzer("reconstructed_output.avi")
    std, score = analyzer.analyze()
    print(f"Motion Stability (Lower is better): {std:.4f}")
    print(f"Smoothness Score: {score:.2f}%")