import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Quality = 'low' | 'medium' | 'high';

export type Settings = {
  sensitivity: number;
  invertX: boolean;
  invertY: boolean;
  fov: number;
  cameraBob: boolean;
  quality: Quality;
  bloom: number;
  vignette: number;
  grain: number;
  ambientAudio: boolean;
  volume: number;
  showFps: boolean;
  showDevOverlay: boolean;
  set: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  reset: () => void;
};

const DEFAULTS = {
  sensitivity: 1,
  invertX: false,
  invertY: false,
  fov: 65,
  cameraBob: true,
  quality: 'high' as Quality,
  bloom: 0.75,
  vignette: 0.75,
  grain: 0.045,
  ambientAudio: true,
  volume: 0.35,
  showFps: false,
  showDevOverlay: false,
};

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (k, v) => set({ [k]: v } as Partial<Settings>),
      reset: () => set(DEFAULTS),
    }),
    { name: 'twopia.settings' },
  ),
);
