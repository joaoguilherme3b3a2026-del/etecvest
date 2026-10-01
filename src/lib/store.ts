import { useSyncExternalStore } from "react";

/**
 * Pequena store persistida em localStorage e compartilhada entre componentes.
 */
export function createLocalStore<T>(chave: string, inicial: T) {
  let valor = inicial;
  let carregado = false;
  const ouvintes = new Set<() => void>();

  function carregar() {
    if (carregado || typeof window === "undefined") {
      return;
    }

    carregado = true;

    try {
      const salvo = window.localStorage.getItem(chave);

      if (salvo) {
        valor = {
          ...inicial,
          ...(JSON.parse(salvo) as T),
        };
      }
    } catch {
      valor = inicial;
    }
  }

  function avisar() {
    ouvintes.forEach((ouvinte) => ouvinte());
  }

  return {
    subscribe(ouvinte: () => void) {
      carregar();
      ouvintes.add(ouvinte);

      return () => ouvintes.delete(ouvinte);
    },

    get() {
      carregar();
      return valor;
    },

    getServer() {
      return inicial;
    },

    set(proximo: T | ((atual: T) => T)) {
      carregar();

      valor =
        typeof proximo === "function"
          ? (proximo as (atual: T) => T)(valor)
          : proximo;

      try {
        window.localStorage.setItem(chave, JSON.stringify(valor));
      } catch {
        // Mantém o valor em memória quando o armazenamento não estiver disponível.
      }

      avisar();
    },

    limpar() {
      carregado = true;
      valor = inicial;

      try {
        window.localStorage.removeItem(chave);
      } catch {
        // Não há ação necessária se o armazenamento estiver indisponível.
      }

      avisar();
    },
  };
}

export type LocalStore<T> = ReturnType<typeof createLocalStore<T>>;

export function useStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.get,
    store.getServer,
  );
}
