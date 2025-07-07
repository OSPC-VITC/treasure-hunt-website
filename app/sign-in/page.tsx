'use client';
import { useEffect, useState, useRef } from 'react';
import { useSignIn, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const [glitchActive, setGlitchActive] = useState(false);
  const [username, setUsername] = useState(''); // Changed from email to username
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const { signIn, setActive } = useSignIn();
  const { isSignedIn } = useUser();

  // Vibration/Haptic feedback function
  const vibrate = (pattern: number | number[] = 50): void => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Initialize audio context and background music
  const initializeAudio = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioInitialized(true);
        
        // Initialize background music
        if (!backgroundMusicRef.current) {
          backgroundMusicRef.current = new Audio('/audio/background-music.mp3');
          backgroundMusicRef.current.loop = true;
          backgroundMusicRef.current.volume = 0.1; // Light volume
          
          backgroundMusicRef.current.addEventListener('canplaythrough', () => {
            console.log('Sign-in background music loaded successfully');
          });
          
          backgroundMusicRef.current.addEventListener('error', (e) => {
            console.warn('Sign-in background music failed to load:', e);
          });
          
          try {
            backgroundMusicRef.current.play();
          } catch (e) {
            console.warn('Could not play sign-in background music:', e);
          }
        }
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

  const playSuccessSound = () => {
    vibrate([100, 50, 100, 50, 150]); // Success vibration pattern
    playBeep(800, 100);
    setTimeout(() => playBeep(1000, 100), 150);
    setTimeout(() => playBeep(1200, 150), 300);
  };

  const playErrorSound = () => {
    vibrate([200, 100, 200]); // Error vibration pattern
    playBeep(400, 200);
    setTimeout(() => playBeep(350, 200), 250);
  };

  const playClickSound = () => {
    vibrate(50); // Button click vibration
    playBeep(600, 50);
  };

  const playHoverSound = () => {
    vibrate(20); // Light hover vibration
    playBeep(900, 30);
  };

  // Glitch effect
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 6000);
    return () => clearInterval(glitchTimer);
  }, []);

  // Redirect if signed in
  useEffect(() => {
    if (isSignedIn) {
      playSuccessSound();
      console.log('User is signed in, redirecting...');
      
      // Fade out background music before redirect
      if (backgroundMusicRef.current) {
        const fadeOut = setInterval(() => {
          if (backgroundMusicRef.current && backgroundMusicRef.current.volume > 0.01) {
            backgroundMusicRef.current.volume -= 0.02;
          } else {
            clearInterval(fadeOut);
            if (backgroundMusicRef.current) {
              backgroundMusicRef.current.pause();
            }
          }
        }, 50);
      }
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    }
  }, [isSignedIn, audioInitialized]);

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = () => {
      initializeAudio();
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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    setLoading(true);
    setError('');

    try {
      const result = await signIn?.create({
        identifier: username, // Changed from email to username
        password: password,
      });

      if (result?.status === 'complete') {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }
        playSuccessSound();
        console.log('Sign in successful');
      }
    } catch (err: any) {
      playErrorSound();
      setError(err.errors?.[0]?.message || 'Sign in failed');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = () => {
    vibrate(30); // Input focus vibration
    playBeep(1000, 30);
  };

  const handleButtonHover = () => {
    if (!loading) playHoverSound();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignIn(e);
  };

  return (
      <div className="bg-black text-white min-h-screen mono-font overflow-hidden relative vhs-filter">
        {/* CRT Effects */}
        <div className="crt-background"></div>
        <div className="crt-static"></div>
        <div className="crt-flicker"></div>
        <div className="crt-vignette"></div>
        <div className="crt-scanlines opacity-40"></div>
        <div className="grid-bg absolute inset-0 opacity-20"></div>
        
        <div className="screen-warp relative z-10 flex flex-col justify-center items-center min-h-screen px-6 ">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-md mx-auto w-full"
          >
            {/* Header */}
            <div className="mb-8">
              <motion.h1
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl sm:text-5xl font-light mb-4 leading-tight"
              >
                <span 
                  className={`glitch-text text-indigo-300 ${glitchActive ? 'glitch-active' : ''}`}
                  data-text="ACCESS_CONTROL"
                >
                  ACCESS_CONTROL
                </span>
              </motion.h1>
            </div>
            
            {/* Auth Form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="relative bg-black rounded-lg "
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-green-500/20 rounded-lg blur-xl"></div>
              <div className={`relative bg-black/80 backdrop-blur-sm rounded-lg border border-green-400/30 p-8 ${loading ? 'pulse-glow' : ''}`}>
                
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm error-shake"
                  >
                    {error}
                  </motion.div>
                )}
                
                {/* Form */}
                <form onSubmit={handleFormSubmit} className="space-y-4 bg">
                  <div>
                    <label className="block text-green-400 text-sm font-light mb-2 tracking-wide uppercase ">
                      Team Name
                    </label>
                    <input
                      type="text" // Changed from email to text
                      value={username} // Changed from email to username
                      onChange={(e) => setUsername(e.target.value)} // Changed from setEmail to setUsername
                      onFocus={handleInputFocus}
                      className="w-full p-3 input-glow rounded font-mono text-sm border border-green-400/30 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
                      placeholder="Enter your Team name" // Updated placeholder
                      required
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-green-400 text-sm font-light mb-2 tracking-wide uppercase">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={handleInputFocus}
                      className="w-full p-3 input-glow rounded font-mono text-sm border border-green-400/30 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>
                  <br/>

                  <button
                    type="submit"
                    disabled={loading}
                    onMouseEnter={handleButtonHover}
                    className="w-full button-glow px-6 py-3 bg-transparent text-indigo-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-indigo-900/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="loading-dots">
                      AUTHENTICATING
                      </span>
                    ) : (
                       'AUTHENTICATE' 
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
            
            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mt-8 text-center"
            >
              <p className="text-gray-500 text-xs font-light tracking-wider">
                ENCRYPTED CONNECTION ESTABLISHED
                    <br />
                Developed by <a href="https://ospcvitc.club" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">OSPC</a>
              </p>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Floating Matrix-style Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-px h-12 bg-gradient-to-b from-transparent via-green-400 to-transparent opacity-20"
              style={{
                left: `${15 + i * 15}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -150, 0],
                opacity: [0, 0.4, 0],
              }}
              transition={{
                duration: 10 + Math.random() * 5,
                repeat: Infinity,
                delay: Math.random() * 4,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        
        {/* Corner Decorations */}
        <div className="absolute top-4 left-4 text-green-400 opacity-30 text-xs mono-font">
          SEC_LEVEL: MAX
        </div>
        <div className="absolute top-4 right-4 text-cyan-400 opacity-30 text-xs mono-font">
          STATUS: ONLINE
        </div>
        <div className="absolute bottom-4 left-4 text-indigo-400 opacity-30 text-xs mono-font">
          PROTOCOL: HTTPS
        </div>
        <div className="absolute bottom-4 right-4 text-gray-500 opacity-30 text-xs mono-font">
          AUTH_SYS v6.9
        </div>
      </div>
  );
}
