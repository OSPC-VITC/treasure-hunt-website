import confetti from 'canvas-confetti';

export const launchConfetti = (): void => {
  // Main confetti burst
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#00ff96', '#00ffff', '#ff0080', '#8000ff'],
    shapes: ['square', 'circle'],
    scalar: 1.2,
    drift: 0,
    gravity: 0.8,
    ticks: 200
  });

  // Side bursts for extra effect
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ['#00ff96', '#00ffff']
    });
  }, 200);

  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ['#ff0080', '#8000ff']
    });
  }, 400);
};

// Create audio instance for success sound
const createSuccessAudio = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null;
  
  const audio = new Audio('/audio/success.mp3');
  audio.volume = 0.4;
  audio.preload = 'auto';
  
  return audio;
};

// Create audio instance for deep celebration sound
const createDeepAudio = (): HTMLAudioElement | null => {
  if (typeof Audio === 'undefined') return null;
  
  const audio = new Audio('/audio/deep-celebration.mp3');
  audio.volume = 0.6;
  audio.preload = 'auto';
  
  return audio;
};

let successAudio: HTMLAudioElement | null = null;
let deepAudio: HTMLAudioElement | null = null;

export const playSuccessSfx = (): void => {
  if (!successAudio) {
    successAudio = createSuccessAudio();
  }
  
  if (successAudio) {
    successAudio.currentTime = 0;
    successAudio.play().catch(() => {
      console.warn('Could not play success sound');
    });
  }
};

export const playDeepSfx = (): void => {
  if (!deepAudio) {
    deepAudio = createDeepAudio();
  }
  
  if (deepAudio) {
    deepAudio.currentTime = 0;
    deepAudio.play().catch(() => {
      console.warn('Could not play deep celebration sound');
    });
  }
};
