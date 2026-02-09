
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Fingerprint,
  Activity,
  Eye,
  EyeOff,
  Unlock,
  ListTodo,
  X,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  SkipForward, 
  Megaphone,
  Users, // Squad Icon
  Heart, // Icone para Apoiador
  ArrowRight,
  Globe,
  Loader2,
  Gamepad2, // Icone para Slots
  ShoppingBag, // Icone Loja
  Smartphone, // SMS Icon
  Link as LinkIcon // Renomeado para evitar conflitos
} from 'lucide-react';
import { AppState, ViewType, Notification, DayRecord } from './types';
import { getHojeISO, mergeDeep, generateDemoState, generateUserTag } from './utils';
import { supabase } from './supabaseClient';

// Components
import Dashboard from './components/Dashboard';
import Planning from './components/Planning';
import DailyControl from './components/DailyControl';
import Expenses from './components/Expenses';
import Settings from './components/Settings';
import Goals from './components/Goals';
import Admin from './components/Admin';
import Squad from './components/Squad';
import SlotsRadar from './components/SlotsRadar'; 
import Store from './components/Store'; 
import SmsRush from './components/SmsRush';
import TourGuide, { TourStep } from './components/TourGuide';

// Initial State definition
const initialState: AppState = {
  dailyRecords: {},
  generalExpenses: [],
  monthlyGoals: {},
  dreamGoals: [], 
  config: { valorBonus: 20.00, taxaImposto: 0.06, userName: 'OPERADOR', userTag: '', manualBonusMode: false },
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
  },
  onboarding: {
      steps: {
          configName: false,
          generatedPlan: false,
          sentLot: false,
          addedExpense: false
      },
      dismissed: false // SE ISTO FOR FALSE, O TUTORIAL ABRE
  }
};

const LOCAL_STORAGE_KEY = 'cpaControlV2_react_backup_auto';
const AUTH_STORAGE_KEY = 'cpa_auth_session_v3_master'; 
const DEVICE_ID_KEY = 'cpa_device_fingerprint';
const FREE_KEY_STORAGE = 'cpa_free_unique_key'; // Armazena a chave free fixa do usuário

// --- COMPONENTE MODAL DE IDENTIDADE OBRIGATÓRIA ---
const IdentityModal = ({ onSave, currentName }: { onSave: (name: string) => void, currentName?: string }) => {
    const [name, setName] = useState('');
    
    // Lista de nomes inválidos que forçam a troca
    const invalidNames = ['OPERADOR', 'VISITANTE', 'VISITANTE GRATUITO', 'TESTE', 'ADMIN', 'USUARIO'];

    // Validação: Nome deve ter tamanho > 2 e não pode estar na lista de inválidos
    const isValid = name.trim().length > 2 && !invalidNames.includes(name.trim().toUpperCase());

    return (
        <div className="fixed inset-0 z-[10000] bg-[#02000f]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#0a0a0a] border border-primary/50 rounded-2xl w-full max-w-md p-8 shadow-[0_0_50px_rgba(112,0,255,0.3)] relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                
                <div className="mb-6 flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-full border border-primary/20 shadow-[0_0_20px_rgba(112,0,255,0.15)] animate-pulse-slow">
                        <Fingerprint size={40} className="text-primary" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Identificação Necessária</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                    {currentName && currentName.toUpperCase().includes('VISITANTE') 
                        ? "O modo Visitante é temporário. Para salvar seu progresso e acessar o Squad, escolha um nome de operador único."
                        : "Detectamos que você está usando um nome padrão do sistema. Por favor, identifique-se para continuar."}
                </p>

                <div className="space-y-4">
                    <div className="relative group text-left">
                        <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1 block">Novo Nome de Operador</label>
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Ex: Fox, Imperador, Ana..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-lg text-white font-bold focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-700 text-center uppercase"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && isValid && onSave(name)}
                        />
                    </div>

                    <button 
                        onClick={() => onSave(name)}
                        disabled={!isValid}
                        className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg
                            ${!isValid 
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                : 'bg-primary hover:bg-primary-glow text-white shadow-primary/20 transform hover:-translate-y-1 active:scale-95'}
                        `}
                    >
                        Confirmar Identidade <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- LOGIN COMPONENT (PROFESSIONAL DESIGN) ---
const LoginScreen = ({ onLogin, onDemo, autoLoginCheck }: { onLogin: (key: string, isAdmin: boolean, ownerName: string) => void, onDemo: () => void, autoLoginCheck: boolean }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState('');
    const [loginMode, setLoginMode] = useState<'free' | 'vip'>('free'); // 'free' is default view

    useEffect(() => {
        let storedId = localStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
            storedId = 'HWID-' + Math.random().toString(36).substring(2, 9).toUpperCase() + '-' + Date.now().toString(16).toUpperCase();
            localStorage.setItem(DEVICE_ID_KEY, storedId);
        }
        setDeviceId(storedId);
    }, []);

    // Se estiver verificando sessão automática, mostra apenas um loader minimalista
    if (autoLoginCheck) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#02000f] text-white">
                <Loader2 size={40} className="text-primary animate-spin mb-4" />
                <p className="text-xs font-mono text-gray-500 uppercase tracking-widest animate-pulse">Restaurando Sessão Segura...</p>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        const rawKey = inputKey.trim().toUpperCase();
        const isMasterKey = rawKey === 'ADMIN-GROCHA013';

        try {
            const { data, error } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', rawKey)
                .single();

            if (error || !data) {
                await new Promise(resolve => setTimeout(resolve, 1000)); 
                throw new Error('Chave de acesso inválida ou inexistente.');
            }

            if (data.active === false) {
                 throw new Error('Acesso suspenso administrativamente.');
            }

            if (!isMasterKey) {
                if (data.hwid && data.hwid !== deviceId) {
                    throw new Error('Chave vinculada a outro dispositivo. Solicite reset ao suporte.');
                }
                if (!data.hwid) {
                    const { error: updateError } = await supabase
                        .from('access_keys')
                        .update({ hwid: deviceId })
                        .eq('id', data.id);
                    if (updateError) throw new Error('Erro de vínculo de segurança.');
                }
            }

            setTimeout(() => {
                localStorage.setItem(AUTH_STORAGE_KEY, rawKey);
                const isAdmin = data.is_admin === true;
                onLogin(rawKey, isAdmin, data.owner_name || 'Operador');
            }, 500);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Falha de conexão.');
            setLoading(false);
        }
    };

    const handleFreeAccess = async () => {
        setLoading(true);
        try {
            // Tenta recuperar a chave FREE existente no navegador
            let existingFreeKey = localStorage.getItem(FREE_KEY_STORAGE);
            
            // Se não existir, gera uma nova
            if (!existingFreeKey || existingFreeKey === 'TROPA-FREE') {
                const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                existingFreeKey = `FREE-${p1}-${p2}`;
                localStorage.setItem(FREE_KEY_STORAGE, existingFreeKey);
            }

            // Tenta registrar silenciosamente na nuvem (para o Admin ver)
            try {
                await supabase
                    .from('access_keys')
                    .upsert({
                        key: existingFreeKey,
                        owner_name: 'Visitante Gratuito',
                        active: true,
                        is_admin: false
                    }, { onConflict: 'key' });
            } catch (innerError) {
                console.warn("Offline fallback:", innerError);
            }

            // Define como sessão ativa
            localStorage.setItem(AUTH_STORAGE_KEY, existingFreeKey);
            
            // Login imediato
            setTimeout(() => {
                onLogin(existingFreeKey, false, 'Visitante Gratuito');
            }, 500);

        } catch (err) {
            console.error("Critical error:", err);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#050505] font-sans selection:bg-white/20 relative overflow-hidden">
            {/* Professional Background Grid */}
            <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
                 style={{ 
                     backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)', 
                     backgroundSize: '30px 30px' 
                 }}>
            </div>
            
            {/* Subtle Ambient Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-[420px] p-6 animate-fade-in">
                
                {/* Header Section */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-black border border-white/10 mb-6 shadow-2xl relative group">
                        <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <Activity className="text-white relative z-10" size={28} />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-2">CPA Gateway <span className="text-primary text-sm align-top font-mono ml-1">PRO</span></h1>
                    <p className="text-gray-500 text-xs uppercase tracking-widest font-medium">Professional Financial Management System</p>
                </div>

                {/* Main Card */}
                <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
                    
                    <div className="p-8">
                        {loginMode === 'free' ? (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <h3 className="text-white font-bold text-sm uppercase tracking-wider">Acesso Gratuito Disponível</h3>
                                    </div>
                                    <p className="text-gray-400 text-sm leading-relaxed">
                                        Utilize todas as ferramentas de gestão financeira e planejamento sem custos. Seus dados são salvos localmente.
                                    </p>
                                </div>

                                <button 
                                    onClick={handleFreeAccess}
                                    disabled={loading}
                                    className="w-full group relative overflow-hidden bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <Unlock size={20} />}
                                    <span className="tracking-wide">INICIAR SESSÃO</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>

                                {/* BOTÃO DEMONSTRAÇÃO RESTAURADO E DESTACADO */}
                                <button 
                                    onClick={onDemo}
                                    type="button"
                                    className="w-full group bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/20 text-gray-300 hover:text-white font-bold py-3 rounded-xl transition-all border border-white/5 hover:border-white/20 flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                                >
                                    <Eye size={16} className="text-amber-400 group-hover:scale-110 transition-transform" /> MODO DEMONSTRAÇÃO
                                </button>
                                
                                <div className="pt-2 border-t border-white/5 flex justify-center">
                                    <button 
                                        onClick={() => setLoginMode('vip')}
                                        className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-2 font-medium group/vip"
                                    >
                                        <Crown size={12} className="text-amber-600 group-hover/vip:text-amber-400 transition-colors" />
                                        Possui licença VIP?
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                        <Lock size={14} className="text-amber-500"/> Área Restrita
                                    </h3>
                                    <button 
                                        type="button"
                                        onClick={() => setLoginMode('free')}
                                        className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-wider flex items-center gap-1"
                                    >
                                        <ChevronDown size={12} className="rotate-90"/> Voltar
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 tracking-wider ml-1">Chave de Licença</label>
                                    <div className="relative group/input">
                                        <input 
                                            type="text" 
                                            value={inputKey}
                                            onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                                            className="w-full bg-[#050505] border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-center tracking-[0.2em] text-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition-all placeholder:text-gray-800 uppercase"
                                            placeholder="XXXX-XXXX-XXXX"
                                            autoFocus
                                        />
                                        <div className="absolute inset-0 rounded-xl border border-white/5 pointer-events-none group-hover/input:border-white/20 transition-colors"></div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                                        <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-400 font-medium leading-tight">{error}</p>
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-amber-900/20"
                                >
                                    {loading ? <RefreshCw className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                    <span>VALIDAR ACESSO</span>
                                </button>
                            </form>
                        )}
                    </div>

                    {/* Footer Status Bar */}
                    <div className="bg-[#050505]/50 px-6 py-3 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-gray-600">
                         <span className="flex items-center gap-1.5">
                             <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                             Secure Connection
                         </span>
                         <span className="opacity-50">ID: {deviceId.substring(0, 8)}</span>
                    </div>
                </div>
                
                <p className="text-center text-[10px] text-gray-700 mt-8 font-mono">
                    &copy; 2024 CPA Control. v3.7.2 (Stable)
                </p>
            </div>
        </div>
    );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserKey, setCurrentUserKey] = useState('');
  
  // --- STATE FOR AUTO-LOGIN CHECK ---
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [state, setState] = useState<AppState>(initialState);
  
  // --- PRIVACY MODE (BOSS KEY) ---
  const [privacyMode, setPrivacyMode] = useState(false);

  // --- SQUAD & SPECTATOR MODE ---
  const [spectatingData, setSpectatingData] = useState<{data: AppState, name: string} | null>(null);
  
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(getHojeISO());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Estados de Salvamento
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fileHandle, setFileHandle] = useState<any>(null); 
  const saveTimeoutRef = useRef<number | null>(null);
  const syncTimeoutRef = useRef<number | null>(null);
  const legacyFileInputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [hasFileSystemSupport, setHasFileSystemSupport] = useState(true);

  // --- DEMO MODE STATES ---
  const [isDemoMode, setIsDemoMode] = useState(false);
  const realStateRef = useRef<AppState | null>(null);

  // --- ONBOARDING & TOUR ---
  const [onboardingOpen, setOnboardingOpen] = useState(true);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [canProceed, setCanProceed] = useState(true); 
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // --- SYSTEM BROADCAST ALERT ---
  const [systemAlert, setSystemAlert] = useState<{title: string, message: string} | null>(null);

  // REF PARA O CONTAINER PRINCIPAL (SCROLL RESET FIX)
  const mainContentRef = useRef<HTMLDivElement>(null);

  // RESET SCROLL ON VIEW CHANGE
  useEffect(() => {
      if (mainContentRef.current) {
          mainContentRef.current.scrollTo(0, 0);
      }
  }, [activeView]);

  // Função auxiliar para buscar backup na nuvem (Melhora persistência)
  const loadCloudData = async (key: string): Promise<AppState | null> => {
      try {
          const { data, error } = await supabase
              .from('user_data')
              .select('raw_json')
              .eq('access_key', key)
              .single();
          
          if (!error && data && data.raw_json) {
              return data.raw_json as AppState;
          }
      } catch (e) {
          console.error("Erro ao buscar backup nuvem:", e);
      }
      return null;
  };

  // --- AUTO-LOGIN / SESSION RESTORE LOGIC ---
  useEffect(() => {
      const restoreSession = async () => {
          setIsCheckingAuth(true);
          const savedKey = localStorage.getItem(AUTH_STORAGE_KEY);
          
          if (savedKey) {
              try {
                  // Validação silenciosa no Supabase
                  const { data, error } = await supabase
                      .from('access_keys')
                      .select('is_admin, owner_name, active')
                      .eq('key', savedKey)
                      .single();

                  if (data && data.active !== false) {
                      // Sessão válida, restaura estado
                      setCurrentUserKey(savedKey);
                      setIsAdmin(data.is_admin);
                      setIsAuthenticated(true);
                      
                      // 1. Tenta carregar dados LOCAIS
                      const localString = localStorage.getItem(LOCAL_STORAGE_KEY);
                      let loadedData = localString ? JSON.parse(localString) : null;

                      // 2. Se não houver dados locais, OU para garantir nome atualizado, busca na NUVEM
                      if (!loadedData) {
                          const cloudData = await loadCloudData(savedKey);
                          if (cloudData) loadedData = cloudData;
                      } else {
                          // Se tem local, tenta buscar nuvem em background para garantir nome (Opcional, mas bom para sync)
                          // Para simplicidade e performance no load, confiamos no local se existir,
                          // mas se o nome for OPERADOR/default, tentamos pegar da chave.
                      }

                      const merged = mergeDeep(initialState, loadedData || {});
                      
                      // Prioridade do Nome: 
                      // 1. O que está salvo no state (se não for default)
                      // 2. O nome atrelado à chave (Owner Name)
                      if (data.owner_name && (!merged.config.userName || merged.config.userName === 'OPERADOR')) {
                          merged.config.userName = data.owner_name;
                      }
                      
                      setState(merged);
                      setIsLoaded(true);
                  } else {
                      // Chave inválida ou bloqueada, limpa sessão
                      localStorage.removeItem(AUTH_STORAGE_KEY);
                  }
              } catch (e) {
                  console.error("Erro ao restaurar sessão:", e);
              }
          }
          setIsCheckingAuth(false);
      };

      restoreSession();
  }, []);

  // --- REALTIME PRESENCE (RADAR) BROADCAST ---
  // Este hook anuncia para o Supabase que o usuário está online.
  useEffect(() => {
      if (!isAuthenticated || !currentUserKey || !isLoaded || isDemoMode) return;

      const deviceId = localStorage.getItem(DEVICE_ID_KEY) || 'unknown';
      const channel = supabase.channel('online_users', {
          config: {
              presence: {
                  key: deviceId,
              },
          },
      });

      channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.track({
                  user: state.config.userName || 'Operador',
                  key: currentUserKey,
                  is_admin: isAdmin,
                  online_at: new Date().toISOString(),
                  device_id: deviceId
              });
          }
      });

      return () => {
          supabase.removeChannel(channel);
      };
  }, [isAuthenticated, currentUserKey, isLoaded, state.config.userName, isAdmin, isDemoMode]);


  // --- CLOUD SYNC & AUTO-SAVE (COM DEBOUNCE OTIMIZADO) ---
  useEffect(() => {
    // PREVENÇÃO CRÍTICA: NUNCA SALVAR SE ESTIVER EM MODO DEMO OU SE A CHAVE FOR DUMMY
    if (!isAuthenticated || !isLoaded || isDemoMode || currentUserKey === 'DEMO-USER-KEY') return;
    
    // Save to LocalStorage immediately on change
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    setLastSaved(new Date());

    // Debounce Cloud Sync (Supabase)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    // Se não for admin e tiver chave, sincroniza
    if (!isAdmin && currentUserKey && currentUserKey !== 'TROPA-FREE') {
        setSaveStatus('saving');
        syncTimeoutRef.current = window.setTimeout(async () => {
            try {
                const { error } = await supabase
                    .from('user_data')
                    .upsert({ 
                        access_key: currentUserKey, 
                        raw_json: state,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'access_key' });
                
                if(error) throw error;
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus('idle'), 2000);
            } catch (err) {
                console.error("Cloud sync failed:", err);
                setSaveStatus('error');
            }
        }, 3000); // 3 seconds debounce for cloud
    } else {
        setSaveStatus('saved'); // Local only
    }

  }, [state, isAuthenticated, isLoaded, isAdmin, currentUserKey, isDemoMode]);

  // --- GARANTIA DE INTEGRIDADE (AUTO-FIX) ---
  useEffect(() => {
    if (!isLoaded) return;

    // 1. Gera Tag se não existir
    if(!state.config.userTag) {
        setState(prev => ({ ...prev, config: { ...prev.config, userTag: generateUserTag() } }));
    }

    // 2. REPARA O ESTADO DE ONBOARDING SE ELE SUMIU DO JSON ANTIGO
    // Se o usuário tem um JSON antigo (pré-tutorial), 'onboarding' pode estar undefined.
    // Isso garante que ele receba a configuração padrão (dismissed: false) e veja o tutorial.
    if (!state.onboarding) {
         setState(prev => ({ 
             ...prev, 
             onboarding: initialState.onboarding 
         }));
    }
  }, [isLoaded]);

  // Listener para Broadcast Global (Alertas do Admin)
  useEffect(() => {
      if (!isAuthenticated) return;
      
      const channel = supabase.channel('system_global_alerts');
      const myDeviceId = localStorage.getItem(DEVICE_ID_KEY);

      channel
        .on('broadcast', { event: 'sys_alert' }, (payload) => {
            const data = payload.payload;
            
            // CORREÇÃO: Verifica se é para todos, ou para este DeviceID, OU para esta CHAVE (fallback do admin)
            if (data.target === 'ALL' || data.target === myDeviceId || data.target === currentUserKey) {
                setSystemAlert({
                    title: data.title,
                    message: data.message
                });
                // Toca som de alerta (ATUALIZADO PARA CRYSTAL GLASS - MAIS DISCRETO)
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(()=>{});
            }
        })
        .subscribe();

      return () => {
          supabase.removeChannel(channel);
      };
  }, [isAuthenticated, currentUserKey]);

  // --- TOUR GUIDE LOGIC (REVISITED) ---
  useEffect(() => {
      // Este efeito garante que o tour abra se a flag 'dismissed' for false.
      // Ele verifica 'isLoaded' para garantir que os dados do usuário (e o estado do tutorial) já foram carregados.
      if (isAuthenticated && isLoaded && state.onboarding && state.onboarding.dismissed === false && !tourOpen) {
          setTourOpen(true);
      }
  }, [isAuthenticated, isLoaded, state.onboarding]);

  // Definição dos Passos do Tour (Usando os IDs criados nos componentes)
  const tourSteps: TourStep[] = [
      {
          targetId: 'dashboard',
          title: 'Visão Geral',
          content: 'Bem-vindo ao CPA Gateway Pro. Este é seu painel de controle principal, onde você acompanha seu ROI, Lucro Líquido e performance em tempo real.',
          view: 'dashboard',
          position: 'right'
      },
      {
          targetId: 'configuracoes',
          title: 'Primeiro Passo: Identidade',
          content: 'Antes de começar, vamos configurar seu nome de operador e preferências. Clique aqui para acessar as configurações.',
          view: 'configuracoes',
          action: () => setActiveView('configuracoes'),
          position: 'right'
      },
      {
          targetId: 'tour-settings-name',
          title: 'Quem é você?',
          content: 'Defina seu nome de operador aqui. Sua TAG única foi gerada automaticamente ao lado.',
          view: 'configuracoes',
          position: 'bottom'
      },
      {
          targetId: 'tour-settings-bonus-toggle',
          title: 'Modo de Trabalho',
          content: 'Escolha se prefere digitar o valor exato (R$) ganho em cada operação ou se prefere que o sistema calcule baseado em ciclos (telas).',
          view: 'configuracoes',
          position: 'bottom'
      },
      {
          targetId: 'planejamento',
          title: 'Estratégia do Dia',
          content: 'Agora vamos criar seu plano de ataque. Acesse a aba de Planejamento.',
          view: 'planejamento',
          action: () => setActiveView('planejamento'),
          position: 'right'
      },
      {
          targetId: 'tour-plan-generate',
          title: 'Gerador Rítmico',
          content: 'Configure quantos jogadores e agentes você tem, depois clique em GERAR. O sistema criará valores inteligentes baseados no perfil de cada jogador.',
          view: 'planejamento',
          position: 'top'
      },
      {
          targetId: 'controle',
          title: 'Execução',
          content: 'Após gerar o plano, você enviará os lotes para cá. Aqui é o Controle Diário, onde você registra os resultados reais.',
          view: 'controle',
          action: () => setActiveView('controle'),
          position: 'right'
      },
      {
          targetId: 'tour-daily-table',
          title: 'Livro Caixa',
          content: 'Seus registros aparecerão aqui. Edite os valores conforme necessário. Se estiver em um Squad, você pode enviar o reporte direto para seu líder.',
          view: 'controle',
          position: 'top'
      }
  ];

  // --- MEMOIZED NOTIFY TO PREVENT LOOPS ---
  const notify = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const updateState = (updates: Partial<AppState>) => {
    if (isDemoMode) return; // Read-only in demo
    setState(prev => mergeDeep(prev, updates));
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('sms_rush_token'); // Limpa token do SMS Rush para segurança
    window.location.reload();
  };

  // --- ACCESS CONTROL FOR SLOTS ---
  // Verifica se o usuário tem permissão VIP (Admin ou Chave Paga)
  // Chave paga = não é TROPA-FREE e não começa com FREE-
  const isVip = isAdmin || (isAuthenticated && currentUserKey !== 'TROPA-FREE' && !currentUserKey.startsWith('FREE-'));

  // --- CHECK FOR DEFAULT NAME (OPERADOR / VISITANTE) ---
  // Atualizado para incluir 'Visitante Gratuito' e variantes, forçando a troca.
  const invalidNames = ['OPERADOR', 'VISITANTE', 'VISITANTE GRATUITO', 'TESTE', 'ADMIN', 'USUARIO'];
  const showIdentityCheck = isAuthenticated && isLoaded && !isDemoMode && 
                            (!state.config.userName || invalidNames.includes(state.config.userName.toUpperCase()));

  if (!isAuthenticated) {
    return <LoginScreen 
        onLogin={async (key, admin, ownerName) => {
            setCurrentUserKey(key);
            setIsAdmin(admin);
            setIsAuthenticated(true);
            
            // --- CORREÇÃO DE RECUPERAÇÃO DE DADOS ---
            // 1. Tenta pegar dados LOCAIS (Chrome) primeiro
            const localString = localStorage.getItem(LOCAL_STORAGE_KEY);
            let restoredState = localString ? JSON.parse(localString) : null;

            // 2. Tenta buscar backup na NUVEM (Supabase) em seguida (se houver)
            const cloudData = await loadCloudData(key);
            
            setState(prev => {
                // Base: Estado Inicial
                let finalState = initialState;

                // Merge 1: Nuvem (Base de backup)
                if (cloudData) {
                    finalState = mergeDeep(finalState, cloudData);
                }

                // Merge 2: Local (PRIORIDADE TOTAL PARA DADOS RECENTES NO NAVEGADOR)
                // Isso garante que o que estava na tela antes do logout seja restaurado exatamente
                if (restoredState) {
                    finalState = mergeDeep(finalState, restoredState);
                }
                
                // IMPORTANTE: NÃO forçar ownerName aqui se já existir um nome salvo válido.
                // Apenas se for nulo ou inválido, usamos o ownerName da chave.
                if (!finalState.config.userName || invalidNames.includes(finalState.config.userName.toUpperCase())) {
                    if (ownerName && !invalidNames.includes(ownerName.toUpperCase())) {
                        finalState.config.userName = ownerName;
                    } else if (!finalState.config.userName) {
                        finalState.config.userName = 'OPERADOR';
                    }
                }
                
                return finalState;
            });
            setIsLoaded(true);
        }} 
        onDemo={() => {
            setIsDemoMode(true);
            setState(generateDemoState(initialState.config));
            setCurrentUserKey('DEMO-USER-KEY'); // Garante que a chave seja dummy
            setActiveView('dashboard'); // Força a view inicial
            setIsAuthenticated(true);
            setIsLoaded(true);
            notify('Modo Demonstração Ativado', 'info');
        }}
        autoLoginCheck={isCheckingAuth} 
    />;
  }

  const activeState = spectatingData ? spectatingData.data : state;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative font-sans text-gray-200">
      
      {/* IDENTITY MODAL (BLOCKER) */}
      {showIdentityCheck && (
          <IdentityModal 
            currentName={state.config.userName}
            onSave={(name) => {
                updateState({ 
                    config: { ...state.config, userName: name },
                    // RESETA O TUTORIAL: Força dismissed=false para garantir que o TourGuide abra assim que o modal fechar.
                    onboarding: { ...state.onboarding, dismissed: false }
                });
                setTourOpen(true);
                notify("Identidade definida com sucesso! Iniciando tour...", "success");
            }} 
          />
      )}

      {/* Background Grids */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-mesh opacity-30"></div>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(112, 0, 255, 0.03) 0%, transparent 50%)' }}></div>
      </div>

      {/* --- SYSTEM ALERT MODAL --- */}
      {systemAlert && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#0f0a1e] border border-indigo-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-shimmer"></div>
                  <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400 animate-pulse">
                          <Megaphone size={24} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white mb-1">{systemAlert.title}</h3>
                          <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Mensagem do Sistema</p>
                      </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 border-l-2 border-indigo-500/20 pl-4">
                      {systemAlert.message}
                  </p>
                  <button 
                      onClick={() => setSystemAlert(null)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all"
                  >
                      ENTENDIDO
                  </button>
              </div>
          </div>
      )}

      {/* Top Header */}
      <header className="h-16 border-b border-white/5 bg-[#02000f]/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
             <Activity className="text-white" size={18} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-white leading-none">CPA Gateway <span className="text-primary text-xs align-top font-mono ml-1">PRO</span></h1>
            {spectatingData && <span className="text-[10px] text-amber-500 font-bold animate-pulse flex items-center gap-1"><Eye size={10}/> ESPECTADOR: {spectatingData.name}</span>}
            {isDemoMode && <span className="text-[9px] text-white/50 bg-white/10 px-1.5 rounded ml-2">MODO DEMO</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Save Status Indicator */}
            {!spectatingData && !isDemoMode && (
                <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    {saveStatus === 'saving' && <><RefreshCw size={10} className="animate-spin text-primary"/> Syncing...</>}
                    {saveStatus === 'saved' && <><CheckCircle2 size={10} className="text-emerald-500"/> Saved</>}
                    {saveStatus === 'error' && <><AlertCircle size={10} className="text-rose-500"/> Sync Error</>}
                </div>
            )}

            {/* Privacy Toggle */}
            <button 
                onClick={() => setPrivacyMode(!privacyMode)}
                className={`p-2 rounded-lg transition-all ${privacyMode ? 'bg-amber-500/20 text-amber-500' : 'hover:bg-white/5 text-gray-400'}`}
                title="Modo Privacidade (Ocultar Valores)"
            >
                {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {/* Logout */}
            <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors" title="Sair">
                <LogOut size={18} />
            </button>
            
            {/* Mobile Menu Toggle */}
            <button 
                className="md:hidden p-2 text-gray-400"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Sidebar / Mobile Menu (CLEAN DESIGN + REORDERED + VISUAL ALERT) */}
        <nav className={`
            fixed md:relative z-40 w-full md:w-20 lg:w-64 bg-[#05030a] md:bg-transparent border-r border-white/5 flex flex-col transition-all duration-300
            ${mobileMenuOpen ? 'translate-x-0 inset-0' : '-translate-x-full md:translate-x-0'}
        `}>
             <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
                 {/* MENU ITEMS DEFINITION WITH SEPARATORS */}
                 {[
                     { type: 'header', label: 'VISÃO GERAL' },
                     { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                     // MOVIDO PARA CÁ COM BADGE
                     { id: 'sms', label: 'SMS RUSH', icon: Smartphone, badge: 'NOVO' },
                     
                     { type: 'header', label: 'FINANCEIRO' },
                     { id: 'planejamento', label: 'Planejamento', icon: Target },
                     { id: 'controle', label: 'Controle Diário', icon: CalendarDays },
                     { id: 'despesas', label: 'Despesas', icon: Receipt },
                     { id: 'metas', label: 'Metas', icon: Crown },
                     
                     { type: 'header', label: 'FERRAMENTAS' },
                     { id: 'slots', label: 'Slots Radar', icon: Gamepad2 },
                     { id: 'squad', label: 'Squad', icon: Users },
                     // MOVIDO PARA CÁ
                     { id: 'store', label: 'Loja Oficial', icon: ShoppingBag },
                     
                     { type: 'header', label: 'SISTEMA' },
                     ...(isAdmin ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldCheck }] : []),
                     { id: 'configuracoes', label: 'Ajustes', icon: SettingsIcon },
                 ].map((item, index) => {
                     if (item.type === 'header') {
                         return (
                             <div key={`header-${index}`} className="pt-4 pb-2 px-2">
                                 <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{item.label}</p>
                             </div>
                         );
                     }
                     return (
                         <button
                            key={item.id}
                            onClick={() => { setActiveView(item.id as ViewType); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative overflow-hidden ${
                                activeView === item.id 
                                ? 'text-white font-bold bg-white/[0.03]' 
                                : 'text-gray-500 hover:text-white hover:bg-white/[0.02]'
                            }`}
                         >
                             {/* Active Indicator (Left Bar) */}
                             {activeView === item.id && (
                                 <div className="absolute left-0 top-1/2 -translate-x-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_10px_rgba(112,0,255,0.5)]"></div>
                             )}
                             
                             <div className={`transition-transform duration-300 ${activeView === item.id ? 'translate-x-2 text-primary' : ''}`}>
                                 <item.icon size={18} />
                             </div>
                             <span className={`text-sm md:hidden lg:block transition-transform duration-300 ${activeView === item.id ? 'translate-x-2' : ''}`}>
                                 {item.label}
                             </span>

                             {/* BADGE "NOVO" PULSANTE PARA SMS STUDIO */}
                             {item.badge === 'NOVO' && (
                                 <span className="ml-auto flex items-center gap-1.5 md:hidden lg:flex">
                                     <span className="relative flex h-2 w-2">
                                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                       <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                                     </span>
                                     <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wider bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">NOVO</span>
                                 </span>
                             )}
                         </button>
                     );
                 })}
             </div>

             {/* Footer Info */}
             <div className="p-4 border-t border-white/5 hidden lg:block">
                 {/* DEMO BUTTON / SAIR DEMO */}
                 {!isDemoMode ? (
                     <button 
                        onClick={() => {
                            if(confirm("Entrar no Modo Demonstração? (Seus dados atuais serão mantidos a salvo, mas a visualização mudará)")) {
                                setIsDemoMode(true);
                                setState(generateDemoState(initialState.config));
                                setCurrentUserKey('DEMO-USER-KEY'); // Garante que a chave seja dummy
                                setActiveView('dashboard');
                            }
                        }}
                        className="w-full mb-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white transition-all group uppercase tracking-wide"
                     >
                         <Eye size={14} className="group-hover:text-amber-400 transition-colors" />
                         Modo Demonstração
                     </button>
                 ) : (
                     <button 
                        onClick={() => {
                            setIsDemoMode(false);
                            window.location.reload(); 
                        }}
                        className="w-full mb-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl p-3 flex items-center justify-center gap-2 text-[10px] font-bold text-red-400 hover:text-white transition-all group uppercase tracking-wide"
                     >
                         <LogOut size={14} />
                         Sair do Demo
                     </button>
                 )}

                 <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                     <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Licença Ativa</p>
                     <p className="text-xs text-white font-mono truncate" title={currentUserKey}>{currentUserKey === 'TROPA-FREE' ? 'GRATUITA' : currentUserKey}</p>
                 </div>
             </div>
        </nav>

        {/* Main Content Area */}
        <main 
            ref={mainContentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative scroll-smooth p-4 lg:p-8"
        >
            {spectatingData && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl mb-6 flex justify-between items-center animate-fade-in">
                    <span className="flex items-center gap-2 font-bold text-sm">
                        <Eye size={18} /> MODO ESPECTADOR: Visualizando dados de {spectatingData.name}
                    </span>
                    <button 
                        onClick={() => setSpectatingData(null)}
                        className="bg-amber-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors"
                    >
                        SAIR
                    </button>
                </div>
            )}

            {/* Notifications */}
            <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
                {notifications.map(n => (
                    <div key={n.id} className={`pointer-events-auto transform transition-all duration-300 animate-slide-in-right max-w-sm w-full shadow-2xl rounded-xl p-4 border flex items-start gap-3 backdrop-blur-md ${
                        n.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-100' :
                        n.type === 'error' ? 'bg-rose-900/80 border-rose-500/30 text-rose-100' :
                        'bg-blue-900/80 border-blue-500/30 text-blue-100'
                    }`}>
                        <div className={`p-1.5 rounded-full shrink-0 ${
                            n.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                            n.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                            'bg-blue-500/20 text-blue-400'
                        }`}>
                            {n.type === 'success' ? <CheckCircle2 size={16} /> : n.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
                        </div>
                        <div>
                            <p className="text-sm font-medium leading-tight">{n.message}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Render Views */}
            {activeView === 'dashboard' && <Dashboard state={activeState} privacyMode={privacyMode} />}
            {activeView === 'store' && <Store currentUserKey={currentUserKey} />}
            
            {/* SMS RUSH - AGORA PARA TODOS */}
            {activeView === 'sms' && <SmsRush notify={notify} />}
            
            {activeView === 'planejamento' && <Planning state={activeState} updateState={updateState} navigateToDaily={(d) => { setActiveView('controle'); setCurrentDate(d); }} notify={notify} readOnly={!!spectatingData || isDemoMode} privacyMode={privacyMode} />}
            {activeView === 'controle' && <DailyControl state={activeState} updateState={updateState} currentDate={currentDate} setCurrentDate={setCurrentDate} notify={notify} readOnly={!!spectatingData || isDemoMode} privacyMode={privacyMode} currentUserKey={currentUserKey} />}
            {activeView === 'despesas' && <Expenses state={activeState} updateState={updateState} readOnly={!!spectatingData || isDemoMode} privacyMode={privacyMode} />}
            {activeView === 'metas' && <Goals state={activeState} updateState={updateState} privacyMode={privacyMode} />}
            {activeView === 'configuracoes' && <Settings state={activeState} updateState={updateState} notify={notify} />}
            {activeView === 'admin' && isAdmin && <Admin notify={notify} />}
            {activeView === 'squad' && <Squad currentUserKey={currentUserKey} onSpectate={(data, name) => { setSpectatingData({data, name}); setActiveView('dashboard'); }} notify={notify} privacyMode={privacyMode} />}
            
            {/* RENDERIZA SLOTS PARA TODOS */}
            {activeView === 'slots' && <SlotsRadar notify={notify} isAdmin={isAdmin} currentUserKey={currentUserKey} userName={state.config.userName} />}

            {/* --- RESTORED TOUR GUIDE COMPONENT --- */}
            {!isDemoMode && !spectatingData && (
                <TourGuide 
                    steps={tourSteps}
                    isOpen={tourOpen}
                    currentStepIndex={tourStepIndex}
                    setCurrentStepIndex={setTourStepIndex}
                    onClose={() => setTourOpen(false)}
                    onComplete={() => {
                        setTourOpen(false);
                        updateState({ onboarding: { ...state.onboarding, dismissed: true } });
                    }}
                    onSkip={() => {
                        setTourOpen(false);
                        updateState({ onboarding: { ...state.onboarding, dismissed: true } });
                    }}
                />
            )}

        </main>
      </div>

    </div>
  );
}

export default App;
