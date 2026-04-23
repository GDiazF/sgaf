import React, { useState } from 'react';
import { Search, Loader2, CheckCircle2, AlertCircle, Plus, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import BaseModal from '../../components/common/BaseModal';

const DiscoveryModal = ({ isOpen, onClose, onFinish }) => {
    const [startIp, setStartIp] = useState('192.168.1.1');
    const [endIp, setEndIp] = useState('192.168.1.254');
    const [scanning, setScanning] = useState(false);
    const [found, setFound] = useState([]);
    const [error, setError] = useState(null);

    const handleScan = async () => {
        setScanning(true);
        setError(null);
        setFound([]);
        try {
            const response = await api.post('printers/scan/', {
                start_ip: startIp,
                end_ip: endIp
            });
            if (response.data.success) {
                setFound(response.data.found);
            } else {
                setError(response.data.error || 'Error durante el escaneo');
            }
        } catch (err) {
            setError('Error al conectar con el servidor para escaneo');
            console.error(err);
        } finally {
            setScanning(false);
        }
    };

    const handleRegisterAll = async (devices) => {
        // Simple logic to register each one as B/N by default or try to guess.
        // For now, let's just emit them and the dashboard can handle registration or just show them.
        onFinish(devices);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Descubrimiento de Impresoras"
            subtitle="Escanea tu red local en busca de dispositivos SNMP habilitados"
            icon={Globe}
            maxWidth="max-w-3xl"
            onSave={() => handleRegisterAll(found)}
            saveLabel={found.length > 0 ? `Registrar Encontradas (${found.length})` : 'Escanear'}
            loading={scanning}
        >
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">IP Inicial</label>
                        <input
                            type="text"
                            value={startIp}
                            onChange={(e) => setStartIp(e.target.value)}
                            disabled={scanning}
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase tracking-wider">IP Final</label>
                        <input
                            type="text"
                            value={endIp}
                            onChange={(e) => setEndIp(e.target.value)}
                            disabled={scanning}
                            className="w-full px-4 py-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        />
                    </div>
                    <div className="col-span-2">
                        <button
                            onClick={handleScan}
                            disabled={scanning}
                            className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-slate-200"
                        >
                            {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            {scanning ? 'Escaneando red...' : 'Iniciar Búsqueda'}
                        </button>
                    </div>
                </div>

                {scanning && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                            <Globe className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <p className="text-slate-500 font-medium animate-pulse">Probando direcciones IP en el rango...</p>
                    </div>
                )}

                {!scanning && found.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                            <h3>Dispositivos Encontrados</h3>
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">{found.length} Dispositivos</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                            {found.map((dev, idx) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={idx}
                                    className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{dev.name}</p>
                                            <p className="text-xs text-slate-500 font-mono">{dev.ip}</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium italic group-hover:text-slate-600 transition-colors">
                                        SNMP v2c Activo
                                    </span>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {!scanning && !found.length && !error && (
                    <div className="py-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                        <Globe className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-400 text-sm">Ingresa el rango de IPs para comenzar el descubrimiento automático.</p>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
                        <AlertCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default DiscoveryModal;
