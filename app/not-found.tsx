'use client';
import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function NotFoundPage() {
  const [glitchActive, setGlitchActive] = useState(false);
  const [scanlineActive, setScanlineActive] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const router = useRouter();

  // Initialize audio context
  const initializeAudio = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioInitialized(true);
      } catch (error) {
        console.warn('Audio context initialization failed:', error);
      }
    }
  };

  // Audio feedback functions
  const playBeep = (frequency = 800, duration = 100) => {
    if (!audioContextRef.current || !audioInitialized) return;
    
    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration / 1000);
      
      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Audio playback failed:', error);
    }
  };

  const playErrorSound = () => {
    playBeep(400, 200);
    setTimeout(() => playBeep(350, 200), 250);
    setTimeout(() => playBeep(300, 300), 500);
  };

  const playClickSound = () => {
    playBeep(600, 50);
  };

  const playHoverSound = () => {
    playBeep(900, 30);
  };

  // Glitch effect
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 4000);
    return () => clearInterval(glitchTimer);
  }, []);

  // Scanline effect
  useEffect(() => {
    const scanlineTimer = setInterval(() => {
      setScanlineActive(true);
      setTimeout(() => setScanlineActive(false), 1000);
    }, 8000);
    return () => clearInterval(scanlineTimer);
  }, []);



  // Initialize audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeAudio();
      playErrorSound();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const handleGoHome = () => {
    playClickSound();
    router.push('/dashboard');
  };

  const handleGoBack = () => {
    playClickSound();
    router.back();
  };

  const handleButtonHover = () => {
    playHoverSound();
  };

  return (
    <div className="bg-black text-white min-h-screen mono-font overflow-hidden relative vhs-filter">
      {/* CRT Effects */}
      <div className="crt-background"></div>
      <div className="crt-static"></div>
      <div className="crt-flicker"></div>
      <div className="crt-vignette"></div>
      <div className={`crt-scanlines transition-opacity duration-1000 ${scanlineActive ? 'opacity-80' : 'opacity-40'}`}></div>
      <div className="grid-bg absolute inset-0 opacity-20"></div>
      
     
      
      <div className="screen-warp relative z-10 flex flex-col justify-center items-center min-h-screen px-6">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto w-full"
        >
          {/* Main 404 Display */}
          <div className="mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="relative"
            >
              <h1 
                className={`text-8xl sm:text-9xl font-bold mb-4 leading-none ${glitchActive ? 'glitch-active' : ''}`}
                style={{
                  textShadow: '0 0 20px #ff0040, 0 0 40px #ff0040, 0 0 60px #ff0040',
                  filter: glitchActive ? 'blur(1px)' : 'none',
                }}
              >
                <span 
                  className={`glitch-text text-red-400 ${glitchActive ? 'glitch-active' : ''}`}
                  data-text="404"
                >
                  404
                </span>
              </h1>
              
              {/* Glitch overlay */}
              {glitchActive && (
                <div className="absolute inset-0 text-8xl sm:text-9xl font-bold text-cyan-400 opacity-70 mix-blend-difference animate-pulse">
                  404
                </div>
              )}
            </motion.div>
            
            <motion.h2
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-2xl sm:text-3xl font-light mb-6 text-cyan-300"
            >
              <span 
                className={`glitch-text ${glitchActive ? 'glitch-active' : ''}`}
                data-text="SYSTEM_ERROR"
              >
                SYSTEM_ERROR
              </span>
            </motion.h2>
          </div>
          
         
          
          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={handleGoHome}
              onMouseEnter={handleButtonHover}
              className="button-glow px-8 py-4 bg-transparent text-green-400 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-green-900/20 border border-green-400/50 hover:border-green-400"
            >
              RETURN_HOME
            </button>
            
            <button
              onClick={handleGoBack}
              onMouseEnter={handleButtonHover}
              className="button-glow px-8 py-4 bg-transparent text-cyan-400 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-cyan-900/20 border border-cyan-400/50 hover:border-cyan-400"
            >
              GO_BACK
            </button>
          </motion.div>
          
          {/* Additional Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 2 }}
            className="mt-12 text-center"
          >
            
           
          </motion.div>
        </motion.div>
      </div>
      
      {/* Floating Glitch Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-16 bg-gradient-to-b from-transparent via-red-400 to-transparent opacity-30"
            style={{
              left: `${10 + i * 12}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -200, 0],
              opacity: [0, 0.6, 0],
              scaleY: [1, 1.5, 1],
            }}
            transition={{
              duration: 12 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
     

    </div>
  );
}
