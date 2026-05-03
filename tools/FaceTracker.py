import mediapipe as mp
import cv2
import numpy as np

class FacePoint:
    """Simulated MediaPipe landmark object to ensure compatibility with network-received data"""
    def __init__(self, x, y, z):
        self.x = x
        self.y = y
        self.z = z

class FaceTracker:
    def __init__(self):
        # Initialize Face Mesh with refined landmarks enabled
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )

        # Indices for outer face boundary landmarks in MediaPipe model.
        # These points drive the motion for the fringe area (hair and neck).
        self.boundary_indices = [
            10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
            397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
            172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
        ]

    def get_landmarks(self, frame):
        """Extract face landmarks from the frame"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        if results.multi_face_landmarks:
            return results.multi_face_landmarks[0].landmark
        return None

    def serialize_landmarks(self, landmarks):
        """Convert landmarks to a list of dictionaries for JSON serialization"""
        if not landmarks: return None
        return [{'x': lm.x, 'y': lm.y, 'z': lm.z} for lm in landmarks]

    def deserialize_landmarks(self, data):
        """Convert received data into FacePoint objects"""
        if not data: return None
        return [FacePoint(lm['x'], lm['y'], lm['z']) for lm in data]

    def get_boundary_motion(self, prev_lm, curr_lm):
        """
        Calculate the average motion of boundary points.
        This (dx, dy) value drives the movement of the fringe area in ImageTool.
        """
        if not prev_lm or not curr_lm:
            return {'dx': 0, 'dy': 0}

        dx_list = []
        dy_list = []

        for idx in self.boundary_indices:
            # Calculate coordinate difference for boundary points only
            dx_list.append(curr_lm[idx].x - prev_lm[idx].x)
            dy_list.append(curr_lm[idx].y - prev_lm[idx].y)

        # Calculate mean for smooth and stable motion of the surrounding area
        return {
            'dx': float(np.mean(dx_list)),
            'dy': float(np.mean(dy_list))
        }

    def get_face_hull(self, landmarks, width, height):
        """Helper function to convert landmarks to a pixel point array (Face Hull)"""
        if not landmarks: return None
        points = np.array([[lm.x * width, lm.y * height] for lm in landmarks], dtype=np.int32)
        return cv2.convexHull(points)