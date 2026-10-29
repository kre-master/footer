# Resumo dos chats

## Fase 1 - Gerador 5v5 e base local

O projecto nasceu como uma app estatica para gerar equipas equilibradas de futebol 5v5. A primeira direccao foi permitir gerir uma lista de jogadores, ratings estilo FIFA, presencas do dia, sugestoes de equipas, campo visual, confirmacao de jogos e historico.

Decisoes importantes desta fase:

- Jogadores fixos tem nome, overall e stats parciais.
- Convidados podem ter uma nota rapida convertida em rating temporario.
- O algoritmo gera varias sugestoes e ordena por equilibrio.
- O historico deve guardar equipas, resultado e dados suficientes para revisitar jogos.
- A interface deve ser util em mobile, porque o uso provavel e no telemovel antes/depois do jogo.

## Fase 2 - Grupo privado, contas e convocatorias

Depois, o projecto passou de gerador isolado para app de grupo privado. Entraram contas, perfis, associacao entre utilizador e jogador, admin, Supabase, eventos/convocatorias e respostas.

Decisoes importantes:

- Visitantes podem ver a app e criar conta.
- Jogadores criam conta por email/password, escolhem username e reclamam um perfil de jogador existente.
- Admin aprova pedidos de associacao.
- Admin cria convocatorias com data, hora, local e limite de jogadores.
- Jogadores respondem `Vou`, `Talvez` ou `Nao vou`.
- A convocatoria tem limite, normalmente 12 jogadores.
- Ao atingir o limite, a app nao deve deixar mais jogadores marcar `Vou`.
- `Gerar com confirmados` deve carregar os jogadores confirmados directamente para sugestoes/preview.
- A data do jogo confirmado deve vir da convocatoria, nao do momento do clique.

## Fase 3 - Pagamentos

Foi adicionada uma area admin de pagamentos. O objectivo e calcular mensalidades ou valores por presenca, permitir ajustes manuais e exportar texto para WhatsApp.

Decisoes importantes:

- `Pagamentos` e separador admin.
- A tabela mensal usa presencas confirmadas e overrides.
- Admin pode registar pagamentos manuais.
- Admin pode exportar resumo para WhatsApp.
- O schema precisa de tabelas como `payments`, `attendance_overrides` e `finance_settings`.

## Fase 4 - Mobile/Capacitor

Foi preparada uma app mobile com Capacitor, reaproveitando o bundle web em `www/`.

Decisao mais importante:

- Alteracoes futuras devem ser feitas primeiro na versao base/web.
- Android/iOS so devem ser alterados quando for pedido explicitamente.

Cuidados:

- `npm run build:web` actualiza `www/`.
- `www/app-config.js` pode ser tocado pela build sem necessidade; se aparecer modificado sem intencao, verificar e provavelmente restaurar.

## Fase 5 - Ratings, forma e MVP

Entrou um sistema de forma/rating interno para tornar equipas mais justas com base em jogos recentes, MVP, streaks e ausencias.

Decisoes importantes:

- Rating publico visivel deve aparecer como overall/form.
- Rating actual/privado e edicao devem ficar restritos a admins.
- Overall pode ser recalculado automaticamente a partir dos parciais.
- O rating base continua estavel; a forma/rating actual e derivada.
- A geracao de equipas deve considerar rating actual e distribuicao de forma, sem criar equipas absurdas.

MVP:

- O voto de MVP deve ser confidencial.
- Jogador nao pode alterar voto depois de votar.
- Admin pode ver contagem de votos sem ver quem votou em quem.
- Pode haver empate de MVP.
- MVP vale apenas para o jogo seguinte se o jogador participar.

## Fase 6 - Cartas, premios e perfil de jogador

O projecto ganhou cartas estilo FIFA e uma camada mais visual de perfil/premios.

Decisoes importantes:

- Existem templates novos em `assets/new cards template`.
- Cartas variam por contexto: base, forma, vitorias, MVP, premios e outros estados.
- A pagina de jogador deve comecar pela carta.
- A montra de premios deve mostrar desbloqueadas x/y.
- As cartas no campo/historico devem poder abrir a pagina do jogador.

## Fase 7 - Historico, radar e odds

O historico foi refinado para ser uma area propria e nao um simples retorno ao gerador.

Decisoes importantes:

- Jogos finalizados devem abrir uma pagina propria de historico.
- Clicar num jogo finalizado dentro do perfil do jogador deve abrir `history-game`, nao `today/Gerar`.
- O campo no historico deve permitir clicar em cartas para abrir o jogador.
- O radar usa stats agregados com peso exponencial para valorizar jogadores fortes.
- Houve pedido para odds/probabilidades com base no radar.

Problema recente:

- Apos alteracoes do radar, o historico ficou vazio e clicar no historico do jogador abria o Gerar com erro amarelo.
- Causa identificada: chamadas a `clamp(...)` quando a funcao existente no projecto era `clampNumber(...)`.
- Corrigido em `app.js` e `www/app.js`.

## Fase 8 - Estado mais recente conhecido

Ultimo commit conhecido:

- `f048acf - Fix history render after radar odds`

Commit anterior problematico:

- `e2bd3a4 - Revise team generation and radar odds`

Validacoes feitas na ultima correcao:

- `node --check app.js` passou.
- `npm.cmd run build:web` passou.
- `node --check www\app.js` passou.
- Smoke test local em `http://127.0.0.1:5173/` devolveu `STATUS=200` e `CACHE_BUSTER=ok`.

O commit `f048acf` foi publicado em `main`.

## Fase 9 - Correcao dos campeoes de estacao

Em 2026-06-04 foi corrigida a regra das cartas/conquistas de campeao de estacao.

Problema observado:

- Alguns jogadores apareciam com carta de campeao de verao antes do verao.
- Bruno Marques aparecia com conquista de campeao de primavera antes de a primavera terminar.

Causas encontradas:

- O codigo dividia estacoes por meses inteiros.
- A primavera estava a ser tratada como marco-maio e o verao como junho-agosto.
- Uma estacao podia ficar "completa" se todos os jogos registados ja tivessem passado, mesmo antes do fim real da estacao.
- O calculo podia devolver varios campeoes em empate absoluto.
- A carta sazonal podia ficar ativa fora do jogo seguinte.

Regra corrigida:

- Primavera: 20 marco ate antes de 21 junho.
- Verao: 21 junho ate antes de 22 setembro.
- Outono: 22 setembro ate antes de 21 dezembro.
- Inverno: 21 dezembro ate antes de 20 marco.
- Campeao sazonal so existe depois do fim real da estacao.
- Apenas um jogador ganha por estacao.
- A carta sazonal ativa aparece apenas no primeiro jogo do campeao depois do fim da estacao.
- Cartas de campeao de estacao sao temporarias de campo e nao entram na montra permanente de premios.
- O historico individual mostra o resultado da perspectiva do jogador: jogador da Equipa B num 11-12 ve `12 - 11 Vitoria`.
- A coluna `ULT. 5` da lista de jogadores usa os ultimos jogos em que o jogador participou, nao os ultimos jogos globais da equipa.
- Os pontos `ULT. 5` sao mostrados em ordem cronologica visual, com o jogo mais recente a direita.
- No historico de jogos, cada cartao mostra o nome do jogo/convocatoria quando a app consegue associar o jogo ao evento.
- No detalhe do jogo historico, o botao `Voltar` do topo foi removido e o nome do jogo aparece antes do campo.
- No historico, as probabilidades do radar aparecem inline ao lado de `Equipa A` e `Equipa B`; o layout do radar no jogo atual mantém-se separado.
- MVP do mes fica registado na montra permanente de premios.
- Desempate de MVP do mes: mais MVPs oficiais no mes, depois mais vitorias no mes, depois melhor win rate no mes; se continuar empatado, os jogadores empatados recebem a carta.
- MVP do mes so e atribuido depois do mes estar fechado e aparece apenas no primeiro jogo elegivel do mes seguinte em que o jogador participe.

Ficheiros alterados:

- `app.js`
- `index.html`
- `www/app.js`
- `www/index.html`

Validacoes:

- `node --check app.js` passou.
- `npm.cmd run build:web` passou.
- `node --check www\app.js` passou.
- Smoke test local em `http://127.0.0.1:5173/` devolveu `STATUS=200` e `CACHE_BUSTER=ok` com cache-buster `20260604-mvpmonth2`.

## 2026-10-28 - Renomear para footer e reorganizar Jogos

- Projecto renomeado para `footer`: repo `kre-master/footer`, pasta local `~/orquestrador/footer`, package, bundle ids `com.kremaster.footer`, URL Pages https://kre-master.github.io/footer/ (o link antigo deixou de existir). Pages exige repo publico.
- Pagina Jogos reorganizada: subtabs Os meus jogos / Jogos publicos / Nova convocatoria (admin), cartao compacto, vista de equipas propria. Ver [[03 - Decisoes e regras]] e [[04 - Estado tecnico]].

## 2026-10-29 - Editar momentos

- Um jogador reportou o "quarto falhanco" a aparecer duas vezes. Nao era erro: eram dois momentos diferentes (39:01 e 51:44) com o mesmo texto escrito pelo autor. Pediu para os momentos serem editaveis.
- Feito: quem marcou o momento (ou um admin) corrige texto, tempo e pedaco com o botao ✎. Versao 1.14.0. Ver [[04 - Estado tecnico]].
- Ver um momento: no fim do pedaco o video parava e so oferecia voltar ao inicio do jogo. Agora o pedaco repete-se ate se carregar em "Continuar o jogo" (segue dali) ou saltar para outro ponto. Versao 1.14.1.
- Pendente: o momento das 51:44 do jogo de 29/10 (amandio.torres) continua com o texto "Quarto falhanco"; deve passar a "Quinto falhanco" (o autor ou um admin, agora pela app).
