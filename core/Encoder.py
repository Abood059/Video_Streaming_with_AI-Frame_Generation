import cv2

class Encoder:
    def __init__(self, video_entity, tracker, segmenter, img_tool, sender):
        """
        Manages the semantic analysis and transmission process.
        :param video_entity: Source video object.
        :param tracker: FaceTracker object for landmark extraction.
        :param segmenter: SemanticSegmenter object for head isolation.
        :param img_tool: Image processing and conversion tools.
        :param sender: Network data transmission object.
        """
        self._video = video_entity
        self._tracker = tracker
        self._segmenter = segmenter
        self._img_tool = img_tool
        self._sender = sender
        self._last_landmarks = None # Store the state of the previous frame

    def start_analysis(self, n_split=3):
        cap = self._video.get_capture()
        frame_count = 0
        
        print(f"[Encoder] Semantic Analysis with Fringe Tracking (n_split={n_split})")
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            frame_count += 1
            # 1. Extract current landmarks
            current_landmarks = self._tracker.get_landmarks(frame)
            if current_landmarks is None:
                continue

            # 2. Decision: Send full frame (Reference) or motion data
            if frame_count == 1 or frame_count % n_split == 0 or self._last_landmarks is None:
                # Extract masks (Head, Face, and Fringe area)
                _, _, fringe_mask = self._segmenter.get_masks(frame, current_landmarks)
                
                data = {
                    "type": "FULL",
                    "data": self._img_tool.to_base64(frame),
                    "fringe_mask": self._img_tool.to_base64(fringe_mask), # Send the fringe mask
                    "landmarks": self._tracker.serialize_landmarks(current_landmarks),
                    "frame_index": frame_count
                }
                print("F", end="", flush=True)
            
            else:
                # Calculate boundary motion (displacement vector for the fringe area)
                boundary_vec = self._tracker.get_boundary_motion(self._last_landmarks, current_landmarks)
                
                data = {
                    "type": "MOTION",
                    "target_landmarks": self._tracker.serialize_landmarks(current_landmarks),
                    "boundary_vec": boundary_vec, # Vector to move hair and neck
                    "frame_index": frame_count
                }
                print(".", end="", flush=True)

            # 3. Send data
            try:
                self._sender.send_data(data)
            except Exception as e:
                print(f"\n[Encoder] Network Error: {e}")
                break

            # Update state for the next frame
            self._last_landmarks = current_landmarks

        cap.release()
        print(f"\n[Encoder] Finished. Total frames: {frame_count}")