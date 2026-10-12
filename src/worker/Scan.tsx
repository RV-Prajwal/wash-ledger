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
    <div style={{ position: 'relative', width: '100vw', height: '100dvh', backgroundColor: '#000', overflow: 'hidden' }}>
      <video 
        ref={videoRef}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        playsInline
        muted
      />

      {/* Guide Box */}
      <div style={{ 
        position: 'absolute', 
        top: '45%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)',
        width: '84%', 
        maxWidth: '360px',
        height: '120px', 
        border: '3px solid var(--primary)', 
        borderRadius: '16px',
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ 
          background: 'rgba(0, 0, 0, 0.6)', 
          backdropFilter: 'blur(4px)',
          color: '#ffffff', 
          fontSize: '11px', 
          fontWeight: '700',
          padding: '4px 10px', 
          borderRadius: '12px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          Fit Plate Here
        </div>
      </div>

      {/* Top Bar with Safe-Area */}
      <div style={{ 
        position: 'absolute', 
        top: 'max(20px, env(safe-area-inset-top, 20px))', 
        left: '20px', 
        right: '20px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20
      }}>
        <button 
          class="btn" 
          style={{ minWidth: '44px', minHeight: '44px', padding: '0', borderRadius: '50%', background: 'rgba(0,0,0,0.5)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.2)' }} 
          onClick={() => route('/')}
          title="Close Camera"
        >
          <X size={22} />
        </button>

        {controls?.hasTorch && (
          <button 
            class="btn" 
            style={{ 
              minWidth: '44px', 
              minHeight: '44px', 
              padding: '0', 
              borderRadius: '50%', 
              background: torchOn ? 'var(--primary)' : 'rgba(0,0,0,0.5)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)'
            }} 
            onClick={handleTorch}
            title="Toggle Flashlight"
          >
            <Flashlight size={20} />
          </button>
        )}
      </div>

      {/* Bottom Area with Safe-Area */}
      <div style={{ 
        position: 'absolute', 
        bottom: 'max(32px, env(safe-area-inset-bottom, 32px))', 
        left: '16px', 
        right: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '14px',
        zIndex: 20
      }}>
        {controls?.hasZoom && controls.zoomRange && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            padding: '8px 20px', 
            borderRadius: '32px', 
            width: '85%', 
            maxWidth: '320px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)'
          }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>1x</span>
            <input 
              type="range" 
              min={controls.zoomRange.min} 
              max={Math.min(controls.zoomRange.max, 5)} 
              step={controls.zoomRange.step || 0.1} 
              value={zoomValue} 
              onInput={handleZoom} 
              style={{ flex: 1, accentColor: 'var(--primary)' }}
            />
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{Math.min(controls.zoomRange.max, 5)}x</span>
          </div>
        )}

        {initializing && (
          <div style={{ 
            color: 'white', 
            padding: '10px 20px', 
            borderRadius: '20px',
            background: 'rgba(0, 0, 0, 0.7)',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            Starting AI Engine...
          </div>
        )}
        
        {showFallback && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%', maxWidth: '320px' }}>
            {initError && (
              <div style={{ color: '#fca5a5', padding: '6px 14px', fontSize: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.7)', borderRadius: '12px' }}>
                {initError}
              </div>
            )}
            <button 
              class="scan-cta-btn" 
              style={{ minHeight: '52px', width: '100%' }} 
              onClick={handleFallback}
            >
              <Keyboard size={20} />
              <span style={{ fontSize: '15px' }}>Type Plate Manually</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
