import React, { useMemo } from 'react';
import { AppState } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Funnel, FunnelChart, LabelList
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Filter, BarChart2
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
    let totalCheckoutEvents = 0; // Simulando "Checkouts" baseado em ciclos
    
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
    
    // Funnel Data Specific for Recharts
    // Estrutura Visual: Investimento (Topo) -> Faturamento (Meio) -> Lucro (Fundo)
    const funnelChartData = [
        {
            "value": totalInv + totalDespGeral,
            "name": "Investimento",
            "fill": "#3b82f6" // Blue
        },
        {
            "value": totalRet,
            "name": "Faturamento",
            "fill": "#10b981" // Emerald
        },
        {
            "value": lucroLiquido,
            "name": "Lucro Líquido",
            "fill": "#8b5cf6" // Violet
        }
    ];

    // ROI Calc
    const roi = totalInv > 0 ? ((totalRet - totalInv) / totalInv) * 100 : 0;
    const margin = totalRet > 0 ? (lucroLiquido / totalRet) * 100 : 0;

    return {
        totalInv: totalInv + totalDespGeral,
        totalRet,
        lucroLiquido,
        chartData: chartData.slice(-14), // Last 14 days for cleaner chart
        funnelChartData,
        roi,
        margin,
        totalCheckoutEvents
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#111827] border border-gray-700 p-3 rounded-lg shadow-xl">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-4 text-xs font-mono mb-1">
                <span style={{color: entry.color}} className="font-bold">{entry.name}</span>
                <span className="text-white ml-auto">{formatarBRL(entry.value)}</span>
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
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Visão Geral</h1>
            <p className="text-gray-500 text-sm font-medium mt-1 flex items-center gap-2">
                <Activity size={14} className="text-blue-500" />
                Performance em Tempo Real
            </p>
          </div>
          <div className="flex items-center gap-3">
              <div className="bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">ROI Médio</span>
                  <span className={`text-lg font-bold font-mono ${metrics.roi >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {metrics.roi.toFixed(1)}%
                  </span>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 flex flex-col items-end">
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Margem Líq.</span>
                  <span className={`text-lg font-bold font-mono ${metrics.margin >= 20 ? 'text-blue-500' : 'text-gray-300'}`}>
                      {metrics.margin.toFixed(1)}%
                  </span>
              </div>
          </div>
        </div>

        {/* --- KPI CARDS (STYLE: ADS MANAGER) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Faturamento (Green Accent) */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
                    <div className="bg-emerald-500/10 p-1.5 rounded text-emerald-500"><TrendingUp size={16}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono">{formatarBRL(metrics.totalRet)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-500">
                        <ArrowUpRight size={12} />
                        <span>Receita Bruta</span>
                    </div>
                </div>
            </div>

             {/* Card 2: Lucro Líquido (Blue Accent) */}
             <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Lucro Líquido</span>
                    <div className="bg-blue-500/10 p-1.5 rounded text-blue-500"><Zap size={16}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono">{formatarBRL(metrics.lucroLiquido)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-blue-500">
                        <ArrowUpRight size={12} />
                        <span>Caixa Real</span>
                    </div>
                </div>
            </div>

            {/* Card 3: Investimento (Red Accent) */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Investimento</span>
                    <div className="bg-rose-500/10 p-1.5 rounded text-rose-500"><ArrowDownRight size={16}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono">{formatarBRL(metrics.totalInv)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-rose-500">
                        <span>Custo Total</span>
                    </div>
                </div>
            </div>

             {/* Card 4: Eventos (Purple Accent) */}
             <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ciclos Realizados</span>
                    <div className="bg-purple-500/10 p-1.5 rounded text-purple-500"><BarChart2 size={16}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono">{metrics.totalCheckoutEvents}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-purple-500">
                        <span>Checkouts</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN SECTION (CHART & FUNNEL) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* LEFT: FUNNEL CHART (Imitando o visual "Traffic Funnel" da imagem) */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Filter size={16} className="text-blue-500" /> Funil de Tráfego
                    </h3>
                </div>
                <div className="flex-1 w-full min-h-[300px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Funnel
                                dataKey="value"
                                data={metrics.funnelChartData}
                                isAnimationActive
                            >
                                <LabelList position="right" fill="#fff" stroke="none" dataKey="name" fontSize={10} fontWeight="bold" />
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                    {/* Overlay Values Styled like the image */}
                    <div className="absolute top-4 left-4 space-y-8 pointer-events-none">
                         <div className="text-xs">
                             <p className="text-blue-400 font-bold mb-1">Views (Invest)</p>
                             <p className="text-white font-mono font-bold text-lg">{formatarBRL(metrics.totalInv)}</p>
                         </div>
                         <div className="text-xs pt-4">
                             <p className="text-emerald-400 font-bold mb-1">Clicks (Fat)</p>
                             <p className="text-white font-mono font-bold text-lg">{formatarBRL(metrics.totalRet)}</p>
                         </div>
                         <div className="text-xs pt-4">
                             <p className="text-purple-400 font-bold mb-1">Sales (Lucro)</p>
                             <p className="text-white font-mono font-bold text-lg">{formatarBRL(metrics.lucroLiquido)}</p>
                         </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: MAIN LINE CHART (Neon Lines) */}
            <div className="xl:col-span-2 bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col">
                <div className="mb-6 flex items-center justify-between">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} className="text-emerald-500" /> Evolução Financeira
                    </h3>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Faturamento
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Lucro
                        </span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#4b5563" 
                                tick={{fill: '#6b7280', fontSize: 10, fontFamily: 'monospace'}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10} 
                            />
                            <YAxis 
                                stroke="#4b5563" 
                                tick={{fill: '#6b7280', fontSize: 10, fontFamily: 'monospace'}} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1 }} />
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

        {/* --- BOTTOM TABLES --- */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden">
             <div className="p-4 border-b border-gray-800 bg-[#111827]">
                 <h3 className="text-white font-bold text-sm uppercase">Detalhamento Recente</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-400">
                     <thead className="text-xs text-gray-500 uppercase bg-[#0a0a0a]">
                         <tr>
                             <th className="px-6 py-3 font-bold">Data</th>
                             <th className="px-6 py-3 font-bold">Status</th>
                             <th className="px-6 py-3 font-bold text-right">Investimento</th>
                             <th className="px-6 py-3 font-bold text-right">Faturamento</th>
                             <th className="px-6 py-3 font-bold text-right">Lucro</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800">
                         {metrics.chartData.slice().reverse().slice(0, 5).map((row, idx) => (
                             <tr key={idx} className="hover:bg-white/[0.02]">
                                 <td className="px-6 py-4 font-mono">{row.date}</td>
                                 <td className="px-6 py-4">
                                     <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded text-[10px] font-bold border border-emerald-500/20">ATIVO</span>
                                 </td>
                                 <td className="px-6 py-4 text-right font-mono">{formatarBRL(row.investimento)}</td>
                                 <td className="px-6 py-4 text-right font-mono text-gray-200">{formatarBRL(row.faturamento)}</td>
                                 <td className={`px-6 py-4 text-right font-mono font-bold ${row.lucro >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                     {formatarBRL(row.lucro)}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
        </div>
    </div>
  );
};

export default Dashboard;