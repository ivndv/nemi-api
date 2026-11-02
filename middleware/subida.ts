// Multer

// Express
import type {
	NextFunction,
	Request,
	Response,
} from "express-serve-static-core";
import multer from "multer";

// Tipos MIME permitidos para subida
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/svg+xml",
];
// Tamaño máximo de archivo: 5 MB
const MAX_SIZE = 5 * 1024 * 1024;

// Almacena el archivo en memoria para procesarlo después
const storage = multer.memoryStorage();

// Filtro que solo acepta los tipos MIME definidos
const fileFilter = (
	_req: Express.Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback,
) => {
	if (ALLOWED_TYPES.includes(file.mimetype)) {
		cb(null, true);
	} else {
		(cb as (error: Error | null, accept: boolean) => void)(
			new Error("Tipo de archivo no permitido. Solo JPG, PNG, WebP y SVG."),
			false,
		);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_SIZE },
});

// Tipos permitidos para adjuntos (imágenes y PDF)
const ALLOWED_ATTACHMENT_TYPES = [...ALLOWED_TYPES, "application/pdf"];
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;

const attachmentFilter = (
	_req: Express.Request,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback,
) => {
	if (ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
		cb(null, true);
	} else {
		(cb as (error: Error | null, accept: boolean) => void)(
			new Error(
				"Tipo de archivo no permitido. Solo JPG, PNG, WebP, SVG y PDF.",
			),
			false,
		);
	}
};

const uploadAttachment = multer({
	storage,
	fileFilter: attachmentFilter,
	limits: { fileSize: MAX_ATTACHMENT_SIZE },
});

// Middleware: procesa la subida de un archivo único (campo "file")
export function subirArchivo(req: Request, res: Response, next: NextFunction) {
	// 1. Procesa el archivo con multer
	upload.single("file")(req, res, (err: unknown) => {
		// 2. Maneja errores de validación del archivo
		if (err) {
			// Archivo excede el tamaño máximo
			if ((err as Error & { code?: string }).code === "LIMIT_FILE_SIZE") {
				res
					.status(400)
					.json({ error: "El archivo excede el tamaño máximo de 5MB." });
				return;
			}
			// Tipo de archivo no permitido u otro error
			res.status(400).json({ error: (err as Error).message });
			return;
		}
		// 3. Archivo válido — continúa
		next();
	});
}

// Middleware: procesa adjuntos (imágenes o PDF) en el campo "file"
export function subirAdjunto(req: Request, res: Response, next: NextFunction) {
	uploadAttachment.single("file")(req, res, (err: unknown) => {
		if (err) {
			if ((err as Error & { code?: string }).code === "LIMIT_FILE_SIZE") {
				res
					.status(400)
					.json({ error: "El archivo excede el tamaño máximo de 10MB." });
				return;
			}
			res.status(400).json({ error: (err as Error).message });
			return;
		}
		next();
	});
}
