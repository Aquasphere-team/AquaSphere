import { Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-aquarium',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aquarium.component.html',
  styleUrls: ['./aquarium.component.css']
})
export class AquariumComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('aquariumCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  constructor(private supabaseService: SupabaseService) {}

  private ctx!: CanvasRenderingContext2D;
  private particles: any[] = [];
  private waveOffset = 0;
  private lightIntensity = 1;
  private animationId?: number;
  private isRunning = true;
  phonePreview = true; // Handy-Version als Standard
  // auth state
  inScreenMenu = false;
  authEmail = '';
  authName = '';
  authPass = '';
  currentUser: string | null = null;
  currentUserId: string | null = null;
  inPhoneAuth = false;
  showRegister = false; // Toggle between login and register forms
  // decoration / plants
  plantTypes = [
    { id: 'fern', name: 'Farn', color: '#1b8a36', defaultScale: 1 },
    // Increase defaults so Anubias and Moss are more visible
    { id: 'anubias', name: 'Anubias', color: '#0f7a4a', defaultScale: 1.9 },
    { id: 'moss', name: 'Moos', color: '#2fa84f', defaultScale: 1.6 }
  ];

  // additional decoration types (stones, corals)
  decorationTypes = [
    { id: 'fern', category: 'plants', name: 'Farn', color: '#1b8a36', defaultScale: 1 },
    { id: 'anubias', category: 'plants', name: 'Anubias', color: '#0f7a4a', defaultScale: 1.1 },
    { id: 'moss', category: 'plants', name: 'Moos', color: '#2fa84f', defaultScale: 0.8 },
    { id: 'stone_small', category: 'rocks', name: 'Kleiner Stein', color: '#9e9e9e', defaultScale: 0.8 },
    { id: 'stone_big', category: 'rocks', name: 'Großer Stein', color: '#6b6b6b', defaultScale: 1.6 },
    { id: 'coral_red', category: 'coral', name: 'Koralle (rot)', color: '#ff6b6b', defaultScale: 1 },
    { id: 'coral_orange', category: 'coral', name: 'Koralle (orange)', color: '#ff9f43', defaultScale: 0.95 }
  ];

  // store for non-plant decorations (stones, corals)
  decorations: Array<{ type: string; nx?: number; ny?: number; x?: number; y?: number; scale?: number }> = [];

  // previews for decoration thumbnails
  previews: Record<string, string> = {};

  // placement state for decorations
  placingDecoration = false;
  selectedDecorationType: string | null = null;

  // removal mode (click to remove nearest decoration/plant)
  removeMode = false;
  selectedDecorationCategory: 'plants' | 'rocks' | 'coral' = 'plants';

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
      // remove canvas click listener if attached
      try { this.canvasRef?.nativeElement?.removeEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}
    } catch (e) {
      // ignore
    }
  }

  private createStarterFish(): void {
    // Create a few visible starter fish
    this.fish = [];
    this.fish.push({ id: 'starter1', type: 'goldfish', x: 200, y: 300, speedX: 1, speedY: 0.5, direction: 0, isFeeding: false, hunger: 50, lastFeedTime: Date.now(), size: 25, color: '#FFD700' });
    this.fish.push({ id: 'starter2', type: 'bluefish', x: 500, y: 200, speedX: -1, speedY: 0.3, direction: Math.PI, isFeeding: false, hunger: 60, lastFeedTime: Date.now(), size: 20, color: '#4169E1' });
    this.fish.push({ id: 'starter3', type: 'redfish', x: 350, y: 450, speedX: 0.5, speedY: -0.8, direction: Math.PI / 2, isFeeding: false, hunger: 40, lastFeedTime: Date.now(), size: 18, color: '#DC143C' });
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
    const container = canvas.closest('.phone-screen') as HTMLElement;

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

  private generatePreviews(): void {
    try {
      const w = 80; const h = 56;
      this.decorationTypes.forEach(t => {
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
          g.strokeStyle = this.darkenColor(t.color, 0.12);
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

    // create small thumbnails used in palette
    try { this.generatePreviews(); } catch (e) { /* ignore */ }

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

      if (removed) {
        // Removed auto-save - use manual save button instead
      }
      return;
    }

    if (this.placingPlant && this.selectedPlantType) {
      const nx = Math.max(0, Math.min(1, cssX / rect.width));
      const ny = Math.max(0, Math.min(1, cssY / rect.height));
      // Use plant type defaultScale so placed plants match palette size
      const plantDef = this.plantTypes.find(pt => pt.id === this.selectedPlantType as string) as any;
      const scale = plantDef && plantDef.defaultScale ? plantDef.defaultScale : 1;
      this.plants.push({ type: this.selectedPlantType, nx, ny, scale });
      this.placingPlant = false;
      this.selectedPlantType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
      // Removed auto-save - use manual save button instead
    } else if (this.placingDecoration && this.selectedDecorationType) {
      const nx = Math.max(0, Math.min(1, cssX / rect.width));
      const ny = Math.max(0, Math.min(1, cssY / rect.height));
      // if the selected decoration is actually a plant id, keep using plants array for compatibility
      const isPlant = this.plantTypes.find(p => p.id === this.selectedDecorationType);
      if (isPlant) {
        const plantDef = this.plantTypes.find(pt => pt.id === this.selectedDecorationType as string) as any;
        const scale = plantDef && plantDef.defaultScale ? plantDef.defaultScale : 1;
        this.plants.push({ type: this.selectedDecorationType, nx, ny, scale: scale });
      } else {
        const decType = this.decorationTypes.find(t => t.id === this.selectedDecorationType as string) as any;
        const scale = decType && decType.defaultScale ? decType.defaultScale : 1;
        this.decorations.push({ type: this.selectedDecorationType as string, nx, ny, scale: scale });
      }
      this.placingDecoration = false;
      this.selectedDecorationType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
      // Removed auto-save - use manual save button instead
    } else if (this.placingFish && this.selectedFishType) {
      this.addFish(this.selectedFishType, cssX, cssY);
      this.placingFish = false;
      this.selectedFishType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
      // Removed auto-save - use manual save button instead
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
    console.log('Select decoration:', id, 'source:', source);
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
    return this.decorationTypes.filter(d => d.category === category);
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

  // --- Authentication (Supabase cloud backend) ---
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
    this.particles = [];
    this.plants = [];
    this.fish = [];
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
    console.log('Saving user state for user:', this.currentUserId);
    try {
      const state = {
        lightIntensity: this.lightIntensity,
        particles: this.particles,
        plants: this.plants,
        fish: this.fish,
        decorations: this.decorations
      };
      console.log('State to save:', state);
      await this.supabaseService.saveAquariumState(this.currentUserId, state);
      console.log('Save successful!');
      alert('Dein Aquarium wurde in der Cloud gespeichert! 🐠');
    } catch (e: any) {
      console.error('Save error:', e);
      alert('Speichern fehlgeschlagen: ' + (e.message || 'Unbekannter Fehler'));
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
        if (Array.isArray(state.particles)) this.particles = state.particles;
        if (Array.isArray(state.plants)) this.plants = state.plants;
        if (Array.isArray(state.fish)) this.fish = state.fish;
        if (Array.isArray(state.decorations)) this.decorations = state.decorations;
        console.log('Aquarium state loaded from cloud! 🌊');
      } else {
        console.log('No saved state found in cloud');
      }
    } catch (e: any) {
      console.warn('Failed to load user state:', e.message);
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
      const baseSize = Math.max(12, Math.min(64, rect.width * 0.04));
  const size = (p.scale || 1) * baseSize * (type && (type as any).defaultScale ? (type as any).defaultScale : 1);

      // draw based on plant type
      this.ctx.save();
      this.ctx.translate(px, py);
      if (p.type === 'fern') {
        // tall fern with multiple fronds
        // stem
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.darkenColor(color, 0.18);
        this.ctx.lineWidth = Math.max(2, size * 0.06);
        this.ctx.moveTo(0, 6);
        this.ctx.lineTo(0, -size * 0.9);
        this.ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const length = size * (0.7 + i * 0.18);
          const sway = Math.sin(this.waveOffset * 1.2 + i) * (3 + i * 1.6);
          for (let j = 0; j < 8; j++) {
            const y = - (j / 8) * length;
            const x = sway + Math.sin(j * 0.6 + this.waveOffset) * (5 + i);
            const leafW = size * (0.14 + i * 0.02);
            const leafH = length * 0.08;
            const g = this.ctx.createLinearGradient(x - leafW, y - leafH, x + leafW, y + leafH);
            g.addColorStop(0, this.darkenColor(color, 0.05));
            g.addColorStop(1, color);
            this.ctx.beginPath();
            this.ctx.fillStyle = g;
            this.ctx.globalAlpha = 0.95 - j * 0.08;
            this.ctx.ellipse(x, y, leafW, leafH, (j - 3) * 0.12, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      } else if (p.type === 'anubias') {
        // broad layered leaves close to stem
        const leaves = 4;
        // small central stem
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.darkenColor(color, 0.16);
        this.ctx.lineWidth = Math.max(1.5, size * 0.04);
        this.ctx.moveTo(0, 6);
        this.ctx.lineTo(0, -size * 0.5);
        this.ctx.stroke();

        for (let i = 0; i < leaves; i++) {
          const angle = (i - (leaves / 2)) * 0.25;
          const lx = Math.cos(angle) * size * 0.08;
          const ly = -i * (size * 0.12);
          const leafW = size * 0.36;
          const leafH = size * 0.18;
          const g = this.ctx.createLinearGradient(lx - leafW, ly - leafH, lx + leafW, ly + leafH);
          g.addColorStop(0, this.darkenColor(color, 0.06));
          g.addColorStop(1, color);
          this.ctx.beginPath();
          this.ctx.fillStyle = g;
          this.ctx.globalAlpha = 0.95 - i * 0.12;
          this.ctx.ellipse(lx, ly, leafW, leafH, angle, 0, Math.PI * 2);
          this.ctx.fill();

          // central vein
          this.ctx.beginPath();
          this.ctx.strokeStyle = this.darkenColor(color, 0.28);
          this.ctx.lineWidth = Math.max(0.8, size * 0.02);
          this.ctx.moveTo(lx - leafW * 0.2, ly + leafH * 0.1);
          this.ctx.lineTo(lx + leafW * 0.2, ly - leafH * 0.4);
          this.ctx.stroke();
        }
      } else if (p.type === 'moss') {
        // low moss cluster: many small tufts, slightly denser and layered
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
            this.ctx.beginPath();
            this.ctx.fillStyle = this.darkenColor(color, 0.02 + layer * 0.03);
            this.ctx.globalAlpha = 0.85 - (layer * 0.08);
            this.ctx.arc(rx, ry, r, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      } else {
        // fallback: generic leaves
        for (let i = 0; i < 5; i++) {
          this.ctx.beginPath();
          this.ctx.fillStyle = color;
          this.ctx.globalAlpha = 0.9 - i * 0.12;
          const sway = Math.sin((this.waveOffset + i) * 1.2) * (4 + i);
          this.ctx.ellipse(sway, -i * (size * 0.25), size * 0.18, size * 0.5, (i - 2) * 0.15, 0, Math.PI * 2);
          this.ctx.fill();
        }
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

  private lightenColor(color: string, factor: number): string {
    // Simple color lightening by blending towards white
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

  private animate(): void {
    if (!this.isRunning) return;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Animationen zeichnen
    this.drawWaterBackground();
    this.drawCausticEffect();
    this.drawWaterParticles();
    // draw non-plant decorations (stones, corals)
    this.drawDecorations();
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

  private drawDecorations(): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const seedFrom = (d: any) => {
      const typeHash = d.type.split('').reduce((s: number, c: string) => s + c.charCodeAt(0), 0);
      return Math.floor(((d.nx || 0) * 1000) + ((d.ny || 0) * 10000) + typeHash * 7);
    };
    const rand = (s: number) => {
      const v = Math.sin(s) * 10000;
      return v - Math.floor(v);
    };

    this.decorations.forEach(d => {
      if ((d as any).x !== undefined && (d as any).y !== undefined && (d.nx === undefined || d.ny === undefined)) {
        d.nx = ((d as any).x) / rect.width;
        d.ny = ((d as any).y) / rect.height;
      }
      const px = (d.nx !== undefined) ? d.nx * rect.width : (d.x ?? 0);
      const py = (d.ny !== undefined) ? d.ny * rect.height : (d.y ?? 0);
      const type = this.decorationTypes.find(t => t.id === d.type);
      const color = type ? type.color : '#888';

      const seed = seedFrom(d);

      this.ctx.save();
      if (d.type.startsWith('stone')) {
        const base = rect.width * 0.04 * (d.scale || 1);
        const noise = (Math.sin(px * 0.01) + Math.cos(py * 0.01)) * 0.12;
        const size = Math.max(6, base * (0.9 + noise));

        for (let k = 0; k < 3; k++) {
          const offX = (rand(seed + k * 11) - 0.5) * size * 0.36;
          const offY = (rand(seed + k * 23) - 0.5) * size * 0.22;
          const rx = size * (0.95 + k * 0.22);
          const ry = size * (0.62 + k * 0.18);

          const g = this.ctx.createRadialGradient(px + offX - rx * 0.18, py + offY - ry * 0.18, 0, px + offX, py + offY, Math.max(rx, ry) * 1.5);
          g.addColorStop(0, this.lightenColor(color, 0.06));
          g.addColorStop(1, this.darkenColor(color, 0.22));

          this.ctx.beginPath();
          this.ctx.fillStyle = g;
          this.ctx.ellipse(px + offX, py + offY, rx, ry, (k - 1) * 0.18, 0, Math.PI * 2);
          this.ctx.fill();
        }

        this.ctx.globalAlpha = 0.18;
        this.ctx.fillStyle = 'rgba(0,0,0,0.36)';
        this.ctx.beginPath();
        this.ctx.ellipse(px, py + size * 0.6, size * 1.15, size * 0.42, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;

      } else if (d.type.startsWith('coral')) {
        const size = Math.max(12, rect.width * 0.045 * (d.scale || 1));
        const branches = 3 + Math.floor((d.scale || 1) * 2);
        const strokeColor = this.darkenColor(color, 0.12);

        for (let b = 0; b < branches; b++) {
          const angleBase = (b - (branches - 1) / 2) * 0.45;
          const angleJitter = (rand(seed + b * 13) - 0.5) * 0.12;
          const angle = angleBase + angleJitter + Math.sin(this.waveOffset * 0.12 + seed * 0.0005) * 0.06;
          const length = size * (1 + rand(seed + b * 17) * 0.35);

          this.ctx.beginPath();
          this.ctx.moveTo(px, py);
          let sx = px; let sy = py;
          for (let seg = 0; seg < 4; seg++) {
            const nx = sx + Math.cos(angle + seg * 0.12) * (length * 0.28);
            const ny = sy - Math.abs(Math.sin(angle)) * (length * 0.28) - seg * (length * 0.17);
            const cx = sx + (nx - sx) * 0.5 + (rand(seed + seg * 29 + b * 7) - 0.5) * size * 0.14;
            const cy = sy + (ny - sy) * 0.5 + (rand(seed + seg * 31 + b * 11) - 0.5) * size * 0.08;
            this.ctx.quadraticCurveTo(cx, cy, nx, ny);
            sx = nx; sy = ny;
          }

          this.ctx.lineWidth = Math.max(2, size * 0.10);
          this.ctx.strokeStyle = strokeColor;
          this.ctx.lineCap = 'round';
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.moveTo(px, py);
          sx = px; sy = py;
          for (let seg = 0; seg < 4; seg++) {
            const nx = sx + Math.cos(angle + seg * 0.12) * (length * 0.28);
            const ny = sy - Math.abs(Math.sin(angle)) * (length * 0.28) - seg * (length * 0.17);
            const cx = sx + (nx - sx) * 0.5 + (rand(seed + seg * 37 + b * 5) - 0.5) * size * 0.14;
            const cy = sy + (ny - sy) * 0.5 + (rand(seed + seg * 41 + b * 13) - 0.5) * size * 0.08;
            this.ctx.quadraticCurveTo(cx, cy, nx, ny);
            sx = nx; sy = ny;
          }
          this.ctx.fillStyle = color;
          this.ctx.globalAlpha = 0.96;
          this.ctx.fill();
          this.ctx.globalAlpha = 1;

          for (let pidx = 0; pidx < 4; pidx++) {
            const t = 0.6 + pidx * 0.1;
            const tipX = px + Math.cos(angle) * length * t + (rand(seed + pidx * 19) - 0.5) * size * 0.06;
            const tipY = py - Math.abs(Math.sin(angle)) * length * t - (rand(seed + pidx * 23) * size * 0.06);
            this.ctx.beginPath();
            this.ctx.fillStyle = this.lightenColor(color, 0.04 + rand(seed + pidx * 29) * 0.06);
            this.ctx.arc(tipX, tipY, Math.max(1.5, size * 0.05 + rand(seed + pidx * 31) * size * 0.03), 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      } else {
        this.ctx.beginPath();
        this.ctx.fillStyle = color;
        this.ctx.arc(px, py, 8, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
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
