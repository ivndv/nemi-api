import { apiDoc } from "./documento.js";

// Valida que el documento generado tenga rutas
const rutas = Object.keys(
	(apiDoc as { paths?: Record<string, unknown> }).paths ?? {},
).length;

if (rutas === 0) {
	console.error("❌ El documento OpenAPI no tiene rutas");
	process.exit(1);
}

console.log(`✅ OpenAPI válido con ${rutas} rutas`);
