export interface CameraControls {
  stop: () => void;
  toggleTorch: () => boolean;
  hasTorch: boolean;
  videoElement: HTMLVideoElement;
}

export const startCamera = async (
  video: HTMLVideoElement,
  onFrame: (canvas: HTMLCanvasElement) => void
): Promise<CameraControls> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
    audio: false,
  });

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  await video.play();

  // Create an offscreen canvas for frame extraction
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  let animationFrameId: number;
  let lastTime = 0;
  const fps = 5; // analyze 5 frames per second
  const frameInterval = 1000 / fps;

  const processFrame = (time: number) => {
    if (time - lastTime >= frameInterval) {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        onFrame(canvas);
      }
      lastTime = time;
    }
    animationFrameId = requestAnimationFrame(processFrame);
  };

  animationFrameId = requestAnimationFrame(processFrame);

  // Torch support
  const track = stream.getVideoTracks()[0];
  const capabilities = track.getCapabilities ? track.getCapabilities() : {};
  let torchOn = false;
  
  // @ts-ignore - TS doesn't know torch is a capability
  const hasTorch = !!capabilities.torch;

  return {
    videoElement: video,
    hasTorch,
    toggleTorch: () => {
      if (!hasTorch) return false;
      torchOn = !torchOn;
      track.applyConstraints({
        advanced: [{ torch: torchOn } as any]
      });
      return torchOn;
    },
    stop: () => {
      cancelAnimationFrame(animationFrameId);
      stream.getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }
  };
};
