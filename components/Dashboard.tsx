import React, { useMemo } from 'react';
import { AppState } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Funnel, FunnelChart, LabelList, Cell
} from 'recharts';
import { 
  TrendingUp, Activity, Zap, ArrowUpRight, ArrowDownRight,
  Filter, BarChart2, DollarSign
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
    
    // Dados do Funil Otimizados para Leitura
    // Cores mais sólidas para contraste com texto branco
    const funnelChartData = [
        {
            "value": totalInv + totalDespGeral,
            "name": "Investimento",
            "fill": "#2563eb", // Azul Royal (Mais legível que o padrão)
            "labelColor": "#fff"
        },
        {
            "value": totalRet,
            "name": "Faturamento",
            "fill": "#059669", // Esmeralda Escuro
            "labelColor": "#fff"
        },
        {
            "value": lucroLiquido,
            "name": "Lucro Líquido",
            "fill": "#7c3aed", // Violeta Escuro
            "labelColor": "#fff"
        }
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
        <div className="bg-[#111827] border border-gray-700 p-4 rounded-xl shadow-2xl z-50">
          <p className="text-gray-400 text-[10px] font-bold uppercase mb-3 border-b border-gray-700 pb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-4 text-xs font-mono mb-2 last:mb-0">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></div>
                    <span className="font-bold text-gray-300">{entry.name}</span>
                </div>
                <span className="text-white ml-auto font-bold text-sm">{formatarBRL(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Renderizador customizado para os rótulos do funil
  const FunnelLabel = (props: any) => {
    const { x, y, width, height, name, value, fill } = props;
    // Centraliza o texto
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return (
      <g>
        <text 
            x={centerX} 
            y={centerY - 8} 
            fill="#fff" 
            textAnchor="middle" 
            dominantBaseline="middle"
            className="text-sm font-bold shadow-black drop-shadow-md"
            style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}
        >
          {name}
        </text>
        <text 
            x={centerX} 
            y={centerY + 12} 
            fill="#fff" 
            textAnchor="middle" 
            dominantBaseline="middle"
            className="text-lg font-black font-mono"
            style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}
        >
          {formatarBRL(value)}
        </text>
      </g>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Visão Geral</h1>
            <p className="text-gray-400 text-sm font-medium mt-1 flex items-center gap-2">
                <Activity size={14} className="text-blue-500" />
                Performance em Tempo Real
            </p>
          </div>
          <div className="flex items-center gap-3">
              <div className="bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 flex flex-col items-end shadow-lg">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">ROI Médio</span>
                  <span className={`text-lg font-bold font-mono ${metrics.roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {metrics.roi.toFixed(1)}%
                  </span>
              </div>
              <div className="bg-[#111827] border border-gray-800 rounded-lg px-4 py-2 flex flex-col items-end shadow-lg">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Margem Líq.</span>
                  <span className={`text-lg font-bold font-mono ${metrics.margin >= 20 ? 'text-blue-400' : 'text-gray-300'}`}>
                      {metrics.margin.toFixed(1)}%
                  </span>
              </div>
          </div>
        </div>

        {/* --- KPI CARDS (LEITURA MELHORADA) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Faturamento */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/50 transition-colors shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Faturamento Total</span>
                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500 border border-emerald-500/20"><TrendingUp size={18}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono drop-shadow-lg">{formatarBRL(metrics.totalRet)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-emerald-500 bg-emerald-500/5 px-2 py-1 rounded w-fit border border-emerald-500/10">
                        <ArrowUpRight size={12} />
                        <span>Receita Bruta</span>
                    </div>
                </div>
            </div>

             {/* Card 2: Lucro Líquido */}
             <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-blue-500/50 transition-colors shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Lucro Líquido</span>
                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 border border-blue-500/20"><Zap size={18}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono drop-shadow-lg">{formatarBRL(metrics.lucroLiquido)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-blue-500 bg-blue-500/5 px-2 py-1 rounded w-fit border border-blue-500/10">
                        <ArrowUpRight size={12} />
                        <span>Caixa Real</span>
                    </div>
                </div>
            </div>

            {/* Card 3: Investimento */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-rose-500/50 transition-colors shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Investimento</span>
                    <div className="bg-rose-500/10 p-2 rounded-lg text-rose-500 border border-rose-500/20"><ArrowDownRight size={18}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono drop-shadow-lg">{formatarBRL(metrics.totalInv)}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-rose-500 bg-rose-500/5 px-2 py-1 rounded w-fit border border-rose-500/10">
                        <span>Custo Total</span>
                    </div>
                </div>
            </div>

             {/* Card 4: Eventos */}
             <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition-colors shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Ciclos Realizados</span>
                    <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500 border border-purple-500/20"><BarChart2 size={18}/></div>
                </div>
                <div className="relative z-10">
                    <h3 className="text-3xl font-black text-white tracking-tight font-mono drop-shadow-lg">{metrics.totalCheckoutEvents}</h3>
                    <div className="flex items-center gap-1 mt-2 text-xs font-bold text-purple-500 bg-purple-500/5 px-2 py-1 rounded w-fit border border-purple-500/10">
                        <span>Checkouts</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN SECTION (CHART & FUNNEL) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* LEFT: FUNNEL CHART - LEGIBILIDADE MELHORADA */}
            <div className="bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col shadow-xl">
                <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Filter size={16} className="text-blue-500" /> Funil de Tráfego
                    </h3>
                </div>
                <div className="flex-1 w-full min-h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <FunnelChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Funnel
                                dataKey="value"
                                data={metrics.funnelChartData}
                                isAnimationActive
                            >
                                {/* Usando renderizador customizado para garantir contraste */}
                                <LabelList position="center" content={<FunnelLabel />} />
                                {metrics.funnelChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} stroke="#000" strokeWidth={1} />
                                ))}
                            </Funnel>
                        </FunnelChart>
                    </ResponsiveContainer>
                </div>
                {/* Legenda Externa para garantir leitura */}
                <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="bg-blue-900/20 p-2 rounded border border-blue-500/30">
                         <span className="block text-[10px] text-gray-400 uppercase font-bold">Invest.</span>
                         <span className="text-blue-400 font-mono text-xs font-bold">{formatarBRL(metrics.totalInv)}</span>
                    </div>
                    <div className="bg-emerald-900/20 p-2 rounded border border-emerald-500/30">
                         <span className="block text-[10px] text-gray-400 uppercase font-bold">Faturam.</span>
                         <span className="text-emerald-400 font-mono text-xs font-bold">{formatarBRL(metrics.totalRet)}</span>
                    </div>
                    <div className="bg-violet-900/20 p-2 rounded border border-violet-500/30">
                         <span className="block text-[10px] text-gray-400 uppercase font-bold">Lucro</span>
                         <span className="text-violet-400 font-mono text-xs font-bold">{formatarBRL(metrics.lucroLiquido)}</span>
                    </div>
                </div>
            </div>

            {/* RIGHT: MAIN LINE CHART */}
            <div className="xl:col-span-2 bg-[#0f111a] border border-gray-800 rounded-xl p-6 flex flex-col shadow-xl">
                <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} className="text-emerald-500" /> Evolução Financeira
                    </h3>
                    <div className="flex gap-4">
                        <span className="flex items-center gap-2 text-xs text-gray-300 font-bold bg-black/30 px-3 py-1 rounded-full border border-gray-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div> Faturamento
                        </span>
                        <span className="flex items-center gap-2 text-xs text-gray-300 font-bold bg-black/30 px-3 py-1 rounded-full border border-gray-700">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div> Lucro
                        </span>
                    </div>
                </div>
                <div className="flex-1 w-full min-h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#4b5563" 
                                tick={{fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold'}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={10} 
                            />
                            <YAxis 
                                stroke="#4b5563" 
                                tick={{fill: '#9ca3af', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold'}} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151', strokeWidth: 1 }} />
                            <Area 
                                type="monotone" 
                                dataKey="faturamento" 
                                stroke="#10b981" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorFaturamento)" 
                                activeDot={{r: 6, fill: '#fff', strokeWidth: 0}}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="lucro" 
                                stroke="#3b82f6" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorLucro)" 
                                activeDot={{r: 6, fill: '#fff', strokeWidth: 0}}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* --- BOTTOM TABLES --- */}
        <div className="bg-[#0f111a] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
             <div className="p-4 border-b border-gray-800 bg-[#111827] flex items-center justify-between">
                 <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2">
                    <DollarSign size={16} className="text-gray-400" /> Detalhamento Recente
                 </h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left text-gray-300">
                     <thead className="text-xs text-gray-400 uppercase bg-[#0a0a0a]">
                         <tr>
                             <th className="px-6 py-4 font-bold">Data</th>
                             <th className="px-6 py-4 font-bold">Status</th>
                             <th className="px-6 py-4 font-bold text-right">Investimento</th>
                             <th className="px-6 py-4 font-bold text-right">Faturamento</th>
                             <th className="px-6 py-4 font-bold text-right">Lucro</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-800">
                         {metrics.chartData.slice().reverse().slice(0, 5).map((row, idx) => (
                             <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                 <td className="px-6 py-4 font-mono">{row.date}</td>
                                 <td className="px-6 py-4">
                                     <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-bold border border-emerald-500/20">ATIVO</span>
                                 </td>
                                 <td className="px-6 py-4 text-right font-mono text-gray-400">{formatarBRL(row.investimento)}</td>
                                 <td className="px-6 py-4 text-right font-mono text-white font-medium">{formatarBRL(row.faturamento)}</td>
                                 <td className={`px-6 py-4 text-right font-mono font-black ${row.lucro >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
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