/**
 * Groups Django permissions by their application label.
 */
export const groupPermissions = (permissions) => {
    const groups = {};

    permissions.forEach(perm => {
        let module = 'Otros';
        const name = perm.name.toLowerCase();

        // Categorización por palabras clave en el nombre técnico de Django
        if (name.includes('llave') || name.includes('prestamo') || name.includes('solicitante')) module = 'Préstamo de Llaves';
        else if (name.includes('establecimiento')) module = 'Establecimientos';
        else if (name.includes('proveedor')) module = 'Proveedores';
        else if (name.includes('contrato') || name.includes('proceso') || name.includes('licitacion')) module = 'Contratos y Licitaciones';
        else if (name.includes('servicio contratado') || name.includes('tipo documento') || name.includes('cdp')) module = 'Configuración Servicios';
        else if (name.includes('registro de pago') || name.includes('pago')) module = 'Pagos de Servicios';
        else if (name.includes('recepcion conforme')) module = 'Recepciones Conformes';
        else if (name.includes('factura adquisicion') || name.includes('adquisicion')) module = 'Adquisiciones';
        else if (name.includes('funcionario') || name.includes('subdireccion') || name.includes('departamento') || name.includes('unidad')) module = 'Personal y Estructura';
        else if (name.includes('impresora') || name.includes('printer')) module = 'Impresoras';
        else if (name.includes('vehiculo') || name.includes('registro mensual')) module = 'Vehículos';
        else if (name.includes('anexo')) module = 'Telecomunicaciones';
        else if (name.includes('user') || name.includes('group') || name.includes('permission')) module = 'Seguridad y Usuarios';

        if (!groups[module]) groups[module] = [];
        groups[module].push(perm);
    });

    return groups;
};

/**
 * Translates technical Django permission names to business-friendly labels.
 */
export const getFriendlyPermName = (perm) => {
    const codename = perm.codename;
    const name = perm.name;

    // Mapas de traducción por acción
    const translations = {
        // Generales
        'view': 'Ver / Consultar',
        'add': 'Crear / Registrar',
        'change': 'Editar / Modificar',
        'delete': 'Eliminar / Anular',
    };

    const action = codename.split('_')[0];
    const friendlyAction = translations[action] || action;

    // Limpieza del nombre base (ej: "Can view registro pago" -> "Registro Pago")
    let baseName = name.replace(/^Can (view|add|change|delete) /i, '');

    // Traducciones específicas de modelos para que suenen naturales
    const modelTranslations = {
        'registropago': 'Pagos de Servicios',
        'recepcionconforme': 'Recepciones Conformes',
        'facturaadquisicion': 'Facturas de Adquisición',
        'funcionario': 'Ficha de Personal',
        'subdireccion': 'Subdirecciones',
        'departamento': 'Departamentos',
        'unidad': 'Unidades',
        'establecimiento': 'Establecimientos',
        'servicio': 'Servicios / Telecom',
        'proveedor': 'Proveedores',
        'tipoproveedor': 'Tipos de Proveedores',
        'tipodocumento': 'Tipos de Documentos',
        'user': 'Usuarios',
        'group': 'Roles / Grupos',
        'prestamo': 'Préstamos de Llaves',
        'llave': 'Maestro de Llaves',
        'solicitante': 'Solicitantes de Llaves',
        'impresora': 'Impresoras y Contadores',
        'printer': 'Equipos de Impresión',
        'vehiculo': 'Vehículos y Flota',
        'registromensual': 'Bitácora / Estadísticas de Vehículos',
        'contrato': 'Contratos y Licitaciones',
        'procesocompra': 'Procesos de Compra',
        'estadocontrato': 'Estados de Contrato',
        'categoriacontrato': 'Categorías de Contrato',
        'orientacionlicitacion': 'Orientación de Licitación',
        'documentocontrato': 'Documentación de Contrato',
        'historialcontrato': 'Historial de Cambios en Contratos',
        'cdp': 'CDPs de Servicios',
        'anexo': 'Anexos Telefónicos'
    };

    const modelKey = codename.split('_')[1];
    const friendlyModel = modelTranslations[modelKey] || baseName;

    return `${friendlyAction} ${friendlyModel}`;
};
