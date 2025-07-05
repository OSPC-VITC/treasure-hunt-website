'use client';

import { useEffect, useState } from 'react';
import { useSignIn, useSignUp, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const [glitchActive, setGlitchActive] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn, setActive } = useSignIn();
  const { signUp, setActive: setActiveSignUp } = useSignUp();
  const { isSignedIn } = useUser();

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
      console.log('User is signed in, redirecting...');
      // window.location.href = '/dashboard';
    }
  }, [isSignedIn]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signIn?.create({
        identifier: email,
        password: password,
      });

      if (result?.status === 'complete') {
        if (setActive) {
          await setActive({ session: result.createdSessionId });
        }
        console.log('Sign in successful');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Sign in failed');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await signUp?.create({
        emailAddress: email,
        password: password,
      });

      if (result?.status === 'complete') {
        if (setActiveSignUp) {
          await setActiveSignUp({ session: result.createdSessionId });
        }
        console.log('Sign up successful');
      } else if (result?.status === 'missing_requirements') {
        // Handle email verification if needed
        console.log('Email verification required');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Sign up failed');
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
        
        .mono-font {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
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
        
        .input-glow {
          background: rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(0, 255, 150, 0.3);
          color: white;
          transition: all 0.3s ease;
        }
        
        .input-glow:focus {
          outline: none;
          border-color: #00ff96;
          box-shadow: 0 0 10px rgba(0, 255, 150, 0.3);
        }
        
        .subtle-glow {
          text-shadow: 0 0 10px currentColor;
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
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-lg text-cyan-400 font-light subtle-glow mb-6"
              >
                SECURE AUTHENTICATION REQUIRED
              </motion.div>
            </div>
            
            {/* Auth Form */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-green-500/20 rounded-lg blur-xl"></div>
              <div className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-green-400/30 p-8">
                

                  

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-green-400 text-sm font-light mb-2 tracking-wide uppercase">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 input-glow rounded font-mono text-sm"
                      placeholder="user@vitstudent.ac.in"
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
                      className="w-full p-3 input-glow rounded font-mono text-sm"
                      placeholder="••••••••"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full button-glow px-6 py-3 bg-transparent text-indigo-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-indigo-900/20 disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="loading-dots">
                        {mode === 'signin' ? 'AUTHENTICATING' : 'CREATING ACCOUNT'}
                      </span>
                    ) : (
                      mode === 'signin' ? 'AUTHENTICATE' : 'CREATE ACCOUNT'
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
          AUTH_SYS v2.1
        </div>
      </div>
    </>
  );
}