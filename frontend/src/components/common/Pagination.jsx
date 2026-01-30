import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ currentPage, totalPages, onPageChange, totalCount }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <div className="flex-1 flex justify-between sm:hidden">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Anterior
                </button>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Siguiente
                </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm text-slate-700">
                        Mostrando página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span>
                        {totalCount && (
                            <span className="ml-1">
                                (Total: <span className="font-bold">{totalCount}</span> registros)
                            </span>
                        )}
                    </p>
                </div>
                <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="sr-only">Anterior</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>

                        {/* Simple Logic: Show all pages if <= 7, else show current, first, last... (Simplified for now: prev/next only) */}
                        {/* Actually, let's just use Next/Prev buttons with page info for simplicity and robustness */}

                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-300 bg-white text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="sr-only">Siguiente</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
