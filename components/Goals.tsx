import React, { useMemo, useState } from 'react';
import { AppState, DreamGoal } from '../types';
import { formatarBRL, getMonthlyAggregates } from '../utils';
import { Target, TrendingUp, Calendar, Crown, Crosshair, HelpCircle, Plus, Trash2, Car, Home, Smartphone, Plane } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
}

const Goals: React.FC<Props> = ({ state, updateState }) => {
  const [newDream, setNewDream] = useState({ name: '', val: '' });
  
  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();
  const todayDay = new Date().getDate();
  const currentMonthKey = `${currentYear}-${(currentMonthIndex + 1).toString().padStart(2, '0')}`;
  
  // Get aggregates
  const aggregates = useMemo(() => getMonthlyAggregates(state.dailyRecords, state.config.valorBonus), [state.dailyRecords, state.config.valorBonus]);

  // --- LOGIC: CURRENT MONTH ---
  const currentMonthStats = useMemo(() => {
    const goal = state.monthlyGoals[currentMonthKey] || 0;
    const actualRevenue = aggregates[currentMonthKey]?.profit || 0;
    const monthlyGeneralExpenses = state.generalExpenses
        .filter(e => e.date.startsWith(currentMonthKey))
        .reduce((acc, curr) => acc + curr.valor, 0);
    
    const netProfit = actualRevenue - monthlyGeneralExpenses;
    const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
    const remainingDays = daysInMonth - todayDay;
    
    // Average
    const currentDailyAvg = todayDay > 0 ? netProfit / todayDay : 0;
    
    // Projection
    const projection = currentDailyAvg * daysInMonth;
    
    // Required to hit goal
    const gap = goal - netProfit;
    const requiredDaily = remainingDays > 0 && gap > 0 ? gap / remainingDays : 0;

    return { 
        goal, 
        netProfit, 
        currentDailyAvg, 
        projection, 
        requiredDaily, 
        percent: goal > 0 ? (netProfit / goal) * 100 : 0,
        gap,
        monthName: new Date().toLocaleDateString('pt-BR', { month: 'long' })
    };
  }, [state, aggregates, currentMonthKey, todayDay]);


  // --- LOGIC: TOTAL ACCUMULATED PROFIT (FOR DREAMS) ---
  const totalLifetimeNetProfit = useMemo(() => {
     let total = 0;
     Object.keys(aggregates).forEach(key => {
         const revenue = aggregates[key].profit;
         const expenses = state.generalExpenses
            .filter(e => e.date.startsWith(key))
            .reduce((acc, curr) => acc + curr.valor, 0);
         total += (revenue - expenses);
     });
     return total;
  }, [aggregates, state.generalExpenses]);


  const handleGoalChange = (val: number) => {
    updateState({ monthlyGoals: { ...state.monthlyGoals, [currentMonthKey]: val } });
  };

  const handleAddDream = () => {
      if(!newDream.name || !newDream.val) return;
      const newItem: DreamGoal = {
          id: Date.now(),
          name: newDream.name,
          targetValue: parseFloat(newDream.val)
      };
      // Inicializa array se não existir (para compatibilidade)
      const currentDreams = state.dreamGoals || [];
      updateState({ dreamGoals: [...currentDreams, newItem] });
      setNewDream({ name: '', val: '' });
  };

  const removeDream = (id: number) => {
      updateState({ dreamGoals: (state.dreamGoals || []).filter(d => d.id !== id) });
  };

  return (
    <div className="space-y-10 animate-fade-in max-w-[1600px] mx-auto pb-20">
        
        {/* --- HEADER --- */}
        <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-900/20">
                <Target size={28} className="text-white" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Metas & Sonhos</h2>
                <p className="text-gray-400">Acompanhamento tático mensal e objetivos de vida.</p>
            </div>
        </div>

        {/* --- SEÇÃO 1: PAINEL TÁTICO MENSAL (ATUAL) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Card Principal: Mês Atual */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-8 relative overflow-hidden border border-primary/30 bg-primary/5">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <Calendar size={180} />
                </div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                             <span className="bg-primary px-3 py-1 rounded text-xs font-bold text-white uppercase tracking-widest">Mês Atual</span>
                             <span className="text-gray-400 font-mono text-sm uppercase">{currentMonthStats.monthName} {currentYear}</span>
                        </div>
                        <h3 className="text-4xl font-black text-white font-mono tracking-tight">
                            {formatarBRL(currentMonthStats.netProfit)}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium mt-1">Lucro Líquido Realizado (YTD)</p>
                    </div>

                    <div className="text-right">
                         <label className="text-xs text-gray-500 font-bold uppercase block mb-1">Meta do Mês</label>
                         <div className="flex items-center gap-2 justify-end">
                             <span className="text-gray-500 font-bold">R$</span>
                             <input 
                                type="number" 
                                className="bg-black/30 border border-white/10 rounded-lg py-1 px-3 w-32 text-right text-white font-bold font-mono outline-none focus:border-primary transition-colors"
                                value={currentMonthStats.goal}
                                onChange={e => handleGoalChange(parseFloat(e.target.value)||0)}
                             />
                         </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative z-10 mb-8">
                     <div className="flex justify-between text-xs font-bold mb-2">
                         <span className="text-primary-glow">{currentMonthStats.percent.toFixed(1)}% Concluído</span>
                         <span className="text-gray-500">Alvo: {formatarBRL(currentMonthStats.goal)}</span>
                     </div>
                     <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                         <div 
                            className="h-full bg-gradient-to-r from-primary to-accent-cyan transition-all duration-1000 relative"
                            style={{ width: `${Math.min(currentMonthStats.percent, 100)}%` }}
                         >
                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                         </div>
                     </div>
                </div>

                {/* Grid de Métricas Avançadas */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Ritmo Atual (Dia)</p>
                        <p className={`text-xl font-black font-mono ${currentMonthStats.currentDailyAvg < 0 ? 'text-rose-400' : 'text-white'}`}>
                            {formatarBRL(currentMonthStats.currentDailyAvg)}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-1">Média diária realizada</p>
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Projeção Final</p>
                        <p className={`text-xl font-black font-mono ${currentMonthStats.projection >= currentMonthStats.goal ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {formatarBRL(currentMonthStats.projection)}
                        </p>
                         <p className="text-[10px] text-gray-500 mt-1">Se mantiver o ritmo atual</p>
                    </div>

                    <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative group">
                        <div className="absolute top-2 right-2 text-gray-600 cursor-help">
                            <HelpCircle size={14} />
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-xs text-gray-300 p-2 rounded border border-white/10 hidden group-hover:block z-50">
                                Para cobrir o valor negativo e atingir a meta positiva, o esforço é somado.
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Falta para a Meta</p>
                        {currentMonthStats.gap > 0 ? (
                            <>
                                <p className="text-xl font-black font-mono text-rose-400">
                                    {formatarBRL(currentMonthStats.gap)}
                                </p>
                                <p className="text-[10px] text-rose-300/70 mt-1 font-bold">
                                    Necessário: {formatarBRL(currentMonthStats.requiredDaily)} / dia
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-xl font-black font-mono text-emerald-400">BATIDA!</p>
                                <p className="text-[10px] text-emerald-500/70 mt-1 font-bold">Parabéns pelo resultado</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Coluna Lateral: Explicação Rápida */}
            <div className="gateway-card rounded-2xl p-6 flex flex-col justify-center gap-6 border-l-4 border-l-accent-cyan">
                <div>
                    <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                        <Crosshair className="text-accent-cyan" size={20} /> Análise de GAP
                    </h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Se o valor realizado for negativo (Ex: <span className="text-rose-400">-R$ 143</span>), o GAP soma esse prejuízo à meta. 
                        Para chegar em R$ 10.000 partindo de -143, você precisa gerar <span className="text-white font-bold">R$ 10.143</span>.
                    </p>
                </div>
                <div className="h-px bg-white/5"></div>
                <div>
                     <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="text-accent-cyan" size={20} /> Aceleração
                    </h4>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Sua média diária atual é {formatarBRL(currentMonthStats.currentDailyAvg)}. 
                        {currentMonthStats.gap > 0 && (
                            <> Para bater a meta, você precisa aumentar seu ritmo para <span className="text-accent-cyan font-bold">{formatarBRL(currentMonthStats.requiredDaily)}</span> por dia nos dias restantes.</>
                        )}
                    </p>
                </div>
            </div>
        </div>

        {/* --- SEÇÃO 2: SONHOS & BENS (DREAM GOALS) --- */}
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Crown className="text-amber-400" /> Quadro dos Sonhos
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Use seu <span className="text-emerald-400 font-bold">Lucro Líquido Total ({formatarBRL(totalLifetimeNetProfit)})</span> para conquistar objetivos.
                    </p>
                </div>

                {/* Input Rápido */}
                <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                    <input 
                        type="text" placeholder="Ex: Moto, Macbook..." 
                        className="bg-transparent text-sm text-white px-3 py-2 outline-none w-32 sm:w-48 placeholder:text-gray-600"
                        value={newDream.name} onChange={e => setNewDream({...newDream, name: e.target.value})}
                    />
                    <input 
                        type="number" placeholder="Valor" 
                        className="bg-transparent text-sm text-white px-3 py-2 outline-none w-24 border-l border-white/10 placeholder:text-gray-600"
                        value={newDream.val} onChange={e => setNewDream({...newDream, val: e.target.value})}
                    />
                    <button onClick={handleAddDream} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(state.dreamGoals || []).map((goal) => {
                    const percent = (totalLifetimeNetProfit > 0 && goal.targetValue > 0) ? (totalLifetimeNetProfit / goal.targetValue) * 100 : 0;
                    const cappedPercent = Math.min(Math.max(percent, 0), 100);
                    
                    // Cálculo de Tempo Estimado
                    let daysLeftStr = "---";
                    if (percent < 100 && currentMonthStats.currentDailyAvg > 0) {
                        const remaining = goal.targetValue - totalLifetimeNetProfit;
                        const days = Math.ceil(remaining / currentMonthStats.currentDailyAvg);
                        daysLeftStr = `${days} dias`;
                    } else if (percent >= 100) {
                        daysLeftStr = "Conquistado!";
                    } else if (currentMonthStats.currentDailyAvg <= 0) {
                         daysLeftStr = "Aumente o ritmo";
                    }

                    return (
                        <div key={goal.id} className="gateway-card rounded-xl p-5 border border-white/5 hover:border-amber-500/30 transition-all group relative overflow-hidden">
                            {/* Ícone de Fundo */}
                            <div className="absolute -bottom-4 -right-4 text-white/5 group-hover:text-amber-500/10 transition-colors pointer-events-none">
                                <Crown size={100} />
                            </div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h4 className="font-bold text-white text-lg">{goal.name}</h4>
                                    <p className="text-gray-500 text-xs font-mono font-bold uppercase tracking-wider">Alvo: {formatarBRL(goal.targetValue)}</p>
                                </div>
                                <button onClick={() => removeDream(goal.id)} className="text-gray-600 hover:text-rose-500 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-end mb-2">
                                    <span className={`text-2xl font-black font-mono ${percent >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                                        {percent.toFixed(1)}%
                                    </span>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">Estimativa</p>
                                        <p className="text-xs font-bold text-amber-400">{daysLeftStr}</p>
                                    </div>
                                </div>

                                <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${percent >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'}`}
                                        style={{ width: `${cappedPercent}%` }}
                                    ></div>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-2 text-center">
                                    Baseado no lucro total acumulado e ritmo atual.
                                </p>
                            </div>
                        </div>
                    );
                })}

                {(!state.dreamGoals || state.dreamGoals.length === 0) && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                        <Crown size={48} className="mx-auto text-gray-600 mb-4" />
                        <h4 className="text-gray-400 font-bold">Nenhum sonho cadastrado</h4>
                        <p className="text-gray-600 text-sm mt-1">Adicione objetivos acima para projetar suas conquistas.</p>
                    </div>
                )}
            </div>
        </div>

    </div>
  );
};

export default Goals;