<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { apiKey } from '$lib/auth';

	let { children } = $props();

	let keyInput = $state('');

	function saveKey(e: Event) {
		e.preventDefault();
		if (keyInput.trim()) {
			apiKey.set(keyInput.trim());
			keyInput = '';
		}
	}

	const navItems = [
		{ href: '/', label: 'Gigs' },
		{ href: '/pieces', label: 'Pieces' },
		{ href: '/churches', label: 'Churches' }
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/' || pathname.startsWith('/gigs');
		return pathname.startsWith(href);
	}
</script>

{#if $apiKey === null}
	<div class="flex min-h-screen items-center justify-center px-4">
		<form onsubmit={saveKey} class="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow">
			<h1 class="text-2xl font-bold text-slate-900">Organ Gigs</h1>
			<p class="text-sm text-slate-600">Enter your API key to continue.</p>
			<input
				type="password"
				bind:value={keyInput}
				placeholder="API key"
				class="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
				autofocus
			/>
			<button
				type="submit"
				class="w-full rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
			>
				Continue
			</button>
		</form>
	</div>
{:else}
	<div class="min-h-screen">
		<header class="border-b border-slate-200 bg-white">
			<div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
				<a href="/" class="text-lg font-bold text-slate-900">Organ Gigs</a>
				<nav class="flex items-center gap-1">
					{#each navItems as item (item.href)}
						<a
							href={item.href}
							class="rounded px-3 py-1.5 text-sm font-medium transition {isActive(
								item.href,
								$page.url.pathname
							)
								? 'bg-slate-900 text-white'
								: 'text-slate-700 hover:bg-slate-100'}"
						>
							{item.label}
						</a>
					{/each}
					<button
						onclick={() => apiKey.set(null)}
						class="ml-2 rounded px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
						title="Clear API key"
					>
						Sign out
					</button>
				</nav>
			</div>
		</header>
		<main class="mx-auto max-w-5xl px-4 py-6">
			{@render children()}
		</main>
	</div>
{/if}
