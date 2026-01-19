import { create } from "zustand";

export interface FilterState {
  region: string | null;
  priceRange: [number, number] | null;
  minGuarantee: number | null;
  minRating: number | null;
  hallTypes: string[];
  mealOptions: string[];
  eventOptions: string[];
}

interface FilterStore extends FilterState {
  setRegion: (region: string | null) => void;
  setPriceRange: (range: [number, number] | null) => void;
  setMinGuarantee: (minGuarantee: number | null) => void;
  setMinRating: (rating: number | null) => void;
  setHallTypes: (hallTypes: string[]) => void;
  toggleHallType: (hallType: string) => void;
  setMealOptions: (mealOptions: string[]) => void;
  toggleMealOption: (mealOption: string) => void;
  setEventOptions: (eventOptions: string[]) => void;
  toggleEventOption: (eventOption: string) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
}

const initialState: FilterState = {
  region: null,
  priceRange: null,
  minGuarantee: null,
  minRating: null,
  hallTypes: [],
  mealOptions: [],
  eventOptions: [],
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,
  
  setRegion: (region) => set({ region }),
  setPriceRange: (priceRange) => set({ priceRange }),
  setMinGuarantee: (minGuarantee) => set({ minGuarantee }),
  setMinRating: (minRating) => set({ minRating }),
  
  setHallTypes: (hallTypes) => set({ hallTypes }),
  toggleHallType: (hallType) => {
    const current = get().hallTypes;
    if (current.includes(hallType)) {
      set({ hallTypes: current.filter(h => h !== hallType) });
    } else {
      set({ hallTypes: [...current, hallType] });
    }
  },
  
  setMealOptions: (mealOptions) => set({ mealOptions }),
  toggleMealOption: (mealOption) => {
    const current = get().mealOptions;
    if (current.includes(mealOption)) {
      set({ mealOptions: current.filter(m => m !== mealOption) });
    } else {
      set({ mealOptions: [...current, mealOption] });
    }
  },
  
  setEventOptions: (eventOptions) => set({ eventOptions }),
  toggleEventOption: (eventOption) => {
    const current = get().eventOptions;
    if (current.includes(eventOption)) {
      set({ eventOptions: current.filter(e => e !== eventOption) });
    } else {
      set({ eventOptions: [...current, eventOption] });
    }
  },
  
  resetFilters: () => set(initialState),
  
  hasActiveFilters: () => {
    const state = get();
    return !!(
      state.region || 
      state.priceRange || 
      state.minGuarantee || 
      state.minRating ||
      state.hallTypes.length > 0 ||
      state.mealOptions.length > 0 ||
      state.eventOptions.length > 0
    );
  },
}));
