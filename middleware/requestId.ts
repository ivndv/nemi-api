import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
import { ejecutarConContexto } from "../services/contexto.js";

// Asigna un identificador único a cada petición y lo propaga por contexto
export function requestId(req: Request, res: Response, next: NextFunction) {
	const entrante = req.header("x-request-id");
	const id = entrante?.slice(0, 64) || crypto.randomUUID();

	req.id = id;
	res.setHeader("x-request-id", id);

	ejecutarConContexto(
		{
			requestId: id,
			setCacheHeader: (status) => res.setHeader("X-Cache", status),
		},
		() => next(),
	);
}
