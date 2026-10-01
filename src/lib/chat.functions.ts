import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MensagemSalva = { id: string; papel: "user" | "assistant"; conteudo: string };

export const listarMensagens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MensagemSalva[]> => {
    const { data, error } = await context.supabase
      .from("mensagens_ia")
      .select("id, papel, conteudo")
      .order("criado_em", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return (data ?? []).map((m) => ({
      id: m.id,
      papel: m.papel === "assistant" ? "assistant" : "user",
      conteudo: m.conteudo,
    }));
  });

export const limparConversa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("mensagens_ia")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
