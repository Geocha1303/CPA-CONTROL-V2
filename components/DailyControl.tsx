import React from 'react';
import { AppState, Account } from '../types';
import { formatarBRL } from '../utils';
import { Plus, Trash2, Calendar, TrendingUp, DollarSign, HelpCircle, AlertCircle, Lock } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  currentDate: string;
  setCurrentDate: (d: string) => void;
  readOnly?: boolean; // Nova prop
}

const DailyControl: React.FC<Props> = ({ state, updateState, currentDate, setCurrentDate, readOnly }) => {
  const dayRecord = state.dailyRecords[currentDate] || { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
  const isManualMode = state.config.manualBonusMode === true;
  
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
                        {formatarBRL(totalSaques + totalBonus)}
                    </span>
                </div>
                <div className="gateway-card p-4 rounded-xl border-l-2 border-l-accent-pink">
                    <span className="text-[10px] text-gray-400 uppercase font-bold font-mono block mb-1">SAÍDAS (TOTAL)</span>
                    <span className="text-xl font-bold text-white font-mono">
                        {formatarBRL(totalInvestido)}
                    </span>
                </div>
                 <div className="gateway-card p-4 rounded-xl border-l-2 border-l-gray-600">
                    <span className="text-[10px] text-gray-400 uppercase font-bold font-mono block mb-1">CUSTOS OP.</span>
                    <span className="text-xl font-bold text-white font-mono">
                        {formatarBRL(totalDespesas)}
                    </span>
                </div>
                <div className={`gateway-card p-4 rounded-xl border-l-2 ${totalLucroDia >= 0 ? 'border-l-accent-cyan bg-accent-cyan/5' : 'border-l-accent-pink bg-accent-pink/5'}`}>
                    <span className="text-[10px] text-gray-300 uppercase font-bold font-mono block mb-1">LUCRO LÍQUIDO</span>
                    <span className={`text-2xl font-black font-mono ${totalLucroDia >= 0 ? 'text-accent-cyan' : 'text-accent-pink'}`}>
                         {formatarBRL(totalLucroDia)}
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
                    placeholder="0"
                    disabled={readOnly}
                    onChange={(e) => handleExpenseChange('proxy', e.target.value)} />
            </div>
         </div>
         <div className="gateway-card p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-300 font-bold font-mono">CUSTO SMS/OUTROS</span>
            <div className="relative w-40">
                <input type="number" className="gateway-input w-full pl-3 pr-3 py-2 text-right rounded font-mono font-bold text-sm"
                    value={dayRecord.expenses.numeros === 0 ? '' : dayRecord.expenses.numeros} 
                    placeholder="0"
                    disabled={readOnly}
                    onChange={(e) => handleExpenseChange('numeros', e.target.value)} />
            </div>
         </div>
      </div>

      {/* Tabela Principal */}
      <div className="gateway-card rounded-xl overflow-hidden min-h-[500px] flex flex-col" id="tour-daily-table">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-3 font-mono">
                LIVRO CAIXA
                <span className="bg-primary/20 text-primary-glow text-xs px-2 py-0.5 rounded border border-primary/30">{dayRecord.accounts.length}</span>
            </h3>
            {!readOnly && (
                <button 
                    onClick={handleAddAccount}
                    className="gateway-btn-primary px-4 py-2 rounded text-xs font-bold text-white flex items-center gap-2 font-mono"
                >
                    <Plus size={14} /> NOVO REGISTRO
                </button>
            )}
            {readOnly && <div className="text-xs text-amber-500 font-bold flex items-center gap-1"><Lock size={12}/> MODO LEITURA</div>}
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-[10px] text-gray-400 uppercase bg-black/40 border-b border-white/5 font-mono">
                    <tr>
                        <th className="px-6 py-4 font-bold tracking-widest text-gray-300">DEPÓSITO</th>
                        <th className="px-6 py-4 font-bold tracking-widest text-gray-300">RE-DEP</th>
                        <th className="px-6 py-4 font-bold tracking-widest text-accent-cyan">SAQUE</th>
                        
                        {/* COLUNA BÔNUS COM INFO BOX */}
                        <th className="px-6 py-4 font-bold tracking-widest text-primary-glow">
                             <div className="flex items-center gap-2">
                                 {isManualMode ? 'BÔNUS (R$)' : 'CICLOS (TELAS)'}
                                 {!readOnly && (
                                     <div className="group relative">
                                         <AlertCircle size={14} className="cursor-help text-primary-glow hover:text-white transition-colors" />
                                         <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 bg-gray-900 border border-primary/30 p-3 rounded-xl text-[10px] text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-50 shadow-[0_0_20px_rgba(112,0,255,0.2)] text-left leading-relaxed">
                                             {isManualMode ? (
                                                 <>
                                                    <strong className="text-primary-glow block mb-1">Modo Manual Ativado</strong>
                                                    Você deve colocar o valor exato que ganhou nesta operação (Baú + Gerente). Se quiser que o sistema calcule automaticamente (Ciclos x Valor), desmarque esta opção em "Sistema".
                                                 </>
                                             ) : (
                                                 <>
                                                    <strong className="text-primary-glow block mb-1">Modo Automático</strong>
                                                    Digite a quantidade de ciclos (telas). O sistema multiplicará pelo valor configurado em "Sistema".
                                                 </>
                                             )}
                                             <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 border-b border-r border-primary/30 rotate-45"></div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                        </th>
                        
                        <th className="px-6 py-4 font-bold tracking-widest text-right text-gray-300">RESULTADO</th>
                        <th className="px-6 py-4 text-center w-16"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {dayRecord.accounts.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-20">
                                <div className="flex flex-col items-center justify-center opacity-50">
                                     <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                         <TrendingUp size={32} />
                                     </div>
                                     <h4 className="text-white font-bold mb-2">Caixa Diário Vazio</h4>
                                     <p className="text-gray-400 text-sm max-w-sm mb-6">
                                         Nenhum registro encontrado para esta data.
                                     </p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        dayRecord.accounts.map((acc, index) => {
                            const lucro = ((acc.saque||0) + ((acc.ciclos||0) * bonusMultiplier)) - ((acc.deposito||0) + (acc.redeposito||0));
                            return (
                                <tr key={acc.id} className="hover:bg-white/[0.02] transition-colors group">
                                    {/* DEPÓSITO */}
                                    <td className="px-6 py-3">
                                        <div className="relative group/input">
                                            <input type="number" 
                                                className="gateway-input w-full py-2.5 px-3 rounded-lg text-white font-mono font-bold border-transparent focus:border-white/20 hover:bg-white/5 transition-all"
                                                value={acc.deposito === 0 ? '' : acc.deposito} 
                                                placeholder="0"
                                                disabled={readOnly}
                                                onChange={(e) => handleAccountChange(acc.id, 'deposito', e.target.value)} 
                                            />
                                        </div>
                                    </td>
                                    
                                    {/* REDEPÓSITO */}
                                    <td className="px-6 py-3">
                                        <div className="relative group/input">
                                            <input type="number" 
                                                className="gateway-input w-full py-2.5 px-3 rounded-lg text-white font-mono font-bold border-transparent focus:border-white/20 hover:bg-white/5 transition-all"
                                                value={acc.redeposito === 0 ? '' : acc.redeposito} 
                                                placeholder="0"
                                                disabled={readOnly}
                                                onChange={(e) => handleAccountChange(acc.id, 'redeposito', e.target.value)} 
                                            />
                                        </div>
                                    </td>

                                    {/* SAQUE */}
                                    <td className="px-6 py-3">
                                        <div className="relative group/input">
                                            <input type="number" 
                                                className="gateway-input w-full py-2.5 px-3 rounded-lg text-accent-cyan font-mono font-bold border border-accent-cyan/10 focus:border-accent-cyan/50 bg-accent-cyan/[0.02] hover:bg-accent-cyan/[0.05] transition-all"
                                                value={acc.saque === 0 ? '' : acc.saque} 
                                                placeholder="0"
                                                disabled={readOnly}
                                                onChange={(e) => handleAccountChange(acc.id, 'saque', e.target.value)} 
                                            />
                                        </div>
                                    </td>

                                    {/* BÔNUS / CICLOS (REMODELADO) */}
                                    <td className="px-6 py-3">
                                        {isManualMode ? (
                                            // ESTILO MODO MANUAL (VALOR R$)
                                            <div className="relative flex items-center">
                                                <div className="absolute left-3 text-primary-glow font-bold text-xs pointer-events-none">R$</div>
                                                <input 
                                                    type="number" 
                                                    className="gateway-input w-full py-2.5 pl-8 pr-3 rounded-lg text-primary-glow font-mono font-bold border border-primary/20 focus:border-primary/60 bg-primary/[0.05] hover:bg-primary/[0.1] transition-all shadow-[0_0_15px_rgba(112,0,255,0.05)]"
                                                    value={acc.ciclos === 0 ? '' : acc.ciclos} 
                                                    placeholder="0.00"
                                                    disabled={readOnly}
                                                    onChange={(e) => handleAccountChange(acc.id, 'ciclos', e.target.value)} 
                                                />
                                            </div>
                                        ) : (
                                            // ESTILO MODO AUTOMÁTICO (QTD x MULTIPLICADOR)
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
                                                    <span className="text-[9px] text-gray-500 font-bold uppercase leading-none mb-0.5">Valor</span>
                                                    <span className="text-[10px] text-primary-glow font-mono font-bold leading-none">x{state.config.valorBonus}</span>
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* RESULTADO */}
                                    <td className={`px-6 py-3 text-right font-black font-mono text-lg tracking-tight ${lucro >= 0 ? 'text-accent-cyan' : 'text-accent-pink'}`}>
                                        {formatarBRL(lucro)}
                                    </td>

                                    {/* DELETE */}
                                    <td className="px-6 py-3 text-center">
                                        {!readOnly && (
                                            <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 rounded-lg bg-transparent hover:bg-rose-500/10 text-gray-600 hover:text-rose-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
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