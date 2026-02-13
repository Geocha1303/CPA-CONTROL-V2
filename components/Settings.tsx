
import React, { useRef, useState } from 'react';
import { AppState, DayRecord } from '../types';
import { mergeDeep, LOCAL_STORAGE_KEY, AUTH_STORAGE_KEY, calculateDayMetrics, formatarBRL } from '../utils';
import { AlertTriangle, Settings as SettingsIcon, Download, Upload, FileJson, ShieldCheck, Trash2, User, ToggleLeft, ToggleRight, HelpCircle, Hash, PlayCircle, MessageCircle, CloudLightning, Eye, X, RefreshCw, Clock, CalendarDays, TrendingUp, ChevronDown, ChevronRight, Code } from 'lucide-react';
import { useStore } from '../store';
import { supabase } from '../supabaseClient';

interface Props {
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
  forcedState?: AppState;
}

const SUPPORT_NUMBER = "5528999876428"; 

const Settings: React.FC<Props> = ({ notify, forcedState }) => {
  const storeState = useStore();
  const state = forcedState || storeState;
  const updateState = useStore(s => s.updateState);
  const setAll = useStore(s => s.setAll);
  const resetStore = useStore(s => s.reset);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  
  // --- CLOUD INSPECTOR STATE ---
  const [showCloudInspector, setShowCloudInspector] = useState(false);
  const [cloudData, setCloudData] = useState<{timestamp: string, data: AppState} | null>(null);
  const [isLoadingCloudData, setIsLoadingCloudData] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false); // Toggle para JSON bruto

  const handleConfigChange = (key: 'valorBonus' | 'taxaImposto', value: number) => {
    updateState({ config: { ...state.config, [key]: value } });
  };

  const toggleManualMode = () => {
      const current = state.config.manualBonusMode || false;
      updateState({ config: { ...state.config, manualBonusMode: !current } });
  };

  const handleNameChange = (val: string) => {
    updateState({ config: { ...state.config, userName: val } });
  };

  const handleResetTutorial = () => {
      if(confirm("Deseja ver o guia de introdução novamente?")) {
          const currentState = useStore.getState();
          const newState = { ...currentState, onboarding: { ...currentState.onboarding, dismissed: false } };
          updateState({ onboarding: { ...state.onboarding, dismissed: false } });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
          notify("Tutorial reativado! O guia iniciará em instantes.", "success");
          setTimeout(() => window.location.reload(), 500);
      }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `CPA_PRO_Backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    notify('Download iniciado.', 'success');
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = event.target.files;
    if (files && files.length > 0) {
        fileReader.readAsText(files[0], "UTF-8");
        fileReader.onload = (e) => {
            const content = e.target?.result;
            try {
                if (typeof content === 'string') {
                    const parsedData = JSON.parse(content);
                    if (parsedData.dailyRecords && parsedData.config) {
                        if(confirm('Isso substituirá os dados atuais. Continuar?')) {
                            const newState = mergeDeep(state, parsedData);
                            useStore.getState().setAll(newState);
                            notify('Dados restaurados com sucesso!', 'success');
                        }
                    } else {
                        notify('Arquivo inválido.', 'error');
                    }
                }
            } catch (error) {
                console.error(error);
                notify('Erro ao ler o arquivo.', 'error');
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
    }
  };

  const handleClearData = () => {
    if (confirm('PERIGO: Isso apagará TODOS os seus registros locais. Tem certeza?')) {
        resetStore();
        notify('Sistema resetado com sucesso.', 'info');
    }
  };

  const handleForceBackup = async () => {
      const key = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!key) { notify('Erro: Chave de acesso não encontrada.', 'error'); return; }
      
      setIsBackingUp(true);
      notify('Iniciando teste de conexão e backup...', 'info');
      
      try {
          const { error } = await supabase.from('user_data').upsert({
              access_key: key,
              raw_json: state,
              updated_at: new Date().toISOString()
          }, { onConflict: 'access_key' });
          if (error) throw error;
          notify('✅ Conexão Verificada: Dados salvos na nuvem com sucesso!', 'success');
      } catch (e: any) {
          console.error(e);
          notify(`❌ Falha no Backup: ${e.message || 'Erro de conexão'}`, 'error');
      } finally {
          setIsBackingUp(false);
      }
  };

  const handleInspectCloud = async () => {
      const key = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!key) { notify("Erro: Sem chave de acesso.", "error"); return; }

      setIsLoadingCloudData(true);
      setShowCloudInspector(true);
      setCloudData(null);
      setShowRawJson(false);

      try {
          const { data, error } = await supabase
              .from('user_data')
              .select('raw_json, updated_at')
              .eq('access_key', key)
              .single();

          if (error) throw error;

          if (data) {
              setCloudData({
                  timestamp: data.updated_at,
                  data: data.raw_json as AppState
              });
          } else {
              notify("Nenhum dado encontrado na nuvem.", "info");
              setShowCloudInspector(false);
          }
      } catch (e: any) {
          notify("Erro ao buscar dados na nuvem.", "error");
          setShowCloudInspector(false);
      } finally {
          setIsLoadingCloudData(false);
      }
  };

  const handleOverwriteLocal = () => {
      if (!cloudData) return;
      if (confirm("PERIGO IRREVERSÍVEL:\n\nTem certeza que deseja substituir TUDO que está na sua tela agora pelos dados da nuvem?\n\nQualquer alteração local não salva será perdida para sempre.")) {
          setAll(cloudData.data);
          // CORREÇÃO: Força o salvamento local IMEDIATO, pois o auto-save pode estar travado
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudData.data));
          
          setShowCloudInspector(false);
          notify("Dados restaurados com sucesso!", "success");
          
          // Agendamento de backup de segurança
          const key = localStorage.getItem(AUTH_STORAGE_KEY);
          if (key) {
              notify("Sincronização de segurança agendada para 1 minuto.", "info");
              setTimeout(async () => {
                  try {
                      await supabase.from('user_data').upsert({
                          access_key: key,
                          raw_json: cloudData.data,
                          updated_at: new Date().toISOString()
                      }, { onConflict: 'access_key' });
                  } catch (e) { console.error("Erro no auto-save pós-restauração", e); }
              }, 60000);
          }
      }
  };

  const InfoTooltip = ({ text }: { text: string }) => (
      <div className="group relative ml-2 inline-flex">
          <HelpCircle size={14} className="text-gray-500 hover:text-white cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 border border-white/10 p-2 rounded-lg text-xs text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center shadow-xl">{text}</div>
      </div>
  );

  // Helper para renderizar resumo do backup
  const renderCloudSummary = () => {
      if (!cloudData) return null;
      const { data } = cloudData;
      const dates = Object.keys(data.dailyRecords || {}).sort().reverse().slice(0, 3);
      
      let totalProfit = 0;
      Object.values(data.dailyRecords || {}).forEach((day) => {
          const m = calculateDayMetrics(day as DayRecord, data.config?.valorBonus);
          totalProfit += m.lucro;
      });

      return (
          <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400"><User size={24} /></div>
                  <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold">Operador no Backup</p>
                      <h4 className="text-white font-bold text-lg flex items-center gap-2">
                          {data.config?.userName || 'Desconhecido'} 
                          <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">#{data.config?.userTag}</span>
                      </h4>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                      <p className="text-[10px] text-emerald-400/70 font-bold uppercase mb-1">Lucro Total Acumulado</p>
                      <p className="text-2xl font-bold text-emerald-400">{formatarBRL(totalProfit)}</p>
                  </div>
                  <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                      <p className="text-[10px] text-blue-400/70 font-bold uppercase mb-1 flex items-center gap-1"><CalendarDays size={10} /> Dias Registrados</p>
                      <p className="text-2xl font-bold text-blue-400">{Object.keys(data.dailyRecords || {}).length}</p>
                  </div>
              </div>

              <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2 ml-1">Últimos Registros (Preview)</p>
                  <div className="space-y-2">
                      {dates.map(date => {
                          const record = data.dailyRecords[date];
                          const metrics = calculateDayMetrics(record, data.config?.valorBonus);
                          return (
                              <div key={date} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5 text-sm">
                                  <div className="flex items-center gap-3">
                                      <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                                      <span className="text-gray-300 font-medium">{new Date(date).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="flex gap-4 text-xs font-mono">
                                      <span className="text-gray-500">Fat: {formatarBRL(metrics.ret)}</span>
                                      <span className={metrics.lucro >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                          {formatarBRL(metrics.lucro)}
                                      </span>
                                  </div>
                              </div>
                          );
                      })}
                      {dates.length === 0 && <p className="text-center text-gray-600 text-xs py-2">Sem registros diários no backup.</p>}
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-violet-500/10 rounded-full mb-4 border border-violet-500/20"><SettingsIcon size={40} className="text-violet-400" /></div>
            <h2 className="text-3xl font-bold text-white">Configurações do Sistema</h2>
            <p className="text-gray-400 mt-2">Gerencie parâmetros financeiros e backup de dados.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-6 border-b border-white/5 bg-white/5"><h3 className="font-bold text-white flex items-center gap-2"><SettingsIcon size={18} className="text-cyan-400" /> Parâmetros do Dashboard</h3></div>
                    <div className="p-6 space-y-6">
                        <div id="tour-settings-name"><label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Identidade do Operador</label><div className="flex gap-2"><div className="relative group flex-1"><span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors"><User size={16} /></span><input type="text" value={state.config.userName || ''} placeholder="Ex: Seu Nome" onChange={(e) => handleNameChange(e.target.value)} autoComplete="off" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" /></div><div className="bg-black/20 border border-white/10 rounded-xl px-4 flex items-center justify-center min-w-[80px]" title="Sua TAG única"><span className="text-gray-500 font-mono text-sm mr-1">#</span><span className="text-cyan-400 font-mono font-bold text-lg">{state.config.userTag || '----'}</span></div></div><p className="text-[10px] text-gray-500 mt-2">Sua TAG é gerada automaticamente e serve para te identificar no Squad.</p></div>
                        <div id="tour-settings-bonus-toggle" className="bg-white/5 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/10"><div className="flex items-center justify-between mb-2"><label className="text-sm font-bold text-white flex items-center">Modo Bônus Manual<InfoTooltip text="Ative para digitar o valor exato ganho (Ex: R$ 67,00) em vez de multiplicar ciclos." /></label><button onClick={toggleManualMode} className="text-emerald-400 transition-colors">{state.config.manualBonusMode ? <ToggleRight size={32} className="text-emerald-400"/> : <ToggleLeft size={32} className="text-gray-600"/>}</button></div><p className="text-xs text-gray-500 leading-relaxed">{state.config.manualBonusMode ? "ATIVADO: No Controle Diário, você digitará o valor monetário total ganho (ex: 67,00) e o sistema usará esse valor direto." : "DESATIVADO: O sistema multiplicará a quantidade de ciclos (telas) pelo valor base configurado abaixo."}</p></div>
                        <div id="tour-settings-bonus"><div className="mb-2"><label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{state.config.manualBonusMode ? 'Valor de Referência (Apenas Estimativa)' : 'Valor Base (Por Tela/Ciclo)'}</label><p className="text-[10px] text-gray-500 leading-relaxed">{state.config.manualBonusMode ? "Como o modo manual está ativo, este valor não afeta o cálculo final, servindo apenas para projeções." : "Soma do ganho (Baú + Gerente) para 1 tela. Ex: 10 Baú + 10 Gerente = 20. O sistema multiplicará isso pela quantidade de telas abertas."}</p></div><div className="relative group"><span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">R$</span><input type="number" value={state.config.valorBonus} onChange={(e) => handleConfigChange('valorBonus', parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" /></div></div>
                        <div id="tour-settings-tax"><label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Taxa de Imposto (%)</label><div className="relative group"><span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">%</span><input type="number" value={state.config.taxaImposto} onChange={(e) => handleConfigChange('taxaImposto', parseFloat(e.target.value) || 0)} step="0.01" className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" /></div></div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-6 border-b border-white/5 bg-white/5"><h3 className="font-bold text-gray-300 flex items-center gap-2"><AlertTriangle size={18} /> Sistema</h3></div>
                    <div className="p-6 space-y-3"><button onClick={handleResetTutorial} className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"><PlayCircle size={18} /> Reiniciar Tutorial (Tour)</button><button onClick={handleClearData} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"><Trash2 size={18} /> Format Factory (Resetar Tudo)</button></div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/20 h-fit shadow-2xl shadow-emerald-900/10">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-transparent"><h3 className="font-bold text-emerald-400 flex items-center gap-2"><ShieldCheck size={20} /> Cofre de Dados</h3><p className="text-xs text-gray-400 mt-1">Exportação e Importação de dados locais.</p></div>
                    <div className="p-8 space-y-6">
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><Download size={24} /></div>
                                <div><h4 className="font-bold text-white">Baixar Backup</h4><p className="text-xs text-gray-400">Salvar arquivo .JSON</p></div>
                            </div>
                            <button onClick={handleExportData} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3"><FileJson size={20} /> BAIXAR DADOS</button>
                        </div>
                        
                        <div className="h-px bg-white/5 w-full"></div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center gap-4 mb-1">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20"><CloudLightning size={24} /></div>
                                <div><h4 className="font-bold text-white">Nuvem & Sincronização</h4><p className="text-xs text-gray-400">Gestão avançada do servidor.</p></div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={handleForceBackup} disabled={isBackingUp} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-[10px] md:text-xs">
                                    {isBackingUp ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Upload size={16} />}
                                    FORÇAR BACKUP
                                </button>
                                <button onClick={handleInspectCloud} className="bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2 text-[10px] md:text-xs">
                                    <Eye size={16} /> INSPECIONAR NUVEM
                                </button>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 w-full"></div>
                        
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20"><Upload size={24} /></div>
                                <div><h4 className="font-bold text-white">Restaurar</h4><p className="text-xs text-gray-400">Carregar arquivo .JSON</p></div>
                            </div>
                            <input type="file" accept=".json" ref={fileInputRef} style={{display: 'none'}} onChange={handleImportData} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3"><Upload size={20} /> SELECIONAR ARQUIVO</button>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg shadow-emerald-500/10 relative group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    <div className="p-6 border-b border-white/5 relative z-10 flex justify-between items-center"><h3 className="font-bold text-emerald-400 flex items-center gap-2"><MessageCircle size={20} /> Central de Suporte</h3><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div></div>
                    <div className="p-6 text-center relative z-10">
                        <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm"><p className="text-base text-white font-bold mb-2 flex items-center justify-center gap-2"><AlertTriangle size={16} className="text-emerald-400" /> Encontrou algum BUG?</p><p className="text-xs text-gray-300 leading-relaxed font-medium">Entre em contato diretamente com o desenvolvedor para suporte prioritário.</p></div>
                        <a href={`https://wa.me/${SUPPORT_NUMBER}?text=Olá,%20encontrei%20um%20bug%20ou%20tenho%20uma%20dúvida%20sobre%20o%20CPA%20Gateway.`} target="_blank" rel="noreferrer" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 active:scale-95 group/btn"><MessageCircle size={20} className="group-hover/btn:scale-110 transition-transform" /> CHAMAR NO WHATSAPP</a>
                    </div>
                </div>
            </div>
        </div>

        {/* --- MODAL DE INSPEÇÃO DE NUVEM (ATUALIZADO) --- */}
        {showCloudInspector && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-[#0f0a1e] border border-blue-500/30 rounded-2xl w-full max-w-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-500"></div>
                    
                    <div className="flex justify-between items-start mb-4 shrink-0">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <CloudLightning size={24} className="text-blue-400" /> Inspetor de Nuvem
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <Clock size={12} />
                                {cloudData ? `Salvo em: ${new Date(cloudData.timestamp).toLocaleString()}` : 'Carregando...'}
                            </div>
                        </div>
                        <button onClick={() => setShowCloudInspector(false)} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-white/5"><X size={20}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar rounded-xl border border-white/5 bg-[#050505] p-1">
                        {isLoadingCloudData ? (
                            <div className="flex items-center justify-center h-40 text-blue-400">
                                <RefreshCw className="animate-spin mr-2" /> Recuperando dados do servidor...
                            </div>
                        ) : cloudData ? (
                            <div className="p-4">
                                {renderCloudSummary()}
                                
                                <div className="mt-6 border-t border-white/10 pt-4">
                                    <button 
                                        onClick={() => setShowRawJson(!showRawJson)} 
                                        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider mb-2"
                                    >
                                        <Code size={14} /> {showRawJson ? 'Ocultar Código Bruto' : 'Ver Código Bruto (JSON)'} 
                                        {showRawJson ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    
                                    {showRawJson && (
                                        <div className="bg-black/50 p-3 rounded-lg border border-white/5 overflow-hidden">
                                            <pre className="whitespace-pre-wrap break-all text-[10px] text-gray-500 font-mono leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
                                                {JSON.stringify(cloudData.data, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-10 text-center text-gray-500">Dados indisponíveis.</div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 bg-[#0f0a1e]">
                        <div className="flex items-center gap-2 text-[10px] text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20 w-full md:w-auto">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>Atenção: Restaurar substituirá os dados atuais.</span>
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button 
                                onClick={() => setShowCloudInspector(false)}
                                className="flex-1 md:flex-none px-4 py-3 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleOverwriteLocal}
                                disabled={!cloudData}
                                className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg text-xs font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download size={16} /> RESTAURAR ESTE BACKUP
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Settings;
