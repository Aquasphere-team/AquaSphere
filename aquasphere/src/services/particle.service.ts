import { Injectable } from '@angular/core';
import { Particle } from '../models/fish.model';
import { CanvasService } from './canvas.service';

@Injectable({ providedIn: 'root' })
export class ParticleService {
  public particles: Particle[] = [];

  constructor(private canvasService: CanvasService) {}

  initParticles(count = 20, width = 800, height = 600): void {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color: this.canvasService.getRandomWaterColor()
      });
    }
  }

  addFeedBurst(count = 10, minX = 50, maxX = 750, startY?: number): void {
    // startY: optional pixel coordinate where feed spawns; default just under the top so fish can reach it
    const spawnY = (typeof startY === 'number') ? startY : 4;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const x = Math.random() * (maxX - minX) + minX;
        const p: Particle = {
          x,
          y: spawnY,
          size: Math.random() * 4 + 2,
          speedX: (Math.random() - 0.5) * 2,
          // stronger downward speed so feed moves away from the absolute surface and is reachable
          speedY: Math.random() * 2.0 + 1.5, // ~1.5..3.5 px/frame
          opacity: 0.9,
          color: 'rgba(255,165,0,0.95)',
          isFeed: true
        };
        // Debug log spawn coords when running in development (console only)
        try { if ((window as any).DEBUG_FEED_SPAWN) console.log('Feed spawn', { x: Math.round(x), y: Math.round(spawnY), size: Math.round(p.size), speedY: +(p.speedY.toFixed(2)) }); } catch (e) {}
        this.particles.push(p);
        // set optional flag after creation to avoid TS excess property checks
        (p as any).settled = false;
      }, i * 120);
    }
  }

  // Spawn small short-lived cleaning feedback particles at pixel coords
  spawnCleaningParticles(px: number, py: number, count = 2) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.6 + 0.2;
      // use a temporary any object to avoid strict object-literal checks
      const p: any = {
        x: px + Math.cos(angle) * (Math.random() * 6),
        y: py + Math.sin(angle) * (Math.random() * 6),
        size: Math.random() * 2 + 0.6,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed * 0.6,
        opacity: 0.9,
        color: 'rgba(255,255,255,0.9)',
        // short-lived cleaning feedback: use `life` to mark as feedback
        life: 300 // ms
      };
      this.particles.push(p as Particle);
    }
  }

  cleanAndPopulate(count = 8, width = 800, height = 600): void {
    // remove feed particles
    this.particles = this.particles.filter(p => !p.isFeed);

    // spawn some gentle background particles (reduced count for performance)
    const spawn = Math.max(2, Math.min(count, 6));
    for (let i = 0; i < spawn; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.2,
        opacity: Math.random() * 0.3 + 0.1,
        color: this.canvasService.getRandomWaterColor(),
        life: 6000
      });
    }
  }

  setParticles(p: Particle[]): void {
    this.particles = p || [];
  }

  getParticles(): Particle[] {
    return this.particles;
  }
}
