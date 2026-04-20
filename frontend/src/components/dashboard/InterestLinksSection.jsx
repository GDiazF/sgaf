import React, { useState, useEffect } from 'react';
import {
    ExternalLink, Plus, Edit2, Trash2, Globe, FileText,
    Video, MessageSquare, Book, Link as LinkIcon,
    MoreVertical, Save, X, Loader2, Star, Link2,
    Box, Shield, Activity, Phone, Monitor, ShoppingCart,
    Calendar, ClipboardList, Briefcase, GraduationCap, Search,
    Facebook, Instagram, Twitter, Linkedin, Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { usePermission } from '../../hooks/usePermission';

// Mapeo simple de nombres a componentes Lucide
const IconMap = {
    Globe, FileText, Video, MessageSquare, Book, LinkIcon, Star, Link2,
    Box, Shield, Activity, Phone, Monitor, ShoppingCart,
    Calendar, ClipboardList, Briefcase, GraduationCap,
    Facebook, Instagram, Twitter, Linkedin, Youtube
};

const InterestLinksSection = () => {
    const { can } = usePermission();
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLink, setEditingLink] = useState(null);
    const [activeTab, setActiveTab] = useState('LINK'); // 'LINK' o 'RED_SOCIAL'
    const [formData, setFormData] = useState({
        titulo: '',
        tipo: 'LINK',
        url: '',
        icono: 'LinkIcon',
        descripcion: '',
        orden: 0,
        activo: true
    });
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const res = await api.get('links-interes/');
            setLinks(res.data.results || res.data || []);
        } catch (e) {
            console.error("Error fetching links", e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (link = null) => {
        if (link) {
            setEditingLink(link);
            setFormData({ ...link });
        } else {
            setEditingLink(null);
            setFormData({
                titulo: '',
                tipo: activeTab,
                url: '',
                icono: activeTab === 'RED_SOCIAL' ? 'Globe' : 'LinkIcon',
                descripcion: '',
                orden: links.length,
                activo: true
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingLink) {
                await api.put(`links-interes/${editingLink.id}/`, formData);
            } else {
                await api.post('links-interes/', formData);
            }
            await fetchLinks();
            setIsModalOpen(false);
        } catch (e) {
            console.error("Error saving link", e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Desea eliminar este link?")) {
            try {
                await api.delete(`links-interes/${id}/`);
                await fetchLinks();
            } catch (e) {
                console.error("Error deleting link", e);
            }
        }
    };

    const filteredLinks = links
        .filter(link => link.tipo === activeTab)
        .filter(link =>
            link.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            link.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    const renderIcon = (iconName) => {
        const IconComp = IconMap[iconName] || LinkIcon;

        // Colores por marca o tipo
        const colors = {
            Facebook: 'text-blue-600 fill-blue-600/10',
            Twitter: 'text-sky-400 fill-sky-400/10',
            Youtube: 'text-red-600 fill-red-600/10',
            Instagram: 'text-pink-600 fill-pink-600/10',
            Linkedin: 'text-blue-700 fill-blue-700/10',
            Globe: 'text-cyan-500 fill-cyan-500/10',
            Video: 'text-violet-500 fill-violet-500/10',
            Star: 'text-amber-500 fill-amber-500/10',
            MessageSquare: 'text-indigo-500 fill-indigo-500/10',
            Book: 'text-orange-500 fill-orange-500/10',
            FileText: 'text-blue-500 fill-blue-500/10',
            Monitor: 'text-slate-600 fill-slate-600/10',
            LinkIcon: 'text-blue-600 fill-blue-600/10',
            Link2: 'text-blue-600 fill-blue-600/10',
            Activity: 'text-rose-500 fill-rose-500/10',
            Phone: 'text-green-500 fill-green-500/10',
            Shield: 'text-indigo-600 fill-indigo-600/10',
            Box: 'text-brown-500 fill-brown-500/10',
            ShoppingCart: 'text-emerald-500 fill-emerald-500/10',
            Calendar: 'text-red-400 fill-red-400/10',
            GraduationCap: 'text-blue-800 fill-blue-800/10',
            Briefcase: 'text-stone-600 fill-stone-600/10'
        };

        const colorClass = colors[iconName] || 'text-blue-500 fill-blue-500/10';

        return <IconComp className={`w-4 h-4 ${colorClass}`} />;
    };

    return (
        <div className="flex flex-col h-full bg-white border border-slate-100 rounded-[2.5rem] shadow-xl overflow-hidden">
            {/* Header de la sección con buscador y TABS */}
            <div className="p-6 border-b border-slate-50 flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                            <Star className="w-5 h-5 fill-blue-600/10" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                {activeTab === 'LINK' ? 'Links de Interés' : 'Nuestras Redes'}
                            </h2>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">
                                {activeTab === 'LINK' ? 'Herramientas y accesos frecuentes' : 'Canales de comunicación oficial'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                            <input
                                type="text"
                                placeholder={`Buscar ${activeTab === 'LINK' ? 'herramienta' : 'red social'}...`}
                                className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-700 placeholder:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all border border-transparent focus:border-blue-100"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {can('core.add_linkinteres') && (
                            <button
                                onClick={() => handleOpenModal()}
                                className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex-shrink-0"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Tab Switcher Eliminado - Redes movidas a cabecera */}
            </div>


            {/* Grid de Links Compacto */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48 opacity-20 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Cargando links...</span>
                    </div>
                ) : links.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                        <LinkIcon className="w-12 h-12 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">No hay accesos configurados</span>
                    </div>
                ) : filteredLinks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center opacity-20 py-12">
                        {searchTerm ? <Search className="w-12 h-12 mb-2" /> : <LinkIcon className="w-12 h-12 mb-2" />}
                        <span className="text-[10px] font-black uppercase tracking-widest text-center">
                            {searchTerm
                                ? `No hay resultados para "${searchTerm}"`
                                : activeTab === 'LINK' ? 'Sin links registrados' : 'Redes sociales no configuradas'}
                        </span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-2">
                        <AnimatePresence mode="popLayout">
                            {filteredLinks.map(link => (
                                <motion.a
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 p-2 hover:bg-blue-50/50 rounded-xl transition-all border border-transparent hover:border-blue-100/50 active:scale-[0.99]"
                                >
                                    {/* Link Icon Container */}
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all bg-white shadow-sm border border-slate-50 group-hover:scale-110 group-hover:shadow-md ${!link.activo && 'opacity-50 grayscale'}`}>
                                        {renderIcon(link.icono)}
                                    </div>

                                    {/* Text Content */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-tight group-hover:text-blue-700 transition-colors truncate">
                                            {link.titulo}
                                        </h4>
                                        <p className="text-[8px] font-medium text-slate-300 lowercase truncate tracking-wide">
                                            {link.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1">
                                        {(can('core.change_linkinteres') || can('core.delete_linkinteres')) && (
                                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 mr-1">
                                                {can('core.change_linkinteres') && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleOpenModal(link); }}
                                                        className="p-1 text-slate-300 hover:text-blue-500 hover:bg-white rounded-md transition-all"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                                {can('core.delete_linkinteres') && (
                                                    <button
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(link.id); }}
                                                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-white rounded-md transition-all"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-slate-200 group-hover:text-blue-400 transition-colors">
                                            <ExternalLink className="w-3 h-3" />
                                        </div>
                                    </div>

                                    {!link.activo && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" title="Inactivo" />
                                    )}
                                </motion.a>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Modal de CRUD */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200">
                            <form onSubmit={handleSave}>
                                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                                            <LinkIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{editingLink ? 'Editar Link' : 'Nuevo Link de Interés'}</h3>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Configuración de Acceso</p>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Título del Link</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.titulo}
                                            onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all uppercase"
                                            placeholder="EJ: PORTAL DE PAGOS"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">URL (Dirección Web)</label>
                                        <input
                                            type="url"
                                            required
                                            value={formData.url}
                                            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                            placeholder="https://google.cl"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Tipo</label>
                                            <select
                                                required
                                                value={formData.tipo}
                                                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                            >
                                                <option value="LINK">Link de Interés</option>
                                                <option value="RED_SOCIAL">Red Social</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Icono</label>
                                            <select
                                                value={formData.icono}
                                                onChange={(e) => setFormData({ ...formData, icono: e.target.value })}
                                                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                            >
                                                {Object.keys(IconMap).map(key => <option key={key} value={key}>{key}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Orden</label>
                                        <input
                                            type="number"
                                            value={formData.orden}
                                            onChange={(e) => setFormData({ ...formData, orden: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 ml-1">Descripción Breve</label>
                                        <textarea
                                            value={formData.descripcion || ''}
                                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold focus:bg-white focus:border-blue-500 outline-none transition-all h-20 resize-none"
                                            placeholder="Describa brevemente para qué sirve este link..."
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="activo"
                                            checked={formData.activo}
                                            onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                            className="w-4 h-4 rounded border-slate-200"
                                        />
                                        <label htmlFor="activo" className="text-xs font-bold text-slate-600">Link Activo</label>
                                    </div>
                                </div>

                                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-2.5 rounded-xl text-slate-500 font-bold hover:bg-slate-200 transition-all text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-[2] flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 active:scale-95 disabled:opacity-50"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Link
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default InterestLinksSection;
