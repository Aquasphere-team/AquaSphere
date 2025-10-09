import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-aquarium',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './aquarium.component.html',
  styleUrls: ['./aquarium.component.css']
})
export class AquariumComponent implements OnInit, OnDestroy {
  @ViewChild('aquariumCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  
  private ctx!: CanvasRenderingContext2D;
  private particles: any[] = [];
  private waveOffset = 0;
  private lightIntensity = 1;
  private animationId?: number;
  private isRunning = true;
  phonePreview = false;
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
  // plants store normalized positions (nx, ny) relative to canvas CSS size (0..1)
  plants: Array<{ type: string; nx?: number; ny?: number; x?: number; y?: number; scale?: number }> = [];
  decorationPaletteVisible = false;
  // palette for desktop (non-phone) controls
  desktopDecorationVisible = false;
  placingPlant = false;
  selectedPlantType: string | null = null;

  ngOnInit(): void {
    // ensure transient UI flags are reset on start (do this before attaching listeners)
    this.inPhoneAuth = false;
    this.decorationPaletteVisible = false;
    this.placingPlant = false;

    this.initializeAquarium();
    console.log('🐠 AquaSphere Angular gestartet!');
  }

  ngOnDestroy(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    try {
      window.removeEventListener('resize', this.resizeHandler);
      // also remove canvas click listener if attached
      try { this.canvasRef?.nativeElement?.removeEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}
    } catch (e) {
      // ignore
    }
  }

  private initializeAquarium(): void {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.initializeCanvas();
    this.createWaterParticles();
    // attach pointerup handler for placing plants (works for mouse/touch/pen)
    try { canvas.addEventListener('pointerup', this.canvasClickHandler as EventListener); } catch {}
    this.animate();
  }

  private initializeCanvas(): void {
    // initial sizing and add responsive listener
    this.resizeHandler();
    window.addEventListener('resize', this.resizeHandler);
  }

  togglePhonePreview(): void {
    // Toggle the preview state. We rely on Angular class binding in the template
    // instead of manipulating DOM classes directly. This keeps UI state and DOM in sync
    // and avoids timing issues when measuring layout for the canvas resize.
    this.phonePreview = !this.phonePreview;

    if (this.phonePreview) {
      // entering preview: close unrelated overlays
      this.inScreenMenu = false;
      this.inPhoneAuth = false;
    } else {
      // leaving preview: reset all in-phone specific UI
      this.inScreenMenu = false;
      this.inPhoneAuth = false;
      this.decorationPaletteVisible = false;
      this.desktopDecorationVisible = false;
      this.placingPlant = false;
      this.selectedPlantType = null;
    }

    // wait a tick for layout to settle (class binding applied), then resize canvas
    setTimeout(() => this.resizeHandler(), 50);
  }

  toggleInScreenMenu(): void {
    // Toggle the in-phone menu (shown only via the phone button)
    this.inScreenMenu = !this.inScreenMenu;
    // Close auth overlay and decoration palette when opening menu to avoid overlap
    if (this.inScreenMenu) {
      this.inPhoneAuth = false;
      this.decorationPaletteVisible = false;
      this.placingPlant = false;
    }
  }

  // Decoration / plants
  toggleDecorationPalette(): void {
    // Only allow decoration palette inside phone preview
    if (!this.phonePreview) return;

    this.decorationPaletteVisible = !this.decorationPaletteVisible;
    if (this.decorationPaletteVisible) {
      this.inPhoneAuth = false;
      this.inScreenMenu = false;
      this.placingPlant = false;
    }
  }

  selectPlantType(id: string, source: 'desktop' | 'phone' = 'desktop'): void {
    // If the user selected from the desktop while the phone preview is active,
    // close the phone preview so placement occurs on the main canvas.
    if (source === 'desktop' && this.phonePreview) {
      this.togglePhonePreview();
    }

    this.selectedPlantType = id;
    this.placingPlant = true;
    // hide both palettes while placing to avoid them covering the canvas
    this.decorationPaletteVisible = false;
    this.desktopDecorationVisible = false;
    try { window.addEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    console.log('Select plant:', id, 'source:', source);
  }

  toggleDesktopDecorationPalette(): void {
    // only allowed when not in phone preview
    if (this.phonePreview) return;
    this.desktopDecorationVisible = !this.desktopDecorationVisible;
    if (this.desktopDecorationVisible) {
      this.inPhoneAuth = false;
      this.inScreenMenu = false;
      this.placingPlant = false;
    }
  }

  cancelPlacing(): void {
    this.placingPlant = false;
    this.selectedPlantType = null;
  try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
  }

  private canvasClickHandler = (ev: PointerEvent) => {
    if (!this.placingPlant) return;
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    // Use CSS-pixel coordinates (local to the canvas) because the ctx is scaled with setTransform
    const cssX = ((ev as any).clientX - rect.left);
    const cssY = ((ev as any).clientY - rect.top);
    if (!this.selectedPlantType) return;
    // store normalized coordinates so placement survives resizes
    const nx = Math.max(0, Math.min(1, cssX / rect.width));
    const ny = Math.max(0, Math.min(1, cssY / rect.height));
    this.plants.push({ type: this.selectedPlantType, nx, ny, scale: 1 });
    this.placingPlant = false;
    this.selectedPlantType = null;
    try { window.removeEventListener('pointermove', this.mouseMoveHandler as EventListener); } catch {}
    console.log('Placed plant at', cssX, cssY);
    this.saveUserState();
  }

  private mouseMoveHandler = (ev: PointerEvent) => {
    if (!this.placingPlant) return;
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

  private resizeHandler = (): void => {
    const canvas = this.canvasRef.nativeElement;
    try {
      if (this.phonePreview) {
        // prefer the phone-screen element if available
        const phoneScreen = canvas.closest('.phone-screen') as HTMLElement | null;
        if (phoneScreen) {
          this.resizeCanvasToElement(phoneScreen, true);
          return;
        }
      }
      const container = canvas.parentElement as HTMLElement;
      if (container) {
        this.resizeCanvasToElement(container, true);
      }
    } catch (e) {
      // silent fallback
    }
  }

  private resizeCanvasToElement(el: HTMLElement, useDPR = true): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = el.getBoundingClientRect();
    const scale = useDPR ? (window.devicePixelRatio || 1) : 1;

    // set CSS size to match the container's layout size (CSS pixels)
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // set backing store size for crisp rendering
    canvas.width = Math.max(1, Math.floor(rect.width * scale));
    canvas.height = Math.max(1, Math.floor(rect.height * scale));
    // make drawing operations use CSS pixels coordinates
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
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
    // Only allow opening the in-phone auth when the phone preview is active.
    if (!this.phonePreview) return;

    // Toggle the in-phone auth overlay; ensure other in-phone UI is closed when auth opens
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
      plants: this.plants
    };
    localStorage.setItem(`aqua_user_${this.currentUser}`, JSON.stringify(state));
    alert('Dein Aquarium wurde gespeichert.');
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

  private getRandomWaterColor(): string {
    const colors = [
      'rgba(135, 206, 235, 0.4)',  // Sky blue
      'rgba(173, 216, 230, 0.4)',  // Light blue
      'rgba(176, 224, 230, 0.4)',  // Powder blue
      'rgba(70, 130, 180, 0.4)',   // Steel blue
    ];
    return colors[Math.floor(Math.random() * colors.length)];
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
    
    this.particles.forEach(particle => {
      // Bewegung
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Bounds checking
      if (particle.x < 0 || particle.x > canvas.width) {
        particle.speedX *= -1;
      }
      if (particle.y < 0 || particle.y > canvas.height) {
        particle.speedY *= -1;
      }
      
      // Partikel zeichnen
      this.ctx.globalAlpha = particle.opacity;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
      
      // Leichte Opacity-Animation
      particle.opacity += (Math.random() - 0.5) * 0.03;
      particle.opacity = Math.max(0.1, Math.min(0.8, particle.opacity));
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
    const time = Date.now() * 0.002;
    
    this.ctx.globalAlpha = 0.15;
    
    for (let i = 0; i < 8; i++) {
      const x = (Math.sin(time + i * 0.8) * 0.4 + 0.5) * canvas.width;
      const y = (Math.cos(time * 1.2 + i * 0.6) * 0.3 + 0.4) * canvas.height;
      
      const causticGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 90);
      causticGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      causticGradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
      causticGradient.addColorStop(1, 'transparent');
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 90, 0, Math.PI * 2);
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
