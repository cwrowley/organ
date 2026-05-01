<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import GigPanel from '$lib/GigPanel.svelte';
	import type { Gig, Piece } from '$lib/types';
	import { formatDate, formatFee, isUpcoming } from '$lib/format';

	let gigs = $state<Gig[]>([]);
	let allPieces = $state<Piece[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showPast = $state(false);
	let expandedId = $state<number | null>(null);
	let filterChurchId = $state<number | ''>('');

	async function load() {
		loading = true;
		error = null;
		try {
			const [gs, ps] = await Promise.all([api.gigs.list(), api.pieces.list()]);
			gigs = gs.sort((a, b) => a.date.localeCompare(b.date));
			allPieces = ps;
		} catch (e) {
			if (!(e instanceof ApiError && e.status === 401)) {
				error = e instanceof Error ? e.message : 'Failed to load gigs';
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	function toggle(id: number) {
		expandedId = expandedId === id ? null : id;
	}

	function updateGig(updated: Gig) {
		const i = gigs.findIndex((g) => g.id === updated.id);
		if (i >= 0) gigs[i] = updated;
	}

	async function deleteGig(id: number, label: string) {
		if (!confirm(`Delete gig on ${label}?`)) return;
		try {
			await api.gigs.delete(id);
			gigs = gigs.filter((g) => g.id !== id);
			if (expandedId === id) expandedId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete';
		}
	}

	let churches = $derived(
		[...new Map(gigs.map((g) => [g.church.id, g.church])).values()].sort((a, b) =>
			a.name.localeCompare(b.name)
		)
	);
	let filteredGigs = $derived(
		filterChurchId === '' ? gigs : gigs.filter((g) => g.church.id === filterChurchId)
	);
	let upcoming = $derived(filteredGigs.filter((g) => isUpcoming(g.date)));
	let past = $derived(filteredGigs.filter((g) => !isUpcoming(g.date)).slice().reverse());
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold">Gigs</h1>
	<a
		href="/gigs/new"
		class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
	>
		Add gig
	</a>
</div>

{#if loading}
	<p class="mt-6 text-slate-500">Loading…</p>
{:else if error}
	<p class="mt-6 rounded bg-red-50 p-3 text-red-700">{error}</p>
{:else}
	{#if churches.length > 1}
		<div class="mt-4 flex items-center gap-2">
			<label for="church-filter" class="text-sm text-slate-500">Church:</label>
			<select
				id="church-filter"
				bind:value={filterChurchId}
				class="rounded border border-slate-300 px-2 py-1 text-sm"
			>
				<option value="">All churches</option>
				{#each churches as c (c.id)}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
			{#if filterChurchId !== ''}
				<button
					onclick={() => (filterChurchId = '')}
					class="text-xs text-slate-400 hover:text-slate-600"
				>
					Clear
				</button>
			{/if}
		</div>
	{/if}

	<section class="mt-6">
		<h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
			Upcoming ({upcoming.length})
		</h2>
		{#if upcoming.length === 0}
			<p class="text-sm text-slate-500">No upcoming gigs.</p>
		{:else}
			{@render gigTable(upcoming, true)}
		{/if}
	</section>

	<section class="mt-8">
		<button
			class="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
			onclick={() => (showPast = !showPast)}
		>
			{showPast ? '▾' : '▸'} Past ({past.length})
		</button>
		{#if showPast}
			{@render gigTable(past, false)}
		{/if}
	</section>
{/if}

{#snippet gigTable(rows: Gig[], emphasize: boolean)}
	<div class="overflow-hidden rounded-lg border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
				<tr>
					<th class="w-6 px-2 py-2"></th>
					<th class="px-4 py-2 font-medium">Date</th>
					<th class="px-4 py-2 font-medium">Church</th>
					<th class="px-4 py-2 font-medium">Occasion</th>
					<th class="px-4 py-2 font-medium">Fee</th>
					<th class="px-4 py-2 font-medium">Pieces</th>
				</tr>
			</thead>
			<tbody>
				{#each rows as gig (gig.id)}
					{@const open = expandedId === gig.id}
					<tr
						class="cursor-pointer border-t border-slate-100 hover:bg-slate-50 {emphasize
							? 'font-medium'
							: ''} {open ? 'bg-slate-50' : ''}"
						onclick={() => toggle(gig.id)}
					>
						<td class="px-2 py-2 text-slate-400">{open ? '▾' : '▸'}</td>
						<td class="px-4 py-2 whitespace-nowrap">{formatDate(gig.date)}</td>
						<td class="px-4 py-2">{gig.church.name}</td>
						<td class="px-4 py-2 text-slate-600">{gig.occasion ?? ''}</td>
						<td class="px-4 py-2 text-slate-600">{formatFee(gig.fee)}</td>
						<td class="px-4 py-2 text-slate-500">{gig.gig_pieces.length}</td>
					</tr>
					{#if open}
						<tr class="border-t border-slate-100 bg-slate-50">
							<td colspan="6" class="px-4 py-2">
								<GigPanel
									{gig}
									pieces={allPieces}
									onChange={updateGig}
									editHref="/gigs/{gig.id}/edit"
									onDelete={() => deleteGig(gig.id, formatDate(gig.date))}
								/>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
{/snippet}
