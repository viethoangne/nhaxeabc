// src/store/useUserStore.ts
import { create } from 'zustand';

interface UserState {
  points: number;
  setPoints: (points: number) => void;
}

export const useUserStore = create<UserState>((set) => ({
  points: 0,
  setPoints: (points) => set({ points }),
}));