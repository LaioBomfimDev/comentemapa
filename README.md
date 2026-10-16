# Brasil em Casas

Mapa interativo independente com 27 estados, busca em 5.571 localidades, casas por perfil, fundadores, ranking por cidade, cargos, prédios evolutivos, comunidade, exportação e painel de integração Instagram.

## Executar localmente

Node.js >=22.13.0. Dependências: `npm ci`. Banco: gerar a migração somente ao alterar o schema (`npm run db:generate`); migração inicial já incluída.

1. `node scripts/run-framework.mjs build`
2. `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_parallel_patriot.sql` (somente na criação do banco local).
3. `node scripts/run-framework.mjs dev --port 5178 --hostname 127.0.0.1`
4. Abrir o endereço exibido. Para editar, usar Adicionar uma casa → Entrar para administrar. O login local é simulado pelo starter; em produção a identidade é validada pela plataforma Sites.

## Verificar

- `node node_modules/typescript/bin/tsc --noEmit`
- `node tests/integration.mjs`: testes com SQLite isolado e assinatura HMAC; nunca altera o banco de produção.
- `node scripts/run-framework.mjs build`

O helper de build/instalação Sites encontrou falha de resolução do npm.cmd neste Windows; os mesmos scripts foram executados pelo entrypoint Node explícito. Build, starter e plugin de publicação Sites foram preservados.

## Estado da atualização

A atualização inclui o Hall da Cidade, cargos de prefeito/vice/vereador/mestre de obras, pontuação por interações e cinco tipos de edifícios. Esses valores são experimentais.

A versão hospedada no Sites ainda é a versão 1, anterior a esta atualização. O envio ao GitHub não publica automaticamente o site.

A revisão encontrou três pendências: repetição ilimitada de atos, bônus por menções duplicadas e histórico da migração inicial alterado. Veja [a reprodução e as correções propostas](REVISAO_2026-10-16.md) antes de abrir uma campanha pública.

## Uso

- O mapa publicado inicia vazio e privado para o proprietário.
- Adicionar uma casa: @ + cidade selecionada. O perfil manual não é autenticado no Instagram.
- Clique numa casa para ver moradores; casas da mesma cidade ficam agrupadas.
- Comunidade permite buscar, exportar JSON e remover registros administrativamente. A remoção exige um segundo clique; o fundador passa ao próximo cadastro da cidade.
- Instagram permite testar reconhecimento sem gravar casa e revisar comentários ambíguos.
- Atualização entre sessões a cada dez segundos enquanto o mapa estiver visível.

[Integração futura do Instagram](INTEGRACAO_INSTAGRAM.md) · [Dados e regras](DADOS_E_REGRAS.md)

A integração está implementada e desligada por solicitação do usuário. Não há OAuth Instagram nem histórico importado. Antes de abrir a campanha ao público, definir o proprietário administrativo, configurar Meta, disponibilizar o receptor publicamente e validar um comentário real.
