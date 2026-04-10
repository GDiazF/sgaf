/**
 * Groups Django permissions by their application label.
 */
export const groupPermissions = (permissions) => {
    const groups = {};

    permissions.forEach(perm => {
        let module = 'Otros';
        // Normalize to remove accents for easier matching
        const name = perm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const codename = (perm.codename || '').toLowerCase();

        // Módulos del Navbar (Modelo Dummy eliminado)

        // Categorización por palabras clave
        if (name.includes('llave') || name.includes('prestamo') || name.includes('solicitante') || codename.includes('llave') || codename.includes('prestamo') || codename.includes('solicitante')) module = 'Préstamo de Llaves';
        else if (name.includes('establecimiento') || codename.includes('establecimiento')) module = 'Establecimientos';
        else if (name.includes('proveedor') || codename.includes('proveedor')) module = 'Proveedores';
        else if (name.includes('contrato') || name.includes('proceso') || name.includes('licitacion') || codename.includes('contrato') || codename.includes('proceso') || codename.includes('licitacion')) module = 'Contratos y Licitaciones';
        else if (name.includes('orden de compra') || name.includes('ordencompra') || codename.includes('orden_compra') || codename.includes('ordencompra')) module = 'Órdenes de Compra';
        else if (name.includes('reserva') || name.includes('bloqueo') || name.includes('recurso') || codename.includes('reserva') || codename.includes('bloqueo') || codename.includes('recurso')) module = 'Reservas de Espacios';
        else if (name.includes('personal ti') || name.includes('personalti') || codename.includes('personalti')) module = 'Funcionarios TI';
        else if (name.includes('servicio contratado') || name.includes('tipo documento') || name.includes('cdp') || codename.includes('servicio') || codename.includes('tipodocumento') || codename.includes('cdp')) module = 'Configuración Servicios';
        else if (name.includes('registro de pago') || name.includes('pago') || codename.includes('registropago') || codename.includes('pago')) module = 'Pagos de Servicios';
        else if (name.includes('recepcion conforme') || codename.includes('recepcionconforme')) module = 'Recepciones Conformes';
        else if (name.includes('factura adquisicion') || name.includes('adquisicion') || codename.includes('facturaadquisicion') || codename.includes('adquisicion')) module = 'Adquisiciones';
        else if (name.includes('funcionario') || name.includes('personal') || name.includes('subdireccion') || name.includes('departamento') || name.includes('unidad') || codename.includes('funcionario') || codename.includes('personal') || codename.includes('subdireccion') || codename.includes('departamento') || codename.includes('unidad')) module = 'Funcionarios y Estructura';
        else if (name.includes('tesoreria') || name.includes('remuneracion') || name.includes('mapeo') || name.includes('banco') || name.includes('valevista') || name.includes('vale vista') || codename.includes('tesoreria') || codename.includes('remuneracion') || codename.includes('mapeo') || codename.includes('banco') || codename.includes('valevista')) module = 'Tesorería';
        else if (name.includes('impresora') || name.includes('printer') || codename.includes('impresora') || codename.includes('printer')) module = 'Impresoras';
        else if (name.includes('vehiculo') || name.includes('registro mensual') || codename.includes('vehiculo') || codename.includes('registromensual')) module = 'Vehículos';
        else if (name.includes('anexo') || codename.includes('anexo')) module = 'Telecomunicaciones';
        else if (name.includes('user') || name.includes('group') || name.includes('permission') || codename.includes('user') || codename.includes('group') || codename.includes('permission')) module = 'Seguridad y Usuarios';

        if (!groups[module]) groups[module] = [];
        groups[module].push(perm);
    });

    return groups;
};

/**
 * Translates technical Django permission names to business-friendly labels.
 */
export const getFriendlyPermName = (perm) => {
    const codename = perm.codename || '';
    const name = perm.name || '';

    // Si es un permiso de módulo de Navbar, retornar el nombre directo ("Ver Módulo X") (Deprecado)

    // Mapas de traducción por acción
    const translations = {
        'add_remuneracion': 'Agregar Tesorería',
        'change_remuneracion': 'Editar Tesorería',
        'delete_remuneracion': 'Eliminar Tesorería',
        'view_remuneracion': 'Ver Tesorería',

        // Generales
        'view': 'Ver / Consultar',
        'add': 'Crear / Registrar',
        'change': 'Editar / Modificar',
        'delete': 'Eliminar / Anular',

        // Reservas especiales
        'aprobar': 'Aprobar / Denegar',
        'finalizar': 'Finalizar / Completar',
        'manage': 'Administración Total',
        'marcar_historico': 'Marcar como Histórico',
        'view_solicitudreserva_logs': 'Ver Logs / Historial',
    };

    const action = codename.split('_')[0];
    const friendlyAction = translations[codename] || translations[action] || action;

    // Limpieza del nombre base (ej: "Can view registro pago" -> "Registro Pago")
    let baseName = name.replace(/^Can (view|add|change|delete) /i, '');

    // Traducciones específicas de modelos para que suenen naturales
    const modelTranslations = {
        'registropago': 'Pagos de Servicios',
        'recepcionconforme': 'Recepciones Conformes',
        'facturaadquisicion': 'Facturas de Adquisición',
        'funcionario': 'Ficha de Funcionario',
        'personal': 'Ficha de Funcionario',
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
        'anexo': 'Anexos Telefónicos',
        'solicitudreserva': 'Solicitudes de Reserva',
        'recursoreservable': 'Recursos (Salas/Vehículos)',
        'bloqueohorario': 'Bloqueos de Horario',
        'reservasetting': 'Ajustes de Reservas',
        'mapeobanco': 'Mapeo de Bancos',
        'mapeomediopago': 'Mapeo de Medios de Pago',
        'mapeobancodirecto': 'Mapeo de Banco Directo',
        'valevistaconfig': 'Configuración Vale Vista'
    };

    const modelKey = codename.split('_')[1];
    const friendlyModel = modelTranslations[modelKey] || baseName;

    return `${friendlyAction} ${friendlyModel}`;
};
