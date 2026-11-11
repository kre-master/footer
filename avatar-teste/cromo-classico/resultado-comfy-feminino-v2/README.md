# Cromo clássico: figura feminina v2 (olhos pequenos, corpo tonificado)

Afinação de 11/11/2026, pedida pelo Jon: olhos mais pequenos, como os do masculino, e corpo menos musculado, só tonificado e torneado. Foram 11 trabalhos na RTX 5080, ~11 min no total. A primeira versão continua em `../resultado-comfy-feminino/`.

## Corpo (`camadas/manequim-feminino.png`)

- Mesma técnica da v1: edição com máscara sobre o manequim masculino v3, acima da meia-canela. O prompt mudou: mulher magra, tonificada mas não musculada, braços e pernas sem músculos marcados, barriga lisa e olhos pequenos.
- Escolhi a **1111202693** de 4 versões. Tem os ombros e os braços finos, sem bíceps nem deltoides marcados, a barriga lisa com definição muito ligeira e as cuecas de corte feminino.
  - 91: ainda musculada e com olhos grandes.
  - 92: pernas desalinhadas na linha da meia-canela.
  - 94: ombros mais largos e manchas claras nos joelhos.
- **Altura**: o topo da cabeça e o chão estão nas mesmas linhas do masculino (13 e 986).
- **Meia-canela**: da meia-canela para baixo é igual ao masculino, pixel a pixel. Nas 60 linhas acima, passei para a perna feminina o grão fino da pele masculina (o pormenor da textura, sem mudar o contorno). Juntei uma transição de 16 linhas. A mudança de textura quase deixou de se notar.
- A mancha clara perto do joelho direito vinha da v1 e não existe nesta versão.

## Olhos

- A versão escolhida ainda tinha olhos grandes, com bloco de pestanas e muito branco. Por isso fiz uma edição só na zona dos olhos e das sobrancelhas (`mascaras/mascara-olhos.png`).
- Preenchi essa zona com pele lisa, para o modelo não copiar os olhos antigos. Usei a cara do masculino como modelo do desenho (`referencia-cara-masculina-4x.png`).
- Fiz 3 versões e escolhi a **1111202702**: olhos pequenos e estreitos, com pálpebra superior fina, íris escura e pouco branco, como no masculino. A 01 saiu esborratada e a 03 com pálpebras demasiado escuras.
- Acertei o tom da pele dentro da zona pelo tom à volta e suavizei a borda (`fem_eyes.py`).

## Camisola e calções

- Máscaras refeitas para a silhueta nova (`fem_masks.py`):
  - abaixo das mangas, a da camisola fica só no tronco, porque os braços mais finos estão onde antes era tronco;
  - a dos calções cobre as ancas e as coxas, mas não as mãos.
- Em cada peça, a seed escolhida na v1 e uma nova:
  - **camisola 1111202695**: mais limpa e justa. Na 82 as riscas partiam-se em baixo;
  - **calções 1111202681**: cós bordô bem marcado. A 95 ficou muito parecida.
- Recorte pelas máscaras, sem buracos no creme. A gola e os punhos estão em #E8D9B5, sem IA.

## Meias, chuteiras, galhardete e bola

- As meias+chuteiras continuam partilhadas e encaixam com 0 pixels de pele à vista, na figura feminina e na masculina.
- A bola foi 12 px para dentro e já não fica cortada pela borda da tela. Na comparação, o masculino também já tem a bola nesta posição.

## Verificações (`relatorio.json`)

- Fora de cada camada, a diferença para o manequim é 0.
- Branco do top ou das cuecas à vista na figura vestida: 0 pixels.
- Pele à volta das meias: 0 pixels.
- Altura igual à do masculino.

## Pesos (KB, tela de 512×1024)

| Ficheiro | WebP sem perdas | PNG otimizado |
|---|---|---|
| Manequim feminino | 137,9 | 198,3 |
| Camisola | 47,4 | 69,5 |
| Calções | 25,2 | 41,3 |
| Meias + chuteiras (partilhada) | 36,2 | 57,6 |
| Composição completa | 179,5 | 254,5 |
| Metade (256×512) | 58,8 | — |
| Busto (128×128) | 9,3 | — |

## Ficheiros

- `d-comparacao-masculino-feminino.png`: os dois lado a lado, despidos e vestidos, com linhas de altura.
- `b-trocas.png`: o manequim e depois cada peça sozinha.
- `a-composicao-completa*.png`: a figura completa.
- `c-metade-*` e `c-busto-*`: as versões pequenas.
- `folha-contacto-seeds.png`: todas as versões. A fila dos olhos está em grande plano.
- `camadas/`, `seeds/`, `mascaras/`, `workflows/` e `prompts-seeds-tempos.json`.
- Scripts:
  - `run_fem.py`: envia os trabalhos (manequim, olhos e peças);
  - `fem_build.py`: monta o manequim;
  - `fem_eyes.py`: junta os olhos novos;
  - `fem_masks.py`: cria as máscaras;
  - `fem_socks.py`: testa a partilha das meias;
  - `post_fem.py`: faz as composições;
  - `run_layers.py`, `run_v2.py` e `post_v2.py`: rotinas comuns.

## O que ainda se nota

- O desenho feminino é um pouco mais liso e com menos grão do que o masculino.
- A ampliações grandes vê-se uma ligeira diferença de tom no lado direito da zona dos olhos.
