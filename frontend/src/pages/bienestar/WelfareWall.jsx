import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Heart,
    Globe,
    X,
    Download,
    Eye,
    Search,
    FolderSearch,
    Star,
    Image as ImageIcon,
    FileText,
    Loader2,
    Book,
    Coffee,
    Shield,
    Briefcase,
    GraduationCap,
    Utensils,
    Plane
} from 'lucide-react';
import api from '../../api';
import {
    TITLE_ICON_BOX, LOADER_SPIN, INPUT_FILTER,
    FILTER_CHIP_ACTIVE, FILTER_CHIP,
    DRAWER_SHELL, DRAWER_BACKDROP, DRAWER_PANEL,
} from './bienestarUi';

// --- Icon Map ---
const ICON_OPTIONS = [
    { name: 'Heart', icon: Heart },
    { name: 'Star', icon: Star },
    { name: 'Book', icon: Book },
    { name: 'Coffee', icon: Coffee },
    { name: 'Shield', icon: Shield },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'GraduationCap', icon: GraduationCap },
    { name: 'Utensils', icon: Utensils },
    { name: 'Plane', icon: Plane },
];

const LucidIcon = ({ name, ...props }) => {
    const iconObj = ICON_OPTIONS.find(i => i.name === name);
    const IconComponent = iconObj ? iconObj.icon : Heart;
    return <IconComponent {...props} />;
};

// --- Portal Component ---
const ModalPortal = ({ children }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    if (!mounted) return null;
    return createPortal(children, document.body);
};

const WelfareWall = ({ limit, showFilters = true, sortBy = 'newest', layout = 'vertical' }) => {
    const [beneficios, setBeneficios] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBenefit, setSelectedBenefit] = useState(null);
    const [activePdfPreview, setActivePdfPreview] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [resB, resC] = await Promise.all([
                api.get('bienestar/beneficios/'),
                api.get('bienestar/categorias/')
            ]);
            setBeneficios(resB.data.results || resB.data);
            setCategorias(resC.data.results || resC.data);
        } catch (e) {
            console.error("Error fetching welfare data", e);
        } finally {
            setLoading(false);
        }
    };

    const getFullUrl = (path) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        return `${api.defaults.baseURL.replace('/api', '')}${path}`;
    };

    const filteredBeneficios = [...beneficios]
        .sort((a, b) => {
            if (sortBy === 'newest') return b.id - a.id;
            return 0;
        })
        .filter(b => b.estado === 'PUBLICADO')
        .filter(b => selectedCategory === 'ALL' || b.categoria === parseInt(selectedCategory))
        .filter(b =>
            b.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .slice(0, limit || undefined);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className={LOADER_SPIN} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">Cargando Datos...</span>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col h-full overflow-hidden">
            {showFilters && (
                <div className="shrink-0 flex flex-col gap-4 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className={TITLE_ICON_BOX}>
                                <Globe className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                                    Beneficios y Convenios
                                </h2>
                                <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5 select-none">
                                    Muro de beneficios publicados
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="relative w-full md:w-72 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar beneficios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`${INPUT_FILTER} pr-4`}
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto w-full custom-scrollbar pb-0.5">
                            <button type="button" onClick={() => setSelectedCategory('ALL')} className={`px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${selectedCategory === 'ALL' ? FILTER_CHIP_ACTIVE : FILTER_CHIP}`}>Todos</button>
                            {categorias.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 h-9 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 shrink-0 ${parseInt(selectedCategory) === cat.id ? `${FILTER_CHIP_ACTIVE} border-transparent` : FILTER_CHIP}`}
                                    style={{ backgroundColor: parseInt(selectedCategory) === cat.id ? cat.color : undefined }}
                                >
                                    <LucidIcon name={cat.icono} className={`w-3 h-3 ${parseInt(selectedCategory) === cat.id ? 'text-white' : ''}`} style={parseInt(selectedCategory) !== cat.id ? { color: cat.color } : undefined} />
                                    {cat.nombre}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className={`flex-1 min-h-0 overflow-y-auto custom-scrollbar ${showFilters ? 'px-1 pt-2 pb-6' : 'px-6 md:px-8 py-2'}`}>
                {filteredBeneficios.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1 min-h-[200px]">
                        <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
                    </div>
                ) : (
                <div className={`grid gap-5 text-left ${layout === 'horizontal'
                ? 'grid-cols-1 xl:grid-cols-2'
                : limit === 5
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7'
                }`}>
                <AnimatePresence>
                    {filteredBeneficios.map((b) => {
                        const imageFile = b.archivos?.find(f => f.tipo === 'image');
                        const cat = categorias.find(c => c.id === b.categoria);
                        const catColor = b.categoria_color || cat?.color || '#2563eb';
                        const catName = cat?.nombre || 'General';

                        // 1. Diseño Estilo Banco (Texto Arriba, Imagen Abajo 60%)
                        return (
                            <motion.div
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedBenefit(b)}
                                className="bg-white rounded-[1.8rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group cursor-pointer h-[320px]"
                            >
                                {/* CONTENIDO DE TEXTO (ARRIBA - COMPACTO) */}
                                <div className="p-4 flex flex-col shrink-0">
                                    <div className="flex items-center gap-1.5 mb-2 px-2 py-0.5 bg-slate-50 rounded-lg w-fit">
                                        <LucidIcon name={cat?.icono} className="w-3 h-3" style={{ color: catColor }} />
                                        <span className="text-[7px] font-semibold text-slate-500 uppercase tracking-widest">{catName}</span>
                                    </div>
                                    <h4 className="text-[12px] font-bold text-slate-700 mb-0.5 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {b.titulo}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 font-medium line-clamp-1 truncate opacity-70">
                                        {b.descripcion}
                                    </p>
                                </div>

                                {/* IMAGEN (ABAJO - 60% DE LA TARJETA) - MÁS ESPACIO REAL */}
                                <div className="flex-1 min-h-0 relative">
                                    {imageFile ? (
                                        <div className="w-full h-full overflow-hidden border-t border-slate-50 rounded-b-[1.8rem]">
                                            <img
                                                src={getFullUrl(imageFile.archivo)}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center border-t border-slate-50 relative overflow-hidden rounded-b-[1.8rem]"
                                            style={{
                                                background: `linear-gradient(135deg, ${catColor}15 0%, ${catColor}40 100%)`
                                            }}
                                        >
                                            {/* Patrón sutil de fondo */}
                                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(${catColor} 1px, transparent 1px)`, backgroundSize: '15px 15px' }} />

                                            <div className="relative group-hover:scale-110 transition-transform duration-500">
                                                <LucidIcon name={cat?.icono} className="w-12 h-12 opacity-20" style={{ color: catColor }} />
                                            </div>

                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-20">
                                                <span className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: catColor }}>SGAF Bienestar</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all p-1.5 bg-blue-600 text-white rounded-lg shadow-xl">
                                        <Eye className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                </div>
                )}
            </div>

            {/* Drawer de detalle */}
            <ModalPortal>
                <AnimatePresence>
                    {selectedBenefit && (
                        <div className={DRAWER_SHELL}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className={DRAWER_BACKDROP} />
                            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} onClick={(e) => e.stopPropagation()} className={DRAWER_PANEL}>
                                <div className="bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={TITLE_ICON_BOX}>
                                            <Globe className="w-4 h-4" />
                                        </div>
                                        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Detalle del Beneficio</h2>
                                    </div>
                                    <button type="button" onClick={() => { setSelectedBenefit(null); setActivePdfPreview(null); }} className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"><X className="w-5 h-5" /></button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                                    <span className="px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-lg mb-6 inline-block" style={{ backgroundColor: selectedBenefit.categoria_color }}>{categorias.find(c => c.id === selectedBenefit.categoria)?.nombre}</span>
                                    <h1 className="text-2xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">{selectedBenefit.titulo}</h1>
                                    <p className="text-sm text-slate-600 leading-relaxed font-medium mb-12 border-l-2 border-slate-100 pl-8 max-w-2xl">{selectedBenefit.descripcion}</p>

                                    <div className="space-y-12">
                                        {/* Galería Visual */}
                                        {selectedBenefit.archivos?.some(f => f.tipo === 'image') && (
                                            <div className="space-y-4">
                                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                    <ImageIcon className="w-4 h-4" />
                                                    Galería de Imágenes
                                                </h4>
                                                <div className="grid grid-cols-1 gap-8">
                                                    {selectedBenefit.archivos.filter(f => f.tipo === 'image').map((f, idx) => (
                                                        <div key={idx} className="group relative rounded-[2.5rem] overflow-hidden border border-slate-50 shadow-2xl shadow-slate-200/50 transition-all cursor-zoom-in active:scale-95" onClick={() => setFullscreenImage(f.archivo)}>
                                                            <img src={getFullUrl(f.archivo)} alt="" className="w-full object-contain bg-slate-50 max-h-[650px] group-hover:scale-105 transition-transform duration-700" />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {/* Documentos */}
                                        {selectedBenefit.archivos?.some(f => f.tipo !== 'image') && (
                                            <div className="space-y-4 pb-10">
                                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                                                    <FileText className="w-4 h-4" />
                                                    Documentos del Beneficio
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {selectedBenefit.archivos.filter(f => f.tipo !== 'image').map((f, idx) => (
                                                        <a key={idx} href={getFullUrl(f.archivo)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100 group">
                                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm group-hover:scale-110 transition-transform"><FileText className="w-5 h-5" /></div>
                                                            <div className="flex-1 min-w-0"><p className="text-xs font-bold text-slate-700 truncate">{f.nombre || 'Documento'}</p><p className="text-[10px] text-slate-400 uppercase font-black">{f.tipo}</p></div>
                                                            <Download className="w-4 h-4 text-slate-300" />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </ModalPortal>

            {/* Fullscreen Image Preview */}
            <AnimatePresence>
                {fullscreenImage && (
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4" onClick={() => setFullscreenImage(null)}>
                        <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} src={getFullUrl(fullscreenImage)} className="max-w-full max-h-full rounded-2xl shadow-2xl" />
                        <button className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all"><X className="w-8 h-8" /></button>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WelfareWall;
