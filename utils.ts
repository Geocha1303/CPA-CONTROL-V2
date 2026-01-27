import { AppState, GeneratedPlayer, GeneratorParams, HistoryItem, DayRecord, Config, GeneralExpense, DreamGoal } from './types';

// Utility para mesclar objetos profundamente (Deep Merge)
export const mergeDeep = (target: any, source: any): any => {
    if (typeof target !== 'object' || target === null) return source !== undefined ? source : target;
    if (Array.isArray(target)) return Array.isArray(source) ? source : target;
    if (typeof source !== 'object' || source === null || Array.isArray(source)) return target;
    const output = { ...target };
    Object.keys(source).forEach(key => {
        if (target[key] !== undefined) output[key] = mergeDeep(target[key], source[key]);
        else output[key] = source[key];
    });
    return output;
};

export const formatarBRL = (value: number | undefined | null) => {
  // Proteção contra NaN/Infinity/Null
  if (value === undefined || value === null || isNaN(value) || !isFinite(value)) {
      return 'R$ 0,00';
  }
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
    // Safety check para bonus
    const safeBonus = (typeof bonus === 'number' && !isNaN(bonus)) ? bonus : 20;

    if (!record) return { invest: 0, ret: 0, lucro: 0, despesas: 0 };
    
    // Safety check para despesas
    const proxyCost = (typeof record.expenses?.proxy === 'number') ? record.expenses.proxy : 0;
    const numerosCost = (typeof record.expenses?.numeros === 'number') ? record.expenses.numeros : 0;
    const desp = proxyCost + numerosCost;

    let inv = 0;
    let ret = 0;
    
    if (Array.isArray(record.accounts)) {
        record.accounts.forEach(a => {
            const dep = (typeof a.deposito === 'number') ? a.deposito : 0;
            const redep = (typeof a.redeposito === 'number') ? a.redeposito : 0;
            const saque = (typeof a.saque === 'number') ? a.saque : 0;
            const ciclos = (typeof a.ciclos === 'number') ? a.ciclos : 0;

            inv += dep + redep;
            ret += saque + (ciclos * safeBonus);
        });
    }

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

// --- DEMO DATA GENERATOR ---
export const generateDemoState = (baseConfig: Config): AppState => {
    const now = new Date();
    const dailyRecords: Record<string, DayRecord> = {};
    const generalExpenses: GeneralExpense[] = [];
    const history: HistoryItem[] = [];
    const safeBonus = baseConfig.valorBonus || 20;
    
    // 30 dias de dados
    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // Fatores de crescimento orgânico
        const growthTrend = (30 - i) * 80; // Crescimento linear
        
        const numAccounts = Math.floor(randomInt(5, 12) + (growthTrend / 200));
        const accounts = [];
        
        let dayProxy = 0;
        
        for(let j=0; j<numAccounts; j++) {
            // Gera valores de Investimento
            const dep = randomInt(40, 100);
            const redep = Math.random() > 0.7 ? randomInt(20, 50) : 0;
            const totalInvest = dep + redep;

            // Gera Lucro Garantido (Entre 1.2x e 1.8x do investimento)
            const profitFactor = 1.2 + (Math.random() * 0.6); 
            const desiredReturn = totalInvest * profitFactor;

            // Calcula componentes do retorno (Saque + Bônus)
            const cycles = randomInt(1, 3);
            const bonusTotal = cycles * safeBonus;
            
            // O saque é o que sobra para atingir o retorno desejado
            // Se o bônus já cobriu, o saque é menor, mas nunca negativo.
            let saque = Math.floor(desiredReturn - bonusTotal);
            if (saque < 0) saque = 0;

            // REMOVED: Random loss chance. All demo data is now profitable.

            // Custos operacionais simulados
            dayProxy += 2.50;

            accounts.push({
                id: Date.now() - (i * 100000) + j,
                deposito: dep,
                redeposito: redep,
                saque: saque,
                ciclos: cycles
            });
            
            history.push({ valor: dep, tipo: 'deposito' });
            if(redep > 0) history.push({ valor: redep, tipo: 'redeposito' });
        }

        dailyRecords[dateKey] = {
            expenses: {
                proxy: parseFloat(dayProxy.toFixed(2)),
                numeros: parseFloat((numAccounts * 1.5).toFixed(2)) // SMS cost
            },
            accounts
        };

        // Adiciona despesas gerais aleatórias
        if (i % 7 === 0) { // Semanal
             generalExpenses.push({
                 id: Date.now() - (i * 100000),
                 date: dateKey,
                 description: 'Renovação de Proxy 4G',
                 valor: 150.00,
                 recorrente: true
             });
        }
        if (i === 15) { // Mensal
            generalExpenses.push({
                 id: Date.now() - (i * 100000) + 1,
                 date: dateKey,
                 description: 'Servidor VPS Dedicado',
                 valor: 350.00,
                 recorrente: true
             });
        }
    }

    // Metas
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyGoals = { [currentMonthKey]: 15000 };

    // Sonhos com FOTOS REAIS (Unsplash) - Nada de IA Feia
    const dreamGoals: DreamGoal[] = [
        {
            id: 1,
            name: "Air Jordan 1 High",
            targetValue: 1500,
            imageUrl: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?q=80&w=800&auto=format&fit=crop",
            autoImage: false
        },
        {
            id: 2,
            name: "PlayStation 5 Slim",
            targetValue: 3800,
            imageUrl: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=800&auto=format&fit=crop",
            autoImage: false
        },
        {
            id: 3,
            name: "Yamaha MT-03 ABS",
            targetValue: 34500,
            imageUrl: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?q=80&w=800&auto=format&fit=crop",
            autoImage: false
        },
        {
            id: 4,
            name: "Porsche 911 Carrera",
            targetValue: 850000,
            imageUrl: "https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=800&auto=format&fit=crop",
            autoImage: false
        }
    ];

    // Planning Fake
    const fakeParams: GeneratorParams = { 
        testador: 40, cetico: 30, ambicioso: 20, viciado: 10, 
        minBaixo: 30, maxBaixo: 60, minAlto: 80, maxAlto: 200, alvo: 150 
    };

    const demoPlan = generatePlan(
        15, // 15 jogadores no plano
        2, 
        {1: 8, 2: 7}, 
        fakeParams, 
        history, 
        new Set()
    );

    return {
        dailyRecords,
        generalExpenses,
        monthlyGoals,
        dreamGoals,
        config: baseConfig,
        generator: {
            plan: demoPlan,
            totalAgentes: 2,
            jogadoresPorCiclo: 5,
            distribuicaoAgentes: {1: 8, 2: 7},
            params: fakeParams,
            history,
            lotWithdrawals: {},
            customLotSizes: {}
        }
    };
};