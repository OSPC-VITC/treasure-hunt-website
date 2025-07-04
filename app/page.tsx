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
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  const bootSequence = [
    "INITIALIZING...",
    "LOADING NEURAL NET...",
    "SCANNING FREQUENCIES...",
    "READY TO EXECUTE"
  ];

  // Initialize audio and start the experience
  const startExperience = () => {
    if (audioInitialized) return;
    
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
      
      // Auto-play background music
      backgroundMusicRef.current.play().catch(e => {
        console.warn('Could not play background music:', e);
      });
    }
    
    setAudioInitialized(true);
    setShowStartPrompt(false);
  };

  useEffect(() => {
    if (!audioInitialized) return;
    
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
  }, [currentLine, audioInitialized]);

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
  };

  const playGlitchSound = () => {
    if (!audioContext || !audioInitialized) return;
    
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
  };

  const handleEnterClick = () => {
    playBeep(1000, 150);
    // Add your navigation logic here
    console.log("Entering the treasure hunt...");
  };

  return (
    <>
      <Head>
        <title>TREASURE_HUNT.EXE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&display=swap');
        
        .mono-font {
          font-family: 'JetBrains Mono', monospace;
          font-weight: 400;
        }
        
        /* CRT Green Scanlines - Full Width Moving Down */
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
        
        /* Additional CRT Effects */
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
        
        /* Mobile optimizations */
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
        {/* CRT Background Effects */}
        <div className="crt-background"></div>
        <div className="crt-static"></div>
        <div className="crt-flicker"></div>
        <div className="crt-vignette"></div>
        
        {/* CRT Shader Overlay */}
        <div className="crt-effect"></div>

        {/* Moving CRT Scanlines - Full Width Green Lines */}
        <div className="crt-scanlines"></div>

        {/* Grid + Content wrap */}
        <div className="grid-bg absolute inset-0 opacity-30"></div>

        {/* Main CRT screen effect wrapper */}
        <div className="screen-warp relative z-10 flex flex-col justify-center items-center min-h-screen px-6">
          {showStartPrompt ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <h1 className="text-4xl sm:text-6xl font-light mb-8 text-indigo-300 ">
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
          ) : !bootDone ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              {/* Clean boot sequence */}
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
              {/* Main title - cleaner, more modern */}
              <div className="mb-8 sm:mb-12">
                <motion.h1
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-5xl sm:text-7xl md:text-8xl font-light mb-4 leading-tight"
                >
                  <span 
                    className={`glitch-text  text-indigo-300 ${glitchActive ? 'glitch-active' : ''}`}
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
              
              {/* Minimal subtitle */}
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
              
              {/* Clean, modern button */}
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
              
              {/* Minimal footer info */}
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
        
        {/* Subtle floating elements */}
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
