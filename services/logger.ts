import { contextoActual } from "./contexto.js";

// Niveles de log y su orden
const NIVELES = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type Nivel = keyof typeof NIVELES;

// Nivel configurado; un valor inválido cae a "info" en vez de apagar los logs
const nivelConfigurado = process.env.LOG_LEVEL as Nivel | undefined;
const nivelActual: Nivel =
	nivelConfigurado && nivelConfigurado in NIVELES ? nivelConfigurado : "info";

// En producción se emite JSON; en desarrollo, texto legible
const esProduccion = process.env.NODE_ENV === "production";

// Claves que nunca deben aparecer en un log
const CLAVES_SENSIBLES = new Set([
	"contrasena",
	"password",
	"token",
	"authorization",
	"x-api-key",
	"secret",
	"clave",
	"hash",
	"apikey",
]);

// Oculta datos sensibles en objetos y arreglos
function redactar(valor: unknown, profundidad = 0): unknown {
	if (profundidad > 4) return "[...]";
	if (Array.isArray(valor)) {
		return valor.map((item) => redactar(item, profundidad + 1));
	}
	if (valor && typeof valor === "object") {
		const salida: Record<string, unknown> = {};
		for (const [clave, contenido] of Object.entries(
			valor as Record<string, unknown>,
		)) {
			salida[clave] = CLAVES_SENSIBLES.has(clave.toLowerCase())
				? "[redactado]"
				: redactar(contenido, profundidad + 1);
		}
		return salida;
	}
	return valor;
}

// Serializa un error con su stack
function serializarError(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}
	return error;
}

// Prepara el contexto: redacta claves y expande errores
function prepararContexto(contexto?: Record<string, unknown>) {
	if (!contexto) return {};
	const salida: Record<string, unknown> = {};
	for (const [clave, valor] of Object.entries(contexto)) {
		if (CLAVES_SENSIBLES.has(clave.toLowerCase())) {
			salida[clave] = "[redactado]";
			continue;
		}
		salida[clave] =
			clave === "error" ? serializarError(valor) : redactar(valor);
	}
	return salida;
}

function escribir(
	nivel: Nivel,
	mensaje: string,
	contexto?: Record<string, unknown>,
) {
	if (NIVELES[nivel] < NIVELES[nivelActual]) return;

	const requestId = contextoActual()?.requestId;
	const datos = {
		ts: new Date().toISOString(),
		level: nivel,
		msg: mensaje,
		...(requestId ? { requestId } : {}),
		...prepararContexto(contexto),
	};

	const metodo =
		nivel === "error" ? "error" : nivel === "warn" ? "warn" : "log";

	if (esProduccion) {
		console[metodo](JSON.stringify(datos));
		return;
	}

	const etiqueta = `[${datos.ts}] [${nivel.toUpperCase()}]${
		requestId ? ` [${requestId}]` : ""
	}`;
	const extra = Object.keys(datos).length > 3 ? datos : "";
	console[metodo](etiqueta, mensaje, extra);
}

export const logger = {
	debug: (mensaje: string, contexto?: Record<string, unknown>) =>
		escribir("debug", mensaje, contexto),
	info: (mensaje: string, contexto?: Record<string, unknown>) =>
		escribir("info", mensaje, contexto),
	warn: (mensaje: string, contexto?: Record<string, unknown>) =>
		escribir("warn", mensaje, contexto),
	error: (mensaje: string, contexto?: Record<string, unknown>) =>
		escribir("error", mensaje, contexto),
};
