import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { startCamera } from '../scan/camera';
import type { CameraControls } from '../scan/camera';
import { pipeline } from '../scan/index';
import { Flashlight, X, Keyboard } from 'lucide-preact';

export const ScanScreen = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [controls, setControls] = useState<CameraControls | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // To avoid multiple route pushes
  const acceptedRef = useRef(false);

  useEffect(() => {
    // 10 second timeout for fallback
    const fallbackTimer = setTimeout(() => {
      setShowFallback(true);
    }, 10000);

    let active = true;
    let currentControls: CameraControls | null = null;

    const init = async () => {
      try {
        await pipeline.init();
        pipeline.reset();
        
        if (active && videoRef.current) {
          currentControls = await startCamera(videoRef.current, async (canvas) => {
            if (acceptedRef.current) return;
            
            const acceptedPlate = await pipeline.processFrame(canvas);
            if (acceptedPlate && !acceptedRef.current) {
              acceptedRef.current = true;
              if ('vibrate' in navigator) navigator.vibrate(200);
              
              // Stop camera and route to confirm with pre-filled plate
              currentControls?.stop();
              // Pass the plate via state or URL
              route(`/confirm?plate=${acceptedPlate.text}${acceptedPlate.isLowConfidence ? '&lowConfidence=true' : ''}`, true);
            }
          });
          setControls(currentControls);
          setInitializing(false);
        }
      } catch (err: any) {
        console.error("Camera/Pipeline init failed", err);
        setInitError(err.message || 'Failed to initialize AI models.');
        setInitializing(false);
        setShowFallback(true);
      }
    };

    init();

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      if (currentControls) {
        currentControls.stop();
      }
    };
  }, []);

  const [zoomValue, setZoomValue] = useState<number>(1);

  const handleTorch = () => {
    if (controls && controls.hasTorch) {
      setTorchOn(controls.toggleTorch());
    }
  };

  const handleZoom = (e: Event) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    setZoomValue(value);
    if (controls) controls.setZoom(value);
  };

  const handleFallback = () => {
    if (controls) controls.stop();
    route('/confirm');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#000', overflow: 'hidden' }}>
      <video 
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
      />

      {/* Guide Box */}
      <div style={{ 
        position: 'absolute', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: '80%', 
        height: '25%', 
        border: '4px solid var(--primary)', 
        borderRadius: '16px',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
      }}></div>

      {/* Top Bar */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', right: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <button class="btn" style={{ minWidth: '48px', minHeight: '48px', padding: '0', borderRadius: '50%' }} onClick={() => route('/')}>
          <X size={24} />
        </button>

        {controls?.hasTorch && (
          <button 
            class="btn" 
            style={{ 
              minWidth: '48px', 
              minHeight: '48px', 
              padding: '0', 
              borderRadius: '50%', 
              background: torchOn ? 'var(--primary)' : 'var(--glass-bg)',
              color: torchOn ? 'white' : 'var(--text-main)'
            }} 
            onClick={handleTorch}
          >
            <Flashlight size={24} />
          </button>
        )}
      </div>

      {/* Bottom Area */}
      <div style={{ position: 'absolute', bottom: '48px', left: '0', right: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        {controls?.hasZoom && controls.zoomRange && (
          <div class="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 24px', borderRadius: '32px', width: '70%', background: 'rgba(255, 255, 255, 0.1)' }}>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>1x</span>
            <input 
              type="range" 
              min={controls.zoomRange.min} 
              max={Math.min(controls.zoomRange.max, 5)} 
              step={controls.zoomRange.step || 0.1} 
              value={zoomValue} 
              onInput={handleZoom} 
              style={{ flex: 1, accentColor: 'var(--primary)' }}
            />
            <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>{Math.min(controls.zoomRange.max, 5)}x</span>
          </div>
        )}

        {initializing && <div class="glass-panel" style={{ color: 'white', padding: '12px 24px' }}>Loading AI Models...</div>}
        
        {showFallback && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            {initError && <div class="glass-panel" style={{ color: '#ff6b6b', padding: '8px 16px', fontSize: '14px', maxWidth: '80%', textAlign: 'center' }}>{initError}</div>}
            <button class="btn btn-primary btn-large" style={{ padding: '0 32px' }} onClick={handleFallback}>
              <Keyboard size={24} />
              Type Plate Manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
