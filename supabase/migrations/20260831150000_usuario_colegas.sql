-- ============================================================================
-- 14 · Etapa 6 (Passo C) — ver o nome/e-mail dos colegas de escritório
-- ============================================================================
-- A policy `usuario_proprio` (migration 02) só deixa o usuário ler a PRÓPRIA
-- linha de `usuario`. A tela "Equipe" (Configurações) precisa mostrar o nome e
-- o e-mail dos outros membros — então liberamos o SELECT do perfil de quem
-- compartilha um escritório com o usuário logado. Escrita continua só na
-- própria linha (a policy `usuario_proprio` cobre INSERT/UPDATE/DELETE).
-- ============================================================================

create policy usuario_colega_de_escritorio on usuario for select
  using (
    id in (
      select m.usuario_id
      from membro m
      where m.escritorio_id in (select escritorios_do_usuario())
        and m.deletado_em is null
    )
  );
