<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { api, ApiError } from '$lib/api';
	import GigForm from '$lib/GigForm.svelte';
	import type { Church, Gig, GigCreate, Piece } from '$lib/types';

	let churches = $state<Church[]>([]);
	let pieces = $state<Piece[]>([]);
	let gig = $state<Gig | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	let id = $derived(Number($page.params.id));

	$effect(() => {
		if (!id) return;
		(async () => {
			loading = true;
			try {
				[gig, churches, pieces] = await Promise.all([
					api.gigs.get(id),
					api.churches.list(),
					api.pieces.list()
				]);
			} catch (e) {
				if (!(e instanceof ApiError && e.status === 401)) {
					error = e instanceof Error ? e.message : 'Failed to load';
				}
			} finally {
				loading = false;
			}
		})();
	});

	let initial = $derived<GigCreate | undefined>(
		gig
			? {
					date: gig.date,
					church_id: gig.church.id,
					fee: gig.fee,
					occasion: gig.occasion,
					pieces: gig.gig_pieces.map((gp) => ({ piece_id: gp.piece.id, role: gp.role }))
				}
			: undefined
	);

	async function save(g: GigCreate) {
		if (!gig) return;
		await api.gigs.update(gig.id, g);
		goto(`/gigs/${gig.id}`);
	}
</script>

<a href="/gigs/{id}" class="text-sm text-slate-500 hover:text-slate-700">← Gig</a>
<h1 class="mt-1 text-2xl font-bold">Edit gig</h1>

<div class="mt-6">
	{#if loading}
		<p class="text-slate-500">Loading…</p>
	{:else if error}
		<p class="rounded bg-red-50 p-3 text-red-700">{error}</p>
	{:else if initial}
		<GigForm
			{churches}
			{pieces}
			{initial}
			submitLabel="Save changes"
			onSubmit={save}
			onCancel={() => goto(`/gigs/${id}`)}
		/>
	{/if}
</div>
