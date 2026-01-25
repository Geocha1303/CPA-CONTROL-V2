import React, { useRef } from 'react';
import { AppState } from '../types';
import { Save, AlertTriangle, Settings as SettingsIcon, Download, Upload, FileJson, ShieldCheck, Trash2 } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
}

const Settings: React.FC<Props> = ({ state, updateState }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfigChange = (key: 'valorBonus' | 'taxaImposto', value: number) => {
    updateState({
        config: { ...state.config, [key]: value }
    });
  };

  // Função para exportar dados (Backup)
  const handleExportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `CPA_Backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Função para importar dados (Restore)
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
                    // Validação simples
                    if (parsedData.dailyRecords && parsedData.config) {
                        if(confirm('Isso substituirá os dados atuais pelos do arquivo. Deseja continuar?')) {
                            updateState(parsedData);
                            alert('Dados restaurados com sucesso!');
                        }
                    } else {
                        alert('Arquivo inválido. Verifique se é um backup do CPA Control.');
                    }
                }
            } catch (error) {
                console.error(error);
                alert('Erro ao ler o arquivo de backup.');
            } finally {
                // Reset input so same file can be selected again
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
    }
  };

  const handleClearData = () => {
    if (confirm('PERIGO: Isso apagará TODOS os seus registros. Tem certeza absoluta?')) {
        updateState({
            dailyRecords: {},
            generalExpenses: [],
            generator: { ...state.generator, plan: [], history: [] }
        });
        alert('Sistema resetado com sucesso.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-10">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-violet-500/10 rounded-full mb-4 border border-violet-500/20">
                <SettingsIcon size={40} className="text-violet-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Configurações do Sistema</h2>
            <p className="text-gray-400 mt-2">Gerencie parâmetros financeiros e segurança dos dados.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Coluna 1: Parâmetros */}
            <div className="space-y-8">
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="p-6 border-b border-white/5 bg-white/5">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <SettingsIcon size={18} className="text-cyan-400" /> Parâmetros Financeiros
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Valor do Bônus CPA (R$)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">R$</span>
                                <input 
                                    type="number" 
                                    value={state.config.valorBonus}
                                    onChange={(e) => handleConfigChange('valorBonus', parseFloat(e.target.value) || 0)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Valor fixo pago pela plataforma por ciclo.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Taxa de Imposto (%)</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">%</span>
                                <input 
                                    type="number" 
                                    value={state.config.taxaImposto}
                                    onChange={(e) => handleConfigChange('taxaImposto', parseFloat(e.target.value) || 0)}
                                    step="0.01"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Use decimais (Ex: 0.06 para 6%).</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden border border-rose-500/20 bg-rose-500/5">
                    <div className="p-6 border-b border-rose-500/10">
                        <h3 className="font-bold text-rose-400 flex items-center gap-2">
                            <AlertTriangle size={18} /> Zona de Perigo
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-400 mb-6">
                            Ações abaixo são irreversíveis. Use com cautela.
                        </p>
                        <button 
                            onClick={handleClearData}
                            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Format Factory (Resetar Tudo)
                        </button>
                    </div>
                </div>
            </div>

            {/* Coluna 2: Backup & Segurança */}
            <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/20 shadow-2xl shadow-emerald-900/10 h-fit">
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-transparent">
                    <h3 className="font-bold text-emerald-400 flex items-center gap-2">
                        <ShieldCheck size={20} /> Cofre de Dados (Backup)
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Evite perder dados se limpar o navegador.</p>
                </div>
                
                <div className="p-8 space-y-8">
                    {/* Exportar */}
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                                <Download size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">Salvar Backup</h4>
                                <p className="text-sm text-gray-400">Baixe um arquivo .json com seus dados.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleExportData}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3"
                        >
                            <FileJson size={20} /> BAIXAR DADOS AGORA
                        </button>
                        <p className="text-xs text-gray-500 mt-3 text-center">Recomendado fazer diariamente após o fechamento.</p>
                    </div>

                    <div className="h-px bg-white/5 w-full"></div>

                    {/* Importar */}
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400 border border-violet-500/20">
                                <Upload size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">Restaurar Backup</h4>
                                <p className="text-sm text-gray-400">Recupere dados de um arquivo salvo.</p>
                            </div>
                        </div>
                        
                        <input 
                            type="file" 
                            accept=".json"
                            ref={fileInputRef}
                            style={{display: 'none'}}
                            onChange={handleImportData}
                        />
                        
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 hover:text-white"
                        >
                            <Upload size={20} /> SELECIONAR ARQUIVO
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Settings;