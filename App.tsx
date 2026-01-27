import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Receipt, 
  Target, 
  Settings as SettingsIcon, 
  Menu, 
  CheckCircle2,
  AlertCircle,
  Info,
  Zap,
  RefreshCw,
  Download,
  Cpu,
  LogOut,
  Database,
  Crown,
  Shield,
  ShieldCheck,
  Lock,
  Terminal,
  MonitorX,
  Fingerprint,
  Activity,
  Eye,
  EyeOff,
  Unlock
} from 'lucide-react';
import { AppState, ViewType, Notification } from './types';
import { getHojeISO, mergeDeep, generateDemoState } from './utils';
import { supabase } from './supabaseClient';

// Components
import Dashboard from './components/Dashboard';
import Planning from './components/Planning';
import DailyControl from './components/DailyControl';
import Expenses from './components/Expenses';
import Settings from './components/Settings';
import Goals from './components/Goals';
import Admin from './components/Admin';

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

const LOCAL_STORAGE_KEY = 'cpaControlV2_react_backup_auto';
const AUTH_STORAGE_KEY = 'cpa_auth_session_v3_master'; 
const DEVICE_ID_KEY = 'cpa_device_fingerprint';

// --- LOGIN COMPONENT (ORIGINAL GLASS STYLE) ---
const LoginScreen = ({ onLogin }: { onLogin: (key: string, isAdmin: boolean, ownerName: string) => void }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        let storedId = localStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
            // Gera um ID único para este navegador/PC
            storedId = 'HWID-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(16).toUpperCase();
            localStorage.setItem(DEVICE_ID_KEY, storedId);
        }
        setDeviceId(storedId);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const rawKey = inputKey.trim().toUpperCase();
        // MASTER KEY BYPASS CHECK
        const isMasterKey = rawKey === 'ADMIN-GROCHA013';

        try {
            // 1. Busca a chave
            const { data, error } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', rawKey)
                .single();

            if (error || !data) {
                // Delay artificial para evitar brute-force
                await new Promise(resolve => setTimeout(resolve, 1000)); 
                throw new Error('Chave de acesso inválida.');
            }

            if (data.active === false) {
                 throw new Error('Acesso suspenso pelo administrador.');
            }

            // 2. LÓGICA DE VÍNCULO DE DISPOSITIVO (HWID)
            // Se NÃO for a chave mestre, aplicamos a segurança rigorosa
            if (!isMasterKey) {
                // Se a chave já tem um dono (HWID gravado) E não é este PC
                if (data.hwid && data.hwid !== deviceId) {
                    throw new Error('Esta chave já está vinculada a outro dispositivo. Entre em contato com o suporte para resetar.');
                }

                // Se a chave é virgem (sem HWID), gravamos este PC nela agora
                if (!data.hwid) {
                    const { error: updateError } = await supabase
                        .from('access_keys')
                        .update({ hwid: deviceId })
                        .eq('id', data.id);
                    
                    if (updateError) throw new Error('Erro ao vincular dispositivo. Tente novamente.');
                }
            }
            // Se for MASTER KEY, ignoramos gravação e checagem de HWID.

            setTimeout(() => {
                localStorage.setItem(AUTH_STORAGE_KEY, rawKey);
                const isAdmin = data.is_admin === true;
                onLogin(rawKey, isAdmin, data.owner_name || 'Operador');
            }, 500);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro de conexão.');
            setLoading(false);
        }
    };

    // --- ACESSO LIBERADO (FREE) ---
    const handleFreeAccess = () => {
        setLoading(true);
        setTimeout(() => {
            const freeKey = 'TROPA-FREE';
            localStorage.setItem(AUTH_STORAGE_KEY, freeKey);
            // Não é admin, nome genérico
            onLogin(freeKey, false, 'Visitante Gratuito');
        }, 800);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden font-sans select-none">
            {/* Background Original */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-accent-cyan/10 rounded-full blur-[120px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>
            </div>

            <div className="relative z-10 w-full max-w-md p-6">
                <div className="gateway-card p-10 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-xl">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-dark shadow-lg shadow-primary/30 mb-6 transform hover:scale-105 transition-transform duration-500">
                            <Activity size={40} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">CPA Gateway</h1>
                        <p className="text-sm text-gray-400 font-medium">Painel de Controle Profissional</p>
                    </div>

                    {/* OPÇÃO 1: LOGIN OFICIAL */}
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 font-bold uppercase tracking-wider ml-1">Chave de Licença</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-primary transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={inputKey}
                                    onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white font-mono text-lg placeholder:text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all uppercase"
                                    placeholder="XXXX-XXXX-XXXX"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-400 text-xs font-bold animate-fade-in">
                                <AlertCircle size={16} className="flex-shrink-0" /> 
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit"
                            disabled={loading}
                            className={`
                                w-full bg-gradient-to-r from-primary to-primary-dark hover:from-primary-glow hover:to-primary text-white font-bold py-4 rounded-xl text-sm uppercase tracking-wider shadow-lg shadow-primary/25 transition-all transform hover:-translate-y-0.5
                                ${loading ? 'opacity-70 cursor-wait' : ''}
                            `}
                        >
                            {loading && inputKey ? (
                                <span className="flex items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin" size={16} /> Verificando...
                                </span>
                            ) : (
                                'Acessar Sistema'
                            )}
                        </button>
                    </form>

                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/10"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-[#0c061d] px-2 text-[10px] text-gray-500 uppercase tracking-widest">Ou acesse como</span>
                        </div>
                    </div>

                    {/* OPÇÃO 2: ACESSO FREE */}
                    <button 
                        onClick={handleFreeAccess}
                        disabled={loading}
                        className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold py-3 rounded-xl text-sm uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10"
                    >
                         {loading && !inputKey ? <RefreshCw className="animate-spin" size={16} /> : <Unlock size={16} />} 
                         ACESSO LIBERADO GRATUITO
                    </button>

                    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                         <span className="flex items-center gap-1.5"><ShieldCheck size={10} /> Conexão Segura</span>
                         <span>v2.1.0 Stable</span>
                    </div>
                </div>
                
                <p className="text-center text-[10px] text-gray-600 mt-6 font-mono">
                    ID: {deviceId.substring(0, 12)}...
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

  // --- DEMO MODE STATES ---
  const [isDemoMode, setIsDemoMode] = useState(false);
  const realStateRef = useRef<AppState | null>(null);

  // --- ONLINE PRESENCE TRACKER (REAL-TIME MONITOR - ROBUST) ---
  const presenceChannelRef = useRef<any>(null); 
  const retryTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const connectPresence = () => {
        const deviceId = localStorage.getItem(DEVICE_ID_KEY) || 'unknown_device';
        const userName = state.config.userName || 'Desconhecido';

        if (presenceChannelRef.current) {
             supabase.removeChannel(presenceChannelRef.current);
        }

        const channel = supabase.channel('online_users', {
            config: {
                presence: { key: deviceId },
            },
        });

        presenceChannelRef.current = channel;

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user: userName,
                    key: currentUserKey,
                    online_at: new Date().toISOString(),
                    is_admin: isAdmin,
                    device_id: deviceId
                });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                // Lógica de Retry silencioso para não assustar o usuário
                console.warn('Realtime desconectado. Tentando reconectar...');
                if(retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(connectPresence, 5000);
            }
        });
    };

    connectPresence();

    // Heartbeat para manter a conexão ativa em mobile/proxy
    const heartbeatInterval = setInterval(async () => {
         if(presenceChannelRef.current) {
            const deviceId = localStorage.getItem(DEVICE_ID_KEY) || 'unknown_device';
            const userName = state.config.userName || 'Desconhecido';
             await presenceChannelRef.current.track({
                user: userName,
                key: currentUserKey,
                online_at: new Date().toISOString(),
                is_admin: isAdmin,
                device_id: deviceId
            }).catch(() => {
                // Se falhar o track, tenta reconectar tudo
                if(retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(connectPresence, 2000);
            });
         }
    }, 30000);

    return () => {
        clearInterval(heartbeatInterval);
        if(retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        if (presenceChannelRef.current) {
            supabase.removeChannel(presenceChannelRef.current);
            presenceChannelRef.current = null;
        }
    };
  }, [isAuthenticated]); 


  // --- SECURITY HEARTBEAT (ANTI-RATARIA) ---
  useEffect(() => {
      if (!isAuthenticated || !currentUserKey) return;

      // BYPASS PARA O MESTRE
      if (currentUserKey === 'ADMIN-GROCHA013') return;

      // BYPASS PARA O FREE ACCESS
      // Se a chave for TROPA-FREE, não validamos no banco, permitindo acesso liberado.
      if (currentUserKey === 'TROPA-FREE') return;

      const deviceId = localStorage.getItem(DEVICE_ID_KEY);

      const checkSession = async () => {
          try {
              const { data, error } = await supabase
                .from('access_keys')
                .select('active, hwid')
                .eq('key', currentUserKey)
                .single();
              
              if (error) return; // Silent fail on network error

              if (!data) {
                  alert("Licença não encontrada.");
                  handleLogout(true);
                  return;
              }

              if (data.active === false) {
                  alert("Acesso bloqueado pelo administrador.");
                  handleLogout(true);
                  return;
              }

              // SE HWID NO BANCO FOR DIFERENTE DO MEU -> TCHAU
              if (data.hwid && data.hwid !== deviceId) {
                  alert("Sessão encerrada.\n\nSua conta foi acessada em outro dispositivo.");
                  handleLogout(true);
                  return;
              }

          } catch (e) {
              console.error("Heartbeat fail", e);
          }
      };

      // Verifica imediatamente ao montar e depois a cada 30 segundos
      checkSession();
      const interval = setInterval(checkSession, 30000); 

      return () => clearInterval(interval);
  }, [isAuthenticated, currentUserKey]);


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
          const savedIsAdmin = localStorage.getItem('cpa_is_admin') === 'true';
          setIsAdmin(savedIsAdmin);
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
        // Only save to localstorage if NOT in demo mode
        if (state && !isDemoMode) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, isDemoMode]);

  // --- LOGOUT ---
  const handleLogout = (force: boolean = false) => {
      if(force || confirm('Encerrar sessão?')) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem('cpa_is_admin');
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
      if (isDemoMode) {
          notify("Saia do Modo Demonstração para carregar backups.", "error");
          return;
      }
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
    if (isDemoMode) {
          notify("Saia do Modo Demonstração para conectar arquivos.", "error");
          return;
    }
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
    // CRITICAL: DISABLE AUTO-SAVE IN DEMO MODE
    if (!isLoaded || isDemoMode) {
        if(isDemoMode) setSaveStatus('saved'); // Fake saved status so UI doesn't look broken
        return;
    }

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
  }, [state, fileHandle, isLoaded, isDemoMode]);

  // --- DEMO MODE TOGGLE ---
  const toggleDemoMode = () => {
      if (isDemoMode) {
          // SAIR DO MODO DEMO: Restaurar estado original
          if (realStateRef.current) {
              setState(realStateRef.current);
              realStateRef.current = null;
          }
          setIsDemoMode(false);
          notify("Modo Demonstração ENCERRADO. Dados reais restaurados.", "info");
      } else {
          // ENTRAR NO MODO DEMO
          realStateRef.current = state; // Salva o estado atual na ref (memória)
          const demoData = generateDemoState(state.config); // Gera dados fake
          setState(demoData);
          setIsDemoMode(true);
          notify("Modo Demonstração ATIVADO. Auto-Save Pausado.", "success");
      }
  };


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

  // Adiciona Admin ao menu se for admin
  if (isAdmin) {
      if (!navItems.find(i => i.id === 'admin')) {
        navItems.push({ id: 'admin', label: 'Painel Admin', icon: Crown });
      }
  }

  const renderContent = () => {
    const props = { state, updateState, notify };
    switch (activeView) {
        case 'dashboard': return <Dashboard {...props} />;
        case 'planejamento': return <Planning {...props} navigateToDaily={(d) => { setCurrentDate(d); setActiveView('controle'); }} />;
        case 'controle': return <DailyControl {...props} currentDate={currentDate} setCurrentDate={setCurrentDate} />;
        case 'despesas': return <Expenses {...props} />;
        case 'configuracoes': return <Settings {...props} />;
        case 'metas': return <Goals {...props} />;
        case 'admin': return <Admin notify={notify} />;
        default: return null;
    }
  };

  if (!isAuthenticated) {
      return <LoginScreen onLogin={(key, admin, owner) => { 
          setIsAuthenticated(true); 
          setIsAdmin(admin); 
          localStorage.setItem('cpa_is_admin', String(admin));
          setCurrentUserKey(key); 
          if(owner) setState(prev => ({...prev, config: {...prev.config, userName: owner}}));
      }} />;
  }

  return (
    <div className="flex h-screen bg-[#02000f] text-gray-200 overflow-hidden font-sans selection:bg-primary/30 selection:text-white">
      
      {/* Notifications */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`
            pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-lg shadow-2xl border backdrop-blur-md animate-slide-in-right min-w-[320px]
            ${n.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/20 text-emerald-400' : 
              n.type === 'error' ? 'bg-rose-900/90 border-rose-500/20 text-rose-400' : 
              'bg-blue-900/90 border-blue-500/20 text-blue-400'}
          `}>
            {n.type === 'success' && <CheckCircle2 size={18} />}
            {n.type === 'error' && <AlertCircle size={18} />}
            {n.type === 'info' && <Info size={18} />}
            <span className="text-xs font-bold tracking-wide">{n.message}</span>
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

      {/* SIDEBAR (GLASS STYLE) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#050510] border-r border-white/5 transform transition-transform duration-300 ease-out flex flex-col justify-between
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
            <div className="flex items-center gap-4 mb-10 px-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
                    <Activity size={22} fill="currentColor" />
                </div>
                <div>
                    <h1 className="font-bold text-xl leading-none text-white tracking-tight">CPA Gateway</h1>
                    <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> ONLINE</span>
                         {isAdmin && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1"><Crown size={10}/> ADMIN</span>}
                    </div>
                </div>
            </div>

            <nav className="space-y-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeView === item.id;
                    const isAdminItem = item.id === 'admin';
                    
                    return (
                        <button
                            key={item.id}
                            onClick={() => { setActiveView(item.id as ViewType); setMobileMenuOpen(false); }}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative
                                ${isActive 
                                    ? (isAdminItem ? 'bg-amber-500/10 text-amber-400 shadow-sm' : 'bg-primary/10 text-primary shadow-sm')
                                    : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'
                                }
                            `}
                        >
                            <Icon size={18} className={`transition-colors ${isActive ? (isAdminItem ? 'text-amber-400' : 'text-primary') : 'group-hover:text-gray-300'}`} />
                            <span className="tracking-wide">{item.label}</span>
                            {isActive && <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full ${isAdminItem ? 'bg-amber-500' : 'bg-primary'}`}></div>}
                        </button>
                    );
                })}
            </nav>
            
            {/* ADMIN DEMO BUTTON */}
            {isAdmin && (
                <div className="mt-4 px-2">
                    <button 
                        onClick={toggleDemoMode}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider border ${
                            isDemoMode 
                            ? 'bg-purple-900/50 text-purple-200 border-purple-500/30 animate-pulse' 
                            : 'bg-white/5 text-gray-500 border-transparent hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {isDemoMode ? <EyeOff size={14} /> : <Eye size={14} />}
                        {isDemoMode ? 'Sair da Demo' : 'Modo Demo'}
                    </button>
                </div>
            )}

        </div>

        <div className="p-6 border-t border-white/5 bg-[#080814]">
            {isDemoMode && (
                <div className="mb-4 bg-purple-900/20 border border-purple-500/30 p-2 rounded text-center">
                    <p className="text-[10px] text-purple-300 font-bold uppercase">Modo Demonstração Ativo</p>
                    <p className="text-[9px] text-gray-400">Dados reais estão seguros e ocultos.</p>
                </div>
            )}
            
            <input type="file" ref={legacyFileInputRef} style={{display: 'none'}} accept=".json" onChange={handleLegacyUpload} />

            <div className="flex gap-2 mb-3">
                <button 
                    onClick={handleManualDownload}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider"
                >
                    <Download size={14} /> Backup
                </button>
                <button 
                    onClick={() => handleLogout()}
                    className="w-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 border border-white/5 hover:border-red-500/30 py-2.5 rounded-lg transition-all"
                >
                    <LogOut size={16} />
                </button>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/5 bg-black/20">
                <div className="flex items-center gap-3">
                    <div className={`
                        w-2 h-2 rounded-full
                        ${saveStatus === 'saving' ? 'bg-blue-500 animate-pulse' : (saveStatus === 'error' ? 'bg-red-500' : 'bg-emerald-500')}
                    `}></div>
                    <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Status</p>
                        <p className={`text-[10px] font-bold truncate ${saveStatus === 'saving' ? 'text-blue-400' : 'text-gray-300'}`}>
                            {saveStatus === 'saving' ? 'Salvando...' : 'Conectado'}
                        </p>
                    </div>
                </div>
                {fileHandle && <Database size={12} className="text-primary" />}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a] z-10">
            <span className="font-bold text-lg text-white">CPA Gateway</span>
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