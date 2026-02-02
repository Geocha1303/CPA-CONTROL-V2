import React, { useState, useEffect } from 'react';
import { Gamepad2, Search, Zap, Filter, Flame, Dna, Box, Play, Star, Info, Lock, Copy, Trophy, Fish, Sparkles, Gem, Plus, Trash2, X, Image as ImageIcon, Save, ShieldCheck, Ghost, HardDrive, RefreshCw, Globe, User } from 'lucide-react';
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

// --- BANCO DE DADOS DE JOGOS 2025 (OFICIAIS) ---
const GAMES_DB: SlotGame[] = [
    // --- WG (Wealth/Golden) ---
    { id: 101, name: 'Dragon vs Tiger', provider: 'WG', volatility: 'Alta', stars: 3, tags: ['Cartas', 'Rápido'], imageUrl: 'https://images.unsplash.com/photo-1508349083400-60b6c6b4421b?q=80&w=400&auto=format&fit=crop' },
    { id: 102, name: 'Mais Fortuna & Riqueza', provider: 'WG', volatility: 'Média', stars: 2, tags: ['Slots'], imageUrl: 'https://cdn.softswiss.net/i/s3/pgsoft/CaishenWins.png' },
    { id: 103, name: 'Lucky Dog', provider: 'WG', volatility: 'Média', stars: 2, tags: ['Animal'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/TaDa-Gaming/38041/lucky-doggy-7053018_s.webp' },
    { id: 104, name: 'Treasure Bowl', provider: 'WG', volatility: 'Média', stars: 2, tags: ['Pote'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB/15543/Treasure-Bowl-JDB-7087368_s.webp' },
    { id: 105, name: 'Dragon Treasure II', provider: 'WG', volatility: 'Alta', stars: 3, tags: ['Dragão'], imageUrl: 'https://images.unsplash.com/photo-1577493340887-b7bfff550145?q=80&w=400&auto=format&fit=crop' },
    { id: 106, name: 'Fishing Master', provider: 'WG', volatility: 'Média', stars: 3, tags: ['Pesca'], imageUrl: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?q=80&w=400&auto=format&fit=crop' },

    // --- MG (Microgaming) ---
    { id: 201, name: '777 Mega Deluxe', provider: 'MG', volatility: 'Média', stars: 2, tags: ['Clássico'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Crazy-Tooth-Studio/18517/777-Mega-Deluxe-1_s.jpg' },
    { id: 202, name: 'Lucky Twins', provider: 'MG', volatility: 'Alta', stars: 3, tags: ['Asiático'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Pulse-8-Studios/15691/Lucky-Twins-Jackpot-1_s.jpg' },
    { id: 203, name: '777 BIG', provider: 'MG', volatility: 'Média', stars: 3, tags: ['Jackpot'], imageUrl: 'https://cdn.softswiss.net/i/s3/microgaming/777RoyalWheel.png' },

    // --- JILI ---
    { id: 301, name: 'Jungle King', provider: 'JILI', volatility: 'Alta', stars: 3, tags: ['Aventura'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Jili-Games/24635/Jungle-King-Jili-Games-6897657_s.jpg' },
    { id: 302, name: 'Crazy 777', provider: 'JILI', volatility: 'Baixa', stars: 2, tags: ['Rápido'], imageUrl: 'https://cdn.softswiss.net/i/s3/jili/Crazy777.png' },
    { id: 303, name: 'Jumple King', provider: 'JILI', volatility: 'Média', stars: 2, tags: ['Pulo'], imageUrl: 'https://images.unsplash.com/photo-1629814249159-e14b1e5a51e5?q=80&w=400&auto=format&fit=crop' },
    { id: 304, name: 'Golden Joker', provider: 'JILI', volatility: 'Alta', stars: 3, tags: ['Cartas'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/1spin4win/48429/golden-joker-fortune-7112636_s.webp' },
    { id: 305, name: 'FaFaFa', provider: 'JILI', volatility: 'Baixa', stars: 2, tags: ['Simples'], imageUrl: 'https://images.unsplash.com/photo-1610219586619-2169b1586566?q=80&w=400&auto=format&fit=crop' },

    // --- JDB ---
    { id: 401, name: 'Triple King Kong', provider: 'JDB', volatility: 'Alta', stars: 3, tags: ['Gorila'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB168/9113/Triple-King-Kong-1_s.jpg' },
    { id: 402, name: 'Funky King Kong', provider: 'JDB', volatility: 'Média', stars: 2, tags: ['Funky'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB168/16556/Funky-King-Kong-6_s.jpg' },
    { id: 403, name: 'Treasure Bowl', provider: 'JDB', volatility: 'Média', stars: 3, tags: ['Ouro'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB/15543/Treasure-Bowl-JDB-7087368_s.webp' },
    { id: 404, name: 'Super Niubi', provider: 'JDB', volatility: 'Média', stars: 2, tags: ['Touro'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB168/16751/Super-Niubi-Deluxe-1_s.jpg' },
    { id: 405, name: 'Crazy King Kong', provider: 'JDB', volatility: 'Alta', stars: 2, tags: ['Loucura'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB168/17507/Crazy-King-Kong-1_s.jpg' },
    { id: 406, name: 'Lucky Color', provider: 'JDB', volatility: 'Baixa', stars: 3, tags: ['Cores'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/JDB168/26845/Lucky-Color-Game-6928396_s.jpg' },

    // --- PG SOFT ---
    { id: 501, name: 'Fortune Dragon', provider: 'PG', volatility: 'Média', stars: 2, tags: ['Ganho Certo 2.00'], imageUrl: 'https://cdn.softswiss.net/i/s3/pgsoft/FortuneDragon.png' },
    { id: 502, name: 'Gem Saviour Sword', provider: 'PG', volatility: 'Média', stars: 3, tags: ['Aventura'], imageUrl: 'https://cdn.softswiss.net/i/s3/pgsoft/GemSaviourSword.png' },
    { id: 503, name: 'Piggy Gold', provider: 'PG', volatility: 'Média', stars: 2, tags: ['Favorito'], imageUrl: 'https://cdn.softswiss.net/i/s3/pgsoft/PiggyGold.png' },
    { id: 504, name: 'Chicky Run', provider: 'PG', volatility: 'Baixa', stars: 3, tags: ['Corrida'], imageUrl: 'https://cdn.softswiss.net/i/s3/pgsoft/RoosterRumble.png' },
    { id: 505, name: 'Hood vs Wolf', provider: 'PG', volatility: 'Média', stars: 2, tags: ['Batalha'], imageUrl: 'https://rainbet.com/_next/image?url=https%3A%2F%2Fcdn.rainbet.com%2Fslots%2Fpgsoft-hood-vs-wolf.jpg&w=1920&q=75' },
    { id: 506, name: 'Prosperity Lion', provider: 'PG', volatility: 'Alta', stars: 3, tags: ['Favorito'], imageUrl: 'https://cdn.softswiss.net/i/s3/pgsoft/ProsperityLion.png' },

    // --- PESCARIA ---
    { id: 601, name: 'Dinosaur Tycoon', provider: 'PESCARIA', volatility: 'Alta', stars: 3, tags: ['Média Alta'], imageUrl: 'https://cdn.softswiss.net/i/s3/quickspin/DinosaurRage.png' },
    { id: 602, name: 'Dinosaur Tycoon 2', provider: 'PESCARIA', volatility: 'Alta', stars: 3, tags: ['Montante'], imageUrl: 'https://cdn.softswiss.net/i/s3/redtiger/ReptizillionsPowerReels.png' },

    // --- PP (Pragmatic Play) ---
    { id: 701, name: 'Joker Jewels', provider: 'PP', volatility: 'Média', stars: 2, tags: ['Clássico'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/JokersJewels.png' },
    { id: 702, name: '888 Gold', provider: 'PP', volatility: 'Média', stars: 3, tags: ['Ouro'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/888Gold.png' },
    { id: 703, name: 'Jade Butterfly', provider: 'PP', volatility: 'Baixa', stars: 3, tags: ['Média/Montante'], imageUrl: 'https://rainbet.com/_next/image?url=https%3A%2F%2Frainbet-images.nyc3.cdn.digitaloceanspaces.com%2Fslots%2Fpragmatic-play-jade-butterfly.png&w=256&q=75' },
    { id: 704, name: 'Fire Strike', provider: 'PP', volatility: 'Alta', stars: 2, tags: ['Fogo'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/FireStrike.png' },
    { id: 705, name: 'Irish Charms', provider: 'PP', volatility: 'Média', stars: 3, tags: ['Trevo'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/IrishCharms.png' },
    { id: 706, name: 'Diamonds Are Forever', provider: 'PP', volatility: 'Média', stars: 2, tags: ['3 Linhas'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/DiamondsareForever3Lines.png' },
    { id: 707, name: 'Diamond Strike', provider: 'PP', volatility: 'Média', stars: 3, tags: ['Diamantes'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/DiamondStrike.png' },

    // --- FC (Fa Chai) ---
    { id: 801, name: 'Treasure Raiders', provider: 'FC', volatility: 'Média', stars: 3, tags: ['Tumba'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Fa-Chai-Gaming/32773/Treasure-Raiders-7012311.jpg' },
    { id: 802, name: 'Cowboys', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Oeste'], imageUrl: 'https://cdn.softswiss.net/i/s3/pragmaticexternal/WildWestGold.png' },
    { id: 803, name: 'Fortune Sheep', provider: 'FC', volatility: 'Baixa', stars: 2, tags: ['Ovelha'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Fa-Chai-Gaming/37118/fortune-sheep-7042554_s.webp' },
    { id: 804, name: 'Golden Panther', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Pantera'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Fa-Chai-Gaming/33033/The-Golden-Panther-7014265_s.jpg' },
    { id: 805, name: 'Rich Man', provider: 'FC', volatility: 'Alta', stars: 3, tags: ['Magnata'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/Fa-Chai-Gaming/32824/Rich-Man-7012747_s.jpg' },
    { id: 806, name: 'Color Game', provider: 'FC', volatility: 'Baixa', stars: 3, tags: ['Dados'], imageUrl: 'https://slotcatalog.com/userfiles/image/games/AllWaySpin/23024/Color-Game-6875568_s.jpg' },
    { id: 807, name: 'Gladiatriz de Roma', provider: 'FC', volatility: 'Alta', stars: 2, tags: ['Batalha'], imageUrl: 'https://cdn.softswiss.net/i/s3/playngo/GameOfGladiators.png' },
];

const SlotsRadar: React.FC<Props> = ({ notify, isAdmin = false, currentUserKey, userName }) => {
    const [activeTab, setActiveTab] = useState<'official' | 'custom'>('official');
    const [selectedProvider, setSelectedProvider] = useState<string>('Todos');
    const [searchTerm, setSearchTerm] = useState('');
    
    // --- SUPABASE SYNC STATE ---
    const [customGames, setCustomGames] = useState<SlotGame[]>([]);
    const [isLoadingCustom, setIsLoadingCustom] = useState(false);

    // Modal Add
    const [showModal, setShowModal] = useState(false);
    const [newGame, setNewGame] = useState({ name: '', provider: '', imageUrl: '' });

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
        if (activeTab === 'custom') {
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
            
            notify('Jogo salvo na nuvem!', 'success');
            setNewGame({ name: '', provider: '', imageUrl: '' });
            setShowModal(false);
            fetchCustomSlots(); // Atualiza lista
        } catch (err: any) {
             notify(`Erro ao salvar: ${err.message}`, 'error');
        }
    };

    const handleDeleteGame = async (id: number) => {
        if(confirm('Tem certeza que deseja excluir este jogo da nuvem?')) {
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

    const sourceGames = activeTab === 'official' ? GAMES_DB : customGames;
    
    const filteredGames = sourceGames.filter(game => {
        const matchProvider = activeTab === 'custom' || selectedProvider === 'Todos' || game.provider === selectedProvider;
        const matchSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (game.owner_name && game.owner_name.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchProvider && matchSearch;
    });

    const providers = ['Todos', 'PG', 'PP', 'WG', 'MG', 'JILI', 'JDB', 'FC', 'PESCARIA'];

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
                    
                    {/* Botão Adicionar (Só aparece na aba Custom) */}
                    {activeTab === 'custom' && !isAdmin && (
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl shadow-lg transition-all border border-emerald-500/50"
                            title="Adicionar Jogo Manualmente"
                        >
                            <Plus size={20} />
                        </button>
                    )}
                    
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
                            <Ghost size={100} />
                        </div>
                        
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-400 border border-emerald-500/20">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    Segurança e Privacidade Total
                                    <span className="bg-emerald-500/20 text-emerald-400 text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">Encrypted</span>
                                </h3>
                                <p className="text-gray-400 text-xs mt-1 max-w-xl leading-relaxed">
                                    Seus jogos são sincronizados com sua conta, mas <strong className="text-emerald-400">outros clientes NÃO PODEM ver sua lista</strong>. 
                                    Apenas você e a administração têm acesso a esses dados.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 relative z-10">
                            <HardDrive size={12} />
                            <span>Database: Private</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Provider Filter (Only for Official) */}
            {activeTab === 'official' && (
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
                
                {/* BUTTON CARD - ADICIONAR (Only in Custom Tab & Not Admin & Always Visible First) */}
                {activeTab === 'custom' && !isAdmin && (
                    <button 
                        onClick={() => setShowModal(true)}
                        className="group relative bg-emerald-900/10 rounded-2xl overflow-hidden border border-dashed border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-900/20 transition-all duration-300 flex flex-col items-center justify-center text-center p-6 min-h-[260px] cursor-pointer shadow-lg hover:shadow-emerald-900/20"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-emerald-400">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-emerald-100 font-bold text-lg mb-1">Adicionar Slot</h3>
                        <p className="text-emerald-500/60 text-xs px-2">Cadastre um jogo exclusivo para sua lista.</p>
                    </button>
                )}

                {/* GAME CARDS */}
                {isLoadingCustom ? (
                     <div className="col-span-full py-20 text-center">
                         <RefreshCw className="animate-spin text-emerald-500 mx-auto mb-4" size={32} />
                         <p className="text-gray-500">Sincronizando biblioteca...</p>
                     </div>
                ) : filteredGames.length === 0 && activeTab === 'official' ? (
                     <div className="col-span-full py-20 text-center opacity-50">
                        <Gamepad2 size={48} className="mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-500 font-bold">Nenhum jogo encontrado.</p>
                    </div>
                ) : filteredGames.length === 0 && activeTab === 'custom' ? (
                     <div className="col-span-full md:col-span-2 lg:col-span-3 py-10 flex items-center justify-center text-center opacity-70">
                        <div>
                             <p className="text-emerald-400 font-bold mb-2 flex items-center justify-center gap-2">
                                 <Sparkles size={16} /> Comece sua Coleção
                             </p>
                             <p className="text-gray-500 text-sm max-w-xs mx-auto">
                                 Sua lista está vazia. Clique no card ao lado para adicionar seu primeiro jogo.
                             </p>
                        </div>
                    </div>
                ) : (
                    filteredGames.map(game => (
                        <div key={game.id} className="group relative bg-[#0a0614] rounded-2xl overflow-hidden border border-white/5 hover:border-pink-500/50 transition-all duration-300 hover:-translate-y-1 shadow-xl">
                            
                            {/* Image Container */}
                            <div className="aspect-[3/4] relative overflow-hidden bg-gray-900">
                                <img 
                                    src={game.imageUrl} 
                                    alt={game.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 relative z-10"
                                    loading="lazy"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.parentElement?.querySelector('.fallback-layer')?.classList.remove('hidden');
                                        e.currentTarget.parentElement?.classList.add('bg-gradient-to-br', 'from-gray-800', 'to-black');
                                    }}
                                />
                                
                                {/* Fallback Layer */}
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

                                {/* Delete Button (Custom Tab - Allows owner or Admin to delete) */}
                                {activeTab === 'custom' && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                                        className="absolute top-2 right-2 z-40 bg-black/60 hover:bg-rose-600 text-white p-1.5 rounded-lg border border-white/10 transition-colors"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}

                                {/* Admin View: Show Creator Name */}
                                {isAdmin && activeTab === 'custom' && game.owner_name && (
                                    <div className="absolute bottom-2 right-2 z-30">
                                        <span className="bg-indigo-600/90 backdrop-blur-md text-white text-[9px] font-bold px-2 py-1 rounded border border-indigo-400 shadow-lg flex items-center gap-1">
                                            <User size={8} /> {game.owner_name}
                                        </span>
                                    </div>
                                )}

                                {/* Volatility Badge (Only Official Tab) */}
                                {activeTab === 'official' && (
                                    <div className="absolute top-2 right-2 z-30">
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
                    ))
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