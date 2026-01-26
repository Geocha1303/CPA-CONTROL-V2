import React, { useRef, useState } from 'react';
import { AppState } from '../types';
import { supabase } from '../supabaseClient';
import { Save, AlertTriangle, Settings as SettingsIcon, Download, Upload, FileJson, ShieldCheck, Trash2, User, Key, Copy, Check, Database, CloudUpload, RefreshCw } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const Settings: React.FC<Props> = ({ state, updateState, notify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [ownerNameInput, setOwnerNameInput] = useState('');

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

  // Gerador de Chaves para Venda
  const generateNewKey = () => {
      const prefix = "CPA";
      const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
      const newKey = `${prefix}-${part1}-${part2}`;
      setGeneratedKey(newKey);
      setCopied(false);
      setOwnerNameInput('');
  };

  const copyKeyToClipboard = () => {
      if(generatedKey) {
          navigator.clipboard.writeText(generatedKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          notify('Chave copiada!', 'info');
      }
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
                    owner_name: ownerNameInput || 'Cliente Novo'
                }
            ]);

          if (error) throw error;
          
          notify('Chave registrada no Banco de Dados com sucesso!', 'success');
          setGeneratedKey(''); // Limpa após salvar
          setOwnerNameInput('');

      } catch (err: any) {
          console.error("Supabase Error:", err);
          
          // Diagnóstico de erro detalhado para o usuário
          if (err.code === '42501' || err.message?.includes('permission')) {
             notify('ERRO DE PERMISSÃO (RLS): Verifique as Políticas do Supabase.', 'error');
             alert("ATENÇÃO ADMIN:\nO Supabase bloqueou a escrita. Você precisa ativar uma política 'INSERT' para 'ANON' na tabela 'access_keys' no painel do Supabase.");
          } else {
             notify(`Erro ao salvar: ${err.message || 'Desconhecido'}`, 'error');
          }
      } finally {
          setIsSavingKey(false);
      }
  };

  // Função para exportar dados (Backup)
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
                            notify('Dados restaurados com sucesso!', 'success');
                        }
                    } else {
                        notify('Arquivo inválido. Verifique se é um backup do CPA Control.', 'error');
                    }
                }
            } catch (error) {
                console.error(error);
                notify('Erro ao ler o arquivo de backup.', 'error');
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
        notify('Sistema resetado com sucesso.', 'info');
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
                            <SettingsIcon size={18} className="text-cyan-400" /> Parâmetros do Dashboard
                        </h3>
                    </div>
                    <div className="p-6 space-y-6">
                        
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Nome do Operador</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-cyan-400 transition-colors">
                                    <User size={16} />
                                </span>
                                <input 
                                    type="text" 
                                    value={state.config.userName || ''}
                                    placeholder="Ex: Seu Nome"
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white font-bold focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Este nome aparecerá na barra lateral.</p>
                        </div>

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

            {/* Coluna 2: Backup & Segurança & License Gen */}
            <div className="space-y-8">
                {/* BACKUP */}
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

                {/* LICENSE GENERATOR - ATUALIZADO V2 */}
                <div className="glass-card rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5">
                    <div className="p-6 border-b border-amber-500/10">
                        <h3 className="font-bold text-amber-400 flex items-center gap-2">
                            <Key size={18} /> Gerador de Chaves (Admin)
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-400 mb-4">
                            Gere uma chave única e salve no banco de dados para permitir o acesso de um novo usuário.
                        </p>
                        
                        {/* Nome do Cliente */}
                         <div className="mb-4">
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Nome do Cliente / Usuário</label>
                            <input 
                                type="text" 
                                value={ownerNameInput}
                                onChange={(e) => setOwnerNameInput(e.target.value)}
                                className="w-full bg-black/40 border border-amber-500/20 rounded-lg p-2 text-white font-medium focus:border-amber-500 outline-none"
                                placeholder="Ex: Cliente VIP 01"
                            />
                        </div>

                        {/* Display da Chave */}
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono text-center font-bold tracking-widest text-lg select-all">
                                {generatedKey || '---- ---- ----'}
                            </div>
                            <button 
                                onClick={copyKeyToClipboard}
                                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 p-3 rounded-xl transition-colors"
                                disabled={!generatedKey}
                                title="Copiar"
                            >
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={generateNewKey}
                                className="w-full bg-black/40 hover:bg-black/60 text-white border border-white/10 font-bold py-3 rounded-xl transition-all"
                            >
                                GERAR CÓDIGO
                            </button>
                            
                            <button 
                                onClick={saveKeyToSupabase}
                                disabled={!generatedKey || isSavingKey}
                                className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    !generatedKey ? 'bg-gray-700 text-gray-400 cursor-not-allowed' :
                                    'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/20'
                                }`}
                            >
                                {isSavingKey ? <RefreshCw className="animate-spin" size={18}/> : <CloudUpload size={18} />}
                                SALVAR NO DB
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