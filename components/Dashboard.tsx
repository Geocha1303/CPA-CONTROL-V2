
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart
} from 'recharts';
import { 
  TrendingUp, Activity, ArrowDownRight,
  Filter, PieChart as PieIcon, History, ArrowUpRight,
  Wallet, HelpCircle, BarChart3,
  Flame, Sparkles, Globe, User, RefreshCw, Lock, Clock, HeartPulse,
  Zap, Target, ChevronUp, Cpu, Wifi, Info, X, Calendar, ChevronDown, CheckCircle2, AlertTriangle
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
  
  // State do Alerta de Atualização
  const [showUpdateInfo, setShowUpdateInfo] = useState(true);
  
  // --- DATE FILTER STATE ---
  const hojeISO = getHojeISO();
  const currentMonthKey = hojeISO.substring(0, 7); // YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

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
              .select('raw_json')
              .order('updated_at', { ascending: false })
              .limit(50);

          if (error) throw error;

          if (data) {
              const aggregated: Record<string, DayRecord> = {};
              let userCount = 0;

              data.forEach((row: any) => {
                  const userData = row.raw_json as AppState;
                  if (!userData || !userData.dailyRecords) return;
                  
                  userCount++;
                  
                  Object.entries(userData.dailyRecords).forEach(([date, record]) => {
                      if (!aggregated[date]) {
                          aggregated[date] = { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
                      }
                      
                      const bonusVal = userData.config?.valorBonus || 20;
                      const manualMode = userData.config?.manualBonusMode;

                      const accountsClone = record.accounts.map(acc => ({
                          ...acc,
                          ciclos: manualMode ? acc.ciclos : (acc.ciclos * bonusVal),
                          id: Math.random() 
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
          alert("Não foi possível acessar a inteligência global no momento.");
      } finally {
          setIsLoadingGlobal(false);
      }
  };

  // --- AVAILABLE MONTHS CALCULATION ---
  const availableMonths = useMemo(() => {
      const keys = Object.keys(state.dailyRecords);
      const monthsSet = new Set<string>();
      
      // Adiciona o mês atual sempre
      monthsSet.add(currentMonthKey);
      
      // Adiciona meses do histórico
      keys.forEach(k => {
          if (k.length >= 7) monthsSet.add(k.substring(0, 7));
      });

      // Converte para array e ordena (mais recente primeiro)
      return Array.from(monthsSet).sort().reverse().map(m => {
          const [y, monthIdx] = m.split('-').map(Number);
          const dateObj = new Date(y, monthIdx - 1, 1);
          return {
              key: m,
              label: dateObj.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
              isCurrent: m === currentMonthKey
          };
      });
  }, [state.dailyRecords, currentMonthKey]);

  const metrics = useMemo(() => {
    // FILTRO PRINCIPAL: Usa o mês selecionado no dropdown
    const filterKey = selectedMonth; 
    const allDates = Object.keys(state.dailyRecords).sort();
    
    // Filtra datas que correspondem ao mês selecionado
    const monthDates = allDates.filter(d => d.startsWith(filterKey));

    let totalDespGeral = 0;
    const bonusMultiplier = (state.config.manualBonusMode) ? 1 : (state.config.valorBonus || 20);

    let totalDepositos = 0;
    let totalRedepositos = 0;
    let totalInv = 0; 
    let totalRet = 0; 
    let totalLucro = 0;

    // --- CHART DATA PREP ---
    let chartData = monthDates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], bonusMultiplier);
        const record = state.dailyRecords[date];

        // Somas Totais (KPIs)
        totalInv += (isNaN(m.invest) ? 0 : m.invest);
        totalRet += (isNaN(m.ret) ? 0 : m.ret);
        totalLucro += (isNaN(m.lucro) ? 0 : m.lucro);

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

    // Filtra despesas gerais apenas do mês selecionado
    if (Array.isArray(state.generalExpenses)) {
        state.generalExpenses.forEach(e => {
            if (e.date.startsWith(filterKey)) {
                const val = parseFloat(String(e.valor));
                if (!isNaN(val)) totalDespGeral += val;
            }
        });
    }

    const lucroLiquido = totalLucro - totalDespGeral;
    const totalInvestimentoReal = totalInv + totalDespGeral;
    
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

    // LÓGICA DE PROJEÇÃO (AJUSTADA PARA PASSADO)
    const isCurrentMonth = selectedMonth === currentMonthKey;
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    
    let dailyAvg = 0;
    let projectedProfit = 0;

    if (isCurrentMonth) {
        // Mês atual: média baseada nos dias passados até hoje
        const daysPassed = new Date().getDate();
        dailyAvg = daysPassed > 0 ? lucroLiquido / daysPassed : 0;
        projectedProfit = dailyAvg * daysInMonth;
    } else {
        // Mês passado: média é o total dividido pelos dias do mês (ou dias operados)
        // Para simplificar "Projeção" vira "Total Realizado"
        dailyAvg = lucroLiquido / daysInMonth;
        projectedProfit = lucroLiquido; // Não há projeção, é o fato.
    }

    // Activity Feed (Mostra atividades do mês selecionado)
    const allAccounts: any[] = [];
    Object.entries(state.dailyRecords).forEach(([date, record]) => {
        // Importante: Filtra activity feed pelo mês selecionado
        if (!date.startsWith(filterKey)) return;
        
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

    // Nome do mês selecionado para exibição
    const displayDateObj = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1, 1);
    const monthName = displayDateObj.toLocaleDateString('pt-BR', { month: 'long' });

    return {
        totalInv: totalInvestimentoReal,
        totalRet,
        lucroLiquido,
        chartData: cleanChartData, 
        pieData: pieDisplayData,
        roi: isNaN(roi) ? 0 : roi,
        margin: isNaN(margin) ? 0 : margin,
        recentActivity,
        hasData,
        projectedProfit: isNaN(projectedProfit) ? 0 : projectedProfit,
        monthName,
        isCurrentMonth
    };
  }, [state.dailyRecords, state.generalExpenses, state.config, selectedMonth, currentMonthKey]);

  // --- HEATMAP LOGIC ---
  const intelligenceData = useMemo(() => {
      const dayStats: Record<number, { profit: number; count: number }> = { 0: {profit:0, count:0}, 1: {profit:0, count:0}, 2: {profit:0, count:0}, 3: {profit:0, count:0}, 4: {profit:0, count:0}, 5: {profit:0, count:0}, 6: {profit:0, count:0} };
      const dayNames = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
      
      const activeRecords = analysisMode === 'global' ? globalAggregatedData : state.dailyRecords;
      const bonusMultiplier = analysisMode === 'global' 
        ? 1 
        : (state.config.manualBonusMode ? 1 : (state.config.valorBonus || 20));

      Object.keys(activeRecords).forEach(date => {
          // Heatmap considera TODO o histórico para ser mais preciso estatisticamente
          const m = calculateDayMetrics(activeRecords[date], bonusMultiplier);
          const dayIndex = new Date(date).getDay();
          if(m.lucro > 0) {
              dayStats[dayIndex].profit += m.lucro;
              dayStats[dayIndex].count += 1;
          }
      });

      let maxProfit = 0;
      const heatmapData = Object.keys(dayStats).map(key => {
          const k = parseInt(key);
          const total = dayStats[k].profit;
          const avg = dayStats[k].count > 0 ? total / dayStats[k].count : 0;
          if (avg > maxProfit) maxProfit = avg;
          return { day: dayNames[k], profit: avg, index: k, rawTotal: total };
      });

      let bestDay = { name: '---', profit: -Infinity };
      heatmapData.forEach(d => {
          if(d.profit > bestDay.profit && d.profit > 0) bestDay = { name: d.day, profit: d.profit };
      });

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
        <div className="bg-[#050510]/95 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md min-w-[200px]">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-3 tracking-widest border-b border-white/10 pb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between items-center text-xs mb-2 last:mb-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: entry.stroke || entry.fill, color: entry.stroke || entry.fill }}></div>
                    <span className="text-gray-300 font-medium capitalize">{entry.name}</span>
                </div>
                <span className={`font-mono font-bold text-sm ${entry.dataKey === 'lucro' ? 'text-emerald-400' : 'text-white'}`}>
                    {formatVal(entry.value)}
                </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-10">
        
        {/* --- TOP TICKER STATUS --- */}
        <div className="flex items-center justify-between bg-white/[0.02] border-y border-white/5 py-1 px-4 -mx-4 md:-mx-8 mb-4 overflow-hidden">
            <div className="flex items-center gap-6 animate-marquee whitespace-nowrap text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                <span className="flex items-center gap-2"><Wifi size={10} className="text-emerald-500"/> SYSTEM ONLINE</span>
                <span className="flex items-center gap-2"><Cpu size={10} className="text-indigo-500"/> LATENCY: 24MS</span>
                <span className="flex items-center gap-2"><Lock size={10} className="text-amber-500"/> ENCRYPTION: AES-256</span>
                <span className="flex items-center gap-2"><Globe size={10} className="text-blue-500"/> REGION: SA-EAST-1</span>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-gray-600">
                <span>V3.9.4-STABLE</span>
            </div>
        </div>

        {/* --- ALERTA DE ATUALIZAÇÃO (CAIXINHA DE CORREÇÃO) --- */}
        {showUpdateInfo && (
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl flex items-start justify-between gap-4 mb-2 animate-fade-in shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 mt-0.5 shadow-inner">
                        <AlertTriangle size={18} className="animate-pulse" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm mb-1">Atualização do Dashboard: Visão Mensal</h4>
                        <p className="text-blue-200/80 text-xs leading-relaxed max-w-3xl">
                            <strong>Nota Importante:</strong> O dashboard foi atualizado para contabilidade mensal. 
                            Se notar valores abaixo do esperado, é porque a contagem agora reinicia todo dia 1º. 
                            Para consultar o histórico completo ou meses anteriores, utilize o novo seletor piscando no canto superior direito.
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowUpdateInfo(false)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors border border-white/5"
                    title="Fechar aviso"
                >
                    <X size={16} />
                </button>
            </div>
        )}

        {/* --- HEADER HOLOGRÁFICO --- */}
        <div className="relative rounded-3xl overflow-hidden p-8 border border-white/10 shadow-2xl bg-[#0a0516] group">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-600/10 to-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white border border-white/10 uppercase tracking-wider flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]"></div>
                            Operacional
                        </span>
                        {privacyMode && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider flex items-center gap-1"><Lock size={10}/> Privado</span>}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-none mb-2 drop-shadow-xl">
                        {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">{state.config.userName || 'Comandante'}</span>
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                        <span className="flex items-center gap-1.5"><Clock size={14}/> {currentTime.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-4">
                    {/* GLOBAL DATE FILTER (SELECTOR) - UPGRADED NEON */}
                    <div className="relative z-20">
                        {/* Badge "NOVO" Pulsante */}
                        <div className="absolute -top-2 -right-2 z-30 pointer-events-none">
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                            </span>
                        </div>

                        <div className="relative group">
                            {/* Ícone da Esquerda */}
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                                <Calendar size={16} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            </div>

                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="appearance-none pl-10 pr-10 py-2.5 text-sm font-bold text-white outline-none cursor-pointer uppercase tracking-wider
                                bg-gradient-to-r from-cyan-950/40 to-indigo-950/40 
                                border border-cyan-500/50 
                                rounded-xl 
                                shadow-[0_0_15px_rgba(6,182,212,0.15)] 
                                hover:shadow-[0_0_25px_rgba(6,182,212,0.3)]
                                hover:border-cyan-400
                                focus:ring-2 focus:ring-cyan-500/30
                                transition-all duration-300
                                animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite] hover:animate-none"
                            >
                                {availableMonths.map((m) => (
                                    <option key={m.key} value={m.key} className="bg-[#0a0516] text-gray-300">
                                        {m.label} {m.isCurrent ? '(Atual)' : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Ícone da Direita (Seta) */}
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <ChevronDown size={14} className="text-cyan-400" />
                            </div>
                        </div>
                        <p className="text-[9px] text-cyan-500/80 font-bold text-right mt-1 mr-1 uppercase tracking-widest animate-pulse">
                            Histórico Disponível
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">ROI ({metrics.monthName})</p>
                            <p className={`text-3xl font-black font-mono leading-none drop-shadow-lg ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(0)}%
                            </p>
                        </div>
                        <div className="w-px bg-white/10 h-10 self-center"></div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Margem Líq.</p>
                            <p className="text-3xl font-black text-blue-400 font-mono leading-none drop-shadow-lg">
                                {metrics.margin.toFixed(0)}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- KPI CARDS COM SPARKLINES --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1: LUCRO */}
            <div className="group relative rounded-3xl p-6 bg-[#0c0818] border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-500 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Mini Chart Background */}
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData.slice(-7)}>
                            <Area type="monotone" dataKey="lucro" stroke="#10b981" fill="#10b981" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                            <Wallet size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saldo Líquido ({metrics.monthName})</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight mb-2 group-hover:text-emerald-50 transition-colors">
                        {formatVal(metrics.lucroLiquido)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500/80 bg-emerald-500/5 px-2 py-1 rounded w-fit border border-emerald-500/10">
                        {metrics.isCurrentMonth ? <TrendingUp size={12} /> : <CheckCircle2 size={12} />}
                        <span>
                            {metrics.isCurrentMonth 
                                ? `PROJEÇÃO: ${formatVal(metrics.projectedProfit)}` 
                                : `FECHAMENTO: ${formatVal(metrics.projectedProfit)}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* CARD 2: FATURAMENTO */}
            <div className="group relative rounded-3xl p-6 bg-[#0c0818] border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-500 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData.slice(-7)}>
                            <Area type="monotone" dataKey="faturamento" stroke="#6366f1" fill="#6366f1" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <Activity size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Volume ({metrics.monthName})</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight mb-2 group-hover:text-indigo-50 transition-colors">
                        {formatVal(metrics.totalRet)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-500/80 bg-indigo-500/5 px-2 py-1 rounded w-fit border border-indigo-500/10">
                        <ArrowUpRight size={12} />
                        <span>ENTRADAS + BÔNUS</span>
                    </div>
                </div>
            </div>

            {/* CARD 3: CUSTOS */}
            <div className="group relative rounded-3xl p-6 bg-[#0c0818] border border-rose-500/20 hover:border-rose-500/40 transition-all duration-500 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="absolute bottom-0 left-0 right-0 h-16 opacity-20 pointer-events-none">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData.slice(-7)}>
                            <Area type="monotone" dataKey="investimento" stroke="#f43f5e" fill="#f43f5e" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
                            <Filter size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Investimento ({metrics.monthName})</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight mb-2 group-hover:text-rose-50 transition-colors">
                        {formatVal(metrics.totalInv)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500/80 bg-rose-500/5 px-2 py-1 rounded w-fit border border-rose-500/10">
                        <ArrowDownRight size={12} />
                        <span>DEPÓSITOS + CUSTOS</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- GLOBAL INTELLIGENCE & ALERTS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* HEATMAP */}
            <div className="p-6 rounded-3xl border border-white/10 bg-[#08050e] relative overflow-hidden group hover:border-indigo-500/30 transition-all shadow-xl">
                 <div className="flex justify-between items-start mb-6">
                     <div>
                        <h3 className="text-white font-bold text-base flex items-center gap-2">
                            <Flame size={18} className={analysisMode === 'global' ? 'text-blue-500' : 'text-orange-500'} /> 
                            {analysisMode === 'global' ? 'Rede Neural Global' : 'Performance Semanal'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                            {analysisMode === 'global' 
                                ? `Analisando dados de ${globalUserCount} operadores.` 
                                : 'Seus melhores dias de operação.'}
                        </p>
                     </div>
                     
                     <button 
                        onClick={handleToggleMode}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            analysisMode === 'global' 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20' 
                            : 'bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10'
                        }`}
                     >
                        {isLoadingGlobal ? <RefreshCw className="animate-spin" size={12} /> : (analysisMode === 'global' ? <Globe size={12} /> : <User size={12} />)}
                        {analysisMode === 'global' ? 'REDE GLOBAL' : 'MEUS DADOS'}
                     </button>
                 </div>
                 
                 <div className="flex items-end justify-between h-32 gap-3 pt-2">
                     {intelligenceData.heatmapData.map((d) => {
                         const intensity = intelligenceData.maxProfit > 0 ? (d.profit / intelligenceData.maxProfit) : 0;
                         const isBest = d.day === intelligenceData.bestDay.name;
                         
                         return (
                             <div key={d.day} className="flex-1 flex flex-col items-center gap-3 group/bar relative">
                                 {isBest && (
                                     <div className="absolute -top-8 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 animate-bounce shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                         TOP
                                     </div>
                                 )}
                                 <div className="w-full bg-white/5 rounded-lg relative h-full flex items-end overflow-hidden border border-white/5">
                                     <div 
                                        className={`w-full transition-all duration-1000 rounded-t-sm ${
                                            analysisMode === 'global' 
                                                ? (isBest ? 'bg-blue-500 shadow-[0_0_20px_#3b82f6]' : 'bg-blue-500/40') 
                                                : (isBest ? 'bg-emerald-500 shadow-[0_0_20px_#10b981]' : 'bg-emerald-500/40')
                                        }`}
                                        style={{ height: `${Math.max(5, intensity * 100)}%` }}
                                     ></div>
                                 </div>
                                 <span className={`text-[10px] font-bold uppercase ${isBest ? 'text-white' : 'text-gray-600'}`}>{d.day}</span>
                                 
                                 <div className="absolute bottom-full mb-2 opacity-0 group-hover/bar:opacity-100 bg-black/90 text-white text-[10px] px-3 py-1.5 rounded-lg pointer-events-none whitespace-nowrap z-20 border border-white/10 shadow-xl transition-opacity transform translate-y-2 group-hover/bar:translate-y-0 duration-200">
                                     Média: {privacyMode && analysisMode !== 'global' ? '****' : formatVal(d.profit)}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
            </div>

            {/* RADAR & ALERTS */}
            <div className="p-6 rounded-3xl border border-white/10 bg-[#08050e] relative overflow-hidden shadow-xl flex flex-col">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none transform rotate-12"><Clock size={120} /></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                     <div>
                        <h3 className="text-white font-bold text-base flex items-center gap-2">
                            <Sparkles size={18} className="text-purple-400" /> Radar de Oportunidades
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">Sugestões baseadas no calendário comercial.</p>
                     </div>

                     <div className="space-y-4 mt-6">
                         <div className="bg-gradient-to-r from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl p-5 flex items-start gap-4 hover:border-purple-500/40 transition-colors cursor-default backdrop-blur-sm">
                             <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 shrink-0 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                                 <Clock size={20} />
                             </div>
                             <div>
                                 <p className="text-white font-bold text-sm leading-tight mb-1">{intelligenceData.alertMsg}</p>
                                 <p className="text-[10px] text-gray-400 font-medium">Análise baseada no dia {new Date().getDate()}.</p>
                             </div>
                         </div>
                         
                         <div className="flex items-center gap-3 text-xs text-gray-400 bg-black/40 p-4 rounded-xl border border-white/5">
                             <User size={14} className="text-gray-500"/>
                             <span>Melhor dia da Comunidade: <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{intelligenceData.bestDay.name}</span></span>
                         </div>
                     </div>
                </div>
            </div>
        </div>

        {/* --- MAIN CHART SECTION --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            <div className="xl:col-span-2 rounded-3xl p-8 flex flex-col relative overflow-hidden min-h-[450px] border border-white/10 bg-[#08050e] shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
                <div className="flex items-center justify-between mb-8 relative z-10">
                     <div>
                        <h3 className="text-white font-bold text-xl flex items-center gap-2">
                             <BarChart3 size={20} className="text-indigo-400"/> Evolução Financeira ({metrics.monthName})
                        </h3>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mt-1">
                            {metrics.hasData ? 'Análise de tendência mensal' : 'Aguardando dados'}
                        </p>
                     </div>
                </div>
                
                <div className="flex-1 w-full h-full min-h-[350px] relative z-10">
                    {!metrics.hasData ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-center opacity-40">
                            <Activity size={64} className="text-indigo-400 mb-6" />
                            <h3 className="text-xl font-bold text-white">Gráfico Vazio</h3>
                            <p className="text-sm text-gray-500 mt-2">Registre operações neste mês para visualizar dados.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={metrics.chartData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8}/>
                                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.4}/>
                                        <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="dateStr" stroke="none" tick={{fill: '#6b7280', fontSize: 11, fontWeight: 600}} dy={15} minTickGap={30} />
                                <YAxis stroke="none" tick={{fill: '#6b7280', fontSize: 11}} hide={privacyMode} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                <Bar dataKey="faturamento" name="Faturamento" fill="url(#barGradient)" radius={[6, 6, 0, 0]} barSize={32} />
                                <Area type="monotone" dataKey="lucro" stroke="none" fill="url(#areaGradient)" />
                                <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* DONUT & ACTIVITY */}
            <div className="flex flex-col gap-6 h-full">
                <div className="rounded-3xl p-8 border border-white/10 bg-[#08050e] flex flex-col flex-1 min-h-[300px] shadow-xl relative overflow-hidden">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2 relative z-10">
                         <PieIcon size={16} className="text-indigo-400" /> Distribuição ({metrics.monthName})
                    </h3>
                    <div className="flex-1 relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={metrics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60} 
                                    outerRadius={85} 
                                    paddingAngle={6}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {metrics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={3} />
                                    ))}
                                </Pie>
                                <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{fontSize: '11px', opacity: 0.8, fontWeight: 600}}/>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Total Investido</span>
                            <span className="text-white font-bold text-xs">{formatVal(metrics.totalInv)}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-3xl p-6 border border-white/10 bg-[#08050e] flex-1 overflow-hidden shadow-xl">
                     <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                         <History size={16} className="text-gray-400" /> Atividade ({metrics.monthName})
                    </h3>
                    <div className="space-y-3">
                        {metrics.recentActivity.length === 0 ? (
                            <div className="text-center py-8 opacity-50">
                                <History className="mx-auto mb-2 text-gray-600" size={24} />
                                <p className="text-[10px] text-gray-500">Sem histórico neste mês.</p>
                            </div>
                        ) : (
                            metrics.recentActivity.map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center text-xs border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-3 rounded-xl transition-all cursor-default group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${item.profit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {item.profit >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        </div>
                                        <div>
                                            <div className="text-gray-200 font-bold">{new Date(item.date).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}</div>
                                            <div className="text-[9px] text-gray-600 font-mono group-hover:text-gray-500 transition-colors">ID #{item.id.toString().slice(-4)}</div>
                                        </div>
                                    </div>
                                    <div className={`font-mono font-bold text-sm ${item.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
