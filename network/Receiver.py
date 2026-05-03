import socket
import json

class Receiver:
    def __init__(self, port):
        self._port = port
        self._server_socket = None
        self._client_socket = None

    def start_server(self):
        self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._server_socket.bind(('0.0.0.0', self._port))
        self._server_socket.listen(1)
        print(f"[Receiver] Listening on port {self._port}...")
        
        self._client_socket, addr = self._server_socket.accept()
        print(f"[Receiver] Connection established with {addr}")

    def receive_data(self):
        """Receive data based on Header size"""
        try:
            # 1. Read Header (first 10 bytes) to determine message length
            header = self._client_socket.recv(10).decode('utf-8').strip()
            if not header:
                return None
            
            size = int(header)
            
            # 2. Read full message based on size
            data = b""
            while len(data) < size:
                packet = self._client_socket.recv(size - len(data))
                if not packet:
                    return None
                data += packet
                
            return json.loads(data.decode('utf-8'))
        except Exception:
            return None

    def close(self):
        if self._client_socket:
            self._client_socket.close()
        if self._server_socket:
            self._server_socket.close()