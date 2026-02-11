import React, { useState, useEffect, useRef } from 'react';
import { AppState, Account } from '../types';
import { formatarBRL, calculateDayMetrics } from '../utils';
import { 
    Plus, Trash2, Calendar, TrendingUp, DollarSign, HelpCircle, AlertCircle, 
    Lock, ArrowUpRight, ArrowDownRight, Wallet, Activity, 
    ChevronLeft, ChevronRight, Smartphone, Globe, Cloud
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  currentDate: string;
  setCurrentDate: (d: string) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
  readOnly?: boolean;
  privacyMode?: boolean; 
}

const DailyControl: React.FC<Props> = ({ state, updateState, currentDate, setCurrentDate, notify, readOnly, privacyMode }) => {
  const dayRecord = state.dailyRecords[currentDate] || { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
  const isManualMode = state.config.manualBonusMode === true;
  
  // --- AUTO-SYNC STATE ---
  const [syncStatus, setSyncStatus] = useState<'idle' | 'waiting' | 'syncing' | 'synced'>('idle');
  const [myLeaderKey, setMyLeaderKey] = useState<string | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);

  // Helper para Privacy
  const formatVal = (val: number) => privacyMode ? '****' : formatarBRL(val);

  // Helper para evitar NaN
  const safeFloat = (val: string) => {
      if (val === '') return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
  };

  const metrics = calculateDayMetrics(dayRecord, state.config.valorBonus);

  // --- EFEITO: BUSCAR CHAVE DO LÍDER ---
  useEffect(() => {
      const fetchLeader = async () => {
          const myKey = localStorage.getItem('cpa_auth_session_v3_master');
          if (!myKey || readOnly) return;

          try {
              const { data } = await supabase
                  .from('access_keys')
                  .select('leader_key')
                  .eq('key', myKey)
                  .single();
              
              if (data && data.leader_key) {
                  setMyLeaderKey(data.leader_key);
              }
          } catch (e) {
              console.error("Erro ao buscar líder", e);
          }
      };
      fetchLeader();
  }, [readOnly]);

  // --- EFEITO: AUTO-SYNC COM DEBOUNCE (60s) ---
  useEffect(() => {
      // Se não tiver líder, se for readOnly ou se não tiver dados, não faz nada
      if (!myLeaderKey || readOnly) return;

      // Se houver alteração nos dados, marcamos como "aguardando"
      setSyncStatus('waiting');

      // Limpa timeout anterior
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

      // Define novo timeout de 60 segundos (1 minuto)
      syncTimeoutRef.current = window.setTimeout(async () => {
          setSyncStatus('syncing');
          try {
              const channel = supabase.channel(`squad-room-${myLeaderKey}`);
              const status = await new Promise((resolve) => {
                  channel.subscribe((status) => {
                      if(status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') resolve(status);
                  });
              });

              if (status === 'SUBSCRIBED') {
                  const lucro = metrics.lucro;
                  let type: 'success' | 'alert' | 'info' = 'info';
                  if (lucro > 0) type = 'success';
                  if (lucro < 0) type = 'alert';

                  await channel.send({
                      type: 'broadcast',
                      event: 'squad_msg',
                      payload: {
                          from: state.config.userName || 'Operador',
                          message: `Atualização Automática: Lucro Dia ${formatarBRL(lucro)} | Vendas ${formatarBRL(metrics.ret)}`,
                          type: type,
                          timestamp: Date.now()
                      }
                  });
                  supabase.removeChannel(channel);
                  setSyncStatus('synced');
              }
          } catch (e) {
              console.error("Erro no auto-sync", e);
              setSyncStatus('idle');
          }
      }, 60000); // 60s Delay

      return () => {
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      };
  }, [dayRecord, myLeaderKey, readOnly, state.config.userName]);


  // --- FUNÇÕES CRUD (LÓGICA RESTAURADA) ---

  const handleExpenseChange = (field: 'proxy' | 'numeros', value: string) => {
    if (readOnly) return;
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: {
                ...dayRecord,
                expenses: { ...dayRecord.expenses, [field]: safeFloat(value) }
            }
        }
    });
  };

  const handleAddAccount = () => {
    if (readOnly) return;
    const newAcc: Account = { id: Date.now(), deposito: 0, redeposito: 0, saque: 0, ciclos: isManualMode ? 0 : 1 };
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: [...dayRecord.accounts, newAcc] }
        }
    });
  };

  const handleAccountChange = (id: number, field: keyof Account, value: string) => {
    if (readOnly) return;
    const updatedAccounts = dayRecord.accounts.map(acc => 
        acc.id === id ? { ...acc, [field]: safeFloat(value) } : acc
    );
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: updatedAccounts }
        }
    });
  };

  const handleDeleteAccount = (id: number) => {
    if (readOnly) return;
    // Removido window.confirm para ação instantânea como solicitado ("excluir normalmente")
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: dayRecord.accounts.filter(a => a.id !== id) }
        }
    });
    // notify("Registro excluído.", "info"); // Opcional
  };

  // Navegação de Datas
  const changeDate = (days: number) => {
      const date = new Date(currentDate);
      date.setDate(date.getDate() + days);
      const iso = date.toISOString().split('T')[0];
      setCurrentDate(iso);
  };

  const bonusMultiplier = isManualMode ? 1 : (state.config.valorBonus || 20);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        
        {/* --- HEADER CONTROLS (Control Deck) --- */}
        <div className="flex flex-col xl:flex-row gap-6">
            
            {/* DATE NAVIGATOR & EXPENSES */}
            <div className="xl:w-1/3 flex flex-col gap-4">
                {/* Navigator */}
                <div className="bg-[#0c0818] rounded-2xl p-6 border border-white/10 shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <button onClick={() => changeDate(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {new Date(currentDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                            </h2>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">
                                {new Date(currentDate).toLocaleDateString('pt-BR', { weekday: 'long' })}
                            </p>
                        </div>
                        <button onClick={() => changeDate(1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="relative group/date">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-violet-400">
                            <Calendar size={16} />
                        </div>
                        <input 
                            type="date" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold uppercase tracking-wide focus:border-violet-500 outline-none transition-all shadow-inner text-center cursor-pointer"
                            value={currentDate}
                            onChange={(e) => setCurrentDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* EXPENSES MINI-PANEL */}
                <div className="bg-[#0c0818] rounded-2xl p-5 border border-white/10 flex gap-4 items-center shadow-lg">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Globe size={10} /> Custo Proxy
                        </label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white font-mono font-bold text-sm focus:border-rose-500 outline-none text-right transition-colors"
                            value={dayRecord.expenses?.proxy || ''}
                            onChange={(e) => handleExpenseChange('proxy', e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Smartphone size={10} /> Custo SMS
                        </label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-white font-mono font-bold text-sm focus:border-rose-500 outline-none text-right transition-colors"
                            value={dayRecord.expenses?.numeros || ''}
                            onChange={(e) => handleExpenseChange('numeros', e.target.value)}
                            disabled={readOnly}
                        />
                    </div>
                </div>
            </div>

            {/* METRICS DECK (CONTROL DECK) */}
            <div className="xl:w-2/3 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* INVEST CARD */}
                <div className="bg-[#0c0818] rounded-2xl p-6 border border-white/10 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ArrowDownRight size={14} className="text-rose-500" /> Investimento
                        </p>
                        <h3 className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                            {formatVal(metrics.invest)}
                        </h3>
                        <p className="text-xs text-rose-400/70 mt-1 font-bold">+ {formatVal(metrics.despesas)} Custos</p>
                    </div>
                </div>

                {/* REVENUE CARD */}
                <div className="bg-[#0c0818] rounded-2xl p-6 border border-white/10 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                            <ArrowUpRight size={14} className="text-indigo-500" /> Faturamento
                        </p>
                        <h3 className="text-3xl font-black text-white font-mono tracking-tight drop-shadow-lg">
                            {formatVal(metrics.ret)}
                        </h3>
                        <p className="text-xs text-indigo-400/70 mt-1 font-bold">Saques + Bônus</p>
                    </div>
                </div>

                {/* PROFIT CARD (NEON) */}
                <div className={`rounded-2xl p-6 border flex flex-col justify-between shadow-lg relative overflow-hidden group transition-all
                    ${metrics.lucro >= 0 
                        ? 'bg-[#0a100d] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                        : 'bg-[#100a0a] border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.1)]'}
                `}>
                    <div className={`absolute -right-4 -top-4 w-32 h-32 rounded-full blur-3xl transition-all opacity-30
                        ${metrics.lucro >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}
                    `}></div>
                    
                    <div className="relative z-10">
                        <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-2
                            ${metrics.lucro >= 0 ? 'text-emerald-500' : 'text-rose-500'}
                        `}>
                            {metrics.lucro >= 0 ? <TrendingUp size={14} /> : <AlertCircle size={14} />} 
                            Resultado Líquido
                        </p>
                        <h3 className={`text-4xl font-black font-mono tracking-tight drop-shadow-lg
                            ${metrics.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                        `}>
                            {formatVal(metrics.lucro)}
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">
                            Margem: {metrics.ret > 0 ? ((metrics.lucro / metrics.ret) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MAIN TABLE (LIVRO CAIXA - Layout Tabela) --- */}
        <div className="min-h-[500px] flex flex-col" id="tour-daily-table">
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-3 font-mono">
                        LIVRO CAIXA
                        <span className="bg-primary/20 text-primary-glow text-xs px-2 py-0.5 rounded-full border border-primary/30">{dayRecord.accounts.length}</span>
                    </h3>
                    
                    {/* AUTO-SYNC INDICATOR (VISUAL APENAS) */}
                    {myLeaderKey && (
                        <div className={`hidden md:flex items-center gap-2 text-[10px] font-bold px-3 py-1 rounded-full border transition-all ${
                            syncStatus === 'synced' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            syncStatus === 'syncing' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                            'bg-white/5 text-gray-500 border-white/10'
                        }`}>
                            <Cloud size={12} className={syncStatus === 'syncing' ? 'animate-pulse' : ''} />
                            {syncStatus === 'synced' ? 'Sincronizado' : 
                             syncStatus === 'syncing' ? 'Enviando...' : 
                             syncStatus === 'waiting' ? 'Aguardando envio...' : 'Conectado'}
                        </div>
                    )}
                </div>

                {!readOnly && (
                    <button 
                        onClick={handleAddAccount}
                        className="gateway-btn-primary px-6 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 font-mono shadow-lg hover:shadow-primary/40 transition-all"
                    >
                        <Plus size={14} /> NOVO REGISTRO
                    </button>
                )}
                {readOnly && <div className="text-xs text-amber-500 font-bold flex items-center gap-1 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20"><Lock size={12}/> MODO LEITURA</div>}
            </div>
            
            <div className="overflow-x-auto flex-1 pb-10">
                <table className="w-full text-sm text-left text-gray-400 border-separate border-spacing-y-3">
                    <thead className="text-[10px] text-gray-500 uppercase font-mono tracking-widest pl-4">
                        <tr>
                            <th className="px-6 pb-2 font-bold">Investimento (Dep + Re)</th>
                            <th className="px-6 pb-2 font-bold text-accent-cyan">Saque</th>
                            
                            {/* COLUNA BÔNUS COM INFO BOX */}
                            <th className="px-6 pb-2 font-bold text-primary-glow">
                                 <div className="flex items-center gap-2">
                                     {isManualMode ? 'Bônus (R$)' : 'Ciclos'}
                                     {!readOnly && (
                                         <div className="group relative">
                                             <AlertCircle size={14} className="cursor-help text-gray-600 hover:text-white transition-colors" />
                                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-gray-900 border border-primary/30 p-3 rounded-xl text-[10px] text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 shadow-xl text-left leading-relaxed">
                                                 {isManualMode ? "Modo Manual: Digite o valor monetário exato." : "Modo Auto: Digite a quantidade de ciclos."}
                                             </div>
                                         </div>
                                     )}
                                 </div>
                            </th>
                            
                            <th className="px-6 pb-2 font-bold text-right">Performance</th>
                            <th className="px-6 pb-2 text-center w-28">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dayRecord.accounts.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-20 bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                                    <div className="flex flex-col items-center justify-center opacity-50">
                                         <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                             <TrendingUp size={32} />
                                         </div>
                                         <h4 className="text-white font-bold mb-2">Caixa Diário Vazio</h4>
                                         <p className="text-gray-400 text-sm max-w-sm mb-6">
                                             Adicione um novo registro para começar a monitorar.
                                         </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            dayRecord.accounts.map((acc, index) => {
                                const lucro = ((acc.saque||0) + ((acc.ciclos||0) * bonusMultiplier)) - ((acc.deposito||0) + (acc.redeposito||0));
                                return (
                                    <tr key={acc.id} className="group transition-all hover:-translate-y-1 duration-300 shadow-sm hover:shadow-lg">
                                        {/* BLOCO UNIFICADO DE INVESTIMENTO */}
                                        <td className="px-6 py-4 bg-[#0c0818] border-y border-l border-white/5 rounded-l-2xl first:rounded-l-2xl">
                                            <div className="flex items-center gap-2">
                                                <input type="number" 
                                                    className={`gateway-input w-24 py-2 px-3 rounded-lg text-white font-mono font-bold text-right border-white/10 focus:border-white/30 bg-black/20 ${privacyMode ? 'text-transparent bg-gray-800' : ''}`}
                                                    value={acc.deposito === 0 ? '' : acc.deposito} 
                                                    placeholder="Dep"
                                                    disabled={readOnly}
                                                    onChange={(e) => handleAccountChange(acc.id, 'deposito', e.target.value)} 
                                                />
                                                <span className="text-gray-600">+</span>
                                                <input type="number" 
                                                    className={`gateway-input w-24 py-2 px-3 rounded-lg text-gray-300 font-mono font-bold text-right border-white/5 focus:border-white/20 bg-black/20 ${privacyMode ? 'text-transparent bg-gray-800' : ''}`}
                                                    value={acc.redeposito === 0 ? '' : acc.redeposito} 
                                                    placeholder="Re-Dep"
                                                    disabled={readOnly}
                                                    onChange={(e) => handleAccountChange(acc.id, 'redeposito', e.target.value)} 
                                                />
                                            </div>
                                        </td>

                                        {/* SAQUE */}
                                        <td className="px-6 py-4 bg-[#0c0818] border-y border-white/5">
                                            <div className="relative group/input">
                                                <input type="number" 
                                                    className={`gateway-input w-full py-2.5 px-3 rounded-lg text-accent-cyan font-mono font-bold border border-accent-cyan/10 focus:border-accent-cyan/50 bg-accent-cyan/[0.05] transition-all text-lg ${privacyMode ? 'text-transparent bg-gray-800' : ''}`}
                                                    value={acc.saque === 0 ? '' : acc.saque} 
                                                    placeholder={privacyMode ? '****' : "0"}
                                                    disabled={readOnly}
                                                    onChange={(e) => handleAccountChange(acc.id, 'saque', e.target.value)} 
                                                />
                                            </div>
                                        </td>

                                        {/* BÔNUS / CICLOS */}
                                        <td className="px-6 py-4 bg-[#0c0818] border-y border-white/5">
                                            {isManualMode ? (
                                                <div className="relative flex items-center">
                                                    <div className="absolute left-3 text-primary-glow font-bold text-xs pointer-events-none">R$</div>
                                                    <input 
                                                        type="number" 
                                                        className={`gateway-input w-full py-2.5 pl-8 pr-3 rounded-lg text-primary-glow font-mono font-bold border border-primary/20 focus:border-primary/60 bg-primary/[0.05] hover:bg-primary/[0.1] transition-all ${privacyMode ? 'text-transparent bg-gray-800' : ''}`}
                                                        value={acc.ciclos === 0 ? '' : acc.ciclos} 
                                                        placeholder={privacyMode ? '****' : "0.00"}
                                                        disabled={readOnly}
                                                        onChange={(e) => handleAccountChange(acc.id, 'ciclos', e.target.value)} 
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex items-center bg-black/30 border border-white/10 rounded-lg p-1 w-full max-w-[140px]">
                                                    <input 
                                                        type="number" 
                                                        className="w-full bg-transparent text-center text-white font-mono font-bold py-1.5 focus:outline-none"
                                                        value={acc.ciclos === 0 ? '' : acc.ciclos} 
                                                        placeholder="0"
                                                        disabled={readOnly}
                                                        onChange={(e) => handleAccountChange(acc.id, 'ciclos', e.target.value)} 
                                                    />
                                                    <div className="bg-white/5 border-l border-white/10 px-2.5 py-1.5 flex flex-col items-center justify-center min-w-[50px]">
                                                        <span className="text-[9px] text-gray-500 font-bold uppercase leading-none mb-0.5">x</span>
                                                        <span className="text-[10px] text-primary-glow font-mono font-bold leading-none">{state.config.valorBonus}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </td>

                                        {/* RESULTADO (BADGE VISUAL) */}
                                        <td className="px-6 py-4 bg-[#0c0818] border-y border-white/5 text-right">
                                            <div className={`inline-flex items-center justify-end gap-2 px-4 py-2 rounded-xl border backdrop-blur-md min-w-[140px] shadow-lg transition-all duration-500
                                                ${lucro >= 0 
                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' 
                                                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'}
                                            `}>
                                                <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider mr-auto">
                                                    {lucro >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                                </span>
                                                <span className="text-lg font-black font-mono tracking-tight">
                                                    {formatVal(lucro)}
                                                </span>
                                            </div>
                                        </td>

                                        {/* AÇÕES */}
                                        <td className="px-6 py-4 bg-[#0c0818] border-y border-r border-white/5 rounded-r-2xl text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-opacity">
                                                {!readOnly && (
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 rounded-lg bg-transparent hover:bg-rose-500/10 text-gray-600 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-500/20">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default DailyControl;