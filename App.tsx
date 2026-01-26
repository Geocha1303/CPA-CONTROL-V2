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
  Cpu,
  Lock,
  User,
  Key,
  LogOut,
  ShieldCheck,
  Smartphone,
  Server,
  Globe,
  Database,
  Crown
} from 'lucide-react';
import { AppState, ViewType, Notification } from './types';
import { getHojeISO } from './utils';
import { supabase } from './supabaseClient';

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
  dreamGoals: [], 
  config: { valorBonus: 20.00, taxaImposto: 0.06, userName: 'OPERADOR' },
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
const AUTH_STORAGE_KEY = 'cpa_auth_session_v3_master'; // Updated Key
const DEVICE_ID_KEY = 'cpa_device_fingerprint';

// --- LOGIN COMPONENT V3 ---
const LoginScreen = ({ onLogin }: { onLogin: (key: string, isAdmin: boolean, ownerName: string) => void }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('Autenticar');
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        let storedId = localStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
            storedId = 'HWID-' + Math.random().toString(36).substring(2, 6).toUpperCase() + '-' + Date.now().toString(16).toUpperCase();
            localStorage.setItem(DEVICE_ID_KEY, storedId);
        }
        setDeviceId(storedId);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setStatusText('Verificando Credenciais...');
        
        const rawKey = inputKey.trim().toUpperCase();

        try {
            // Consulta Supabase
            const { data, error } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', rawKey)
                .single();

            if (error || !data) {
                await new Promise(resolve => setTimeout(resolve, 1500)); // Anti-brute force delay
                throw new Error('Chave de acesso inválida.');
            }

            if (data.active === false) {
                 throw new Error('Acesso suspenso pelo Administrador.');
            }

            setStatusText('Acesso Concedido');
            
            setTimeout(() => {
                localStorage.setItem(AUTH_STORAGE_KEY, rawKey);
                const isAdmin = data.is_admin === true;
                onLogin(rawKey, isAdmin, data.owner_name || 'Usuário');
            }, 800);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro de conexão.');
            setLoading(false);
            setStatusText('Falha na Autenticação');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#000000] relative overflow-hidden font-sans select-none">
            {/* Background Inspirado na Imagem (Azul Profundo/Preto) */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#0a0f1c] via-[#000000] to-[#050505]"></div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 opacity-50"></div>
            
            <div className="relative z-10 w-full max-w-md p-8 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#111827] border border-gray-800 mb-6 shadow-2xl relative group">
                        <Crown size={32} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight mb-2">CPA <span className="text-blue-500">MASTER</span></h1>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-bold tracking-[0.3em] uppercase text-gray-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        System V3.0 Online
                    </div>
                </div>

                <div className="bg-[#0f111a] border border-gray-800/50 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                    <form onSubmit={handleLogin} className="space-y-6 relative z-10">
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2 block">Chave de Licença</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Key size={16} className="text-gray-600" />
                                </div>
                                <input 
                                    type="text" 
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                    className="w-full bg-[#050505] border border-gray-800 rounded-xl py-3.5 pl-11 pr-4 text-white font-mono font-bold tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-800 text-center uppercase"
                                    placeholder="XXXX-XXXX-XXXX"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 text-rose-400 text-xs font-bold bg-rose-500/5 p-3 rounded-lg border border-rose-500/10 animate-fade-in">
                                <AlertCircle size={14} className="shrink-0" /> 
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.2)]
                                transition-all duration-300 transform active:scale-[0.98] 
                                uppercase tracking-wider text-xs flex justify-center items-center gap-2
                                ${loading ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={16}/> : <ShieldCheck size={16} />}
                            {statusText}
                        </button>
                    </form>
                </div>
                
                <p className="text-center text-[10px] text-gray-600 mt-8 font-mono">
                    ID: {deviceId} <br/> PROTECTED BY SUPABASE
                </p>
            </div>
        </div>
    );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserKey, setCurrentUserKey] = useState('');
  
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

  // --- BLINDAGEM DE CÓDIGO (ANTI-INSPEÇÃO) ---
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => { e.preventDefault(); return false; };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || (e.ctrlKey && e.key === 'u')) {
        e.preventDefault(); return false;
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Verifica ambiente e Login Persistente
  useEffect(() => {
      try { if (window.self !== window.top) setIsIframe(true); } catch (e) { setIsIframe(true); }
      if (!('showOpenFilePicker' in window)) setHasFileSystemSupport(false);

      const savedKey = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedKey) {
          setIsAuthenticated(true);
          setCurrentUserKey(savedKey);
          // Check simples de admin visual baseado no prefixo antigo ou lógica local, idealmente validaria com DB novamente
          if(savedKey.startsWith('ADMIN') || savedKey === 'ADMIN-GROCHA013') setIsAdmin(true);
      }
  }, []);

  // --- CARREGAMENTO INICIAL DADOS ---
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
    const handleBeforeUnload = () => { if (state) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  // --- LOGOUT ---
  const handleLogout = () => {
      if(confirm('Encerrar sessão segura?')) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setCurrentUserKey('');
      }
  };

  // --- DOWNLOAD MANUAL ---
  const handleManualDownload = () => {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const fileName = `CPA_MASTER_BKP_${new Date().toISOString().slice(0,10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', fileName);
      linkElement.click();
      notify("Dados exportados.", "success");
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
                      notify("Backup carregado.", "success");
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
    if (!hasFileSystemSupport) { legacyFileInputRef.current?.click(); return; }
    try {
        // @ts-ignore
        const [handle] = await window.showOpenFilePicker({
            types: [{ description: 'Banco de Dados (.json)', accept: { 'application/json': ['.json'] } }],
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
            } catch (e) { notify("Arquivo inválido.", "error"); }
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
    { id: 'planejamento', label: 'Planejamento IA', icon: Cpu },
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

  if (!isAuthenticated) {
      return <LoginScreen onLogin={(key, admin, owner) => { 
          setIsAuthenticated(true); 
          setIsAdmin(admin); 
          setCurrentUserKey(key); 
          if(owner) setState(prev => ({...prev, config: {...prev.config, userName: owner}}));
      }} />;
  }

  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-white">
      
      {/* Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`
            pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-lg shadow-2xl border backdrop-blur-md animate-slide-in-right min-w-[320px]
            ${n.type === 'success' ? 'bg-[#062c1a]/90 border-emerald-500/20 text-emerald-400' : 
              n.type === 'error' ? 'bg-[#2c0606]/90 border-rose-500/20 text-rose-400' : 
              'bg-[#06182c]/90 border-blue-500/20 text-blue-400'}
          `}>
            {n.type === 'success' && <CheckCircle2 size={18} />}
            {n.type === 'error' && <AlertCircle size={18} />}
            {n.type === 'info' && <Info size={18} />}
            <span className="text-xs font-bold tracking-wide font-mono">{n.message}</span>
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

      {/* SIDEBAR V3 */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#0a0a0a] border-r border-gray-800/50 transform transition-transform duration-300 ease-out flex flex-col justify-between
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
            <div className="flex items-center gap-4 mb-10 px-2">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-900/50">
                    <Zap size={20} fill="currentColor" />
                </div>
                <div>
                    <h1 className="font-black text-xl leading-none text-white tracking-tight">CPA <span className="text-blue-500">MASTER</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                         <span className="text-[9px] font-bold bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-wider">V3.0</span>
                         {isAdmin && <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1"><Crown size={8}/> ADMIN</span>}
                    </div>
                </div>
            </div>

            <nav className="space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setActiveView(item.id as ViewType); setMobileMenuOpen(false); }}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold transition-all duration-200 group relative
                                ${isActive 
                                    ? 'text-white bg-blue-600/10 border border-blue-600/20' 
                                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5 border border-transparent'
                                }
                            `}
                        >
                            <Icon size={18} className={`transition-colors ${isActive ? 'text-blue-500' : 'group-hover:text-gray-300'}`} />
                            <span className="tracking-wide">{item.label}</span>
                            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full"></div>}
                        </button>
                    );
                })}
            </nav>
        </div>

        <div className="p-6 border-t border-gray-800/50 bg-[#0c0c0c]">
            <input type="file" ref={legacyFileInputRef} style={{display: 'none'}} accept=".json" onChange={handleLegacyUpload} />

            <div className="flex gap-2 mb-3">
                <button 
                    onClick={handleManualDownload}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 py-2.5 rounded-lg text-xs font-bold transition-all"
                >
                    <Download size={14} /> DADOS
                </button>
                <button 
                    onClick={handleLogout}
                    className="w-10 flex items-center justify-center bg-gray-800 hover:bg-rose-900/30 hover:text-rose-400 text-gray-400 border border-gray-700 hover:border-rose-900/50 py-2.5 rounded-lg transition-all"
                >
                    <LogOut size={14} />
                </button>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-800 bg-black/40">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-2 h-2 rounded-full
                        ${saveStatus === 'saving' ? 'bg-blue-500 animate-pulse' : (saveStatus === 'error' ? 'bg-rose-500' : 'bg-emerald-500')}
                    `}></div>
                    <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">SYSTEM STATUS</p>
                        <p className={`text-[10px] font-bold truncate ${saveStatus === 'saving' ? 'text-blue-500' : 'text-gray-300'}`}>
                            {saveStatus === 'saving' ? 'SYNCING...' : 'ONLINE'}
                        </p>
                    </div>
                </div>
                {fileHandle && <Database size={12} className="text-blue-500" />}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#050505]">
        {/* Top Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 opacity-30"></div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#0a0a0a] z-10">
            <span className="font-black text-lg text-white">CPA <span className="text-blue-500">MASTER</span></span>
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