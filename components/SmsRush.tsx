import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, RefreshCw, LogIn, Lock, Mail, Server, Search, ShoppingCart, Trash2, Copy, MessageSquare, CheckCircle2, Clock, XCircle, Loader2, Globe, Settings2, ExternalLink, Key, Terminal, AlertTriangle, ShieldAlert, Zap, Wifi, Activity } from 'lucide-react';
import { formatarBRL } from '../utils';

interface Props {
    notify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// --- TIPOS DA API ---
interface Service {
    id: number;
    name: string;
    base_price: number;
    final_price: number;
    quantity: number;
}

interface Activation {
    id: string;
    service_name: string;
    number: string;
    sms_code: string | null;
    status: string;
    created_at: number;
    server_id: number;
    expire_at?: number;
}

interface LogEntry {
    id: number;
    time: string;
    type: 'req' | 'res' | 'err';
    msg: string;
}

const SmsRush: React.FC<Props> = ({ notify }) => {
    // --- ESTADOS DE AUTENTICAÇÃO ---
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('sms_rush_token'));
    const [loginTab, setLoginTab] = useState<'manual' | 'auto'>('manual');
    const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'online' | 'offline'>('checking');
    
    // Login Form
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    // Manual Token
    const [manualToken, setManualToken] = useState('');

    // --- ESTADOS DA LOJA ---
    const [server, setServer] = useState<number>(1);
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- ESTADOS DAS ATIVAÇÕES ---
    const [activations, setActivations] = useState<Activation[]>([]);
    const [isPolling, setIsPolling] = useState(false);
    
    // --- LOGS ---
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // --- REFERÊNCIAS ---
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pollingIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.volume = 0.5;
        addLog('SYS', 'Inicializando Vercel Gateway...');
        checkGateway();
    }, []);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const addLog = (type: 'req' | 'res' | 'err' | 'SYS', msg: string) => {
        setLogs(prev => [...prev.slice(-19), {
            id: Date.now(),
            time: new Date().toLocaleTimeString().split(' ')[0],
            type: type as any,
            msg
        }]);
    };

    // --- VERCEL PROXY FETCH ---
    const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
        const proxyUrl = `/api/proxy?endpoint=${endpoint}`; 
        
        try {
            const res = await fetch(proxyUrl, options);
            
            if (!res.ok) {
                const text = await res.text();
                let json;
                try { json = JSON.parse(text); } catch { json = { message: text }; }
                throw new Error(json.message || `Erro HTTP ${res.status}`);
            }

            setGatewayStatus('online');
            return await res.json();
        } catch (err: any) {
            console.error("API Error:", err);
            // Se falhar a conexão com o proxy (não erro da API, mas da rede/vercel)
            if (err.message.includes('fetch') || err.message.includes('Network')) {
                setGatewayStatus('offline');
            }
            throw err;
        }
    };

    const checkGateway = async () => {
        try {
            // Tenta um endpoint leve apenas para ver se o proxy responde
            await fetch('/api/proxy?endpoint=/services?country_id=73&server_id=1');
            setGatewayStatus('online');
            addLog('SYS', 'Gateway Conectado.');
        } catch (e) {
            setGatewayStatus('offline');
            addLog('err', 'Gateway Indisponível.');
        }
    };

    // --- AUTENTICAÇÃO VIA API ---
    const handleAutoLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        addLog('req', 'Autenticando via Vercel...');

        try {
            const json = await apiCall('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (json.data && json.data.token) {
                saveToken(json.data.token);
                addLog('res', 'Login realizado com sucesso!');
            } else {
                throw new Error('Credenciais inválidas.');
            }
        } catch (err: any) {
            notify(`Erro: ${err.message}`, 'error');
            addLog('err', err.message);
        } finally {
            setIsLoggingIn(false);
        }
    };

    // --- AUTENTICAÇÃO MANUAL ---
    const handleManualLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanToken = manualToken.replace(/^Bearer\s+/i, '').replace(/"/g, '').trim();
        
        if (cleanToken.length > 20) {
            saveToken(cleanToken);
            addLog('SYS', 'Token manual salvo.');
        } else {
            notify('Token inválido.', 'error');
        }
    };

    const saveToken = (newToken: string) => {
        setToken(newToken);
        localStorage.setItem('sms_rush_token', newToken);
        notify('Conectado!', 'success');
        fetchServices();
    };

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('sms_rush_token');
        setActivations([]);
        addLog('SYS', 'Desconectado.');
    };

    // --- LISTAGEM DE SERVIÇOS ---
    const fetchServices = useCallback(async () => {
        if (!token) return;
        setLoadingServices(true);
        addLog('req', `Atualizando catálogo (S${server})...`);
        
        try {
            const json = await apiCall(`/services?country_id=73&server_id=${server}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (json.data) {
                const list = Array.isArray(json.data) ? json.data : Object.values(json.data);
                setServices(list as Service[]);
                addLog('res', `${list.length} serviços disponíveis.`);
            }
        } catch (err: any) {
            notify(`Erro serviços: ${err.message}`, 'error');
            addLog('err', `Falha Serv: ${err.message}`);
            if (err.message.includes('401')) handleLogout();
        } finally {
            setLoadingServices(false);
        }
    }, [token, server]);

    useEffect(() => {
        if (token) {
            fetchServices();
            fetchActivations();
        }
    }, [token, server, fetchServices]);

    // --- COMPRA DE NÚMERO ---
    const buyNumber = async (service: Service) => {
        if (!token) return;
        addLog('req', `Solicitando ${service.name}...`);
        
        try {
            const json = await apiCall('/virtual-numbers', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    service_id: service.id,
                    server_id: server,
                    country_id: 73
                })
            });

            if (json.data && json.data.number) {
                const newActivation: Activation = {
                    id: json.data.id,
                    service_name: service.name,
                    number: json.data.number,
                    sms_code: null,
                    status: 'WAITING',
                    created_at: Date.now(),
                    server_id: server,
                    expire_at: Date.now() + (19 * 60 * 1000)
                };

                setActivations(prev => [newActivation, ...prev]);
                
                navigator.clipboard.writeText(json.data.number);
                notify(`Número ${json.data.number} copiado!`, 'success');
                addLog('res', `Número gerado: ${json.data.number}`);
            } else {
                throw new Error(json.message || 'Erro na compra');
            }
        } catch (err: any) {
            notify(err.message, 'error');
            addLog('err', `Compra: ${err.message}`);
        }
    };

    // --- SINCRONIZAÇÃO E POLLING ---
    const fetchActivations = async () => {
        if (!token) return;
        try {
            await apiCall('/virtual-numbers/activations', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (err) {
            // Sincronização silenciosa
        }
    };

    // POLLING (VERIFICAÇÃO DE SMS)
    useEffect(() => {
        if (!token || activations.length === 0) return;

        const waiting = activations.filter(a => a.status === 'WAITING');
        if (waiting.length === 0) return;

        setIsPolling(true);
        pollingIntervalRef.current = window.setInterval(async () => {
            
            for (const act of waiting) {
                try {
                    const json = await apiCall(`/virtual-numbers/${act.id}/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    // Se chegou código
                    if (json.data && json.data.sms_code) {
                        setActivations(prev => prev.map(item => {
                            if (item.id === act.id && item.sms_code !== json.data.sms_code) {
                                audioRef.current?.play().catch(() => {});
                                notify(`SMS Chegou: ${json.data.sms_code}`, 'success');
                                addLog('res', `SMS Recebido: ${json.data.sms_code}`);
                                return { ...item, sms_code: json.data.sms_code, status: 'OK' };
                            }
                            return item;
                        }));
                    }
                    
                    // Se cancelou/expirou
                    if (json.data && (json.data.status === 'CANCELED' || json.data.status === 'TIMEOUT')) {
                         setActivations(prev => prev.map(item => 
                            item.id === act.id ? { ...item, status: 'CANCELED' } : item
                         ));
                    }

                } catch (err) {
                    console.error('Polling error', err);
                }
            }

        }, 4000); 

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsPolling(false);
        };
    }, [activations, token]);


    const handleCancel = async (id: string) => {
        if (!token) return;
        if (!confirm('Deseja cancelar este número?')) return;

        try {
            await apiCall(`/virtual-numbers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            setActivations(prev => prev.filter(a => a.id !== id));
            notify('Cancelado e reembolsado.', 'info');
            addLog('res', `Num ${id} cancelado.`);
            
        } catch (err: any) {
            notify(`Erro ao cancelar: ${err.message}`, 'error');
        }
    };

    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER LOGIN ---
    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] animate-fade-in p-6 relative">
                
                <div className="bg-[#0c0818] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
                    
                    {/* Header */}
                    <div className="bg-[#080510] p-8 text-center border-b border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl mb-4 border border-emerald-500/20 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                            <Smartphone size={32} />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">SMS RUSH <span className="text-emerald-500 text-xs align-top bg-emerald-500/10 px-1.5 rounded border border-emerald-500/20">PRO</span></h2>
                        <p className="text-gray-500 text-xs mt-2 flex items-center justify-center gap-2">
                            <Zap size={12} className="text-amber-400" />
                            Integração Vercel Serverless
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-white/5 bg-black/20">
                        <button 
                            onClick={() => setLoginTab('manual')}
                            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all ${loginTab === 'manual' ? 'bg-white/5 text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-white'}`}
                        >
                            <span className="flex items-center justify-center gap-2"><Key size={14}/> Token Manual</span>
                        </button>
                        <button 
                            onClick={() => setLoginTab('auto')}
                            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all ${loginTab === 'auto' ? 'bg-white/5 text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500 hover:text-white'}`}
                        >
                            <span className="flex items-center justify-center gap-2"><Globe size={14}/> Login Auto</span>
                        </button>
                    </div>

                    <div className="p-8">
                        {loginTab === 'manual' ? (
                            <form onSubmit={handleManualLogin} className="space-y-6 animate-fade-in">
                                <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 flex gap-4 items-start">
                                    <div className="bg-emerald-500/20 p-2.5 rounded-lg text-emerald-400 shrink-0">
                                        <Terminal size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-sm font-bold mb-1">Como conectar?</h4>
                                        <p className="text-[11px] text-gray-400 leading-relaxed">
                                            Acesse o painel do SMS Rush, abra o console (F12 {'>'} Network), faça uma ação e copie o <span className="text-emerald-300 font-mono bg-emerald-900/30 px-1 rounded">Authorization</span>.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1 tracking-wider mb-2 block">Cole o Token Bearer</label>
                                    <div className="relative group/input">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Key className="text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-gray-700 font-mono text-xs shadow-inner"
                                            placeholder="eyJhbGciOiJIUz..."
                                            value={manualToken}
                                            onChange={e => setManualToken(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                                >
                                    <LogIn size={18} /> Conectar Gateway
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleAutoLogin} className="space-y-5 animate-fade-in">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1 tracking-wider">E-mail</label>
                                    <div className="relative group/input">
                                        <Mail className="absolute left-4 top-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={18} />
                                        <input type="email" required className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-emerald-500 outline-none placeholder:text-gray-700" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-gray-500 ml-1 tracking-wider">Senha</label>
                                    <div className="relative group/input">
                                        <Lock className="absolute left-4 top-4 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={18} />
                                        <input type="password" required className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-emerald-500 outline-none placeholder:text-gray-700" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                                    </div>
                                </div>

                                <button type="submit" disabled={isLoggingIn} className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm">
                                    {isLoggingIn ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={18} />} Entrar
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER PAINEL ---
    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in pb-20 h-full flex flex-col gap-6 p-4 md:p-0">
            
            {/* LINHA SUPERIOR */}
            <div className="flex flex-col xl:flex-row gap-6 h-[600px]">
                {/* COLUNA ESQUERDA: COMPRA DE SERVIÇOS */}
                <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                    
                    {/* Header Loja */}
                    <div className="flex flex-col md:flex-row justify-between items-center bg-[#0c0818] p-6 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                            <Zap size={100} />
                        </div>
                        
                        <div className="flex items-center gap-5 mb-4 md:mb-0 relative z-10">
                            <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl text-white shadow-lg shadow-emerald-900/40">
                                <Smartphone size={28} />
                            </div>
                            <div>
                                <h2 className="font-black text-white text-2xl tracking-tight">Loja de Ativação</h2>
                                <div className="flex items-center gap-3 text-xs font-bold mt-1">
                                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${gatewayStatus === 'online' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${gatewayStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                        {gatewayStatus === 'online' ? 'GATEWAY ATIVO' : 'OFFLINE'}
                                    </span>
                                    <span className="text-gray-500 flex items-center gap-1"><Globe size={10}/> BR (Brasil)</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 relative z-10">
                            <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex shadow-inner">
                                <button onClick={() => setServer(1)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${server === 1 ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>SERVER 1</button>
                                <button onClick={() => setServer(2)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${server === 2 ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}>SERVER 2</button>
                            </div>
                            <button onClick={handleLogout} className="p-3 hover:bg-rose-500/10 rounded-xl text-gray-500 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-500/20" title="Desconectar">
                                <XCircle size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Lista de Serviços */}
                    <div className="flex-1 bg-[#0c0818] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative">
                        <div className="p-5 border-b border-white/5 flex gap-4 bg-black/20 backdrop-blur-sm z-10">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-3 text-gray-500 group-focus-within:text-emerald-400 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar serviço (ex: WhatsApp, Telegram)..."
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button onClick={fetchServices} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors border border-white/5">
                                <RefreshCw size={20} className={loadingServices ? 'animate-spin' : ''} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 bg-gradient-to-b from-[#0c0818] to-[#05030a]">
                            {loadingServices ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                                    <Loader2 className="animate-spin text-emerald-500" size={32} />
                                    <p className="text-sm font-medium animate-pulse">Sincronizando catálogo...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {filteredServices.map(service => (
                                        <button 
                                            key={service.id}
                                            onClick={() => buyNumber(service)}
                                            className="relative flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-emerald-500/[0.05] border border-white/5 hover:border-emerald-500/40 transition-all group text-left overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-900/10"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            
                                            <div className="relative z-10">
                                                <span className="font-bold text-gray-200 text-sm block group-hover:text-emerald-400 truncate w-32 mb-1">{service.name}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${service.quantity > 50 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                        {service.quantity} und
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right relative z-10">
                                                <span className="block font-black font-mono text-emerald-400 text-lg">{formatarBRL(service.final_price)}</span>
                                                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider group-hover:text-emerald-300/70">Comprar</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: ATIVAÇÕES */}
                <div className="w-full xl:w-[450px] flex flex-col h-full bg-[#0a0614] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center backdrop-blur-md z-10">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <MessageSquare size={20} className="text-emerald-400" /> Minhas Ativações
                        </h3>
                        {isPolling && (
                            <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 animate-pulse bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                <Activity size={12} />
                                MONITORANDO...
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 bg-[#050308]">
                        {activations.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                    <ShoppingCart size={32} />
                                </div>
                                <p className="text-sm font-bold">Nenhuma ativação pendente</p>
                                <p className="text-xs">Selecione um serviço ao lado para começar.</p>
                            </div>
                        ) : (
                            activations.map(act => (
                                <div key={act.id} className="bg-[#0e0a15] border border-white/10 rounded-xl overflow-hidden relative group animate-slide-in-right shadow-lg">
                                    {act.sms_code && (
                                        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none border-2 border-emerald-500/50 rounded-xl z-0 animate-pulse"></div>
                                    )}
                                    
                                    {/* Topo do Card */}
                                    <div className="p-4 flex justify-between items-start relative z-10 border-b border-white/5 bg-white/[0.02]">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-xs font-black text-white uppercase tracking-wider">{act.service_name}</span>
                                                <span className="text-[9px] text-gray-500 font-mono bg-black/30 px-1.5 rounded">#{act.id}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-mono font-bold text-white tracking-wide">{act.number}</span>
                                                <button 
                                                    onClick={() => {navigator.clipboard.writeText(act.number); notify('Copiado!', 'info');}} 
                                                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors"
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <button onClick={() => handleCancel(act.id)} className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors border border-rose-500/20">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Área do SMS */}
                                    <div className="p-4 relative z-10">
                                        {act.sms_code ? (
                                            <div 
                                                className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-emerald-500/30 transition-colors group/sms"
                                                onClick={() => {navigator.clipboard.writeText(act.sms_code!); notify('Código copiado!', 'success');}}
                                            >
                                                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> SMS Recebido
                                                </span>
                                                <span className="text-4xl font-black text-white font-mono tracking-widest drop-shadow-lg group-hover/sms:scale-110 transition-transform">
                                                    {act.sms_code}
                                                </span>
                                                <span className="text-[9px] text-emerald-400/50 mt-1 opacity-0 group-hover/sms:opacity-100 transition-opacity">Clique para copiar</span>
                                            </div>
                                        ) : (
                                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center gap-2">
                                                <Loader2 size={24} className="text-amber-500 animate-spin" />
                                                <span className="text-xs text-gray-400 font-medium animate-pulse">Aguardando SMS...</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Info */}
                                    <div className="bg-black/40 px-4 py-2 flex justify-between items-center text-[10px] text-gray-500 relative z-10 font-mono">
                                        <span className="flex items-center gap-1"><Server size={10} /> S{act.server_id}</span>
                                        <span className="flex items-center gap-1 text-amber-500/70"><Clock size={10} /> Expira em ~19min</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* TERMINAL DE LOGS (Estilo Console) */}
            <div className="bg-[#050505] rounded-xl border border-white/10 overflow-hidden font-mono text-xs flex flex-col h-40 shadow-2xl">
                <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Terminal size={12} className="text-emerald-500" />
                        <span className="text-gray-300 font-bold uppercase tracking-wider">System Terminal</span>
                    </div>
                    <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                        <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1.5 custom-scrollbar text-gray-400 bg-black/50">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-3 hover:bg-white/5 px-1 rounded">
                            <span className="text-gray-600 opacity-50">[{log.time}]</span>
                            <span className={`font-bold ${
                                log.type === 'req' ? 'text-blue-400' : 
                                log.type === 'res' ? 'text-emerald-400' : 
                                log.type === 'err' ? 'text-rose-500' : 'text-amber-300'
                            }`}>
                                {log.type === 'req' ? 'OUT >>' : log.type === 'res' ? 'IN  <<' : log.type === 'err' ? 'ERR !!' : 'SYS --'}
                            </span>
                            <span className="truncate">{log.msg}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>

        </div>
    );
};

export default SmsRush;