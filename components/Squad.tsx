import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { SquadMember, AppState } from '../types';
import { Users, Eye, Activity, RefreshCw, AlertTriangle, Search, ShieldCheck, Link, Copy, UserCheck, Shield, Lock, ChevronRight, UserPlus, Info, Hash, Crown, Database, MessageSquare, Bell, Send, CheckCircle2, TrendingUp, Trophy, Target, DollarSign, Trash2, Clock } from 'lucide-react';
import { formatarBRL, getHojeISO, calculateDayMetrics } from '../utils';

interface Props {
  currentUserKey: string;
  onSpectate: (data: AppState, memberName: string) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface FeedMessage {
    id: number;
    from: string;
    message: string;
    type: 'info' | 'success' | 'alert';
    timestamp: number;
}

interface MemberMetrics {
    profit: number;
    volume: number;
}

const Squad: React.FC<Props> = ({ currentUserKey, onSpectate, notify }) => {
  const [members, setMembers] = useState<(SquadMember & { metrics?: MemberMetrics })[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingDataId, setLoadingDataId] = useState<string | null>(null);
  
  // States para Vincular Líder
  const [myLeaderKey, setMyLeaderKey] = useState<string>('');
  const [inputLeaderKey, setInputLeaderKey] = useState('');
  
  // State visual
  const [viewMode, setViewMode] = useState<'leader' | 'member'>('leader'); 
  
  // --- WAR ROOM (LEADER FEED) ---
  // Inicializa o feed do localStorage para persistir F5
  const [feed, setFeed] = useState<FeedMessage[]>(() => {
      const saved = localStorage.getItem(`cpa_squad_feed_${currentUserKey}`);
      return saved ? JSON.parse(saved) : [];
  });
  const feedChannelRef = useRef<any>(null);

  // --- SQUAD GOALS (LOCAL STATE FOR LEADER) ---
  const [squadGoal, setSquadGoal] = useState<number>(() => {
      const saved = localStorage.getItem('cpa_squad_goal');
      return saved ? parseFloat(saved) : 5000;
  });

  // --- MEMBER UPLINK ---
  const [messageInput, setMessageInput] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Salva o feed sempre que ele mudar
  useEffect(() => {
      if (currentUserKey) {
          localStorage.setItem(`cpa_squad_feed_${currentUserKey}`, JSON.stringify(feed));
      }
  }, [feed, currentUserKey]);

  const fetchSquadData = async () => {
      setLoading(true);
      try {
          const { data: myData, error: myError } = await supabase
            .from('access_keys')
            .select('leader_key')
            .eq('key', currentUserKey)
            .single();
            
          if (myData) {
              setMyLeaderKey(myData.leader_key || '');
              if(myData.leader_key) setViewMode('member');
          }

          const { data: keys, error } = await supabase
              .from('access_keys')
              .select('key, owner_name')
              .eq('leader_key', currentUserKey);

          if (error) throw error;

          if (keys && keys.length > 0) {
              const keysList = keys.map(k => k.key);
              const { data: userData } = await supabase
                  .from('user_data')
                  .select('access_key, updated_at, raw_json')
                  .in('access_key', keysList);

              const formattedMembers: (SquadMember & { metrics?: MemberMetrics })[] = keys.map(k => {
                  const uData = userData?.find(ud => ud.access_key === k.key);
                  const rawConfig = uData?.raw_json as AppState;
                  const userTag = rawConfig?.config?.userTag || '????';
                  
                  // Calculate Metrics for Leaderboard (Today)
                  let metrics: MemberMetrics = { profit: 0, volume: 0 };
                  if (rawConfig && rawConfig.dailyRecords) {
                      const today = getHojeISO();
                      const dayData = rawConfig.dailyRecords[today];
                      const calc = calculateDayMetrics(dayData, rawConfig.config.valorBonus);
                      metrics = { profit: calc.lucro, volume: calc.ret };
                  }

                  return {
                      key: k.key,
                      owner_name: k.owner_name || 'Operador',
                      user_tag: userTag,
                      last_update: uData?.updated_at || '',
                      metrics
                  };
              });

              // Sort by Profit Descending
              formattedMembers.sort((a, b) => (b.metrics?.profit || 0) - (a.metrics?.profit || 0));

              setMembers(formattedMembers);
          } else {
              setMembers([]);
          }
      } catch (err: any) {
          if(err.code !== 'PGRST116') console.error(err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchSquadData();
      
      // --- SUBSCRIBE TO SQUAD CHANNEL (LEADER MODE) ---
      const channelName = `squad-room-${currentUserKey}`;
      if (feedChannelRef.current) supabase.removeChannel(feedChannelRef.current);
      const channel = supabase.channel(channelName);
      feedChannelRef.current = channel;

      channel
        .on('broadcast', { event: 'squad_msg' }, (payload) => {
            const msg = payload.payload as FeedMessage;
            setFeed(prev => {
                const newFeed = [{...msg, id: Date.now()}, ...prev];
                return newFeed.slice(0, 100); // Mantém apenas os últimos 100 logs para não pesar
            });
            
            // Som de notificação
            if(msg.type !== 'info') {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.2;
                audio.play().catch(()=>{});
            }
        })
        .subscribe();

      return () => {
          if(feedChannelRef.current) supabase.removeChannel(feedChannelRef.current);
      };

  }, [currentUserKey]);

  // --- ACTIONS ---

  const handleLinkLeader = async () => {
      if (!inputLeaderKey) return;
      if (inputLeaderKey === currentUserKey) {
          notify("Você não pode ser seu próprio líder.", "error");
          return;
      }

      setLoadingAction(true);
      try {
          const { data: leaderExists, error: searchError } = await supabase
            .from('access_keys')
            .select('id')
            .eq('key', inputLeaderKey)
            .single();

          if (searchError || !leaderExists) {
              throw new Error("Chave do Líder não encontrada no sistema.");
          }

          const { error: upsertError } = await supabase
            .from('access_keys')
            .upsert({ 
                key: currentUserKey, 
                leader_key: inputLeaderKey,
                owner_name: 'Visitante (Squad)',
                active: true,
                is_admin: false
            }, { onConflict: 'key' });

          if (upsertError) {
              if (upsertError.code === '42501' || upsertError.message.includes('permission')) {
                  throw new Error("Erro de Permissão: Execute o código SQL no Supabase para liberar o Squad.");
              }
              throw upsertError;
          }

          notify(`Vinculado ao Líder ${inputLeaderKey} com sucesso!`, "success");
          setMyLeaderKey(inputLeaderKey);
          setInputLeaderKey('');
          setViewMode('member'); 
      } catch (err: any) {
          notify(err.message, "error");
      } finally {
          setLoadingAction(false);
      }
  };

  const handleUnlinkLeader = async () => {
      if(!confirm("Tem certeza que deseja sair deste Squad? Seu líder perderá acesso aos seus dados.")) return;
      setLoadingAction(true);
      try {
          const { error } = await supabase
            .from('access_keys')
            .update({ leader_key: null })
            .eq('key', currentUserKey);

          if (error) {
               if (error.code === '42501') {
                  throw new Error("Erro de Permissão: Configure o Supabase para permitir updates.");
              }
              throw error;
          }
          
          setMyLeaderKey('');
          notify("Você saiu do Squad.", "info");
      } catch (err: any) {
          notify(err.message, "error");
      } finally {
          setLoadingAction(false);
      }
  };

  const handleSpectate = async (member: SquadMember) => {
      setLoadingDataId(member.key);
      try {
          const { data, error } = await supabase
              .from('user_data')
              .select('raw_json')
              .eq('access_key', member.key)
              .single();

          if (error || !data) {
              throw new Error("Dados não encontrados ou operador nunca sincronizou.");
          }

          onSpectate(data.raw_json as AppState, member.owner_name);
          notify(`MODO ESPECTADOR ATIVO: ${member.owner_name}`, "success");

      } catch (err: any) {
          notify(err.message, "error");
      } finally {
          setLoadingDataId(null);
      }
  };

  const handleClearFeed = () => {
      if(confirm('Limpar todo o histórico de notificações?')) {
          setFeed([]);
          localStorage.removeItem(`cpa_squad_feed_${currentUserKey}`);
      }
  };

  // --- MEMBER MESSAGING ---
  const sendMessageToLeader = async () => {
      if(!messageInput.trim() || !myLeaderKey) return;
      setIsSendingMsg(true);
      
      try {
          const channel = supabase.channel(`squad-room-${myLeaderKey}`);
          
          let myName = 'Membro';
          const localData = localStorage.getItem('cpaControlV2_react_backup_auto');
          if(localData) {
              const parsed = JSON.parse(localData);
              myName = parsed?.config?.userName || 'Membro';
          }

          const status = await new Promise((resolve) => {
              channel.subscribe((status) => {
                  if(status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') resolve(status);
              });
          });

          if(status === 'SUBSCRIBED') {
              await channel.send({
                  type: 'broadcast',
                  event: 'squad_msg',
                  payload: {
                      from: myName,
                      message: messageInput,
                      type: 'info',
                      timestamp: Date.now()
                  }
              });
              notify("Mensagem enviada.", "success");
              setMessageInput('');
              supabase.removeChannel(channel);
          } else {
              notify("Erro ao conectar com líder.", "error");
          }

      } catch(e) {
          console.error(e);
          notify("Falha no envio.", "error");
      } finally {
          setIsSendingMsg(false);
      }
  };

  const sendReportToLeader = async () => {
      if(!myLeaderKey) return;
      setIsSendingMsg(true);
      try {
          let message = "Relatório Diário: ";
          let type: 'info' | 'success' | 'alert' = 'info';
          
          const localData = localStorage.getItem('cpaControlV2_react_backup_auto');
          let myName = 'Membro';
          
          if(localData) {
              const parsed = JSON.parse(localData) as AppState;
              myName = parsed.config.userName || 'Membro';
              const today = getHojeISO();
              const metrics = calculateDayMetrics(parsed.dailyRecords[today], parsed.config.valorBonus);
              
              if(metrics.lucro > 1000) type = 'success';
              else if(metrics.lucro < 0) type = 'alert';
              
              message += `Lucro: ${formatarBRL(metrics.lucro)} | Vendas: ${formatarBRL(metrics.ret)}`;
          } else {
              message += "Sem dados locais.";
          }

          const channel = supabase.channel(`squad-room-${myLeaderKey}`);
          const status = await new Promise((resolve) => channel.subscribe(s => { if(s==='SUBSCRIBED') resolve(s); }));
          
          if(status === 'SUBSCRIBED') {
              await channel.send({
                  type: 'broadcast',
                  event: 'squad_msg',
                  payload: { from: myName, message, type, timestamp: Date.now() }
              });
              notify("Relatório enviado!", "success");
              supabase.removeChannel(channel);
          }
      } catch(e) {
          notify("Erro ao enviar reporte.", "error");
      } finally {
          setIsSendingMsg(false);
      }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      notify("Copiado!", "info");
  };

  const handleSquadGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value) || 0;
      setSquadGoal(val);
      localStorage.setItem('cpa_squad_goal', val.toString());
  };

  // --- CALCULATE TOTALS ---
  const teamTotalProfit = members.reduce((acc, m) => acc + (m.metrics?.profit || 0), 0);
  const teamTotalVolume = members.reduce((acc, m) => acc + (m.metrics?.volume || 0), 0);
  const teamProgress = squadGoal > 0 ? (teamTotalProfit / squadGoal) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pb-20">
        
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-8">
            <div className="flex items-center gap-4">
                <div className="p-4 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg shadow-indigo-900/30 border border-indigo-500/30">
                    <ShieldCheck size={32} className="text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Comando Squad</h2>
                    <p className="text-gray-400 text-sm font-medium">Centro de Operações Hierárquicas</p>
                </div>
            </div>
            <button 
                onClick={fetchSquadData}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all text-gray-400 hover:text-white"
                title="Atualizar"
            >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>

        {/* --- NOVO BANNER DE IDENTIDADE DE LÍDER --- */}
        <div className="mb-10">
            <div className="gateway-card rounded-3xl p-1 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-indigo-500/20 border border-white/10 shadow-2xl">
                 <div className="bg-[#0c0818] rounded-[22px] p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      {/* Efeito de Fundo */}
                      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none transform translate-x-10 -translate-y-10">
                          <Crown size={200} />
                      </div>

                      <div>
                          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                              <Crown size={24} className="text-amber-400 fill-amber-400/20" /> 
                              ID de Comandante
                          </h3>
                          <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                              Esta é sua credencial única. Para liderar, envie este código para seus subordinados. Eles devem inseri-lo na aba "Conexão".
                          </p>
                      </div>

                      <div className="flex flex-col items-center md:items-end gap-3 z-10">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                              Sua Chave de Acesso
                          </span>
                          <div className="flex items-center gap-3">
                              <div className="text-2xl md:text-4xl font-black text-white font-mono tracking-wider drop-shadow-lg text-center md:text-right bg-black/30 px-4 py-2 rounded-lg border border-white/10">
                                  {currentUserKey}
                              </div>
                              <button 
                                onClick={() => copyToClipboard(currentUserKey)}
                                className="p-3 bg-white/5 hover:bg-indigo-600 rounded-xl transition-all border border-white/10 text-gray-400 hover:text-white shadow-lg"
                                title="Copiar Chave"
                              >
                                  <Copy size={20} />
                              </button>
                          </div>
                      </div>
                 </div>
            </div>
        </div>

        {/* TOGGLE VISUAL */}
        <div className="flex justify-center mb-8">
            <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex gap-2 shadow-inner">
                <button 
                    onClick={() => setViewMode('leader')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'leader' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Users size={16} /> Painel do Líder (Meus Agentes)
                </button>
                <button 
                    onClick={() => setViewMode('member')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'member' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Link size={16} /> Conexão (Entrar em Equipe)
                </button>
            </div>
        </div>

        {viewMode === 'leader' && (
            <div className="animate-slide-in-right space-y-8">
                
                {/* --- MONITOR TÁTICO & METAS (NOVO) --- */}
                {members.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* KPI GERAL */}
                        <div className="lg:col-span-2 gateway-card rounded-2xl p-6 border border-emerald-500/20 bg-emerald-900/5 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <Target size={20} className="text-emerald-400" /> Meta do Esquadrão (Hoje)
                                    </h3>
                                    <p className="text-gray-400 text-xs">Soma do lucro líquido de todos os agentes.</p>
                                </div>
                                <div className="text-right">
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Definir Meta (R$)</label>
                                    <input 
                                        type="number" 
                                        className="bg-black/30 border border-emerald-500/30 rounded px-2 py-1 text-right text-emerald-400 font-mono font-bold w-32 focus:outline-none focus:border-emerald-400"
                                        value={squadGoal}
                                        onChange={handleSquadGoalChange}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-4xl font-black text-white font-mono">{formatarBRL(teamTotalProfit)}</span>
                                <span className="text-sm text-gray-400 font-bold mb-1">/ {formatarBRL(squadGoal)}</span>
                            </div>

                            <div className="w-full bg-black/40 h-4 rounded-full overflow-hidden border border-white/5">
                                <div 
                                    className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981] transition-all duration-1000 relative"
                                    style={{width: `${Math.min(teamProgress, 100)}%`}}
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        {/* VOLUME TOTAL */}
                        <div className="gateway-card rounded-2xl p-6 border border-indigo-500/20 bg-indigo-900/5 flex flex-col justify-center">
                            <h3 className="text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 mb-2">
                                <DollarSign size={14} className="text-indigo-400" /> Volume de Vendas Total
                            </h3>
                            <div className="text-3xl font-black text-white font-mono">{formatarBRL(teamTotalVolume)}</div>
                            <p className="text-xs text-indigo-300 mt-1">Acumulado da equipe hoje</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* COLUNA ESQUERDA: RANKING E LISTA (ATUALIZADO) */}
                    <div className="xl:col-span-2 space-y-6">
                         <div className="flex items-center gap-3 px-2">
                            <Trophy size={18} className="text-amber-400" />
                            <h3 className="text-lg font-bold text-white">Ranking Operacional</h3>
                        </div>

                        {members.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Users size={32} className="text-gray-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-500">Nenhum operador vinculado</h3>
                                <p className="text-sm text-gray-600 mt-2 max-w-sm mx-auto">
                                    Aguardando operadores se conectarem à sua chave.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                 {members.map((member, index) => (
                                    <div key={member.key} className="gateway-card rounded-xl p-4 border border-white/5 hover:border-indigo-500/30 transition-all group flex items-center justify-between bg-[#0a0614]">
                                        <div className="flex items-center gap-4">
                                            {/* RANK BADGE */}
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm
                                                ${index === 0 ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20' : 
                                                  index === 1 ? 'bg-gray-300 text-black' :
                                                  index === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 text-gray-500'}
                                            `}>
                                                {index + 1}
                                            </div>
                                            
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-white group-hover:text-indigo-300 transition-colors">{member.owner_name}</h3>
                                                    <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-1.5 rounded font-mono font-bold">#{member.user_tag || '????'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                                                    <span className={`font-bold ${member.last_update ? 'text-emerald-500' : 'text-gray-600'}`}>
                                                        {member.last_update ? 'ONLINE' : 'OFFLINE'}
                                                    </span>
                                                    <span>Sync: {member.last_update ? new Date(member.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-[9px] text-gray-500 uppercase font-bold">Lucro Hoje</p>
                                                <p className={`font-mono font-bold ${member.metrics && member.metrics.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {formatarBRL(member.metrics?.profit)}
                                                </p>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleSpectate(member)}
                                                disabled={loadingDataId === member.key || !member.last_update}
                                                className={`p-2 rounded-lg transition-all border
                                                    ${!member.last_update 
                                                        ? 'bg-gray-800 text-gray-600 border-transparent cursor-not-allowed' 
                                                        : 'bg-white/5 hover:bg-indigo-600 hover:text-white border-white/5 text-gray-400'}
                                                `}
                                                title="Espionar Painel"
                                            >
                                                {loadingDataId === member.key ? <RefreshCw className="animate-spin" size={16}/> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUNA DIREITA: LOG DE OPERAÇÕES (REDESENHADO) */}
                    <div className="gateway-card rounded-2xl flex flex-col h-[600px] border border-white/5 bg-[#030205] relative overflow-hidden">
                        <div className="p-4 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                <h3 className="text-xs font-bold text-white uppercase tracking-widest">Feed de Operações</h3>
                            </div>
                            {feed.length > 0 && (
                                <button onClick={handleClearFeed} className="text-[10px] text-gray-500 hover:text-rose-400 transition-colors flex items-center gap-1">
                                    <Trash2 size={12} /> Limpar
                                </button>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                            {feed.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                    <MessageSquare size={32} className="mb-2"/>
                                    <p className="text-xs">Aguardando notificações...</p>
                                </div>
                            ) : (
                                feed.map(msg => (
                                    <div key={msg.id} className="relative pl-4 animate-slide-in-right group">
                                        {/* Timeline Line */}
                                        <div className="absolute left-0 top-2 bottom-[-16px] w-[2px] bg-white/5 group-last:bottom-auto group-last:h-full"></div>
                                        
                                        {/* Icon Bubble */}
                                        <div className={`absolute left-[-5px] top-1 w-3 h-3 rounded-full border-2 border-[#030205] 
                                            ${msg.type === 'success' ? 'bg-emerald-500' : 
                                              msg.type === 'alert' ? 'bg-amber-500' : 'bg-indigo-500'}
                                        `}></div>

                                        <div className={`p-3 rounded-xl border transition-all hover:bg-white/[0.02]
                                            ${msg.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' : 
                                              msg.type === 'alert' ? 'bg-amber-500/5 border-amber-500/10' :
                                              'bg-indigo-500/5 border-indigo-500/10'}
                                        `}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    {msg.type === 'success' && <TrendingUp size={12} className="text-emerald-400" />}
                                                    {msg.type === 'alert' && <AlertTriangle size={12} className="text-amber-400" />}
                                                    {msg.type === 'info' && <MessageSquare size={12} className="text-indigo-400" />}
                                                    <span className="font-bold text-white text-xs">{msg.from}</span>
                                                </div>
                                                <span className="text-[9px] text-gray-500 flex items-center gap-1">
                                                    <Clock size={8} /> {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <p className={`text-xs leading-relaxed ${
                                                msg.type === 'success' ? 'text-emerald-200' :
                                                msg.type === 'alert' ? 'text-amber-200' : 'text-indigo-200'
                                            }`}>
                                                {msg.message}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'member' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in-right max-w-5xl mx-auto">
                 
                 {/* CARTÃO DE VÍNCULO */}
                 <div className="gateway-card rounded-2xl p-8 border border-white/10 relative overflow-hidden bg-gradient-to-b from-[#0a0614] to-[#05030a]">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <Link size={200} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                        <Link size={20} className="text-emerald-400" /> Status do Vínculo
                    </h3>

                    {myLeaderKey ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center relative z-10 backdrop-blur-sm">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <ShieldCheck size={40} />
                            </div>
                            <h4 className="font-bold text-white text-2xl mb-2">Conectado ao Comando</h4>
                            <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto">
                                Transmissão de dados segura ativa. O líder está recebendo suas atualizações.
                            </p>
                            
                            <div className="bg-black/60 px-6 py-4 rounded-xl inline-block font-mono text-emerald-300 font-bold text-xl tracking-wider mb-8 border border-emerald-500/30 shadow-inner">
                                {myLeaderKey}
                            </div>
                            
                            <div className="flex justify-center">
                                <button 
                                    onClick={handleUnlinkLeader}
                                    disabled={loadingAction}
                                    className="px-6 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    {loadingAction ? <RefreshCw className="animate-spin" size={12} /> : <AlertTriangle size={12} />}
                                    {loadingAction ? 'Desconectando...' : 'Abortar Conexão'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 relative z-10">
                            <div className="bg-blue-500/5 p-5 rounded-xl border border-blue-500/10 text-sm text-blue-200 flex gap-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg h-fit">
                                    <Info className="text-blue-400" size={20} />
                                </div>
                                <div>
                                    <strong className="text-blue-100 block mb-1">Instruções de Conexão:</strong>
                                    <p className="text-blue-200/60 leading-relaxed text-xs">
                                        Insira a chave fornecida pelo seu gestor para sincronizar seu painel com a central de comando.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block ml-1">Chave Mestra (Líder)</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 group">
                                        <Shield className="absolute left-4 top-4 text-gray-500 group-focus-within:text-emerald-400 transition-colors" size={20} />
                                        <input 
                                            type="text" 
                                            placeholder="Ex: CPA-XXXX-YYYY"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:border-emerald-500 outline-none transition-all font-mono uppercase font-bold text-lg shadow-inner focus:bg-emerald-500/5"
                                            value={inputLeaderKey}
                                            onChange={e => setInputLeaderKey(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleLinkLeader}
                                        disabled={!inputLeaderKey || loadingAction}
                                        className={`px-8 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]
                                            ${!inputLeaderKey ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}
                                        `}
                                    >
                                        {loadingAction ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
                                        CONECTAR
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                 </div>

                 {/* CANAL DE COMUNICAÇÃO (CHAT PARA LÍDER) */}
                 {myLeaderKey && (
                     <div className="gateway-card rounded-2xl p-8 border border-indigo-500/20 relative bg-indigo-900/5">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <MessageSquare size={20} className="text-indigo-400" /> Uplink Tático
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Mensagem Direta</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Preciso de mais verba..."
                                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                                        value={messageInput}
                                        onChange={e => setMessageInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && sendMessageToLeader()}
                                    />
                                    <button 
                                        onClick={sendMessageToLeader}
                                        disabled={isSendingMsg || !messageInput}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block">Ações Rápidas</label>
                                <button 
                                    onClick={sendReportToLeader}
                                    disabled={isSendingMsg}
                                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSendingMsg ? <RefreshCw className="animate-spin" size={16}/> : <TrendingUp size={16} />}
                                    REPORTAR RESULTADOS DO DIA
                                </button>
                            </div>
                        </div>
                     </div>
                 )}
            </div>
        )}
    </div>
  );
};

export default Squad;