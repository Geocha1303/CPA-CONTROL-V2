import React, { useRef } from 'react';
import { AppState } from '../types';
import { AlertTriangle, Settings as SettingsIcon, Download, Upload, FileJson, ShieldCheck, Trash2, User } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Settings: React.FC<Props> = ({ state, updateState, notify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- FUNÇÕES DE CONFIGURAÇÃO GLOBAL ---
  const handleConfigChange = (key: 'valorBonus' | 'taxaImposto', value: number) => {
    updateState({
        config: { ...state.config, [key]: value }
    });
  };

  const handleNameChange = (val: string) => {
    updateState({
        config: { ...state.config, userName: val }
    });
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
                            updateState(parsedData);
                            notify('Dados restaurados com sucesso!', 'success');
                        }
                    } else {
                        notify('Arquivo inválido.', 'error');
                    }
                }
            } catch (error) {
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
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Nome do Operador</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors"><User size={16} /></span>
                                <input type="text" value={state.config.userName || ''} placeholder="Ex: Seu Nome" onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Valor do Bônus CPA (R$)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">R$</span>
                                <input type="number" value={state.config.valorBonus} onChange={(e) => handleConfigChange('valorBonus', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Taxa de Imposto (%)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">%</span>
                                <input type="number" value={state.config.taxaImposto} onChange={(e) => handleConfigChange('taxaImposto', parseFloat(e.target.value) || 0)} step="0.01"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reset */}
                <div className="glass-card rounded-2xl overflow-hidden border border-rose-500/20 bg-rose-500/5">
                    <div className="p-6 border-b border-rose-500/10">
                        <h3 className="font-bold text-rose-400 flex items-center gap-2"><AlertTriangle size={18} /> Zona de Perigo</h3>
                    </div>
                    <div className="p-6">
                        <button onClick={handleClearData} className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                            <Trash2 size={18} /> Format Factory (Resetar Tudo)
                        </button>
                    </div>
                </div>
            </div>

            {/* Coluna 2: Backup */}
            <div className="space-y-8">
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
            </div>
        </div>
    </div>
  );
};

export default Settings;