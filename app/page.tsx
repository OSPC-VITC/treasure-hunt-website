'use client';

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';

export default function Home() {
  const [bootDone, setBootDone] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showStartPrompt, setShowStartPrompt] = useState(true);
  const [systemChecking, setSystemChecking] = useState(false);
  const [systemChecksDone, setSystemChecksDone] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [cameraStatus, setCameraStatus] = useState<'checking' | 'granted' | 'denied' | 'prompt'>('checking');
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [pendingPermissions, setPendingPermissions] = useState<string[]>([]);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  const bootSequence = [
    "INITIALIZING...",
    "LOADING NEURAL NET...",
    "SCANNING FREQUENCIES...",
    "READY TO EXECUTE"
  ];

  // Check existing permissions status
  const checkExistingPermissions = async () => {
    const needsPermissions = [];

    // Check location permission status
    if (navigator.permissions && navigator.geolocation) {
      try {
        const locationPermission = await navigator.permissions.query({ name: 'geolocation' });
        if (locationPermission.state === 'granted') {
          setLocationStatus('granted');
        } else if (locationPermission.state === 'denied') {
          setLocationStatus('denied');
        } else {
          setLocationStatus('prompt');
          needsPermissions.push('location');
        }
      } catch (error) {
        // Fallback for browsers that don't support permissions API
        setLocationStatus('prompt');
        needsPermissions.push('location');
      }
    } else {
      setLocationStatus('denied');
    }

    // Check camera permission status
    if (navigator.permissions && navigator.mediaDevices) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (cameraPermission.state === 'granted') {
          setCameraStatus('granted');
        } else if (cameraPermission.state === 'denied') {
          setCameraStatus('denied');
        } else {
          setCameraStatus('prompt');
          needsPermissions.push('camera');
        }
      } catch (error) {
        // Fallback for browsers that don't support camera permission query
        setCameraStatus('prompt');
        needsPermissions.push('camera');
      }
    } else {
      setCameraStatus('denied');
    }

    // Check network immediately
    setNetworkStatus(navigator.onLine ? 'online' : 'offline');

    // If we have permissions to request, show the prompt
    if (needsPermissions.length > 0) {
      setPendingPermissions(needsPermissions);
      setShowPermissionPrompt(true);
      return false;
    }

    return true;
  };

  // Request location permission with better error handling
  const requestLocationPermission = async () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        setLocationStatus('denied');
        resolve(false);
        return;
      }

      // Use getCurrentPosition to trigger permission prompt
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location permission granted:', position.coords.latitude, position.coords.longitude);
          setLocationStatus('granted');
          resolve(true);
        },
        (error) => {
          console.log('Location permission error:', error.code, error.message);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationStatus('denied');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationStatus('denied');
              break;
            case error.TIMEOUT:
              setLocationStatus('denied');
              break;
            default:
              setLocationStatus('denied');
              break;
          }
          resolve(false);
        },
        {
          timeout: 10000,
          enableHighAccuracy: false, // Set to false for faster response
          maximumAge: 300000 // 5 minutes cache
        }
      );
    });
  };

  // Request camera permission with better error handling
  const requestCameraPermission = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.log('Camera not supported');
      setCameraStatus('denied');
      return false;
    }

    try {
      // Request camera access - this will trigger the permission prompt
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log('Camera permission granted');
      setCameraStatus('granted');
      
      // Stop the stream immediately after testing
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera stream stopped');
      });
      
      return true;
    } catch (error) {
      console.log('Camera permission error:', error);
      
      // Handle different types of errors
      if (
        typeof error === 'object' &&
        error !== null &&
        'name' in error &&
        typeof (error as { name: unknown }).name === 'string'
      ) {
        const errorName = (error as { name: string }).name;
        if (errorName === 'NotAllowedError') {
          setCameraStatus('denied');
        } else if (errorName === 'NotFoundError') {
          setCameraStatus('denied');
        } else if (errorName === 'NotSupportedError') {
          setCameraStatus('denied');
        } else {
          setCameraStatus('denied');
        }
      } else {
        setCameraStatus('denied');
      }
      
      return false;
    }
  };

  // Handle permission requests with better flow
  const handlePermissionRequest = async () => {
    playBeep(800, 100);
    setShowPermissionPrompt(false);
    
    // Request permissions sequentially with status updates
    if (pendingPermissions.includes('location')) {
      console.log('Requesting location permission...');
      setLocationStatus('checking');
      await requestLocationPermission();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (pendingPermissions.includes('camera')) {
      console.log('Requesting camera permission...');
      setCameraStatus('checking');
      await requestCameraPermission();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Check network
    await checkNetwork();

    setPendingPermissions([]);
    
    // Continue with system checks
    setTimeout(() => {
      setSystemChecksDone(true);
      playBeep(1000, 200);
    }, 1000);
  };

  // Skip permissions (continue anyway)
  const handleSkipPermissions = () => {
    playBeep(600, 100);
    
    // Mark pending permissions as denied
    if (pendingPermissions.includes('location')) {
      setLocationStatus('denied');
    }
    if (pendingPermissions.includes('camera')) {
      setCameraStatus('denied');
    }

    setShowPermissionPrompt(false);
    setPendingPermissions([]);
    
    // Continue with system checks
    setTimeout(() => {
      setSystemChecksDone(true);
      playBeep(1000, 200);
    }, 1000);
  };

  // Check network connectivity with better error handling
  const checkNetwork = async () => {
    try {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
        return;
      }

      // Test with a simple fetch to a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-cache'
        });
        clearTimeout(timeoutId);
        setNetworkStatus('online');
        console.log('Network connection verified');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.log('Network check failed:', fetchError);
        setNetworkStatus('offline');
      }
    } catch (error) {
      console.log('Network check error:', error);
      setNetworkStatus('offline');
    }
  };

  // Run system checks
  const runSystemChecks = async () => {
    setSystemChecking(true);
    
    // Check existing permissions first
    const allAvailable = await checkExistingPermissions();
    
    if (allAvailable) {
      // If no permissions needed, continue directly
      await checkNetwork();
      setTimeout(() => {
        setSystemChecksDone(true);
        playBeep(1000, 200);
      }, 1000);
    }
    // If permissions are needed, the prompt will be shown and handled separately
  };

  // Initialize audio and start the experience
  const startExperience = async () => {
    if (audioInitialized) return;
    
    try {
      const ctx = new ((window.AudioContext || (window as any).webkitAudioContext))();
      setAudioContext(ctx);
      
      // Initialize background music
      if (!backgroundMusicRef.current) {
        backgroundMusicRef.current = new Audio('/audio/background-music.mp3');
        backgroundMusicRef.current.loop = true;
        backgroundMusicRef.current.volume = 0.3;
        
        backgroundMusicRef.current.addEventListener('canplaythrough', () => {
          console.log('Background music loaded successfully');
        });
        
        backgroundMusicRef.current.addEventListener('error', (e) => {
          console.warn('Background music failed to load:', e);
        });
        
        try {
          await backgroundMusicRef.current.play();
        } catch (e) {
          console.warn('Could not play background music:', e);
        }
      }
      
      setAudioInitialized(true);
      setShowStartPrompt(false);
      
      // Start system checks
      await runSystemChecks();
    } catch (error) {
      console.error('Audio initialization failed:', error);
      // Continue without audio
      setAudioInitialized(true);
      setShowStartPrompt(false);
      await runSystemChecks();
    }
  };

  // Boot sequence effect
  useEffect(() => {
    if (!systemChecksDone) return;
    
    const bootTimer = setInterval(() => {
      if (currentLine < bootSequence.length - 1) {
        setCurrentLine(prev => prev + 1);
        playBeep(600 + currentLine * 100, 80);
      } else {
        clearInterval(bootTimer);
        setTimeout(() => {
          setBootDone(true);
          playBeep(1200, 200);
        }, 800);
      }
    }, 600);

    return () => clearInterval(bootTimer);
  }, [currentLine, systemChecksDone]);

  useEffect(() => {
    if (!audioInitialized) return;
    
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      playGlitchSound();
      setTimeout(() => setGlitchActive(false), 150);
    }, 4000);

    return () => clearInterval(glitchTimer);
  }, [audioInitialized]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  const playBeep = (frequency = 800, duration = 100) => {
    if (!audioContext || !audioInitialized) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  };

  const playGlitchSound = () => {
    if (!audioContext || !audioInitialized) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 200;
      oscillator.type = 'sawtooth';
      filter.type = 'lowpass';
      filter.frequency.value = 400;
      
      gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Glitch sound playback failed:', error);
    }
  };

  const handleEnterClick = () => {
    playBeep(1000, 150);
    console.log("Entering the treasure hunt...");
    console.log("System Status:", {
      location: locationStatus,
      camera: cameraStatus,
      network: networkStatus
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'granted':
      case 'online':
        return '✓';
      case 'denied':
      case 'offline':
        return '✗';
      case 'prompt':
        return '?';
      default:
        return '...';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
      case 'online':
        return 'text-green-400';
      case 'denied':
      case 'offline':
        return 'text-red-400';
      case 'prompt':
        return 'text-yellow-400';
      default:
        return 'text-yellow-400';
    }
  };

  return (
    <>
      <Head>
        <title>TREASURE_HUNT.EXE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* All your existing styles remain the same */}
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        
        .mono-font {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 400;
        }
        
        .crt-scanlines {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            transparent 0px,
            transparent 4px,
            rgba(0, 255, 0, 0.3) 4px,
            rgba(0, 255, 0, 0.3) 5px,
            transparent 5px,
            transparent 9px
          );
          animation: crt-scanlines-move 0.5s linear infinite;
          pointer-events: none;
          z-index: 100;
        }
        
        @keyframes crt-scanlines-move {
          0% { transform: translateY(0px); }
          100% { transform: translateY(9px); }
        }
        
        .crt-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(ellipse at center, rgba(0, 255, 0, 0.02) 0%, transparent 70%),
            linear-gradient(135deg, rgba(0, 255, 0, 0.01) 0%, transparent 100%);
          animation: crt-drift 20s ease-in-out infinite;
          z-index: 1;
        }
        
        .crt-static {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='staticNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23staticNoise)' opacity='0.01'/%3E%3C/svg%3E");
          animation: crt-static 0.1s steps(20) infinite;
          z-index: 2;
        }
        
        .crt-flicker {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 255, 0, 0.002);
          animation: crt-flicker 0.15s ease-in-out infinite alternate;
          z-index: 3;
        }
        
        .crt-vignette {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 75%,
            rgba(0, 0, 0, 0.1) 90%,
            rgba(0, 0, 0, 0.3) 100%
          );
          z-index: 4;
        }
        
        @keyframes crt-drift {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          25% { transform: translateX(0.5px) translateY(-0.3px); }
          50% { transform: translateX(-0.3px) translateY(0.5px); }
          75% { transform: translateX(0.3px) translateY(0.3px); }
        }
        
        @keyframes crt-static {
          0% { transform: translateX(0px) translateY(0px); }
          10% { transform: translateX(-1px) translateY(-1px); }
          20% { transform: translateX(1px) translateY(0px); }
          30% { transform: translateX(0px) translateY(1px); }
          40% { transform: translateX(-1px) translateY(0px); }
          50% { transform: translateX(1px) translateY(-1px); }
          60% { transform: translateX(0px) translateY(0px); }
          70% { transform: translateX(-1px) translateY(1px); }
          80% { transform: translateX(1px) translateY(0px); }
          90% { transform: translateX(0px) translateY(-1px); }
          100% { transform: translateX(-1px) translateY(0px); }
        }
        
        @keyframes crt-flicker {
          0% { opacity: 1; }
          97% { opacity: 1; }
          98% { opacity: 0.98; }
          99% { opacity: 0.99; }
          100% { opacity: 1; }
        }
        
        @media (max-width: 768px) {
          .crt-scanlines {
            background: repeating-linear-gradient(
              0deg,
              transparent 0px,
              transparent 6px,
              rgba(0, 255, 0, 0.25) 6px,
              rgba(0, 255, 0, 0.25) 7px,
              transparent 7px,
              transparent 13px
            );
            animation: crt-scanlines-move 0.7s linear infinite;
          }
          
          @keyframes crt-scanlines-move {
            0% { transform: translateY(0px); }
            100% { transform: translateY(13px); }
          }
        }
        
        .glitch-text {
          position: relative;
          display: inline-block;
        }
        
        .glitch-active::before,
        .glitch-active::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.8;
        }
        
        .glitch-active::before {
          animation: glitch1 0.2s ease-out;
          color: #ff0080;
          z-index: -1;
        }
        
        .glitch-active::after {
          animation: glitch2 0.2s ease-out;
          color: #00ff80;
          z-index: -2;
        }
        
        @keyframes glitch1 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-1px, 1px); }
          40% { transform: translate(-1px, -1px); }
          60% { transform: translate(1px, 1px); }
          80% { transform: translate(1px, -1px); }
        }
        
        @keyframes glitch2 {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(1px, -1px); }
          40% { transform: translate(1px, 1px); }
          60% { transform: translate(-1px, -1px); }
          80% { transform: translate(-1px, 1px); }
        }
        
        .subtle-glow {
          text-shadow: 
            0 0 5px currentColor,
            0 0 10px currentColor;
        }
        
        .grid-bg {
          background-image: 
            linear-gradient(rgba(0, 255, 0, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 0, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: grid-move 30s linear infinite;
        }
        
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        
        .cursor-blink {
          animation: blink 1.2s infinite;
        }
        
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .fade-in {
          animation: fadeIn 0.8s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .button-glow {
          transition: all 0.3s ease;
          border: 1px solid #00ff00;
          box-shadow: 
            0 0 10px rgba(0, 255, 0, 0.3),
            inset 0 0 10px rgba(0, 255, 0, 0.1);
        }
        
        .button-glow:hover {
          border-color: #00ff00;
          box-shadow: 
            0 0 20px rgba(0, 255, 0, 0.5),
            inset 0 0 20px rgba(0, 255, 0, 0.2);
          transform: translateY(-2px);
        }
        
        .vhs-filter {
          filter: contrast(1.1) saturate(1.2) brightness(0.95);
        }

        .crt-effect::before {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to right,
            rgba(0, 255, 0, 0.01),
            rgba(0, 255, 0, 0.01) 2px
          );
          mix-blend-mode: color-dodge;
          animation: rgb-drift 6s ease-in-out infinite;
          pointer-events: none;
          z-index: 1000;
        }

        @keyframes rgb-drift {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(1px); }
        }

        .screen-warp {
          transform: scale(1.01);
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 
            inset 0 0 100px rgba(0, 255, 0, 0.07),
            inset 0 0 30px rgba(0, 255, 0, 0.12),
            0 0 20px rgba(0, 255, 0, 0.15);
          backdrop-filter: blur(0.2px);
          filter: drop-shadow(0 0 3px rgba(0, 255, 0, 0.1));
        }
      `}</style>

      <div className="bg-black text-white min-h-screen mono-font overflow-hidden relative vhs-filter">
        {/* All your existing CRT effects remain the same */}
        <div className="crt-background"></div>
        <div className="crt-static"></div>
        <div className="crt-flicker"></div>
        <div className="crt-vignette"></div>
        <div className="crt-effect"></div>
        <div className="crt-scanlines"></div>
        <div className="grid-bg absolute inset-0 opacity-30"></div>

        <div className="screen-warp relative z-10 flex flex-col justify-center items-center min-h-screen px-6">
          {showStartPrompt ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-light mb-8 text-indigo-300">
                TREASURE_HUNT.EXE
              </h1>
              <p className="text-gray-300 mb-8 text-lg">
                Click anywhere to begin
              </p>
              <button
                onClick={startExperience}
                className="button-glow px-8 py-4 bg-black text-indigo-300 text-base font-light tracking-wider uppercase transition-all duration-300 hover:bg-green-900 hover:bg-opacity-20"
              >
                Start Experience
              </button>
            </motion.div>
          ) : showPermissionPrompt ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center max-w-2xl mx-auto"
            >
              <div className="space-y-6 text-sm sm:text-base">
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-cyan-400 text-xl mb-8"
                >
                  PERMISSION REQUEST
                </motion.div>
                
                <div className="text-gray-300 space-y-4 mb-8">
                  <p>This treasure hunt requires access to:</p>
                  <div className="space-y-2">
                    {pendingPermissions.includes('location') && (
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-yellow-400">📍</span>
                        <span>Location services for GPS-based clues</span>
                      </div>
                    )}
                    {pendingPermissions.includes('camera') && (
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-yellow-400">📷</span>
                        <span>Camera access for QR code scanning</span>
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-4">
                    These permissions enhance your experience but are not required to play.
                  </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={handlePermissionRequest}
                    className="button-glow px-6 py-3 bg-black text-green-400 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-green-900 hover:bg-opacity-20"
                  >
                    Grant Permissions
                  </button>
                  <button
                    onClick={handleSkipPermissions}
                    className="px-6 py-3 bg-black text-gray-400 text-sm font-light tracking-wider uppercase border border-gray-600 transition-all duration-300 hover:border-gray-400 hover:text-gray-300"
                  >
                    Continue Without
                  </button>
                </div>
              </div>
            </motion.div>
          ) : systemChecking && !systemChecksDone ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="space-y-4 text-sm sm:text-base">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-cyan-400 mb-6"
                >
                  RUNNING SYSTEM DIAGNOSTICS...
                </motion.div>
                
                <div className="space-y-3">
                  <div className={`flex items-center justify-center space-x-4 ${getStatusColor(locationStatus)}`}>
                    <span>LOCATION ACCESS</span>
                    <span className="font-mono">{getStatusIcon(locationStatus)}</span>
                  </div>
                  
                  <div className={`flex items-center justify-center space-x-4 ${getStatusColor(cameraStatus)}`}>
                    <span>CAMERA PERMISSIONS</span>
                    <span className="font-mono">{getStatusIcon(cameraStatus)}</span>
                  </div>
                  
                  <div className={`flex items-center justify-center space-x-4 ${getStatusColor(networkStatus)}`}>
                    <span>NETWORK CONNECTION</span>
                    <span className="font-mono">{getStatusIcon(networkStatus)}</span>
                  </div>
                </div>
                
                <motion.div
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-indigo-300 mt-6"
                >
                  <span className="cursor-blink">_</span>
                </motion.div>
              </div>
            </motion.div>
          ) : systemChecksDone && !bootDone ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="space-y-3 text-sm sm:text-base">
                {bootSequence.slice(0, currentLine + 1).map((line, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`${index === currentLine ? 'text-indigo-300' : 'text-gray-400'}`}
                  >
                    {line}
                    {index === currentLine && (
                      <span className="text-indigo-300 ml-2 cursor-blink">_</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="text-center max-w-4xl mx-auto"
            >
              {/* Your existing main interface remains the same */}
              <div className="mb-8 sm:mb-12">
                <motion.h1
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-5xl sm:text-7xl md:text-8xl font-light mb-4 leading-tight"
                >
                  <span 
                    className={`glitch-text text-indigo-300 ${glitchActive ? 'glitch-active' : ''}`}
                    data-text="TREASURE_HUNT"
                  >
                    TREASURE_HUNT
                  </span>
                </motion.h1>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="text-xl sm:text-2xl text-cyan-400 font-light subtle-glow"
                >
                  .EXE
                </motion.div>
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mb-12 sm:mb-16 space-y-2"
              >
                <p className="text-gray-300 text-sm sm:text-base font-light tracking-wide">
                  Decrypt the Clues. Escape the Grid.
                </p>
                <p className="text-gray-500 text-xs sm:text-sm font-light">
                  A digital treasure hunt experience
                </p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.2 }}
              >
                <button 
                  onClick={handleEnterClick}
                  className="button-glow px-8 sm:px-12 py-4 sm:py-5 bg-black text-indigo-300 text-sm sm:text-base font-light tracking-wider uppercase transition-all duration-300 hover:bg-green-900 hover:bg-opacity-20"
                >
                  Enter
                </button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 1.5 }}
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
              >
                <p className="text-gray-600 text-xs font-light tracking-wider">
                  DEVELOPED BY OSPC
                </p>
              </motion.div>
            </motion.div>
          )}
        </div>
        
        {/* Your existing floating elements remain the same */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-px h-8 bg-gradient-to-b from-transparent via-green-400 to-transparent opacity-20"
              style={{
                left: `${10 + i * 12}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 0.3, 0],
              }}
              transition={{
                duration: 8 + Math.random() * 4,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
