import React from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

const SortableHeader = ({ label, sortKey, currentOrdering, onSort, className = "" }) => {
    const isSortedAsc = currentOrdering === sortKey;
    const isSortedDesc = currentOrdering === `-${sortKey}`;

    const handleSort = () => {
        if (isSortedAsc) {
            onSort(`-${sortKey}`);
        } else if (isSortedDesc) {
            onSort('');
        } else {
            onSort(sortKey);
        }
    };

    return (
        <th
            className={`px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group border-r border-slate-100 ${className}`}
            onClick={handleSort}
        >
            <div className="flex items-center gap-1">
                {label}
                <div className="text-slate-300 group-hover:text-slate-400 transition-colors">
                    {isSortedAsc ? (
                        <ChevronUp className="w-3 h-3 text-blue-600" />
                    ) : isSortedDesc ? (
                        <ChevronDown className="w-3 h-3 text-blue-600" />
                    ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                    )}
                </div>
            </div>
        </th>
    );
};

export default SortableHeader;
