# Video Streaming with AI-Frame Generation

![Proof of Concept](https://img.shields.io/badge/status-proof%20of%20concept-yellow)
![Bandwidth Reduction](https://img.shields.io/badge/bandwidth~-70%25-blue)

⚠️ This is a proof of concept. Code quality is not production-ready.

A research prototype that reduces video streaming bandwidth by sending sparse key frames and reconstructing intermediate frames on the receiver side using motion vector interpolation.

## Quick Start

```bash
git clone https://github.com/Abood059/Video_Streaming_with_AI-Frame_Generation.git
cd Video_Streaming_with_AI-Frame_Generation
python3 -m pip install opencv-python numpy torch
python3 main.py
```

> `main.py` is the repository entrypoint and starts the prototype sender/receiver workflow.

## Key Features

- Sparse key frame transmission to reduce frame data transfer
- Motion vector extraction using OpenCV and NumPy
- Reconstruction of intermediate frames at the receiver
- Bandwidth comparison against full-frame streaming
- Lightweight PyTorch tensor operations for numeric processing

## Tech Stack

- Python 3.8+
- OpenCV
- NumPy
- PyTorch
- Docker

## Results

This prototype achieved approximately **70% bandwidth savings** in a local network test with five short video clips.

## Known Limitations

- Best suited for slow or moderate motion content
- Not optimized for real-time production streaming
- No audio support
- No external codec or compression layer
- Prototype-level code quality and architecture

## Why This Project Matters

This idea is the result of my personal research into low-bandwidth streaming. The goal is to prove a feasible concept for reducing network load in video streaming systems, not to deliver a finished product.

## More Information

See `DETAILS.md` for the technical design, testing methodology, and future improvement plan.

## Contact

GitHub: https://github.com/Abood059
