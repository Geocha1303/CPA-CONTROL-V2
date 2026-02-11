import React, { useMemo, useState, useEffect } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, ArrowDownRight,
  Filter, PieChart as PieIcon, History, ArrowUpRight,
  Wallet, BarChart3,
  Flame, Globe, User, RefreshCw, Lock, Clock,
  Target, ChevronDown, CheckCircle2, AlertTriangle,
  Zap, HardDrive, Wifi, Cpu, X, Calendar, Gauge
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
  const [globalUserCount, setGlobalUserCount] = useState(0);
  const [showDataWarning, setShowDataWarning] = useState(true);
  
  const hojeISO = getHojeISO();
  const currentMonthKey = hojeISO.substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
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
              let userCount = 0;
              data.forEach((row: any) => {
                  const userData = row.raw_json as AppState;
                  if (!userData || !userData.dailyRecords) return;
                  userCount++;
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
              setGlobalUserCount(userCount);
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
    const pieData = [
        { name: 'Depósitos', value: totalDepositos, color: '#6366f1' },
        { name: 'Redepósitos', value: totalRedepositos, color: '#a855f7' },
        { name: 'Custos', value: (totalDespGeral + (totalInv - totalDepositos - totalRedepositos)), color: '#f43f5e' }
    ].filter(d => d.value > 0);

    const margin = totalRet > 0 ? (lucroLiquido / totalRet) * 100 : 0;
    const [selYear, selMonth] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    const todayDay = new Date().getDate();
    const dailyAvg = lucroLiquido / Math.max(1, todayDay);
    const projectedProfit = dailyAvg * daysInMonth;

    const displayDateObj = new Date(parseInt(selectedMonth.split('-')[0]), parseInt(selectedMonth.split('-')[1]) - 1, 1);
    const monthName = displayDateObj.toLocaleDateString('pt-BR', { month: 'long' });

    let healthScore = 0;
    if (margin > 30) healthScore = 95; else if (margin > 15) healthScore = 75; else if (margin > 0) healthScore = 50; else healthScore = 20;

    return { totalInv: totalInvestimentoReal, totalRet, lucroLiquido, chartData: cleanChartData, pieData: pieData.length ? pieData : [{name:'N/A',value:1,color:'#333'}], margin, projectedProfit, monthName, dailyAvg, healthScore, hasData: cleanChartData.some(d => d.hasActivity) };
  }, [state.dailyRecords, state.generalExpenses, state.config, selectedMonth, currentMonthKey]);

  const intelligenceData = useMemo(() => {
      const dayStats: Record<number, { profit: number; count: number }> = { 0: {profit:0, count:0}, 1: {profit:0, count:0}, 2: {profit:0, count:0}, 3: {profit:0, count:0}, 4: {profit:0, count:0}, 5: {profit:0, count:0}, 6: {profit:0, count:0} };
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      
      const activeRecords = analysisMode === 'global' ? globalAggregatedData : state.dailyRecords;
      const bonusMultiplier = analysisMode === 'global' 
        ? 1 
        : (state.config.manualBonusMode ? 1 : (state.config.valorBonus || 20));

      Object.keys(activeRecords).forEach(date => {
          const m = calculateDayMetrics(activeRecords[date], bonusMultiplier);
          const dayIndex = new Date(date + 'T12:00:00').getDay();
          
          if(m.lucro > 0) {
              dayStats[dayIndex].profit += m.lucro;
              dayStats[dayIndex].count += 1;
          }
      });

      let bestDay = { name: 'Sem dados suficientes', profit: -Infinity };
      
      Object.keys(dayStats).forEach(key => {
          const k = parseInt(key);
          const total = dayStats[k].profit;
          const avg = dayStats[k].count > 0 ? total / dayStats[k].count : 0;
          
          if (avg > bestDay.profit && avg > 0) {
              bestDay = { name: dayNames[k], profit: avg };
          }
      });

      return { bestDay };
  }, [state.dailyRecords, state.config, analysisMode, globalAggregatedData]);

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
                        <AlertTriangle size={16} /> PROTOCOLO DE INTEGRIDADE DE DADOS
                    </h4>
                    <p className="text-xs text-gray-300 font-bold">
                        AVISO IMPORTANTE: Seus registros são armazenados primariamente neste computador (Cache Local).
                    </p>
                    <ul className="text-[11px] text-gray-400 space-y-1.5 leading-relaxed">
                        <li className="flex items-start gap-2">
                            <span className="w-1 h-1 bg-gray-500 rounded-full mt-1.5"></span>
                            <span><strong className="text-white">NÃO</strong> limpe o histórico ou dados de navegação do Chrome.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1 h-1 bg-gray-500 rounded-full mt-1.5"></span>
                            <span>Embora o sistema possua backup automático na nuvem, a restauração pode apresentar <strong className="text-white">instabilidades ou bugs</strong> em alguns cenários.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1 h-1 bg-gray-500 rounded-full mt-1.5"></span>
                            <span>Para garantir 100% de segurança, mantenha seus dados locais intactos e evite formatar o navegador.</span>
                        </li>
                    </ul>
                </div>
                <button 
                    onClick={() => setShowDataWarning(false)} 
                    className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>
            </div>
        )}

        <div className="relative rounded-3xl p-8 border border-white/10 bg-[#0a0516] overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                        {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{state.config.userName || 'Operador'}</span>
                    </h1>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                        <Clock size={14} />
                        <span>{currentTime.toLocaleDateString('pt-BR', {weekday: 'long', day: 'numeric', month: 'long'})}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Health Score</p>
                        <div className="text-2xl font-black text-emerald-400 font-mono flex justify-end items-center gap-2">
                            <Activity size={18} /> {metrics.healthScore}
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><ChevronDown size={14} className="text-indigo-400" /></div>
                        <select 
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="appearance-none pl-10 pr-4 py-2.5 bg-black/40 border border-indigo-500/30 rounded-xl text-white font-bold text-sm focus:border-indigo-500 outline-none hover:bg-black/60 transition-all cursor-pointer min-w-[160px]"
                        >
                            {availableMonths.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="md:col-span-2 bg-[#0c0818] rounded-2xl p-6 border border-white/5 relative overflow-hidden group hover:border-emerald-500/20 transition-all">
                <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity"><Wallet size={100} /></div>
                <div className="relative z-10 flex flex-col h-full justify-between">
                    <div className="flex justify-between items-start">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><Wallet size={24} /></div>
                        <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 uppercase">Líquido</span>
                    </div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Resultado Líquido</p>
                        <h2 className="text-4xl lg:text-5xl font-black text-white font-mono tracking-tight">{formatVal(metrics.lucroLiquido)}</h2>
                        <div className="flex items-center gap-2 mt-2 text-xs font-medium text-gray-500">
                            <span className="text-emerald-400 flex items-center gap-1"><TrendingUp size={12}/> {metrics.margin.toFixed(1)}% Margem</span>
                            <span>•</span>
                            <span>Projeção: {formatVal(metrics.projectedProfit)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-[#0c0818] rounded-2xl p-6 border border-white/5 relative overflow-hidden group hover:border-indigo-500/20 transition-all">
                <div className="flex flex-col h-full justify-between relative z-10">
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 w-fit"><Activity size={24} /></div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Volume Total</p>
                        <h2 className="text-3xl font-black text-white font-mono">{formatVal(metrics.totalRet)}</h2>
                        <p className="text-[10px] text-gray-500 mt-1">Saques + Bônus Gerados</p>
                    </div>
                </div>
            </div>

            <div className="bg-[#0c0818] rounded-2xl p-6 border border-white/5 relative overflow-hidden group hover:border-rose-500/20 transition-all">
                <div className="flex flex-col h-full justify-between relative z-10">
                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20 w-fit"><ArrowDownRight size={24} /></div>
                    <div>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Custo Operacional</p>
                        <h2 className="text-3xl font-black text-white font-mono">{formatVal(metrics.totalInv)}</h2>
                        <p className="text-[10px] text-gray-500 mt-1">Depósitos + Despesas</p>
                    </div>
                </div>
            </div>

            <div className="md:col-span-2 lg:col-span-3 bg-[#0c0818] rounded-2xl p-6 border border-white/5 min-h-[350px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2"><BarChart3 size={18} className="text-indigo-400"/> Fluxo Financeiro</h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Lucro</span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> Vendas</span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[250px]">
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
                            <Bar dataKey="faturamento" fill="#6366f1" radius={[4,4,0,0]} barSize={20} fillOpacity={0.6} />
                            <Area type="monotone" dataKey="lucro" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorLucro)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="flex-1 bg-[#0c0818] rounded-2xl p-6 border border-white/5 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
                    <div>
                        <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Target size={16} className="text-cyan-400"/> Meta Diária (Est.)</h3>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-2xl font-black text-white">{formatVal(metrics.lucroLiquido / Math.max(1, new Date().getDate()))}</span>
                            <span className="text-xs text-gray-500 font-bold mb-1">/ {formatVal(metrics.dailyAvg)}</span>
                        </div>
                        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-cyan-500 w-[70%] relative"><div className="absolute inset-0 bg-white/30 animate-shimmer"></div></div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 mt-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-400 font-bold">Health Score</span>
                            <span className={`font-black ${metrics.healthScore > 80 ? 'text-emerald-400' : 'text-amber-400'}`}>{metrics.healthScore}/100</span>
                        </div>
                    </div>
                </div>

                <div className="h-[200px] bg-[#0c0818] rounded-2xl p-4 border border-white/5 relative">
                    <h3 className="text-white font-bold text-xs absolute top-4 left-4 z-10 flex items-center gap-2"><PieIcon size={14} className="text-purple-400"/> Distribuição</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={metrics.pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" stroke="none">
                                {metrics.pieData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="col-span-full bg-gradient-to-r from-indigo-900/10 to-purple-900/10 rounded-2xl p-1 border border-white/5">
                <div className="bg-[#0a0516] rounded-xl px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/5 rounded-full"><Flame size={20} className="text-orange-500" /></div>
                        <div>
                            <h4 className="text-white font-bold text-sm">Análise de Tendência</h4>
                            <p className="text-gray-500 text-xs">
                                Baseado nos seus registros, seu melhor dia da semana é <strong className="text-white">{intelligenceData.bestDay.name}</strong> com média de <span className="text-emerald-400 font-bold">{formatVal(intelligenceData.bestDay.profit)}</span>.
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
    </div>
  );
};

export default Dashboard;