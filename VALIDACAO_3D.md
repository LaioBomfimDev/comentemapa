# Entrega visual 3D — 2026-10-16

Pedido: cenário em tela cheia e UI próxima da referência; exemplo do prefeito @elielexgay em Salvador; mostrar todos os modelos e esclarecer se são 3D.

Implementado: WebGL com Three.js, malha geográfica IBGE extrudada, vegetação instanciada, luz/sombras, zoom/pan/rotação, busca por cidade e perfil, ficha do imóvel, ranking, galeria `/modelos`, cinco GLBs e os SVGs originais preservados. A demonstração é fixture visual separada de moradores reais e pode ser ocultada.

Verificado nesta sessão:

- 41 verificações de integração SQLite aprovadas, sem uso de banco de produção.
- 6 testes dos GLBs: carregamento GLTFLoader, posições/normais finitas, dimensões, base e recursos independentes.
- 2 testes de migração: atualização do schema publicado preserva morador; schema local com tabela de atos já existente preserva interações e cria índices.
- TypeScript e build verificam a nova rota de modelos e código 3D.
- Navegador desktop e largura estreita: Brasil renderizado em WebGL, Salvador selecionável, busca pelo perfil da demonstração, cinco modelos visíveis na galeria.
- Prefeitura girada por arrasto no navegador: fachada e lateral mudam conforme a câmera, confirmando volume 3D.
- Arte criada por código; sem crédito PixelLab, serviço pago de imagem ou compra.

Limites: não houve ligação com Instagram real, campanha pública, teste de carga ou aparelho físico. A demonstração não testa chegada de comentário Meta. A organização visual acompanha a referência, mas seus códigos e assets não foram copiados. Os achados de repetição de pontuação e menções continuam pendentes; a correção de migração está descrita na revisão.
