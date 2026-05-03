import cv2
import os

class Video:
    def __init__(self, video_path):
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found at: {video_path}")
            
        self.video_path = video_path
        self.cap = cv2.VideoCapture(video_path)
        
        # Read a sample frame to determine accurate dimensions
        ret, frame = self.cap.read()
        if ret:
            self.width = frame.shape[1]
            self.height = frame.shape[0]
        else:
            self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        # Reset video capture pointer to the beginning
        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)

    def get_capture(self):
        return self.cap

    def get_fps(self):
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        return fps if fps > 0 else 30.0

    def get_dimensions(self):
        return self.width, self.height

    def release(self):
        if self.cap: self.cap.release()