// Error con código HTTP para que el middleware global responda correctamente
export class ErrorHttp extends Error {
	readonly status: number;
	readonly codigo?: string;

	constructor(status: number, mensaje: string, codigo?: string) {
		super(mensaje);
		this.name = "ErrorHttp";
		this.status = status;
		this.codigo = codigo;
	}
}
