import { create } from 'zustand';
import { AppState } from './types';
import { mergeDeep } from './utils';

// Estado Inicial (Movido do App.tsx)
const initialState: AppState = {
  dailyRecords: {},
  generalExpenses: [],
  monthlyGoals: {},
  dreamGoals: [], 
  config: { valorBonus: 20.00, taxaImposto: 0.06, userName: 'OPERADOR', userTag: '', manualBonusMode: false },
  generator: {
    plan: [],
    totalAgentes: 2,
    jogadoresPorCiclo: 5,
    distribuicaoAgentes: {1: 5, 2: 5},
    params: { 
        testador: 40, cetico: 30, ambicioso: 20, viciado: 10, 
        minBaixo: 20, maxBaixo: 50, minAlto: 51, maxAlto: 150, alvo: 100 
    },
    lotWithdrawals: {},
    customLotSizes: {},
    history: []
  },
  onboarding: {
      steps: {
          configName: false,
          generatedPlan: false,
          sentLot: false,
          addedExpense: false
      },
      dismissed: false
  }
};

interface Store extends AppState {
    updateState: (updates: Partial<AppState>) => void;
    setAll: (newState: AppState) => void;
    reset: () => void;
}

export const useStore = create<Store>((set) => ({
    ...initialState,
    updateState: (updates) => set((prev) => mergeDeep(prev, updates)),
    setAll: (newState) => set(() => newState),
    reset: () => set(initialState)
}));