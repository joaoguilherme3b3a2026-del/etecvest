import "katex/dist/katex.min.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listarMensagens, limparConversa, type MensagemSalva } from "@/lib/chat.functions";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/Button";

const SUGESTOES = [
  "Como resolver uma questão de porcentagem?",
  "Explique regra de três com um exemplo",
  "O que cai de Português no Vestibulinho?",
];

const EVENTO_PERGUNTA = "etecvest:perguntar-ia";
let perguntaPendente: string | null = null;

/** Envia uma pergunta para o chat da IA a partir de qualquer parte do painel. */
export function perguntarIa(pergunta: string) {
  perguntaPendente = pergunta;
  window.dispatchEvent(new Event(EVENTO_PERGUNTA));
  document.getElementById("ia")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function paraUiMessages(salvas: MensagemSalva[]): UIMessage[] {
  return salvas.map((m) => ({
    id: m.id,
    role: m.papel,
    parts: [{ type: "text" as const, text: m.conteudo }],
  }));
}

function Conversa({ iniciais, aoLimpar }: { iniciais: UIMessage[]; aoLimpar: () => void }) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        headers: async () => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [],
  );
  const { messages, sendMessage, status, error } = useChat({
    id: "ia-etecvest",
    messages: iniciais,
    transport,
  });
  const [texto, setTexto] = useState("");
  const campo = useRef<HTMLTextAreaElement>(null);
  const carregando = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!carregando) campo.current?.focus();
  }, [carregando]);

  const enviar = (pergunta: string) => {
    const limpa = pergunta.trim();
    if (limpa.length < 3 || carregando) return;
    setTexto("");
    void sendMessage({ text: limpa });
  };

  // Perguntas enviadas por outras partes do painel (ex.: "Como resolver" na revisão).
  const enviarRef = useRef(enviar);
  enviarRef.current = enviar;
  useEffect(() => {
    const consumir = () => {
      const p = perguntaPendente;
      if (!p) return;
      perguntaPendente = null;
      enviarRef.current(p);
    };
    consumir();
    window.addEventListener(EVENTO_PERGUNTA, consumir);
    return () => window.removeEventListener(EVENTO_PERGUNTA, consumir);
  }, []);

  return (
    <div className="card-soft flex h-[32rem] flex-col overflow-hidden">
      <Conversation className="flex-1">
        <ConversationContent className="space-y-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Sua professora de apoio está pronta"
              description="Mande sua dúvida de Matemática, Português, Ciências ou História & Geografia."
            >
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {SUGESTOES.map((s) => (
                  <Button key={s} variant="ghost" onClick={() => enviar(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => {
              const texto = m.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join("");
              if (!texto) return null;
              return (
                <Message from={m.role} key={m.id}>
                  <MessageContent>
                    <MessageResponse>{texto}</MessageResponse>
                  </MessageContent>
                </Message>
              );
            })
          )}
          {status === "submitted" && <Shimmer>Pensando…</Shimmer>}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              Não foi possível responder agora. Tente novamente em instantes.
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t border-border p-3">
        <PromptInput
          onSubmit={(_, event) => {
            event.preventDefault();
            enviar(texto);
          }}
        >
          <PromptInputTextarea
            ref={campo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva sua dúvida…"
          />
          <PromptInputFooter className="justify-between">
            <button
              type="button"
              onClick={aoLimpar}
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              <Trash2 size={16} /> Limpar conversa
            </button>
            <PromptInputSubmit status={status} disabled={texto.trim().length < 3} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

export function ChatIa() {
  const listar = useServerFn(listarMensagens);
  const limpar = useServerFn(limparConversa);
  const historico = useQuery({ queryKey: ["mensagens-ia"], queryFn: () => listar({}) });
  const [versao, setVersao] = useState(0);

  if (historico.isPending) return <p role="status">Carregando sua conversa…</p>;

  const iniciais = paraUiMessages(historico.data ?? []);
  return (
    <Conversa
      key={`${versao}-${iniciais.length}`}
      iniciais={iniciais}
      aoLimpar={() => {
        void limpar({}).then(() => {
          void historico.refetch();
          setVersao((v) => v + 1);
        });
      }}
    />
  );
}
