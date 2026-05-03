import socket
import json

class Sender:
    def __init__(self, host, port, manager):
        self._host = host
        self._port = port
        self._manager = manager
        self._socket = None

    def connect(self):
        """Open connection with the receiver"""
        try:
            self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._socket.connect((self._host, self._port))
            print(f"[Sender] Connected to {self._host}:{self._port}")
            return True
        except Exception as e:
            print(f"[Sender] Connection failed: {e}")
            return False

    def send_data(self, data):
        """Send data and calculate size in the manager"""
        if self._socket is None:
            return

        try:
            json_data = json.dumps(data)
            payload = json_data.encode('utf-8')
            
            # Send 10-byte Header defining message size
            header = f"{len(payload):<10}".encode('utf-8')
            self._socket.sendall(header + payload)
            
            # Update usage counter in NetworkManager
            self._manager.add_usage(len(payload) + 10)
        except Exception as e:
            raise e

    def close(self):
        if self._socket:
            self._socket.close()
            print("[Sender] Connection closed.")