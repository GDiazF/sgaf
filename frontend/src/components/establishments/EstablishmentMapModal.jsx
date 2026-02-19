import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Navigation, Info, ExternalLink, Building } from 'lucide-react';
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

const blueIcon = createMarkerIcon('#3b82f6'); // Blue 500
const greenIcon = createMarkerIcon('#10b981'); // Emerald 500

// Helper component to update map view when establishment changes
const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, 16);
        }
    }, [center, map]);
    return null;
};

const EstablishmentMapModal = ({ isOpen, onClose, establishment, allEstablishments = [] }) => {
    if (!establishment) return null;

    const { nombre, direccion, latitud, longitud } = establishment;

    // Check if we have valid numeric coordinates
    const hasCoordinates = latitud && longitud && !isNaN(parseFloat(latitud)) && !isNaN(parseFloat(longitud));
    const position = hasCoordinates ? [parseFloat(latitud), parseFloat(longitud)] : null;

    // Filter others that have coordinates
    const otherMarkers = allEstablishments.filter(e =>
        e.id !== establishment.id &&
        e.latitud && e.longitud &&
        !isNaN(parseFloat(e.latitud)) && !isNaN(parseFloat(e.longitud))
    );

    const externalUrl = hasCoordinates
        ? `https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion || nombre)}`;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
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
                        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh] md:h-[650px] border border-white/20"
                    >
                        {/* Map Section */}
                        <div className="flex-1 relative bg-slate-100 overflow-hidden min-h-[300px] md:min-h-full">
                            {hasCoordinates ? (
                                <MapContainer
                                    center={position}
                                    zoom={16}
                                    className="w-full h-full"
                                    scrollWheelZoom={true}
                                    zoomControl={false}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                    />


                                    {/* Selected Establishment (Green) */}
                                    <Marker position={position} icon={greenIcon}>
                                        <Popup className="premium-popup">
                                            <div className="p-3 min-w-[200px] space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0 animate-bounce-subtle">
                                                        <MapPin className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest block leading-none mb-1">Consultando:</span>
                                                        <div className="font-black text-slate-900 text-[13px] leading-tight">{nombre}</div>
                                                    </div>
                                                </div>
                                                <div className="pl-10">
                                                    <div className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
                                                        "{direccion || 'Sin dirección registrada'}"
                                                    </div>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>

                                    {/* Other Establishments (Blue) */}
                                    {otherMarkers.map(marker => (
                                        <Marker
                                            key={marker.id}
                                            position={[parseFloat(marker.latitud), parseFloat(marker.longitud)]}
                                            icon={blueIcon}
                                        >
                                            <Popup className="premium-popup">
                                                <div className="p-3 min-w-[200px] space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                                                            <Building className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest block leading-none mb-1">Institución SLEP:</span>
                                                            <div className="font-black text-slate-900 text-[13px] leading-tight">{marker.nombre}</div>
                                                        </div>
                                                    </div>
                                                    <div className="pl-10">
                                                        <div className="text-[11px] font-bold text-slate-500 italic leading-relaxed">
                                                            "{marker.direccion || 'Sin dirección'}"
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                    <ChangeView center={position} />
                                </MapContainer>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-12 text-center">
                                    <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
                                        <MapPin className="w-10 h-10 text-slate-300" />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 mb-2">Sin Coordenadas Exactas</h4>
                                    <p className="text-sm text-slate-500 max-w-xs">
                                        Este establecimiento no tiene latitud y longitud registradas. Puedes ver la ubicación aproximada en Google Maps.
                                    </p>
                                </div>
                            )}

                            {/* Overlay Control */}
                            {hasCoordinates && (
                                <div className="absolute top-6 left-6 z-[1000] flex flex-col gap-2">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.3 }}
                                        className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white shadow-xl flex items-center gap-3"
                                    >
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                                        <span className="text-[10px] font-black text-slate-700 tracking-widest uppercase">Vista Premium Activa</span>
                                    </motion.div>
                                </div>
                            )}
                        </div>

                        {/* Info Section */}
                        <div className="w-full md:w-[360px] p-6 md:p-8 lg:p-10 flex flex-col bg-white overflow-y-auto border-l border-slate-100 no-scrollbar">
                            <button
                                onClick={onClose}
                                className="self-end p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all mb-6"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            <div className="flex-1 space-y-8">
                                <div className="space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-emerald-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span>Institución SLEP</span>
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight tracking-tight">{nombre}</h3>
                                </div>

                                <div className="space-y-6">
                                    <div className="p-5 bg-slate-50 rounded-[32px] border border-slate-200/60 space-y-4 shadow-inner">
                                        <div className="flex gap-4">
                                            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-100">
                                                <Navigation className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Dirección Oficial</span>
                                                <p className="text-[13px] font-bold text-slate-700 leading-relaxed italic pr-2">
                                                    "{direccion || 'Dirección no registrada'}"
                                                </p>
                                            </div>
                                        </div>

                                        {hasCoordinates && (
                                            <div className="pt-4 border-t border-slate-200/50 grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center">Latitud</span>
                                                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-100 block text-center truncate shadow-sm">{latitud}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block text-center">Longitud</span>
                                                    <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-100 block text-center truncate shadow-sm">{longitud}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 items-start p-4 bg-blue-50/50 rounded-2xl border border-blue-100/30">
                                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[11px] font-bold text-blue-700/70 leading-normal">
                                            {hasCoordinates
                                                ? 'Esta ubicación utiliza coordenadas satelitales exactas para una mayor precisión en el seguimiento.'
                                                : 'Este registro no cuenta con coordenadas. Se recomienda actualizarlas en el formulario de edición.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <a
                                    href={externalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 bg-[#0f172a] text-white py-4 rounded-[20px] font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 group"
                                >
                                    {hasCoordinates ? 'Ir con Google Maps' : 'Buscar en Google Maps'}
                                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            <style dangerouslySetInnerHTML={{
                __html: `
                .premium-popup .leaflet-popup-content-wrapper {
                    border-radius: 20px;
                    padding: 0;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    border: 1px solid rgba(255,255,255,0.2);
                    background: white;
                }
                .premium-popup .leaflet-popup-content {
                    margin: 0;
                    width: auto !important;
                }
                .premium-popup .leaflet-popup-tip {
                    background: white;
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s infinite ease-in-out;
                }
            `}} />
        </AnimatePresence>
    );
};

export default EstablishmentMapModal;
