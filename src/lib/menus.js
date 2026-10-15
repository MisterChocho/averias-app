// Menú de cada rol. Cada opción apunta a la(s) historia(s) de usuario que la implementan.
// Cuando programen una HU, reemplazan el contenido de su página (src/app/<rol>/<ruta>/page.js).
export const MENUS = {
  agente: [
    { href: "/agente/clientes", icono: "clientes", label: "Clientes", hu: ["HU01", "HU02"], sprint: 1,
      descripcion: "Listar y buscar clientes para iniciar la atención." },
    { href: "/agente/averias", icono: "averias", label: "Averías", hu: ["HU03", "HU04", "HU05"], sprint: 1,
      descripcion: "Registrar la avería, seguir la guía de diagnóstico y registrar la valoración." },
    { href: "/agente/ordenes", icono: "ordenes", label: "Órdenes", hu: ["HU06", "HU07", "HU08"], sprint: 1,
      descripcion: "Generar, modificar y cancelar órdenes de avería." },
  ],
  gerente: [
    { href: "/gerente/tecnicos", icono: "tecnicos", label: "Técnicos", hu: ["HU09"], sprint: 2,
      descripcion: "Dar de alta técnicos y gestionar su estado." },
    { href: "/gerente/zonas", icono: "zonas", label: "Zonas", hu: ["HU10"], sprint: 2,
      descripcion: "Asignar zonas de cobertura a cada técnico." },
    { href: "/gerente/capacidad", icono: "grafico", label: "Capacidad", hu: ["HU11"], sprint: 2,
      descripcion: "Definir el máximo de órdenes simultáneas por técnico." },
    { href: "/gerente/embudo", icono: "grafico", label: "Embudo", hu: ["HU20"], sprint: 3,
      descripcion: "Ver las órdenes en cada etapa del proceso." },
    { href: "/gerente/tiempos", icono: "reloj", label: "Tiempos", hu: ["HU21"], sprint: 3,
      descripcion: "Tiempo promedio por etapa frente a la meta del 30%." },
    { href: "/gerente/digitalizacion", icono: "rayo", label: "Digitalización", hu: ["HU22"], sprint: 3,
      descripcion: "Resueltas en primer contacto frente a enviadas a campo (meta 90%)." },
    { href: "/gerente/reportes", icono: "reporte", label: "Reportes", hu: ["HU23"], sprint: 3,
      descripcion: "Exportar el reporte de averías a Excel o CSV." },
  ],
  tecnico: [
    { href: "/tecnico/disponibles", icono: "ordenes", label: "Órdenes disponibles", hu: ["HU24"], sprint: 2,
      descripcion: "Autoasignarse órdenes pendientes de su zona." },
    { href: "/tecnico/mis-ordenes", icono: "herramienta", label: "Mis órdenes", hu: ["HU12", "HU13", "HU14"], sprint: 2,
      descripcion: "Consultar, atender y cerrar sus órdenes con evidencia." },
  ],
  cliente: [
    { href: "/cliente/autoatencion", icono: "ayuda", label: "Autoatención", hu: ["HU15"], sprint: 3,
      descripcion: "Recomendaciones para resolver problemas comunes." },
    { href: "/cliente/reportar", icono: "averias", label: "Reportar avería", hu: ["HU16"], sprint: 3,
      descripcion: "Reportar una avería en línea." },
    { href: "/cliente/mis-ordenes", icono: "ordenes", label: "Mis órdenes", hu: ["HU17", "HU18", "HU19"], sprint: 3,
      descripcion: "Ver el estado, la fecha de atención, cancelar y calificar." },
  ],
};
