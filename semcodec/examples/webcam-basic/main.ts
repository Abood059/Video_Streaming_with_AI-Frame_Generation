import { Encoder, Decoder } from '../../src/index';

const video = document.getElementById('source') as HTMLVideoElement;
const canvas = document.getElementById('output') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const statsDiv = document.getElementById('stats')!;

const encoder = new Encoder({ 
  keyframeInterval: 5,
  enableTemporalNoise: true,
  jpegQuality: 85
});
const decoder = new Decoder();

encoder.onFrameStats(stats => {
  statsDiv.innerHTML = `
    [Encoder] Frame ${stats.frameIndex} | Type: ${stats.payloadType}<br>
    Payload Size: ${(stats.payloadSizeBytes / 1024).toFixed(1)} KB<br>
    Encoding Time: ${stats.processingTimeMs.toFixed(1)} ms<br>
    Totals: ${stats.totalKeyframes} Keyframes, ${stats.totalMotionFrames} Motion frames
  `;
});

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 480 } 
    });
    video.srcObject = stream;
    await video.play();

    // Initialize the WASM models
    statsDiv.innerHTML = "Initializing AI Models...";
    await encoder.initialize();
    await decoder.initialize();
    statsDiv.innerHTML = "Models loaded. Processing...";

    const offscreen = new OffscreenCanvas(video.videoWidth, video.videoHeight);
    const offCtx = offscreen.getContext('2d')!;

    async function processFrame() {
      // Capture frame
      offCtx.drawImage(video, 0, 0);
      const frameData = offCtx.getImageData(0, 0, video.videoWidth, video.videoHeight);

      // --- SENDER SIDE ---
      const payload = await encoder.encode(frameData, performance.now());

      if (payload) {
        // --- RECEIVER SIDE ---
        // In a real app, 'payload' would be sent over WebRTC here.
        const reconstructed = await decoder.decode(payload);
        
        if (reconstructed) {
          ctx.putImageData(reconstructed, 0, 0);
        }
      }

      requestAnimationFrame(processFrame);
    }

    processFrame();
  } catch (err) {
    statsDiv.innerHTML = `Error: ${(err as Error).message}`;
  }
}

// Ensure the page is ready before accessing DOM
start();
