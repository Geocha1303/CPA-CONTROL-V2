import React, { useMemo } from 'react';
import { AppState } from '../types';
import { calculateDayMetrics, formatarBRL } from '../utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, AlertTriangle, ArrowUpRight, Wallet, Receipt, CalendarCheck, Zap } from 'lucide-react';

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
    let melhorDia = { val: -Infinity, date: '-' };
    let piorDia = { val: Infinity, date: '-' };

    const chartData = dates.map(date => {
        const m = calculateDayMetrics(state.dailyRecords[date], state.config.valorBonus);
        if(m.invest > 0 || m.ret > 0) diasOperados++;
        
        totalInv += m.invest;
        totalRet += m.ret;
        totalLucro += m.lucro;

        if (m.lucro > melhorDia.val) melhorDia = { val: m.lucro, date };
        if (m.lucro < piorDia.val) piorDia = { val: m.lucro, date };

        return {
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            fullDate: date,
            lucro: m.lucro,
            investimento: m.invest,
            retorno: m.ret
        };
    });

    if (dates.length === 0) {
        melhorDia = { val: 0, date: '-' };
        piorDia = { val: 0, date: '-' };
    }

    state.generalExpenses.forEach(e => totalDespGeral += e.valor);
    const lucroLiquido = totalLucro - totalDespGeral;
    const imposto = lucroLiquido > 0 ? lucroLiquido * state.config.taxaImposto : 0;

    return {
        totalInv, totalRet, totalLucro, totalDespGeral, diasOperados, melhorDia, piorDia, lucroLiquido, imposto,
        chartData: chartData.slice(-14)
    };
  }, [state.dailyRecords, state.generalExpenses, state.config]);

  const KPICard = ({ title, value, sub, icon: Icon, color }: any) => {
    // Gateway Colors
    const styles: any = {
      purple: {
        border: 'border-primary/30',
        bg: 'bg-primary/5',
        iconBg: 'bg-primary/20',
        iconColor: 'text-primary-glow',
        glow: 'shadow-[0_0_20px_rgba(112,0,255,0.15)]'
      },
      cyan: {
        border: 'border-accent-cyan/30',
        bg: 'bg-accent-cyan/5',
        iconBg: 'bg-accent-cyan/20',
        iconColor: 'text-accent-cyan',
        glow: 'shadow-[0_0_20px_rgba(0,240,255,0.15)]'
      },
      pink: {
        border: 'border-accent-pink/30',
        bg: 'bg-accent-pink/5',
        iconBg: 'bg-accent-pink/20',
        iconColor: 'text-accent-pink',
        glow: 'shadow-[0_0_20px_rgba(255,0,122,0.15)]'
      },
    };
    
    const s = styles[color] || styles.purple;

    return (
        <div className={`gateway-card p-6 rounded-xl relative overflow-hidden group border ${s.border} ${s.bg} hover:shadow-[0_0_30px_rgba(112,0,255,0.2)] transition-all duration-500`}>
            {/* Holographic Line */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50"></div>
            
            <div className="flex items-start justify-between mb-4">
                <div>
                    <span className="text-xs font-bold font-mono uppercase text-gray-400 tracking-wider block mb-1">{title}</span>
                    <h3 className="text-3xl font-black text-white tracking-tight text-glow">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${s.iconBg} border border-white/5 ${s.iconColor} shadow-[0_0_10px_currentColor] opacity-80 group-hover:opacity-100 transition-opacity`}>
                    <Icon size={20} />
                </div>
            </div>
            
            {sub && (
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500 font-mono">
                    <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                    {sub}
                </div>
            )}
        </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#030014]/90 border border-primary/30 p-4 rounded-lg shadow-[0_0_20px_rgba(112,0,255,0.3)] backdrop-blur-xl">
          <p className="text-primary-glow text-xs font-bold font-mono uppercase mb-3 pb-2 border-b border-white/10">{label}</p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-4 text-xs font-mono mb-2 last:mb-0">
                <span className="text-gray-400 uppercase">{entry.name}</span>
                <span className="font-bold text-white ml-auto" style={{color: entry.color}}>{formatarBRL(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 neon-border-bottom pb-6">
            <div>
                <h2 className="text-4xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                    DASHBOARD <span className="text-primary text-lg font-mono px-2 py-1 bg-primary/10 rounded border border-primary/30">V2.0</span>
                </h2>
                <p className="text-gray-400 font-mono text-sm">MONITORAMENTO DE PERFORMANCE EM TEMPO REAL</p>
            </div>
            <div className="gateway-card px-4 py-2 rounded-lg flex items-center gap-3 border border-white/10">
                <div className="flex items-center gap-2">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-cyan opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-cyan"></span>
                    </span>
                    <span className="text-xs font-bold text-accent-cyan font-mono tracking-widest">LIVE_FEED</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10"></div>
                <span className="text-xs font-bold text-gray-300 uppercase font-mono">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                </span>
            </div>
        </header>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard 
                title="LUCRO LÍQUIDO" 
                value={formatarBRL(metrics.lucroLiquido - metrics.imposto)} 
                sub={`BRUTO: ${formatarBRL(metrics.lucroLiquido)}`}
                icon={Zap}
                color={metrics.lucroLiquido >= 0 ? 'cyan' : 'pink'}
            />
            <KPICard 
                title="FATURAMENTO" 
                value={formatarBRL(metrics.totalRet)} 
                sub="VOLUME TOTAL"
                icon={TrendingUp}
                color="purple"
            />
            <KPICard 
                title="INVESTIMENTO" 
                value={formatarBRL(metrics.totalInv + metrics.totalDespGeral)} 
                sub="OPERACIONAL + GERAL"
                icon={Wallet}
                color="pink"
            />
             <KPICard 
                title="MÉDIA DIÁRIA" 
                value={metrics.diasOperados > 0 ? formatarBRL(metrics.totalLucro / metrics.diasOperados) : 'R$ 0,00'} 
                sub={`${metrics.diasOperados} DIAS ATIVOS`}
                icon={Activity}
                color="cyan"
            />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Area Chart */}
            <div className="xl:col-span-2 gateway-card p-6 rounded-xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono uppercase">
                            <Activity size={16} className="text-accent-cyan" />
                            Curva de Crescimento
                        </h3>
                    </div>
                </div>
                <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metrics.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis 
                                dataKey="date" 
                                stroke="#334155" 
                                tick={{fill: '#64748b', fontSize: 10, fontFamily: 'Space Grotesk'}} 
                                axisLine={false} 
                                tickLine={false} 
                                dy={15} 
                            />
                            <YAxis 
                                stroke="#334155" 
                                tick={{fill: '#64748b', fontSize: 10, fontFamily: 'Space Grotesk'}} 
                                axisLine={false} 
                                tickLine={false} 
                                tickFormatter={(v) => `k${v/1000}`} 
                                dx={-10} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey="lucro" 
                                name="LUCRO"
                                stroke="#00F0FF" 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill="url(#colorLucro)" 
                                activeDot={{r: 4, strokeWidth: 0, fill: '#fff'}}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="xl:col-span-1 gateway-card p-6 rounded-xl flex flex-col">
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2 font-mono uppercase">
                        <Target size={16} className="text-accent-pink" />
                        Fluxo Entrada/Saída
                    </h3>
                </div>
                
                <div className="h-[350px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={metrics.chartData} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                            <Bar dataKey="retorno" name="ENTRADA" fill="#7000FF" radius={[2, 2, 0, 0]} maxBarSize={40} />
                            <Bar dataKey="investimento" name="SAÍDA" fill="#FF007A" radius={[2, 2, 0, 0]} maxBarSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="gateway-card p-5 rounded-xl flex items-center justify-between group hover:border-accent-cyan/30">
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold font-mono tracking-widest mb-1">RECORD (HIGH)</p>
                    <p className="text-white font-bold text-2xl font-mono">{formatarBRL(metrics.melhorDia.val)}</p>
                    <p className="text-accent-cyan text-xs mt-1 font-mono">{metrics.melhorDia.date}</p>
                </div>
                <div className="p-3 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                    <ArrowUpRight size={20} />
                </div>
             </div>
             
             <div className="gateway-card p-5 rounded-xl flex items-center justify-between group hover:border-accent-pink/30">
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold font-mono tracking-widest mb-1">RECORD (LOW)</p>
                    <p className="text-white font-bold text-2xl font-mono">{formatarBRL(metrics.piorDia.val)}</p>
                    <p className="text-accent-pink text-xs mt-1 font-mono">{metrics.piorDia.date}</p>
                </div>
                 <div className="p-3 rounded bg-accent-pink/10 text-accent-pink border border-accent-pink/20">
                    <TrendingDown size={20} />
                </div>
             </div>

             <div className="gateway-card p-5 rounded-xl flex items-center justify-between group hover:border-primary/30">
                <div>
                    <p className="text-gray-500 text-[10px] uppercase font-bold font-mono tracking-widest mb-1">TAXES (PROVISION)</p>
                    <p className="text-white font-bold text-2xl font-mono">{formatarBRL(metrics.imposto)}</p>
                    <p className="text-primary-glow text-xs mt-1 font-mono">{(state.config.taxaImposto * 100).toFixed(1)}% RATE</p>
                </div>
                 <div className="p-3 rounded bg-primary/10 text-primary-glow border border-primary/20">
                    <Receipt size={20} />
                </div>
             </div>
        </div>
    </div>
  );
};

export default Dashboard;