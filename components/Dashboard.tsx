import React, { useMemo, useState } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Area
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowDownRight,
  Filter, PieChart as PieIcon, History, CheckCircle2, ArrowUpRight,
  MoreHorizontal, Wallet, CalendarOff, HelpCircle, BarChart3, TrendingDown,
  Calendar, Flame, Sparkles, Globe, User, RefreshCw, Lock // Novos ícones
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  state: AppState;
  privacyMode?: boolean; // Nova prop
}

const Dashboard: React.FC<Props> = ({ state, privacyMode }) => {
  // --- GLOBAL INTELLIGENCE STATE ---
  const [analysisMode, setAnalysisMode] = useState<'local' | 'global'>('local');
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalAggregatedData, setGlobalAggregatedData] = useState<Record<string, DayRecord>>({});
  const [globalUserCount, setGlobalUserCount] = useState(0);

  // --- FETCH GLOBAL DATA ---
  const handleToggleMode = async () => {
      if (analysisMode === 'global') {
          setAnalysisMode('local');
          return;
      }

      setIsLoadingGlobal(true);
      try {
          // Busca dados de todos os usuários (limitado pelas políticas RLS do Supabase)
          // Se o RLS estiver ativo e restrito, retornará apenas os dados do próprio usuário ou do squad.
          const { data, error } = await supabase
              .from('user_data')
              .select('raw_json');

          if (error) throw error;

          if (data) {
              const aggregated: Record<string, DayRecord> = {};
              let userCount = 0;

              data.forEach((row: any) => {
                  const userData = row.raw_json as AppState;
                  if (!userData || !userData.dailyRecords) return;
                  
                  userCount++;
                  const bonusVal = userData.config?.valorBonus || 20; // Usa o config de CADA usuário

                  Object.entries(userData.dailyRecords).forEach(([date, record]) => {
                      if (!aggregated[date]) {
                          aggregated[date] = { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
                      }
                      
                      // Para evitar conflito de IDs de contas, recriamos métricas simplificadas ou apenas acumulamos
                      // Aqui, vamos fundir os arrays de contas para o cálculo funcionar nativamente
                      // Ajustando o 'ciclos' se necessário para normalizar valor monetário seria complexo,
                      // então vamos assumir a estrutura padrão.
                      
                      // Clonar contas para não mutar
                      const accountsClone = record.accounts.map(acc => ({
                          ...acc,
                          // Truque: Se o usuário usa modo manual, o valor já está em 'ciclos'.
                          // Se usa modo auto, 'ciclos' é qtd. O calculateMetrics lida com isso se passarmos o bonus certo.
                          // Como estamos agregando num "Super Record", precisamos normalizar o LUCRO JÁ CALCULADO.
                          // Mas calculateDayMetrics pede um record. 
                          // Abordagem: Vamos apenas somar tudo num "Mega DayRecord" mantendo a estrutura.
                          // Porém, o multiplier varia por user.
                          // SOLUÇÃO: Converter tudo para "Modo Manual" (Valor Monetário) no agregado.
                          ciclos: (userData.config.manualBonusMode ? acc.ciclos : (acc.ciclos * bonusVal)),
                          id: Math.random() // Random ID para não dar key conflict no React se fossemos renderizar lista
                      }));

                      aggregated[date].accounts.push(...accountsClone);
                      aggregated[date].expenses.proxy += record.expenses.proxy;
                      aggregated[date].expenses.numeros += record.expenses.numeros;
                  });
              });

              setGlobalAggregatedData(aggregated);
              setGlobalUserCount(userCount);
              setAnalysisMode('global');
          }
      } catch (err) {
          console.error("Erro ao buscar dados globais:", err);
          alert("Não foi possível acessar a inteligência global no momento (Verifique permissões ou conexão).");
      } finally {
          setIsLoadingGlobal(false);
      }
  };

  const metrics = useMemo(() => {
    // 1. Filtragem de Datas
    const hojeISO = getHojeISO();
    const allDates = Object.keys(state.dailyRecords).sort();
    const pastAndPresentDates = allDates.filter(d => d <= hojeISO);

    let totalInv = 0;
    let totalRet = 0;
    let totalLucro = 0;
    let totalDespGeral = 0;
    let totalCheckoutEvents = 0; 
    
    // Breakdown Data
    let totalDepositos = 0;
    let totalRedepositos = 0;
    
    // ADJUSTED LOGIC: If manual mode is on, multiplier is 1 (direct value)
    const bonusMultiplier = (state.config.manualBonusMode) ? 1 : (state.config.valorBonus || 20);

    // --- PREPARAÇÃO DOS DADOS DO GRÁFICO ---
    let chartData = pastAndPresentDates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], bonusMultiplier);
        const record = state.dailyRecords[date];

        // Accumulate specific breakdowns (Total Global não filtra data, mostra tudo que tem no banco)
        if(record && record.accounts) {
            record.accounts.forEach(acc => {
                totalDepositos += (acc.deposito || 0);
                totalRedepositos += (acc.redeposito || 0);
            });
        }

        const safeInvest = isNaN(m.invest) ? 0 : m.invest;
        const safeRet = isNaN(m.ret) ? 0 : m.ret;
        const safeLucro = isNaN(m.lucro) ? 0 : m.lucro;

        return {
            dateStr: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            dateObj: new Date(date),
            fullDate: date,
            lucro: safeLucro,
            faturamento: safeRet,
            investimento: safeInvest,
            hasActivity: safeRet > 0 || safeInvest > 0 // Flag para saber se houve movimento
        };
    });

    // --- A MÁGICA: FILTRAR DIAS ZERADOS (Exceto Hoje) ---
    const cleanChartData = chartData.filter(item => item.hasActivity || item.fullDate === hojeISO);


    // Totais Reais (Consideram todo o histórico do state)
    if (Array.isArray(state.generalExpenses)) {
        state.generalExpenses.forEach(e => {
            const val = parseFloat(String(e.valor));
            if (!isNaN(val)) totalDespGeral += val;
        });
    }

    // Reset e calcula full history para os cards KPI
    totalInv = 0; totalRet = 0; totalLucro = 0; totalDepositos = 0; totalRedepositos = 0; totalCheckoutEvents = 0;
    allDates.forEach(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], bonusMultiplier);
        const record = state.dailyRecords[date];
        if(record && record.accounts) {
            record.accounts.forEach(acc => {
                totalDepositos += (acc.deposito || 0);
                totalRedepositos += (acc.redeposito || 0);
                totalCheckoutEvents += 1; 
            });
        }
        totalInv += (isNaN(m.invest) ? 0 : m.invest);
        totalRet += (isNaN(m.ret) ? 0 : m.ret);
        totalLucro += (isNaN(m.lucro) ? 0 : m.lucro);
    });

    const lucroLiquido = totalLucro - totalDespGeral;
    const totalInvestimentoReal = totalInv + totalDespGeral;
    
    // PIE CHART DATA
    const pieData = [
        { name: 'Depósitos', value: totalDepositos, color: '#6366f1' }, // Indigo
        { name: 'Redepósitos', value: totalRedepositos, color: '#a855f7' }, // Purple
        { name: 'Custos', value: (totalDespGeral + (totalInv - totalDepositos - totalRedepositos)), color: '#ef4444' } // Red
    ].filter(d => d.value > 0);

    const pieDisplayData = pieData.length > 0 ? pieData : [
        { name: 'Sem dados', value: 100, color: '#333' }
    ];

    const roi = (totalInvestimentoReal > 0) 
        ? ((totalRet - totalInvestimentoReal) / totalInvestimentoReal) * 100 
        : 0;
        
    const margin = (totalRet > 0) 
        ? (lucroLiquido / totalRet) * 100 
        : 0;

    // --- RECENT ACTIVITY LOGIC ---
    const allAccounts: any[] = [];
    Object.entries(state.dailyRecords).forEach(([date, record]) => {
        const dayRecord = record as DayRecord;
        if(dayRecord.accounts){
            dayRecord.accounts.forEach(acc => {
                const invest = (acc.deposito || 0) + (acc.redeposito || 0);
                const ret = (acc.saque || 0) + ((acc.ciclos || 0) * bonusMultiplier);
                const profit = ret - invest;
                allAccounts.push({ ...acc, date, profit, ret });
            });
        }
    });
    const recentActivity = allAccounts.sort((a, b) => b.id - a.id).slice(0, 8);

    const hasData = cleanChartData.some(d => d.hasActivity);

    return {
        totalInv: totalInvestimentoReal,
        totalRet,
        lucroLiquido,
        chartData: cleanChartData, 
        pieData: pieDisplayData,
        roi: isNaN(roi) ? 0 : roi,
        margin: isNaN(margin) ? 0 : margin,
        totalCheckoutEvents,
        recentActivity,
        hasData
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  // --- HEATMAP & SEASONALITY LOGIC (LOCAL OR GLOBAL) ---
  const intelligenceData = useMemo(() => {
      const dayStats: Record<number, { profit: number; count: number }> = { 0: {profit:0, count:0}, 1: {profit:0, count:0}, 2: {profit:0, count:0}, 3: {profit:0, count:0}, 4: {profit:0, count:0}, 5: {profit:0, count:0}, 6: {profit:0, count:0} };
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      
      // SELECIONA A FONTE DE DADOS
      const activeRecords = analysisMode === 'global' ? globalAggregatedData : state.dailyRecords;
      
      // Se for Local, usa o config do state. Se for Global, assumimos que já normalizamos para ManualMode (multiplier = 1) no fetch.
      const bonusMultiplier = analysisMode === 'global' 
        ? 1 
        : (state.config.manualBonusMode ? 1 : (state.config.valorBonus || 20));

      // Populate Stats
      Object.keys(activeRecords).forEach(date => {
          const m = calculateDayMetrics(activeRecords[date], bonusMultiplier);
          const dayIndex = new Date(date).getDay(); // 0-6
          if(m.lucro !== 0) {
              dayStats[dayIndex].profit += m.lucro;
              dayStats[dayIndex].count += 1;
          }
      });

      // Heatmap Data (Day of Week)
      let maxProfit = 0;
      const heatmapData = Object.keys(dayStats).map(key => {
          const k = parseInt(key);
          const total = dayStats[k].profit;
          if (total > maxProfit) maxProfit = total;
          return { day: dayNames[k], profit: total, index: k };
      });

      // Best Day Analysis
      let bestDay = { name: '---', profit: -Infinity };
      heatmapData.forEach(d => {
          if(d.profit > bestDay.profit) bestDay = { name: d.day, profit: d.profit };
      });

      // Calendar Alert (Example Logic)
      const today = new Date();
      const currentDay = today.getDate();
      let alertMsg = "";
      if (currentDay === 5 || currentDay === 20) {
          alertMsg = "🔥 Dia de Pagamento no Brasil! Volume alto esperado.";
      } else if (currentDay >= 28) {
          alertMsg = "⚠️ Fim de mês: Plataformas tendem a recolher.";
      } else {
          alertMsg = "✅ Operação em período normal.";
      }

      return { heatmapData, maxProfit, bestDay, alertMsg };
  }, [state.dailyRecords, state.config, analysisMode, globalAggregatedData]);

  // Helper para Privacy Mode
  const formatVal = (val: number) => privacyMode ? 'R$ ****' : formatarBRL(val);

  // Tooltip customizado com efeito "Glass" e design melhorado
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (privacyMode) return null; // Não mostra tooltip se privado
      return (
        <div className="bg-[#050510]/95 border border-white/10 p-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] backdrop-blur-md min-w-[200px]">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-3 tracking-widest border-b border-white/10 pb-2 flex items-center gap-2">
            <CalendarOff size={12} /> {label}
          </p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-6 text-sm mb-2 last:mb-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill, boxShadow: `0 0 8px ${entry.stroke || entry.fill}` }}></div>
                    <span className="text-gray-300 font-medium capitalize text-xs">
                        {entry.dataKey === 'faturamento' ? 'Volume' : 'Lucro'}
                    </span>
                </div>
                <span className={`font-bold font-mono text-sm ${entry.dataKey === 'lucro' ? 'text-emerald-400' : 'text-white'}`}>
                    {formatVal(entry.value)}
                </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const InfoTooltip = ({ text }: { text: string }) => (
      <div className="group relative ml-1 inline-flex">
          <HelpCircle size={10} className="text-gray-500 hover:text-white cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 border border-white/10 p-2 rounded-lg text-[10px] text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center shadow-xl">
              {text}
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
               Dashboard
               {privacyMode && <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-widest">Modo Privacidade</span>}
            </h1>
            <p className="text-gray-400 text-xs font-medium mt-1 pl-1">
                Visão consolidada de performance financeira.
            </p>
          </div>
          
          <div className="flex gap-2">
               <div className="px-5 py-2.5 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-xl text-right relative group cursor-default backdrop-blur-sm">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                       ROI Total <InfoTooltip text="Retorno sobre Investimento. Quanto você lucrou percentualmente sobre o gasto." />
                   </p>
                   <p className={`text-xl font-black font-mono leading-none ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(0)}%
                   </p>
               </div>
               <div className="px-5 py-2.5 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-xl text-right relative group cursor-default backdrop-blur-sm">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                       Margem Líq. <InfoTooltip text="Porcentagem de dinheiro que realmente sobra no bolso após pagar tudo." />
                   </p>
                   <p className="text-xl font-black text-blue-400 font-mono leading-none">{metrics.margin.toFixed(0)}%</p>
               </div>
          </div>
        </div>

        {/* --- INTELLIGENCE WIDGETS (NOVO) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-2">
            
            {/* 1. HEATMAP SEMANAL */}
            <div className="gateway-card p-4 rounded-xl border border-white/5 bg-gradient-to-br from-[#0a0614] to-transparent relative">
                 <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Flame size={14} className={analysisMode === 'global' ? 'text-blue-400' : 'text-orange-400'} /> 
                            {analysisMode === 'global' ? 'Inteligência Global' : 'Inteligência Pessoal'}
                        </h3>
                        <p className="text-[10px] text-gray-500">
                            {analysisMode === 'global' 
                                ? `Analisando ${globalUserCount} operadores da comunidade.` 
                                : 'Seus dias mais lucrativos baseados no histórico.'}
                        </p>
                     </div>
                     
                     {/* GLOBAL TOGGLE */}
                     <button 
                        onClick={handleToggleMode}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            analysisMode === 'global' 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' 
                            : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                        }`}
                        title="Alternar entre Seus Dados e Dados da Comunidade"
                     >
                        {isLoadingGlobal ? <RefreshCw className="animate-spin" size={12} /> : (analysisMode === 'global' ? <Globe size={12} /> : <User size={12} />)}
                        {analysisMode === 'global' ? 'Mundo' : 'Local'}
                     </button>
                 </div>
                 
                 {/* HEATMAP VISUALIZATION */}
                 <div className="grid grid-cols-7 gap-2">
                     {intelligenceData.heatmapData.map((d) => {
                         // Calcula intensidade de 0.1 a 1.0
                         const intensity = intelligenceData.maxProfit > 0 ? (d.profit / intelligenceData.maxProfit) : 0;
                         const isZero = d.profit <= 0;
                         
                         return (
                             <div key={d.day} className="flex flex-col items-center gap-1 group relative">
                                 <div 
                                    className={`w-full h-12 rounded-lg transition-all border ${
                                        isZero 
                                            ? 'bg-white/5 border-white/5' 
                                            : analysisMode === 'global' 
                                                ? 'bg-blue-500 border-blue-400' // Blue for Global
                                                : 'bg-emerald-500 border-emerald-400' // Emerald for Local
                                    }`}
                                    style={{ opacity: isZero ? 1 : Math.max(0.2, intensity) }}
                                 ></div>
                                 <span className="text-[9px] text-gray-500 font-bold uppercase">{d.day}</span>
                                 
                                 {/* Tooltip Local */}
                                 <div className="absolute bottom-full mb-2 bg-black/90 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                                     {analysisMode === 'global' && privacyMode ? 'Dados Ocultos' : formatVal(d.profit)}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
                 
                 {analysisMode === 'global' && (
                     <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[9px] text-gray-500 font-bold uppercase">
                         <span>Melhor dia da Comunidade: <span className="text-blue-400">{intelligenceData.bestDay.name}</span></span>
                         <span className="flex items-center gap-1"><Lock size={8}/> Dados Anônimos</span>
                     </div>
                 )}
            </div>

            {/* 2. RADAR SAZONAL */}
            <div className="gateway-card p-4 rounded-xl border border-white/5 bg-gradient-to-br from-[#0a0614] to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Calendar size={80} /></div>
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                     <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Sparkles size={14} className="text-purple-400" /> Radar de Oportunidades
                        </h3>
                        <p className="text-[10px] text-gray-500">Análise de calendário e tendências.</p>
                     </div>
                 </div>

                 <div className="relative z-10 flex flex-col justify-center h-full pb-2">
                     <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-3">
                         <div className="p-2 bg-purple-500/20 rounded-full text-purple-400">
                             <Calendar size={18} />
                         </div>
                         <div>
                             <p className="text-white font-bold text-xs">{intelligenceData.alertMsg}</p>
                             <p className="text-[10px] text-gray-500 mt-0.5">Baseado no dia {new Date().getDate()} do mês.</p>
                         </div>
                     </div>
                 </div>
            </div>
        </div>


        {/* --- KPI SUMMARY CARDS (ATUALIZADO) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CARD 1: LUCRO (NEON EMERALD) */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-emerald-500/20 hover:border-emerald-500/40 transition-all bg-gradient-to-br from-emerald-950/30 to-transparent">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <Zap size={100} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500 text-black rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                            <Wallet size={20} />
                        </div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Resultado Líquido</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        {formatVal(metrics.lucroLiquido)}
                    </div>
                </div>
            </div>

            {/* CARD 2: FATURAMENTO (NEON INDIGO) */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-indigo-500/20 hover:border-indigo-500/40 transition-all bg-gradient-to-br from-indigo-950/30 to-transparent">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <Activity size={100} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                            <TrendingUp size={20} />
                        </div>
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Entradas (Volume)</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                        {formatVal(metrics.totalRet)}
                    </div>
                </div>
            </div>

            {/* CARD 3: CUSTOS (NEON ROSE) */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-rose-500/20 hover:border-rose-500/40 transition-all bg-gradient-to-br from-rose-950/30 to-transparent">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                    <TrendingDown size={100} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-500 text-white rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.4)]">
                            <Filter size={20} />
                        </div>
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-widest">Saídas Totais</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                        {formatVal(metrics.totalInv)}
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN DASHBOARD GRID --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            
            {/* 1. EXECUTIVE CHART */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden min-h-[450px] border border-white/5 bg-[#03000a]">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                             Evolução Diária
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            {metrics.chartData.length < 2 && <CalendarOff size={10} />}
                            {metrics.chartData.length < 2 && metrics.hasData ? 'Dados insuficientes para tendência' : metrics.hasData ? 'Dias sem atividade foram ocultados' : 'Comece a operar para ver dados'}
                        </p>
                     </div>
                     
                     {/* Custom Legend */}
                     {metrics.hasData && (
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                                <div className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                                <span className="text-[10px] text-indigo-300 font-bold uppercase">Volume</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                                <div className="w-4 h-0.5 rounded bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                                <span className="text-[10px] text-emerald-300 font-bold uppercase">Lucro</span>
                            </div>
                        </div>
                     )}
                </div>
                
                <div className="flex-1 w-full h-full min-h-[350px]">
                    {!metrics.hasData ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-60">
                            <div className="bg-white/5 p-6 rounded-full border border-white/5 mb-4">
                                <BarChart3 size={48} className="text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Aguardando Dados</h3>
                            <p className="text-sm text-gray-500 max-w-xs">
                                Seu gráfico de evolução aparecerá aqui assim que você registrar suas primeiras operações no menu <strong>Planejamento</strong>.
                            </p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={metrics.chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5}/>
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <filter id="neonGlow" height="300%" width="300%" x="-100%" y="-100%">
                                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                
                                <XAxis 
                                    dataKey="dateStr" 
                                    stroke="none" 
                                    tick={{fill: '#6b7280', fontSize: 10, fontWeight: 500}} 
                                    dy={10}
                                    minTickGap={30}
                                />
                                
                                <YAxis 
                                    yAxisId="left"
                                    stroke="none" 
                                    tick={{fill: '#6366f1', fontSize: 10, fontWeight: 600, opacity: 0.5}} 
                                    tickFormatter={(val) => `R$${val/1000}k`}
                                    width={40}
                                    hide={privacyMode} // Esconde eixo Y se privado
                                />
                                <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    stroke="none" 
                                    tick={{fill: '#10b981', fontSize: 10, fontWeight: 600, opacity: 0.5}} 
                                    tickFormatter={(val) => `R$${val/1000}k`}
                                    width={40}
                                    hide={privacyMode}
                                />
                                
                                <Tooltip 
                                    content={<CustomTooltip />} 
                                    cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 4 }} 
                                    wrapperStyle={{ outline: 'none' }}
                                />
                                
                                <Bar 
                                    yAxisId="left"
                                    dataKey="faturamento" 
                                    fill="url(#barGradient)" 
                                    radius={[4, 4, 0, 0]}
                                    barSize={30}
                                    animationDuration={1500}
                                />

                                <Line 
                                    yAxisId="right"
                                    type="monotone" 
                                    dataKey="lucro" 
                                    stroke="#10b981" 
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#064e3b', stroke: '#34d399', strokeWidth: 2 }}
                                    filter="url(#neonGlow)"
                                    animationDuration={2000}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* 2. SIDEBAR WIDGETS */}
            <div className="flex flex-col gap-6 h-full">
                
                {/* DONUT CHART */}
                <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col flex-1 min-h-[280px]">
                    <div className="flex items-center justify-between mb-2">
                         <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                             <PieIcon size={14} className="text-gray-400" /> Distribuição
                         </h3>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
                                <Pie
                                    data={metrics.pieData}
                                    cx="50%"
                                    cy="40%" // Ajuste para centralizar melhor sem cortar legenda
                                    innerRadius={50} 
                                    outerRadius={70} 
                                    paddingAngle={6}
                                    dataKey="value"
                                    stroke="none"
                                    cornerRadius={4}
                                >
                                    {metrics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#050510e6', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px', backdropFilter: 'blur(10px)' }}
                                    formatter={(value: number) => formatVal(value)}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px', width: '100%'}}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                             <span className="text-lg font-bold text-white">{formatVal(metrics.totalInv)}</span>
                             <span className="text-[7px] text-gray-500 font-bold uppercase tracking-widest">Saídas</span>
                        </div>
                    </div>
                </div>

                {/* MINI FUNNEL */}
                 <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col justify-center flex-1">
                     <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-5 flex items-center gap-2">
                         <Filter size={14} className="text-gray-400" /> Conversão
                     </h3>
                     
                     <div className="space-y-5">
                         <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-2">
                                 <span>Entrada</span>
                                 <span className="text-gray-300">{formatVal(metrics.totalInv)}</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                 <div className={`h-full rounded-full w-full transition-all duration-1000 ${metrics.totalInv > 0 ? 'bg-gray-400' : 'bg-gray-700 opacity-30'}`}></div>
                             </div>
                         </div>
                         
                         <div className="flex justify-center -my-2.5 opacity-30">
                             <ArrowDownRight size={12} className="text-gray-500" />
                         </div>

                         <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-2">
                                 <span>Retorno</span>
                                 <span className="text-indigo-400">{(metrics.totalRet / (metrics.totalInv || 1)).toFixed(1)}x</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                 <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: '100%'}}></div>
                             </div>
                         </div>

                          <div className="flex justify-center -my-2.5 opacity-30">
                             <ArrowDownRight size={12} className="text-gray-500" />
                         </div>

                          <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-2">
                                 <span>Lucro</span>
                                 <span className="text-emerald-400">{metrics.margin.toFixed(0)}%</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                 <div 
                                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                    style={{width: `${Math.min(Math.max(metrics.margin, 0), 100)}%`}}
                                 ></div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>

        {/* --- RECENT ACTIVITY TABLE --- */}
        <div className="gateway-card rounded-2xl border border-white/5 bg-white/[0.01]">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wider">
                    <History className="text-gray-500" size={14} /> Histórico Recente
                </h3>
                <button className="p-1 rounded hover:bg-white/5 transition-colors">
                    <MoreHorizontal size={14} className="text-gray-500" />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-gray-500 uppercase font-bold bg-white/[0.02]">
                        <tr>
                            <th className="px-6 py-3">ID / Data</th>
                            <th className="px-6 py-3">Performance</th>
                            <th className="px-6 py-3 text-right">Resultado</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {metrics.recentActivity.length === 0 ? (
                             <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-600 text-xs uppercase font-bold tracking-widest">
                                    Nenhum registro
                                </td>
                             </tr>
                        ) : (
                            metrics.recentActivity.map((item: any) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-3">
                                        <div className="font-mono text-gray-300 text-xs">#{item.id.toString().slice(-6)}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{new Date(item.date).toLocaleDateString('pt-BR')}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        {item.profit >= 0 ? (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400">
                                                <ArrowUpRight size={12} /> Lucro
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400">
                                                <ArrowDownRight size={12} /> Prejuízo
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-3 text-right font-mono font-bold text-sm ${item.profit >= 0 ? 'text-white' : 'text-gray-500'}`}>
                                        {formatVal(item.profit)}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                            <CheckCircle2 size={10} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;