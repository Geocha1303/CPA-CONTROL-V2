
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
  Zap, Target, ChevronUp, Cpu, Wifi, Info, X, Calendar, ChevronDown, CheckCircle2, AlertTriangle,
  Gauge, TrendingDown, MoreHorizontal, HardDrive // Adicionado HardDrive
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
  
  // State do Alerta de Dados
  const [showDataWarning, setShowDataWarning] = useState(true);
  
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
    if (hour < 5) return 'Boa madrugada';
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

        // --- CORREÇÃO DE TIMEZONE ---
        const [y, monthStr, dayStr] = date.split('-');
        const dateStr = `${dayStr}/${monthStr}`;

        return {
            dateStr: dateStr,
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

    // LÓGICA DE PROJEÇÃO & DIÁRIA
    const isCurrentMonth = selectedMonth === currentMonthKey;
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    const todayDay = new Date().getDate();
    
    let dailyAvg = 0;
    let projectedProfit = 0;

    if (isCurrentMonth) {
        const daysPassed = Math.max(1, todayDay);
        dailyAvg = lucroLiquido / daysPassed;
        projectedProfit = dailyAvg * daysInMonth;
    } else {
        dailyAvg = lucroLiquido / daysInMonth;
        projectedProfit = lucroLiquido; 
    }

    // Activity Feed (Mostra atividades do mês selecionado)
    const allAccounts: any[] = [];
    Object.entries(state.dailyRecords).forEach(([date, record]) => {
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

    // CALCULO DO HEALTH SCORE
    let healthScore = 0;
    if (roi > 50) healthScore += 40; else if (roi > 20) healthScore += 20;
    if (margin > 30) healthScore += 40; else if (margin > 10) healthScore += 20;
    if (lucroLiquido > 0) healthScore += 20;
    
    let healthLabel = "Crítico";
    let healthColor = "text-rose-500";
    if (healthScore >= 80) { healthLabel = "Lendário"; healthColor = "text-purple-400"; }
    else if (healthScore >= 60) { healthLabel = "Saudável"; healthColor = "text-emerald-400"; }
    else if (healthScore >= 40) { healthLabel = "Estável"; healthColor = "text-amber-400"; }

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
        isCurrentMonth,
        dailyAvg,
        healthScore,
        healthLabel,
        healthColor
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
                <span>V4.0.1-NEON</span>
            </div>
        </div>

        {/* --- CRITICAL DATA SAFETY WARNING --- */}
        {showDataWarning && (
            <div className="bg-gradient-to-r from-amber-900/20 to-[#0a0516] border border-amber-500/20 rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-start gap-4 relative overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.05)] mb-2">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shrink-0 mt-1">
                    <HardDrive className="text-amber-500" size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="text-amber-400 font-bold text-sm uppercase tracking-wide flex items-center gap-2 mb-1">
                        <AlertTriangle size={14} /> Protocolo de Integridade de Dados
                    </h4>
                    <p className="text-amber-200/80 text-xs leading-relaxed max-w-4xl">
                        <strong className="text-amber-400">AVISO IMPORTANTE:</strong> Seus registros são armazenados primariamente neste computador (Cache Local). 
                        <span className="block mt-1">
                            • <strong>NÃO</strong> limpe o histórico ou dados de navegação do Chrome.<br/>
                            • Embora o sistema possua backup automático na nuvem, a restauração pode apresentar <strong>instabilidades ou bugs</strong> em alguns cenários.<br/>
                            • Para garantir 100% de segurança, mantenha seus dados locais intactos e evite formatar o navegador.
                        </span>
                    </p>
                </div>
                <button 
                    onClick={() => setShowDataWarning(false)}
                    className="absolute top-2 right-2 text-amber-500/50 hover:text-amber-400 hover:bg-amber-500/10 rounded p-1 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        )}

        {/* --- HEADER HOLOGRÁFICO --- */}
        <div className="relative rounded-3xl overflow-hidden p-8 border border-white/10 shadow-2xl bg-[#0a0516] group">
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
                    {/* GLOBAL DATE FILTER */}
                    <div className="relative group z-20">
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
                            transition-all duration-300"
                        >
                            {availableMonths.map((m) => (
                                <option key={m.key} value={m.key} className="bg-[#0a0516] text-gray-300">
                                    {m.label} {m.isCurrent ? '(Atual)' : ''}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <ChevronDown size={14} className="text-cyan-400" />
                        </div>
                    </div>

                    <div className="flex gap-6 items-center">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Health Score</p>
                            <div className={`flex items-center gap-2 justify-end ${metrics.healthColor}`}>
                                <Activity size={16} />
                                <span className="text-2xl font-black font-mono leading-none drop-shadow-lg">{metrics.healthScore}</span>
                            </div>
                            <span className={`text-[9px] font-bold uppercase tracking-wider ${metrics.healthColor} opacity-70`}>{metrics.healthLabel}</span>
                        </div>
                        <div className="w-px bg-white/10 h-8 self-center"></div>
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

        {/* --- KPI CARDS CRYSTAL (V4) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CARD 1: LUCRO (NEON GREEN) */}
            <div className="group relative rounded-3xl p-6 bg-[#0c0818]/80 border border-emerald-500/30 hover:border-emerald-400/60 transition-all duration-500 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.05)] hover:shadow-[0_0_50px_rgba(16,185,129,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20 shadow-inner">
                            <Wallet size={24} />
                        </div>
                        <div className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                            Líquido
                        </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Saldo em Caixa</span>
                    <div className="text-4xl font-black text-white font-mono tracking-tight mb-2 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                        {formatVal(metrics.lucroLiquido)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        {metrics.isCurrentMonth ? (
                            <>
                                <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={12}/> Projeção:</span>
                                <span>{formatVal(metrics.projectedProfit)}</span>
                            </>
                        ) : (
                            <span className="text-gray-400 flex items-center gap-1"><CheckCircle2 size={12}/> Mês Fechado</span>
                        )}
                    </div>
                </div>
            </div>

            {/* CARD 2: FATURAMENTO (NEON INDIGO) */}
            <div className="group relative rounded-3xl p-6 bg-[#0c0818]/80 border border-indigo-500/30 hover:border-indigo-400/60 transition-all duration-500 overflow-hidden shadow-[0_0_30px_rgba(99,102,241,0.05)] hover:shadow-[0_0_50px_rgba(99,102,241,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-inner">
                            <Activity size={24} />
                        </div>
                        <div className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                            Volume
                        </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Entradas Totais</span>
                    <div className="text-4xl font-black text-white font-mono tracking-tight mb-2 drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                        {formatVal(metrics.totalRet)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <ArrowUpRight size={12} className="text-indigo-400" />
                        <span>Saques + Bônus</span>
                    </div>
                </div>
            </div>

            {/* CARD 3: CUSTOS (NEON ROSE) */}
            <div className="group relative rounded-3xl p-6 bg-[#0c0818]/80 border border-rose-500/30 hover:border-rose-400/60 transition-all duration-500 overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.05)] hover:shadow-[0_0_50px_rgba(244,63,94,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl group-hover:bg-rose-500/20 transition-all"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-400 border border-rose-500/20 shadow-inner">
                            <Filter size={24} />
                        </div>
                        <div className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                            Saídas
                        </div>
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-1">Investimento Total</span>
                    <div className="text-4xl font-black text-white font-mono tracking-tight mb-2 drop-shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                        {formatVal(metrics.totalInv)}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                        <ArrowDownRight size={12} className="text-rose-400" />
                        <span>Depósitos + Custos Op.</span>
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

            {/* DAILY TARGET WIDGET (NOVO) */}
            <div className="p-6 rounded-3xl border border-white/10 bg-[#08050e] relative overflow-hidden shadow-xl flex flex-col">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none transform rotate-12"><Target size={120} /></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                     <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-white font-bold text-base flex items-center gap-2">
                                <Gauge size={18} className="text-cyan-400" /> Meta Diária Inteligente
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">Quanto falta para fechar o dia no alvo?</p>
                        </div>
                     </div>

                     <div className="mt-6">
                         {state.monthlyGoals[currentMonthKey] > 0 ? (
                             <>
                                 <div className="flex justify-between items-end mb-2">
                                     <span className="text-3xl font-black text-white">{formatVal(metrics.lucroLiquido / Math.max(1, new Date().getDate()))}</span>
                                     <span className="text-sm font-bold text-gray-500 mb-1">/ {formatVal(metrics.lucroLiquido > state.monthlyGoals[currentMonthKey] ? metrics.dailyAvg : (state.monthlyGoals[currentMonthKey] - metrics.lucroLiquido) / (new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]), 0).getDate() - new Date().getDate() + 1))} (Est.)</span>
                                 </div>
                                 <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000" 
                                        style={{width: `${Math.min(100, (metrics.lucroLiquido / (new Date().getDate() * (state.monthlyGoals[currentMonthKey] / 30))) * 100)}%`}}
                                     ></div>
                                 </div>
                                 <p className="text-[10px] text-cyan-400 mt-2 font-bold uppercase tracking-wide">
                                     Ritmo atual baseado na meta mensal
                                 </p>
                             </>
                         ) : (
                             <div className="text-center py-4 bg-white/5 rounded-xl border border-white/5">
                                 <p className="text-xs text-gray-400">Defina uma meta mensal na aba "Metas" para ativar este widget.</p>
                             </div>
                         )}
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
                        {metrics.pieData[0]?.name === 'Sem dados' ? (
                             <div className="h-full flex items-center justify-center flex-col opacity-50">
                                 <div className="w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center">
                                     <span className="text-xs text-gray-500">N/A</span>
                                 </div>
                             </div>
                        ) : (
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
                        )}
                        {metrics.pieData[0]?.name !== 'Sem dados' && (
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Total Investido</span>
                                <span className="text-white font-bold text-xs">{formatVal(metrics.totalInv)}</span>
                            </div>
                        )}
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
