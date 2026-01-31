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
  Users // Squad Icon
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

// --- LOGIN COMPONENT ---
const LoginScreen = ({ onLogin }: { onLogin: (key: string, isAdmin: boolean, ownerName: string) => void }) => {
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [deviceId, setDeviceId] = useState('');

    useEffect(() => {
        let storedId = localStorage.getItem(DEVICE_ID_KEY);
        if (!storedId) {
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
        const isMasterKey = rawKey === 'ADMIN-GROCHA013';

        try {
            const { data, error } = await supabase
                .from('access_keys')
                .select('*')
                .eq('key', rawKey)
                .single();

            if (error || !data) {
                await new Promise(resolve => setTimeout(resolve, 1000)); 
                throw new Error('Chave de acesso inválida.');
            }

            if (data.active === false) {
                 throw new Error('Acesso suspenso pelo administrador.');
            }

            if (!isMasterKey) {
                if (data.hwid && data.hwid !== deviceId) {
                    throw new Error('Esta chave já está vinculada a outro dispositivo. Entre em contato com o suporte para resetar.');
                }
                if (!data.hwid) {
                    const { error: updateError } = await supabase
                        .from('access_keys')
                        .update({ hwid: deviceId })
                        .eq('id', data.id);
                    if (updateError) throw new Error('Erro ao vincular dispositivo. Tente novamente.');
                }
            }

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

    const handleFreeAccess = async () => {
        setLoading(true);
        
        try {
            // Lógica de Identidade Persistente
            let existingFreeKey = localStorage.getItem(FREE_KEY_STORAGE);
            
            // Se não tiver (ou se for a antiga genérica), gera uma nova
            if (!existingFreeKey || existingFreeKey === 'TROPA-FREE') {
                const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                existingFreeKey = `FREE-${p1}-${p2}`;
                localStorage.setItem(FREE_KEY_STORAGE, existingFreeKey);
            }

            // --- AUTO REGISTRO NO SUPABASE ---
            // Tenta registrar. Se falhar por RLS, loga o erro mas deixa entrar.
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
                console.warn("Falha no Auto-Registro (provavelmente RLS):", innerError);
            }

            // Salva na sessão atual para logar
            localStorage.setItem(AUTH_STORAGE_KEY, existingFreeKey);
            
            // Pequeno delay visual
            setTimeout(() => {
                onLogin(existingFreeKey, false, 'Visitante Gratuito');
            }, 500);

        } catch (err) {
            console.error("Erro inesperado no login Free:", err);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden font-sans select-none">
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
              // Silently ignore RLS errors on frequent syncs to avoid console spam
              // Only real errors matter here
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


  // --- TOUR STEPS DEFINITION (CORRIGIDO) ---
  const tourSteps: TourStep[] = [
      {
          targetId: 'nav-configuracoes',
          title: 'Configuração Inicial',
          view: 'configuracoes',
          content: (
              <div>
                  <p className="mb-3">Vamos começar ajustando o sistema para você. Clique em "Sistema" no menu.</p>
                  <div className="bg-blue-900/30 border-l-2 border-blue-500 p-2 rounded text-[11px] text-blue-200 leading-relaxed">
                      <strong>💡 Dica:</strong> Configurar corretamente garante que seus cálculos de lucro líquido sejam precisos desde o primeiro dia.
                  </div>
              </div>
          ),
          position: 'right',
          requiresInteraction: false
      },
      {
          targetId: 'tour-settings-name',
          title: 'Quem é você?',
          view: 'configuracoes',
          content: (
              <div>
                  <p className="mb-3">Para continuar, apague "OPERADOR" e digite seu nome ou apelido.</p>
                  <div className="bg-indigo-900/30 border-l-2 border-indigo-500 p-2 rounded text-[11px] text-indigo-200 leading-relaxed">
                      <strong>💡 Dica:</strong> Esse nome aparecerá nos relatórios de monitoramento e na saudação do dashboard.
                  </div>
              </div>
          ),
          position: 'bottom',
          requiresInteraction: true 
      },
      {
          targetId: 'nav-planejamento',
          title: 'Planejamento com IA',
          view: 'planejamento',
          content: 'Acesse o laboratório para criar estratégias de depósito.',
          position: 'right',
          requiresInteraction: false
      },
      {
          targetId: 'tour-plan-generate',
          title: 'Gerar Estratégia',
          view: 'planejamento',
          content: (
              <div>
                <p className="mb-2">O sistema cria valores orgânicos baseados no seu histórico para evitar bloqueios.</p>
                <p className="text-xs text-emerald-400 font-bold">Clique em "GERAR PLANO RÍTMICO" para testar.</p>
              </div>
          ),
          position: 'right',
          requiresInteraction: true
      },
      {
          targetId: 'tour-lot-send-1',
          title: 'Executar Lote',
          view: 'planejamento',
          content: 'Ao enviar um lote, os valores vão automaticamente para o seu Controle Diário (Livro Caixa). Clique em "Enviar" no Lote #1.',
          position: 'top',
          requiresInteraction: true
      },
      {
          targetId: 'tour-daily-table',
          title: 'Livro Caixa Automático',
          view: 'controle',
          content: 'Veja que os depósitos e redepósitos já foram preenchidos. Você só precisa focar em colocar o SAQUE e os CICLOS.',
          position: 'top',
          requiresInteraction: false
      },
      {
          targetId: 'tour-daily-costs',
          title: 'Controle de Custos',
          view: 'controle',
          content: 'Não esqueça de registrar custos diários (Proxy, SMS) para ter o lucro líquido real.',
          position: 'bottom',
          requiresInteraction: false
      },
      // --- NOVO PASSO SQUAD ---
      {
          targetId: 'nav-squad',
          title: 'Novo: Comando Squad',
          view: 'squad', // Força a troca para a view Squad
          content: (
              <div>
                  <p className="mb-3">Aqui você gerencia sua equipe ou entra em uma.</p>
                  <ul className="text-xs space-y-2 text-gray-300">
                      <li className="flex gap-2"><Crown size={14} className="text-amber-400 shrink-0"/> <strong>Líder:</strong> Copie sua chave e envie para seus funcionários.</li>
                      <li className="flex gap-2"><Users size={14} className="text-emerald-400 shrink-0"/> <strong>Membro:</strong> Cole a chave do líder para enviar seus dados automaticamente.</li>
                  </ul>
              </div>
          ),
          position: 'right',
          requiresInteraction: false
      }
  ];

  // --- TOUR LOGIC ---
  useEffect(() => {
      if(tourOpen) {
          const step = tourSteps[tourStepIndex];
          if(step && step.view !== activeView) {
              setActiveView(step.view as ViewType);
          }
      }
  }, [tourStepIndex, tourOpen]);

  useEffect(() => {
      if (!tourOpen) return;
      const currentStep = tourSteps[tourStepIndex];
      if (!currentStep?.requiresInteraction) {
          setCanProceed(true);
          return;
      }
      
      let valid = false;
      const today = getHojeISO();

      if (currentStep.title === 'Quem é você?') {
           valid = state.config.userName !== 'OPERADOR' && (state.config.userName || '').trim() !== '';
      } else if (currentStep.title === 'Gerar Estratégia') {
           valid = state.generator.plan.length > 0;
      } else if (currentStep.title === 'Executar Lote') {
           const hasAccountsToday = (state.dailyRecords[today]?.accounts || []).length > 0;
           valid = hasAccountsToday;
      } else {
           valid = true;
      }
      setCanProceed(valid);
  }, [state, tourStepIndex, tourOpen, activeView]); // Adicionado activeView para garantir re-render na troca

  const handleTourComplete = async () => {
      setTourOpen(false);
      notify("Tutorial Concluído! Limpando dados de teste...", "info");
      alert("🎉 TUTORIAL CONCLUÍDO!\n\nOs dados de teste inseridos agora serão apagados.\n\nBoa sorte, Operador!");
      await new Promise(resolve => setTimeout(resolve, 1000));
      const freshState: AppState = {
          ...initialState,
          config: { ...state.config }, 
          onboarding: { ...initialState.onboarding!, dismissed: true }
      };
      setState(freshState);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(freshState));
      localStorage.setItem('cpa_tour_completed', 'true');
      notify("Dados limpos! O sistema está pronto para uso real.", "success");
      setActiveView('dashboard');
  };

  const handleTourSkipRequest = () => setShowSkipConfirm(true);
  const handleConfirmSkip = () => {
      setTourOpen(false);
      setShowSkipConfirm(false);
      localStorage.setItem('cpa_tour_completed', 'true');
      notify("Tutorial pulado.", "info");
  };

  useEffect(() => {
      if (isLoaded && isAuthenticated) {
          const tourDone = localStorage.getItem('cpa_tour_completed');
          if (!tourDone && !isDemoMode) {
              setTimeout(() => setTourOpen(true), 1000); 
          }
      }
  }, [isLoaded, isAuthenticated, isDemoMode]);

  // --- PRESENCE & HEARTBEAT ---
  // (Mantidos do código original, suprimidos para brevidade se não houve alteração lógica, mas incluídos para segurança)
  const presenceChannelRef = useRef<any>(null); 
  const retryTimeoutRef = useRef<any>(null);
  const sessionStartTimeRef = useRef<string>(''); 

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sessionStartTimeRef.current) sessionStartTimeRef.current = new Date().toISOString();
    const connectPresence = () => {
        const deviceId = localStorage.getItem(DEVICE_ID_KEY) || 'unknown_device';
        const userName = state.config.userName || 'Desconhecido';
        if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
        const channel = supabase.channel('online_users', { config: { presence: { key: deviceId } } });
        presenceChannelRef.current = channel;
        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user: userName, key: currentUserKey, online_at: sessionStartTimeRef.current, is_admin: isAdmin, device_id: deviceId
                });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                if(retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(connectPresence, 5000);
            }
        });
    };
    connectPresence();
    const heartbeatInterval = setInterval(async () => {
         if(presenceChannelRef.current) {
            const deviceId = localStorage.getItem(DEVICE_ID_KEY) || 'unknown_device';
            const userName = state.config.userName || 'Desconhecido';
             await presenceChannelRef.current.track({
                user: userName, key: currentUserKey, online_at: sessionStartTimeRef.current, is_admin: isAdmin, device_id: deviceId
            }).catch(() => {});
         }
    }, 30000);
    return () => {
        clearInterval(heartbeatInterval);
        if(retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    };
  }, [isAuthenticated]); 

  // --- INIT & PERSISTENCE & AUTO-MIGRATION ---
  useEffect(() => {
      try { if (window.self !== window.top) setIsIframe(true); } catch (e) { setIsIframe(true); }
      if (!('showOpenFilePicker' in window)) setHasFileSystemSupport(false);
      
      // AUTO-MIGRAÇÃO DE CHAVE GENÉRICA PARA ÚNICA
      // Se detectar que a chave salva é 'TROPA-FREE', troca para uma única
      // para consertar o Squad automaticamente.
      let savedKey = localStorage.getItem(AUTH_STORAGE_KEY);
      
      if (savedKey === 'TROPA-FREE') {
          // Verifica se já temos uma chave única salva, senão cria uma
          let uniqueFreeKey = localStorage.getItem(FREE_KEY_STORAGE);
          if (!uniqueFreeKey) {
                const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
                const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
                uniqueFreeKey = `FREE-${p1}-${p2}`;
                localStorage.setItem(FREE_KEY_STORAGE, uniqueFreeKey);
          }

          // ** CORREÇÃO AUTOMÁTICA DE REGISTRO **
          // Insere a chave no Supabase para garantir que o Squad funcione
          supabase.from('access_keys').upsert({
              key: uniqueFreeKey,
              owner_name: 'Visitante Migrado',
              active: true,
              is_admin: false
          }, { onConflict: 'key' }).then(({ error }) => {
              if (error) console.error("Falha ao registrar chave migrada:", error);
          });
          
          // Atualiza a sessão atual para a chave correta
          localStorage.setItem(AUTH_STORAGE_KEY, uniqueFreeKey);
          savedKey = uniqueFreeKey;
          console.log("Sistema: Migração de chave Free realizada com sucesso.");
      }

      if (savedKey) {
          setIsAuthenticated(true);
          setCurrentUserKey(savedKey);
          const savedIsAdmin = localStorage.getItem('cpa_is_admin') === 'true';
          setIsAdmin(savedIsAdmin);
      }
  }, []);

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

  useEffect(() => {
    const handleBeforeUnload = () => { 
        if (state && !isDemoMode) localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state)); 
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state, isDemoMode]);

  // --- AUTO-SAVE LOCAL & CLOUD ---
  useEffect(() => {
    if (!isLoaded || isDemoMode) {
        if(isDemoMode) setSaveStatus('saved');
        return;
    }

    setSaveStatus('saving');
    
    // Local Storage Save
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

    // Cloud Sync (Throttle 3s)
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = window.setTimeout(() => {
        syncToCloud(state);
    }, 3000);

    return () => { 
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); 
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [state, fileHandle, isLoaded, isDemoMode]);

  const toggleDemoMode = () => {
      if (isDemoMode) {
          if (realStateRef.current) {
              setState(realStateRef.current);
              realStateRef.current = null;
          }
          setIsDemoMode(false);
          notify("Modo Demonstração ENCERRADO.", "info");
      } else {
          realStateRef.current = state;
          const demoData = generateDemoState(state.config);
          setState(demoData);
          setIsDemoMode(true);
          notify("Modo Demonstração ATIVADO.", "success");
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
    // Bloqueia edições se estiver no modo espectador
    if (spectatingData) {
        notify("Modo Espectador: Você não pode editar dados de outro operador.", "error");
        return;
    }
    setState(prev => ({ ...prev, ...newState }));
  };

  const handleLogout = (force: boolean = false) => {
      if(force || confirm('Encerrar sessão?')) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem('cpa_is_admin');
          sessionStartTimeRef.current = ''; 
          setIsAuthenticated(false);
          setIsAdmin(false);
          setCurrentUserKey('');
          setSpectatingData(null);
      }
  };

  const handleManualDownload = () => {
    if (spectatingData) {
        notify('Ação bloqueada no modo espectador', 'error');
        return;
    }
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `CPA_PRO_Backup_${new Date().toISOString().slice(0,10)}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    notify('Download iniciado.', 'success');
  };

  // --- RENDER CONTENT COM LÓGICA DE SQUAD ---
  const activeState = spectatingData ? spectatingData.data : state;
  const isReadOnly = !!spectatingData;

  const renderContent = () => {
    const props = { 
        state: activeState, 
        updateState, 
        notify, 
        readOnly: isReadOnly // Prop passada para todos componentes
    };

    switch (activeView) {
        case 'dashboard': return <Dashboard {...props} />;
        case 'planejamento': return <Planning {...props} navigateToDaily={(d) => { setCurrentDate(d); setActiveView('controle'); }} />;
        case 'controle': return <DailyControl {...props} currentDate={currentDate} setCurrentDate={setCurrentDate} />;
        case 'despesas': return <Expenses {...props} />;
        case 'configuracoes': return <Settings {...props} />;
        case 'metas': return <Goals {...props} />;
        case 'squad': return <Squad currentUserKey={currentUserKey} notify={notify} onSpectate={(data, name) => {
            setSpectatingData({ data, name });
            setActiveView('dashboard');
        }} />;
        case 'admin': return <Admin notify={notify} />;
        default: return null;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'planejamento', label: 'Planejamento IA', icon: Cpu },
    { id: 'controle', label: 'Controle Diário', icon: CalendarDays },
    { id: 'despesas', label: 'Despesas', icon: Receipt },
    { id: 'metas', label: 'Metas e Sonhos', icon: Target },
    { id: 'squad', label: 'Comando Squad', icon: Users }, // Novo Item
    { id: 'configuracoes', label: 'Sistema', icon: SettingsIcon },
  ];

  if (isAdmin) {
      if (!navItems.find(i => i.id === 'admin')) {
        navItems.push({ id: 'admin', label: 'Painel Admin', icon: Crown });
      }
  }

  if (!isAuthenticated) {
      return <LoginScreen onLogin={(key, admin, owner) => { 
          setIsAuthenticated(true); 
          setIsAdmin(admin); 
          localStorage.setItem('cpa_is_admin', String(admin));
          setCurrentUserKey(key); 
          if(owner) setState(prev => ({...prev, config: {...prev.config, userName: owner}}));
      }} />;
  }

  // Calculate Progress
  const onboardingSteps = state.onboarding?.steps || { configName: false, generatedPlan: false, sentLot: false, addedExpense: false };
  const completedCount = Object.values(onboardingSteps).filter(Boolean).length;
  const progressPercent = (completedCount / 4) * 100;
  const showOnboarding = state.onboarding && !state.onboarding.dismissed && completedCount < 4;

  return (
    <div className="flex h-screen bg-[#02000f] text-gray-200 overflow-hidden font-sans selection:bg-primary/30 selection:text-white relative">
      
      {/* ... (Modals, Tour, Notifications - Mantidos) ... */}
      <TourGuide 
        steps={tourSteps}
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
        onComplete={handleTourComplete}
        onSkip={handleTourSkipRequest}
        currentStepIndex={tourStepIndex}
        setCurrentStepIndex={setTourStepIndex}
        disableNext={!canProceed}
      />
      {showSkipConfirm && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
            {/* Modal Content */}
            <div className="bg-[#0f0a1e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                <button onClick={() => setShowSkipConfirm(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={16} /></button>
                <div className="flex flex-col items-center text-center">
                    <h3 className="text-lg font-bold text-white mb-2">Pular Tutorial?</h3>
                    <div className="flex gap-3 w-full mt-4"><button onClick={handleConfirmSkip} className="flex-1 px-4 py-2 bg-white text-black rounded-lg text-sm font-bold">Sim, Pular</button></div>
                </div>
            </div>
        </div>
      )}
      
      {/* --- NOTIFICATIONS STACK --- */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
         {/* System Alert & Notifications Logic */}
         {systemAlert && (
            <div className="pointer-events-auto animate-slide-in-right w-full">
                <div className="bg-[#0f0a1e]/95 backdrop-blur-xl border border-indigo-500/50 rounded-2xl p-4 shadow-[0_0_30px_rgba(99,102,241,0.3)] relative overflow-hidden group">
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Comunicado Admin</span>
                            <button onClick={() => setSystemAlert(null)}><X size={14} /></button>
                        </div>
                        <h4 className="text-white font-bold text-base mb-1 pr-6 leading-tight">{systemAlert.title}</h4>
                        <p className="text-gray-400 text-xs leading-relaxed">{systemAlert.message}</p>
                     </div>
                </div>
            </div>
         )}
         {notifications.map(n => (
          <div key={n.id} className={`pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-lg shadow-2xl border backdrop-blur-md animate-slide-in-right min-w-[320px] ${n.type === 'success' ? 'bg-emerald-900/90 border-emerald-500/20 text-emerald-400' : n.type === 'error' ? 'bg-rose-900/90 border-rose-500/20 text-rose-400' : 'bg-blue-900/90 border-blue-500/20 text-blue-400'}`}>
            <span className="text-xs font-bold tracking-wide">{n.message}</span>
          </div>
        ))}
      </div>

      {/* --- SPECTATOR MODE BANNER --- */}
      {spectatingData && (
          <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-black font-bold text-xs uppercase tracking-widest py-2 px-4 flex items-center justify-between shadow-lg shadow-amber-500/20 animate-slide-down">
              <div className="flex items-center gap-2">
                  <Eye size={16} />
                  <span>MODO ESPECTADOR: Visualizando {spectatingData.name}</span>
              </div>
              <button 
                onClick={() => setSpectatingData(null)}
                className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded transition-colors flex items-center gap-1"
              >
                  <X size={14} /> SAIR
              </button>
          </div>
      )}

      {/* Mobile Overlay */}
      {mobileMenuOpen && <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-20 lg:hidden" onClick={() => setMobileMenuOpen(false)} />}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-72 bg-[#050510] border-r border-white/5 transform transition-transform duration-300 ease-out flex flex-col justify-between ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
             <div className="flex items-center gap-4 mb-10 px-2 pt-4"> {/* PT-4 added for spacing if banner exists */}
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
                    <Activity size={22} fill="currentColor" />
                </div>
                <div>
                    <h1 className="font-bold text-xl leading-none text-white tracking-tight">CPA Gateway</h1>
                    <div className="flex items-center gap-2 mt-1">
                         <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> ONLINE</span>
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
                            id={`nav-${item.id}`}
                            onClick={() => { setActiveView(item.id as ViewType); setMobileMenuOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group relative ${isActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-gray-500 hover:text-gray-200 hover:bg-white/5'}`}
                        >
                            <Icon size={18} className={`transition-colors ${isActive ? 'text-primary' : 'group-hover:text-gray-300'}`} />
                            <span className="tracking-wide">{item.label}</span>
                            {isActive && <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-l-full bg-primary`}></div>}
                        </button>
                    );
                })}
            </nav>
        </div>
        
        <div className="p-6 border-t border-white/5 bg-[#080814]">
             {/* ... (Bottom Sidebar - Reset/Backup - Mantidos) ... */}
             <div className="flex gap-2 mb-3">
                <button onClick={handleManualDownload} disabled={isReadOnly} className={`flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <Download size={14} /> Backup
                </button>
                <button onClick={() => handleLogout()} className="w-10 flex items-center justify-center bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-gray-400 border border-white/5 hover:border-red-500/30 py-2.5 rounded-lg transition-all">
                    <LogOut size={16} />
                </button>
            </div>
             <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-white/5 bg-black/20">
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${spectatingData ? 'bg-amber-500' : saveStatus === 'saving' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                    <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Status</p>
                        <p className={`text-[10px] font-bold truncate ${spectatingData ? 'text-amber-500' : 'text-gray-300'}`}>
                            {spectatingData ? 'ESPECTADOR' : saveStatus === 'saving' ? 'Sincronizando...' : 'Nuvem Ativa'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative pt-8 lg:pt-0"> 
        {/* Added padding top for banner on mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0a0a0a] z-10">
            <span className="font-bold text-lg text-white">CPA Gateway</span>
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-gray-400 hover:text-white"><Menu size={24} /></button>
        </div>
        <div className={`flex-1 overflow-auto p-4 lg:p-8 relative z-0 custom-scrollbar ${spectatingData ? 'pt-12' : ''}`}>
            <div className="max-w-[1920px] mx-auto h-full">
                {renderContent()}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;