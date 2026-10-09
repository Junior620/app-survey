import { create } from 'zustand';

export type ListUiKey = 'planteurs' | 'missions' | 'formations' | 'visites' | 'lots' | 'sites';

export type ListUiState = {
  query: string;
  filter: string;
  scrollOffset: number;
};

type ListUiStore = {
  byKey: Partial<Record<ListUiKey, ListUiState>>;
  get: (key: ListUiKey) => ListUiState;
  setQuery: (key: ListUiKey, query: string) => void;
  setFilter: (key: ListUiKey, filter: string) => void;
  setScrollOffset: (key: ListUiKey, scrollOffset: number) => void;
  patch: (key: ListUiKey, patch: Partial<ListUiState>) => void;
};

const EMPTY: ListUiState = { query: '', filter: '', scrollOffset: 0 };

export const useListUiStateStore = create<ListUiStore>((set, get) => ({
  byKey: {},

  get: (key) => get().byKey[key] ?? EMPTY,

  setQuery: (key, query) =>
    set((s) => ({
      byKey: {
        ...s.byKey,
        [key]: { ...(s.byKey[key] ?? EMPTY), query },
      },
    })),

  setFilter: (key, filter) =>
    set((s) => ({
      byKey: {
        ...s.byKey,
        [key]: { ...(s.byKey[key] ?? EMPTY), filter },
      },
    })),

  setScrollOffset: (key, scrollOffset) =>
    set((s) => ({
      byKey: {
        ...s.byKey,
        [key]: { ...(s.byKey[key] ?? EMPTY), scrollOffset },
      },
    })),

  patch: (key, patch) =>
    set((s) => ({
      byKey: {
        ...s.byKey,
        [key]: { ...(s.byKey[key] ?? EMPTY), ...patch },
      },
    })),
}));
