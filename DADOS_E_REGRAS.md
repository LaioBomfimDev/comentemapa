# Dados e decisões desta versão

- Nome “Brasil em Casas”, paleta, uma casa por perfil e fundador por ordem de cadastro são escolhas de implementação para a experiência pedida; não são decisões de marca definitivas.
- Pedido confirmado: mapa brasileiro inicialmente vazio, funcional, aguardando uma futura conta do Instagram. Implementação separada do jogo Godot.
- Malha dos 27 estados: serviço oficial IBGE, `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`. Simplificação mínima fornecida pelo serviço, projetada para SVG.
- 5.571 registros de cidades: [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros), arquivos `json/municipios.json` e `json/estados.json` baixados nesta execução. Este número descreve o catálogo fornecido, sem pretensão de certificar o total administrativo atual. Licença MIT preservada em `data/municipios-LICENSE.txt`.
- Posição da casa: coordenada da sede da cidade cadastrada; não é endereço residencial. Não há tiles de terceiros, chave de mapas, geolocalização do visitante ou serviço pago de geocodificação.
- Casas e comentários ficam no banco D1 da implantação. Preferências de interface não substituem o armazenamento no servidor.
- Mapa e novos imóveis usam malhas 3D próprias em Three.js/WebGL; SVGs anteriores preservados como arquivo visual. Nenhum código, marca ou asset do site de referência foi copiado.
- A primeira referência não pôde ser carregada no atendimento inicial. Posteriormente `naoeummapa.vercel.app` foi inspecionado no navegador: mapa em tela cheia, oceano azul, controles flutuantes, busca e detalhes. A nova UI segue essa organização com arte própria.
- Demonstração visual pedida: `@elielexgay`, prefeito em Salvador-BA. É fixture de apresentação, separada do banco e de moradores reais.
- Prefeito por maior pontuação foi confirmado pelo usuário em 2026-10-16. Valores, outros cargos e janelas de disputa continuam experimentais.
- Capacidade: versão inicial, sem teste de carga para campanhas grandes. O mapa agrupa casas por cidade; API ainda entrega a lista completa. Antes de grande campanha: paginação, limites de tráfego, política de retenção e teste de carga.
