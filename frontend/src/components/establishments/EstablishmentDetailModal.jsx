import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Info, ExternalLink, Building, User, Mail, Phone, Activity, Hash } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const createMarkerIcon = (color) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);">
            <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const greenIcon = createMarkerIcon('#10b981');
const blueIcon = createMarkerIcon('#3b82f6');

const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, 16);
    }, [center, map]);
    return null;
};

const EstablishmentDetailModal = ({ isOpen, onClose, establishment, allEstablishments = [] }) => {
    if (!isOpen || !establishment) return null;

    const { nombre, direccion, latitud, longitud, director, email, tipo_nombre, logo, rbd, activo } = establishment;
    const phones = establishment.telefonos || [];
    const principalPhone = phones.find(p => p.es_principal) || phones[0];

    const hasCoordinates = latitud && longitud && !isNaN(parseFloat(latitud));
    const position = hasCoordinates ? [parseFloat(latitud), parseFloat(longitud)] : null;
    const otherMarkers = allEstablishments.filter(e => e.id !== establishment.id && e.latitud && !isNaN(parseFloat(e.latitud)));

    const googleMapsUrl = hasCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion || nombre)}`;

    const InfoBox = ({ icon: Icon, label, value, subValue, highlight = false }) => (
        <div className={`flex gap-3 p-2.5 rounded-2xl border transition-all ${highlight ? 'bg-blue-600 border-blue-700 shadow-lg shadow-blue-100 text-white' : 'bg-slate-50 border-slate-100 hover:bg-white hover:shadow-sm'}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border shadow-sm ${highlight ? 'bg-blue-500 border-blue-400 text-white' : 'bg-white border-slate-50 text-slate-400'}`}>
                <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <span className={`text-[7px] font-black uppercase tracking-widest block leading-none mb-0.5 ${highlight ? 'text-blue-100/60' : 'text-slate-400'}`}>{label}</span>
                <p className={`text-[12px] font-medium leading-tight break-words ${highlight ? 'text-white' : 'text-slate-700'}`}>{value || 'No declarado'}</p>
                {subValue && <p className={`text-[8px] mt-0.5 font-bold ${highlight ? 'text-blue-200' : 'text-slate-500'}`}>{subValue}</p>}
            </div>
        </div>
    );

    const MarkerPopup = ({ est }) => {
        const estPhones = est.telefonos || [];
        const estPrincipalP = estPhones.find(p => p.es_principal) || estPhones[0];

        return (
            <div className="p-3 min-w-[220px]">
                <div className="font-black text-slate-900 border-b border-slate-100 pb-2 mb-2 flex items-center gap-2 leading-tight">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] flex-shrink-0" />
                    {est.nombre}
                </div>
                <div className="space-y-2">
                    <div className="flex items-start gap-2 text-slate-500">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                            {est.direccion || 'Sin dirección registrada'}
                        </span>
                    </div>
                    {estPrincipalP && (
                        <div className="flex items-center gap-2 text-slate-500">
                            <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">
                                {estPrincipalP.numero}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-slate-400">
                        <Hash className="w-3 h-3 flex-shrink-0" />
                        <span className="text-[8px] font-black uppercase tracking-widest">RBD: {est.rbd}</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-6xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[650px]"
                    >
                        {/* Map Area */}
                        <div className="flex-1 relative bg-slate-100 overflow-hidden min-h-[250px] md:min-h-full">
                            {hasCoordinates ? (
                                <MapContainer center={position} zoom={16} className="w-full h-full" scrollWheelZoom={true} zoomControl={false}>
                                    <TileLayer attribution='&copy; CARTO' url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

                                    {/* Selected Marker */}
                                    <Marker position={position} icon={greenIcon}>
                                        <Popup className="premium-popup pb-2"><MarkerPopup est={establishment} /></Popup>
                                    </Marker>

                                    {/* Other Markers */}
                                    {otherMarkers.map(marker => (
                                        <Marker key={marker.id} position={[parseFloat(marker.latitud), parseFloat(marker.longitud)]} icon={blueIcon}>
                                            <Popup className="premium-popup pb-2"><MarkerPopup est={marker} /></Popup>
                                        </Marker>
                                    ))}
                                    <ChangeView center={position} />
                                </MapContainer>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center pointer-events-none">
                                    <MapPin className="w-16 h-16 text-slate-200 mb-4" />
                                    <p className="text-sm text-slate-400 font-black uppercase tracking-widest italic">Coordenadas No Registradas</p>
                                </div>
                            )}
                            <div className="absolute top-5 left-5 z-[1000] flex flex-col gap-2">
                                <div className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white shadow-lg flex items-center gap-2">
                                    <div className="bg-emerald-500 w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[8px] font-black text-slate-700 tracking-widest uppercase">Consulta Geográfica Unificada</span>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="w-full md:w-[380px] p-5 lg:p-6 flex flex-col bg-white overflow-y-auto border-l border-slate-100 custom-scrollbar">
                            <button onClick={onClose} className="self-end p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all mb-2"><X className="w-4 h-4" /></button>

                            <div className="flex-1 space-y-3.5">
                                {/* Header */}
                                <div className="flex items-center gap-3 mb-2 bg-slate-900 p-3.5 rounded-[1.5rem] shadow-lg border border-slate-800">
                                    <div className="w-11 h-11 rounded-xl bg-white p-1.5 shadow-inner flex items-center justify-center flex-shrink-0">
                                        {logo ? <img src={logo} alt={nombre} className="w-full h-full object-contain" /> : <Building className="w-6 h-6 text-slate-300" />}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex gap-1.5 mb-0.5">
                                            <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${activo ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{activo ? 'ACTIVO' : 'INACTIVO'}</span>
                                            <p className="text-[7px] text-blue-400 font-black uppercase tracking-widest truncate">{tipo_nombre}</p>
                                        </div>
                                        <h3 className="text-[15px] font-black text-white leading-tight break-words pr-2">{nombre}</h3>
                                    </div>
                                </div>

                                {/* RBD Highlighted */}
                                <InfoBox icon={Hash} label="RBD del Establecimiento" value={rbd} highlight={true} />

                                {/* Info Grid */}
                                <div className="grid grid-cols-1 gap-2">
                                    <InfoBox icon={User} label="Director / Responsable" value={director} />
                                    <InfoBox icon={Mail} label="Email Institucional" value={email} />
                                    <InfoBox icon={Navigation} label="Dirección Física" value={direccion} />
                                    <InfoBox icon={Phone} label="Teléfono Fijo" value={principalPhone?.numero} subValue={principalPhone?.etiqueta} />
                                </div>

                                {/* Other Phones */}
                                {phones.length > 1 && (
                                    <div className="pt-2 border-t border-slate-50 space-y-1.5">
                                        <h4 className="text-[7px] font-black text-slate-400 uppercase tracking-widest px-1">Anexos Directos</h4>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            {phones.filter(p => !p.es_principal).map((p, idx) => (
                                                <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50/50 border border-slate-100">
                                                    <Phone className="w-2.5 h-2.5 text-slate-300 flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-medium text-slate-700 truncate">{p.numero}</p>
                                                        <p className="text-[7px] font-black text-slate-400 uppercase leading-none truncate">{p.etiqueta}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Redirect Button Only */}
                            <div className="mt-4 pt-4 border-t border-slate-50">
                                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2.5 bg-blue-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[2px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 group">
                                    <img src="https://www.google.com/images/branding/product/ico/maps_32dp.ico" alt="Maps" className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    Google Maps
                                    <ExternalLink className="w-3.5 h-3.5 text-white/50" />
                                </a>
                                <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest text-center mt-3 italic">Consultar navegación externa</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{ __html: `.premium-popup .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; box-shadow: 0 10px 40px rgba(0,0,0,0.1); background: white; border: 1px solid rgba(0,0,0,0.05); } .premium-popup .leaflet-popup-content { margin: 0; width: auto !important; } .premium-popup .leaflet-popup-tip { display: none; } .custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }` }} />
        </AnimatePresence>
    );
};

export default EstablishmentDetailModal;
