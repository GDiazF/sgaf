import React, { useState, useEffect } from 'react';
import {
    Calendar, Users2, Map, Star, Info, Facebook, Instagram, Twitter, Linkedin, Youtube, Globe, Link2, ChevronRight
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import EstablishmentMapModal from '../../components/establishments/EstablishmentMapModal';
import InterestLinksSection from '../../components/dashboard/InterestLinksSection';
import DirectoryModal from '../../components/dashboard/DirectoryModal';
import WelfareWall from '../bienestar/WelfareWall';

// Mapeo de iconos para redes sociales
const IconMap = {
    Facebook, Instagram, Twitter, Linkedin, Youtube, Globe, Link2
};

const GlobalDashboard = () => {
    const { user } = useAuth();
    const [funcionarios, setFuncionarios] = useState([]);
    const [establishments, setEstablishments] = useState([]);
    const [socialLinks, setSocialLinks] = useState([]);
    const [showMapModal, setShowMapModal] = useState(false);
    const [showDirectoryModal, setShowDirectoryModal] = useState(false);

    useEffect(() => {
        fetchData();
        fetchSocialLinks();
    }, []);

    const fetchData = async () => {
        try {
            const [funcRes, estRes] = await Promise.all([
                api.get('funcionarios/', { params: { page_size: 1000 } }),
                api.get('establecimientos/', { params: { page_size: 1000 } })
            ]);
            setFuncionarios(funcRes.data.results || funcRes.data || []);
            const estData = estRes.data.results || estRes.data || [];
            setEstablishments(Array.isArray(estData) ? estData : []);
        } catch (e) {
            console.error("Error cargando datos del dashboard", e);
        }
    };

    const fetchSocialLinks = async () => {
        try {
            const res = await api.get('links-interes/');
            const links = res.data.results || res.data || [];
            // Filtramos solo los de tipo RED_SOCIAL
            setSocialLinks(links.filter(l => l.tipo === 'RED_SOCIAL' && l.activo));
        } catch (e) {
            console.error("Error fetching social links", e);
        }
    };

    const firstName = (user?.first_name || 'Usuario').split(' ')[0];

    return (
        <div className="w-full h-full bg-[#fcfdfe] overflow-y-auto custom-scrollbar font-sans">
            {/* 1. Header Hero */}
            <header className="px-6 md:px-8 pt-8 pb-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Panel de Control</p>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase">
                            Buen día, {firstName}
                        </h1>
                    </div>
                    
                    {/* Tarjeta de Redes Sociales (MINIMALISTA) */}
                    <div className="hidden lg:flex items-center gap-2 bg-white px-6 py-4 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 transition-all hover:shadow-2xl hover:border-indigo-100 group">
                        <div className="flex items-center gap-2">
                            {socialLinks.map(link => {

                                const Icon = IconMap[link.icono] || Globe;
                                return (
                                    <a 
                                        key={link.id} 
                                        href={link.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        title={link.titulo}
                                        className="p-2.5 bg-slate-50 text-slate-400 rounded-2xl hover:bg-indigo-600 hover:text-white hover:scale-110 hover:-translate-y-1 transition-all duration-300 shadow-sm"
                                    >
                                        <Icon className="w-4 h-4" />
                                    </a>
                                );
                            })}
                            {socialLinks.length === 0 && (
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Canales Oficiales</span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. Botones de Acción - Acceso Rápido */}
            <div className="px-6 md:px-8 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => window.location.href = '/reservas'}
                    className="h-28 bg-indigo-600 rounded-[2.5rem] text-white flex items-center justify-between px-10 shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all group overflow-hidden relative active:scale-95"
                >
                    <div className="z-10 text-left">
                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] block mb-1 opacity-70">Módulo de Sala</span>
                        <h3 className="text-xl font-black uppercase tracking-tight">Gestión Reservas</h3>
                    </div>
                    <Calendar className="w-20 h-20 absolute -right-2 opacity-10 group-hover:scale-110 transition-transform" />
                </button>

                <button
                    onClick={() => setShowMapModal(true)}
                    className="h-28 bg-white border border-slate-100 rounded-[2.5rem] text-slate-800 flex items-center justify-between px-10 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all group relative overflow-hidden active:scale-95"
                >
                    <div className="z-10 text-left">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-1">Mapa Interactivo</span>
                        <h3 className="text-xl font-black uppercase tracking-tight">Establecimientos</h3>
                    </div>
                    <Map className="w-20 h-20 absolute -right-2 text-slate-50 group-hover:scale-110 transition-transform" />
                </button>

                <button
                    onClick={() => setShowDirectoryModal(true)}
                    className="h-28 bg-white border border-slate-100 rounded-[2.5rem] text-slate-800 flex items-center justify-between px-10 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all group relative overflow-hidden active:scale-95"
                >
                    <div className="z-10 text-left">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] block mb-1">Contactos SLEP</span>
                        <h3 className="text-xl font-black uppercase tracking-tight">Directorio Interno</h3>
                    </div>
                    <Users2 className="w-20 h-20 absolute -right-2 text-slate-50 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* 3. Área Principal Dinámica */}
            <main className="px-6 md:px-8 pb-12 space-y-12">
                
                {/* Muro de Bienestar (Modo Novedades) */}
                <section className="bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl p-10 relative group">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Novedades y Convenios</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Beneficios publicados recientemente</p>
                        </div>
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
                            <Star className="w-6 h-6 text-rose-500 fill-rose-500/10" />
                        </div>
                    </div>

                    <WelfareWall limit={5} showFilters={false} sortBy="newest" />
                    
                    <div className="absolute bottom-10 right-10">
                        <button 
                            onClick={() => window.location.href = '/bienestar/muro'}
                            className="flex items-center gap-2 px-8 py-3 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-xl shadow-slate-200 active:scale-95"
                        >
                            Explorar Todo Bienestar
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </section>



                {/* Enlaces de Interés */}
                <section className="bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl overflow-hidden p-2">
                    <InterestLinksSection />
                </section>

            </main>

            {/* Modales */}
            <EstablishmentMapModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                allEstablishments={establishments}
            />
            <DirectoryModal
                isOpen={showDirectoryModal}
                onClose={() => setShowDirectoryModal(false)}
                funcionarios={funcionarios}
            />
        </div>
    );
};

export default GlobalDashboard;
