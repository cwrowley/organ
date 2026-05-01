<script lang="ts">
	import { api } from '$lib/api';
	import type { Gig, Piece, Role } from '$lib/types';
	import { ROLES } from '$lib/types';
	import { formatDuration } from '$lib/format';

	let {
		gig,
		pieces,
		onChange,
		editHref,
		onDelete
	}: {
		gig: Gig;
		pieces: Piece[];
		onChange: (g: Gig) => void;
		editHref?: string;
		onDelete?: () => void;
	} = $props();

	let addingPiece = $state(false);
	let pickedPieceId = $state<number | ''>('');
	let pickedRole = $state<Role>('Prelude');
	let error = $state<string | null>(null);

	function gigPayload(g: Gig, entries: { piece_id: number; role: Role }[]) {
		return {
			date: g.date,
			church_id: g.church.id,
			fee: g.fee,
			occasion: g.occasion,
			pieces: entries
		};
	}

	async function addPiece(e: Event) {
		e.preventDefault();
		if (pickedPieceId === '') return;
		const next = [
			...gig.gig_pieces.map((gp) => ({ piece_id: gp.piece.id, role: gp.role })),
			{ piece_id: pickedPieceId, role: pickedRole }
		];
		try {
			const updated = await api.gigs.update(gig.id, gigPayload(gig, next));
			onChange(updated);
			addingPiece = false;
			pickedPieceId = '';
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add piece';
		}
	}

	async function removePiece(index: number) {
		const gp = gig.gig_pieces[index];
		if (!confirm(`Remove "${gp.piece.title}" from gig?`)) return;
		const next = gig.gig_pieces
			.filter((_, i) => i !== index)
			.map((gp) => ({ piece_id: gp.piece.id, role: gp.role }));
		try {
			const updated = await api.gigs.update(gig.id, gigPayload(gig, next));
			onChange(updated);
			error = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to remove piece';
		}
	}

	function piecesByRole(role: Role) {
		return gig.gig_pieces
			.map((gp, idx) => ({ gp, idx }))
			.filter((x) => x.gp.role === role);
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			{#if editHref || onDelete}
				<div class="flex gap-1.5">
					{#if editHref}
						<a
							href={editHref}
							class="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-100"
						>
							Edit
						</a>
					{/if}
					{#if onDelete}
						<button
							onclick={onDelete}
							class="rounded border border-red-300 bg-white px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
						>
							Delete
						</button>
					{/if}
				</div>
				<span class="text-slate-200">|</span>
			{/if}
			<h3 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Pieces</h3>
		</div>
		<button
			onclick={() => (addingPiece = !addingPiece)}
			class="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-700"
		>
			{addingPiece ? 'Cancel' : 'Add piece'}
		</button>
	</div>

	{#if addingPiece}
		<form
			onsubmit={addPiece}
			class="flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-2"
		>
			<select
				bind:value={pickedPieceId}
				class="min-w-[200px] flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
				required
			>
				<option value="" disabled>Select piece…</option>
				{#each pieces as p (p.id)}
					<option value={p.id}>{p.composer} — {p.title}</option>
				{/each}
			</select>
			<select
				bind:value={pickedRole}
				class="rounded border border-slate-300 px-2 py-1 text-sm"
			>
				{#each ROLES as r}
					<option value={r}>{r}</option>
				{/each}
			</select>
			<button
				type="submit"
				class="rounded bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-700"
			>
				Add
			</button>
		</form>
	{/if}

	{#if error}
		<p class="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
	{/if}

	{#if gig.gig_pieces.length === 0}
		<p class="text-sm text-slate-500">No pieces assigned.</p>
	{:else}
		<div class="space-y-3">
			{#each ROLES as role}
				{@const items = piecesByRole(role)}
				{#if items.length > 0}
					<div>
						<h4 class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
							{role}
						</h4>
						<ul class="overflow-hidden rounded border border-slate-200 bg-white">
							{#each items as item (item.idx)}
								<li class="flex items-center justify-between border-t border-slate-100 px-3 py-1.5 text-sm first:border-t-0">
									<div>
										<span class="font-medium">{item.gp.piece.title}</span>
										<span class="text-slate-500">
											· {item.gp.piece.composer}
											{#if item.gp.piece.duration}· {formatDuration(item.gp.piece.duration)}{/if}
											{#if item.gp.piece.notes}· <span class="italic">{item.gp.piece.notes}</span>{/if}
										</span>
									</div>
									<button
										onclick={() => removePiece(item.idx)}
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
</div>
