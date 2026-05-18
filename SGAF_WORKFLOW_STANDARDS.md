# ⚙️ SGAF Workflow & Architecture Standards (Reglas de Backend y Lógica)

**ATENCIÓN IA (ANTIGRAVITY / COPILOT) Y DESARROLLADORES:**
Este documento define cómo se debe estructurar la lógica de negocio y las comunicaciones internas del sistema SGAF. **ESTÁ PROHIBIDO** inventar sistemas paralelos de correo o notificaciones.

---

## 1. Notificaciones de Campana (In-App Notifications)

Si un nuevo módulo (ej: Inventario, Contratos, etc.) requiere avisarle a un usuario sobre un cambio de estado, asignación o alerta, **DEBES** utilizar el modelo centralizado de notificaciones.

- **Ubicación del Modelo**: `backend/notificaciones/models.py` -> `class Notificacion`
- **Tipos Permitidos (`tipo`)**: `'INFO'`, `'SUCCESS'`, `'WARNING'`, `'ERROR'`, `'TICKET'`

### Ejemplo de Creación de Notificación:
```python
from notificaciones.models import Notificacion

Notificacion.objects.create(
    usuario=usuario_destino,
    titulo="Nuevo Contrato Asignado",
    mensaje="Se te ha asignado como administrador del contrato LP-2026.",
    tipo="INFO",
    link="/contracts/123?highlight=true" # IMPORTANTE: Siempre usar deep-links si aplica
)
```

**Regla de Deep-Linking**: El campo `link` es crucial. Si la notificación habla sobre una reserva o contrato específico, el enlace debe contener los parámetros de consulta (query params) para que el frontend pueda hacer scroll o resaltar el elemento al hacer clic. (Ej: `/reservas?date=2026-05-18&highlight=45`).

---

## 2. Envío de Correos Electrónicos (Emails)

**ESTRICTAMENTE PROHIBIDO** usar `send_mail` directo de `django.core.mail` en vistas o modelos. Todo correo del sistema SGAF debe pasar por el motor de plantillas dinámico.

- **Función Obligatoria**: `enviar_correo_maestro`
- **Ubicación**: `backend/comunicaciones/utils.py`

### Ejemplo de Uso:
```python
from comunicaciones.utils import enviar_correo_maestro

# El 'proposito' debe existir en la base de datos (modelo PlantillaCorreo)
exito = enviar_correo_maestro(
    proposito='NUEVO_CONTRATO_ALERTA',
    destinatarios=['admin@sgaf.cl'],
    contexto={
        'nombre': usuario.get_full_name(),
        'contrato': contrato.codigo_mercado_publico,
        'fecha': contrato.fecha_adjudicacion.strftime('%d/%m/%Y')
    }
)
```
Si el propósito no existe en la BD, la función no enviará nada y dejará un log.

---

## 3. Desacoplamiento Lógico (Django Signals)

Para mantener el código limpio (`views.py` y `serializers.py` no deben estar sobrecargados de lógica de correos):
- Toda notificación o envío de correo originado por un cambio de estado en la Base de Datos (ej: al aprobar una solicitud, al crear una reserva) debe realizarse a través de **Django Signals** (`post_save`, `pre_save`).
- **Ubicación**: Deben escribirse en un archivo `signals.py` dentro de la App correspondiente, y registrarse en el método `ready()` del `apps.py`.

### Ejemplo Arquitectónico:
```python
# backend/modulo_nuevo/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import MiModeloNuevo
from notificaciones.models import Notificacion

@receiver(post_save, sender=MiModeloNuevo)
def notificar_creacion(sender, instance, created, **kwargs):
    if created:
        Notificacion.objects.create(...)
        # enviar_correo_maestro(...)
```

## 4. Borrado Lógico vs Físico (Soft Deletes)
**ESTRICTAMENTE PROHIBIDO** usar `instance.delete()` para eliminar información contable, reservas, facturas, gestiones o contratos.
- Siempre se debe priorizar el borrado lógico. Esto significa actualizar un estado (ej: `estado = 'ANULADO'` o `activo = False`).
- Esto mantiene intacta la trazabilidad y evita que las relaciones de base de datos (`ForeignKey`) se rompan en cascada.

## 5. Trazabilidad y Auditoría (Historiales)
Los módulos críticos (Contratos, Recepciones, Pagos, Gestiones) deben contar con un modelo de Historial anexo (ej: `HistorialRecepcionConforme`).
- Al realizar un cambio de estado, edición importante o creación masiva, el sistema backend debe registrar automáticamente qué pasó, cuándo pasó y el nombre del usuario que ejecutó la acción.

## 6. Manejo de Paginación y Filtros en API
- Si bien la paginación por defecto protege la memoria del servidor, **NO debe entorpecer los filtros del frontend**. 
- Si el frontend necesita renderizar toda la data para filtrar localmente en una tabla o armar opciones de un `<select>`, el endpoint o el ViewSet debe estar programado para soportar un parámetro que permita omitir la paginación o devolver la data completa bajo demanda.

## 7. Cargas Masivas Seguras (Archivos Excel)
- Al procesar importaciones masivas (ej: subida de pagos o facturas), el código debe **validar el 100% de las filas ANTES** de guardar el primer registro en la Base de Datos.
- Si un archivo tiene 100 filas y la fila 99 tiene un error de tipeo, se debe rechazar el archivo completo y devolver el detalle exacto del error al frontend. Esto evita bases de datos "a medio cargar".

## 8. Seguridad y Permisos de API
- Por defecto, **todo nuevo ViewSet debe estar protegido** usando `permission_classes = [IsAuthenticated]`.
- **Excepciones estrictas (Endpoints Públicos)**: Solamente están autorizados para ser públicos (sin token) los endpoints del `Login` y todos los endpoints correspondientes al módulo de `reservas-externas`, ya que los establecimientos realizan reservas sin poseer credenciales del sistema SGAF.

## 9. Sistema de Roles y Permisos (Seguridad Granular)
**REGLA CRÍTICA PARA NUEVAS FUNCIONALIDADES**: No basta con que un usuario esté logueado. Todo nuevo módulo debe integrarse estrictamente al sistema de Roles y Permisos del SGAF.

- **Frontend (Ocultamiento de Botones)**: Todo botón o enlace que ejecute una acción de CRUD (Crear, Editar, Eliminar, Cambiar Estado) **DEBE** estar envuelto en una validación de permisos. Si el usuario logueado no posee el permiso específico para esa acción, el botón no debe renderizarse en la interfaz.
- **Frontend (Menú Lateral / Sidebar)**: El acceso principal al nuevo módulo en el menú lateral también **DEBE estar oculto** condicionalmente. Si el usuario no tiene el permiso base para ver el módulo, el link de navegación no debe existir en su pantalla.
- **Backend (Bloqueo Real)**: Los endpoints en Django (DRF) deben validar el permiso exacto del usuario (ej: utilizando `DjangoModelPermissions` o comprobaciones manuales en las Vistas) antes de ejecutar la acción. No se debe confiar únicamente en ocultar el botón en React.
- **Gestor de Roles**: Al crear un módulo nuevo (Ej: Inventario), es obligatorio registrar los nuevos permisos en la base de datos y asegurarse de que estos nuevos permisos aparezcan en la pantalla de "Roles y Permisos" (Frontend) para que el Administrador del Sistema pueda asignarlos a los grupos de usuarios correspondientes.

## 10. Manejo Estricto de Zonas Horarias (Timezones)
El desfase horario entre el servidor y el cliente puede causar pérdida de consistencia en fechas contables o de procesos.
- **Backend (Guardado)**: Todo registro de tiempo automático debe usar `django.utils.timezone.now()` (**ESTRICTAMENTE PROHIBIDO** usar la librería `datetime.now()` estándar de Python, ya que carece de contexto de zona horaria).
- **Fechas sin Hora (DateFields)**: Si el frontend envía una fecha específica que no depende de la hora (ej: "Fecha de Adjudicación" o "Fecha de Factura"), el frontend DEBE enviarla como string en formato ISO estricto `YYYY-MM-DD`. El backend debe guardarla sin aplicar conversiones de zona, para evitar que la fecha "retroceda" al día anterior por diferencias horarias.

## 11. Generación de Archivos y Reportes PDF
**PROHIBIDO** usar librerías de conversión HTML-a-PDF (como `pdfkit` o `weasyprint`) que requieran binarios en el sistema operativo y colapsen la RAM.
- **Motor Oficial**: Toda generación de PDF en el SGAF debe hacerse mediante la librería **`ReportLab`**.
- **Arquitectura Limpia**: La lógica de dibujado del `canvas` (posicionar firmas, textos, líneas) **NUNCA DEBE** programarse dentro de un `ViewSet` en `views.py`. Debe aislarse en una función dedicada dentro de un archivo `utils.py` para mantener los controladores limpios. La Vista solo debe recibir el buffer y retornar el `FileResponse`.

---
**FIN DEL DOCUMENTO.**
