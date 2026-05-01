<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import type { PieceCreate, PieceWithStats } from '$lib/types';
	import { formatDate, formatDuration, parseDuration } from '$lib/format';

	let pieces = $state<PieceWithStats[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editing = $state<PieceWithStats | 'new' | null>(null);
	let filter = $state('');

	let draft = $state<PieceCreate>({ title: '', composer: '', duration: null, notes: null });
	let durationInput = $state('');

	let composers = $derived(
		[...new Set(pieces.map((p) => p.composer).filter(Boolean))].sort()
	);

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
		durationInput = '';
		editing = 'new';
	}
	function startEdit(p: PieceWithStats) {
		draft = { title: p.title, composer: p.composer, duration: p.duration, notes: p.notes };
		durationInput = formatDuration(p.duration);
		editing = p;
	}

	async function save(e: Event) {
		e.preventDefault();
		const trimmed = durationInput.trim();
		const dur = trimmed === '' ? null : parseDuration(trimmed);
		if (trimmed !== '' && dur === null) {
			error = 'Invalid duration. Use seconds (e.g. 90) or m:ss (e.g. 1:30).';
			return;
		}
		const payload: PieceCreate = { ...draft, duration: dur };
		try {
			if (editing === 'new') await api.pieces.create(payload);
			else if (editing) await api.pieces.update(editing.id, payload);
			editing = null;
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		}
	}

	async function remove(p: PieceWithStats) {
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
					list="composers"
					bind:value={draft.composer}
					class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
				/>
				<datalist id="composers">
					{#each composers as c}
						<option value={c}></option>
					{/each}
				</datalist>
			</label>
			<label class="block">
				<span class="text-sm font-medium">Duration <span class="font-normal text-slate-500">(seconds, or m:ss)</span></span>
				<input
					type="text"
					inputmode="numeric"
					bind:value={durationInput}
					placeholder="e.g. 90 or 1:30"
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
		{#if error}
			<p class="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
		{/if}
		<div class="flex gap-2">
			<button class="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700">
				Save
			</button>
			<button
				type="button"
				onclick={() => {
					editing = null;
					error = null;
				}}
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
					<th class="px-4 py-2 font-medium">Last played</th>
					<th class="px-4 py-2 font-medium" title="Past performances">×</th>
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
						<td class="px-4 py-2 whitespace-nowrap text-slate-600">
							{p.last_performed ? formatDate(p.last_performed) : '—'}
						</td>
						<td class="px-4 py-2 text-slate-600">{p.performance_count || ''}</td>
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
