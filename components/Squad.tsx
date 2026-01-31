import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { SquadMember, AppState } from '../types';
import { Users, Eye, Activity, RefreshCw, AlertTriangle, Search, ShieldCheck, Link, Copy, UserCheck, Shield, Lock, ChevronRight, UserPlus, Info, Hash, Crown, Database } from 'lucide-react';
import { formatarBRL, getHojeISO, calculateDayMetrics } from '../utils';

interface Props {
  currentUserKey: string;
  onSpectate: (data: AppState, memberName: string) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Squad: React.FC<Props> = ({ currentUserKey, onSpectate, notify }) => {
  const [members, setMembers] = useState<SquadMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [loadingDataId, setLoadingDataId] = useState<string | null>(null);
  
  // States para Vincular Líder
  const [myLeaderKey, setMyLeaderKey] = useState<string>('');
  const [inputLeaderKey, setInputLeaderKey] = useState('');
  
  // State visual
  const [viewMode, setViewMode] = useState<'leader' | 'member'>('leader'); // Toggle visual

  const fetchSquadData = async () => {
      setLoading(true);
      try {
          // 1. Buscar meus dados (quem é meu líder?)
          const { data: myData, error: myError } = await supabase
            .from('access_keys')
            .select('leader_key')
            .eq('key', currentUserKey)
            .single();
            
          if (myData) {
              setMyLeaderKey(myData.leader_key || '');
              // Se eu tenho lider, provavelmente sou membro, mas posso ser lider tbm.
              if(myData.leader_key) setViewMode('member');
          }

          // 2. Buscar meus subordinados (quem tem EU como líder?)
          const { data: keys, error } = await supabase
              .from('access_keys')
              .select('key, owner_name')
              .eq('leader_key', currentUserKey);

          if (error) throw error;

          if (keys && keys.length > 0) {
              // 3. Buscar status de atualização E a TAG dentro do raw_json na tabela user_data
              const keysList = keys.map(k => k.key);
              const { data: userData } = await supabase
                  .from('user_data')
                  .select('access_key, updated_at, raw_json')
                  .in('access_key', keysList);

              const formattedMembers: SquadMember[] = keys.map(k => {
                  const uData = userData?.find(ud => ud.access_key === k.key);
                  const rawConfig = uData?.raw_json as AppState;
                  
                  // Tenta pegar a Tag do JSON, senão usa '0000'
                  const userTag = rawConfig?.config?.userTag || '????';

                  return {
                      key: k.key,
                      owner_name: k.owner_name || 'Operador',
                      user_tag: userTag,
                      last_update: uData?.updated_at || ''
                  };
              });

              setMembers(formattedMembers);
              // if(formattedMembers.length > 0) setViewMode('leader'); // Mantém o usuário na aba que ele escolheu
          } else {
              setMembers([]);
          }
      } catch (err: any) {
          // Silent fail for keys that don't exist in DB yet (Free keys)
          if(err.code !== 'PGRST116') { // PGRST116 = No rows returned
            console.error(err);
          }
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchSquadData();
  }, [currentUserKey]);

  const handleLinkLeader = async () => {
      if (!inputLeaderKey) return;
      if (inputLeaderKey === currentUserKey) {
          notify("Você não pode ser seu próprio líder.", "error");
          return;
      }

      setLoadingAction(true);
      try {
          // 1. Verificar se a chave do líder existe
          const { data: leaderExists, error: searchError } = await supabase
            .from('access_keys')
            .select('id')
            .eq('key', inputLeaderKey)
            .single();

          if (searchError || !leaderExists) {
              throw new Error("Chave do Líder não encontrada no sistema.");
          }

          // 2. Tenta atualizar. Se der erro de permissão (RLS), o try/catch pega.
          // Se o usuário 'Free' não existir no banco, o update retorna 0 linhas afetadas se não fizer upsert.
          
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
              console.error("Supabase Error:", upsertError);
              if (upsertError.code === '42501' || upsertError.message.includes('permission')) {
                  throw new Error("Erro de Permissão: Execute o código SQL no Supabase para liberar o Squad.");
              }
              throw upsertError;
          }

          notify(`Vinculado ao Líder ${inputLeaderKey} com sucesso!`, "success");
          setMyLeaderKey(inputLeaderKey);
          setInputLeaderKey('');
          setViewMode('member'); // Fica na aba de membro
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

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      notify("Copiado!", "info");
  };

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
                
                {/* LISTA DE FUNCIONÁRIOS */}
                <div>
                     <div className="flex items-center gap-3 mb-4 px-2">
                        <Users size={18} className="text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">Minha Equipe Ativa</h3>
                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs text-gray-300 font-mono">{members.length}</span>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {members.map(member => (
                                <div key={member.key} className="gateway-card rounded-2xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all group relative bg-[#0a0614]">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">{member.owner_name}</h3>
                                                <span className="bg-indigo-500/10 text-indigo-400 text-xs px-1.5 rounded font-mono font-bold">#{member.user_tag || '????'}</span>
                                            </div>
                                            <p className="text-[10px] font-mono text-gray-500 bg-black/30 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                                                {member.key}
                                            </p>
                                        </div>
                                        <div className={`p-2 rounded-lg ${member.last_update ? 'bg-emerald-500/10 text-emerald-400 animate-pulse-slow' : 'bg-gray-800 text-gray-600'}`}>
                                            <Activity size={18} />
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6 bg-black/20 p-3 rounded-lg border border-white/5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-gray-500 font-bold uppercase">Último Sync</span>
                                            <span className={`font-mono ${member.last_update ? 'text-emerald-400' : 'text-gray-600'}`}>
                                                {member.last_update ? new Date(member.last_update).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'S/ DADOS'}
                                            </span>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => handleSpectate(member)}
                                        disabled={loadingDataId === member.key || !member.last_update}
                                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg border
                                            ${!member.last_update 
                                                ? 'bg-gray-800 text-gray-600 border-transparent cursor-not-allowed' 
                                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500 shadow-indigo-900/20'}
                                        `}
                                    >
                                        {loadingDataId === member.key ? <RefreshCw className="animate-spin" size={14}/> : <Eye size={14} />}
                                        {loadingDataId === member.key ? 'CARREGANDO...' : 'VER PAINEL'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {viewMode === 'member' && (
            <div className="animate-slide-in-right max-w-2xl mx-auto">
                 <div className="gateway-card rounded-2xl p-8 border border-white/10 relative overflow-hidden bg-gradient-to-b from-[#0a0614] to-[#05030a]">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <Link size={200} />
                    </div>

                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                        <Link size={20} className="text-emerald-400" /> Estabelecer Vínculo
                    </h3>

                    {myLeaderKey ? (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-8 text-center relative z-10 backdrop-blur-sm">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                                <ShieldCheck size={40} />
                            </div>
                            <h4 className="font-bold text-white text-2xl mb-2">Vínculo Ativo!</h4>
                            <p className="text-sm text-gray-400 mb-8 max-w-xs mx-auto">
                                Seus dados estão sendo transmitidos em tempo real para o painel de comando.
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

                             <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-gray-500 flex items-center justify-center gap-2">
                                <Lock size={10} /> Conexão Criptografada: Acesso unidirecional.
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
                                        Ao se conectar, você autoriza que o dono da chave (seu líder) visualize seu progresso financeiro em tempo real. Você não terá acesso aos dados dele.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-3 block ml-1">Chave Mestra (Fornecida pelo Líder)</label>
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
            </div>
        )}
    </div>
  );
};

export default Squad;