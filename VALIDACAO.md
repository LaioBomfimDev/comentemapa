# Validação desta entrega

Executado nesta sessão:

- TypeScript (`tsc --noEmit`): sem erros após ajustes de tipos.
- Build Vinext para Worker: concluído com rotas de mapa, cidades, casas, administração e webhook.
- 31 verificações de integração com SQLite isolado: banco vazio, nomes com e sem acentos, homônimos, UF conflitante, validação de perfil, autorização, origem, duplicação, fundador, HMAC, conta/post permitidos, revisão, exclusão e desafio Meta.
- Migração local D1 executada com cinco comandos bem-sucedidos; API local retornou mapa vazio e integração não configurada.
- Navegador real, desktop 1280 × 720: mapa geográfico renderizado, entrada administrativa local, busca Bauru SP, cadastro temporário, contador/coroa, recarga com persistência e remoção do teste confirmados.
- Tela 390 × 844 inspecionada. Corrigida separação de palavras ao ocultar quebras de linha no layout estreito. Viewport restaurado ao final.
- Painel Instagram: teste `@teste Curitiba PR` retornou Curitiba · PR sem criar uma casa.
- Banco de produção não recebeu cadastros de teste. O banco local voltou a zero casas após remoção do registro temporário.

Não executado: conexão com conta real Instagram, revisão/aprovação Meta, evento real de produção, teste de carga, teste em aparelho físico. A consulta automática às páginas Meta Developers foi limitada; o formato do webhook deve ser confirmado no teste real ao ativar a conta.

Limites operacionais: publicação privada nesta entrega. A ativação pública do receptor e a configuração de `MAP_ADMIN_USER_ID` fazem parte da etapa futura descrita em INTEGRACAO_INSTAGRAM.md.
