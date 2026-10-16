# Dados e decisões desta versão

- Nome “Brasil em Casas”, paleta, uma casa por perfil e fundador por ordem de cadastro são escolhas de implementação para a experiência pedida; não são decisões de marca definitivas.
- Pedido confirmado: mapa brasileiro inicialmente vazio, funcional, aguardando uma futura conta do Instagram. Implementação separada do jogo Godot.
- Malha dos 27 estados: serviço oficial IBGE, `https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF`. Simplificação mínima fornecida pelo serviço, projetada para SVG.
- 5.571 registros de cidades: [kelvins/municipios-brasileiros](https://github.com/kelvins/municipios-brasileiros), arquivos `json/municipios.json` e `json/estados.json` baixados nesta execução. Este número descreve o catálogo fornecido, sem pretensão de certificar o total administrativo atual. Licença MIT preservada em `data/municipios-LICENSE.txt`.
- Posição da casa: coordenada da sede da cidade cadastrada; não é endereço residencial. Não há tiles de terceiros, chave de mapas, geolocalização do visitante ou serviço pago de geocodificação.
- Casas e comentários ficam no banco D1 da implantação. Preferências de interface não substituem o armazenamento no servidor.
- SVG e ícone de casa próprios. Nenhum código, marca ou asset do reel foi copiado.
- O site de referência não pôde ser carregado para inspeção visual; a mecânica foi baseada na legenda do reel acessível no primeiro atendimento.
- Capacidade: versão inicial, sem teste de carga para campanhas grandes. O mapa agrupa casas por cidade; API ainda entrega a lista completa. Antes de grande campanha: paginação, limites de tráfego, política de retenção e teste de carga.
