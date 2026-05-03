import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim
from skimage.metrics import peak_signal_noise_ratio as psnr

class SemanticEvaluator:
    def __init__(self, original_video_path, reconstructed_video_path, n_split=3):
        self.orig_path = original_video_path
        self.recon_path = reconstructed_video_path
        self.n_split = n_split
        self.results = {
            "real_frames": {"ssim": [], "psnr": []},
            "gen_frames": {"ssim": [], "psnr": []},
            "overall": {"ssim": [], "psnr": []}
        }

    def run_evaluation(self):
        cap_orig = cv2.VideoCapture(self.orig_path)
        cap_recon = cv2.VideoCapture(self.recon_path)
        
        frame_idx = 0
        print(f"[Evaluator] Analyzing Quality Gap (n_split={self.n_split})...")

        while True:
            ret_o, frame_o = cap_orig.read()
            ret_r, frame_r = cap_recon.read()

            if not ret_o or not ret_r:
                break

            # Unify dimensions for fair comparison
            if frame_o.shape != frame_r.shape:
                frame_r = cv2.resize(frame_r, (frame_o.shape[1], frame_o.shape[0]))

            # Convert to grayscale for SSIM calculation (focuses on structure and shape)
            gray_o = cv2.cvtColor(frame_o, cv2.COLOR_BGR2GRAY)
            gray_r = cv2.cvtColor(frame_r, cv2.COLOR_BGR2GRAY)

            # Calculate metrics
            current_psnr = psnr(frame_o, frame_r)
            current_ssim = ssim(gray_o, gray_r)

            # Classify frame (Real or Generated)
            is_real = (frame_idx % self.n_split == 0)
            
            # Store results
            self.results["overall"]["ssim"].append(current_ssim)
            self.results["overall"]["psnr"].append(current_psnr)

            if is_real:
                self.results["real_frames"]["ssim"].append(current_ssim)
                self.results["real_frames"]["psnr"].append(current_psnr)
            else:
                self.results["gen_frames"]["ssim"].append(current_ssim)
                self.results["gen_frames"]["psnr"].append(current_psnr)

            frame_idx += 1
            if frame_idx % 100 == 0:
                print(f"Evaluated {frame_idx} frames...", end="\r")

        cap_orig.release()
        cap_recon.release()
        self._display_report()

    def _display_report(self):
        avg_gen_ssim = np.mean(self.results["gen_frames"]["ssim"])
        avg_real_ssim = np.mean(self.results["real_frames"]["ssim"])
        avg_overall_ssim = np.mean(self.results["overall"]["ssim"])
        
        # Calculate quality loss between Real and Generated frames
        # Quality Gap = (1 - (Gen_SSIM / Real_SSIM)) * 100
        quality_gap = (1 - (avg_gen_ssim / avg_real_ssim)) * 100

        print("\n\n" + "="*45)
        print("SEMANTIC QUALITY ANALYSIS REPORT")
        print("="*45)
        print(f"Total Frames Processed   : {len(self.results['overall']['ssim'])}")
        print(f"Generation Pattern        : 1 Real / {self.n_split-1} Generated")
        print("-" * 45)
        print(f"REAL Frames Quality (SSIM) : {avg_real_ssim:.4f}")
        print(f"GEN  Frames Quality (SSIM) : {avg_gen_ssim:.4f}")
        print(f"Overall System Quality     : {avg_overall_ssim:.4f}")
        print("-" * 45)
        print(f"Quality Loss (The Gap)     : {quality_gap:.2f}%")
        
        if quality_gap < 2:
            print("Result: Visually Lossless (Excellent, no noticeable difference)")
        elif quality_gap < 5:
            print("Result: High Fidelity (Very high quality)")
        else:
            print("Result: Noticeable Compression (Slight difference detected)")
        print("="*45 + "\n")

if __name__ == "__main__":
    # Run evaluation directly
    evaluator = SemanticEvaluator("short_video.mp4", "reconstructed_output.avi", n_split=3)
    evaluator.run_evaluation()