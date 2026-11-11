# Cromo clássico: aparência (tons de pele e cabelos)

Ronda de 11/11/2026 nos dois manequins: o masculino v3 e o feminino v2. Foram 25 trabalhos na RTX 5080, ~16 min no total. Os tons de pele e as cores de cabelo são feitos sem IA.

## Ordem das camadas

base (pele) → meias+chuteiras → calções → camisola → cabelo

## 1. Bases de cabelo rapado (`base-rapada-m.png`, `base-rapada-f.png`)

- Edição com máscara só na zona do cabelo atual; a cara não foi tocada.
- Antes da edição, preenchi a zona com a forma do crânio no tom da pele, para o modelo não voltar a desenhar o cabelo antigo.
- Seeds escolhidas:
  - **masculino 1111202711**: corte rente e contorno limpo;
  - **feminino 1111202714**: corte rente com textura e orelhas naturais. Repeti a feminina sem as orelhas na máscara, porque nas primeiras seeds (11 e 12) saíam desbotadas.
- Fora da cabeça, as bases são iguais aos manequins originais, pixel a pixel.

## 2. Tons de pele (`512/bases/`, `256/bases/`): 6 tons, sem IA

- **Máscara de pele**: pixels quentes. Ficam de fora as cuecas e o top, o cabelo, os olhos, as sobrancelhas, o bigode e o contorno escuro.
- **Mapeamento por luminância**: cada pixel de pele vai para a rampa do tom (sombra, meio, luz), de forma a a sombra relativa se manter. O tom 4 é o atual, sem alterações.
- **Pele nas camadas de roupa**: tirei-a toda (alfa 0): pescoço na camisola, braço por baixo da manga, coxa nos calções e barriga da perna nas meias. Assim vê-se sempre a pele da base, no tom escolhido. As chuteiras não são tocadas, porque o couro castanho e os pitons não são pele.
- **Verificação nas 6 versões vestidas**: 0 pixels de pele no tom antigo, nos dois manequins.

## 3. Penteados como camadas (`512/cabelo/`, `256/cabelo/`)

O cabelo é desenhado por cima da camisola. Cada camada é o que mudou em relação à base rapada; nunca tapa a cara (0 pixels sobre a cara).

| Manequim | Penteado | Seed | Notas |
|---|---|---|---|
| Masculino | penteado-para-tras | (o atual) | Tirado do manequim original |
| Masculino | rapado | — | É a própria base, sem camada |
| Masculino | encaracolado | 1111202721 | |
| Masculino | afro-curto | 1111202724 | Repetido com a zona da cara mais estreita: nas primeiras seeds o afro ficava cortado a direito junto à cara |
| Masculino | comprido-apanhado | 1111202722 | Rabo-de-cavalo atrás; o topo fica rente, como um undercut |
| Feminino | coque | (o atual) | Tirado do manequim original |
| Feminino | rabo-de-cavalo | 1111202721 | |
| Feminino | curto | 1111202721 | A 22 quase não mudou o cabelo |
| Feminino | encaracolado-solto | 1111202722 | Caracóis mais definidos do que na 21 |
| Feminino | trancas | 1111202724 | Repetido com a máscara até ao peito e um prompt mais claro. A 25 (cornrows) também ficou boa |

Limpeza das camadas:

- tirei a pele que o modelo redesenhou (orelhas, pescoço) e umas manchas brancas parecidas com brincos;
- os buracos e os espaços de fundo entre o cabelo e o queixo ficaram preenchidos com o tom de sombra do próprio cabelo.

## 4. Cores de cabelo, sem IA

Há 6 cores: **preto**, **castanho-escuro**, **castanho**, **ruivo**, **loiro** e **grisalho**. Cada uma é uma rampa por luminância e o contorno quase preto fica igual. O bigode faz parte da base e mantém-se escuro em todas as cores. Não o separei numa camada.

## 5. Exportação

- `512/` (tela de 512×1024) e `256/` (meia escala, 256×512, a da maqueta), em WebP q90. A meia escala é reduzida por área com alfa pré-multiplicado, para não haver orlas escuras.
  - `bases/{m,f}-pele-{1..6}`
  - `cabelo/{m,f}-{penteado}-{cor}`
  - `kit/{m,f}-camisola`, `kit/{m,f}-calcoes` e `kit/meias-chuteiras` (sem pele)
- `busto/{m,f}-pele-{1..6}.webp`: busto de 128×128 **centrado na cabeça**. A cabeça masculina está 34 px à direita do centro da tela, por isso não pode ser cortado ao centro da tela.
- `centros-cabeca.json`: centro e caixa da cabeça de cada manequim, e a caixa do busto. A app pode cortar qualquer combinação no sítio certo; em meia escala, basta dividir por 2.
- Grelhas:
  - `grelha-{m,f}-tons-x-penteados.png`: os 6 tons × os penteados, vestidos, em meia escala. As cores de cabelo vão variando para mostrar a mistura;
  - `grelha-{m,f}-penteados-x-cores.png`: cada penteado nas 6 cores (tom 4).
- `relatorio.json`: verificações e pesos de cada ficheiro.

## Pesos (WebP q90)

| Conjunto | 512×1024 | 256×512 |
|---|---|---|
| Base por tom (média) | ~59 KB | ~23 KB |
| Camada de cabelo (média) | ~5 KB | ~2,4 KB |
| Camada de kit (média) | ~12 KB | ~5,6 KB |
| Busto de 128×128 | — | ~4–6 KB |
| Total dos 71 ficheiros | ~1,05 MB | ~0,44 MB |

Um jogador completo em meia escala (base, 3 peças de kit e cabelo) pesa ~49 KB.

## Pontos a melhorar

- O bigode não é uma camada à parte.
- No comprido-apanhado, o topo da cabeça fica rente.
- O estilo feminino é um pouco mais liso do que o masculino.

## 6. Bigode e barbas (camada «barba», só no masculino)

- **Base sem bigode** (`base-rapada-m-sem-bigode.png` e os 6 tons em `bases/m-pele-*`):
  - o bigode saiu sem IA: é uma máscara só nos pixels escuros entre o nariz e a boca (as narinas e a linha da boca ficam fora);
  - cada linha foi preenchida com a pele que fica à esquerda e à direita, para manter o gradiente da cara;
  - fora da máscara a diferença é 0 nos 6 tons. Os tons usam as estatísticas de pele da base com bigode, por isso o resto da pele não muda.
- **4 estilos** (`{512,256}/barba/m-{estilo}-{cor}.webp`, 6 cores cada; o estilo «sem» não tem ficheiro):

  | Estilo | Origem |
  |---|---|
  | bigode | O bigode original, tirado da base |
  | barba-por-fazer | Inpainting, seed 1111202753 (segunda tentativa, com um prompt mais leve; a primeira dava barba cheia) |
  | barba-curta | Inpainting, seed 1111202751 |
  | pera | Inpainting, seed 1111202754, com uma máscara só no queixo (com a máscara grande dava barba no maxilar) |

- Cada camada guarda só o que mudou em relação à base sem bigode e fica só sobre a cara, nunca sobre o fundo. Pinta-se nas 6 cores de cabelo sem IA; nas barbas pinta-se também o preto puro, porque a barba é quase toda preta.
- Nova ordem: galhardete, base, meias, calções, camisola, **barba**, cabelo, bola. No `256/manifesto.json` entraram a camada «barba», a lista de estilos e, por omissão, «bigode» no masculino.
- `grelha-m-barbas-x-cores.png`: os 4 estilos × as 6 cores, nos tons de pele 1, 4 e 6.
- Correções nesta ronda:
  - nas camadas de cabelo, alguns blocos de fundo junto à cara tinham ficado preenchidos com cabelo (106 a 460 px por camada). O preenchimento agora usa o contorno da cara e não a caixa;
  - o penteado-para-trás original perdeu a patilha abaixo da orelha, que era o contorno do maxilar e ficava clara nas cores loiro e grisalho.
- Em loiro e grisalho, a barba curta e a barba por fazer cobrem o contorno do maxilar, como uma barba real.
