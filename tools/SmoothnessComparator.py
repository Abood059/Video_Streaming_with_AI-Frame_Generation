import cv2
import numpy as np
import os

class SmoothnessComparator:
    def __init__(self, original_path, generated_path):
        self.original_path = original_path
        self.generated_path = generated_path

    def _get_video_smoothness(self, video_path):
        cap = cv2.VideoCapture(video_path)
        prev_gray = None
        motion_magnitudes = []
        
        print(f"Analyzing: {os.path.basename(video_path)}...", end="\r")

        while True:
            ret, frame = cap.read()
            if not ret: break

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            if prev_gray is not None:
                # Calculate Optical Flow using OpenCV Farneback algorithm
                flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
                motion_magnitudes.append(np.mean(mag))
            
            prev_gray = gray

        cap.release()
        
        # Motion standard deviation (lower means higher smoothness)
        motion_std = np.std(motion_magnitudes)
        # Smoothness score based on flow stability
        smoothness_score = max(0, 100 - (motion_std * 20))
        
        return motion_std, smoothness_score

    def compare(self):
        print("[Smoothness Lab] Comparing Original vs Generated Flow")
        print("-" * 50)
        
        orig_std, orig_score = self._get_video_smoothness(self.original_path)
        print(f"\nOriginal Video: {orig_score:.2f}% Smooth")
        
        gen_std, gen_score = self._get_video_smoothness(self.generated_path)
        print(f"Generated Video: {gen_score:.2f}% Smooth")
        
        # Calculate Smoothness Gap
        smoothness_gap = abs(orig_score - gen_score)
        
        print("\n" + "="*50)
        print("MOTION SMOOTHNESS REPORT")
        print("="*50)
        print(f"Original Smoothness  : {orig_score:.2f}%")
        print(f"Generated Smoothness : {gen_score:.2f}%")
        print(f"Smoothness Gap       : {smoothness_gap:.2f}%")
        print("-" * 50)
        
        if smoothness_gap < 5:
            print("Result: Motion is perfectly preserved (Identical fluid motion)")
        elif smoothness_gap < 10:
            print("Result: Good Stability (Very stable motion)")
        else:
            print("Result: Jitter Detected (Noticeable motion jitter detected)")
        print("="*50 + "\n")

if __name__ == "__main__":
    comparator = SmoothnessComparator("short_video.mp4", "reconstructed_output.avi")
    comparator.compare()