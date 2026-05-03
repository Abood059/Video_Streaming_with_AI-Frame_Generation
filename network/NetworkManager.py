import queue
import json
import sys

class QueueSender:
    def __init__(self):
        """
        Simulates a sender by storing data in a queue and 
        calculates consumption statistics.
        """
        self.queue = queue.Queue()
        self.total_bytes_sent = 0
        self.full_frames_count = 0
        self.motion_frames_count = 0

    def send_data(self, data):
        """
        Sends the packet and calculates its actual size when converted to JSON.
        """
        json_payload = json.dumps(data)
        packet_size = len(json_payload.encode('utf-8'))

        self.total_bytes_sent += packet_size

        if data["type"] == "FULL":
            self.full_frames_count += 1
        else:
            self.motion_frames_count += 1

        # Put data into the queue for the Decoder to consume
        self.queue.put(data)

    def get_stats(self):
        """
        Returns a detailed performance report on data consumption.
        """
        total_frames = self.full_frames_count + self.motion_frames_count
        if total_frames == 0:
            return "No data sent yet."

        return {
            "total_mb": self.total_bytes_sent / (1024 * 1024),
            "full_frames": self.full_frames_count,
            "motion_frames": self.motion_frames_count,
            "avg_packet_size_kb": (self.total_bytes_sent / total_frames) / 1024,
            "total_packets": total_frames
        }

class QueueReceiver:
    def __init__(self, shared_queue):
        """
        Simulates a receiver by pulling data from the shared queue.
        """
        self.queue = shared_queue

    def receive_data(self):
        """
        Receives the next packet from the queue.
        Returns None if the queue is empty after a timeout.
        """
        try:
            return self.queue.get(timeout=2)
        except queue.Empty:
            return None