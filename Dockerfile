FROM python:3.9-slim

# Set environment to avoid interactive prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update and install stable dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements first for better build caching
COPY requirements.txt .

# Install Python libraries
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# Copy the rest of the files
COPY . .

CMD ["python", "main.py"]