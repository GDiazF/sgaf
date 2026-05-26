import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BTN_PRIMARY, TITLE_ICON_BOX } from './funcionariosUi';

const FuncionariosPageHeader = ({
    title,
    subtitle,
    titleIcon: TitleIcon,
    actionLabel,
    onAction,
    actionIcon: ActionIcon,
    showAction = true,
}) => (
    <div className="shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-200/60 pb-3 px-1 lg:px-0">
        <div className="flex items-start gap-3 min-w-0">
            <Link
                to="/funcionarios"
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0 h-10 w-10 flex items-center justify-center"
                title="Volver al portal"
            >
                <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2.5 min-w-0">
                {TitleIcon && (
                    <div className={TITLE_ICON_BOX}>
                        <TitleIcon className="w-4 h-4" />
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight leading-none uppercase select-none">
                        {title}
                    </h2>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-1.5">{subtitle}</p>
                </div>
            </div>
        </div>
        {showAction && onAction && (
            <button type="button" onClick={onAction} className={BTN_PRIMARY}>
                {ActionIcon && <ActionIcon className="w-4 h-4 shrink-0" />}
                {actionLabel}
            </button>
        )}
    </div>
);

export default FuncionariosPageHeader;
