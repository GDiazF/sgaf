import React, { useState, useEffect } from 'react';
import {
    Calendar, Users2, Map, Star, Heart, Info, Facebook, Instagram, Twitter, Linkedin, Youtube, Globe, Link2, ChevronRight
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
            if (Array.isArray(links)) {
                setSocialLinks(links.filter(l => l.tipo === 'RED_SOCIAL' && l.activo));
            }
        } catch (e) {
            console.error("Error fetching social links", e);
        }
    };

    const BrandColors = {
        Facebook: { color: '#1877F2', bg: 'hover:bg-[#1877F2]', shadow: 'hover:shadow-[#1877F2]/30' },
        Instagram: { color: '#E4405F', bg: 'hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7]', shadow: 'hover:shadow-[#ee2a7b]/30' },
        Twitter: { color: '#1DA1F2', bg: 'hover:bg-[#1DA1F2]', shadow: 'hover:shadow-[#1DA1F2]/30' },
        Linkedin: { color: '#0077B5', bg: 'hover:bg-[#0077B5]', shadow: 'hover:shadow-[#0077B5]/30' },
        Youtube: { color: '#FF0000', bg: 'hover:bg-[#FF0000]', shadow: 'hover:shadow-[#FF0000]/30' },
        Globe: { color: '#6366f1', bg: 'hover:bg-indigo-600', shadow: 'hover:shadow-indigo-500/30' }
    };

    const firstName = (user?.first_name || 'Usuario').split(' ')[0];

    return (
        <div className="w-full h-full bg-[#fcfdfe] flex flex-col overflow-hidden font-sans">
            {/* 1. Header Hero - Restaurado */}
            <header className="px-6 md:px-8 pt-4 pb-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-1">Panel de Control</p>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                            Buen día, {firstName}
                        </h1>
                    </div>

                    <div className="hidden lg:flex items-center gap-2">
                        {socialLinks.map(link => {
                            const Icon = IconMap[link.icono] || Globe;
                            const brand = BrandColors[link.icono] || BrandColors.Globe;
                            return (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-2.5 bg-white border border-slate-100 text-slate-400 rounded-xl transition-all shadow-sm group hover:border-transparent hover:text-white hover:scale-110 active:scale-95 ${brand.bg} ${brand.shadow} hover:shadow-lg`}
                                    title={link.nombre}
                                >
                                    <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                                </a>
                            );
                        })}
                    </div>
                </div>
            </header>

            {/* 2. Botones de Acción - RESTAURADOS A H-24 */}
            <div className="px-6 md:px-8 py-2 grid grid-cols-1 md:grid-cols-3 gap-5 shrink-0">
                <button
                    onClick={() => window.location.href = '/reservas'}
                    className="h-24 bg-indigo-600 rounded-3xl text-white flex items-center justify-between px-8 shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all group overflow-hidden relative active:scale-95"
                >
                    <div className="z-10 text-left">
                        <span className="text-[9px] font-semibold text-indigo-200 uppercase tracking-widest block mb-0.5 opacity-70">Módulo de Sala</span>
                        <h3 className="text-lg font-semibold uppercase tracking-tight">Gestión Reservas</h3>
                    </div>
                    <Calendar className="w-16 h-16 absolute -right-2 opacity-10 group-hover:scale-110 transition-transform" />
                </button>

                <button
                    onClick={() => setShowMapModal(true)}
                    className="h-24 bg-white border border-slate-100 rounded-3xl text-slate-800 flex items-center justify-between px-8 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all group relative overflow-hidden active:scale-95"
                >
                    <div className="z-10 text-left">
                        <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-widest block mb-0.5">Mapa Interactivo</span>
                        <h3 className="text-lg font-semibold uppercase tracking-tight">Establecimientos</h3>
                    </div>
                    <Map className="w-16 h-16 absolute -right-2 text-slate-50 group-hover:scale-110 transition-transform" />
                </button>

                <button
                    onClick={() => setShowDirectoryModal(true)}
                    className="h-24 bg-white border border-slate-100 rounded-3xl text-slate-800 flex items-center justify-between px-8 shadow-sm hover:border-indigo-500 hover:shadow-xl transition-all group relative overflow-hidden active:scale-95"
                >
                    <div className="z-10 text-left">
                        <span className="text-[9px] font-semibold text-indigo-600 uppercase tracking-widest block mb-0.5">Contactos SLEP</span>
                        <h3 className="text-lg font-semibold uppercase tracking-tight">Directorio Interno</h3>
                    </div>
                    <Users2 className="w-16 h-16 absolute -right-2 text-slate-50 group-hover:scale-110 transition-transform" />
                </button>
            </div>

            {/* 3. Área Principal - ESTRUCTURA VERTICAL TOTAL SIN SCROLL GLOBAL */}
            <main className="flex-1 min-h-0 px-6 md:px-8 pb-6 flex flex-col space-y-2">

                {/* NOVEDADES Y CONVENIOS (Prioridad Alta - Una sola línea) */}
                <section className="flex-[4] bg-white border border-slate-200 rounded-[2.5rem] shadow-xl flex flex-col min-h-0 overflow-hidden">
                    <div className="px-8 py-2 flex items-center justify-between shrink-0 border-b border-slate-50">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500">
                                <Star className="w-5 h-5 fill-rose-500/10" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">Novedades y Beneficios</h2>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Comunicados recientes</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.href = '/bienestar/muro'}
                            className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 transition-all shadow-md"
                        >
                            Explorar Todo
                        </button>
                    </div>

                    <div className="flex-1 p-0 overflow-hidden">
                        <WelfareWall limit={5} showFilters={false} sortBy="newest" />
                    </div>
                </section>

                {/* LINKS DE INTERÉS (ALTURA FIJA CON SCROLL INTERNO) */}
                <div className="h-[280px] shrink-0 min-h-0 overflow-hidden">
                    <InterestLinksSection isCompact={true} />
                </div>

            </main>

            {/* Modales */}
            <EstablishmentMapModal isOpen={showMapModal} onClose={() => setShowMapModal(false)} allEstablishments={establishments} />
            <DirectoryModal isOpen={showDirectoryModal} onClose={() => setShowDirectoryModal(false)} funcionarios={funcionarios} />
        </div>
    );
};

export default GlobalDashboard;
