import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion } from 'framer-motion';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

export default function HTML5QRScanner() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [data, setData] = useState('No result');
  const [isScanning, setIsScanning] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'getting' | 'success' | 'error'>('idle');

  // Glitch effect
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 6000);

    return () => clearInterval(glitchTimer);
  }, []);

  // Get current location
  const getCurrentLocation = (): Promise<GPSCoordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      setLocationStatus('getting');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(coords);
          setLocationStatus('success');
          resolve(coords);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          setLocationError(errorMessage);
          setLocationStatus('error');
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Convert to meters
  };

  // Parse QR code data to extract URL and coordinates
  const parseQRData = (qrData: string) => {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(qrData);
      if (parsed.url && parsed.latitude && parsed.longitude) {
        return {
          url: parsed.url,
          latitude: parseFloat(parsed.latitude),
          longitude: parseFloat(parsed.longitude),
          tolerance: parsed.tolerance || 100 // Default 100 meters tolerance
        };
      }
    } catch (e) {
      // If not JSON, try to parse as URL with coordinates in query params
      try {
        const url = new URL(qrData);
        const lat = url.searchParams.get('lat');
        const lng = url.searchParams.get('lng');
        const tolerance = url.searchParams.get('tolerance');
        
        if (lat && lng) {
          return {
            url: qrData,
            latitude: parseFloat(lat),
            longitude: parseFloat(lng),
            tolerance: tolerance ? parseFloat(tolerance) : 100
          };
        }
      } catch (e) {
        // If it's just a regular URL, return it without coordinates
        if (qrData.startsWith('http://') || qrData.startsWith('https://')) {
          return { url: qrData, latitude: null, longitude: null, tolerance: null };
        }
      }
    }
    return null;
  };

  // Handle location-based URL navigation
  const handleLocationBasedNavigation = async (qrData: string) => {
    const parsedData = parseQRData(qrData);
    
    if (!parsedData) {
      setData(`Invalid QR format: ${qrData}`);
      return;
    }

    // If no coordinates in QR, just navigate to URL
    if (parsedData.latitude === null || parsedData.longitude === null) {
      setData(`Navigating to: ${parsedData.url}`);
      window.open(parsedData.url, '_blank');
      return;
    }

    try {
      const currentPos = await getCurrentLocation();
      const distance = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        parsedData.latitude,
        parsedData.longitude
      );

      if (distance <= parsedData.tolerance!) {
        setData(`✅ Location verified! Distance: ${Math.round(distance)}m. Navigating to: ${parsedData.url}`);
        // Navigate to the URL
        setTimeout(() => {
          window.open(parsedData.url, '_blank');
        }, 1000);
      } else {
        setData(`❌ Location mismatch! You are ${Math.round(distance)}m away. Required within ${parsedData.tolerance}m of target location.`);
      }
    } catch (error) {
      setData(`Location error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
    };

    const scanner = new Html5QrcodeScanner('qr-reader', config, false);
    scannerRef.current = scanner;

    const onScanSuccess = (decodedText: string) => {
      console.log('QR Code scanned:', decodedText);
      
      // Stop scanning
      scanner.clear();
      setIsScanning(false);
      
      // Handle location-based navigation
      handleLocationBasedNavigation(decodedText);
    };

    const onScanError = (errorMessage: string) => {
      // Handle scan error - usually just means no QR code in view
      console.log('Scan error:', errorMessage);
    };

    scanner.render(onScanSuccess, onScanError);
    setIsScanning(true);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const restartScanner = () => {
    window.location.reload();
  };

  const getLocationManually = async () => {
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500&display=swap');
        
        .mono-font {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
        }
        
        /* CRT Effects */
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
          z-index: 2;
        }
        
        .crt-vignette {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.4) 100%);
          pointer-events: none;
          z-index: 3;
        }
        
        /* Grid Background */
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
        
        /* Glitch Effect */
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
        
        /* Button Styles */
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
        
        /* Container Styles */
        .scanner-container {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(0, 255, 150, 0.3);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .location-container {
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(255, 165, 0, 0.3);
          color: white;
        }
        
        /* Loading Animation */
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
        
        /* QR Scanner Overrides */
        #qr-reader {
          border: none !important;
        }
        
        #qr-reader__dashboard_section {
          background: rgba(0, 0, 0, 0.8) !important;
          border: 1px solid rgba(0, 255, 150, 0.3) !important;
          border-radius: 8px !important;
          color: white !important;
        }
        
        #qr-reader__dashboard_section button {
          background: transparent !important;
          border: 1px solid rgba(0, 255, 150, 0.5) !important;
          color: #00ff96 !important;
          font-family: 'JetBrains Mono', monospace !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          transition: all 0.3s ease !important;
        }
        
        #qr-reader__dashboard_section button:hover {
          background: rgba(0, 255, 150, 0.1) !important;
          box-shadow: 0 0 10px rgba(0, 255, 150, 0.3) !important;
        }
        
        #qr-reader__scan_region {
          border: 2px solid rgba(0, 255, 150, 0.5) !important;
        }
      `}</style>
      
      <div className="bg-black text-white min-h-screen mono-font overflow-hidden relative">
        {/* CRT Effects */}
        <div className="crt-background"></div>
        <div className="crt-scanlines"></div>
        <div className="crt-vignette"></div>
        <div className="grid-bg absolute inset-0 opacity-20"></div>

        <div className="relative z-10 flex flex-col justify-center items-center min-h-screen px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="text-center max-w-2xl mx-auto w-full"
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
                  data-text="GPS_QR_SCANNER"
                >
                  GPS_QR_SCANNER
                </span>
              </motion.h1>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-lg text-cyan-400 font-light mb-6"
              >
                LOCATION-VERIFIED ACCESS SYSTEM
              </motion.div>
            </div>

            {/* Location Status */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mb-6"
            >
              <div className="relative">
                <div className="location-container rounded-lg p-4 max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-orange-400 text-sm font-light tracking-wide uppercase">
                      GPS_STATUS:
                    </h3>
                    <button
                      onClick={getLocationManually}
                      disabled={locationStatus === 'getting'}
                      className="button-glow px-3 py-1 bg-transparent text-orange-300 text-xs font-light tracking-wider uppercase transition-all duration-300 hover:bg-orange-900/20 disabled:opacity-50"
                    >
                      {locationStatus === 'getting' ? 'LOCATING...' : 'GET_LOCATION'}
                    </button>
                  </div>
                  
                  {locationStatus === 'getting' && (
                    <div className="text-yellow-400 text-xs uppercase tracking-wider">
                      <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
                      <span className="loading-dots">ACQUIRING GPS</span>
                    </div>
                  )}
                  
                  {locationStatus === 'success' && currentLocation && (
                    <div className="text-green-400 text-xs">
                      <div>LAT: {currentLocation.latitude.toFixed(6)}</div>
                      <div>LNG: {currentLocation.longitude.toFixed(6)}</div>
                    </div>
                  )}
                  
                  {locationStatus === 'error' && (
                    <div className="text-red-400 text-xs">
                      ERROR: {locationError}
                    </div>
                  )}
                  
                  {locationStatus === 'idle' && (
                    <div className="text-gray-400 text-xs uppercase tracking-wider">
                      LOCATION NOT ACQUIRED
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
            
            {/* Scanner Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="relative mb-6"
            >
              <div className="scanner-container p-4">
                <div 
                  id="qr-reader" 
                  className="w-full max-w-md mx-auto"
                ></div>
              </div>
            </motion.div>

            {/* Controls */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.2 }}
              className="mb-6"
            >
              <button
                onClick={restartScanner}
                className="button-glow px-6 py-3 bg-transparent text-indigo-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-indigo-900/20"
              >
                RESTART_SCANNER
              </button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Floating Animation Elements */}
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
        
  
      </div>
    </>
  );
}