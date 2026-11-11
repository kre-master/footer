# Penteados v2: os 5 chumbados, refeitos para escolha

Aqui não se substituiu nada: os aprovados (m penteado-para-tras, m rapado, m encaracolado, m afro-curto, f coque) e os chumbados continuam em `../512/cabelo/` e `../256/cabelo/`.

## Como foram feitos

- Gerados sobre uma **base careca** (`base-careca-m.png`, `base-careca-f.png`), que serve só para gerar: o crânio da base rapada pintado no tom da pele, com o contorno da cabeça mantido.
- Cada camada é o que mudou em relação à base careca, por isso tem o cabelo inteiro, coroa incluída.
- Prompts novos:
  - nos rabos-de-cavalo, o cabelo de cima puxado para trás e com volume, ligado ao rabo, que cai **atrás** da cabeça;
  - nos outros, cabelo a cobrir a cabeça toda desde a linha do cabelo.
- 4 seeds por penteado (1111202761 a 64).

## Verificação: cabelo rente à vista

Sobre a base rapada (a que a app usa), ainda ficava algum cabelo rente à vista fora da camada nova: entre 31 e 1 410 px, conforme a seed (detalhe em `relatorio.json`). Esses pixels foram tapados com o tom de sombra do próprio cabelo. No fim ficam **0 px** de cabelo rente à vista em todas as 20 versões, e 0 px de cabelo sobre a cara.

## Ficheiros

- `folha-bustos-4x.png`: uma linha por penteado. À esquerda está o original chumbado; depois, as versões **1 a 4**, em bustos de 128×128 ampliados 4×, sobre o tom 4 e com o kit.
- `{512,256}/{sx}-{penteado}-{n}-{cor}.webp`: cada versão (n = 1 a 4) nas 6 cores, pronta para testar na app.
- `workflows/`: o grafo, o pedido e o tempo de cada trabalho.

Em algumas versões o tapar do cabelo rente vê-se como uma zona mais lisa de cabelo escuro (por exemplo, na versão 4 do comprido apanhado e na versão 4 do rabo-de-cavalo, de lado). Convém olhar para isso na escolha.
