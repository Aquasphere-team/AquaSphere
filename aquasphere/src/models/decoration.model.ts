export type DecorationCategory = 'plants' | 'rocks' | 'coral';

export interface DecorationType {
  id: string;
  category: DecorationCategory;
  name: string;
  color: string;
  defaultScale?: number;
}

export interface PlacedDecoration {
  type: string;
  nx?: number;
  ny?: number;
  x?: number;
  y?: number;
  scale?: number;
}

export interface PlantPlacement extends PlacedDecoration {
  // alias for clarity
}
