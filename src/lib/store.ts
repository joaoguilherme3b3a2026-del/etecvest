import { useSyncExternalStore } from "react";

/**
 * Pequena store persistida em localStorage, compartilhada entre componentes.
 * Uso: const [valor, setValor] = useStore(minhaStore)
 */
export function createLocalStore<T>(chave: string, inicial: T) {
  let valor: T = inicial;
  let carregado = false;
  const ouvintes = new Set<() => void>();

  function carregar() {
    if (carregado || typeof window === "undefined") return;
    carregado = true;
    try {
      const bruto = window.localStorage.getItem(chave);
      if (bruto) valor = { ...inicial, ...(JSON.parse(bruto) as T) };
    } catch {
      valor = inicial;
    }
  }

  return {
    subscribe(fn: () => void) {
      carregar();
      ouvintes.add(fn);
      return () => ouvintes.delete(fn);
    },
    get(): T {
      carregar();
      return valor;
    },
    getServer(): T {
      return inicial;
    },
    set(proximo: T | ((atual: T) => T)) {
      carregar();
      valor =
        typeof proximo === "function" ? (proximo as (atual: T) => T)(valor) : proximo;
      try {
        window.localStorage.setItem(chave, JSON.stringify(valor));
      } catch {
        /* armazenamento indisponível: mantém apenas em memória */
      }
      ouvintes.forEach((fn) => fn());
    },
    limpar() {
      carregado = true;
      valor = inicial;
      try {
        window.localStorage.removeItem(chave);
      } catch {
        /* ignora */
      }
      ouvintes.forEach((fn) => fn());
    },
  };
}

export type LocalStore<T> = ReturnType<typeof createLocalStore<T>>;

export function useStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}
