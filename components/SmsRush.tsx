import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Smartphone, RefreshCw, LogIn, Lock, Mail, Server, Search, ShoppingCart, Trash2, Copy, MessageSquare, AlertTriangle, CheckCircle2, Clock, XCircle, ChevronRight, Loader2, Wifi, WifiOff, Globe, Settings2, ShieldAlert, ExternalLink } from 'lucide-react';
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
    status: string; // "WAITING", "CANCELED", "OK"
    created_at: number;
    server_id: number;
    expire_at?: number; // Calculado localmente
}

// --- CONFIGURAÇÃO DE PROXIES ---
const PROXIES = {
    corsanywhere: { label: 'Proxy Beta (Mais Estável - Requer Clique)', url: 'https://cors-anywhere.herokuapp.com/' },
    corsproxy: { label: 'Proxy Alpha (Rápido)', url: 'https://corsproxy.io/?' },
    codetabs: { label: 'Proxy Gamma (CodeTabs)', url: 'https://api.codetabs.com/v1/proxy?quest=' },
    thingproxy: { label: 'Proxy Delta (ThingProxy)', url: 'https://thingproxy.freeboard.io/fetch/' },
    direct: { label: 'Conexão Direta (Requer Extensão)', url: '' }
};

const TARGET_API = 'https://api.smsrush.com.br/api/v1';

const SmsRush: React.FC<Props> = ({ notify }) => {
    // --- ESTADOS DE AUTENTICAÇÃO ---
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('sms_rush_token'));
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    
    // Configuração de Conexão
    const [selectedProxy, setSelectedProxy] = useState<keyof typeof PROXIES>('corsanywhere');
    const [showUnlockHelp, setShowUnlockHelp] = useState(false);

    // --- ESTADOS DA LOJA ---
    const [server, setServer] = useState<number>(1);
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // --- ESTADOS DAS ATIVAÇÕES ---
    const [activations, setActivations] = useState<Activation[]>([]);
    const [isPolling, setIsPolling] = useState(false);
    
    // --- REFERÊNCIAS ---
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pollingIntervalRef = useRef<number | null>(null);

    // Inicializa o áudio
    useEffect(() => {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.volume = 0.3; // Volume baixo/sutil
    }, []);

    // Helper para construir URL
    const getApiUrl = (endpoint: string) => {
        const proxyBase = PROXIES[selectedProxy].url;
        const targetUrl = `${TARGET_API}${endpoint}`;
        
        if (selectedProxy === 'direct') return targetUrl;
        
        // CorsProxy: prefere URL crua depois do ?
        if (selectedProxy === 'corsproxy') {
             return `${proxyBase}${encodeURIComponent(targetUrl)}`;
        }
        
        // CorsAnywhere e outros geralmente funcionam concatenando direto
        return `${proxyBase}${targetUrl}`;
    };

    // --- AUTENTICAÇÃO ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoggingIn(true);
        setShowUnlockHelp(false);

        try {
            const url = getApiUrl('/auth/login');
            console.log('Tentando login via:', selectedProxy, url);

            const res = await fetch(url, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    // Alguns proxies rejeitam headers customizados, mantemos o básico
                },
                body: JSON.stringify({ email, password })
            }).catch(err => {
                throw new Error("Falha na conexão. Se estiver usando o Proxy Beta, verifique se desbloqueou o acesso.");
            });
            
            // Verifica status 403 (Comum no CorsAnywhere se não ativado)
            if (res.status === 403 && selectedProxy === 'corsanywhere') {
                setShowUnlockHelp(true);
                throw new Error("Acesso bloqueado pelo Proxy. Clique no botão de desbloqueio acima.");
            }

            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error("Resposta não-JSON:", text);
                throw new Error(`O Proxy retornou um erro não legível. Tente outra opção.`);
            }

            if (!res.ok) {
                throw new Error(json.message || json.error || 'Credenciais inválidas ou erro na API');
            }
            
            if (json.data && json.data.token) {
                setToken(json.data.token);
                localStorage.setItem('sms_rush_token', json.data.token);
                notify('Conectado ao SMS RUSH!', 'success');
            } else {
                throw new Error(json.message || 'Falha no login');
            }
        } catch (err: any) {
            console.error(err);
            notify(`${err.message}`, 'error');
            
            // Se falhar no CorsAnywhere, sugere desbloqueio
            if (selectedProxy === 'corsanywhere') {
                setShowUnlockHelp(true);
            }
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setToken(null);
        localStorage.removeItem('sms_rush_token');
        setActivations([]);
    };

    // --- LISTAGEM DE SERVIÇOS ---
    const fetchServices = useCallback(async () => {
        if (!token) return;
        setLoadingServices(true);
        try {
            const url = getApiUrl(`/services?country_id=73&server_id=${server}`);
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => { throw new Error("Erro de conexão"); });
            
            if (!res.ok) throw new Error('Falha ao buscar serviços');
            
            const json = await res.json();
            
            if (json.data) {
                const list = Array.isArray(json.data) ? json.data : Object.values(json.data);
                setServices(list as Service[]);
            }
        } catch (err: any) {
            console.error(err);
            notify(`Erro serviços: ${err.message}`, 'error');
        } finally {
            setLoadingServices(false);
        }
    }, [token, server, selectedProxy]);

    useEffect(() => {
        if (token) {
            fetchServices();
            fetchActivations(); // Carrega ativações existentes ao iniciar
        }
    }, [token, server, fetchServices]);

    // --- COMPRA DE NÚMERO ---
    const buyNumber = async (service: Service) => {
        if (!token) return;
        
        try {
            const url = getApiUrl('/virtual-numbers');
            const res = await fetch(url, {
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
            const json = await res.json();

            if (json.data && json.data.number) {
                const newActivation: Activation = {
                    id: json.data.id,
                    service_name: service.name,
                    number: json.data.number,
                    sms_code: null,
                    status: 'WAITING',
                    created_at: Date.now(),
                    server_id: server,
                    expire_at: Date.now() + (19 * 60 * 1000) // ~19 min estimado
                };

                setActivations(prev => [newActivation, ...prev]);
                
                // AUTO COPY
                navigator.clipboard.writeText(json.data.number);
                notify(`Número ${json.data.number} copiado!`, 'success');
            } else {
                throw new Error(json.message || 'Erro na compra');
            }
        } catch (err: any) {
            notify(err.message, 'error');
        }
    };

    // --- SINCRONIZAÇÃO E POLLING ---
    const fetchActivations = async () => {
        if (!token) return;
        try {
            const url = getApiUrl('/virtual-numbers/activations');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const json = await res.json();
            if (json.data) {
                // Aqui poderíamos sincronizar com o estado local se necessário
            }
        } catch (err) {
            console.error("Erro sync ativações", err);
        }
    };

    // POLLING: Verifica status de cada número ativo
    useEffect(() => {
        if (!token || activations.length === 0) return;

        // Filtra apenas os que estão esperando SMS
        const waiting = activations.filter(a => a.status === 'WAITING');
        if (waiting.length === 0) return;

        setIsPolling(true);
        pollingIntervalRef.current = window.setInterval(async () => {
            
            for (const act of waiting) {
                try {
                    const url = getApiUrl(`/virtual-numbers/${act.id}/status`);
                    const res = await fetch(url, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const json = await res.json();

                    // Se chegou código (sms_code não é null e mudou)
                    if (json.data && json.data.sms_code) {
                        setActivations(prev => prev.map(item => {
                            if (item.id === act.id && item.sms_code !== json.data.sms_code) {
                                // TOCA O SOM
                                audioRef.current?.play().catch(() => {});
                                notify(`SMS Chegou: ${json.data.sms_code}`, 'success');
                                return { ...item, sms_code: json.data.sms_code, status: 'OK' };
                            }
                            return item;
                        }));
                    }
                    
                    // Se cancelou/expirou no servidor
                    if (json.data && (json.data.status === 'CANCELED' || json.data.status === 'TIMEOUT')) {
                         setActivations(prev => prev.map(item => 
                            item.id === act.id ? { ...item, status: 'CANCELED' } : item
                         ));
                    }

                } catch (err) {
                    console.error('Polling error', err);
                }
            }

        }, 5000); // 5 Segundos

        return () => {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            setIsPolling(false);
        };
    }, [activations, token, selectedProxy]);


    // --- CANCELAMENTO ---
    const handleCancel = async (id: string) => {
        if (!token) return;
        if (!confirm('Deseja cancelar este número?')) return;

        try {
            const url = getApiUrl(`/virtual-numbers/${id}`);
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                setActivations(prev => prev.filter(a => a.id !== id));
                notify('Número cancelado e reembolsado.', 'info');
            } else {
                const json = await res.json();
                // Verifica erro de tempo (server 2)
                if (res.status === 400 || res.status === 429) {
                    notify('Aguarde: Cancelamento bloqueado por 2 minutos (Regra do Servidor).', 'error');
                } else {
                    notify(`Erro ao cancelar: ${json.message || 'Desconhecido'}`, 'error');
                }
            }
        } catch (err) {
            notify('Erro de conexão ao cancelar.', 'error');
        }
    };

    // --- FILTRO DE SERVIÇOS ---
    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // --- RENDER LOGIN ---
    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in p-6 relative">
                
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[100px]"></div>
                </div>

                <div className="bg-[#0c0818]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    
                    <div className="text-center mb-8 relative z-10">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-900/40 rotate-3 transform group-hover:rotate-6 transition-transform duration-500">
                            <MessageSquare size={40} className="text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight mb-2">SMS RUSH</h2>
                        
                        {/* SELETOR DE PROXY */}
                        <div className="relative group/proxy w-full max-w-xs mx-auto">
                            <label className="text-[9px] font-bold text-gray-500 uppercase mb-1 block">Método de Conexão</label>
                            <div className="relative">
                                <Globe size={14} className="absolute left-3 top-3 text-emerald-500 z-10" />
                                <select 
                                    className="w-full bg-black/60 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-xs font-bold text-gray-300 focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer hover:bg-white/5 transition-colors"
                                    value={selectedProxy}
                                    onChange={(e) => {
                                        setSelectedProxy(e.target.value as keyof typeof PROXIES);
                                        setShowUnlockHelp(false);
                                    }}
                                >
                                    {Object.entries(PROXIES).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-3 pointer-events-none text-gray-500">
                                    <Settings2 size={12} />
                                </div>
                            </div>
                            
                            {/* ALERTA DE DESBLOQUEIO CORS-ANYWHERE */}
                            {selectedProxy === 'corsanywhere' && (
                                <div className="mt-2 text-center">
                                    <a 
                                        href="https://cors-anywhere.herokuapp.com/corsdemo" 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded border transition-all ${showUnlockHelp ? 'bg-amber-500 text-black border-amber-500 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'}`}
                                    >
                                        <ExternalLink size={10} /> {showUnlockHelp ? 'CLIQUE AQUI PARA DESBLOQUEAR' : 'Desbloquear Acesso (Obrigatório)'}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5 relative z-10">
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1 tracking-wider">E-mail de Acesso</label>
                            <div className="relative group/input">
                                <Mail className="absolute left-4 top-3.5 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-gray-600"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-gray-500 ml-1 tracking-wider">Senha</label>
                            <div className="relative group/input">
                                <Lock className="absolute left-4 top-3.5 text-gray-500 group-focus-within/input:text-emerald-400 transition-colors" size={18} />
                                <input 
                                    type="password" 
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-gray-600"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoggingIn}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 mt-4 active:scale-[0.98]"
                        >
                            {isLoggingIn ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                            ACESSAR PAINEL
                        </button>
                        
                        <div className="text-center mt-6">
                            <p className="text-[10px] text-gray-600">
                                Utilize suas credenciais oficiais do smsrush.com.br
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER PAINEL ---
    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in pb-20 h-full flex flex-col xl:flex-row gap-6 p-4 md:p-0">
            
            {/* COLUNA ESQUERDA: COMPRA DE SERVIÇOS */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden">
                
                {/* Header Loja */}
                <div className="flex flex-col md:flex-row justify-between items-center bg-[#0c0818] p-4 rounded-2xl border border-white/10 shadow-lg">
                    <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                            <Smartphone size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg">Loja de Números</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className={`w-2 h-2 rounded-full ${token ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                Conectado ao Servidor {server}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Selector de Servidor */}
                        <div className="bg-black/40 p-1 rounded-lg border border-white/10 flex">
                            <button 
                                onClick={() => setServer(1)}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${server === 1 ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                            >
                                S1
                            </button>
                            <button 
                                onClick={() => setServer(2)}
                                className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${server === 2 ? 'bg-emerald-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}
                            >
                                S2
                            </button>
                        </div>
                        <button onClick={handleLogout} className="p-2.5 hover:bg-white/10 rounded-lg text-gray-500 hover:text-white transition-colors">
                            <XCircle size={20} />
                        </button>
                    </div>
                </div>

                {/* Lista de Serviços */}
                <div className="flex-1 bg-[#0c0818] border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-lg">
                    <div className="p-4 border-b border-white/5 flex gap-4 bg-black/20">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
                            <input 
                                type="text" 
                                placeholder="Buscar serviço (ex: WhatsApp, 99...)"
                                className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-emerald-500 outline-none"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={fetchServices} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors border border-white/5">
                            <RefreshCw size={18} className={loadingServices ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {loadingServices ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600">
                                <Loader2 className="animate-spin mb-2" />
                                <p className="text-xs">Carregando catálogo...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {filteredServices.map(service => (
                                    <button 
                                        key={service.id}
                                        onClick={() => buyNumber(service)}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-emerald-900/20 border border-white/5 hover:border-emerald-500/30 transition-all group text-left"
                                    >
                                        <div>
                                            <span className="font-bold text-gray-200 text-sm block group-hover:text-emerald-400 truncate w-32">{service.name}</span>
                                            <span className="text-[10px] text-gray-500">{service.quantity} disp.</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-mono font-bold text-emerald-400">{formatarBRL(service.final_price)}</span>
                                            <span className="text-[9px] bg-white/10 px-1.5 rounded text-gray-400">COMPRAR</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* COLUNA DIREITA: MEUS NÚMEROS (ATIVAÇÕES) */}
            <div className="w-full xl:w-[450px] flex flex-col h-full bg-[#0a0614] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-5 border-b border-white/5 bg-gradient-to-r from-emerald-900/10 to-transparent flex justify-between items-center">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <MessageSquare size={18} className="text-emerald-400" /> Ativações Ativas
                    </h3>
                    {isPolling && (
                        <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1 animate-pulse">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            BUSCANDO SMS...
                        </span>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                    {activations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-60">
                            <ShoppingCart size={40} className="mb-3" />
                            <p className="text-sm font-medium">Nenhuma ativação no momento.</p>
                            <p className="text-xs text-center max-w-[200px] mt-1">Compre um número ao lado para receber códigos.</p>
                        </div>
                    ) : (
                        activations.map(act => (
                            <div key={act.id} className="bg-black/30 border border-white/10 rounded-xl overflow-hidden relative group animate-slide-in-right">
                                {act.sms_code && (
                                    <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none border-2 border-emerald-500/30 rounded-xl z-0"></div>
                                )}
                                
                                {/* Header do Card */}
                                <div className="p-3 flex justify-between items-start relative z-10">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">{act.service_name}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">ID: {act.id}</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-mono font-bold text-gray-200">{act.number}</span>
                                            <button 
                                                onClick={() => {navigator.clipboard.writeText(act.number); notify('Copiado!', 'info');}}
                                                className="text-gray-500 hover:text-white transition-colors"
                                            >
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <button 
                                            onClick={() => handleCancel(act.id)}
                                            className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-colors"
                                            title="Cancelar / Reembolsar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Área do Código SMS */}
                                <div className="px-3 pb-3 relative z-10">
                                    {act.sms_code ? (
                                        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3 flex flex-col items-center justify-center text-center animate-pulse-slow">
                                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                                                <CheckCircle2 size={10} /> Código Recebido
                                            </span>
                                            <span className="text-3xl font-black text-white font-mono tracking-widest select-all cursor-pointer" onClick={() => {navigator.clipboard.writeText(act.sms_code!); notify('Código copiado!', 'success');}}>
                                                {act.sms_code}
                                            </span>
                                            <p className="text-[9px] text-emerald-500/60 mt-1">Clique para copiar</p>
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-center gap-3">
                                            <Loader2 size={16} className="text-amber-500 animate-spin" />
                                            <span className="text-xs text-gray-400 font-mono">Aguardando SMS...</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Status */}
                                <div className="bg-black/40 px-3 py-2 flex justify-between items-center text-[10px] text-gray-500 relative z-10">
                                    <span className="flex items-center gap-1">
                                        <Server size={10} /> Server {act.server_id}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock size={10} /> Expira em ~19min
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};

export default SmsRush;