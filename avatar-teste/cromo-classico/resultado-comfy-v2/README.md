# Cromo clássico: segunda ronda (manequim de cuecas brancas)

Teste de 11/11/2026 no desktop com a RTX 5080. Usei o mesmo modelo e os mesmos parâmetros da primeira ronda (`../resultado-comfy/`). Fiz 10 trabalhos, que levaram cerca de 13 min no total.

## O que mudou

1. **Manequim novo** (`manequim-cuecas-brancas.png`): tem tronco nu e cuecas brancas simples. Só mudou a zona da camisola interior e dos calções de compressão (`mascaras/mascara-roupa-interior.png`); o resto é o manequim original, pixel a pixel. Fiz 4 seeds e escolhi a **1111202612**. É a versão em que a pele do tronco bate com a dos braços e a sombra é mais limpa. Na 11 e na 13 o tronco ficou mais claro do que os braços, e a 14 ficou esborratada. As cuecas saíram em boxer curto, porque a máscara segue a forma dos calções antigos.
2. **Máscaras v2** (`mascaras/`):
   - A da camisola desce 35 px abaixo do topo da dos calções, por toda a largura do tronco, e preenche os degraus da bainha.
   - A dos calções cobre as cuecas por inteiro.
   - A das meias+chuteiras não mudou.
3. **Peças refeitas**: para cada peça, a seed escolhida na primeira ronda e uma seed nova (1111202621). A camisola e os calções têm uma frase extra no prompt: camisola comprida e metida para dentro, e cós alto.
4. **Limpeza da cintura**:
   - Onde a camisola e os calções se sobrepõem, a camada da camisola só guarda o que foi realmente pintado. Os pixels que ficaram iguais ao manequim (pele ou cuecas) e os brancos saem da camada.
   - Onde os calções saíram mais estreitos do que as cuecas, preenchi o espaço com a cor do contorno escuro.
   - Resultado: 0 pixels das cuecas à vista no boneco vestido (ver `zoom-cintura.png`). Os únicos brancos que sobram são reflexos da pele na cabeça, nos ombros e nos braços.
5. **Tela de 512×1024**: o manequim está centrado e com a mesma escala, para o galhardete e a bola terem espaço.
6. **Versões pequenas** (substituem a miniatura de 54×144, que ficava desfocada):
   - `c-metade-256x512.png`: metade do tamanho (o boneco fica com 192×512). Foi reduzida por área numa proporção certa de 2:1. A versão `c-metade-ampliada-2x.png` é a mesma imagem ampliada com vizinho mais próximo.
   - `c-busto-128.png`: só cabeça e gola, a partir de um recorte de 256×256 reduzido 2:1, para usar em listas. Há também `c-busto-ampliado-4x.png`.

## Seeds escolhidas

| Peça | Seed | Porquê |
|---|---|---|
| Manequim | 1111202612 | Pele do tronco igual à dos braços, sombra limpa. |
| Camisola | 1111202621 | A bainha canelada desce mais e tapa a cintura. Riscas e gola mais nítidas. Com a 01 via-se uma tira das cuecas por baixo da bainha. |
| Calções | 1111202621 | Cós bordô, riscas creme direitas e contorno mais nítido do que na 04. |
| Meias + chuteiras | 1111202601 | Meias caneladas e chuteiras com mais detalhe. A 21 saiu lisa demais. |

## Tempos

Os primeiros trabalhos de cada fase incluem o carregamento do modelo: 104 s no manequim e 146 s na camisola. Os outros trabalhos do manequim levaram ~41 s cada. Cada peça levou ~78 s. Detalhe em `prompts-seeds-tempos.json`.

## Pesos (WebP sem perdas, tela de 512×1024)

| Ficheiro | WebP KB | PNG KB |
|---|---|---|
| Manequim | 248,1 | 482,2 |
| Camisola | 64,1 | 93,7 |
| Calções | 34,1 | 54,3 |
| Meias + chuteiras | 42,1 | 66,3 |
| Composição completa | 272,9 | 381,3 |
| Metade (256×512) | 82,0 | — |
| Busto (128×128) | 14,1 | — |

Os valores exatos estão em `relatorio.json`. Fora de cada camada, a diferença para o manequim é 0.

## Problemas que ainda se veem

- A banda das meias tem um tom ligeiramente rosado; deveria ser creme puro.
- A gola da camisola 21 é quase branca. O pedido era creme.
- As cuecas são boxer curto e não slip, porque a máscara tem a forma dos calções antigos.

## Ficheiros

- `camadas/`: o manequim e as 3 peças escolhidas, em PNG e WebP, na tela de 512×1024.
- `seeds/`: todas as camadas geradas.
- `a-composicao-completa*.png`: o boneco completo, com galhardete e bola.
- `b-trocas.png`: o manequim e depois cada peça sozinha.
- `folha-contacto-seeds.png`: todas as seeds.
- `zoom-cintura.png`: ampliação da cintura.
- `workflows/`: o grafo exato de cada trabalho, o pedido e o tempo.
- `run_v2.py`, `post_v2.py` e `run_layers.py`: os scripts.
