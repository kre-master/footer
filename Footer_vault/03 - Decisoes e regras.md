# Decisoes e regras

## Regra principal de trabalho

Alteracoes futuras devem ser feitas primeiro na versao base/web.

Ficheiros principais:

- `app.js`
- `index.html`
- `styles.css`

So mexer em Android/iOS quando for pedido explicitamente.

Quando for preciso actualizar a copia web/mobile, usar build/sync apropriado e rever os ficheiros alterados antes de commit.

## Git e workspace

- Nao usar `git reset --hard`.
- Nao usar `git add .`.
- Ha varios assets nao rastreados; rever sempre antes de adicionar ficheiros.
- Nao desfazer alteracoes locais do utilizador.
- Se `www/app-config.js` aparecer modificado depois de build, verificar e provavelmente restaurar com `git restore www/app-config.js`.
- Actualizar cache-buster em `index.html` quando alterar JS/CSS para evitar cache no telemovel.

## Convocatorias

- A convocatoria tem limite de jogadores, normalmente 12.
- Ao atingir o limite, nao deve permitir mais respostas `Vou`.
- O botao `Fazer equipas` da convocatoria carrega os confirmados e poe logo no campo a divisao mais equilibrada. Se a convocatoria ja tiver equipas confirmadas (jogo por terminar), o botao passa a `Ver equipas` e abre esse jogo em vez de criar outro.
- A data do jogo confirmado deve vir da convocatoria.
- Admin pode alterar a data/hora de uma convocatoria depois de lancada.
- Se a convocatoria ja tiver originado um jogo, alterar a data/hora da convocatoria deve sincronizar tambem a data/hora desse jogo.
- Admin pode cancelar/apagar convocatorias quando necessario.
- Admin pode confirmar jogadores com resposta Talvez/Nao vou e remover confirmados diretamente nas listas da convocatoria quando nao conseguem alterar a propria resposta.
- Remover da convocatoria altera a resposta para Nao vou, libertando a vaga e preservando o perfil e a conta ligados a resposta. Nao altera equipas de jogos ja gerados.
- Ajustes de respostas ficam indisponiveis em convocatorias canceladas ou concluidas; confirmar respeita o limite de jogadores na app.

## Equipas

- Desde 2026-10-23 o ecra chama-se `Fazer equipas` e segue etapas: quem vai a jogo (so os confirmados; outros jogadores e convidados ficam em `Adicionar outro jogador`) -> `Auto` / `Baralhar` -> ajuste manual A<->B -> `Confirmar equipas` -> `Enviar para WhatsApp` -> `Terminar jogo` -> resultado.
- Nao ha lista de sugestoes: `Auto` mostra a melhor divisao e `Baralhar` percorre as 6 melhores.
- Nao ha suplentes: so Equipa A e B. Jogadores adicionados entram na equipa mais pequena. Jogos antigos com suplentes continuam a mostrar essas colunas no editor ate serem movidos.
- Nao deve haver suplentes visuais quando ha 12 confirmados.
- Com 12 confirmados, todos entram no campo/equipa, contando 6 por equipa para equilibrio.
- O equilibrio deve considerar rating e forma sem sacrificar completamente a coerencia das equipas.

## Ratings e forma

- Rating publico visivel deve aparecer como overall/form.
- Rating actual/privado e edicao devem ficar restritos a admins.
- Overall pode ser recalculado automaticamente a partir dos parciais.
- A nota de um jogador novo/convidado e de 1 a 100 (desde 2026-10-23; antes 0-10). Internamente tudo ja era 0-100.
- Forma/rating actual e interno ao grupo e nao deve ser confundido com futuro rating publico/social.

## MVP

- Voto deve ser confidencial.
- Jogador nao pode alterar voto depois de votar.
- Admin pode ver contagem de votos sem ver quem votou em quem.
- A app nao deve ler votos MVP crus de outros utilizadores; deve usar contagens agregadas.
- Pode haver empate.
- MVP vale apenas para o jogo seguinte se o jogador participar.

## Seguranca e contas

- Login e recuperacao de password podem usar email ou username enquanto a app estiver limitada ao grupo fechado de amigos.
- Username login usa lookup username -> email no Supabase; se a app crescer para fora do grupo, rever com rate limit/captcha ou remover.
- Em producao, confirmacao de email deve ficar ligada no dashboard Supabase.
- Rate limiting/captcha para criacao de conta e acoes repetiveis fica como melhoria futura enquanto a app estiver limitada ao grupo local de amigos.

## Historico

- Jogos finalizados abrem uma pagina propria de historico.
- Clicar num jogo finalizado dentro do perfil deve abrir `history-game`.
- O historico nao deve redireccionar indevidamente para `today/Gerar`.
- Cartas no campo do historico devem poder abrir a pagina do jogador.
- Admin pode alterar a data/hora de um jogo confirmado ou historico.
- Se o jogo tiver convocatoria associada, alterar a data/hora do jogo deve sincronizar tambem a convocatoria.
- Admin pode editar equipas de um jogo historico/finalizado para corrigir jogadores trocados.
- Alterar equipas de um jogo finalizado deve recalcular historico individual, forma e cartas derivadas.
- Pagamentos seguem os participantes atuais do jogo, salvo overrides manuais de presenca.
- Deve existir acao para limpar overrides de presenca de um jogo e recalcular pagamentos a partir das equipas atuais.

## Pagamentos

- Relatorios mensais de pagamentos seguem sempre `game.date`.
- Se a data/hora de um jogo mudar para outro mes, o jogo deve passar automaticamente para o relatorio desse novo mes.
- Presencas manuais e ajustes financeiros ficam ligados ao `game.id`; mudar a data nao deve perder esses overrides.
- Para ajustes, admin pode adicionar uma divida a um jogador alem de registar pagamentos.
- Dividas aumentam o saldo a pagar do jogador, mas nao contam como caixa recebida.
- Por compatibilidade com Supabase, dividas sao guardadas como movimentos positivos marcados internamente com `[DIVIDA]`; os calculos tratam esses movimentos como ajuste negativo.

## Cartas e premios

- A pagina de jogador deve comecar pela carta.
- Uma conta ligada a um jogador deve ter o separador `Meu perfil`, que abre diretamente a pagina do proprio jogador; o separador fica oculto sem perfil ligado.
- Templates novos vivem em `assets/new cards template`.
- Cartas podem variar por contexto: base, forma, vitorias, MVP, premios e outros.
- Montra de premios deve mostrar progresso desbloqueadas x/y.
- Carta `Primeira vitoria` e desbloqueada apenas quando o jogador ganha pela primeira vez um jogo registado e fica na montra permanente.
- Carta `Primeira vitoria` nao deve ser usada como carta ativa so por o jogador estar numa sequencia atual de 1 vitoria.
- Cartas `4 em 5` e `5 em 5` contam os ultimos jogos em que o jogador participou; ausencias entre esses jogos nao invalidam a carta.
- Cartas de `vitorias seguidas` exigem jogos consecutivos da equipa sem ausencia do jogador pelo meio.

## Stats / Hall of Fame

- Deve existir separador `Stats` para historico agregado de jogadores.
- Stats iniciais: mais vitorias, melhor win rate, mais presencas, mais MVPs, historico de MVPs, maior sequencia de vitorias, maior caloteiro atual e melhor dupla.
- Melhor dupla exige pelo menos 2 jogos juntos.
- Stats incluem um ranking top-5 `Melhores triplas`.
- Uma tripla so e elegivel depois de os mesmos tres jogadores completarem pelo menos 3 jogos finalizados juntos na mesma equipa.
- A pontuacao competitiva de duplas e triplas e `12 x vitorias + 2 x margem total nas vitorias + jogos juntos + vitorias/jogos juntos`.
- Em empate de pontuacao, a ordenacao segue, por ordem: mais vitorias, maior margem total nas vitorias, mais jogos juntos, nomes de apresentacao em portugues e IDs canonicos dos jogadores.
- `Melhor media de golos marcados` e `Menor media de golos sofridos` sao rankings de jogadores.
- Um jogador precisa de pelo menos 5 participacoes finalizadas com resultado valido para entrar nesses rankings.
- Em cada participacao, os golos marcados e sofridos sao sempre calculados da perspectiva da equipa desse jogador.
- A apresentacao usa duas casas decimais, mas a ordenacao usa a precisao completa.
- Jogos com resultados em falta, vazios, nao numericos ou nao finitos nao contam para estes rankings nem para os totais de resultados dos jogadores.
- Melhor win rate deve preferir jogadores com minimo de 5 presencas; se nao houver historico suficiente, pode mostrar os melhores disponiveis.
- Nao incluir ranking `anti-amuleto`.

## Campeoes de estacao

- Datas oficiais:
  - Primavera: 20 marco ate antes de 21 junho.
  - Verao: 21 junho ate antes de 22 setembro.
  - Outono: 22 setembro ate antes de 21 dezembro.
  - Inverno: 21 dezembro ate antes de 20 marco.
- Uma estacao so pode atribuir campeao depois do seu fim real.
- Apenas um jogador ganha por estacao.
- O desempate fica por vitorias, win rate, jogos jogados e nome.
- A carta sazonal ativa aparece apenas no primeiro jogo do campeao depois do fim da estacao.
- A carta sazonal nao deve ficar ativa indefinidamente no perfil/listas.
- Cartas de campeao de estacao nao entram na montra permanente de premios.
- No historico individual, o resultado deve ser mostrado da perspectiva da equipa do jogador.
- Na lista de jogadores, `ULT. 5` deve representar jogos em que o jogador participou.
- Os pontos `ULT. 5` devem aparecer do mais antigo para o mais recente, deixando o jogo mais recente a direita.
- Historico de jogos deve mostrar o nome do jogo/convocatoria quando existir associacao ao evento.
- O detalhe de jogo historico nao deve ter botao `Voltar` no topo.
- Probabilidades do radar ficam inline junto ao nome de cada equipa no historico, mas continuam separadas no jogo atual.

## MVP do mes

- MVP do mes so pode ser atribuido apos o mes estar fechado e todos os jogos registados desse mes estarem finalizados.
- Desempates:
  - mais MVPs oficiais no mes;
  - mais vitorias nos jogos em que participou nesse mes;
  - melhor win rate nesse mes.
- Se continuar empatado apos os tres criterios, a carta pode ser atribuida aos jogadores empatados.
- A carta de MVP do mes e temporaria de campo e aparece apenas no primeiro jogo elegivel do mes seguinte em que o jogador participe.
- MVP do mes entra na montra permanente de premios quando conquistado.

## Testes preferidos

## Fecho do jogo e respostas retroativas

- O jogo de transicao e sempre o jogo finalizado com a data de jogo mais recente; `updated_at` e apenas criterio secundario e nao pode fazer um jogo antigo passar a frente.
- Um participante sem voto MVP nem respostas faz o fecho completo: voto MVP e as duas perguntas.
- Um participante que ja tenha votado no MVP, mas ainda nao tenha respondido as duas perguntas, ve apenas essas perguntas.
- Neste segundo caso, o voto MVP existente e preservado e nao pode ser alterado pelo pedido de respostas.
- Cada jogador continua a poder submeter apenas uma resposta de intensidade e energia por jogo.

O browser integrado/Codex browser pode falhar com sandbox no Windows. Preferir testes por terminal quando possivel:

- `node --check app.js`
- `npm.cmd run build:web`
- `node --check www\app.js`
- smoke test com `Invoke-WebRequest http://127.0.0.1:5173/`

## Identidade visual

- Tema oficial desde 2026-10-10: "Holofote" (escuro, estadio a noite, azul da chama do logo como cor de destaque). Escolhido entre seis propostas.
- Novas cores devem usar os tokens de `:root` em `styles.css`; azul para accao/seleccao, verde so para estados positivos, laranja/vermelho para alertas e equipa B.
- Campo e cartas FIFA mantem as cores proprias.

## Navegacao

- Desde 2026-10-15: quatro separadores para todos (Jogo, Historico, Galeria, Stats) e Admin so para admins. Novas vistas devem entrar num destes grupos (`VIEW_GROUPS`) em vez de criar mais separadores.
- Desde 2026-10-22: separador Jogador (o perfil do proprio) no inicio da barra, so com conta ligada a jogador; e a pagina inicial. Conta continua no menu do avatar.
- Desde 2026-10-23: o separador Jogo passa a Jogos, com mini-separadores "O meu grupo" (convocatorias; para admins tambem Fazer equipas) e "Jogos publicos" (jogos abertos de outros grupos). Fazer equipas desaparece para quem nao e admin; as equipas confirmadas aparecem no cartao da convocatoria para todos.
- Notificacoes no simbolo do Footer: bolinha vermelha com o numero de novidades do grupo por ver (convocatoria lancada, video adicionado, momento marcado por outro jogador, MVP eleito); bolinha verde fluorescente quando ha versao nova da app. Abrir o painel poe ambas a zero. O "visto" e por dispositivo (localStorage).

## Versoes da app

- Formato MAJOR.MINOR.PATCH em `notifications.js` (`CHANGELOG`, a entrada do topo e a versao atual). MAJOR: mudanca grande na forma de usar; MINOR: novidade visivel; PATCH: correcoes.
- 1.0.0 (2026-10-22) e a primeira versao com changelog. Cada push com mudancas para os jogadores acrescenta uma entrada no topo, escrita para o utilizador.

## Perfil e estatisticas do jogador

- O perfil e o sitio principal das estatisticas pessoais; "O meu mes" e so o periodo deste mes dentro do perfil.
- Linguagem prudente: factos observados ("percorreste mais 1,1 km") e nunca juizos de forma fisica ou qualidade de jogo a partir do tracking.
- Cada metrica mostra a cobertura (jogos analisados vs disputados) e o estado de qualidade do tracker. Sem dados aparece como "sem dados".
- Comparar primeiro o jogador consigo proprio; comparacao com o grupo so como opcao e com quem tem dados comparaveis.

- Desde 2026-10-28: Jogos tem subtabs "Os meus jogos", "Jogos publicos" e "Nova convocatoria" (so admin cria convocatorias). "Fazer equipas" (view `today`) e uma vista propria, aberta a partir do cartao, com botao de voltar.
- Cartao da convocatoria compacto: titulo, data/local, contadores e resposta visiveis; "Quem vai e quem nao vai" e "Gerir convocatoria" (data, adicionar jogadores/convidados, procurar jogadores, cancelar) ficam recolhidos. Estado aberto guardado em `openEventDetails`.
- O admin faz equipas sempre a partir da convocatoria: o passo 1 (selecao manual) fica escondido para o admin; o campo vem primeiro e "Ajustar equipas e adicionar jogadores" fica recolhido por baixo.
- Desde 2026-10-28 (2): "Quem vai / Talvez / Nao vou" fica sempre visivel no cartao (admin e jogadores); so "Gerir convocatoria" e recolhido. Na vista de equipas, "Ajustar equipas e adicionar jogadores" fica no topo (aberto), acima do campo/radar, com Equipa A e B lado a lado.
- Desde 2026-10-28 (3): na vista de equipas, ordem: Auto/Baralhar, Confirmar equipas, WhatsApp, Terminar jogo/resultado, Ajustar equipas (A e B lado a lado, cruz vermelha para remover, "Passar para A/B"), campo/radar e, por fim, a data do jogo (`#step-date`, so em proposta).

## Hall of Fame (2026-10-28)

- Desenho estilo iOS: seletor segmentado Este mes / Epoca / Sempre (por defeito Sempre), carrossel de 4 destaques (vitorias, MVPs, sequencia, presencas), listas agrupadas com top 3 e "Ver todos", icones SVG de linha (sem emojis). Seccoes: Resultados, Presenca e premios, Combinacoes.
- O periodo filtra tudo (presencas, V/E/D, MVPs, sequencia, golos, duplas/triplas, historico de MVPs). A elegibilidade das medias de golos (5 jogos, sem ausencia recente) mantem-se, por isso num mes curto as listas de golos podem aparecer vazias.
- Removido o ranking "Maior caloteiro" (e as funcoes que so ele usava). As dividas continuam so em Pagamentos (admin).
- Fase 2 (por fazer): seccao "Em campo (video)" com etiqueta Beta, so jogadores elegiveis (>= 10 min validos e nao guarda-redes), por defeito "Este mes". Categorias: Motor (m/min, medido), Maratonista (distancia, medido), Relampago (vel. max., preliminar, com "Ver o momento"), Sprinter (sprints/jogo, indicativo), Passador e Ligacao (passes detetados, sem auditoria). Fora: forma fisica, calorias, "quem cansa mais", ataques (estimativa), posicao.

## Revisao do mes e video no Hall of Fame (2026-10-28)

- A Revisao do mes abre quando o mes acabou e todos os jogos desse mes tem resultado e MVP fechado (MVP fechado = ja ha MVP oficial ou passou o prazo de votacao). A analise de video so aparece se existir; sem ela a revisao abre na mesma, com um cartao "Sem jogos analisados".
- Acesso: cartao "Revisao do mes" no proprio perfil (mais recente + "Outros meses"), aviso unico para o mes anterior (gate `monthly-auto-gate`) e entrada nas novidades (sino, `kind: review`).
- Carrossel em ecra cheio (`#month-review`): capa, presencas, MVP, distancia, ritmo, velocidade max. (com "Ver o momento"), sprints, passes, cartas, esforco (kcal e forma sentida, so o proprio ve) e fecho. So aparecem cartoes com dados; compara com o mes anterior em factos ("+1,2 km face a setembro"), sem juizos.
- Hall of Fame, seccao "Em campo (Beta)": Motor, Maratonista, Relampago, Sprinter, Passador e Ligacao (passes entre dois). Entram jogadores com >= 10 min observados e fora da baliza; cada lista mostra a etiqueta de qualidade do tracker. No periodo "Este mes" os resultados sao parciais (etiqueta Parcial); as medias de golos passam a exigir 1 jogo em vez de 5 so nesse periodo.
