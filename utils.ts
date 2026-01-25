import { AppState, GeneratedPlayer, GeneratorParams, HistoryItem, DayRecord } from './types';

export const formatarBRL = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const getHojeISO = () => {
    const d = new Date();
    // Ajuste para fuso horário local simples para evitar problemas de UTC
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getMesAnoAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
};

export const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

// Helper to get numbers from manual textarea input
export const getManualAvoidanceValues = (text: string): Set<number> => {
    const manualNumbers = (text.match(/\d+/g) || []).map(Number).filter(v => isFinite(v) && v > 0);
    return new Set(manualNumbers);
};

// V36 Smart Value Generation Logic
export const generateSmartValue = (
    min: number, 
    max: number, 
    generatedPlanValues: Set<number>, 
    historicalSet: Set<number>
): number => {
    let safeMin = Math.ceil(min);
    let safeMax = Math.floor(max);
    if (safeMin > safeMax) { safeMax = safeMin + 10; }
    
    const rangeSize = safeMax - safeMin + 1;
    const saturation = generatedPlanValues.size;
    // Força variedade se o range for grande e não estiver saturado
    const forceVariety = (rangeSize > 50 && saturation < (rangeSize * 0.8));

    // 1. Tenta Números "Bonitos" (terminados em 0 ou 5) se forçar variedade
    if (forceVariety) {
        for (let i = 0; i < 30; i++) {
            let val = randomInt(safeMin, safeMax);
            let valRound = Math.round(val / 5) * 5;
            if (valRound < safeMin) valRound = safeMin; 
            if (valRound > safeMax) valRound = safeMax;

            if (!generatedPlanValues.has(valRound) && !historicalSet.has(valRound)) {
                generatedPlanValues.add(valRound);
                return valRound;
            }
        }
    }

    // 2. Tenta qualquer número ÚNICO (no plano e no histórico)
    for (let i = 0; i < 100; i++) {
        let val = randomInt(safeMin, safeMax);
        if (!generatedPlanValues.has(val) && !historicalSet.has(val)) {
            generatedPlanValues.add(val);
            return val;
        }
    }

    // 3. Tenta número ÚNICO apenas no PLANO ATUAL (ignora histórico se saturado)
    for (let i = 0; i < 50; i++) {
        let val = randomInt(safeMin, safeMax);
        if (!generatedPlanValues.has(val)) {
            generatedPlanValues.add(val);
            return val;
        }
    }

    // 4. Fallback (Desespero - repete valor)
    return randomInt(safeMin, safeMax);
};

export const regeneratePlayerValues = (
    player: GeneratedPlayer,
    params: GeneratorParams,
    generatedPlanValues: Set<number>,
    historicalSet: Set<number>
): GeneratedPlayer => {
    let deps: { val: number; type: 'deposito' | 'redeposito' }[] = [];
    const { perfil } = player;

    const isTestador = perfil.includes('Testador') || perfil.includes('Extra');
    const isCetico = perfil.includes('Cético');
    const isAmbicioso = perfil.includes('Ambicioso');
    const isViciado = perfil.includes('Viciado');

    if (isTestador) { 
         const val = generateSmartValue(params.minBaixo, params.maxBaixo, generatedPlanValues, historicalSet);
         deps.push({ val, type: 'deposito' });
    } else if (isCetico) {
         const v1 = generateSmartValue(params.minBaixo, params.maxBaixo, generatedPlanValues, historicalSet);
         const v2 = generateSmartValue(params.minBaixo, params.maxBaixo, generatedPlanValues, historicalSet);
         deps.push({ val: v1, type: 'deposito' });
         deps.push({ val: v2, type: 'deposito' });
    } else if (isAmbicioso) {
         const minDep1 = params.minBaixo; 
         const maxDep1 = Math.floor(params.alvo * 0.6);
         const v1 = generateSmartValue(minDep1, maxDep1, generatedPlanValues, historicalSet);
         
         const diff = params.alvo - v1;
         const minDep2 = Math.max(params.minBaixo, diff - 10);
         const maxDep2 = diff + 15;
         const v2 = generateSmartValue(minDep2, maxDep2, generatedPlanValues, historicalSet);
         
         deps.push({ val: v1, type: 'deposito' });
         deps.push({ val: v2, type: 'deposito' });
    } else if (isViciado) {
         const v1 = generateSmartValue(params.minAlto, params.maxAlto, generatedPlanValues, historicalSet);
         const v2 = generateSmartValue(params.minBaixo, params.maxBaixo, generatedPlanValues, historicalSet);
         const v3 = generateSmartValue(params.minBaixo, params.maxBaixo, generatedPlanValues, historicalSet);
         deps.push({ val: v1, type: 'deposito' });
         deps.push({ val: v2, type: 'redeposito' });
         deps.push({ val: v3, type: 'redeposito' });
    } else {
         // Fallback se algo der errado
         const val = generateSmartValue(params.minBaixo, params.maxBaixo, generatedPlanValues, historicalSet);
         deps.push({ val, type: 'deposito' });
    }

    const total = deps.reduce((a, b) => a + b.val, 0);
    return { ...player, deps, total };
};

export const generatePlan = (
  count: number,
  totalAgentes: number,
  distribuicao: Record<number, number>,
  params: GeneratorParams,
  history: HistoryItem[],
  manualAvoidanceSet: Set<number>
): GeneratedPlayer[] => {
  
  // 1. Criação do Pool de Agentes (LÓGICA RÍTMICA V36)
  // Intercala 1, 2, 3, 4, 1, 2, 3, 4... respeitando as quantidades
  let agentPool: number[] = [];
  let distTemp = { ...distribuicao };
  let assigned = 0;
  
  // Ordena IDs para garantir ciclo 1 -> N
  const agentIds = Object.keys(distTemp)
    .map(Number)
    .filter(id => id <= totalAgentes)
    .sort((a,b) => a-b);

  // Loop Rítmico
  while (assigned < count) {
    let addedInThisCycle = false;
    for (let id of agentIds) {
        if ((distTemp[id] || 0) > 0) {
            agentPool.push(id);
            distTemp[id]--;
            assigned++;
            addedInThisCycle = true;
            // Se atingiu o total, para imediatamente
            if (assigned >= count) break;
        }
    }
    // Se nenhum foi adicionado no ciclo mas ainda falta gente, break para evitar loop infinito
    if (!addedInThisCycle && assigned < count) {
        // Fallback: preenche com Agente 1 se acabar a distribuição definida
        while(assigned < count) {
            agentPool.push(1);
            assigned++;
        }
    }
  }

  // NÃO EMBARALHA O AGENT POOL (Mantém o ritmo V36)

  // 2. Criação do Pool de Perfis
  const c = (pct: number) => Math.round(count * (pct / 100));
  let countTestador = c(params.testador);
  let countCetico = c(params.cetico);
  let countAmbicioso = c(params.ambicioso);
  let countViciado = count - countTestador - countCetico - countAmbicioso;
  
  // Ajuste fino para bater exatamente o total
  let currentTotal = countTestador + countCetico + countAmbicioso + countViciado;
  if (currentTotal < count) countTestador += (count - currentTotal);
  else if (currentTotal > count) countTestador -= (currentTotal - count);

  let profilePool: string[] = [];
  for (let i = 0; i < countTestador; i++) profilePool.push('🛡️ Testador');
  for (let i = 0; i < countCetico; i++) profilePool.push('🧐 Cético');
  for (let i = 0; i < countAmbicioso; i++) profilePool.push('📈 Ambicioso');
  for (let i = 0; i < countViciado; i++) profilePool.push('🎰 Viciado');
  
  // Perfis SÃO embaralhados (ao contrário dos agentes)
  profilePool.sort(() => Math.random() - 0.5);

  // 3. Geração de Valores (Smart Value)
  const historicalSet = new Set(history.map(h => h.valor));
  manualAvoidanceSet.forEach(v => historicalSet.add(v));
  
  const generatedPlanValues = new Set<number>();
  let newPlan: GeneratedPlayer[] = [];
  let pId = 1;

  // Combina Pool de Agentes (Rítmico) com Pool de Perfis (Aleatório)
  for(let i=0; i < count; i++) {
    const perfil = profilePool[i];
    const agent = agentPool[i];
    
    const tempPlayer: GeneratedPlayer = {
        id: `JOGADOR_${String(pId++).padStart(3, '0')}`,
        perfil,
        agent,
        total: 0,
        deps: []
    };
    newPlan.push(regeneratePlayerValues(tempPlayer, params, generatedPlanValues, historicalSet));
  }

  return newPlan;
};

// Adjustment Logic
export const generateConstrainedSum = (total: number, count: number, min: number, max: number): number[] => {
    const depositos: number[] = [];
    let somaAtual = 0;
    const media = Math.round(total / count);
    
    for (let i = 0; i < count; i++) {
        // Tenta ficar perto da média para suavizar
        const minGeracao = Math.max(min, media - 10);
        const maxGeracao = Math.min(max, media + 10);
        let valor = randomInt(minGeracao, maxGeracao);
        
        // Garante limites absolutos
        if (valor < min) valor = min;
        if (valor > max) valor = max;

        depositos.push(valor);
        somaAtual += valor;
    }
    
    // Distribui a diferença (erro de arredondamento ou randomização)
    let diferenca = total - somaAtual;
    let loops = 0;
    while (diferenca !== 0 && loops < 10000) {
        const idx = Math.floor(Math.random() * count);
        if (diferenca > 0 && depositos[idx] < max) {
            depositos[idx]++;
            diferenca--;
        } else if (diferenca < 0 && depositos[idx] > min) {
            depositos[idx]--;
            diferenca++;
        }
        loops++;
    }
    // Se ainda sobrar diferença (pq atingiu limites min/max), joga no último
    if (diferenca !== 0) depositos[count - 1] += diferenca;
    return depositos;
};

export const calculateDayMetrics = (record?: DayRecord, bonus: number = 20) => {
    if (!record) return { invest: 0, ret: 0, lucro: 0, despesas: 0 };
    
    const desp = (record.expenses.proxy || 0) + (record.expenses.numeros || 0);
    let inv = 0;
    let ret = 0;
    
    record.accounts.forEach(a => {
        inv += (a.deposito || 0) + (a.redeposito || 0);
        ret += (a.saque || 0) + ((a.ciclos || 0) * bonus);
    });

    return { 
        invest: inv + desp, 
        ret, 
        lucro: ret - (inv + desp),
        despesas: desp 
    };
};

export const getMonthlyAggregates = (records: Record<string, DayRecord>, bonus: number) => {
  const months: Record<string, { revenue: number; expenses: number; profit: number }> = {};
  
  Object.entries(records).forEach(([date, record]) => {
    const monthKey = date.substring(0, 7); // YYYY-MM
    if (!months[monthKey]) months[monthKey] = { revenue: 0, expenses: 0, profit: 0 };
    
    const metrics = calculateDayMetrics(record, bonus);
    months[monthKey].revenue += metrics.ret;
    months[monthKey].expenses += metrics.invest;
    months[monthKey].profit += metrics.lucro;
  });
  
  return months;
};