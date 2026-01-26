import React, { useMemo } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowDownRight,
  Filter, PieChart as PieIcon, History, ChevronRight, CheckCircle2, ArrowUpRight,
  LayoutDashboard
} from 'lucide-react';

interface Props {
  state: AppState;
}

const Dashboard: React.FC<Props> = ({ state }) => {
  const metrics = useMemo(() => {
    const dates = Object.keys(state.dailyRecords).sort();
    let totalInv = 0;
    let totalRet = 0;
    let totalLucro = 0;
    let totalDespGeral = 0;
    let totalCheckoutEvents = 0; 
    
    // Breakdown Data
    let totalDepositos = 0;
    let totalRedepositos = 0;
    
    // Config Bônus Safety Check
    const safeBonus = (state.config && typeof state.config.valorBonus === 'number') ? state.config.valorBonus : 20;

    const chartData = dates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], safeBonus);
        const record = state.dailyRecords[date];

        // Accumulate specific breakdowns
        if(record && record.accounts) {
            record.accounts.forEach(acc => {
                totalDepositos += (acc.deposito || 0);
                totalRedepositos += (acc.redeposito || 0);
            });
        }

        const safeInvest = isNaN(m.invest) ? 0 : m.invest;
        const safeRet = isNaN(m.ret) ? 0 : m.ret;
        const safeLucro = isNaN(m.lucro) ? 0 : m.lucro;

        totalInv += safeInvest;
        totalRet += safeRet;
        totalLucro += safeLucro;
        
        if (record && Array.isArray(record.accounts)) {
             record.accounts.forEach(a => {
                 totalCheckoutEvents += (a.ciclos || 0); 
             });
        }

        return {
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            lucro: safeLucro,
            faturamento: safeRet,
            investimento: safeInvest
        };
    });

    if (Array.isArray(state.generalExpenses)) {
        state.generalExpenses.forEach(e => {
            const val = parseFloat(String(e.valor));
            if (!isNaN(val)) totalDespGeral += val;
        });
    }

    const lucroLiquido = totalLucro - totalDespGeral;
    const totalInvestimentoReal = totalInv + totalDespGeral;
    
    // KPI Percentages for Funnel
    // Base 100% is Revenue for visual scaling if Revenue > Investment, else Investment is base
    const baseScale = Math.max(totalInvestimentoReal, totalRet) || 1;
    const investPct = (totalInvestimentoReal / baseScale) * 100;
    const retPct = (totalRet / baseScale) * 100;
    
    // PIE CHART DATA
    const pieData = [
        { name: 'Depósitos', value: totalDepositos, color: '#3b82f6' }, // Blue
        { name: 'Redepósitos', value: totalRedepositos, color: '#8b5cf6' }, // Purple
        { name: 'Custos/Desp.', value: (totalDespGeral + (totalInv - totalDepositos - totalRedepositos)), color: '#ef4444' } // Red (includes proxy/sms costs)
    ].filter(d => d.value > 0);

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
                const ret = (acc.saque || 0) + ((acc.ciclos || 0) * safeBonus);
                const profit = ret - invest;
                allAccounts.push({ ...acc, date, profit, ret });
            });
        }
    });
    // Ordena por ID (timestamp) decrescente
    const recentActivity = allAccounts.sort((a, b) => b.id - a.id).slice(0, 10); // Mostra 10 agora

    return {
        totalInv: totalInvestimentoReal,
        totalRet,
        lucroLiquido,
        chartData: chartData.slice(-14),
        pieData,
        investPct,
        retPct,
        roi: isNaN(roi) ? 0 : roi,
        margin: isNaN(margin) ? 0 : margin,
        totalCheckoutEvents,
        recentActivity
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-white/10 p-4 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-gray-400 text-xs font-bold uppercase mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-4 text-xs font-medium mb-1">
                <span className="text-gray-300 uppercase">{entry.name}:</span>
                <span className="text-white ml-auto font-bold">{formatarBRL(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 pb-2">
          <div>
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <LayoutDashboard className="text-primary" size={24} />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                    Dashboard
                </h1>
            </div>
            <p className="text-gray-400 text-sm font-medium">
                Visão geral da performance financeira.
            </p>
          </div>
          <div className="flex items-center gap-2">
               <div className="px-4 py-2 bg-emerald-900/10 border border-emerald-500/20 rounded-xl flex flex-col items-end">
                   <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">ROI Atual</span>
                   <span className="text-xl font-bold text-emerald-400 font-mono leading-none">{metrics.roi.toFixed(1)}%</span>
               </div>
               <div className="px-4 py-2 bg-blue-900/10 border border-blue-500/20 rounded-xl flex flex-col items-end">
                   <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Margem</span>
                   <span className="text-xl font-bold text-blue-400 font-mono leading-none">{metrics.margin.toFixed(1)}%</span>
               </div>
          </div>
        </div>

        {/* --- KPI GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Faturamento */}
            <div className="relative group bg-white/5 border border-white/5 p-5 rounded-2xl overflow-hidden hover:border-emerald-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Receita Bruta</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{formatarBRL(metrics.totalRet)}</h3>
                </div>
            </div>

            {/* Lucro Líquido */}
            <div className="relative group bg-white/5 border border-white/5 p-5 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-primary rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Lucro Líquido</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{formatarBRL(metrics.lucroLiquido)}</h3>
                </div>
            </div>

            {/* Investimento */}
            <div className="relative group bg-white/5 border border-white/5 p-5 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <ArrowDownRight size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Investimento</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{formatarBRL(metrics.totalInv)}</h3>
                </div>
            </div>

            {/* Ciclos */}
            <div className="relative group bg-white/5 border border-white/5 p-5 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Activity size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Ciclos Totais</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white tracking-tight">{metrics.totalCheckoutEvents}</h3>
                </div>
            </div>
        </div>

        {/* --- MAIN DASHBOARD GRID (CHART LEFT, WIDGETS RIGHT) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            
            {/* 1. MAIN AREA CHART (Takes 2/3 Width) */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden min-h-[500px]">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} className="text-gray-400" /> Analítico de Performance
                    </h3>
                    <div className="flex gap-2">
                         <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                             <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                             <span className="text-[10px] text-gray-300 font-bold uppercase">Receita</span>
                         </div>
                         <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                             <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                             <span className="text-[10px] text-gray-300 font-bold uppercase">Lucro</span>
                         </div>
                    </div>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="rgba(255,255,255,0.1)" 
                                tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 500}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10} 
                            />
                            <YAxis 
                                stroke="rgba(255,255,255,0.1)" 
                                tick={{fill: '#9ca3af', fontSize: 10, fontWeight: 500}} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                            <Area 
                                type="monotone" 
                                dataKey="faturamento" 
                                stroke="#10b981" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorFaturamento)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="lucro" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorLucro)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. SIDEBAR WIDGETS (Takes 1/3 Width) */}
            <div className="flex flex-col gap-6 h-full">
                
                {/* COMPACT BAR FUNNEL */}
                <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col justify-center flex-1">
                     <div className="mb-4 flex items-center gap-2">
                         <Filter size={16} className="text-amber-400" />
                         <h3 className="text-white font-bold text-xs uppercase tracking-wider">Funil Financeiro</h3>
                     </div>
                     
                     <div className="space-y-4 relative flex-1 flex flex-col justify-center">
                         {/* Connector Lines */}
                         <div className="absolute left-6 top-4 bottom-4 w-px bg-white/10 z-0"></div>

                         {/* Investment Bar */}
                         <div className="relative z-10 pl-6">
                             <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Investimento</div>
                             <div 
                                className="h-10 rounded-lg bg-gradient-to-r from-pink-600 to-rose-500 flex items-center px-4 shadow-lg shadow-rose-900/20"
                                style={{ width: '100%' }}
                             >
                                 <span className="text-white font-bold text-sm drop-shadow-md">{formatarBRL(metrics.totalInv)}</span>
                             </div>
                         </div>

                         {/* Revenue Bar */}
                         <div className="relative z-10 pl-6">
                             <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 tracking-wider">Faturamento</div>
                             <div 
                                className="h-10 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center px-4 shadow-lg shadow-violet-900/20"
                                style={{ width: `${Math.max(20, metrics.retPct)}%` }} // Minimum width for visibility
                             >
                                 <span className="text-white font-bold text-sm drop-shadow-md">{formatarBRL(metrics.totalRet)}</span>
                             </div>
                         </div>

                         {/* Profit Box */}
                         <div className="relative z-10 pl-6 pt-2">
                             <div className="bg-cyan-400 text-black p-3 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.3)] text-center w-full">
                                 <span className="block text-xl font-black">{formatarBRL(metrics.lucroLiquido)}</span>
                                 <span className="text-[9px] font-bold uppercase tracking-widest opacity-70">Lucro Líquido</span>
                             </div>
                         </div>
                     </div>
                </div>

                {/* COMPACT BREAKDOWN PIE */}
                <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col flex-1 min-h-[240px]">
                    <div className="mb-2 flex items-center gap-2">
                         <PieIcon size={16} className="text-rose-400" />
                         <h3 className="text-white font-bold text-xs uppercase tracking-wider">Breakdown</h3>
                     </div>
                    
                    <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={metrics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {metrics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0a0516', borderColor: '#333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value: number) => formatarBRL(value)}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={30} 
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => <span className="text-gray-400 text-[10px] font-bold uppercase ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-6">
                            <div className="text-center">
                                <span className="text-[10px] text-gray-500 font-bold block">SAÍDAS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- BOTTOM SECTION: RECENT ACTIVITY --- */}
        <div className="gateway-card rounded-2xl p-6 border border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                    <History className="text-primary" size={20} /> Transações Recentes
                </h3>
                <button className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                    Últimos 10 registros <ChevronRight size={14} />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase font-bold border-b border-white/5">
                        <tr>
                            <th className="px-4 py-3">ID / Data</th>
                            <th className="px-4 py-3">Resultado</th>
                            <th className="px-4 py-3 text-right">Valor Líquido</th>
                            <th className="px-4 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {metrics.recentActivity.length === 0 ? (
                             <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-500 text-xs uppercase font-bold tracking-widest">
                                    Nenhuma atividade registrada
                                </td>
                             </tr>
                        ) : (
                            metrics.recentActivity.map((item: any) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="font-mono text-white text-xs">#{item.id.toString().slice(-6)}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase">{new Date(item.date).toLocaleDateString('pt-BR')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {item.profit >= 0 ? (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 w-fit uppercase">
                                                <ArrowUpRight size={12} /> Lucro
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded border border-rose-400/20 w-fit uppercase">
                                                <ArrowDownRight size={12} /> Prejuízo
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${item.profit >= 0 ? 'text-white' : 'text-gray-400'}`}>
                                        {formatarBRL(item.profit)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="inline-flex items-center justify-center p-1 rounded-full bg-emerald-500/10 text-emerald-500">
                                            <CheckCircle2 size={14} />
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