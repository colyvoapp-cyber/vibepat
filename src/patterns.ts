export interface Pattern {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  problem: string;
  solution: string;
  stack: string[];
  source: string;
}

// Curados a mano por ahora. Sin economia de creditos ni captura automatica todavia:
// el objetivo de esta primera version es validar si los desarrolladores prefieren
// consultar estos patrones antes que resolverlos desde cero con su IA.
export const patterns: Pattern[] = [
  {
    id: "realtime-chat-presence",
    title: "Chat en tiempo real con presencia",
    category: "realtime",
    keywords: [
      "chat",
      "tiempo real",
      "presencia",
      "online",
      "en linea",
      "quien esta conectado",
      "websocket",
      "mensajeria",
      "mensajes",
      "escribiendo",
      "typing",
    ],
    problem:
      "El chat en tiempo real con estado de presencia (quien esta online/escribiendo) es una de las funciones que casi nunca llega a produccion sin reescritura manual, sea cual sea la herramienta usada para prototiparlo: se suele resolver con parches fragiles en vez de una base solida desde el principio.",
    solution:
      "Usar un canal de suscripcion basado en Postgres (ej. Supabase Realtime o Postgres LISTEN/NOTIFY) para mensajes, y una tabla de presencia con heartbeat (TTL corto, ej. 10s) en vez de WebSockets propios gestionados a mano. Evita montar infraestructura de sockets custom salvo que el volumen lo justifique.",
    stack: ["Postgres", "Supabase Realtime o socket.io", "React"],
    source: "curado-manual",
  },
  {
    id: "ai-prototype-to-production-migration",
    title: "Migracion de prototipo generado con IA a codigo de produccion",
    category: "migration",
    keywords: [
      "prototipo",
      "produccion",
      "migrar",
      "migracion",
      "pasar a produccion",
      "reescribir",
      "reescritura",
      "codigo generado",
      "codigo es un desastre",
      "escalar",
      "arquitectura",
      "validado",
    ],
    problem:
      "Cualquier codigo generado rapido con ayuda de IA (en el editor o herramienta que sea) tiende a crecer sin arquitectura: archivos monoliticos, poca separacion de capas, decisiones tomadas por velocidad y no por mantenibilidad. Al escalar (mas logica de negocio, mas usuarios, integracion con sistemas propios) ese codigo se vuelve dificil de tocar. La reaccion tipica es tirarlo todo y reescribir a ciegas (perdiendo la validacion de producto ya hecha) o seguir parcheando hasta que es imposible de mantener.",
    solution:
      "No migrar el codigo, migrar el conocimiento: (1) extraer el modelo de datos y los flujos de usuario ya validados como especificacion, no como codigo; (2) reconstruir con arquitectura en capas (rutas / casos de uso / acceso a datos separados); (3) si hay datos de produccion, moverlos con un script de migracion explicito, nunca copiando tal cual una base de datos gestionada por una herramienta de terceros; (4) reimplementar feature por feature usando el prototipo como referencia funcional, no como fuente de verdad del codigo.",
    stack: ["depende del proyecto final", "punto de partida: el prototipo ya validado, venga de donde venga"],
    source: "curado-manual",
  },
  {
    id: "two-sided-marketplace",
    title: "Marketplace de dos lados (oferta y demanda)",
    category: "marketplace",
    keywords: [
      "marketplace",
      "dos lados",
      "compradores y vendedores",
      "oferta y demanda",
      "matching",
      "comision",
      "pagos entre usuarios",
      "stripe connect",
      "reservas",
      "pedidos",
      "proveedores y clientes",
      "plataforma de intermediacion",
      "dos roles",
    ],
    problem:
      "Un marketplace de dos lados (compradores/vendedores, conductores/pasajeros, proveedores/clientes) no es un CRUD simple: hace falta modelar dos roles distintos desde el inicio, un ciclo de vida de transaccion con estados (solicitado, aceptado, en curso, completado, disputado), pagos divididos con comision de plataforma, y reputacion bidireccional. Los prototipos suelen empezar con un unico modelo de 'usuario' y una tabla de pagos basica, y hay que reescribir el modelo de datos entero y la integracion de pagos cuando toca llevarlo a produccion de verdad.",
    solution:
      "Modelar los dos roles desde el dia uno (perfiles de comprador/vendedor ligados a una misma cuenta, no un booleano en la tabla de usuarios). Usar una maquina de estados explicita para cada transaccion (no solo booleanos), con historial y timestamps para poder auditar disputas. Para pagos, usar un procesador con soporte nativo de marketplace (ej. Stripe Connect) que gestione comision y reparto entre las partes en vez de montarlo a mano sobre un Stripe basico. Las valoraciones deben ser bidireccionales y solo permitidas sobre transacciones ya completadas, para evitar reviews falsas.",
    stack: ["Postgres", "Stripe Connect", "busqueda/filtrado (Postgres full-text o Algolia)"],
    source: "curado-manual",
  },
];
