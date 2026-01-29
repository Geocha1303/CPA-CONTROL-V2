
export interface Account {
  id: number;
  deposito: number;
  redeposito: number;
  saque: number;
  ciclos: number; // No modo manual, isso armazena o valor monetário total do bônus
}

export interface DayExpenses {
  proxy: number;
  numeros: number;
}

export interface DayRecord {
  expenses: DayExpenses;
  accounts: Account[];
}

export interface GeneralExpense {
  id: number;
  date: string;
  description: string;
  valor: number;
  recorrente: boolean;
}

export interface MonthlyGoal {
  [key: string]: number; // key format: YYYY-MM
}

export interface DreamGoal {
  id: number;
  name: string;
  targetValue: number;
  icon?: string;
  imageUrl?: string; // URL da imagem (AI ou Manual)
  autoImage?: boolean; // Se foi gerada automaticamente
}

export interface Config {
  valorBonus: number;
  taxaImposto: number;
  userName?: string;
  manualBonusMode?: boolean; // NOVA FLAG: Se true, o campo 'ciclos' é valor monetário direto
}

export interface GeneratorParams {
  testador: number;
  cetico: number;
  ambicioso: number;
  viciado: number;
  minBaixo: number;
  maxBaixo: number;
  minAlto: number;
  maxAlto: number;
  alvo: number;
}

export interface HistoryItem {
  valor: number;
  tipo: 'deposito' | 'redeposito';
}

export interface GeneratorState {
  totalAgentes: number;
  jogadoresPorCiclo: number;
  distribuicaoAgentes: Record<number, number>;
  params: GeneratorParams;
  plan: GeneratedPlayer[];
  lotWithdrawals: Record<number, number>;
  customLotSizes: Record<number, number>;
  history: HistoryItem[];
}

export interface DepositItem {
  val: number;
  type: 'deposito' | 'redeposito';
}

export interface GeneratedPlayer {
  id: string;
  perfil: string;
  agent: number;
  total: number;
  deps: DepositItem[];
}

export interface OnboardingState {
  steps: {
    configName: boolean;
    generatedPlan: boolean;
    sentLot: boolean;
    addedExpense: boolean;
  };
  dismissed: boolean;
}

export interface AppState {
  dailyRecords: Record<string, DayRecord>;
  generalExpenses: GeneralExpense[];
  monthlyGoals: MonthlyGoal;
  dreamGoals: DreamGoal[];
  config: Config;
  generator: GeneratorState;
  onboarding?: OnboardingState; // Novo campo opcional
}

export interface Notification {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type ViewType = 'dashboard' | 'planejamento' | 'controle' | 'despesas' | 'metas' | 'configuracoes' | 'admin';