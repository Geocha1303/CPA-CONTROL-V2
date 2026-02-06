
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, RefreshCw, Search, Copy, X, LogIn, Wifi, Activity, ShoppingBag, Database, Download, Landmark, ExternalLink, Lock, ShieldCheck, CreditCard, Wallet, CloudLightning, XCircle, Star, Timer, Trash2, Server, CheckCircle2, ArrowRight, Zap, Info, Signal, MessageSquare, ChevronRight, LayoutList, Grid, Globe } from 'lucide-react';

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

// --- CATÁLOGO ESTÁTICO (Mantido) ---
const STATIC_DB: Record<number, Service[]> = {
    1: [
        { id: 70, name: "Mercado Pago", price: 1.2, quantity: 100 },
        { id: 88, name: "PicPay", price: 1.0, quantity: 100 },
        { id: 83, name: "Nubank", price: 1.5, quantity: 100 },
        { id: 29, name: "CAIXA", price: 1.0, quantity: 100 },
        { id: 105, name: "Santander", price: 0.8, quantity: 100 },
        { id: 5, name: "Agibank", price: 0.6, quantity: 100 },
        { id: 59, name: "Itaú", price: 0.8, quantity: 100 },
        { id: 60, name: "Iti (Itaú)", price: 0.6, quantity: 100 },
        { id: 25, name: "Bradesco", price: 0.8, quantity: 100 },
        { id: 89, name: "PagBank", price: 0.7, quantity: 100 },
        { id: 28, name: "C6 Bank", price: 0.8, quantity: 100 },
        { id: 78, name: "Neon", price: 0.8, quantity: 100 },
        { id: 80, name: "Next", price: 0.8, quantity: 100 },
        { id: 109, name: "Sicredi", price: 1.0, quantity: 100 },
        { id: 135, name: "Will Bank", price: 1.0, quantity: 100 },
        { id: 138, name: "Wise", price: 1.2, quantity: 100 },
        { id: 16, name: "Astropay", price: 0.9, quantity: 100 },
        { id: 91, name: "PayPal", price: 0.8, quantity: 100 },
        { id: 32, name: "Coinbase", price: 1.0, quantity: 100 },
        { id: 11, name: "Ame Digital", price: 0.6, quantity: 100 },
        { id: 15, name: "Asaas", price: 0.7, quantity: 100 },
        { id: 19, name: "Banqi", price: 0.5, quantity: 100 },
        { id: 31, name: "Celcoin", price: 0.5, quantity: 100 },
        { id: 34, name: "CrefisaMais", price: 0.6, quantity: 100 },
        { id: 187, name: "Kwai", price: 0.5, quantity: 100 },
        { id: 188, name: "TikTok", price: 0.5, quantity: 100 }
    ],
    2002: [
        { id: 5300, name: "Mercado Pago", price: 1.8, quantity: 100 },
        { id: 5358, name: "PicPay", price: 1.5, quantity: 100 },
        { id: 5359, name: "Nubank", price: 2.0, quantity: 100 },
        { id: 5362, name: "Santander", price: 1.2, quantity: 100 },
        { id: 5367, name: "Agibank", price: 1.0, quantity: 100 },
        { id: 5366, name: "Itaú", price: 1.2, quantity: 100 },
        { id: 5383, name: "Iti", price: 1.0, quantity: 100 },
        { id: 5374, name: "Bradesco", price: 1.2, quantity: 100 },
        { id: 5373, name: "PagBank", price: 1.2, quantity: 100 },
        { id: 5360, name: "C6 Bank", price: 1.2, quantity: 100 },
        { id: 5364, name: "Neon", price: 1.2, quantity: 100 },
        { id: 5387, name: "Next", price: 1.2, quantity: 100 },
        { id: 5385, name: "Will Bank", price: 1.5, quantity: 100 },
        { id: 5384, name: "Wise", price: 1.8, quantity: 100 }
    ],
    3: [
        { id: 154, name: "Mercado Pago", price: 0.8, quantity: 100 },
        { id: 1154, name: "PicPay", price: 0.8, quantity: 100 },
        { id: 2163, name: "CAIXA", price: 0.8, quantity: 100 },
        { id: 2158, name: "Santander", price: 0.7, quantity: 100 },
        { id: 2156, name: "Agibank", price: 0.5, quantity: 100 },
        { id: 2164, name: "Iti", price: 0.5, quantity: 100 },
        { id: 2161, name: "RecargaPay", price: 0.6, quantity: 100 },
        { id: 2160, name: "Astropay", price: 0.7, quantity: 100 },
        { id: 2162, name: "PayPal", price: 0.7, quantity: 100 },
        { id: 2166, name: "Coinbase", price: 0.9, quantity: 100 }
    ]
};

const SmsRush: React.FC<Props> = ({ notify }) => {
    // Auth State
    const [token, setToken] = useState(localStorage.getItem('sms_rush_token') || '');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    // Data State
    const [balance, setBalance] = useState<number | null>(null);
    const [isBalanceRefreshing, setIsBalanceRefreshing] = useState(false);
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
    
    // PERSISTÊNCIA PARA NÚMEROS ATIVOS
    const [activeNumbers, setActiveNumbers] = useState<ActiveNumber[]>(() => {
        try {
            const saved = localStorage.getItem('sms_active_numbers');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('sms_active_numbers', JSON.stringify(activeNumbers));
    }, [activeNumbers]);

    const [isLoadingServices, setIsLoadingServices] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    
    // Pix Keys State
    const [pixKeys, setPixKeys] = useState<PixKey[]>(() => {
        const saved = localStorage.getItem('sms_pix_keys');
        return saved ? JSON.parse(saved) : [];
    });
    
    const [cancellingIds, setCancellingIds] = useState<string[]>([]);
    const tokenRef = useRef(token);
    
    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    const [, setTimerTick] = useState(0);

    useEffect(() => {
        localStorage.setItem('sms_favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        localStorage.setItem('sms_pix_keys', JSON.stringify(pixKeys));
    }, [pixKeys]);

    // --- EDGE FUNCTION REQUEST HANDLER (UPDATED: 75S TIMEOUT FOR SAFETY) ---
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

        // Timeout aumentado para 75s para dar margem ao backend (que tem 60s)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 75000); 

        const options: RequestInit = {
            method: method,
            headers: headers,
            signal: controller.signal
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(urlObj.toString(), options);
            clearTimeout(timeoutId); 

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
            // Tratamento melhorado de erros de rede
            let finalError = err;
            if (err.name === 'AbortError') {
                finalError = new Error("Tempo limite excedido (75s). A operação pode ter sido concluída no servidor.");
            } else if (err.message === 'Failed to fetch') {
                finalError = new Error("Falha de conexão com o servidor. Verifique sua internet.");
            }
            
            console.error("SMS Rush API Error:", finalError);
            throw finalError;
        } finally {
            clearTimeout(timeoutId);
        }
    }, [token]);

    // --- ACTIONS ---

    const fetchServices = useCallback(async (tokenOverride?: string, serverId: number = selectedServer) => {
        setIsLoadingServices(true);
        try {
            const staticData = STATIC_DB[serverId] || [];
            const sortedData = [...staticData].sort((a: Service, b: Service) => {
                const isFavA = favorites.includes(a.id);
                const isFavB = favorites.includes(b.id);
                if (isFavA && !isFavB) return -1;
                if (!isFavA && isFavB) return 1;
                return a.name.localeCompare(b.name);
            });
            setServices(sortedData);
            setFilteredServices(sortedData);
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
    };

    const fetchBalance = useCallback(async (tokenOverride?: string, silent: boolean = false) => {
        if (!silent) setIsBalanceRefreshing(true);
        try {
            const res = await requestBridge('auth/me', 'GET', null, tokenOverride);
            const data = await res.json();
            
            let foundBalance = null;
            if (data?.user?.current_balance !== undefined) foundBalance = data.user.current_balance;
            else if (data?.data?.user?.current_balance !== undefined) foundBalance = data.data.user.current_balance;
            else if (data?.current_balance !== undefined) foundBalance = data.current_balance;
            else if (data?.balance !== undefined) foundBalance = data.balance;

            const numBalance = Number(foundBalance);
            if (!isNaN(numBalance)) setBalance(numBalance);
        } catch (e) { 
            // Silent error for balance polling to avoid spamming
            if(!silent) console.error("Balance Error", e); 
        } finally { 
            if (!silent) setIsBalanceRefreshing(false); 
        }
    }, [requestBridge]);

    const refreshData = async () => {
        if (!tokenRef.current) return;
        await Promise.all([fetchServices(tokenRef.current, selectedServer), fetchBalance(tokenRef.current)]);
    };

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
                
                let bal: number | null = null;
                if (data.user?.current_balance !== undefined) bal = Number(data.user.current_balance);
                else if (data.data?.user?.current_balance !== undefined) bal = Number(data.data.user.current_balance);
                else if (data.balance !== undefined) bal = Number(data.balance);
                
                if (bal !== null && !isNaN(bal)) setBalance(bal);
                else await fetchBalance(tk); 

                await fetchServices(tk, 1);
                setLoginStatus('success');
                notify("Conexão estabelecida com sucesso.", "success");
                setSelectedServer(1);
            } else {
                throw new Error("Credenciais inválidas ou token não retornado.");
            }
        } catch (err: any) {
            console.error(err);
            setLoginStatus('error');
            notify(err.message || "Erro ao conectar com SMS RUSH API.", "error");
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
        if (token && services.length === 0) refreshData();
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetchBalance(); 
        const balanceInterval = setInterval(() => { fetchBalance(undefined, true); }, 8000); 
        return () => clearInterval(balanceInterval);
    }, [token, fetchBalance]);

    // --- PURCHASE & QUEUE LOGIC ---
    const findAlternativeService = (name: string, currentServer: number): { serverId: number, serviceId: number } | null => {
        const order = [1, 2002, 3].filter(id => id !== currentServer);
        for (const serverId of order) {
            const match = STATIC_DB[serverId]?.find(s => s.name === name);
            if (match) return { serverId, serviceId: match.id };
        }
        return null;
    };

    const attemptPurchase = async (serviceId: number, serverId: number, serviceName: string): Promise<any> => {
        const res = await requestBridge('virtual-numbers', 'POST', {
            service_id: serviceId,
            country_id: 73,
            server_id: serverId,
            quantity: 1
        });
        const data = await res.json();
        if (data.success === false) throw new Error(data.message || data.error || 'Erro na compra');
        return data;
    };

    const buyNumber = async (service: Service) => {
        if (isBuying) return;
        setIsBuying(true);
        try {
            try {
                const data = await attemptPurchase(service.id, selectedServer, service.name);
                handleSuccessfulPurchase(data, service.name, service.id, selectedServer);
            } catch (err: any) {
                const errorMsg = err.message ? err.message.toLowerCase() : '';
                const isStockError = errorMsg.includes('stock') || errorMsg.includes('number') || errorMsg.includes('estoque') || errorMsg.includes('e004');

                if (isStockError) {
                    const fallback = findAlternativeService(service.name, selectedServer);
                    if (fallback) {
                        notify(`Server ${selectedServer === 2002 ? '2' : selectedServer} sem estoque. Tentando Fallback...`, 'info');
                        const dataFallback = await attemptPurchase(fallback.serviceId, fallback.serverId, service.name);
                        handleSuccessfulPurchase(dataFallback, service.name, fallback.serviceId, fallback.serverId);
                        notify(`Conectado com sucesso ao Server ${fallback.serverId === 2002 ? '2' : fallback.serverId}!`, 'success');
                    } else {
                        throw new Error(`Sem estoque no Server ${selectedServer === 2002 ? '2' : selectedServer} e sem alternativas.`);
                    }
                } else {
                    throw err; 
                }
            }
        } catch (err: any) {
            notify(err.message, "error");
        } finally {
            setIsBuying(false);
        }
    };

    const handleSuccessfulPurchase = (data: any, serviceName: string, serviceId: number, serverId: number) => {
        const id = data.id || data.data?.id;
        const number = data.number || data.data?.number;

        if (id || number) {
            const newNum: ActiveNumber = {
                id: id,
                number: number,
                service_name: serviceName,
                service_id: serviceId,
                status: 'WAITING',
                server_id: serverId,
                purchase_time: Date.now(),
                cancelUnlockTime: serverId === 1 ? 0 : Date.now() + 120000 
            };
            setActiveNumbers(prev => [newNum, ...prev]);
            if (number && navigator.clipboard) {
                navigator.clipboard.writeText(number);
                notify(`Número ${number} gerado (Server ${serverId === 2002 ? '2' : serverId})`, 'success');
            }
            setTimeout(() => fetchBalance(), 1500); 
        } else {
            throw new Error("Resposta inválida da SMS RUSH API.");
        }
    };

    // --- CORREÇÃO DO CANCELAMENTO (STRICT & RELIABLE) ---
    const cancelNumber = async (id: string) => {
        const num = activeNumbers.find(n => n.id === id);
        if (!num) return;

        const timeDiff = Date.now() - num.purchase_time;
        // Validação de tempo mínimo (Regra API)
        if (num.server_id !== 1 && timeDiff < 120000) {
            const remaining = Math.ceil((120000 - timeDiff) / 1000);
            notify(`Aguarde ${remaining}s para cancelar.`, "info");
            setActiveNumbers(prev => prev.map(n => n.id === id ? { ...n, cancelUnlockTime: Date.now() + (120000 - timeDiff) } : n));
            return;
        }

        if (num.status === 'RECEIVED' || num.code) {
            notify("Impossível cancelar: SMS já recebido.", "error");
            return;
        }

        // 1. Marca como processando visualmente
        setCancellingIds(prev => [...prev, id]);
        
        try {
            // 2. Envia requisição DELETE com timeout estendido
            const res = await requestBridge(`virtual-numbers/${id}`, 'DELETE');
            const data = await res.json();
            
            // 3. Verifica sucesso EXPLÍCITO
            if (res.ok || (data.message && data.message.includes('already'))) {
                setActiveNumbers(prev => prev.map(n => n.id === id ? { ...n, status: 'CANCELED' } : n));
                notify("Cancelamento confirmado e reembolsado.", "success");
                fetchBalance();
            } else {
                 // Tratamento de erros conhecidos da API
                 if(data.message && (data.message.includes('time') || data.message.includes('wait'))) {
                     notify("Aguarde o tempo mínimo da operadora.", "info");
                     setActiveNumbers(prev => prev.map(n => n.id === id ? { ...n, cancelUnlockTime: Date.now() + 30000 } : n)); 
                } else {
                     // Erro genérico da API - NÃO CANCELA LOCALMENTE
                     notify(`Falha ao cancelar: ${data.message || 'Erro desconhecido'}`, "error");
                }
            }
        } catch (err: any) {
            console.error("Cancel Error:", err);
            // CRÍTICO: Se der erro de conexão/timeout, NÃO marca como cancelado.
            if (err.message.includes("Falha de conexão")) {
                notify("Erro de conexão. Verifique sua internet e tente novamente.", "error");
            } else if (err.message.includes("Tempo limite")) {
                notify("Tempo limite excedido. O servidor demorou para responder.", "error");
            } else {
                notify("Erro ao processar cancelamento.", "error");
            }
        } finally {
            setCancellingIds(prev => prev.filter(cid => cid !== id));
        }
    };

    const removeCard = (id: string) => setActiveNumbers(prev => prev.filter(n => n.id !== id));

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
    };

    const exportPixKeys = () => {
        const text = pixKeys.map(k => `Banco: ${k.bank} | Número: ${k.number} | Código: ${k.code} | Data: ${new Date(k.date).toLocaleString()} | Server: ${k.server_id === 2002 ? '2' : k.server_id}`).join('\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SMS_RUSH_VAULT_${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        notify('Lista exportada!', 'success');
    };

    useEffect(() => {
        const timerInterval = setInterval(() => { setTimerTick(t => t + 1); }, 1000);
        return () => clearInterval(timerInterval);
    }, []);

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

    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredServices(services);
        } else {
            const lower = searchTerm.toLowerCase();
            setFilteredServices(services.filter(s => s.name.toLowerCase().includes(lower)));
        }
    }, [searchTerm, services]);


    // --- LOGIN SCREEN (SPLIT VIEW RESTORED & ENHANCED) ---
    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[700px] animate-fade-in p-4">
                <div className="w-full max-w-4xl bg-[#09090b] rounded-3xl border border-white/5 shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[550px]">
                    
                    {/* ESQUERDA: IDENTIDADE E INFO (Visual Rico) */}
                    <div className="w-full md:w-1/2 bg-gradient-to-br from-indigo-900 to-black p-10 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none transform translate-x-10 -translate-y-10">
                            <CloudLightning size={200} className="text-white" />
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/10">
                                    <Zap size={20} className="text-indigo-400" />
                                </div>
                                <h1 className="text-2xl font-black text-white tracking-tight">SMS RUSH <span className="text-indigo-400">PRO</span></h1>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                                        <CheckCircle2 size={18} className="text-emerald-400"/> Integração API Oficial
                                    </h3>
                                    <p className="text-indigo-200/80 text-sm leading-relaxed mb-4">
                                        Painel de alta performance conectado diretamente aos servidores da SMS Rush. Organize, monitore e salve suas ativações com segurança máxima.
                                    </p>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-indigo-100/70">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300"><Activity size={14} /></div>
                                        <div>
                                            <strong className="block text-indigo-200 text-xs">Tempo Real</strong>
                                            <span className="text-[10px]">Atualização instantânea de status</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-indigo-100/70">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300"><Database size={14} /></div>
                                        <div>
                                            <strong className="block text-indigo-200 text-xs">Cofre Local</strong>
                                            <span className="text-[10px]">Histórico salvo no seu dispositivo</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-indigo-100/70">
                                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300"><ShieldCheck size={14} /></div>
                                        <div>
                                            <strong className="block text-indigo-200 text-xs">Conexão Segura</strong>
                                            <span className="text-[10px]">Criptografia ponta a ponta</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative z-10 mt-10">
                            <p className="text-[10px] text-indigo-400/50 uppercase tracking-widest font-bold">Powered by SMS Rush API v2</p>
                        </div>
                    </div>

                    {/* DIREITA: FORMULÁRIO (Clean) */}
                    <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-[#09090b]">
                        <h2 className="text-xl font-bold text-white mb-6">Acessar Painel</h2>
                        
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-mail de Acesso</label>
                                <div className="relative">
                                    <input 
                                        type="email" 
                                        className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-gray-600 text-sm font-medium"
                                        placeholder="seu@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        disabled={loginStatus === 'loading'}
                                    />
                                    <div className="absolute right-4 top-3.5 text-gray-600"><Search size={18} /></div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Senha</label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        className="w-full bg-[#18181b] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-gray-600 text-sm font-medium"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        disabled={loginStatus === 'loading'}
                                    />
                                    <div className="absolute right-4 top-3.5 text-gray-600"><Lock size={18} /></div>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loginStatus === 'loading'}
                                className="w-full bg-white hover:bg-gray-200 text-black font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm mt-2"
                            >
                                {loginStatus === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <ArrowRight size={18} />}
                                {loginStatus === 'loading' ? 'Autenticando...' : 'Iniciar Sessão'}
                            </button>
                        </form>

                        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3 items-center">
                            <p className="text-[10px] text-gray-500">Não tem conta ou precisa recarregar?</p>
                            <a 
                                href="https://smsrush.com.br/" 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20 hover:bg-indigo-500/20 w-full"
                            >
                                <Globe size={14} /> ACESSAR SITE OFICIAL
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in pb-10 relative px-4 h-[calc(100vh-100px)] flex flex-col">
            
            {/* HEADER COMPACTO */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg">
                        <Signal size={20} className="text-black" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white tracking-tight leading-none">SMS RUSH</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Online</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-[#18181b] p-1.5 rounded-xl border border-white/5">
                    <div className="px-4 border-r border-white/5 text-right">
                        <p className="text-[9px] text-gray-500 font-bold uppercase">Saldo</p>
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => fetchBalance(undefined, false)}>
                            <span className="text-lg font-black text-white font-mono group-hover:text-gray-300 transition-colors">
                                {balance !== null ? `R$ ${balance.toFixed(2)}` : '---'}
                            </span>
                            {isBalanceRefreshing && <RefreshCw size={10} className="animate-spin text-gray-500" />}
                        </div>
                    </div>
                    <button onClick={refreshData} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors" title="Sincronizar">
                        <RefreshCw size={16} />
                    </button>
                    <button onClick={() => {setToken(''); setLoginStatus('idle')}} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Sair">
                        <XCircle size={16} />
                    </button>
                </div>
            </div>

            {/* TOGGLE TABS (SEMPRE VISÍVEL) */}
            <div className="flex justify-start gap-2 mb-4 flex-shrink-0">
                <button 
                    onClick={() => setActiveTab('catalog')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'catalog' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                    <LayoutList size={14} /> Painel de Ativação
                </button>
                <button 
                    onClick={() => setActiveTab('vault')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'vault' ? 'bg-white text-black' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                >
                    <Database size={14} /> Cofre ({pixKeys.length})
                </button>
            </div>

            {activeTab === 'catalog' ? (
                // --- LAYOUT MASTER-DETAIL (2 COLUNAS) ---
                <div className="flex gap-6 flex-1 overflow-hidden">
                    
                    {/* COLUNA 1: CATÁLOGO (LISTA) - 30% */}
                    <div className="w-[320px] flex flex-col bg-[#0a0516] border border-white/5 rounded-xl overflow-hidden flex-shrink-0">
                        {/* Header da Lista */}
                        <div className="p-3 border-b border-white/5 bg-black/20 space-y-3">
                            {/* Server Select */}
                            <div className="flex gap-1">
                                {[1, 2002, 3].map((sId) => (
                                    <button 
                                        key={sId}
                                        onClick={() => handleServerChange(sId)} 
                                        className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-all ${
                                            selectedServer === sId 
                                            ? 'bg-white/10 text-white border-white/20' 
                                            : 'bg-transparent text-gray-500 border-transparent hover:bg-white/5'
                                        }`}
                                    >
                                        Srv {sId === 2002 ? '2' : sId}
                                    </button>
                                ))}
                            </div>
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar serviço..." 
                                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:border-white/30 outline-none"
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Lista de Serviços */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {isLoadingServices ? (
                                <div className="py-10 text-center text-gray-500 text-xs">Carregando...</div>
                            ) : filteredServices.length === 0 ? (
                                <div className="py-10 text-center text-gray-500 text-xs">Nada encontrado.</div>
                            ) : (
                                filteredServices.map(s => {
                                    const hasStock = s.quantity > 0;
                                    const isFav = favorites.includes(s.id);
                                    return (
                                        <button 
                                            key={s.id}
                                            onClick={() => buyNumber(s)}
                                            disabled={isBuying}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left group
                                                ${hasStock 
                                                    ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10' 
                                                    : 'opacity-50 grayscale cursor-not-allowed'}
                                            `}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-1.5 rounded-md ${isFav ? 'text-amber-400 bg-amber-400/10' : 'text-gray-600 bg-white/5'}`}
                                                     onClick={(e) => toggleFavorite(s.id, e)}>
                                                    <Star size={12} fill={isFav ? "currentColor" : "none"} />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="text-xs font-bold text-white truncate w-32 group-hover:text-white transition-colors">{s.name}</div>
                                                    <div className={`text-[9px] font-bold ${hasStock ? 'text-emerald-500' : 'text-red-500'}`}>
                                                        {hasStock ? 'DISPONÍVEL' : 'SEM ESTOQUE'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-mono font-bold text-white">R$ {s.price.toFixed(2)}</div>
                                                <div className="text-[10px] text-gray-500">ID: {s.id}</div>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* COLUNA 2: ÁREA DE TRABALHO (CARDS) - 70% */}
                    <div className="flex-1 bg-[#0a0516] border border-white/5 rounded-xl overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Activity size={16} className="text-indigo-400" /> Fila de Ativação ({activeNumbers.length})
                            </h3>
                            {isBuying && <span className="text-[10px] bg-white text-black px-2 py-0.5 rounded font-bold animate-pulse">PROCESSANDO PEDIDO...</span>}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                            {activeNumbers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                                    <Smartphone size={48} className="mb-4 stroke-1" />
                                    <p className="text-sm font-bold">Nenhum número ativo</p>
                                    <p className="text-xs mt-1">Selecione um serviço na lista ao lado para começar.</p>
                                </div>
                            ) : (
                                activeNumbers.map(num => {
                                    const isLocked = num.cancelUnlockTime && Date.now() < num.cancelUnlockTime;
                                    const isCancelling = cancellingIds.includes(num.id);
                                    const remainingTime = isLocked ? Math.ceil((num.cancelUnlockTime! - Date.now()) / 1000) : 0;

                                    return (
                                        <div key={num.id} className="flex items-stretch bg-[#0c0818] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all shadow-lg min-h-[90px]">
                                            {/* Left: Info */}
                                            <div className="w-[200px] p-4 flex flex-col justify-center border-r border-white/5 bg-black/20">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{num.service_name}</span>
                                                <div className="flex items-center gap-2 mb-2 group cursor-pointer" onClick={() => {navigator.clipboard.writeText(num.number); notify('Número copiado!', 'success')}}>
                                                    <span className="text-lg font-mono font-bold text-white group-hover:text-indigo-300 transition-colors">{num.number}</span>
                                                    <Copy size={12} className="text-gray-600 group-hover:text-white" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase
                                                        ${num.status === 'RECEIVED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-900/50' : 
                                                          num.status === 'CANCELED' ? 'bg-red-900/30 text-red-400 border-red-900/50' : 
                                                          'bg-amber-900/30 text-amber-400 border-amber-900/50 animate-pulse'}
                                                    `}>
                                                        {num.status === 'WAITING' ? 'AGUARDANDO...' : num.status}
                                                    </span>
                                                    <span className="text-[9px] text-gray-600 px-1.5 py-0.5 border border-white/5 rounded">Server {num.server_id === 2002 ? '2' : num.server_id}</span>
                                                </div>
                                            </div>

                                            {/* Middle: Code Area (Big Highlight) */}
                                            <div className="flex-1 flex items-center justify-center p-4 bg-gradient-to-r from-black/20 to-transparent relative">
                                                {num.status === 'RECEIVED' ? (
                                                    <div 
                                                        className="text-center cursor-pointer group"
                                                        onClick={() => {navigator.clipboard.writeText(num.code || ''); notify('Código Copiado!', 'success')}}
                                                    >
                                                        <span className="text-4xl font-mono font-black text-emerald-400 tracking-[0.2em] drop-shadow-[0_0_15px_rgba(16,185,129,0.4)] group-hover:scale-105 transition-transform inline-block">
                                                            {num.code}
                                                        </span>
                                                        <p className="text-[9px] text-emerald-600 uppercase font-bold mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Clique para copiar</p>
                                                    </div>
                                                ) : num.status === 'CANCELED' ? (
                                                    <div className="text-center text-gray-700">
                                                        <XCircle size={24} className="mx-auto mb-1 opacity-50" />
                                                        <span className="text-xs font-bold uppercase">Cancelado</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 opacity-30">
                                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-100"></div>
                                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-200"></div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="w-[120px] flex flex-col justify-center items-center p-2 border-l border-white/5 gap-2 bg-black/10">
                                                {num.status === 'WAITING' && (
                                                    isLocked ? (
                                                        <div className="text-center">
                                                            <Timer size={16} className="mx-auto text-gray-600 mb-1" />
                                                            <span className="text-[9px] font-bold text-gray-500 block">Bloqueio</span>
                                                            <span className="text-[10px] font-mono text-gray-400">{remainingTime}s</span>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => cancelNumber(num.id)} 
                                                            disabled={isCancelling}
                                                            className={`w-full py-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all
                                                                ${isCancelling 
                                                                    ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-wait' 
                                                                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300'}
                                                            `}
                                                        >
                                                            {isCancelling ? <RefreshCw size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                            <span className="text-[9px] font-bold uppercase">{isCancelling ? 'Processando' : 'Cancelar'}</span>
                                                        </button>
                                                    )
                                                )}
                                                
                                                {(num.status === 'RECEIVED' || num.status === 'CANCELED' || num.status === 'FINISHED') && (
                                                    <button 
                                                        onClick={() => removeCard(num.id)} 
                                                        className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-all flex flex-col items-center justify-center gap-1"
                                                    >
                                                        <Trash2 size={14} />
                                                        <span className="text-[9px] font-bold uppercase">Arquivar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                // --- TAB COFRE (TABELA SIMPLES) ---
                <div className="flex-1 bg-[#0a0516] border border-white/5 rounded-xl overflow-hidden flex flex-col animate-fade-in">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Database size={16} className="text-emerald-400" /> Histórico de Códigos Salvos
                        </h3>
                        <button onClick={exportPixKeys} className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                            <Download size={14} /> Baixar .TXT
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-xs text-gray-400">
                            <thead className="bg-black/40 text-gray-500 uppercase font-bold sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">Serviço</th>
                                    <th className="px-6 py-3">Número</th>
                                    <th className="px-6 py-3">Código</th>
                                    <th className="px-6 py-3 text-right">Data</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pixKeys.map((k, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-3 font-bold text-white">{k.bank}</td>
                                        <td className="px-6 py-3 font-mono">{k.number}</td>
                                        <td className="px-6 py-3">
                                            <span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded font-mono font-bold border border-emerald-900/50 select-all">
                                                {k.code}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-gray-500">{new Date(k.date).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {pixKeys.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-10 text-center text-gray-600">Nenhum código salvo ainda.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmsRush;
