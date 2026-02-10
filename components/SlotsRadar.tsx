
import React, { useState, useEffect } from 'react';
import { Gamepad2, Search, Zap, Filter, Flame, Dna, Box, Play, Star, Info, Lock, Copy, Trophy, Fish, Sparkles, Gem, Plus, Trash2, X, Image as ImageIcon, Save, ShieldCheck, Ghost, HardDrive, RefreshCw, Globe, User, AlertTriangle, ArrowRight, Crown } from 'lucide-react';
import { supabase } from '../supabaseClient'; // IMPORT SUPABASE

interface SlotGame {
    id: number;
    name: string;
    provider: string;
    volatility: 'Alta' | 'Média' | 'Baixa';
    stars: 2 | 3;
    tags: string[];
    imageUrl: string;
    owner_name?: string; // Novo campo para mostrar quem criou
}

interface Props {
    notify: (msg: string, type: 'success' | 'error' | 'info') => void;
    isAdmin?: boolean;
    currentUserKey?: string;
    userName?: string;
}

// --- BANCO DE DADOS DE JOGOS 2025 (OFICIAIS - ATUALIZADO) ---
const GAMES_DB: SlotGame[] = [
    // --- WG (Wealth/Golden) ---
    { id: 101, name: 'Dragon vs Tiger', provider: 'WG', volatility: 'Alta', stars: 3, tags: ['Cartas', 'Ao Vivo'], imageUrl: 'https://dashboardcpa.com.br/images/games/dragon-vs-tiger.jpg' },
    { id: 102, name: 'Mais Fortuna & Riqueza', provider: 'WG', volatility: 'Média', stars: 2, tags: ['Slots', 'Fortuna'], imageUrl: 'https://dashboardcpa.com.br/images/games/mais-fortuna.jpg' },
    { id: 103, name: 'Lucky Dog', provider: 'WG', volatility: 'Média', stars: 2, tags: ['Animal', 'Divertido'], imageUrl: 'https://dashboardcpa.com.br/images/games/lucky-dog.jpg' },
    { id: 104, name: 'Treasure Bowl', provider: 'WG', volatility: 'Média', stars: 2, tags: ['Pote', 'Ouro'], imageUrl: 'https://dashboardcpa.com.br/images/games/treasure-bolw.jpg' },
    { id: 105, name: 'Dragon Treasure II', provider: 'WG', volatility: 'Alta', stars: 3, tags: ['Dragão', 'Jackpot'], imageUrl: 'https://dashboardcpa.com.br/images/games/dragon-treasure.jpg' },
    { id: 106, name: 'Fishing Master', provider: 'WG', volatility: 'Média', stars: 3, tags: ['Pesca', 'Habilidade'], imageUrl: 'https://dashboardcpa.com.br/images/games/fishing-master.jpg' },

    // --- MG (Microgaming) ---
    { id: 201, name: '777 Mega Deluxe', provider: 'MG', volatility: 'Média', stars: 2, tags: ['Clássico', '777'], imageUrl: 'https://chanz.cloud/cmscontent/images/777megadeluxe-icon_full-9be15147.jpg' },
    { id: 202, name: 'Lucky Twins', provider: 'MG', volatility: 'Alta', stars: 3, tags: ['Asiático', 'Pares'], imageUrl: 'https://dashboardcpa.com.br/images/games/Lucky-Twins.jpg' },
    { id: 203, name: '777 BIG', provider: 'MG', volatility: 'Média', stars: 3, tags: ['Jackpot', 'Retro'], imageUrl: 'https://dashboardcpa.com.br/images/games/777-BIG.jpg' },

    // --- JILI ---
    { id: 301, name: 'Jungle King', provider: 'JILI', volatility: 'Alta', stars: 3, tags: ['Aventura', 'Kong'], imageUrl: 'https://dashboardcpa.com.br/images/games/jungle-king.jpg' },
    { id: 302, name: 'Crazy 777', provider: 'JILI', volatility: 'Baixa', stars: 3, tags: ['Rápido', 'Hot'], imageUrl: 'https://dashboardcpa.com.br/images/games/crazy777.jpg' },
    { id: 303, name: 'Crazy Hunter', provider: 'JILI', volatility: 'Alta', stars: 3, tags: ['Tiro', 'Ação'], imageUrl: 'https://dashboardcpa.com.br/images/games/crazy-hunter.jpg' },
    { id: 304, name: 'XIYANGYANG', provider: 'JILI', volatility: 'Média', stars: 2, tags: ['Asiático', 'Ovelha'], imageUrl: 'https://dashboardcpa.com.br/images/games/xiyangy.jpg' },
    { id: 305, name: 'FaFaFa', provider: 'JILI', volatility: 'Baixa', stars: 2, tags: ['Simples', 'Clássico'], imageUrl: 'https://dashboardcpa.com.br/images/games/crazy-fafafa.jpg' },
    { id: 306, name: 'Golden Joker', provider: 'JILI', volatility: 'Alta', stars: 3, tags: ['Cartas', 'Coringa'], imageUrl: 'https://dashboardcpa.com.br/images/games/golden-joker.jpg' },

    // --- JDB ---
    { id: 401, name: 'Triple King Kong', provider: 'JDB', volatility: 'Alta', stars: 3, tags: ['Gorila', 'Multiplicador'], imageUrl: 'https://online.casinocity.com/image_resize.ashx?type=game&imgid=87387&width=280' },
    { id: 402, name: 'Funky King Kong', provider: 'JDB', volatility: 'Média', stars: 2, tags: ['Funky', 'Música'], imageUrl: 'https://games.okbet.com/wp-content/uploads/2025/08/funky-king-kong-logo.webp' },
    { id: 403, name: 'Treasure Bowl (V2)', provider: 'JDB', volatility: 'Média', stars: 3, tags: ['Ouro', 'Upgrade'], imageUrl: 'https://dashboardcpa.com.br/images/games/treasure-bolwwww.jpg' },
    { id: 404, name: 'Super Niubi', provider: 'JDB', volatility: 'Média', stars: 2, tags: ['Touro', 'Sorte'], imageUrl: 'https://games.okbet.com/wp-content/uploads/2025/08/super-niubi-jdb-logo.webp' },
    { id: 405, name: 'Crazy King Kong', provider: 'JDB', volatility: 'Alta', stars: 2, tags: ['Loucura', 'Wilds'], imageUrl: 'https://gr8.tech/wp-content/uploads/2025/04/cover-5ef059938ba799aaa845e1c2e8a762bd.png?x22443' },
    { id: 406, name: 'Lucky Color', provider: 'JDB', volatility: 'Baixa', stars: 3, tags: ['Cores', 'Dados'], imageUrl: 'https://dashboardcpa.com.br/images/games/lucky-color.jpg' },
    { id: 407, name: 'Bulls Treasure', provider: 'JDB', volatility: 'Alta', stars: 3, tags: ['Touro', 'Tesouro'], imageUrl: 'https://dashboardcpa.com.br/images/games/Bulls-treasure.jpg' },
    { id: 408, name: 'Fruity Bonanza', provider: 'JDB', volatility: 'Média', stars: 2, tags: ['Frutas', 'Cascata'], imageUrl: 'https://dashboardcpa.com.br/images/games/fruty-bonanza.jpg' },
    { id: 409, name: 'Birds Party Deluxe', provider: 'JDB', volatility: 'Média', stars: 3, tags: ['Pássaros', 'Arcade'], imageUrl: 'https://cdn.hub88.io/JDB%20Gaming/jdb_birdspartydeluxe.jpg' },
    { id: 410, name: 'Koi Trio', provider: 'JDB', volatility: 'Baixa', stars: 2, tags: ['Peixes', 'Sorte'], imageUrl: 'https://slotslaunch.nyc3.digitaloceanspaces.com/36072/koi-trio.jpg' },
    { id: 411, name: 'CooCoo Farm', provider: 'JDB', volatility: 'Média', stars: 3, tags: ['Fazenda', 'Ovos'], imageUrl: 'https://forum.winzir.ph/assets/files/2024-04-30/1714463879-18306-photo-2024-04-30-15-57-36.jpg' },

    // --- PG SOFT ---
    { id: 501, name: 'Fortune Dragon', provider: 'PG', volatility: 'Média', stars: 3, tags: ['Dragão', 'Multiplier'], imageUrl: 'https://dashboardcpa.com.br/images/games/fortune-dragon.jpg' },
    { id: 502, name: 'Gem Saviour', provider: 'PG', volatility: 'Média', stars: 3, tags: ['Aventura', 'Gemas'], imageUrl: 'https://dashboardcpa.com.br/images/games/Gem-Saviour.jpg' },
    { id: 503, name: 'Piggy Gold', provider: 'PG', volatility: 'Média', stars: 2, tags: ['Porquinho', 'Ano Novo'], imageUrl: 'https://dashboardcpa.com.br/images/games/pigg-gold.jpg' },
    { id: 504, name: 'Chicky Run', provider: 'PG', volatility: 'Baixa', stars: 3, tags: ['Corrida', 'Pinto'], imageUrl: 'https://dashboardcpa.com.br/images/games/Chicky-run.jpg' },
    { id: 506, name: 'Prosperity Lion', provider: 'PG', volatility: 'Alta', stars: 3, tags: ['Leão', 'Dança'], imageUrl: 'https://dashboardcpa.com.br/images/games/Prosperity-lion.jpg' },
    { id: 507, name: 'Mr Hallow Jackpot', provider: 'PG', volatility: 'Alta', stars: 2, tags: ['Halloween', 'Assustador'], imageUrl: 'https://dashboardcpa.com.br/images/games/Mr-Hallow-Jackpot.jpg' },
    { id: 508, name: 'Plushie Frenzy', provider: 'PG', volatility: 'Média', stars: 3, tags: ['Fofo', 'Claw Machine'], imageUrl: 'https://dashboardcpa.com.br/images/games/Plushie-Frenzy.jpg' },
    { id: 509, name: 'Win Win Won', provider: 'PG', volatility: 'Baixa', stars: 3, tags: ['Pet', 'Cachorro'], imageUrl: 'https://dashboardcpa.com.br/images/games/Win-Win-Won.jpg' },

    // --- PESCARIA ---
    { id: 601, name: 'Mega Fishing', provider: 'PESCARIA', volatility: 'Alta', stars: 3, tags: ['Oceano', 'Chefe'], imageUrl: 'https://dashboardcpa.com.br/images/games/mega-finsh.jpg' },
    { id: 602, name: 'Happy Fishing', provider: 'PESCARIA', volatility: 'Média', stars: 3, tags: ['Divertido', 'Peixes'], imageUrl: 'https://dashboardcpa.com.br/images/games/happy-fishing.jpg' },
    { id: 603, name: 'Boom Legend', provider: 'PESCARIA', volatility: 'Alta', stars: 3, tags: ['Monstros', 'RPG'], imageUrl: 'https://dashboardcpa.com.br/images/games/boom-legend.jpg' },
    { id: 604, name: 'Dragon Fortune', provider: 'PESCARIA', volatility: 'Alta', stars: 3, tags: ['Dragão', 'Tiro'], imageUrl: 'https://dashboardcpa.com.br/images/games/dragon-fortune.jpg' },

    // --- PP (Pragmatic Play) ---
    { id: 700, name: 'Plush WINS', provider: 'PP', volatility: 'Média', stars: 2, tags: ['Fofo', 'Ursinhos'], imageUrl: 'https://dashboardcpa.com.br/images/games/plush-win-pp.jpg' },
    { id: 702, name: '888 Gold', provider: 'PP', volatility: 'Média', stars: 3, tags: ['Ouro', '888'], imageUrl: 'https://dashboardcpa.com.br/images/games/888gold.jpg' },
    { id: 703, name: 'Jade Butterfly', provider: 'PP', volatility: 'Baixa', stars: 3, tags: ['Borboleta', 'Zen'], imageUrl: 'https://dashboardcpa.com.br/images/games/Jade-Butterfly.jpg' },
    { id: 704, name: 'Fire Strike', provider: 'PP', volatility: 'Alta', stars: 2, tags: ['Fogo', 'Jackpot'], imageUrl: 'https://dashboardcpa.com.br/images/games/Fire-Strike.jpg' },
    { id: 705, name: 'Irish Charms', provider: 'PP', volatility: 'Média', stars: 3, tags: ['Trevo', 'Sorte'], imageUrl: 'https://dashboardcpa.com.br/images/games/Irish-Charms.jpg' },
    { id: 706, name: 'Diamonds Are Forever', provider: 'PP', volatility: 'Média', stars: 2, tags: ['Diamantes', 'Retrô'], imageUrl: 'https://dashboardcpa.com.br/images/games/Diamonds-Are-Forever.jpg' },
    { id: 707, name: 'Diamond Strike', provider: 'PP', volatility: 'Média', stars: 3, tags: ['Diamantes', 'Free Spins'], imageUrl: 'https://dashboardcpa.com.br/images/games/Diamond-Strike.jpg' },

    // --- FC (Fa Chai) ---
    { id: 801, name: 'Treasure Raiders', provider: 'FC', volatility: 'Média', stars: 3, tags: ['Tumba', 'Aventura'], imageUrl: 'https://static.templodeslots.es/pict/1130080/Treasure-Raiders.png?timestamp=1740549955000&imageDataId=1215015&width=320&height=247' },
    { id: 802, name: 'Cowboys', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Oeste', 'Tiro'], imageUrl: 'https://dashboardcpa.com.br/images/games/Cowboys.jpg' },
    { id: 803, name: 'Fortune Sheep', provider: 'FC', volatility: 'Baixa', stars: 2, tags: ['Ovelha', 'Ano Novo'], imageUrl: 'https://fachaigaming.com/uploads/43e8d9e9-af4c-4520-84de-8f5d7a9240bb-22062_masthead_xs_en.webp' },
    { id: 804, name: 'Golden Panther', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Pantera', 'Selva'], imageUrl: 'https://dashboardcpa.com.br/images/games/Golden-Panther.jpg' },
    { id: 805, name: 'Rich Man', provider: 'FC', volatility: 'Alta', stars: 3, tags: ['Magnata', 'Dinheiro'], imageUrl: 'https://dashboardcpa.com.br/images/games/Rich-Man.jpg' },
    { id: 806, name: 'Color Game', provider: 'FC', volatility: 'Baixa', stars: 3, tags: ['Dados', 'Cores'], imageUrl: 'https://dashboardcpa.com.br/images/games/Color-Game.jpg' },
    { id: 807, name: 'Gladiatriz de Roma', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Roma', 'Batalha'], imageUrl: 'https://dashboardcpa.com.br/images/games/Gladiatriz-de-Roma.jpg' },
    { id: 808, name: 'Hot Money', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Dinheiro', 'Crime'], imageUrl: 'https://mediumrare.imgix.net/68ea84ca72c7ca9002eed0f4d2bf382f15d8ca6220ea1e874ff11bb271dc685f?q=85' },

    // --- CQ9 ---
    { id: 901, name: 'Gu Gu Gu 2', provider: 'CQ9', volatility: 'Alta', stars: 3, tags: ['Galo', 'Asiático'], imageUrl: 'https://static.casino.guru/pict/81843/Gu-Gu-Gu-2.png?timestamp=1653485889000&imageDataId=300934&width=320&height=247' },
];

const SlotsRadar: React.FC<Props> = ({ notify, isAdmin = false, currentUserKey, userName }) => {
    const [activeTab, setActiveTab] = useState<'official' | 'custom' | 'favorites'>('official');
    const [selectedProvider, setSelectedProvider] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- SUPABASE SYNC STATE ---
    const [customGames, setCustomGames] = useState<SlotGame[]>([]);
    const [isLoadingCustom, setIsLoadingCustom] = useState(false);

    // --- FAVORITES STATE ---
    const [favorites, setFavorites] = useState<number[]>(() => {
        try {
            const saved = localStorage.getItem('slots_favorites');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    // Modal Add
    const [showModal, setShowModal] = useState(false);
    const [newGame, setNewGame] = useState({ name: '', provider: '', imageUrl: '' });

    // Persist Favorites
    useEffect(() => {
        localStorage.setItem('slots_favorites', JSON.stringify(favorites));
    }, [favorites]);

    const toggleFavorite = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(prev => {
            const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
            if (newFavs.includes(id)) {
                notify("Jogo adicionado aos favoritos!", "success");
            }
            return newFavs;
        });
    };

    // BUSCA OS JOGOS DO SUPABASE
    const fetchCustomSlots = async () => {
        setIsLoadingCustom(true);
        try {
            let query = supabase.from('custom_slots').select('*');

            // Se NÃO for Admin, filtra apenas os jogos do usuário atual
            if (!isAdmin && currentUserKey) {
                 query = query.eq('user_key', currentUserKey);
            }
            // Se for Admin, ele pega tudo (query sem filtro)
            
            // CORREÇÃO LINHA-POR-LINHA: Ordernar por ID decrescente para novos aparecerem primeiro
            query = query.order('id', { ascending: false });

            const { data, error } = await query;
            if (error) throw error;

            if (data) {
                const formatted: SlotGame[] = data.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    provider: d.provider || 'Personal',
                    volatility: d.volatility || 'Alta',
                    stars: d.stars || 3,
                    tags: ['Customizado'],
                    imageUrl: d.image_url,
                    owner_name: d.owner_name // Quem criou
                }));
                setCustomGames(formatted);
            }
        } catch (err) {
            console.error("Erro ao buscar slots:", err);
            // Fallback silencioso ou notify opcional
        } finally {
            setIsLoadingCustom(false);
        }
    };

    // Recarrega sempre que mudar a aba ou user
    useEffect(() => {
        if (activeTab === 'custom' || activeTab === 'favorites') {
            fetchCustomSlots();
        }
    }, [activeTab, currentUserKey]);


    const handleAddGame = async () => {
        if (!newGame.name || !newGame.imageUrl) {
            notify('Nome e Imagem são obrigatórios.', 'error');
            return;
        }
        if (!currentUserKey) {
            notify('Erro de autenticação. Recarregue a página.', 'error');
            return;
        }

        const payload = {
            user_key: currentUserKey,
            owner_name: userName || 'Anônimo',
            name: newGame.name,
            provider: newGame.provider || 'Personal',
            image_url: newGame.imageUrl
        };

        try {
            const { error } = await supabase.from('custom_slots').insert([payload]);
            if (error) throw error;
            
            notify('Jogo salvo na sua lista privada!', 'success');
            setNewGame({ name: '', provider: '', imageUrl: '' });
            setShowModal(false);
            fetchCustomSlots(); // Atualiza lista
        } catch (err: any) {
             notify(`Erro ao salvar: ${err.message}`, 'error');
        }
    };

    const handleDeleteGame = async (id: number) => {
        if(confirm('Tem certeza que deseja excluir este jogo?')) {
            try {
                const { error } = await supabase.from('custom_slots').delete().eq('id', id);
                if (error) throw error;
                notify('Jogo removido.', 'info');
                fetchCustomSlots();
            } catch (err: any) {
                notify(`Erro ao deletar: ${err.message}`, 'error');
            }
        }
    };

    // LOGICA DE FILTRO ATUALIZADA
    let displayGames: SlotGame[] = [];
    if (activeTab === 'official') {
        displayGames = GAMES_DB;
    } else if (activeTab === 'custom') {
        displayGames = customGames;
    } else if (activeTab === 'favorites') {
        // Consolida todos os jogos disponíveis para filtrar os favoritos
        displayGames = [...GAMES_DB, ...customGames].filter(g => favorites.includes(g.id));
    }
    
    const filteredGames = displayGames.filter(game => {
        // Filtro de Provedor (Apenas se não estiver na aba favoritos, ou se quisermos filtrar favoritos por provedor também - deixarei livre nos favoritos por enquanto ou user 'Todos')
        const matchProvider = selectedProvider === 'Todos' || game.provider === selectedProvider;
        const matchSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (game.owner_name && game.owner_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchProvider && matchSearch;
    });

    const providers = ['Todos', 'PG', 'PP', 'WG', 'MG', 'JILI', 'JDB', 'FC', 'PESCARIA', 'CQ9'];

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in pb-20 relative">
            
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-6 mb-8 gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-pink-600 to-rose-600 rounded-2xl shadow-lg shadow-pink-900/30 border border-pink-500/30">
                        <Gamepad2 size={32} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
                            Slots Intel <span className="text-xs bg-amber-500 text-black px-2 py-0.5 rounded font-bold uppercase tracking-wider">2025</span>
                        </h2>
                        <p className="text-gray-400 text-sm font-medium">Catálogo Oficial de Performance.</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {/* Search Bar */}
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-4 top-3.5 text-gray-500 group-focus-within:text-pink-400 transition-colors" size={18} />
                        <input 
                            type="text" 
                            placeholder={isAdmin && activeTab === 'custom' ? "Buscar jogo ou dono..." : "Buscar jogo..."}
                            className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:border-pink-500 outline-none transition-all shadow-inner placeholder:text-gray-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    {/* Botão Refresh (Admin Custom Tab) */}
                    {activeTab === 'custom' && isAdmin && (
                         <button 
                            onClick={fetchCustomSlots}
                            className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl border border-white/10"
                            title="Atualizar Lista Global"
                        >
                            <RefreshCw size={20} className={isLoadingCustom ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            {/* TABS NAVIGATION */}
            <div className="flex justify-center mb-6">
                <div className="bg-black/40 p-1.5 rounded-xl border border-white/10 flex gap-2 shadow-inner">
                    <button 
                        onClick={() => setActiveTab('official')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'official' ? 'bg-pink-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Trophy size={16} /> Catálogo Oficial
                    </button>
                    <button 
                        onClick={() => setActiveTab('favorites')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'favorites' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-gray-500 hover:text-amber-400'}`}
                    >
                        <Star size={16} fill={activeTab === 'favorites' ? "currentColor" : "none"} /> Favoritos
                        <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px] ml-1 opacity-70">{favorites.length}</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('custom')}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'custom' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        {isAdmin ? <Globe size={16} /> : <Sparkles size={16} />}
                        {isAdmin ? 'Jogos da Rede (Global)' : 'Meus Jogos'}
                        <span className="bg-black/30 px-1.5 py-0.5 rounded text-[10px] ml-1 text-emerald-300">{customGames.length}</span>
                    </button>
                </div>
            </div>

            {/* PRIVACY WARNING BANNER (Only in Custom + NOT Admin) */}
            {activeTab === 'custom' && !isAdmin && (
                <div className="mb-8 animate-fade-in">
                    <div className="bg-[#050b08] border border-emerald-500/20 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl shadow-emerald-900/10 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="absolute right-0 top-0 p-8 opacity-5 pointer-events-none">
                            <Lock size={100} />
                        </div>
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    Armazenamento Local & Privado
                                </h3>
                                <p className="text-gray-400 text-xs mt-1 max-w-xl leading-relaxed">
                                    Para garantir sua privacidade, os jogos adicionados aqui são visíveis <strong className="text-emerald-400">apenas para você</strong> nesta sessão.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 relative z-10">
                            <HardDrive size={12} />
                            <span>Storage: Secure</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Provider Filter (Only for Official OR Favorites) */}
            {activeTab !== 'custom' && (
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-4 mb-6">
                    {providers.map(prov => (
                        <button
                            key={prov}
                            onClick={() => setSelectedProvider(prov)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                                selectedProvider === prov 
                                ? 'bg-pink-600 text-white border-pink-500 shadow-lg shadow-pink-900/20' 
                                : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            {prov}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                
                {/* --- CARD FANTASMA (BOTÃO DE ADICIONAR) INTEGRADO AO GRID --- */}
                {/* Aparece sempre como primeiro item na aba CUSTOM (se não for Admin) */}
                {activeTab === 'custom' && !isAdmin && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="group relative bg-emerald-900/5 rounded-2xl overflow-hidden border-2 border-dashed border-emerald-500/20 hover:border-emerald-500 hover:bg-emerald-900/10 transition-all duration-300 flex flex-col items-center justify-center text-center p-4 aspect-[3/4] cursor-pointer"
                    >
                         <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                             <Plus size={28} className="text-emerald-400" />
                         </div>
                         <h3 className="text-emerald-200 font-bold text-sm">Adicionar Novo</h3>
                         <p className="text-emerald-500/50 text-[10px] mt-1">Clique para cadastrar</p>
                    </button>
                )}

                {/* --- GAME CARDS --- */}
                {isLoadingCustom ? (
                     <div className="col-span-full py-20 text-center">
                         <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-4" size={32} />
                         <p className="text-gray-500">Sincronizando biblioteca...</p>
                     </div>
                ) : filteredGames.length === 0 && activeTab === 'favorites' ? (
                    <div className="col-span-full py-20 text-center opacity-50 flex flex-col items-center">
                        <div className="p-4 bg-amber-500/10 rounded-full mb-4">
                            <Star size={40} className="text-amber-500" />
                        </div>
                        <p className="text-gray-400 font-bold text-lg">Sua lista de favoritos está vazia.</p>
                        <p className="text-gray-600 text-sm mt-1">Clique na estrela nos cards do Catálogo Oficial para adicionar.</p>
                    </div>
                ) : filteredGames.length === 0 && activeTab === 'official' ? (
                     <div className="col-span-full py-20 text-center opacity-50">
                        <Gamepad2 size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-500 font-bold">Nenhum jogo encontrado.</p>
                    </div>
                ) : filteredGames.length === 0 && activeTab === 'custom' && !isAdmin ? (
                    // ESTADO VAZIO (CUSTOM) - AINDA MOSTRA O GHOST CARD (ACIMA), ENTÃO AQUI É SÓ TEXTO DE APOIO SE NECESSÁRIO
                    <div className="col-span-full md:col-span-2 flex items-center p-6 text-gray-500 opacity-60">
                         <ArrowRight className="mr-3 text-emerald-500 animate-bounce-x" />
                         <p className="text-sm">Comece adicionando seu primeiro jogo aqui ao lado.</p>
                    </div>
                ) : (
                    filteredGames.map(game => {
                        const isFavorite = favorites.includes(game.id);
                        return (
                            <div key={game.id} className="group relative bg-[#0a0614] rounded-2xl overflow-hidden border border-white/5 hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                                
                                {/* Image Container */}
                                <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
                                    <img 
                                        src={game.imageUrl} 
                                        alt={game.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 relative z-10"
                                        loading="lazy"
                                        onError={(e) => {
                                            // CORREÇÃO LINHA-POR-LINHA: Fallback visual para evitar quebra de layout
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.querySelector('.fallback-layer')?.classList.remove('hidden');
                                            e.currentTarget.parentElement?.classList.add('bg-gradient-to-br', 'from-gray-800', 'to-black');
                                        }}
                                    />
                                    
                                    {/* Fallback Layer (Só aparece se a imagem falhar) */}
                                    <div className="fallback-layer hidden absolute inset-0 flex-col items-center justify-center p-4 text-center z-0 animate-fade-in">
                                        <div className="p-3 bg-white/5 rounded-full mb-3 border border-white/10">
                                            <Gem size={24} className="text-pink-500/50" />
                                        </div>
                                        <span className="text-xs font-bold text-white/50 uppercase tracking-widest leading-relaxed px-2">{game.name}</span>
                                    </div>

                                    {/* Overlay Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-50 transition-opacity z-20"></div>

                                    {/* Floating Provider Badge */}
                                    <div className="absolute top-2 left-2 z-30">
                                        <span className="bg-black/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded border border-white/10 uppercase tracking-wider shadow-lg">
                                            {game.provider}
                                        </span>
                                    </div>

                                    {/* Favorite Button (Top Right) */}
                                    <button
                                        onClick={(e) => toggleFavorite(game.id, e)}
                                        className={`absolute top-2 right-2 z-40 p-1.5 rounded-lg border backdrop-blur-md transition-all shadow-lg hover:scale-110 ${
                                            isFavorite 
                                            ? 'bg-amber-500 text-black border-amber-400' 
                                            : 'bg-black/60 text-white border-white/10 hover:bg-black/80'
                                        }`}
                                        title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
                                    >
                                        <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
                                    </button>

                                    {/* Delete Button (Custom Tab Only) */}
                                    {activeTab === 'custom' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                                            className="absolute bottom-2 right-2 z-40 bg-black/60 hover:bg-rose-600 text-white p-1.5 rounded-lg border border-white/10 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}

                                    {/* Admin View: Show Creator Name */}
                                    {isAdmin && activeTab === 'custom' && game.owner_name && (
                                        <div className="absolute bottom-2 left-2 z-30">
                                            <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded border border-indigo-400 shadow-lg flex items-center gap-1">
                                                <User size={8} /> {game.owner_name}
                                            </span>
                                        </div>
                                    )}

                                    {/* Volatility Badge (Hidden in Custom usually, but retained for logic consistency) */}
                                    {activeTab !== 'custom' && (
                                        <div className="absolute bottom-2 left-2 z-30">
                                            <span className={`text-[9px] font-bold px-2 py-1 rounded border uppercase flex items-center gap-1 backdrop-blur-md shadow-lg ${
                                                game.volatility === 'Alta' ? 'bg-rose-500/90 text-white border-rose-500' :
                                                game.volatility === 'Média' ? 'bg-amber-500/90 text-black border-amber-500' :
                                                'bg-emerald-500/90 text-black border-emerald-500'
                                            }`}>
                                                {game.volatility === 'Alta' ? <Flame size={10} fill="currentColor" /> : <Zap size={10} fill="currentColor" />}
                                                {game.volatility}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Info Content */}
                                <div className="p-4 relative z-30 bg-[#0a0614]">
                                    <h3 className="text-white font-bold text-sm truncate mb-1" title={game.name}>{game.name}</h3>
                                    
                                    {/* Rating Stars */}
                                    <div className="flex items-center gap-1 text-amber-400 mb-3">
                                        {Array.from({length: 3}).map((_, i) => (
                                            <Star 
                                                key={i} 
                                                size={12} 
                                                fill={i < game.stars ? "currentColor" : "none"} 
                                                className={i < game.stars ? "text-amber-400" : "text-gray-700"}
                                            />
                                        ))}
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1 mb-3 h-6 overflow-hidden">
                                        {game.tags.map(tag => (
                                            <span key={tag} className="text-[9px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded border border-white/5">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(game.name);
                                            notify(`Nome "${game.name}" copiado!`, 'success');
                                        }}
                                        className="w-full bg-white/5 hover:bg-pink-600 hover:text-white text-gray-300 font-bold py-2 rounded-lg text-xs transition-all border border-white/5 flex items-center justify-center gap-2 group/btn"
                                    >
                                        <Copy size={12} /> Copiar Nome
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* MODAL ADD GAME */}
            {showModal && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#0f0a1e] border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500"></div>
                        
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus size={24} className="text-emerald-400" /> Adicionar Jogo
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Nome do Jogo</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Ex: Tigre Vip"
                                    value={newGame.name}
                                    onChange={e => setNewGame({...newGame, name: e.target.value})}
                                />
                            </div>
                            
                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Provedor (Opcional)</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Ex: PG, Próprio..."
                                    value={newGame.provider}
                                    onChange={e => setNewGame({...newGame, provider: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block flex items-center gap-1">
                                    <ImageIcon size={10} /> URL da Imagem (Capa)
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:border-emerald-500 outline-none"
                                    placeholder="https://..."
                                    value={newGame.imageUrl}
                                    onChange={e => setNewGame({...newGame, imageUrl: e.target.value})}
                                />
                                <p className="text-[10px] text-gray-600 mt-1">Cole o link direto de uma imagem (JPG/PNG).</p>
                            </div>

                            <button 
                                onClick={handleAddGame}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                <Save size={18} /> SALVAR NA MINHA LISTA
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SlotsRadar;
