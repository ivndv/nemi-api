import { AsyncLocalStorage } from "node:async_hooks";

export type CacheStatus = "HIT" | "MISS";

// Contexto por petición disponible en cualquier capa sin pasarlo a mano
export interface ContextoPeticion {
	requestId: string;
	cache?: CacheStatus;
	setCacheHeader?: (status: CacheStatus) => void;
}

const almacen = new AsyncLocalStorage<ContextoPeticion>();

export function ejecutarConContexto<T>(
	contexto: ContextoPeticion,
	callback: () => T,
): T {
	return almacen.run(contexto, callback);
}

export function contextoActual(): ContextoPeticion | undefined {
	return almacen.getStore();
}
