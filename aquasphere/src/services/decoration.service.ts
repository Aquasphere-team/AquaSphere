import { Injectable } from '@angular/core';
import { DecorationType, PlacedDecoration, DecorationCategory } from '../models/decoration.model';

@Injectable({ providedIn: 'root' })
export class DecorationService {
  public plantTypes: Array<{ id: string; name: string; color: string; defaultScale?: number }> = [
    { id: 'fern', name: 'Farn', color: '#1b8a36', defaultScale: 1 },
    { id: 'anubias', name: 'Anubias', color: '#0f7a4a', defaultScale: 1.9 },
    { id: 'moss', name: 'Moos', color: '#2fa84f', defaultScale: 1.6 }
  ];

  public decorationTypes: DecorationType[] = [
    { id: 'fern', category: 'plants', name: 'Farn', color: '#1b8a36', defaultScale: 1 },
    { id: 'anubias', category: 'plants', name: 'Anubias', color: '#0f7a4a', defaultScale: 1.1 },
    { id: 'moss', category: 'plants', name: 'Moos', color: '#2fa84f', defaultScale: 0.8 },
    { id: 'stone_small', category: 'rocks', name: 'Kleiner Stein', color: '#9e9e9e', defaultScale: 0.8 },
    { id: 'stone_big', category: 'rocks', name: 'Großer Stein', color: '#6b6b6b', defaultScale: 1.6 },
    { id: 'coral_red', category: 'coral', name: 'Koralle (rot)', color: '#ff6b6b', defaultScale: 1 },
    { id: 'coral_orange', category: 'coral', name: 'Koralle (orange)', color: '#ff9f43', defaultScale: 0.95 }
  ];

  // Helper to get decoration types by category
  byCategory(category: DecorationCategory) {
    return this.decorationTypes.filter(d => d.category === category);
  }

  // convert absolute x/y to normalized nx/ny if needed
  normalizePlacement(p: PlacedDecoration, rectWidth: number, rectHeight: number): PlacedDecoration {
    if ((p as any).x !== undefined && (p as any).y !== undefined && (p.nx === undefined || p.ny === undefined)) {
      p.nx = ((p as any).x) / rectWidth;
      p.ny = ((p as any).y) / rectHeight;
    }
    return p;
  }
}
