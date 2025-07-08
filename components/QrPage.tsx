import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { useAtom } from 'jotai';
import { launchConfetti, playSuccessSfx, playDeepSfx } from '@/utils/celebrate';
import {
  currentClueAtom,
  totalCluesAtom,
} from '@/atoms/clueAtoms';

interface GPSCoordinates {
  latitude: number;
  longitude: number;
}

interface LocationData {
  id: number;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  clue: string;
  qrText: string;
}

interface ApiResponse {
  team_name: string;
  clues: {
    location: number;
    unlocked: boolean;
    timestamp: string | null;
  }[];
  progress: {
    unlocked: number;
    total: number;
    percentage: number;
    nextClue: number | null;
  };
  lastUpdated: string;
  isNewTeam?: boolean;
}

interface UnlockResponse {
  success: boolean;
  message: string;
  location: number;
  timestamp: string;
  progress: {
    unlocked: number;
    total: number;
    percentage: number;
    nextClue: number | null;
  };
  updated_clues: {
    location: number;
    unlocked: boolean;
    timestamp: string | null;
  }[];
  wasUpdated: boolean;
  expectedClue?: number; // Added for sequential validation
}

export default function HTML5QRScanner() {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Jotai atoms
  const [currentClue, setCurrentClue] = useAtom(currentClueAtom);
  const [totalClues] = useAtom(totalCluesAtom);
  
  const [data, setData] = useState('No result');
  const [isScanning, setIsScanning] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GPSCoordinates | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<'idle' | 'getting' | 'success' | 'error'>('idle');
  const [unlockedLocation, setUnlockedLocation] = useState<LocationData | null>(null);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Vibration/Haptic feedback function
  const vibrate = (pattern: number | number[] = 50): void => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Initialize audio context
  const initializeAudio = (): void => {
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
  const playBeep = (frequency: number = 800, duration: number = 100): void => {
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

  const playSuccessSound = (): void => {
    vibrate([100, 50, 100, 50, 150]); // Success vibration pattern
    playBeep(800, 100);
    setTimeout(() => playBeep(1000, 100), 150);
    setTimeout(() => playBeep(1200, 150), 300);
  };

  const playAchievementSound = (): void => {
    vibrate([120, 60, 120, 60, 200]); // Grand achievement vibration
    playBeep(900, 100);
    setTimeout(() => playBeep(1050, 120), 140);
    setTimeout(() => playBeep(1250, 180), 320);
  };

  // Deep celebration sound using Web Audio API as fallback
  const playDeepCelebration = (): void => {
    if (!audioContextRef.current || !audioInitialized) return;

    try {
      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();
      const filter = audioContextRef.current.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.frequency.value = 100; // Deep bass frequency
      oscillator.type = 'sine';
      
      filter.type = 'lowpass';
      filter.frequency.value = 200;
      filter.Q.value = 10;

      gainNode.gain.setValueAtTime(0.8, audioContextRef.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.4);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + 0.4);
    } catch (error) {
      console.warn('Deep celebration sound failed:', error);
    }
  };

  const playCelebrationSequence = (): void => {
    // Play success SFX first
    playSuccessSfx();
    
    // Then play achievement sound
    setTimeout(() => {
      playAchievementSound();
    }, 100);
    
    // Deep boom sound with confetti
    setTimeout(() => {
      // Try to play deep SFX, fallback to generated sound
      try {
        playDeepSfx();
      } catch (error) {
        playDeepCelebration();
      }
    }, 160);
    
    // Launch confetti
    setTimeout(() => {
      launchConfetti();
    }, 200);
    
    // Enhanced vibration for deep celebration
    setTimeout(() => {
      vibrate([150, 100, 150, 100, 200]);
    }, 200);
    
    // Show celebration state
    setShowCelebration(true);
    
    // Hide celebration after 3 seconds
    setTimeout(() => {
      setShowCelebration(false);
    }, 3000);
  };

  const playErrorSound = (): void => {
    vibrate([200, 100, 200]); // Error vibration pattern
    playBeep(400, 200);
    setTimeout(() => playBeep(350, 200), 250);
  };

  const playScanSound = (): void => {
    vibrate(30); // Light scan vibration
    playBeep(1200, 100);
    setTimeout(() => playBeep(1000, 100), 100);
  };

  const playLocationSound = (): void => {
    vibrate(25); // GPS location vibration
    playBeep(900, 80);
  };

  const playButtonSound = (): void => {
    vibrate(20); // Button press vibration
    playBeep(600, 50);
  };

  const playHoverSound = (): void => {
    vibrate(10); // Very light hover vibration
    playBeep(800, 30);
  };

  // Fetch current clue data from API
  const fetchClueData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/clues', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setApiData(data);
      
      // Update current clue atom based on API data
      const nextClue = data.progress.nextClue;
      if (nextClue) {
        setCurrentClue(nextClue);
      } else {
        // All clues completed
        setCurrentClue(data.progress.total + 1);
      }
      
      setData(`Looking for clue #${nextClue || 'completed'}...`);
    } catch (err) {
      console.error('Error fetching clue data:', err);
      setData('Error loading clue data');
    } finally {
      setIsLoading(false);
    }
  };

  // Unlock a clue via API using PUT method
  const unlockClue = async (location: number): Promise<UnlockResponse | null> => {
    try {
      const response = await fetch('/api/clues', {
        method: 'PUT', // Changed from POST to PUT
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: UnlockResponse = await response.json();
      return data;
    } catch (err) {
      console.error('Error unlocking clue:', err);
      throw err;
    }
  };

  // Get location data from environment variables - fixed version
  const getLocationData = (id: number): LocationData => {
    return {
      id,
      name: (process.env.NEXT_PUBLIC_LOCATION_1_NAME && id === 1) ? process.env.NEXT_PUBLIC_LOCATION_1_NAME :
            (process.env.NEXT_PUBLIC_LOCATION_2_NAME && id === 2) ? process.env.NEXT_PUBLIC_LOCATION_2_NAME :
            (process.env.NEXT_PUBLIC_LOCATION_3_NAME && id === 3) ? process.env.NEXT_PUBLIC_LOCATION_3_NAME :
            (process.env.NEXT_PUBLIC_LOCATION_4_NAME && id === 4) ? process.env.NEXT_PUBLIC_LOCATION_4_NAME :
            (process.env.NEXT_PUBLIC_LOCATION_5_NAME && id === 5) ? process.env.NEXT_PUBLIC_LOCATION_5_NAME :
            (process.env.NEXT_PUBLIC_LOCATION_6_NAME && id === 6) ? process.env.NEXT_PUBLIC_LOCATION_6_NAME :
            (process.env.NEXT_PUBLIC_LOCATION_7_NAME && id === 7) ? process.env.NEXT_PUBLIC_LOCATION_7_NAME :
            `Location ${id}`,
      coordinates: {
        lat: id === 1 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_1_LAT || '0') :
             id === 2 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_2_LAT || '0') :
             id === 3 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_3_LAT || '0') :
             id === 4 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_4_LAT || '0') :
             id === 5 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_5_LAT || '0') :
             id === 6 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_6_LAT || '0') :
             id === 7 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_7_LAT || '0') : 0,
        lng: id === 1 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_1_LNG || '0') :
             id === 2 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_2_LNG || '0') :
             id === 3 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_3_LNG || '0') :
             id === 4 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_4_LNG || '0') :
             id === 5 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_5_LNG || '0') :
             id === 6 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_6_LNG || '0') :
             id === 7 ? parseFloat(process.env.NEXT_PUBLIC_LOCATION_7_LNG || '0') : 0
      },
      clue: id === 1 ? process.env.NEXT_PUBLIC_CLUE_1_TEXT || '' :
            id === 2 ? process.env.NEXT_PUBLIC_CLUE_2_TEXT || '' :
            id === 3 ? process.env.NEXT_PUBLIC_CLUE_3_TEXT || '' :
            id === 4 ? process.env.NEXT_PUBLIC_CLUE_4_TEXT || '' :
            id === 5 ? process.env.NEXT_PUBLIC_CLUE_5_TEXT || '' :
            id === 6 ? process.env.NEXT_PUBLIC_CLUE_6_TEXT || '' :
            id === 7 ? process.env.NEXT_PUBLIC_CLUE_7_TEXT || '' : '',
      qrText: id === 1 ? process.env.NEXT_PUBLIC_QR_1_TEXT || '' :
              id === 2 ? process.env.NEXT_PUBLIC_QR_2_TEXT || '' :
              id === 3 ? process.env.NEXT_PUBLIC_QR_3_TEXT || '' :
              id === 4 ? process.env.NEXT_PUBLIC_QR_4_TEXT || '' :
              id === 5 ? process.env.NEXT_PUBLIC_QR_5_TEXT || '' :
              id === 6 ? process.env.NEXT_PUBLIC_QR_6_TEXT || '' :
              id === 7 ? process.env.NEXT_PUBLIC_QR_7_TEXT || '' : ''
    };
  };

  // Find location by QR text - only check current clue
  const findLocationByQRText = (qrText: string): LocationData | null => {
    if (!apiData?.progress.nextClue) return null;
    
    const currentLocationData = getLocationData(apiData.progress.nextClue);
    
    // Only accept QR code for the current clue
    if (currentLocationData.qrText === qrText) {
      return currentLocationData;
    }
    
    return null;
  };

  // Check if all clues are completed
  const isGameCompleted = (): boolean => {
    return apiData ? apiData.progress.nextClue === null : false;
  };

  // Initialize audio on first user interaction
  useEffect(() => {
    const handleFirstInteraction = (): void => {
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

  // Fetch initial data
  useEffect(() => {
    fetchClueData();
  }, []);

  // Glitch effect
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      vibrate(5); // Very subtle glitch vibration
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
      playLocationSound();
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(coords);
          setLocationStatus('success');
          playSuccessSound();
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
          playErrorSound();
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

  // Handle treasure hunt QR code validation
  const handleTreasureHuntValidation = async (qrData: string) => {
    playScanSound();
    setScanAttempts(0); // Reset attempts on successful scan
    
    // Check if game is already completed
    if (isGameCompleted()) {
      setData(`🎉 Game completed! All ${apiData?.progress.total || totalClues} clues found!`);
      playSuccessSound();
      return;
    }
    
    // Find the location that matches this QR code for current clue
    const matchedLocation = findLocationByQRText(qrData);
    
    if (!matchedLocation) {
      // Check if this QR belongs to a different clue
      let belongsToOtherClue = false;
      for (let i = 1; i <= totalClues; i++) {
        if (i !== (apiData?.progress.nextClue || currentClue)) {
          const otherLocation = getLocationData(i);
          if (otherLocation.qrText === qrData) {
            belongsToOtherClue = true;
            const currentClueNum = apiData?.progress.nextClue || currentClue;
            if (i < currentClueNum) {
              setData(`❌ Clue #${i} already completed. Looking for clue #${currentClueNum}`);
            } else {
              setData(`❌ Wrong clue! Complete clue #${currentClueNum} first`);
            }
            break;
          }
        }
      }
      
      if (!belongsToOtherClue) {
        const currentClueNum = apiData?.progress.nextClue || currentClue;
        setData(`❌ Invalid QR code. Looking for clue #${currentClueNum}`);
      }
      
      playErrorSound();
      return;
    }

    // Check if location coordinates are valid (skip GPS if coordinates are 0,0)
    if (matchedLocation.coordinates.lat === 0 && matchedLocation.coordinates.lng === 0) {
      try {
        setData('🔄 Unlocking clue...');
        const unlockResult = await unlockClue(matchedLocation.id);
        
        if (unlockResult?.success) {
          // Update API data
          await fetchClueData();
          
          setData(`✅ Clue #${matchedLocation.id} completed! "${matchedLocation.name}" unlocked!`);
          setUnlockedLocation(matchedLocation);
          playCelebrationSequence();
          
          // Check if this was the last clue
          if (unlockResult.progress.nextClue === null) {
            setTimeout(() => {
              setData(`🎉 CONGRATULATIONS! All ${unlockResult.progress.total} clues completed! Game finished!`);
            }, 2000);
          }
        } else {
          // Handle sequential validation error
          if (unlockResult?.expectedClue) {
            setData(`❌ Must complete clues in order. Expected clue #${unlockResult.expectedClue}, got #${matchedLocation.id}`);
          } else {
            setData(`❌ Failed to unlock clue: ${unlockResult?.message || 'Unknown error'}`);
          }
          playErrorSound();
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Handle specific error messages from the API
        if (errorMessage.includes('Must complete clues in order')) {
          setData(`❌ ${errorMessage}`);
        } else if (errorMessage.includes('Location already unlocked')) {
          setData(`❌ Clue #${matchedLocation.id} already completed!`);
        } else if (errorMessage.includes('Team not found')) {
          setData(`❌ Team data error. Please try restarting the scanner.`);
        } else {
          setData(`❌ Error unlocking clue: ${errorMessage}`);
        }
        playErrorSound();
      }
      return;
    }

    try {
      const currentPos = await getCurrentLocation();
      const distance = calculateDistance(
        currentPos.latitude,
        currentPos.longitude,
        matchedLocation.coordinates.lat,
        matchedLocation.coordinates.lng
      );

      const tolerance = 50; // 50 meters tolerance
      
      if (distance <= tolerance) {
        try {
          setData('🔄 Unlocking clue...');
          const unlockResult = await unlockClue(matchedLocation.id);
          
          if (unlockResult?.success) {
            // Update API data
            await fetchClueData();
            
            setData(`✅ Clue #${matchedLocation.id} completed! "${matchedLocation.name}" unlocked!`);
            setUnlockedLocation(matchedLocation);
            playCelebrationSequence();
            
            // Check if this was the last clue
            if (unlockResult.progress.nextClue === null) {
              setTimeout(() => {
                setData(`🎉 CONGRATULATIONS! All ${unlockResult.progress.total} clues completed! Game finished!`);
              }, 2000);
            }
          } else {
            // Handle sequential validation error
            if (unlockResult?.expectedClue) {
              setData(`❌ Must complete clues in order. Expected clue #${unlockResult.expectedClue}, got #${matchedLocation.id}`);
            } else {
              setData(`❌ Failed to unlock clue: ${unlockResult?.message || 'Unknown error'}`);
            }
            playErrorSound();
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          // Handle specific error messages from the API
          if (errorMessage.includes('Must complete clues in order')) {
            setData(`❌ ${errorMessage}`);
          } else if (errorMessage.includes('Location already unlocked')) {
            setData(`❌ Clue #${matchedLocation.id} already completed!`);
          } else if (errorMessage.includes('Team not found')) {
            setData(`❌ Team data error. Please try restarting the scanner.`);
          } else {
            setData(`❌ Error unlocking clue: ${errorMessage}`);
          }
          playErrorSound();
        }
      } else {
        setData(`❌ You're ${Math.round(distance)}m away from the location. Get closer!`);
        playErrorSound();
      }
    } catch (error) {
      setData(`Location error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      playErrorSound();
    }
  };

  // Fixed scanner initialization
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    const initializeScanner = async () => {
      try {
        const config = {
          fps: 20, // Increased for better detection
          qrbox: function(viewfinderWidth: number, viewfinderHeight: number) {
            // Square QR box with 70% of the smaller dimension
            const minEdgePercentage = 0.7;
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          disableFlip: false,
          rememberLastUsedCamera: true,
          // Enhanced detection settings
          videoConstraints: {
            facingMode: "environment", // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        scanner = new Html5QrcodeScanner('qr-reader', config, false);
        scannerRef.current = scanner;

        const onScanSuccess = (decodedText: string) => {
          console.log('QR Code detected:', decodedText);
          
          if (scanner) {
            scanner.clear().then(() => {
              setIsScanning(false);
              handleTreasureHuntValidation(decodedText);
            }).catch(err => {
              console.error('Error clearing scanner:', err);
              setIsScanning(false);
              handleTreasureHuntValidation(decodedText);
            });
          }
        };

        const onScanError = (errorMessage: string) => {
          // Filter out common detection errors that are not actual problems
          const ignoredErrors = [
            'NotFoundException',
            'No MultiFormat Readers',
            'QR code parse error',
            'Unable to detect code'
          ];
          
          const shouldIgnore = ignoredErrors.some(error => 
            errorMessage.includes(error)
          );
          
          if (!shouldIgnore) {
            console.warn('QR Scanner Error:', errorMessage);
            // Only show user-facing errors for actual problems
            if (errorMessage.includes('camera') || errorMessage.includes('permission')) {
              setData(`Camera error: ${errorMessage}`);
            }
          } else {
            // Track failed detection attempts
            setScanAttempts(prev => {
              const newAttempts = prev + 1;
              if (newAttempts >= 100) { // After many failed attempts
                setData('Having trouble detecting QR code. Try adjusting lighting or camera angle.');
                return 0; // Reset counter
              }
              return newAttempts;
            });
          }
        };

        scanner.render(onScanSuccess, onScanError);
        setIsScanning(true);
        
      } catch (error) {
        console.error('Failed to initialize scanner:', error);
        setData('Failed to initialize camera scanner');
      }
    };

    if (apiData && !isGameCompleted()) {
      initializeScanner();
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [apiData]);

  const restartScanner = () => {
    playButtonSound();
    setUnlockedLocation(null);
    setShowCelebration(false);
    setScanAttempts(0);
    
    // Refresh API data
    fetchClueData();
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const getLocationManually = async () => {
    playButtonSound();
    try {
      await getCurrentLocation();
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  // Calculate current progress from API data
  const completedClues = apiData?.progress.unlocked || 0;
  const nextClueNumber = apiData?.progress.nextClue;

  return (
    <div className="bg-black text-white min-h-screen mono-font overflow-hidden relative z-0">
      {/* CRT Effects */}
      <div className="crt-background"></div>
      <div className="crt-scanlines opacity-50"></div>
      <div className="crt-vignette"></div>
      <div className="grid-bg absolute inset-0 opacity-20"></div>

      {/* Celebration Overlay */}
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
        >
        </motion.div>
      )}

      <div className="relative z-10 flex flex-col min-h-screen px-4 py-5 sm:px-6 lg:px-8">
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
                data-text="TREASURE_HUNT_SCANNER"
              >
                SCANNER
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

            {/* Progress Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="text-sm text-orange-400 mb-4"
            >
              CLUE PROGRESS: {completedClues} / {apiData?.progress.total || totalClues}
              {!isGameCompleted() && nextClueNumber && (
                <div className="text-xs text-gray-400 mt-1">
                  Looking for clue #{nextClueNumber}
                </div>
              )}
            </motion.div>
          </div>

          {/* Game Completion Message */}
          {isGameCompleted() && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border border-yellow-400 rounded-lg p-6"
            >
              <h2 className="text-2xl text-yellow-400 font-light mb-2">🏆 GAME COMPLETED!</h2>
              <p className="text-white">Congratulations! You've found all {apiData?.progress.total || totalClues} clues!</p>
            </motion.div>
          )}

          {/* Achievement Display - Grand Unlocked Location */}
          {unlockedLocation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 15, duration: 0.8 }}
              className="mb-6"
            >
              <div className="bg-green-900/40 border border-green-400 shadow-lg shadow-green-400/30 rounded-lg p-6 max-w-md mx-auto relative overflow-hidden">
                {/* Animated glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-500/20 via-cyan-500/20 to-green-500/20 rounded-lg"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                
                {/* Celebration particles */}
                {showCelebration && (
                  <div className="absolute inset-0 pointer-events-none">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                          rotate: [0, 360],
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.1,
                          ease: "easeOut"
                        }}
                      />
                    ))}
                  </div>
                )}
                
                <div className="relative z-10">
                  <motion.h3 
                    className="text-green-400 text-xl font-light uppercase mb-3 tracking-wider"
                    animate={{ scale: showCelebration ? [1, 1.1, 1] : [1, 1.05, 1] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    🏆 LOCATION UNLOCKED
                  </motion.h3>
                  
                  <motion.div 
                    className="text-white text-base mb-2 font-medium"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    {unlockedLocation.name}
                  </motion.div>
                  
                  {unlockedLocation.clue && (
                    <motion.div 
                      className="text-cyan-300 text-sm italic leading-relaxed"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                    >
                      "{unlockedLocation.clue}"
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Display */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mb-6"
          >
            <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 max-w-md mx-auto">
              <div className="text-orange-400 text-sm uppercase tracking-wide mb-2">
                STATUS:
              </div>
              <motion.div 
                className="text-white text-xs"
                key={data}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isLoading ? 'Loading...' : data}
              </motion.div>
            </div>
          </motion.div>

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
                  <motion.button
                    onClick={getLocationManually}
                    onMouseEnter={playHoverSound}
                    disabled={locationStatus === 'getting'}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="button-glow px-3 py-1 bg-transparent text-orange-300 text-xs font-light tracking-wider uppercase transition-all duration-300 hover:bg-orange-900/20 disabled:opacity-50"
                  >
                    {locationStatus === 'getting' ? 'LOCATING...' : 'GET_LOCATION'}
                  </motion.button>
                </div>
                
                {locationStatus === 'getting' && (
                  <motion.div 
                    className="text-yellow-400 text-xs uppercase tracking-wider"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></span>
                    <span className="loading-dots">ACQUIRING GPS</span>
                  </motion.div>
                )}
                
                {locationStatus === 'success' && currentLocation && (
                  <motion.div 
                    className="text-green-400 text-xs"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div>LAT: {currentLocation.latitude.toFixed(6)}</div>
                    <div>LNG: {currentLocation.longitude.toFixed(6)}</div>
                  </motion.div>
                )}
                
                {locationStatus === 'error' && (
                  <motion.div 
                    className="text-red-400 text-xs"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    ERROR: {locationError}
                  </motion.div>
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
          {!isGameCompleted() && apiData && (
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
          )}

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="mb-6"
          >
            <motion.button
              onClick={restartScanner}
              onMouseEnter={playHoverSound}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="button-glow px-6 py-3 bg-transparent text-indigo-300 text-sm font-light tracking-wider uppercase transition-all duration-300 hover:bg-indigo-900/20"
            >
              RESTART_SCANNER
            </motion.button>
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
  );
}
