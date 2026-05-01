<script lang="ts">
	import { api, ApiError } from '$lib/api';
	import type { Church, ChurchCreate } from '$lib/types';

	let churches = $state<Church[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let editing = $state<Church | 'new' | null>(null);

	let draft = $state<ChurchCreate>({ name: '', location: null, info: null });

	async function load() {
		loading = true;
		error = null;
		try {
			churches = await api.churches.list();
		} catch (e) {
			if (!(e instanceof ApiError && e.status === 401)) {
				error = e instanceof Error ? e.message : 'Failed to load churches';
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		load();
	});

	function startNew() {
		draft = { name: '', location: null, info: null };
		editing = 'new';
	}
	function startEdit(c: Church) {
		draft = { name: c.name, location: c.location, info: c.info };
		editing = c;
	}

	async function save(e: Event) {
		e.preventDefault();
		try {
			if (editing === 'new') await api.churches.create(draft);
			else if (editing) await api.churches.update(editing.id, draft);
			editing = null;
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		}
	}

	async function remove(c: Church) {
		if (!confirm(`Delete "${c.name}"? Gigs at this church may break.`)) return;
		try {
			await api.churches.delete(c.id);
			await load();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete';
		}
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-bold">Churches</h1>
	<button
		onclick={startNew}
		class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
	>
		Add church
	</button>
</div>

{#if editing !== null}
	<form onsubmit={save} class="mt-4 space-y-3 rounded-lg border border-slate-200 bg-white p-4">
		<h2 class="font-semibold">{editing === 'new' ? 'New church' : 'Edit church'}</h2>
		<label class="block">
			<span class="text-sm font-medium">Name</span>
			<input
				required
				bind:value={draft.name}
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Location</span>
			<input
				bind:value={draft.location}
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Info</span>
			<textarea
				bind:value={draft.info}
				rows="3"
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			></textarea>
		</label>
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

{#if loading}
	<p class="mt-4 text-slate-500">Loading…</p>
{:else if error}
	<p class="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>
{:else}
	<div class="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
		<table class="w-full text-sm">
			<thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
				<tr>
					<th class="px-4 py-2 font-medium">Name</th>
					<th class="px-4 py-2 font-medium">Location</th>
					<th class="px-4 py-2 font-medium">Info</th>
					<th class="px-4 py-2"></th>
				</tr>
			</thead>
			<tbody>
				{#each churches as c (c.id)}
					<tr class="border-t border-slate-100">
						<td class="px-4 py-2 font-medium">{c.name}</td>
						<td class="px-4 py-2 text-slate-600">{c.location ?? ''}</td>
						<td class="px-4 py-2 text-slate-500 italic">{c.info ?? ''}</td>
						<td class="px-4 py-2 text-right whitespace-nowrap">
							<button
								onclick={() => startEdit(c)}
								class="text-xs text-slate-600 hover:text-slate-900"
							>
								Edit
							</button>
							<button
								onclick={() => remove(c)}
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
