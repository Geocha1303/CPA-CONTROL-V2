import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { SquadMember, AppState } from '../types';
import { Users, Eye, Activity, RefreshCw, AlertTriangle, Search, ShieldCheck, Link, Copy, UserCheck, Shield, Lock, ChevronRight, UserPlus, Info, Hash, Crown } from 'lucide-react';
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
          // Verificar se a chave do líder existe
          const { data: leaderExists, error: searchError } = await supabase
            .from('access_keys')
            .select('id')
            .eq('key', inputLeaderKey)
            .single();

          if (searchError || !leaderExists) {
              throw new Error("Chave do Líder não encontrada no sistema.");
          }

          // Atualizar meu registro
          const { error: updateError } = await supabase
            .from('access_keys')
            .update({ leader_key: inputLeaderKey })
            .eq('key', currentUserKey);

          if (updateError) throw updateError;

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

          if (error) throw error;
          
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
                <div className="p-4 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl shadow-lg shadow-indigo-900/30">
                    <ShieldCheck size={32} className="text-white" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Comando Squad</h2>
                    <p className="text-gray-400 text-sm font-medium">Gestão Hierárquica e Monitoramento</p>
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
                              Você é um Líder em Potencial
                          </h3>
                          <p className="text-gray-400 text-sm max-w-lg leading-relaxed">
                              Qualquer pessoa pode montar uma equipe. Basta compartilhar sua chave abaixo com seus amigos ou funcionários. Eles inserem na aba "Entrar em Equipe" e os dados deles aparecem aqui para você.
                          </p>
                      </div>

                      <div className="flex flex-col items-center md:items-end gap-3 z-10">
                          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                              Sua Chave de Líder
                          </span>
                          <div className="flex items-center gap-3">
                              <div className="text-3xl md:text-4xl font-black text-white font-mono tracking-wider drop-shadow-lg text-center md:text-right">
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
            <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex gap-2">
                <button 
                    onClick={() => setViewMode('leader')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'leader' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <Users size={16} /> Painel do Líder (Meus Funcionários)
                </button>
                <button 
                    onClick={() => setViewMode('member')}
                    className={`px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'member' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                >
                    <UserPlus size={16} /> Entrar em Equipe (Sou Funcionário)
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
                                Envie sua chave (acima) para os operadores e peça para eles conectarem na aba "Entrar em Equipe".
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                             {members.map(member => (
                                <div key={member.key} className="gateway-card rounded-2xl p-6 border border-white/5 hover:border-indigo-500/30 transition-all group relative">
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
                                        <div className={`p-2 rounded-lg ${member.last_update ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-800 text-gray-600'}`}>
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
                 <div className="gateway-card rounded-2xl p-8 border border-white/10 relative overflow-hidden">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Link size={20} className="text-emerald-400" /> Conectar ao Líder
                    </h3>

                    {myLeaderKey ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
                                <ShieldCheck size={32} />
                            </div>
                            <h4 className="font-bold text-white text-lg mb-1">Você está conectado!</h4>
                            <p className="text-sm text-gray-400 mb-6">Seus dados estão sendo enviados para o Líder:</p>
                            
                            <div className="bg-black/40 px-6 py-3 rounded-lg inline-block font-mono text-emerald-300 font-bold text-xl tracking-wider mb-6 border border-emerald-500/20">
                                {myLeaderKey}
                            </div>
                            
                            <div className="flex justify-center">
                                <button 
                                    onClick={handleUnlinkLeader}
                                    disabled={loadingAction}
                                    className="text-xs text-rose-400 hover:text-rose-300 underline decoration-rose-500/30 hover:decoration-rose-500 decoration-2 font-bold"
                                >
                                    {loadingAction ? 'Desconectando...' : 'Desconectar / Sair da Equipe'}
                                </button>
                            </div>

                             <div className="mt-6 pt-6 border-t border-white/5 text-[10px] text-gray-500 flex items-center justify-center gap-2">
                                <Lock size={10} /> Conexão Segura: Você NÃO tem acesso aos dados do Líder.
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 text-sm text-blue-200 flex gap-3">
                                <Info className="shrink-0 mt-0.5" size={18} />
                                <div>
                                    <strong>Como funciona:</strong>
                                    <p className="mt-1 text-blue-200/70">
                                        Ao digitar a chave do seu chefe abaixo, ele poderá ver suas vendas e lucros em tempo real. Você <strong>NÃO</strong> verá os dados dele.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block ml-1">Chave do Líder (Peça para ele)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Shield className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="Ex: CPA-XXXX-YYYY"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:border-emerald-500 outline-none transition-all font-mono uppercase"
                                            value={inputLeaderKey}
                                            onChange={e => setInputLeaderKey(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleLinkLeader}
                                        disabled={!inputLeaderKey || loadingAction}
                                        className={`px-6 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2
                                            ${!inputLeaderKey ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'}
                                        `}
                                    >
                                        {loadingAction ? <RefreshCw className="animate-spin" size={18} /> : <Link size={18} />}
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