import { Injectable } from '@angular/core';
import { FishInstance, Particle } from '../models/fish.model';
import { DecorationType, PlacedDecoration } from '../models/decoration.model';

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;

  initCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d') || undefined;
  }

  getContext(): CanvasRenderingContext2D | undefined {
    return this.ctx;
  }

  // color utilities
  darkenColor(color: string, factor: number): string {
    if (!color) return color;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      const darkenedR = Math.floor(r * (1 - factor));
      const darkenedG = Math.floor(g * (1 - factor));
      const darkenedB = Math.floor(b * (1 - factor));

      return `rgb(${darkenedR}, ${darkenedG}, ${darkenedB})`;
    }
    return color;
  }

  lightenColor(color: string, factor: number): string {
    if (!color) return color;
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);

      const lightR = Math.min(255, Math.floor(r + (255 - r) * factor));
      const lightG = Math.min(255, Math.floor(g + (255 - g) * factor));
      const lightB = Math.min(255, Math.floor(b + (255 - b) * factor));

      return `rgb(${lightR}, ${lightG}, ${lightB})`;
    }
    return color;
  }

  getRandomWaterColor(): string {
    const colors = [
      'rgba(135, 206, 235, 0.4)',  // Sky blue
      'rgba(173, 216, 230, 0.4)',  // Light blue
      'rgba(176, 224, 230, 0.4)',  // Powder blue
      'rgba(70, 130, 180, 0.4)',   // Steel blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Drawing routines use the internal ctx and canvas; component supplies data arrays
  drawWaterBackground(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const canvas = this.canvas;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(135, 206, 235, 0.2)');
    gradient.addColorStop(0.3, 'rgba(70, 130, 180, 0.4)');
    gradient.addColorStop(0.7, 'rgba(25, 25, 112, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 139, 0.8)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawCausticEffect(waveOffset: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const time = Date.now() * 0.001 + waveOffset * 0.02;

    ctx.globalAlpha = 0.2;

    for (let i = 0; i < 12; i++) {
      const phase = i * 0.5;
      const x = (Math.sin(time * 0.8 + phase) * 0.4 + 0.5) * canvas.width;
      const y = (Math.cos(time * 1.1 + phase) * 0.35 + 0.45) * canvas.height;

      const size = 60 + Math.sin(time * 2 + phase) * 30;

      const causticGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      causticGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      causticGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
      causticGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      causticGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = causticGradient;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  drawSurfaceWaves(waveOffset: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const top = 20;
    const amplitude = 8;
    const wavelength = canvas.width / 6;

    for (let layer = 0; layer < 3; layer++) {
      const layerOffset = waveOffset * (1 + layer * 0.4);
      const alpha = 0.08 - layer * 0.02;
      const yOffset = top + layer * 6;

      ctx.beginPath();
      ctx.moveTo(0, yOffset);
      for (let x = 0; x <= canvas.width; x += 6) {
        const y = yOffset + Math.sin((x / wavelength) * Math.PI * 2 + layerOffset) * (amplitude - layer * 2);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(canvas.width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();

      const g = ctx.createLinearGradient(0, 0, 0, yOffset + amplitude + 10);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = g;
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 4) {
      const y = top + Math.sin((x / (wavelength * 0.9)) * Math.PI * 2 + waveOffset * 1.2) * (amplitude - 1.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  drawWaterParticles(particles: Particle[]): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;

    // simple delta time to age short-lived particles
    const now = Date.now();
    (this as any)._lastParticleTick = (this as any)._lastParticleTick || now;
    const dt = Math.max(16, Math.min(100, now - (this as any)._lastParticleTick));
    (this as any)._lastParticleTick = now;

    // iterate backwards to allow splice while iterating
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i] as any;

      // Age-based removal
      if (typeof particle.life === 'number') {
        particle.life -= dt;
        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
      }

      // Movement update (lighter math for cheap particles)
      if (particle.isFeed) {
        if (!particle.settled) {
          particle.x += particle.speedX + Math.sin(now * 0.001) * 0.2;
          particle.y += particle.speedY + Math.abs(Math.cos(now * 0.0015)) * 0.4;
        } else {
          particle.x += particle.speedX * 0.05;
          particle.y = Math.max(particle.y, canvas.height - 6 - (particle.size || 2));
          particle.speedX *= 0.92;
          particle.speedY = 0;
        }
      } else if (particle.isCleanFeedback) {
        // quick, small movement
        particle.x += particle.speedX;
        particle.y += particle.speedY;
      } else {
        particle.x += particle.speedX + Math.sin(now * 0.001) * 0.2;
        particle.y += particle.speedY + Math.cos(now * 0.0015) * 0.15;
      }

      // bounds
      if (particle.x < 0) { particle.x = 0; particle.speedX = Math.abs(particle.speedX) * 0.3; }
      if (particle.x > canvas.width) { particle.x = canvas.width; particle.speedX = -Math.abs(particle.speedX) * 0.3; }

      // If feed particle hits bottom
      if (particle.isFeed && !particle.settled) {
        const bottomY = canvas.height - 6 - (particle.size || 2);
        if (particle.y >= bottomY) {
          particle.y = bottomY;
          particle.settled = true;
          particle.speedX *= 0.4;
          particle.speedY = 0;
        }
      }

      // Rendering: prefer cheap fill for most particles to reduce gradients
      ctx.globalAlpha = Math.max(0.15, Math.min(1, particle.opacity || 0.6));
      if (particle.isCleanFeedback) {
        ctx.fillStyle = particle.color || 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, Math.max(1, particle.size || 1.2), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }

      if (particle.size > 3 && particle.isFeed) {
        // keep glow for larger feed particles
        const glowGradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.size * 3);
        glowGradient.addColorStop(0, particle.color);
        glowGradient.addColorStop(0.6, particle.color);
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = particle.color;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }

      // cheap bubble / dust render
      ctx.beginPath();
      ctx.fillStyle = particle.color || 'rgba(200,200,200,0.6)';
      ctx.arc(particle.x, particle.y, Math.max(0.8, particle.size || 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // cap particle array size to avoid runaway memory/cpu
    const MAX_PARTICLES = 400;
    if (particles.length > MAX_PARTICLES) {
      // remove oldest non-feed particles first
      let removed = 0;
      for (let i = 0; i < particles.length && removed < (particles.length - MAX_PARTICLES); i++) {
        if (!particles[i].isFeed) { particles.splice(i, 1); i--; removed++; }
      }
      // if still too many, truncate
      if (particles.length > MAX_PARTICLES) particles.length = MAX_PARTICLES;
    }
  }

  drawDecorations(decorations: PlacedDecoration[], decorationTypes: DecorationType[], waveOffset: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const rectWidth = canvas.getBoundingClientRect().width;
    const rectHeight = canvas.getBoundingClientRect().height;

    const seedFrom = (d: any) => {
      const typeHash = d.type.split('').reduce((s: number, c: string) => s + c.charCodeAt(0), 0);
      return Math.floor(((d.nx || 0) * 1000) + ((d.ny || 0) * 10000) + typeHash * 7);
    };
    const rand = (s: number) => {
      const v = Math.sin(s) * 10000;
      return v - Math.floor(v);
    };

    decorations.forEach(d => {
      if ((d as any).x !== undefined && (d as any).y !== undefined && (d.nx === undefined || d.ny === undefined)) {
        d.nx = ((d as any).x) / rectWidth;
        d.ny = ((d as any).y) / rectHeight;
      }
      const px = (d.nx !== undefined) ? d.nx * rectWidth : (d.x ?? 0);
      const py = (d.ny !== undefined) ? d.ny * rectHeight : (d.y ?? 0);
      const type = decorationTypes.find(t => t.id === d.type);
      const color = type ? type.color : '#888';

      const seed = seedFrom(d);

      ctx.save();
      if (d.type.startsWith('stone')) {
        const base = rectWidth * 0.04 * (d.scale || 1);
        const noise = (Math.sin(px * 0.01) + Math.cos(py * 0.01)) * 0.12;
        const size = Math.max(6, base * (0.9 + noise));

        for (let k = 0; k < 3; k++) {
          const offX = (rand(seed + k * 11) - 0.5) * size * 0.36;
          const offY = (rand(seed + k * 23) - 0.5) * size * 0.22;
          const rx = size * (0.95 + k * 0.22);
          const ry = size * (0.62 + k * 0.18);

          const g = ctx.createRadialGradient(px + offX - rx * 0.18, py + offY - ry * 0.18, 0, px + offX, py + offY, Math.max(rx, ry) * 1.5);
          g.addColorStop(0, this.lightenColor(color, 0.06));
          g.addColorStop(1, this.darkenColor(color, 0.22));

          ctx.beginPath();
          ctx.fillStyle = g;
          ctx.ellipse(px + offX, py + offY, rx, ry, (k - 1) * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 0.18;
        ctx.fillStyle = 'rgba(0,0,0,0.36)';
        ctx.beginPath();
        ctx.ellipse(px, py + size * 0.6, size * 1.15, size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

      } else if (d.type.startsWith('coral')) {
        const size = Math.max(12, rectWidth * 0.045 * (d.scale || 1));
        const branches = 3 + Math.floor((d.scale || 1) * 2);
        const strokeColor = this.darkenColor(color, 0.12);

        for (let b = 0; b < branches; b++) {
          const angleBase = (b - (branches - 1) / 2) * 0.45;
          const angleJitter = (rand(seed + b * 13) - 0.5) * 0.12;
          const angle = angleBase + angleJitter + Math.sin(waveOffset * 0.12 + seed * 0.0005) * 0.06;
          const length = size * (1 + rand(seed + b * 17) * 0.35);

          ctx.beginPath();
          ctx.moveTo(px, py);
          let sx = px; let sy = py;
          for (let seg = 0; seg < 4; seg++) {
            const nx = sx + Math.cos(angle + seg * 0.12) * (length * 0.28);
            const ny = sy - Math.abs(Math.sin(angle)) * (length * 0.28) - seg * (length * 0.17);
            const cx = sx + (nx - sx) * 0.5 + (rand(seed + seg * 29 + b * 7) - 0.5) * size * 0.14;
            const cy = sy + (ny - sy) * 0.5 + (rand(seed + seg * 31 + b * 11) - 0.5) * size * 0.08;
            ctx.quadraticCurveTo(cx, cy, nx, ny);
            sx = nx; sy = ny;
          }

          ctx.lineWidth = Math.max(2, size * 0.10);
          ctx.strokeStyle = strokeColor;
          ctx.lineCap = 'round';
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(px, py);
          sx = px; sy = py;
          for (let seg = 0; seg < 4; seg++) {
            const nx = sx + Math.cos(angle + seg * 0.12) * (length * 0.28);
            const ny = sy - Math.abs(Math.sin(angle)) * (length * 0.28) - seg * (length * 0.17);
            const cx = sx + (nx - sx) * 0.5 + (rand(seed + seg * 37 + b * 5) - 0.5) * size * 0.14;
            const cy = sy + (ny - sy) * 0.5 + (rand(seed + seg * 41 + b * 13) - 0.5) * size * 0.08;
            ctx.quadraticCurveTo(cx, cy, nx, ny);
            sx = nx; sy = ny;
          }
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.96;
          ctx.fill();
          ctx.globalAlpha = 1;

          for (let pidx = 0; pidx < 4; pidx++) {
            const t = 0.6 + pidx * 0.1;
            const tipX = px + Math.cos(angle) * length * t + (rand(seed + pidx * 19) - 0.5) * size * 0.06;
            const tipY = py - Math.abs(Math.sin(angle)) * length * t - (rand(seed + pidx * 23) * size * 0.06);
            ctx.beginPath();
            ctx.fillStyle = this.lightenColor(color, 0.04 + rand(seed + pidx * 29) * 0.06);
            ctx.arc(tipX, tipY, Math.max(1.5, size * 0.05 + rand(seed + pidx * 31) * size * 0.03), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  drawPlants(plants: PlacedDecoration[], plantTypes: any[], waveOffset: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const rectWidth = canvas.getBoundingClientRect().width;
    const rectHeight = canvas.getBoundingClientRect().height;

    plants.forEach(p => {
      if ((p as any).x !== undefined && (p as any).y !== undefined && (p.nx === undefined || p.ny === undefined)) {
        p.nx = ((p as any).x) / rectWidth;
        p.ny = ((p as any).y) / rectHeight;
      }
      const px = (p.nx !== undefined) ? p.nx * rectWidth : (p.x ?? 0);
      const py = (p.ny !== undefined) ? p.ny * rectHeight : (p.y ?? 0);
      const type = plantTypes.find((t: any) => t.id === p.type);
      const color = type ? (type as any).color : '#2fa84f';
      const baseSize = Math.max(12, Math.min(64, rectWidth * 0.04));
      const size = (p.scale || 1) * baseSize * (type && (type as any).defaultScale ? (type as any).defaultScale : 1);

      ctx.save();
      ctx.translate(px, py);
      if (p.type === 'fern') {
        ctx.beginPath();
        ctx.strokeStyle = this.darkenColor(color, 0.18);
        ctx.lineWidth = Math.max(2, size * 0.06);
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -size * 0.9);
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const length = size * (0.7 + i * 0.18);
          const sway = Math.sin(waveOffset * 1.2 + i) * (3 + i * 1.6);
          for (let j = 0; j < 8; j++) {
            const y = - (j / 8) * length;
            const x = sway + Math.sin(j * 0.6 + waveOffset) * (5 + i);
            const leafW = size * (0.14 + i * 0.02);
            const leafH = length * 0.08;
            const g = ctx.createLinearGradient(x - leafW, y - leafH, x + leafW, y + leafH);
            g.addColorStop(0, this.darkenColor(color, 0.05));
            g.addColorStop(1, color);
            ctx.beginPath();
            ctx.fillStyle = g;
            ctx.globalAlpha = 0.95 - j * 0.08;
            ctx.ellipse(x, y, leafW, leafH, (j - 3) * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (p.type === 'anubias') {
        const leaves = 4;
        ctx.beginPath();
        ctx.strokeStyle = this.darkenColor(color, 0.16);
        ctx.lineWidth = Math.max(1.5, size * 0.04);
        ctx.moveTo(0, 6);
        ctx.lineTo(0, -size * 0.5);
        ctx.stroke();

        for (let i = 0; i < leaves; i++) {
          const angle = (i - (leaves / 2)) * 0.25;
          const lx = Math.cos(angle) * size * 0.08;
          const ly = -i * (size * 0.12);
          const leafW = size * 0.36;
          const leafH = size * 0.18;
          const g = ctx.createLinearGradient(lx - leafW, ly - leafH, lx + leafW, ly + leafH);
          g.addColorStop(0, this.darkenColor(color, 0.06));
          g.addColorStop(1, color);
          ctx.beginPath();
          ctx.fillStyle = g;
          ctx.globalAlpha = 0.95 - i * 0.12;
          ctx.ellipse(lx, ly, leafW, leafH, angle, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.strokeStyle = this.darkenColor(color, 0.28);
          ctx.lineWidth = Math.max(0.8, size * 0.02);
          ctx.moveTo(lx - leafW * 0.2, ly + leafH * 0.1);
          ctx.lineTo(lx + leafW * 0.2, ly - leafH * 0.4);
          ctx.stroke();
        }
      } else if (p.type === 'moss') {
        const seedBase = ((p.nx || 0) * 1000) + ((p.ny || 0) * 10000);
        const rand = (s: number) => {
          const v = Math.sin(s) * 10000;
          return v - Math.floor(v);
        };
        for (let layer = 0; layer < 3; layer++) {
          for (let i = 0; i < 10; i++) {
            const rx = (rand(seedBase + layer * 7 + i * 13) - 0.5) * size * 0.6;
            const ry = -rand(seedBase + layer * 11 + i * 17) * size * 0.25 - layer * (size * 0.06);
            const r = Math.max(1.6, size * 0.03 + rand(seedBase + layer * 19 + i * 19) * size * 0.05);
            ctx.beginPath();
            ctx.fillStyle = this.darkenColor(color, 0.02 + layer * 0.03);
            ctx.globalAlpha = 0.85 - (layer * 0.08);
            ctx.arc(rx, ry, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else {
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9 - i * 0.12;
          const sway = Math.sin((waveOffset + i) * 1.2) * (4 + i);
          ctx.ellipse(sway, -i * (size * 0.25), size * 0.18, size * 0.5, (i - 2) * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    });
  }

  // --- Dirt rendering helpers ---
  drawDirtOverlay(dirtLevel: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const alpha = Math.min(0.8, dirtLevel / 150);
    ctx.save();
    // subtle color shift to slightly green/brown
    ctx.fillStyle = `rgba(30, 40, 20, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // optional light vignette depending on dirt
    if (dirtLevel > 30) {
      const g = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 1.1);
      g.addColorStop(0, `rgba(0,0,0,0)`);
      g.addColorStop(1, `rgba(0,0,0,${Math.min(0.35, (dirtLevel - 30) / 200)})`);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g as any;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  drawStains(stains: Array<{id:string,x:number,y:number,radius:number,amount:number}>) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    stains.forEach(s => {
      const px = s.x * canvas.getBoundingClientRect().width;
      const py = s.y * canvas.getBoundingClientRect().height;
      const r = Math.max(4, s.radius);
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 1.6);
      const innerAlpha = Math.max(0.08, Math.min(0.9, s.amount));
      g.addColorStop(0, `rgba(80,60,40,${innerAlpha})`);
      g.addColorStop(0.4, `rgba(80,60,40,${Math.max(0, innerAlpha - 0.15)})`);
      g.addColorStop(1, 'rgba(80,60,40,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = g as any;
      ctx.beginPath();
      ctx.arc(px, py, r * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawFish(fish: FishInstance[]): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    fish.forEach(f => {
      ctx.save();
      ctx.translate(f.x, f.y);
      // If fish is dead, fix rotation so the belly faces up (rotate 90° to the right)
      if (f.isDead) {
        // rotate 180° so the belly (previously down) points up
        ctx.rotate(Math.PI);
        // disable swim pulse animation for dead fish
      } else {
        ctx.rotate(f.direction);

        const swimPulse = Math.sin(Date.now() * 0.01 + f.x * 0.01) * 0.1 + 1;
        const scaleX = swimPulse;
        const scaleY = 1 / swimPulse;
        ctx.scale(scaleX, scaleY);
      }

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size);
      gradient.addColorStop(0, f.color);
      gradient.addColorStop(0.7, f.color);
      gradient.addColorStop(1, this.darkenColor(f.color, 0.3));

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.9;
      ctx.ellipse(0, 0, f.size * 0.8, f.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.7;
      ctx.moveTo(-f.size * 0.8, 0);
      ctx.lineTo(-f.size * 1.3, -f.size * 0.3);
      ctx.lineTo(-f.size * 1.3, f.size * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 1;
      ctx.arc(f.size * 0.3, -f.size * 0.15, f.size * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'black';
      ctx.arc(f.size * 0.35, -f.size * 0.15, f.size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6;
      ctx.fillStyle = f.color;

      if (f.type === 'angelfish') {
        ctx.beginPath();
        ctx.moveTo(0, -f.size * 0.5);
        ctx.lineTo(f.size * 0.2, -f.size * 1.2);
        ctx.lineTo(f.size * 0.4, -f.size * 0.8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, f.size * 0.5);
        ctx.lineTo(f.size * 0.2, f.size * 1.2);
        ctx.lineTo(f.size * 0.4, f.size * 0.8);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -f.size * 0.5);
        ctx.lineTo(f.size * 0.3, -f.size * 0.8);
        ctx.lineTo(f.size * 0.5, -f.size * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, f.size * 0.5);
        ctx.lineTo(f.size * 0.3, f.size * 0.8);
        ctx.lineTo(f.size * 0.5, f.size * 0.4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
      ctx.globalAlpha = 1;

      // draw hunger bar above fish if they're hungry
      try {
        if (!f.isDead && typeof f.hunger === 'number' && f.hunger > 60) {
          const barWidth = Math.max(28, f.size * 1.6);
          const barHeight = 6;
          const bx = f.x - barWidth / 2;
          const by = f.y - f.size - 10; // slightly above fish

          // background shadow
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);

          // empty bar background
          ctx.fillStyle = 'rgba(200,200,200,0.25)';
          ctx.fillRect(bx, by, barWidth, barHeight);

          // filled red portion proportional to hunger
          const fillW = Math.max(0, Math.min(barWidth, (f.hunger / 100) * barWidth));
          ctx.fillStyle = 'rgba(220,40,40,0.98)';
          ctx.fillRect(bx, by, fillW, barHeight);

          // border
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 1;
          ctx.strokeRect(bx, by, barWidth, barHeight);
        }
      } catch (e) {
        // ignore drawing errors in exotic environments
      }
    });
  }

  drawLightEffect(lightIntensity: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const lightGradient = ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    lightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 * lightIntensity})`);
    lightGradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.08 * lightIntensity})`);
    lightGradient.addColorStop(1, 'transparent');

    ctx.fillStyle = lightGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
  }
}
