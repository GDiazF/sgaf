import React from 'react';
import { List } from 'lucide-react';

const PageSizeSelector = ({ pageSize, onChange, options = [10, 25, 50, 100] }) => {
    return (
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <List className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mostrar</span>
            <select
                value={pageSize}
                onChange={(e) => onChange(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer pr-1"
            >
                {options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
};

export default PageSizeSelector;
