import React, { useState, useEffect } from 'react';
import { Printer as PrinterIcon } from 'lucide-react';
import BaseModal from '../../components/common/BaseModal';

const PrinterModal = ({ isOpen, onClose, onSave, printer = null, loading = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        floor: '',
        ip_address: '',
        type: 'B/N',
        community: 'public',
        snmp_port: 161,
        enabled: true,
        notes: ''
    });

    useEffect(() => {
        if (printer) {
            setFormData({
                name: printer.name || '',
                location: printer.location || '',
                floor: printer.floor || '',
                ip_address: printer.ip_address || '',
                type: printer.type || 'B/N',
                community: printer.community || 'public',
                snmp_port: printer.snmp_port || 161,
                enabled: printer.enabled !== undefined ? printer.enabled : true,
                notes: printer.notes || ''
            });
        } else {
            setFormData({
                name: '',
                location: '',
                floor: '',
                ip_address: '',
                type: 'B/N',
                community: 'public',
                snmp_port: 161,
                enabled: true,
                notes: ''
            });
        }
    }, [printer, isOpen]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        onSave(formData);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleSubmit}
            title={printer ? 'Editar Impresora' : 'Nueva Impresora'}
            subtitle={printer ? `Modificando: ${printer.name}` : 'Registra una nueva impresora en la red local'}
            icon={PrinterIcon}
            loading={loading}
            saveLabel={printer ? 'Actualizar' : 'Registrar'}
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Nombre */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Nombre del Dispositivo</label>
                        <input
                            required
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ej: Impresora Secretaría"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        />
                    </div>

                    {/* Dirección IP */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Dirección IP (IPv4)</label>
                        <input
                            required
                            type="text"
                            name="ip_address"
                            value={formData.ip_address}
                            onChange={handleChange}
                            placeholder="Ej: 192.168.1.50"
                            pattern="^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-mono"
                        />
                    </div>

                    {/* Ubicación */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Ubicación / Dependencia</label>
                        <input
                            required
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="Ej: Oficina Central"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        />
                    </div>

                    {/* Piso / Nivel */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Piso / Nivel</label>
                        <input
                            type="text"
                            name="floor"
                            value={formData.floor}
                            onChange={handleChange}
                            placeholder="Ej: Piso 2"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        />
                    </div>

                    {/* Tipo */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Tipo de Impresión</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
                        >
                            <option value="B/N">Blanco y Negro</option>
                            <option value="COLOR">Color</option>
                        </select>
                    </div>

                    {/* Comunidad SNMP */}
                    <div className="space-y-1">
                        <label className="text-sm font-bold text-slate-700 ml-1">Comunidad SNMP</label>
                        <input
                            type="text"
                            name="community"
                            value={formData.community}
                            onChange={handleChange}
                            placeholder="Default: public"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none font-mono text-sm"
                        />
                    </div>
                </div>

                {/* Notas / Otros */}
                <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 ml-1">Notas adicionales</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Cualquier información relevante..."
                        rows="2"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none resize-none"
                    />
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input
                        type="checkbox"
                        id="enabled"
                        name="enabled"
                        checked={formData.enabled}
                        onChange={handleChange}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 transition-all pointer-events-auto cursor-pointer"
                    />
                    <label htmlFor="enabled" className="text-sm font-bold text-slate-700 cursor-pointer">
                        Monitoreo Activo (SNMP habilitado)
                    </label>
                </div>
            </form>
        </BaseModal>
    );
};

export default PrinterModal;
