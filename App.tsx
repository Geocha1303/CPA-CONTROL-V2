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
import Squad from './components/Squad'; // Novo Componente
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
      dismissed: false
  }
};

const LOCAL_STORAGE_KEY = 'cpaControlV2_react_backup_auto';
const AUTH_STORAGE_KEY = 'cpa_auth_session_v3_master'; 
const DEVICE_ID_KEY = 'cpa_device_fingerprint';
const FREE_KEY_STORAGE = 'cpa_free_unique_key'; // Armazena a chave free fixa do usuário

// --- LOGIN COMPONENT (PROFESSIONAL DESIGN) ---
const LoginScreen = ({ onLogin, autoLoginCheck }: { onLogin: (key: string, isAdmin: boolean, ownerName: string) => void, autoLoginCheck: boolean }) => {
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
            let existingFreeKey = localStorage.getItem(FREE_KEY_STORAGE);
            if (!existingFreeKey || existingFreeKey === 'TROPA-FREE') {
                const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                existingFreeKey = `FREE-${p1}-${p2}`;
                localStorage.setItem(FREE_KEY_STORAGE, existingFreeKey);
            }

            // Tenta registrar silenciosamente
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

            localStorage.setItem(AUTH_STORAGE_KEY, existingFreeKey);
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
                            <div className="space-y-8">
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
                                
                                <div className="pt-4 border-t border-white/5 flex justify-center">
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
                      
                      // Carrega dados locais
                      const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
                      if (localData) {
                          const parsed = JSON.parse(localData);
                          const merged = mergeDeep(initialState, parsed);
                          if (data.owner_name && (!merged.config.userName || merged.config.userName === 'OPERADOR')) {
                              merged.config.userName = data.owner_name;
                          }
                          setState(merged);
                      }
                      setIsLoaded(true);
                  } else {
                      // Chave inválida ou bloqueada, limpa sessão
                      localStorage.removeItem(AUTH_STORAGE_KEY);
                  }
              } catch (e) {
                  console.error("Erro ao restaurar sessão:", e);
                  // Em caso de erro de rede, podemos optar por logar offline se tiver dados locais
                  // Por segurança, vamos pedir login novamente, mas manter dados locais.
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
                  key: deviceId, // Use deviceId as unique key for presence to allow multiple tabs/devices per user
              },
          },
      });

      channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.track({
                  user: state.config.userName || 'Operador',
                  key: currentUserKey,
                  online_at: new Date().toISOString(),
                  is_admin: isAdmin,
                  device_id: deviceId
              });
          }
      });

      return () => {
          supabase.removeChannel(channel);
      };
  }, [isAuthenticated, currentUserKey, isLoaded, state.config.userName, isAdmin, isDemoMode]);


  // --- PRIVACY MODE LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'F9') {
            setPrivacyMode(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- ENSURE TAG EXISTENCE ---
  useEffect(() => {
      if (isLoaded && !state.config.userTag) {
          const newTag = generateUserTag();
          setState(prev => ({ ...prev, config: { ...prev.config, userTag: newTag } }));
      }
  }, [isLoaded, state.config.userTag]);

  // --- SYNC TO CLOUD FUNCTION (AUTO) ---
  const syncToCloud = async (dataToSync: AppState) => {
      if (isDemoMode || !currentUserKey) return;
      try {
          const { error } = await supabase
              .from('user_data')
              .upsert({
                  access_key: currentUserKey,
                  raw_json: dataToSync,
                  owner_name: dataToSync.config.userName || 'Operador',
                  updated_at: new Date().toISOString()
              }, { onConflict: 'access_key' });
          
          if (error) {
              if(error.code !== '42501') console.error("Cloud Sync Warning:", error.message);
          }
      } catch (e) {
          console.error("Cloud Sync Exception:", e);
      }
  };

  // --- LISTENER GLOBAL DE ALERTAS ---
  useEffect(() => {
      const deviceId = localStorage.getItem(DEVICE_ID_KEY);
      const alertChannel = supabase.channel('system_global_alerts');
      alertChannel.on('broadcast', { event: 'sys_alert' }, (payload) => {
            const data = payload.payload;
            const isForMe = data.target === 'ALL' || data.target === currentUserKey || data.target === deviceId;
            if (!isForMe) return;
            if (data) {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(() => {});
                setSystemAlert({ title: data.title, message: data.message });
            }
        }).subscribe();
      return () => { supabase.removeChannel(alertChannel); };
  }, [currentUserKey]);

  // --- NOTIFICAÇÕES AUTOMÁTICAS E AVISOS DO ADM ---
  useEffect(() => {
      if (isAuthenticated && isLoaded && !isDemoMode) {
          
          // 1. Notificação sobre a Inteligência Global (Discreta) - Sempre aparece
          const timer = setTimeout(() => {
              notify("🚀 NOVIDADE: Inteligência Global disponível no Dashboard! Compare seus resultados.", "success");
          }, 2500);

          // 2. CHECK DE NOME (MENSAGEM DO ADM AUTOMÁTICA)
          // Lógica ajustada: SÓ VERIFICA se o TOUR NÃO ESTIVER ABERTO.
          // Isso evita sobreposição no primeiro login. 
          // Usuários antigos (com tour dismissed) receberão o alerta imediatamente se o nome estiver errado.
          
          if (!tourOpen) {
              const currentName = state.config.userName || '';
              const isDefaultName = currentName === 'OPERADOR' || currentName === 'Visitante Gratuito';

              if (isDefaultName) {
                  const alertTimer = setTimeout(() => {
                      setSystemAlert({
                          title: "📢 MENSAGEM DO ADMINISTRADOR",
                          message: `Detectamos que seu perfil ainda está com o nome padrão '${currentName}'. Para garantir sua identificação no Squad e evitar remoção por inatividade, acesse a aba SISTEMA e atualize seu nome agora mesmo.`
                      });
                  }, 4000);
                  return () => clearTimeout(alertTimer);
              }
          }

          return () => clearTimeout(timer);
      }
  }, [isAuthenticated, isLoaded, isDemoMode, tourOpen, state.config.userName]);


  // --- NOVO ROTEIRO DO TOUR (MAIS EXPLICATIVO E IMERSIVO) ---
  const tourSteps: TourStep[] = [
      {
          targetId: 'nav-configuracoes',
          title: 'Inicialização do Sistema',
          view: 'configuracoes',
          content: (
              <div>
                  <p className="mb-2">Bem-vindo ao <strong>CPA Gateway Pro</strong>. Vamos calibrar sua central de comando.</p>
                  <p className="text-gray-400 text-xs">O primeiro passo é definir quem está no controle para que os cálculos e relatórios sejam precisos.</p>
              </div>
          ),
          position: 'right',
          requiresInteraction: false
      },
      {
          targetId: 'tour-settings-name',
          title: 'Identidade Operacional',
          view: 'configuracoes',
          content: (
              <div>
                  <p className="mb-3 font-bold text-white">Quem é o Operador?</p>
                  <p className="mb-2 text-xs">Substitua "OPERADOR" pelo seu nome ou apelido. Isso garante sua identificação no Squad e nos relatórios de performance.</p>
                  <div className="bg-indigo-900/30 border-l-2 border-indigo-500 p-2 rounded text-[10px] text-indigo-200">
                      Sua TAG única será gerada automaticamente ao lado.
                  </div>
              </div>
          ),
          position: 'bottom',
          requiresInteraction: true 
      },
      {
          targetId: 'nav-planejamento',
          title: 'Módulo de Estratégia',
          view: 'planejamento',
          content: (
              <div>
                  <p className="mb-2">Acesse o laboratório de IA. Aqui é onde a mágica acontece.</p>
                  <p className="text-xs text-gray-400">Em vez de depositar valores aleatórios, usamos algoritmos para simular comportamento humano orgânico e evitar bloqueios.</p>
              </div>
          ),
          position: 'right',
          requiresInteraction: false
      },
      {
          targetId: 'tour-plan-generate',
          title: 'Geração de Cenários',
          view: 'planejamento',
          content: (
              <div>
                <p className="mb-3">A IA configurada criará um plano rítmico balanceado.</p>
                <p className="text-xs mb-3 text-gray-300">Ela mistura perfis (Testador, Cético, Viciado) para que sua operação pareça natural para as plataformas.</p>
                <p className="text-xs text-emerald-400 font-bold border border-emerald-500/30 p-2 rounded bg-emerald-500/10 text-center">Clique em "GERAR PLANO RÍTMICO" para testar.</p>
              </div>
          ),
          position: 'top',
          requiresInteraction: true
      },
      {
          targetId: 'tour-lot-send-1',
          title: 'Execução Tática',
          view: 'planejamento',
          content: (
              <div>
                  <p className="mb-2">Um plano sem ação é apenas um sonho.</p>
                  <p className="text-xs mb-3">Ao clicar em <strong className="text-white">ENVIAR</strong>, o sistema processa esses valores fictícios e os transforma em lançamentos reais no seu Livro Caixa.</p>
                  <div className="text-[10px] text-amber-300 bg-amber-900/20 p-2 rounded border border-amber-500/20">
                      Isso automatiza 90% do trabalho manual de registro.
                  </div>
              </div>
          ),
          position: 'bottom', // CORREÇÃO: Posicionado abaixo para não cobrir o botão
          requiresInteraction: true
      },
      {
          targetId: 'tour-daily-table',
          title: 'Livro Caixa Inteligente',
          view: 'controle',
          content: (
              <div>
                  <p className="mb-2">Aqui está a realidade financeira do dia.</p>
                  <p className="text-xs text-gray-300 mb-2">Os depósitos gerados já aparecem aqui. Sua única tarefa é preencher o <strong>SAQUE</strong> e os <strong>BÔNUS/CICLOS</strong> quando eles ocorrerem.</p>
                  <p className="text-xs text-blue-400 font-bold">O lucro líquido é calculado instantaneamente.</p>
              </div>
          ),
          position: 'top',
          requiresInteraction: false
      },
      {
          targetId: 'nav-squad',
          title: 'Rede de Inteligência',
          view: 'squad', // Força a troca para a view Squad
          content: (
              <div>
                  <p className="mb-3">Não opere no escuro. O Squad conecta você a uma hierarquia.</p>
                  <ul className="text-xs space-y-2 text-gray-300 mb-2">
                      <li className="flex gap-2 items-center"><Crown size={12} className="text-amber-400 shrink-0"/> <strong>Líder:</strong> Monitora a equipe em tempo real.</li>
                      <li className="flex gap-2 items-center"><LinkIcon size={12} className="text-emerald-400 shrink-0"/> <strong>Membro:</strong> Envia dados automaticamente para o líder.</li>
                  </ul>
                  <p className="text-[10px] text-gray-500">Se tiver um código de líder, insira-o aqui para sincronizar.</p>
              </div>
          ),
          position: 'right',
          requiresInteraction: false
      },
      {
          targetId: 'nav-dashboard',
          title: 'Visão de Comando',
          view: 'dashboard',
          content: (
              <div>
                  <p className="mb-2">Seu Dashboard é o resumo de tudo.</p>
                  <p className="text-xs text-gray-300">Acompanhe ROI, Margem de Lucro e compare sua performance com a média global da comunidade usando a Inteligência Global.</p>
                  <div className="mt-3 p-2 bg-primary/20 border border-primary/30 rounded text-center font-bold text-white text-xs">
                      Sistema Pronto. Boa operação! 🚀
                  </div>
              </div>
          ),
          position: 'right',
          requiresInteraction: false
      }
  ];

  // --- TOUR LOGIC ---
  useEffect(() => {
    if (!isLoaded || !state.onboarding) return;
    
    // Check if tour should start (only if not dismissed)
    if (!state.onboarding.dismissed && !tourOpen) {
        // Only start if name is NOT set (fresh start)
        // OR if specific flags are missing
        if (!state.onboarding.steps.configName) {
            setTourOpen(true);
        }
    }
  }, [isLoaded, state.onboarding?.dismissed]);

  // --- AUTO NAVIGATE TOUR STEPS ---
  useEffect(() => {
      if (tourOpen) {
          const step = tourSteps[tourStepIndex];
          if (step && step.view && activeView !== step.view) {
              setActiveView(step.view as ViewType);
          }
      }
  }, [tourOpen, tourStepIndex, activeView]);

  const handleTourComplete = () => {
      setTourOpen(false);
      updateState({ onboarding: { ...state.onboarding, dismissed: true } as any });
      notify("Tour concluído! Bom trabalho.", "success");
  };

  const handleSkipTour = () => {
      setShowSkipConfirm(true);
  };

  const confirmSkip = () => {
      setShowSkipConfirm(false);
      setTourOpen(false);
      updateState({ onboarding: { ...state.onboarding, dismissed: true } as any });
      notify("Tour pulado.", "info");
  };


  useEffect(() => {
    try {
        const isSupported = 'showOpenFilePicker' in window;
        setHasFileSystemSupport(isSupported);
        setIsIframe(window.self !== window.top);
    } catch (e) {
        setHasFileSystemSupport(false);
    }
  }, []);

  // Login Handler
  const handleLogin = (key: string, adminStatus: boolean, ownerName: string) => {
      setCurrentUserKey(key);
      setIsAdmin(adminStatus);
      setIsAuthenticated(true);
      
      // Load Data
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
          try {
              const parsed = JSON.parse(savedData);
              const merged = mergeDeep(initialState, parsed);
              // Force owner name from key if provided and not set locally
              if (ownerName && (!merged.config.userName || merged.config.userName === 'OPERADOR')) {
                  merged.config.userName = ownerName;
              }
              setState(merged);
          } catch (e) {
              console.error("Erro ao carregar dados locais", e);
          }
      }
      setIsLoaded(true);
  };

  // Logout
  const handleLogout = () => {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setIsAuthenticated(false);
      setCurrentUserKey('');
      setIsAdmin(false);
      setState(initialState);
      setIsLoaded(false);
  };

  // Demo Mode Toggle
  const toggleDemoMode = () => {
      if (isDemoMode) {
          // Revert to real state
          if (realStateRef.current) setState(realStateRef.current);
          setIsDemoMode(false);
          notify("Modo Demonstração encerrado.", "info");
      } else {
          // Save real state and generate demo
          realStateRef.current = state;
          const demoState = generateDemoState(state.config);
          setState(demoState);
          setIsDemoMode(true);
          notify("Modo Demonstração ativado! Dados fictícios.", "success");
      }
  };

  // Spectator Mode
  const handleSpectate = (data: AppState, memberName: string) => {
      // Save my current state to ref just in case, though spectate is readonly usually
      if (!isDemoMode && !spectatingData) {
          realStateRef.current = state;
      }
      setSpectatingData({ data, name: memberName });
  };

  const exitSpectator = () => {
      setSpectatingData(null);
      if (realStateRef.current) {
          setState(realStateRef.current);
          realStateRef.current = null;
      }
  };

  // State Update Wrapper
  const updateState = (updates: Partial<AppState>) => {
      if (spectatingData) return; // Read only in spectate
      if (isDemoMode) {
          // Allow updates in demo mode but don't save to LS
          setState(prev => mergeDeep(prev, updates));
          return;
      }

      setState(prev => {
          const newState = mergeDeep(prev, updates);
          
          // Auto-save logic
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
          
          setSaveStatus('saving');
          
          saveTimeoutRef.current = window.setTimeout(() => {
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
              setLastSaved(new Date());
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 2000);
          }, 1000);

          // Cloud Sync (Debounced 5s)
          syncTimeoutRef.current = window.setTimeout(() => {
              syncToCloud(newState);
          }, 5000);

          return newState;
      });
  };

  // Notification Handler
  const notify = (message: string, type: 'success' | 'error' | 'info') => {
      const id = Date.now();
      setNotifications(prev => [...prev, { id, type, message }]);
      setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }, 4000);
  };

  // View active logic (Spectator overrides)
  const activeState = spectatingData ? spectatingData.data : state;
  const isReadOnly = !!spectatingData || isDemoMode; 

  // --- RENDER ---
  if (!isAuthenticated) {
      return <LoginScreen onLogin={handleLogin} autoLoginCheck={isCheckingAuth} />;
  }

  const MenuButton = ({ id, icon: Icon, label, alert }: any) => (
      <button 
        id={`nav-${id}`} // CORREÇÃO: ID compatível com o Tour (nav-dashboard, nav-squad, etc)
        onClick={() => { setActiveView(id); setMobileMenuOpen(false); }}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm relative
            ${activeView === id 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
      >
          <Icon size={18} />
          <span>{label}</span>
          {alert && <span className="absolute right-3 w-2 h-2 bg-accent-pink rounded-full animate-pulse"></span>}
      </button>
  );

  return (
    <div className={`flex h-screen bg-background overflow-hidden font-sans selection:bg-primary/30 ${privacyMode ? 'privacy-active' : ''}`}>
      
      {/* SYSTEM ALERT MODAL (BROADCAST) */}
      {systemAlert && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#0f0a1e] border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-600"></div>
                  <div className="flex gap-4">
                      <div className="p-3 bg-amber-500/10 rounded-xl h-fit">
                          <Megaphone className="text-amber-500" size={32} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-white mb-2">{systemAlert.title}</h3>
                          <p className="text-gray-300 text-sm leading-relaxed">{systemAlert.message}</p>
                      </div>
                  </div>
                  <button 
                    onClick={() => setSystemAlert(null)}
                    className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all border border-white/5 uppercase text-xs tracking-wider"
                  >
                      Entendido
                  </button>
              </div>
          </div>
      )}

      {/* CONFIRM SKIP MODAL */}
      {showSkipConfirm && (
          <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#0f0a1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center">
                  <h3 className="text-lg font-bold text-white mb-2">Pular Introdução?</h3>
                  <p className="text-gray-400 text-xs mb-6">Você pode reiniciar o tour depois na aba Sistema.</p>
                  <div className="flex gap-3">
                      <button onClick={() => setShowSkipConfirm(false)} className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 text-xs font-bold hover:bg-white/10">Cancelar</button>
                      <button onClick={confirmSkip} className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold">Sim, Pular</button>
                  </div>
              </div>
          </div>
      )}

      {/* TOUR GUIDE */}
      <TourGuide 
          steps={tourSteps}
          isOpen={tourOpen}
          onClose={() => handleSkipTour()}
          onComplete={handleTourComplete}
          onSkip={handleSkipTour}
          currentStepIndex={tourStepIndex}
          setCurrentStepIndex={setTourStepIndex}
          disableNext={!canProceed && tourSteps[tourStepIndex].requiresInteraction}
      />

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface/95 backdrop-blur-xl border-r border-white/5 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full p-4">
            {/* Logo Area */}
            <div className="flex items-center gap-3 px-2 mb-8 mt-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/20">
                    <Activity className="text-white" size={24} />
                </div>
                <div>
                    <h1 className="font-bold text-white text-lg tracking-tight">CPA Gateway</h1>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Online V3.7</span>
                    </div>
                </div>
            </div>

            {/* User Info Card */}
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-400 uppercase">Operador</span>
                    {isAdmin && <span className="bg-amber-500/20 text-amber-500 text-[9px] px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">ADMIN</span>}
                </div>
                <div className="font-mono text-white font-bold truncate">
                    {spectatingData ? spectatingData.name : (state.config.userName || 'Anônimo')}
                </div>
                <div className="text-[10px] text-gray-500 mt-1 font-mono">
                    ID: {spectatingData ? 'ESPECTADOR' : (currentUserKey.length > 15 ? currentUserKey.substring(0, 15)+'...' : currentUserKey)}
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                <MenuButton id="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <MenuButton id="planejamento" icon={Cpu} label="Planejamento" />
                <MenuButton id="controle" icon={CalendarDays} label="Controle Diário" />
                <MenuButton id="squad" icon={Users} label="Comando Squad" alert={false} />
                <MenuButton id="despesas" icon={Receipt} label="Despesas" />
                <MenuButton id="metas" icon={Target} label="Metas & Sonhos" />
                
                <div className="pt-4 mt-4 border-t border-white/5">
                    <MenuButton id="configuracoes" icon={SettingsIcon} label="Sistema" />
                    {isAdmin && <MenuButton id="admin" icon={Shield} label="Painel Admin" />}
                </div>
            </nav>

            {/* Footer Actions */}
            <div className="mt-auto space-y-2">
                {spectatingData ? (
                    <button 
                        onClick={exitSpectator}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-pulse"
                    >
                        <EyeOff size={16} /> SAIR DO MODO ESPECTADOR
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={toggleDemoMode}
                            className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${isDemoMode ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'}`}
                        >
                            {isDemoMode ? <Terminal size={16} /> : <Terminal size={16} />} 
                            {isDemoMode ? 'SAIR DA DEMO' : 'MODO DEMO'}
                        </button>
                        
                        <button 
                            onClick={handleLogout}
                            className="w-full bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-gray-400 border border-white/5 hover:border-rose-500/20 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                        >
                            <LogOut size={16} /> DESCONECTAR
                        </button>
                    </>
                )}
            </div>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={`flex-1 flex flex-col h-full relative transition-all duration-300 lg:ml-64`}>
        {/* Topbar (Mobile Only mostly) */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:hidden bg-surface/80 backdrop-blur-md z-30 sticky top-0">
             <div className="flex items-center gap-3">
                <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white">
                    <Menu size={24} />
                </button>
                <span className="font-bold text-white">CPA Gateway</span>
             </div>
             {spectatingData && <div className="text-xs bg-rose-500 text-white px-2 py-1 rounded font-bold animate-pulse">ESPIANDO</div>}
        </header>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#02000f]">
             {/* Background Gradients */}
             <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none z-0"></div>

             <div className="p-4 lg:p-8 relative z-10 max-w-[1920px] mx-auto min-h-full">
                 {spectatingData && (
                     <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-3 rounded-xl mb-6 flex items-center justify-between animate-fade-in">
                         <div className="flex items-center gap-2">
                             <Eye size={20} />
                             <span className="font-bold text-sm">Você está visualizando o painel de: {spectatingData.name}</span>
                         </div>
                         <button onClick={exitSpectator} className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-rose-400 transition-colors">
                             Voltar ao Meu Painel
                         </button>
                     </div>
                 )}

                 {activeView === 'dashboard' && <Dashboard state={activeState} privacyMode={privacyMode} />}
                 {activeView === 'planejamento' && <Planning state={activeState} updateState={updateState} navigateToDaily={(date) => { setCurrentDate(date); setActiveView('controle'); }} notify={notify} readOnly={isReadOnly} privacyMode={privacyMode} />}
                 {activeView === 'controle' && <DailyControl state={activeState} updateState={updateState} currentDate={currentDate} setCurrentDate={setCurrentDate} notify={notify} readOnly={isReadOnly} privacyMode={privacyMode} />}
                 {activeView === 'despesas' && <Expenses state={activeState} updateState={updateState} readOnly={isReadOnly} privacyMode={privacyMode} />}
                 {activeView === 'configuracoes' && <Settings state={activeState} updateState={updateState} notify={notify} />}
                 {activeView === 'metas' && <Goals state={activeState} updateState={updateState} privacyMode={privacyMode} />}
                 {activeView === 'admin' && isAdmin && <Admin notify={notify} />}
                 {activeView === 'squad' && <Squad currentUserKey={currentUserKey} onSpectate={handleSpectate} notify={notify} privacyMode={privacyMode} />}
             </div>
        </div>

        {/* Notifications Toast */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
            {notifications.map(n => (
                <div key={n.id} className={`transform transition-all duration-300 animate-slide-in-right min-w-[300px] pointer-events-auto
                    ${n.type === 'success' ? 'bg-[#0f291e] border-emerald-500/30 text-emerald-400' : 
                      n.type === 'error' ? 'bg-[#2a1215] border-rose-500/30 text-rose-400' : 
                      'bg-[#0f172a] border-blue-500/30 text-blue-400'}
                    border p-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-xl
                `}>
                    {n.type === 'success' ? <CheckCircle2 size={20} /> : n.type === 'error' ? <AlertCircle size={20} /> : <Info size={20} />}
                    <p className="text-sm font-medium">{n.message}</p>
                </div>
            ))}
        </div>

        {/* Auto-Save Indicator */}
        <div className="fixed bottom-6 left-6 lg:left-72 z-40 pointer-events-none">
            {saveStatus === 'saving' && (
                <div className="bg-black/40 backdrop-blur-md border border-white/10 text-gray-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
                    <RefreshCw size={10} className="animate-spin" /> Salvando...
                </div>
            )}
            {saveStatus === 'saved' && (
                <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 size={10} /> Salvo
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;