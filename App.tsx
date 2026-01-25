import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Receipt, 
  Target, 
  Settings as SettingsIcon, 
  Menu, 
  Box,
  CheckCircle2,
  AlertCircle,
  Info,
  Save,
  Zap,
  RefreshCw,
  HardDrive,
  FolderOpen,
  ExternalLink,
  Download,
  Upload,
  Cpu
} from 'lucide-react';
import { AppState, ViewType, Notification } from './types';
import { getHojeISO } from './utils';

// Components
import Dashboard from './components/Dashboard';
import Planning from './components/Planning';
import DailyControl from './components/DailyControl';
import Expenses from './components/Expenses';
import Settings from './components/Settings';
import Goals from './components/Goals';

// Initial State definition
const initialState: AppState = {
  dailyRecords: {},
  generalExpenses: [],
  monthlyGoals: {},
  dreamGoals: [], // Inicialização vazia
  config: { valorBonus: 20.00, taxaImposto: 0.06 },
  generator: {
    plan: [],
    totalAgentes: 2,
    jogadoresPorCiclo: 5,
    distribuicaoAgentes: {1: 5, 2: 5},
    params: { 
        testador: 40, cetico: 30, ambicioso: 20, viciado: 10, 
        minBaixo: 20, maxBaixo: 50, minAlto: 51, maxAlto: 150, alvo: 100 
    },
    lotWithdrawals: {},
    customLotSizes: {},
    history: []
  }
};

const mergeDeep = (target: any, source: any): any => {
    if (typeof target !== 'object' || target === null) return source !== undefined ? source : target;
    if (Array.isArray(target)) return Array.isArray(source) ? source : target;
    if (typeof source !== 'object' || source === null || Array.isArray(source)) return target;
    const output = { ...target };
    Object.keys(source).forEach(key => {
        if (target[key] !== undefined) output[key] = mergeDeep(target[key], source[key]);
        else output[key] = source[key];
    });
    return output;
};

const LOCAL_STORAGE_KEY = 'cpaControlV2_react_backup_auto';

function App() {
  const [state, setState] = useState<AppState>(initialState);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(getHojeISO());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Estados de Salvamento
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fileHandle, setFileHandle] = useState<any>(null); 
  const saveTimeoutRef = useRef<number | null>(null);
  const legacyFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [hasFileSystemSupport, setHasFileSystemSupport] = useState(true);

  // Verifica ambiente
  useEffect(() => {
      try {
          if (window.self !== window.top) setIsIframe(true);
      } catch (e) { setIsIframe(true); }
      if (!('showOpenFilePicker' in window)) setHasFileSystemSupport(false);
  }, []);

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                setState(prev => mergeDeep(initialState, parsed));
            }
        } catch (e) {
            notify("Erro ao recuperar sessão.", "error");
        }
    }
    setIsLoaded(true);
  }, []);

  // --- SAFETY NET ---
  useEffect(() => {
    const handleBeforeUnload = () => {
        if (state) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  // --- DOWNLOAD MANUAL ---
  const handleManualDownload = () => {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const fileName = `GATEWAY_BKP_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', fileName);
      linkElement.click();
      notify("Dados exportados com segurança.", "success");
  };

  // --- UPLOAD LEGADO ---
  const handleLegacyUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const content = e.target?.result;
              try {
                  if (typeof content === 'string') {
                      const parsed = JSON.parse(content);
                      setState(mergeDeep(initialState, parsed));
                      notify("Backup carregado com sucesso.", "success");
                  }
              } catch (err) {
                  notify("Arquivo corrompido.", "error");
              } finally {
                  if(legacyFileInputRef.current) legacyFileInputRef.current.value = '';
              }
          };
          reader.readAsText(files[0]);
      }
  };

  // --- FILE SYSTEM API ---
  const handleConnectFile = async () => {
    if (!hasFileSystemSupport) {
        legacyFileInputRef.current?.click();
        return;
    }
    try {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
            types: [{
                description: 'Banco de Dados (.json)',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false
        });
        setFileHandle(handle);
        const file = await handle.getFile();
        const content = await file.text();
        if (content) {
            try {
                const parsed = JSON.parse(content);
                setState(mergeDeep(initialState, parsed));
                notify("Sincronização ativa.", "success");
            } catch (e) {
                notify("Arquivo inválido.", "error");
            }
        }
    } catch (err: any) {
        if (err.name === 'AbortError') return;
        notify("Usando modo manual.", "info");
        legacyFileInputRef.current?.click();
    }
  };

  // --- AUTO-SAVE ---
  useEffect(() => {
    if (!isLoaded) return;
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = window.setTimeout(async () => {
        const jsonString = JSON.stringify(state, null, 2);
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
            if (fileHandle) {
                try {
                    const writable = await fileHandle.createWritable();
                    await writable.write(jsonString);
                    await writable.close();
                } catch (writeErr) {
                    setFileHandle(null);
                    notify("Conexão de arquivo perdida.", "error");
                }
            }
            setLastSaved(new Date());
            setTimeout(() => setSaveStatus('saved'), 600);
        } catch (e) {
            setSaveStatus('error');
        }
    }, 500);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [state, fileHandle, isLoaded]);

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const updateState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planejamento', label: 'Planejamento', icon: Cpu },
    { id: 'controle', label: 'Controle Diário', icon: CalendarDays },
    { id: 'despesas', label: 'Despesas', icon: Receipt },
    { id: 'metas', label: 'Metas e Sonhos', icon: Target },
    { id: 'configuracoes', label: 'Sistema', icon: SettingsIcon },
  ];

  const renderContent = () => {
    const props = { state, updateState, notify };
    switch (activeView) {
        case 'dashboard': return <Dashboard {...props} />;
        case 'planejamento': return <Planning {...props} navigateToDaily={(d) => { setCurrentDate(d); setActiveView('controle'); }} />;
        case 'controle': return <DailyControl {...props} currentDate={currentDate} setCurrentDate={setCurrentDate} />;
        case 'despesas': return <Expenses {...props} />;
        case 'configuracoes': return <Settings {...props} />;
        case 'metas': return <Goals {...props} />;
        default: return null;
    }
  };

  return (
    <div className="flex h-screen bg-background text-gray-100 overflow-hidden font-sans selection:bg-primary selection:text-white">
      
      {/* Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`
            pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-lg shadow-[0_0_20px_rgba(0,0,0,0.5)] border backdrop-blur-xl animate-slide-in-right min-w-[320px]
            ${n.type === 'success' ? 'bg-[#051c10]/90 border-emerald-500/30 text-emerald-400' : 
              n.type === 'error' ? 'bg-[#1c0505]/90 border-rose-500/30 text-rose-400' : 
              'bg-[#050b1c]/90 border-blue-500/30 text-blue-400'}
          `}>
            {n.type === 'success' && <CheckCircle2 size={18} />}
            {n.type === 'error' && <AlertCircle size={18} />}
            {n.type === 'info' && <Info size={18} />}
            <span className="text-sm font-bold tracking-wide font-mono">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* GATEWAY SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-surface/80 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-300 ease-out flex flex-col justify-between
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
            {/* Logo Area */}
            <div className="flex items-center gap-4 mb-12 px-2">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary blur opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-primary font-bold relative z-10 border border-primary/30">
                        <Zap size={22} fill="currentColor" />
                    </div>
                </div>
                <div>
                    <h1 className="font-black text-xl leading-none tracking-tight text-white mb-1">GATEWAY<span className="text-primary">.FY</span></h1>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${fileHandle ? 'bg-accent-cyan shadow-[0_0_8px_#00F0FF]' : 'bg-amber-500'} animate-pulse`}></div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                            {fileHandle ? 'SYNC_ACTIVE' : 'LOCAL_MEM'}
                        </span>
                    </div>
                </div>
            </div>

            <nav className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setActiveView(item.id as ViewType); setMobileMenuOpen(false); }}
                            className={`
                                w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm font-bold transition-all duration-300 group relative
                                ${isActive 
                                    ? 'text-white bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(112,0,255,0.15)]' 
                                    : 'text-gray-500 hover:text-white hover:bg-white/5 border border-transparent'
                                }
                            `}
                        >
                            <Icon size={18} className={`transition-colors ${isActive ? 'text-primary drop-shadow-[0_0_5px_rgba(112,0,255,0.8)]' : 'group-hover:text-primary-glow'}`} />
                            <span className="tracking-wide">{item.label}</span>
                            {isActive && <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_10px_#7000FF]"></div>}
                        </button>
                    );
                })}
            </nav>
        </div>

        {/* CONTROLS */}
        <div className="p-6 border-t border-white/5 bg-black/40 space-y-3 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute bottom-0 left-0 w-full h-20 bg-primary/5 blur-2xl pointer-events-none"></div>

            <input type="file" ref={legacyFileInputRef} style={{display: 'none'}} accept=".json" onChange={handleLegacyUpload} />

            <button 
                onClick={handleManualDownload}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-3 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-2 group font-mono"
            >
                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" /> BACKUP_DATA.JSON
            </button>

            {!fileHandle && (
                <button 
                    onClick={hasFileSystemSupport ? handleConnectFile : () => legacyFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary-glow border border-primary/20 py-2 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(112,0,255,0.2)] font-mono"
                >
                    {hasFileSystemSupport ? <FolderOpen size={14} /> : <Upload size={14} />}
                    {hasFileSystemSupport ? 'MOUNT_DRIVE' : 'LOAD_BACKUP'}
                </button>
            )}

            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/5 bg-black/60 relative z-10">
                <div className={`
                    w-6 h-6 rounded flex items-center justify-center
                    ${saveStatus === 'saving' ? 'text-primary' : (saveStatus === 'error' ? 'text-rose-500' : 'text-emerald-500')}
                `}>
                    {saveStatus === 'saving' ? <RefreshCw size={14} className="animate-spin" /> : 
                     saveStatus === 'error' ? <AlertCircle size={14} /> :
                     <Save size={14} />}
                </div>
                <div className="overflow-hidden">
                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest font-mono">STATUS</p>
                    <p className={`text-[10px] font-bold truncate ${saveStatus === 'saving' ? 'text-primary' : (saveStatus === 'error' ? 'text-rose-500' : 'text-emerald-500')}`}>
                        {saveStatus === 'saving' ? 'WRITING...' : (saveStatus === 'error' ? 'FAILED' : 'SECURE')}
                    </p>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none"></div>
        
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-surface/90 backdrop-blur-xl z-10">
            <span className="font-bold text-lg text-white font-mono">GATEWAY<span className="text-primary">.FY</span></span>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white">
                <Menu size={24} />
            </button>
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-8 relative z-0 custom-scrollbar">
            <div className="max-w-[1920px] mx-auto h-full">
                {renderContent()}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;