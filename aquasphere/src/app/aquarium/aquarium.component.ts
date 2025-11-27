import { Component, ElementRef, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { FishService } from '../../services/fish.service';
import { DecorationService } from '../../services/decoration.service';
import { FishInstance, FishType } from '../../models/fish.model';
import { PlacedDecoration } from '../../models/decoration.model';
import { CanvasService } from '../../services/canvas.service';
import { ParticleService } from '../../services/particle.service';

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

  // UI helpers
  previews: Record<string, string> = {};
  placingDecoration = false;
  selectedDecorationType: string | null = null;

  // expose fishTypes from FishService so the template can iterate over them
  get fishTypes(): FishType[] {
    return this.fishService.fishTypes;
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
    if (this.decorationPaletteVisible) { this.inPhoneAuth = false; this.inScreenMenu = false; this.placingPlant = false; this.placingFish = false; }
  }

  selectPlantType(id: string, source: 'desktop' | 'phone' = 'phone'): void {
    this.selectedPlantType = id; this.placingPlant = true; this.decorationPaletteVisible = false; try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  toggleFishPalette(): void { this.fishPaletteVisible = !this.fishPaletteVisible; if (this.fishPaletteVisible) { this.inPhoneAuth = false; this.inScreenMenu = false; this.decorationPaletteVisible = false; this.placingPlant = false; this.placingFish = false; } }

  selectFishType(id: string, source: 'desktop' | 'phone' = 'phone'): void { this.selectedFishType = id; this.placingFish = true; this.fishPaletteVisible = false; try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {} }

  cancelFishPlacing(): void { this.placingFish = false; this.selectedFishType = null; try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {} }

  debugAddFish(): void { const randomX = Math.random() * 600 + 100; const randomY = Math.random() * 400 + 100; this.addFish('goldfish', randomX, randomY); }

  cancelPlacing(): void { this.placingPlant = false; this.selectedPlantType = null; this.placingFish = false; this.selectedFishType = null; try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {} }

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
      const nx = Math.max(0, Math.min(1, cssX / rect.width));
      const ny = Math.max(0, Math.min(1, cssY / rect.height));
      // Use plant type defaultScale so placed plants match palette size
      const plantDef = this.decorationService.plantTypes.find(pt => pt.id === this.selectedPlantType as string) as any;
      const scale = plantDef && plantDef.defaultScale ? plantDef.defaultScale : 1;
      this.plants.push({ type: this.selectedPlantType, nx, ny, scale });
      this.placingPlant = false;
      this.selectedPlantType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    } else if (this.placingDecoration && this.selectedDecorationType) {
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
      this.placingDecoration = false;
      this.selectedDecorationType = null;
      try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    } else if (this.placingFish && this.selectedFishType) {
      this.addFish(this.selectedFishType, cssX, cssY);
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
    console.log('Saving user state for user:', this.currentUserId);
    try {
      const state = {
        lightIntensity: this.lightIntensity,
        particles: this.particleService.getParticles(),
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
        if (Array.isArray(state.particles)) this.particleService.setParticles(state.particles);
        if (Array.isArray(state.plants)) this.plants = state.plants;
        if (Array.isArray(state.fish)) {
          this.fish = state.fish;
          // keep fish service in sync
          try { this.fishService.fish = this.fish; } catch (e) {}
        }
        if (Array.isArray(state.decorations)) this.decorations = state.decorations;
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
    this.fishService.updateFish(this.fish, this.particleService.getParticles(), this.fishService.fishTypes, canvasWidth, canvasHeight);
  }

  private animate(): void {
    if (!this.isRunning) return;

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
    // draw surface waves and light via service
    this.canvasService.drawSurfaceWaves(this.waveOffset);
    this.canvasService.drawLightEffect(this.lightIntensity);

    this.waveOffset += 0.03;
    this.animationId = requestAnimationFrame(() => this.animate());
  }



  // Button Event Handlers
  feedFish(): void {
    console.log('🐟 Fische werden gefüttert!');

    // delegate to particleService
    this.particleService.addFeedBurst(10, 50, 750);
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
}
