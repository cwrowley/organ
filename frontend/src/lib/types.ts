export type Role = 'Prelude' | 'Offertory' | 'Postlude' | 'Other';

export const ROLES: Role[] = ['Prelude', 'Offertory', 'Postlude', 'Other'];

export interface Piece {
	id: number;
	title: string;
	composer: string;
	duration: number | null;
	notes: string | null;
}

export type PieceCreate = Omit<Piece, 'id'>;

export interface Church {
	id: number;
	name: string;
	location: string | null;
	info: string | null;
}

export type ChurchCreate = Omit<Church, 'id'>;

export interface GigPiece {
	piece: Piece;
	role: Role;
}

export interface Gig {
	id: number;
	date: string;
	church: Church;
	fee: number | null;
	occasion: string | null;
	gig_pieces: GigPiece[];
}

export interface GigCreate {
	date: string;
	church_id: number;
	fee: number | null;
	occasion: string | null;
	pieces: { piece_id: number; role: Role }[];
}
