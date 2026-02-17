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
            <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
                type="text"
                className="form-input pl-11 pr-10 !bg-white/50 border-slate-200 focus:!bg-white"
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
