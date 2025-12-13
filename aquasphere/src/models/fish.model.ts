export interface FishType {
  id: string;
  name: string;
  color: string;
  size: number;
  speed: number;
  tier: number; // 1 = common, 2 = uncommon, 3 = rare, 4 = epic, 5 = legendary
  isCleaner?: boolean; // true for cleaner fish like catfish/plecos
}

export interface FishInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  speedX: number;
  speedY: number;
  direction: number;
  targetX?: number;
  targetY?: number;
  targetParticle?: Particle; // optional reference to the particle the fish is targeting
  isFeeding: boolean;
  hunger: number;
  lastFeedTime: number;
  lastAteTime?: number;   // timestamp when fish last ate food (real time)
  satiationLoggedEnd?: boolean; // flag to track if satiation end was logged
  size: number;
  color: string;
  name?: string;          // optional user-assigned name
  birthTime?: number;     // timestamp when fish was created (ms)
  pointsEarned?: number;  // points generated/earned by this fish
  // optional runtime state
  isDead?: boolean;          // true when fish has died from starvation
  deathTime?: number;        // timestamp when fish died
  starvationStart?: number;  // timestamp when hunger first reached 100
  deathWarning?: boolean;    // true when death warning has been shown
  deadSettled?: boolean;     // true when dead fish has reached the bottom and stays there
  lastPointsGenerated?: number; // timestamp when fish last generated points
  isCleanerFish?: boolean;   // true for cleaner fish that actively clean dirt
  isCleaning?: boolean;      // true when cleaner fish is actively seeking dirt
  targetDirtStain?: any;     // reference to the dirt stain being targeted
  lastCleaningParticles?: number; // timestamp for throttling cleaning particle spawning
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
  // optional fields
  isFeed?: boolean;
  life?: number;
  settled?: boolean; // when true, feed particle rests on bottom
  isCleanFeedback?: boolean; // short-lived visual particles from cleaning action
}
