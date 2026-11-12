# Itens metálicos: teste A/B (FLUX.2 Klein 4B vs FLUX.1 Kontext dev FP8)

Teste de 12/11/2026 na RTX 5080. Itens: camisola gear-shirts-03 (Rare), chuteiras gear-boots-04 (Epic) e galhardete gear-pennants-06 (Mythic). 2 seeds por modelo (1111202901 e 02).

Em cada item há um **ícone** pixel art, gerado a partir do HD. Na camisola e nas chuteiras há também a **camada vestida** no manequim masculino: inpainting só dentro da máscara do slot, num recorte ampliado 2×.

**Passagem final, igual nos dois modelos e sem IA:** redução por área para a grelha final (ícone de 128×128; camada à escala do avatar) e quantização para uma paleta fixa. A paleta tem as 32 cores do Cromo clássico mais 12 cores metálicas tiradas do HD do item.

## Resultado (`folha-ab.png`)

- **Ícones:** o Kontext é muito mais fiel ao HD.
  - No galhardete mantém o hexágono e os louros; o Klein dá um triângulo preto sem motivo.
  - Nas chuteiras desenha a bota de lado, com o emblema; o Klein virou-a de frente e em par.
  - Na camisola mantém o chevron.
- **Camadas vestidas:** os dois servem. O Kontext fica um pouco mais perto do HD (chevron e emblema).
- **Tempo e VRAM** (`resumo.json`): média de 16,6 s no Klein e 15,1 s no Kontext. Pico de VRAM: 15,2 GB no Klein e 15,6 GB no Kontext. O pico inclui os modelos que o ComfyUI mantém em memória, por isso não é o consumo de cada modelo isolado.
- Um dos tempos do Klein (chuteiras vestidas, seed 01) ficou 0,025 s porque a ligação caiu a meio. Não conta para a comparação.

## Problemas da passagem final, a corrigir antes de gerar tudo

1. **O dourado-champanhe vira cobre/laranja.** A paleta partilha cores com a pele. Proposta: nos itens, quantizar só com a paleta metálica do item mais os contornos escuros.
2. **Nos ícones do Kontext fica um quadrado de fundo claro.** O fundo que gera não é exatamente o bege. Proposta: recortar o fundo por preenchimento a partir das bordas.
