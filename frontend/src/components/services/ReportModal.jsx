import React, { useState } from 'react';
import BaseModal from '../common/BaseModal';
import { FileDown, Calendar, AlertCircle } from 'lucide-react';
import DateInput from '../common/DateInput';

const ReportModal = ({ isOpen, onClose, onExport, filters }) => {
    const [dateRange, setDateRange] = useState({
        inicio: '',
        fin: ''
    });

    const handleExport = () => {
        onExport(dateRange);
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={handleExport}
            title="Exportar Reporte de Pagos"
            subtitle="Genere un archivo Excel con el desglose de consumos y pagos"
            icon={FileDown}
            saveLabel="Generar Excel"
            maxWidth="max-w-md"
        >
            <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-700">
                    <Calendar className="w-5 h-5 shrink-0" />
                    <p className="text-xs leading-relaxed font-medium">
                        El reporte incluirá todos los registros que coincidan con los filtros actuales de Establecimiento y Proveedor.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Fecha de Inicio</label>
                        <DateInput
                            value={dateRange.inicio}
                            onChange={(val) => setDateRange({ ...dateRange, inicio: val })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 ml-1">Fecha de Fin</label>
                        <DateInput
                            value={dateRange.fin}
                            onChange={(val) => setDateRange({ ...dateRange, fin: val })}
                        />
                    </div>
                </div>

                {!dateRange.inicio && !dateRange.fin && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 italic text-[11px]">
                        <AlertCircle className="w-4 h-4" />
                        Si no selecciona fechas, se exportará el historial completo.
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default ReportModal;
