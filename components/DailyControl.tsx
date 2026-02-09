
import React, { useState } from 'react';
import { AppState, Account } from '../types';
import { formatarBRL } from '../utils';
import { Plus, Trash2, Calendar, TrendingUp, DollarSign, HelpCircle, AlertCircle, Lock, Send, Check, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  currentDate: string;
  setCurrentDate: (d: string) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
  readOnly?: boolean;
  privacyMode?: boolean; // Nova prop
  currentUserKey: string; // Nova prop essencial
}

const DailyControl: React.FC<Props> = ({ state, updateState, currentDate, setCurrentDate, notify, readOnly, privacyMode, currentUserKey }) => {
  const dayRecord = state.dailyRecords[currentDate] || { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
  const isManualMode = state.config.manualBonusMode === true;
  const [sendingId, setSendingId] = useState<number | null>(null);
  
  // Helper para Privacy
  const formatVal = (val: number) => privacyMode ? '****' : formatarBRL(val);

  // Helper para evitar NaN
  const safeFloat = (val: string) => {
      if (val === '') return 0;
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : parsed;
  };

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
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: dayRecord.accounts.filter(a => a.id !== id) }
        }
    });
  };

  // --- REPORT TO LEADER LOGIC (CORRIGIDA PARA USAR PROP) ---
  const handleReportRow = async (acc: Account) => {
      if (!currentUserKey) {
          notify("Erro de autenticação.", "error");
          return;
      }
      
      setSendingId(acc.id);

      try {
          // 1. Calcular Valores
          const bonusMultiplier = isManualMode ? 1 : (state.config.valorBonus || 20);
          const investimento = (acc.deposito || 0) + (acc.redeposito || 0);
          const retorno = (acc.saque || 0) + ((acc.ciclos || 0) * bonusMultiplier);
          const lucro = retorno - investimento;

          // 2. Buscar Líder
          const { data } = await supabase
            .from('access_keys')
            .select('leader_key, owner_name')
            .eq('key', currentUserKey)
            .single();

          if (data && data.leader_key) {
              const channel = supabase.channel(`squad-room-${data.leader_key}`);
              
              const status = await new Promise((resolve) => {
                  channel.subscribe((status) => {
                      if(status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') resolve(status);
                  });
              });

              if (status === 'SUBSCRIBED') {
                  let type: 'success' | 'alert' | 'info' = 'info';
                  if (lucro > 0) type = 'success';
                  if (lucro < 0) type = 'alert';

                  await channel.send({
                      type: 'broadcast',
                      event: 'squad_msg',
                      payload: {
                          from: data.owner_name,
                          message: `Registro Manual: Investiu ${formatarBRL(investimento)} e obteve ${formatarBRL(lucro)} de resultado.`,
                          type: type,
                          timestamp: Date.now()
                      }
                  });
                  supabase.removeChannel(channel);
                  notify("Registro enviado para o Líder!", "success");
              }
          } else {
              notify("Você não tem um líder vinculado para reportar.", "info");
          }
      } catch (e) {
          console.error(e);
          notify("Erro ao enviar reporte.", "error");
      } finally {
          setTimeout(() => setSendingId(null), 1000);
      }
  };

  // Metrics Logic
  const bonusMultiplier = isManualMode ? 1 : (state.config.valorBonus || 20);
  
  const totalSaques = dayRecord.accounts.reduce((acc, curr) => acc + (curr.saque || 0), 0);
  const totalBonus = dayRecord.accounts.reduce((acc, curr) => acc + ((curr.ciclos || 0) * bonusMultiplier), 0);
  const totalInvestido = dayRecord.accounts.reduce((acc, curr) => acc + (curr.deposito || 0) + (curr.redeposito || 0), 0);
  const totalDespesas = (dayRecord.expenses.proxy || 0) + (dayRecord.expenses.numeros || 0);
  const totalLucroDia = (totalSaques + totalBonus) - totalInvestido - totalDespesas;

  return (
    <div className={`space-y-6 max-w-[1600px] mx-auto animate-fade-in pb-10 ${readOnly ? 'pointer-events-none opacity-90' : ''}`}>
      
      {/* Date & Summary Header */}
      <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-shrink-0 gateway-card p-6 rounded-xl flex flex-col justify-center min-w-[300px] pointer-events-auto">
                <label className="text-xs text-primary-glow uppercase font-bold font-mono mb-2 flex items-center gap-2">
                    <Calendar size={14} /> DATA DO SISTEMA
                </label>
                <input 
                    type="date" 
                    value={currentDate} 
                    onChange={(e) => setCurrentDate(e.target.value)}
                    className="gateway-input w-full px-4 py-3 rounded-lg text-lg font-mono font-bold"
                />
          </div>

          <div className="flex-grow grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="gateway-card p-4 rounded-xl border-l-2 border-l-primary">
                    <span className="text-[10px] text-gray-400 uppercase font-bold font-mono block mb-1">ENTRADAS (TOTAL)</span>
                    <span className="text-xl font-bold text-white font-mono">
                        {formatVal(totalSaques + totalBonus)}
                    </span>
                </div>
                <div className="gateway-card p-4 rounded-xl border-l-2 border-l-accent-pink">
                    <span className="text-[10px] text-gray-400 uppercase font-bold font-mono block mb-1">SAÍDAS (TOTAL)</span>
                    <span className="text-xl font-bold text-white font-mono">
                        {formatVal(totalInvestido)}
                    </span>
                </div>
                 <div className="gateway-card p-4 rounded-xl border-l-2 border-l-gray-600">
                    <span className="text-[10px] text-gray-400 uppercase font-bold font-mono block mb-1">CUSTOS OP.</span>
                    <span className="text-xl font-bold text-white font-mono">
                        {formatVal(totalDespesas)}
                    </span>
                </div>
                <div className={`gateway-card p-4 rounded-xl border-l-2 ${totalLucroDia >= 0 ? 'border-l-accent-cyan bg-accent-cyan/5' : 'border-l-accent-pink bg-accent-pink/5'}`}>
                    <span className="text-[10px] text-gray-300 uppercase font-bold font-mono block mb-1">LUCRO LÍQUIDO</span>
                    <span className={`text-2xl font-black font-mono ${totalLucroDia >= 0 ? 'text-accent-cyan' : 'text-accent-pink'}`}>
                         {formatVal(totalLucroDia)}
                    </span>
                </div>
          </div>
      </div>

      {/* Inputs de Despesas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="tour-daily-costs">
         <div className="gateway-card p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-300 font-bold font-mono">CUSTO PROXY</span>
            <div className="relative w-40">
                <input type="number" className="gateway-input w-full pl-3 pr-3 py-2 text-right rounded font-mono font-bold text-sm"
                    value={dayRecord.expenses.proxy === 0 ? '' : dayRecord.expenses.proxy} 
                    placeholder={privacyMode ? '****' : "0"}
                    disabled={readOnly}
                    onChange={(e) => handleExpenseChange('proxy', e.target.value)} />
            </div>
         </div>
         <div className="gateway-card p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-300 font-bold font-mono">CUSTO SMS/OUTROS</span>
            <div className="relative w-40">
                <input type="number" className="gateway-input w-full pl-3 pr-3 py-2 text-right rounded font-mono font-bold text-sm"
                    value={dayRecord.expenses.numeros === 0 ? '' : dayRecord.expenses.numeros} 
                    placeholder={privacyMode ? '****' : "0"}
                    disabled={readOnly}
                    onChange={(e) => handleExpenseChange('numeros', e.target.value)} />
            </div>
         </div>
      </div>

      {/* Tabela Principal - DESIGN ATUALIZADO (SEM CARA DE EXCEL) */}
      <div className="min-h-[500px] flex flex-col" id="tour-daily-table">
        <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-3 font-mono">
                LIVRO CAIXA
                <span className="bg-primary/20 text-primary-glow text-xs px-2 py-0.5 rounded-full border border-primary/30">{dayRecord.accounts.length}</span>
            </h3>
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
            {/* Adicionado border-separate e spacing-y para criar o efeito de Cards Flutuantes */}
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
                                                <>
                                                    <button 
                                                        onClick={() => handleReportRow(acc)}
                                                        className={`p-2 rounded-lg transition-all border ${sendingId === acc.id ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40'}`}
                                                        title="Enviar registro para o Líder"
                                                        disabled={sendingId === acc.id}
                                                    >
                                                        {sendingId === acc.id ? <Check size={16} /> : <Send size={16} />}
                                                    </button>
                                                    <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 rounded-lg bg-transparent hover:bg-rose-500/10 text-gray-600 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-500/20">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
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
