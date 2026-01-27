import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Key, Copy, Check, Database, CloudUpload, RefreshCw, Power, Search, List, ShieldCheck, Trash2, User, MonitorX, Link, Unlink, Activity, Radio, Cpu } from 'lucide-react';

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
    hwid: string | null;
}

interface OnlineUser {
    key: string;
    user: string;
    online_at: string;
    is_admin: boolean;
    device_id: string;
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

  // States do Monitoramento (Realtime)
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [activeTab, setActiveTab] = useState<'monitor' | 'keys'>('keys');

  // --- EFEITOS ---
  useEffect(() => {
      fetchKeys();

      // INICIA O MONITORAMENTO AO VIVO
      const channel = supabase.channel('online_users');
      channel.on('presence', { event: 'sync' }, () => {
          const newState = channel.presenceState();
          const users: OnlineUser[] = [];
          
          Object.values(newState).forEach((presences: any) => {
              presences.forEach((p: any) => {
                  users.push(p as OnlineUser);
              });
          });
          
          setOnlineUsers(users);
      }).subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
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
          notify(currentStatus ? 'Chave DESATIVADA (Usuário será expulso).' : 'Chave ATIVADA.', 'info');
      } catch (err: any) {
          notify(`Erro ao atualizar: ${err.message}`, 'error');
      }
  };

  const resetHWID = async (id: number) => {
      if(!confirm("⚠️ ATENÇÃO: Isso permite que a chave seja usada em um NOVO computador. Confirmar reset?")) return;
      
      try {
          const { error } = await supabase
            .from('access_keys')
            .update({ hwid: null })
            .eq('id', id);

          if (error) throw error;

          setKeysList(prev => prev.map(k => k.id === id ? { ...k, hwid: null } : k));
          notify('Dispositivo desvinculado! A chave pode ser usada novamente.', 'success');
      } catch (err: any) {
          notify(`Erro ao resetar: ${err.message}`, 'error');
      }
  };

  const deleteKey = async (id: number) => {
      if (!confirm('Tem certeza? Essa chave será excluída permanentemente e o usuário expulso.')) return;

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
                    owner_name: ownerNameInput || 'Cliente Novo',
                    hwid: null // Começa sem dispositivo (VIRGEM)
                }
            ]);

          if (error) throw error;
          
          notify('Chave criada! Aguardando primeiro uso.', 'success');
          setGeneratedKey(''); 
          setOwnerNameInput('');
          fetchKeys(); 

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

  const filteredKeys = keysList.filter(k => 
      (k.owner_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
      (k.key || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtros de Monitoramento
  const freeUsersOnline = onlineUsers.filter(u => u.key === 'TROPA-FREE');
  const paidUsersOnline = onlineUsers.filter(u => u.key !== 'TROPA-FREE' && !u.is_admin);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full mb-4 border border-amber-500/20">
                <ShieldCheck size={40} className="text-amber-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Painel do Administrador</h2>
            <p className="text-gray-400 mt-2">Gestão centralizada de acessos e monitoramento.</p>
        </div>

        {/* TABS DE NAVEGAÇÃO */}
        <div className="flex justify-center mb-6">
            <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex gap-2">
                <button 
                    onClick={() => setActiveTab('keys')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'keys' ? 'bg-amber-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Key size={16} /> Gestão de Chaves
                </button>
                <button 
                    onClick={() => setActiveTab('monitor')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'monitor' ? 'bg-emerald-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <Activity size={16} className={activeTab === 'monitor' ? 'animate-pulse' : ''} /> 
                    Radar Ao Vivo 
                    <span className="bg-black/20 px-2 rounded-full text-[10px] ml-1">{onlineUsers.length}</span>
                </button>
            </div>
        </div>

        {activeTab === 'monitor' ? (
            // --- ABA DE MONITORAMENTO EM TEMPO REAL ---
            <div className="space-y-6 animate-fade-in">
                {/* Métricas Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Radio size={60} /></div>
                        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Conectado</h4>
                        <div className="text-4xl font-black text-white">{onlineUsers.length}</div>
                        <div className="flex items-center gap-2 mt-2">
                             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                             <span className="text-xs text-emerald-500 font-bold">Online Agora</span>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 relative overflow-hidden">
                         <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Acesso Gratuito</h4>
                        <div className="text-4xl font-black text-white">{freeUsersOnline.length}</div>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">Chave: TROPA-FREE</p>
                    </div>
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 relative overflow-hidden">
                         <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">Licenciados (Pagos)</h4>
                        <div className="text-4xl font-black text-white">{paidUsersOnline.length}</div>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">Chaves Únicas</p>
                    </div>
                </div>

                {/* Lista de Usuários */}
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-4 bg-black/40 border-b border-white/5 flex items-center justify-between">
                         <h3 className="font-bold text-white flex items-center gap-2">
                             <MonitorX size={18} className="text-emerald-400" /> Dispositivos Ativos
                         </h3>
                         <span className="text-[10px] text-gray-500 uppercase font-bold animate-pulse">Atualizando em tempo real...</span>
                    </div>
                    <div className="p-2 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                        {onlineUsers.length === 0 ? (
                            <div className="text-center py-12 text-gray-600">
                                <Radio size={40} className="mx-auto mb-2 opacity-50" />
                                <p>Nenhum usuário online no momento.</p>
                            </div>
                        ) : (
                            onlineUsers.map((user, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between transition-all hover:scale-[1.01] ${
                                    user.key === 'TROPA-FREE' 
                                    ? 'bg-emerald-900/10 border-emerald-500/10' 
                                    : user.is_admin ? 'bg-amber-900/10 border-amber-500/10' : 'bg-indigo-900/10 border-indigo-500/10'
                                }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-lg ${
                                            user.key === 'TROPA-FREE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
                                        }`}>
                                            {user.is_admin ? <ShieldCheck size={20} className="text-amber-400" /> : <User size={20} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-white text-sm">{user.user}</h4>
                                                {user.is_admin && <span className="text-[9px] bg-amber-500 text-black px-1.5 rounded font-bold">ADMIN</span>}
                                                {user.key === 'TROPA-FREE' && <span className="text-[9px] bg-emerald-500 text-black px-1.5 rounded font-bold">FREE</span>}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <div className="flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-black/30 px-2 py-0.5 rounded border border-white/5">
                                                    <Cpu size={10} /> {user.device_id.substring(0, 16)}...
                                                </div>
                                                <div className="text-[10px] text-gray-500 font-mono">
                                                    Entrou: {new Date(user.online_at).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="text-right">
                                        <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] animate-pulse"></span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        ) : (
            // --- ABA DE GESTÃO DE CHAVES (ORIGINAL) ---
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                
                {/* Coluna 1: GERADOR */}
                <div className="space-y-8">
                    <div className="glass-card rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5 shadow-2xl shadow-amber-900/10">
                        <div className="p-6 border-b border-amber-500/10 bg-gradient-to-r from-amber-900/20 to-transparent">
                            <h3 className="font-bold text-amber-400 flex items-center gap-2">
                                <Key size={18} /> Nova Licença (Uso Único)
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Gera uma chave que trava no primeiro PC que usar.</p>
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
                                <span className="block text-2xl font-bold text-indigo-400">{keysList.filter(k => k.hwid !== null).length}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Já Usadas</span>
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
                            <p className="text-[10px] text-gray-400 mt-1">Controle de uso único e bloqueios.</p>
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
                                        <div className="w-full">
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
                                            
                                            {/* STATUS DE VÍNCULO (One Time Use) */}
                                            <div className="mt-2 flex items-center gap-2 w-full">
                                                {item.hwid ? (
                                                    <div className="flex-1 bg-indigo-900/20 border border-indigo-500/20 rounded p-1.5 flex items-center gap-2 overflow-hidden">
                                                        <div className="bg-indigo-500/20 p-1 rounded">
                                                            <Link size={12} className="text-indigo-400" />
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <span className="text-[8px] text-gray-400 font-bold uppercase block">ID do PC</span>
                                                            <span className="text-[9px] text-indigo-300 font-mono font-bold truncate block w-32">{item.hwid}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 flex items-center gap-1 font-bold animate-pulse">
                                                        <Unlink size={10} /> AGUARDANDO USO
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                        {/* Botão de Bloqueio */}
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

                                        {/* Botão de Reset (Permitir novo uso) */}
                                        {item.hwid && (
                                            <button 
                                                onClick={() => resetHWID(item.id)}
                                                className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 rounded-lg transition-colors border border-blue-500/20"
                                                title="Liberar chave para novo PC (Resetar Vínculo)"
                                            >
                                                <MonitorX size={14} />
                                            </button>
                                        )}
                                        
                                        {/* Botão de Excluir */}
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
        )}
    </div>
  );
};

export default Admin;