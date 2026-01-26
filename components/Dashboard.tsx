import React, { useMemo } from 'react';
import { AppState } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Funnel, FunnelChart, LabelList, Cell
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Filter, BarChart2, DollarSign, Globe, Wifi, Lock, ShieldCheck, Cpu, LayoutDashboard
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
    
    // Para o gráfico de funil
    let totalDepositos = 0;
    let totalRedepositos = 0;

    const chartData = dates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], state.config.valorBonus);
        
        totalInv += m.invest;
        totalRet += m.ret;
        totalLucro += m.lucro;
        
        const record = state.dailyRecords[date];
        if (record) {
             record.accounts.forEach(a => {
                 totalDepositos += a.deposito;
                 totalRedepositos += a.redeposito;
                 totalCheckoutEvents += a.ciclos; 
             });
        }

        return {
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            lucro: m.lucro,
            faturamento: m.ret,
            investimento: m.invest
        };
    });

    state.generalExpenses.forEach(e => totalDespGeral += e.valor);
    const lucroLiquido = totalLucro - totalDespGeral;
    
    const funnelChartData = [
        { "value": totalInv + totalDespGeral, "name": "CUSTO", "fill": "#3b82f6" },
        { "value": totalRet, "name": "RECEITA", "fill": "#10b981" },
        { "value": lucroLiquido, "name": "LUCRO", "fill": "#8b5cf6" }
    ];

    const roi = totalInv > 0 ? ((totalRet - totalInv) / totalInv) * 100 : 0;
    const margin = totalRet > 0 ? (lucroLiquido / totalRet) * 100 : 0;

    return {
        totalInv: totalInv + totalDespGeral,
        totalRet,
        lucroLiquido,
        chartData: chartData.slice(-14),
        funnelChartData,
        roi,
        margin,
        totalCheckoutEvents
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

  const FunnelLabel = (props: any) => {
    const { x, y, width, height, name, value } = props;
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    return (
      <g>
        <text x={centerX} y={centerY - 8} fill="#fff" textAnchor="middle" dominantBaseline="middle" className="text-xs font-bold uppercase tracking-wider" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.5)' }}>{name}</text>
        <text x={centerX} y={centerY + 12} fill="#fff" textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold font-mono" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.5)' }}>{formatarBRL(value)}</text>
      </g>
    );
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

        {/* --- CHARTS SECTION --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* FUNNEL */}
            <div className="gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden h-[400px]">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" /> Eficiência de Capital
                    </h3>
                </div>
                <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Funnel dataKey="value" data={metrics.funnelChartData} isAnimationActive>
                                <LabelList position="center" content={<FunnelLabel />} />
                                {metrics.funnelChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                                ))}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* MAIN CHART */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden h-[400px]">
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
        </div>
    </div>
  );
};

export default Dashboard;