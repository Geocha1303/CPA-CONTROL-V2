
import React, { useMemo, useState, useEffect } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
} from 'recharts';
import { 
  TrendingUp, Activity, ArrowDownRight,
  BarChart3,
  Flame, Globe, RefreshCw, Lock, Clock,
  Target, ChevronDown, AlertTriangle,
  HardDrive, Wifi, Cpu, X, Plus, ArrowRight, History
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';

interface Props {
  privacyMode?: boolean;
  forcedState?: AppState;
}

const Dashboard: React.FC<Props> = ({ privacyMode, forcedState }) => {
  const storeState = useStore();
  const state = forcedState || storeState;

  const [analysisMode, setAnalysisMode] = useState<'local' | 'global'>('local');
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalAggregatedData, setGlobalAggregatedData] = useState<Record<string, DayRecord>>({});
  const [showDataWarning, setShowDataWarning] = useState(true);
  
  const hojeISO = getHojeISO();
  const currentMonthKey = hojeISO.substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); 
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 5) return 'Boa madrugada';
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const handleToggleMode = async () => {
      if (analysisMode === 'global') {
          setAnalysisMode('local');
          return;
      }
      setIsLoadingGlobal(true);
      try {
          const { data, error } = await supabase.from('user_data').select('raw_json').order('updated_at', { ascending: false }).limit(50);
          if (error) throw error;
          if (data) {
              const aggregated: Record<string, DayRecord> = {};
              data.forEach((row: any) => {
                  const userData = row.raw_json as AppState;
                  if (!userData || !userData.dailyRecords) return;
                  Object.entries(userData.dailyRecords).forEach(([date, record]) => {
                      if (!aggregated[date]) aggregated[date] = { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
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
              setAnalysisMode('global');
          }
      } catch (err) {
          console.error("Erro dados globais:", err);
      } finally {
          setIsLoadingGlobal(false);
      }
  };

  const availableMonths = useMemo(() => {
      const keys = Object.keys(state.dailyRecords);
      const monthsSet = new Set<string>();
      monthsSet.add(currentMonthKey);
      keys.forEach(k => { if (k.length >= 7) monthsSet.add(k.substring(0, 7)); });
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
    const filterKey = selectedMonth; 
    const monthDates = Object.keys(state.dailyRecords).filter(d => d.startsWith(filterKey)).sort();
    let totalDespGeral = 0;
    const bonusMultiplier = (state.config.manualBonusMode) ? 1 : (state.config.valorBonus || 20);
    let totalDepositos = 0, totalRedepositos = 0, totalInv = 0, totalRet = 0, totalLucro = 0;

    let chartData = monthDates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], bonusMultiplier);
        const record = state.dailyRecords[date];
        totalInv += (isNaN(m.invest) ? 0 : m.invest);
        totalRet += (isNaN(m.ret) ? 0 : m.ret);
        totalLucro += (isNaN(m.lucro) ? 0 : m.lucro);
        if(record && record.accounts) {
            record.accounts.forEach(acc => {
                totalDepositos += (acc.deposito || 0);
                totalRedepositos += (acc.redeposito || 0);
            });
        }
        const [y, monthStr, dayStr] = date.split('-');
        return {
            dateStr: `${dayStr}/${monthStr}`,
            fullDate: date,
            lucro: isNaN(m.lucro) ? 0 : m.lucro,
            faturamento: isNaN(m.ret) ? 0 : m.ret,
            hasActivity: m.ret > 0 || m.invest > 0
        };
    });

    const cleanChartData = chartData.filter(item => item.hasActivity || item.fullDate === hojeISO);
    if (Array.isArray(state.generalExpenses)) {
        state.generalExpenses.forEach(e => {
            if (e.date.startsWith(filterKey)) totalDespGeral += parseFloat(String(e.valor)) || 0;
        });
    }

    const lucroLiquido = totalLucro - totalDespGeral;
    const totalInvestimentoReal = totalInv + totalDespGeral;
    
    const margin = totalRet > 0 ? (lucroLiquido / totalRet) * 100 : 0;
    
    const roi = totalInvestimentoReal > 0 ? ((lucroLiquido / totalInvestimentoReal) * 100) : 0;
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    const todayDay = new Date().getDate();
    const dailyAvg = lucroLiquido / Math.max(1, todayDay);
    const projectedProfit = dailyAvg * daysInMonth;

    let healthScore = 0;
    if (margin > 30) healthScore = 95; else if (margin > 15) healthScore = 75; else if (margin > 0) healthScore = 50; else healthScore = 20;

    return { totalInv: totalInvestimentoReal, totalRet, lucroLiquido, chartData: cleanChartData, margin, roi, projectedProfit, dailyAvg, healthScore };
  }, [state.dailyRecords, state.generalExpenses, state.config, selectedMonth, currentMonthKey]);

  const recentTransactions = useMemo(() => {
      const all: any[] = [];
      // Pega os últimos 3 dias com registro
      const dates = Object.keys(state.dailyRecords).sort().reverse().slice(0, 3);
      const bonusMultiplier = (state.config.manualBonusMode) ? 1 : (state.config.valorBonus || 20);

      dates.forEach(date => {
          const record = state.dailyRecords[date];
          if(record && record.accounts) {
              record.accounts.forEach(acc => {
                  const lucroItem = ((acc.saque||0) + ((acc.ciclos||0) * bonusMultiplier)) - ((acc.deposito||0) + (acc.redeposito||0));
                  all.push({
                      id: acc.id,
                      date,
                      lucro: lucroItem,
                      invest: (acc.deposito||0) + (acc.redeposito||0)
                  });
              });
          }
      });
      return all.sort((a,b) => b.id - a.id).slice(0, 5);
  }, [state.dailyRecords, state.config]);

  const formatVal = (val: number) => privacyMode ? '****' : formatarBRL(val);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && !privacyMode) {
      return (
        <div className="bg-[#0f0a1e]/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between gap-4 text-xs mb-1">
                <span className="text-white font-medium">{entry.name}:</span>
                <span className="font-mono font-bold" style={{color: entry.color || entry.fill}}>{formatVal(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Componente estatístico isolado para performance
  const StatBlock = ({ title, value, icon: Icon, color, sub, size = 'sm' }: any) => (
    <div className={`relative overflow-hidden rounded-3xl border border-white/5 bg-[#0c0818]/80 backdrop-blur-md p-6 flex flex-col justify-between group hover:border-${color}-500/30 transition-all duration-500`}>
        <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${color === 'emerald' ? 'text-emerald-500' : color === 'indigo' ? 'text-indigo-500' : 'text-rose-500'}`}>
            <Icon size={size === 'lg' ? 120 : 80} />
        </div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl border bg-${color}-500/10 border-${color}-500/20 text-${color}-400`}>
                    <Icon size={24} />
                </div>
                {sub && <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase tracking-wider bg-${color}-500/10 border-${color}-500/20 text-${color}-400`}>{sub}</span>}
            </div>
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
                <h3 className={`font-black text-white font-mono tracking-tighter ${size === 'lg' ? 'text-4xl md:text-5xl' : 'text-3xl'}`}>
                    {value}
                </h3>
            </div>
        </div>
        {/* Glass Reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10 max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between bg-black/20 border border-white/5 rounded-xl py-2 px-4 backdrop-blur-sm">
            <div className="flex items-center gap-6 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                <span className="flex items-center gap-2"><Wifi size={10} className="text-emerald-500"/> ONLINE</span>
                <span className="flex items-center gap-2"><Cpu size={10} className="text-indigo-500"/> 24MS</span>
                <span className="flex items-center gap-2"><Lock size={10} className="text-amber-500"/> SECURE</span>
            </div>
        </div>

        {showDataWarning && (
            <div className="bg-[#0f0a0a] border-l-4 border-amber-500 rounded-r-xl p-6 relative flex items-start gap-5 shadow-lg animate-fade-in">
                <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shrink-0">
                    <HardDrive size={24} className="text-amber-500" />
                </div>
                <div className="space-y-2">
                    <h4 className="text-amber-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle size={16} /> PROTOCOLO DE INTEGRIDADE
                    </h4>
                    <p className="text-xs text-gray-300 font-bold">
                        AVISO: Dados armazenados localmente. Não limpe o cache do navegador sem fazer backup.
                    </p>
                </div>
                <button onClick={() => setShowDataWarning(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>
        )}

        {/* --- HEADER HERO --- */}
        <div className="relative rounded-3xl p-8 border border-white/10 bg-[#0a0516] overflow-hidden shadow-2xl group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-indigo-600/10 via-purple-600/5 to-transparent rounded-full blur-[80px] pointer-events-none group-hover:bg-indigo-600/20 transition-all duration-1000"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                        {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{state.config.userName || 'Operador'}</span>
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <Clock size={14} className="text-indigo-400" />
                            <span>{currentTime.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            <span className="opacity-50">TAG:</span> <span className="text-white font-mono font-bold">#{state.config.userTag}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Score Operacional</p>
                        <div className="text-3xl font-black text-emerald-400 font-mono flex justify-end items-center gap-2">
                            <Activity size={24} /> {metrics.healthScore}
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><ChevronDown size={14} className="text-indigo-400" /></div>
                        <select 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="appearance-none pl-10 pr-4 py-3 bg-black/40 border border-indigo-500/30 rounded-xl text-white font-bold text-sm focus:border-indigo-500 outline-none hover:bg-black/60 transition-all cursor-pointer min-w-[180px] shadow-lg"
                        >
                            {availableMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN CARDS GRID (3 COLUNAS) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* NET PROFIT CARD */}
            <div className="md:col-span-2 relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#0c0818] to-[#05030a] p-8 flex flex-col justify-between group shadow-2xl shadow-emerald-900/10 hover:shadow-emerald-900/20 transition-all">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity duration-700">
                    <HardDrive size={180} className="text-emerald-500" />
                </div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 mb-4">
                        <Activity size={28} />
                    </div>
                    <div className="text-right">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 backdrop-blur-md">
                            <Activity size={14} className="text-emerald-400" />
                            <span className="text-xs font-bold text-emerald-300">Score: {metrics.healthScore}</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <p className="text-emerald-400/60 text-sm font-bold uppercase tracking-widest mb-1">Lucro Líquido (Realizado)</p>
                    <h2 className="text-5xl md:text-6xl font-black text-white font-mono tracking-tighter drop-shadow-lg">
                        {formatVal(metrics.lucroLiquido)}
                    </h2>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="h-1.5 w-32 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{width: `${Math.min(metrics.healthScore, 100)}%`}}></div>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">Margem: {metrics.margin.toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            {/* REVENUE */}
            <StatBlock 
                title="Faturamento Total" 
                value={formatVal(metrics.totalRet)} 
                icon={TrendingUp} 
                color="indigo" 
                sub="Bruto" 
            />

            {/* EXPENSES */}
            <StatBlock 
                title="Custos Totais" 
                value={formatVal(metrics.totalInv)} 
                icon={ArrowDownRight} 
                color="rose" 
                sub="Investido" 
            />
        </div>

        {/* --- CHARTS & ACTIONS SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* MAIN CHART AREA */}
            <div className="lg:col-span-2 bg-[#0c0818] rounded-2xl p-6 border border-white/5 flex flex-col shadow-lg group hover:border-indigo-500/20 transition-all">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2"><BarChart3 size={18} className="text-indigo-400"/> Fluxo Financeiro</h3>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Lucro</span>
                        <span className="flex items-center gap-1.5 text-[10px] text-gray-400 font-bold uppercase"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Vendas</span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={metrics.chartData} margin={{top:10, right:0, left:-20, bottom:0}}>
                            <defs>
                                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="dateStr" stroke="none" tick={{fill:'#52525b', fontSize:10, fontWeight:600}} dy={10} minTickGap={30} />
                            <YAxis stroke="none" tick={{fill:'#52525b', fontSize:10}} hide={privacyMode} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill:'rgba(255,255,255,0.02)'}} />
                            <Bar dataKey="faturamento" fill="#6366f1" radius={[4,4,0,0]} barSize={12} fillOpacity={0.6} />
                            <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLucro)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SIDE COLUMN: PIE + ACTIONS + RECENT */}
            <div className="lg:col-span-1 flex flex-col gap-6">
                
                {/* QUICK ACTIONS & TARGET */}
                <div className="bg-[#0c0818] rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
                    <div>
                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Target size={16} className="text-cyan-400"/> Meta Diária (Est.)</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-3xl font-black text-white">{formatVal(metrics.lucroLiquido / Math.max(1, new Date().getDate()))}</span>
                            <span className="text-xs text-gray-500 font-bold mb-1.5">/ {formatVal(metrics.dailyAvg)}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-6">
                            <div className="h-full bg-cyan-500 w-[70%] relative"><div className="absolute inset-0 bg-white/30 animate-shimmer"></div></div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            <button className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-900/20 active:scale-95">
                                <Plus size={14} /> Novo Plano
                            </button>
                            <button className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-white/10 active:scale-95">
                                <ArrowRight size={14} /> Registrar
                            </button>
                        </div>
                    </div>
                </div>

                {/* RECENT ACTIVITY LIST */}
                <div className="flex-1 bg-[#0c0818] rounded-2xl p-5 border border-white/5 relative shadow-lg min-h-[200px]">
                    <h3 className="text-white font-bold text-xs mb-4 flex items-center justify-between">
                        <span className="flex items-center gap-2"><History size={14} className="text-purple-400"/> Últimas Movimentações</span>
                    </h3>
                    <div className="space-y-3">
                        {recentTransactions.length === 0 ? (
                            <div className="text-center text-gray-600 text-xs py-8">Sem registros recentes.</div>
                        ) : (
                            recentTransactions.map((tx, i) => (
                                <div key={i} className="flex justify-between items-center text-xs group hover:bg-white/5 p-2 rounded-lg transition-colors cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-1.5 rounded-full ${tx.lucro >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                        <div>
                                            <p className="text-gray-300 font-bold">Lote #{tx.id.toString().slice(-4)}</p>
                                            <p className="text-[9px] text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold ${tx.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatVal(tx.lucro)}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>

        {/* BOTTOM GLOBAL ACTION */}
        <div className="mt-6 bg-gradient-to-r from-indigo-900/10 to-purple-900/10 rounded-2xl p-1 border border-white/5">
            <div className="bg-[#0a0516] rounded-xl px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-full animate-pulse"><Flame size={20} className="text-orange-500" /></div>
                    <div>
                        <h4 className="text-white font-bold text-sm">Modo de Análise Global</h4>
                        <p className="text-gray-500 text-xs">
                            Compare seus resultados com a média anônima de outros operadores.
                        </p>
                    </div>
                </div>
                <button 
                    onClick={handleToggleMode}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border flex items-center gap-2 ${analysisMode === 'global' ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                >
                    {isLoadingGlobal ? <RefreshCw size={12} className="animate-spin"/> : <Globe size={12}/>}
                    {analysisMode === 'global' ? 'REDE GLOBAL ATIVA' : 'COMPARAR COM GLOBAL'}
                </button>
            </div>
        </div>

    </div>
  );
};

export default Dashboard;
