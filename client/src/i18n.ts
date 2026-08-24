import { useEffect, useState } from 'react';
import type { Lang } from './types';

type Dict = Record<string, string>;

const cache = new Map<string, Dict>();
const inFlight = new Map<string, Promise<Dict>>();
const listeners = new Set<() => void>();

function notify() {
    listeners.forEach((l) => l());
}

function localeUrl(lang: Lang) {
    return `/locales/${String(lang).toLowerCase()}.json`;
}

async function loadLang(lang: Lang): Promise<Dict> {
    const key = String(lang);
    if (cache.has(key)) return cache.get(key)!;
    if (inFlight.has(key)) return inFlight.get(key)!;

    const promise = fetch(localeUrl(lang))
        .then((res) => {
            if (!res.ok) throw new Error(`Failed to load locale "${key}": ${res.status}`);
            return res.json();
        })
        .then((data: Dict) => {
            cache.set(key, data);
            inFlight.delete(key);
            notify();
            return data;
        })
        .catch((err) => {
            console.error(err);
            const empty: Dict = {};
            cache.set(key, empty);
            inFlight.delete(key);
            notify();
            return empty;
        });

    inFlight.set(key, promise);
    return promise;
}

let availableLangsPromise: Promise<Lang[]> | null = null;

export function getAvailableLangs(): Promise<Lang[]> {
    if (!availableLangsPromise) {
        availableLangsPromise = fetch('/locales/index.json')
            .then((res) => res.json())
            .catch(() => ['RU', 'EN'] as Lang[]);
    }
    return availableLangsPromise;
}

export function getTranslations(lang: Lang): Dict {
    const cached = cache.get(String(lang));
    if (cached) return cached;
    void loadLang(lang);
    return {};
}

export function useT(lang: Lang): Dict {
    const [, forceRerender] = useState(0);

    useEffect(() => {
        if (!cache.has(String(lang))) {
            void loadLang(lang);
        }
        const listener = () => forceRerender((n) => n + 1);
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    }, [lang]);

    return cache.get(String(lang)) ?? {};
}