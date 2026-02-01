import React, { useMemo, useState, useEffect } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowDownRight,
  Filter, PieChart as PieIcon, History, CheckCircle2, ArrowUpRight,
  MoreHorizontal, Wallet, CalendarOff, HelpCircle, BarChart3, TrendingDown,
  Calendar, Flame, Sparkles, Globe, User, RefreshCw, Lock, Users, Clock, ShieldCheck
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  state: AppState;
  privacyMode?: boolean;
}

const Dashboard: React.FC<Props> = ({ state, privacyMode }) => {
  // --- GLOBAL INTELLIGENCE STATE ---
  const [analysisMode, setAnalysisMode] = useState<'local' | 'global'>('local');
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalAggregatedData, setGlobalAggregatedData] = useState<Record<string, DayRecord>>({});
  const [globalUserCount, setGlobalUserCount] = useState(0);
  
  // --- TIME & GREETING STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // --- FETCH GLOBAL DATA ---
  const handleToggleMode = async () => {
      if (analysisMode === 'global') {
          setAnalysisMode('local');
          return;
      }

      setIsLoadingGlobal(true);
      try {
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
                  // Opcional: Validar se o usuário é "ativo" antes de somar

                  Object.entries(userData.dailyRecords).forEach(([date, record]) => {
                      if (!aggregated[date]) {
                          aggregated[date] = { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
                      }
                      
                      // Clonar contas para não mutar e normalizar para cálculo
                      // Assumimos que para inteligência global, queremos saber o volume bruto/lucro bruto
                      // Independente se o usuário usa modo manual ou auto
                      const bonusVal = userData.config?.valorBonus || 20;
                      const manualMode = userData.config?.manualBonusMode;

                      const accountsClone = record.accounts.map(acc => ({
                          ...acc,
                          // Normaliza para valor monetário se necessário para agregação simples
                          ciclos: manualMode ? acc.ciclos : (acc.ciclos * bonusVal),
                          id: Math.random() // Random ID para evitar colisão
                      }));

                      aggregated[date].accounts.push(...accountsClone);
                  });
              });

              setGlobalAggregatedData(aggregated);
              setGlobalUserCount(userCount);
              setAnalysisMode('global');
          }
      } catch (err) {
          console.error("Erro ao buscar dados globais:", err);
          alert("Não foi possível acessar a inteligência global no momento (Verifique conexão).");
      } finally {
          setIsLoadingGlobal(false);
      }
  };

  const metrics = useMemo(() => {
    const hojeISO = getHojeISO();
    const allDates = Object.keys(state.dailyRecords).sort();
    const pastAndPresentDates = allDates.filter(d => d <= hojeISO);

    let totalDespGeral = 0;
    
    // ADJUSTED LOGIC: Bonus Multiplier
    const bonusMultiplier = (state.config.manualBonusMode) ? 1 : (state.config.valorBonus || 20);

    let totalDepositos = 0;
    let totalRedepositos = 0;

    // --- CHART DATA PREP ---
    let chartData = pastAndPresentDates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], bonusMultiplier);
        const record = state.dailyRecords[date];

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
            hasActivity: safeRet > 0 || safeInvest > 0
        };
    });

    const cleanChartData = chartData.filter(item => item.hasActivity || item.fullDate === hojeISO);

    // Totais Gerais
    if (Array.isArray(state.generalExpenses)) {
        state.generalExpenses.forEach(e => {
            const val = parseFloat(String(e.valor));
            if (!isNaN(val)) totalDespGeral += val;
        });
    }

    let totalInv = 0; let totalRet = 0; let totalLucro = 0;
    
    allDates.forEach(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], bonusMultiplier);
        totalInv += (isNaN(m.invest) ? 0 : m.invest);
        totalRet += (isNaN(m.ret) ? 0 : m.ret);
        totalLucro += (isNaN(m.lucro) ? 0 : m.lucro);
    });

    const lucroLiquido = totalLucro - totalDespGeral;
    const totalInvestimentoReal = totalInv + totalDespGeral;
    
    // PIE CHART
    const pieData = [
        { name: 'Depósitos', value: totalDepositos, color: '#6366f1' }, // Indigo
        { name: 'Redepósitos', value: totalRedepositos, color: '#a855f7' }, // Purple
        { name: 'Custos', value: (totalDespGeral + (totalInv - totalDepositos - totalRedepositos)), color: '#f43f5e' } // Rose
    ].filter(d => d.value > 0);

    const pieDisplayData = pieData.length > 0 ? pieData : [
        { name: 'Sem dados', value: 100, color: '#1f2937' }
    ];

    const roi = (totalInvestimentoReal > 0) 
        ? ((totalRet - totalInvestimentoReal) / totalInvestimentoReal) * 100 
        : 0;
        
    const margin = (totalRet > 0) 
        ? (lucroLiquido / totalRet) * 100 
        : 0;

    // RECENT ACTIVITY
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
    const recentActivity = allAccounts.sort((a, b) => b.id - a.id).slice(0, 5);
    const hasData = cleanChartData.some(d => d.hasActivity);

    return {
        totalInv: totalInvestimentoReal,
        totalRet,
        lucroLiquido,
        chartData: cleanChartData, 
        pieData: pieDisplayData,
        roi: isNaN(roi) ? 0 : roi,
        margin: isNaN(margin) ? 0 : margin,
        recentActivity,
        hasData
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  // --- HEATMAP LOGIC ---
  const intelligenceData = useMemo(() => {
      // 0 = Dom, 6 = Sab
      const dayStats: Record<number, { profit: number; count: number }> = { 0: {profit:0, count:0}, 1: {profit:0, count:0}, 2: {profit:0, count:0}, 3: {profit:0, count:0}, 4: {profit:0, count:0}, 5: {profit:0, count:0}, 6: {profit:0, count:0} };
      const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
      
      const activeRecords = analysisMode === 'global' ? globalAggregatedData : state.dailyRecords;
      
      // No global, já normalizamos para valor manual (multiplier = 1) no fetch
      // No local, respeitamos o config do usuário
      const bonusMultiplier = analysisMode === 'global' 
        ? 1 
        : (state.config.manualBonusMode ? 1 : (state.config.valorBonus || 20));

      Object.keys(activeRecords).forEach(date => {
          const m = calculateDayMetrics(activeRecords[date], bonusMultiplier);
          const dayIndex = new Date(date).getDay();
          // Considera apenas dias positivos para o "Melhor Dia"
          if(m.lucro > 0) {
              dayStats[dayIndex].profit += m.lucro;
              dayStats[dayIndex].count += 1;
          }
      });

      let maxProfit = 0;
      const heatmapData = Object.keys(dayStats).map(key => {
          const k = parseInt(key);
          const total = dayStats[k].profit;
          const avg = dayStats[k].count > 0 ? total / dayStats[k].count : 0; // Média por dia
          if (avg > maxProfit) maxProfit = avg;
          return { day: dayNames[k], profit: avg, index: k, rawTotal: total };
      });

      let bestDay = { name: '---', profit: -Infinity };
      heatmapData.forEach(d => {
          if(d.profit > bestDay.profit && d.profit > 0) bestDay = { name: d.day, profit: d.profit };
      });

      // Simple Calendar Advice
      const today = new Date();
      const currentDay = today.getDate();
      let alertMsg = "";
      if (currentDay === 5 || currentDay === 20) {
          alertMsg = "🔥 Dia de Pagamento! Volume alto esperado.";
      } else if (currentDay >= 28) {
          alertMsg = "⚠️ Fim de mês: Plataformas recolhendo.";
      } else if (new Date().getDay() === 0 || new Date().getDay() === 6) {
           alertMsg = "🎲 Fim de semana: Jogadores recreativos ativos.";
      } else {
          alertMsg = "✅ Operação em período normal.";
      }

      return { heatmapData, maxProfit, bestDay, alertMsg };
  }, [state.dailyRecords, state.config, analysisMode, globalAggregatedData]);

  const formatVal = (val: number) => privacyMode ? 'R$ ****' : formatarBRL(val);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      if (privacyMode) return null;
      return (
        <div className="bg-[#050510]/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-2 tracking-widest">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-4 text-xs mb-1 last:mb-0">
                <div className="flex items-center gap-2 w-24">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill }}></div>
                    <span className="text-gray-300 capitalize">{entry.name}</span>
                </div>
                <span className={`font-mono font-bold ${entry.dataKey === 'lucro' ? 'text-emerald-400' : 'text-white'}`}>
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
        
        {/* --- HEADER COM SAUDAÇÃO (NOVO) --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold bg-white/10 text-white px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={10} className="text-emerald-400" /> Sistema Operacional
                </span>
                {privacyMode && <span className="bg-amber-500/20 text-amber-500 text-[10px] px-2 py-0.5 rounded border border-amber-500/30 uppercase tracking-widest flex items-center gap-1"><Lock size={10}/> Oculto</span>}
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
               {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">{state.config.userName || 'Operador'}</span>
            </h1>
            <p className="text-gray-400 text-xs font-medium mt-1 flex items-center gap-2">
                <Clock size={12} className="text-gray-500" />
                {currentTime.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}
                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                {currentTime.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
            </p>
          </div>
          
          <div className="flex gap-3">
               <div className="px-4 py-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-xl text-right backdrop-blur-sm group hover:border-emerald-500/20 transition-all">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5 flex items-center justify-end gap-1 group-hover:text-emerald-400 transition-colors">
                       ROI <InfoTooltip text="Retorno sobre Investimento" />
                   </p>
                   <p className={`text-lg font-black font-mono leading-none ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(0)}%
                   </p>
               </div>
               <div className="px-4 py-2 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-xl text-right backdrop-blur-sm group hover:border-blue-500/20 transition-all">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-0.5 flex items-center justify-end gap-1 group-hover:text-blue-400 transition-colors">
                       Margem <InfoTooltip text="Porcentagem de Lucro Real" />
                   </p>
                   <p className="text-lg font-black text-blue-400 font-mono leading-none">{metrics.margin.toFixed(0)}%</p>
               </div>
          </div>
        </div>

        {/* --- GLOBAL INTELLIGENCE WIDGET --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* WIDGET 1: HEATMAP */}
            <div className="gateway-card p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0614] via-[#0d081a] to-transparent relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                 <div className="flex justify-between items-start mb-4">
                     <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Flame size={16} className={analysisMode === 'global' ? 'text-blue-500' : 'text-orange-500'} /> 
                            {analysisMode === 'global' ? 'Inteligência Global' : 'Performance Pessoal'}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                            {analysisMode === 'global' 
                                ? `Dados de ${globalUserCount} operadores.` 
                                : 'Seus melhores dias da semana.'}
                        </p>
                     </div>
                     
                     <button 
                        onClick={handleToggleMode}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            analysisMode === 'global' 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20' 
                            : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                     >
                        {isLoadingGlobal ? <RefreshCw className="animate-spin" size={12} /> : (analysisMode === 'global' ? <Globe size={12} /> : <User size={12} />)}
                        {analysisMode === 'global' ? 'MUNDO' : 'VOCÊ'}
                     </button>
                 </div>
                 
                 {/* Visualização de Barras (Heatmap) */}
                 <div className="flex items-end justify-between h-24 gap-1 pt-2">
                     {intelligenceData.heatmapData.map((d) => {
                         const intensity = intelligenceData.maxProfit > 0 ? (d.profit / intelligenceData.maxProfit) : 0;
                         const isBest = d.day === intelligenceData.bestDay.name;
                         
                         return (
                             <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group/bar relative">
                                 {isBest && (
                                     <div className="absolute -top-6 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 animate-bounce">
                                         TOP
                                     </div>
                                 )}
                                 <div className="w-full bg-white/5 rounded-t-sm relative h-full flex items-end overflow-hidden">
                                     <div 
                                        className={`w-full transition-all duration-1000 ${
                                            analysisMode === 'global' 
                                                ? (isBest ? 'bg-blue-400' : 'bg-blue-600/60') 
                                                : (isBest ? 'bg-emerald-400' : 'bg-emerald-600/60')
                                        }`}
                                        style={{ height: `${Math.max(5, intensity * 100)}%` }}
                                     ></div>
                                 </div>
                                 <span className={`text-[10px] font-bold uppercase ${isBest ? 'text-white' : 'text-gray-600'}`}>{d.day}</span>
                                 
                                 {/* Tooltip Hover */}
                                 <div className="absolute bottom-full mb-1 opacity-0 group-hover/bar:opacity-100 bg-black/90 text-white text-[9px] px-2 py-1 rounded pointer-events-none whitespace-nowrap z-20 border border-white/10">
                                     Média: {privacyMode && analysisMode !== 'global' ? '****' : formatVal(d.profit)}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
            </div>

            {/* WIDGET 2: RADAR & ALERTS */}
            <div className="gateway-card p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0a0614] to-transparent relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Calendar size={100} /></div>
                
                <div className="relative z-10 h-full flex flex-col justify-between">
                     <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-400" /> Radar de Oportunidades
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5">Sugestões baseadas no calendário.</p>
                     </div>

                     <div className="space-y-3 mt-4">
                         <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-start gap-3 hover:bg-white/10 transition-colors cursor-default">
                             <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 shrink-0">
                                 <Calendar size={18} />
                             </div>
                             <div>
                                 <p className="text-white font-bold text-xs leading-tight">{intelligenceData.alertMsg}</p>
                                 <p className="text-[10px] text-gray-500 mt-1">Dia {new Date().getDate()} do mês.</p>
                             </div>
                         </div>
                         
                         <div className="flex items-center gap-2 text-[10px] text-gray-400 bg-black/20 p-2 rounded-lg border border-white/5">
                             <Users size={12} className="text-gray-500"/>
                             <span>Melhor dia da Comunidade: <span className="text-blue-400 font-bold">{intelligenceData.bestDay.name}</span></span>
                         </div>
                     </div>
                </div>
            </div>
        </div>

        {/* --- KPI CARDS (VISUAL MELHORADO) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CARD 1: LUCRO */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-emerald-500/20 hover:border-emerald-500/40 transition-all bg-gradient-to-br from-emerald-950/20 via-[#02000f] to-[#02000f]">
                <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all"></div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-50"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20">
                            <Wallet size={18} />
                        </div>
                        <span className="text-xs font-bold text-emerald-100/70 uppercase tracking-widest">Lucro Líquido</span>
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                        {formatVal(metrics.lucroLiquido)}
                    </div>
                </div>
            </div>

            {/* CARD 2: FATURAMENTO */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-indigo-500/20 hover:border-indigo-500/40 transition-all bg-gradient-to-br from-indigo-950/20 via-[#02000f] to-[#02000f]">
                 <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition-all"></div>
                 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-transparent opacity-50"></div>
                <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-xs font-bold text-indigo-100/70 uppercase tracking-widest">Volume Total</span>
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                        {formatVal(metrics.totalRet)}
                    </div>
                </div>
            </div>

            {/* CARD 3: CUSTOS */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-rose-500/20 hover:border-rose-500/40 transition-all bg-gradient-to-br from-rose-950/20 via-[#02000f] to-[#02000f]">
                 <div className="absolute -right-6 -top-6 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl group-hover:bg-rose-500/30 transition-all"></div>
                 <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-transparent opacity-50"></div>
                <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20">
                            <Filter size={18} />
                        </div>
                        <span className="text-xs font-bold text-rose-100/70 uppercase tracking-widest">Investimento</span>
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                        {formatVal(metrics.totalInv)}
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN CHART (COM AREA GLOW) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden min-h-[400px] border border-white/5 bg-[#03000a]">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                             <BarChart3 size={18} className="text-gray-400"/> Evolução Financeira
                        </h3>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">
                            {metrics.hasData ? 'Últimos dias de atividade' : 'Sem dados registrados'}
                        </p>
                     </div>
                </div>
                
                <div className="flex-1 w-full h-full min-h-[300px]">
                    {!metrics.hasData ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Activity size={48} className="text-indigo-400 mb-4" />
                            <h3 className="text-lg font-bold text-white">Gráfico Vazio</h3>
                            <p className="text-sm text-gray-500">Registre operações para ver a mágica.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={metrics.chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6}/>
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="dateStr" stroke="none" tick={{fill: '#6b7280', fontSize: 10}} dy={10} minTickGap={20} />
                                <YAxis stroke="none" tick={{fill: '#6b7280', fontSize: 10}} hide={privacyMode} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="faturamento" name="Faturamento" fill="url(#barGradient)" radius={[4, 4, 0, 0]} barSize={20} />
                                <Area type="monotone" dataKey="lucro" stroke="none" fill="url(#areaGradient)" />
                                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#10b981' }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* DONUT & ACTIVITY */}
            <div className="flex flex-col gap-6 h-full">
                <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col flex-1 min-h-[250px]">
                    <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                         <PieIcon size={14} className="text-gray-400" /> Distribuição de Capital
                    </h3>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={metrics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45} 
                                    outerRadius={65} 
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {metrics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '10px'}}/>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-6">
                            <span className="text-xs font-bold text-gray-500">Total</span>
                        </div>
                    </div>
                </div>

                <div className="gateway-card rounded-2xl p-5 border border-white/5 flex-1 overflow-hidden">
                     <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                         <History size={14} className="text-gray-400" /> Recentes
                    </h3>
                    <div className="space-y-3">
                        {metrics.recentActivity.length === 0 ? (
                            <p className="text-[10px] text-gray-500 text-center py-4">Sem histórico recente.</p>
                        ) : (
                            metrics.recentActivity.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-xs border-b border-white/5 last:border-0 pb-2 last:pb-0 hover:bg-white/5 p-2 rounded transition-colors">
                                    <div>
                                        <div className="text-gray-300 font-bold">{new Date(item.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</div>
                                        <div className="text-[9px] text-gray-600">ID #{item.id.toString().slice(-4)}</div>
                                    </div>
                                    <div className={`font-mono font-bold ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatVal(item.profit)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;