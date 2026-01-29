import React, { useState, useEffect } from 'react';
import api from '../../api';
import { Search, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';

const LoanHistory = () => {
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Fetch all loans (no active filter)
        api.get('prestamos/')
            .then(res => setLoans(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filteredLoans = loans.filter(loan =>
        loan.llave_obj?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.solicitante_obj?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.solicitante_obj?.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        loan.llave_obj?.establecimiento_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return `${date.toLocaleDateString('es-CL')} ${date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Historial de Préstamos</h2>
                    <p className="text-slate-500">Registro completo de movimientos de llaves.</p>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por llave, solicitante..."
                        className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Llave / Establecimiento</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Solicitante</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Préstamo</th>
                            <th className="p-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha Devolución</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredLoans.map(loan => (
                            <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3">
                                    {loan.fecha_devolucion ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircle className="w-3 h-3" /> Devuelto
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            <Clock className="w-3 h-3" /> Activo
                                        </span>
                                    )}
                                </td>
                                <td className="p-5">
                                    <div className="font-semibold text-slate-900">{loan.llave_obj?.nombre}</div>
                                    <div className="text-xs text-slate-500">{loan.llave_obj?.establecimiento_nombre}</div>
                                </td>
                                <td className="p-5">
                                    <div className="text-slate-900">{loan.solicitante_obj?.nombre} {loan.solicitante_obj?.apellido}</div>
                                    <div className="text-xs text-slate-500">{loan.solicitante_obj?.rut}</div>
                                </td>
                                <td className="p-5 text-sm text-slate-600">
                                    {formatDate(loan.fecha_prestamo)}
                                </td>
                                <td className="p-5 text-sm text-slate-600">
                                    {formatDate(loan.fecha_devolucion)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredLoans.length === 0 && !loading && (
                    <div className="p-12 text-center text-slate-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No se encontraron registros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoanHistory;
