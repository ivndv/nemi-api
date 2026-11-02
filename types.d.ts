declare global {
	namespace Express {
		interface Request {
			validated?: unknown;
			validatedQuery?: unknown;
			validatedParams?: unknown;
			id?: string;
			user?: {
				id: number;
				nombre: string;
				email: string;
				rol: string;
				tv: number;
			};
		}
	}
}

export {};
