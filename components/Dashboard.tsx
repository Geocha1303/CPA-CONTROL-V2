import React, { useMemo } from 'react';
import { AppState, DayRecord } from '../types';
import { calculateDayMetrics, formatarBRL, getHojeISO } from '../utils';
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Area
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowDownRight,
  Filter, PieChart as PieIcon, History, CheckCircle2, ArrowUpRight,
  MoreHorizontal, Wallet, CalendarOff
} from 'lucide-react';

interface Props {
  state: AppState;
}

const Dashboard: React.FC<Props> = ({ state }) => {
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
    
    const safeBonus = (state.config && typeof state.config.valorBonus === 'number') ? state.config.valorBonus : 20;

    // --- PREPARAÇÃO DOS DADOS DO GRÁFICO ---
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
    // Se o dia não tem atividade (faturamento 0 e investimento 0), removemos do gráfico
    // para evitar que a linha caia para zero, prejudicando a estética.
    // Mantemos "hoje" mesmo se for zero, para o usuário saber que o dia atual está lá.
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
                const ret = (acc.saque || 0) + ((acc.ciclos || 0) * safeBonus);
                const profit = ret - invest;
                allAccounts.push({ ...acc, date, profit, ret });
            });
        }
    });
    const recentActivity = allAccounts.sort((a, b) => b.id - a.id).slice(0, 8);

    return {
        totalInv: totalInvestimentoReal,
        totalRet,
        lucroLiquido,
        chartData: cleanChartData, // Usamos os dados filtrados aqui
        pieData: pieDisplayData,
        roi: isNaN(roi) ? 0 : roi,
        margin: isNaN(margin) ? 0 : margin,
        totalCheckoutEvents,
        recentActivity
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  // Tooltip customizado com efeito "Glass"
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#050510]/80 border border-white/10 p-4 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-3 tracking-widest border-b border-white/5 pb-2">
            {label}
          </p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-8 text-sm mb-2 last:mb-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke || entry.fill, boxShadow: `0 0 8px ${entry.stroke || entry.fill}` }}></div>
                    <span className="text-gray-300 font-medium capitalize text-xs">
                        {entry.dataKey === 'faturamento' ? 'Faturamento' : 'Lucro Líq.'}
                    </span>
                </div>
                <span className="text-white font-bold font-mono text-sm">{formatarBRL(entry.value)}</span>
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
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
               Dashboard
            </h1>
            <p className="text-gray-400 text-xs font-medium mt-1 pl-1">
                Visão consolidada de performance.
            </p>
          </div>
          
          <div className="flex gap-2">
               <div className="px-5 py-2.5 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-xl text-right">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">ROI Total</p>
                   <p className={`text-xl font-black font-mono leading-none ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                       {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(0)}%
                   </p>
               </div>
               <div className="px-5 py-2.5 bg-gradient-to-br from-white/5 to-transparent border border-white/5 rounded-xl text-right">
                   <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">Margem Líq.</p>
                   <p className="text-xl font-black text-blue-400 font-mono leading-none">{metrics.margin.toFixed(0)}%</p>
               </div>
          </div>
        </div>

        {/* --- KPI SUMMARY CARDS (Compact & Sexy) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CARD 1: LUCRO */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <Zap size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resultado Líquido</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight text-glow">
                        {formatarBRL(metrics.lucroLiquido)}
                    </div>
                </div>
            </div>

            {/* CARD 2: FATURAMENTO */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-indigo-500/10 hover:border-indigo-500/30 transition-colors">
                <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                            <Activity size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Volume (Fat.)</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight">
                        {formatarBRL(metrics.totalRet)}
                    </div>
                </div>
            </div>

            {/* CARD 3: CUSTOS */}
            <div className="gateway-card p-6 rounded-2xl relative overflow-hidden group border-rose-500/10 hover:border-rose-500/30 transition-colors">
                <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                            <Filter size={20} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Saídas Totais</span>
                    </div>
                    <div className="text-4xl font-black text-white font-mono tracking-tight">
                        {formatarBRL(metrics.totalInv)}
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN DASHBOARD GRID --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-full">
            
            {/* 1. EXECUTIVE CHART (Takes 2/3 Width) */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden min-h-[450px] border border-white/5 bg-[#03000a]">
                <div className="flex items-center justify-between mb-8">
                     <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                             Evolução Diária
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-0.5 flex items-center gap-1">
                            {metrics.chartData.length < 2 && <CalendarOff size={10} />}
                            {metrics.chartData.length < 2 ? 'Dados insuficientes para tendência' : 'Dias sem atividade foram ocultados'}
                        </p>
                     </div>
                     
                     {/* Custom Legend */}
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
                </div>
                
                <div className="flex-1 w-full h-full min-h-[350px]">
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
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="none" 
                                tick={{fill: '#10b981', fontSize: 10, fontWeight: 600, opacity: 0.5}} 
                                tickFormatter={(val) => `R$${val/1000}k`}
                                width={40}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                            
                            {/* BARS: Revenue (Volume) */}
                            <Bar 
                                yAxisId="left"
                                dataKey="faturamento" 
                                fill="url(#barGradient)" 
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                                animationDuration={1500}
                            />

                            {/* LINE: Profit (Trend) */}
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
                </div>
            </div>

            {/* 2. SIDEBAR WIDGETS */}
            <div className="flex flex-col gap-6 h-full">
                
                {/* DONUT CHART */}
                <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col flex-1 min-h-[250px]">
                    <div className="flex items-center justify-between mb-4">
                         <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                             <PieIcon size={14} className="text-gray-400" /> Distribuição
                         </h3>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={metrics.pieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
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
                                    contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#333', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                                    formatter={(value: number) => formatarBRL(value)}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36} 
                                    iconType="circle"
                                    iconSize={6}
                                    wrapperStyle={{fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase'}}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-8">
                             <span className="text-xl font-bold text-white">{formatarBRL(metrics.totalInv)}</span>
                             <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">Saídas</span>
                        </div>
                    </div>
                </div>

                {/* MINI FUNNEL */}
                 <div className="gateway-card rounded-2xl p-6 border border-white/5 flex flex-col justify-center flex-1">
                     <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                         <Filter size={14} className="text-gray-400" /> Conversão
                     </h3>
                     
                     <div className="space-y-4">
                         <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                                 <span>Entrada</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                 <div className="h-full bg-gray-600 rounded-full w-full opacity-30"></div>
                             </div>
                         </div>
                         
                         <div className="flex justify-center -my-2">
                             <ArrowDownRight size={14} className="text-gray-700" />
                         </div>

                         <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                                 <span>Retorno</span>
                                 <span className="text-indigo-400">{(metrics.totalRet / (metrics.totalInv || 1)).toFixed(1)}x</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                 <div className="h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{width: '100%'}}></div>
                             </div>
                         </div>

                          <div className="flex justify-center -my-2">
                             <ArrowDownRight size={14} className="text-gray-700" />
                         </div>

                          <div>
                             <div className="flex justify-between text-[10px] font-bold uppercase text-gray-500 mb-1">
                                 <span>Lucro</span>
                                 <span className="text-emerald-400">{metrics.margin.toFixed(0)}%</span>
                             </div>
                             <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                 <div 
                                    className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                    style={{width: `${Math.min(metrics.margin, 100)}%`}}
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
                                        {formatarBRL(item.profit)}
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