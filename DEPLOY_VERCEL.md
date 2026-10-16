# Produção na Vercel

O repositório `LaioBomfimDev/comentemapa` contém o site na raiz. A build anterior era Vinext/Cloudflare (`dist/server`), por isso a Vercel não encontrava `.next/routes-manifest.json`. A produção na Vercel agora usa Next.js real, sem desativar as rotas de backend ou exportar apenas HTML estático.

## Configurar o projeto

Em **Settings → Build and Deployment**:

| Campo | Valor |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | deixar vazio (raiz do repositório) |
| Build Command | `npm run build:vercel` |
| Output Directory | `.next` (ou automático do Next.js) |
| Install Command | `npm ci` |
| Node.js | 22.x |

`vercel.json` já declara framework, comandos e diretório. Remova overrides antigos como `dist`, `out`, `vinext build` ou o diretório do monorepo Godot. Não é necessário `turbo.json`. Faça **Redeploy** do commit novo; se a falha anterior persistir, refaça sem o cache de build.

Sem credenciais, `/`, `/?cidade=salvador`, `/modelos`, busca de cidades e downloads 3D funcionam em demonstração. O mapa informa `storage.mode: demo`, não grava moradores e não simula uma conexão Instagram.

## Banco persistente

O schema existente continua em Cloudflare D1. As funções Node.js da Vercel acessam a API HTTP oficial do D1 pelo servidor, com consultas parametrizadas e lotes. O banco privado gerenciado pelo Sites não é transferido automaticamente; use um D1 da sua conta Cloudflare. Não use SQLite local ou arquivos no disco temporário das funções como banco de produção.

1. Criar um banco D1 na conta Cloudflare.
2. Aplicar, nessa ordem, os SQLs completos de `drizzle/0000_parallel_patriot.sql` e `drizzle/0001_kind_gertrude_yorkes.sql` pelo console D1. Aplicar a 0000 somente em um banco novo; preservar o histórico em bancos existentes.
3. Criar um API token Cloudflare com permissão **Account → D1 → Edit**, limitado à conta necessária.
4. Em **Vercel → Settings → Environment Variables**, cadastrar:

| Variável | Conteúdo |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare |
| `CLOUDFLARE_D1_DATABASE_ID` | UUID do banco D1 |
| `CLOUDFLARE_D1_API_TOKEN` | Token para leitura/escrita do D1 |
| `MAP_ADMIN_TOKEN` | Opcional: segredo aleatório de pelo menos 32 caracteres para a API administrativa |

Usar **Production**; previews devem apontar para um banco separado, se habilitados. Reimplantar após configurar as variáveis. Nunca colocar credenciais em `NEXT_PUBLIC_*`, commits, capturas ou mensagens. O arquivo `.env.vercel.example` contém apenas campos vazios; para teste local, copiar para `.env.local`.

Depois de conectar o banco, `/api/map` deve retornar 200 com `storage.configured: true` e `storage.mode: ready`. Configuração parcial, token inválido ou schema ausente retornam erro; isso não é tratado como mapa vazio. Nenhuma migração é aplicada durante requisições ou build.

## Administração e Instagram

Na Vercel, o login ChatGPT do Sites não existe. Os cabeçalhos de identidade do Sites são ignorados. Cadastro manual, revisão de comentários, remoção e ajuste de pontos exigem `Authorization: Bearer <MAP_ADMIN_TOKEN>` na API. O token permanece apenas no servidor ou na ferramenta administrativa; não há formulário de login administrativo na interface da Vercel nesta entrega. Participantes não precisam desse token: comentários válidos chegam pelo webhook assinado da Meta.

Instagram pode continuar desligado até a escolha da conta/post. Quando prontos, configurar também `INSTAGRAM_APP_SECRET`, `INSTAGRAM_VERIFY_TOKEN`, `INSTAGRAM_ACCOUNT_ID`, `INSTAGRAM_MEDIA_IDS` e, opcionalmente, `INSTAGRAM_PROFILE`. O callback será `https://SEU-DOMINIO/api/instagram/webhook`; os demais passos estão em [INTEGRACAO_INSTAGRAM.md](INTEGRACAO_INSTAGRAM.md). Ainda é necessário validar um comentário real; deploy bem-sucedido não comprova conexão com Instagram.

## Verificação local

```sh
npm ci
npm run build:vercel
npm run typecheck:vercel
npm run start:vercel -- --hostname 127.0.0.1 --port 5178
node --test tests/vercel.test.mjs tests/migrations.test.mjs
node tests/integration.mjs
node tests/integration.mjs --vercel
node tests/next-production-smoke.mjs http://127.0.0.1:5178
```

O build deve gerar `.next/routes-manifest.json` e listar as rotas `/api/map`, `/api/houses`, `/api/admin`, `/api/instagram/webhook` e `/modelos`. O fluxo Sites/Cloudflare continua usando `npm run build` fora da Vercel; com `VERCEL=1`, esse comando também seleciona Next.js.

Ao alternar entre builds Sites e Next.js no mesmo checkout, use `npm run typecheck:vercel` para regenerar os tipos do Next antes do TypeScript. A versão instalada do Vinext escreve seus próprios tipos em `.next/types/routes.d.ts`; misturá-los com o validador gerado pelo Next causa erro de tipos até a regeneração. Isso não exige mudar a saída `.next` da Vercel ou ignorar erros de TypeScript.

Referências oficiais: [Next.js na Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs), [API de consultas D1](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/).

## Evidência desta entrega (2026-10-16)

Build Next.js 16.3.4 aprovado, manifesto `.next/routes-manifest.json` gerado e rotas dinâmicas listadas. Build Vinext/Cloudflare também aprovado. 43 verificações de integração passaram com binding Sites e outras 43 usando o adaptador HTTP D1 em SQLite isolado; seis testes específicos da Vercel e dois de migração aprovados. O smoke usa o servidor Next em modo produção, sem credenciais externas. Não foi executado deploy na conta Vercel do usuário nem teste contra D1/Instagram reais.

## Correção da instalação limpa

A falha `Command npm ci exited with 1` foi reproduzida em uma pasta isolada com os arquivos versionados. O npm retornava `EUSAGE`: faltavam `@emnapi/core` e `@emnapi/runtime`, e o lockfile colocava `@emnapi/wasi-threads` numa versão incompatível com um ramo da árvore. A validação anterior tinha usado dependências já instaladas e não cobriu esse erro de instalação limpa.

O lockfile foi corrigido pelo npm em uma pasta sem `node_modules`. Dependências diretas, versões de Next/React/Three e comandos de produção foram mantidos. Não é necessário trocar `npm ci` por `npm install`, ignorar dependências ou usar `--force`/`--legacy-peer-deps`.

O workflow `.github/workflows/vercel-build.yml` verifica instalação limpa e build Next.js em Linux/Node 22 nos pushes da `main` e pull requests. Ele não usa banco, credenciais Meta ou segredos de produção. A Vercel deve usar o commit novo com `npm ci` e `npm run build:vercel`; um redeploy de um commit antigo ainda contém o lockfile incompleto.

Validação local da correção: `npm ci` real em pasta vazia instalou 694 pacotes, e o build Next.js feito com essas dependências passou compilação, TypeScript e geração do manifesto. A resolução das dependências Linux x64/glibc também passou em dry-run; isso não é uma execução Linux. Não foram usadas credenciais ou dados de produção.
