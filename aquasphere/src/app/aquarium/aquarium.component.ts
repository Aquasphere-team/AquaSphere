import { Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aquarium',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aquarium.component.html',
  styleUrls: ['./aquarium.component.css']
})
export class AquariumComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('aquariumCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;



  private ctx!: CanvasRenderingContext2D;
  private particles: any[] = [];
  private waveOffset = 0;
  private lightIntensity = 1;
  private animationId?: number;
  private isRunning = true;
  phonePreview = true; // Handy-Version als Standard
  // auth state
  inScreenMenu = false;
  authName = '';
  authPass = '';
  currentUser: string | null = null;
  inPhoneAuth = false;
  // decoration / plants
  plantTypes = [
    { id: 'fern', name: 'Farn', color: '#1b8a36' },
    { id: 'anubias', name: 'Anubias', color: '#0f7a4a' },
    { id: 'moss', name: 'Moos', color: '#2fa84f' }
  ];

  // fish types and data
  fishTypes = [
    { id: 'goldfish', name: 'Goldfisch', color: '#FFD700', size: 25, speed: 1.2 },
    { id: 'bluefish', name: 'Blauer Fisch', color: '#4169E1', size: 20, speed: 1.8 },
    { id: 'redfish', name: 'Roter Fisch', color: '#DC143C', size: 18, speed: 2.0 },
    { id: 'greenfish', name: 'Grüner Fisch', color: '#32CD32', size: 22, speed: 1.5 },
    { id: 'angelfish', name: 'Kaiserfisch', color: '#FF69B4', size: 30, speed: 0.8 }
  ];
  // plants store normalized positions (nx, ny) relative to canvas CSS size (0..1)
  plants: Array<{ type: string; nx?: number; ny?: number; x?: number; y?: number; scale?: number }> = [];
  decorationPaletteVisible = false;

  // fish data - each fish has position, movement, and behavioral properties
  fish: Array<{
    id: string;
    type: string;
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    direction: number; // radians for facing direction
    targetX?: number;
    targetY?: number;
    isFeeding: boolean;
    hunger: number; // 0-100
    lastFeedTime: number;
    size: number;
    color: string;
  }> = [];

  fishPaletteVisible = false;
  // plant controls
  placingPlant = false;
  selectedPlantType: string | null = null;
  placingFish = false;
  selectedFishType: string | null = null;

  ngOnInit(): void {
    // ensure transient UI flags are reset on start (do this before attaching listeners)
    this.inPhoneAuth = false;
    this.decorationPaletteVisible = false;
    this.placingPlant = false;
  }

  ngAfterViewInit(): void {
    // Canvas should be available now
    setTimeout(() => {
      this.initializeAquarium();
    }, 100);
  }

  ngOnDestroy(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    try {
      // remove canvas click listener if attached
      try { this.canvasRef?.nativeElement?.removeEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}
    } catch (e) {
      // ignore
    }
  }

  private initializeAquarium(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;

    console.log('Canvas before setup:', {
      width: canvas.width,
      height: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    });

    // Set canvas size directly
    canvas.width = 800;
    canvas.height = 600;
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    console.log('Canvas after setup:', {
      width: canvas.width,
      height: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    });

    this.createWaterParticles();
    this.createStarterFish();
    this.createStarterPlants();

    // attach click handler
    try { canvas.addEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}

    // Add resize handler
    window.addEventListener('resize', this.handleResize);
    setTimeout(() => this.handleResize(), 100);

    this.animate();
  }

  private createStarterFish(): void {
    // Create fish with fixed, guaranteed visible coordinates
    this.fish = [
      {
        id: 'starter1',
        type: 'goldfish',
        x: 200,
        y: 300,
        speedX: 1,
        speedY: 0.5,
        direction: 0,
        isFeeding: false,
        hunger: 50,
        lastFeedTime: Date.now(),
        size: 25,
        color: '#FFD700'
      },
      {
        id: 'starter2',
        type: 'bluefish',
        x: 500,
        y: 200,
        speedX: -1,
        speedY: 0.3,
        direction: Math.PI,
        isFeeding: false,
        hunger: 60,
        lastFeedTime: Date.now(),
        size: 20,
        color: '#4169E1'
      },
      {
        id: 'starter3',
        type: 'redfish',
        x: 350,
        y: 450,
        speedX: 0.5,
        speedY: -0.8,
        direction: Math.PI/2,
        isFeeding: false,
        hunger: 40,
        lastFeedTime: Date.now(),
        size: 18,
        color: '#DC143C'
      }
    ];
  }

  private createStarterPlants(): void {
    // Add some starter plants with fixed coordinates
    this.plants = [
      { type: 'fern', nx: 0.1, ny: 0.8, scale: 1 },
      { type: 'anubias', nx: 0.7, ny: 0.9, scale: 1.2 },
      { type: 'moss', nx: 0.3, ny: 0.75, scale: 0.8 }
    ];
  }

  private handleResize = (): void => {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) return;

    // Nur noch phone-screen container verwenden
    const container = canvas.closest('.phone-screen') as HTMLElement;

    if (container) {
      const rect = container.getBoundingClientRect();
      console.log('Resizing canvas to phone screen:', {
        width: rect.width,
        height: rect.height
      });

      // Set canvas size to match phone screen
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    } else {
      console.log('No phone-screen container found, using fallback size');
      canvas.width = 375; // iPhone-ähnliche Breite
      canvas.height = 667; // iPhone-ähnliche Höhe
    }
  }



  // togglePhonePreview entfernt - nur noch Handy-Version

  toggleInScreenMenu(): void {
    this.inScreenMenu = !this.inScreenMenu;
    if (this.inScreenMenu) {
      this.inPhoneAuth = false;
      this.decorationPaletteVisible = false;
      this.fishPaletteVisible = false;
      this.placingPlant = false;
      this.placingFish = false;
    }
  }

  // Decoration / plants
  toggleDecorationPalette(): void {
    this.decorationPaletteVisible = !this.decorationPaletteVisible;
    if (this.decorationPaletteVisible) {
      this.inPhoneAuth = false;
      this.inScreenMenu = false;
      this.placingPlant = false;
      this.placingFish = false; // Reset auch fish placing
    }
  }

  selectPlantType(id: string, source: 'desktop' | 'phone' = 'phone'): void {
    this.selectedPlantType = id;
    this.placingPlant = true;
    // hide palettes while placing to avoid them covering the canvas
    this.decorationPaletteVisible = false;
    try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    console.log('Select plant:', id, 'source:', source);
  }

  // Desktop-Paletten entfernt

  toggleFishPalette(): void {
    this.fishPaletteVisible = !this.fishPaletteVisible;
    if (this.fishPaletteVisible) {
      this.inPhoneAuth = false;
      this.inScreenMenu = false;
      this.decorationPaletteVisible = false;
      this.placingPlant = false;
      this.placingFish = false; // Reset auch fish placing
    }
  }

  // Desktop-Fish-Palette entfernt

  selectFishType(id: string, source: 'desktop' | 'phone' = 'phone'): void {
    this.selectedFishType = id;
    this.placingFish = true;
    this.fishPaletteVisible = false;
    try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  cancelFishPlacing(): void {
    this.placingFish = false;
    this.selectedFishType = null;
    try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  debugAddFish(): void {
    const randomX = Math.random() * 600 + 100;
    const randomY = Math.random() * 400 + 100;
    this.addFish('goldfish', randomX, randomY);
  }

  cancelPlacing(): void {
    this.placingPlant = false;
    this.selectedPlantType = null;
    this.placingFish = false;
    this.selectedFishType = null;
  try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  private canvasClickHandler = (ev: PointerEvent) => {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const cssX = ((ev as any).clientX - rect.left);
    const cssY = ((ev as any).clientY - rect.top);

    if (this.placingPlant && this.selectedPlantType) {
      const nx = Math.max(0, Math.min(1, cssX / rect.width));
      const ny = Math.max(0, Math.min(1, cssY / rect.height));
      this.plants.push({ type: this.selectedPlantType, nx, ny, scale: 1 });
      this.placingPlant = false;
      this.selectedPlantType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
      this.saveUserState();
    } else if (this.placingFish && this.selectedFishType) {
      this.addFish(this.selectedFishType, cssX, cssY);
      this.placingFish = false;
      this.selectedFishType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
      this.saveUserState();
    }
  }

  private mouseMoveHandler = (ev: PointerEvent) => {
    if (!this.placingPlant && !this.placingFish) return;
    const indicator = document.getElementById('placing-indicator');
    if (!indicator) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    // local coordinates inside canvas (CSS pixels)
    let localX = (ev as any).clientX - rect.left;
    let localY = (ev as any).clientY - rect.top;
    // clamp to canvas bounds
    localX = Math.max(0, Math.min(localX, rect.width));
    localY = Math.max(0, Math.min(localY, rect.height));
    indicator.style.left = localX + 'px';
    indicator.style.top = localY + 'px';
  }





  private createWaterParticles(): void {
    this.particles = [];
    for (let i = 0; i < 20; i++) {
      this.particles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.8,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        color: this.getRandomWaterColor()
      });
    }
  }



  private addFish(type: string, x?: number, y?: number): void {
    const fishType = this.fishTypes.find(t => t.id === type);
    if (!fishType) return;

    const canvasWidth = 800;
    const canvasHeight = 600;

    const margin = fishType.size * 1.5;
    const safeX = x !== undefined ? x : Math.random() * (canvasWidth - 2 * margin) + margin;
    const safeY = y !== undefined ? y : Math.random() * (canvasHeight - 2 * margin) + margin;

    const fish = {
      id: `fish_${Date.now()}_${Math.random()}`,
      type: type,
      x: Math.max(margin, Math.min(safeX, canvasWidth - margin)),
      y: Math.max(margin, Math.min(safeY, canvasHeight - margin)),
      speedX: (Math.random() - 0.5) * fishType.speed,
      speedY: (Math.random() - 0.5) * fishType.speed * 0.5,
      direction: Math.random() * Math.PI * 2,
      isFeeding: false,
      hunger: Math.random() * 50 + 25,
      lastFeedTime: Date.now(),
      size: fishType.size,
      color: fishType.color
    };

    this.fish.push(fish);
  }

  // --- Authentication (simulated backend via localStorage) ---
  register(): void {
    if (!this.authName || !this.authPass) return;
    const usersRaw = localStorage.getItem('aqua_users');
    const users = usersRaw ? JSON.parse(usersRaw) : {};
    if (users[this.authName]) {
      alert('Benutzername bereits vorhanden');
      return;
    }
    users[this.authName] = { password: this.authPass };
    localStorage.setItem('aqua_users', JSON.stringify(users));
    alert('Registrierung erfolgreich. Du kannst dich nun anmelden.');
    this.authPass = '';
  }

  login(): void {
    if (!this.authName || !this.authPass) return;
    const usersRaw = localStorage.getItem('aqua_users');
    const users = usersRaw ? JSON.parse(usersRaw) : {};
    const u = users[this.authName];
    if (!u || u.password !== this.authPass) {
      alert('Anmeldung fehlgeschlagen');
      return;
    }
    this.currentUser = this.authName;
    this.authPass = '';
    this.loadUserState();
  }

  logout(): void {
    this.currentUser = null;
  }

  openPhoneAuth(): void {
    // Toggle the in-phone auth overlay; ensure other UI is closed when auth opens
    this.inPhoneAuth = !this.inPhoneAuth;
    if (this.inPhoneAuth) {
      this.inScreenMenu = false;
      this.decorationPaletteVisible = false;
      this.placingPlant = false;
    }
  }

  closePhoneAuth(): void {
    this.inPhoneAuth = false;
  }

  saveUserState(): void {
    if (!this.currentUser) return;
    const state = {
      lightIntensity: this.lightIntensity,
      particles: this.particles,
      plants: this.plants,
      fish: this.fish
    };
    localStorage.setItem(`aqua_user_${this.currentUser}`, JSON.stringify(state));
    window.alert('Dein Aquarium wurde gespeichert.');
  }

  loadUserState(): void {
    if (!this.currentUser) return;
    const raw = localStorage.getItem(`aqua_user_${this.currentUser}`);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (state.lightIntensity) this.lightIntensity = state.lightIntensity;
      if (Array.isArray(state.particles)) this.particles = state.particles;
      if (Array.isArray(state.plants)) this.plants = state.plants;
      if (Array.isArray(state.fish)) this.fish = state.fish;
    } catch (e) {
      console.warn('Invalid user state');
    }
  }

  private drawPlants(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.plants.forEach(p => {
      // Backwards compatibility: if old entries used x/y in CSS pixels, convert to normalized coords
      if ((p as any).x !== undefined && (p as any).y !== undefined && (p.nx === undefined || p.ny === undefined)) {
        p.nx = ((p as any).x) / rect.width;
        p.ny = ((p as any).y) / rect.height;
      }
      // compute pixel position from normalized coords
      const px = (p.nx !== undefined) ? p.nx * rect.width : (p.x ?? 0);
      const py = (p.ny !== undefined) ? p.ny * rect.height : (p.y ?? 0);
      const type = this.plantTypes.find(t => t.id === p.type);
      const color = type ? type.color : '#2fa84f';
      // use CSS-pixel width for sizing so plants keep consistent visual size
      const size = (p.scale || 1) * Math.max(16, Math.min(48, rect.width * 0.04));
      // Draw a simple stylized plant: bunch of leaves
      this.ctx.save();
      // translate to computed pixel position
      this.ctx.translate(px, py);
      for (let i = 0; i < 5; i++) {
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.globalAlpha = 0.9 - i * 0.12;
        const sway = Math.sin((this.waveOffset + i) * 1.2) * (4 + i);
        this.ctx.ellipse(sway, -i * (size * 0.25), size * 0.18, size * 0.5, (i - 2) * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
      this.ctx.globalAlpha = 1;
    });
  }

  private updateFish(): void {
    const canvas = this.canvasRef.nativeElement;
    const now = Date.now();

    // Use canvas actual dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    this.fish.forEach(fish => {
      // Update position
      fish.x += fish.speedX;
      fish.y += fish.speedY;

      // Improved boundary collision detection and bouncing
      const margin = fish.size * 1.5; // Increased margin for better boundary detection
      const maxX = canvasWidth - margin;
      const maxY = canvasHeight - margin;

      // Check horizontal boundaries and bounce
      if (fish.x <= margin) {
        fish.x = margin;
        fish.speedX = Math.abs(fish.speedX); // Always bounce to the right
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      } else if (fish.x >= maxX) {
        fish.x = maxX;
        fish.speedX = -Math.abs(fish.speedX); // Always bounce to the left
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      }

      // Check vertical boundaries and bounce
      if (fish.y <= margin) {
        fish.y = margin;
        fish.speedY = Math.abs(fish.speedY); // Always bounce downward
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      } else if (fish.y >= maxY) {
        fish.y = maxY;
        fish.speedY = -Math.abs(fish.speedY); // Always bounce upward
        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      }

      // Ensure fish stay strictly within bounds (safety net)
      fish.x = Math.max(margin, Math.min(fish.x, maxX));
      fish.y = Math.max(margin, Math.min(fish.y, maxY));

      // Random direction changes for natural movement
      if (Math.random() < 0.005) {
        const fishType = this.fishTypes.find(t => t.id === fish.type);
        const speed = fishType ? fishType.speed : 1;
        fish.speedX += (Math.random() - 0.5) * 0.5;
        fish.speedY += (Math.random() - 0.5) * 0.3;

        // Limit speed
        const currentSpeed = Math.sqrt(fish.speedX * fish.speedX + fish.speedY * fish.speedY);
        if (currentSpeed > speed * 2) {
          fish.speedX = (fish.speedX / currentSpeed) * speed;
          fish.speedY = (fish.speedY / currentSpeed) * speed;
        }

        fish.direction = Math.atan2(fish.speedY, fish.speedX);
      }

      // Update hunger over time
      fish.hunger = Math.min(100, fish.hunger + (now - fish.lastFeedTime) / 30000); // increase hunger over time
      fish.lastFeedTime = now;

      // Look for food particles if hungry
      if (fish.hunger > 60 && !fish.isFeeding) {
        const foodParticles = this.particles.filter(p => p.isFeed);
        if (foodParticles.length > 0) {
          const nearestFood = foodParticles.reduce((nearest, p) => {
            const distToP = Math.sqrt((p.x - fish.x) ** 2 + (p.y - fish.y) ** 2);
            const distToNearest = nearest ? Math.sqrt((nearest.x - fish.x) ** 2 + (nearest.y - fish.y) ** 2) : Infinity;
            return distToP < distToNearest ? p : nearest;
          }, null as any);

          if (nearestFood) {
            fish.targetX = nearestFood.x;
            fish.targetY = nearestFood.y;
            fish.isFeeding = true;
          }
        }
      }

      // Move towards food if feeding
      if (fish.isFeeding && fish.targetX !== undefined && fish.targetY !== undefined) {
        const dx = fish.targetX - fish.x;
        const dy = fish.targetY - fish.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < fish.size) {
          // Reached food - eat it
          const foodIndex = this.particles.findIndex(p => p.x === fish.targetX && p.y === fish.targetY && p.isFeed);
          if (foodIndex >= 0) {
            this.particles.splice(foodIndex, 1);
            fish.hunger = Math.max(0, fish.hunger - 30);
          }
          fish.isFeeding = false;
          fish.targetX = undefined;
          fish.targetY = undefined;
        } else {
          // Move towards food
          const speed = 2;
          fish.speedX = (dx / distance) * speed;
          fish.speedY = (dy / distance) * speed;
          fish.direction = Math.atan2(fish.speedY, fish.speedX);
        }
      }
    });
  }

  private drawFish(): void {
    this.fish.forEach(fish => {
      this.ctx.save();
      this.ctx.translate(fish.x, fish.y);
      this.ctx.rotate(fish.direction);

      // Add swimming animation with subtle size pulsing
      const swimPulse = Math.sin(Date.now() * 0.01 + fish.x * 0.01) * 0.1 + 1;
      const scaleX = swimPulse;
      const scaleY = 1 / swimPulse; // Inverse scaling for natural movement
      this.ctx.scale(scaleX, scaleY);

      // Draw fish body with gradient for more depth
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, fish.size);
      gradient.addColorStop(0, fish.color);
      gradient.addColorStop(0.7, fish.color);
      gradient.addColorStop(1, this.darkenColor(fish.color, 0.3));

      this.ctx.beginPath();
      this.ctx.fillStyle = gradient;
      this.ctx.globalAlpha = 0.9;
      this.ctx.ellipse(0, 0, fish.size * 0.8, fish.size * 0.5, 0, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw fish tail
      this.ctx.beginPath();
      this.ctx.fillStyle = fish.color;
      this.ctx.globalAlpha = 0.7;
      this.ctx.moveTo(-fish.size * 0.8, 0);
      this.ctx.lineTo(-fish.size * 1.3, -fish.size * 0.3);
      this.ctx.lineTo(-fish.size * 1.3, fish.size * 0.3);
      this.ctx.closePath();
      this.ctx.fill();

      // Draw fish eye
      this.ctx.beginPath();
      this.ctx.fillStyle = 'white';
      this.ctx.globalAlpha = 1;
      this.ctx.arc(fish.size * 0.3, -fish.size * 0.15, fish.size * 0.15, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw pupil
      this.ctx.beginPath();
      this.ctx.fillStyle = 'black';
      this.ctx.arc(fish.size * 0.35, -fish.size * 0.15, fish.size * 0.08, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw fins based on fish type
      this.ctx.globalAlpha = 0.6;
      this.ctx.fillStyle = fish.color;

      if (fish.type === 'angelfish') {
        // Draw long fins for angelfish
        this.ctx.beginPath();
        this.ctx.moveTo(0, -fish.size * 0.5);
        this.ctx.lineTo(fish.size * 0.2, -fish.size * 1.2);
        this.ctx.lineTo(fish.size * 0.4, -fish.size * 0.8);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(0, fish.size * 0.5);
        this.ctx.lineTo(fish.size * 0.2, fish.size * 1.2);
        this.ctx.lineTo(fish.size * 0.4, fish.size * 0.8);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Standard fins
        this.ctx.beginPath();
        this.ctx.moveTo(0, -fish.size * 0.5);
        this.ctx.lineTo(fish.size * 0.3, -fish.size * 0.8);
        this.ctx.lineTo(fish.size * 0.5, -fish.size * 0.4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(0, fish.size * 0.5);
        this.ctx.lineTo(fish.size * 0.3, fish.size * 0.8);
        this.ctx.lineTo(fish.size * 0.5, fish.size * 0.4);
        this.ctx.closePath();
        this.ctx.fill();
      }

      this.ctx.restore();
      this.ctx.globalAlpha = 1;
    });
  }

  private getRandomWaterColor(): string {
    const colors = [
      'rgba(135, 206, 235, 0.4)',  // Sky blue
      'rgba(173, 216, 230, 0.4)',  // Light blue
      'rgba(176, 224, 230, 0.4)',  // Powder blue
      'rgba(70, 130, 180, 0.4)',   // Steel blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private darkenColor(color: string, factor: number): string {
    // Simple color darkening for fish gradients
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
    return color; // Fallback for non-hex colors
  }

  private animate(): void {
    if (!this.isRunning) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Animationen zeichnen
    this.drawWaterBackground();
    this.drawCausticEffect();
    this.drawWaterParticles();
    // draw user-placed plants
    this.drawPlants();
    // update and draw fish
    this.updateFish();
    this.drawFish();
    // Bodengrund entfernen: keine sand- oder gravel-Füllung mehr
    // Stattdessen zeichnen wir dezente Wellen an der Oberfläche
    this.drawSurfaceWaves();
    this.drawLightEffect();

    this.waveOffset += 0.03;
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private drawWaterBackground(): void {
    const canvas = this.canvasRef.nativeElement;
    const gradient = this.ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(135, 206, 235, 0.2)');
    gradient.addColorStop(0.3, 'rgba(70, 130, 180, 0.4)');
    gradient.addColorStop(0.7, 'rgba(25, 25, 112, 0.6)');
    gradient.addColorStop(1, 'rgba(0, 0, 139, 0.8)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  private drawWaterWaves(): void {
    // früher: Bodengrund gezeichnet (sand/gravel)
    // wird nun bewusst nicht mehr gezeichnet — Methode bleibt als Platzhalter
    return;
  }

  private drawSurfaceWaves(): void {
    const canvas = this.canvasRef.nativeElement;
    const top = 20; // y-Offset von der Oberkante
    const amplitude = 8;
    const wavelength = canvas.width / 6;

    // multiple semi-transparent wave layers for depth
    for (let layer = 0; layer < 3; layer++) {
      const layerOffset = this.waveOffset * (1 + layer * 0.4);
      const alpha = 0.08 - layer * 0.02;
      const yOffset = top + layer * 6;

      this.ctx.beginPath();
      this.ctx.moveTo(0, yOffset);
      for (let x = 0; x <= canvas.width; x += 6) {
        const y = yOffset + Math.sin((x / wavelength) * Math.PI * 2 + layerOffset) * (amplitude - layer * 2);
        this.ctx.lineTo(x, y);
      }
      this.ctx.lineTo(canvas.width, 0);
      this.ctx.lineTo(0, 0);
      this.ctx.closePath();

      // subtle foam/edge highlight using gradient
      const g = this.ctx.createLinearGradient(0, 0, 0, yOffset + amplitude + 10);
      g.addColorStop(0, `rgba(255,255,255,${alpha})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');

      this.ctx.fillStyle = g;
      this.ctx.fill();
    }

    // thin stroked wave on top for sharper surface definition
    this.ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 4) {
      const y = top + Math.sin((x / (wavelength * 0.9)) * Math.PI * 2 + this.waveOffset * 1.2) * (amplitude - 1.5);
      if (x === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
  }

  private drawWaterParticles(): void {
    const canvas = this.canvasRef.nativeElement;

    this.particles.forEach((particle, index) => {
      // Sanfte Bewegung mit Sinus-Wellen für natürlichen Effekt
      particle.x += particle.speedX + Math.sin(Date.now() * 0.001 + index) * 0.5;
      particle.y += particle.speedY + Math.cos(Date.now() * 0.0015 + index) * 0.3;

      // Bounds checking with gentle bouncing
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.speedX *= -0.8; // Softer bounce
        particle.x = Math.max(0, Math.min(particle.x, canvas.width));
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.speedY *= -0.8; // Softer bounce
        particle.y = Math.max(0, Math.min(particle.y, canvas.height));
      }

      // Partikel mit Glow-Effekt zeichnen
      this.ctx.globalAlpha = particle.opacity;

      // Glow effect
      const glowGradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 3
      );
      glowGradient.addColorStop(0, particle.color);
      glowGradient.addColorStop(0.4, particle.color.replace('0.4)', '0.1)'));
      glowGradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = glowGradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Main particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;

      // Schönere Opacity-Animation
      particle.opacity += Math.sin(Date.now() * 0.002 + index) * 0.01;
      particle.opacity = Math.max(0.2, Math.min(0.8, particle.opacity));
    });
  }

  private drawLightEffect(): void {
    const canvas = this.canvasRef.nativeElement;

    // Licht von oben
    const lightGradient = this.ctx.createLinearGradient(0, 0, 0, canvas.height / 2);
    lightGradient.addColorStop(0, `rgba(255, 255, 255, ${0.15 * this.lightIntensity})`);
    lightGradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.08 * this.lightIntensity})`);
    lightGradient.addColorStop(1, 'transparent');

    this.ctx.fillStyle = lightGradient;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height / 2);

    // Licht-Pulsation
    this.lightIntensity = 0.7 + Math.sin(Date.now() * 0.003) * 0.3;
  }

  private drawCausticEffect(): void {
    const canvas = this.canvasRef.nativeElement;
    const time = Date.now() * 0.001;

    this.ctx.globalAlpha = 0.2;

    // More dynamic caustic patterns
    for (let i = 0; i < 12; i++) {
      const phase = i * 0.5;
      const x = (Math.sin(time * 0.8 + phase) * 0.4 + 0.5) * canvas.width;
      const y = (Math.cos(time * 1.1 + phase) * 0.35 + 0.45) * canvas.height;

      // Variable size based on time
      const size = 60 + Math.sin(time * 2 + phase) * 30;

      const causticGradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      causticGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      causticGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
      causticGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      causticGradient.addColorStop(1, 'transparent');

      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = causticGradient;
      this.ctx.fill();
    }

    this.ctx.globalAlpha = 1;
  }

  // Button Event Handlers
  feedFish(): void {
    console.log('🐟 Fische werden gefüttert!');

    // Futter-Partikel hinzufügen
    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        this.particles.push({
          x: Math.random() * 700 + 50,
          y: -20,
          size: Math.random() * 4 + 2,
          speedX: (Math.random() - 0.5) * 2,
          speedY: Math.random() * 3 + 2,
          opacity: 0.9,
          color: 'rgba(255, 165, 0, 0.8)', // Orange Futter
          isFeed: true,
          life: 200
        });
      }, i * 150);
    }
  }

  toggleLight(): void {
    console.log('💡 Licht umgeschaltet!');
    this.lightIntensity = this.lightIntensity > 0.5 ? 0.2 : 1.5;
  }

  cleanAquarium(): void {
    console.log('🧽 Aquarium wird gereinigt!');

    // Futter-Partikel entfernen
    this.particles = this.particles.filter(p => !p.isFeed);

    // Neue saubere Partikel hinzufügen
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        size: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.2,
        color: 'rgba(173, 216, 230, 0.5)'
      });
    }
  }
}
