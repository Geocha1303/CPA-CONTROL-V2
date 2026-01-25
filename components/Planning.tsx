import React, { useState, useEffect, useMemo } from 'react';
import { AppState, GeneratedPlayer, HistoryItem } from '../types';
import { formatarBRL, generatePlan, getHojeISO, getManualAvoidanceValues, generateConstrainedSum, regeneratePlayerValues } from '../utils';
import { Play, RotateCw, Send, Sliders, Trash2, BrainCircuit, Target, BarChart2, User, Layers, Info, Check, AlertTriangle, ChevronRight, Settings2, Users } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  navigateToDaily: (date: string) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

type TabType = 'kpis' | 'agents' | 'lots';

const Planning: React.FC<Props> = ({ state, updateState, navigateToDaily, notify }) => {
  // Use state.generator as initial but keep local state for inputs to allow smooth typing
  const [params, setParams] = useState(state.generator.params);
  const [dist, setDist] = useState(state.generator.distribuicaoAgentes);
  const [totalAgentes, setTotalAgentes] = useState(state.generator.totalAgentes);
  const [jogadoresPorCiclo, setJogadoresPorCiclo] = useState(state.generator.jogadoresPorCiclo);
  
  // Sync local state when global state changes (e.g. File Restore)
  useEffect(() => {
    setParams(state.generator.params);
    setDist(state.generator.distribuicaoAgentes);
    setTotalAgentes(state.generator.totalAgentes);
    setJogadoresPorCiclo(state.generator.jogadoresPorCiclo);
  }, [state.generator]);

  // States
  const [activeTab, setActiveTab] = useState<TabType>('lots');
  const [manualAvoidance, setManualAvoidance] = useState('');
  const [adjustmentParams, setAdjustmentParams] = useState({
      agentId: '',
      targetAvg: 60,
      numTesters: 5
  });

  // Calculate Total Players based on Distribution
  const totalJogadoresCalculado = useMemo(() => {
    let t = 0;
    // Considera apenas os agentes ativos (1 até totalAgentes)
    for(let i=1; i<=totalAgentes; i++) {
        t += (dist[i] || 0);
    }
    return t;
  }, [dist, totalAgentes]);

  // Derived History for Avoidance
  const { avoidanceSet } = useMemo(() => {
      const counts: Record<number, number> = {};
      const history = state.generator.history || [];
      history.forEach(h => {
          counts[h.valor] = (counts[h.valor] || 0) + 1;
      });
      
      const manualSet = getManualAvoidanceValues(manualAvoidance);
      // Retorna apenas os valores que queremos evitar
      const valuesToAvoid = new Set<number>();
      Object.keys(counts).forEach(k => valuesToAvoid.add(Number(k)));
      manualSet.forEach(v => valuesToAvoid.add(v));
      
      return { avoidanceSet: valuesToAvoid };
  }, [state.generator.history, manualAvoidance]);

  // Handlers
  const handleDistChange = (agentId: number, val: number) => {
    const newDist = { ...dist, [agentId]: val };
    setDist(newDist);
    // Sync with global state immediately to prevent loss
    updateState({ generator: { ...state.generator, distribuicaoAgentes: newDist } });
  };

  const handleTotalAgentesChange = (val: number) => {
      setTotalAgentes(val);
      updateState({ generator: { ...state.generator, totalAgentes: val } });
  };

  const handleGenerate = () => {
    // Validação
    if (totalJogadoresCalculado < 1) {
        notify("Distribua pelo menos 1 jogador entre os agentes.", "error");
        return;
    }
    const sumP = params.testador + params.cetico + params.ambicioso + params.viciado;
    if (sumP !== 100) {
        notify(`A soma dos perfis deve ser 100% (Atual: ${sumP}%)`, "error");
        return;
    }

    const plan = generatePlan(
        totalJogadoresCalculado, 
        totalAgentes, 
        dist, 
        params, 
        state.generator.history || [], 
        avoidanceSet
    );
    
    updateState({
        generator: {
            ...state.generator,
            plan,
            params,
            totalAgentes,
            jogadoresPorCiclo,
            distribuicaoAgentes: dist,
            lotWithdrawals: {}, 
            customLotSizes: {}
        }
    });
    
    notify(`Plano gerado com ${plan.length} jogadores!`, 'success');
    setActiveTab('lots');
  };

  const handleRegenerateLot = (startIndex: number, size: number) => {
      const newPlan = [...state.generator.plan];
      const currentlyUsedValues = new Set<number>();
      
      // Coleta valores do histórico para evitar
      avoidanceSet.forEach(v => currentlyUsedValues.add(v));
      
      // Coleta valores do plano atual (exceto o lote que vamos regerar)
      newPlan.forEach((player, index) => {
        if (index < startIndex || index >= startIndex + size) {
             player.deps.forEach(d => currentlyUsedValues.add(d.val));
        }
      });

      for(let i=0; i < size; i++) {
          const idx = startIndex + i;
          if (idx >= newPlan.length) break;
          // Regenera mantendo perfil e agente, mas mudando valores
          newPlan[idx] = regeneratePlayerValues(newPlan[idx], params, currentlyUsedValues, avoidanceSet);
      }
      
      updateState({ generator: { ...state.generator, plan: newPlan } });
      notify('Valores do lote regenerados (lógica Smart Value).', 'info');
  };

  const handleAdjustment = () => {
      const agentId = parseInt(adjustmentParams.agentId);
      if(!agentId || !state.generator.plan.length) {
          notify("Selecione um agente e certifique-se de ter um plano gerado.", "error");
          return;
      }

      const agentPlayers = state.generator.plan.filter(p => p.agent === agentId);
      if (agentPlayers.length === 0) {
          notify("Este agente não possui jogadores no plano atual.", "error");
          return;
      }

      const totalSum = agentPlayers.reduce((acc, p) => acc + p.total, 0);
      const currentAvg = totalSum / agentPlayers.length;

      if(adjustmentParams.targetAvg <= currentAvg) {
          notify(`Média atual (R$${currentAvg.toFixed(2)}) já é superior ao alvo.`, 'error');
          return;
      }

      const deficit = (adjustmentParams.targetAvg - currentAvg) * agentPlayers.length;
      const testadores = agentPlayers.filter(p => p.perfil.includes('Testador') && !p.perfil.includes('Ajustado'));

      if(testadores.length < adjustmentParams.numTesters) {
          notify(`Agente ${agentId} só possui ${testadores.length} Testadores disponíveis. (Necessário: ${adjustmentParams.numTesters})`, 'error');
          return;
      }

      // Evita NaN se o número de testes for 0 (embora o input evite, é bom proteger)
      const safeNumTesters = Math.max(1, adjustmentParams.numTesters);
      const redeposits = generateConstrainedSum(deficit, safeNumTesters, params.minBaixo, params.maxBaixo);
      const newPlan = [...state.generator.plan];
      
      let updatesCount = 0;
      // Procura no plano global os jogadores desse agente para ajustar
      for(let i=0; i<newPlan.length; i++) {
          if(updatesCount >= safeNumTesters) break;
          
          const p = newPlan[i];
          if(p.agent === agentId && p.perfil.includes('Testador') && !p.perfil.includes('Ajustado')) {
              const extraVal = redeposits[updatesCount];
              p.deps.push({ val: extraVal, type: 'redeposito' });
              p.total += extraVal;
              p.perfil = '🛡️ Testador (Ajustado)';
              updatesCount++;
          }
      }

      updateState({ generator: { ...state.generator, plan: newPlan } });
      notify(`Ajuste aplicado! +R$${formatarBRL(deficit)} no total do agente.`, 'success');
  };

  const handleSaveHistory = () => {
      if(!state.generator.plan.length) return;
      const newHistoryItems: HistoryItem[] = [];
      state.generator.plan.forEach(p => {
          p.deps.forEach(d => {
              newHistoryItems.push({ valor: d.val, tipo: d.type });
          });
      });

      updateState({
          generator: { 
              ...state.generator, 
              history: [...(state.generator.history || []), ...newHistoryItems],
              plan: [] 
          }
      });
      notify('Depósitos salvos no histórico e plano limpo.', 'success');
  };

  // --- RENDERS ---

  const renderKPIs = () => {
      const plan = state.generator.plan;
      const totalPlayers = plan.length;
      const totalDep = plan.reduce((acc, p) => acc + p.total, 0);
      const avg = totalPlayers > 0 ? totalDep / totalPlayers : 0;
      
      const counts = {
          testador: plan.filter(p => p.perfil.includes('Testador')).length,
          cetico: plan.filter(p => p.perfil.includes('Cético')).length,
          ambicioso: plan.filter(p => p.perfil.includes('Ambicioso')).length,
          viciado: plan.filter(p => p.perfil.includes('Viciado')).length,
      };

      const Card = ({title, val, color, icon: Icon, sub}: any) => (
          <div className="glass-card p-6 rounded-2xl flex items-center gap-6 shadow-lg relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                   <Icon size={80} />
               </div>
              <div className={`p-4 rounded-xl bg-black/30 border border-white/5 ${color} shadow-inner relative z-10`}>
                  {Icon && <Icon size={32} />}
              </div>
              <div className="relative z-10">
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">{title}</p>
                <div className="text-4xl font-bold text-white tracking-tight">{val}</div>
                {sub && <p className="text-sm text-gray-500 mt-1 font-medium">{sub}</p>}
              </div>
          </div>
      );

      return (
          <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Card title="Volume Total" val={formatarBRL(totalDep)} color="text-emerald-400" icon={Target} sub={`${totalPlayers} jogadores no plano`} />
                  <Card title="Ticket Médio" val={formatarBRL(avg)} color="text-cyan-400" icon={BarChart2} sub="Média por jogador" />
              </div>
              <div className="glass-card border-white/5 rounded-2xl p-6">
                <h4 className="text-sm text-gray-400 font-bold uppercase mb-6 flex items-center gap-2">
                    <BrainCircuit size={18} className="text-violet-400" /> Distribuição de Perfis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-gray-900/60 rounded-xl border border-white/5">
                        <div className="text-3xl font-bold text-gray-200 mb-1">{counts.testador}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Testadores</div>
                    </div>
                    <div className="p-4 bg-gray-900/60 rounded-xl border border-white/5">
                        <div className="text-3xl font-bold text-amber-500 mb-1">{counts.cetico}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Céticos</div>
                    </div>
                    <div className="p-4 bg-gray-900/60 rounded-xl border border-white/5">
                        <div className="text-3xl font-bold text-emerald-500 mb-1">{counts.ambicioso}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Ambiciosos</div>
                    </div>
                    <div className="p-4 bg-gray-900/60 rounded-xl border border-white/5">
                        <div className="text-3xl font-bold text-rose-500 mb-1">{counts.viciado}</div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Viciados</div>
                    </div>
                </div>
              </div>
          </div>
      );
  };

  const renderAgents = () => {
    const plan = state.generator.plan;
    const agentStats: Record<number, { count: number; total: number; perfis: Record<string, number> }> = {};

    // Initialize only used agents
    for(let i=1; i<=totalAgentes; i++) {
        if ((dist[i] || 0) > 0) {
             agentStats[i] = { count: 0, total: 0, perfis: { 'Testador': 0, 'Cético': 0, 'Ambicioso': 0, 'Viciado': 0 } };
        }
    }

    // Populate
    plan.forEach(p => {
        if(!agentStats[p.agent]) agentStats[p.agent] = { count: 0, total: 0, perfis: { 'Testador': 0, 'Cético': 0, 'Ambicioso': 0, 'Viciado': 0 } };
        const stats = agentStats[p.agent];
        stats.count++;
        stats.total += p.total;
        
        if (p.perfil.includes('Testador')) stats.perfis['Testador']++;
        else if (p.perfil.includes('Cético')) stats.perfis['Cético']++;
        else if (p.perfil.includes('Ambicioso')) stats.perfis['Ambicioso']++;
        else if (p.perfil.includes('Viciado')) stats.perfis['Viciado']++;
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
            {Object.keys(agentStats).sort((a,b) => parseInt(a)-parseInt(b)).map(key => {
                const id = parseInt(key);
                const stats = agentStats[id];
                const avg = stats.count > 0 ? stats.total / stats.count : 0;

                return (
                    <div key={id} className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/30 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-3xl -mr-10 -mt-10 rounded-full pointer-events-none"></div>
                        
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div>
                                <h3 className="text-xl font-bold text-white">AGENTE {id}</h3>
                                <p className="text-sm text-gray-400 font-medium">{stats.count} jogadores</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-400">{formatarBRL(stats.total)}</p>
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total Gerado</p>
                            </div>
                        </div>

                        <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/5 relative z-10">
                             <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-400">Média / Jogador</span>
                                <span className="font-bold text-white">{formatarBRL(avg)}</span>
                             </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 text-center text-xs relative z-10">
                             <div className="bg-gray-900/80 p-2 rounded border border-gray-700/50">
                                 <span className="block font-bold text-gray-300 text-lg">{stats.perfis['Testador']}</span>
                                 <span className="text-[9px] text-gray-500 font-bold">TST</span>
                             </div>
                             <div className="bg-gray-900/80 p-2 rounded border border-gray-700/50">
                                 <span className="block font-bold text-amber-500 text-lg">{stats.perfis['Cético']}</span>
                                 <span className="text-[9px] text-gray-500 font-bold">CET</span>
                             </div>
                             <div className="bg-gray-900/80 p-2 rounded border border-gray-700/50">
                                 <span className="block font-bold text-emerald-500 text-lg">{stats.perfis['Ambicioso']}</span>
                                 <span className="text-[9px] text-gray-500 font-bold">AMB</span>
                             </div>
                             <div className="bg-gray-900/80 p-2 rounded border border-gray-700/50">
                                 <span className="block font-bold text-rose-500 text-lg">{stats.perfis['Viciado']}</span>
                                 <span className="text-[9px] text-gray-500 font-bold">VIC</span>
                             </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
  };

  const renderLots = () => {
    const plan = state.generator.plan;
    let currentIndex = 0;
    let lotIndex = 1;
    const lots = [];

    while (currentIndex < plan.length) {
        // Pega tamanho customizado ou usa o padrão
        const customSize = state.generator.customLotSizes[lotIndex];
        const size = customSize !== undefined ? customSize : jogadoresPorCiclo;
        
        const chunk = plan.slice(currentIndex, currentIndex + size);
        const chunkStartIndex = currentIndex;
        
        if (chunk.length === 0) break;

        let lotDep = 0;
        chunk.forEach(p => lotDep += p.total);
        const lotNumber = lotIndex;
        const currentLotIdx = lotIndex;
        
        lots.push(
            <div key={lotIndex} className="glass-card rounded-2xl overflow-hidden animate-slide-up mb-6 shadow-xl border border-white/5">
                {/* Header do Lote */}
                <div className="p-4 bg-white/5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {lotNumber}
                        </div>
                        <div>
                            <span className="text-white font-bold text-lg block">Lote #{lotNumber}</span>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                                <span className="bg-black/30 px-2 py-0.5 rounded text-xs border border-white/10 font-mono">Jogadores {chunkStartIndex + 1} - {chunkStartIndex + chunk.length}</span>
                                <span className="text-emerald-400 font-mono font-bold">{formatarBRL(lotDep)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-black/40 rounded-lg px-3 py-1.5 border border-white/10">
                            <span className="text-xs text-gray-500 uppercase font-bold mr-3">Tamanho</span>
                            <input 
                                type="number" 
                                className="w-10 bg-transparent text-center font-bold text-white focus:outline-none text-sm" 
                                value={size} min={1}
                                onChange={(e) => updateState({generator: {...state.generator, customLotSizes: {...state.generator.customLotSizes, [currentLotIdx]: parseInt(e.target.value)||5}}})}
                            />
                        </div>
                        <button 
                            onClick={() => handleRegenerateLot(chunkStartIndex, size)}
                            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 hover:text-white transition-colors text-xs font-bold border border-white/5"
                            title="Regerar Valores"
                        >
                            <RotateCw size={14} /> Regerar
                        </button>
                        <button 
                            onClick={() => {
                                const lotChunk = plan.slice(chunkStartIndex, chunkStartIndex + size);
                                const today = getHojeISO();
                                const currentDay = state.dailyRecords[today] || { expenses: {proxy:0, numeros:0}, accounts: [] };
                                
                                let dep = 0, redep = 0, ciclos = 0;
                                lotChunk.forEach(p => {
                                    p.deps.forEach(d => { 
                                        // CORRECTED: Split values properly
                                        if(d.type === 'deposito') dep += d.val; 
                                        else redep += d.val; 
                                    });
                                    ciclos += 1;
                                });
                                
                                const newAccount = { id: Date.now(), deposito: dep, redeposito: redep, saque: 0, ciclos };
                                updateState({ dailyRecords: { ...state.dailyRecords, [today]: { ...currentDay, accounts: [...currentDay.accounts, newAccount] } } });
                                notify(`Lote ${lotNumber} enviado para Controle Diário (Split OK)!`, 'success');
                                navigateToDaily(today);
                            }}
                            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
                        >
                            <Send size={16} /> Enviar
                        </button>
                    </div>
                </div>

                {/* Tabela do Lote */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-xs uppercase text-gray-400 bg-black/20 border-b border-white/5">
                            <tr>
                                <th className="px-5 py-3 font-bold">Perfil</th>
                                <th className="px-5 py-3 font-bold">Agente</th>
                                <th className="px-5 py-3 font-bold text-right">Total</th>
                                <th className="px-5 py-3 font-bold">Entradas (Editável)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {chunk.map((p, i) => {
                                const absoluteIndex = chunkStartIndex + i;
                                const isTestador = p.perfil.includes('Testador');
                                const isCetico = p.perfil.includes('Cético');
                                const isAmbicioso = p.perfil.includes('Ambicioso');
                                const isAdjusted = p.perfil.includes('Ajustado');
                                
                                return (
                                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-5 py-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${
                                                isAdjusted ? 'bg-indigo-900/20 border-indigo-800/30 text-indigo-400' :
                                                isTestador ? 'bg-gray-800 border-gray-700 text-gray-300' :
                                                isCetico ? 'bg-amber-900/20 border-amber-800/30 text-amber-500' :
                                                isAmbicioso ? 'bg-emerald-900/20 border-emerald-800/30 text-emerald-500' :
                                                'bg-rose-900/20 border-rose-800/30 text-rose-500'
                                            }`}>
                                                {p.perfil}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-gray-300 font-mono font-bold text-base">A{p.agent}</td>
                                        <td className="px-5 py-4 text-right font-bold text-white text-base">R$ {p.total}</td>
                                        <td className="px-5 py-4 flex gap-2 items-center flex-wrap">
                                            {p.deps.map((d, depIdx) => (
                                                <input 
                                                    key={depIdx} type="number"
                                                    className={`w-20 px-2 py-1.5 text-center text-sm rounded-md border bg-black/40 font-bold focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all ${
                                                        d.type === 'deposito' ? 'border-white/10 text-cyan-400' : 'border-amber-900/50 text-amber-400'
                                                    }`}
                                                    value={d.val}
                                                    onChange={(e) => {
                                                        const newPlan = [...state.generator.plan];
                                                        newPlan[absoluteIndex].deps[depIdx].val = parseInt(e.target.value)||0;
                                                        newPlan[absoluteIndex].total = newPlan[absoluteIndex].deps.reduce((a,b)=>a+b.val,0);
                                                        updateState({ generator: { ...state.generator, plan: newPlan } });
                                                    }}
                                                />
                                            ))}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
        currentIndex += chunk.length;
        lotIndex++;
    }
    return <div className="space-y-4 pb-20">{lots}</div>;
  };
    
  return (
    <div className="flex flex-col xl:flex-row gap-8 h-full overflow-hidden">
      {/* --- PANEL DE CONFIGURAÇÃO (ESQUERDA) --- */}
      <div className="w-full xl:w-[420px] flex-shrink-0 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
        
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-2">
            <div className="p-3 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-900/20">
                <Settings2 className="text-white" size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white">Configuração</h2>
                <p className="text-sm text-gray-400">Algoritmo V36 (Ritmo & Cotas)</p>
            </div>
        </div>

        {/* 1. Distribuição */}
        <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={16} /> Distribuição
                </h4>
                <span className="text-xs bg-white/5 px-3 py-1 rounded-full text-gray-300 border border-white/10 font-bold">Total: {totalJogadoresCalculado}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                     <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Nº de Agentes</label>
                     <input 
                        type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-bold focus:border-violet-500 outline-none transition-colors" 
                        value={totalAgentes} min={1} max={20}
                        onChange={e => handleTotalAgentesChange(parseInt(e.target.value)||1)}
                     />
                </div>
                <div>
                     <label className="text-xs text-gray-500 font-bold uppercase mb-2 block">Tamanho Lote</label>
                     <input 
                        type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white font-bold focus:border-violet-500 outline-none transition-colors" 
                        value={jogadoresPorCiclo}
                        onChange={e => {
                            const val = parseInt(e.target.value)||5;
                            setJogadoresPorCiclo(val);
                            updateState({ generator: { ...state.generator, jogadoresPorCiclo: val } });
                        }}
                     />
                </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar bg-black/20 rounded-xl p-2 border border-white/5">
                {Array.from({length: totalAgentes}, (_, i) => i + 1).map(id => (
                    <div key={id} className="flex items-center justify-between group p-2 rounded hover:bg-white/5 transition-colors">
                        <label className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Agente {id}</label>
                        <div className="flex items-center gap-3">
                             {/* Input de Quantidade Direta */}
                             <input 
                                type="number" 
                                className="w-20 bg-black/40 border border-white/10 rounded-lg p-2 text-center text-white text-sm font-bold focus:border-violet-500 outline-none"
                                value={dist[id] || 0} 
                                onChange={(e) => handleDistChange(id, parseInt(e.target.value) || 0)}
                                min="0"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* 2. Perfis */}
        <div className="glass-card rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
                <h4 className="text-sm font-bold text-violet-400 uppercase tracking-widest flex items-center gap-2">
                    <BrainCircuit size={16} /> Perfis (%)
                </h4>
                <div className={`text-xs font-bold px-3 py-1 rounded-full ${
                    params.testador+params.cetico+params.ambicioso+params.viciado === 100 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse'
                }`}>
                    Total: {params.testador+params.cetico+params.ambicioso+params.viciado}%
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 {[
                     {id:'testador', label:'Testador', color:'border-white/10 focus:border-gray-500'},
                     {id:'cetico', label:'Cético', color:'border-amber-800 focus:border-amber-500'},
                     {id:'ambicioso', label:'Ambicioso', color:'border-emerald-800 focus:border-emerald-500'},
                     {id:'viciado', label:'Viciado', color:'border-rose-800 focus:border-rose-500'}
                 ].map(p => (
                     <div key={p.id} className="relative group">
                         <label className="text-[10px] text-gray-500 uppercase font-bold absolute top-2 left-3 pointer-events-none group-hover:text-gray-300 transition-colors">{p.label}</label>
                         <input 
                            type="number" className={`w-full bg-black/40 border ${p.color} rounded-xl pt-7 pb-2 px-3 text-white text-lg font-bold text-center outline-none transition-all`}
                            value={(params as any)[p.id]}
                            onChange={e => setParams({...params, [p.id]: parseInt(e.target.value)||0})}
                         />
                     </div>
                 ))}
            </div>
        </div>

        {/* 3. Lógica Numérica */}
        <div className="glass-card rounded-2xl p-6">
             <h4 className="text-sm font-bold text-violet-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 <Sliders size={16} /> Lógica de Valores
             </h4>
             <div className="grid grid-cols-2 gap-4 mb-4">
                 <div className="space-y-2">
                     <label className="text-xs text-gray-500 font-bold uppercase">Baixo (Min-Max)</label>
                     <div className="flex gap-2">
                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-bold text-center focus:border-violet-500 outline-none" value={params.minBaixo} onChange={e => setParams({...params, minBaixo: +e.target.value})} />
                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-bold text-center focus:border-violet-500 outline-none" value={params.maxBaixo} onChange={e => setParams({...params, maxBaixo: +e.target.value})} />
                     </div>
                 </div>
                 <div className="space-y-2">
                     <label className="text-xs text-gray-500 font-bold uppercase">Alto (Min-Max)</label>
                     <div className="flex gap-2">
                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-bold text-center focus:border-violet-500 outline-none" value={params.minAlto} onChange={e => setParams({...params, minAlto: +e.target.value})} />
                        <input type="number" className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white font-bold text-center focus:border-violet-500 outline-none" value={params.maxAlto} onChange={e => setParams({...params, maxAlto: +e.target.value})} />
                     </div>
                 </div>
             </div>
             <div className="relative mt-2">
                 <label className="text-[10px] text-emerald-500 absolute top-2 left-3 font-bold uppercase tracking-wider">Alvo Ambicioso</label>
                 <input type="number" className="w-full bg-black/40 border border-emerald-900/50 rounded-xl pt-7 pb-2 px-4 text-emerald-400 font-black text-xl text-right focus:border-emerald-500 outline-none transition-colors" value={params.alvo} onChange={e => setParams({...params, alvo: +e.target.value})} />
             </div>
        </div>

        {/* Action Button */}
        <button 
            onClick={handleGenerate}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold py-5 rounded-xl shadow-lg shadow-violet-900/40 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3 group text-lg"
        >
            <Play size={24} fill="currentColor" className="group-hover:translate-x-1 transition-transform" /> GERAR PLANO RÍTMICO
        </button>
        
        {/* IA / Adjustment Sections */}
        <div className="border-t border-white/5 pt-6 space-y-6">
             {/* Avoidance */}
            <div className="glass-card rounded-xl p-5">
                <h5 className="text-xs font-bold text-gray-400 mb-3 uppercase flex items-center gap-2"><Info size={14}/> Números a Evitar</h5>
                <textarea 
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:border-violet-500 outline-none resize-none font-mono"
                    placeholder="Cole valores aqui (ex: 50, 100)..."
                    value={manualAvoidance}
                    onChange={e => setManualAvoidance(e.target.value)}
                />
            </div>

            {/* Smart Adjustment */}
            <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-5 backdrop-blur-sm">
                 <h5 className="text-sm font-bold text-emerald-400 mb-4 uppercase flex items-center gap-2">
                    <Target size={18} /> Ajuste Fino de Média (IA)
                 </h5>
                 <div className="grid grid-cols-3 gap-3 mb-4">
                    <div>
                        <label className="text-[10px] text-emerald-400/70 font-bold uppercase mb-1 block">Agente</label>
                        <select className="w-full bg-black/40 border border-emerald-900/50 rounded-lg p-2 text-sm text-white focus:outline-none" value={adjustmentParams.agentId} onChange={e => setAdjustmentParams({...adjustmentParams, agentId: e.target.value})}>
                            <option value="">...</option>
                            {Array.from({length: totalAgentes}, (_, i) => i + 1).map(id => <option key={id} value={id}>Agt {id}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] text-emerald-400/70 font-bold uppercase mb-1 block">Média Alvo</label>
                        <input type="number" className="w-full bg-black/40 border border-emerald-900/50 rounded-lg p-2 text-sm text-white focus:outline-none" value={adjustmentParams.targetAvg} onChange={e => setAdjustmentParams({...adjustmentParams, targetAvg: +e.target.value})} />
                    </div>
                    <div>
                        <label className="text-[10px] text-emerald-400/70 font-bold uppercase mb-1 block">Qtd Jog.</label>
                        <input type="number" className="w-full bg-black/40 border border-emerald-900/50 rounded-lg p-2 text-sm text-white focus:outline-none" value={adjustmentParams.numTesters} onChange={e => setAdjustmentParams({...adjustmentParams, numTesters: +e.target.value})} />
                    </div>
                 </div>
                 <button onClick={handleAdjustment} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg border border-emerald-500/30 transition-all shadow-lg shadow-emerald-900/20 text-sm">
                    Aplicar Ajuste
                 </button>
            </div>
        </div>

      </div>

      {/* --- ÁREA DE RESULTADOS (DIREITA) --- */}
      <div className="flex-grow flex flex-col overflow-hidden glass-card rounded-2xl">
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/5 p-3 bg-black/20">
             <div className="flex gap-2">
                 {[
                     { id: 'lots', label: 'Lotes de Trabalho', icon: Layers },
                     { id: 'agents', label: 'Análise por Agente', icon: Users },
                     { id: 'kpis', label: 'Estatísticas Gerais', icon: BarChart2 },
                 ].map(tab => (
                     <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                            activeTab === tab.id 
                            ? 'bg-violet-600/20 text-white shadow-sm border border-violet-500/30 text-violet-100' 
                            : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                        }`}
                     >
                         <tab.icon size={16} /> {tab.label}
                     </button>
                 ))}
             </div>
             
             {state.generator.plan.length > 0 && (
                <div className="flex items-center gap-3">
                    <button 
                         onClick={handleSaveHistory}
                         className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-4 py-2 rounded-xl border border-emerald-900/50 hover:bg-emerald-900/50 transition-colors uppercase tracking-wide hover:scale-105 transform"
                     >
                        <Check size={16} /> Aprovar Tudo
                    </button>
                    <button 
                         onClick={() => { if(confirm('Limpar o plano atual?')) updateState({generator: {...state.generator, plan: []}}) }}
                         className="p-2 text-gray-500 hover:text-rose-500 transition-colors hover:bg-rose-950/30 rounded-lg"
                     >
                        <Trash2 size={20} />
                    </button>
                </div>
             )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {!state.generator.plan.length ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                    <div className="bg-white/5 p-8 rounded-full mb-6 border border-white/5">
                        <Layers size={80} className="stroke-1 text-gray-700" />
                    </div>
                    <p className="text-2xl font-bold text-gray-500 mb-2">Nenhum plano gerado</p>
                    <p className="text-base">Configure os parâmetros à esquerda e clique em <span className="text-violet-500 font-bold">GERAR PLANO</span>.</p>
                </div>
            ) : (
                <>
                    {activeTab === 'lots' && renderLots()}
                    {activeTab === 'agents' && renderAgents()}
                    {activeTab === 'kpis' && renderKPIs()}
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default Planning;