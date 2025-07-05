"use client";
import { useEffect, useState, useRef } from 'react';

declare global {
  interface Window {
    scanStartTime?: number;
  }
}

export default function QRScanner() {
  const [glitchActive, setGlitchActive] = useState(false);
  const [scannedData, setScannedData] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Glitch effect
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 8000);

    return () => clearInterval(glitchTimer);
  }, []);

  // QR Code detection function
  const detectQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      try {
        // Simple QR detection simulation - in a real app you'd use a QR library
        // For demo purposes, we'll simulate finding a QR code after 3 seconds
        const scanTime = Date.now() - (window.scanStartTime || 0);
        if (scanTime > 3000 && Math.random() > 0.7) {
          const demoData = `https://example.com/qr-demo-${Math.floor(Math.random() * 1000)}`;
          setScannedData(demoData);
          setIsScanning(false);
          stopScanner();
          return;
        }
      } catch (err) {
        console.error('QR detection error:', err);
      }
    }

    if (isScanning) {
      animationRef.current = requestAnimationFrame(detectQRCode);
    }
  };

  const startScanner = async () => {
    setError('');
    setScannedData('');
    setIsScanning(true);
    window.scanStartTime = Date.now();
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
          }
          detectQRCode();
        };
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
        setError((err as { message: string }).message);
      } else {
        setError('Failed to access camera');
      }
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
  };

  const resetScanner = () => {
    stopScanner();
    setScannedData('');
    setError('');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <>
      <style jsx global>{`
        .mono-font {
          font-family: 'Courier New', monospace;
        }
        
        .crt-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle at center, rgba(0, 255, 0, 0.03) 0%, transparent 70%);
          pointer-events: none;
          z-index: 1;
        }
        
        .crt-static {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="noise" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="transparent"/><circle cx="20" cy="20" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="0.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="0.5" fill="rgba(255,255,255,0.1)"/></pattern></defs><rect width="100" height="100" fill="url(%23noise)"/></svg>');
          opacity: 0.1;
          pointer-events: none;
          z-index: 2;
        }
        
        .crt-flicker {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(transparent 50%, rgba(0, 255, 0, 0.02) 50%);
          background-size: 100% 4px;
          pointer-events: none;
          z-index: 3;
        }
        
        .crt-vignette {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.4) 100%);
          pointer-events: none;
          z-index: 4;
        }
        
        .crt-scanlines {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 0, 0.03) 2px,
            rgba(0, 255, 0, 0.03) 4px
          );
          pointer-events: none;
          z-index: 5;
        }
        
        .screen-warp {
          filter: blur(0.5px);
          transform: perspective(1000px) rotateX(0.5deg);
        }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(0, 255, 150, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 150, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
          animation: grid-move 20s linear infinite;
        }
        
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(20px, 20px); }
        }
        
        .glitch-text {
          position: relative;
          display: inline-block;
        }
        
        .glitch-text.glitch-active::before,
        .glitch-text.glitch-active::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
        
        .glitch-text.glitch-active::before {
          animation: glitch-1 0.3s ease-in-out;
          color: #ff0040;
          z-index: -1;
        }
        
        .glitch-text.glitch-active::after {
          animation: glitch-2 0.3s ease-in-out;
          color: #00ffff;
          z-index: -2;
        }
        
        @keyframes glitch-1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        
        @keyframes glitch-2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(2px, 2px); }
          40% { transform: translate(2px, -2px); }
          60% { transform: translate(-2px, 2px); }
          80% { transform: translate(-2px, -2px); }
        }
        
        .button-glow {
          border: 1px solid currentColor;
          position: relative;
          overflow: hidden;
          background: transparent;
        }
        
        .button-glow::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          transition: left 0.5s;
        }
        
        .button-glow:hover::before {
          left: 100%;
        }
        
        .button-glow:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .vhs-filter {
          filter: contrast(1.2) brightness(1.1) saturate(1.3);
        }
        
        .loading-dots::after {
          content: '';
          animation: loading-dots 1.5s infinite;
        }
        
        @keyframes loading-dots {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        
        .video-container {
          position: relative;
          width: 320px;
          height: 320px;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          margin: 0 auto;
          border: 1px solid rgba(0, 255, 150, 0.3);
        }

        .video-element {
          display: block !important;
          position: absolute;
          top: 0;
          left: 0;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
          background: #000;
          border-radius: 8px;
          z-index: 1;
        }
        
        .scanner-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 250px;
          height: 250px;
          border: 2px solid #00ff96;
          border-radius: 12px;
          background: transparent;
          pointer-events: none;
          z-index: 10;
        }
        
        .scanner-overlay::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, transparent, rgba(0, 255, 150, 0.3), transparent);
          border-radius: 12px;
          animation: scanner-pulse 2s ease-in-out infinite;
          z-index: -1;
        }
        
        @keyframes scanner-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        
        .scanner-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #00ff96, transparent);
          animation: scanner-sweep 2s ease-in-out infinite;
          z-index: 11;
        }
        
        @keyframes scanner-sweep {
          0% { transform: translateY(0); }
          100% { transform: translateY(246px); }
        }
        
        .corner-frame {
          position: absolute;
          width: 30px;
          height: 30px;
          border: 2px solid #00ff96;
          z-index: 12;
        }
        
        .corner-frame.top-left {
          top: -2px;
          left: -2px;
          border-right: none;
          border-bottom: none;
        }
        
        .corner-frame.top-right {
          top: -2px;
          right: -2px;
          border-left: none;
          border-bottom: none;
        }
        
        .corner-frame.bottom-left {
          bottom: -2px;
          left: -2px;
          border-right: none;
          border-top: none;
        }
        
        .corner-frame.bottom-right {
          bottom: -2px;
          right: -2px;
          border-left: none;
          border-top: none;
        }
      `}</style>
      
      <div className="bg-black text-white min-h-screen mono-font overflow-hidden relative vhs-filter">
        {/* CRT Effects */}
        <div className="crt-background"></div>
        <div className="crt-static"></div>
        <div className="crt-flicker"></div>
        <div className="crt-vignette"></div>
        <div className="crt-scanlines"></div>
        <div className="grid-bg absolute inset-0 opacity-20"></div>

        <div className="screen-warp relative z-10 flex flex-col justify-center items-center min-h-screen px-6">
          <div className="text-center max-w-2xl mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl sm:text-5xl font-light mb-4 leading-tight">
                <span 
                  className={`glitch-text text-cyan-300 ${glitchActive ? 'glitch-active' : ''}`}
                  data-text="QR_SCANNER"
                >
                  QR_SCANNER
                </span>
              </h1>
            </div>
            
            {/* Scanner Interface */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-green-500/20 to-indigo-500/20 rounded-lg blur-xl"></div>
              <div className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-green-400/30 p-8">
                
                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
                    <div className="font-bold mb-1">SYSTEM ERROR:</div>
                    <div>{error}</div>
                  </div>
                )}

                {/* Scanner Area */}
                {!stream && !scannedData && (
                  <div className="mb-6">
                    <div className="relative w-64 h-64 mx-auto mb-6 border-2 border-dashed border-green-400/30 rounded-lg flex items-center justify-center">
                      <div className="text-green-400/50 text-6xl">
                        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4M4 4h4m0 0v4m0 0h4m0 0V4m-4 16v-4m0 0h4m0 0v4M4 20h4m0 0v-4m0 0h4m0 0v4" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-green-400/10 to-cyan-400/10 opacity-50"></div>
                    </div>
                    
                    <button
                      onClick={startScanner}
                      disabled={isScanning}
                      className="w-full button-glow px-6 py-3 bg-transparent text-green-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-green-900/20 disabled:opacity-50"
                    >
                      {isScanning ? (
                        <span className="loading-dots">INITIALIZING SCANNER</span>
                      ) : (
                        'ACTIVATE SCANNER'
                      )}
                    </button>
                  </div>
                )}

                {/* Active Scanner */}
                {stream && (
                  <div className="mb-6">
                    <div className="video-container">
                      <video
                        ref={videoRef}
                        className="video-element"
                        autoPlay
                        playsInline
                        muted
                        style={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      
                      <div className="scanner-overlay">
                        <div className="scanner-line"></div>
                        <div className="corner-frame top-left"></div>
                        <div className="corner-frame top-right"></div>
                        <div className="corner-frame bottom-left"></div>
                        <div className="corner-frame bottom-right"></div>
                      </div>
                    </div>
                    
                    <div className="text-center mb-4 mt-4">
                      <div className="text-green-400 text-sm font-light mb-2">
                        SCANNING FOR QR CODES...
                      </div>
                      <div className="text-cyan-400 text-xs opacity-70">
                        Position QR code within the frame
                      </div>
                    </div>
                    
                    <button
                      onClick={stopScanner}
                      className="w-full button-glow px-6 py-3 bg-transparent text-red-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-red-900/20"
                    >
                      TERMINATE SCAN
                    </button>
                  </div>
                )}

                {/* Scanned Data */}
                {scannedData && (
                  <div className="mb-6">
                    <div className="text-center mb-4">
                      <div className="text-green-400 text-lg font-light mb-2">
                        SCAN COMPLETE
                      </div>
                      <div className="text-cyan-400 text-sm opacity-70 mb-4">
                        Data acquired successfully
                      </div>
                    </div>
                    
                    <div className="bg-black/60 border border-green-400/30 rounded p-4 mb-4">
                      <div className="text-green-400 text-xs font-light mb-2 tracking-wide uppercase">
                        Decoded Data:
                      </div>
                      <div className="text-white text-sm font-mono break-all">
                        {scannedData}
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        onClick={() => copyToClipboard(scannedData)}
                        className="flex-1 button-glow px-4 py-2 bg-transparent text-indigo-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-indigo-900/20"
                      >
                        COPY DATA
                      </button>
                      <button
                        onClick={resetScanner}
                        className="flex-1 button-glow px-4 py-2 bg-transparent text-cyan-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-cyan-900/20"
                      >
                        NEW SCAN
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-gray-500 text-xs font-light tracking-wider">
                QUANTUM DECRYPTION ENABLED
              </p>
            </div>
          </div>
        </div>
        
        {/* Floating Matrix-style Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-16 bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-30"
              style={{
                left: `${10 + i * 12}%`,
                top: `${Math.random() * 100}%`,
                animation: `float-${i} ${12 + Math.random() * 6}s infinite ease-in-out`,
                animationDelay: `${Math.random() * 5}s`
              }}
            />
          ))}
        </div>
        
        {/* Corner Decorations */}
        <div className="absolute top-4 left-4 text-cyan-400 opacity-30 text-xs mono-font">
          SCAN_MODE: {stream ? 'ACTIVE' : 'STANDBY'}
        </div>
        <div className="absolute top-4 right-4 text-green-400 opacity-30 text-xs mono-font">
          RESOLUTION: HD
        </div>
        <div className="absolute bottom-4 left-4 text-indigo-400 opacity-30 text-xs mono-font">
          DECODE: REALTIME
        </div>
        <div className="absolute bottom-4 right-4 text-gray-500 opacity-30 text-xs mono-font">
          QR_SYS v3.2
        </div>
        
        {/* Hidden canvas for QR processing */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </>
  );
}