import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence, Variant } from 'framer-motion';
import { Lock, Unlock, Map, MapPin, X } from 'lucide-react';
import { useAtom } from 'jotai';
import {
  currentClueAtom,
  totalCluesAtom,
} from '@/atoms/clueAtoms';

// Type definitions
interface Activity {
  action: string;
  time: string;
  points: string;
  type: 'clue' | 'scan' | 'bonus';
}

interface HomeContentProps {
  completedClues?: number;
  teamScore?: number;
  activities?: Activity[];
  isLoading?: boolean;
}

interface ClueData {
  text: string;
}

interface MapLocation {
  id: number;
  name: string;
  isUnlocked: boolean;
  coordinates: { lat: number; lng: number };
}

// Helper function to get location data from environment variables
const getLocationData = (id: number): { id: number; name: string; coordinates: { lat: number; lng: number } } => {
  // Use window check for client-side access
  if (typeof window === 'undefined') {
    return {
      id,
      name: `Location ${id}`,
      coordinates: { lat: 0, lng: 0 }
    };
  }

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
    }
  };
};

// Helper function to get clue text from environment variables
const getClueText = (clueNumber: number): string => {
  if (typeof window === 'undefined') {
    return "Your next clue awaits discovery...";
  }

  switch (clueNumber) {
    case 1:
      return process.env.NEXT_PUBLIC_CLUE_1_TEXT || "Your first clue awaits discovery...";
    case 2:
      return process.env.NEXT_PUBLIC_CLUE_2_TEXT || "Your second clue awaits discovery...";
    case 3:
      return process.env.NEXT_PUBLIC_CLUE_3_TEXT || "Your third clue awaits discovery...";
    case 4:
      return process.env.NEXT_PUBLIC_CLUE_4_TEXT || "Your fourth clue awaits discovery...";
    case 5:
      return process.env.NEXT_PUBLIC_CLUE_5_TEXT || "Your fifth clue awaits discovery...";
    case 6:
      return process.env.NEXT_PUBLIC_CLUE_6_TEXT || "Your sixth clue awaits discovery...";
    case 7:
      return process.env.NEXT_PUBLIC_CLUE_7_TEXT || "Your final clue awaits discovery...";
    default:
      return "Your next clue awaits discovery...";
  }
};

const HomeContent: React.FC<HomeContentProps> = ({
  completedClues: propCompletedClues,
  isLoading = false,
}) => {
  const [showMap, setShowMap] = useState<boolean>(false);
  
  // Use atoms for current clue and total clues
  const [currentClue] = useAtom(currentClueAtom);
  const [totalClues] = useAtom(totalCluesAtom);

  // Fix: Use prop value if provided, otherwise fallback to atom-based calculation
  const completedClues = propCompletedClues !== undefined ? propCompletedClues : Math.max(0, currentClue - 1);

  // Map locations based on completed clues using environment variables
  const mapLocations: MapLocation[] = useMemo(() => {
    const locations: MapLocation[] = [];
    for (let i = 1; i <= totalClues; i++) {
      const locationData = getLocationData(i);
      locations.push({
        ...locationData,
        isUnlocked: completedClues >= i
      });
    }
    return locations;
  }, [completedClues, totalClues]);

  // Memoized calculations
  const progressPercentage = useMemo(() => {
    if (totalClues === 0) return 0;
    return Math.round((completedClues / totalClues) * 100);
  }, [completedClues, totalClues]);

  // Current clue data from environment variables
  const currentClueData: ClueData = useMemo(() => ({
    text: getClueText(currentClue),
  }), [currentClue]);

  const unlockedLocations = useMemo(() => 
    mapLocations.filter(location => location.isUnlocked).length,
    [mapLocations]
  );

  // Animation variants
  const containerVariants: Record<string, Variant> = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.6,
        staggerChildren: 0.15,
        ease: "easeOut"
      }
    }
  };

  const cardVariants: Record<string, Variant> = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: { 
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  const modalVariants: Record<string, Variant> = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9,
      transition: {
        duration: 0.2,
        ease: "easeIn"
      }
    }
  };

  // Fix: Add safety check for totalClues
  if (totalClues === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-black/80 backdrop-blur-sm rounded-lg border border-red-400/30 p-4">
          <div className="text-center">
            <h2 className="text-lg font-light mb-2 text-red-400">Configuration Error</h2>
            <p className="text-sm text-gray-400">No clues configured. Please check your environment variables.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-black/80 backdrop-blur-sm rounded-lg border border-gray-600/30 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-3"></div>
              <div className="h-8 bg-gray-700/50 rounded w-2/3 mb-2"></div>
              <div className="h-2 bg-gray-700/50 rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4"
    >
      {/* Progress Overview */}
      <motion.div 
        variants={cardVariants}
        className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-green-400/30 p-4 hover:border-green-400/50 transition-all duration-300 group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-cyan-500/10 to-indigo-500/10 rounded-lg blur-xl group-hover:blur-lg transition-all duration-300"></div>
        <div className="relative">
          <h2 className="text-lg font-light mb-4 text-green-400 tracking-wide uppercase">
            Mission Status
          </h2>
          
          <div className="text-center mb-4">
            <motion.div 
              className="text-3xl font-bold text-cyan-400 mb-1"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 20 }}
            >
              {completedClues}
            </motion.div>
            <div className="text-sm text-gray-400 uppercase tracking-wider">Clues Completed</div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Progress</span>
              <span className="font-mono">{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
                className="bg-gradient-to-r from-green-400 via-cyan-400 to-indigo-400 h-3 rounded-full relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 to-transparent animate-pulse"></div>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </motion.div>
            </div>
          </div>

          <div className="text-center">
            <span className="text-xs text-gray-500">
              {Math.max(0, totalClues - completedClues)} clues remaining
            </span>
          </div>
        </div>
      </motion.div>

      {/* Map Access Card */}
      <motion.div 
        variants={cardVariants}
        className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-purple-400/30 p-4 hover:border-purple-400/50 transition-all duration-300 group"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-indigo-500/10 rounded-lg blur-xl group-hover:blur-lg transition-all duration-300"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-light text-purple-400 tracking-wide uppercase flex items-center">
              <Map className="w-4 h-4 mr-2" />
              Treasure Map
            </h3>
            <div className="flex items-center space-x-2">
              <motion.div
                animate={completedClues > 0 ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                {completedClues > 0 ? (
                  <Unlock className="w-4 h-4 text-green-400" />
                ) : (
                  <Lock className="w-4 h-4 text-red-400" />
                )}
              </motion.div>
              <span className="text-xs text-gray-400 font-mono">
                {unlockedLocations}/{totalClues}
              </span>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-sm text-gray-300 mb-3">
              {completedClues === 0 
                ? "Complete your first clue to unlock the treasure map!"
                : `${unlockedLocations} location${unlockedLocations !== 1 ? 's' : ''} revealed`
              }
            </div>
            
            {/* Map preview with location dots */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
              <div className="grid grid-cols-7 gap-2 justify-items-center">
                {mapLocations.map((location) => (
                  <motion.div
                    key={location.id}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs cursor-pointer ${
                      location.isUnlocked 
                        ? 'border-green-400 bg-green-400/20 text-green-400 shadow-lg shadow-green-400/20' 
                        : 'border-gray-600 bg-gray-800/50 text-gray-600'
                    }`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: location.id * 0.1, type: "spring", stiffness: 200 }}
                    whileHover={{ 
                      scale: location.isUnlocked ? 1.3 : 1.1,
                      transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {location.isUnlocked ? (
                      <MapPin className="w-3 h-3" />
                    ) : (
                      <Lock className="w-3 h-3" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: completedClues > 0 ? 1.02 : 1 }}
            whileTap={{ scale: completedClues > 0 ? 0.98 : 1 }}
            onClick={() => completedClues > 0 && setShowMap(true)}
            disabled={completedClues === 0}
            className={`w-full py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300 ${
              completedClues > 0
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-400/50 hover:border-purple-400/70 shadow-lg hover:shadow-purple-400/20'
                : 'bg-gray-800/50 text-gray-600 border border-gray-700/50 cursor-not-allowed'
            }`}
          >
            {completedClues > 0 ? 'View Treasure Map' : 'Map Locked - Complete First Clue'}
          </motion.button>
        </div>
      </motion.div>

      {/* Current Clue */}
      {currentClue <= totalClues && (
        <motion.div 
          variants={cardVariants}
          className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-cyan-400/30 p-4 hover:border-cyan-400/50 transition-all duration-300 group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-green-500/10 rounded-lg blur-xl group-hover:blur-lg transition-all duration-300"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-light text-cyan-400 tracking-wide uppercase">
                Current Clue #{currentClue}
              </h3>
              <motion.div 
                className="w-3 h-3 bg-green-400 rounded-full shadow-lg shadow-green-400/50"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.7, 1, 0.7]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            <motion.div 
              className="bg-gray-900/30 rounded-lg p-4 border border-gray-700/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.4 }}
            >
              <p className="text-gray-300 text-sm font-light leading-relaxed italic">
                "{currentClueData.text}"
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Map Modal */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowMap(false)}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-black/90 border border-purple-400/50 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-light text-purple-400 tracking-wide uppercase flex items-center">
                  <Map className="w-5 h-5 mr-2" />
                  Treasure Map
                </h2>
                <motion.button
                  onClick={() => setShowMap(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800/50 rounded"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
              
              <div className="space-y-3">
                {mapLocations.map((location, index) => (
                  <motion.div
                    key={location.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border transition-all duration-300 ${
                      location.isUnlocked
                        ? 'border-green-400/30 bg-green-400/10 hover:bg-green-400/15'
                        : 'border-gray-600/30 bg-gray-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.div
                          animate={location.isUnlocked ? { rotate: [0, 5, -5, 0] } : {}}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                          {location.isUnlocked ? (
                            <MapPin className="w-5 h-5 text-green-400" />
                          ) : (
                            <Lock className="w-5 h-5 text-gray-600" />
                          )}
                        </motion.div>
                        <span className={`font-medium ${
                          location.isUnlocked ? 'text-green-400' : 'text-gray-600'
                        }`}>
                          {location.isUnlocked ? location.name : 'Locked Arena'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-800/50 px-2 py-1 rounded">
                        #{location.id}
                      </span>
                    </div>
                    {location.isUnlocked && (
                      <motion.div 
                        className="mt-3 text-xs text-gray-400 bg-gray-900/50 p-2 rounded border border-gray-700/30"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ delay: 0.2 }}
                      >
                        <span className="font-mono">
                          {location.coordinates.lat.toFixed(4)}, {location.coordinates.lng.toFixed(4)}
                        </span>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HomeContent;