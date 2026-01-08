import { Injectable } from '@angular/core';
import { FishInstance, Particle } from '../models/fish.model';
import { DecorationType, PlacedDecoration } from '../models/decoration.model';

@Injectable({ providedIn: 'root' })
export class CanvasService {
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private hungerBarDebugLogged = false;

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
  // Draws the water background. If dirtRatio is provided (0..1) the water color is
  // subtly shifted towards a greenish tint to simulate turbidity/tinting.
  private lastBackgroundDirt = -1;
  private backgroundCache: ImageData | null = null;

  drawWaterBackground(dirtRatio: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;

    // Performance: Cache background if dirt hasn't changed much
    const dirtChanged = Math.abs(dirtRatio - this.lastBackgroundDirt) > 0.01; // 1% Änderung
    if (!dirtChanged && this.backgroundCache) {
      ctx.putImageData(this.backgroundCache, 0, 0);
      return;
    }

    // clamp
    const v = Math.max(0, Math.min(1, dirtRatio));

    // S-curve easing so low dirt shows little change and higher dirt ramps more smoothly
    const ease = (x: number) => (1 / (1 + Math.exp(-12 * (x - 0.5))));
    const t = ease(v);

    // helper to linearly interpolate between two rgba arrays
    const lerpRGBA = (a: number[], b: number[], f: number) => a.map((av, i) => {
      const bv = b[i] ?? 0; const out = av * (1 - f) + bv * f; return i < 3 ? Math.round(out) : +(out.toFixed(2));
    });

    // Base gradient stops (clean water)
    const baseStops: number[][] = [
      [135,206,235,0.2], [100,170,210,0.33], [70,130,180,0.42], [40,90,150,0.55], [18,40,110,0.7], [6,20,60,0.82], [0,6,30,0.9]
    ];

    // Dirty variants (greener/darker)
    const dirtyStops: number[][] = [
      [140,210,150,0.22], [110,185,150,0.34], [80,150,130,0.45], [50,110,95,0.58], [30,70,60,0.72], [20,45,38,0.85], [12,28,18,0.95]
    ];

    const mixedStops = baseStops.map((bs, i) => lerpRGBA(bs, dirtyStops[i], t));

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    const stopsCount = mixedStops.length;
    mixedStops.forEach((s, idx) => {
      const pos = idx / (stopsCount - 1);
      gradient.addColorStop(pos, `rgba(${s[0]}, ${s[1]}, ${s[2]}, ${s[3]})`);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Cache the background
    this.lastBackgroundDirt = dirtRatio;
    this.backgroundCache = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  drawCausticEffect(waveOffset: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const time = Date.now() * 0.001 + waveOffset * 0.02;

    ctx.globalAlpha = 0.15; // Reduziert von 0.2

    // Performance: Nur 6 statt 12 Caustics
    for (let i = 0; i < 6; i++) {
      const phase = i * 0.5;
      const x = (Math.sin(time * 0.8 + phase) * 0.4 + 0.5) * canvas.width;
      const y = (Math.cos(time * 1.1 + phase) * 0.35 + 0.45) * canvas.height;

      const size = 60 + Math.sin(time * 2 + phase) * 30;

      const causticGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      causticGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)'); // Reduziert
      causticGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)'); // Reduziert
      causticGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)'); // Reduziert
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
        const size = Math.max(6, base);

        // Performance: Einfache Ellipsen statt Gradienten
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(px, py, size, size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Schatten
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = 'rgba(0,0,0,0.36)';
        ctx.beginPath();
        ctx.ellipse(px, py + size * 0.6, size * 1.15, size * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

      } else if (d.type.startsWith('coral')) {
        const size = Math.max(12, rectWidth * 0.045 * (d.scale || 1));
        const branches = Math.min(3, 2 + Math.floor((d.scale || 1))); // Max 3 branches
        const strokeColor = this.darkenColor(color, 0.12);

        for (let b = 0; b < branches; b++) {
          const angleBase = (b - (branches - 1) / 2) * 0.45;
          const angle = angleBase;
          const length = size;

          ctx.beginPath();
          ctx.moveTo(px, py);
          let sx = px; let sy = py;
          // Reduziert von 4 auf 2 Segmente
          for (let seg = 0; seg < 2; seg++) {
            const nx = sx + Math.cos(angle) * (length * 0.35);
            const ny = sy - Math.abs(Math.sin(angle)) * (length * 0.35) - seg * (length * 0.25);
            const cx = sx + (nx - sx) * 0.5;
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

        // Performance: Reduziert von 6*8=48 Gradienten auf 4*5=20
        for (let i = 0; i < 4; i++) {
          const length = size * (0.7 + i * 0.18);
          const sway = Math.sin(waveOffset * 1.2 + i) * (3 + i * 1.6);
          // Reduziert von 8 auf 5 leaves per strand
          for (let j = 0; j < 5; j++) {
            const y = - (j / 5) * length;
            const x = sway + Math.sin(j * 0.6 + waveOffset) * (5 + i);
            const leafW = size * (0.14 + i * 0.02);
            const leafH = length * 0.08;
            // Performance: Verwende einfache Farbe statt Gradient
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.95 - j * 0.12;
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
          // Performance: Einfache Farbe statt Gradient
          ctx.beginPath();
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.95 - i * 0.12;
          ctx.ellipse(lx, ly, leafW, leafH, angle, 0, Math.PI * 2);
          ctx.fill();

          // Vein - einfacher
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
    // Skip if dirt is negligible
    if (dirtLevel < 5) return;
    const ctx = this.ctx; const canvas = this.canvas;

    // Performance: Einfacher Overlay statt 3 teure Composite-Operationen
    const dr = Math.max(0, Math.min(1, dirtLevel / 100));
    const alpha = Math.min(0.3, dr * 0.35);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(30, 90, 70, 1)'; // Grünlicher Schmutz
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawStains(stains: Array<{id:string,x:number,y:number,radius:number,amount:number}>) {
    if (!this.ctx || !this.canvas) return;
    // Skip if no stains
    if (!stains || stains.length === 0) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const rect = canvas.getBoundingClientRect();
    
    // Performance: Limit stains drawn per frame
    const maxStains = Math.min(stains.length, 15);
    
    ctx.save();
    for (let i = 0; i < maxStains; i++) {
      const s = stains[i];
      const px = s.x * rect.width;
      const py = s.y * rect.height;
      const r = Math.max(4, s.radius);
      
      // Performance: Einfacher Kreis statt Radial-Gradient
      ctx.fillStyle = `rgba(80,60,40,${Math.min(0.3, s.amount * 0.5)})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFish(fish: FishInstance[], dirtRatio = 0): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // CRITICAL: Ensure clean state before drawing fish
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;

    fish.forEach(f => {
      const dr = Math.max(0, Math.min(1, dirtRatio));
      const visibility = Math.max(0.3, 1 - dr * 0.7);

      ctx.save();
      ctx.translate(f.x, f.y);

      // If fish is dead, rotate 180° so belly faces up
      if (f.isDead) {
        ctx.rotate(Math.PI);
      } else {
        ctx.rotate(f.direction);
        const swimPulse = Math.sin(Date.now() * 0.01 + f.x * 0.01) * 0.1 + 1;
        const scaleX = swimPulse;
        const scaleY = 1 / swimPulse;
        ctx.scale(scaleX, scaleY);
      }

      // Draw main body
      ctx.beginPath();
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.8 * visibility;
      ctx.ellipse(0, 0, f.size * 0.8, f.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw tail
      ctx.beginPath();
      ctx.fillStyle = f.color;
      ctx.globalAlpha = 0.6 * visibility;
      ctx.moveTo(-f.size * 0.8, 0);
      ctx.lineTo(-f.size * 1.3, -f.size * 0.3);
      ctx.lineTo(-f.size * 1.3, f.size * 0.3);
      ctx.closePath();
      ctx.fill();

      // Eyes
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 0.8 * visibility;
      ctx.arc(f.size * 0.3, -f.size * 0.15, f.size * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'black';
      ctx.globalAlpha = 0.9 * visibility;
      ctx.arc(f.size * 0.35, -f.size * 0.15, f.size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Fins
      ctx.globalAlpha = 0.6 * visibility;
      ctx.fillStyle = f.color;

      if (f.type === 'catfish') {
        // Barbels (whiskers)
        ctx.strokeStyle = this.darkenColor(f.color, 0.4);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8 * visibility;
        ctx.beginPath();
        ctx.moveTo(f.size * 0.6, -f.size * 0.3);
        ctx.lineTo(f.size * 1.1, -f.size * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(f.size * 0.6, f.size * 0.1);
        ctx.lineTo(f.size * 1.1, f.size * 0.3);
        ctx.stroke();
        // Spots
        ctx.globalAlpha = 0.3 * visibility;
        ctx.fillStyle = this.darkenColor(f.color, 0.4);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(-f.size * 0.3 + i * f.size * 0.3, (i % 2 ? -0.2 : 0.2) * f.size, f.size * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (f.type === 'angelfish') {
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

      // Hunger bar (drawn in screen space)
      if (!f.isDead && typeof f.hunger === 'number' && f.hunger > 20) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1.0;
        
        const barWidth = Math.max(28, f.size * 1.6);
        const barHeight = 6;
        const bx = f.x - barWidth / 2;
        const by = f.y - f.size - 10;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);

        // Red background (hungry)
        ctx.fillStyle = 'rgba(220,40,40,0.98)';
        ctx.fillRect(bx, by, barWidth, barHeight);

        // Green fill (satiety)
        const satiety = 100 - f.hunger;
        const fillW = Math.max(0, Math.min(barWidth, (satiety / 100) * barWidth));
        ctx.fillStyle = 'rgba(40,220,40,0.98)';
        ctx.fillRect(bx, by, fillW, barHeight);

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.7)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barWidth, barHeight);
        
        ctx.restore();
      }
    });

    ctx.restore();
  }

  // drawLightEffect: draws top-down light overlay. Supports optional colorTemp (Kelvin), sunAngle (radians), and dirtLevel (0..100)
  drawLightEffect(lightIntensity: number, colorTemp?: number, sunAngle?: number, dirtLevel?: number): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const canvas = this.canvas;

    // map colorTemp (Kelvin) to RGB tint (approximate)
    const kelvinToRgb = (kelvin = 6500) => {
      const temp = kelvin / 100;
      let r = 0, g = 0, b = 0;
      if (temp <= 66) {
        r = 255;
        g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
        b = temp <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
      } else {
        r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
        g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
        b = 255;
      }
      return [Math.round(r), Math.round(g), Math.round(b)];
    };

    const dirtFactor = Math.max(0, Math.min(1, (dirtLevel ?? 0) / 100));
    // reduce intensity further by dirt - clamp
    const finalIntensity = Math.max(0, Math.min(3, lightIntensity * (1 - dirtFactor * 0.7)));

    // compute tint color
    const tintRgb = kelvinToRgb(colorTemp ?? 6500);
    const tint = `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.08 * finalIntensity})`;

    // main light gradient (soft top-down)
    const lg = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    lg.addColorStop(0, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.18 * finalIntensity})`);
    lg.addColorStop(0.35, `rgba(${Math.round(tintRgb[0]*0.9)}, ${Math.round(tintRgb[1]*0.9)}, ${Math.round(tintRgb[2]*0.9)}, ${0.08 * finalIntensity})`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

    // subtle god-rays: draw 3 soft radial cones biased by sunAngle
    if (typeof sunAngle === 'number') {
      const cx = canvas.width / 2 + Math.cos(sunAngle) * canvas.width * 0.15;
      const cy = Math.max(20, Math.sin(sunAngle) * canvas.height * -0.05 + 20);
      for (let i = 0; i < 3; i++) {
        const spread = 0.16 + i * 0.06;
        const alpha = 0.06 * finalIntensity * (1 - dirtFactor * 0.6) * (1 - i * 0.25);
        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.height * (0.6 + i * 0.2));
        rg.addColorStop(0, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${alpha})`);
        rg.addColorStop(spread, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${alpha * 0.55})`);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);
      }
    }

    // slight top rim highlight using tint for stronger day feeling
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, canvas.width, Math.max(4, canvas.height * 0.06));
    ctx.restore();
  }
}
