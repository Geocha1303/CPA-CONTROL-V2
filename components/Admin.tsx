import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Key, Copy, Check, Database, CloudUpload, RefreshCw, Power, Search, List, ShieldCheck, Trash2, User, MonitorX, Link, Unlink, Activity, Radio, Cpu, Wifi, WifiOff, RotateCcw, Zap, Crown, Megaphone, Send, Globe, Lock, Smartphone } from 'lucide-react';

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
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ERROR'>('CONNECTING');
  const channelRef = useRef<any>(null);

  // States do Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<string>('ALL'); // 'ALL' ou o DEVICE_ID do usuário
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  
  // --- EFEITOS ---
  useEffect(() => {
      fetchKeys();
      const timer = setTimeout(() => connectRealtime(), 500);

      return () => {
          clearTimeout(timer);
          if (channelRef.current) supabase.removeChannel(channelRef.current);
          // IMPORTANTE: Não removemos o canal 'system_global_alerts' aqui.
          // O App.tsx precisa dele ativo para ESCUTAR. Se removermos aqui, matamos a escuta do próprio admin se ele estiver testando na mesma aba.
      };
  }, []);

  const connectRealtime = () => {
      if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
      }
      setConnectionStatus('CONNECTING');

      const channel = supabase.channel('online_users');
      channelRef.current = channel;

      const updatePresenceList = () => {
        const newState = channel.presenceState();
        const users: OnlineUser[] = [];
        Object.values(newState).forEach((presences: any) => {
            presences.forEach((p: any) => users.push(p as OnlineUser));
        });
        // Remove duplicatas baseadas no device_id para não mostrar o mesmo user 2x se a conexão oscilar
        const uniqueUsers = Array.from(new Map(users.map(item => [item.device_id, item])).values());
        setOnlineUsers(uniqueUsers);
      };

      channel
        .on('presence', { event: 'sync' }, updatePresenceList)
        .on('presence', { event: 'join' }, updatePresenceList)
        .on('presence', { event: 'leave' }, updatePresenceList)
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                setConnectionStatus('CONNECTED');
                await channel.track({
                    user: 'Admin Monitor',
                    key: 'ADMIN-PANEL',
                    online_at: new Date().toISOString(),
                    is_admin: true,
                    device_id: 'ADMIN-CONSOLE'
                });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                setConnectionStatus('ERROR');
            }
        });
  };

  // --- FUNÇÕES DE BROADCAST ---
  const handleSendBroadcast = async () => {
      if (!broadcastTitle || !broadcastMsg) {
          notify('Preencha título e mensagem.', 'error');
          return;
      }
      
      const targetUser = onlineUsers.find(u => u.device_id === broadcastTarget);
      let targetName = 'Destino Desconhecido';
      
      if (broadcastTarget === 'ALL') {
          targetName = `TODOS (${onlineUsers.length} conexões)`;
      } else if (targetUser) {
          targetName = `${targetUser.user}`;
      }

      if(!confirm(`ENVIAR ALERTA?\n\nDestino: ${targetName}\n\nIsso aparecerá na tela deste usuário.`)) return;

      setIsSendingBroadcast(true);
      
      // TIMEOUT DE SEGURANÇA (5 SEGUNDOS)
      // Se a rede falhar, o botão destrava sozinho.
      const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Tempo limite excedido. Verifique sua conexão.')), 5000)
      );

      try {
          // Obtém o canal global (Singleton do Supabase)
          const channel = supabase.channel('system_global_alerts');
          
          // Garante que está conectado antes de enviar
          const connectionPromise = new Promise((resolve, reject) => {
              if (channel.state === 'joined') {
                  resolve(true);
              } else {
                  channel.subscribe((status) => {
                      if (status === 'SUBSCRIBED') resolve(true);
                      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(new Error('Falha na conexão do canal.'));
                  });
              }
          });

          // Aguarda conexão (ou timeout)
          await Promise.race([connectionPromise, timeoutPromise]);

          // Envia a mensagem (com timeout também)
          const sendPromise = channel.send({
              type: 'broadcast',
              event: 'sys_alert',
              payload: { 
                  title: broadcastTitle, 
                  message: broadcastMsg,
                  target: broadcastTarget,
                  timestamp: Date.now()
              }
          });

          await Promise.race([sendPromise, timeoutPromise]);

          notify('Mensagem enviada com sucesso!', 'success');
          setBroadcastMsg('');
          setBroadcastTitle('');

      } catch (e: any) {
          console.error(e);
          notify(`Erro: ${e.message || 'Falha no envio'}`, 'error');
      } finally {
          setIsSendingBroadcast(false);
      }
  };

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

  const allConnections = onlineUsers;
  const freeUsersOnline = allConnections.filter(u => u.key === 'TROPA-FREE');
  const paidUsersOnline = allConnections.filter(u => u.key !== 'TROPA-FREE' && !u.is_admin);
  const adminsOnline = allConnections.filter(u => u.is_admin);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
        
        {/* HEADER MINIMALISTA */}
        <div className="flex items-end justify-between border-b border-white/5 pb-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-900/10">
                    <ShieldCheck size={28} className="text-amber-400" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Painel Admin</h2>
                    <p className="text-gray-400 text-sm font-medium">Gestão de Licenças e Radar</p>
                </div>
            </div>

            {/* STATUS DO RADAR */}
            {activeTab === 'monitor' && (
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all
                    ${connectionStatus === 'CONNECTED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                      connectionStatus === 'CONNECTING' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                      'bg-white/5 border-white/10 text-gray-500'}
                `}>
                    {connectionStatus === 'CONNECTED' && (
                        <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span>LIVE</span>
                        </>
                    )}
                    {connectionStatus === 'CONNECTING' && (
                        <>
                            <RefreshCw size={10} className="animate-spin" />
                            <span>SYNC...</span>
                        </>
                    )}
                    {connectionStatus === 'ERROR' && (
                        <>
                            <WifiOff size={10} />
                            <span>OFFLINE</span>
                            <button onClick={connectRealtime} className="ml-1 hover:text-white underline decoration-dotted">Retry</button>
                        </>
                    )}
                </div>
            )}
        </div>

        {/* TABS DE NAVEGAÇÃO */}
        <div className="flex justify-center mb-6">
            <div className="bg-black/40 p-1.5 rounded-2xl border border-white/10 flex gap-2 backdrop-blur-sm">
                <button 
                    onClick={() => setActiveTab('keys')}
                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'keys' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Key size={16} /> Gestão de Chaves
                </button>
                <button 
                    onClick={() => setActiveTab('monitor')}
                    className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'monitor' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                    <Activity size={16} /> Radar Ao Vivo
                    {allConnections.length > 0 && (
                        <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] ml-1 text-emerald-300">{allConnections.length}</span>
                    )}
                </button>
            </div>
        </div>

        {activeTab === 'monitor' ? (
            // --- ABA DE MONITORAMENTO EM TEMPO REAL ---
            <div className="space-y-6 animate-fade-in">
                
                {/* --- ÁREA DE BROADCAST --- */}
                <div className="glass-card p-6 rounded-2xl border border-indigo-500/30 bg-indigo-900/10 relative overflow-hidden">
                    <div className="flex items-start gap-6 relative z-10">
                        <div className="p-4 bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/30">
                            <Megaphone size={32} className="text-white animate-pulse-slow" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">Centro de Transmissão</h3>
                                    <p className="text-sm text-indigo-300 mb-4">Envie alertas em tempo real. Ideal para avisar sobre atualizações.</p>
                                </div>
                                
                                {/* SELETOR DE DESTINO */}
                                <div className="flex flex-col items-end">
                                    <label className="text-[10px] font-bold text-indigo-300 uppercase mb-1">Destinatário</label>
                                    <div className="relative">
                                        <select 
                                            className="appearance-none bg-black/40 border border-indigo-500/30 rounded-lg py-2 pl-3 pr-8 text-xs font-bold text-white focus:outline-none focus:border-indigo-400 cursor-pointer min-w-[200px]"
                                            value={broadcastTarget}
                                            onChange={(e) => setBroadcastTarget(e.target.value)}
                                        >
                                            <option value="ALL">📢 TODOS OS USUÁRIOS ({allConnections.length})</option>
                                            
                                            {/* MAPEA TODOS OS USUÁRIOS SEM LÓGICA DE SESSÃO */}
                                            {onlineUsers
                                                .filter(u => u.key !== 'ADMIN-PANEL')
                                                .sort((a,b) => a.user.localeCompare(b.user)) // Ordena por nome
                                                .map((u) => {
                                                    const type = u.key === 'TROPA-FREE' ? ' [Free]' : ' [Licenciado]';
                                                    
                                                    return (
                                                        <option key={u.device_id} value={u.device_id}>
                                                            👤 {u.user}{type}
                                                        </option>
                                                    );
                                                })
                                            }
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-indigo-300">
                                            {broadcastTarget === 'ALL' ? <Globe size={12}/> : <Lock size={12}/>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-4">
                                    <input 
                                        type="text" 
                                        placeholder="Título (Ex: Atualização Importante)" 
                                        className="w-full bg-black/40 border border-indigo-500/30 rounded-lg px-4 py-3 text-white focus:border-indigo-400 outline-none"
                                        value={broadcastTitle}
                                        onChange={e => setBroadcastTitle(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-6">
                                    <input 
                                        type="text" 
                                        placeholder="Mensagem (Ex: Corrigimos o erro X, atualize a página!)" 
                                        className="w-full bg-black/40 border border-indigo-500/30 rounded-lg px-4 py-3 text-white focus:border-indigo-400 outline-none"
                                        value={broadcastMsg}
                                        onChange={e => setBroadcastMsg(e.target.value)}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <button 
                                        onClick={handleSendBroadcast}
                                        disabled={isSendingBroadcast}
                                        className={`w-full h-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20 ${isSendingBroadcast ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSendingBroadcast ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />} 
                                        ENVIAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Métricas e Lista de Usuários */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* TOTAL */}
                    <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Radio size={80} /></div>
                        <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Total Conectado</h4>
                        <div className="text-5xl font-black text-white">{allConnections.length}</div>
                        <div className="flex items-center gap-2 mt-2">
                             <div className={`h-1.5 w-1.5 rounded-full ${allConnections.length > 0 ? 'bg-emerald-500 shadow-[0_0_5px_#10b981]' : 'bg-gray-600'}`}></div>
                             <span className="text-xs text-gray-500 font-bold uppercase">Sessões Ativas</span>
                        </div>
                    </div>

                    {/* ADMINS */}
                    <div className="glass-card p-6 rounded-2xl border border-amber-500/10 bg-amber-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Crown size={80} /></div>
                        <h4 className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-1">Admins Online</h4>
                        <div className="text-5xl font-black text-white">{adminsOnline.length}</div>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">Gestores Ativos</p>
                    </div>

                    {/* LICENCIADOS */}
                    <div className="glass-card p-6 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><Zap size={80} /></div>
                         <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">Licenciados (VIP)</h4>
                        <div className="text-5xl font-black text-white">{paidUsersOnline.length}</div>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">Chaves Pagas</p>
                    </div>

                    {/* FREE */}
                    <div className="glass-card p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 relative overflow-hidden group">
                         <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><User size={80} /></div>
                         <h4 className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-1">Visitantes (Free)</h4>
                        <div className="text-5xl font-black text-white">{freeUsersOnline.length}</div>
                        <p className="text-[10px] text-gray-500 mt-1 font-mono">Chave: TROPA-FREE</p>
                    </div>
                </div>

                {/* Lista de Usuários */}
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5 min-h-[400px]">
                    <div className="p-5 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                         <h3 className="font-bold text-white flex items-center gap-2">
                             <MonitorX size={18} className="text-emerald-400" /> Monitoramento de Sessões
                         </h3>
                         {connectionStatus === 'CONNECTED' && <span className="text-[9px] text-emerald-500/50 uppercase font-bold tracking-widest animate-pulse">Atualizando...</span>}
                    </div>
                    
                    {connectionStatus === 'ERROR' && allConnections.length === 0 ? (
                         <div className="flex flex-col items-center justify-center py-20 text-gray-600 opacity-60">
                            <WifiOff size={48} className="mb-4 text-red-400/50" />
                            <p className="text-lg font-bold">Conexão Realtime Indisponível</p>
                            <p className="text-sm">Verifique sua rede ou proxy.</p>
                            <button onClick={connectRealtime} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white border border-white/10">Tentar Novamente</button>
                        </div>
                    ) : (
                        <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                            {allConnections.length === 0 ? (
                                <div className="text-center py-20 text-gray-600">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Radio size={32} className="opacity-40" />
                                    </div>
                                    <p className="text-sm font-bold">Radar Limpo</p>
                                    <p className="text-xs">Nenhum usuário online no momento.</p>
                                </div>
                            ) : (
                                allConnections.map((user, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl border flex items-center justify-between transition-all hover:bg-white/[0.02] group ${
                                        user.is_admin ? 'bg-amber-500/[0.05] border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]' :
                                        user.key === 'TROPA-FREE' 
                                        ? 'bg-emerald-500/[0.02] border-emerald-500/10' 
                                        : 'bg-indigo-500/[0.02] border-indigo-500/10'
                                    }`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                                user.is_admin ? 'bg-amber-500/20 text-amber-400' :
                                                user.key === 'TROPA-FREE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                                            }`}>
                                                {user.is_admin ? <Crown size={20} /> : <User size={20} />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-white text-sm">{user.user}</h4>
                                                    {user.is_admin && <span className="text-[9px] bg-amber-500 text-black px-1.5 rounded font-bold">ADMIN</span>}
                                                    {user.key === 'TROPA-FREE' && <span className="text-[9px] bg-emerald-500 text-black px-1.5 rounded font-bold">FREE</span>}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-mono bg-black/20 px-2 py-0.5 rounded border border-white/5 group-hover:border-white/10 transition-colors">
                                                        <Cpu size={10} /> {user.device_id.substring(0, 16)}...
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-mono">
                                                        Login: {new Date(user.online_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <button 
                                                onClick={() => {
                                                    setBroadcastTarget(user.device_id); // Alvo agora é o DEVICE ID específico
                                                    setBroadcastTitle('Mensagem Privada do Admin');
                                                    document.querySelector('input')?.focus();
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-[10px] font-bold text-gray-300 border border-white/10"
                                            >
                                                Mandar MSG
                                            </button>
                                            <div className="text-right">
                                                <span className={`inline-block w-2 h-2 rounded-full animate-pulse ${user.is_admin ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}></span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            // --- ABA DE GESTÃO DE CHAVES ---
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                {/* (Conteúdo da Gestão de Chaves mantido igual...) */}
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