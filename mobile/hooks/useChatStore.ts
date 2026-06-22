import { create } from 'zustand';

interface ChatState {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  initialQuery: string;
  setInitialQuery: (query: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
  initialQuery: '',
  setInitialQuery: (initialQuery) => set({ initialQuery }),
}));
