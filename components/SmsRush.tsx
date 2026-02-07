
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Smartphone, RefreshCw, Search, Copy, X, LogIn, Wifi, Activity, ShoppingBag, Database, Download, Landmark, ExternalLink, Lock, ShieldCheck, CreditCard, Wallet, CloudLightning, XCircle, Star, Timer, Trash2, Server, CheckCircle2, ArrowRight, Zap, Info, Signal, MessageSquare, ChevronRight, LayoutList, Grid, Globe, Play, ToggleLeft, ToggleRight, Repeat } from 'lucide-react';

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
    const [autoCopy, setAutoCopy] = useState(true);
    const autoCopyRef = useRef(true);

    // State para estatísticas da sessão (Visual apenas)
    const [sessionSpend, setSessionSpend] = useState(0);
    const [sessionSuccess, setSessionSuccess] = useState(0);

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

    useEffect(() => {
        autoCopyRef.current = autoCopy;
    }, [autoCopy]);

    // --- EDGE FUNCTION REQUEST HANDLER (MANTIDO EXATAMENTE COMO NO BACKUP) ---
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

    // --- ACTIONS (MANTIDAS DO BACKUP) ---

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
                // Update Session Stats (Visual only)
                setSessionSpend(prev => prev + service.price);
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
                        setSessionSpend(prev => prev + service.price);
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
            if (number && navigator.clipboard && autoCopyRef.current) {
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
                setSessionSpend(prev => prev - 1.0); // Devolve aprox no visual
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
        if (pixKeys.length === 0) {
            notify("Cofre vazio.", "info");
            return;
        }
        const text = pixKeys.map(k => `[${new Date(k.date).toLocaleString()}] ${k.bank}: ${k.number} -> ${k.code}`).join('\n');
        const element = document.createElement("a");
        const file = new Blob([text], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "sms_vault_backup.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        URL.revokeObjectURL(element.href);
    };

    useEffect(() => {
        const timerInterval = setInterval(() => { setTimerTick(t => t + 1); }, 1000);
        return () => clearInterval(timerInterval);
    }, []);

    // --- NEW OPTIMIZED POLLING LOGIC (SINGLE LIST REQUEST) ---
    useEffect(() => {
        if (!token) return;
        const pollInterval = setInterval(async () => {
            // Verifica se tem números esperando
            const hasWaiting = activeNumbers.some(n => n.status === 'WAITING');
            if (!hasWaiting) return;

            try {
                // SINGLE CALL TO GET ALL ACTIVATIONS
                const res = await requestBridge('virtual-numbers/activations', 'GET');
                const responseJson = await res.json();
                
                // Assuming standard response structure { data: [ ... ] } or { ... }
                const apiActivations = Array.isArray(responseJson.data) ? responseJson.data : (Array.isArray(responseJson) ? responseJson : []);

                setActiveNumbers(current => {
                    return current.map(localNum => {
                        if (localNum.status !== 'WAITING') return localNum;

                        // Find matching number in API list by ID
                        const apiMatch = apiActivations.find((apiNum: any) => String(apiNum.id) === String(localNum.id));

                        if (apiMatch) {
                            // Extract SMS from 'latest_sms_code'
                            const smsCode = apiMatch.latest_sms_code;
                            const status = apiMatch.status; // Optional status check

                            if (smsCode && smsCode.length > 2 && smsCode !== 'WAITING') {
                                notify(`SMS Recebido: ${localNum.service_name}`, 'success');
                                setSessionSuccess(prev => prev + 1);
                                saveToPixVault(localNum, smsCode);
                                
                                if(autoCopyRef.current && navigator.clipboard) {
                                    navigator.clipboard.writeText(smsCode);
                                }
                                new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3').play().catch(()=>{});
                                
                                return { ...localNum, status: 'RECEIVED', code: smsCode };
                            }
                            
                            if (status === 'CANCELED' || status === 'TIMEOUT') {
                                return { ...localNum, status: 'CANCELED' };
                            }
                        }
                        return localNum;
                    });
                });
            } catch (e) {
                console.error("Polling Error:", e);
            }
        }, 4000); 
        
        return () => clearInterval(pollInterval);
    }, [token, requestBridge, activeNumbers]); // Re-bind if activeNumbers changes isn't strictly necessary if using functional update, but safer here

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
        <div className="max-w-[1600px] mx-auto animate-fade-in pb-20 px-4 h-full flex flex-col">
            
            {/* HEADER TÁTICO (KPIs) - NOVO VISUAL */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* 1. Saldo & Status */}
                <div className="bg-[#0c0818] rounded-2xl p-5 border border-white/10 flex flex-col justify-between shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform"><Wallet size={60}/></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Saldo Disponível</p>
                            <h2 className="text-3xl font-black text-white font-mono tracking-tight flex items-center gap-2">
                                {balance !== null ? `R$ ${balance.toFixed(2)}` : '---'}
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></span>
                            </h2>
                        </div>
                        <button onClick={refreshData} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><RefreshCw size={14}/></button>
                    </div>
                </div>

                {/* 2. Sessão & Gastos */}
                <div className="bg-[#0c0818] rounded-2xl p-5 border border-white/10 flex flex-col justify-center shadow-lg relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400"><Activity size={16}/></div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Investido Agora</span>
                    </div>
                    <p className="text-2xl font-black text-white font-mono">R$ {sessionSpend.toFixed(2)}</p>
                </div>

                {/* 3. Success Rate */}
                <div className="bg-[#0c0818] rounded-2xl p-5 border border-white/10 flex flex-col justify-center shadow-lg relative">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><CheckCircle2 size={16}/></div>
                        <span className="text-xs font-bold text-gray-400 uppercase">SMS Recebidos</span>
                    </div>
                    <p className="text-2xl font-black text-white font-mono">{sessionSuccess}</p>
                </div>

                {/* 4. Controls */}
                <div className="bg-[#0c0818] rounded-2xl p-5 border border-white/10 flex flex-col justify-center gap-3 shadow-lg">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-2"><Copy size={14} /> Auto Copy</span>
                        <button onClick={() => setAutoCopy(!autoCopy)} className={`${autoCopy ? 'text-emerald-400' : 'text-gray-600'} transition-colors`}>
                            {autoCopy ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                        </button>
                    </div>
                    {/* Add more controls here if needed */}
                </div>
            </div>

            {/* NAVIGATION TABS */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                    <button 
                        onClick={() => setActiveTab('catalog')}
                        className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'catalog' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <LayoutList size={14} /> Operação
                    </button>
                    <button 
                        onClick={() => setActiveTab('vault')}
                        className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${activeTab === 'vault' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Database size={14} /> Cofre ({pixKeys.length})
                    </button>
                </div>
                
                {/* Server Selector Compact */}
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
                    {[1, 2002, 3].map((sId) => (
                        <button 
                            key={sId}
                            onClick={() => handleServerChange(sId)} 
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
                                selectedServer === sId 
                                ? 'bg-white text-black shadow-lg' 
                                : 'text-gray-500 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            Server {sId === 2002 ? '2' : sId}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'catalog' ? (
                <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
                    
                    {/* LEFT: CATALOG GRID (Banks Only) */}
                    <div className="w-full lg:w-[400px] flex flex-col bg-[#0a0516] border border-white/5 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0">
                        <div className="p-4 border-b border-white/5 bg-black/20">
                            <div className="relative group">
                                <Search className="absolute left-3 top-2.5 text-gray-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar banco..." 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600 font-medium"
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                            {isLoadingServices ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-500">
                                    <RefreshCw className="animate-spin text-indigo-500" />
                                    <span className="text-xs">Carregando catálogo...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {filteredServices.map(s => {
                                        const hasStock = s.quantity > 0;
                                        return (
                                            <button 
                                                key={s.id}
                                                onClick={() => buyNumber(s)}
                                                disabled={isBuying}
                                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center gap-2 group relative overflow-hidden min-h-[100px]
                                                    ${hasStock 
                                                        ? 'bg-gradient-to-br from-[#18181b] to-black border-white/5 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(79,70,229,0.15)]' 
                                                        : 'opacity-40 grayscale cursor-not-allowed bg-black border-transparent'}
                                                `}
                                            >
                                                <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400 group-hover:scale-110 transition-transform">
                                                    <Landmark size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-white leading-tight mb-0.5 line-clamp-1">{s.name}</h4>
                                                    <p className="text-[10px] font-mono text-gray-400">R$ {s.price.toFixed(2)}</p>
                                                </div>
                                                {hasStock && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: ACTIVE CARDS (Credit Card Style) */}
                    <div className="flex-1 bg-[#0a0516] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                        {/* Background Grid */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                        
                        <div className="p-4 border-b border-white/5 bg-black/20 flex justify-between items-center z-10">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Activity size={16} className="text-emerald-400" /> Monitoramento Ativo
                            </h3>
                            {isBuying && <span className="text-[10px] font-bold text-indigo-400 animate-pulse flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> NEGOCIANDO NÚMERO...</span>}
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 z-10">
                            {activeNumbers.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-40">
                                    <CreditCard size={64} className="mb-4 stroke-1" />
                                    <p className="text-base font-bold">Nenhuma operação ativa</p>
                                    <p className="text-sm">Selecione um banco para gerar um cartão virtual.</p>
                                </div>
                            ) : (
                                activeNumbers.map(num => {
                                    const isLocked = num.cancelUnlockTime && Date.now() < num.cancelUnlockTime;
                                    const isCancelling = cancellingIds.includes(num.id);
                                    const remainingTime = isLocked ? Math.ceil((num.cancelUnlockTime! - Date.now()) / 1000) : 0;

                                    return (
                                        <div key={num.id} className="relative bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] rounded-2xl p-6 border border-white/10 shadow-2xl overflow-hidden group animate-slide-in-right">
                                            {/* Glow Effect based on status */}
                                            <div className={`absolute top-0 right-0 w-[200px] h-[200px] blur-[80px] rounded-full pointer-events-none opacity-20 transition-colors duration-1000
                                                ${num.status === 'RECEIVED' ? 'bg-emerald-500' : num.status === 'CANCELED' ? 'bg-red-500' : 'bg-indigo-500'}
                                            `}></div>

                                            <div className="relative z-10 flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                                        <Landmark size={24} className="text-gray-300" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h3 className="text-lg font-black text-white tracking-tight">{num.service_name}</h3>
                                                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/10 text-gray-400 font-mono">ID {num.id}</span>
                                                        </div>
                                                        <div 
                                                            className="flex items-center gap-3 cursor-pointer group/number w-fit"
                                                            onClick={() => {navigator.clipboard.writeText(num.number); notify('Número copiado!', 'success')}}
                                                        >
                                                            <span className="text-2xl font-mono font-bold text-white/90 group-hover/number:text-indigo-400 transition-colors tracking-widest">
                                                                {num.number}
                                                            </span>
                                                            <Copy size={14} className="text-gray-600 group-hover/number:text-white" />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    {num.status === 'RECEIVED' ? (
                                                        <div className="flex flex-col items-end animate-in fade-in zoom-in duration-500">
                                                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mb-1">Código de Acesso</span>
                                                            <div 
                                                                onClick={() => {navigator.clipboard.writeText(num.code || ''); notify('Código Copiado!', 'success')}}
                                                                className="text-5xl font-mono font-black text-emerald-400 tracking-widest drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] cursor-pointer hover:scale-105 transition-transform"
                                                            >
                                                                {num.code}
                                                            </div>
                                                        </div>
                                                    ) : num.status === 'CANCELED' ? (
                                                        <span className="text-red-500 font-bold text-lg flex items-center gap-2 uppercase tracking-widest border border-red-500/30 px-4 py-2 rounded-lg bg-red-500/10">
                                                            <XCircle size={20} /> Cancelado
                                                        </span>
                                                    ) : (
                                                        <div className="flex flex-col items-end gap-2">
                                                            <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                                                                <RefreshCw size={14} className="animate-spin" />
                                                                <span className="text-xs font-bold uppercase tracking-wider">Aguardando SMS...</span>
                                                            </div>
                                                            {/* Progress Bar Animation */}
                                                            <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500 w-full animate-progress origin-left"></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions Footer */}
                                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    {num.status === 'WAITING' && (
                                                        isLocked ? (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-500 cursor-not-allowed">
                                                                <Timer size={14} />
                                                                <span className="text-xs font-mono">{remainingTime}s</span>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => cancelNumber(num.id)}
                                                                disabled={isCancelling}
                                                                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all text-xs font-bold hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                                                            >
                                                                {isCancelling ? <RefreshCw className="animate-spin" size={14} /> : <XCircle size={14} />}
                                                                CANCELAR
                                                            </button>
                                                        )
                                                    )}
                                                    
                                                    {(num.status === 'RECEIVED' || num.status === 'CANCELED') && (
                                                        <button 
                                                            onClick={() => removeCard(num.id)}
                                                            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition-all text-xs font-bold"
                                                        >
                                                            <Trash2 size={14} /> LIMPAR
                                                        </button>
                                                    )}
                                                </div>

                                                {/* RE-BUY BUTTON */}
                                                {(num.status === 'RECEIVED' || num.status === 'CANCELED') && (
                                                    <button 
                                                        onClick={() => buyNumber({ id: num.service_id, name: num.service_name, price: 0, quantity: 1 })} // Price ignored in buyNumber logic from static DB usually
                                                        className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg hover:shadow-indigo-500/20"
                                                    >
                                                        <Repeat size={14} /> COMPRAR NOVAMENTE
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
                // --- VAULT VIEW ---
                <div className="flex-1 bg-[#0a0516] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                    <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Database size={20} className="text-emerald-400" /> Cofre de Dados
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Todos os SMS recebidos são salvos aqui automaticamente.</p>
                        </div>
                        <button onClick={exportPixKeys} className="bg-white hover:bg-gray-200 text-black px-6 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg">
                            <Download size={16} /> Exportar TXT
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-black/40 text-gray-500 uppercase font-bold sticky top-0 text-xs">
                                <tr>
                                    <th className="px-8 py-4">Banco</th>
                                    <th className="px-8 py-4">Número</th>
                                    <th className="px-8 py-4">Código</th>
                                    <th className="px-8 py-4">Server</th>
                                    <th className="px-8 py-4 text-right">Data/Hora</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pixKeys.map((k, i) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-4 font-bold text-white flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            {k.bank}
                                        </td>
                                        <td className="px-8 py-4 font-mono text-indigo-300">{k.number}</td>
                                        <td className="px-8 py-4">
                                            <span className="bg-emerald-900/30 text-emerald-400 px-3 py-1 rounded font-mono font-bold border border-emerald-900/50 select-all cursor-copy hover:bg-emerald-900/50 transition-colors">
                                                {k.code}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-xs font-mono">#{k.server_id}</td>
                                        <td className="px-8 py-4 text-right font-mono text-gray-500 text-xs">{new Date(k.date).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {pixKeys.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center text-gray-600 opacity-50">
                                            <Database size={48} className="mx-auto mb-4" />
                                            <p>Cofre vazio.</p>
                                        </td>
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
