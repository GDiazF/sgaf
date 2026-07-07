import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Portal from '../common/Portal';
import { X, MapPin, ExternalLink, Building2, User, Mail, Phone, Hash, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { statusBadgeClass } from '../../pages/funcionarios/shared/funcionariosUi';
import { BTN_BLUE_SM, BTN_MAPS, TYPE_BADGE } from '../../pages/establishments/establishmentsUi';

const createMarkerIcon = (color) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);">
            <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
});

const greenIcon = createMarkerIcon('#10b981');
const blueIcon = createMarkerIcon('#2563eb');

const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 16);
    }, [center, map]);
    return null;
};

const EstablishmentDetailModal = ({ isOpen, onClose, establishment, allEstablishments = [] }) => {
    if (!establishment) return null;

    const { nombre, direccion, latitud, longitud, director, email, url_web, tipo_nombre, logo, rbd, activo } = establishment;
    const phones = establishment.telefonos || [];
    const principalPhone = phones.find(p => p.es_principal) || phones[0];

    const hasCoordinates = latitud && longitud && !isNaN(parseFloat(latitud));
    const position = hasCoordinates ? [parseFloat(latitud), parseFloat(longitud)] : null;
    const otherMarkers = allEstablishments.filter(e => e.id !== establishment.id && e.latitud && !isNaN(parseFloat(e.latitud)));

    const googleMapsUrl = hasCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion || nombre)}`;

    const InfoBox = ({ icon: Icon, label, value, subValue, className = '' }) => (
        <div className={`flex gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50/80 ${className}`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border border-blue-100 bg-blue-50 text-blue-600">
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">{label}</span>
                <p className="text-[10px] font-medium text-slate-700 uppercase tracking-tighter leading-tight break-words mt-0.5">
                    {value || '—'}
                </p>
                {subValue && (
                    <p className="text-[8px] font-medium text-slate-400 uppercase tracking-tighter truncate">{subValue}</p>
                )}
            </div>
        </div>
    );

    const MarkerPopup = ({ est }) => {
        const estPhones = est.telefonos || [];
        const estPrincipalP = estPhones.find(p => p.es_principal) || estPhones[0];

        return (
            <div className="p-3 min-w-[200px]">
                <p className="text-[10px] font-medium text-slate-800 uppercase tracking-tighter border-b border-slate-100 pb-2 mb-2 leading-tight">
                    {est.nombre}
                </p>
                <div className="space-y-1.5 text-[9px] font-medium text-slate-500 uppercase tracking-tighter">
                    <p>{est.direccion || 'Sin dirección'}</p>
                    {estPrincipalP && <p>{estPrincipalP.numero}</p>}
                    <p>RBD {est.rbd}</p>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <Portal>
                    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={onClose}
                            aria-hidden
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative z-10 w-full max-w-lg md:max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[700px] max-h-[90vh] border border-slate-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Mapa — escritorio */}
                            <div className="hidden md:block flex-1 relative bg-slate-100 overflow-hidden min-h-0">
                                {hasCoordinates ? (
                                    <MapContainer center={position} zoom={16} className="w-full h-full" scrollWheelZoom zoomControl={false}>
                                        <TileLayer attribution="&copy; CARTO" url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                                        <Marker position={position} icon={greenIcon}>
                                            <Popup className="premium-popup"><MarkerPopup est={establishment} /></Popup>
                                        </Marker>
                                        {otherMarkers.map(marker => (
                                            <Marker
                                                key={marker.id}
                                                position={[parseFloat(marker.latitud), parseFloat(marker.longitud)]}
                                                icon={blueIcon}
                                            >
                                                <Popup className="premium-popup"><MarkerPopup est={marker} /></Popup>
                                            </Marker>
                                        ))}
                                        <ChangeView center={position} />
                                    </MapContainer>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
                                        <MapPin className="w-12 h-12 text-slate-200 mb-3" />
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sin coordenadas registradas</p>
                                    </div>
                                )}
                                <div className="absolute top-4 left-4 z-[1000]">
                                    <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">GIS SLEP Iquique</span>
                                    </div>
                                </div>
                            </div>

                            {/* Panel de información */}
                            <div className="w-full md:w-[360px] flex flex-col bg-white md:border-l border-slate-200 min-h-0">
                                <div className="shrink-0 px-3 py-2.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-2">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Detalle</p>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors shrink-0"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2.5 space-y-2 min-h-0">
                                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white">
                                        <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 p-1">
                                            {logo ? (
                                                <img src={logo} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <Building2 className="w-4 h-4 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                <span className={statusBadgeClass(activo)}>{activo ? 'Activo' : 'Inactivo'}</span>
                                                {tipo_nombre && <span className={TYPE_BADGE}>{tipo_nombre}</span>}
                                            </div>
                                            <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-tight leading-tight line-clamp-2">
                                                {nombre}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <InfoBox icon={Hash} label="RBD" value={String(rbd)} />
                                        <InfoBox icon={User} label="Director/a" value={director} />
                                        <InfoBox icon={Mail} label="Correo" value={email} />
                                        <InfoBox icon={Phone} label="Teléfono" value={principalPhone?.numero} subValue={principalPhone?.etiqueta} />
                                        <InfoBox icon={MapPin} label="Dirección" value={direccion} />
                                    </div>

                                    {phones.length > 1 && (
                                        <div className="pt-1 border-t border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Otros teléfonos</p>
                                            <div className="grid grid-cols-2 gap-1">
                                                {phones.filter(p => !p.es_principal).map((p, idx) => (
                                                    <div key={idx} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100">
                                                        <p className="text-[9px] font-medium text-slate-700 uppercase tracking-tighter truncate">{p.numero}</p>
                                                        <p className="text-[7px] font-medium text-slate-400 uppercase truncate">{p.etiqueta}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 px-3 py-2.5 border-t border-slate-100 bg-slate-50/80 flex flex-col gap-1.5">
                                    {url_web && (
                                        <a href={url_web} target="_blank" rel="noopener noreferrer" className={BTN_BLUE_SM}>
                                            <Globe className="w-3.5 h-3.5 shrink-0" />
                                            Sitio web
                                            <ExternalLink className="w-3 h-3 opacity-70" />
                                        </a>
                                    )}
                                    <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className={BTN_MAPS}>
                                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                                        Google Maps
                                        <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </Portal>
            )}
            <style dangerouslySetInnerHTML={{ __html: `.premium-popup .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; box-shadow: 0 10px 40px rgba(0,0,0,0.1); background: white; border: 1px solid #f1f5f9; } .premium-popup .leaflet-popup-content { margin: 0; width: auto !important; } .premium-popup .leaflet-popup-tip { display: none; }` }} />
        </AnimatePresence>
    );
};

export default EstablishmentDetailModal;
