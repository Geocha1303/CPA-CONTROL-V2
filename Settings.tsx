import React, { useRef, useState, useEffect } from 'react';
import { AppState } from '../types';
import { supabase } from '../supabaseClient';
import { Save, AlertTriangle, Settings as SettingsIcon, Download, Upload, FileJson, ShieldCheck, Trash2, User, Key, Copy, Check, Database, CloudUpload, RefreshCw, Power, Search, List } from 'lucide-react';

interface Props {
  state: AppState;
  updateState: (s: Partial<AppState>) => void;
  notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface AccessKeyData {
    id: number;
    created_at: string;
    key: string;
    owner_name: string;
    active: boolean;
    is_admin: boolean;
}

const Settings: React.FC<Props> = ({ state, updateState, notify }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // States do Gerador
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [ownerNameInput, setOwnerNameInput] = useState('');

  // States da Lista de Gestão
  const [keysList, setKeysList] = useState<AccessKeyData[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- EFEITOS ---
  useEffect(() => {
      fetchKeys();
  }, []);

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

  // --- FUNÇÕES DO SUPABASE (CRUD) ---

  const fetchKeys = async () => {
      setIsLoadingKeys(true);
      try {
          const { data, error } = await supabase
            .from('access_keys')
            .select('*')
            .order('id', { ascending: false }); // Ordena pelas mais recentes

          if (error) throw error;
          if (data) setKeysList(data);
      } catch (err: any) {
          console.error("Erro ao buscar chaves:", err);
          // Não notifica erro de conexão silencioso para não spammar, apenas loga
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
          
          // Atualiza localmente para parecer instantâneo
          setKeysList(prev => prev.map(k => k.id === id ? { ...k, active: !currentStatus } : k));
          notify(currentStatus ? 'Chave DESATIVADA.' : 'Chave ATIVADA.', 'info');
      } catch (err: any) {
          notify(`Erro ao atualizar: ${err.message}`, 'error');
      }
  };

  const deleteKey = async (id: number) => {
      if (!confirm('Tem certeza? Essa chave será excluída permanentemente.')) return;

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
                    owner_name: ownerNameInput || 'Cliente Novo'
                }
            ]);

          if (error) throw error;
          
          notify('Chave registrada com sucesso!', 'success');
          setGeneratedKey(''); 
          setOwnerNameInput('');
          fetchKeys(); // Atualiza a lista imediatamente

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

  // Filtro da lista
  const filteredKeys = keysList.filter(k => 
      k.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      k.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
        <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center p-4 bg-violet-500/10 rounded-full mb-4 border border-violet-500/20">
                <SettingsIcon size={40} className="text-violet-400" />
            </div>
            <h2 className="text-3xl font-bold text-white">Configurações do Sistema</h2>
            <p className="text-gray-400 mt-2">Gerencie parâmetros financeiros e segurança dos dados.</p>
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

                {/* Backup */}
                <div className="glass-card rounded-2xl overflow-hidden border border-emerald-500/20 h-fit">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-900/20 to-transparent">
                        <h3 className="font-bold text-emerald-400 flex items-center gap-2"><ShieldCheck size={20} /> Cofre de Dados</h3>
                    </div>
                    <div className="p-6 space-y-4">
                        <button onClick={handleExportData} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3">
                            <FileJson size={20} /> BAIXAR DADOS
                        </button>
                        <input type="file" accept=".json" ref={fileInputRef} style={{display: 'none'}} onChange={handleImportData} />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-3">
                            <Upload size={20} /> RESTAURAR
                        </button>
                    </div>
                </div>
            </div>

            {/* Coluna 2: GESTÃO DE CHAVES */}
            <div className="space-y-8">
                
                {/* 1. GERADOR */}
                <div className="glass-card rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5">
                    <div className="p-6 border-b border-amber-500/10">
                        <h3 className="font-bold text-amber-400 flex items-center gap-2">
                            <Key size={18} /> Gerador de Chaves (Novo Cliente)
                        </h3>
                    </div>
                    <div className="p-6">
                         <div className="mb-4">
                            <label className="text-xs text-gray-500 font-bold uppercase mb-1 block">Nome do Cliente / Usuário</label>
                            <input type="text" value={ownerNameInput} onChange={(e) => setOwnerNameInput(e.target.value)}
                                className="w-full bg-black/40 border border-amber-500/20 rounded-lg p-2 text-white font-medium focus:border-amber-500 outline-none" placeholder="Ex: Cliente VIP 01" />
                        </div>
                        <div className="flex gap-2 mb-4">
                            <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white font-mono text-center font-bold tracking-widest text-lg select-all">
                                {generatedKey || '---- ---- ----'}
                            </div>
                            <button onClick={handleCopyGenerated} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 p-3 rounded-xl transition-colors" disabled={!generatedKey}>
                                {copied ? <Check size={20} /> : <Copy size={20} />}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={generateNewKey} className="w-full bg-black/40 hover:bg-black/60 text-white border border-white/10 font-bold py-3 rounded-xl transition-all">
                                GERAR CÓDIGO
                            </button>
                            <button onClick={saveKeyToSupabase} disabled={!generatedKey || isSavingKey} className={`w-full font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                                    !generatedKey ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/20' }`}>
                                {isSavingKey ? <RefreshCw className="animate-spin" size={18}/> : <CloudUpload size={18} />} SALVAR NO DB
                            </button>
                        </div>
                    </div>
                </div>

                {/* 2. LISTA DE GESTÃO */}
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5 flex flex-col h-[600px]">
                    <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                         <div>
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Database size={18} className="text-blue-400" /> Banco de Chaves
                            </h3>
                            <p className="text-[10px] text-gray-400 mt-1">Gerencie os acessos do sistema.</p>
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
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                        {filteredKeys.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-60">
                                <List size={40} className="mb-2" />
                                <p className="text-sm">Nenhuma chave encontrada</p>
                            </div>
                        ) : (
                            filteredKeys.map((item) => (
                                <div key={item.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 hover:border-white/10 transition-colors group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-white text-sm">{item.owner_name}</h4>
                                                {item.is_admin && <span className="text-[9px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/30">ADMIN</span>}
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase ${
                                                    item.active 
                                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                    : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                }`}>
                                                    {item.active ? 'Ativo' : 'Bloqueado'}
                                                </span>
                                            </div>
                                            <div 
                                                className="text-xs font-mono text-gray-400 mt-1 bg-black/30 px-2 py-1 rounded w-fit cursor-pointer hover:text-white hover:bg-black/50 transition-colors flex items-center gap-2"
                                                onClick={() => copyToClipboard(item.key)}
                                                title="Clique para copiar"
                                            >
                                                {item.key} <Copy size={10} />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                                        <button 
                                            onClick={() => toggleKeyStatus(item.id, item.active)}
                                            className={`flex-1 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                                                item.active 
                                                ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20' 
                                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                            }`}
                                        >
                                            <Power size={12} /> {item.active ? 'BLOQUEAR' : 'ATIVAR'}
                                        </button>
                                        <button 
                                            onClick={() => deleteKey(item.id)}
                                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-rose-400 rounded transition-colors"
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
        </div>
    </div>
  );
};

export default Settings;