import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const STORAGE_KEY = 'organ_api_key';

const initial = browser ? localStorage.getItem(STORAGE_KEY) : null;

export const apiKey = writable<string | null>(initial);

if (browser) {
	apiKey.subscribe((v) => {
		if (v === null) localStorage.removeItem(STORAGE_KEY);
		else localStorage.setItem(STORAGE_KEY, v);
	});
}

export function getApiKey(): string | null {
	let v: string | null = null;
	apiKey.subscribe((x) => (v = x))();
	return v;
}
