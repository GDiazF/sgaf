import React from 'react';
import { Loader2, FolderSearch } from 'lucide-react';

export const TableLoading = () => (
    <div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3 min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest select-none">Cargando Datos...</span>
    </div>
);

export const TableEmpty = () => (
    <div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1 min-h-[200px]">
        <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">No se encontraron registros</span>
    </div>
);
