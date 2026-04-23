import React from 'react';
import { AlertTriangle } from 'lucide-react';

const SandboxNotice = () => {
    // Detectamos sandbox si el puerto es 8080 o si el host contiene 'sandbox'
    const isSandbox = window.location.port === '8080' || window.location.hostname.includes('sandbox');

    if (!isSandbox) return null;

    return (
        <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] py-1.5 px-4 flex items-center justify-center gap-2 sticky top-0 z-[9999] shadow-md border-b border-amber-600">
            <AlertTriangle className="w-3 h-3" />
            <span>Entorno de Pruebas (Sandbox) — Los cambios aquí no afectan a producción</span>
            <AlertTriangle className="w-3 h-3" />
        </div>
    );
};

export default SandboxNotice;
