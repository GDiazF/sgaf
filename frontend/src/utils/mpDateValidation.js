export const MP_MAX_RANGE_DAYS = 31;
export const MP_WARN_RANGE_DAYS = 15;
export const MP_MAX_YEARS_BACK = 2;

const parseLocalDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const todayIso = () => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, '0');
    const d = String(t.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

/**
 * Valida rango fecha_inicio / fecha_fin para consultas Mercado Público (día a día).
 * @returns {{ valid: boolean, error?: string, warning?: string, dayCount?: number }}
 */
export const validateMpDateRange = (fechaInicio, fechaFin) => {
    if (!fechaInicio || !fechaFin) {
        return { valid: false, error: 'Debe indicar fecha de inicio y fecha de fin.' };
    }

    const start = parseLocalDate(fechaInicio);
    const end = parseLocalDate(fechaFin);
    const today = parseLocalDate(todayIso());

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { valid: false, error: 'Las fechas ingresadas no son válidas.' };
    }

    if (end < start) {
        return { valid: false, error: 'La fecha de fin debe ser igual o posterior a la de inicio.' };
    }

    if (end > today) {
        return { valid: false, error: 'La fecha de fin no puede ser posterior a hoy.' };
    }

    const minStart = new Date(today);
    minStart.setFullYear(minStart.getFullYear() - MP_MAX_YEARS_BACK);
    if (start < minStart) {
        return { valid: false, error: `La fecha de inicio no puede ser anterior a ${MP_MAX_YEARS_BACK} años.` };
    }

    const dayCount = Math.floor((end - start) / (24 * 60 * 60 * 1000)) + 1;

    if (dayCount > MP_MAX_RANGE_DAYS) {
        return {
            valid: false,
            error: `El período máximo es ${MP_MAX_RANGE_DAYS} días (${dayCount} seleccionados). Sincronice por semanas o use búsqueda por código.`,
            dayCount,
        };
    }

    let warning;
    if (dayCount >= MP_WARN_RANGE_DAYS) {
        warning = `Consultará ${dayCount} días (Mercado Público responde día a día). Puede tardar varios minutos.`;
    }

    return { valid: true, warning, dayCount };
};

export const validateMpCodeSearch = (code) => {
    const trimmed = (code || '').trim();
    if (!trimmed) {
        return { valid: false, error: 'Ingrese un código de documento válido.' };
    }
    return { valid: true, code: trimmed };
};
