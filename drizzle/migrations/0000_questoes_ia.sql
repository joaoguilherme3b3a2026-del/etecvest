CREATE TABLE public.questoes_ia (
  id text PRIMARY KEY,
  user_id uuid NOT NULL,
  materia text NOT NULL,
  enunciado text NOT NULL,
  alternativas jsonb NOT NULL,
  correta integer NOT NULL,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.questoes_ia TO authenticated;
GRANT ALL ON public.questoes_ia TO service_role;
ALTER TABLE public.questoes_ia ENABLE ROW LEVEL SECURITY;
CREATE POLICY aluno_le_proprias_questoes_ia ON public.questoes_ia FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY aluno_cria_proprias_questoes_ia ON public.questoes_ia FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX questoes_ia_user_idx ON public.questoes_ia(user_id);