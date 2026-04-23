import React from 'react';
import BaseModal from '../common/BaseModal';
import { CheckCircle, AlertTriangle, Calendar, Clock, User, Key } from 'lucide-react';

const ReturnLoanModal = ({
    isOpen,
    onClose,
    onConfirm,
    loanData
}) => {
    if (!loanData) return null;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return `${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            onSave={() => onConfirm(loanData.id)}
            title="Confirmar Devolución"
            subtitle="Registre la entrega física de la llave en el inventario"
            icon={CheckCircle}
            saveLabel="Confirmar Devolución"
        >
            <div className="space-y-6">
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">
                        Al confirmar, la llave volverá a figurar como <strong>Disponible</strong> para nuevos préstamos. Asegúrese de haberla recibido físicamente.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Key className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Llave en Préstamo</p>
                                <p className="text-base font-bold text-slate-800">{loanData.llave_obj?.nombre}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 font-medium ml-13 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            {loanData.llave_obj?.establecimiento_nombre}
                        </p>
                    </div>

                    <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                            <User className="w-4 h-4 text-slate-400" />
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</label>
                        </div>
                        <p className="text-sm font-bold text-slate-800 px-1">
                            {loanData.solicitante_obj?.nombre} {loanData.solicitante_obj?.apellido}
                        </p>
                    </div>

                    <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Retirada</label>
                        </div>
                        <p className="text-sm font-bold text-slate-800 px-1">
                            {formatDate(loanData.fecha_prestamo)}
                        </p>
                    </div>
                </div>

                {loanData.observacion && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Observación Original</label>
                        <p className="text-sm text-slate-600 italic">"{loanData.observacion}"</p>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default ReturnLoanModal;
