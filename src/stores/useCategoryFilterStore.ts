import { create } from "zustand";

export type CategoryType = 'venues' | 'studios' | 'honeymoon' | 'honeymoon_gifts' | 'appliances' | 'suits' | 'hanbok' | 'invitation_venues';

export interface CategoryFilterState {
  region: string | null;
  minRating: number | null;
  filterOptions1: string[];
  filterOptions2: string[];
  filterOptions3: string[];
}

interface CategoryFilterStore extends CategoryFilterState {
  setRegion: (region: string | null) => void;
  setMinRating: (rating: number | null) => void;
  setFilterOptions1: (options: string[]) => void;
  toggleFilterOption1: (option: string) => void;
  setFilterOptions2: (options: string[]) => void;
  toggleFilterOption2: (option: string) => void;
  setFilterOptions3: (options: string[]) => void;
  toggleFilterOption3: (option: string) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
}

const initialState: CategoryFilterState = {
  region: null,
  minRating: null,
  filterOptions1: [],
  filterOptions2: [],
  filterOptions3: [],
};

export const useCategoryFilterStore = create<CategoryFilterStore>((set, get) => ({
  ...initialState,
  
  setRegion: (region) => set({ region }),
  setMinRating: (minRating) => set({ minRating }),
  
  setFilterOptions1: (filterOptions1) => set({ filterOptions1 }),
  toggleFilterOption1: (option) => {
    const current = get().filterOptions1;
    if (current.includes(option)) {
      set({ filterOptions1: current.filter(o => o !== option) });
    } else {
      set({ filterOptions1: [...current, option] });
    }
  },
  
  setFilterOptions2: (filterOptions2) => set({ filterOptions2 }),
  toggleFilterOption2: (option) => {
    const current = get().filterOptions2;
    if (current.includes(option)) {
      set({ filterOptions2: current.filter(o => o !== option) });
    } else {
      set({ filterOptions2: [...current, option] });
    }
  },
  
  setFilterOptions3: (filterOptions3) => set({ filterOptions3 }),
  toggleFilterOption3: (option) => {
    const current = get().filterOptions3;
    if (current.includes(option)) {
      set({ filterOptions3: current.filter(o => o !== option) });
    } else {
      set({ filterOptions3: [...current, option] });
    }
  },
  
  resetFilters: () => set(initialState),
  
  hasActiveFilters: () => {
    const state = get();
    return !!(
      state.region || 
      state.minRating ||
      state.filterOptions1.length > 0 ||
      state.filterOptions2.length > 0 ||
      state.filterOptions3.length > 0
    );
  },
}));
