# Cromo clássico: teste de camadas no ComfyUI local

Teste de 11/11/2026 no desktop com a RTX 5080 (ComfyUI 0.44.2). Fiz 12 trabalhos: 3 peças × 4 seeds.

## Como foi gerado

- Modelos iguais aos do piloto de 07/11: FLUX.2 Klein Base 4B FP8, `qwen_3_4b.safetensors`, `flux2-vae.safetensors`. Euler, 20 passos, CFG 5.
- Imagem base: manequim achatado sobre #E9DCC3 e ampliado 2× (768×2048, vizinho mais próximo).
- Referências (`ReferenceLatent`): o próprio manequim (pose), `jogador-equipado.png` e o ícone da peça.
- O ruído entra só dentro da máscara (`SetLatentNoiseMask`). No fim, `ImageCompositeMasked` repõe o manequim fora da máscara.
- Em Python, o resultado é reduzido para 384×1024 com BOX. A camada fica com alfa 255 dentro da máscara, onde o resultado difere do fundo, e 0 no resto.
- Verificação: fora de cada camada, a diferença máxima para o manequim é 0 (`relatorio.json`).

## Tempos

O primeiro trabalho demorou 102 s porque teve de carregar os modelos. Os restantes levaram entre 78 e 83 s cada. Os 12 juntos levaram cerca de 17 min. Detalhe em `prompts-seeds-tempos.json`.

## Seeds escolhidas

| Peça | Seed | Porquê |
|---|---|---|
| Camisola | 1111202601 | Gola creme canelada e punhos creme, como na referência. Riscas nítidas, emblema limpo, mangas bem assentes nos braços. A 03 é a mais nítida, mas tem a gola branca. A 04 tem um resto de pele sob a manga. |
| Calções | 1111202604 | É a única, com a 03, que tem o cós bordô. As riscas laterais estão direitas e a bainha limpa. A 01 e a 02 não têm cós bordô. |
| Meias + chuteiras | 1111202601 | Banda creme limpa e chuteiras pretas com atacadores creme e pitons castanhos. A 02 é demasiado lisa. A 03 e a 04 têm sinais parecidos com letras na banda. |

## Problemas de encaixe

- **Faixa cinzenta na cintura.** A máscara dos calções sobe até ao fundo da camisola interior cinzenta. Nas 4 seeds, o modelo manteve aí o cinzento e o elástico escuro do manequim. Na composição completa aparece uma faixa cinzenta entre a camisola e os calções. Correção proposta: baixar a máscara da camisola até cobrir essa faixa, ou repintar o cós com uma máscara própria.
- A bola encosta um pouco à chuteira esquerda. Não há mais espaço à direita na tela de 384 px.
- A textura de malha da camisola 01 aparece como ruído fino. Na miniatura de 54×144 isso desaparece.

## Ficheiros

- `camadas/`: camadas escolhidas, em PNG e em WebP sem perdas.
- `seeds/`: as 12 camadas.
- `a-composicao-completa*.png`: composição completa, com e sem fundo.
- `b-trocas.png` e `b-so-*.png`: uma peça de cada vez sobre o manequim.
- `c-miniatura-*`: miniatura 54×144 com 32 cores e ampliação 4×.
- `folha-contacto-seeds.png`: as 4 seeds de cada peça.
- `workflows/`: o grafo exato de cada trabalho (`*.api.json`), o pedido (`*.job.json`) e o tempo (`*.result.json`).
- `run_layers.py` e `post.py`: scripts de envio dos trabalhos e de pós-processamento.

## Pesos (KB)

| Camada | PNG otimizado | WebP sem perdas |
|---|---|---|
| Camisola | 110,4 | 79,0 |
| Calções | 45,7 | 29,5 |
| Meias + chuteiras | 76,7 | 52,6 |
| Manequim (referência) | 525,0 | 279,9 |
| Miniatura 54×144 | 7,4 | 2,5 |
