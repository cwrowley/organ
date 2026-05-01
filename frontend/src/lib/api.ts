import { apiKey, getApiKey } from './auth';
import type {
	Church,
	ChurchCreate,
	Gig,
	GigCreate,
	PieceCreate,
	PieceWithStats
} from './types';

const BASE = '/api';

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

async function request<T>(
	method: string,
	path: string,
	body?: unknown
): Promise<T> {
	const key = getApiKey();
	const headers: Record<string, string> = {
		Accept: 'application/json'
	};
	if (key) headers['Authorization'] = `Bearer ${key}`;
	if (body !== undefined) headers['Content-Type'] = 'application/json';

	const res = await fetch(`${BASE}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body)
	});

	if (res.status === 401) {
		apiKey.set(null);
		throw new ApiError(401, 'Invalid or missing API key');
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new ApiError(res.status, text || res.statusText);
	}
	if (res.status === 204) return undefined as T;
	const ct = res.headers.get('content-type') ?? '';
	if (ct.includes('application/json')) return (await res.json()) as T;
	return undefined as T;
}

export const api = {
	gigs: {
		list: () => request<Gig[]>('GET', '/gigs/'),
		get: (id: number) => request<Gig>('GET', `/gigs/${id}`),
		create: (g: GigCreate) => request<Gig>('POST', '/gigs/', g),
		update: (id: number, g: GigCreate) =>
			request<Gig>('PUT', `/gigs/${id}`, g),
		delete: (id: number) => request<void>('DELETE', `/gigs/${id}`)
	},
	pieces: {
		list: () => request<PieceWithStats[]>('GET', '/pieces/'),
		get: (id: number) => request<PieceWithStats>('GET', `/pieces/${id}`),
		create: (p: PieceCreate) => request<PieceWithStats>('POST', '/pieces/', p),
		update: (id: number, p: PieceCreate) =>
			request<PieceWithStats>('PUT', `/pieces/${id}`, p),
		delete: (id: number) => request<void>('DELETE', `/pieces/${id}`),
		gigs: (id: number) => request<Gig[]>('GET', `/pieces/${id}/gigs`)
	},
	churches: {
		list: () => request<Church[]>('GET', '/churches/'),
		get: (id: number) => request<Church>('GET', `/churches/${id}`),
		create: (c: ChurchCreate) => request<Church>('POST', '/churches/', c),
		update: (id: number, c: ChurchCreate) =>
			request<Church>('PUT', `/churches/${id}`, c),
		delete: (id: number) => request<void>('DELETE', `/churches/${id}`),
		gigs: (id: number) => request<Gig[]>('GET', `/churches/${id}/gigs`)
	}
};
