import React, { useMemo } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowDownRight,
  Filter, PieChart as PieIcon, History, CheckCircle2, ArrowUpRight,
  MoreHorizontal, Wallet
} from 'lucide-react';

interface Props {
  state: AppState;
}

const Dashboard: React.FC<Props> = ({ state }) => {
  const metrics = useMemo(() => {
    // 1. Filtragem de Datas (Corta futuro)
    const hojeISO = getHojeISO();
    const allDates = Object.keys(state.dailyRecords).sort();
    // Filtra apenas datas até hoje para evitar queda a zero no gráfico
    const pastAndPresentDates = allDates.filter(d => d <= hojeISO);

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

    let chartData = pastAndPresentDates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], safeBonus);
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
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            fullDate: date,
            lucro: safeLucro,
            faturamento: safeRet,
            investimento: safeInvest
        };
    });

    // Totais Reais (Consideram todo o histórico do state, independente do corte do gráfico)
    if (Array.isArray(state.generalExpenses)) {
        state.generalExpenses.forEach(e => {
            const val = parseFloat(String(e.valor));
            if (!isNaN(val)) totalDespGeral += val;
        });
    }

    // Reset e calcula full history para os cards KPI (para bater com os dados totais do banco)
    totalInv = 0; totalRet = 0; totalLucro = 0; totalDepositos = 0; totalRedepositos = 0; totalCheckoutEvents = 0;
    allDates.forEach(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], safeBonus);
        const record = state.dailyRecords[date];
        if(record && record.accounts) {
            record.accounts.forEach(acc => {
                totalDepositos += (acc.deposito || 0);
                totalRedepositos += (acc.redeposito || 0);
                totalCheckoutEvents += (acc.ciclos || 0);
            });
        }
        totalInv += (isNaN(m.invest) ? 0 : m.invest);
        totalRet += (isNaN(m.ret) ? 0 : m.ret);
        totalLucro += (isNaN(m.lucro) ? 0 : m.lucro);
    });

    const lucroLiquido = totalLucro - totalDespGeral;
    const totalInvestimentoReal = totalInv + totalDespGeral;
    
    // KPI Percentages for Funnel
    const baseScale = Math.max(totalInvestimentoReal, totalRet) || 1;
    const investPct = (totalInvestimentoReal / baseScale) * 100;
    const retPct = (totalRet / baseScale) * 100;
    
    // PIE CHART DATA
    const pieData = [
        { name: 'Depósitos', value: totalDepositos, color: '#6366f1' }, // Indigo
        { name: 'Redepósitos', value: totalRedepositos, color: '#8b5cf6' }, // Violet
        { name: 'Custos', value: (totalDespGeral + (totalInv - totalDepositos - totalRedepositos)), color: '#ef4444' } // Red
    ].filter(d => d.value > 0);

    // Se pieData vazio (sem dados reais), cria placeholder para não quebrar layout
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
                const ret = (acc.saque || 0) + ((acc.ciclos || 0) * safeBonus);
                const profit = ret - invest;
                allAccounts.push({ ...acc, date, profit, ret });
            });
        }
    });
    const recentActivity = allAccounts.sort((a, b) => b.id - a.id).slice(0, 10);

    return {
        totalInv: totalInvestimentoReal,
        totalRet,
        lucroLiquido,
        chartData: chartData,
        pieData: pieDisplayData,
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
        <div className="bg-[#0a0a0a]/90 border border-white/10 p-4 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-3 tracking-widest">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-6 text-sm mb-2 last:mb-0">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 8px ${entry.color}` }}></div>
                    <span className="text-gray-300 font-medium capitalize text-xs">{entry.name === 'faturamento' ? 'Faturamento' : 'Lucro Líquido'}</span>
                </div>
                <span className="text-white font-bold font-mono">{formatarBRL(entry.value)}</span>
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
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
               Dashboard Financeiro
            </h1>
            <p className="text-gray-400 text-xs font-medium mt-1">
                Visão consolidada de performance.
            </p>
          </div>
          
          <div className="flex gap-2">
               <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-right">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">ROI Total</p>
                   <p className={`text-lg font-bold font-mono leading-none ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(0)}%
                   </p>
               </div>
               <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-right">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Margem Líq.</p>
                   <p className="text-lg font-bold text-blue-400 font-mono leading-none">{metrics.margin.toFixed(0)}%</p>
               </div>
          </div>
        </div>

        {/* --- KPI SUMMARY CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CARD 1: SALDO/LUCRO */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <Wallet size={100} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
                            <Zap size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resultado Líquido</span>
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-tight">
                        {formatarBRL(metrics.lucroLiquido)}
                    </div>
                    <div className="mt-2 text-xs text-emerald-500/80 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> Disponível em caixa
                    </div>
                </div>
            </div>

            {/* CARD 2: FATURAMENTO */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <TrendingUp size={100} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
                            <Activity size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Faturamento</span>
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-tight">
                        {formatarBRL(metrics.totalRet)}
                    </div>
                     <div className="mt-2 text-xs text-indigo-400/80 font-medium flex items-center gap-1">
                        {metrics.totalCheckoutEvents} ciclos realizados
                    </div>
                </div>
            </div>

            {/* CARD 3: CUSTOS */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                    <ArrowDownRight size={100} />
                </div>
                <div className="relative z-10">
                     <div className="flex items-center gap-2 mb-3">
                        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
                            <Filter size={18} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Custo Total</span>
                    </div>
                    <div className="text-3xl font-black text-white font-mono tracking-tight">
                        {formatarBRL(metrics.totalInv)}
                    </div>
                     <div className="mt-2 text-xs text-rose-400/80 font-medium flex items-center gap-1">
                        Investimentos + Despesas
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN DASHBOARD GRID (CHART LEFT, WIDGETS RIGHT) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            
            {/* 1. EXECUTIVE MIXED CHART (Takes 2/3 Width) */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden min-h-[450px] border border-white/5">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-white font-bold text-base flex items-center gap-2">
                             Performance Financeira
                        </h3>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-1">Comparativo de Volume vs Resultado</p>
                     </div>
                     
                     {/* Custom Legend */}
                     <div className="flex gap-4">
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                             <div className="w-3 h-3 rounded bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
                             <span className="text-[10px] text-indigo-300 font-bold uppercase">Faturamento (Barra)</span>
                         </div>
                         <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                             <div className="w-4 h-1 rounded bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
                             <span className="text-[10px] text-emerald-300 font-bold uppercase">Lucro (Linha)</span>
                         </div>
                     </div>
                </div>
                
                <div className="flex-1 w-full h-full min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                {/* Gradient for Bars */}
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                                </linearGradient>
                                {/* Glow Filter for Line */}
                                <filter id="glow" height="300%" width="300%" x="-100%" y="-100%">
                                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            
                            <XAxis 
                                dataKey="date" 
                                stroke="none" 
                                tick={{fill: '#6b7280', fontSize: 10, fontWeight: 500}} 
                                dy={10} 
                            />
                            
                            {/* Y-Axis Left (Volume/Revenue) */}
                            <YAxis 
                                yAxisId="left"
                                stroke="none" 
                                tick={{fill: '#4f46e5', fontSize: 10, fontWeight: 600, opacity: 0.6}} 
                                tickFormatter={(val) => `R$${val/1000}k`}
                                width={40}
                            />
                            
                            {/* Y-Axis Right (Profit) */}
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="none" 
                                tick={{fill: '#10b981', fontSize: 10, fontWeight: 600, opacity: 0.6}} 
                                tickFormatter={(val) => `R$${val/1000}k`}
                                width={40}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                            
                            {/* BARS: Revenue */}
                            <Bar 
                                yAxisId="left"
                                dataKey="faturamento" 
                                fill="url(#revenueGradient)" 
                                radius={[6, 6, 0, 0]}
                                barSize={24}
                            />

                            {/* LINE: Profit */}
                            <Line 
                                yAxisId="right"
                                type="monotone" 
                                dataKey="lucro" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                                filter="url(#glow)"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. SIDEBAR WIDGETS */}
            <div className="flex flex-col gap-6 h-full">
                
                {/* DONUT CHART (Breakdown) */}
                <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col flex-1 min-h-[280px]">
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                             <PieIcon size={14} className="text-gray-400" /> Distribuição de Saídas
                         </h3>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={metrics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {metrics.pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    formatter={(value: number) => formatarBRL(value)}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    iconSize={8}
                                    formatter={(value) => <span className="text-gray-400 text-[10px] font-bold uppercase ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center Metric */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-8">
                             <span className="text-2xl font-bold text-white">{formatarBRL(metrics.totalInv)}</span>
                             <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Total Saídas</span>
                        </div>
                    </div>
                </div>

                {/* MINI FUNNEL */}
                 <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col justify-center flex-1">
                     <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Filter size={14} className="text-gray-400" /> Eficiência
                     </h3>
                     
                     <div className="space-y-4">
                         <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                                 <span>Entrada (Investido)</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                 <div className="h-full bg-gray-600 rounded-full w-full opacity-50"></div>
                             </div>
                         </div>
                         
                         <div className="flex justify-center">
                             <ArrowDownRight size={16} className="text-gray-600" />
                         </div>

                         <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                                 <span>Retorno (Bruto)</span>
                                 <span className="text-indigo-400">{(metrics.totalRet / (metrics.totalInv || 1)).toFixed(1)}x</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                 <div className="h-full bg-indigo-500 rounded-full" style={{width: '100%'}}></div>
                             </div>
                         </div>

                          <div className="flex justify-center">
                             <ArrowDownRight size={16} className="text-gray-600" />
                         </div>

                          <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                                 <span>Lucro (Líquido)</span>
                                 <span className="text-emerald-400">{metrics.margin.toFixed(0)}% Margem</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                 <div 
                                    className="h-full bg-emerald-500 rounded-full" 
                                    style={{width: `${Math.min(metrics.margin, 100)}%`}}
                                 ></div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>

        {/* --- BOTTOM SECTION: RECENT ACTIVITY --- */}
        <div className="gateway-card rounded-2xl border border-white/5 bg-white/[0.01]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                    <History className="text-gray-500" size={16} /> Últimas Movimentações
                </h3>
                <button className="p-1 rounded hover:bg-white/5 transition-colors">
                    <MoreHorizontal size={16} className="text-gray-500" />
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] text-gray-500 uppercase font-bold bg-white/[0.02]">
                        <tr>
                            <th className="px-6 py-3">ID / Data</th>
                            <th className="px-6 py-3">Resultado</th>
                            <th className="px-6 py-3 text-right">Valor Líquido</th>
                            <th className="px-6 py-3 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {metrics.recentActivity.length === 0 ? (
                             <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-600 text-xs uppercase font-bold tracking-widest">
                                    Nenhum registro encontrado
                                </td>
                             </tr>
                        ) : (
                            metrics.recentActivity.map((item: any) => (
                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-mono text-white text-xs">#{item.id.toString().slice(-6)}</div>
                                        <div className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{new Date(item.date).toLocaleDateString('pt-BR')}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {item.profit >= 0 ? (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-400/5 px-2.5 py-1 rounded-full border border-emerald-400/10 w-fit uppercase">
                                                <ArrowUpRight size={12} /> Lucro
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 bg-rose-400/5 px-2.5 py-1 rounded-full border border-rose-400/10 w-fit uppercase">
                                                <ArrowDownRight size={12} /> Prejuízo
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-6 py-4 text-right font-mono font-bold text-sm ${item.profit >= 0 ? 'text-white' : 'text-gray-500'}`}>
                                        {formatarBRL(item.profit)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500">
                                            <CheckCircle2 size={12} />
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