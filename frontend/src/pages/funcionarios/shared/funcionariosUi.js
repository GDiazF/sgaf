/** Azul sidebar activo (bg-blue-600) — módulo Funcionarios */

export const PAGE_LAYOUT = 'flex flex-col h-[calc(100vh-170px)] gap-4 overflow-hidden';

export const BTN_PRIMARY =
    'bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20 inline-flex items-center justify-center gap-2 shrink-0 active:scale-95 leading-none box-border';

export const BTN_SECONDARY =
    'bg-slate-100 hover:bg-slate-200 text-slate-600 h-10 min-h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-flex items-center justify-center gap-2 shrink-0 leading-none box-border';

export const TITLE_ICON_BOX =
    'w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100';

export const INPUT_FILTER =
    'no-global w-full pl-9 pr-3 h-10 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 uppercase outline-none focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-300';

export const SELECT_FILTER =
    "no-global text-[10px] font-black uppercase tracking-widest pl-3 pr-9 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat";

export const TABLE_PANEL = 'bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0';

export const THEAD_TR =
    'bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 select-none shadow-sm';

export const TH = 'px-4 py-3 align-middle border-r border-slate-100 bg-slate-50';

export const TD = 'px-4 py-3 align-middle border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter';

export const TD_MAIN = 'px-4 py-3 align-middle border-r border-slate-50 text-[11px] font-medium text-slate-700 uppercase tracking-tighter';

export const BTN_ICON_EDIT = 'p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors';

export const BTN_ICON_DELETE = 'p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors';

export const statusBadgeClass = (active) =>
    `inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-lg border cursor-pointer transition-colors ${
        active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'
    }`;

export const countBadgeClass = 'inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter rounded-lg border bg-blue-50 text-blue-600 border-blue-100';

export const LOADER_SPIN = 'w-8 h-8 animate-spin text-blue-500';

export const MODAL_SHELL = 'fixed inset-0 z-[9998] flex items-center justify-center p-4 overflow-hidden';

export const MODAL_BACKDROP_LAYER = 'absolute inset-0 bg-slate-900/60 backdrop-blur-sm';

/** Compatibilidad: backdrop + contenedor centrado (p. ej. ProceduresDashboard) */
export const MODAL_BACKDROP =
    'fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';

export const MODAL_PANEL = 'relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full border border-slate-200 max-h-[90vh] flex flex-col';

export const MODAL_PANEL_LG = 'relative z-10 bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full border border-slate-200 max-h-[90vh] flex flex-col';

export const MODAL_HEADER = 'bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center shrink-0 gap-3';

export const MODAL_HEADER_ICON = 'p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shrink-0';

export const INPUT_FORM =
    'no-global w-full h-10 text-[10px] font-bold bg-white border border-slate-200 px-3 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm placeholder:text-slate-300';

export const TEXTAREA_FORM =
    'no-global w-full text-[10px] font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:border-blue-500 uppercase transition-all shadow-sm resize-none';

export const SELECT_FORM =
    "no-global w-full text-[10px] font-black uppercase tracking-widest px-3 h-10 rounded-xl border border-slate-200 bg-white text-slate-700 outline-none focus:border-blue-500 appearance-none cursor-pointer shadow-sm bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat";

export const MEMBER_ROW_SELECTED = 'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors bg-blue-50 border border-blue-100';

export const MEMBER_ROW = 'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white border border-transparent';

export const CHECKBOX_FORM = 'w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500';
