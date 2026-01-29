import React from 'react';
import { Key } from 'lucide-react';

const GlobalDashboard = () => {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-[60vh]">
            <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Key className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Sistema de Gestión SLEP Iquique</h1>
            <p className="text-slate-500 max-w-lg mx-auto text-lg">
                Bienvenido al panel central. Seleccione un módulo en el menú lateral para comenzar.
            </p>
        </div>
    );
};

export default GlobalDashboard;
