// Zod

// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
import { z } from "zod";

// Responde con el detalle de los campos inválidos
function responderError(res: Response, error: z.ZodError) {
	const plano = z.flattenError(error);
	const errores: Record<string, string[]> = {};
	if (plano.fieldErrors) {
		for (const [campo, mensajes] of Object.entries(plano.fieldErrors)) {
			if (mensajes && (mensajes as string[]).length > 0) {
				errores[campo] = mensajes as string[];
			}
		}
	}
	res.status(400).json({
		error: error.issues[0].message,
		errores,
	});
}

// Middleware: valida el cuerpo de la request contra un esquema Zod
export function validar(schema: z.ZodSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			responderError(res, result.error);
			return;
		}

		(req as unknown as Record<string, unknown>).validated = result.data;
		next();
	};
}

// Middleware: valida los query params y los deja en req.validatedQuery
export function validarQuery(schema: z.ZodSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.query);

		if (!result.success) {
			responderError(res, result.error);
			return;
		}

		(req as unknown as Record<string, unknown>).validatedQuery = result.data;
		next();
	};
}

// Middleware: valida los parámetros de ruta
export function validarParams(schema: z.ZodSchema) {
	return (req: Request, res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.params);

		if (!result.success) {
			responderError(res, result.error);
			return;
		}

		(req as unknown as Record<string, unknown>).validatedParams = result.data;
		next();
	};
}

// Valida un id entero positivo en la ruta
export function validarParamId(
	req: Request,
	res: Response,
	next: NextFunction,
	valor: string,
) {
	const numero = Number(valor);

	if (!Number.isInteger(numero) || numero <= 0) {
		res.status(400).json({ error: "El id debe ser un número positivo" });
		return;
	}

	const previos = (req.validatedParams ?? {}) as Record<string, number>;
	req.validatedParams = { ...previos, id: numero };
	next();
}

// Valida un número de asiento entero positivo en la ruta
export function validarParamAsiento(
	req: Request,
	res: Response,
	next: NextFunction,
	valor: string,
) {
	const numero = Number(valor);

	if (!Number.isInteger(numero) || numero <= 0) {
		res.status(400).json({ error: "El asiento debe ser un número positivo" });
		return;
	}

	const previos = (req.validatedParams ?? {}) as Record<string, number>;
	req.validatedParams = { ...previos, asiento: numero };
	next();
}
