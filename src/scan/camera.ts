export interface CameraControls {
  stop: () => void;
  toggleTorch: () => boolean;
  hasTorch: boolean;
  hasZoom: boolean;
  zoomRange: { min: number, max: number, step: number } | null;
  setZoom: (value: number) => void;
  videoElement: HTMLVideoElement;
}

export const startCamera = async (
  video: HTMLVideoElement,
  onFrame: (canvas: HTMLCanvasElement) => void
): Promise<CameraControls> => {
  // Check browser capability
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Camera access is not supported by your browser. Please enter license plate manually.');
  }

  let stream: MediaStream;
  try {
    // Attempt ideal HD rear-facing camera stream
    stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: { ideal: 'environment' }, 
        width: { ideal: 1280 }, 
        height: { ideal: 720 } 
      },
      audio: false,
    });
  } catch (initialErr: any) {
    // Fall back to any available video stream if environment/resolution constraints failed
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    } catch {
      // Re-throw the original error so getUserFriendlyError can identify the root cause
      throw initialErr;
    }
  }

  video.srcObject = stream;
  video.setAttribute('playsinline', 'true');
  
  try {
    await video.play();
  } catch (playErr) {
    console.warn('Video play interrupted or delayed:', playErr);
  }

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
        try {
          onFrame(canvas);
        } catch (frameErr) {
          console.warn('Frame processing exception:', frameErr);
        }
      }
      lastTime = time;
    }
    animationFrameId = requestAnimationFrame(processFrame);
  };

  animationFrameId = requestAnimationFrame(processFrame);

  // Torch and zoom support
  const tracks = stream.getVideoTracks();
  const track = tracks.length > 0 ? tracks[0] : null;
  const capabilities = track && track.getCapabilities ? track.getCapabilities() : {};
  let torchOn = false;
  
  // @ts-ignore - TS doesn't know torch is a capability
  const hasTorch = !!capabilities.torch;
  // @ts-ignore
  const zoomCapability = capabilities.zoom;
  const hasZoom = !!zoomCapability;

  return {
    videoElement: video,
    hasTorch,
    hasZoom,
    zoomRange: hasZoom ? { min: zoomCapability.min, max: zoomCapability.max, step: zoomCapability.step } : null,
    setZoom: (value: number) => {
      if (!hasZoom || !track) return;
      try {
        track.applyConstraints({
          advanced: [{ zoom: value } as any]
        }).catch(err => {
          console.warn('Unable to apply zoom level:', err);
        });
      } catch (e) {
        console.warn('Zoom constraint error:', e);
      }
    },
    toggleTorch: () => {
      if (!hasTorch || !track) return false;
      const nextTorch = !torchOn;
      try {
        track.applyConstraints({
          advanced: [{ torch: nextTorch } as any]
        }).then(() => {
          torchOn = nextTorch;
        }).catch(err => {
          console.warn('Unable to toggle torch:', err);
        });
      } catch (e) {
        console.warn('Torch constraint error:', e);
      }
      return !torchOn;
    },
    stop: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      stream.getTracks().forEach(t => {
        try {
          t.stop();
        } catch (stopErr) {
          console.warn('Error stopping track:', stopErr);
        }
      });
      video.srcObject = null;
    }
  };
};
