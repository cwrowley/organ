<script lang="ts">
	import { goto } from '$app/navigation';
	import { api, ApiError } from '$lib/api';
	import GigForm from '$lib/GigForm.svelte';
	import type { Church, GigCreate, Piece } from '$lib/types';

	let churches = $state<Church[]>([]);
	let pieces = $state<Piece[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		(async () => {
			try {
				[churches, pieces] = await Promise.all([
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

	async function save(g: GigCreate) {
		const created = await api.gigs.create(g);
		goto(`/gigs/${created.id}`);
	}
</script>

<a href="/" class="text-sm text-slate-500 hover:text-slate-700">← Gigs</a>
<h1 class="mt-1 text-2xl font-bold">Add gig</h1>

<div class="mt-6">
	{#if loading}
		<p class="text-slate-500">Loading…</p>
	{:else if error}
		<p class="rounded bg-red-50 p-3 text-red-700">{error}</p>
	{:else}
		<GigForm
			{churches}
			{pieces}
			submitLabel="Add gig"
			onSubmit={save}
			onCancel={() => goto('/')}
		/>
	{/if}
</div>
