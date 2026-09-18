import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

const SITE_KEY = 'scpb_current_site_id';

interface SiteContextState {
  currentSiteId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setCurrentSiteId: (siteId: string | null) => Promise<void>;
}

export const useSiteContext = create<SiteContextState>((set) => ({
  currentSiteId: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const id = await SecureStore.getItemAsync(SITE_KEY);
      set({ currentSiteId: id, hydrated: true });
    } catch {
      set({ currentSiteId: null, hydrated: true });
    }
  },

  setCurrentSiteId: async (siteId) => {
    set({ currentSiteId: siteId });
    try {
      if (siteId) await SecureStore.setItemAsync(SITE_KEY, siteId);
      else await SecureStore.deleteItemAsync(SITE_KEY);
    } catch {
      /* ignore persist errors */
    }
  },
}));
