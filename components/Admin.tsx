
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Key, Copy, Check, Database, Upload, RefreshCw, Power, Search, List, ShieldCheck, Trash2, User, MonitorOff, Link, Unlink, Activity, Radio, Cpu, Wifi, WifiOff, RotateCcw, Zap, Crown, Megaphone, Send, Globe, Lock, Smartphone, ShoppingBag, FileJson, Download, X, Eye } from 'lucide-react';
import { AppState } from '../types';
import { formatarBRL } from '../utils';

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

interface StoreAnalyticsItem {
    product_name: string;
    count: number;
    last_click: string;
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
  const [activeTab, setActiveTab] = useState<'monitor' | 'keys' | 'store'>('keys');
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'ERROR'>('CONNECTING');
  const channelRef = useRef<any>(null);

  // States do Broadcast
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<string>('ALL');
  const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
  
  // State Analytics
  const [storeAnalytics, setStoreAnalytics] = useState<StoreAnalyticsItem[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // --- INSPECTOR STATE (NOVO) ---
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectedData, setInspectedData] = useState<{
      key: string;
      updated_at: string;
      data: AppState;
      stats: { days: number; totalInvest: number; totalProfit: number };
  } | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState(false);
  const [manualInspectKey, setManualInspectKey] = useState('');

  // --- FUNCTIONS ---

  const fetchKeys = async () => {
      setIsLoadingKeys(true);
      try {
          const { data, error } = await supabase
              .from('access_keys')
              .select('*')
              .order('created_at', { ascending: false });
          
          if (error) throw error;
          setKeysList(data || []);
      } catch (err: any) {
          console.error("Erro ao buscar chaves:", err);
          notify(`Erro ao buscar chaves: ${err.message}`, 'error');
      } finally {
          setIsLoadingKeys(false);
      }
  };

  const fetchStoreAnalytics = async () => {
      setIsLoadingAnalytics(true);
      try {
          // Fetch store tracking data
          const { data, error } = await supabase
              .from('store_tracking')
              .select('*')
              .order('clicked_at', { ascending: false })
              .limit(500); // Limit to recent 500 for performance

          if (error) throw error;

          if (data) {
              const agg: Record<string, { count: number, last: string }> = {};
              data.forEach((row: any) => {
                  const name = row.product_name || 'Desconhecido';
                  if (!agg[name]) {
                      agg[name] = { count: 0, last: row.clicked_at };
                  }
                  agg[name].count++;
                  if (new Date(row.clicked_at) > new Date(agg[name].last)) {
                      agg[name].last = row.clicked_at;
                  }
              });

              const result: StoreAnalyticsItem[] = Object.entries(agg).map(([name, val]) => ({
                  product_name: name,
                  count: val.count,
                  last_click: val.last
              })).sort((a,b) => b.count - a.count);

              setStoreAnalytics(result);
          }
      } catch (err: any) {
          console.error("Erro analytics:", err);
          // notify('Erro ao carregar analytics', 'error');
      } finally {
          setIsLoadingAnalytics(false);
      }
  };

  const connectRealtime = async () => {
      // 1. Limpeza Agressiva de Conflitos
      // Remove qualquer canal existente chamado 'online_users' para evitar conflito com App.tsx
      const allChannels = supabase.getChannels();
      const conflictChannel = allChannels.find(c => c.topic === 'realtime:online_users');
      if (conflictChannel) {
          await supabase.removeChannel(conflictChannel);
      }

      // Remove referência local anterior
      if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
      }

      setConnectionStatus('CONNECTING');

      // 2. Nova Conexão Privilegiada (Admin)
      const channel = supabase.channel('online_users', {
          config: {
              presence: {
                  key: 'ADMIN-MONITOR',
              },
          },
      });
      
      channelRef.current = channel;

      channel
          .on('presence', { event: 'sync' }, () => {
              const newState = channel.presenceState();
              const users: OnlineUser[] = [];
              
              Object.values(newState).forEach((presences: any) => {
                  presences.forEach((p: any) => {
                      if (p.user && p.key) { 
                          users.push({
                              user: p.user,
                              key: p.key,
                              online_at: p.online_at,
                              is_admin: p.is_admin,
                              device_id: p.device_id || 'unknown'
                          });
                      }
                  });
              });
              setOnlineUsers(users);
              setConnectionStatus('CONNECTED');
          })
          .subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  setConnectionStatus('CONNECTED');
                  // Admin também se registra como presente para "ativar" o canal bidirecional se necessário
                  await channel.track({
                      user: 'ADMINISTRADOR',
                      key: 'MASTER',
                      is_admin: true,
                      online_at: new Date().toISOString(),
                      device_id: 'ADMIN-CONSOLE'
                  });
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  setConnectionStatus('ERROR');
              }
          });
  };

  // --- EFEITOS ---
  useEffect(() => {
      fetchKeys();
      // Sempre conecta no realtime, independente da aba, para garantir lista atualizada de usuários
      const timer = setTimeout(() => {
          connectRealtime();
      }, 500);

      return () => {
          clearTimeout(timer);
          if (channelRef.current) supabase.removeChannel(channelRef.current);
      };
  }, []); // Executa na montagem

  useEffect(() => {
      if (activeTab === 'store') {
          fetchStoreAnalytics();
      }
  }, [activeTab]);

  // --- HANDLERS ---

  const generateKey = () => {
      const prefix = 'CPA';
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part3 = Math.random().toString(36).substring(2, 6).toUpperCase();
      setGeneratedKey(`${prefix}-${part1}-${part2}-${part3}`);
      setCopied(false);
  };

  const saveKey = async () => {
      if (!generatedKey || !ownerNameInput) {
          notify('Preencha o nome e gere uma chave.', 'error');
          return;
      }
      setIsSavingKey(true);
      try {
          const { error } = await supabase.from('access_keys').insert({
              key: generatedKey,
              owner_name: ownerNameInput,
              active: true,
              is_admin: false
          });
          if (error) throw error;
          
          notify('Chave gerada e salva com sucesso!', 'success');
          setGeneratedKey('');
          setOwnerNameInput('');
          setCopied(false);
          fetchKeys();
      } catch (err: any) {
          notify(err.message, 'error');
      } finally {
          setIsSavingKey(false);
      }
  };

  const copyKey = () => {
      if (generatedKey) {
          navigator.clipboard.writeText(generatedKey);
          setCopied(true);
          notify('Chave copiada para a área de transferência.', 'info');
      }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
      try {
          const { error } = await supabase
              .from('access_keys')
              .update({ active: !currentStatus })
              .eq('id', id);
          
          if (error) throw error;
          setKeysList(prev => prev.map(k => k.id === id ? { ...k, active: !currentStatus } : k));
          notify(`Status alterado para ${!currentStatus ? 'Ativo' : 'Inativo'}.`, 'success');
      } catch (err: any) {
          notify(err.message, 'error');
      }
  };

  const resetHWID = async (id: number) => {
      try {
          const { error } = await supabase
              .from('access_keys')
              .update({ hwid: null })
              .eq('id', id);
          
          if (error) throw error;
          setKeysList(prev => prev.map(k => k.id === id ? { ...k, hwid: null } : k));
          notify('Vínculo de dispositivo (HWID) resetado.', 'success');
      } catch (err: any) {
          notify(err.message, 'error');
      }
  };

  const deleteKey = async (id: number) => {
      if (!window.confirm("ATENÇÃO: Isso excluirá permanentemente a chave. Deseja continuar?")) return;
      try {
          const { error } = await supabase
              .from('access_keys')
              .delete()
              .eq('id', id);
          
          if (error) throw error;
          setKeysList(prev => prev.filter(k => k.id !== id));
          notify('Chave excluída do sistema.', 'success');
      } catch (err: any) {
          notify(err.message, 'error');
      }
  };

  const sendBroadcast = async () => {
      if (!broadcastTitle || !broadcastMsg) {
          notify('Preencha título e mensagem.', 'error');
          return;
      }
      setIsSendingBroadcast(true);
      try {
          // Recupera ou cria o canal. Não removemos ao final para não quebrar listeners globais.
          const channel = supabase.channel('system_global_alerts');
          
          // Timeout de segurança para evitar loading infinito
          await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                  resolve('TIMEOUT_TRY_SEND');
              }, 2500);

              channel.subscribe((status) => {
                  if (status === 'SUBSCRIBED') {
                      clearTimeout(timeout);
                      resolve(status);
                  } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                      clearTimeout(timeout);
                      reject(new Error(`Erro de conexão: ${status}`));
                  }
              });
          });

          await channel.send({
              type: 'broadcast',
              event: 'sys_alert',
              payload: {
                  title: broadcastTitle,
                  message: broadcastMsg,
                  target: broadcastTarget // Envia o alvo (Key ou ALL)
              }
          });
          
          const targetName = broadcastTarget === 'ALL' 
            ? 'Todos os usuários' 
            : onlineUsers.find(u => u.key === broadcastTarget)?.user ||
              keysList.find(k => k.key === broadcastTarget)?.owner_name || 
              'Usuário';
            
          notify(`Mensagem enviada para: ${targetName}`, 'success');
          
          setBroadcastTitle('');
          setBroadcastMsg('');
          // IMPORTANTE: NÃO REMOVER O CANAL. O App.tsx depende dele para receber.
      } catch (err: any) {
          console.error("Erro broadcast:", err);
          notify(`Falha ao enviar: ${err.message}`, 'error');
      } finally {
          setIsSendingBroadcast(false);
      }
  };

  // --- INSPECT LOGIC (NEW) ---
  const handleInspect = async (key: string) => {
      setIsLoadingInspect(true);
      setInspectModalOpen(true);
      setInspectedData(null);

      try {
          const { data, error } = await supabase
              .from('user_data')
              .select('raw_json, updated_at')
              .eq('access_key', key)
              .single();

          if (error) throw error;

          if (data && data.raw_json) {
              const appData = data.raw_json as AppState;
              
              // Calculate simple stats
              const days = Object.keys(appData.dailyRecords || {}).length;
              let totalInvest = 0;
              let totalProfit = 0;
              
              Object.values(appData.dailyRecords || {}).forEach(day => {
                  if(day.accounts) {
                      day.accounts.forEach(acc => {
                          totalInvest += (acc.deposito||0) + (acc.redeposito||0);
                          // Estimativa bruta
                          totalProfit += ((acc.saque||0) + ((acc.ciclos||0) * (appData.config.valorBonus||20))) - ((acc.deposito||0) + (acc.redeposito||0));
                      });
                  }
              });

              setInspectedData({
                  key,
                  updated_at: data.updated_at,
                  data: appData,
                  stats: { days, totalInvest, totalProfit }
              });
          } else {
              notify("Nenhum dado encontrado para esta chave na nuvem.", "info");
              setInspectModalOpen(false);
          }
      } catch (err: any) {
          notify(`Erro ao inspecionar: ${err.message}`, "error");
          setInspectModalOpen(false);
      } finally {
          setIsLoadingInspect(false);
      }
  };

  const handleDownloadBackup = () => {
      if (!inspectedData) return;
      const dataStr = JSON.stringify(inspectedData.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `BACKUP_${inspectedData.key}_${new Date().toISOString().slice(0,10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      notify('Backup baixado com sucesso!', 'success');
  };

  // --- RENDER ---
  const filteredKeys = keysList.filter(k => 
      k.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      k.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper para o nome do destinatário atual
  const getRecipientName = () => {
      if (broadcastTarget === 'ALL') return null;
      return onlineUsers.find(u => u.key === broadcastTarget)?.user || 'Usuário Desconhecido';
  };

  const recipientName = getRecipientName();

  return (
    <div className="max-w-[1600px] mx-auto animate-fade-in pb-20">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-red-600 to-rose-700 rounded-2xl shadow-lg shadow-red-900/30 border border-red-500/30">
                <ShieldCheck size={32} className="text-white" />
            </div>
            <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Painel Administrativo</h2>
                <p className="text-gray-400 text-sm font-medium">Gestão de Chaves e Monitoramento de Rede.</p>
            </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
             <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex gap-2 shadow-inner">
                <button 
                    onClick={() => setActiveTab('keys')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'keys' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Key size={16} /> Gestão de Chaves
                </button>
                <button 
                    onClick={() => setActiveTab('monitor')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'monitor' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Activity size={16} /> Monitoramento Realtime
                </button>
                <button 
                    onClick={() => setActiveTab('store')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'store' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <ShoppingBag size={16} /> Loja Analytics
                </button>
             </div>
        </div>

        {activeTab === 'keys' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* COLUMN 1: TOOLS */}
                <div className="space-y-8">
                    
                    {/* NEW: MANUAL INSPECTOR */}
                    <div className="gateway-card rounded-2xl p-6 border border-blue-500/20 bg-[#080a10]">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <Database size={20} className="text-blue-400" /> Recuperação / Inspector
                        </h3>
                        <p className="text-gray-400 text-xs mb-4">
                            Busque dados brutos de qualquer chave na nuvem, mesmo se não estiver na lista.
                        </p>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Digite a chave (Ex: ADMIN-GROCHA013)..."
                                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none text-sm font-mono font-bold"
                                value={manualInspectKey}
                                onChange={(e) => setManualInspectKey(e.target.value)}
                            />
                            <button 
                                onClick={() => handleInspect(manualInspectKey)}
                                disabled={!manualInspectKey}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                            >
                                <Search size={20} />
                            </button>
                        </div>
                    </div>

                    {/* KEY GENERATOR */}
                    <div className="gateway-card rounded-2xl p-6 border border-indigo-500/20 bg-[#0a0614]">
                        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                            <Zap size={20} className="text-indigo-400" /> Gerador de Licenças
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase ml-1 mb-1 block">Nome do Cliente</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="Ex: João Silva"
                                    value={ownerNameInput}
                                    onChange={e => setOwnerNameInput(e.target.value)}
                                />
                            </div>

                            <div className="p-4 bg-black/40 rounded-xl border border-white/5 text-center relative group">
                                {generatedKey ? (
                                    <>
                                        <p className="font-mono text-xl font-bold text-white tracking-widest break-all">{generatedKey}</p>
                                        <div className="flex justify-center gap-2 mt-3">
                                            <button onClick={copyKey} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copiado' : 'Copiar'}
                                            </button>
                                            <button onClick={generateKey} className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                                                <RefreshCw size={12} /> Regenerar
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-4 text-gray-500 text-sm flex flex-col items-center gap-2 cursor-pointer hover:text-indigo-400 transition-colors" onClick={generateKey}>
                                        <Cpu size={24} />
                                        <span>Clique para gerar hash único</span>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={saveKey}
                                disabled={isSavingKey || !generatedKey}
                                className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 ${isSavingKey ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {isSavingKey ? <RefreshCw className="animate-spin" size={18} /> : <Database size={18} />}
                                {isSavingKey ? 'Salvando...' : 'REGISTRAR LICENÇA'}
                            </button>
                        </div>
                    </div>

                    {/* SYSTEM BROADCAST */}
                    <div className="gateway-card rounded-2xl p-6 border border-amber-500/20 bg-[#0f0a05]">
                        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
                            <Megaphone size={20} className="text-amber-400" /> Alerta Global (Privado)
                        </h3>
                        
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all placeholder:text-gray-600"
                                placeholder="Título do Alerta"
                                value={broadcastTitle}
                                onChange={e => setBroadcastTitle(e.target.value)}
                            />
                            <textarea 
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none transition-all placeholder:text-gray-600 resize-none h-24"
                                placeholder="Mensagem para o usuário..."
                                value={broadcastMsg}
                                onChange={e => setBroadcastMsg(e.target.value)}
                            />
                            <div className="flex gap-2">
                                <select 
                                    className="bg-black/40 border border-white/10 rounded-xl px-3 text-xs text-gray-400 focus:border-amber-500 outline-none max-w-[200px]"
                                    value={broadcastTarget}
                                    onChange={e => setBroadcastTarget(e.target.value)}
                                >
                                    <option value="ALL">📢 Todos (Global)</option>
                                    {onlineUsers.map((u, i) => (
                                        <option key={`${u.key}-${i}`} value={u.key}>
                                            🟢 {u.user} ({u.key.slice(0,6)}...)
                                        </option>
                                    ))}
                                </select>
                                <div className="flex-1 flex flex-col gap-1">
                                    <button 
                                        onClick={sendBroadcast}
                                        disabled={isSendingBroadcast}
                                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSendingBroadcast ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                                        ENVIAR
                                    </button>
                                </div>
                            </div>
                            
                            {/* Visual Confirmation Label */}
                            <div className={`text-[10px] font-bold mt-1 px-2 py-1 rounded border ${
                                recipientName 
                                    ? 'bg-amber-900/20 text-amber-300 border-amber-500/20' 
                                    : 'bg-indigo-900/20 text-indigo-300 border-indigo-500/20'
                            }`}>
                                {recipientName 
                                    ? `🔒 CONFIRMAÇÃO: Enviando privadamente para "${recipientName}"`
                                    : '📢 CONFIRMAÇÃO: Enviando para toda a rede (Global)'
                                }
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2 & 3: KEYS LIST */}
                <div className="xl:col-span-2 gateway-card rounded-2xl p-6 border border-white/10 bg-[#05030a] flex flex-col h-[800px]">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <List size={20} className="text-gray-400" /> Base de Usuários
                            </h3>
                            <span className="bg-white/10 text-white text-xs px-2 py-0.5 rounded-full font-bold">{keysList.length}</span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar chave ou nome..." 
                                className="bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none w-64"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {isLoadingKeys ? (
                            <div className="flex items-center justify-center h-40">
                                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                            </div>
                        ) : (
                            filteredKeys.map(key => (
                                <div key={key.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-indigo-500/30 transition-all group flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-lg ${key.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            <Power size={18} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-white text-sm">{key.owner_name}</h4>
                                                {key.is_admin && <span className="bg-amber-500/20 text-amber-400 text-[9px] px-1.5 py-0.5 rounded border border-amber-500/30 font-bold uppercase">Admin</span>}
                                            </div>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">{key.key}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {key.hwid ? (
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500" title="Dispositivo Vinculado">
                                                <MonitorOff size={12} /> <span className="hidden sm:inline">HWID OK</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-[10px] text-amber-500" title="Sem vínculo">
                                                <WifiOff size={12} /> <span className="hidden sm:inline">LIVRE</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex gap-1">
                                            {/* BUTTON INSPECT */}
                                            <button 
                                                onClick={() => handleInspect(key.key)}
                                                className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all"
                                                title="Inspecionar Backup (Ver Dados)"
                                            >
                                                <Eye size={14} />
                                            </button>

                                            <button 
                                                onClick={() => toggleStatus(key.id, key.active)}
                                                className={`p-2 rounded-lg border transition-all ${key.active ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 hover:text-emerald-400'}`}
                                                title={key.active ? "Desativar" : "Ativar"}
                                            >
                                                <Power size={14} />
                                            </button>
                                            
                                            <button 
                                                onClick={() => resetHWID(key.id)}
                                                className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
                                                title="Resetar HWID (Desvincular Dispositivo)"
                                            >
                                                <RotateCcw size={14} />
                                            </button>

                                            <button 
                                                onClick={() => deleteKey(key.id)}
                                                className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/30 transition-all"
                                                title="Excluir Chave"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* --- MODAL INSPECTOR --- */}
        {inspectModalOpen && (
            <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-[#0f0a1e] border border-blue-500/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-6 shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Database size={24} className="text-blue-400" /> Inspetor de Backup
                            </h3>
                            <p className="text-sm text-gray-400">Visualização direta dos dados na nuvem.</p>
                        </div>
                        <button onClick={() => setInspectModalOpen(false)} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-xs text-gray-300">
                        {isLoadingInspect ? (
                            <div className="flex items-center justify-center h-40">
                                <RefreshCw className="animate-spin text-blue-500 mr-2" /> Carregando backup...
                            </div>
                        ) : inspectedData ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                                        <p className="text-[10px] text-blue-300 font-bold uppercase">Última Sincronização</p>
                                        <p className="text-white font-bold">{new Date(inspectedData.updated_at).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                                        <p className="text-[10px] text-emerald-300 font-bold uppercase">Resumo Financeiro</p>
                                        <p className="text-white font-bold">Invest: {formatarBRL(inspectedData.stats.totalInvest)} | Lucro: {formatarBRL(inspectedData.stats.totalProfit)}</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">JSON RAW PREVIEW (Topo)</p>
                                    <pre className="whitespace-pre-wrap break-all text-[10px] text-gray-400 leading-relaxed max-h-60 overflow-hidden relative">
                                        {JSON.stringify(inspectedData.data, null, 2).slice(0, 1500)}...
                                        <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-black/80 to-transparent"></div>
                                    </pre>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500">Dados indisponíveis.</p>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-end gap-3 shrink-0">
                        <button 
                            onClick={() => setInspectModalOpen(false)}
                            className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                        >
                            Fechar
                        </button>
                        <button 
                            onClick={handleDownloadBackup}
                            disabled={!inspectedData}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download size={16} /> Baixar JSON de Segurança
                        </button>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'monitor' && (
            <div className="grid grid-cols-1 gap-8 animate-slide-in-right">
                <div className="gateway-card rounded-2xl p-8 border border-emerald-500/20 bg-[#030504] relative overflow-hidden min-h-[600px]">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <div>
                            <h3 className="text-white font-bold text-xl flex items-center gap-2">
                                <Globe size={24} className="text-emerald-400" /> Rede Neural (Realtime)
                            </h3>
                            <div className="flex items-center gap-3 mt-1">
                                <p className="text-gray-400 text-sm flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                    {connectionStatus === 'CONNECTED' ? 'Conexão Estabelecida' : 'Desconectado'}
                                </p>
                                {/* BOTÃO DE REFRESH ADICIONADO AQUI */}
                                <button 
                                    onClick={connectRealtime}
                                    className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors border border-white/5"
                                    title="Forçar Reconexão"
                                >
                                    <RefreshCw size={12} className={connectionStatus === 'CONNECTING' ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-4xl font-black text-white">{onlineUsers.length}</span>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Usuários Online</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
                        {onlineUsers.map((user, i) => (
                            <div key={i} className="bg-white/[0.02] border border-white/5 rounded-xl p-4 hover:border-emerald-500/30 transition-all group animate-fade-in">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center border border-white/10 shadow-lg">
                                        <User size={20} className="text-gray-300" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h4 className="text-white font-bold text-sm truncate">{user.user}</h4>
                                        <p className="text-[10px] text-gray-500 truncate font-mono">{user.key}</p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center text-[10px] text-gray-600 border-t border-white/5 pt-2">
                                    <span className="flex items-center gap-1">
                                        <Cpu size={10} /> {user.device_id.substring(0, 8)}
                                    </span>
                                    <span className="text-emerald-500/70 font-bold">{new Date(user.online_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Background Map Effect */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #10b981 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                </div>
            </div>
        )}

        {activeTab === 'store' && (
            <div className="grid grid-cols-1 gap-8 animate-slide-in-right">
                <div className="gateway-card rounded-2xl p-8 border border-pink-500/20 bg-[#0a0508] min-h-[600px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-white font-bold text-xl flex items-center gap-2">
                                <ShoppingBag size={24} className="text-pink-400" /> Analytics da Loja
                            </h3>
                            <p className="text-gray-400 text-sm mt-1">Produtos mais acessados pelos usuários.</p>
                        </div>
                        <button 
                            onClick={fetchStoreAnalytics}
                            className="bg-white/5 p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        >
                            <RefreshCw size={18} className={isLoadingAnalytics ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-white/5 text-pink-300 uppercase text-xs font-bold">
                                <tr>
                                    <th className="px-6 py-4 rounded-tl-xl">Produto</th>
                                    <th className="px-6 py-4 text-center">Cliques / Acessos</th>
                                    <th className="px-6 py-4 text-right rounded-tr-xl">Último Acesso</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoadingAnalytics ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center">
                                            <RefreshCw className="animate-spin inline-block mr-2" /> Carregando dados...
                                        </td>
                                    </tr>
                                ) : storeAnalytics.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-8 text-center text-gray-600">
                                            Nenhum dado de acesso registrado ainda.
                                        </td>
                                    </tr>
                                ) : (
                                    storeAnalytics.map((item, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02]">
                                            <td className="px-6 py-4 font-bold text-white">{item.product_name}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="bg-pink-500/10 text-pink-400 px-2 py-1 rounded font-mono font-bold border border-pink-500/20">
                                                    {item.count}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-xs">
                                                {new Date(item.last_click).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
export default Admin;
