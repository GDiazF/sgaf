import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

const FilterBar = ({ onSearch, placeholder = "Buscar...", initialValue = "" }) => {
    const [searchTerm, setSearchTerm] = useState(initialValue);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    const handleClear = () => {
        setSearchTerm("");
        onSearch("");
    };

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center w-full md:w-96">
            <Search className="absolute left-3 w-5 h-5 text-slate-400" />
            <input
                type="text"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder={placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </form>
    );
};

export default FilterBar;
