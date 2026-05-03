# Video Streaming with AI-Frame Generation — Technical Details

## Background and Inspiration

This repository is a proof-of-concept attempt to reduce live video streaming bandwidth by transmitting only sparse key frames and rebuilding the remaining frames on the receiver using motion vectors. The project is intended as a research prototype to validate the concept of low-bandwidth frame reconstruction.

## Core Algorithm

The prototype is built around two main ideas:

- **Sparse key frames**: send only a small percentage of full frames at regular intervals.
- **Motion vector-based reconstruction**: compute the motion between frames and use that motion to generate intermediate frames.

### Motion Vector Interpolation

- The sender extracts motion information from the source video using OpenCV and NumPy.
- Motion vectors describe pixel displacement between reference frames.
- The receiver reconstructs intermediate frames from key frames plus motion vectors instead of receiving every raw frame.

## Pipeline

### Sender Side

1. Load or capture video frames.
2. Select sparse key frames at a fixed interval.
3. Compute motion vectors for intermediate frames.
4. Transmit key frames and motion data to the receiver.

### Receiver Side

1. Receive key frame images and motion vectors.
2. Reconstruct intermediate frames using motion interpolation.
3. Display or save the reconstructed frame sequence.

## Test Results Summary

The prototype was validated on five short video clips in a controlled LAN environment. The results were approximate and intended to show prototype behavior rather than production-grade accuracy.

**Average bandwidth savings: ~70%** compared to full-frame streaming.

| Clip | Duration | Approx. Bandwidth Saving | Notes |
|---|---|---|---|
| Clip 1 | 10 seconds | ~71% | low motion, stable scene |
| Clip 2 | 12 seconds | ~68% | moderate motion, indoor |
| Clip 3 | 8 seconds | ~70% | camera panning and static objects |
| Clip 4 | 9 seconds | ~72% | slow-moving scene |
| Clip 5 | 11 seconds | ~69% | mixed motion and lighting |

## Code Structure

The repository is organized around the prototype workflow:

```
Video_Streaming_with_AI-Frame_Generation/
├── main.py
├── core/
│   ├── encoder.py
│   └── decoder.py
├── network/
│   ├── sender.py
│   └── receiver.py
├── tools/
└── entities/
```

- `main.py`: The main entrypoint for the prototype. Starts the sender/receiver workflow and coordinates the experiment.
- `core/`: Contains the algorithmic components for motion extraction and frame reconstruction. Hosts encoder/decoder logic, motion vector utilities, and interpolation routines.
- `network/`: Contains sender and receiver transport components. Handles packaging and delivery of key frames and motion vector payloads.
- `tools/`: Contains helper utilities for video processing, export, debugging, and bandwidth measurement. Supports ancillary tasks such as logging and result comparison.
- `entities/`: Stores data classes and shared message models. Defines structures for frames, motion vectors, and metadata used across modules.

## Reproducing the 70% Figure

Use the same environment and clip set to compare two modes:

1. Transmit every decoded frame in raw form.
2. Transmit sparse key frames plus motion vectors.

Measure the total transmitted bytes for each mode and calculate savings as:

```text
saving (%) = 100 * (1 - transmitted_sparse / transmitted_full)
```

Make sure to use the same network conditions, clip durations, and frame rates for a fair comparison.

## Known Issues

- Prototype code is not production-ready.
- No audio support or separate audio channel handling.
- Motion reconstruction degrades on fast motion and abrupt scene changes.
- No real-time latency controls, buffering, or congestion management.
- No compression layer beyond raw frame and motion data handling.
- Minimal error handling and logging in the current implementation.
- No automated test suite is included yet.

## Future Improvements

- Improve code quality and organization with refactoring.
- Add a test suite for unit and integration validation.
- Implement real-time streaming behavior and adaptive key-frame intervals.
- Add audio support and separate audio transport.
- Add compression or codec integration for lower payload size.
- Add better diagnostics, logging, and performance metrics.
- Document the project setup and usage more thoroughly.

## Troubleshooting

- Confirm Python 3.8+ is installed.
- Install the required packages:

```bash
python3 -m pip install opencv-python numpy torch
```

- If `main.py` is missing, verify the repository checkout includes the entrypoint file.
- Run the prototype in a local environment first before attempting networked tests.

## References and Related Work

- Optical flow and motion estimation
- Sparse key-frame compression techniques
- Motion-compensated video prediction
- Low-bandwidth streaming research
