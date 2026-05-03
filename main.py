import os
import sys
import cv2

# Add current path to ensure modules are imported correctly from subdirectories
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import internal modules
from entities.Video import Video
from tools.FaceTracker import FaceTracker
from tools.SemanticSegmenter import SemanticSegmenter
from tools.ImageTool import ImageTool
from network.NetworkManager import QueueSender, QueueReceiver
from tools.VideoExporter import VideoExporter
from core.Encoder import Encoder
from core.Decoder import Decoder

def main():
    # --- 1. Configurations and Paths ---
    input_video_path = "short_video.mp4"  
    output_video_path = "reconstructed_output.avi"
    
    if not os.path.exists(input_video_path):
        print(f"Error: Input video '{input_video_path}' not found!")
        return

    # --- 2. Tool Initialization ---
    tracker = FaceTracker()
    segmenter = SemanticSegmenter()
    img_tool = ImageTool()
    exporter = VideoExporter()
    
    # Initialize queue-based network simulation for communication between Encoder and Decoder
    sender = QueueSender()
    receiver = QueueReceiver(sender.queue)

    # --- 3. Initialize Video entity and read properties ---
    video_entity = Video(input_video_path)
    fps = video_entity.get_fps()
    width, height = video_entity.get_dimensions()
    
    # Validate dimensions (workaround for potential detection issues)
    if width <= 0 or height <= 0:
        print("Warning: OpenCV could not detect dimensions. Attempting fallback...")
        cap_temp = cv2.VideoCapture(input_video_path)
        ret, frame_temp = cap_temp.read()
        if ret:
            height, width = frame_temp.shape[:2]
        else:
            width, height = 640, 480  # Default values in case of failure
        cap_temp.release()

    print(f"Video Stream Info: {width}x{height} @ {fps} FPS")

    # --- 4. Core Components Initialization ---
    encoder = Encoder(
        video_entity=video_entity, 
        tracker=tracker, 
        segmenter=segmenter, 
        img_tool=img_tool, 
        sender=sender
    )
    
    decoder = Decoder(
        receiver=receiver, 
        img_tool=img_tool, 
        exporter=exporter, 
        tracker=tracker
    )

    # --- 5. Execution ---
    print("\n--- Starting Semantic Hybrid Streaming System ---")
    
    # Part 1: Start Encoder (Analysis and Transmission)
    # n_split=3 sends one reference frame for every 2 semantic motion frames
    encoder.start_analysis(n_split=3)
    
    # Part 2: Start Decoder (Reception and Reconstruction)
    decoder.start_reconstruction(
        output_name=output_video_path,
        fps=fps,
        width=width,
        height=height
    )

    # --- 6. Performance Benchmark Report ---
    stats = sender.get_stats()
    print("\n" + "="*40)
    print("SEMANTIC PERFORMANCE REPORT")
    print("="*40)
    
    if isinstance(stats, dict):
        print(f"Total Data Sent      : {stats['total_mb']:.2f} MB")
        print(f"Full Reference Frames: {stats['full_frames']}")
        print(f"Semantic Motion Frames: {stats['motion_frames']}")
        print(f"Avg Packet Size      : {stats['avg_packet_size_kb']:.2f} KB")
        
        # Calculate estimated bandwidth savings based on motion frame frequency
        total_p = stats['full_frames'] + stats['motion_frames']
        if total_p > 0:
            savings = (stats['motion_frames'] / total_p) * 90 
            print(f"Estimated Bandwidth Savings: ~{savings:.1f}%")
    else:
        print(stats)
        
    print("="*40)
    print(f"\nProcess Finished! Output saved as: {output_video_path}")

if __name__ == "__main__":
    main()