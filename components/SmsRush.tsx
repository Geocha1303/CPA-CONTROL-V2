
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, RefreshCw, Search, Copy, X, MessageSquare, LogIn, Globe, Wifi, ShieldOff, Activity, LayoutGrid, List, Wallet, Timer, CloudLightning, Server, CheckCircle2, XCircle, ShoppingBag, ArrowRight, Star, Zap, AlertTriangle, Trash2, Phone, Mail, Video, Hash, Camera, Send, DollarSign, Database, FileText, Download, Landmark, ExternalLink, Lock } from 'lucide-react';

interface Props {
    notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface Service {
    id: number;
    name: string;
    price: number;
    quantity: number;
    favorite?: boolean;
}

interface ActiveNumber {
    id: string;
    number: string;
    service_name: string;
    service_id: number;
    code?: string;
    status: 'WAITING' | 'RECEIVED' | 'CANCELED' | 'FINISHED';
    timer?: number;
    server_id: number;
    purchase_time: number;
    cancelUnlockTime?: number;
}

interface PixKey {
    id: string;
    number: string;
    bank: string;
    date: string;
    code: string;
    server_id: number;
}

// --- FILTRO BANCÁRIO ESTRITO ---
const BANK_KEYWORDS = [
    'nubank', 'picpay', 'pagbank', 'mercadopago', 'c6', 'inter', 'itau', 'bradesco', 
    'santander', 'caixa', 'neon', 'will', 'next', 'banco', 'infinitepay', 'ton', 
    'recargapay', '99pay', 'banqi', 'iti', 'agibank', 'sofisa', 'pan', 'original',
    'safra', 'btg', 'digio', 'nomad', 'wise', 'bs2', 'crefisa', 'bmg', 'mercado'
];

// --- CATÁLOGO ESTÁTICO (DADOS REAIS F12) ---
const STATIC_DB: Record<number, Service[]> = {
    1: [
        { id: 3, name: "99app", price: 0.8, quantity: 100 },
        { id: 4, name: "Abastece-ai", price: 0.4, quantity: 100 },
        { id: 5, name: "AGIBANK", price: 0.5, quantity: 100 },
        { id: 6, name: "aiqfome", price: 0.5, quantity: 100 },
        { id: 11, name: "Ame Digital", price: 0.55, quantity: 100 },
        { id: 13, name: "ApostaGanha", price: 0.3, quantity: 100 },
        { id: 15, name: "Asaas", price: 0.5, quantity: 100 },
        { id: 16, name: "Astropay", price: 0.8, quantity: 100 },
        { id: 19, name: "Banqi", price: 0.3, quantity: 100 },
        { id: 20, name: "bet365", price: 0.5, quantity: 100 },
        { id: 21, name: "Binance", price: 0.5, quantity: 100 },
        { id: 25, name: "Bradesco", price: 0.4, quantity: 100 },
        { id: 28, name: "C6 Bank", price: 0.55, quantity: 100 },
        { id: 29, name: "CAIXA", price: 1.0, quantity: 100 },
        { id: 30, name: "Casino/bet", price: 1.0, quantity: 100 },
        { id: 59, name: "Itau", price: 0.6, quantity: 100 },
        { id: 60, name: "Iti", price: 0.4, quantity: 100 },
        { id: 70, name: "Mercado Pago", price: 1.3, quantity: 100 },
        { id: 83, name: "Nubank", price: 1.2, quantity: 100 },
        { id: 89, name: "PagBank", price: 0.4, quantity: 100 },
        { id: 91, name: "Paypal", price: 0.3, quantity: 100 },
        { id: 105, name: "Santander", price: 0.5, quantity: 100 },
        { id: 154, name: "Mercado Livre", price: 0.5, quantity: 100 }
    ],
    2: [
        { id: 5370, name: "bet365", price: 3.5, quantity: 100 },
        { id: 5372, name: "Casino/bet", price: 1.9, quantity: 100 },
        { id: 5363, name: "99app", price: 1.0, quantity: 100 },
        { id: 5367, name: "Agibank", price: 1.3, quantity: 100 },
        { id: 5382, name: "ApostaGanha", price: 1.0, quantity: 100 },
        { id: 5374, name: "Bradesco", price: 1.5, quantity: 100 },
        { id: 5360, name: "C6 Bank", price: 1.3, quantity: 100 },
        { id: 5365, name: "Infinitepay", price: 1.5, quantity: 100 },
        { id: 5366, name: "Itau", price: 1.5, quantity: 100 },
        { id: 5383, name: "Iti", price: 0.5, quantity: 100 },
        { id: 5300, name: "Mercado Livre", price: 1.4, quantity: 100 },
        { id: 5364, name: "Neon", price: 1.3, quantity: 100 },
        { id: 5359, name: "Nubank", price: 1.5, quantity: 100 },
        { id: 5373, name: "PagBank", price: 1.0, quantity: 100 },
        { id: 5358, name: "Picpay", price: 1.2, quantity: 100 },
        { id: 5362, name: "Santander", price: 0.7, quantity: 100 },
        { id: 5385, name: "Will Bank", price: 1.3, quantity: 100 },
        { id: 5384, name: "Wise", price: 1.5, quantity: 100 }
    ],
    3: [
        { id: 2156, name: "AGIBANK", price: 0.5, quantity: 100 },
        { id: 2163, name: "CAIXA", price: 0.5, quantity: 100 },
        { id: 2155, name: "Cassino / bets", price: 1.0, quantity: 100 },
        { id: 2165, name: "Celcoin", price: 0.5, quantity: 100 },
        { id: 2164, name: "Iti", price: 0.5, quantity: 100 },
        { id: 154, name: "Mercado Pago", price: 0.5, quantity: 100 },
        { id: 1154, name: "PicPay", price: 0.7, quantity: 100 },
        { id: 2161, name: "RecargaPay", price: 0.5, quantity: 100 },
        { id: 2158, name: "Santander", price: 0.5, quantity: 100 }
    ]
};

const SmsRush: React.FC<Props> = ({ notify }) => {
    // Auth State
    const [token, setToken] = useState(localStorage.getItem('sms_rush_token') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Data State
    const [balance, setBalance] = useState<number | null>(null);
    const [loginStatus, setLoginStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

    // App State
    const [services, setServices] = useState<Service[]>([]);
    const [filteredServices, setFilteredServices] = useState<Service[]>([]);
    const [favorites, setFavorites] = useState<number[]>(() => {
        const saved = localStorage.getItem('sms_favorites');
        return saved ? JSON.parse(saved) : [];
    });
    
    // Server State Management
    const [selectedServer, setSelectedServer] = useState<number>(1);
    const [activeTab, setActiveTab] = useState<'catalog' | 'vault'>('catalog');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>([]);
    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    
    // Pix Keys State
    const [pixKeys, setPixKeys] = useState<PixKey[]>(() => {
        const saved = localStorage.getItem('sms_pix_keys');
        return saved ? JSON.parse(saved) : [];
    });
    
    // Cancellation State
    const [cancellingIds, setCancellingIds] = useState<string[]>([]);

    const [lastUpdate, setLastUpdate] = useState<string>('');

    // Ref para garantir acesso ao valor mais atual do token em callbacks
    const tokenRef = useRef(token);
    
    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    // Timers Reference for Force Update
    const [, setTick] = useState(0);

    // Salvar favoritos
    useEffect(() => {
        localStorage.setItem('sms_favorites', JSON.stringify(favorites));
    }, [favorites]);

    // Salvar Pix Keys
    useEffect(() => {
        localStorage.setItem('sms_pix_keys', JSON.stringify(pixKeys));
    }, [pixKeys]);

    // --- EDGE FUNCTION REQUEST HANDLER (V2) ---
    const requestBridge = useCallback(async (
        targetEndpoint: string, 
        method: string = 'GET', 
        body: any = null, 
        tokenOverride?: string,
        proxyParams?: Record<string, string>
    ) => {
        const BASE_URL = 'https://hmtnpthypvzozroghzsc.supabase.co/functions/v1/sms-proxy';
        const cleanPath = targetEndpoint.startsWith('/') ? targetEndpoint.substring(1) : targetEndpoint;
        const urlObj = new URL(BASE_URL);
        urlObj.searchParams.append('path', cleanPath);
        
        if (proxyParams) {
            Object.entries(proxyParams).forEach(([k, v]) => {
                urlObj.searchParams.append(k, v);
            });
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        const activeToken = tokenOverride || tokenRef.current || token;

        if (activeToken) {
            headers['Authorization'] = `Bearer ${activeToken}`;
        }

        const options: RequestInit = {
            method: method,
            headers: headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(urlObj.toString(), options);
            if (!res.ok) {
                let errorMsg = `Erro HTTP: ${res.status}`;
                try {
                    const errData = await res.json();
                    if (errData.error || errData.message) errorMsg = errData.error || errData.message;
                } catch(e) {}
                if (res.status === 401) {
                    setToken('');
                    localStorage.removeItem('sms_rush_token');
                }
                throw new Error(errorMsg);
            }
            const data = await res.json();
            if (data && (data.status === 'error' || data.error)) {
                throw new Error(data.message || data.error);
            }
            return { ok: true, json: async () => data };
        } catch (err: any) {
            console.error("SMS Proxy Error:", err);
            throw err;
        }
    }, [token]);

    // --- ACTIONS ---

    const fetchServices = useCallback(async (tokenOverride?: string, serverId: number = selectedServer) => {
        setIsLoadingServices(true);
        try {
            // USANDO CATÁLOGO ESTÁTICO COM FILTRO BANCÁRIO
            const staticData = STATIC_DB[serverId] || [];
            
            // FILTRO RIGOROSO: Apenas serviços que contém palavras-chave de banco
            const bankServices = staticData.filter(s => 
                BANK_KEYWORDS.some(k => s.name.toLowerCase().includes(k))
            );
            
            const sortedData = [...bankServices].sort((a: Service, b: Service) => {
                const isFavA = favorites.includes(a.id);
                const isFavB = favorites.includes(b.id);
                if (isFavA && !isFavB) return -1;
                if (!isFavA && isFavB) return 1;
                return a.name.localeCompare(b.name);
            });

            setServices(sortedData);
            setFilteredServices(sortedData);
            setLastUpdate(new Date().toLocaleTimeString());
        } catch (err) {
            console.error("Fetch Services Error", err);
            notify(`Usando catálogo offline para Server ${serverId}.`, "info");
        } finally {
            setIsLoadingServices(false);
        }
    }, [notify, favorites, selectedServer]);

    const handleServerChange = (id: number) => {
        if (id === selectedServer) return;
        setSelectedServer(id);
        fetchServices(undefined, id); 
        // notify(`Conectado ao Server ${id}`, 'info');
    };

    const refreshData = async () => {
        if (!tokenRef.current) return;
        await Promise.all([fetchServices(tokenRef.current, selectedServer), fetchBalance(tokenRef.current)]);
    };

    const fetchBalance = useCallback(async (tokenOverride?: string) => {
        try {
            const res = await requestBridge('auth/me', 'GET', null, tokenOverride);
            const data = await res.json();
            const bal = data.balance ?? data.user?.balance ?? data.data?.balance ?? data.data?.user?.balance ?? data.data?.current_balance;
            if (bal !== undefined) setBalance(Number(bal));
        } catch (e) { console.error("Balance Error", e); }
    }, [requestBridge]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loginStatus === 'loading') return;
        setLoginStatus('loading');

        try {
            const res = await requestBridge('auth/login', 'POST', { email, password });
            const data = await res.json();
            const tk = data.token || data.access_token || data.key || data.data?.token || data.data?.access_token;
            
            if (tk) {
                setToken(tk);
                localStorage.setItem('sms_rush_token', tk);
                tokenRef.current = tk;
                
                const bal = data.balance ?? data.user?.balance ?? data.data?.balance ?? data.data?.user?.balance ?? data.data?.current_balance;
                if (bal !== undefined) setBalance(Number(bal));
                else fetchBalance(tk); 

                setLoginStatus('success');
                notify("Conexão estabelecida.", "success");
                fetchServices(tk, 1);
                setSelectedServer(1);
            } else {
                throw new Error("Token não recebido. Verifique suas credenciais.");
            }
        } catch (err: any) {
            console.error(err);
            setLoginStatus('error');
            notify(err.message || "Erro ao conectar.", "error");
        }
    };

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(prev => {
            const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
            setFilteredServices(current => [...current].sort((a,b) => {
                const isFavA = newFavs.includes(a.id);
                const isFavB = newFavs.includes(b.id);
                if (isFavA && !isFavB) return -1;
                if (!isFavA && isFavB) return 1;
                return a.name.localeCompare(b.name);
            }));
            return newFavs;
        });
    };

    useEffect(() => {
        if (token && services.length === 0) {
            refreshData();
        }
    }, [token]);

    const buyNumber = async (service: Service) => {
        if (isBuying) return;
        setIsBuying(true);
        
        try {
            const res = await requestBridge('virtual-numbers', 'POST', {
                service_id: service.id,
                country_id: 73,
                server_id: selectedServer,
                quantity: 1
            });
            const data = await res.json();
            
            if (data.success === false) throw new Error(data.message || 'Erro na compra');

            const id = data.id || data.data?.id;
            const number = data.number || data.data?.number;

            if (id || number) {
                const newNum: ActiveNumber = {
                    id: id,
                    number: number,
                    service_name: service.name,
                    service_id: service.id,
                    status: 'WAITING',
                    server_id: selectedServer,
                    purchase_time: Date.now()
                };
                
                setActiveNumbers(prev => [newNum, ...prev]);
                
                if (number && navigator.clipboard) {
                    navigator.clipboard.writeText(number);
                    notify(`Número ${number} gerado (Server ${selectedServer})`, 'success');
                }
                fetchBalance();
            } else {
                throw new Error("Resposta inválida da API.");
            }
        } catch (err: any) {
            notify(err.message, "error");
        } finally {
            setIsBuying(false);
        }
    };

    const cancelNumber = async (id: string) => {
        // ATUALIZA UI IMEDIATAMENTE
        setActiveNumbers(prev => prev.map(n => n.id === id ? { ...n, status: 'CANCELED' } : n));
        setCancellingIds(prev => [...prev, id]);
        
        try {
            const res = await requestBridge(`virtual-numbers/${id}`, 'DELETE');
            
            if (res.ok) {
                notify("Cancelado e reembolsado.", "success");
                fetchBalance();
            } else {
                console.warn("Cancel API Warning");
            }
        } catch (err: any) {
            notify("Erro ao cancelar na API (UI atualizada localmente)", "info");
        } finally {
            setCancellingIds(prev => prev.filter(cid => cid !== id));
        }
    };

    const removeCard = (id: string) => {
        setActiveNumbers(prev => prev.filter(n => n.id !== id));
    };

    const isBankService = (name: string) => {
        return BANK_KEYWORDS.some(bank => name.toLowerCase().includes(bank));
    };

    const saveToPixVault = (num: ActiveNumber, code: string) => {
        setPixKeys(prev => {
            if (prev.some(k => k.id === num.id)) return prev;
            return [{
                id: num.id,
                number: num.number,
                bank: num.service_name,
                code: code,
                date: new Date().toISOString(),
                server_id: num.server_id
            }, ...prev];
        });
        notify(`Número salvo no Cofre: ${num.service_name}`, 'success');
    };

    const exportPixKeys = () => {
        const text = pixKeys.map(k => `Banco: ${k.bank} | Número: ${k.number} | Código: ${k.code} | Data: ${new Date(k.date).toLocaleString()} | Server: ${k.server_id}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SMS_RUSH_VAULT_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        notify('Lista exportada com sucesso!', 'success');
    };

    const getServiceIcon = (name: string) => {
        return <Landmark size={16} />;
    };

    // POLLING OTIMIZADO
    useEffect(() => {
        if (!token) return;
        
        const pollInterval = setInterval(() => {
            setActiveNumbers(current => {
                const waiting = current.filter(n => n.status === 'WAITING');
                if (waiting.length === 0) return current;

                waiting.forEach(async (num) => {
                    try {
                        const res = await requestBridge(`virtual-numbers/${num.id}/status`, 'GET');
                        const d = await res.json();
                        const dataObj = d.data || d;
                        const smsCode = dataObj.sms_code || dataObj.code || dataObj.message;
                        const status = dataObj.status || dataObj.code_status;

                        if (status === 'RECEIVED' || (smsCode && smsCode.length > 2 && smsCode !== 'WAITING')) {
                            
                            setActiveNumbers(prev => prev.map(n => n.id === num.id ? { ...n, status: 'RECEIVED', code: smsCode } : n));
                            notify(`SMS Recebido: ${num.service_name}`, 'success');
                            
                            // SEMPRE SALVA NO COFRE POIS SÓ TEM BANCOS
                            saveToPixVault(num, smsCode);

                            if(navigator.clipboard) navigator.clipboard.writeText(smsCode); 
                            new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3').play().catch(()=>{});
                        
                        } else if (status === 'CANCELED' || status === 'TIMEOUT') {
                            setActiveNumbers(prev => prev.map(n => n.id === num.id ? { ...n, status: 'CANCELED' } : n));
                        }
                    } catch (e) {}
                });
                return current;
            });
        }, 4000); 

        return () => clearInterval(pollInterval);
    }, [token, requestBridge]);

    // Busca Instantânea
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredServices(services);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredServices(services.filter(s => s.name.toLowerCase().includes(lower)));
        }
    }, [searchTerm, services]);


    // --- RENDER ---

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[600px] animate-fade-in p-4">
                <div className="w-full max-w-md p-8 bg-[#0a0516]/90 border border-white/10 rounded-3xl shadow-2xl relative overflow-hidden group backdrop-blur-xl">
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
                    
                    <div className="text-center mb-8 relative z-10">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                            <CloudLightning size={40} className="text-indigo-400" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">SMS Rush <span className="text-indigo-500">Gateway</span></h2>
                        <p className="text-gray-400 text-sm mt-2 font-medium">Autenticação Segura</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4 relative z-10">
                        <div className="grid grid-cols-1 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1 block">E-mail SMS Rush</label>
                                <input 
                                    type="email" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="user@email.com"
                                    disabled={loginStatus === 'loading'}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1 mb-1 block">Senha</label>
                                <input 
                                    type="password" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all text-sm font-medium"
                                    value={password} onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••"
                                    disabled={loginStatus === 'loading'}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loginStatus === 'loading'}
                            className={`w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-3 transition-all ${loginStatus === 'loading' ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {loginStatus === 'loading' ? <RefreshCw className="animate-spin" size={20} /> : <LogIn size={20} />}
                            {loginStatus === 'loading' ? 'CONECTANDO...' : 'INICIAR SESSÃO'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-20 relative">
            
            {/* Header / Top Bar High-End */}
            <div className="bg-[#0c0818] rounded-3xl p-6 border border-white/10 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                
                <div className="flex items-center gap-5 relative z-10">
                    <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-lg shadow-indigo-900/30 border border-white/5">
                        <Smartphone className="text-white" size={28} />
                    </div>
                    <div>
                        <h2 className="font-black text-2xl text-white tracking-tight flex items-center gap-2">
                            SMS Studio <span className="text-indigo-400">Pro</span>
                        </h2>
                        <div className="flex items-center gap-3 text-xs font-medium mt-1">
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1 font-bold">
                                <Wifi size={10}/> ONLINE (BRASIL #73)
                            </span>
                            <div className="h-4 w-px bg-white/10"></div>
                            {balance !== null && (
                                <span className="text-white flex items-center gap-2 bg-white/5 px-3 py-0.5 rounded-full border border-white/10">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-emerald-400 font-mono font-bold text-sm">R$ {balance.toFixed(2)}</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="flex gap-3 relative z-10">
                    <a 
                        href="https://sms-rush.com/panel/" 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-colors border border-white/10 flex items-center gap-2"
                    >
                        <ExternalLink size={14} /> Site Oficial
                    </a>
                    <button onClick={() => { setToken(''); setLoginStatus('idle'); }} className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-white text-xs font-bold transition-colors border border-rose-500/20 flex items-center gap-2">
                        <XCircle size={14} /> Desconectar
                    </button>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex justify-center mb-2">
                <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex gap-2 shadow-inner backdrop-blur-md">
                    <button 
                        onClick={() => setActiveTab('catalog')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'catalog' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <ShoppingBag size={16} /> Comprar Números (Bancos)
                    </button>
                    <button 
                        onClick={() => setActiveTab('vault')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'vault' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Database size={16} /> Cofre (Recebidos) <span className="bg-black/20 px-1.5 rounded text-[10px] text-emerald-200">{pixKeys.length}</span>
                    </button>
                </div>
            </div>

            {activeTab === 'catalog' ? (
                // --- VIEW: CATALOGO E ATIVAÇÕES ---
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* COLUNA ESQUERDA: LISTA DE SERVIÇOS (FILTRADA) */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-[#0a0516] p-5 rounded-2xl border border-white/10 flex flex-col h-[750px] shadow-xl relative overflow-hidden">
                            
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <Landmark size={16} className="text-indigo-400" /> Bancos & Carteiras
                                    </h3>
                                    <p className="text-[10px] text-gray-500 mt-0.5">Filtro Inteligente Ativo</p>
                                </div>
                                <button 
                                    onClick={refreshData} 
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors border border-white/5" 
                                >
                                    <RefreshCw size={14} className={isLoadingServices ? 'animate-spin' : ''} />
                                </button>
                            </div>
                            
                            {/* SERVER TABS */}
                            <div className="mb-4">
                                <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                                    {[1, 2, 3].map((sId) => (
                                        <button 
                                            key={sId}
                                            onClick={() => handleServerChange(sId)} 
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden group
                                                ${selectedServer === sId 
                                                    ? 'bg-indigo-600 text-white shadow-md border border-indigo-500' 
                                                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'}
                                            `}
                                        >
                                            <span>Server {sId}</span>
                                            {selectedServer === sId && isLoadingServices && <RefreshCw size={10} className="animate-spin mt-1" />}
                                            {selectedServer === sId && !isLoadingServices && <div className="w-1 h-1 bg-white rounded-full mt-1"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="flex gap-2 mb-4">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-2.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Buscar banco..." 
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
                                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Service List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 relative space-y-2 pb-2">
                                {isLoadingServices && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0516]/90 backdrop-blur-sm z-20">
                                        <RefreshCw className="animate-spin text-indigo-500 mb-2" size={32} />
                                        <span className="text-xs text-indigo-300 font-bold animate-pulse">Sincronizando Server {selectedServer}...</span>
                                    </div>
                                )}

                                {filteredServices.length === 0 && !isLoadingServices ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-gray-500 border border-dashed border-white/10 rounded-xl bg-white/5 p-4 text-center">
                                        <Lock size={24} className="mb-2 opacity-50 text-gray-500"/>
                                        <p className="text-sm font-bold text-white mb-1">Nada encontrado</p>
                                        <p className="text-xs">Nenhum serviço bancário disponível neste servidor.</p>
                                    </div>
                                ) : (
                                    filteredServices.map(s => {
                                        const isFav = favorites.includes(s.id);
                                        const hasStock = s.quantity > 0;
                                        
                                        return (
                                            <div 
                                                key={s.id} 
                                                onClick={() => buyNumber(s)}
                                                className={`group relative overflow-hidden border transition-all cursor-pointer bg-[#0c0818] hover:bg-[#150f24] active:scale-95 p-3 rounded-xl flex justify-between items-center hover:border-indigo-500/50 border-white/5
                                                    ${isFav ? 'border-amber-500/30 bg-amber-500/[0.02]' : ''}
                                                `}
                                            >
                                                <button 
                                                    onClick={(e) => toggleFavorite(s.id, e)}
                                                    className={`absolute top-2 right-2 p-1 rounded-full hover:bg-black/40 transition-colors z-10 ${isFav ? 'text-amber-400' : 'text-gray-700 hover:text-gray-400'}`}
                                                >
                                                    <Star size={12} fill={isFav ? "currentColor" : "none"} />
                                                </button>

                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs border bg-indigo-500/10 text-indigo-400 border-indigo-500/20`}>
                                                        <Landmark size={18} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-sm font-bold text-white truncate w-32" title={s.name}>{s.name}</div>
                                                        <div className={`text-[10px] flex items-center gap-1 ${hasStock ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                            <Activity size={10} /> 
                                                            {hasStock ? `${s.quantity} und` : 'Pronta Entrega'}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <button 
                                                    disabled={isBuying} 
                                                    className={`font-bold text-xs text-white transition-all shadow-lg border flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg
                                                        ${hasStock 
                                                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20 border-emerald-500/50' 
                                                            : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20 border-amber-500/50 opacity-90'}
                                                    `}
                                                >
                                                    <span className="opacity-70">R$</span> {s.price.toFixed(2)}
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    {/* COLUNA DIREITA: PAINEL DE ATIVAÇÕES */}
                    <div className="lg:col-span-8 space-y-4">
                        <div className="bg-[#0a0516] p-6 rounded-2xl border border-white/10 h-full min-h-[750px] flex flex-col relative overflow-hidden shadow-xl">
                            
                            <div className="flex justify-between items-center mb-6 z-10 relative">
                                <h3 className="text-white font-bold text-lg uppercase tracking-wider flex items-center gap-2">
                                    <MessageSquare size={20} className="text-emerald-400" /> Números Ativos
                                </h3>
                                {isBuying && (
                                    <div className="flex items-center gap-2 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 animate-pulse">
                                        <RefreshCw size={12} className="animate-spin text-indigo-400"/>
                                        <span className="text-xs font-bold text-indigo-400">Solicitando número...</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 relative z-10 p-1">
                                {activeNumbers.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40 pb-20">
                                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse-slow">
                                            <Smartphone size={48} />
                                        </div>
                                        <p className="text-lg font-bold text-gray-500">Nenhuma ativação ativa.</p>
                                        <p className="text-sm">Selecione um banco ao lado para gerar um número.</p>
                                    </div>
                                ) : (
                                    activeNumbers.map(num => {
                                        const isLocked = num.cancelUnlockTime && Date.now() < num.cancelUnlockTime;
                                        const isCancelling = cancellingIds.includes(num.id);
                                        const remainingTime = isLocked ? Math.ceil((num.cancelUnlockTime! - Date.now()) / 1000) : 0;

                                        return (
                                            <div key={num.id} className={`p-6 rounded-2xl border transition-all relative overflow-hidden group animate-slide-in-right ${
                                                num.status === 'RECEIVED' ? 'bg-emerald-900/10 border-emerald-500/30' :
                                                num.status === 'CANCELED' ? 'bg-red-900/5 border-red-500/10 opacity-60' :
                                                'bg-[#0c0818] border-white/10 hover:border-indigo-500/30'
                                            }`}>
                                                {/* SUCCESS BADGE */}
                                                {num.status === 'RECEIVED' && (
                                                    <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[9px] font-bold px-2 py-0.5 rounded shadow-lg flex items-center gap-1 z-20">
                                                        <Database size={10}/> SALVO NO COFRE
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-6 relative z-10">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`p-3 rounded-2xl ${num.status === 'RECEIVED' ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-white/10 text-gray-400'}`}>
                                                            <Smartphone size={24} />
                                                        </div>
                                                        <div>
                                                            <div 
                                                                className="text-3xl font-black text-white tracking-wider font-mono select-all cursor-pointer hover:text-indigo-300 transition-colors flex items-center gap-2" 
                                                                onClick={() => {navigator.clipboard.writeText(num.number); notify('Número copiado!', 'success')}}
                                                            >
                                                                {num.number}
                                                                <Copy size={16} className="text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                            <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                                                <span className="font-bold text-indigo-300 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">{num.service_name}</span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                                <span className="bg-white/5 px-2 py-0.5 rounded text-gray-300">Server {num.server_id}</span>
                                                                <span className="w-1 h-1 rounded-full bg-gray-600"></span>
                                                                <span>ID: {num.id}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { navigator.clipboard.writeText(num.number); notify('Copiado!', 'success'); }} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5" title="Copiar Número">
                                                            <Copy size={18} />
                                                        </button>
                                                        
                                                        {/* BOTÃO CANCELAR COM LOADER E TIMER (TRAVA 10s em erro) */}
                                                        {num.status === 'WAITING' && (
                                                            isLocked ? (
                                                                <div className="p-2.5 bg-red-500/5 rounded-xl text-red-400 border border-red-500/20 flex items-center gap-2 font-mono font-bold text-xs cursor-not-allowed w-[100px] justify-center">
                                                                    <Timer size={14} className="animate-pulse" /> {remainingTime}s
                                                                </div>
                                                            ) : (
                                                                <button 
                                                                    onClick={() => cancelNumber(num.id)} 
                                                                    disabled={isCancelling}
                                                                    className="p-2.5 bg-red-500/10 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all border border-red-500/20 w-10 h-10 flex items-center justify-center" 
                                                                    title="Cancelar/Reembolsar"
                                                                >
                                                                    {isCancelling ? <RefreshCw size={16} className="animate-spin"/> : <X size={18} />}
                                                                </button>
                                                            )
                                                        )}

                                                        {/* BOTÃO REMOVER DO CARD (LIXEIRA VISUAL) */}
                                                        {(num.status === 'CANCELED' || num.status === 'FINISHED' || num.status === 'RECEIVED') && (
                                                            <button 
                                                                onClick={() => removeCard(num.id)} 
                                                                className="p-2.5 bg-gray-800 rounded-xl hover:bg-gray-700 text-gray-500 hover:text-white transition-all border border-white/5" 
                                                                title="Remover da lista"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {/* CODE AREA */}
                                                <div className="bg-black/30 p-6 rounded-xl border border-white/5 text-center min-h-[100px] flex items-center justify-center relative z-10 overflow-hidden">
                                                    {num.status === 'RECEIVED' ? (
                                                        <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center">
                                                            <p className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-[0.3em] mb-2">CÓDIGO RECEBIDO</p>
                                                            <span className="text-6xl font-black text-white tracking-[0.2em] drop-shadow-[0_0_20px_rgba(16,185,129,0.6)] select-all cursor-pointer hover:scale-105 transition-transform" onClick={() => { navigator.clipboard.writeText(num.code || ''); notify('Código copiado!', 'success'); }}>
                                                                {num.code}
                                                            </span>
                                                            <p className="text-[10px] text-gray-500 mt-2">Clique para copiar</p>
                                                        </div>
                                                    ) : num.status === 'CANCELED' ? (
                                                        <span className="text-red-500 font-bold text-sm uppercase flex items-center gap-2 border border-red-500/20 px-4 py-2 rounded-lg bg-red-500/5">
                                                            <X size={16} /> Cancelado / Reembolsado
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3 text-gray-500">
                                                            <RefreshCw size={24} className="animate-spin text-indigo-500 opacity-80"/> 
                                                            <span className="text-xs font-bold uppercase tracking-widest animate-pulse">Aguardando SMS...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {num.status === 'WAITING' && (
                                                    <div className="absolute bottom-0 left-0 h-1 bg-indigo-500/50 animate-progress w-full"></div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // --- VIEW: COFRE (VAULT) ---
                <div className="animate-fade-in">
                    <div className="bg-[#0a0516] border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-emerald-900/10">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Database className="text-emerald-400" /> Cofre de Chaves Pix
                                </h3>
                                <p className="text-gray-400 text-xs mt-1">Todos os números bancários que receberam SMS.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={exportPixKeys} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                                    <Download size={14} /> Exportar TXT
                                </button>
                            </div>
                        </div>
                        <div className="p-0">
                            {pixKeys.length === 0 ? (
                                <div className="py-20 text-center text-gray-500 opacity-60 flex flex-col items-center justify-center h-full">
                                    <Landmark size={64} className="mb-4 text-emerald-500/20" />
                                    <p className="text-lg font-bold">Cofre Vazio</p>
                                    <p className="text-sm">Os números aprovados aparecerão aqui automaticamente.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-black/40 text-xs uppercase font-bold text-emerald-500/70 sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="px-6 py-4">Banco</th>
                                            <th className="px-6 py-4">Número (Chave)</th>
                                            <th className="px-6 py-4">Código SMS</th>
                                            <th className="px-6 py-4">Server</th>
                                            <th className="px-6 py-4 text-right">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {pixKeys.map((k, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-bold text-white uppercase flex items-center gap-2">
                                                    <Landmark size={14} className="text-indigo-400"/> {k.bank}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-emerald-300 select-all cursor-pointer hover:text-white transition-colors" onClick={() => {navigator.clipboard.writeText(k.number); notify('Copiado!', 'success')}}>{k.number}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-white select-all cursor-pointer" onClick={() => {navigator.clipboard.writeText(k.code); notify('Copiado!', 'success')}}>{k.code}</td>
                                                <td className="px-6 py-4 text-xs font-mono">#{k.server_id}</td>
                                                <td className="px-6 py-4 text-right text-xs font-mono">{new Date(k.date).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmsRush;
