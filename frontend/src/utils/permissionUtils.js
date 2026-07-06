/**
 * Groups Django permissions by their application label.
 */
export const groupPermissions = (permissions) => {
    const groups = {};

    permissions.forEach(perm => {
        let module = 'Otros';
        // Normalize to remove accents for easier matching
        const name = perm.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Módulos del Navbar (Modelo Dummy eliminado)

        const appLabel = (perm.content_type_app_label || '').toLowerCase();

        // Categorización estructurada por appLabel
        switch (appLabel) {
            case 'prestamo_llaves': module = 'Préstamo de Llaves'; break;
            case 'establecimientos': module = 'Establecimientos'; break;
            case 'contratos':
            case 'licitaciones': module = 'Contratos y Licitaciones'; break;
            case 'orden_compra': module = 'Órdenes de Compra'; break;
            case 'solicitudes_reservas': module = 'Reservas de Espacios'; break;
            case 'personal_ti': module = 'Funcionarios TI'; break;
            case 'funcionarios': module = 'Funcionarios y Estructura'; break;
            case 'remuneraciones': module = 'Tesorería'; break;
            case 'impresoras': module = 'Impresoras'; break;
            case 'vehiculos': module = 'Vehículos'; break;
            case 'procedimientos': module = 'Gestor Documental'; break;
            case 'bienestar': module = 'Bienestar y Beneficios'; break;
            case 'comunicaciones':
            case 'notificaciones': module = 'Comunicaciones y Notificaciones'; break;
            case 'auth':
            case 'otp_totp':
            case 'usuarios_google': module = 'Seguridad y Usuarios'; break;
            case 'admin': module = 'Auditoría'; break;
            case 'tickets': module = 'Mesa de Ayuda (Tickets)'; break;
            case 'biometrico': module = 'Biometría y Asistencia'; break;
            case 'conectividad': module = 'Conectividad y Redes'; break;
            case 'ejecutivos': module = 'Ejecutivos y Directivos'; break;
            case 'insights': module = 'Dashboard y Reportes'; break;
            case 'contenttypes':
            case 'sessions':
            case 'core':
            case 'personalizacion_sistema': module = 'Sistema y Configuración'; break;
            case 'servicios':
                // La app servicios tiene sub-módulos internos, los clasificamos por nombre
                if (name.includes('ruta') || name.includes('periodo de cobro') || name.includes('ausencia') || name.includes('feriado') || name.includes('servicio operativo')) module = 'Gestión de Rutas';
                else if (name.includes('registro de pago') || name.includes('pago')) module = 'Pagos de Servicios';
                else if (name.includes('recepcion conforme')) module = 'Recepciones Conformes';
                else if (name.includes('factura adquisicion') || name.includes('adquisicion')) module = 'Adquisiciones';
                else if (name.includes('proveedor')) module = 'Proveedores';
                else if (name.includes('anexo')) module = 'Telecomunicaciones';
                else module = 'Configuración Servicios';
                break;
            default:
                // Fallbacks adicionales por nombre por si hay modelos sueltos o apps genéricas
                if (name.includes('link de interes') || name.includes('linkinteres')) module = 'Dashboard, Links y Redes';
                else if (name.includes('user') || name.includes('group') || name.includes('permission')) module = 'Seguridad y Usuarios';
                else if (name.includes('log entry') || name.includes('logentry')) module = 'Auditoría';
                else module = 'Otros';
        }

        if (!groups[module]) groups[module] = [];
        groups[module].push(perm);
    });

    // Ordenar alfabéticamente los permisos dentro de cada grupo por su nombre amigable
    Object.keys(groups).forEach(module => {
        groups[module].sort((a, b) => {
            const nameA = getFriendlyPermName(a).toLowerCase();
            const nameB = getFriendlyPermName(b).toLowerCase();
            return nameA.localeCompare(nameB);
        });
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
        'can': 'Permiso:',
    };

    const action = codename.split('_')[0];
    const friendlyAction = translations[action] || action.charAt(0).toUpperCase() + action.slice(1);

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
        'procedimiento': 'Documentos / Procedimientos',
        'tipoprocedimiento': 'Categorías de Documentos',
        'beneficio': 'Muro de Bienestar / Beneficios',
        'categoriabienestar': 'Categorías de Bienestar',
        'beneficioarchivo': 'Adjuntos de Beneficios',
        'linkinteres': 'Links y Redes Sociales / Dashboard',
        'logentry': 'Logs de Auditoría',
        'emailconfiguration': 'Configuración Global de Correo',
        'plantillacorreo': 'Plantillas de Correo',
        'cuentasmtp': 'Cuentas SMTP (Servidores)',
        'destinatarioscorreooperativo': 'Destinatarios de Correos Operativos',
        'rutatransporte': 'Rutas de Transporte',
        'serviciocontrato': 'Gestión Operativa de Rutas',
        'periodocobro': 'Periodos de Cobro / Asistencia',
        'ausenciaruta': 'Registros de Asistencia',
        'feriadonacional': 'Calendario de Feriados',
        'grupopresetrutas': 'Grupos / Presets de Rutas',
        'tiposerviciooperativo': 'Categorías Operativas',
        'ticket': 'Tickets / Solicitudes',
        'tickets': 'Tickets / Solicitudes',
        'ticketcategory': 'Categorías de Tickets',
        'ticketmessage': 'Mensajes y Chat de Soporte',
        'supportagent': 'Agentes de Mesa de Ayuda',
        'ticketattachment': 'Adjuntos de Tickets'
    };

    const modelKey = codename.split('_')[1];
    const friendlyModel = modelTranslations[modelKey] || baseName;

    return `${friendlyAction} ${friendlyModel}`;
};
