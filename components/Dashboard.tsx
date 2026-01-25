import React, { useMemo } from 'react';
import { AppState } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, Wallet, Activity, Zap, Layers, PieChart as PieIcon,
  BarChart3
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
        <div className="bg-[#030014]/95 border border-white/10 p-3 rounded-lg shadow-2xl backdrop-blur-xl">
          <p className="text-gray-400 text-[10px] font-bold font-mono uppercase mb-2">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-3 text-xs font-mono mb-1">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor: entry.stroke || entry.fill}}></div>
                <span className="text-gray-300">{entry.name}:</span>
                <span className="font-bold text-white ml-auto">{formatarBRL(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Data formatada estilo "DOM., 25 DE JAN."
  const dateStr = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
    .toUpperCase().replace('.', '');

  return (
    <div className="space-y-8 animate-fade-in pb-10">
        
        {/* --- HEADER V2.0 --- */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black text-white tracking-tighter">CPA PRO</h1>
              <span className="px-2 py-1 rounded-md bg-[#7000FF]/20 border border-[#7000FF]/50 text-[#7000FF] font-bold text-xs">V2.0</span>
            </div>
            <p className="text-gray-500 text-xs font-bold tracking-widest mt-1">MONITORAMENTO DE PERFORMANCE EM TEMPO REAL</p>
          </div>

          <div className="flex items-center gap-4 bg-[#0F0821] border border-white/5 rounded-lg p-2 px-4 shadow-lg">
            <div className="flex items-center gap-2 border-r border-white/10 pr-4">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
               <span className="text-emerald-500 font-bold text-xs tracking-wider">LIVE_FEED</span>
            </div>
            <span className="text-gray-300 font-bold text-xs uppercase">{dateStr}</span>
          </div>
        </div>

        <div className="w-full h-px bg-white/5 mb-6"></div>

        {/* --- METRICS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
           
           {/* Card 1: Lucro */}
           <div className="bg-[#030014] border border-[#00F0FF]/30 rounded-2xl p-6 relative overflow-hidden group hover:border-[#00F0FF]/50 transition-all">
              <div className="absolute top-0 right-0 p-20 bg-[#00F0FF]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#00F0FF]/10 transition-all"></div>
              <div className="relative z-10 flex justify-between items-center h-full">
                 <div className="flex flex-col justify-between h-24">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">LUCRO LÍQUIDO</p>
                    <h3 className="text-4xl font-black text-white tracking-tight">{formatarBRL(metrics.lucroLiquido)}</h3>
                    <p className="text-gray-500 text-[10px] font-bold flex items-center gap-2">
                       <div className={`w-1.5 h-1.5 rounded-full ${metrics.lucroLiquido >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                       BRUTO (APROX): {formatarBRL(metrics.totalRet - metrics.totalInv)}
                    </p>
                 </div>
                 <div className="h-14 w-14 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center justify-center">
                    <Zap size={28} className="text-[#00F0FF]" />
                 </div>
              </div>
           </div>

           {/* Card 2: Faturamento */}
           <div className="bg-[#030014] border border-[#7000FF]/30 rounded-2xl p-6 relative overflow-hidden group hover:border-[#7000FF]/50 transition-all">
              <div className="absolute top-0 right-0 p-20 bg-[#7000FF]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#7000FF]/10 transition-all"></div>
              <div className="relative z-10 flex justify-between items-center h-full">
                 <div className="flex flex-col justify-between h-24">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">FATURAMENTO</p>
                    <h3 className="text-4xl font-black text-white tracking-tight">{formatarBRL(metrics.totalRet)}</h3>
                    <p className="text-gray-500 text-[10px] font-bold flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                       VOLUME TOTAL
                    </p>
                 </div>
                 <div className="h-14 w-14 rounded-2xl bg-[#7000FF]/10 border border-[#7000FF]/30 shadow-[0_0_15px_rgba(112,0,255,0.2)] flex items-center justify-center">
                    <TrendingUp size={28} className="text-[#7000FF]" />
                 </div>
              </div>
           </div>

           {/* Card 3: Investimento */}
           <div className="bg-[#030014] border border-[#FF007A]/30 rounded-2xl p-6 relative overflow-hidden group hover:border-[#FF007A]/50 transition-all">
              <div className="absolute top-0 right-0 p-20 bg-[#FF007A]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#FF007A]/10 transition-all"></div>
              <div className="relative z-10 flex justify-between items-center h-full">
                 <div className="flex flex-col justify-between h-24">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">INVESTIMENTO</p>
                    <h3 className="text-4xl font-black text-white tracking-tight">{formatarBRL(metrics.totalInv)}</h3>
                    <p className="text-gray-500 text-[10px] font-bold flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                       OPERACIONAL + GERAL
                    </p>
                 </div>
                 <div className="h-14 w-14 rounded-2xl bg-[#FF007A]/10 border border-[#FF007A]/30 shadow-[0_0_15px_rgba(255,0,122,0.2)] flex items-center justify-center">
                    <Wallet size={28} className="text-[#FF007A]" />
                 </div>
              </div>
           </div>

           {/* Card 4: Média Diária */}
           <div className="bg-[#030014] border border-[#00F0FF]/30 rounded-2xl p-6 relative overflow-hidden group hover:border-[#00F0FF]/50 transition-all">
              <div className="absolute top-0 right-0 p-20 bg-[#00F0FF]/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-[#00F0FF]/10 transition-all"></div>
              <div className="relative z-10 flex justify-between items-center h-full">
                 <div className="flex flex-col justify-between h-24">
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-wider">MÉDIA DIÁRIA</p>
                    <h3 className="text-4xl font-black text-white tracking-tight">{formatarBRL(metrics.mediaDiaria)}</h3>
                    <p className="text-gray-500 text-[10px] font-bold flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-gray-500"></div>
                       {metrics.diasOperados} DIAS ATIVOS
                    </p>
                 </div>
                 <div className="h-14 w-14 rounded-2xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 shadow-[0_0_15px_rgba(0,240,255,0.2)] flex items-center justify-center">
                    <Activity size={28} className="text-[#00F0FF]" />
                 </div>
              </div>
           </div>
        </div>

        {/* --- CHARTS SECTION --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-auto xl:h-[450px]">
            
            {/* 1. LINHA DO TEMPO */}
            <div className="xl:col-span-7 bg-[#030014] border border-white/10 rounded-2xl p-6 flex flex-col relative group">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <Activity size={18} className="text-primary" /> Performance
                    </h3>
                </div>
                <div className="flex-1 w-full min-h-[300px]">
                    {metrics.chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradLucro" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    stroke="#334155" 
                                    tick={{fill: '#64748b', fontSize: 10, fontFamily: 'monospace'}} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    dy={10} 
                                />
                                <YAxis 
                                    stroke="#334155" 
                                    tick={{fill: '#64748b', fontSize: 10, fontFamily: 'monospace'}} 
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
                                    strokeDasharray="5 5" 
                                    fill="transparent" 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="lucro" 
                                    name="Lucro"
                                    stroke="#00F0FF" 
                                    strokeWidth={3} 
                                    fill="url(#gradLucro)" 
                                    activeDot={{r: 5, strokeWidth: 0, fill: '#fff'}}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                            <BarChart3 size={48} className="mb-2" />
                            <p className="text-xs font-mono uppercase tracking-widest">Sem dados de operação</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. FUNIL GERAL */}
            <div className="xl:col-span-3 bg-[#030014] border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden">
                <h3 className="text-white font-bold flex items-center gap-2 mb-6">
                    <Layers size={18} className="text-amber-400" /> Funil
                </h3>
                
                <div className="flex-1 flex flex-col justify-center gap-4">
                    {metrics.funnelData.every(d => d.value === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
                             <Layers size={48} className="mb-2" />
                             <p className="text-xs font-mono uppercase tracking-widest">Aguardando dados</p>
                        </div>
                    ) : (
                        metrics.funnelData.map((item, idx) => {
                            const maxVal = metrics.funnelData[0].value || 1;
                            const widthPct = idx === 0 ? 100 : (item.value / maxVal) * 100;
                            const safeWidth = Math.max(widthPct, 15); // Min width visual
                            
                            return (
                                <div key={idx} className="flex flex-col items-center group">
                                    <div 
                                        className="h-16 rounded-lg flex flex-col items-center justify-center relative transition-all duration-500 hover:brightness-110 shadow-lg"
                                        style={{ 
                                            width: `${safeWidth}%`, 
                                            backgroundColor: item.color,
                                            boxShadow: `0 4px 20px -5px ${item.color}40`
                                        }}
                                    >
                                        <span className="text-white font-black text-lg drop-shadow-md">{formatarBRL(item.value)}</span>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{item.label}</p>
                                        {idx > 0 && metrics.funnelData[idx-1].value > 0 && (
                                            <p className="text-[9px] text-gray-500 font-mono">
                                                {((item.value / metrics.funnelData[idx-1].value) * 100).toFixed(1)}% conv.
                                            </p>
                                        )}
                                    </div>
                                    {idx < metrics.funnelData.length - 1 && (
                                        <div className="h-4 w-px bg-white/10 my-1"></div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* 3. DISTRIBUIÇÃO */}
            <div className="xl:col-span-2 bg-[#030014] border border-white/10 rounded-2xl p-6 flex flex-col">
                 <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                    <PieIcon size={18} className="text-rose-400" /> Custos
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
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {metrics.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-bold text-gray-500">BREAK<br/>DOWN</span>
                            </div>
                        </>
                    ) : (
                         <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                             <PieIcon size={48} className="mb-2" />
                             <p className="text-xs font-mono uppercase tracking-widest">Sem custos</p>
                         </div>
                    )}
                </div>
                <div className="space-y-3 mt-2">
                    {metrics.pieData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: d.color}}></div>
                                <span className="text-gray-400">{d.name}</span>
                            </div>
                            <span className="font-bold text-white font-mono">{(d.value / (metrics.totalInv || 1) * 100).toFixed(0)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;