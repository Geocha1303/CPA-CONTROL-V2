
import { create } from 'zustand';
import { AppState } from './types';
import { mergeDeep } from './utils';

// Definição do Estado Inicial Padrão (Limpo)
export const initialState: AppState = {
  dailyRecords: {},
  generalExpenses: [],
  monthlyGoals: {},
  dreamGoals: [], 
  config: { 
      valorBonus: 20.00, 
      taxaImposto: 0.06, 
      userName: 'OPERADOR', 
      userTag: '', 
      manualBonusMode: false 
  },
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
    
    // Atualização parcial com merge profundo
    updateState: (updates) => set((prev) => mergeDeep(prev, updates)),
    
    // Substituição TOTAL do estado (Simplificado para Merge Seguro)
    setAll: (newState) => set((state) => ({ ...state, ...newState })),
    
    // Reset para estado inicial
    reset: () => set(initialState)
}));
