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
  Server
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
const AUTH_STORAGE_KEY = 'cpa_auth_session_v2';
const DEVICE_ID_KEY = 'cpa_device_fingerprint';

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLogin }: { onLogin: (key: string, isAdmin: boolean, ownerName: string) => void }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [statusText, setStatusText] = useState('Conectar ao Servidor');
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        // Gera Fingerprint Único
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
        setStatusText('Verificando Chave...');
        
        const rawKey = inputKey.trim().toUpperCase();

        // --- MODO DE TESTE / ACESSO DE EMERGÊNCIA ---
        // Permite entrar sem configurar o Supabase
        if (rawKey === 'TESTE-ADMIN') {
             setStatusText('Modo de Teste Local...');
             setTimeout(() => {
                localStorage.setItem(AUTH_STORAGE_KEY, rawKey);
                onLogin(rawKey, true, 'Modo Teste');
             }, 800);
             return;
        }

        // Verificação de Segurança da Configuração
        // @ts-ignore
        const currentUrl = supabase.supabaseUrl;
        if (currentUrl.includes('seu-projeto-id') || currentUrl.includes('SUA_PROJECT_URL')) {
             setError('ERRO: Supabase não configurado. Use a chave "TESTE-ADMIN" para testar.');
             setLoading(false);
             setStatusText('Erro de Configuração');
             return;
        }

        try {
            // 1. Consulta ao Supabase
            const { data, error } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', rawKey)
                .single();

            if (error || !data) {
                // Mensagem amigável para erros comuns
                if (error && error.message && (error.message.includes('FetchError') || error.message.includes('Failed to fetch'))) {
                    throw new Error('Falha na conexão. Use "TESTE-ADMIN" se estiver testando.');
                }
                throw new Error('Chave inválida ou não encontrada.');
            }

            // 2. Verifica se está ativa
            if (data.active === false) {
                 throw new Error('Chave bloqueada pelo administrador.');
            }

            setStatusText('Autorizado. Carregando...');
            
            setTimeout(() => {
                localStorage.setItem(AUTH_STORAGE_KEY, rawKey);
                // Define Admin se a chave for a chave mestre (você pode criar uma flag no banco tb)
                const isAdmin = rawKey.startsWith('ADMIN-') || data.is_admin === true;
                onLogin(rawKey, isAdmin, data.owner_name || 'Usuário');
            }, 800);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro de conexão.');
            setLoading(false);
            setStatusText('Conectar ao Servidor');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#030014] relative overflow-hidden font-sans select-none">
            <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none"></div>
            
            <div className="relative z-10 w-full max-w-md p-8 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 mb-6 shadow-[0_0_40px_rgba(112,0,255,0.4)] relative">
                        <ShieldCheck size={40} className="text-primary" />
                        <div className="absolute inset-0 border border-white/10 rounded-2xl animate-pulse"></div>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2">CPA <span className="text-primary">PRO</span></h1>
                    <p className="text-gray-500 text-xs font-bold tracking-[0.3em] uppercase">Secure Access Gateway</p>
                </div>

                <div className="gateway-card p-8 rounded-2xl backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-slide-in-right"></div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3 block flex justify-between">
                                <span>Chave de Licença</span>
                                <span className="text-primary-glow/70 flex items-center gap-1"><Server size={10}/> ONLINE</span>
                            </label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white font-mono font-bold tracking-widest focus:border-primary focus:outline-none transition-all placeholder:text-gray-700 text-center"
                                    placeholder="XXXX-XXXX-XXXX"
                                    autoFocus
                                />
                            </div>
                            <p className="text-[9px] text-gray-600 text-center mt-2">Para testar, use: <span className="text-gray-400 font-mono">TESTE-ADMIN</span></p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 animate-fade-in">
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className={`w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/80 hover:to-violet-600/80 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(112,0,255,0.3)] transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wider text-sm flex justify-center items-center gap-2 ${loading ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {loading ? <RefreshCw className="animate-spin" size={18}/> : <Lock size={18} />}
                            {statusText}
                        </button>

                        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 font-mono mt-4 pt-4 border-t border-white/5">
                            <Smartphone size={12} />
                            <span>HWID: {deviceId}</span>
                        </div>
                    </form>
                </div>
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
    // Desabilita menu de contexto (Botão Direito)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Desabilita atalhos de desenvolvedor (F12, Ctrl+Shift+I, etc)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && e.key === 'I') || 
        (e.ctrlKey && e.shiftKey && e.key === 'J') || 
        (e.ctrlKey && e.key === 'u')
      ) {
        e.preventDefault();
        return false;
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
      try {
          if (window.self !== window.top) setIsIframe(true);
      } catch (e) { setIsIframe(true); }
      if (!('showOpenFilePicker' in window)) setHasFileSystemSupport(false);

      // Check LocalStorage for Auth
      const savedKey = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedKey) {
          // Revalida silentemente com Supabase se necessário, ou confia no local por enquanto
          // Para máxima segurança, deveria revalidar aqui.
          setIsAuthenticated(true);
          setCurrentUserKey(savedKey);
          // Assume admin se começar com ADMIN (simplificação visual)
          if(savedKey.startsWith('ADMIN') || savedKey === 'TESTE-ADMIN') setIsAdmin(true);
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
    const handleBeforeUnload = () => {
        if (state) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  // --- LOGOUT ---
  const handleLogout = () => {
      if(confirm('Deseja encerrar a sessão segura?')) {
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
      const fileName = `CPA_PRO_BKP_${new Date().toISOString().slice(0,10)}.json`;
      
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

  if (!isAuthenticated) {
      return <LoginScreen onLogin={(key, admin, owner) => { 
          setIsAuthenticated(true); 
          setIsAdmin(admin); 
          setCurrentUserKey(key); 
          // Atualiza nome se vier do banco
          if(owner) setState(prev => ({...prev, config: {...prev.config, userName: owner}}));
      }} />;
  }

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

      {/* CPA PRO SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-surface/80 backdrop-blur-2xl border-r border-white/5 transform transition-transform duration-300 ease-out flex flex-col justify-between
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
            {/* Logo Area */}
            <div className="flex items-center gap-4 mb-8 px-2">
                <div className="relative group">
                    <div className="absolute inset-0 bg-primary blur opacity-50 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></div>
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-primary font-bold relative z-10 border border-primary/30">
                        <Zap size={22} fill="currentColor" />
                    </div>
                </div>
                <div>
                    <h1 className="font-black text-xl leading-none tracking-tight text-white mb-1">CPA <span className="text-primary">PRO</span></h1>
                    <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isAdmin ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
                        <p className={`text-[10px] font-bold uppercase tracking-widest truncate max-w-[120px] ${isAdmin ? 'text-amber-500' : 'text-gray-500'}`}>
                             {isAdmin ? 'ADMIN' : 'USER'}
                        </p>
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

            <div className="flex gap-2">
                <button 
                    onClick={handleManualDownload}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 py-3 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-2 group font-mono"
                    title="Baixar Backup"
                >
                    <Download size={14} /> DADOS
                </button>
                <button 
                    onClick={handleLogout}
                    className="w-10 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 py-3 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(244,63,94,0.2)] mb-2 group"
                    title="Logout"
                >
                    <LogOut size={14} />
                </button>
            </div>

            {!fileHandle && (
                <button 
                    onClick={hasFileSystemSupport ? handleConnectFile : () => legacyFileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary-glow border border-primary/20 py-2 rounded-lg text-xs font-bold transition-all hover:shadow-[0_0_15px_rgba(112,0,255,0.2)] font-mono"
                >
                    {hasFileSystemSupport ? <FolderOpen size={14} /> : <Upload size={14} />}
                    {hasFileSystemSupport ? 'MOUNT_DRIVE' : 'LOAD_BACKUP'}
                </button>
            )}

            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/5 bg-black/60 relative z-10">
                <div className="flex items-center gap-3">
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
                {fileHandle && (
                     <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_#00F0FF] animate-pulse"></div>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none"></div>
        
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/10 bg-surface/90 backdrop-blur-xl z-10">
            <span className="font-bold text-lg text-white font-mono">CPA <span className="text-primary">PRO</span></span>
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