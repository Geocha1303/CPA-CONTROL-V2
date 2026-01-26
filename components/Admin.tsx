import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Key, Copy, Check, Database, CloudUpload, RefreshCw, Power, Search, List, ShieldCheck, Trash2, User } from 'lucide-react';

interface Props {
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface AccessKeyData {
    id: number;
    created_at: string;
    key: string;
    owner_name: string;
    active: boolean;
    is_admin: boolean;
}

const Admin: React.FC<Props> = ({ notify }) => {
  // States do Gerador
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [ownerNameInput, setOwnerNameInput] = useState('');

  // States da Lista de Gestão
  const [keysList, setKeysList] = useState<AccessKeyData[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
      fetchKeys();
  }, []);

  // --- FUNÇÕES DO SUPABASE (CRUD) ---
  const fetchKeys = async () => {
      setIsLoadingKeys(true);
      try {
          const { data, error } = await supabase
            .from('access_keys')
            .select('*')
            .order('id', { ascending: false });

          if (error) throw error;
          if (data) setKeysList(data);
      } catch (err: any) {
          console.error("Erro ao buscar chaves:", err);
          // Falha silenciosa para não incomodar se for apenas rede
      } finally {
          setIsLoadingKeys(false);
      }
  };

  const toggleKeyStatus = async (id: number, currentStatus: boolean) => {
      try {
          const { error } = await supabase
            .from('access_keys')
            .update({ active: !currentStatus })
            .eq('id', id);

          if (error) throw error;
          
          setKeysList(prev => prev.map(k => k.id === id ? { ...k, active: !currentStatus } : k));
          notify(currentStatus ? 'Chave DESATIVADA.' : 'Chave ATIVADA.', 'info');
      } catch (err: any) {
          notify(`Erro ao atualizar: ${err.message}`, 'error');
      }
  };

  const deleteKey = async (id: number) => {
      if (!confirm('Tem certeza? Essa chave será excluída permanentemente.')) return;

      try {
          const { error } = await supabase
            .from('access_keys')
            .delete()
            .eq('id', id);

          if (error) throw error;

          setKeysList(prev => prev.filter(k => k.id !== id));
          notify('Chave excluída do banco de dados.', 'success');
      } catch (err: any) {
          notify(`Erro ao deletar: ${err.message}`, 'error');
      }
  };

  // --- GERADOR DE CHAVES ---
  const generateNewKey = () => {
      const prefix = "CPA";
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newKey = `${prefix}-${part1}-${part2}`;
      setGeneratedKey(newKey);
      setCopied(false);
      setOwnerNameInput('');
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      notify('Copiado para a área de transferência!', 'info');
  };

  const handleCopyGenerated = () => {
      copyToClipboard(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  const saveKeyToSupabase = async () => {
      if (!generatedKey) return;
      setIsSavingKey(true);
      
      try {
          const { error } = await supabase
            .from('access_keys')
            .insert([
                { 
                    key: generatedKey, 
                    active: true, 
                    is_admin: false,
                    owner_name: ownerNameInput || 'Cliente Novo'
                }
            ]);

          if (error) throw error;
          
          notify('Chave registrada com sucesso!', 'success');
          setGeneratedKey(''); 
          setOwnerNameInput('');
          fetchKeys(); // Atualiza a lista imediatamente

      } catch (err: any) {
          console.error("Supabase Error:", err);
          if (err.code === '42501' || err.message?.includes('permission')) {
             notify('ERRO DE PERMISSÃO: Configure as Políticas (RLS) no Supabase.', 'error');
          } else {
             notify(`Erro ao salvar: ${err.message}`, 'error');
          }
      } finally {
          setIsSavingKey(false);
      }
  };

  // Filtro da lista
  const filteredKeys = keysList.filter(k => 
      (k.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (k.key || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full mb-4 border border-amber-500/20">
                <ShieldCheck size={40} className="text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Painel do Administrador</h2>
            <p className="text-gray-400 mt-2">Gestão centralizada de acessos e licenças.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Coluna 1: GERADOR */}
            <div className="space-y-8">
                <div className="glass-card rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5 shadow-2xl shadow-amber-900/10">
                    <div className="p-6 border-b border-amber-500/10 bg-gradient-to-r from-amber-900/20 to-transparent">
                        <h3 className="font-bold text-amber-400 flex items-center gap-2">
                            <Key size={18} /> Nova Licença
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Crie chaves de acesso para novos clientes.</p>
                    </div>
                    <div className="p-6">
                         <div className="mb-4">
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Nome do Cliente / Usuário</label>
                            <input type="text" value={ownerNameInput} onChange={(e) => setOwnerNameInput(e.target.value)}
                                className="w-full bg-black/40 border border-amber-500/20 rounded-lg p-3 text-white font-medium focus:border-amber-500 outline-none transition-colors" placeholder="Ex: Cliente VIP 01" />
                        </div>
                        
                        <div className="flex gap-2 mb-6">
                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-white font-mono text-center font-bold tracking-widest text-lg select-all shadow-inner">
                                {generatedKey || '---- ---- ----'}
                            </div>
                            <button onClick={handleCopyGenerated} className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 rounded-xl transition-colors" disabled={!generatedKey} title="Copiar">
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={generateNewKey} className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold py-3 rounded-xl transition-all">
                                GERAR CÓDIGO
                            </button>
                            <button onClick={saveKeyToSupabase} disabled={!generatedKey || isSavingKey} className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    !generatedKey ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/20' }`}>
                                {isSavingKey ? <RefreshCw className="animate-spin" size={18}/> : <CloudUpload size={18} />} SALVAR
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Info Card */}
                <div className="glass-card p-6 rounded-2xl border border-white/5">
                    <h4 className="text-gray-400 font-bold text-sm mb-2 flex items-center gap-2"><User size={16}/> Estatísticas de Acesso</h4>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="block text-2xl font-bold text-white">{keysList.length}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Total de Chaves</span>
                        </div>
                        <div className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <span className="block text-2xl font-bold text-emerald-400">{keysList.filter(k => k.active).length}</span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Ativas Agora</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coluna 2: LISTA DE GESTÃO */}
            <div className="glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col h-[600px]">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                     <div>
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Database size={18} className="text-blue-400" /> Banco de Chaves
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-1">Gerencie os acessos do sistema.</p>
                     </div>
                     <button onClick={fetchKeys} className="p-2 bg-white/5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                         <RefreshCw size={16} className={isLoadingKeys ? 'animate-spin' : ''} />
                     </button>
                </div>

                {/* Barra de Busca */}
                <div className="p-4 bg-black/20 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente ou chave..." 
                            className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {filteredKeys.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                            <List size={40} className="mb-2" />
                            <p className="text-sm">Nenhuma chave encontrada</p>
                        </div>
                    ) : (
                        filteredKeys.map((item) => (
                            <div key={item.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-white text-sm">{item.owner_name}</h4>
                                            {item.is_admin && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold">ADMIN</span>}
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                                                item.active 
                                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            }`}>
                                                {item.active ? 'Ativo' : 'Bloqueado'}
                                            </span>
                                        </div>
                                        <div 
                                            className="text-xs font-mono text-gray-400 mt-1 bg-black/30 px-2 py-1 rounded w-fit cursor-pointer hover:text-white hover:bg-black/50 transition-colors flex items-center gap-2 border border-white/5"
                                            onClick={() => copyToClipboard(item.key)}
                                            title="Clique para copiar"
                                        >
                                            {item.key} <Copy size={10} />
                                        </div>
                                        <p className="text-[9px] text-gray-600 mt-1 font-mono">{new Date(item.created_at).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                    <button 
                                        onClick={() => toggleKeyStatus(item.id, item.active)}
                                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border ${
                                            item.active 
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                        }`}
                                    >
                                        <Power size={12} /> {item.active ? 'BLOQUEAR' : 'ATIVAR'}
                                    </button>
                                    <button 
                                        onClick={() => deleteKey(item.id)}
                                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-rose-400 rounded-lg transition-colors border border-gray-700"
                                        title="Excluir Definitivamente"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default Admin;