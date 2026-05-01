<script lang="ts">
	import type { Church, GigCreate, Piece, Role } from './types';
	import { ROLES } from './types';

	let {
		churches,
		pieces,
		initial,
		submitLabel = 'Save',
		onSubmit,
		onCancel
	}: {
		churches: Church[];
		pieces: Piece[];
		initial?: GigCreate;
		submitLabel?: string;
		onSubmit: (g: GigCreate) => Promise<void> | void;
		onCancel?: () => void;
	} = $props();

	let date = $state(initial?.date ?? new Date().toISOString().slice(0, 10));
	let churchId = $state<number | ''>(initial?.church_id ?? '');
	let fee = $state<string>(initial?.fee != null ? String(initial.fee) : '');
	let occasion = $state(initial?.occasion ?? '');
	let entries = $state<{ piece_id: number | ''; role: Role }[]>(
		initial?.pieces.map((p) => ({ piece_id: p.piece_id, role: p.role })) ?? []
	);
	let submitting = $state(false);
	let error = $state<string | null>(null);

	function addRow() {
		entries = [...entries, { piece_id: '', role: 'Prelude' }];
	}
	function removeRow(i: number) {
		entries = entries.filter((_, idx) => idx !== i);
	}

	async function submit(e: Event) {
		e.preventDefault();
		if (churchId === '') return;
		const cleanedPieces = entries
			.filter((p) => p.piece_id !== '')
			.map((p) => ({ piece_id: p.piece_id as number, role: p.role }));
		const payload: GigCreate = {
			date,
			church_id: churchId,
			fee: fee.trim() === '' ? null : Number(fee),
			occasion: occasion.trim() === '' ? null : occasion,
			pieces: cleanedPieces
		};
		submitting = true;
		error = null;
		try {
			await onSubmit(payload);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save';
		} finally {
			submitting = false;
		}
	}
</script>

<form onsubmit={submit} class="space-y-4">
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<label class="block">
			<span class="text-sm font-medium">Date</span>
			<input
				type="date"
				bind:value={date}
				required
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Church</span>
			<select
				bind:value={churchId}
				required
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			>
				<option value="" disabled>Select church…</option>
				{#each churches as c (c.id)}
					<option value={c.id}>{c.name}</option>
				{/each}
			</select>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Fee</span>
			<input
				type="number"
				step="0.01"
				bind:value={fee}
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium">Occasion</span>
			<input
				type="text"
				bind:value={occasion}
				placeholder="e.g. Sunday Service"
				class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
			/>
		</label>
	</div>

	<div>
		<div class="mb-2 flex items-center justify-between">
			<span class="text-sm font-medium">Pieces</span>
			<button
				type="button"
				onclick={addRow}
				class="text-sm text-slate-600 hover:text-slate-900"
			>
				+ Add piece
			</button>
		</div>
		{#if entries.length === 0}
			<p class="text-sm text-slate-500">No pieces — you can add them now or later.</p>
		{:else}
			<div class="space-y-2">
				{#each entries as entry, i (i)}
					<div class="flex gap-2">
						<select
							bind:value={entry.piece_id}
							class="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
						>
							<option value="" disabled>Select piece…</option>
							{#each pieces as p (p.id)}
								<option value={p.id}>{p.composer} — {p.title}</option>
							{/each}
						</select>
						<select
							bind:value={entry.role}
							class="rounded border border-slate-300 px-2 py-1.5 text-sm"
						>
							{#each ROLES as r}
								<option value={r}>{r}</option>
							{/each}
						</select>
						<button
							type="button"
							onclick={() => removeRow(i)}
							class="rounded px-2 text-slate-400 hover:text-red-600"
						>
							×
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	{#if error}
		<p class="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
	{/if}

	<div class="flex gap-2">
		<button
			type="submit"
			disabled={submitting}
			class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
		>
			{submitting ? 'Saving…' : submitLabel}
		</button>
		{#if onCancel}
			<button
				type="button"
				onclick={onCancel}
				class="rounded border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
			>
				Cancel
			</button>
		{/if}
	</div>
</form>
