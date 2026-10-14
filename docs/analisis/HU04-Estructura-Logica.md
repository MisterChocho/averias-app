# Estructura Lógica - HU04: Consultar Guía de Diagnóstico y Solución

## 1. Descripción
Permite a los agentes de call center seguir una guía paso a paso según el tipo de avería para resolver fallas simples por teléfono, registrando tiempos, pasos completados y redirigiendo al flujo de valoración si la avería es resuelta.

---

## 2. Flujo de Estados y Reglas de Negocio

1. **Estado Inicial Requerido:**
   * La guía solo se habilita para averías en estado **`Reportada`**.

2. **Inicio del Diagnóstico:**
   * Al hacer clic en "Abrir Guía":
     * La avería pasa al estado **`En diagnóstico`**.
     * Se registra `fecha_inicio_diagnostico = NOW()`.

3. **Carga y Despliegue de Pasos:**
   * Se consulta la guía asociada a `averia.tipo_averia_id` filtrando solo las que tengan `activa = true`.
   * Los pasos se muestran numerados y en orden correlativo (`numero_paso ASC`), desplegando **un paso a la vez**.
   * **Excepción:** Si el tipo de avería no tiene guía activa, se muestra la alerta *"No hay guía disponible para este tipo de avería"* y se habilita únicamente el botón **"Derivar a técnico"**.

4. **Persistencia por Interrupción de Llamada:**
   * Si la llamada o la sesión se corta, la avería permanece en **`En diagnóstico`**.
   * Al volver a abrir la avería, la aplicación lee `ultimo_paso_completado` para reanudar directamente en el paso donde se quedó el agente.

5. **Finalización del Diagnóstico:**
   * **Resultado «Resuelta»:**
     * La avería pasa al estado **`Resuelta`**.
     * Se registra `fecha_resolucion = NOW()`.
     * Se calcula y guarda `tiempo_diagnostico_segundos`.
     * **Redirección obligatoria (Integración HU05):** Redirige inmediatamente a `/agente/averias/valoracion?averia=<id_averia>`.
   * **Resultado «No resuelta» / Derivación:**
     * No se solicita valoración.
     * La avería queda habilitada para derivarse a la creación de una orden de trabajo para técnico.

---

## 3. Modelo de Datos Involucrado

* **`averias` (Campos a utilizar / actualizar):**
  * `estado`: `'Reportada'` | `'En diagnóstico'` | `'Resuelta'` | `'No resuelta'`
  * `fecha_inicio_diagnostico`: `TIMESTAMPTZ`
  * `fecha_resolucion`: `TIMESTAMPTZ`
  * `tiempo_diagnostico_segundos`: `INTEGER`
  * `ultimo_paso_completado`: `INTEGER`
* **`guias_diagnostico`:** `id`, `tipo_averia_id`, `titulo`, `activa`
* **`pasos_guia`:** `id`, `guia_id`, `numero_paso`, `instruccion`

---

## 4. Contrato de Integración HU04 ➔ HU05
* **URL Objetivo:** `/agente/averias/valoracion?averia=<id>`
* **Garantía de no conflicto:** HU04 solo ejecuta la redirección vía `redirect()` o `router.push()`; no edita ni inserta en la tabla `valoraciones`.