import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ExternalLink, Building, Hash } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Custom SVG Marker Icons
const createMarkerIcon = (color) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);">
            <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%; transform: rotate(45deg);"></div>
          </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
});

const blueIcon = createMarkerIcon('#3b82f6');
const greenIcon = createMarkerIcon('#10b981');

const ChangeView = ({ center, zoom = 14 }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
};

const EstablishmentMapModal = ({ isOpen, onClose, establishment, allEstablishments = [] }) => {
    // Si no hay establecimiento seleccionado, es vista "Red Educativa" (Mapa Maestro)
    const isGlobalView = !establishment;

    // Centro inicial: Iquique
    const iquiqueCenter = [-20.2307, -70.1357];

    const activeEst = establishment;
    const position = activeEst?.latitud && activeEst?.longitud
        ? [parseFloat(activeEst.latitud), parseFloat(activeEst.longitud)]
        : iquiqueCenter;

    const markers = allEstablishments.filter(e =>
        e.latitud && e.longitud && !isNaN(parseFloat(e.latitud)) && !isNaN(parseFloat(e.longitud))
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={`relative w-full ${isGlobalView ? 'max-w-6xl' : 'max-w-5xl'} bg-white rounded-[2.5rem] shadow-2xl overflow-hidden h-[85vh] md:h-[750px] border border-white/20`}
                    >
                        {/* Botón Cerrar Universal */}
                        <button
                            onClick={onClose}
                            className="absolute top-5 right-5 z-[1100] p-3 bg-white/95 backdrop-blur-md text-slate-500 hover:text-slate-900 rounded-2xl shadow-2xl border border-white transition-all active:scale-95 hover:bg-white"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        {/* Cabecera Flotante para Vista Global */}
                        {isGlobalView && (
                            <div className="absolute top-6 left-6 right-6 z-[1000] flex justify-between items-start pointer-events-none">
                                <div className="bg-white/95 backdrop-blur-md px-6 py-4 rounded-[1.8rem] shadow-2xl border border-slate-100 flex items-center gap-4 pointer-events-auto">
                                    <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                        <Building className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 uppercase text-base leading-none mb-1.5">Red Educativa SLEP</h3>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Mapa Completo de Establecimientos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="w-full h-full relative bg-slate-100">
                            <MapContainer
                                center={position}
                                zoom={isGlobalView ? 13 : 16}
                                className="w-full h-full"
                                scrollWheelZoom={true}
                                zoomControl={false}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                />

                                {markers.map(marker => {
                                    const isSelected = activeEst?.id === marker.id;
                                    const gMapsUrl = `https://www.google.com/maps/search/?api=1&query=${marker.latitud},${marker.longitud}`;

                                    return (
                                        <Marker
                                            key={marker.id}
                                            position={[parseFloat(marker.latitud), parseFloat(marker.longitud)]}
                                            icon={isSelected ? greenIcon : blueIcon}
                                        >
                                            <Popup className="premium-popup">
                                                <div className="p-0 min-w-[300px] overflow-hidden rounded-[2rem]">
                                                    {/* Header del Globo */}
                                                    <div className="p-6 pb-2 flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-semibold tracking-wide rounded-md border border-blue-100">
                                                                    Establecimiento
                                                                </span>
                                                            </div>
                                                            <h4 className="text-[17px] font-bold text-slate-800 leading-tight">
                                                                {marker.nombre}
                                                            </h4>
                                                        </div>
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 flex flex-col items-center">
                                                                <span className="text-[7px] font-bold uppercase opacity-60 leading-none mb-1">RBD</span>
                                                                <span className="text-[11px] font-bold leading-none">{marker.rbd || '---'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Información de Ubicación */}
                                                    <div className="px-6 py-4">
                                                        <div className="flex gap-3 items-center p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                            <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 border border-slate-100 flex-shrink-0">
                                                                <MapPin className="w-4 h-4" />
                                                            </div>
                                                            <p className="text-[12px] font-medium text-slate-500 leading-snug">
                                                                {marker.direccion || 'Dirección no registrada'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Pie de Acción */}
                                                    <div className="p-6 pt-0">
                                                        <a
                                                            href={gMapsUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-full h-11 bg-blue-600 hover:bg-blue-700 !text-white rounded-2xl flex items-center justify-center gap-3 text-[11px] font-bold uppercase tracking-widest transition-all shadow-lg shadow-blue-100 active:scale-95 group whitespace-nowrap px-6"
                                                        >
                                                            <span className="!text-white">Ver en Google Maps</span>
                                                            <ExternalLink className="w-3.5 h-3.5 !text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-white" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}

                                <ChangeView center={position} zoom={isGlobalView ? 13 : 16} />
                            </MapContainer>
                        </div>

                        {/* Sidebar solo si NO es vista global */}
                        {!isGlobalView && (
                            <div className="w-full md:w-[380px] p-10 flex flex-col bg-white overflow-y-auto border-l border-slate-100 no-scrollbar">
                                <div className="space-y-8">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                            RBD: {activeEst.rbd}
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 leading-tight uppercase">{activeEst.nombre}</h3>
                                    </div>
                                    <div className="space-y-4 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                        <div className="flex gap-4">
                                            <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                            <div>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Dirección</span>
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed italic pr-2">"{activeEst.direccion || 'No registra'}"</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                .premium-popup .leaflet-popup-content-wrapper {
                    border-radius: 28px;
                    padding: 0;
                    box-shadow: 0 25px 50px rgba(15, 23, 42, 0.25);
                    border: 1px solid white;
                    background: white;
                }
                .premium-popup .leaflet-popup-content { margin: 0; width: auto !important; }
                .premium-popup .leaflet-popup-tip { background: white; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}} />
        </AnimatePresence>
    );
};

export default EstablishmentMapModal;
