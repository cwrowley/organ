<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import type { PieceWithStats } from '$lib/types';
	import { formatDate, formatDuration } from '$lib/format';

	let pieces = $state<PieceWithStats[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		loading = true;
		error = null;
		try {
			pieces = await api.pieces.list();
		} catch (e) {
			if (!(e instanceof ApiError && e.status === 401)) {
				error = e instanceof Error ? e.message : 'Failed to load pieces';
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	let upcoming = $derived(
		pieces
			.filter((p) => p.upcoming_dates.length > 0)
			.slice()
			.sort((a, b) => a.upcoming_dates[0].localeCompare(b.upcoming_dates[0]))
	);
</script>

<h1 class="text-2xl font-bold">Practice list</h1>
<p class="mt-1 text-sm text-slate-500">
	Pieces scheduled for upcoming gigs, sorted by next performance.
</p>

{#if loading}
	<p class="mt-6 text-slate-500">Loading…</p>
{:else if error}
	<p class="mt-6 rounded bg-red-50 p-3 text-red-700">{error}</p>
{:else if upcoming.length === 0}
	<p class="mt-6 text-slate-500">No pieces scheduled. Time off!</p>
{:else}
	<ul class="mt-6 space-y-2">
		{#each upcoming as p (p.id)}
			<li class="rounded-lg border border-slate-200 bg-white p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<div class="font-semibold">{p.title}</div>
						<div class="text-sm text-slate-600">
							{p.composer}
							{#if p.duration}· {formatDuration(p.duration)}{/if}
							{#if p.last_performed}
								· last played {formatDate(p.last_performed)}
							{:else}
								· <span class="italic">never performed</span>
							{/if}
						</div>
						{#if p.notes}
							<div class="mt-1 text-sm italic text-slate-500">{p.notes}</div>
						{/if}
					</div>
					<div class="shrink-0 text-right text-sm">
						<div class="font-medium text-slate-900">{formatDate(p.upcoming_dates[0])}</div>
						{#if p.upcoming_dates.length > 1}
							<div class="text-xs text-slate-500">
								+{p.upcoming_dates.length - 1} more
							</div>
						{/if}
					</div>
				</div>
				{#if p.upcoming_dates.length > 1}
					<div class="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
						{#each p.upcoming_dates.slice(1) as d}
							<span class="rounded bg-slate-100 px-2 py-0.5">{formatDate(d)}</span>
						{/each}
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
