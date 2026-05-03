import cv2

class VideoExporter:
    def __init__(self):
        """
        Responsible for assembling frames reconstructed in the Decoder
        and saving them to a final video file.
        """
        self._out = None
        self._width = 0
        self._height = 0

    def setup(self, filename, fps, width, height):
        """
        Initializes the video file, handling dimension and codec compatibility.
        """
        # 1. Ensure dimensions are even (required for some codecs)
        self._width = int(width) if int(width) % 2 == 0 else int(width) - 1
        self._height = int(height) if int(height) % 2 == 0 else int(height) - 1
        
        # 2. Use MJPG codec with .avi container.
        # This combination is highly compatible for environments like Docker.
        fourcc = cv2.VideoWriter_fourcc(*'MJPG')
        
        self._out = cv2.VideoWriter(
            filename, 
            fourcc, 
            float(fps), 
            (self._width, self._height)
        )
        
        if not self._out.isOpened():
            print(f"[VideoExporter] Error: Could not create file {filename}")
        else:
            print(f"[VideoExporter] Success! File created: {filename} ({self._width}x{self._height})")

    def write_frame(self, frame):
        """
        Writes the frame to the file after verifying dimension matching.
        """
        if self._out is not None and frame is not None:
            # Verify current frame matches the dimensions of the opened video file
            if frame.shape[1] != self._width or frame.shape[0] != self._height:
                # Resize to avoid OpenCV assertion failures
                frame = cv2.resize(frame, (self._width, self._height))
                
            self._out.write(frame)

    def release(self):
        """
        Closes the file and flushes the buffer to ensure the video is saved to disk.
        """
        if self._out is not None:
            self._out.release()
            self._out = None
            print("[VideoExporter] Final buffer flushed to disk. Video saved successfully.")

    def __del__(self):
        """Destructor to ensure file is closed if release() is not called"""
        self.release()