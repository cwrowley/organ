<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { api, ApiError } from '$lib/api';
	import GigPanel from '$lib/GigPanel.svelte';
	import type { Gig, Piece } from '$lib/types';
	import { formatDate, formatFee } from '$lib/format';

	let gig = $state<Gig | null>(null);
	let allPieces = $state<Piece[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

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
		<GigPanel {gig} pieces={allPieces} onChange={(g) => (gig = g)} />
	</section>
{/if}
