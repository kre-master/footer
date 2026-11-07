# Footer — Cartas evolutivas e equipamento RPG

**Data:** 7 de novembro de 2026

**Estado:** Conceito clarificado; infraestrutura de geração local operacional; integração na aplicação por planear e implementar.

**Origem:** documento de conceito de 6 de novembro, clarificado com o utilizador em 7 de novembro.

## Visão

A carta de cada jogador não é uma imagem fixa. É uma composição modular com elementos visuais independentes que podem ser adquiridos, equipados e melhorados. Paralelamente, o jogador possui um inventário de equipamento inspirado em RPG, com vários *slots* e itens evolutivos.

O objetivo é combinar identidade visual, progressão e personalização, mantendo separadas as estatísticas reais do futebol e quaisquer mecânicas de jogo virtuais.

**As cartas e os equipamentos metálicos são apenas uma de várias famílias estéticas possíveis.** O catálogo metálico existente é uma primeira coleção, não uma restrição para as coleções seguintes. Podem explorar-se outras linguagens, materiais e acabamentos: tecido, couro, madeira, pedra, vidro, desenhos ilustrados, estilos desportivos, entre outros. Estes exemplos são possibilidades, não um catálogo fechado.

**O brilho/glow também é variável e opcional.** Uma carta ou um equipamento pode existir sem glow, com glow discreto ou com efeitos mais expressivos. Material, estilo, raridade, nível de evolução e efeitos luminosos são dimensões distintas; não devem ficar obrigatoriamente associados.

## 1. Personalização da carta (Card Customization)

Cada camada tem variantes e, potencialmente, níveis de evolução próprios:

| Camada | Função | Exemplos de variantes |
|---|---|---|
| Fundo | Cenário e ambiente da carta | Relvado, estádio iluminado, galáxia, ilustração, carbono |
| Moldura | Forma, material e contorno | Metal, madeira, pedra, vidro, moldura ilustrada |
| Ornamentação da moldura | Detalhes decorativos, emblemas e relevos | Simples, desportivo, épico, lendário |
| Aura exterior (nome provisório; anteriormente «glória externa») | Halo fora da carta, partículas e efeitos | Sem aura, brilho suave, eletricidade, fogo, efeito cósmico |

As quatro camadas devem poder ser alteradas **independentemente**, sem obrigar a gerar uma imagem completa para cada combinação. Bronze, prata e ouro são exemplos de uma família metálica, não a única direção artística nem uma progressão obrigatória para todas as famílias.

O glow da carta e dos equipamentos deve poder variar, conforme o efeito escolhido, em:

- Presença ou ausência.
- Cor e intensidade.
- Extensão e distribuição: contorno, zonas específicas, halo ou partículas.
- Comportamento estático ou animado.

Os reflexos e o acabamento de um material são diferentes de uma aura luminosa. Uma moldura metálica pode ter reflexos sem emitir glow; uma moldura não metálica pode receber uma aura. Quando se pretender controlar o glow separadamente, deve existir uma versão base sem esse efeito incorporado na imagem.

## 2. Equipamento do jogador (Player Equipment)

Itens que o jogador pode guardar no inventário, selecionar e **equipar**, à semelhança de um RPG:

- Chuteiras / sapatilhas
- Bola
- Camisola
- Calções
- Galhardete
- Outros slots a definir no futuro

Cada item pode ter:

- Identidade / nome e categoria de slot.
- Família estética, aparência, materiais, cores e variantes, incluindo opções não metálicas.
- Raridade (por exemplo: comum, raro, épico, lendário).
- Nível de evolução (por exemplo, 1–10).
- Marcos de evolução visual (por exemplo, nos níveis 1, 5 e 10).
- Glow opcional e configurável, separado da aparência base quando aplicável.
- Estado: equipado ou no inventário.
- Eventuais atributos / bónus virtuais, **ainda por decidir**.

**Distinção importante:** raridade e nível de evolução não são a mesma coisa. Um item raro pode estar no nível 1, e um item comum pode ter sido bastante melhorado. Raridade elevada não obriga a um material metálico nem a um glow intenso.

## 3. Composição técnica da carta

Proposta inicial de camadas, de baixo para cima:

1. Fundo.
2. Fotografia recortada do jogador.
3. Equipamento visual aplicável à imagem ou apresentado em slots próprios.
4. Interface e dados: nome, rating, posição e estatísticas.
5. Moldura.
6. Ornamentação.
7. Aura exterior, incluindo possíveis animações.

**Nota:** a ordem definitiva depende da direção artística. Alguns elementos de equipamento (como bola e galhardete) poderão funcionar melhor em slots específicos do que sobre a fotografia. Efeitos de equipamento podem precisar de camadas próprias junto do respetivo item.

Arquitetura proposta: recursos gráficos transparentes (WebP/PNG; SVG quando adequado) sobrepostos dinamicamente pela aplicação. Auras animadas podem usar efeitos CSS/canvas ou ficheiros otimizados. Os textos e números devem ser desenhados pela aplicação, não gerados pela IA.

Isto permite produzir numerosas combinações com um catálogo limitado de recursos e facilita a adaptação a telemóvel. Alterar apenas o glow não deve obrigar a gerar novamente a carta ou o equipamento base.

## 4. Criação de recursos gráficos com IA local

**Fluxo pretendido pelo utilizador:** gerar e editar imagens localmente no **ComfyUI instalado no desktop Windows com a RTX 5080**, aproveitando esse computador para produzir variantes de cartas, molduras, chuteiras e outros equipamentos, sem depender do Astra ou de serviços de geração de imagem na cloud.

A assistência consiste em preparar e ajustar workflows, prompts, referências e lotes de variantes; a geração das imagens deve correr nos modelos locais do desktop. Esta preferência pela geração local não significa que a conversa com o assistente passe a correr localmente.

Abordagem proposta:

1. Partir da instalação e dos modelos já verificados: FLUX.2 Klein Base 4B FP8, codificador `qwen_3_4b.safetensors` e VAE `flux2-vae.safetensors`, a correr na RTX 5080. Outros modelos podem ser avaliados quando houver uma necessidade concreta de qualidade, edição ou desempenho.
2. Escolher uma geometria base para as cartas e fixar escala, perspetiva, enquadramento e dimensões para os equipamentos. Cada coleção pode ter uma linguagem visual própria, mantendo compatibilidade de composição.
3. Começar com um pequeno lote: uma moldura e uma chuteira, explorando variantes metálicas e não metálicas. Usar referências e edição de imagem quando necessário para preservar a identidade do objeto.
4. Gerar bases sem glow incorporado quando esse efeito deva ser independente. Produzir separadamente as auras ou implementá-las na aplicação.
5. Separar e finalizar os componentes, com transparência e dimensões padronizadas. Figma, Photopea ou ferramenta equivalente podem ajudar na revisão e no acabamento; não se assume que o modelo devolve transparência correta automaticamente.
6. Criar variantes e progressões visuais por marcos, não uma imagem diferente para cada nível. Guardar workflow, modelo, prompt, seed, referências e parâmetros para permitir retoma e comparação.
7. Compor os recursos na Footer a partir do inventário e equipamento guardados na base de dados.

**Primeiro teste local validado em 7 de novembro:** uma chuteira em tecido e uma carta em papel, editadas a partir dos originais no FLUX.2 Klein Base 4B FP8. Os jobs demoraram 32,458 s e 19,635 s, respetivamente. São prévias sem glow, com fundo opaco; a preparação de transparência e camadas continua pendente. Imagens, prompts e workflows estão guardados em `/home/joao/maestro/output/footer-comfy-pilot-2026-11-07/`.

Os modelos de imagem são ferramentas para criar **assets**, não para gerar a carta final completa a cada utilização.

### Acesso ao desktop

- O Maestro tem um comando Wake-on-LAN existente para acordar o desktop.
- O utilizador acede ao Windows remotamente através do Parsec.
- A ligação do assistente à API do ComfyUI deve usar a rede privada / Tailscale existente.
- Não abrir portas no router. Não expor SMB ou RDP.
- Em 7 de novembro, nesta sessão, o Wake-on-LAN foi executado com sucesso. O utilizador abriu a instância local ComfyUI e executou o guião de ligação: a API local na porta 8188 ficou acessível ao Maestro pelo Tailscale na porta 18188. A leitura de `/system_stats` confirmou ComfyUI 0.44.2 e a NVIDIA GeForce RTX 5080 em CUDA; a fila estava vazia.
- O encaminhamento foi criado com `--bg`: fica guardado e retoma quando o Tailscale arranca, sem repetir o comando. SSH por chave foi depois configurado e verificado. O Maestro já consegue acordar o desktop e iniciar o motor em segundo plano, sem Parsec, com `python3 /home/joao/maestro/infra/bin/footer-comfy start`; o serviço do Maestro mantém a sessão SSH. Este arranque é a pedido, não um programa que arranca sempre no login Windows. O teste isolado reconheceu a RTX 5080 em sessão Windows 0; a instância principal foi preservada.

### Utilização pelo Claude e por outros assistentes

**Esta infraestrutura pertence ao ambiente do utilizador no Maestro e pode ser reutilizada por outros assistentes autorizados.** Foi configurada e testada com o Codex, mas os comandos, os serviços, a instalação ComfyUI e as credenciais do sistema não dependem de uma conversa ou de um modelo específico.

O Claude com terminal no Maestro, a executar no contexto do utilizador Linux `joao` e com as permissões necessárias de execução/rede, pode usar os mesmos comandos. A chave SSH e o cliente pertencem a esse utilizador, fora do projeto. As permissões concedidas às ferramentas do Codex não são automaticamente permissões das ferramentas do Claude; o ambiente do Claude pode pedir autorização para executar um comando.

Um assistente que receba apenas este Markdown, sem terminal nem ligação ao Maestro, recebe o contexto e o plano. Para operar o sistema, precisa também desse acesso autorizado ao Maestro. Se o Claude estiver no portátil ou noutro computador, os caminhos abaixo referem-se ao Maestro, não ao computador onde o chat está aberto. A execução pelo Claude não foi testada na sessão de origem; em 7 de novembro o Claude, no Maestro, confirmou `footer-comfy status` = `ready` com a RTX 5080.

### Comandos e recursos já disponíveis

Executar no Maestro, como `joao`, a partir de qualquer pasta:

```bash
# Consultar se a API está pronta e se a GPU é reconhecida.
python3 /home/joao/maestro/infra/bin/footer-comfy status

# Reutilizar a instância ativa ou acordar o desktop e iniciar o motor por SSH.
python3 /home/joao/maestro/infra/bin/footer-comfy start
```

Depois de `start` confirmar que o motor está pronto, o assistente pode preparar workflows e enviá-los à API local do ComfyUI. O helper trata do acesso e do arranque; os prompts e os workflows definem as imagens a gerar. A operação normal já dispensa os guiões iniciais de configuração no PowerShell.

| Recurso | Localização / função |
|---|---|
| Maestro | VM Linux na NAS; pasta de trabalho `/home/joao/maestro`; utilizador `joao` |
| Projeto Footer | `/home/joao/maestro/footer` |
| Desktop de geração | Windows, `DESKTOP-FNJ8BDH`, NVIDIA GeForce RTX 5080 |
| API privada | `http://100.108.104.97:18188`; encaminhada por Tailscale para `127.0.0.1:8188` no desktop |
| Arranque a pedido | `/home/joao/maestro/infra/bin/footer-comfy` |
| Serviço no Maestro | `footer-comfy@8188.service`; mantém a sessão SSH em segundo plano |
| Configuração de lançamento | `/home/joao/maestro/infra/footer-comfy-launch.json` |
| Registo das verificações | `/home/joao/maestro/infra/footer-comfy-verification.json` |
| Instruções de operação | `/home/joao/maestro/infra/README.md` |
| Catálogo original, incluindo a primeira coleção metálica | `/home/joao/maestro/footer-original-catalogue/` |
| Piloto local, com imagens, prompts, seeds, referências e workflows | `/home/joao/maestro/output/footer-comfy-pilot-2026-11-07/` |

O cliente SSH já preparado está em `/home/joao/.config/footer-desktop/ssh_config`. A chave privada e o ficheiro de servidores conhecidos permanecem nessa pasta protegida, acessível no contexto autorizado do utilizador. **Usar o cliente existente; manter as chaves privadas fora do Markdown, dos chats e do Git.** O acesso SSH do desktop foi limitado ao Maestro através do Tailscale.

### O que foi verificado e o que continua pendente

- Wake-on-LAN a partir do Maestro; ligação SSH por chave, com o fingerprint do servidor confirmado; leitura da API privada e reconhecimento da RTX 5080 em CUDA.
- Arranque do motor em segundo plano pelo serviço do Maestro, testado numa instância isolada na porta 8189 e em sessão Windows 0. A instância de teste foi encerrada e a principal foi preservada.
- Dois testes reais de edição local: chuteira em tecido em 32,458 s e carta em papel em 19,635 s. As prévias continuam com fundo opaco, sem glow; precisam de transparência e preparação para composição.
- A sequência completa com reinício do desktop não foi testada. O arranque é a pedido do assistente; o motor não foi configurado para abrir sempre no login Windows. O serviço do Maestro não volta a acordar o computador por iniciativa própria depois de o utilizador o desligar.
- O contexto e os ficheiros de planeamento foram atualizados localmente. As funcionalidades de cartas modulares, inventário e equipamento RPG continuam por implementar na aplicação. Não houve commit, push ou publicação nesta sessão.

Esta infraestrutura serve a produção e a revisão de recursos gráficos pelo utilizador e pelo assistente. A Footer deverá consumir o catálogo de recursos aprovados e compô-los na interface; os jogadores usam a personalização e o inventário. O fluxo de jogo não depende de uma nova geração de imagem nem de acesso ao desktop em cada utilização.

Referências técnicas: [API local do ComfyUI](https://docs.comfy.org/development/comfyui-server/comms_routes) e [encaminhamento TCP privado com Tailscale Serve](https://tailscale.com/docs/reference/tailscale-cli/serve).

## 5. Exemplo de progressão

**Chuteiras Phantom, raridade épica:**

- Nível 1: modelo base preto/dourado, por exemplo em tecido e couro.
- Nível 5: pode desbloquear um novo acabamento ou uma opção luminosa.
- Nível 10: pode desbloquear partículas / aparência final.
- Estado: equipada ou guardada.

O desbloqueio de efeitos não deve tornar obrigatório usá-los. Os patamares e nomes são ilustrativos, não decisões fechadas.

**Moldura de uma coleção metálica:** pode evoluir na sua própria linha, independentemente das chuteiras, da camisola, do fundo e da aura. Outras coleções podem seguir progressões visuais diferentes, sem recorrer a bronze, prata ou ouro.

## 6. Temas a aprofundar

- De que forma se obtêm itens e materiais para melhorar: jogos realizados, desafios, conquistas, temporadas, loja, etc.?
- Como distinguir raridade, experiência, nível, desbloqueios e personalização?
- Que itens aparecem fisicamente na carta e quais aparecem numa área de inventário/equipamento?
- Como manter a legibilidade da carta e evitar excesso visual em ecrãs pequenos?
- Como separar a avaliação desportiva real das pontuações de progressão próprias do jogo?
- Como equilibrar progressão, diversão e justiça entre jogadores?
- Que modelos e workflows locais mantêm melhor a identidade entre variantes, dentro dos recursos disponíveis no desktop?

## 7. Questão central ainda por decidir

**O equipamento deve ser exclusivamente cosmético ou deve ter atributos e bónus que influenciem alguma forma de progressão ou classificação virtual dentro da Footer?**

Possibilidades a discutir:

1. **100% cosmético:** equipamento e evolução mudam apenas o aspeto da carta.
2. **Cosmético + progressão própria:** itens atribuem experiência, níveis, conquistas ou prestígio, sem alterar as estatísticas reais dos jogos.
3. **RPG virtual com atributos:** por exemplo, umas chuteiras lendárias dão +5 de velocidade *virtual*, mas sem interferir com os dados reais recolhidos nos jogos.
4. **Sistema híbrido:** os atributos influenciam apenas modos de jogo, desafios ou coleções, nunca as métricas de desempenho real.

**Pergunta para a próxima conversa de produto:** Qual destas abordagens cria mais motivação e valor para os jogadores sem comprometer a credibilidade desportiva da Footer?

## 8. Passagem para o Claude: atualizar o plano do projeto

**Pedido do utilizador:** incorporar este conceito e a capacidade de produção local nos ficheiros de contexto, planeamento e backlog do projeto. Quando chegar a fase de criar cartas, chuteiras, bolas, camisolas, calções, galhardetes ou outros itens, usar o sistema Maestro → desktop Windows / RTX 5080 → ComfyUI como fluxo previsto de geração e edição de imagens.

### Ficheiros a contextualizar

No Maestro, ler o estado Git, `CLAUDE.md`, `AGENTS.md`, o índice do vault e as notas relevantes antes de atualizar os ficheiros. Já existem alterações locais de documentação desta sessão; preservá-las e conciliá-las com o conteúdo atual.

| Ficheiro | O que registar |
|---|---|
| `/home/joao/maestro/CLAUDE.md` | Existência do sistema local, comando `footer-comfy start`, documentação de operação e possibilidade de utilização pelo Claude no mesmo ambiente autorizado |
| `Footer_vault/00 - Indice.md` | Referência a este conceito e à linha de trabalho de cartas/equipamento |
| `Footer_vault/02 - Resumo dos chats.md` | Intenção do utilizador, clarificações e infraestrutura já validada |
| `Footer_vault/03 - Decisoes e regras.md` | Metálico como uma família entre várias; glow opcional e independente; separação entre avaliação desportiva real e progressão virtual |
| `Footer_vault/04 - Estado tecnico.md` | API e SSH existentes, arranque a pedido, comandos, ficheiros operacionais, verificações e limites conhecidos |
| `Footer_vault/05 - Backlog e proximos passos.md` | Plano de implementação, próximas entregas e decisões de produto ainda abertas |
| `Footer_vault/12 - Cartas evolutivas e equipamento RPG.md` | Conceito consolidado e instruções desta passagem |

Os caminhos `Footer_vault/...` da tabela pertencem a `/home/joao/maestro/footer/`. Se o Claude trabalhar noutro clone, deve adaptar as referências aos ficheiros equivalentes; a infraestrutura de geração continua no Maestro. Receber este documento não copia automaticamente os scripts, as imagens ou as credenciais para outro ambiente.

### Plano a refletir no backlog

1. **Definir a composição modular e o catálogo:** fundo, fotografia do jogador, moldura, ornamentação, aura e equipamento com identificadores independentes. Família estética, raridade, evolução e glow devem ser dimensões distintas.
2. **Padronizar os recursos:** dimensões, escala, perspetiva, transparência, nomes e metadados; guardar as referências, o modelo, o prompt, a seed e o workflow de cada lote. Conservar os originais.
3. **Produzir e rever os recursos pelo sistema local:** usar `footer-comfy start`, a API do ComfyUI e os workflows já testados como base. Começar por poucas peças e outras famílias além da metálica; finalizar bases sem glow incorporado quando esse efeito deva ser independente.
4. **Prototipar a personalização na aplicação:** combinar camadas e permitir escolher presença, cor e intensidade do glow, garantindo legibilidade e desempenho em telemóvel. Os textos, os nomes e os dados do jogador são desenhados pela aplicação.
5. **Planear inventário e equipamento:** slots, itens equipados/guardados, variantes e marcos de evolução. A geração dos recursos é um trabalho prévio de produção; a aplicação utiliza o catálogo aprovado.
6. **Resolver as decisões de progressão antes de implementar bónus:** manter em aberto se o equipamento é cosmético ou tem atributos virtuais. Preservar as estatísticas reais do futebol e as regras desportivas existentes.
7. **Integrar por etapas:** escolher um pequeno conjunto aprovado, preparar transparências e camadas, validar a interface e só depois ampliar o catálogo e os mecanismos de progressão.

Esta passagem pede a atualização do contexto e do plano. A implementação das funcionalidades deverá seguir as etapas acordadas com o utilizador e as regras existentes do projeto. A geração local das imagens é a capacidade já operacional que deve orientar essa fase futura.
