<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { api, ApiError } from '$lib/api';
	import type { Gig, Piece, Role } from '$lib/types';
	import { ROLES } from '$lib/types';
	import { formatDate, formatDuration, formatFee } from '$lib/format';

	let gig = $state<Gig | null>(null);
	let allPieces = $state<Piece[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let addingPiece = $state(false);
	let pickedPieceId = $state<number | ''>('');
	let pickedRole = $state<Role>('Prelude');

	let id = $derived(Number($page.params.id));

	async function load() {
		loading = true;
		error = null;
		try {
			[gig, allPieces] = await Promise.all([api.gigs.get(id), api.pieces.list()]);
		} catch (e) {
			if (!(e instanceof ApiError && e.status === 401)) {
				error = e instanceof Error ? e.message : 'Failed to load gig';
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (id) load();
	});

	function piecesByRole(g: Gig, role: Role) {
		return g.gig_pieces.filter((gp) => gp.role === role);
	}

	function gigPayload(g: Gig, pieces: { piece_id: number; role: Role }[]) {
		return {
			date: g.date,
			church_id: g.church.id,
			fee: g.fee,
			occasion: g.occasion,
			pieces
		};
	}

	async function addPiece(e: Event) {
		e.preventDefault();
		if (!gig || pickedPieceId === '') return;
		const next = [
			...gig.gig_pieces.map((gp) => ({ piece_id: gp.piece.id, role: gp.role })),
			{ piece_id: pickedPieceId, role: pickedRole }
		];
		try {
			gig = await api.gigs.update(gig.id, gigPayload(gig, next));
			addingPiece = false;
			pickedPieceId = '';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add piece';
		}
	}

	async function removePiece(index: number) {
		if (!gig) return;
		const gp = gig.gig_pieces[index];
		if (!confirm(`Remove "${gp.piece.title}" from gig?`)) return;
		const next = gig.gig_pieces
			.filter((_, i) => i !== index)
			.map((gp) => ({ piece_id: gp.piece.id, role: gp.role }));
		try {
			gig = await api.gigs.update(gig.id, gigPayload(gig, next));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to remove piece';
		}
	}

	async function deleteGig() {
		if (!gig) return;
		if (!confirm(`Delete gig on ${formatDate(gig.date)}?`)) return;
		try {
			await api.gigs.delete(gig.id);
			goto('/');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete gig';
		}
	}
</script>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else if error && !gig}
	<p class="rounded bg-red-50 p-3 text-red-700">{error}</p>
{:else if gig}
	<div class="flex items-start justify-between">
		<div>
			<a href="/" class="text-sm text-slate-500 hover:text-slate-700">← Gigs</a>
			<h1 class="mt-1 text-2xl font-bold">{gig.church.name}</h1>
			<p class="text-slate-600">{formatDate(gig.date)}</p>
			{#if gig.occasion}<p class="text-slate-600">{gig.occasion}</p>{/if}
			{#if gig.fee != null}<p class="text-slate-600">Fee: {formatFee(gig.fee)}</p>{/if}
		</div>
		<div class="flex gap-2">
			<a
				href="/gigs/{gig.id}/edit"
				class="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
			>
				Edit
			</a>
			<button
				onclick={deleteGig}
				class="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
			>
				Delete
			</button>
		</div>
	</div>

	{#if error}
		<p class="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
	{/if}

	<section class="mt-6">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-lg font-semibold">Pieces</h2>
			<button
				onclick={() => (addingPiece = !addingPiece)}
				class="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
			>
				{addingPiece ? 'Cancel' : 'Add piece'}
			</button>
		</div>

		{#if addingPiece}
			<form onsubmit={addPiece} class="mb-4 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-3">
				<select
					bind:value={pickedPieceId}
					class="flex-1 min-w-[200px] rounded border border-slate-300 px-2 py-1.5 text-sm"
					required
				>
					<option value="" disabled>Select piece…</option>
					{#each allPieces as p (p.id)}
						<option value={p.id}>{p.composer} — {p.title}</option>
					{/each}
				</select>
				<select
					bind:value={pickedRole}
					class="rounded border border-slate-300 px-2 py-1.5 text-sm"
				>
					{#each ROLES as r}
						<option value={r}>{r}</option>
					{/each}
				</select>
				<button
					type="submit"
					class="rounded bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
				>
					Add
				</button>
			</form>
		{/if}

		{#if gig.gig_pieces.length === 0}
			<p class="text-sm text-slate-500">No pieces assigned.</p>
		{:else}
			<div class="space-y-4">
				{#each ROLES as role}
					{@const items = piecesByRole(gig, role)}
					{#if items.length > 0}
						<div>
							<h3 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
								{role}
							</h3>
							<ul class="overflow-hidden rounded-lg border border-slate-200 bg-white">
								{#each items as gp (gig.gig_pieces.indexOf(gp))}
									{@const idx = gig.gig_pieces.indexOf(gp)}
									<li class="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-sm first:border-t-0">
										<div>
											<div class="font-medium">{gp.piece.title}</div>
											<div class="text-slate-500">
												{gp.piece.composer}
												{#if gp.piece.duration}· {formatDuration(gp.piece.duration)}{/if}
												{#if gp.piece.notes}· <span class="italic">{gp.piece.notes}</span>{/if}
											</div>
										</div>
										<button
											onclick={() => removePiece(idx)}
											class="text-xs text-slate-400 hover:text-red-600"
										>
											Remove
										</button>
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</section>
{/if}
