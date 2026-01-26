import React from 'react';
import { AppState, Account } from '../types';
import { formatarBRL } from '../utils';
import { Plus, Trash2, Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  currentDate: string;
  setCurrentDate: (d: string) => void;
}

const DailyControl: React.FC<Props> = ({ state, updateState, currentDate, setCurrentDate }) => {
  const dayRecord = state.dailyRecords[currentDate] || { expenses: { proxy: 0, numeros: 0 }, accounts: [] };
  
  const handleExpenseChange = (field: 'proxy' | 'numeros', value: number) => {
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: {
                ...dayRecord,
                expenses: { ...dayRecord.expenses, [field]: value }
            }
        }
    });
  };

  const handleAddAccount = () => {
    const newAcc: Account = { id: Date.now(), deposito: 0, redeposito: 0, saque: 0, ciclos: 1 };
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: [...dayRecord.accounts, newAcc] }
        }
    });
  };

  const handleAccountChange = (id: number, field: keyof Account, value: number) => {
    const updatedAccounts = dayRecord.accounts.map(acc => 
        acc.id === id ? { ...acc, [field]: value } : acc
    );
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: updatedAccounts }
        }
    });
  };

  const handleDeleteAccount = (id: number) => {
    updateState({
        dailyRecords: {
            ...state.dailyRecords,
            [currentDate]: { ...dayRecord, accounts: dayRecord.accounts.filter(a => a.id !== id) }
        }
    });
  };

  // Metrics
  const totalSaques = dayRecord.accounts.reduce((acc, curr) => acc + curr.saque, 0);
  const totalBonus = dayRecord.accounts.reduce((acc, curr) => acc + (curr.ciclos * state.config.valorBonus), 0);
  const totalInvestido = dayRecord.accounts.reduce((acc, curr) => acc + curr.deposito + curr.redeposito, 0);
  const totalDespesas = dayRecord.expenses.proxy + dayRecord.expenses.numeros;
  const totalLucroDia = (totalSaques + totalBonus) - totalInvestido - totalDespesas;

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto animate-fade-in pb-10">
      
      {/* Date & Summary Header */}
      <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-shrink-0 gateway-card p-6 rounded-xl flex flex-col justify-center min-w-[300px]">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="gateway-card p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-300 font-bold font-mono">CUSTO PROXY</span>
            <div className="relative w-40">
                <input type="number" className="gateway-input w-full pl-3 pr-3 py-2 text-right rounded font-mono font-bold text-sm"
                    value={dayRecord.expenses.proxy} onChange={(e) => handleExpenseChange('proxy', +e.target.value)} />
            </div>
         </div>
         <div className="gateway-card p-4 rounded-xl flex items-center justify-between">
            <span className="text-sm text-gray-300 font-bold font-mono">CUSTO SMS/OUTROS</span>
            <div className="relative w-40">
                <input type="number" className="gateway-input w-full pl-3 pr-3 py-2 text-right rounded font-mono font-bold text-sm"
                    value={dayRecord.expenses.numeros} onChange={(e) => handleExpenseChange('numeros', +e.target.value)} />
            </div>
         </div>
      </div>

      {/* Tabela Principal */}
      <div className="gateway-card rounded-xl overflow-hidden min-h-[500px] flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
            <h3 className="text-lg font-bold text-white flex items-center gap-3 font-mono">
                LIVRO CAIXA
                <span className="bg-primary/20 text-primary-glow text-xs px-2 py-0.5 rounded border border-primary/30">{dayRecord.accounts.length}</span>
            </h3>
            <button 
                onClick={handleAddAccount}
                className="gateway-btn-primary px-4 py-2 rounded text-xs font-bold text-white flex items-center gap-2 font-mono"
            >
                <Plus size={14} /> NOVO REGISTRO
            </button>
        </div>
        
        <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-[10px] text-gray-400 uppercase bg-black/40 border-b border-white/5 font-mono">
                    <tr>
                        <th className="px-6 py-4 font-bold tracking-widest text-gray-300">DEPÓSITO</th>
                        <th className="px-6 py-4 font-bold tracking-widest text-gray-300">RE-DEP</th>
                        <th className="px-6 py-4 font-bold tracking-widest text-accent-cyan">SAQUE</th>
                        <th className="px-6 py-4 font-bold tracking-widest text-primary-glow">CICLOS</th>
                        <th className="px-6 py-4 font-bold tracking-widest text-right text-gray-300">RESULTADO</th>
                        <th className="px-6 py-4 text-center w-16"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {dayRecord.accounts.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="text-center py-20 text-gray-500 font-mono">
                                SEM DADOS NO MOMENTO
                            </td>
                        </tr>
                    ) : (
                        dayRecord.accounts.map((acc, index) => {
                            const lucro = (acc.saque + (acc.ciclos * state.config.valorBonus)) - (acc.deposito + acc.redeposito);
                            return (
                                <tr key={acc.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-6 py-3">
                                        <input type="number" className="gateway-input w-full py-2 px-3 rounded text-white font-mono font-bold"
                                            value={acc.deposito} onChange={(e) => handleAccountChange(acc.id, 'deposito', +e.target.value)} />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input type="number" className="gateway-input w-full py-2 px-3 rounded text-white font-mono font-bold"
                                            value={acc.redeposito} onChange={(e) => handleAccountChange(acc.id, 'redeposito', +e.target.value)} />
                                    </td>
                                    <td className="px-6 py-3">
                                        <input type="number" className="gateway-input w-full py-2 px-3 rounded text-accent-cyan font-mono font-bold border-accent-cyan/30 focus:border-accent-cyan"
                                            value={acc.saque} onChange={(e) => handleAccountChange(acc.id, 'saque', +e.target.value)} />
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex items-center gap-2">
                                            <input type="number" className="gateway-input w-16 py-2 px-0 text-center rounded text-primary-glow font-mono font-bold border-primary/30 focus:border-primary"
                                                value={acc.ciclos} onChange={(e) => handleAccountChange(acc.id, 'ciclos', +e.target.value)} />
                                            <span className="text-[10px] text-gray-500 font-mono">x{state.config.valorBonus}</span>
                                        </div>
                                    </td>
                                    <td className={`px-6 py-3 text-right font-black font-mono text-lg ${lucro >= 0 ? 'text-accent-cyan' : 'text-accent-pink'}`}>
                                        {formatarBRL(lucro)}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 rounded hover:bg-white/10 text-gray-500 hover:text-accent-pink transition-colors">
                                            <Trash2 size={16} />
                                        </button>
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