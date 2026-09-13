import {
	DeleteObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import env from "../config/env.js";

// Cliente singleton de S3 compatible con Cloudflare R2
let s3Client: S3Client | null = null;

function getS3Client() {
	if (!s3Client) {
		s3Client = new S3Client({
			region: "auto",
			endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
			credentials: {
				accessKeyId: env.R2_ACCESS_KEY_ID,
				secretAccessKey: env.R2_SECRET_ACCESS_KEY,
			},
		});
	}
	return s3Client;
}

// Sube un archivo a R2 y devuelve su URL pública
export async function subirAR2(
	fileBuffer: Buffer,
	key: string,
	contentType: string,
) {
	const objectKey = key.startsWith("nemi/") ? key : `nemi/${key}`;
	const command = new PutObjectCommand({
		Bucket: env.R2_BUCKET_NAME,
		Key: objectKey,
		Body: fileBuffer,
		ContentType: contentType,
	});
	await getS3Client().send(command);
	return { url: `${env.R2_PUBLIC_URL}/${key.replace(/^nemi\//, "")}` };
}

// Elimina un archivo de R2 por su clave
export async function eliminarDeR2(key: string) {
	const objectKey = key.startsWith("nemi/") ? key : `nemi/${key}`;
	const command = new DeleteObjectCommand({
		Bucket: env.R2_BUCKET_NAME,
		Key: objectKey,
	});
	await getS3Client().send(command);
}

// Genera una clave única para el archivo usando UUID + nombre normalizado
export function generarClave(nombre: string | undefined, mimetype: string) {
	const uuid = crypto.randomUUID().split("-")[0];
	const ext =
		mimetype === "image/jpeg"
			? ".jpg"
			: mimetype === "image/png"
				? ".png"
				: mimetype === "image/webp"
					? ".webp"
					: ".svg";
	const slug = nombre
		? nombre
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "-")
				.substring(0, 50)
		: "imagen";
	return `${uuid}-${slug}${ext}`;
}
