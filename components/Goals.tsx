import React, { useMemo, useState } from 'react';
import { AppState, DreamGoal } from '../types';
import { formatarBRL, getMonthlyAggregates } from '../utils';
import { Target, TrendingUp, Calendar, Crown, Crosshair, HelpCircle, Plus, Trash2, Sparkles, Image as ImageIcon, Link, Loader2 } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
}

const Goals: React.FC<Props> = ({ state, updateState }) => {
  const [newDream, setNewDream] = useState({ name: '', val: '', manualUrl: '' });
  const [useAI, setUseAI] = useState(true);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  
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
      
      let finalImageUrl = '';

      if (useAI) {
          // Simplificando o prompt e a URL para garantir melhor compatibilidade
          const cleanName = newDream.name.trim().replace(/[^a-zA-Z0-9 ]/g, "");
          const encodedName = encodeURIComponent(cleanName + " luxury product 4k");
          // Usando uma seed para garantir que a imagem não mude a cada renderização, mas mude por item
          const seed = Math.floor(Math.random() * 10000);
          finalImageUrl = `https://image.pollinations.ai/prompt/${encodedName}?width=600&height=400&nologo=true&seed=${seed}&model=flux`;
      } else {
          finalImageUrl = newDream.manualUrl;
      }

      const newItem: DreamGoal = {
          id: Date.now(),
          name: newDream.name,
          targetValue: parseFloat(newDream.val),
          imageUrl: finalImageUrl,
          autoImage: useAI
      };

      const currentDreams = state.dreamGoals || [];
      updateState({ dreamGoals: [...currentDreams, newItem] });
      setNewDream({ name: '', val: '', manualUrl: '' });
  };

  const removeDream = (id: number) => {
      updateState({ dreamGoals: (state.dreamGoals || []).filter(d => d.id !== id) });
  };

  const handleImageError = (id: number) => {
      setImgErrors(prev => ({ ...prev, [id]: true }));
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
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Crown className="text-amber-400" /> Quadro dos Sonhos
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                        Use seu <span className="text-emerald-400 font-bold">Lucro Líquido Total ({formatarBRL(totalLifetimeNetProfit)})</span> para conquistar objetivos.
                    </p>
                </div>

                {/* Input Rápido */}
                <div className="w-full md:w-auto flex flex-col gap-3">
                    {/* Controles de Entrada */}
                    <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/10">
                        <div className="flex items-center gap-1 pr-2 border-r border-white/10">
                            <button 
                                onClick={() => setUseAI(true)}
                                className={`p-2 rounded-lg transition-colors ${useAI ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-white'}`}
                                title="Gerar Imagem com IA"
                            >
                                <Sparkles size={16} />
                            </button>
                            <button 
                                onClick={() => setUseAI(false)}
                                className={`p-2 rounded-lg transition-colors ${!useAI ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
                                title="URL Manual"
                            >
                                <Link size={16} />
                            </button>
                        </div>

                        <input 
                            type="text" placeholder={useAI ? "Ex: Porsche 911 Preto" : "Ex: Computador"} 
                            className="bg-transparent text-sm text-white px-3 py-2 outline-none w-full md:w-48 placeholder:text-gray-600"
                            value={newDream.name} onChange={e => setNewDream({...newDream, name: e.target.value})}
                        />
                        <input 
                            type="number" placeholder="Valor" 
                            className="bg-transparent text-sm text-white px-3 py-2 outline-none w-24 border-l border-white/10 placeholder:text-gray-600"
                            value={newDream.val} onChange={e => setNewDream({...newDream, val: e.target.value})}
                        />
                        <button onClick={handleAddDream} className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex-shrink-0">
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Campo de URL Manual (Condicional) */}
                    {!useAI && (
                        <input 
                            type="text" 
                            placeholder="Cole o link da imagem aqui..." 
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gray-500 outline-none animate-fade-in"
                            value={newDream.manualUrl}
                            onChange={e => setNewDream({...newDream, manualUrl: e.target.value})}
                        />
                    )}
                     {useAI && (
                        <p className="text-[10px] text-violet-400 text-right animate-fade-in flex items-center justify-end gap-1">
                            <Sparkles size={10} /> IA buscará a melhor foto
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(state.dreamGoals || []).map((goal) => {
                    const percent = (totalLifetimeNetProfit > 0 && goal.targetValue > 0) ? (totalLifetimeNetProfit / goal.targetValue) * 100 : 0;
                    const cappedPercent = Math.min(Math.max(percent, 0), 100);
                    const hasError = imgErrors[goal.id];
                    
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
                        <div 
                            key={goal.id} 
                            className="gateway-card rounded-2xl border border-white/10 hover:border-amber-500/50 transition-all duration-500 group relative overflow-hidden h-[320px] flex flex-col justify-end shadow-2xl"
                        >
                            {/* IMAGEM DE FUNDO */}
                            <div className="absolute inset-0 z-0 bg-gray-900">
                                {goal.imageUrl && !hasError ? (
                                    <img 
                                        src={goal.imageUrl} 
                                        alt={goal.name}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-70 group-hover:opacity-100"
                                        onError={() => handleImageError(goal.id)}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                                        <Crown size={60} className="text-white/10" />
                                    </div>
                                )}
                                {/* Overlay Gradiente Suave apenas na parte inferior */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#02000f] via-[#02000f]/80 to-transparent opacity-90 z-10"></div>
                            </div>

                            {/* Botão Delete (Topo Direita - Hover Only) */}
                            <div className="absolute top-4 right-4 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                                 <button onClick={() => removeDream(goal.id)} className="bg-black/60 hover:bg-rose-500 text-white p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-all shadow-lg hover:scale-110">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            {/* Conteúdo (Bottom) */}
                            <div className="p-6 relative z-20 w-full transform transition-transform duration-500 translate-y-2 group-hover:translate-y-0">
                                {/* Cabeçalho do Item */}
                                <div className="flex justify-between items-end mb-3">
                                    <div className="flex-1 mr-2">
                                         <h4 className="font-bold text-white text-xl leading-tight drop-shadow-lg line-clamp-1">{goal.name}</h4>
                                         <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-300 uppercase font-bold tracking-wider backdrop-blur-sm border border-white/5">
                                                Alvo: {formatarBRL(goal.targetValue)}
                                            </span>
                                         </div>
                                    </div>
                                    
                                     <div className="text-right">
                                        <span className={`text-3xl font-black font-mono tracking-tighter drop-shadow-lg ${percent >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                                            {Math.floor(cappedPercent)}<span className="text-lg">%</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="relative h-2.5 w-full bg-gray-800/50 rounded-full overflow-hidden border border-white/10 backdrop-blur-sm mb-3">
                                     <div 
                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_currentColor] ${percent >= 100 ? 'bg-emerald-500 text-emerald-500' : 'bg-gradient-to-r from-amber-500 to-yellow-400 text-yellow-400'}`}
                                        style={{ width: `${cappedPercent}%` }}
                                     >
                                        <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                     </div>
                                </div>

                                {/* Footer Info */}
                                <div className="flex justify-between items-center text-xs font-medium text-gray-400">
                                     <div className="flex items-center gap-1.5">
                                         {percent >= 100 ? (
                                            <span className="text-emerald-400 flex items-center gap-1 font-bold"><Crown size={12} fill="currentColor"/> Conquistado</span>
                                         ) : (
                                            <span className="text-amber-400 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Em progresso</span>
                                         )}
                                     </div>
                                     <div className="font-mono text-gray-500">
                                        {daysLeftStr}
                                     </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {(!state.dreamGoals || state.dreamGoals.length === 0) && (
                    <div className="col-span-full py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/5">
                        <ImageIcon size={48} className="mx-auto text-gray-600 mb-4" />
                        <h4 className="text-gray-400 font-bold">Nenhum sonho visualizado</h4>
                        <p className="text-gray-600 text-sm mt-1">Adicione objetivos e deixe a IA encontrar a imagem para você.</p>
                    </div>
                )}
            </div>
        </div>

    </div>
  );
};

export default Goals;