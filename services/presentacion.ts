import { fechaHoyEnZona, sumarDias } from "./zonaHoraria.js";

// Traducción entre los códigos de la base y las etiquetas que consume el frontend

const ESTADOS: Record<string, string> = {
	disponible: "Disponible",
	asignado: "Asignado",
	mantenimiento: "En mantenimiento",
};

const CONDICIONES: Record<string, string> = {
	nuevo: "Nuevo",
	usado: "Usado",
	danado: "Dañado",
};

const ROLES: Record<string, string> = {
	administrador: "Administrador",
	tecnico: "Técnico",
	almacen: "Almacén",
	empleado: "Empleado",
};

// Etiqueta visible para un estado de activo
export function etiquetaEstado(codigo?: string | null): string {
	return codigo ? (ESTADOS[codigo] ?? codigo) : "";
}

// Código interno a partir de una etiqueta o código recibido
export function codigoEstado(valor?: string | null): string | undefined {
	if (!valor) return undefined;
	const normalizado = valor.trim().toLowerCase();
	const porCodigo = Object.keys(ESTADOS).find(
		(codigo) => codigo === normalizado,
	);
	if (porCodigo) return porCodigo;
	return Object.entries(ESTADOS).find(
		([, etiqueta]) => etiqueta.toLowerCase() === normalizado,
	)?.[0];
}

// Etiqueta visible para la condición física
export function etiquetaCondicion(codigo?: string | null): string {
	return codigo ? (CONDICIONES[codigo] ?? codigo) : "";
}

// Código interno a partir de una etiqueta o código de condición
export function codigoCondicion(valor?: string | null): string | undefined {
	if (!valor) return undefined;
	const normalizado = valor.trim().toLowerCase();
	const porCodigo = Object.keys(CONDICIONES).find(
		(codigo) => codigo === normalizado,
	);
	if (porCodigo) return porCodigo;
	return Object.entries(CONDICIONES).find(
		([, etiqueta]) => etiqueta.toLowerCase() === normalizado,
	)?.[0];
}

// Etiqueta visible para un rol
export function etiquetaRol(codigo?: string | null): string {
	return codigo ? (ROLES[codigo] ?? codigo) : "";
}

// Código interno a partir de una etiqueta o código de rol
export function codigoRol(valor?: string | null): string | undefined {
	if (!valor) return undefined;
	const normalizado = valor
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
	const porCodigo = Object.keys(ROLES).find((codigo) => codigo === normalizado);
	if (porCodigo) return porCodigo;
	return Object.entries(ROLES).find(
		([, etiqueta]) =>
			etiqueta
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "") === normalizado,
	)?.[0];
}

// Estado derivado de una garantía según su fecha de fin
export function estadoGarantia(fechaFin: string): string {
	if (!fechaFin) return "Vigente";

	const hoy = fechaHoyEnZona();
	if (fechaFin < hoy) return "Vencida";
	return fechaFin <= sumarDias(hoy, 30) ? "Por vencer" : "Vigente";
}

// Etiquetas de los enums de negocio
export const ETIQUETAS = {
	modalidad: { perpetua: "Perpetua", suscripcion: "Suscripción" },
	tipoUso: {
		dispositivo: "Dispositivo",
		usuario: "Usuario",
		concurrente: "Concurrente",
		volumen: "Volumen",
	},
	periodicidad: { mensual: "Mensual", anual: "Anual", unica: "Única" },
	estadoLicencia: {
		disponible: "Disponible",
		asignada: "Asignada",
		vencida: "Vencida",
	},
	responsable: { interno: "Interno", externo: "Externo" },
	tipoMantenimiento: { preventivo: "Preventivo", correctivo: "Correctivo" },
	estadoMantenimiento: { abierto: "Abierto", cerrado: "Cerrado" },
	prioridad: { baja: "Baja", media: "Media", alta: "Alta" },
	estadoIncidencia: {
		abierta: "Abierta",
		en_revision: "En revisión",
		resuelta: "Resuelta",
		cerrada: "Cerrada",
	},
	tipoSolicitud: {
		equipo: "Equipo",
		licencia: "Licencia",
		accesorio: "Accesorio",
		reemplazo: "Reemplazo",
	},
	estadoSolicitud: {
		pendiente: "Pendiente",
		aprobada: "Aprobada",
		rechazada: "Rechazada",
		entregada: "Entregada",
	},
	entidadAdjunto: {
		activo: "Activo",
		licencia: "Licencia",
		garantia: "Garantía",
		mantenimiento: "Mantenimiento",
		incidencia: "Incidencia",
		solicitud: "Solicitud",
	},
	tipoAdjunto: {
		factura: "Factura",
		poliza: "Póliza",
		acta: "Acta",
		foto: "Foto",
		otro: "Otro",
	},
	destinoTipo: { persona: "Persona", activo: "Activo" },
} as const;

// Devuelve la etiqueta de un código en un grupo de etiquetas
export function etiqueta(
	grupo: keyof typeof ETIQUETAS,
	codigo?: string | null,
): string {
	if (!codigo) return "";
	const mapa = ETIQUETAS[grupo] as Record<string, string>;
	return mapa[codigo] ?? codigo;
}

// Código de garantía a partir de su estado visible
export function codigoGarantia(estado: string): string {
	if (estado === "Vencida") return "vencida";
	if (estado === "Por vencer") return "por_vencer";
	return "vigente";
}
