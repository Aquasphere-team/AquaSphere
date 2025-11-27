export interface FishType {
  id: string;
  name: string;
  color: string;
  size: number;
  speed: number;
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
  size: number;
  color: string;
  // optional runtime state
  isDead?: boolean;          // true when fish has died from starvation
  deathTime?: number;        // timestamp when fish died
  starvationStart?: number;  // timestamp when hunger first reached 100
  deadSettled?: boolean;     // true when dead fish has reached the bottom and stays there
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
}
