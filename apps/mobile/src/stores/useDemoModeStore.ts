import { create } from 'zustand';
import {
  ensureDemoModeDisabled,
  isDemoModeEnabled,
  setDemoModeEnabled,
} from '../data/demoMode';
import { resetDatabaseConnection } from '../data/db';

interface DemoModeState {
  enabled: boolean;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setEnabled: (enabled: boolean) => Promise<void>;
}

export const useDemoModeStore = create<DemoModeState>((set) => ({
  enabled: false,
  hydrated: false,

  hydrate: async () => {
    // Migration: any device that still had demo ON is forced to operational DB.
    const wasOn = await ensureDemoModeDisabled();
    if (wasOn) {
      await resetDatabaseConnection();
    }
    const enabled = await isDemoModeEnabled();
    set({ enabled, hydrated: true });
  },

  setEnabled: async (enabled) => {
    // Production builds cannot re-enable demo mode.
    if (!__DEV__ && enabled) {
      await setDemoModeEnabled(false);
      set({ enabled: false });
      return;
    }
    await setDemoModeEnabled(enabled);
    await resetDatabaseConnection();
    set({ enabled });
  },
}));
