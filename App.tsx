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
  Megaphone
} from 'lucide-react';
import { AppState, ViewType, Notification } from './types';
import { getHojeISO, mergeDeep, generateDemoState, generateUserTag, LOCAL_STORAGE_KEY, LAST_ACTIVE_KEY_STORAGE, AUTH_STORAGE_KEY, DEVICE_ID_KEY } from './utils';
import { supabase } from './supabaseClient';
import { useStore } from './store';

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

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserKey, setCurrentUserKey] = useState('');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Zustand Store Actions & State
  const setAll = useStore(s => s.setAll);
  const updateState = useStore(s => s.updateState);
  const fullState = useStore(); // Access full state for watchers
  
  // Selectors for specific checks
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
  const syncTimeoutRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [systemAlert, setSystemAlert] = useState<{title: string, message: string} | null>(null);

  const mainContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (mainContentRef.current) mainContentRef.current.scrollTo(0, 0);
  }, [activeView]);

  // Função para carregar da nuvem com timestamp
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

                      const cloudResult = await loadCloudData(savedKey);
                      let finalData = useStore.getState();

                      if (localData && cloudResult) {
                          finalData = mergeDeep(finalData, localData);
                      } else if (localData) {
                          finalData = mergeDeep(finalData, localData);
                      } else if (cloudResult) {
                          finalData = cloudResult.data;
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

  // --- AUTO-SAVE ---
  useEffect(() => {
    if (!isAuthenticated || !isLoaded || isDemoMode || currentUserKey === 'DEMO-USER-KEY') return;

    const unsubscribe = useStore.subscribe((state) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        localStorage.setItem(LAST_ACTIVE_KEY_STORAGE, currentUserKey);
        setLastSaved(new Date());

        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

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
                    setSaveStatus('error');
                }
            }, 3000);
        } else {
            setSaveStatus('saved');
        }
    });

    return () => unsubscribe();
  }, [isAuthenticated, isLoaded, isAdmin, currentUserKey, isDemoMode]);

  // --- INTEGRIDADE ---
  useEffect(() => {
    if (!isLoaded) return;
    
    // Gera TAG única se não existir
    if(!config.userTag) {
        updateState({ config: { ...config, userTag: generateUserTag() } });
    }

    // Gerencia estado do Onboarding (Tutorial) - Lógica Simplificada
    if (!onboarding) {
         // Verifica se o usuário já possui histórico de dados (se tem dados, pula o tour)
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

  // --- TOUR LOGIC & AUTO-ADVANCE ---
  useEffect(() => {
      // Inicia Tour se necessário
      if (isAuthenticated && isLoaded && onboarding && onboarding.dismissed === false && !tourOpen) {
          setTourOpen(true);
      }
  }, [isAuthenticated, isLoaded, onboarding]);

  // Effect para avançar automaticamente o Tour quando o usuário completa a ação
  useEffect(() => {
      if (!tourOpen) return;

      const currentStep = tourSteps[tourStepIndex];
      
      // Passo 3: Esperando gerar plano
      if (tourStepIndex === 3 && currentStep.targetId === 'tour-plan-generate') {
          if (fullState.generator.plan.length > 0) {
              const timer = setTimeout(() => setTourStepIndex(4), 1500); // Delay maior para ver o resultado
              return () => clearTimeout(timer);
          }
      }

      // Passo 6: Esperando registro no controle
      if (tourStepIndex === 6 && currentStep.targetId === 'daily-add-btn') {
          const today = getHojeISO();
          if (fullState.dailyRecords[today]?.accounts?.length > 0) {
              const timer = setTimeout(() => setTourStepIndex(7), 1500); // Delay maior
              return () => clearTimeout(timer);
          }
      }

  }, [tourOpen, tourStepIndex, fullState.generator.plan, fullState.dailyRecords, activeView]); 

  // --- FUNÇÃO DE FINALIZAÇÃO E LIMPEZA (Para o botão FINALIZAR) ---
  const finishTour = () => {
      setTourOpen(false);
      
      const currentState = useStore.getState();
      
      const newState = {
          ...currentState,
          onboarding: { 
              ...(currentState.onboarding || {}), 
              dismissed: true 
          },
          // FORÇA OBJETO VAZIO para limpar dados de teste
          dailyRecords: {}, 
          generator: { 
              ...currentState.generator, 
              plan: [], 
              history: [], 
              lotWithdrawals: {}, 
              customLotSizes: {} 
          }
      };

      setAll(newState);
      notify("Tutorial concluído! Sistema limpo para uso real.", "success");
      setActiveView('dashboard');
  };

  // --- NOVA FUNÇÃO PARA O BOTÃO X (Apenas fecha e não mostra mais) ---
  const handleTourDismiss = () => {
      setTourOpen(false);
      // Salva no estado que o usuário dispensou, mas NÃO apaga os dados (caso tenha feito algo útil)
      // Se quiser apagar dados também, pode chamar finishTour, mas geralmente 'X' é só fechar.
      // Vou manter apenas a flag dismissed = true para garantir que não volte.
      const currentOnboarding = useStore.getState().onboarding || { steps: {}, dismissed: false };
      updateState({
          onboarding: { ...currentOnboarding, dismissed: true }
      });
  };

  const tourSteps: TourStep[] = [
      { 
          targetId: 'dashboard', 
          title: 'Inicialização do Sistema', 
          content: 'Bem-vindo ao CPA Gateway Pro. Vou guiá-lo na configuração inicial do seu ambiente de trabalho. Clique em "PRÓXIMO" para começar.', 
          view: 'dashboard', 
          position: 'right' 
      },
      { 
          targetId: 'tour-settings-name', 
          title: 'Credencial de Operador', 
          content: 'Digite seu nome ou apelido no campo destacado. Quando terminar de digitar, clique em "PRÓXIMO" abaixo.', 
          view: 'configuracoes', 
          position: 'bottom',
          action: () => setActiveView('configuracoes'),
          waitForAction: false 
      },
      { 
          targetId: 'planejamento', 
          title: 'Módulo de Estratégia', 
          content: 'Identidade confirmada. Agora vamos ao coração do sistema: o Planejamento. Aqui você define quanto vai movimentar.', 
          view: 'planejamento', 
          action: () => setActiveView('planejamento'), 
          position: 'right' 
      },
      { 
          targetId: 'tour-plan-generate', 
          title: 'Gerador de Lotes', 
          content: 'O sistema cria valores inteligentes para evitar padrões. Clique em "GERAR PLANO" para criar sua primeira lista de trabalho.', 
          view: 'planejamento', 
          position: 'top',
          waitForAction: true // TRAVA AQUI
      },
      { 
          targetId: 'tour-lot-send-1', 
          title: 'Execução de Lote', 
          content: 'Plano gerado! Clique no botão "ENVIAR" do primeiro lote para processar os dados e registrá-los no financeiro.', 
          view: 'planejamento', 
          position: 'bottom',
          waitForAction: true // TRAVA AQUI: Obriga clicar em enviar
      },
      { 
          targetId: 'controle', 
          title: 'Livro Caixa', 
          content: 'Os dados foram enviados com sucesso! Esta é a tela de Controle Diário, onde seus registros financeiros ficam salvos.', 
          view: 'controle', 
          // Action removida pois o passo anterior já navega para cá
          position: 'right' 
      },
      { 
          targetId: 'daily-add-btn', 
          title: 'Registro Manual', 
          content: 'Além dos lotes automáticos, você pode lançar entradas avulsas. Clique em "NOVO REGISTRO" para adicionar uma entrada teste agora.', 
          view: 'controle', 
          position: 'left',
          waitForAction: true // TRAVA AQUI
      },
      { 
          targetId: 'tour-daily-table', 
          title: 'Operação Iniciada', 
          content: 'Excelente. Você já sabe o fluxo básico: Planejar > Executar > Registrar. Ao clicar em FINALIZAR, limparei esses dados de teste.', 
          view: 'controle', 
          position: 'top' 
      }
  ];

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => { setNotifications(prev => prev.filter(n => n.id !== id)); }, 4000);
  }, []);

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
  // Show Identity Check APENAS se o Tour não estiver ativo (para não encavalar)
  const showIdentityCheck = isAuthenticated && isLoaded && !isDemoMode && 
                            (!config.userName || invalidNames.includes(config.userName.toUpperCase())) &&
                            onboarding?.dismissed === true; // Só mostra modal se o tour já tiver sido dispensado ou finalizado

  if (!isAuthenticated) {
    return <LoginScreen 
        onLogin={async (key, admin, ownerName) => {
            setCurrentUserKey(key);
            setIsAdmin(admin);
            setIsAuthenticated(true);
            
            const localString = localStorage.getItem(LOCAL_STORAGE_KEY);
            let restoredState = null;

            if (localString) {
                try { restoredState = JSON.parse(localString); localStorage.setItem(LAST_ACTIVE_KEY_STORAGE, key); } catch(e) {}
            }

            if (!restoredState) {
                const cloudResult = await loadCloudData(key);
                if (cloudResult) restoredState = cloudResult.data;
            }
            
            let finalState = useStore.getState();
            if (restoredState) finalState = mergeDeep(finalState, restoredState);
            
            if (!finalState.config.userName || invalidNames.includes(finalState.config.userName.toUpperCase())) {
                finalState.config.userName = (ownerName && !invalidNames.includes(ownerName.toUpperCase())) ? ownerName : 'OPERADOR';
            }
            
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
                    {saveStatus === 'saved' && <><CheckCircle2 size={10} className="text-emerald-500"/> Saved</>}
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
                    // TOUR FIX: Força o avanço do passo antes de trocar a view
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