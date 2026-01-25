import React, { useState } from 'react';
import { AppState, GeneralExpense } from '../types';
import { formatarBRL, getHojeISO } from '../utils';
import { Plus, Trash2, Receipt, Calendar, Search } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
}

const Expenses: React.FC<Props> = ({ state, updateState }) => {
  const [newExpense, setNewExpense] = useState<{desc: string, val: string, date: string, rec: boolean}>({
    desc: '',
    val: '',
    date: getHojeISO(),
    rec: false
  });

  const handleAdd = () => {
    if (!newExpense.desc || !newExpense.val) return;
    
    const expense: GeneralExpense = {
        id: Date.now(),
        date: newExpense.date,
        description: newExpense.desc,
        valor: parseFloat(newExpense.val),
        recorrente: newExpense.rec
    };

    updateState({
        generalExpenses: [expense, ...state.generalExpenses]
    });

    setNewExpense({ ...newExpense, desc: '', val: '' });
  };

  const handleDelete = (id: number) => {
    updateState({
        generalExpenses: state.generalExpenses.filter(e => e.id !== id)
    });
  };

  const totalDespesas = state.generalExpenses.reduce((acc, curr) => acc + curr.valor, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        {/* Header Card */}
        <div className="glass-card p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Receipt size={120} />
            </div>
            
            <div className="relative z-10">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3 mb-2">
                    <div className="p-2 bg-rose-500/20 rounded-lg border border-rose-500/30">
                        <Receipt className="text-rose-400" size={24} />
                    </div>
                    Despesas Gerais
                </h2>
                <p className="text-gray-400">Gerenciamento de custos fixos e operacionais.</p>
            </div>

            <div className="relative z-10 flex flex-col items-end">
                <span className="text-xs text-gray-400 uppercase font-bold tracking-widest mb-1">Total Acumulado</span>
                <span className="text-4xl font-black text-rose-400 text-glow">{formatarBRL(totalDespesas)}</span>
            </div>
        </div>

        {/* Add Form */}
        <div className="glass-card p-6 rounded-2xl border border-white/5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Plus size={14} /> Nova Despesa
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Data</label>
                    <div className="relative group">
                        <Calendar size={14} className="absolute left-3 top-3.5 text-gray-500 group-focus-within:text-rose-400 transition-colors" />
                        <input 
                            type="date" 
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-9 pr-3 text-white text-sm focus:border-rose-500 outline-none transition-all shadow-inner font-medium"
                            value={newExpense.date}
                            onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                        />
                    </div>
                </div>
                <div className="md:col-span-6">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Descrição</label>
                    <input 
                        type="text" 
                        placeholder="Ex: Servidor VPS, Proxy, Assinatura..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-rose-500 outline-none transition-all shadow-inner font-medium placeholder:text-gray-600"
                        value={newExpense.desc}
                        onChange={e => setNewExpense({...newExpense, desc: e.target.value})}
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Valor (R$)</label>
                    <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-rose-500 outline-none transition-all shadow-inner font-bold placeholder:text-gray-600"
                        value={newExpense.val}
                        onChange={e => setNewExpense({...newExpense, val: e.target.value})}
                    />
                </div>
                <div className="md:col-span-2">
                    <button 
                        onClick={handleAdd}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Adicionar
                    </button>
                </div>
            </div>
        </div>

        {/* List */}
        <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-500 uppercase bg-black/40 border-b border-white/5">
                    <tr>
                        <th className="px-6 py-4 font-bold tracking-wider">Data</th>
                        <th className="px-6 py-4 font-bold tracking-wider">Descrição</th>
                        <th className="px-6 py-4 font-bold tracking-wider text-right">Valor</th>
                        <th className="px-6 py-4 text-center w-20">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {state.generalExpenses.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-gray-600">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="p-4 rounded-full bg-white/5">
                                        <Search size={24} className="opacity-50" />
                                    </div>
                                    <p>Nenhuma despesa registrada no sistema.</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        state.generalExpenses.slice().sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 font-mono text-gray-400">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-4 text-white font-medium">{item.description}</td>
                                <td className="px-6 py-4 text-right font-bold text-rose-400 text-base">{formatarBRL(item.valor)}</td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => handleDelete(item.id)}
                                        className="text-gray-600 hover:text-rose-500 transition-colors p-2 hover:bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default Expenses;