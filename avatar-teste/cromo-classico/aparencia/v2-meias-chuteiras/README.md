# Meias e chuteiras separadas (proposta para aprovar)

Ainda não substitui nada: o manifesto e `kit/meias-chuteiras.webp` da liga ficam como estão até o Jon aprovar.

## Como foram feitos

- **Meias** (`{512,256}/meias-{1..4}.webp`): geradas à parte no ComfyUI, por inpainting com máscara na base descalça. A máscara vai do joelho para baixo e cobre o pé todo. Usei as meias atuais como referência de estilo (bordô canelado com banda creme). Fiz 4 seeds (1111202781 a 84).
  - O recorte é por máscara: dentro da perna nada conta como fundo, porque a banda creme é quase da cor do fundo.
  - Pele à vista abaixo do topo da meia, com as meias sozinhas: 31 a 46 px por versão (contornos à volta do pé); ver `relatorio.json`.
- **Chuteiras** (`{512,256}/chuteiras.webp`): recortadas da camada antiga, sem IA. São o couro, os atacadores, as solas e os pitons, do topo da chuteira para baixo; no topo da chuteira, os pixels bordô continuam a ser meia.

## Folha (`folha-meias-chuteiras-2x.png`, 2×)

- (b) só as chuteiras sobre a base, sem meias, ao lado da camada antiga;
- para cada versão 1 a 4: (a) só as meias sobre a base, sem chuteiras; (c) meias e chuteiras juntas; e a camada antiga ao lado.

Ordem proposta: galhardete, base, meias, chuteiras, calções, camisola, barba, cabelo, bola. Na liga, as meias dão Passe e as chuteiras Velocidade (não muda a arte).
