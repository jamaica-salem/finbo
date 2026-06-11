import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AmountPrivacyState = {
  amountsHidden: boolean;
  toggleAmountsHidden: () => void;
  setAmountsHidden: (hidden: boolean) => void;
};

export const useAmountPrivacyStore = create<AmountPrivacyState>()(
  persist(
    (set) => ({
      amountsHidden: false,
      toggleAmountsHidden: () => set((state) => ({ amountsHidden: !state.amountsHidden })),
      setAmountsHidden: (hidden) => set({ amountsHidden: hidden }),
    }),
    {
      name: 'finbo-amount-privacy',
    },
  ),
);
