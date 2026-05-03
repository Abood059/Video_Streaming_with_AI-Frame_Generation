import cv2
import numpy as np

class Decoder:
    def __init__(self, receiver, img_tool, exporter, tracker):
        self._receiver = receiver
        self._img_tool = img_tool
        self._exporter = exporter
        self._tracker = tracker
        self._last_frame = None
        self._ref_frame = None
        self._ref_landmarks = None
        self._mask = None

    def start_reconstruction(self, output_name, fps, width, height):
        self._exporter.setup(output_name, fps, width, height)
        print(f"[Decoder] Starting hybrid reconstruction (Reference-Generated-Reference)...")
        
        count = 0
        try:
            while True:
                payload = self._receiver.receive_data()
                if payload is None: break
                
                count += 1
                if payload["type"] == "FULL":
                    frame = self._img_tool.from_base64(payload["data"])
                    mask_img = self._img_tool.from_base64(payload["fringe_mask"])
                    if frame is not None:
                        self._ref_frame = frame.copy()
                        self._ref_landmarks = self._tracker.deserialize_landmarks(payload["landmarks"])
                        self._mask = mask_img
                        # Write reference frame
                        self._exporter.write_frame(frame)
                        self._last_frame = frame
                
                elif payload["type"] == "MOTION":
                    if self._ref_frame is not None:
                        target_lm = self._tracker.deserialize_landmarks(payload["target_landmarks"])
                        # Generate frame using semantic motion
                        gen = self._img_tool.apply_hybrid_motion(
                            self._ref_frame, self._ref_landmarks, target_lm, self._mask, payload["boundary_vec"]
                        )
                        # Smoothly blend with previous frame to enhance visual consistency
                        if self._last_frame is not None:
                            final = cv2.addWeighted(gen, 0.7, self._last_frame, 0.3, 0)
                            self._exporter.write_frame(final)
                            self._last_frame = final
                        else:
                            self._exporter.write_frame(gen)
                            self._last_frame = gen

                if count % 100 == 0:
                    print(f"\rProcessing frame {count}...", end="", flush=True)
        finally:
            self._exporter.release()