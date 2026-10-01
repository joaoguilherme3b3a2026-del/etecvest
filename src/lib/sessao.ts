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

/** Lê o usuário atual da sessão do Lovable Cloud e acompanha mudanças de auth. */
export function useUsuario(): Usuario | null {
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        if (ativo) setUsuario(null);
        return;
      }
      const nome = (u.user_metadata?.["nome"] as string | undefined) || u.email || "Aluno";
      if (ativo) {
        setUsuario({
          nome,
          email: u.email ?? "",
          cadastradoEm: u.created_at ?? new Date().toISOString(),
        });
      }
    }

    carregar();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        carregar();
      }
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return usuario;
}

export async function sairDaConta() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
