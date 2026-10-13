# Estructura lógica · HU06 Registrar orden y HU08 Cancelar orden

Subtareas: **JOJO-59** (HU06) y **JOJO-82** (HU08) · Responsable: Sneider Araneda

## 1. Ciclo de vida de una orden

```mermaid
stateDiagram-v2
    [*] --> Pendiente: HU06 Registrar orden\n(desde avería "No resuelta")
    Pendiente --> Asignada: HU24 Autoasignar (técnico)
    Asignada --> EnAtencion: HU13 Registrar atención
    EnAtencion --> Cerrada: HU14 Cerrar orden
    Pendiente --> Cancelada: HU08 Cancelar
    Asignada --> Cancelada: HU08 Cancelar (+ aviso al técnico)
    Cerrada --> [*]
    Cancelada --> [*]
    state "En atención" as EnAtencion
```

- **HU07 (modificar)** y **HU08 (cancelar)** solo se permiten en **Pendiente** o **Asignada**.
- Una avería solo puede tener **una orden activa** (Pendiente, Asignada o En atención). Si se cancela, se puede generar otra.

## 2. Flujo HU06 · Registrar orden

```mermaid
sequenceDiagram
    actor A as Agente
    participant P as Pantalla /agente/ordenes/nueva
    participant S as Server Action registrarOrden
    participant DB as Supabase · registrar_orden()
    A->>P: Elige una avería "No resuelta"
    P->>S: obtenerDatosParaOrden(averiaId)
    S-->>P: Cliente, tipo, descripción (solo lectura)<br/>+ dirección y teléfono por defecto
    A->>P: Revisa/edita dirección, teléfono, horario
    P->>A: ¿Confirmar registro?
    A->>P: Confirma
    P->>S: registrarOrden({...})
    S->>DB: rpc registrar_orden
    DB-->>S: Código OR-000123 (estado Pendiente)
    S-->>P: { ok, codigo }
    P-->>A: "Orden OR-000123 registrada"
```

## 3. Flujo HU08 · Cancelar orden

```mermaid
sequenceDiagram
    actor A as Agente
    participant P as Pantalla /agente/ordenes
    participant S as Server Action cancelarOrden
    participant DB as Supabase · cancelar_orden()
    A->>P: Pulsa "Cancelar" en una orden
    alt Estado En atención / Cerrada / Cancelada
        P-->>A: "Esta orden no puede cancelarse en su estado actual"
    else Pendiente / Asignada
        P->>A: Pide motivo (obligatorio) y confirmación
        A->>P: Escribe motivo y confirma
        P->>S: cancelarOrden({ ordenId, motivo })
        S->>DB: rpc cancelar_orden (una transacción)
        DB->>DB: estado = Cancelada, guarda motivo, fecha, hora y usuario
        DB->>DB: si tenía técnico → inserta notificación
        DB-->>S: Código de la orden
        S-->>P: { ok, codigo }
        P-->>A: "Orden OR-000123 cancelada"
    end
```

Si cualquier paso falla, la transacción se revierte y la orden **conserva su estado anterior** (criterio de HU08).

## 4. Datos que se usan

| Tabla | Campos que intervienen | HU |
|---|---|---|
| `averias` | `id`, `codigo`, `estado` (debe ser "No resuelta"), `descripcion`, `tipo_averia_id`, `cliente_id` | HU06 |
| `clientes` | `direccion`, `telefono` (valores por defecto), `nombre_completo`, `codigo` | HU06 |
| `ordenes` | `codigo` (auto), `averia_id`, `direccion_atencion`, `telefono_contacto`, `horario_preferido`, `estado`, `agente_id`, `fecha_registro` | HU06 |
| `ordenes` | `estado`, `motivo_cancelacion`, `cancelado_por`, `fecha_cancelacion`, `tecnico_id` | HU08 |
| `notificaciones` | `tecnico_id`, `orden_id`, `mensaje` | HU08 |
| `historial_estados` | se llena solo con cada cambio de estado (trigger) | HU06, HU08 |

## 5. Componentes del código

| Capa | Archivo | Qué hace |
|---|---|---|
| Base de datos | `supabase/04_funciones_ordenes.sql` | `registrar_orden()` y `cancelar_orden()` con todas las validaciones; permiso del técnico ajustado |
| Backend | `src/app/agente/ordenes/actions.js` | Server Actions `obtenerDatosParaOrden`, `registrarOrden`, `cancelarOrden` |
| Consultas | `src/app/agente/ordenes/datos.js` | Listas de órdenes y de averías sin orden |
| Pantallas | `src/app/agente/ordenes/page.js` | Listado de órdenes + averías pendientes de orden + cancelar |
| | `src/app/agente/ordenes/nueva/page.js` | Formulario de registro de orden (HU06) |
| | `src/app/agente/ordenes/CancelarOrden.js` | Ventana de cancelación con motivo y confirmación (HU08) |
