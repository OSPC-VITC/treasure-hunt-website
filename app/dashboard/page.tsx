'use client';
import React, { useEffect, useState, useRef, JSX } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, useClerk } from '@clerk/nextjs';
import { 
  Home, 
  ScanLine, 
  Users, 
  Star, 
  LogOut,
  Menu,
  Sparkles
} from 'lucide-react';
import QRScanner from '@/components/QrPage';
import HomeContent from '@/components/home';

interface Activity {
  action: string;
  time: string;
  points: string;
}

interface Stat {
  label: string;
  value: string | number;
  color: string;
}

interface TabItem {
  id: string;
  icon: JSX.Element;
  label: string;
}

interface TeamMember {
  name: string;
  rollno: string;
}

interface TeamResponse {
  team_name: string;
  members: TeamMember[];
  error?: string; 
}

export default function TreasureHuntDashboard(): JSX.Element {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [glitchActive, setGlitchActive] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [audioInitialized, setAudioInitialized] = useState<boolean>(false);
  
  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);

  // Fetch team members from API
  const fetchTeamMembers = async (): Promise<void> => {
    if (!user) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/team-members');
      const data: TeamResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch team members');
      }

      setTeamMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch team members when user is loaded
  useEffect(() => {
    if (isLoaded && user) {
      fetchTeamMembers();
    }
  }, [isLoaded, user]);

  // Vibration/Haptic feedback function
  const vibrate = (pattern: number | number[] = 50): void => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // Get team name from Clerk user data
  const getTeamName = (): string => {
    if (!isLoaded || !user) return 'Loading...';
    
    // Priority: fullName > firstName + lastName > username > email
    if (user.fullName) return user.fullName;
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    if (user.primaryEmailAddress?.emailAddress) return user.primaryEmailAddress.emailAddress;
    
    return 'Anonymous User';
  };

  // Get team initials for avatar
  const getTeamInitials = (): string => {
    if (!isLoaded || !user) return 'T';
    
    const teamName = getTeamName();
    if (teamName === 'Loading...' || teamName === 'Anonymous User') return 'T';
    
    const words = teamName.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return teamName.substring(0, 2).toUpperCase();
  };

  // Get initials for team members
  const getMemberInitials = (name: string): string => {
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handle sign out with vibration
  const handleSignOut = async (): Promise<void> => {
    vibrate([100, 50, 100]); // Double vibration pattern for important action
    
    // Fade out background music before sign out
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
    
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  // Initialize audio context and background music
  const initializeAudio = (): void => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        setAudioInitialized(true);

        // Initialize background music
        if (!backgroundMusicRef.current) {
          backgroundMusicRef.current = new Audio('/audio/background-music.mp3');
          backgroundMusicRef.current.loop = true;
          backgroundMusicRef.current.volume = 0.09; // Very light volume for dashboard

          backgroundMusicRef.current.addEventListener('canplaythrough', () => {
            console.log('Dashboard background music loaded successfully');
          });

          backgroundMusicRef.current.addEventListener('error', (e) => {
            console.warn('Dashboard background music failed to load:', e);
          });

          try {
            backgroundMusicRef.current.play();
          } catch (e) {
            console.warn('Could not play dashboard background music:', e);
          }
        }
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

  const playClickSound = (): void => {
    playBeep(600, 50);
  };

  const playHoverSound = (): void => {
    playBeep(900, 30);
  };

  const playScanSound = (): void => {
    playBeep(1200, 100);
    setTimeout(() => playBeep(1000, 100), 100);
  };

  // Glitch effect
  useEffect(() => {
    const glitchTimer = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 150);
    }, 60000);
    
    return () => clearInterval(glitchTimer);
  }, []);

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

  // Cleanup background music on unmount
  useEffect(() => {
    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current = null;
      }
    };
  }, []);

  // Handle tab change with vibration
  const handleTabChange = (tab: string): void => {
    vibrate(50); // Short vibration for tab change
    playClickSound();
    setActiveTab(tab);
    if (tab === 'scanner') {
      playScanSound();
    }
  };

  // Handle button hover with light vibration
  const handleButtonHover = (): void => {
    vibrate(20); // Very light vibration for hover
    playHoverSound();
  };

  // Header Component
  const Header: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 w-full bg-black/90 backdrop-blur-sm border-b border-green-400/30 z-20"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center space-x-3">
          <div className="text-green-400">
            <img src="/ospc_logo.png" alt="Treasure Icon" className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-lg font-light text-green-400 tracking-wide uppercase">
              Treasure Hunt
            </h1>
            <p className="text-xs text-gray-400">by OSPC</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-sm font-mono text-cyan-400">Team Name:</div>
            <div className="text-xs text-gray-400">{getTeamName()}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Scanner Tab Content
  const ScannerContent: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <QRScanner />
    </motion.div>
  );

  // Team Info Tab Content
  const TeamInfoContent: React.FC = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      {/* Team Profile */}
      <div className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-purple-400/30 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-cyan-500/10 rounded-lg blur-xl"></div>
        <div className="relative">
          <h2 className="text-lg font-light mb-4 text-purple-400 tracking-wide uppercase">
            Team Profile
          </h2>
          
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg font-bold text-black">{getTeamInitials()}</span>
            </div>
            <div>
              <h3 className="text-base text-white font-light">{getTeamName()}</h3>
              <p className="text-sm text-gray-400">Team Name</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-cyan-400/30 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-green-500/10 rounded-lg blur-xl"></div>
        <div className="relative">
          <h3 className="text-base font-light text-cyan-400 tracking-wide uppercase mb-3">
            Team Members ({teamMembers.length})
          </h3>
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-400">Loading team members...</div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center py-4 space-y-2">
              <div className="text-sm text-red-400">Error: {error}</div>
              <button
                onClick={fetchTeamMembers}
                className="px-3 py-1 bg-cyan-900/20 hover:bg-cyan-900/30 border border-cyan-400/30 hover:border-cyan-400/50 rounded text-xs text-cyan-400 transition-all duration-300"
              >
                Retry
              </button>
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-400">No team members found</div>
            </div>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member: TeamMember, index: number) => (
                <div key={`${member.name}-${index}`} className="flex items-center py-2 border-b border-gray-700/50 last:border-b-0">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-cyan-400 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-black">{getMemberInitials(member.name)}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-300 font-medium">{member.name}</div>
                      <div className="text-xs text-gray-500">Roll No: {member.rollno}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Section */}
      <div className="relative bg-black/80 backdrop-blur-sm rounded-lg border border-red-400/30 p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 rounded-lg blur-xl"></div>
        <div className="relative">
          <h3 className="text-base font-light text-red-400 tracking-wide uppercase mb-3">
            Account
          </h3>
          
          <button
            onClick={handleSignOut}
            onMouseEnter={handleButtonHover}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-400/30 hover:border-red-400/50 rounded-lg transition-all duration-300 text-red-400 hover:text-red-300"
          >
            <LogOut size={18} />
            <span className="font-light tracking-wide uppercase">Sign Out</span>
          </button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`bg-black text-white w-full h-screen mono-font flex flex-col overflow-hidden relative ${glitchActive ? 'animate-pulse' : ''}`}>
      {/* Header */}
      <Header />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 pt-20">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeContent key="home" />}
          {activeTab === 'scanner' && <ScannerContent key="scanner" />}
          {activeTab === 'team' && <TeamInfoContent key="team" />}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation - Fixed */}
      <div className="fixed bottom-0 left-0 w-full bg-black/90 backdrop-blur-sm border-t border-green-400/30 z-10">
        <div className="flex justify-around items-center py-3 px-4">
          {[
            { id: 'home', icon: <Home size={20} />, label: 'Home' },
            { id: 'scanner', icon: <ScanLine size={20} />, label: 'Scanner' },
            { id: 'team', icon: <Users size={20} />, label: 'Team' },
          ].map((tab: TabItem) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              onMouseEnter={handleButtonHover}
              className={`flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-green-900/30 text-green-400 border border-green-400/50'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {tab.icon}
              <span className="text-xs font-light tracking-wider uppercase">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Floating Matrix Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-px h-8 bg-gradient-to-b from-transparent via-green-400 to-transparent opacity-20"
            style={{
              left: `${20 + i * 20}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.4, 0],
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
  );
}
