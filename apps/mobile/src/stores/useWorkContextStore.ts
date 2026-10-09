import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { WorkContext } from '../navigation/types';

const WORK_CTX_KEY = 'scpb_work_context_v1';

type WorkContextState = {
  active: WorkContext | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setActive: (ctx: WorkContext) => Promise<void>;
  clear: () => Promise<void>;
  patchIds: (ids: Partial<WorkContext['ids']>) => Promise<void>;
};

export const useWorkContextStore = create<WorkContextState>((set, get) => ({
  active: null,
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(WORK_CTX_KEY);
      if (!raw) {
        set({ active: null, hydrated: true });
        return;
      }
      const parsed = JSON.parse(raw) as WorkContext;
      if (parsed?.kind && parsed?.ids) {
        set({ active: parsed, hydrated: true });
      } else {
        set({ active: null, hydrated: true });
      }
    } catch {
      set({ active: null, hydrated: true });
    }
  },

  setActive: async (ctx) => {
    const next = { ...ctx, updatedAt: ctx.updatedAt || new Date().toISOString() };
    set({ active: next });
    try {
      await SecureStore.setItemAsync(WORK_CTX_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  },

  clear: async () => {
    set({ active: null });
    try {
      await SecureStore.deleteItemAsync(WORK_CTX_KEY);
    } catch {
      /* ignore */
    }
  },

  patchIds: async (ids) => {
    const cur = get().active;
    if (!cur) return;
    await get().setActive({
      ...cur,
      ids: { ...cur.ids, ...ids },
      updatedAt: new Date().toISOString(),
    });
  },
}));
