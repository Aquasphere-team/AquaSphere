import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface Stain {
  id: string;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  radius: number; // px
  amount: number; // 0..1
  createdAt?: number;
}

export interface DirtState {
  dirtLevel: number; // 0..100
  dirtLastUpdated: number; // epoch ms
  dirtStains: Stain[];
}

@Injectable({ providedIn: 'root' })
export class DirtService {
  private userId: string | null = null;
  private tickIntervalMs = 10 * 1000; // 10s default
  private tickHandle: any = null;
  private pendingSaveHandle: any = null;

  // config (tweakable)
  // per fish per minute: increased to make fish presence noticeably affect water turbidity
  private readonly dirtRatePerFishPerMin = 4.0; // per fish per minute (tuned)
  private readonly dirtRateFromFeed = 0.1; // feed residue weight
  // disable natural cleanup over time; cleaning should only happen via brush or cleaner fish
  private readonly naturalDecayPerMin = 0.0; // natural cleanup disabled

  private state: DirtState = {
    dirtLevel: 0,
    dirtLastUpdated: Date.now(),
    dirtStains: []
  };

  readonly state$ = new BehaviorSubject<DirtState>({ ...this.state });

  constructor(private supabaseService: SupabaseService) {}

  start(userId: string, initial?: Partial<DirtState>, tickIntervalSec = 10) {
    this.userId = userId;
    if (initial) {
      this.state = {
        dirtLevel: initial.dirtLevel ?? this.state.dirtLevel,
        dirtLastUpdated: initial.dirtLastUpdated ?? this.state.dirtLastUpdated,
        dirtStains: Array.isArray(initial.dirtStains) ? initial.dirtStains.slice(0, 200) : this.state.dirtStains
      };
      this.emit();
    }
    this.tickIntervalMs = Math.max(2000, tickIntervalSec * 1000);
    this.stopTick();
    this.tickHandle = setInterval(() => this.tick(), this.tickIntervalMs);
  }

  stop() {
    this.stopTick();
    this.userId = null;
  }

  private stopTick() {
    if (this.tickHandle) { clearInterval(this.tickHandle); this.tickHandle = null; }
  }

  private emit() {
    this.state.dirtLastUpdated = Date.now();
    this.state$.next({ ...this.state, dirtStains: this.state.dirtStains.map(s => ({ ...s })) });
    this.scheduleSave();
  }

  // Called every tickInterval
  tick() {
    // compute dt in minutes
    const dtMin = this.tickIntervalMs / 60000;
    // approximate fish count by asking Supabase for full state? No - caller should call applyFishInfluence
    // We'll not compute fish-driven dirt here unless caller passes a fishCount via applyFishInfluence
    // For now, apply only natural decay
    const delta = - dtMin * this.naturalDecayPerMin * 100; // map to 0..100 scale
    this.state.dirtLevel = Math.max(0, Math.min(100, this.state.dirtLevel + delta));
    this.emit();
  }

  // Apply fish/feeding influences from caller (e.g. aquarium component when feeding or fish count known)
  applyFishInfluence(fishCount: number, feedResidue = 0, dtMin = 0.1667) {
    const delta = dtMin * (fishCount * this.dirtRatePerFishPerMin + feedResidue * this.dirtRateFromFeed) - dtMin * this.naturalDecayPerMin;
    // scale into 0..100 (these rates assume small increments)
    this.state.dirtLevel = Math.max(0, Math.min(100, this.state.dirtLevel + delta));
    this.emit();
  }

  spawnStainsAt(normalizedX: number, normalizedY: number, count = 1) {
    for (let i = 0; i < count; i++) {
      const id = Math.random().toString(36).slice(2, 9);
      const jitterX = (Math.random() - 0.5) * 0.05;
      const jitterY = (Math.random() - 0.5) * 0.03;
      const stain: Stain = {
        id,
        x: Math.max(0, Math.min(1, normalizedX + jitterX)),
        y: Math.max(0, Math.min(1, normalizedY + jitterY)),
        radius: 12 + Math.random() * 28,
        amount: 0.4 + Math.random() * 0.6,
        createdAt: Date.now()
      };
      this.state.dirtStains.push(stain);
      // Performance: Limit auf 50 statt 200
      if (this.state.dirtStains.length > 50) this.state.dirtStains.shift();
    }
    // small bump to global turbidity when stains are created
    this.state.dirtLevel = Math.min(100, this.state.dirtLevel + 0.5 * count);
    this.emit();
  }

  // Clean area with brush in normalized coords. radiusPx is in canvas pixels; we require canvas size to convert.
  // If reduceWater is true (default), a small portion of global dirtLevel is reduced; if false only stains are cleaned.
  cleanArea(normalizedX: number, normalizedY: number, radiusPx: number, canvasWidth: number, canvasHeight: number, strength = 0.5, dtSec = 0.016, reduceWater = true) {
     // convert px radius to normalized
     const rn = radiusPx / Math.max(1, Math.max(canvasWidth, canvasHeight));
     const removeAmount = strength * (dtSec); // per frame removal multiplier
     let cleaned = 0;
     this.state.dirtStains = this.state.dirtStains.map(s => ({ ...s }));
     for (let i = this.state.dirtStains.length - 1; i >= 0; i--) {
       const s = this.state.dirtStains[i];
       const dx = s.x - normalizedX; const dy = s.y - normalizedY;
       const dist = Math.sqrt(dx * dx + dy * dy);
       if (dist <= rn + (s.radius / Math.max(canvasWidth, canvasHeight))) {
         // reduce amount proportional to proximity
         const prox = 1 - Math.min(1, dist / (rn + (s.radius / Math.max(canvasWidth, canvasHeight))));
         const reduce = removeAmount * prox;
         s.amount = Math.max(0, s.amount - reduce);
         cleaned += reduce;
         if (s.amount <= 0.02) {
           this.state.dirtStains.splice(i, 1);
         } else {
           this.state.dirtStains[i] = s;
         }
       }
     }
    // Optionally reduce global dirtLevel; cleaner fish should call with reduceWater=false
    if (cleaned > 0 && reduceWater) {
      const reduced = Math.min(this.state.dirtLevel, cleaned * 12);
      this.state.dirtLevel = Math.max(0, this.state.dirtLevel - reduced);
      this.emit();
    } else if (cleaned > 0) {
      // stains changed but global turbidity unchanged
      this.emit();
    }
     return cleaned;
   }

  cleanAll(amount = 25) {
    this.state.dirtLevel = Math.max(0, this.state.dirtLevel - amount);
    // optionally remove weaker stains
    this.state.dirtStains = this.state.dirtStains.filter(s => s.amount > 0.5);
    this.emit();
  }

  setStatePartial(partial: Partial<DirtState>) {
    if (partial.dirtLevel !== undefined) this.state.dirtLevel = partial.dirtLevel;
    if (partial.dirtLastUpdated !== undefined) this.state.dirtLastUpdated = partial.dirtLastUpdated;
    if (Array.isArray(partial.dirtStains)) this.state.dirtStains = partial.dirtStains.slice(0, 200);
    this.emit();
  }

  getState() {
    return { ...this.state, dirtStains: this.state.dirtStains.map(s => ({ ...s })) } as DirtState;
  }

  private scheduleSave() {
    if (!this.userId) return;
    if (this.pendingSaveHandle) clearTimeout(this.pendingSaveHandle);
    // debounce saves to once per 4s
    this.pendingSaveHandle = setTimeout(async () => {
      try {
        // load existing full state and merge dirt fields to avoid overwriting other parts
        const existing = await this.supabaseService.loadAquariumState(this.userId!);
        const merged = { ...(existing || {}), dirtLevel: this.state.dirtLevel, dirtLastUpdated: new Date(this.state.dirtLastUpdated).toISOString(), dirtStains: this.state.dirtStains };
        await this.supabaseService.saveAquariumState(this.userId!, merged);
      } catch (e) {
        // console.warn('DirtService save failed', e);
      }
    }, 4000);
  }
}
