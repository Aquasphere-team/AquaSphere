import { Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { FishService } from '../../services/fish.service';
import { DecorationService } from '../../services/decoration.service';
import { FishInstance, FishType } from '../../models/fish.model';
import { PlacedDecoration } from '../../models/decoration.model';
import { CanvasService } from '../../services/canvas.service';
import { ParticleService } from '../../services/particle.service';
import { DirtService } from '../../services/dirt.service';

@Component({
  selector: 'app-aquarium',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aquarium.component.html',
  styleUrls: ['./aquarium.component.css']
})
export class AquariumComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('aquariumCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(
    private supabaseService: SupabaseService,
    private fishService: FishService,
    private decorationService: DecorationService,
    private canvasService: CanvasService
    , private particleService: ParticleService
    , private dirtService: DirtService
    , private cdr: ChangeDetectorRef
  ) {}

  // state
  // particles are managed by ParticleService
  private isRunning = true;
  private animationId?: number;
  private waveOffset = 0;
  private lightIntensity = 1;

  // auth state
  inScreenMenu = false;
  authEmail = '';
  authName = '';
  authPass = '';
  currentUser: string | null = null;
  currentUserId: string | null = null;
  inPhoneAuth = false;
  showRegister = false; // Toggle between login and register forms

  // aquarium content
  decorations: PlacedDecoration[] = [];
  plants: PlacedDecoration[] = [];
  fish: FishInstance[] = [];

  // dirt state (Wassertrübung + sichtbare Glasflecken)
  dirtLevel = 0; // 0..100
  dirtLastUpdated: number = Date.now();
  dirtStains: Array<{ id: string; x: number; y: number; radius: number; amount: number; createdAt?: number }> = [];

  // points system
  points = 50; // starting points
  readonly BASE_FISH_COST = 20;  // tier 1 cost
  readonly FISH_COST_MULTIPLIER = 2; // each tier costs 2x more (20, 40, 80, 160)
  readonly PLANT_COST = 8;  // reduced slightly
  readonly ROCK_COST = 12;  // reduced slightly
  readonly CORAL_COST = 15; // reduced slightly
  readonly FEED_COST = 2;
  readonly POINTS_PER_FISH_INTERVAL = 10000; // 10 seconds
  readonly BASE_POINTS_PER_FISH = 1; // tier 1 generates 1 point
  readonly POINTS_MULTIPLIER = 2; // each tier generates 2x more points (1, 2, 4, 8)

  // time system
  aquariumStartTime: number | null = null; // timestamp when aquarium started
  currentAquariumTime = 0; // elapsed time in milliseconds
  timeSpeed = 1; // 1x, 2x, 4x, 8x, 16x
  readonly MAX_TIME_SPEED = 16;
  private lastTimeUpdate = 0;

  // Dirt / feeding tuning constants (new)
  readonly DIRT_PASSIVE_TICK_SEC = 60; // seconds between passive dirt ticks (used when starting DirtService)
  readonly DIRT_PER_FISH_INFLUENCE = 0.02; // dirt amount per fish for influence calls (smaller -> slower dirt increase)
  readonly DIRT_FEED_MULTIPLIER = 1.2; // multiplier applied during feed influence
  readonly FEED_STAIN_COUNT = 3; // how many visible stains to spawn when feeding
  readonly FEED_STAIN_VERTICAL_PADDING = 0.05; // normalized padding from top/bottom for stain spawn
  readonly FEED_STAIN_HORIZONTAL_PADDING = 0.05; // normalized padding left/right for stain spawn
  
  // Cleaning constants
  readonly CLEANER_FISH_CLEANING_RATE = 0.08; // dirt reduction per cleaner fish per second
  readonly PLANT_CLEANING_RATE = 0.03; // dirt reduction per plant per second
  private lastCleaningUpdate = 0;
  
  // Save debouncing
  private lastSaveTime = 0;
  private readonly MIN_SAVE_INTERVAL_MS = 2000; // Minimum 2 seconds between saves

  // UI helpers
  previews: Record<string, string> = {};
  placingDecoration = false;
  selectedDecorationType: string | null = null;
  // fish info panel
  selectedFish: FishInstance | null = null;
  selectedFishNameInput = '';
  selectedFishAgeText = '';
  private selectedFishAgeInterval?: number;

  // expose fishTypes from FishService so the template can iterate over them
  get fishTypes(): FishType[] {
    return this.fishService.fishTypes;
  }

  // get cost for decoration type
  getDecorationCost(decorationId: string): number {
    const decoration = this.decorationService.decorationTypes.find(d => d.id === decorationId);
    if (!decoration) return 0;
    switch (decoration.category) {
      case 'plants': return this.PLANT_COST;
      case 'rocks': return this.ROCK_COST;
      case 'coral': return this.CORAL_COST;
      default: return 10;
    }
  }

  // get cost for fish by tier
  getFishCost(fishId: string): number {
    const fishType = this.fishService.fishTypes.find(f => f.id === fishId);
    if (!fishType) return this.BASE_FISH_COST;
    
    // Special pricing for tier 5 cleaner fish - minimum 500 points
    if (fishType.tier === 5 && fishType.isCleaner) {
      return 500;
    }
    
    return Math.round(this.BASE_FISH_COST * Math.pow(this.FISH_COST_MULTIPLIER, fishType.tier - 1));
  }

  // get points generated per interval by fish tier
  getFishPointsPerInterval(tier: number): number {
    return this.BASE_POINTS_PER_FISH * Math.pow(this.POINTS_MULTIPLIER, tier - 1);
  }

  // time control methods
  increaseTimeSpeed(): void {
    if (this.timeSpeed < this.MAX_TIME_SPEED) {
      this.timeSpeed *= 2;
    }
  }

  decreaseTimeSpeed(): void {
    if (this.timeSpeed > 1) {
      this.timeSpeed /= 2;
    }
  }

  getFormattedAquariumTime(): string {
    if (!this.aquariumStartTime) return '00:00:00';
    const totalSeconds = Math.floor(this.currentAquariumTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  startAquariumTime(): void {
    if (!this.aquariumStartTime) {
      this.aquariumStartTime = Date.now();
      this.lastTimeUpdate = Date.now();
    }
  }

  isAquariumDirty(): boolean {
    // Aquarium is dirty if there are visible stains OR dirtLevel is above threshold
    return this.dirtStains.length > 10 || this.dirtLevel >= 1;
  }

  getDirtPenaltyPercent(): number {
    // Calculate penalty based on both dirtLevel AND visible stains
    const stainPenalty = Math.min(50, this.dirtStains.length / 3); // Up to 50% penalty from stains
    const levelPenalty = Math.min(0.75, this.dirtLevel / 100 * 0.75) * 100; // Up to 75% from level
    const totalPenalty = Math.min(75, Math.max(stainPenalty, levelPenalty)); // Take worse of both, cap at 75%
    return Math.round(totalPenalty);
  }

  showMessage(text: string, duration = 2000): void {
    this.messageText = text;
    this.messageVisible = true;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = window.setTimeout(() => {
      this.messageVisible = false;
    }, duration);
  }

  // removal mode (click to remove nearest decoration/plant)
  removeMode = false;
  selectedDecorationCategory: 'plants' | 'rocks' | 'coral' = 'plants';
  decorationPaletteVisible = false;
  fishPaletteVisible = false;
  placingPlant = false;
  selectedPlantType: string | null = null;
  placingFish = false;
  selectedFishType: string | null = null;

  // message display
  messageText = '';
  messageVisible = false;
  private messageTimeout?: number;

  // brush state
  brushActive = false;
  brushRadiusPx = 20;
  private lastBrushTime = 0;
  private isBrushing = false;
  // throttle brush spawn to avoid too many particles
  private lastSpawnFeedback = 0;

  // sponge cursor position (pixels)
  spongeX = 0;
  spongeY = 0;

  // dirt subscription (for future use)
  private dirtSubscription: any = null;

  ngOnInit(): void {
    // ensure transient UI flags are reset on start (do this before attaching listeners)
    this.inPhoneAuth = false;
    this.decorationPaletteVisible = false;
    this.placingPlant = false;
    // Check if user is already logged in from previous session
    this.checkExistingSession();
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
      // remove canvas listeners
      const canvas = this.canvasRef?.nativeElement;
      try { canvas?.removeEventListener('pointerdown', this.onCanvasPointerDown as EventListener); } catch {}
      try { canvas?.removeEventListener('pointermove', this.onCanvasPointerMove as EventListener); } catch {}
      try { canvas?.removeEventListener('pointerup', this.onCanvasPointerUp as EventListener); } catch {}
      try { canvas?.removeEventListener('pointercancel', this.onCanvasPointerUp as EventListener); } catch {}
      try { this.canvasRef?.nativeElement?.removeEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}
    } catch (e) {
      // ignore
    }

    try {
      if (this.dirtSubscription && typeof this.dirtSubscription.unsubscribe === 'function') this.dirtSubscription.unsubscribe();
    } catch (e) {}

    try { this.dirtService.stop(); } catch (e) {}
  }

  private createStarterFish(): void {
    // delegate to FishService and sync local reference
    this.fishService.createStarterFish();
    this.fish = this.fishService.fish;
  }

  private createStarterPlants(): void {
    this.plants = [
      { type: 'fern', nx: 0.1, ny: 0.8, scale: 1 },
      { type: 'anubias', nx: 0.7, ny: 0.9, scale: 1.1 },
      { type: 'moss', nx: 0.3, ny: 0.75, scale: 1 }
    ];
  }

  private handleResize = (): void => {
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) return;

    // Nur noch phone-screen container verwenden
    const container = canvas.closest('.phone-screen') as HTMLElement | null;

    if (container) {
      const rect = container.getBoundingClientRect();
      // Set canvas size to match phone screen
      canvas.width = Math.max(1, Math.floor(rect.width));
      canvas.height = Math.max(1, Math.floor(rect.height));
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    } else {
      canvas.width = 375; // fallback
      canvas.height = 667;
    }
  }

  private generatePreviews = (): void => {
    try {
      const w = 80; const h = 56;
      this.decorationService.decorationTypes.forEach(t => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d')!;
        g.clearRect(0, 0, w, h);
        // draw a small background hint
        g.fillStyle = 'rgba(0,0,0,0)';
        g.fillRect(0,0,w,h);
        const cx = w / 2; const cy = h / 2 + 6;
        if (t.category === 'plants') {
          if (t.id === 'fern') {
            g.fillStyle = t.color;
            for (let i = 0; i < 4; i++) {
              g.beginPath();
              g.ellipse(cx + (i - 1.5) * 4, cy, 4, 12 - i * 2, (i - 1) * 0.15, 0, Math.PI * 2);
              g.fill();
            }
          } else if (t.id === 'anubias') {
            g.fillStyle = t.color;
            for (let i = 0; i < 3; i++) {
              g.beginPath();
              g.ellipse(cx - 6 + i * 6, cy - i * 4, 10 - i * 2, 6 - i, -0.2 + i * 0.12, 0, Math.PI * 2);
              g.fill();
            }
          } else {
            g.fillStyle = t.color;
            for (let i = 0; i < 8; i++) {
              g.beginPath();
              g.arc(cx - 12 + i * 3.2, cy + (i % 2 === 0 ? 2 : 0), 1.6, 0, Math.PI * 2);
              g.fill();
            }
          }
        } else if (t.category === 'rocks') {
          g.fillStyle = t.color;
          for (let k = 0; k < 3; k++) {
            const offX = (k - 1) * 6;
            const rx = 10 + k * 3;
            const ry = 6 + k * 2;
            g.beginPath();
            g.ellipse(cx + offX, cy, rx, ry, (k - 1) * 0.1, 0, Math.PI * 2);
            g.fill();
          }
        } else if (t.category === 'coral') {
          g.strokeStyle = this.canvasService.darkenColor(t.color, 0.12);
          g.lineWidth = 2;
          g.beginPath();
          g.moveTo(cx, cy + 6);
          g.quadraticCurveTo(cx + 4, cy - 4, cx + 6, cy - 12);
          g.moveTo(cx, cy + 6);
          g.quadraticCurveTo(cx - 6, cy - 2, cx - 10, cy - 10);
          g.stroke();
          g.fillStyle = t.color;
          g.beginPath();
          g.arc(cx + 6, cy - 12, 3, 0, Math.PI * 2);
          g.fill();
        }
        this.previews[t.id] = c.toDataURL('image/png');
      });
    } catch (e) {
      // ignore in non-DOM environments
    }
  }

  private initializeAquarium(): void {
    const canvas = this.canvasRef.nativeElement;
    // initialize canvas in CanvasService (and keep local ctx reference)
    this.canvasService.initCanvas(canvas);

    // set default size and styles
    canvas.width = 800; canvas.height = 600; canvas.style.width = '100%'; canvas.style.height = '100%';

    this.particleService.initParticles(20, canvas.width, canvas.height);
    this.createStarterFish();
    this.createStarterPlants();

    // attach click handler
    try { canvas.addEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}

    // attach brush pointer handlers
    try {
      canvas.addEventListener('pointerdown', this.onCanvasPointerDown as EventListener);
      canvas.addEventListener('pointermove', this.onCanvasPointerMove as EventListener);
      canvas.addEventListener('pointerup', this.onCanvasPointerUp as EventListener);
      canvas.addEventListener('pointercancel', this.onCanvasPointerUp as EventListener);
    } catch (e) {}

    // Subscribe to dirt state updates to update local fields and trigger overlay rendering
    try {
      this.dirtSubscription = this.dirtService.state$.subscribe(s => {
        this.dirtLevel = s.dirtLevel;
        this.dirtLastUpdated = s.dirtLastUpdated;
        this.dirtStains = s.dirtStains;
        console.log(`📊 Dirt Update: Level=${this.dirtLevel.toFixed(1)}, Stains=${this.dirtStains.length}, Penalty=${this.getDirtPenaltyPercent()}%, Icon visible=${this.isAquariumDirty()}`);
      });
    } catch (e) {}

    // Add resize handler
    window.addEventListener('resize', this.handleResize);
    setTimeout(() => this.handleResize(), 100);

    // create small thumbnails used in palette
    try { this.generatePreviews(); } catch (e) { /* ignore */ }

    // Start time for existing aquariums with fish/decorations
    if (!this.aquariumStartTime && (this.fish.length > 0 || this.plants.length > 0 || this.decorations.length > 0)) {
      this.startAquariumTime();
    }

    this.animate();
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
    if (this.decorationPaletteVisible) { this.inPhoneAuth = false; this.inScreenMenu = false; this.placingPlant = false; this.placingFish = false; }
  }

  selectPlantType(id: string, source: 'desktop' | 'phone' = 'phone'): void {
    this.selectedPlantType = id; this.placingPlant = true; this.decorationPaletteVisible = false; try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  toggleFishPalette(): void { this.fishPaletteVisible = !this.fishPaletteVisible; if (this.fishPaletteVisible) { this.inPhoneAuth = false; this.inScreenMenu = false; this.decorationPaletteVisible = false; this.placingPlant = false; this.placingFish = false; } }

  selectFishType(id: string, source: 'desktop' | 'phone' = 'phone'): void { this.selectedFishType = id; this.placingFish = true; this.fishPaletteVisible = false; try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {} }

  cancelFishPlacing(): void { this.placingFish = false; this.selectedFishType = null; try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {} }

  debugAddFish(): void { const randomX = Math.random() * 600 + 100; const randomY = Math.random() * 400 + 100; this.addFish('goldfish', randomX, randomY); }

  cancelPlacing(): void {
    this.placingPlant = false;
    this.selectedPlantType = null;
    this.placingFish = false;
    this.selectedFishType = null;
    this.placingDecoration = false;
    this.selectedDecorationType = null;
    this.decorationPaletteVisible = false;
    this.fishPaletteVisible = false;
    try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  private addFish(type: string, x?: number, y?: number): void {
    const canvas = this.canvasRef.nativeElement;
    const canvasWidth = canvas.width || 800;
    const canvasHeight = canvas.height || 600;
    this.fishService.addFish(type, x, y, canvasWidth, canvasHeight);
    this.fish = this.fishService.fish;
  }

  private canvasClickHandler = (ev: PointerEvent) => {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const cssX = ((ev as any).clientX - rect.left);
    const cssY = ((ev as any).clientY - rect.top);

    // If not in remove mode or placing, check if user clicked on a fish to open info
    if (!this.placingFish && !this.placingPlant && !this.placingDecoration && !this.removeMode) {
      for (let i = this.fish.length - 1; i >= 0; i--) {
        const f = this.fish[i];
        const d = Math.hypot(f.x - cssX, f.y - cssY);
        if (d <= Math.max(16, f.size * 0.6)) {
          // open fish info
          this.openFishInfo(f);
          // stop event handling so placement logic doesn't also act
          return;
        }
      }
    }

    // If remove mode active, try to remove nearest decoration or plant
    if (this.removeMode) {
      const threshold = Math.max(16, Math.min(48, rect.width * 0.06));
      let removed = false;
      // check plants
      let nearestPlantIndex = -1;
      let nearestPlantDist = Infinity;
      this.plants.forEach((p, i) => {
        const px = (p.nx !== undefined) ? p.nx * rect.width : (p.x ?? 0);
        const py = (p.ny !== undefined) ? p.ny * rect.height : (p.y ?? 0);
        const d = Math.hypot(px - cssX, py - cssY);
        if (d < nearestPlantDist) { nearestPlantDist = d; nearestPlantIndex = i; }
      });
      if (nearestPlantIndex >= 0 && nearestPlantDist <= threshold) {
        this.plants.splice(nearestPlantIndex, 1);
        removed = true;
      }

      // check decorations if none removed yet
      if (!removed) {
        let nearestDecIndex = -1;
        let nearestDecDist = Infinity;
        this.decorations.forEach((d, i) => {
          const px = (d.nx !== undefined) ? d.nx * rect.width : (d.x ?? 0);
          const py = (d.ny !== undefined) ? d.ny * rect.height : (d.y ?? 0);
          const dist = Math.hypot(px - cssX, py - cssY);
          if (dist < nearestDecDist) { nearestDecDist = dist; nearestDecIndex = i; }
        });
        if (nearestDecIndex >= 0 && nearestDecDist <= threshold) {
          this.decorations.splice(nearestDecIndex, 1);
          removed = true;
        }
      }

      // check fish if none removed yet
      if (!removed) {
        let nearestFishIndex = -1;
        let nearestFishDist = Infinity;
        this.fish.forEach((f, i) => {
          const dist = Math.hypot(f.x - cssX, f.y - cssY);
          if (dist < nearestFishDist) { nearestFishDist = dist; nearestFishIndex = i; }
        });
        if (nearestFishIndex >= 0 && nearestFishDist <= threshold) {
          this.fish.splice(nearestFishIndex, 1);
          removed = true;
        }
      }

      return;
    }

    if (this.placingPlant && this.selectedPlantType) {
      // Check if enough points
      if (this.points < this.PLANT_COST) {
        this.showMessage(`Nicht genug Punkte! Pflanze kostet ${this.PLANT_COST} Punkte.`);
        return;
      }
      const nx = Math.max(0, Math.min(1, cssX / rect.width));
      const ny = Math.max(0, Math.min(1, cssY / rect.height));
      // Use plant type defaultScale so placed plants match palette size
      const plantDef = this.decorationService.plantTypes.find(pt => pt.id === this.selectedPlantType as string) as any;
      const scale = plantDef && plantDef.defaultScale ? plantDef.defaultScale : 1;
      this.plants.push({ type: this.selectedPlantType, nx, ny, scale });
      this.points -= this.PLANT_COST;
      this.startAquariumTime();
      this.placingPlant = false;
      this.selectedPlantType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    } else if (this.placingDecoration && this.selectedDecorationType) {
      // Check if enough points
      const cost = this.getDecorationCost(this.selectedDecorationType);
      if (this.points < cost) {
        this.showMessage(`Nicht genug Punkte! Dekoration kostet ${cost} Punkte.`);
        return;
      }
      const nx = Math.max(0, Math.min(1, cssX / rect.width));
      const ny = Math.max(0, Math.min(1, cssY / rect.height));
      // if the selected decoration is actually a plant id, keep using plants array for compatibility
      const isPlant = this.decorationService.plantTypes.find(p => p.id === this.selectedDecorationType);
      if (isPlant) {
        const plantDef = this.decorationService.plantTypes.find(pt => pt.id === this.selectedDecorationType as string) as any;
        const scale = plantDef && plantDef.defaultScale ? plantDef.defaultScale : 1;
        this.plants.push({ type: this.selectedDecorationType, nx, ny, scale: scale });
      } else {
        const decType = this.decorationService.decorationTypes.find(t => t.id === this.selectedDecorationType as string) as any;
        const scale = decType && decType.defaultScale ? decType.defaultScale : 1;
        this.decorations.push({ type: this.selectedDecorationType as string, nx, ny, scale: scale });
      }
      this.points -= cost;
      this.startAquariumTime();
      this.placingDecoration = false;
      this.selectedDecorationType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    } else if (this.placingFish && this.selectedFishType) {
      // Check if enough points
      const fishCost = this.getFishCost(this.selectedFishType);
      if (this.points < fishCost) {
        this.showMessage(`Nicht genug Punkte! Fisch kostet ${fishCost} Punkte.`);
        return;
      }
      this.addFish(this.selectedFishType, cssX, cssY);
      this.points -= fishCost;
      this.startAquariumTime();
      this.placingFish = false;
      this.selectedFishType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    }
  }

  private mouseMoveHandler = (ev: PointerEvent) => {
    if (!this.placingPlant && !this.placingFish && !this.placingDecoration) return;
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

  selectDecorationType(id: string, source: 'desktop' | 'phone' = 'phone'): void {
    this.selectedDecorationType = id;
    this.placingDecoration = true;
    this.decorationPaletteVisible = false;
    try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  toggleRemoveMode(): void {
    this.removeMode = !this.removeMode;
    if (this.removeMode) {
      // when entering remove mode, close other overlays
      this.inScreenMenu = false;
      this.decorationPaletteVisible = false;
      this.fishPaletteVisible = false;
    }
    console.log('Remove mode:', this.removeMode);
  }

  decorationTypesFor(category: string) {
    return this.decorationService.decorationTypes.filter(d => d.category === category);
  }





  async checkExistingSession(): Promise<void> {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        this.currentUser = user.user_metadata['username'] || user.email?.split('@')[0] || 'Benutzer';
        this.currentUserId = user.id;
        await this.loadUserState();
        console.log('Auto-logged in:', this.currentUser);
      }
    } catch (e) {
      console.log('No existing session');
    }
  }

  async register(): Promise<void> {
    if (!this.authEmail || !this.authName || !this.authPass) {
      alert('Bitte fülle alle Felder aus');
      return;
    }
    try {
      const data = await this.supabaseService.signUp(this.authEmail, this.authPass, this.authName);
      alert('Registrierung erfolgreich! Bitte überprüfe deine E-Mail um dein Konto zu bestätigen.');
      this.authEmail = '';
      this.authName = '';
      this.authPass = '';
    } catch (e: any) {
      alert('Registrierung fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler'));
    }
  }

  async login(): Promise<void> {
    if (!this.authName || !this.authPass) {
      alert('Bitte fülle Benutzername und Passwort aus');
      return;
    }
    try {
      console.log('Login attempt for username:', this.authName);

      // Get email by username
      const email = await this.supabaseService.getEmailByUsername(this.authName);
      if (!email) {
        alert('Benutzername nicht gefunden');
        this.authPass = ''; // Clear password on error
        return;
      }

      console.log('Found email for username, attempting sign in...');
      const data = await this.supabaseService.signIn(email, this.authPass);
      const user = data.user;
      if (!user) {
        alert('Anmeldung fehlgeschlagen: Kein Benutzer gefunden');
        this.authPass = '';
        return;
      }

      console.log('Login successful, user:', user.id);
      this.currentUser = user.user_metadata['username'] || user.email?.split('@')[0] || 'Benutzer';
      this.currentUserId = user.id;
      this.authName = '';
      this.authPass = '';
      await this.loadUserState();
      this.closePhoneAuth();
    } catch (e: any) {
      console.error('Login error:', e);
      alert('Anmeldung fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler'));
      this.authPass = ''; // Clear password on error
    }
  }

  async logout(): Promise<void> {
    console.log('Logging out...');
    try {
      await this.supabaseService.signOut();
      console.log('Supabase signOut successful');
    } catch (e: any) {
      console.error('Logout error:', e);
    }

    // Always clear local state regardless of Supabase result
    this.currentUser = null;
    this.currentUserId = null;
    this.authName = '';
    this.authPass = '';
    this.authEmail = '';

    // Reset aquarium to default state
    this.lightIntensity = 1;
    try { this.particleService.setParticles([]); } catch (e) {}
    this.plants = [];
    this.fish = [];
    try { this.fishService.fish = []; } catch (e) {}
    this.decorations = [];
    this.createWaterParticles();

    console.log('Local state cleared, logout complete');
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

  async saveUserState(): Promise<void> {
    if (!this.currentUserId) {
      alert('Du musst angemeldet sein um zu speichern.');
      return;
    }
    
    // Debounce: prevent saving too frequently
    const now = Date.now();
    if (now - this.lastSaveTime < this.MIN_SAVE_INTERVAL_MS) {
      console.log('Save skipped - too soon since last save');
      return;
    }
    this.lastSaveTime = now;
    
    console.log('Saving user state for user:', this.currentUserId);
    try {
      const state = {
        lightIntensity: this.lightIntensity,
        particles: this.particleService.getParticles(),
        plants: this.plants,
        fish: this.fish,
        decorations: this.decorations,
        points: this.points,
        aquariumStartTime: this.aquariumStartTime,
        currentAquariumTime: this.currentAquariumTime,
        timeSpeed: this.timeSpeed,
        // persist dirt state as part of the aquarium JSON
        dirtLevel: this.dirtLevel,
        dirtLastUpdated: this.dirtLastUpdated,
        dirtStains: this.dirtStains
      };
      console.log('State to save:', state);
      await this.supabaseService.saveAquariumState(this.currentUserId, state);
      console.log('Save successful!');
      alert('Dein Aquarium wurde in der Cloud gespeichert! 🐠');
    } catch (e: any) {
      console.error('Save error:', e);
      // Don't show alert for NavigatorLock errors - they're harmless
      if (e.message && !e.message.includes('NavigatorLock')) {
        alert('Speichern fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler'));
      } else {
        console.warn('NavigatorLock error ignored - save may have succeeded');
        alert('Aquarium gespeichert! 🌊');
      }
    }
  }

  async loadUserState(): Promise<void> {
    if (!this.currentUserId) {
      console.log('loadUserState: No currentUserId, skipping');
      return;
    }
    console.log('Loading user state for user:', this.currentUserId);
    try {
      const state = await this.supabaseService.loadAquariumState(this.currentUserId);
      console.log('Loaded state from cloud:', state);
      if (state) {
        if (state.lightIntensity !== undefined) this.lightIntensity = state.lightIntensity;
        if (Array.isArray(state.particles)) this.particleService.setParticles(state.particles);
        if (Array.isArray(state.plants)) this.plants = state.plants;
        if (Array.isArray(state.fish)) {
          this.fish = state.fish;
          // keep fish service in sync
          try { this.fishService.fish = this.fish; } catch (e) {}
        }
        if (Array.isArray(state.decorations)) this.decorations = state.decorations;
        if (state.points !== undefined) this.points = state.points;

        // load time state if present
        if (state.aquariumStartTime !== undefined) this.aquariumStartTime = state.aquariumStartTime;
        if (state.currentAquariumTime !== undefined) this.currentAquariumTime = state.currentAquariumTime;
        if (state.timeSpeed !== undefined) this.timeSpeed = state.timeSpeed;
        this.lastTimeUpdate = Date.now(); // reset to current time for delta calculation

        // load dirt state if present
        if (state.dirtLevel !== undefined) this.dirtLevel = state.dirtLevel;
        if (state.dirtLastUpdated !== undefined) this.dirtLastUpdated = state.dirtLastUpdated;
        if (Array.isArray(state.dirtStains)) this.dirtStains = state.dirtStains;
        console.log(`🔄 Dirt State geladen: Level=${this.dirtLevel.toFixed(1)}, Stains=${this.dirtStains.length}`);

        // start dirt service with loaded state
        try {
          if (this.currentUserId) {
            // use configured passive tick interval so dirt accumulation rate is tunable
            this.dirtService.start(this.currentUserId, { dirtLevel: this.dirtLevel, dirtLastUpdated: this.dirtLastUpdated, dirtStains: this.dirtStains }, this.DIRT_PASSIVE_TICK_SEC);
          }
        } catch (e) { console.warn('Failed to start DirtService', e); }

        console.log('Aquarium state loaded from cloud! 🌊');
      } else {
        console.log('No saved state found in cloud');
      }
    } catch (e: any) {
      console.warn('Failed to load user state:', e.message);
    }
  }

  private updateFish(): void {
    const canvas = this.canvasRef.nativeElement;
    const now = Date.now();

    // Use canvas actual dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // delegate heavy logic to fishService which mutates this.fish in place
    this.fishService.updateFish(this.fish, this.particleService.getParticles(), this.fishService.fishTypes, canvasWidth, canvasHeight, this.timeSpeed, this.dirtStains);
  }

  private animate(): void {
    if (!this.isRunning) return;

    // Update aquarium time if started
    if (this.aquariumStartTime) {
      const now = Date.now();
      const deltaTime = now - this.lastTimeUpdate;
      this.currentAquariumTime += deltaTime * this.timeSpeed;
      this.lastTimeUpdate = now;
    }

    const canvas = this.canvasRef.nativeElement;
    // clear via service context
    this.canvasService.getContext()?.clearRect(0, 0, canvas.width, canvas.height);

    // Animationen zeichnen (delegated to CanvasService)
    this.canvasService.drawWaterBackground();
    this.canvasService.drawCausticEffect(this.waveOffset);
    this.canvasService.drawWaterParticles(this.particleService.getParticles());
    // draw non-plant decorations (stones, corals)
    this.canvasService.drawDecorations(this.decorations, this.decorationService.decorationTypes, this.waveOffset);
    // draw user-placed plants
    this.canvasService.drawPlants(this.plants, this.decorationService.plantTypes, this.waveOffset);
    // update and draw fish
    this.updateFish();
    this.canvasService.drawFish(this.fish);

    // draw dirt effects (turbidity overlay) and visible stains on glass
    try {
      this.canvasService.drawDirtOverlay(this.dirtLevel);
      this.canvasService.drawStains(this.dirtStains);
    } catch (e) {
      // ignore rendering errors
    }

    // Passive point generation from fish
    this.generatePointsFromFish();

    // Passive cleaning from cleaner fish and plants
    this.applyPassiveCleaning();

    // draw surface waves and light via service
    this.canvasService.drawSurfaceWaves(this.waveOffset);
    this.canvasService.drawLightEffect(this.lightIntensity);

    this.waveOffset += 0.03;
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private generatePointsFromFish(): void {
    const now = Date.now();
    this.fish.forEach(fish => {
      // Skip dead fish
      if (fish.isDead) return;

      // Initialize timestamp if not set
      if (!fish.lastPointsGenerated) {
        fish.lastPointsGenerated = now;
        return;
      }

      // Check if interval has passed (scaled by time speed)
      const scaledInterval = this.POINTS_PER_FISH_INTERVAL / this.timeSpeed;
      if (now - fish.lastPointsGenerated >= scaledInterval) {
        // Get fish tier to calculate points
        const fishType = this.fishService.fishTypes.find(f => f.id === fish.type);
        const tier = fishType?.tier || 1;
        let pointsToAdd = this.getFishPointsPerInterval(tier);

        // Apply dirt penalty: dirty aquarium reduces points by up to 75%
        // dirtLevel ranges from 0 (clean) to 100 (very dirty)
        // Penalty scales from 0% at dirtLevel=0 to 75% at dirtLevel=100
        const dirtPenalty = Math.min(0.75, this.dirtLevel / 100 * 0.75);
        const pointsAfterPenalty = Math.round(pointsToAdd * (1 - dirtPenalty));
        
        this.points += pointsAfterPenalty;
        // track on-fish earned points
        fish.pointsEarned = (fish.pointsEarned || 0) + pointsAfterPenalty;
        fish.lastPointsGenerated = now;

        // Visual feedback with penalty info
        if (dirtPenalty > 0.1) {
          console.log(`+${pointsAfterPenalty} Punkte von ${fishType?.name || 'Fisch'} (${pointsToAdd} - ${Math.round(dirtPenalty * 100)}% Schmutz-Penalty)`);
        } else {
          console.log(`+${pointsAfterPenalty} Punkte von ${fishType?.name || 'Fisch'}!`);
        }
      }
    });
  }

  private applyPassiveCleaning(): void {
    const now = Date.now();
    
    // Initialize timestamp on first call
    if (!this.lastCleaningUpdate) {
      this.lastCleaningUpdate = now;
      return;
    }

    // Calculate time elapsed since last cleaning update (in seconds, scaled by timeSpeed)
    const deltaSeconds = ((now - this.lastCleaningUpdate) / 1000) * this.timeSpeed;
    this.lastCleaningUpdate = now;

    // Skip if delta too small to avoid tiny updates
    if (deltaSeconds < 0.01) return;

    const canvas = this.canvasRef.nativeElement;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Active cleaning by cleaner fish - they clean like the brush/sponge as they swim
    const cleaningThrottle = 50; // Spawn bubbles every 50ms for continuous stream
    this.fish.forEach(fish => {
      if (fish.isCleanerFish && !fish.isDead) {
        // Convert fish position to normalized coordinates
        const nx = fish.x / canvasWidth;
        const ny = fish.y / canvasHeight;
        const cleanRadiusPx = fish.size * 2.5; // Good cleaning radius
        
        // Use the same cleanArea method as the brush for consistent cleaning
        const cleaned = this.dirtService.cleanArea(nx, ny, cleanRadiusPx, canvasWidth, canvasHeight, 0.25, deltaSeconds);
        
        // Always spawn LOTS of bubbles for cleaner fish like sponge!
        const nowMs = Date.now();
        if (!fish.lastCleaningParticles || nowMs - fish.lastCleaningParticles > cleaningThrottle) {
          fish.lastCleaningParticles = nowMs;
          // Spawn many bubbles like sponge brush
          this.particleService.spawnCleaningParticles(fish.x, fish.y, 8);
        }
        
        // Log when cleaning happens
        if (cleaned > 0.01) {
          console.log(`🧹 Putzfisch reinigt! Position: (${Math.round(fish.x)}, ${Math.round(fish.y)}), Schmutz: ${(cleaned * 100).toFixed(2)}%, Stains: ${this.dirtStains.length}, DirtLevel: ${this.dirtLevel.toFixed(1)}`);
        }
      }
    });

    // Passive cleaning from plants
    const plantCleaning = this.plants.length * this.PLANT_CLEANING_RATE * deltaSeconds;
    if (plantCleaning > 0 && this.dirtLevel > 0) {
      this.dirtLevel = Math.max(0, this.dirtLevel - plantCleaning);
      
      // Plants occasionally remove random stains
      if (this.dirtStains.length > 0 && Math.random() < 0.03) {
        const randomIndex = Math.floor(Math.random() * this.dirtStains.length);
        this.dirtStains.splice(randomIndex, 1);
      }
    }
  }

  // Button Event Handlers
  feedFish(): void {
    // Check if enough points
    if (this.points < this.FEED_COST) {
      this.showMessage(`Nicht genug Punkte! Füttern kostet ${this.FEED_COST} Punkte.`);
      return;
    }
    console.log('🐟 Fische werden gefüttert!');

    // delegate to particleService
    this.particleService.addFeedBurst(10, 50, 750);
    this.points -= this.FEED_COST;

    // spawn some stains where feed will land (randomized across the width, just under surface)
    try {
      const canvas = this.canvasRef.nativeElement;
      // spawn stains across aquarium area using configured paddings and count
      for (let i = 0; i < this.FEED_STAIN_COUNT; i++) {
        const nx = this.FEED_STAIN_HORIZONTAL_PADDING + Math.random() * (1 - this.FEED_STAIN_HORIZONTAL_PADDING * 2);
        const ny = this.FEED_STAIN_VERTICAL_PADDING + Math.random() * (1 - this.FEED_STAIN_VERTICAL_PADDING * 2);
        this.dirtService.spawnStainsAt(nx, ny, 1);
      }
      // apply a configurable global dirt influence from feeding
      this.dirtService.applyFishInfluence(this.fish.length, this.DIRT_FEED_MULTIPLIER, this.DIRT_PER_FISH_INFLUENCE);
    } catch (e) {
      console.warn('Failed to spawn stains/apply dirt influence on feed', e);
    }
  }

  toggleBrush(): void {
    this.brushActive = !this.brushActive;
    const canvas = this.canvasRef?.nativeElement;
    try {
      if (canvas) {
        canvas.style.cursor = this.brushActive ? 'none' : '';
      }
    } catch (e) {}
    if (this.brushActive) this.showMessage('Reinigungsbürste aktiviert');
    else this.showMessage('Reinigungsbürste deaktiviert');
  }

  toggleLight(): void {
    console.log('💡 Licht umgeschaltet!');
    this.lightIntensity = this.lightIntensity > 0.5 ? 0.2 : 1.5;
  }

  cleanAquarium(): void {
    console.log('🧽 Aquarium wird gereinigt!');

    // delegate to particleService
    const canvas = this.canvasRef.nativeElement;
    this.particleService.cleanAndPopulate(8, canvas.width, canvas.height);
  }

  private createWaterParticles(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (canvas) this.particleService.initParticles(20, canvas.width, canvas.height);
  }

  private onCanvasPointerDown = (ev: PointerEvent) => {
    if (!this.brushActive) return;
    this.isBrushing = true;
    this.lastBrushTime = Date.now();
    // update sponge position
    try {
      const canvas = this.canvasRef.nativeElement;
      const rect = canvas.getBoundingClientRect();
      this.spongeX = Math.max(0, Math.min(rect.width, (ev as any).clientX - rect.left));
      this.spongeY = Math.max(0, Math.min(rect.height, (ev as any).clientY - rect.top));
    } catch (e) {}
    this.handleBrushEvent(ev);
  };

  private onCanvasPointerMove = (ev: PointerEvent) => {
    // update sponge position whenever brush is active
    if (this.brushActive) {
      try {
        const canvas = this.canvasRef.nativeElement;
        const rect = canvas.getBoundingClientRect();
        this.spongeX = Math.max(0, Math.min(rect.width, (ev as any).clientX - rect.left));
        this.spongeY = Math.max(0, Math.min(rect.height, (ev as any).clientY - rect.top));
      } catch (e) {}
    }

    if (!this.isBrushing) return;
    this.handleBrushEvent(ev);
  };

  private onCanvasPointerUp = (_ev: PointerEvent) => {
    if (!this.isBrushing) return;
    this.isBrushing = false;
  };

  private handleBrushEvent(ev: PointerEvent) {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const cssX = (ev as any).clientX - rect.left;
    const cssY = (ev as any).clientY - rect.top;
    // update sponge position as well
    this.spongeX = Math.max(0, Math.min(rect.width, cssX));
    this.spongeY = Math.max(0, Math.min(rect.height, cssY));

    // normalized
    const nx = Math.max(0, Math.min(1, cssX / rect.width));
    const ny = Math.max(0, Math.min(1, cssY / rect.height));
    const now = Date.now();
    const dtSec = Math.min(0.1, Math.max(0.001, (now - this.lastBrushTime) / 1000));
    this.lastBrushTime = now;
    try {
      const cleaned = this.dirtService.cleanArea(nx, ny, this.brushRadiusPx, canvas.width, canvas.height, 0.9, dtSec);
      if (cleaned > 0) {
        // spawn small cleaning particles for feedback (throttled)
        const nowMs = Date.now();
        if (nowMs - this.lastSpawnFeedback > 80) {
          this.lastSpawnFeedback = nowMs;
          // spawn at sponge position in pixel coords
          this.particleService.spawnCleaningParticles(this.spongeX, this.spongeY, 2);
        }
      }
    } catch (e) {
      console.warn('Brush clean failed', e);
    }
  }

  openFishInfo(fish: FishInstance) {
    this.selectedFish = fish;
    this.selectedFishNameInput = fish.name || '';
    this.updateSelectedFishAge();
    // update age text every minute while modal open
    try { this.selectedFishAgeInterval = window.setInterval(() => this.updateSelectedFishAge(), 60_000) as unknown as number; } catch (e) {}
  }

  closeFishInfo() {
    this.selectedFish = null;
    this.selectedFishNameInput = '';
    this.selectedFishAgeText = '';
    if (this.selectedFishAgeInterval) { try { clearInterval(this.selectedFishAgeInterval); } catch (e) {} this.selectedFishAgeInterval = undefined; }
  }

  async saveFishName() {
    if (!this.selectedFish) return;
    this.selectedFish.name = this.selectedFishNameInput.trim() || this.selectedFish.name;
    // auto-save silently (no alert). If user not logged in, keep change local only.
    try { await this.saveUserStateSilent(); } catch (e) { console.warn('Auto-save (silent) after rename failed', e); }
  }

  private updateSelectedFishAge() {
    if (!this.selectedFish || !this.selectedFish.birthTime) {
      this.selectedFishAgeText = 'Unbekannt';
      return;
    }
    const ms = Date.now() - this.selectedFish.birthTime;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) this.selectedFishAgeText = `${days}d ${hours}h`;
    else if (hours > 0) this.selectedFishAgeText = `${hours}h ${mins}m`;
    else this.selectedFishAgeText = `${mins}m`;
  }

  private async saveUserStateSilent(): Promise<void> {
    if (!this.currentUserId) {
      // not logged in - keep changes local
      return;
    }
    
    // Debounce: prevent saving too frequently
    const now = Date.now();
    if (now - this.lastSaveTime < this.MIN_SAVE_INTERVAL_MS) {
      return; // Skip silent save if too soon
    }
    this.lastSaveTime = now;
    
    try {
      const state = {
        lightIntensity: this.lightIntensity,
        particles: this.particleService.getParticles(),
        plants: this.plants,
        fish: this.fish,
        decorations: this.decorations,
        points: this.points,
        aquariumStartTime: this.aquariumStartTime,
        currentAquariumTime: this.currentAquariumTime,
        timeSpeed: this.timeSpeed,
        dirtLevel: this.dirtLevel,
        dirtLastUpdated: this.dirtLastUpdated,
        dirtStains: this.dirtStains
      };
      await this.supabaseService.saveAquariumState(this.currentUserId, state);
    } catch (e) {
      console.warn('silent save failed', e);
    }
  }
}
