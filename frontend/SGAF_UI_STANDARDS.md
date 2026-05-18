# 🛡️ SGAF UI Standards & Guidelines (Constitución de Diseño Absoluta)

**ATENCIÓN IA (ANTIGRAVITY / COPILOT) Y DESARROLLADORES:**
Este documento es la fuente ÚNICA de la verdad para el diseño de interfaces en el sistema SGAF. **ESTÁ TERMINANTEMENTE PROHIBIDO** inventar tamaños de botones, padding exagerado, colores genéricos o estilos de fuentes sueltos. Todo debe ceñirse a las clases de Tailwind detalladas a continuación.

---

## 1. Tipografías, Títulos y Textos

El sistema SGAF se caracteriza por un look de "Consola Administrativa" muy premium. Abusa de las mayúsculas (uppercase), letras pequeñas pero con mucho peso (font-black, font-bold) y tracking (espaciado de letras).

- **Títulos Principales de Página (H1)**:
  - Clases: `text-lg font-black text-slate-800 uppercase tracking-tight leading-none`
- **Subtítulos o Descripciones de Página**:
  - Clases: `text-[10px] font-bold text-slate-400 uppercase tracking-widest`
- **Títulos de Secciones / Modales (H3/H4)**:
  - Clases: `text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3`
- **Texto Normal (Descripciones en tarjetas o modales)**:
  - Clases: `text-xs font-medium text-slate-700 uppercase leading-relaxed`

---

## 2. Botones (Tamaños y Colores Estrictos)

**PROHIBIDO:** Botones grandes (`px-8`, `py-4`, `text-lg`), botones con bordes cuadrados. Todo botón es redondeado (`rounded-xl` o `rounded-lg`).

- **Botón Primario (Crear, Guardar, Acción Principal)**:
  - Estructura: Flex, Ícono a la izquierda.
  - Clases: `bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2`
- **Botón Secundario (Cancelar, Volver)**:
  - Clases: `bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all`
- **Botones de Acción en Tablas (Íconos Pequeños)**:
  - **Solo Ícono, sin texto:** `<Icon className="w-3.5 h-3.5" />`
  - Editar (Azul): `p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors`
  - Eliminar (Rojo): `p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors`
  - Descargar / Ver (Celeste): `p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors`

---

## 3. Entradas de Datos (Inputs y Selects)

### Inputs Estándar (Texto, Fecha, Número)
- **Label**: `block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1`
- **Input Field**: `w-full text-[10px] font-bold bg-white border border-slate-200 px-3 py-2 rounded-xl outline-none focus:border-indigo-500 uppercase transition-all shadow-sm placeholder:text-slate-300`

### React-Select (Selectores Avanzados)
Si usas `react-select`, DEBES aplicar este objeto `styles` obligatoriamente:
```javascript
const selectStyles = {
    control: (base, state) => ({
        ...base,
        minHeight: '42px', height: '42px',
        borderColor: state.isFocused ? '#6366f1' : '#e2e8f0', // indigo-500 o slate-200
        boxShadow: 'none', borderRadius: '0.85rem',
        backgroundColor: '#f8fafc', // slate-50
        fontSize: '13px', fontWeight: '500', textTransform: 'uppercase',
        transition: 'all 0.2s',
        '&:hover': { borderColor: '#6366f1' }
    }),
    valueContainer: (base) => ({ ...base, padding: '0 12px' }),
    input: (base) => ({ ...base, margin: '0', padding: '0', background: 'transparent !important', border: 'none !important', boxShadow: 'none !important', outline: 'none !important' }),
    placeholder: (base) => ({ ...base, color: '#94a3b8' }),
    singleValue: (base) => ({ ...base, color: '#334155' }), // slate-700
    menu: (base) => ({
        ...base, borderRadius: '1rem', overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', border: '1px solid #f1f5f9', zIndex: 50
    }),
    menuList: (base) => ({ ...base, padding: '0', maxHeight: '350px' }),
    option: (base, state) => ({
        ...base,
        fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', padding: '10px 12px',
        backgroundColor: state.isSelected ? '#6366f1' : state.isFocused ? '#f1f5f9' : 'white',
        color: state.isSelected ? 'white' : '#334155', cursor: 'pointer',
        '&:active': { backgroundColor: '#818cf8' }
    })
};
```

### Select Nativo (`<select>`)
- Clases: `text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer appearance-none bg-white text-slate-700 focus:border-indigo-500 shadow-sm`

---

## 4. Estructura de Tablas (Layout Zero-Scroll)

El viewport completo NO debe hacer scroll. Solo el cuerpo de la tabla se desplaza.

```jsx
<div className="flex flex-col w-full h-full lg:h-[calc(100vh-140px)] p-2 md:p-4 space-y-3 mx-auto overflow-hidden">
    {/* Contenedor Superior (Fijo) */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 shrink-0">
        <div className="space-y-0.5">
            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight leading-none">TÍTULO</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subtítulo descriptivo</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-100 flex items-center gap-2">
            NUEVO
        </button>
    </div>

    {/* Contenedor Principal de la Tabla */}
    <div className="bg-slate-50 rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 min-h-[500px] flex flex-col">
        {/* Envoltorio con scroll */}
        <div className="overflow-auto flex-1 bg-white custom-scrollbar">
            <table className="w-full text-left border-collapse border-spacing-0">
                <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-200">
                        <th className="px-4 py-3 border-r border-slate-100 text-center w-12">#</th>
                        <th className="px-4 py-3 border-r border-slate-100">CAMPO 1</th>
                        <th className="px-4 py-3 text-center">ACCIONES</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50/50 transition-colors group">
                        {/* Celdas Normales */}
                        <td className="px-4 py-2 border-r border-slate-50 text-[11px] font-medium text-slate-500 uppercase tracking-tighter whitespace-nowrap">
                            VALOR
                        </td>
                        {/* Celda Principal Destacada */}
                        <td className="px-4 py-2 border-r border-slate-50">
                            <span className="text-[12px] font-black text-slate-700 uppercase leading-tight line-clamp-1">TEXTO DESTACADO</span>
                        </td>
                        {/* Celda de Acciones */}
                        <td className="px-4 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                                <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Icon className="w-3.5 h-3.5" /></button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        {/* Footer / Paginación (Fijo al fondo del contenedor) */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 shrink-0">
            <Pagination />
        </div>
    </div>
</div>
```

---

## 5. Etiquetas (Badges / Tags)

Para elementos visuales pequeños (estados, categorías):
- **Base**: `text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-tighter`
- **Estado Positivo (Verde)**: `bg-emerald-50 text-emerald-600 border-emerald-100`
- **Estado Pendiente (Rojo/Naranja)**: `bg-rose-50 text-rose-600 border-rose-100`
- **Estado Neutro (Índigo)**: `bg-indigo-50 text-indigo-600 border-indigo-100`

---

## 6. Íconos y Acciones CRUD (`lucide-react`)

Para mantener consistencia semántica, **solo** se deben usar estos íconos para estas acciones específicas. Los colores de hover son estrictos para evitar arcoíris visuales.

- **Importación**: `import { Plus, Edit3, Trash2, CheckCircle2, XCircle, Eye, Download } from 'lucide-react';`
- **Crear / Nuevo**: `<Plus className="w-4 h-4" />` (Va siempre acompañado de texto dentro del botón primario Indigo).
- **Editar**: `<Edit3 className="w-3.5 h-3.5" />` 
  - Clases Botón: `p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors`
- **Eliminar**: `<Trash2 className="w-3.5 h-3.5" />` 
  - Clases Botón: `p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors`
- **Ver / Detalles**: `<Eye className="w-3.5 h-3.5" />` 
  - Clases Botón: `p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors`
- **Estado Activo / Completado**: `<CheckCircle2 className="w-4 h-4 text-emerald-500" />`
- **Estado Inactivo / Pendiente**: `<XCircle className="w-4 h-4 text-slate-300" />` (o `text-rose-400` si implica error).

---

## 7. Estándar de Modales y Overlays

Cualquier ventana emergente, modal o cajón lateral (drawer) debe sentirse premium. Se deben construir usando `framer-motion` (`AnimatePresence`) para asegurar entradas suaves.

**A. Fondo Oscuro (Backdrop) y Portals**:
- **REGLA CRÍTICA**: El backdrop JAMÁS debe quedar atrapado cortando la pantalla. Para asegurar que cubra el viewport entero, se recomienda fuertemente usar `createPortal` (React) hacia el `document.body`.
- Si no se usa Portal, el contenedor principal del modal debe renderizarse en la raíz de la vista y aplicar estas clases estrictas.
- Clases Obligatorias: `fixed top-0 left-0 w-screen h-screen bg-slate-900/60 backdrop-blur-sm z-[9999]`

**B. Modal Pop-up (Central)**:
- Contenedor Principal: `bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full mx-4`
- Cabecera del Modal (Header): `bg-slate-50 border-b border-slate-100 p-4 md:p-6 flex justify-between items-center`
- Botón Cerrar (X): Usa la X de lucide-react. Clases: `p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors`

**C. Drawer (Cajón Lateral)**:
- Ideal para formularios largos sin sacar al usuario de la vista.
- Clases Contenedor: `fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl border-l border-slate-100 z-[1000] flex flex-col`

---

## 8. Estados Vacíos (Empty States)

Cuando una tabla o contenedor no tiene registros, no debe quedar en blanco. Se debe usar un componente centralizado con un ícono suave.

```jsx
<div className="flex flex-col items-center justify-center p-12 text-center h-full flex-1">
    <FolderSearch className="w-10 h-10 text-slate-200 mb-3" />
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</span>
</div>
```

## 9. Barra de Búsqueda y Filtros (Filter Bar)

Las vistas complejas requieren múltiples filtros alineados. Deben agruparse usando Flexbox, incorporando buscadores, selectores y botones para limpiar filtros.

```jsx
<div className="flex flex-col md:flex-row items-center gap-3 w-full bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4">
    {/* Buscador de Texto */}
    <div className="relative w-full md:w-72 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input 
            type="text" 
            placeholder="BUSCAR..." 
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 uppercase focus:border-indigo-500 outline-none transition-all shadow-sm placeholder:text-slate-300"
        />
    </div>
    
    {/* Filtros Select */}
    <select className="w-full md:w-48 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 outline-none focus:border-indigo-500 shadow-sm">
        <option value="">TODOS LOS ESTADOS</option>
        <option value="activo">ACTIVOS</option>
    </select>
    
    {/* Botón Limpiar */}
    <button className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors ml-auto md:ml-0" title="Limpiar Filtros">
        <FilterX className="w-4 h-4" />
    </button>
</div>
```

## 10. Paginación (Diseño Estricto)

Si se debe construir un paginador, este es el diseño inquebrantable (generalmente situado en el footer del contenedor principal de la tabla):

```jsx
<div className="flex items-center justify-between px-2">
    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Mostrando 1 a 10 de 50</span>
    <div className="flex items-center gap-1">
        <button className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <ChevronLeft className="w-4 h-4"/>
        </button>
        {/* Página Activa */}
        <button className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-black">
            1
        </button>
        {/* Página Inactiva */}
        <button className="px-2.5 py-1 rounded-lg hover:bg-slate-50 text-slate-500 text-[10px] font-bold transition-colors">
            2
        </button>
        <button className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
            <ChevronRight className="w-4 h-4"/>
        </button>
    </div>
</div>
```

## 11. Notificaciones (Alertas / Toasts)

**PROHIBIDO ABSOLUTAMENTE** usar el `alert()` nativo de JavaScript para mostrar éxitos o errores.
- Para notificaciones emergentes, se debe usar una librería de Toast (como `react-hot-toast` o equivalente instalada en el proyecto).
- Para errores dentro de modales o formularios, usar un bloque renderizado condicionalmente:
  `bg-rose-50 text-rose-600 text-[10px] font-bold uppercase p-3 rounded-xl border border-rose-100 flex gap-2 items-center`.

## 12. Pestañas de Navegación (Tabs)

Para dividir contenido dentro de una vista o modal (Ej: Info, Documentos, Historial):

```jsx
<div className="flex items-center gap-4 border-b border-slate-200 mb-4 overflow-x-auto custom-scrollbar">
    {/* Pestaña Activa */}
    <button className="pb-3 text-[11px] font-black uppercase tracking-widest border-b-2 border-indigo-500 text-indigo-600 transition-colors whitespace-nowrap">
        INFORMACIÓN
    </button>
    {/* Pestaña Inactiva */}
    <button className="pb-3 text-[11px] font-bold uppercase tracking-widest border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap">
        DOCUMENTOS
    </button>
</div>
```

## 13. Estados de Carga (Loaders)

**PROHIBIDO** usar un texto plano diciendo "Cargando...". Se debe usar el ícono `Loader2` de lucide-react animado.

```jsx
<div className="flex flex-col items-center justify-center p-12 h-full flex-1 gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cargando Datos...</span>
</div>
```

## 14. Formato de Datos (Fechas y Moneda CLP)

**ESTRICTAMENTE PROHIBIDO** usar formatos estadounidenses para fechas o divisas.
- **Moneda (Pesos Chilenos)**: Siempre usar separadores de miles con punto y sin decimales. Ej: `$1.500.000`.
  - JS Helper: `monto.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })`
- **Fechas**: Siempre usar el formato `DD/MM/YYYY`. 
  - JS Helper: `new Date().toLocaleDateString('es-CL')`

## 15. Validaciones y Errores en Inputs

Cuando un campo de formulario falla la validación, el input debe tornarse rojizo y mostrar un mensaje pequeño en la parte inferior.

```jsx
<div>
    <input className="... border-rose-300 focus:border-rose-500 bg-rose-50/30" />
    <span className="text-[9px] text-rose-500 font-bold uppercase tracking-widest mt-1 ml-1 block">
        ESTE CAMPO ES REQUERIDO
    </span>
</div>
```

## 16. Tarjetas de Estadísticas (KPI Cards / Dashboards)

Para vistas que muestran resúmenes (Ej: Total de facturas, Presupuesto, etc.), la estructura obligatoria de las tarjetas es:

```jsx
<div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 transition-all hover:shadow-md group">
    {/* Contenedor del Ícono */}
    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <Activity className="w-5 h-5" />
    </div>
    {/* Información */}
    <div>
        <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest line-clamp-1">PRESUPUESTO EJECUTADO</h3>
        <p className="text-lg font-black text-slate-800 leading-none mt-1">$45.000.000</p>
    </div>
</div>
```

## 17. Menú Lateral (Sidebar Links)

**ESTRICTAMENTE PROHIBIDO** usar colores personalizados por módulo (ej: morado para mesa de ayuda, verde para otro) en el menú de navegación principal.
El elemento seleccionado (activo) en el Sidebar siempre debe usar el azul/índigo estándar del sistema para mantener coherencia visual.

- **Item Activo**: Fondo suave índigo/azul con texto fuerte. 
  - Ejemplo: `bg-indigo-50 text-indigo-600 font-bold` (o `bg-blue-50 text-blue-600`).
- **Item Inactivo**: Fondo transparente con texto gris.
  - Ejemplo: `text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium`.

## 18. Ordenadores de Columnas (Sortable Headers)

Cuando una tabla permite ordenar por columnas, la cabecera (`<th>`) debe indicar visualmente esta acción de forma sutil, usando los íconos de `lucide-react` en un tamaño muy reducido (`w-3 h-3`).

```jsx
<th className="px-4 py-3 border-r border-slate-100 cursor-pointer hover:bg-slate-200 transition-colors group select-none">
    <div className="flex items-center gap-1.5">
        <span>CAMPO ORDENABLE</span>
        {/* Si no está ordenado por este campo: */}
        <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-indigo-400" />
        {/* Si está ordenado (ascendente o descendente): */}
        {/* <ArrowDown className="w-3 h-3 text-indigo-600" /> */}
    </div>
</th>
```

## 19. Barras de Desplazamiento (Scrollbars)

**REGLA CRÍTICA PARA WINDOWS**: Para evitar las barras de desplazamiento grises nativas que rompen la estética, TODO contenedor que utilice `overflow-auto` o `overflow-y-auto` debe incluir la clase `custom-scrollbar` (configurada en el `index.css` global).

- Uso correcto: `<div className="overflow-auto custom-scrollbar">`

## 20. Estructura de Formularios Múltiples (Grid Layout)

Los formularios con múltiples inputs nunca deben usar anchos fijos manuales ni flexbox confusos. Deben utilizar el sistema Grid de CSS a través de Tailwind para asegurar que sean responsivos.

```jsx
{/* Contenedor de formulario de 2 columnas (1 en móviles, 2 en PC) */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <FormInput label="Nombre" />
    <FormInput label="Apellido" />
</div>

{/* Contenedor de formulario de 3 columnas */}
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* Inputs... */}
</div>
```

---
**FIN DEL DOCUMENTO.**
*Nota para IA: Analiza minuciosamente estas reglas antes de modificar componentes visuales.*
