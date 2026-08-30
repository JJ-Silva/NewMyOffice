# lib/djen

Cliente da **Comunica API** do CNJ — o Diário de Justiça Eletrônico Nacional
(DJEN). Serviço externo, público, sem autenticação.

- `comunica-api.ts` — `buscarComunicacoes({ oabs, dataInicio, dataFim })`.
  Uma requisição por OAB, paginação automática, deduplica pelo id do DJEN,
  devolve `ComunicacaoDjen[]` já normalizado (CNJ formatado, texto sem HTML).

Não é `lib/db` (não fala com o Supabase) nem `lib/domain` (faz I/O de rede). É
um cliente HTTP — um arquivo, a requisição visível.

Endpoint: `GET https://comunicaapi.pje.jus.br/api/v1/comunicacao`
(`numeroOab`, `ufOab`, `dataDisponibilizacaoInicio`, `dataDisponibilizacaoFim`,
`itensPorPagina`, `pagina`). Resposta `{ status, message, count, items }`.

A limpeza do texto, a normalização do CNJ e a sugestão de tipo/prazo ficam em
`lib/domain/publicacao.ts` (puras, testadas).
