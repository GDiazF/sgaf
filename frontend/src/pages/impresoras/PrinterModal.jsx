import React, { useState, useEffect } from 'react';
import { Printer as PrinterIcon } from 'lucide-react';
import BaseModal from '../../components/common/BaseModal';
import FormInput from '../../components/common/FormInput';
import FormSelect from '../../components/common/FormSelect';

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
                    <FormInput
                        label="Nombre del Dispositivo"
                        required
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Ej: Impresora Secretaría"
                    />

                    <FormInput
                        label="Dirección IP (IPv4)"
                        required
                        name="ip_address"
                        value={formData.ip_address}
                        onChange={handleChange}
                        placeholder="Ej: 192.168.1.50"
                        pattern="^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$"
                        inputClassName="font-mono"
                    />

                    <FormInput
                        label="Ubicación / Dependencia"
                        required
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        placeholder="Ej: Oficina Central"
                    />

                    <FormInput
                        label="Piso / Nivel"
                        name="floor"
                        value={formData.floor}
                        onChange={handleChange}
                        placeholder="Ej: Piso 2"
                    />

                    <FormSelect
                        label="Tipo de Impresión"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        options={[
                            { value: 'B/N', label: 'Blanco y Negro' },
                            { value: 'COLOR', label: 'Color' }
                        ]}
                        placeholder={false}
                    />

                    <FormInput
                        label="Comunidad SNMP"
                        name="community"
                        value={formData.community}
                        onChange={handleChange}
                        placeholder="Default: public"
                        inputClassName="font-mono text-sm"
                    />
                </div>

                {/* Notas / Otros */}
                <div className="form-container">
                    <label className="form-label">Notas adicionales</label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Cualquier información relevante..."
                        rows="2"
                        className="resize-none !h-auto"
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
