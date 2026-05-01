<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import type { Piece, PieceCreate } from '$lib/types';
	import { formatDuration } from '$lib/format';

	let pieces = $state<Piece[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editing = $state<Piece | 'new' | null>(null);
	let filter = $state('');

	let draft = $state<PieceCreate>({ title: '', composer: '', duration: null, notes: null });

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

	function startNew() {
		draft = { title: '', composer: '', duration: null, notes: null };
		editing = 'new';
	}
	function startEdit(p: Piece) {
		draft = { title: p.title, composer: p.composer, duration: p.duration, notes: p.notes };
		editing = p;
	}

	async function save(e: Event) {
		e.preventDefault();
		try {
			if (editing === 'new') await api.pieces.create(draft);
			else if (editing) await api.pieces.update(editing.id, draft);
			editing = null;
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		}
	}

	async function remove(p: Piece) {
		if (!confirm(`Delete "${p.title}"?`)) return;
		try {
			await api.pieces.delete(p.id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete';
		}
	}

	let filtered = $derived(
		filter.trim() === ''
			? pieces
			: pieces.filter((p) => {
					const q = filter.toLowerCase();
					return (
						p.title.toLowerCase().includes(q) ||
						p.composer.toLowerCase().includes(q) ||
						(p.notes ?? '').toLowerCase().includes(q)
					);
				})
	);
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold">Pieces</h1>
	<button
		onclick={startNew}
		class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
	>
		Add piece
	</button>
</div>

{#if editing !== null}
	<form onsubmit={save} class="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
		<h2 class="font-semibold">{editing === 'new' ? 'New piece' : 'Edit piece'}</h2>
		<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
			<label class="block">
				<span class="text-sm font-medium">Title</span>
				<input
					required
					bind:value={draft.title}
					class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
				/>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Composer</span>
				<input
					required
					bind:value={draft.composer}
					class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
				/>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Duration (minutes)</span>
				<input
					type="number"
					bind:value={draft.duration}
					class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
				/>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Notes</span>
				<input
					bind:value={draft.notes}
					class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
				/>
			</label>
		</div>
		<div class="flex gap-2">
			<button class="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
				Save
			</button>
			<button
				type="button"
				onclick={() => (editing = null)}
				class="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
			>
				Cancel
			</button>
		</div>
	</form>
{/if}

<div class="mt-4">
	<input
		bind:value={filter}
		placeholder="Filter…"
		class="w-full max-w-sm rounded border border-slate-300 px-3 py-2 text-sm"
	/>
</div>

{#if loading}
	<p class="mt-4 text-slate-500">Loading…</p>
{:else if error}
	<p class="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>
{:else}
	<div class="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
				<tr>
					<th class="px-4 py-2 font-medium">Composer</th>
					<th class="px-4 py-2 font-medium">Title</th>
					<th class="px-4 py-2 font-medium">Duration</th>
					<th class="px-4 py-2 font-medium">Notes</th>
					<th class="px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as p (p.id)}
					<tr class="border-t border-slate-100">
						<td class="px-4 py-2">{p.composer}</td>
						<td class="px-4 py-2 font-medium">{p.title}</td>
						<td class="px-4 py-2 text-slate-600">{formatDuration(p.duration)}</td>
						<td class="px-4 py-2 text-slate-500 italic">{p.notes ?? ''}</td>
						<td class="px-4 py-2 text-right whitespace-nowrap">
							<button
								onclick={() => startEdit(p)}
								class="text-xs text-slate-600 hover:text-slate-900"
							>
								Edit
							</button>
							<button
								onclick={() => remove(p)}
								class="ml-2 text-xs text-slate-400 hover:text-red-600"
							>
								Delete
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
