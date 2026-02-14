
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Menu, 
  CheckCircle2,
  AlertCircle,
  Info,
  RefreshCw,
  LogOut,
  Activity,
  Eye,
  EyeOff,
  X,
  Megaphone,
  Cloud,
  Download,
  Upload,
  Monitor,
  ArrowRightLeft,
  Calendar,
  User,
  DollarSign,
  Smartphone,
  Clock,
  ShieldAlert,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowDown,
  ArrowUp
} from 'lucide-react';
import { AppState, ViewType, Notification } from './types';
import { getHojeISO, mergeDeep, generateDemoState, generateUserTag, LOCAL_STORAGE_KEY, LAST_ACTIVE_KEY_STORAGE, AUTH_STORAGE_KEY, DEVICE_ID_KEY, calculateDayMetrics, formatarBRL } from './utils';
import { supabase } from './supabaseClient';
import { useStore, initialState } from './store';

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
import LoginScreen from './components/LoginScreen';
import IdentityModal from './components/IdentityModal';
import Sidebar from './components/Sidebar';

// Deep Equal Robusto (Ignora diferenças entre null/undefined e chaves ausentes)
const deepEqual = (obj1: any, obj2: any): boolean => {
    // 1. Igualdade estrita
    if (obj1 === obj2) return true;
    
    // 2. Tratar null e undefined como equivalentes
    if ((obj1 === null || obj1 === undefined) && (obj2 === null || obj2 === undefined)) return true;

    // 3. Se um for objeto/array e o outro não, são diferentes
    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) return false;

    // 4. Comparação de Datas (Correção Importante)
    if (obj1 instanceof Date && obj2 instanceof Date) {
        return obj1.getTime() === obj2.getTime();
    }

    // 5. Comparação de Arrays
    if (Array.isArray(obj1) && Array.isArray(obj2)) {
        if (obj1.length !== obj2.length) return false;
        for (let i = 0; i < obj1.length; i++) {
            if (!deepEqual(obj1[i], obj2[i])) return false;
        }
        return true;
    }

    // 6. Comparação de Objetos (Union das chaves)
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    const allKeys = new Set([...keys1, ...keys2]);

    for (let key of allKeys) {
        // Ignora funções
        if (typeof obj1[key] === 'function' || typeof obj2[key] === 'function') continue;
        
        if (!deepEqual(obj1[key], obj2[key])) return false;
    }

    return true;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserKey, setCurrentUserKey] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Zustand Store Actions & State
  const setAll = useStore(s => s.setAll);
  const updateState = useStore(s => s.updateState);
  const fullState = useStore(); 
  
  const config = useStore(s => s.config);
  const onboarding = useStore(s => s.onboarding);

  const [privacyMode, setPrivacyMode] = useState(false);
  const [spectatingData, setSpectatingData] = useState<{data: AppState, name: string} | null>(null);
  
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(getHojeISO());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [lastSaved, setLastSaved] = useState<Date>(new Date());
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastCloudSyncTime, setLastCloudSyncTime] = useState<string>(''); 
  const syncTimeoutRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [systemAlert, setSystemAlert] = useState<{title: string, message: string} | null>(null);

  // --- SYNC CONFLICT STATE ---
  const [pendingCloudData, setPendingCloudData] = useState<{data: AppState, time: string} | null>(null);

  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (mainContentRef.current) mainContentRef.current.scrollTo(0, 0);
  }, [activeView]);

  const loadCloudData = async (key: string): Promise<{ data: AppState, updatedAt: string } | null> => {
      try {
          const { data, error } = await supabase
              .from('user_data')
              .select('raw_json, updated_at')
              .eq('access_key', key)
              .single();
          
          if (!error && data && data.raw_json) {
              return { data: data.raw_json as AppState, updatedAt: data.updated_at };
          }
      } catch (e) {
          console.error("Erro ao buscar backup nuvem:", e);
      }
      return null;
  };

  useEffect(() => {
      const restoreSession = async () => {
          setIsCheckingAuth(true);
          const savedKey = localStorage.getItem(AUTH_STORAGE_KEY);
          
          if (savedKey) {
              try {
                  const { data, error } = await supabase
                      .from('access_keys')
                      .select('is_admin, owner_name, active')
                      .eq('key', savedKey)
                      .single();

                  if (data && data.active !== false) {
                      setCurrentUserKey(savedKey);
                      setIsAdmin(data.is_admin);
                      setIsAuthenticated(true);
                      
                      const localString = localStorage.getItem(LOCAL_STORAGE_KEY);
                      let localData = null;
                      if (localString) {
                          try { localData = JSON.parse(localString); } catch(e) {}
                      }

                      // Busca Nuvem
                      const cloudResult = await loadCloudData(savedKey);
                      let finalData = { ...initialState }; 

                      // Lógica de Merge: Local + Cloud
                      if (localData) {
                          finalData = mergeDeep(finalData, localData);
                          
                          if (cloudResult && cloudResult.data) {
                              // Se houver diferença, mostra modal de conflito
                              if (!deepEqual(localData, cloudResult.data)) {
                                  setPendingCloudData({
                                      data: cloudResult.data,
                                      time: new Date(cloudResult.updatedAt).toLocaleString()
                                  });
                              }
                          }
                      } else if (cloudResult) {
                          finalData = mergeDeep(finalData, cloudResult.data);
                      }

                      if (cloudResult && cloudResult.updatedAt) {
                          const dateObj = new Date(cloudResult.updatedAt);
                          setLastCloudSyncTime(dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                      }

                      if (data.owner_name && (!finalData.config.userName || finalData.config.userName === 'OPERADOR')) {
                          finalData.config.userName = data.owner_name;
                      }
                      
                      setAll(finalData);
                      setIsLoaded(true);

                  } else {
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

  // --- REALTIME SYNC LISTENER ---
  useEffect(() => {
      if (!isAuthenticated || !currentUserKey || isDemoMode) return;

      const channel = supabase.channel(`sync-${currentUserKey}`)
          .on(
              'postgres_changes',
              {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'user_data',
                  filter: `access_key=eq.${currentUserKey}`
              },
              (payload) => {
                  const newCloudData = payload.new.raw_json as AppState;
                  const newUpdatedAt = payload.new.updated_at;
                  
                  const currentData = useStore.getState();

                  // Verifica se os dados são REALMENTE diferentes
                  if (!deepEqual(currentData, newCloudData)) {
                      setPendingCloudData({
                          data: newCloudData,
                          time: new Date(newUpdatedAt).toLocaleTimeString()
                      });
                  }
              }
          )
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, currentUserKey, isDemoMode]);

  const handleResolveConflict = async (choice: 'cloud' | 'local') => {
      if (choice === 'cloud' && pendingCloudData) {
          // PROTOCOLO NUCLEAR (RESTORE)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pendingCloudData.data));
          setAll(pendingCloudData.data);
          notify("Dados restaurados. Reiniciando sistema...", "success");
          setTimeout(() => { window.location.reload(); }, 800);

      } else {
          // UPLOAD (LOCAL -> CLOUD)
          // CORREÇÃO: UPSERT ATÔMICO COM onConflict
          const currentState = useStore.getState();
          try {
              const { error } = await supabase.from('user_data').upsert({
                  access_key: currentUserKey,
                  raw_json: currentState,
                  updated_at: new Date().toISOString()
              }, { onConflict: 'access_key' });
              
              if (error) throw error;

              notify("Nuvem atualizada com sucesso!", "success");
              setLastCloudSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
              setPendingCloudData(null); 

          } catch (e: any) {
              notify(`Erro ao enviar para nuvem: ${e.message}`, "error");
          }
      }
  };

  // --- PRESENCE (ONLINE USERS) ---
  useEffect(() => {
      if (!isAuthenticated || !currentUserKey || !isLoaded || isDemoMode) return;

      const deviceId = localStorage.getItem(DEVICE_ID_KEY) || 'unknown';
      const channel = supabase.channel('online_users', {
          config: { presence: { key: deviceId } },
      });

      channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.track({
                  user: config.userName || 'Operador',
                  key: currentUserKey,
                  is_admin: isAdmin,
                  online_at: new Date().toISOString(),
                  device_id: deviceId
              });
          }
      });

      return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, currentUserKey, isLoaded, config.userName, isAdmin, isDemoMode]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 4000);
  }, []);

  // --- AUTO-SAVE (CORRIGIDO: UPSERT) ---
  useEffect(() => {
    if (!isAuthenticated || !isLoaded || isDemoMode || currentUserKey === 'DEMO-USER-KEY') return;

    const unsubscribe = useStore.subscribe((state) => {
        // Se houver conflito pendente, não salva para não sobrescrever a decisão do usuário
        if (pendingCloudData) return;

        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        localStorage.setItem(LAST_ACTIVE_KEY_STORAGE, currentUserKey);
        setLastSaved(new Date());

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

        if (!isAdmin && currentUserKey) {
            setSaveStatus('saving');
            syncTimeoutRef.current = window.setTimeout(async () => {
                try {
                    // USO DE UPSERT CORRETO
                    const { error } = await supabase
                        .from('user_data')
                        .upsert({ 
                            access_key: currentUserKey, 
                            raw_json: state, 
                            updated_at: new Date().toISOString() 
                        }, { onConflict: 'access_key' });
                    
                    if(error) throw error;
                    
                    setSaveStatus('saved');
                    setLastCloudSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                    setTimeout(() => setSaveStatus('idle'), 3000);
                } catch (err: any) {
                    console.error("Backup Cloud Error:", err);
                    setSaveStatus('error');
                }
            }, 3000); // 3 segundos de debounce
        } else {
            setSaveStatus('saved');
        }
    });

    return () => unsubscribe();
  }, [isAuthenticated, isLoaded, isAdmin, currentUserKey, isDemoMode, pendingCloudData]);

  // --- INTEGRIDADE ---
  useEffect(() => {
    if (!isLoaded) return;
    if(!config.userTag) {
        updateState({ config: { ...config, userTag: generateUserTag() } });
    }
    if (!onboarding) {
         const hasDailyData = fullState.dailyRecords && Object.keys(fullState.dailyRecords).length > 0;
         const hasPlanData = fullState.generator.plan && fullState.generator.plan.length > 0;
         const isExistingUser = hasDailyData || hasPlanData;

         updateState({ 
             onboarding: { 
                 steps: { configName: false, generatedPlan: false, sentLot: false, addedExpense: false }, 
                 dismissed: !!isExistingUser 
             } 
         });
    }
  }, [isLoaded]);

  // --- SYSTEM BROADCAST ---
  useEffect(() => {
      if (!isAuthenticated) return;
      const channel = supabase.channel('system_global_alerts');
      const myDeviceId = localStorage.getItem(DEVICE_ID_KEY);

      channel.on('broadcast', { event: 'sys_alert' }, (payload) => {
            const data = payload.payload;
            if (data.target === 'ALL' || data.target === myDeviceId || data.target === currentUserKey) {
                setSystemAlert({ title: data.title, message: data.message });
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(()=>{});
            }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, currentUserKey]);

  // --- TOUR LOGIC ---
  useEffect(() => {
      if (isAuthenticated && isLoaded && onboarding && onboarding.dismissed === false && !tourOpen) {
          setTourOpen(true);
      }
  }, [isAuthenticated, isLoaded, onboarding]);

  useEffect(() => {
      if (!tourOpen) return;
      const currentStep = tourSteps[tourStepIndex];
      if (tourStepIndex === 3 && currentStep.targetId === 'tour-plan-generate') {
          if (fullState.generator.plan.length > 0) {
              const timer = setTimeout(() => setTourStepIndex(4), 1500); 
              return () => clearTimeout(timer);
          }
      }
      if (tourStepIndex === 6 && currentStep.targetId === 'daily-add-btn') {
          const today = getHojeISO();
          if (fullState.dailyRecords[today]?.accounts?.length > 0) {
              const timer = setTimeout(() => setTourStepIndex(7), 1500);
              return () => clearTimeout(timer);
          }
      }
  }, [tourOpen, tourStepIndex, fullState.generator.plan, fullState.dailyRecords, activeView]); 

  const finishTour = () => {
      setTourOpen(false);
      const currentState = useStore.getState();
      const defaultSteps = { configName: true, generatedPlan: true, sentLot: true, addedExpense: true };
      
      const newState: AppState = {
          ...currentState,
          onboarding: { 
              steps: currentState.onboarding?.steps || defaultSteps,
              dismissed: true 
          },
          dailyRecords: {}, 
          generator: { ...currentState.generator, plan: [], history: [], lotWithdrawals: {}, customLotSizes: {} }
      };
      setAll(newState);
      notify("Tutorial concluído! Sistema limpo para uso real.", "success");
      setActiveView('dashboard');
  };

  const handleTourDismiss = () => {
      setTourOpen(false);
      const defaultSteps = { configName: false, generatedPlan: false, sentLot: false, addedExpense: false };
      const currentOnboarding = useStore.getState().onboarding || { steps: defaultSteps, dismissed: false };
      updateState({ onboarding: { ...currentOnboarding, dismissed: true } });
  };

  const tourSteps: TourStep[] = [
      { targetId: 'dashboard', title: 'Inicialização do Sistema', content: 'Bem-vindo ao CPA Gateway Pro. Vou guiá-lo na configuração inicial do seu ambiente de trabalho. Clique em "PRÓXIMO" para começar.', view: 'dashboard', position: 'right' },
      { targetId: 'tour-settings-name', title: 'Credencial de Operador', content: 'Digite seu nome ou apelido no campo destacado. Quando terminar de digitar, clique em "PRÓXIMO" abaixo.', view: 'configuracoes', position: 'bottom', action: () => setActiveView('configuracoes'), waitForAction: false },
      { targetId: 'planejamento', title: 'Módulo de Estratégia', content: 'Identidade confirmada. Agora vamos ao coração do sistema: o Planejamento. Aqui você define quanto vai movimentar.', view: 'planejamento', action: () => setActiveView('planejamento'), position: 'right' },
      { targetId: 'tour-plan-generate', title: 'Gerador de Lotes', content: 'O sistema cria valores inteligentes para evitar padrões. Clique em "GERAR PLANO" para criar sua primeira lista de trabalho.', view: 'planejamento', position: 'top', waitForAction: true },
      { targetId: 'tour-lot-send-1', title: 'Execução de Lote', content: 'Plano gerado! Clique no botão "ENVIAR" do primeiro lote para processar os dados e registrá-los no financeiro.', view: 'planejamento', position: 'bottom', waitForAction: true },
      { targetId: 'controle', title: 'Livro Caixa', content: 'Os dados foram enviados com sucesso! Esta é a tela de Controle Diário, onde seus registros financeiros ficam salvos.', view: 'controle', position: 'right' },
      { targetId: 'daily-add-btn', title: 'Registro Manual', content: 'Além dos lotes automáticos, você pode lançar entradas avulsas. Clique em "NOVO REGISTRO" para adicionar uma entrada teste agora.', view: 'controle', position: 'left', waitForAction: true },
      { targetId: 'tour-daily-table', title: 'Operação Iniciada', content: 'Excelente. Você já sabe o fluxo básico: Planejar > Executar > Registrar. Ao clicar em FINALIZAR, limparei esses dados de teste.', view: 'controle', position: 'top' }
  ];

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('sms_rush_token'); 
    window.location.reload();
  };

  const handleEnterDemo = () => {
      setIsDemoMode(true);
      setAll(generateDemoState(useStore.getState().config));
      setCurrentUserKey('DEMO-USER-KEY');
      setActiveView('dashboard');
  };

  const handleExitDemo = () => {
      setIsDemoMode(false);
      window.location.reload();
  };

  const invalidNames = ['OPERADOR', 'VISITANTE', 'VISITANTE GRATUITO', 'TESTE', 'ADMIN', 'USUARIO'];
  const showIdentityCheck = isAuthenticated && isLoaded && !isDemoMode && 
                            (!config.userName || invalidNames.includes(config.userName.toUpperCase())) &&
                            onboarding?.dismissed === true;

  if (!isAuthenticated) {
    return <LoginScreen 
        onLogin={async (key, admin, ownerName) => {
            setCurrentUserKey(key);
            setIsAdmin(admin);
            setIsAuthenticated(true);
            const localString = localStorage.getItem(LOCAL_STORAGE_KEY);
            let restoredState = null;
            if (localString) { try { restoredState = JSON.parse(localString); localStorage.setItem(LAST_ACTIVE_KEY_STORAGE, key); } catch(e) {} }
            
            // CARREGAR NUVEM
            let cloudData = null;
            try {
                const cloudResult = await loadCloudData(key);
                if (cloudResult) cloudData = cloudResult.data;
            } catch(e) {}

            let finalState = { ...initialState };
            
            if (restoredState) finalState = mergeDeep(finalState, restoredState);
            if (cloudData) finalState = mergeDeep(finalState, cloudData);

            if (!finalState.config.userName || invalidNames.includes(finalState.config.userName.toUpperCase())) { finalState.config.userName = (ownerName && !invalidNames.includes(ownerName.toUpperCase())) ? ownerName : 'OPERADOR'; }
            
            setAll(finalState);
            setIsLoaded(true);
        }} 
        onDemo={() => {
            setIsDemoMode(true);
            setAll(generateDemoState(useStore.getState().config));
            setCurrentUserKey('DEMO-USER-KEY');
            setActiveView('dashboard');
            setIsAuthenticated(true);
            setIsLoaded(true);
        }}
        autoLoginCheck={isCheckingAuth} 
    />;
  }
  
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative font-sans text-gray-200">
      
      {showIdentityCheck && (
          <IdentityModal 
            currentName={config.userName}
            onSave={(name) => {
                updateState({ config: { ...config, userName: name } });
                notify("Identidade definida com sucesso!", "success");
            }} 
          />
      )}

      {/* --- SYNC CONFLICT MODAL (LAYOUT PREMIUM LADO A LADO) --- */}
      {pendingCloudData && (
          <div className="fixed inset-0 z-[1000] bg-[#02000f]/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#0f0a1e] border border-amber-500/20 rounded-3xl w-full max-w-5xl shadow-[0_0_60px_rgba(245,158,11,0.1)] relative overflow-hidden flex flex-col max-h-[90vh]">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-white/5 bg-gradient-to-b from-amber-900/10 to-transparent flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-500/10 rounded-full text-amber-400 border border-amber-500/20">
                              <ArrowRightLeft size={24} />
                          </div>
                          <div>
                              <h3 className="text-xl font-black text-white tracking-tight">Sincronização Necessária</h3>
                              <p className="text-gray-400 text-xs font-medium mt-0.5">Backup remoto mais recente encontrado.</p>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-bold text-amber-400 uppercase tracking-widest animate-pulse">
                              <ShieldAlert size={12} /> Ação Requerida
                          </div>
                      </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[#050308]">
                      {(() => {
                          const localState = useStore.getState();
                          const cloudState = pendingCloudData.data;
                          
                          // Helper para extração de dados
                          const getData = (state: AppState) => {
                              let totalDeposits = 0, totalRedeposits = 0, totalWithdrawals = 0, totalBonus = 0, expenses = 0;
                              const dates = Object.keys(state.dailyRecords || {}).sort();
                              
                              dates.forEach(d => {
                                  const day = state.dailyRecords[d];
                                  expenses += (day.expenses?.proxy || 0) + (day.expenses?.numeros || 0);
                                  if(day.accounts){
                                      day.accounts.forEach(acc => {
                                          totalDeposits += (acc.deposito || 0);
                                          totalRedeposits += (acc.redeposito || 0);
                                          totalWithdrawals += (acc.saque || 0);
                                          const bonusVal = state.config.manualBonusMode ? (acc.ciclos || 0) : ((acc.ciclos || 0) * (state.config.valorBonus || 20));
                                          totalBonus += bonusVal;
                                      });
                                  }
                              });
                              if(state.generalExpenses) {
                                  expenses += state.generalExpenses.reduce((a,b) => a + (b.valor||0), 0);
                              }
                              return {
                                  name: state.config?.userName || '???',
                                  profit: (totalWithdrawals + totalBonus) - (totalDeposits + totalRedeposits + expenses),
                                  revenue: totalWithdrawals + totalBonus,
                                  withdrawals: totalWithdrawals,
                                  bonus: totalBonus,
                                  cost: totalDeposits + totalRedeposits + expenses,
                                  deposits: totalDeposits + totalRedeposits,
                                  expenses: expenses,
                                  days: dates.length,
                                  lastDate: dates[dates.length-1] || '-'
                              };
                          };

                          const local = getData(localState);
                          const cloud = getData(cloudState);

                          // Card Component
                          const VersionCard = ({ title, type, data, date }: any) => {
                              const isCloud = type === 'cloud';
                              const color = isCloud ? 'indigo' : 'emerald';
                              
                              return (
                                  <div className={`flex flex-col h-full rounded-2xl border ${isCloud ? 'bg-indigo-950/10 border-indigo-500/20' : 'bg-emerald-950/10 border-emerald-500/20'} overflow-hidden relative group`}>
                                      
                                      {/* Header Card */}
                                      <div className={`p-4 border-b ${isCloud ? 'border-indigo-500/10 bg-indigo-900/10' : 'border-emerald-500/10 bg-emerald-900/10'} flex justify-between items-center`}>
                                          <div className="flex items-center gap-3">
                                              <div className={`p-2 rounded-lg ${isCloud ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                                                  {isCloud ? <Cloud size={18}/> : <Smartphone size={18}/>}
                                              </div>
                                              <div>
                                                  <h4 className={`text-sm font-black uppercase tracking-wider ${isCloud ? 'text-indigo-200' : 'text-emerald-200'}`}>{title}</h4>
                                                  <p className={`text-[10px] font-mono opacity-70 ${isCloud ? 'text-indigo-300' : 'text-emerald-300'}`}>{date}</p>
                                              </div>
                                          </div>
                                          <div className={`text-[10px] font-bold px-2 py-1 rounded border ${isCloud ? 'border-indigo-500/30 text-indigo-400' : 'border-emerald-500/30 text-emerald-400'}`}>
                                              {data.name}
                                          </div>
                                      </div>

                                      {/* Main Metric */}
                                      <div className="p-6 text-center border-b border-white/5 relative">
                                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Lucro Líquido Total</p>
                                          <div className={`text-3xl font-black font-mono tracking-tight ${data.profit >= 0 ? (isCloud ? 'text-indigo-400' : 'text-emerald-400') : 'text-rose-400'}`}>
                                              {formatarBRL(data.profit)}
                                          </div>
                                      </div>

                                      {/* Breakdown Details */}
                                      <div className="p-4 space-y-4 text-sm flex-1">
                                          
                                          {/* ENTRADAS */}
                                          <div>
                                              <p className={`text-[10px] font-bold uppercase mb-2 flex items-center gap-1 ${isCloud ? 'text-indigo-300/50' : 'text-emerald-300/50'}`}>
                                                  <ArrowUp size={10} /> Entradas (Receita)
                                              </p>
                                              <div className="bg-black/20 rounded-lg p-2 space-y-1">
                                                  <div className="flex justify-between">
                                                      <span className="text-gray-500 text-xs">Saques</span>
                                                      <span className="font-mono font-bold text-gray-300">{formatarBRL(data.withdrawals)}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                      <span className="text-gray-500 text-xs">Bônus</span>
                                                      <span className="font-mono font-bold text-gray-300">{formatarBRL(data.bonus)}</span>
                                                  </div>
                                              </div>
                                          </div>

                                          {/* SAÍDAS */}
                                          <div>
                                              <p className="text-[10px] text-rose-400/50 font-bold uppercase mb-2 flex items-center gap-1">
                                                  <ArrowDown size={10} /> Saídas (Custos)
                                              </p>
                                              <div className="bg-black/20 rounded-lg p-2 space-y-1">
                                                  <div className="flex justify-between">
                                                      <span className="text-gray-500 text-xs">Depósitos</span>
                                                      <span className="font-mono font-bold text-gray-300">{formatarBRL(data.deposits)}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                      <span className="text-gray-500 text-xs">Despesas</span>
                                                      <span className="font-mono font-bold text-gray-300">{formatarBRL(data.expenses)}</span>
                                                  </div>
                                              </div>
                                          </div>

                                          {/* META INFO */}
                                          <div className="pt-2 border-t border-white/5 flex justify-between text-[10px] text-gray-500 font-mono">
                                               <span>Reg: {data.days} dias</span>
                                               <span>Últ: {data.lastDate}</span>
                                          </div>

                                      </div>
                                  </div>
                              );
                          };

                          return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                                  <VersionCard 
                                      title="Versão Nuvem (Backup)" 
                                      type="cloud" 
                                      data={cloud} 
                                      date={pendingCloudData.time} 
                                  />
                                  <VersionCard 
                                      title="Versão Local (Atual)" 
                                      type="local" 
                                      data={local} 
                                      date="Agora mesmo" 
                                  />
                              </div>
                          );
                      })()}
                  </div>

                  {/* Footer Actions */}
                  <div className="p-6 border-t border-white/5 bg-[#0a0516] flex flex-col md:flex-row gap-4 justify-between items-center">
                       <div className="flex items-center gap-3 text-amber-500/60 text-xs font-medium max-w-md leading-tight">
                           <Info size={16} className="shrink-0" />
                           <span>Escolha com sabedoria. A versão que você descartar será perdida permanentemente.</span>
                       </div>
                       <div className="flex gap-3 w-full md:w-auto">
                          <button 
                              onClick={() => handleResolveConflict('cloud')}
                              className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-wider group"
                          >
                              <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
                              <span>Usar Nuvem</span>
                          </button>
                          <button 
                              onClick={() => handleResolveConflict('local')}
                              className="flex-1 md:flex-none bg-emerald-600/10 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 text-emerald-400 font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider group"
                          >
                              <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" /> 
                              <span>Manter Local</span>
                          </button>
                       </div>
                  </div>
              </div>
          </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-mesh opacity-30"></div>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(112, 0, 255, 0.03) 0%, transparent 50%)' }}></div>
      </div>

      {systemAlert && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-[#0f0a1e] border border-indigo-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
                  <div className="flex items-start gap-4 mb-4">
                      <div className="p-3 bg-indigo-500/20 rounded-full text-indigo-400 animate-pulse"><Megaphone size={24} /></div>
                      <div>
                          <h3 className="text-xl font-bold text-white mb-1">{systemAlert.title}</h3>
                          <p className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Mensagem do Sistema</p>
                      </div>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-6 border-l-2 border-indigo-500/20 pl-4">{systemAlert.message}</p>
                  <button onClick={() => setSystemAlert(null)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all">ENTENDIDO</button>
              </div>
          </div>
      )}

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
            {!spectatingData && !isDemoMode && (
                <div className="hidden md:flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-gray-500">
                    {saveStatus === 'saving' && <><RefreshCw size={10} className="animate-spin text-primary"/> Syncing...</>}
                    {saveStatus === 'saved' && <><Cloud size={10} className="text-emerald-500"/> Saved <span className="text-[9px] opacity-70">({lastCloudSyncTime})</span></>}
                    {saveStatus === 'error' && <><AlertCircle size={10} className="text-rose-500"/> Sync Error</>}
                </div>
            )}
            <button onClick={() => setPrivacyMode(!privacyMode)} className={`p-2 rounded-lg transition-all ${privacyMode ? 'bg-amber-500/20 text-amber-500' : 'hover:bg-white/5 text-gray-400'}`}>
                {privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><LogOut size={18} /></button>
            <button className="md:hidden p-2 text-gray-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
            activeView={activeView}
            setActiveView={setActiveView}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            isAdmin={isAdmin}
            isDemoMode={isDemoMode}
            currentUserKey={currentUserKey}
            onLogout={handleLogout}
            onEnterDemo={handleEnterDemo}
            onExitDemo={handleExitDemo}
        />

        <main ref={mainContentRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-background relative scroll-smooth p-4 lg:p-8">
            {spectatingData && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-3 rounded-xl mb-6 flex justify-between items-center animate-fade-in">
                    <span className="flex items-center gap-2 font-bold text-sm"><Eye size={18} /> MODO ESPECTADOR: Visualizando {spectatingData.name}</span>
                    <button onClick={() => setSpectatingData(null)} className="bg-amber-500 text-black px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors">SAIR</button>
                </div>
            )}

            <div className="fixed top-20 right-4 z-[100] space-y-2 pointer-events-none">
                {notifications.map(n => (
                    <div key={n.id} className={`pointer-events-auto transform transition-all duration-300 animate-slide-in-right max-w-sm w-full shadow-2xl rounded-xl p-4 border flex items-start gap-3 backdrop-blur-md ${n.type === 'success' ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-100' : n.type === 'error' ? 'bg-rose-900/80 border-rose-500/30 text-rose-100' : 'bg-blue-900/80 border-blue-500/30 text-blue-100'}`}>
                        <div className={`p-1.5 rounded-full shrink-0 ${n.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : n.type === 'error' ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>{n.type === 'success' ? <CheckCircle2 size={16} /> : n.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}</div>
                        <div><p className="text-sm font-medium leading-tight">{n.message}</p></div>
                    </div>
                ))}
            </div>
            
            {activeView === 'dashboard' && <Dashboard forcedState={spectatingData?.data} privacyMode={privacyMode} />}
            {activeView === 'store' && <Store currentUserKey={currentUserKey} />}
            {activeView === 'sms' && <SmsRush notify={notify} />}
            {activeView === 'planejamento' && <Planning 
                forcedState={spectatingData?.data} 
                navigateToDaily={(d) => { 
                    if (tourOpen && tourStepIndex === 4) {
                        setTourStepIndex(5);
                    }
                    setActiveView('controle'); 
                    setCurrentDate(d); 
                }} 
                notify={notify} 
                readOnly={!!spectatingData || isDemoMode} 
                privacyMode={privacyMode} 
            />}
            {activeView === 'controle' && <DailyControl forcedState={spectatingData?.data} currentDate={currentDate} setCurrentDate={setCurrentDate} notify={notify} readOnly={!!spectatingData || isDemoMode} privacyMode={privacyMode} />}
            {activeView === 'despesas' && <Expenses forcedState={spectatingData?.data} readOnly={!!spectatingData || isDemoMode} privacyMode={privacyMode} />}
            {activeView === 'metas' && <Goals forcedState={spectatingData?.data} privacyMode={privacyMode} />}
            {activeView === 'configuracoes' && <Settings forcedState={spectatingData?.data} notify={notify} />}
            {activeView === 'admin' && isAdmin && <Admin notify={notify} />}
            {activeView === 'squad' && <Squad currentUserKey={currentUserKey} onSpectate={(data, name) => { setSpectatingData({data, name}); setActiveView('dashboard'); }} notify={notify} privacyMode={privacyMode} />}
            {activeView === 'slots' && <SlotsRadar notify={notify} isAdmin={isAdmin} currentUserKey={currentUserKey} userName={config.userName} />}

            {!isDemoMode && !spectatingData && (
                <TourGuide 
                    steps={tourSteps}
                    isOpen={tourOpen}
                    currentStepIndex={tourStepIndex}
                    setCurrentStepIndex={setTourStepIndex}
                    onClose={handleTourDismiss}
                    onComplete={finishTour}
                    onSkip={finishTour}
                />
            )}
        </main>
      </div>
    </div>
  );
}

export default App;
