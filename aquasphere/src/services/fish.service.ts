import { Injectable } from '@angular/core';
import { FishType, FishInstance, Particle } from '../models/fish.model';

@Injectable({ providedIn: 'root' })
export class FishService {
  public fishTypes: FishType[] = [
    { id: 'goldfish', name: 'Goldfisch', color: '#FFD700', size: 25, speed: 9.0, tier: 1 },
    { id: 'bluefish', name: 'Blauer Fisch', color: '#4169E1', size: 20, speed: 12.0, tier: 2 },
    { id: 'redfish', name: 'Roter Fisch', color: '#DC143C', size: 18, speed: 14.0, tier: 3 },
    { id: 'greenfish', name: 'Grüner Fisch', color: '#32CD32', size: 22, speed: 11.0, tier: 2 },
    { id: 'angelfish', name: 'Kaiserfisch', color: '#FF69B4', size: 30, speed: 8.0, tier: 4 },
    { id: 'catfish', name: 'Putzfisch (Wels)', color: '#8B7355', size: 28, speed: 7.0, tier: 5, isCleaner: true }
  ];

  public fish: FishInstance[] = [];

  // configuration constants
  private readonly HUNGER_MS_PER_POINT = 5000; // ms per hunger point (5 seconds per point = much slower)
  private readonly HUNGER_THRESHOLD = 20; // Fish start eating at 20 hunger (earlier)
  private readonly HUNGER_DECREASE_ON_EAT = 60; // Eating removes 60 hunger (more filling)
  private readonly SATIATION_PAUSE_GAME_MS = 45000; // 45 seconds of GAME time pause (scales with timeSpeed)
  private readonly STARVATION_DEATH_MS = 2 * 60 * 1000; // 2 minutes of hunger at 100
  // Only allow chasing floating feed particles that are within this many pixels from the top
  // ("ein paar cm unter der Wasseroberfläche"). Adjust to taste.
  private readonly SURFACE_FEED_MAX_Y = 80;

  createStarterFish(): void {
    this.fish = [];
    const now = Date.now();
    this.fish.push({ id: 'starter1', type: 'goldfish', x: 200, y: 300, speedX: 1, speedY: 0.5, direction: 0, isFeeding: false, hunger: 20, lastFeedTime: now, size: 25, color: '#FFD700', name: 'Goldie', birthTime: now - 1000 * 60 * 60 * 24 * 3, pointsEarned: 0 });
    this.fish.push({ id: 'starter2', type: 'bluefish', x: 500, y: 200, speedX: -1, speedY: 0.3, direction: Math.PI, isFeeding: false, hunger: 15, lastFeedTime: now, size: 20, color: '#4169E1', name: 'Blinky', birthTime: now - 1000 * 60 * 60 * 24 * 1, pointsEarned: 0 });
    this.fish.push({ id: 'starter3', type: 'redfish', x: 350, y: 450, speedX: 0.5, speedY: -0.8, direction: Math.PI / 2, isFeeding: false, hunger: 25, lastFeedTime: now, size: 18, color: '#DC143C', name: 'Ruby', birthTime: now - 1000 * 60 * 60 * 24 * 7, pointsEarned: 0 });
  }

  addFish(typeId: string, x?: number, y?: number, canvasWidth = 800, canvasHeight = 600): void {
    const fishType = this.fishTypes.find(t => t.id === typeId);
    if (!fishType) return;

    const margin = fishType.size * 1.5;
    const safeX = x !== undefined ? x : Math.random() * (canvasWidth - 2 * margin) + margin;
    const safeY = y !== undefined ? y : Math.random() * (canvasHeight - 2 * margin) + margin;

    const fish: FishInstance = {
      id: `fish_${Date.now()}_${Math.random()}`,
      type: typeId,
      x: Math.max(margin, Math.min(safeX, canvasWidth - margin)),
      y: Math.max(margin, Math.min(safeY, canvasHeight - margin)),
      speedX: (Math.random() - 0.5) * fishType.speed,
      speedY: (Math.random() - 0.5) * fishType.speed * 0.5,
      direction: Math.random() * Math.PI * 2,
      isFeeding: false,
      hunger: Math.random() * 50 + 25,
      lastFeedTime: Date.now(),
      size: fishType.size,
      color: fishType.color,
      name: fishType.name + ' #' + Math.floor(Math.random() * 1000),
      birthTime: Date.now(),
      pointsEarned: 0
    };

    this.fish.push(fish);
  }

  updateFish(fishList: FishInstance[], particles: Particle[], fishTypes: FishType[], canvasWidth: number, canvasHeight: number, timeSpeed: number = 1, dirtStains: any[] = []): void {
    const now = Date.now();

    fishList.forEach(fish => {
      // store previous position (before movement) to detect segment collision
      const prevX = fish.x;
      const prevY = fish.y;
      // skip movement/behavior updates for dead fish except for death glide animation
      if (fish.isDead) {
        // Check if fish should despawn (10 seconds after death)
        const despawnDelay = 10000; // 10 seconds
        if (fish.deathTime && now - fish.deathTime >= despawnDelay) {
          // Mark for removal (will be filtered out below)
          (fish as any).shouldRemove = true;
          console.log(`🗑️ ${fish.name || fish.type}: Despawnt (10s nach Tod)`);
          return;
        }

        // if dead fish not yet settled, glide it down belly-up towards bottom
        if (!fish.deadSettled) {
          // flip belly-up by rotating direction to pi/2 (upwards) so draw will show belly-up
          fish.direction = Math.PI / 2;
          // slow glide down
          fish.speedY = Math.min(2, (fish.speedY || 0) + 0.5);
          fish.y += fish.speedY;
          const bottom = canvasHeight - fish.size * 0.9;
          if (fish.y >= bottom) {
            fish.y = bottom;
            fish.deadSettled = true;
            fish.speedX = 0;
            fish.speedY = 0;
          }
        }
        return; // skip normal updates
      }

      // Scale movement by timeSpeed
      fish.x += fish.speedX * timeSpeed;
      fish.y += fish.speedY * timeSpeed;

      const margin = fish.size * 1.5;
      const maxX = canvasWidth - margin;
      const maxY = canvasHeight - margin;

      if (fish.x <= margin) {
        fish.x = margin;
        fish.speedX = Math.abs(fish.speedX);
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      } else if (fish.x >= maxX) {
        fish.x = maxX;
        fish.speedX = -Math.abs(fish.speedX);
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      }

      if (fish.y <= margin) {
        fish.y = margin;
        fish.speedY = Math.abs(fish.speedY);
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      } else if (fish.y >= maxY) {
        fish.y = maxY;
        fish.speedY = -Math.abs(fish.speedY);
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      }

      fish.x = Math.max(margin, Math.min(fish.x, maxX));
      fish.y = Math.max(margin, Math.min(fish.y, maxY));

      // Mark cleaner fish but let them swim normally
      const fishType = fishTypes.find(t => t.id === fish.type);
      if (fishType?.isCleaner) {
        // Mark as cleaner fish but do NOT assign targets or chase stains.
        fish.isCleanerFish = true;
        // Ensure any previous cleaning-target state is cleared so fish behave passively.
        fish.isCleaning = false;
        fish.targetDirtStain = undefined;
        fish.targetX = undefined;
        fish.targetY = undefined;
      }

      if (Math.random() < 0.005) {
        const speed = fishType ? fishType.speed : 1;
        fish.speedX += (Math.random() - 0.5) * 0.5;
        fish.speedY += (Math.random() - 0.5) * 0.3;

        const currentSpeed = Math.sqrt(fish.speedX * fish.speedX + fish.speedY * fish.speedY);
        if (currentSpeed > speed * 2) {
          fish.speedX = (fish.speedX / currentSpeed) * speed;
          fish.speedY = (fish.speedY / currentSpeed) * speed;
        }

        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      }

      // increase hunger over time (configurable, scaled by timeSpeed)
      // BUT pause hunger increase if fish ate recently (satiation period in GAME time)
      const oldHunger = fish.hunger;

      // Check if fish is satiated: real time since eating < pause duration / timeSpeed
      // This way changing timeSpeed mid-pause works correctly
      const realTimeSinceAte = fish.lastAteTime ? (now - fish.lastAteTime) : Infinity;
      const realTimePauseNeeded = this.SATIATION_PAUSE_GAME_MS / timeSpeed;
      const isSatiated = realTimeSinceAte < realTimePauseNeeded;

      if (!isSatiated) {
        fish.hunger = Math.min(100, fish.hunger + ((now - fish.lastFeedTime) / this.HUNGER_MS_PER_POINT) * timeSpeed);
        fish.lastFeedTime = now; // Only update when hunger increases
      } else {
        // During satiation, reset lastFeedTime so hunger starts from 0 after pause
        fish.lastFeedTime = now;
      }

      // Debug: Log hunger changes every ~10 points
      if (Math.floor(fish.hunger / 10) !== Math.floor(oldHunger / 10)) {
        console.log(`🐟 ${fish.name || fish.type}: Hunger ${fish.hunger.toFixed(1)}/100 (0=satt, 100=verhungert)`);
      }

      // Debug: Log satiation status when it ends
      const realTimeLeft = realTimePauseNeeded - realTimeSinceAte;
      if (isSatiated && realTimeLeft < 1000 && !fish.satiationLoggedEnd) {
        fish.satiationLoggedEnd = true;
        console.log(`✅ ${fish.name || fish.type}: Sättigungspause vorbei, Hunger steigt wieder`);
      }
      if (!isSatiated) {
        fish.satiationLoggedEnd = false;
      }

      // track when hunger first reached 100 to start starvation timer
      if (fish.hunger >= 100) {
        if (!fish.starvationStart) {
          fish.starvationStart = now;
          console.log(`⚠️ ${fish.name || fish.type}: VERHUNGERT! Timer startet...`);
        }
      } else {
        fish.starvationStart = undefined;
      }

      // if starvation period exceeded, mark fish as dead
      if (fish.starvationStart && (now - fish.starvationStart >= this.STARVATION_DEATH_MS)) {
        fish.isDead = true;
        fish.deathTime = now;
        console.log(`💀 ${fish.name || fish.type}: IST GESTORBEN! Verhungert nach ${Math.round((now - fish.starvationStart) / 1000)}s`);
        // on death, orient belly-up and give small upward rotation, slow speeds
        fish.direction = Math.PI / 3; // point upwards so draw appears belly-up
        fish.speedX = 0.5 * (Math.random() - 0.5);
        fish.speedY = 0.5;
        return;
      }

      // Warning when close to death
      if (fish.starvationStart && !fish.deathWarning) {
        const timeLeft = this.STARVATION_DEATH_MS - (now - fish.starvationStart);
        if (timeLeft < 30000) { // 30 seconds warning
          fish.deathWarning = true;
          console.log(`☠️ ${fish.name || fish.type}: Stirbt bald! Noch ${Math.round(timeLeft / 1000)}s bis zum Tod!`);
        }
      }

      // Cleaner fish just swim normally - cleaning happens passively in component

      // feeding behaviour: prefer settled feed particles (on bottom). If none, allow chasing
      // floating feed only when that feed particle is a few cm under the surface (y <= SURFACE_FEED_MAX_Y).
      // Feeding has priority over cleaning: cleaner fish will abandon cleaning to chase food if hungry.
      if (fish.hunger > this.HUNGER_THRESHOLD && !fish.isFeeding) {
        console.log(`🍽️ ${fish.name || fish.type}: Sucht Futter! Hunger: ${fish.hunger.toFixed(1)}/100 (Threshold: ${this.HUNGER_THRESHOLD})`);
        const settledFood = particles.filter(p => (p as any).isFeed && (p as any).settled);
        let candidateFood: Particle[];
        if (settledFood.length > 0) {
          candidateFood = settledFood;
        } else {
          // floating feed: only consider those that are near the top (few cm under surface)
          candidateFood = particles.filter(p => p.isFeed && !(p as any).settled && p.y <= this.SURFACE_FEED_MAX_Y);
        }

        if (candidateFood.length > 0) {
          const nearestFood = candidateFood.reduce((nearest, p) => {
            const distToP = Math.hypot(p.x - fish.x, p.y - fish.y);
            const distToNearest = nearest ? Math.hypot(nearest.x - fish.x, nearest.y - fish.y) : Infinity;
            return distToP < distToNearest ? p : nearest;
          }, null as any);

          if (nearestFood) {
             // If the fish was cleaning, cancel cleaning so it can prioritize feeding
             if (fish.isCleaning) {
               fish.isCleaning = false;
               fish.targetDirtStain = undefined;
               fish.targetX = undefined;
               fish.targetY = undefined;
             }
             fish.targetParticle = nearestFood;
             fish.targetX = nearestFood.x;
             fish.targetY = nearestFood.y;
             fish.isFeeding = true;
           }
         }
       }

       // If currently chasing a targetParticle, ensure it still exists; otherwise cancel feeding
       if (fish.isFeeding && fish.targetParticle) {
         const exists = particles.indexOf(fish.targetParticle) >= 0;
         if (!exists) {
           fish.isFeeding = false;
           fish.targetParticle = undefined;
           fish.targetX = undefined;
           fish.targetY = undefined;
           fish.speedX = (Math.random() - 0.5);
           fish.speedY = (Math.random() - 0.5) * 0.6;
         } else {
           // keep the target coordinates in sync in case the particle moved slightly
           fish.targetX = fish.targetParticle.x;
           fish.targetY = fish.targetParticle.y;
         }
       }

      if (fish.isFeeding && fish.targetX !== undefined && fish.targetY !== undefined) {
         const dx = fish.targetX - fish.x;
         const dy = fish.targetY - fish.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // widen threshold a bit to avoid overshoot when speed > frame delta
          const eatThreshold = Math.max(fish.size * 1.2, 8);
          // check direct proximity OR if fish movement crossed the particle (avoids overshoot)
          const segmentDist = (fish.targetParticle ? pointSegmentDistance(fish.targetParticle.x, fish.targetParticle.y, prevX, prevY, fish.x, fish.y) : Infinity);
          // extra condition: if the particle is settled on the bottom and fish is roughly above it
          const settledEat = fish.targetParticle && (fish.targetParticle as any).settled && Math.abs(fish.x - (fish.targetParticle.x || 0)) < Math.max(eatThreshold * 1.5, 12) && Math.abs(fish.y - (fish.targetParticle.y || 0)) < Math.max(eatThreshold * 1.5, 12);

          if (distance < eatThreshold || segmentDist <= eatThreshold || settledEat) {
             // remove the exact target particle by reference when possible
             let foodIndex = -1;
             if (fish.targetParticle) {
               foodIndex = particles.indexOf(fish.targetParticle);
             }
             if (foodIndex === -1) {
               foodIndex = particles.findIndex(p => p.isFeed && Math.abs(p.x - fish.targetX!) < 6 && Math.abs(p.y - fish.targetY!) < 6);
             }
             if (foodIndex >= 0) {
               const eaten = particles.splice(foodIndex, 1)[0];
               const oldHungerEat = fish.hunger;
               fish.hunger = Math.max(0, fish.hunger - this.HUNGER_DECREASE_ON_EAT);
               fish.lastAteTime = now; // Track when fish ate for satiation pause
               console.log(`😋 ${fish.name || fish.type}: Hat gefressen! Hunger: ${oldHungerEat.toFixed(1)} → ${fish.hunger.toFixed(1)} (-${this.HUNGER_DECREASE_ON_EAT}) = SATT! [45s Spielzeit Pause]`);
               // also remove any tiny remaining overlapping feed particles within radius
               const ex = eaten.x; const ey = eaten.y;
               for (let i = particles.length - 1; i >= 0; i--) {
                 const p = particles[i];
                 if (p.isFeed && Math.hypot(p.x - ex, p.y - ey) <= 12) {
                   particles.splice(i, 1);
                 }
               }
             }
             // after eating, stop feeding mode and return to roaming
             fish.isFeeding = false;
             fish.targetParticle = undefined;
             fish.targetX = undefined;
             fish.targetY = undefined;
            // give fish a little random swim impulse to resume normal behavior
            fish.speedX = (Math.random() - 0.5) * 1.2;
            fish.speedY = (Math.random() - 0.5) * 0.8;
            fish.direction = Math.atan2(fish.speedY, fish.speedX);
          } else {
            const speed = 2;
            fish.speedX = (dx / distance) * speed;
            fish.speedY = (dy / distance) * speed;
            fish.direction = Math.atan2(fish.speedY, fish.speedX);
          }
        }
      });

    // Remove dead fish marked for despawning
    const beforeCount = fishList.length;
    const updatedList = fishList.filter(f => !(f as any).shouldRemove);
    if (updatedList.length < beforeCount) {
      // Update the fish array in place
      fishList.length = 0;
      fishList.push(...updatedList);
    }
  }
}

// helper: distance from point (px,py) to segment (x1,y1)-(x2,y2)
function pointSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
  const tt = Math.max(0, Math.min(1, t));
  const projx = x1 + tt * dx;
  const projy = y1 + tt * dy;
  return Math.hypot(px - projx, py - projy);
}
