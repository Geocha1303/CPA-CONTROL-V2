
import React, { useRef } from 'react';
import { AppState } from '../types';
import { mergeDeep } from '../utils'; // Importado de utils
import { AlertTriangle, Settings as SettingsIcon, Download, Upload, FileJson, ShieldCheck, Trash2, User, ToggleLeft, ToggleRight, HelpCircle, Hash, PlayCircle, MessageCircle } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// --- CONFIGURE SEU NÚMERO AQUI (DDD + NÚMERO) ---
const SUPPORT_NUMBER = "5528999876428"; 

const Settings: React.FC<Props> = ({ state, updateState, notify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- FUNÇÕES DE CONFIGURAÇÃO GLOBAL ---
  const handleConfigChange = (key: 'valorBonus' | 'taxaImposto', value: number) => {
    updateState({
        config: { ...state.config, [key]: value }
    });
  };

  const toggleManualMode = () => {
      const current = state.config.manualBonusMode || false;
      updateState({
          config: { ...state.config, manualBonusMode: !current }
      });
  };

  const handleNameChange = (val: string) => {
    updateState({
        config: { ...state.config, userName: val }
    });
  };

  const handleResetTutorial = () => {
      if(confirm("Deseja ver o guia de introdução novamente?")) {
          // Reseta a flag 'dismissed' para false e recarrega a página para acionar o Tour
          updateState({
              onboarding: { ...state.onboarding, dismissed: false }
          });
          notify("Tutorial reativado! O guia iniciará em instantes.", "success");
          setTimeout(() => window.location.reload(), 1000);
      }
  };

  // --- FUNÇÕES DE BACKUP ---
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
                            updateState(newState);
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
        updateState({
            dailyRecords: {},
            generalExpenses: [],
            generator: { ...state.generator, plan: [], history: [] }
        });
        notify('Sistema resetado com sucesso.', 'info');
    }
  };

  const InfoTooltip = ({ text }: { text: string }) => (
      <div className="group relative ml-2 inline-flex">
          <HelpCircle size={14} className="text-gray-500 hover:text-white cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 border border-white/10 p-2 rounded-lg text-xs text-gray-300 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 text-center shadow-xl">
              {text}
          </div>
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-violet-500/10 rounded-full mb-4 border border-violet-500/20">
                <SettingsIcon size={40} className="text-violet-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Configurações do Sistema</h2>
            <p className="text-gray-400 mt-2">Gerencie parâmetros financeiros e backup de dados.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Coluna 1: Parâmetros e Reset */}
            <div className="space-y-8">
                {/* Parâmetros */}
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <SettingsIcon size={18} className="text-cyan-400" /> Parâmetros do Dashboard
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div id="tour-settings-name">
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Identidade do Operador</label>
                            <div className="flex gap-2">
                                <div className="relative group flex-1">
                                    <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors"><User size={16} /></span>
                                    <input 
                                        type="text" 
                                        value={state.config.userName || ''} 
                                        placeholder="Ex: Seu Nome" 
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        autoComplete="off" // ADICIONADO: Previne overlap
                                        className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" 
                                    />
                                </div>
                                {/* VISUALIZAÇÃO DA TAG */}
                                <div className="bg-black/20 border border-white/10 rounded-xl px-4 flex items-center justify-center min-w-[80px]" title="Sua TAG única">
                                    <span className="text-gray-500 font-mono text-sm mr-1">#</span>
                                    <span className="text-cyan-400 font-mono font-bold text-lg">{state.config.userTag || '----'}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2">Sua TAG é gerada automaticamente e serve para te identificar no Squad.</p>
                        </div>

                        {/* MODO BÔNUS MANUAL (TOGGLE) */}
                        <div id="tour-settings-bonus-toggle" className="bg-white/5 p-4 rounded-xl border border-white/5 transition-all hover:bg-white/10">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-bold text-white flex items-center">
                                    Modo Bônus Manual
                                    <InfoTooltip text="Ative para digitar o valor exato ganho (Ex: R$ 67,00) em vez de multiplicar ciclos." />
                                </label>
                                <button onClick={toggleManualMode} className="text-emerald-400 transition-colors">
                                    {state.config.manualBonusMode ? <ToggleRight size={32} className="text-emerald-400"/> : <ToggleLeft size={32} className="text-gray-600"/>}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">
                                {state.config.manualBonusMode 
                                    ? "ATIVADO: No Controle Diário, você digitará o valor monetário total ganho (ex: 67,00) e o sistema usará esse valor direto."
                                    : "DESATIVADO: O sistema multiplicará a quantidade de ciclos (telas) pelo valor base configurado abaixo."
                                }
                            </p>
                        </div>

                        <div id="tour-settings-bonus">
                            <div className="mb-2">
                                <label className="block text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">
                                    {state.config.manualBonusMode ? 'Valor de Referência (Apenas Estimativa)' : 'Valor Base (Por Tela/Ciclo)'}
                                </label>
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                    {state.config.manualBonusMode 
                                        ? "Como o modo manual está ativo, este valor não afeta o cálculo final, servindo apenas para projeções."
                                        : "Soma do ganho (Baú + Gerente) para 1 tela. Ex: 10 Baú + 10 Gerente = 20. O sistema multiplicará isso pela quantidade de telas abertas."}
                                </p>
                            </div>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">R$</span>
                                <input type="number" value={state.config.valorBonus} onChange={(e) => handleConfigChange('valorBonus', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" />
                            </div>
                        </div>

                        <div id="tour-settings-tax">
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Taxa de Imposto (%)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">%</span>
                                <input type="number" value={state.config.taxaImposto} onChange={(e) => handleConfigChange('taxaImposto', parseFloat(e.target.value) || 0)} step="0.01"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reset & Tutorial Reset */}
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h3 className="font-bold text-gray-300 flex items-center gap-2"><AlertTriangle size={18} /> Sistema</h3>
                    </div>
                    <div className="p-6 space-y-3">
                        <button onClick={handleResetTutorial} className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                            <PlayCircle size={18} /> Reiniciar Tutorial (Tour)
                        </button>
                        
                        <button onClick={handleClearData} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                            <Trash2 size={18} /> Format Factory (Resetar Tudo)
                        </button>
                    </div>
                </div>
            </div>

            {/* Coluna 2: Backup & Suporte */}
            <div className="space-y-8">
                
                {/* BACKUP CARD */}
                <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/20 h-fit shadow-2xl shadow-emerald-900/10">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-transparent">
                        <h3 className="font-bold text-emerald-400 flex items-center gap-2"><ShieldCheck size={20} /> Cofre de Dados</h3>
                        <p className="text-xs text-gray-400 mt-1">Exportação e Importação de dados locais.</p>
                    </div>
                    <div className="p-8 space-y-6">
                        {/* Download */}
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                                    <Download size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Baixar Backup</h4>
                                    <p className="text-xs text-gray-400">Salvar arquivo .JSON</p>
                                </div>
                            </div>
                            <button onClick={handleExportData} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3">
                                <FileJson size={20} /> BAIXAR DADOS
                            </button>
                        </div>
                        
                        <div className="h-px bg-white/5 w-full"></div>

                        {/* Upload */}
                        <div>
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20">
                                    <Upload size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white">Restaurar</h4>
                                    <p className="text-xs text-gray-400">Carregar arquivo .JSON</p>
                                </div>
                            </div>
                            <input type="file" accept=".json" ref={fileInputRef} style={{display: 'none'}} onChange={handleImportData} />
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3">
                                <Upload size={20} /> SELECIONAR ARQUIVO
                            </button>
                        </div>
                    </div>
                </div>

                {/* SUPORTE WHATSAPP CARD */}
                <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/30 shadow-lg shadow-emerald-500/10 relative group">
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-50 group-hover:opacity-80 transition-opacity"></div>
                    <div className="p-6 border-b border-white/5 relative z-10 flex justify-between items-center">
                        <h3 className="font-bold text-emerald-400 flex items-center gap-2">
                            <MessageCircle size={20} /> Central de Suporte
                        </h3>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    </div>
                    <div className="p-6 text-center relative z-10">
                        <div className="mb-6 bg-white/5 rounded-xl p-4 border border-white/10 backdrop-blur-sm">
                            <p className="text-base text-white font-bold mb-2 flex items-center justify-center gap-2">
                                <AlertTriangle size={16} className="text-emerald-400" />
                                Encontrou algum BUG?
                            </p>
                            <p className="text-xs text-gray-300 leading-relaxed font-medium">
                                Entre em contato diretamente com o desenvolvedor para suporte prioritário.
                            </p>
                        </div>
                        <a
                            href={`https://wa.me/${SUPPORT_NUMBER}?text=Olá,%20encontrei%20um%20bug%20ou%20tenho%20uma%20dúvida%20sobre%20o%20CPA%20Gateway.`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-4 rounded-xl shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 transform hover:-translate-y-1 active:scale-95 group/btn"
                        >
                            <MessageCircle size={20} className="group-hover/btn:scale-110 transition-transform" /> 
                            CHAMAR NO WHATSAPP
                        </a>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};

export default Settings;
