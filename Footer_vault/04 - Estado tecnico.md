# Estado tecnico

## 2026-10-22 - v1.0.0: separador Jogador, notificacoes, icones e cartas limpas

- Separador `#my-profile-tab` na barra (grupo `profile` em `VIEW_GROUPS`); `applyLandingRoute` abre sempre o perfil do jogador ligado.
- Novo modulo `notifications.js` (changelog, versao, feed e contagens; testes em `tests/notifications.test.mjs`, `npm run test:notifications`). Feed montado em `getNotificationFeed` a partir de dados ja carregados; eventos e partes de video passam a ler `created_at`. Sem alteracoes Supabase.
- Icones SVG dos numeros do perfil em `STAT_ICONS` / `statIcon`.
- Cartas (campo, perfil e PNG exportado) deixam de mostrar PAC/SHO/PAS/DRI/DEF/PHY; ficam foto, nome e OVR.
- Cache-buster `20261022-v100`.

## 2026-10-07 - Ajustes de convocatoria pelo admin

- Botoes Confirmar nas listas Talvez/Nao vou e Remover na lista Vou; perfis continuam acessiveis pelo nome.
- `saveAdminEventResponse` verifica permissao, evento ativo e jogador, bloqueia cliques repetidos e reutiliza `saveEventResponseForPlayer`, preservando `user_id` existente.
- Policies remotas de `event_responses` verificadas em leitura: RLS ativa, admin autorizado a inserir/atualizar, jogador limitado ao perfil associado.
- Limitacao preexistente identificada: o trigger `enforce_event_max_players` consta de `supabase/schema.sql`, mas nao esta instalado na base remota. A app bloqueia confirmacao quando cheia; confirmacoes simultaneas de sessoes diferentes nao tem garantia atomica no servidor. Nao foi alterado o schema remoto nesta tarefa.
- Adicionados 11 testes em `tests/event-roster.test.mjs`; testes existentes stats/postgame/monthly e convidados tambem passaram.
- JS/CSS usam cache-buster `20261007-adminroster1`; `www/` atualizado com `npm.cmd run build:web`.
- Build repetido com sucesso apos EPERM da sandbox na pasta gerada; sintaxe base/www validada. `git diff --check` passou nos ficheiros desta tarefa; a verificacao global encontra linhas vazias finais preexistentes nas notas 00/05, que foram preservadas.

## 2026-09-13 - Acesso direto ao perfil do jogador

- Adicionado o separador `Meu perfil` à navegação principal.
- O separador aparece apenas quando a sessão está ligada a um jogador e abre sempre o perfil desse jogador.
- A página e a navegação de histórico existentes são reutilizadas sem duplicar uma nova view.
- Cache-buster de `app.js` atualizado para `20260913-myprofile1`.

## Estrutura relevante

Raiz web/base:

- `app.js`
- `index.html`
- `styles.css`
- `app-config.js`
- `assets/`

Bundle/copia web para Capacitor:

- `www/app.js`
- `www/index.html`
- `www/styles.css`
- `www/app-config.js`
- `www/assets/`

Mobile:

- `android/`
- `ios/`
- `capacitor.config.json`

Docs/plans antigos:

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

Vault:

- `Footer_vault/`

## Commits recentes conhecidos

- `f048acf - Fix history render after radar odds`
- `e2bd3a4 - Revise team generation and radar odds`
- `6c5aefd - Tune photo fade for small cards`
- `37d5422 - Add award unlock progress and soften card photos`
- `bc72c99 - Polish history radar and cache bust cards`
- `167715f - Tighten player card photo layout`
- `ed14771 - Refine mobile player profile layout`
- `97d6027 - Refine awards field layout and payments`

## Assets relevantes nao rastreados

Ha varios assets relevantes ainda nao rastreados. Nao usar `git add .`.

Exemplos conhecidos:

- `Footer v1.png`
- `Footer.png`
- `assets/+1.png`
- `assets/+1X.png`
- `assets/-1.jpg`
- `assets/-1X.jpeg`
- `assets/0.jpg`
- `assets/1.png`
- `assets/MVP.png`
- `assets/exemplo.png`
- `assets/exemplo proporcoes.png`
- `assets/novo 1.png`
- `assets/novo alterado.png`
- `assets/new cards template/...`
- equivalentes em `www/assets/...`

## Bug recente corrigido

Sintoma:

- Historico ficou vazio depois de alteracoes no radar/odds.
- Clicar no historico do jogador abria o Gerar/today com erro amarelo.

Causa:

- Foram usadas chamadas a `clamp(...)`, mas a funcao existente no projecto e `clampNumber(...)`.

Correcao:

- Corrigido em `app.js` e `www/app.js`.
- Clicar num jogo finalizado dentro do perfil passou a abrir `history-game`.

Validacao:

- `node --check app.js` passou.
- `npm.cmd run build:web` passou.
- `node --check www\app.js` passou.
- Smoke test local devolveu HTTP 200 e cache-buster ok.

## Correcao sazonal de 2026-06-04

Sintoma:

- Cartas de campeao de verao apareciam antes do verao.
- Conquista de campeao de primavera aparecia antes de a primavera terminar.

Causa:

- `getSeasonInfo` usava meses inteiros.
- `isSeasonComplete` podia fechar a estacao cedo se todos os jogos registados ja estivessem no passado.
- `getSeasonChampionIds` podia devolver varios jogadores em empate.
- `getActivePlayerCardAward` deixava a carta sazonal ativa fora do jogo seguinte.

Correcao:

- Adicionado `SEASON_DEFINITIONS` com datas reais.
- `isSeasonComplete` passou a depender do fim real da estacao.
- `getSeasonChampionIds` passou a devolver so o melhor jogador.
- Adicionados `getSeasonChampionCardKeyForGame` e `isFirstPlayerGameAfterSeason`.
- Adicionado `FIELD_ONLY_CARD_KEYS` para retirar campeoes de estacao da montra permanente.
- Adicionados `getGameResultText` e `getPlayerResultText` para alinhar historico individual com a perspectiva do jogador.
- `renderPlayersTable` passou a usar `form.recentRecord` em vez de `getPlayerTeamRecentRecord`.
- `renderRecordDots` ganhou opcao cronologica para mostrar o jogo mais recente a direita.
- `renderGamesList` e `renderHistoryGameDetail` passaram a mostrar `getGameTitle(game)`.
- `findEventForGame` associa jogo e convocatoria por data e jogadores confirmados para obter o titulo.
- `renderTeamRadarChart` ganhou opcao `inlineOdds` para o historico.
- `mvp_month` nao fica em `FIELD_ONLY_CARD_KEYS`, para poder aparecer na montra permanente.
- `getMonthlyMvpRows` calcula desempates por MVPs oficiais, vitorias e win rate.
- `getMonthMvpCardKeyForGame` e `isFirstPlayerGameAfterMonth` limitam a carta ao primeiro jogo elegivel do mes seguinte.
- `isMonthComplete` passou a depender do fim real do mes, alem de jogos finalizados.
- Cache-buster actualizado para `20260604-mvpmonth2`.

Validacao:

- `node --check app.js` passou.
- `npm.cmd run build:web` passou.
- `node --check www\app.js` passou.
- Smoke test local em `http://127.0.0.1:5173/` devolveu `STATUS=200` e `CACHE_BUSTER=ok`.

Nota Git:

- `Footer_vault/` nao esta no `.gitignore`.
- Aparece como `?? Footer_vault/` porque ainda nao foi adicionado ao Git.
- Para versionar o vault, adicionar explicitamente so a pasta do vault, sem usar `git add .`.

## Alteracao de data/hora de jogos

Regra:

- A data/hora pode ser alterada por admin na convocatoria depois de lancada.
- A data/hora pode ser alterada por admin no jogo confirmado e no detalhe do historico.
- Quando uma convocatoria ja tem jogo associado, a alteracao sincroniza `event.startsAt` e `game.date`.
- Quando um jogo tem convocatoria associada, a alteracao sincroniza `game.date` e `event.startsAt`.
- Pagamentos seguem automaticamente o mes de `game.date`; overrides de presenca e ajustes financeiros continuam ligados ao `game.id`.

Implementacao:

- `saveEventDateFromList` le o input da convocatoria.
- `updateEventDate` actualiza a convocatoria e, se existir, o jogo associado.
- `updateGameDate` actualiza o jogo e, se existir, a convocatoria associada.
- `findGameForEventData` associa convocatoria e jogo pela data antiga e jogadores confirmados.
- `updatePreviewGameDate` continua a actualizar previews, mas tambem grava a data de jogos ja confirmados quando o input dispara `change`.
- Cache-buster actualizado para `20260615-game-date1`.

Validacao:

- `node --check app.js` passou.
- `npm.cmd run build:web` passou.
- `node --check www\app.js` passou.
- Smoke test local devolveu `STATUS=200` e `CACHE_BUSTER=ok`.

## Dividas de ajuste em pagamentos

Regra:

- Admin pode registar pagamentos e tambem adicionar dividas manuais a jogadores.
- A divida aumenta o saldo actual do jogador, sem alterar presencas nem jogos.
- A divida nao deve contar como caixa recebida nem reduzir a diferenca de caixa do mes.

Implementacao:

- `DEBT_NOTE_PREFIX` marca movimentos de divida com `[DIVIDA]` na nota.
- `isDebtAdjustment` identifica esses movimentos.
- `getPaymentSignedAmount` faz pagamentos contarem positivo e dividas contarem negativo no saldo do jogador.
- `renderPaymentsPanel` tem botoes separados para `Registar pagamento` e `Adicionar divida`.
- `renderPaymentsHistory` mostra cada movimento como `Pagamento` ou `Divida`.
- `buildMonthlyPaymentReport` usa o valor assinado para saldos, mas `totalPaidMonth` conta apenas pagamentos reais para a caixa.
- Cache-buster actualizado para `20260615-payment-debt1`.

Validacao:

- `node --check app.js` passou.
- `npm.cmd run build:web` passou.
- `node --check www\app.js` passou.
- Smoke test local devolveu `STATUS=200` e `CACHE_BUSTER=ok`.

## Auditoria de seguranca 2026-06-15

Pontos revistos:

- Chave exposta no frontend e `sb_publishable`, esperada para Supabase frontend.
- Nao foi encontrada `service_role` nem chave secreta de API no frontend.
- `npm audit --audit-level=moderate` passou com `0 vulnerabilities`.

Alteracoes decididas:

- Votos MVP devem deixar de ser lidos crus por todos os utilizadores autenticados.
- `game_mvp_votes` passa a permitir select apenas do voto do proprio jogador.
- `mvp_vote_counts()` devolve apenas contagens agregadas por jogo/candidato.
- Voto MVP passa a usar `insert`, nao `upsert`, para nao permitir alteracao posterior.
- Login/recuperacao passam a usar email; username deixa de servir para lookup de email.
- `email_for_login` voltou a ter grant para `anon`/`authenticated` por decisao posterior de aceitar login por username no grupo fechado.

Acao manual necessaria:

- Reexecutar `supabase/schema.sql` no SQL Editor do Supabase para aplicar policies/funcoes.
- Confirmar no dashboard: `Authentication > Providers > Email > Confirm email` ligado.
- Mais tarde, rever `Authentication > Rate Limits`/captcha se a app sair do uso local entre amigos.

## Conta criada sem aparecer em Pedidos/Contas

Sintoma:

- Utilizador consegue criar conta no Supabase Auth, mas o admin nao a ve em `Pedidos`/lista de contas.

Causa provavel:

- `loadAccountState` usava o numero de profiles visiveis para decidir se a conta era o primeiro admin.
- Como um jogador normal so ve o proprio profile por RLS, uma conta nova sem profile via `profiles.length === 0` e tentava criar role `admin`.
- A policy `profiles insert self` bloqueia esse segundo admin, logo a conta ficava no Auth sem linha em `profiles`.

Correcao:

- A app passa a chamar `has_any_profile()` para saber se ja existe algum profile real.
- Se ja existir algum profile, a nova conta cria role `player`.
- `has_any_profile()` precisa de `grant execute ... to authenticated`.
- Depois de aplicar o schema mais recente, pedir ao utilizador afetado para entrar novamente para a app criar/reparar o profile.

Nota de login:

- Por decisao de produto para o grupo fechado, login e recuperacao voltam a aceitar email ou username.
- Username login chama `email_for_login(username)` para resolver o email antes de usar Supabase Auth.
- `email_for_login` tem `grant execute` para `anon` e `authenticated`; rever rate limit/captcha se a app sair do uso local.

## Edicao de equipas em jogo historico

Regra:

- Admin pode corrigir equipas de um jogo finalizado no detalhe do historico.
- Mover jogador entre Equipa A/B altera automaticamente historico individual, forma e cartas, porque esses dados sao derivados de `game.teamA/teamB`.
- Pagamentos continuam a usar participantes de `getGamePlayerIds(game)`.
- Se houver overrides manuais de presenca, existe botao para limpar overrides desse jogo e recalcular pagamentos a partir das equipas atuais.

Implementacao:

- `renderHistoryRosterEditor(game)` desenha o editor admin no detalhe historico.
- `movePlayerInHistoryGame`, `addPlayerToHistoryGame` e `removePlayerFromHistoryGame` alteram `teamA/teamB/benchA/benchB`.
- `resetAttendanceOverridesForGame(gameId)` remove overrides de presenca apenas desse jogo.
- `mutateHistoryGame` aplica rollback se `persistState()` falhar.
- Cache-buster actualizado para `20260706-history-edit1`.

## Regras de cartas de forma/vitorias

Regra:

- `4 em 5` e `5 em 5` usam apenas os ultimos jogos em que o jogador participou.
- Uma ausencia entre jogos da equipa nao invalida `4 em 5`/`5 em 5`, desde que o jogador tenha vencido 4 ou 5 das ultimas 5 participacoes.
- `vitorias seguidas` exige jogos consecutivos da equipa sem ausencia pelo meio.
- Se o jogador falhar um jogo da equipa, a sequencia de `vitorias seguidas` fica quebrada.

Implementacao:

- `getPlayerForm` calcula `winStreak` com `countConsecutiveTeamOutcomeStreak`.
- `getPlayerAwardShowcase` conta `win_*x` percorrendo todos os jogos finalizados da equipa, resetando em ausencia ou nao-vitoria.
- As cartas `form_4w_5` e `form_5w_5` continuam baseadas em janelas das participacoes do jogador.

## 2026-07-06 - Historico alargado e revelacao de cartas

- Perfil do jogador passa a mostrar `Ult. 20 equipa` e `Ult. 20 jogador`.
- Adicionada auditoria de cartas com sequencia atual, melhor sequencia valida sem faltas e melhor janela de 5 participacoes.
- Montra de premios para `vitorias seguidas` passa a depender da melhor sequencia historica valida, sem ausencia entre jogos da equipa.
- `4 em 5` e `5 em 5` continuam a contar apenas jogos em que o jogador participou.
- Adicionada revelacao local de cartas desbloqueadas apos o voto MVP do ultimo jogo finalizado em que o jogador participou.
- Revelacoes ficam marcadas por `playerId:gameId:awardKey` no dispositivo; ha fallback em memoria se `localStorage` falhar.
- Cache-buster actualizado para `20260706-awardreveal1`.

## 2026-07-07 - Melhorias na revelacao de cartas

- Modal de carta desbloqueada passa a mostrar o nome e a descricao da carta abaixo da carta visual.
- Quando ha varias cartas desbloqueadas, mostra o total de cartas e usa uma faixa horizontal arrastavel com `scroll-snap`.
- Adicionada verificacao local `scripts/check-award-reveal-ui.mjs` para garantir contador, nome/descricao e carrossel.
- Validacoes: `node scripts/check-award-reveal-ui.mjs`, `node --check app.js`, `npm.cmd run build:web`, `node --check www\app.js`.

## 2026-07-09 - MVP historico e popup de eleito MVP

- Corrigida a base real Supabase: a funcao `public.mvp_vote_counts()` estava em falta apesar de existirem votos em `game_mvp_votes`.
- Confirmacao na base: 57 votos MVP em 7 jogos; 6 jogos ja tinham minimo de 5 votos.
- O painel MVP volta a usar contagens agregadas sem expor quem votou em quem.
- Adicionado popup `Foste eleito MVP` quando os votos do ultimo jogo finalizado do jogador estao fechados e o jogador e MVP oficial.
- O popup de MVP oficial aparece antes das cartas desbloqueadas e fica marcado localmente por `playerId:gameId:official_mvp`.
- Cache-buster actualizado para `20260709-mvpreveal1`.

## 2026-07-09 - Stats e Primeira vitoria

- Adicionado separador `Stats` com Hall of Fame agregado.
- Rankings incluidos: mais vitorias, melhor win rate, mais presencas, mais MVPs, maior sequencia de vitorias, maior caloteiro atual, melhor dupla e historico de MVPs.
- Ranking `anti-amuleto` ficou de fora por decisao do utilizador.
- Melhor dupla exige pelo menos 2 jogos juntos.
- Melhor win rate usa minimo de 5 presencas quando existir historico suficiente.
- Carta `1 vitoria seguida` passa a chamar-se `Primeira vitoria`.
- `Primeira vitoria` e premio unico de montra, desbloqueado apenas na primeira vitoria historica do jogador.
- `Primeira vitoria` deixou de ser carta ativa por sequencia atual de 1 vitoria.
- Cache-buster actualizado para `20260709-stats1`.

## 2026-07-09 - UI Stats

- UI do separador `Stats` ficou mais vibrante: cabecalho `Quadro de honra`, cartoes de destaque com acentos visuais e rankings com efeito de podium.
- Cada titulo principal/ranking de Stats passa a ter emoji decorativo.
- Mantida a mesma logica de calculo; alteracao e apenas visual.
- Cache-buster actualizado para `20260709-statsui1`.

## 2026-07-09 - Consistencia do maior caloteiro

- Corrigida inconsistencia em que admin e conta pessoal podiam ver jogadores diferentes no ranking `Maior caloteiro atual`.
- Causa: contas nao-admin nao carregam dados financeiros completos do Supabase (`payments`, overrides e settings), mas o painel Stats calculava o ranking mesmo assim com dados vazios/cache local.
- Decisao: o ranking financeiro continua visivel para admins; contas nao-admin veem cartao explicativo em vez de ranking possivelmente errado.
- Adicionada verificacao local `scripts/check-stats-finance-visibility.mjs`.
- Cache-buster actualizado para `20260709-statsfinance1`.
- Validacoes: `node scripts/check-stats-finance-visibility.mjs`, `node --check app.js`, `npm.cmd run build:web`, `node --check www\app.js`.

## 2026-07-23 - Rankings de Stats

Implementacao:

- Adicionado o modulo puro `stats-calculations.js`, compativel com global de browser e CommonJS, com testes automatizados.
- `app.js` integra os resumos de duplas, triplas e medias de golos por jogador.
- A sequencia de vitorias em Stats ignora jogos com placar invalido; ausencias, empates e derrotas validos continuam a interrompe-la.
- `scripts/build-web.mjs` copia `stats-calculations.js` e valida todos os scripts locais referenciados pelo `index.html` gerado.
- `www/` esta sincronizado com a origem e usa o cache-buster `20260723-statsrankings1`.
- As linhas de combinacoes sao responsivas, os links dos jogadores nas combinacoes tem altura minima de 44 px e os separadores nao ficam orfaos no fim da linha.
- Nomes nas duplas e triplas mantem-se inteiros: se nao couberem, passam para a linha seguinte sem quebra por letra.
- Cache-buster do CSS actualizado para `20260723-combonames1`.

Validacao completa:

- `npm.cmd run test:stats`: passou, 14 testes, 14 aprovados, 0 falhas.
- `node --check app.js`: passou.
- `node --check stats-calculations.js`: passou.
- `npm.cmd run build:web`: passou sem alterar `www/app-config.js`.
- `node --check www/app.js`: passou.
- `www/stats-calculations.js`: existe.
- Hashes SHA-256 de `app.js`, `styles.css`, `index.html` e `stats-calculations.js`: cada ficheiro de origem corresponde exactamente ao equivalente em `www/`.
- Smoke test local: `index.html` devolveu HTTP 200, o cache-buster `20260723-statsrankings1` estava presente e `stats-calculations.js` devolveu HTTP 200.
- `git diff --check`: passou.

## Comandos uteis

## 2026-09-13 - Respostas retroativas sem repetir o voto MVP

Implementacao local preparada na branch `codex/meu-perfil`:

- O jogo de transicao continua pendente enquanto faltarem as duas respostas, mesmo que o jogador ja tenha votado no MVP.
- O modal omite a escolha de MVP quando encontra um voto existente e pede apenas intensidade e energia.
- O modo local e a RPC do Supabase preservam o voto existente e criam apenas `game_feedback` nesse caso.
- A RPC mantem validacao de autenticacao, jogador associado, participacao, rollout e duplicados; um candidato so pode ser omitido quando ja existe voto.
- `supabase/postgame-feedback-migration.sql` e o bloco canonico de `supabase/schema.sql` foram atualizados em conjunto.
- Migration remota `allow_retroactive_postgame_feedback` aplicada no Supabase em 2026-09-13.
- Verificacao remota confirmou a funcao privada com `SECURITY DEFINER`, `search_path` vazio, detecao de voto existente e insercao condicional do voto.
- Teste autenticado numa transacao revertida confirmou: voto existente preservado, nenhum voto duplicado e feedback criado; o rollback removeu a resposta artificial.
- Frontend desta funcionalidade publicado em `main` no commit `bebe531`.

## 2026-09-13 - Correcao do jogo de transicao

- Diagnostico: o rollout tinha escolhido 27/05/2026 porque jogos legados sem `score_saved_at` partilhavam um `updated_at` de importacao ligeiramente posterior ao fecho de 09/09/2026.
- A selecao inicial passou a ordenar primeiro por `game.date desc` e apenas depois pelo marcador tecnico de fecho.
- Migration remota `repair_postgame_rollout_to_latest_game` aplicada: jogo de transicao alterado de 27/05/2026 para 09/09/2026.
- Foram removidas as 4 respostas indevidamente recolhidas para 27/05; os 11 votos MVP desse jogo foram preservados.
- Confirmados 11 participantes com conta ligada e resposta pendente para 09/09.

Ver estado:

```powershell
git status --short
```

Validar JS base:

```powershell
node --check app.js
```

Build web:

```powershell
npm.cmd run build:web
```

Validar bundle:

```powershell
node --check www\app.js
```

Smoke local, com servidor ja activo:

```powershell
Invoke-WebRequest http://127.0.0.1:5173/
```

## Nota sobre Supabase

Quando forem adicionadas novas tabelas ou politicas, rever `supabase/schema.sql` e aplicar o schema no SQL Editor do Supabase. O README indica que pagamentos precisam de `payments`, `attendance_overrides` e `finance_settings`.
## 2026-10-08 - Contexto temporal das cartas de prémios

- MVP do mês e Ironman mensal mostram todos os meses conquistados, com ano, na montra e no detalhe; os meses seguem os mesmos critérios usados na contagem dos prémios.
- MVP por jogo e sequências MVP mostram datas; Primeira vitória mostra a data da conquista. Resumo mensal e revelações usam a data do prémio apresentado.
- Cartas do resumo mensal abrem o detalhe por clique/teclado, sem inventar uma contagem quando esta não existe.
- Modal com scroll vertical e meses em etiquetas adaptáveis; layout verificado a 375px e 950px com 24 meses, sem overflow horizontal.
- Validações: check, stats, postgame, monthly, 8 testes de contexto das cartas, check-award-reveal-ui e sintaxe www. Build web repetido com sucesso após EPERM da sandbox.
- Cache-buster JS/CSS: `20261008-awardperiods1`. Sem alterações remotas, commits ou publicação.
- Diff check dos ficheiros desta tarefa passou; a verificação global mantém apenas linhas vazias finais preexistentes nas notas 00/05.

## 2026-10-10 - Tema visual "Holofote"

- Substituido o visual claro verde/vidro por um tema escuro de estadio a noite: fundo azul-escuro com luz de projetores, destaque azul igual a chama do logo (`--accent: #3b8cff`), verde reservado a estados positivos.
- Tipografia: Big Shoulders Display (titulos e numeros de destaque) e Archivo (texto), carregadas do Google Fonts em `index.html`; sem rede ficam as fontes de recurso.
- Tokens em `:root` de `styles.css` (`--accent`, `--accent-2`, `--accent-glow`, `--surface-opaque`, `--font-display`, `--font-body`). Campo e cartas FIFA mantem cores proprias.
- PNG exportado (`drawGameCanvas` em `app.js`) segue o mesmo tema: fundo escuro, placard azul e fontes do tema.
- `theme-color` e manifest passaram a `#05080f`. Barra de estado Android/iOS nao foi alterada.
- Cache-buster JS/CSS: `20261010-holofote1`.

## 2026-10-15 - Navegacao reorganizada e Galeria

- Separadores principais: Jogo (convocatoria + gerar na mesma pagina), Historico, Galeria, Stats (sub-separadores Hall of Fame, Jogadores, O meu mes) e Admin (Pagamentos, Pedidos; so admin).
- `VIEW_GROUPS` em `app.js` liga cada vista ao separador; as vistas `events` e `today` continuam a existir e aparecem juntas. `showView("today")` faz scroll ate `#generate-anchor`.
- Para nao-admins, os passos 1 e 2 do gerador ficam escondidos ate carregarem em "Experimentar gerar equipas"; o jogo confirmado continua visivel.
- Conta, Meu perfil, Trocar conta, Entrar, Criar conta e Sair passaram para o menu do avatar no topo.
- No telemovel (< 760px) os separadores ficam numa barra fixa em baixo, com icones.
- Galeria (`renderGallery`): jogos com video agrupados por mes, miniatura do YouTube e leitor em janela (`#video-lightbox`) com partes e atalho para o jogo. Precisa de sessao, como os videos do historico.
- Cache-buster JS/CSS: `20261015-nav1`.

## 2026-10-15 - Momentos (bookmarks) nos videos e Highlights

- Qualquer jogador com conta marca um momento no video (historico do jogo e leitor da Galeria) com um comentario curto. O pedaco guardado vai de 5 s antes a 5 s depois, ajustavel em passos de 5 s.
- O tempo atual vem do leitor do YouTube por postMessage (`listenToVideoClock` / `getVideoCurrentTime`); se nao der para ler, o utilizador escreve o momento em mm:ss.
- Tocar num momento recarrega o leitor com `start`/`end` (`gameVideoEmbedUrl(..., end)`), por isso so toca esse pedaco.
- Tabela `game_video_bookmarks` em `supabase/bookmarks-migration.sql` (RLS: autenticados leem, cada um insere os seus, apaga os seus; admin apaga qualquer um). Sem a tabela, os momentos ficam no dispositivo (`footer-video-bookmarks-v1`).
- Galeria tem filtro Jogos / Highlights; Highlights agrupa os momentos por jogo (cabecalho com data, resultado e numero de momentos) e abre o leitor so no pedaco.
- Cache-buster JS/CSS: `20261015-moments2`.
- Ecra cheio proprio (`data-video-stage`, botao ⛶ no canto do video): o do YouTube fica desligado (`fs=0`) para se poder marcar momentos por cima. Em ecra cheio aparece o botao 🔖 semi-transparente; o formulario abre translucido sobre o video e o video continua depois de guardar. No iPhone (sem Fullscreen API para elementos) o palco ocupa a pagina toda (`pseudo-fullscreen`). Botao "Ecra cheio" por baixo do video (os cantos do leitor sao do YouTube); em ecra cheio, sair e 🔖 ficam a meio da direita. Cache-buster `20261015-stage2`.

## 2026-10-21 - Perfil do jogador (fase 1 do revamp)

- O perfil e a pagina principal do jogador: miniatura da carta (abre a carta completa e a colecao), seletor de periodo (mes, 3 meses, epoca set-ago, tudo), resumo com presencas, V/E/D e MVP, quatro indicadores (distancia, ritmo, velocidade max., sprints), destaque factual e separadores Jogo a jogo / Cartas / Historico / Com quem.
- Calculos em `player-insights.js` (testes em `tests/player-insights.test.mjs`, `npm.cmd run test:insights`): ritmo = distancia total / minutos validos totais; cobertura por metrica ("2 de 3 jogos"); ausencia = "sem dados", nunca zero; destaques comparam os dois ultimos jogos analisados sem tirar conclusoes de forma fisica.
- Qualidade: etiqueta Beta e botao de informacao por metrica com o estado do tracker (preliminar, indicativo, detetado). Sem recordes enquanto nenhum jogador for elegivel. Jogos de tracking marcados como teste contam (decisao do utilizador).
- "O meu mes" (Stats) abre o proprio perfil no periodo deste mes. Calorias (estimativa) e forma fisica percebida so aparecem no proprio perfil.
- Velocidade max. tem atalho "Ver o momento" quando o jogo tem video (usa `maxSustainedAtS` e `videoSeekTarget`).
- Proximas fases: evolucao com grafico grande e escolha de metrica, mapa de calor orientado para o ataque, duas colunas no computador; depois relacoes com contexto, passes, comparacao opcional com o grupo, stories.
- Cache-buster JS/CSS: `20261021-profile1`.

## 2026-10-28

- Commits: `c88eee9` (rename footer) e `a906e31` (reorganizacao de Jogos). Cache-buster JS/CSS: `20261028-jogos4`.
- VM `orq`: instalado Node 20.19.2 / npm 9.2.0 via apt; credenciais git guardadas com `credential.helper store` (token limitado a este repo).
- Chromium/Playwright nao arrancam na VM (faltam libs do sistema): a UI de Jogos nao foi testada visualmente, so `check`, `test:stats`, `test:postgame`, `test:monthly`.
- `showView` mostra agora so a vista pedida (antes empilhava `events` + `today`).

- Hall of Fame redesenhado: `renderStatsPanel` em `app.js` com classes `hof-*` em `styles.css` (CSS antigo `stats-*` removido). Funcoes de dados aceitam `range` (FooterInsights.periodRange). `statsPeriod` e `openStatsLists` guardam o estado entre renders.
- Versao 1.8.0 no CHANGELOG de `notifications.js`. Cache-buster JS/CSS: `20261028-hof1`.

- Novo `month-review.js` (regras de abertura `reviewStatus` e cartoes `buildSlides`; testes em `tests/month-review.test.mjs`, `npm run test:review`). `player-insights.js` exporta `weakestOf`. Integracao em `app.js`: `getMonthReviewStatus`, `getMonthReviewData`, `openMonthReview`, `renderStatsVideoSection`.
- Versao 1.9.0. Cache-buster `20261028-review1`.
- Validar UI sem browser: instalar `jsdom` no scratchpad, carregar `index.html` com um ResourceLoader local (sem rede; `app-config.js` vazio para nao ir ao Supabase), semear `five-a-side-balancer-state-v1` e `footer-tracking-test-v1` no localStorage e chamar `renderStatsPanel()` / `openMonthReview()`.
- Corrigido (1.10.1): `let pitchCatalogPromise` passou para o topo do `app.js`; estava a ser usada por `bindPitchPicker` antes de inicializar (TDZ) e o seletor Concelho/Campo nunca aparecia.

- Migracao `supabase/security-hardening-migration.sql`, aplicada pelo utilizador no SQL Editor a 2026-10-28. A funcao do gatilho nao pode ser SECURITY DEFINER (precisa de `current_user` = papel de quem faz o pedido). Testada com transacoes desfeitas: jogador a mudar a nota falha (`players_self_update_only_photo`), jogador a mudar a foto passa, admin a mudar a nota passa. A app so envia `photo_data_url` e `updated_at` no upload de foto (`updateOwnPlayerPhoto`), por isso nada parte.
- Pedidos de permissao do MCP Supabase (apply_migration) podem nao aparecer ao utilizador e ficam parados indefinidamente; nesse caso, dar-lhe o SQL para correr no SQL Editor.
- Versao atual 1.11.0 (grupos automaticos). Cache-buster de `app.js` e `notifications.js`: `20261028-groups1`. A migracao `supabase/auto-groups-migration.sql` (funcoes `create_group` e nova `create_own_player`) tem de estar aplicada antes de publicar esta versao da app.
- Versao 1.12.0 (avisos de admin e quarentena de grupos). Cache-buster `20261028-quarantine3` (app, CSS, notificacoes); migracoes ja aplicadas pelo utilizador a 2026-10-28, pg_cron ativo. Antes de publicar, aplicar por esta ordem: `supabase/auto-groups-migration.sql` e `supabase/group-quarantine-migration.sql` (inclui `create extension pg_cron` e o agendamento `footer-purge-deleted-groups`).
- Versao 1.13.0 (disponibilidade). Cache-buster `20261029-availability2`. "A minha disponibilidade" passou para um sub-separador proprio em Jogos (`view-availability`, `VIEW_GROUPS.availability`). Perfil visivel (sim/nao) e modo `weekly`/`dates` em `player_availability_settings`; semana tipo em `player_weekly_availability` (weekday ISO 1-7, horas por dia). `private.effective_availability` junta os dois modos para `list_available_players` e `invite_to_event`. Migracao `supabase/availability-weekly-migration.sql` (depois de `availability-migration.sql`) aplicada pelo utilizador a 2026-10-29 e verificada (tabelas com RLS e politicas, funcoes a usar `effective_availability`).
- Numero em Jogos / Jogos publicos: vermelho para pedidos (admin), convites e jogos novos dentro da disponibilidade (`isInMyAvailability`, hora local do aparelho, segue o modo escolhido); amarelo (`.badge-info`, `--amber`) quando so ha jogos novos fora da disponibilidade. `setBadgeCount(selector, count, tone)`.
- Versao 1.14.0 (editar momentos). Cache-buster `20261029-moments-edit1` (app, CSS, notificacoes). Botao ✎ em cada momento para o autor ou admin (mesma regra de `canDeleteBookmark`); abre o formulario de "Marcar momento" preenchido (`wireMomentForm(...).edit(item)`) e grava com `updateVideoBookmark` (texto, tempo, inicio e fim; jogo, video e autor nao mudam). Migracao `supabase/bookmarks-edit-migration.sql` (grant update so nas colunas `moment_s`, `start_s`, `end_s`, `note` e politica "bookmarks update own or admin") aplicada pelo utilizador a 2026-10-29 e verificada. A barra de momentos por baixo do video tambem se refaz quando o tempo ou o texto mudam.
- Versao 1.14.1 (momentos em repeticao). Cache-buster `20261029-momentloop1`. O leitor deixou de usar o `end` do YouTube (no fim parava e so oferecia voltar ao inicio do video). `setMomentLoop(frame, inicio, fim)` guarda o pedaco no iframe e `tickMomentLoop` (no ciclo de 250 ms dos `momentTrackers`) faz `seekTo` ao inicio quando chega ao fim. Botao "Continuar o jogo" no canto superior esquerdo do palco tira a repeticao e o video segue. Saltar mais de 4 s para fora do pedaco tambem a desliga, mas so depois de o video ter entrado no pedaco (`loopArmed`), porque o tempo pode vir antigo enquanto carrega. Sem relogio do leitor o video simplesmente continua.
- Versao 1.15.0 (zoom em ecra cheio; 5× acrescentado na 1.16.0). Cache-buster `20261029-stagezoom1`. Botao `data-stage-zoom` (1×/2×/3×/5×, so em ecra cheio, abaixo do 🔖) em `renderStageControls`; `setStageZoom` poe `--stage-zoom` e `--stage-pan-x/y` no palco e o CSS aumenta o iframe (largura/altura reais, nao `transform`, para o YouTube escolher qualidade maior) e desloca-o dentro de `.game-video-frame` (overflow hidden). Com zoom, a camada `data-stage-pan` por cima do iframe recebe os toques: arrastar muda a zona, toque simples faz play/pausa por postMessage (os controlos do YouTube ficam fora do ecra). Sair do ecra cheio volta a 1×.
- Versao 1.16.0 (velocidade, zoom 5×, momentos seguidos). Cache-buster `20261030-speedreel1`. Em ecra cheio, coluna da direita centrada: sair, 🔖, zoom, ½× e 2× (`data-stage-speed`, `setStageSpeed`; tocar no ativo volta a 1×). O YouTube repoe 1× quando recarrega, por isso `tickStageSpeed` (no ciclo dos momentos) reenvia `setPlaybackRate` se o `playbackRate` do relogio nao bater certo. Momentos seguidos: `getMomentReelItems` (por parte e tempo), `tracker.reel` no `momentTrackers`; `tickMomentLoop(frame, now, onEnd)` chama `advanceMomentReel` no fim de cada pedaco em vez de repetir; o botao do canto mostra "n de N · Seguinte". Entradas: "▶ Ver os N momentos seguidos" em Galeria > Highlights (`openVideoLightbox(id, { reel: true })`) e "▶ Todos seguidos" no bloco de momentos (leitor da galeria e pagina do jogo). Tocar num momento solto ou saltar no video acaba a sequencia. No fim pausa. Leitor da galeria e da pagina do jogo saltam com `seekTo` quando o mesmo video ja esta carregado (sem recarregar).
- Versao 1.16.1. Cache-buster `20261030-allhighlights1`. Os momentos seguidos chamam-se "All Highlights" (botoes `data-gallery-reel` e `data-moment-reel`). O canto superior esquerdo do palco passou a ser uma barra (`data-moment-loop-bar`) com o botao principal ("Continuar o jogo" na repeticao, "Seguinte" no All Highlights) e "✕ Sair" (`data-moment-reel-exit`, so no All Highlights), que acaba a sequencia e deixa o video seguir dali.
- Versao 1.16.2. Cache-buster `20261030-allhighlights2`. No All Highlights a barra do canto e uma so pilula amarela `.moment-reel` (◀ anterior com `stepMomentReel(tracker, -1)`, contador n/N, ▶ seguinte, ✕ sair); "Continuar o jogo" so aparece na repeticao de um momento solto.

## 2026-10-30 - Leitor de video proprio (testes, so admin da plataforma)

- Novo `video-lab.js` (`window.FooterVideoLab.mount`), incluido em `index.html` e em `scripts/build-web.mjs`. Usa `<video>` nativo com controlos proprios: tocar/pausa, ±10 s, imagem a imagem (1/30 s), barra de posicao, velocidade 1/0,5/0,25/2×, zoom ate 5× (botao, dois dedos, roda do rato; arrastar com zoom; toque pausa), ecra cheio (pseudo no iPhone), teclado e painel "Diagnostico".
- Em `renderGallery`: `galleryMode = "lab"` so com `isPlatformAdmin`; senao volta a "games". O leitor do YouTube nao foi alterado.
- O endereco do video escreve-se no proprio separador (guardado em `localStorage` `footer-video-lab-src`); por defeito usa um MP4 de exemplo (MDN, dominio publico). Tem de ser https (a app e https). Para a NAS: usar `tailscale serve` na VM para ter https.
- O Chromium de testes da VM nao toca MP4/H.264 (usar .webm nos testes); Chrome e Safari dos telemoveis tocam.
- Cache-buster `20261030-videolab1`.
- Videos de teste: pasta `~/videos-teste` da VM servida por `tailscale serve` em `https://maestro.tail85c4b5.ts.net/videos/` (so dentro do Tailscale; aceita pedidos parciais, por isso da para saltar no video). O desktop tem chave SSH para a VM (`desktop-claude`) e copia com `scp`. A NAS nao abre sem utilizador (convidado recusado).
- 2026-10-31: Bunny Stream ligado em teste. Biblioteca `footer-teste` (Frankfurt, "Keep original files" ligado); chave da biblioteca so na VM (`~/.config/bunny/stream.env`, 600). CDN `vz-fdc7df5c-b0e.b-cdn.net` so serve com Referer autorizado (o GitHub Pages da app funciona; testes locais precisam de simular o Referer; a app Android/iOS vai precisar do seu proprio). O leitor de testes toca HLS com hls.js 1.5.20 (light, carregado so quando o endereco e .m3u8), escolha de qualidade (Auto ou fixa) e botoes "Jogo 1080p" / "Jogo 4K". Cache-buster `20261031-videolab2`.
- Medido no Bunny (trecho de 3 min do jogo de 28/10): envio de 1080p (361 MB) em 33 s e de 4K (1,52 GB) em 139 s (~90 Mbps); conversao em poucos minutos. Qualidades: 480p 1,4 / 720p 3,6 / 1080p 7,4 / 1440p 11,9 / 2160p 37 Mbps. Espaco: 1080p 0,91 GB (0,36 original + 0,55 versoes); 4K 3,30 GB (1,52 + 1,78).

- Ecra cheio do leitor de testes: barra fina numa so linha por cima do video (posicao ao meio); 5 s sem mexer com o video a dar deixa so as silhuetas dos botoes. Em Auto o seletor mostra a qualidade a tocar ("Auto · 1440p"). Cache-buster `20261031-videolab3`.
- Leitor de testes (videolab4): modo pequeno em 3 filas (posicao+tempo; tocar/andar/ecra cheio; qualidade + canto). Ecra cheio em "L": barra fina em baixo + coluna no canto direito (de cima: ⏩ 1/2/4x, 🐢 1/0,5/0,25x, 🔖 marcar, 🔍 zoom no canto). Momentos do leitor de testes guardados so no telemovel (`localStorage` `footer-video-lab-moments`), caixa pequena e transparente no canto de cima. O aviso do navegador ao entrar em ecra cheio nao se tira (seguranca do Chrome/Brave).
- 2026-10-31: Galeria > Testes aberto a todos os jogadores dos Futeboleiros (`canSeeVideoLab`: admin da plataforma ou grupo ativo `futeboleiros` com sessao), para recolher opinioes. Outros grupos nao veem (o video e de um jogo dos Futeboleiros). Jogadores so veem os botoes Jogo 1080p / Jogo 4K (abre no 4K, qualidade Auto); endereco, Exemplo e Diagnostico so para o admin da plataforma. Cache-buster `20261031-videolab5`.
