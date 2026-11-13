# Cromo clássico: itens metálicos em pixel art

Família preto e dourado-champanhe do catálogo do Maestro, em 6 níveis: 01 Common, 02 Special, 03 Rare, 04 Epic, 05 Legendary e 06 Mythic. Há 6 slots: camisola (`shirts`), calções (`shorts`), meias (`socks`), chuteiras (`boots`), bola (`balls`) e galhardete (`pennants`). Ao todo são 36 itens. Gerado a 12–13/11/2026 com o **FLUX.1 Kontext dev FP8** na RTX 5080, com a seed 1111202911 e 74 trabalhos de ~15–50 s cada. A escolha do modelo vem do teste A/B em `ab/`.

## Como foi feito

- **Ícones** (`icones/gear-<slot>-0N.png`, 128×128): o Kontext converte o HD do catálogo em pixel art.
- **Meias, feitas de raiz** (o catálogo não as tem): o ícone foi gerado a partir dos calções do mesmo nível, como referência de desenho. Depois esse ícone serviu de referência para vestir as meias. As meias 02 e 05 saíram como calções com a seed por omissão e foram refeitas com a seed 1111202912; as rejeitadas não estão aqui.
- **Camadas vestidas** (`512/` e `256/`): inpainting só dentro da máscara do slot, num recorte do manequim ampliado 2×, com o item como referência.
  - Camisola e calções: uma camada por silhueta (`-m`, `-f`).
  - Meias e chuteiras: uma só camada, partilhada pelas duas silhuetas.
- **Bola e galhardete**: objetos com o tamanho da caixa do manifesto (512: 80×80 e 86×110; 256: 40×40 e 43×55), feitos a partir da mesma geração do ícone.
- **Acabamento, sem IA**:
  - a paleta de cada item vem só do seu HD (16 cores mais o contorno quase preto); as meias usam a dos calções do mesmo nível;
  - redução por área para a grelha final e quantização para essa paleta;
  - fundo dos ícones recortado a partir das bordas;
  - a pele redesenhada dentro da máscara sai da camada, para se ver a pele da base em qualquer tom;
  - a versão 256 é reduzida da 512 e quantizada outra vez.
- **Verificações**:
  - todos os 132 ficheiros têm alfa só 0 ou 255, por isso não há riscas;
  - 0 pixels azuis nas camadas 256.

## Ficheiros

- `metalicos.json`: para cada item, o slot, o nível (01–06), o grau, o nome, o HD de origem, o ícone, as camadas 256/512 e a silhueta.
- `folha-icones.png`: os 36 ícones (níveis × slots).
- `folha-vestidos.png`: o masculino e o feminino vestidos com o conjunto de cada nível, com bola e galhardete, a 512.
- `workflows/`: o grafo e o tempo de cada trabalho.
- `scripts/`: o pipeline (`gen_metal.py`).

## O que ainda se nota

- Nos níveis 04 e 06, o pé das meias tem um remate dourado que lembra uma bota.
- A meia 04 vestida tem uma banda creme um pouco irregular.
- As camadas vestidas fazem a ordem: base, meias, chuteiras, calções, camisola. A camisola tapa o cós dos calções, como no kit base.
