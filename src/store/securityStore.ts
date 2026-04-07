import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SecurityState {
  pinHash: string | null;
  pinSalt: string | null;
  autoLockMinutes: number;
  hydrated: boolean;
  setPinRecord: (pinHash: string, pinSalt: string) => void;
  clearPinRecord: () => void;
  setAutoLockMinutes: (minutes: number) => void;
  setHydrated: (hydrated: boolean) => void;
}

export const DEFAULT_AUTO_LOCK_MINUTES = 15;

export const useSecurityStore = create<SecurityState>()(
  persist(
    (set) => ({
      pinHash: null,
      pinSalt: null,
      autoLockMinutes: DEFAULT_AUTO_LOCK_MINUTES,
      hydrated: false,
      setPinRecord: (pinHash, pinSalt) => set({ pinHash, pinSalt }),
          clearPinRecord: () => set({ pinHash: null, pinSalt: null }),
      setAutoLockMinutes: (minutes) => set({ autoLockMinutes: minutes }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: 'finbo-security',
      version: 1,
      partialize: (state) => ({
        pinHash: state.pinHash,
        pinSalt: state.pinSalt,
        autoLockMinutes: state.autoLockMinutes,
      }),
      onRehydrateStorage: () => (state, error) => {
        state?.setHydrated(true);
        if (error) {
          console.error('Failed to rehydrate security settings', error);
        }
      },
    }
  )
);
