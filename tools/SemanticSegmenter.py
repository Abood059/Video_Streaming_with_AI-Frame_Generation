import cv2
import numpy as np
import mediapipe as mp

class SemanticSegmenter:
    def __init__(self):
        """
        Initializes MediaPipe Selfie Segmentation.
        model_selection=1: Provides higher edge accuracy (Landscape model).
        """
        self.mp_selfie = mp.solutions.selfie_segmentation
        self.segmenter = self.mp_selfie.SelfieSegmentation(model_selection=1)

    def get_masks(self, frame, face_landmarks):
        """
        Extracts three essential masks for semantic analysis.
        1. Full Head Mask: Entire head, hair, and neck.
        2. Face Mask: Feature-only region (inside MediaPipe landmarks).
        3. Fringe Mask: Surrounding fringe area (hair and neck).
        """
        h, w = frame.shape[:2]
        
        # 1. Get the full body and head mask from MediaPipe
        # Convert image to RGB for processing
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.segmenter.process(rgb_frame)
        
        # Convert the result into a binary mask
        # 0.5 confidence threshold; above is human, below is background
        _, full_head_mask = cv2.threshold(results.segmentation_mask, 0.5, 255, cv2.THRESH_BINARY)
        full_head_mask = full_head_mask.astype(np.uint8)

        # 2. Create the inner face mask based on landmarks
        face_mask = np.zeros((h, w), dtype=np.uint8)
        if face_landmarks:
            # Convert normalized coordinates to pixel coordinates
            points = np.array([[lm.x * w, lm.y * h] for lm in face_landmarks], dtype=np.int32)
            
            # Calculate the convex hull for the face boundaries
            hull = cv2.convexHull(points)
            
            # Fill the face region with white on the black mask
            cv2.fillConvexPoly(face_mask, hull, 255)

        # 3. Extract the fringe region (to be moved by boundary vectors)
        # Mathematical operation: (Full Head Mask) - (Inner Face Mask)
        # Use Bitwise AND with NOT to get the difference between the two areas
        fringe_mask = cv2.bitwise_and(full_head_mask, cv2.bitwise_not(face_mask))

        return full_head_mask, face_mask, fringe_mask

    def get_isolated_fringe(self, frame, fringe_mask):
        """Helper function to isolate fringe pixels from the original image"""
        return cv2.bitwise_and(frame, frame, mask=fringe_mask)