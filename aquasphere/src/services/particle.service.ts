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

  addFeedBurst(count = 10, minX = 50, maxX = 750): void {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const x = Math.random() * (maxX - minX) + minX;
        const p: Particle = {
          x,
          y: -20,
          size: Math.random() * 4 + 2,
          speedX: (Math.random() - 0.5) * 2,
          speedY: Math.random() * 3 + 2,
          opacity: 0.9,
          color: 'rgba(255,165,0,0.8)',
          isFeed: true,
          life: 200
        };
        this.particles.push(p);
        // set optional flag after creation to avoid TS excess property checks
        (p as any).settled = false;
      }, i * 150);
    }
  }

  cleanAndPopulate(count = 8, width = 800, height = 600): void {
    // remove feed particles
    this.particles = this.particles.filter(p => !p.isFeed);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.2,
        color: this.canvasService.getRandomWaterColor()
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
