# Cromo clássico: terceira ronda (abdominais, gola e meias creme)

Teste de 11/11/2026 no desktop com a RTX 5080: 18 trabalhos, cerca de 18 min no total. Esta ronda parte da segunda (`../resultado-comfy-v2/`).

## Abdómen

O Jon notou que a barriga parecia "banhas num homem magro". A máscara (`mascaras/mascara-abdomen.png`) vai do fundo do peito até ao cós das cuecas e não toca nos braços.

| Tentativa | O que mudou | Resultado |
|---|---|---|
| `abdomen` (4 seeds) | Prompt novo, com o manequim como referência | Copiou as "banhas" quase iguais. O modelo segue a imagem de referência. |
| `abdomen2` (4 seeds) | Sem o manequim como referência; zona preenchida com pele lisa | Perdeu o estilo: riscos gráficos, emenda visível e sem contornos laterais. |
| `abdomen3` (4 seeds) | Referência com a barriga alisada, mas com os contornos laterais e a linha do peito | **Escolhida a 1111202661**: seis abdominais naturais, oblíquos e sombra igual à do peito. A 62 ficou demasiado lisa, a 63 parece uma grelha e a 64 mudou o cós para preto. |

A silhueta original fica igual: o abdómen novo não acrescenta pele nos espaços entre o braço e o tronco. Com a camisola vestida não se vê nada do abdómen novo (0 pixels).

## Gola, punhos e banda das meias

- **A causa principal foi minha, no recorte das camadas (primeira e segunda rondas).** Os pixels quase iguais ao fundo (#E9DCC3) ficavam transparentes. O creme é quase dessa cor, por isso partes da gola e da banda das meias ficavam com buracos e via-se a pele por baixo. Daí vinham as "pintinhas laranja" e o tom rosado. Agora, dentro da silhueta do manequim, tudo o que a peça pinta fica na camada.
- Também tentei refazer só a gola e só as meias com IA (`gola` e `meias`, 3 seeds cada). Saíram com pintas e ainda brancas ou pêssego. Isso deveu-se em parte ao mesmo erro de recorte, e por isso não as usei.
- **Solução usada:** as peças escolhidas na segunda ronda, recortadas outra vez sem buracos. Fiz uma correção de cor para creme quente **#E8D9B5** só nos pixels brancos ou creme da gola, dos punhos e da banda das meias. A luz e a sombra mantêm-se; não toquei nos contornos, nas riscas douradas, no bordô nem na pele. As chuteiras são as mesmas da segunda ronda.

## Verificações (`relatorio.json`)

- Abdómen novo à vista com a camisola vestida: 0 pixels.
- Branco das cuecas à vista no boneco vestido: 0 pixels.
- Fora de cada camada, a diferença para o manequim é 0.

## Pesos (KB, tela de 512×1024)

| Ficheiro | WebP sem perdas | PNG otimizado |
|---|---|---|
| Manequim | 248,7 | 353,1 |
| Camisola | 64,7 | 94,7 |
| Calções | 34,4 | 55,5 |
| Meias + chuteiras | 45,1 | 71,0 |
| Composição completa | 263,9 | 373,0 |
| Metade (256×512) | 80,0 | — |
| Busto (128×128) | 13,8 | — |

## Ficheiros

- `camadas/`: o manequim e as 3 peças, em PNG e WebP.
- `a-composicao-completa*.png`: o boneco completo.
- `b-trocas.png`: o manequim e depois cada peça sozinha.
- `c-metade-*` e `c-busto-*`: as versões pequenas.
- `folha-contacto-seeds.png`: todas as tentativas, ampliadas 2×.
- `seeds/`: todas as camadas geradas.
- `mascaras/`: as máscaras desta ronda.
- `workflows/`: o grafo de cada trabalho, o pedido e o tempo.
- `prompts-seeds-tempos.json`: os prompts, as seeds e os tempos.
- `run_v3.py` e `post_v3.py`: os scripts desta ronda. `run_v2.py`, `post_v2.py` e `run_layers.py` também estão aqui, porque estes scripts precisam deles.
