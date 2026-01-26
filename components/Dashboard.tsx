import React, { useMemo } from 'react';
import { AppState } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Wallet, Activity, Zap, Layers, PieChart as PieIcon,
  BarChart3, ArrowUpRight
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
    let diasOperados = 0;
    
    // Para o gráfico de pizza (Distribuição de Custos)
    let totalDepositos = 0;
    let totalRedepositos = 0;
    let totalTaxas = 0; // Despesas operacionais (proxy/sms)

    const chartData = dates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], state.config.valorBonus);
        if(m.invest > 0 || m.ret > 0) diasOperados++;
        
        totalInv += m.invest;
        totalRet += m.ret;
        totalLucro += m.lucro;
        
        // Break down invest
        const record = state.dailyRecords[date];
        if (record) {
             record.accounts.forEach(a => {
                 totalDepositos += a.deposito;
                 totalRedepositos += a.redeposito;
             });
             totalTaxas += (record.expenses.proxy + record.expenses.numeros);
        }

        return {
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            fullDate: date,
            lucro: m.lucro,
            investimento: m.invest,
            retorno: m.ret
        };
    });

    state.generalExpenses.forEach(e => totalDespGeral += e.valor);
    const lucroLiquido = totalLucro - totalDespGeral;
    
    // Média diária baseada em dias operados
    const mediaDiaria = diasOperados > 0 ? lucroLiquido / diasOperados : 0;

    // Dados para o Funil
    const funnelData = [
        { label: 'Investimento Total', value: totalInv + totalDespGeral, color: '#FF007A' }, // Pink
        { label: 'Faturamento Bruto', value: totalRet, color: '#7000FF' }, // Purple
        { label: 'Lucro Líquido', value: lucroLiquido, color: '#00F0FF' } // Cyan
    ];

    // Dados para Pizza (Custos)
    const pieData = [
        { name: 'Depósitos', value: totalDepositos, color: '#3b82f6' }, // Blue
        { name: 'Redepósitos', value: totalRedepositos, color: '#8b5cf6' }, // Violet
        { name: 'Operacional', value: totalTaxas + totalDespGeral, color: '#ef4444' } // Red
    ].filter(i => i.value > 0);

    return {
        totalInv: totalInv + totalDespGeral,
        totalRet,
        lucroLiquido,
        diasOperados,
        mediaDiaria,
        chartData: chartData.slice(-30), // Last 30 days
        funnelData,
        pieData
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0a0516]/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-xl">
          <p className="text-gray-400 text-[10px] font-bold font-mono uppercase mb-2 border-b border-white/5 pb-1">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-4 text-xs font-mono mb-1">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{backgroundColor: entry.stroke || entry.fill, color: entry.stroke || entry.fill}}></div>
                    <span className="text-gray-300 font-bold">{entry.name}</span>
                </div>
                <span className="font-bold text-white ml-auto">{formatarBRL(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Data formatada estilo "DOM., 25 DE JAN."
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long' })
    .toUpperCase().replace('.', '');

  return (
    <div className="space-y-8 animate-fade-in pb-10">
        
        {/* --- HEADER V2.0 (UPGRADED) --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6 mb-2">
          <div className="relative">
            <div className="absolute -left-6 top-1 w-1 h-12 bg-primary rounded-full hidden md:block"></div>
            <div className="flex items-center gap-3">
              <h1 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">CPA PRO</h1>
              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-violet-500 text-white font-bold text-[10px] shadow-[0_0_10px_rgba(112,0,255,0.4)]">V2.5</span>
            </div>
            <p className="text-gray-400 text-sm font-medium mt-1 flex items-center gap-2">
                <Activity size={14} className="text-primary" />
                DASHBOARD DE ALTA PERFORMANCE
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-1 pr-4 shadow-lg backdrop-blur-md">
            <div className="bg-black/40 rounded-lg p-2 px-3 flex items-center gap-2 border border-white/5">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </div>
               <span className="text-emerald-400 font-bold text-[10px] tracking-widest uppercase">Sistema Online</span>
            </div>
            <span className="text-gray-300 font-bold text-xs uppercase font-mono">{dateStr}</span>
          </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>

        {/* --- METRICS ROW (GLASS EFFECT ENHANCED) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
           
           {/* Card 1: Lucro */}
           <div className="gateway-card rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-24 bg-[#00F0FF]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#00F0FF]/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#00F0FF]/10 rounded-xl border border-[#00F0FF]/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                        <Zap size={24} className="text-[#00F0FF]" />
                    </div>
                    {metrics.lucroLiquido > 0 && (
                        <div className="flex items-center gap-1 text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-0.5 rounded text-[10px] font-bold border border-[#00F0FF]/20">
                            <ArrowUpRight size={10} /> ROI+
                        </div>
                    )}
                 </div>
                 
                 <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{formatarBRL(metrics.lucroLiquido)}</h3>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mt-1">Lucro Líquido</p>
                 </div>
              </div>
           </div>

           {/* Card 2: Faturamento */}
           <div className="gateway-card rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-24 bg-[#7000FF]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#7000FF]/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#7000FF]/10 rounded-xl border border-[#7000FF]/20 shadow-[0_0_15px_rgba(112,0,255,0.1)]">
                        <TrendingUp size={24} className="text-[#7000FF]" />
                    </div>
                 </div>
                 
                 <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{formatarBRL(metrics.totalRet)}</h3>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mt-1">Faturamento Bruto</p>
                 </div>
              </div>
           </div>

           {/* Card 3: Investimento */}
           <div className="gateway-card rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-24 bg-[#FF007A]/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-[#FF007A]/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#FF007A]/10 rounded-xl border border-[#FF007A]/20 shadow-[0_0_15px_rgba(255,0,122,0.1)]">
                        <Wallet size={24} className="text-[#FF007A]" />
                    </div>
                 </div>
                 
                 <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{formatarBRL(metrics.totalInv)}</h3>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mt-1">Investimento Total</p>
                 </div>
              </div>
           </div>

           {/* Card 4: Média Diária */}
           <div className="gateway-card rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-24 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700"></div>
              
              <div className="relative z-10 flex flex-col justify-between h-full gap-4">
                 <div className="flex justify-between items-start">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <Activity size={24} className="text-emerald-500" />
                    </div>
                    <span className="text-emerald-500 font-bold text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{metrics.diasOperados} Dias</span>
                 </div>
                 
                 <div>
                    <h3 className="text-3xl font-black text-white tracking-tight">{formatarBRL(metrics.mediaDiaria)}</h3>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider mt-1">Média / Dia Operado</p>
                 </div>
              </div>
           </div>
        </div>

        {/* --- CHARTS SECTION --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-auto xl:h-[450px]">
            
            {/* 1. LINHA DO TEMPO */}
            <div className="xl:col-span-7 gateway-card rounded-2xl p-6 flex flex-col relative group">
                <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-white font-bold flex items-center gap-2 text-lg">
                        <div className="w-1 h-6 bg-primary rounded-full"></div> Performance
                    </h3>
                </div>
                <div className="flex-1 w-full min-h-[300px]">
                    {metrics.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="gradRet" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#7000FF" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#7000FF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#475569" 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10} 
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    tick={{fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area 
                                    type="monotone" 
                                    dataKey="retorno" 
                                    name="Faturamento"
                                    stroke="#7000FF" 
                                    strokeWidth={2}
                                    fill="url(#gradRet)"
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="lucro" 
                                    name="Lucro"
                                    stroke="#00F0FF" 
                                    strokeWidth={3} 
                                    fill="url(#gradLucro)" 
                                    activeDot={{r: 6, strokeWidth: 0, fill: '#fff'}}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-30">
                            <BarChart3 size={64} className="mb-4" />
                            <p className="text-sm font-mono uppercase tracking-widest font-bold">Sem dados de operação</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. FUNIL GERAL */}
            <div className="xl:col-span-3 gateway-card rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <h3 className="text-white font-bold flex items-center gap-2 mb-6 border-b border-white/5 pb-4">
                    <Layers size={18} className="text-white/50" /> Conversão
                </h3>
                
                <div className="flex-1 flex flex-col justify-center gap-6">
                    {metrics.funnelData.every(d => d.value === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-30">
                             <Layers size={64} className="mb-4" />
                             <p className="text-sm font-mono uppercase tracking-widest font-bold">Aguardando dados</p>
                        </div>
                    ) : (
                        metrics.funnelData.map((item, idx) => {
                            const maxVal = metrics.funnelData[0].value || 1;
                            const widthPct = idx === 0 ? 100 : (item.value / maxVal) * 100;
                            const safeWidth = Math.max(widthPct, 20); // Min width visual
                            
                            return (
                                <div key={idx} className="flex flex-col items-center group relative">
                                    <div 
                                        className="h-20 rounded-xl flex flex-col items-center justify-center relative transition-all duration-500 hover:brightness-110 shadow-lg border border-white/10"
                                        style={{ 
                                            width: `${safeWidth}%`, 
                                            background: `linear-gradient(180deg, ${item.color}cc 0%, ${item.color}66 100%)`,
                                            boxShadow: `0 8px 30px -10px ${item.color}66`
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                                        <span className="text-white font-black text-lg drop-shadow-md">{formatarBRL(item.value)}</span>
                                    </div>
                                    <div className="mt-2 text-center relative z-10">
                                        <p className="text-[10px] text-gray-300 uppercase font-bold tracking-widest">{item.label}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 3. DISTRIBUIÇÃO */}
            <div className="xl:col-span-2 gateway-card rounded-2xl p-6 flex flex-col">
                 <h3 className="text-white font-bold flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                    <PieIcon size={18} className="text-white/50" /> Breakdown
                </h3>
                <div className="flex-1 min-h-[200px] relative">
                    {metrics.pieData.length > 0 ? (
                        <>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={65}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {metrics.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-60">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CUSTOS</span>
                            </div>
                        </>
                    ) : (
                         <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-30">
                             <PieIcon size={48} className="mb-4" />
                             <p className="text-sm font-mono uppercase tracking-widest font-bold">Sem custos</p>
                         </div>
                    )}
                </div>
                <div className="space-y-3 mt-4">
                    {metrics.pieData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded-lg border border-white/5">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shadow-[0_0_5px_currentColor]" style={{backgroundColor: d.color, color: d.color}}></div>
                                <span className="text-gray-300 font-bold">{d.name}</span>
                            </div>
                            <span className="font-mono text-white font-bold">{(d.value / (metrics.totalInv || 1) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;