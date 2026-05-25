import { create } from "zustand";

export interface FilterState {
  region: string | null;
  // 시군구 — places.district ILIKE 와 매칭. P6·P11·P12 페르소나의 권역 큐레이션.
  sigungu: string | null;
  maxPrice: number | null; // 단일 슬라이더 (최대 가격)
  maxGuarantee: number | null; // 단일 슬라이더 (최대 보증인원)
  // 보증인원 하한 — P11(40명 진짜 스몰) 페르소나가 50명 미만 옵션을 보려면 필요.
  // null=제한 없음. 사용자가 명시적으로 "40명 진짜 스몰" 칩을 누르면 maxGuarantee=null + minGuarantee=null
  // 로 두고, "50명 이상" 같은 칩을 누르면 minGuarantee=50.
  minGuarantee: number | null;
  minRating: number | null;
  hallTypes: string[];
  mealOptions: string[];
  eventOptions: string[];
}

interface FilterStore extends FilterState {
  setRegion: (region: string | null) => void;
  setSigungu: (sigungu: string | null) => void;
  setMaxPrice: (maxPrice: number | null) => void;
  setMaxGuarantee: (maxGuarantee: number | null) => void;
  setMinGuarantee: (minGuarantee: number | null) => void;
  setMinRating: (rating: number | null) => void;
  setHallTypes: (hallTypes: string[]) => void;
  toggleHallType: (hallType: string) => void;
  setMealOptions: (mealOptions: string[]) => void;
  toggleMealOption: (mealOption: string) => void;
  setEventOptions: (eventOptions: string[]) => void;
  toggleEventOption: (eventOption: string) => void;
  resetFilters: () => void;
  initWithRegion: (region: string | null, sigungu?: string | null) => void;
  hasActiveFilters: () => boolean;
}

const initialState: FilterState = {
  region: null,
  sigungu: null,
  maxPrice: null,
  maxGuarantee: null,
  minGuarantee: null,
  minRating: null,
  hallTypes: [],
  mealOptions: [],
  eventOptions: [],
};

export const useFilterStore = create<FilterStore>((set, get) => ({
  ...initialState,
  
  setRegion: (region) => set({ region }),
  setSigungu: (sigungu) => set({ sigungu }),
  setMaxPrice: (maxPrice) => set({ maxPrice }),
  setMaxGuarantee: (maxGuarantee) => set({ maxGuarantee }),
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
  initWithRegion: (region, sigungu = null) => set({ ...initialState, region, sigungu }),

  hasActiveFilters: () => {
    const state = get();
    return !!(
      state.region ||
      state.sigungu ||
      state.maxPrice ||
      state.maxGuarantee ||
      state.minGuarantee ||
      state.minRating ||
      state.hallTypes.length > 0 ||
      state.mealOptions.length > 0 ||
      state.eventOptions.length > 0
    );
  },
}));
