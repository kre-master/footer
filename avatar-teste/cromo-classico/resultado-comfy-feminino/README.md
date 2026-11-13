# Cromo clássico: versão feminina

Teste de 11/11/2026 no desktop com a RTX 5080. O modelo e os parâmetros são os mesmos das rondas anteriores. Foram 10 trabalhos, ~12 min no total. Esta versão parte do manequim masculino da terceira ronda (`../resultado-comfy-v3/`).

## 1. Manequim feminino (`camadas/manequim-feminino.png`)

- Fiz uma edição com máscara sobre o manequim masculino v3. A máscara (`mascaras/mascara-corpo-feminino.png`) cobre tudo acima da meia-canela (linha 800). Da meia-canela para baixo, as canelas e os pés são os do masculino, pixel a pixel (confirmado).
- Referências usadas:
  - o manequim masculino, para a pose;
  - o estudo Futsal 90 (`../referencia-feminina/futsal90-figura.png`), passado a sépia sobre o fundo bege (`referencia-sepia-usada.png`). Assim passa o corpo e a cara, mas não o equipamento nem as cores.
- Fiz 4 versões e escolhi a **1111202671**: coque alto bem definido, cara limpa, corpo atlético e cabelo fora dos ombros. A 72 e a 74 têm caracóis soltos com fita de cabelo; a 73 também é boa, mas tem o coque menos alto.
- **Altura**: o chão está na mesma linha. O topo do coque fica 6 px acima do topo da cabeça masculina (veja as linhas azuis em `d-comparacao-masculino-feminino.png`).
- **Recorte**: o fundo redesenhado tem um tom ligeiramente diferente. Por isso recortei por "flood fill" a partir das bordas, em vez de comparar com a cor do fundo.
- **Costura na meia-canela**: suavizei-a com uma transição de 16 linhas. Sem meias ainda se nota uma ligeira mudança de textura na canela; com meias fica tapada.

## 2. Meias e chuteiras partilhadas (`camadas/meias-chuteiras-partilhada.png`)

- É a camada masculina v3 sem a faixa de pele da barriga da perna que estava por cima das meias.
- Por cima do manequim feminino não fica pele nenhuma à vista à volta das meias: **0 pixels** (no masculino também é 0). Detalhe em `teste-partilha-meias.json` e `teste-partilha-meias.png`.
- Por isso **partilha-se** e não é preciso uma variante feminina. Esta mesma camada serve também para o masculino.

## 3. Camisola e calções

- Máscaras novas na silhueta feminina (`mascaras/`):
  - a da camisola começa no pescoço, nunca na cara, e desce 35 px por cima dos calções;
  - a dos calções cobre as cuecas e não apanha as mãos.
- Prompts e referências iguais às do masculino (jogador equipado e ícone de cada peça), mais "women's fit". Fiz 3 versões de cada.
- **Camisola: 1111202682.** A bainha canelada desce mais e tapa a cintura; gola e riscas nítidas. A 81 ficou com a bainha alta; a 83 também é boa.
- **Calções: 1111202681.** Cós bordô bem marcado e riscas creme direitas. A 82 tem o cós fino e a 83 ficou parecida com a 81.
- **Recorte pelas máscaras**: dentro da silhueta fica tudo o que a peça pinta, sem buracos nos tons creme. Fora da silhueta fica só o que difere do fundo.
- **Gola e punhos**: pus a gola e os punhos em creme #E8D9B5 sem IA, mantendo a luz e a sombra.

## 4. Galhardete e bola

São os mesmos do masculino e estão nas mesmas posições.

## Verificações (`relatorio.json`)

- Fora de cada camada, a diferença para o manequim é 0.
- Branco do top ou das cuecas à vista na figura vestida: 0 pixels.
- Pele à volta das meias partilhadas: 0 pixels.

## Pesos (KB, tela de 512×1024)

| Ficheiro | WebP sem perdas | PNG otimizado |
|---|---|---|
| Manequim feminino | 153,0 | 219,9 |
| Camisola (feminina) | 54,9 | 78,4 |
| Calções (femininos) | 29,2 | 46,9 |
| Meias + chuteiras (partilhada) | 36,2 | 57,6 |
| Composição completa | 199,0 | 279,6 |
| Metade (256×512) | 65,5 | — |
| Busto (128×128) | 11,0 | — |

## Ficheiros

- `camadas/`: o manequim feminino, as peças femininas e as meias partilhadas.
- `a-composicao-completa*.png`: a figura completa.
- `b-trocas.png`: o manequim e depois cada peça sozinha.
- `c-metade-*` e `c-busto-*`: as versões pequenas.
- `d-comparacao-masculino-feminino.png`: as duas figuras lado a lado.
- `folha-contacto-seeds.png`: todas as versões.
- `seeds/`: as camadas de todas as versões.
- `workflows/`: o grafo, o pedido e o tempo de cada trabalho.
- `prompts-seeds-tempos.json`: os prompts, as seeds e os tempos.
- Scripts:
  - `run_fem.py`: envia os trabalhos;
  - `fem_build.py`: monta o manequim;
  - `fem_socks.py`: testa a partilha das meias;
  - `fem_masks.py`: cria as máscaras;
  - `post_fem.py`: faz as composições;
  - `run_layers.py`, `run_v2.py` e `post_v2.py`: rotinas comuns de que estes dependem.

## Pequenos defeitos à vista

- Há uma mancha de pele mais clara na barriga da perna direita, perto do joelho. Vê-se no manequim e, um pouco, acima das meias.
- O coque fica 6 px mais alto do que a cabeça masculina.
