import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Usuario = {
  nome: string;
  email: string;
  cadastradoEm: string;
};

export function primeiroNome(nome: string) {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

/** Lê o usuário atual e acompanha as mudanças de autenticação. */
export function useUsuario(): Usuario | null {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarUsuario() {
      const { data } = await supabase.auth.getUser();
      const usuarioAtual = data.user;

      if (!usuarioAtual) {
        if (ativo) {
          setUsuario(null);
        }
        return;
      }

      const nome =
        (usuarioAtual.user_metadata?.["nome"] as string | undefined) ||
        usuarioAtual.email ||
        "Aluno";

      if (ativo) {
        setUsuario({
          nome,
          email: usuarioAtual.email ?? "",
          cadastradoEm:
            usuarioAtual.created_at ?? new Date().toISOString(),
        });
      }
    }

    carregarUsuario();

    const { data: inscricao } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED"
      ) {
        carregarUsuario();
      }
    });

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  return usuario;
}

export async function sairDaConta() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}
