import cv2
import numpy as np
import base64

class ImageTool:
    def __init__(self):
        """
        Initializes the tool with motion and temporal noise memory
        to eliminate frozen effects and maintain smooth motion.
        """
        self.prev_landmarks = None
        # Smoothing factor for large motions
        self.base_smoothing = 0.15 
        self.vitality_threshold = 0.002
        self.rng = np.random.default_rng()
        
        # Buffer for previous noise to prevent jumping/flickering effect
        self.prev_noise = None 

    def apply_hybrid_motion(self, reference_frame, base_landmarks, target_landmarks, fringe_mask, boundary_vec):
        """
        Applies semantic motion with temporally correlated noise blending 
        to ensure video realism and smoothness.
        """
        try:
            curr_pts = np.array([[p.x, p.y] for p in target_landmarks], dtype=np.float32)

            # 1. Adaptive Motion Smoothing
            if self.prev_landmarks is not None:
                dist = np.linalg.norm(curr_pts - self.prev_landmarks, axis=1)
                avg_dist = np.mean(dist)
                # Increase responsiveness during active motion and decrease it during stillness
                dynamic_alpha = min(0.8, self.base_smoothing + (avg_dist * 45))
                final_pts = (dynamic_alpha * curr_pts) + ((1 - dynamic_alpha) * self.prev_landmarks)
                self.prev_landmarks = final_pts
            else:
                final_pts = curr_pts
                self.prev_landmarks = curr_pts

            # 2. Generate warped face based on smoothed landmarks
            face_warped = self.warp_vital(reference_frame, base_landmarks, final_pts)
            
            # 3. [Temporal Noise Injection]
            # Generate raw random noise
            current_raw_noise = self.rng.normal(0, 2.2, face_warped.shape).astype(np.float32)
            
            if self.prev_noise is not None and self.prev_noise.shape == face_warped.shape:
                # Blend current noise with previous at 60:40 ratio for visual fluidity (Temporal Correlation).
                # This prevents high-frequency flickering and integrates the noise naturally.
                self.prev_noise = (0.4 * self.prev_noise) + (0.6 * current_raw_noise)
            else:
                self.prev_noise = current_raw_noise
            
            # Add temporal noise to the warped face
            face_warped = cv2.add(face_warped.astype(np.float32), self.prev_noise)
            face_warped = np.clip(face_warped, 0, 255).astype(np.uint8)

            # 4. Background and boundary processing
            rows, cols = reference_frame.shape[:2]
            tx, ty = boundary_vec if len(boundary_vec) == 2 else (0, 0)
            M_shift = np.float32([[1, 0, tx], [0, 1, ty]])
            fringe_warped = cv2.warpAffine(reference_frame, M_shift, (cols, rows), flags=cv2.INTER_LINEAR)
            
            # Apply noise to the background for visual consistency
            fringe_warped = cv2.add(fringe_warped.astype(np.float32), self.prev_noise * 0.8)
            fringe_warped = np.clip(fringe_warped, 0, 255).astype(np.uint8)

            # 5. Seamless Blending
            mask_float = fringe_mask.astype(np.float32) / 255.0
            mask_smoothed = cv2.GaussianBlur(mask_float, (25, 25), 0)
            mask_3ch = cv2.merge([mask_smoothed]*3)

            combined = (face_warped.astype(np.float32) * mask_3ch + 
                        fringe_warped.astype(np.float32) * (1.0 - mask_3ch))
            
            return combined.astype(np.uint8)
        except Exception as e:
            return reference_frame

    def warp_vital(self, img, points_src, final_pts):
        """Geometric transformation using INTER_CUBIC for detail sharpness and motion smoothness."""
        src_pts = np.array([[p.x, p.y] for p in points_src], dtype=np.float32)
        M, _ = cv2.findHomography(src_pts, final_pts, cv2.RANSAC, 1.0)
        return cv2.warpPerspective(img, M, (img.shape[1], img.shape[0]), 
                                 flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT101)

    def to_base64(self, frame):
        """Prepare frame for transmission."""
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 90])
        return base64.b64encode(buffer).decode('utf-8')

    def from_base64(self, base64_string):
        """Decode received frame."""
        jpg_original = base64.b64decode(base64_string)
        jpg_as_np = np.frombuffer(jpg_original, dtype=np.uint8)
        return cv2.imdecode(jpg_as_np, cv2.IMREAD_COLOR)