import { create } from "zustand";

export interface FilterState {
  region: string | null;
  priceRange: [number, number] | null;
  minGuarantee: number | null;
  minRating: number | null;
}

interface FilterStore extends FilterState {
  setRegion: (region: string | null) => void;
  setPriceRange: (range: [number, number] | null) => void;
  setMinGuarantee: (minGuarantee: number | null) => void;
  setMinRating: (rating: number | null) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
}

const initialState: FilterState = {
  region: null,
  priceRange: null,
  minGuarantee: null,
  minRating: null,
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,
  
  setRegion: (region) => set({ region }),
  setPriceRange: (priceRange) => set({ priceRange }),
  setMinGuarantee: (minGuarantee) => set({ minGuarantee }),
  setMinRating: (minRating) => set({ minRating }),
  
  resetFilters: () => set(initialState),
  
  hasActiveFilters: () => {
    const state = get();
    return !!(state.region || state.priceRange || state.minGuarantee || state.minRating);
  },
}));
