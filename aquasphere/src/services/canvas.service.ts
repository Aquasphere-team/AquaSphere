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
  drawWaterBackground(dirtRatio = 0): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;

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
  }

  drawCausticEffect(waveOffset: number, causticStrength: number = 1, sunAngle?: number, isNight?: boolean): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const time = Date.now() * 0.001 + waveOffset * 0.02;

    // At night, use softer blue-tinted caustics
    const nightMode = isNight === true;
    const baseAlpha = nightMode
      ? 0.08 * Math.max(0, Math.min(1, causticStrength))
      : 0.18 * Math.max(0, Math.min(1, causticStrength));

    // Sun influence on caustic positioning (caustics shift toward sun side)
    const sunInfluence = typeof sunAngle === 'number' ? Math.cos(sunAngle) : 0;
    const sunVerticalInfluence = typeof sunAngle === 'number' ? Math.sin(sunAngle) : 0;

    ctx.globalAlpha = baseAlpha;

    for (let i = 0; i < 12; i++) {
      const phase = i * 0.5;

      // Base position with sun influence - caustics drift toward light source
      const baseX = Math.sin(time * 0.8 + phase) * 0.4 + 0.5;
      const baseY = Math.cos(time * 1.1 + phase) * 0.35 + 0.45;

      // Apply sun influence to shift caustics toward sun side
      const x = (baseX + sunInfluence * 0.12) * canvas.width;
      const y = (baseY + sunVerticalInfluence * 0.05) * canvas.height;

      // Depth-based size: larger caustics at bottom (deeper water disperses light more)
      const depthFactor = 0.7 + (y / canvas.height) * 0.6; // 0.7 at top, 1.3 at bottom
      const baseSize = (60 + Math.sin(time * 2 + phase) * 30) * (0.6 + 0.8 * Math.max(0, causticStrength));
      const size = baseSize * depthFactor;

      // Intensity based on proximity to sun side (brighter on sun-facing side)
      const horizontalPos = x / canvas.width;
      const sunSideBrightness = typeof sunAngle === 'number'
        ? 0.7 + 0.3 * (sunInfluence > 0 ? horizontalPos : (1 - horizontalPos))
        : 1;

      // Color: slight cyan tint near surface, warmer at bottom; blue tint at night
      const surfaceProximity = 1 - (y / canvas.height);
      let r: number, g: number, b: number;
      if (nightMode) {
        // Moonlight caustics: blue-silver tint
        r = 180 + Math.floor(surfaceProximity * 40);
        g = 200 + Math.floor(surfaceProximity * 30);
        b = 255;
      } else {
        // Daylight caustics: slight cyan near surface, warmer below
        r = 255 - Math.floor(surfaceProximity * 25);
        g = 255 - Math.floor(surfaceProximity * 8);
        b = 255;
      }

      const effectiveStrength = causticStrength * sunSideBrightness;

      const causticGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      causticGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.9 * effectiveStrength})`);
      causticGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.45 * effectiveStrength})`);
      causticGradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${0.12 * effectiveStrength})`);
      causticGradient.addColorStop(1, 'transparent');

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = causticGradient;
      ctx.fill();
    }

    // Add shimmer effect at water surface (wave-synchronized)
    if (!nightMode && causticStrength > 0.3) {
      const shimmerCount = 8;
      for (let i = 0; i < shimmerCount; i++) {
        const shimmerX = (i / shimmerCount + Math.sin(time * 1.5 + i) * 0.05) * canvas.width;
        const shimmerY = 30 + Math.sin(time * 2 + i * 0.8) * 15;
        const shimmerSize = 20 + Math.sin(time * 3 + i) * 10;

        ctx.globalAlpha = 0.15 * causticStrength;
        const shimmerGrad = ctx.createRadialGradient(shimmerX, shimmerY, 0, shimmerX, shimmerY, shimmerSize);
        shimmerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.8 * causticStrength})`);
        shimmerGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.3 * causticStrength})`);
        shimmerGrad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(shimmerX, shimmerY, shimmerSize, 0, Math.PI * 2);
        ctx.fillStyle = shimmerGrad;
        ctx.fill();
      }
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

    // normalized dirt ratio 0..1
    const dr = Math.max(0, Math.min(1, dirtLevel / 100));

    // overall overlay alpha — allows stronger effect for higher dirt
    const baseAlpha = Math.min(0.85, dr * 0.9);

    ctx.save();

    // create a subtle multi-stop green overlay (top slightly lighter, bottom darker/green-brown)
    const lg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    lg.addColorStop(0, `rgba(120, 200, 150, ${0.06 * baseAlpha})`); // light green tint near surface
    lg.addColorStop(0.35, `rgba(90, 170, 120, ${0.12 * baseAlpha})`);
    lg.addColorStop(0.6, `rgba(60, 140, 100, ${0.18 * baseAlpha})`);
    lg.addColorStop(1, `rgba(30, 90, 70, ${0.26 * baseAlpha})`); // deeper, stronger tint

    // use multiply to tint underlying water colors smoothly
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = lg as any;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // subtle soft vignette to simulate turbidity concentration toward edges if dirt is high
    if (dirtLevel > 25) {
      const vignetteAlpha = Math.min(0.45, (dirtLevel - 25) / 100);
      const rg = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.2, canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.9);
      rg.addColorStop(0, `rgba(0,0,0,0)`);
      // slightly greenish-dark rim to keep chromatic consistency
      rg.addColorStop(0.7, `rgba(12,20,10,${vignetteAlpha * 0.6})`);
      rg.addColorStop(1, `rgba(6,10,6,${vignetteAlpha})`);

      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = rg as any;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
    } else {
      // reset composite if vignette not applied
      ctx.globalCompositeOperation = 'source-over';
    }

    // For very strong dirt, add a faint warm/brown overlay in low alpha to hint at murk and sediments
    if (dirtLevel > 60) {
      const warmAlpha = Math.min(0.28, (dirtLevel - 60) / 160);
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = `rgba(60,40,20,${warmAlpha})`;
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
      // make stains more subtle so they don't fully cover the water tint
      const innerAlpha = Math.max(0.04, Math.min(0.6, s.amount * 0.9));
      g.addColorStop(0, `rgba(80,60,40,${innerAlpha})`);
      g.addColorStop(0.35, `rgba(80,60,40,${Math.max(0, innerAlpha - 0.12)})`);
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

  drawFish(fish: FishInstance[], dirtRatio = 0, lightState?: { intensity: number; colorTemp: number; sunAngle: number; isNight: boolean }): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const canvas = this.canvas;

    // clamp dirtRatio to 0..1
    const dr = Math.max(0, Math.min(1, dirtRatio));

    // Light state defaults
    const intensity = lightState?.intensity ?? 1;
    const colorTemp = lightState?.colorTemp ?? 6500;
    const sunAngle = lightState?.sunAngle ?? 0;
    const isNight = lightState?.isNight ?? false;

    // Calculate sun position for lighting effects
    const sunProgress = (sunAngle + Math.PI / 2) / (Math.PI * 2);
    const normalizedProgress = Math.min(1, Math.max(0, sunProgress * 2));
    const sunX = canvas.width * (0.1 + normalizedProgress * 0.8);
    const sunY = -canvas.height * 0.1;

    // Kelvin to RGB for tinting fish
    const kelvinToTint = (kelvin: number) => {
      const temp = kelvin / 100;
      let r = 255, g = 255, b = 255;
      if (temp <= 66) {
        g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
        b = temp <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
      } else {
        r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
        g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
      }
      return { r: r / 255, g: g / 255, b: b / 255 };
    };
    const lightTint = kelvinToTint(colorTemp);

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

      // visibility factor derived from dirt: at dr=0 -> 1, at dr=1 -> limited visibility (min ~0.12)
      const visibility = Math.max(0.12, 1 - dr * 0.85);

      // Depth-based brightness: fish are darker at the bottom of the tank
      const depthFactor = 1 - (f.y / canvas.height) * 0.25 * (1 - intensity * 0.3);

      // Light direction influence: fish facing the sun are brighter
      const angleToSun = Math.atan2(sunY - f.y, sunX - f.x);
      const facingLight = Math.cos(angleToSun - f.direction);
      const lightFacing = isNight ? 0.9 : (0.85 + facingLight * 0.15);

      // Combined brightness factor
      const brightnessFactor = depthFactor * lightFacing * intensity;

      // Darken fish color a bit more with dirt
      const darkenFactor = 0.3 + dr * 0.35;

      // Apply color temperature tint to fish color
      const applyLightTint = (color: string, tintStrength: number = 0.15) => {
        if (!color.startsWith('#')) return color;
        const hex = color.slice(1);
        let r = parseInt(hex.slice(0, 2), 16);
        let g = parseInt(hex.slice(2, 4), 16);
        let b = parseInt(hex.slice(4, 6), 16);

        // Apply light temperature tint
        r = Math.round(r * (1 - tintStrength) + r * lightTint.r * tintStrength);
        g = Math.round(g * (1 - tintStrength) + g * lightTint.g * tintStrength);
        b = Math.round(b * (1 - tintStrength) + b * lightTint.b * tintStrength);

        // Apply brightness
        r = Math.min(255, Math.round(r * brightnessFactor));
        g = Math.min(255, Math.round(g * brightnessFactor));
        b = Math.min(255, Math.round(b * brightnessFactor));

        return `rgb(${r}, ${g}, ${b})`;
      };

      const tintedColor = applyLightTint(f.color);

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size);
      gradient.addColorStop(0, tintedColor);
      gradient.addColorStop(0.7, tintedColor);
      gradient.addColorStop(1, this.darkenColor(tintedColor, darkenFactor));

      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.9 * visibility;
      ctx.ellipse(0, 0, f.size * 0.8, f.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Specular highlight on fish body (light reflection)
      if (!f.isDead && !isNight && intensity > 0.3) {
        const highlightX = f.size * 0.15;
        const highlightY = -f.size * 0.2;
        const highlightSize = f.size * 0.25;
        const highlightAlpha = 0.25 * intensity * visibility * (0.5 + facingLight * 0.5);

        const highlightGrad = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, highlightSize);
        highlightGrad.addColorStop(0, `rgba(255, 255, 255, ${highlightAlpha})`);
        highlightGrad.addColorStop(0.5, `rgba(255, 255, 255, ${highlightAlpha * 0.4})`);
        highlightGrad.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.fillStyle = highlightGrad;
        ctx.globalAlpha = 1;
        ctx.ellipse(highlightX, highlightY, highlightSize, highlightSize * 0.6, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rim lighting effect during dawn/dusk (warm edge glow)
      const isDawnDusk = intensity > 0.3 && intensity < 0.9 && !isNight;
      if (!f.isDead && isDawnDusk) {
        const rimAlpha = 0.15 * (1 - Math.abs(intensity - 0.6) * 2) * visibility;
        ctx.strokeStyle = `rgba(255, 200, 150, ${rimAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size * 0.82, f.size * 0.52, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.fillStyle = tintedColor;
      ctx.globalAlpha = 0.7 * visibility;
      ctx.moveTo(-f.size * 0.8, 0);
      ctx.lineTo(-f.size * 1.3, -f.size * 0.3);
      ctx.lineTo(-f.size * 1.3, f.size * 0.3);
      ctx.closePath();
      ctx.fill();

      // eyes — reduce contrast with dirt (multiply by visibility)
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 1 * visibility;
      ctx.arc(f.size * 0.3, -f.size * 0.15, f.size * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'black';
      ctx.globalAlpha = 1 * visibility;
      ctx.arc(f.size * 0.35, -f.size * 0.15, f.size * 0.08, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.6 * visibility;
      ctx.fillStyle = tintedColor;

      // Special rendering for catfish (cleaner fish)
      if (f.type === 'catfish') {
        // Draw barbels (whiskers)
        ctx.strokeStyle = this.darkenColor(tintedColor, 0.4);
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.8 * visibility;
        // Upper barbels
        ctx.beginPath();
        ctx.moveTo(f.size * 0.6, -f.size * 0.3);
        ctx.lineTo(f.size * 1.1, -f.size * 0.5);
        ctx.stroke();
        // Lower barbels
        ctx.beginPath();
        ctx.moveTo(f.size * 0.6, f.size * 0.1);
        ctx.lineTo(f.size * 1.1, f.size * 0.3);
        ctx.stroke();
        // Flatter body shape
        ctx.globalAlpha = 0.5 * visibility;
        ctx.fillStyle = this.darkenColor(tintedColor, 0.2 + dr * 0.15);
        ctx.beginPath();
        ctx.ellipse(0, f.size * 0.1, f.size * 0.7, f.size * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Spots pattern
        ctx.globalAlpha = 0.3 * visibility;
        ctx.fillStyle = this.darkenColor(tintedColor, 0.4 + dr * 0.2);
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(-f.size * 0.3 + i * f.size * 0.3, (i % 2 ? -0.2 : 0.2) * f.size, f.size * 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (f.type === 'angelfish') {
        ctx.globalAlpha = 0.6 * visibility;
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
        ctx.globalAlpha = 0.6 * visibility;
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

      // draw hunger bar above fish if they're hungry (show at 20+ hunger)
      try {
        if (!f.isDead && typeof f.hunger === 'number' && f.hunger > 20) {
          const barWidth = Math.max(28, f.size * 1.6);
          const barHeight = 6;
          const bx = f.x - barWidth / 2;
          const by = f.y - f.size - 10; // slightly above fish

          // background shadow
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);

          // empty bar background (red = hungry)
          ctx.fillStyle = 'rgba(220,40,40,0.98)';
          ctx.fillRect(bx, by, barWidth, barHeight);

          // filled green portion = satiety (inverted: 100 hunger = 0% bar, 0 hunger = 100% bar)
          const satiety = 100 - f.hunger; // Invert: 0 hunger = 100 satiety
          const fillW = Math.max(0, Math.min(barWidth, (satiety / 100) * barWidth));

          // Debug log (only log once per fish per frame to avoid spam)
          if (!this.hungerBarDebugLogged) {
            console.log(`🎨 Hunger Bar: ${f.name || f.type} - Hunger: ${f.hunger.toFixed(1)}, Satiety: ${satiety.toFixed(1)}, FillWidth: ${fillW.toFixed(1)}/${barWidth}`);
            this.hungerBarDebugLogged = true;
            setTimeout(() => this.hungerBarDebugLogged = false, 2000); // Reset after 2s
          }

          ctx.fillStyle = 'rgba(40,220,40,0.98)'; // Green for satiety
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

  // drawLightEffect: draws top-down light overlay. Supports optional colorTemp (Kelvin), sunAngle (radians), dirtLevel (0..100), and artificial lighting
  drawLightEffect(
    lightIntensity: number,
    colorTemp?: number,
    sunAngle?: number,
    dirtLevel?: number,
    isNight?: boolean,
    lampOn?: boolean,
    accentEnabled?: boolean,
    accentColor?: string
  ): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx; const canvas = this.canvas;
    const time = Date.now() * 0.001;

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

    ctx.save();

    // Depth-based ambient lighting: darker at bottom
    const depthGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    depthGradient.addColorStop(0, 'rgba(0,0,0,0)');
    depthGradient.addColorStop(0.6, 'rgba(0,0,0,0.02)');
    depthGradient.addColorStop(1, `rgba(0,0,0,${0.15 * (1 - finalIntensity * 0.5)})`);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = depthGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // main light gradient (soft top-down)
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    lg.addColorStop(0, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.18 * finalIntensity})`);
    lg.addColorStop(0.35, `rgba(${Math.round(tintRgb[0]*0.9)}, ${Math.round(tintRgb[1]*0.9)}, ${Math.round(tintRgb[2]*0.9)}, ${0.08 * finalIntensity})`);
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

    // Enhanced god-rays with proper sun tracking
    if (typeof sunAngle === 'number' && !isNight) {
      // Calculate sun position that arcs across the canvas
      // sunAngle goes from -π/2 (dawn, left) through π/2 (noon, top) to 3π/2 (dusk, right)
      const sunProgress = (sunAngle + Math.PI / 2) / (Math.PI * 2); // 0 at dawn, 0.25 at noon, 0.5 at dusk
      const normalizedProgress = Math.min(1, Math.max(0, sunProgress * 2)); // 0-1 during daylight

      // Sun X position: arcs from left (10%) to right (90%) of canvas
      const sunX = canvas.width * (0.1 + normalizedProgress * 0.8);
      // Sun Y position: arcs up at noon (highest point)
      const sunY = -canvas.height * 0.15 + Math.sin(normalizedProgress * Math.PI) * canvas.height * 0.1;

      // Draw 6 god-rays with animation
      const rayCount = 6;
      for (let i = 0; i < rayCount; i++) {
        // Animated sway for each ray
        const sway = Math.sin(time * 0.5 + i * 0.8) * 15;
        const pulse = 0.85 + Math.sin(time * 0.3 + i * 0.5) * 0.15;

        // Ray spread angle from sun position
        const rayAngle = ((i - rayCount / 2) / rayCount) * 0.8 + Math.sin(time * 0.2 + i) * 0.05;
        const rayEndX = sunX + Math.sin(rayAngle) * canvas.width * 0.4 + sway;
        const rayEndY = canvas.height * 0.9;

        // Ray length and intensity decrease with each layer
        const rayLength = canvas.height * (0.7 + i * 0.08);
        const baseAlpha = 0.045 * finalIntensity * (1 - dirtFactor * 0.6) * pulse;
        const layerFade = 1 - (i / rayCount) * 0.4;

        // Create ray gradient from sun to depth
        const rayGrad = ctx.createLinearGradient(sunX, sunY, rayEndX, rayEndY);
        rayGrad.addColorStop(0, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${baseAlpha * layerFade})`);
        rayGrad.addColorStop(0.3, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${baseAlpha * layerFade * 0.6})`);
        rayGrad.addColorStop(0.7, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${baseAlpha * layerFade * 0.2})`);
        rayGrad.addColorStop(1, 'rgba(0,0,0,0)');

        // Draw ray as a tapered shape
        ctx.beginPath();
        const rayWidth = 30 + i * 15;
        ctx.moveTo(sunX - rayWidth * 0.3, sunY);
        ctx.lineTo(rayEndX - rayWidth, rayEndY);
        ctx.lineTo(rayEndX + rayWidth, rayEndY);
        ctx.lineTo(sunX + rayWidth * 0.3, sunY);
        ctx.closePath();
        ctx.fillStyle = rayGrad;
        ctx.fill();
      }

      // Central bright spot at sun position
      const sunGlow = ctx.createRadialGradient(sunX, Math.max(0, sunY + 30), 0, sunX, Math.max(0, sunY + 30), canvas.width * 0.25);
      sunGlow.addColorStop(0, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.12 * finalIntensity})`);
      sunGlow.addColorStop(0.4, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.04 * finalIntensity})`);
      sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sunGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.5);
    }

    // Night mode: moonlight effect
    if (isNight === true) {
      // Soft blue moonlight from upper area
      const moonX = canvas.width * 0.7;
      const moonY = canvas.height * 0.05;

      // Moon glow
      const moonGlow = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, canvas.width * 0.4);
      moonGlow.addColorStop(0, `rgba(180, 200, 255, ${0.08 * finalIntensity})`);
      moonGlow.addColorStop(0.3, `rgba(150, 180, 230, ${0.04 * finalIntensity})`);
      moonGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = moonGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);

      // Subtle moon reflection shimmer on surface
      const shimmerCount = 5;
      for (let i = 0; i < shimmerCount; i++) {
        const shimmerX = moonX + (i - shimmerCount / 2) * 25 + Math.sin(time * 1.2 + i) * 10;
        const shimmerY = 15 + Math.sin(time * 0.8 + i * 0.5) * 5;
        const shimmerSize = 8 + Math.sin(time * 2 + i) * 4;

        ctx.globalAlpha = 0.12 * finalIntensity;
        ctx.beginPath();
        ctx.arc(shimmerX, shimmerY, shimmerSize, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Top rim highlight with enhanced effect
    ctx.globalCompositeOperation = 'screen';
    const rimGradient = ctx.createLinearGradient(0, 0, 0, Math.max(8, canvas.height * 0.08));
    rimGradient.addColorStop(0, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.15 * finalIntensity})`);
    rimGradient.addColorStop(0.5, `rgba(${tintRgb[0]}, ${tintRgb[1]}, ${tintRgb[2]}, ${0.06 * finalIntensity})`);
    rimGradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGradient;
    ctx.fillRect(0, 0, canvas.width, Math.max(8, canvas.height * 0.08));

    // Aquarium Lamp Effect (artificial overhead light, most effective at night)
    if (lampOn === true) {
      ctx.globalCompositeOperation = 'lighter';

      // Lamp effectiveness: stronger at night, subtle during day
      const lampEffectiveness = isNight ? 1.0 : 0.3;

      // Main lamp light cone from top center
      const lampX = canvas.width * 0.5;
      const lampY = -canvas.height * 0.05;

      // Warm white lamp color (around 3500K - warm LED)
      const lampR = 255, lampG = 244, lampB = 229;

      // Primary light cone
      const lampCone = ctx.createRadialGradient(lampX, lampY, 0, lampX, canvas.height * 0.4, canvas.height * 0.8);
      lampCone.addColorStop(0, `rgba(${lampR}, ${lampG}, ${lampB}, ${0.35 * lampEffectiveness})`);
      lampCone.addColorStop(0.3, `rgba(${lampR}, ${lampG}, ${lampB}, ${0.2 * lampEffectiveness})`);
      lampCone.addColorStop(0.6, `rgba(${lampR}, ${lampG}, ${lampB}, ${0.08 * lampEffectiveness})`);
      lampCone.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = lampCone;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Secondary soft fill light
      const fillLight = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
      fillLight.addColorStop(0, `rgba(${lampR}, ${lampG}, ${lampB}, ${0.15 * lampEffectiveness})`);
      fillLight.addColorStop(0.5, `rgba(${lampR}, ${lampG}, ${lampB}, ${0.05 * lampEffectiveness})`);
      fillLight.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = fillLight;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);

      // Lamp highlight reflection on water surface
      ctx.globalAlpha = 0.25 * lampEffectiveness;
      const surfaceHighlight = ctx.createLinearGradient(0, 0, 0, 25);
      surfaceHighlight.addColorStop(0, `rgba(${lampR}, ${lampG}, ${lampB}, 0.6)`);
      surfaceHighlight.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = surfaceHighlight;
      ctx.fillRect(canvas.width * 0.2, 0, canvas.width * 0.6, 25);
      ctx.globalAlpha = 1;
    }

    // Accent LED Lighting Effect
    if (accentEnabled === true && accentColor) {
      ctx.globalCompositeOperation = 'lighter';

      // Parse hex color to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : { r: 65, g: 105, b: 225 }; // default royal blue
      };

      const ledColor = hexToRgb(accentColor);
      const ledIntensity = 0.7; // LED brightness factor

      // Animated LED glow - subtle pulsing
      const pulse = 0.85 + Math.sin(time * 2) * 0.15;

      // Bottom LED strip effect (like aquarium LED strips)
      const bottomGlow = ctx.createLinearGradient(0, canvas.height, 0, canvas.height * 0.5);
      bottomGlow.addColorStop(0, `rgba(${ledColor.r}, ${ledColor.g}, ${ledColor.b}, ${0.25 * ledIntensity * pulse})`);
      bottomGlow.addColorStop(0.3, `rgba(${ledColor.r}, ${ledColor.g}, ${ledColor.b}, ${0.12 * ledIntensity * pulse})`);
      bottomGlow.addColorStop(0.7, `rgba(${ledColor.r}, ${ledColor.g}, ${ledColor.b}, ${0.04 * ledIntensity * pulse})`);
      bottomGlow.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.fillStyle = bottomGlow;
      ctx.fillRect(0, canvas.height * 0.5, canvas.width, canvas.height * 0.5);

      // Side accent lights (left and right edges)
      const sideIntensity = 0.15 * ledIntensity * pulse;

      // Left side glow
      const leftGlow = ctx.createLinearGradient(0, 0, canvas.width * 0.25, 0);
      leftGlow.addColorStop(0, `rgba(${ledColor.r}, ${ledColor.g}, ${ledColor.b}, ${sideIntensity})`);
      leftGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(0, 0, canvas.width * 0.25, canvas.height);

      // Right side glow
      const rightGlow = ctx.createLinearGradient(canvas.width, 0, canvas.width * 0.75, 0);
      rightGlow.addColorStop(0, `rgba(${ledColor.r}, ${ledColor.g}, ${ledColor.b}, ${sideIntensity})`);
      rightGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(canvas.width * 0.75, 0, canvas.width * 0.25, canvas.height);

      // Subtle color wash over entire tank
      ctx.globalAlpha = 0.06 * pulse;
      ctx.fillStyle = `rgba(${ledColor.r}, ${ledColor.g}, ${ledColor.b}, 0.5)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }
}
