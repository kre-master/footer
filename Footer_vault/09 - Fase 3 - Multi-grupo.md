# Fase 3 - Multi-grupo

Estado: em desenho (brainstorming iniciado a 2026-10-22). Ainda nada implementado.

## Fases do projecto

1. Site funcional para jogos - feito.
2. Tracker com video + comunidade - feito, em melhoria continua.
3. Abertura a outros grupos de amigos com perfis e convocatorias privadas; onboarding facil para jogadores e admin; criar o grupo "Futeboleiros" - a iniciar.
4. Jogos publicos, mais grupos, outra infraestrutura e precos - a pensar.

## Ponto de partida tecnico

O schema Supabase e de um grupo so: `profiles.role` e global (`is_admin()`), qualquer autenticado le jogadores/jogos/convocatorias e nenhuma tabela tem `group_id`.

## Decisoes tomadas (2026-10-23)

- **Identidade**: uma conta por pessoa que pode jogar em varios grupos. Ratings, forma e stats sao por grupo (confirmado 2026-10-23); o rating publico fica para a fase 4.
- **Criacao de grupos**: so com aprovacao do dono da app durante a fase 3.
- **Ratings iniciais**: admin do grupo da nota de 1 a 100 a cada jogador; opcao "nao sei" = todos comecam iguais e a forma ajusta. A nota de jogadores novos/convidados ja passou a 1-100 (antes 0-10).
- **Tracker com video**: fora da fase 3, mas e para incluir mais tarde.
- **Grupo piloto**: grupo que joga a mesma hora no campo ao lado; falta falar com eles.

## Proposta de estrutura

- Tabelas `groups` e `group_members (group_id, user_id, role: owner/admin/player)`; `group_id` em todas as tabelas de dominio; RLS com `is_group_member(group_id)` / `is_group_admin(group_id)`; storage em `/{group_id}/...`.
- Migracao: criar "Futeboleiros", preencher `group_id` nos dados existentes, dono da app como `owner`. Sem mudanca visivel.
- `groups.visibility` (`private` por agora) para preparar os jogos publicos da fase 4.

## Onboarding

- Admin: nome/local/dia/hora/nr de jogadores/preco -> colar lista de nomes (perfis sem conta) -> ratings iniciais -> link de convite para WhatsApp -> checklist ate ao primeiro jogo.
- Jogador: link de convite -> conta -> "qual destes es tu?" (claim existente) -> admin aprova -> cai na convocatoria aberta.

## Roadmap

1. 3.0 Fundacoes invisiveis (group_id, Futeboleiros, RLS por grupo).
2. 3.1 App com nocao de grupo (grupo ativo, papeis, notificacoes/stats por grupo).
3. 3.2 Convites e onboarding do jogador.
4. 3.3 Criar grupo com aprovacao + wizard do admin.
5. 3.4 Piloto de 4 a 6 semanas.
6. 3.9 Apps, dominio proprio e precos - ver [[10 - Mapa de futuro e estrategia]] (folhas 2, 10 e 11).

## Passo 3.0 - estado

- Migracao escrita em `supabase/groups-migration.sql` (idempotente, numa transacao). Ensaio sem gravar em `supabase/groups-migration-dryrun.sql` (versao completa gerada em `output/groups-migration-dryrun-full.sql`).
- Ensaio corrido em producao a 2026-10-23 dentro de uma transacao anulada (nada ficou gravado): dono e admin veem tudo; jogador ve dados do grupo mas nao pagamentos/financas, so o proprio perfil e os proprios votos; nao consegue promover-se nem alterar votos; conta de fora nao ve nada.
- **Aplicada em producao a 2026-10-23** (migracao Supabase `groups_foundation_phase_3_0`). Verificado: grupo Futeboleiros com 22 membros (owner=1, admin=1, player=20), nenhum jogador/jogo/evento/pagamento sem grupo, votos MVP so com "read own" e "delete admin". Advisors de seguranca sem tabelas desprotegidas; avisos restantes sao funcoes abertas de proposito (`email_for_login`, `has_any_profile`, `is_admin`, `mvp_vote_counts`) e a protecao de passwords vazadas desligada no Auth.
- Modelo: `groups` + `group_members (owner/admin/player)`; `group_id` em players, games, events, payments, finance_settings; tabelas filhas herdam o grupo pelo jogo/jogador/evento (funcoes `private.game_group`, `player_group`, `event_group`). RLS com `private.is_group_member` / `private.is_group_admin`.
- Dados atuais e todas as contas ficam nos Futeboleiros; conta `admin` = owner.
- Transitorio ate a 3.1: default de `group_id` = Futeboleiros; `profiles.role` sincronizado com `group_members`; contas novas entram nos Futeboleiros.
- Para a 3.1: `submit_postgame_checkin` exige um unico jogador ligado a conta - tem de escolher o jogador do grupo do jogo; triggers de coerencia (jogador e jogo do mesmo grupo); `finance_settings` deixa de usar id `main`.

## Passo 3.1 - estado

- 3.1.1 (app sabe o grupo) feito a 2026-10-23: carrega `group_members` da conta, grupo ativo guardado por conta no dispositivo (`footer-active-group-v1:<user>`), admin vem do papel no grupo ativo (fallback `profiles.role` se os grupos nao carregarem), leituras de players/games/events/payments/finance filtradas por `group_id` e filhos filtrados pelos jogos/eventos do grupo, escritas levam `group_id`, financas de outros grupos com id `group-<uuid>` (Futeboleiros mantem `main`), reparacao de ligacoes duplicadas e aprovacao de pedidos so mexem no grupo ativo, novidades vistas por grupo (Futeboleiros mantem a chave antiga), seletor de grupo no menu da conta so com 2+ grupos.
- Testado com Supabase simulado no browser (2 grupos, admin num e jogador noutro).
- 3.1.2 aplicado em producao a 2026-10-23 (migracao `groups_integrity_phase_3_1`, ficheiro `supabase/groups-integrity-migration.sql`), ensaiado antes numa transacao anulada:
  - `submit_postgame_checkin` usa a ficha da conta no grupo do jogo (conta com fichas em varios grupos funciona);
  - gatilhos `*_same_group_players` em games, event_responses, payments, attendance_overrides e player_form_snapshots recusam fichas de outro grupo (`player_from_another_group`); ids inexistentes continuam aceites;
  - `public.set_group_member_role(grupo, conta, papel)`: so admin do grupo; dono fixo; ninguem muda o proprio papel; nos Futeboleiros sincroniza `profiles.role`. A app (lista de contas) usa esta funcao e mostra so as contas do grupo ativo (dono/admin/jogador).
- Fica para a 3.2: tirar o default Futeboleiros de `group_id` (mantido para versoes antigas da app em cache) e deixar de juntar contas novas aos Futeboleiros automaticamente (trigger `profiles_sync_legacy_membership`) quando houver convites.
- 3.1.3 aplicado em producao a 2026-10-23 (migracao `public_games_phase_3_1_3`, ficheiro `supabase/public-games-migration.sql`), ensaiado antes numa transacao anulada:
  - `events.visibility` (`group`/`public`) e `events.public_needs` (`outfield`/`mixed`/`goalkeeper`);
  - `player_traits` (forma, posicao, faixa etaria) da conta: le o proprio e o admin de um jogo a que a pessoa pediu para ir;
  - `event_join_requests` + RPCs `list_public_events`, `request_public_event` (exige caracteristicas; nao para o proprio grupo), `cancel_public_event_request`, `decide_public_event_request` (aceitar cria/reutiliza ficha de convidado no grupo com nota = media do grupo e poe "Vou"; recusa e definitiva para esse jogo);
  - app: controlos no cartao da convocatoria (admin), painel "Jogos publicos" (so aparece com jogos de outros grupos), "As minhas caracteristicas" na Conta. Versao 1.3.0.
- Limite atual: com um so grupo e contas novas a entrar nos Futeboleiros, ainda nao ha "de fora". Ganha vida com o segundo grupo.
- Depois: pagina do jogo e equipas para o convidado aceite (hoje so ve data/hora/local e o estado).

## Passo 3.2 - convites (2026-10-23)

- Migracao `supabase/group-invites-migration.sql` ensaiada numa transacao anulada e **aplicada em producao a 2026-10-23** (`group_invites_phase_3_2`), com OK do dono.
- `group_invites` (um link ativo por grupo, codigo de 16 caracteres); RPCs `get_group_invite` (admin; `p_renew` anula o anterior), `preview_group_invite` (qualquer pessoa, so devolve o nome do grupo), `accept_group_invite` (entra como jogador).
- Contas novas deixam de entrar automaticamente nos Futeboleiros; `profiles.role` so sincroniza quem ja e membro.
- `create_own_player(grupo, nome)`: membro sem ficha cria a sua (nota provisoria = media do grupo) e fica com pedido de associacao pendente; o admin aprova em Pedidos e acerta a nota. Um so pedido pendente por conta.
- App (v1.4.0): link `?convite=` guardado no dispositivo ate a pessoa entrar; faixa no topo (convite por aceitar / conta sem grupo); painel "Convidar jogadores" em Admin > Pedidos (mostrar, copiar, WhatsApp, gerar novo); depois de entrar abre "Qual destes es tu?" (pedido de perfil existente). Conta sem grupo comeca vazia (sem jogadores de exemplo).

## Passo 3.3 - grupos novos (2026-10-23)

- Migracao `supabase/group-requests-migration.sql` ensaiada numa transacao anulada e aplicada em producao (`group_requests_phase_3_3`).
- `private.platform_admins` (dono da app; comeca com o owner dos Futeboleiros) e `public.is_platform_admin()`.
- `group_requests` + RPCs `request_group` (um pendente por conta), `cancel_group_request`, `decide_group_request` (so dono da app; aprovar cria o grupo com slug `nome-xxxxx` e quem pediu fica owner).
- App (v1.5.0): cartao "Criar um grupo" na Conta (e atalho na faixa de quem nao tem grupo); "Pedidos de grupos novos" em Admin > Pedidos so para o dono da app; cartao "Primeiros passos" no separador Jogo para o admin de um grupo novo (colar jogadores "Nome 75", sem nota = media das notas dadas ou 60; link de convite; primeira convocatoria). Some com 6+ jogadores e uma convocatoria/jogo.
- Proximo: piloto com o grupo do campo ao lado.

## Disponibilidade e convites (2026-10-23)

- Migracao `supabase/availability-migration.sql` ensaiada numa transacao anulada e aplicada (`availability_and_invites_phase_3`).
- `player_availability` (dia + das/as, hora de Portugal; so a propria conta le/escreve). Ao oferecer-se, os admins de grupos com vagas veem nome, caracteristicas e disponibilidade.
- `list_available_players(evento)` (so admin do grupo do evento; contas de fora do grupo, semana do jogo, compativeis com dia e hora primeiro), `invite_to_event`, `respond_event_invite`; pedidos ganham estados `invited` e `declined`; aceitar pedido ou convite passa por `private.accept_join_request` (ficha de convidado + "Vou").
- App (v1.7.0): separador Jogos com bolinha vermelha (pedidos por decidir para admin, convites recebidos, jogos publicos ainda nao vistos neste dispositivo); bloco "Faltam X - Procurar jogadores" na convocatoria (precisamos de, mostrar em Jogos publicos, pedidos, disponiveis compativeis, disponiveis noutras horas/dias, Convidar); "A minha disponibilidade" (esta/proxima semana, dias, das/as) e convites com Aceitar/Recusar em Jogos publicos.
- "Precisamos de" fica guardado mesmo sem o jogo ser publico (serve para assinalar quem encaixa nos convites).

## Piloto (a partir de 2026-10-23)

- Grupo: o que joga a mesma hora no campo ao lado. Duracao: 4 a 6 semanas.
- Passos: admin deles cria conta -> Conta > Criar um grupo -> dono aprova em Admin > Pedidos -> Primeiros passos (colar jogadores, link de convite, primeira convocatoria) -> jogadores entram pelo link e escolhem/criam perfil.
- A observar: tempo ate a primeira convocatoria; quantos jogadores entram pelo link sem ajuda; duvidas no "Qual destes es tu?"; uso de Fazer equipas pelo admin deles; uso de jogos publicos/disponibilidade entre os dois grupos.
- Pendentes conhecidos: protecao de passwords expostas no Supabase (plano Pro) ou regras de password; convidado aceite ainda nao ve a pagina do jogo/equipas; horas fixas em Europe/Lisbon.

## Visibilidade dos jogos (decidido 2026-10-23, para a 3.1)

- Grupo privado (como os Futeboleiros): tudo o que e do grupo so e visivel para membros.
- Um jogo/convocatoria pode ser marcado **publico**, mesmo num grupo privado (ex.: falta um jogador). Qualquer jogador da comunidade ve esse jogo e pode dizer que esta disponivel; o admin do grupo/jogo aceita ou recusa.
- Desenho proposto: `events.visibility` (`group` | `public`); tabela de pedidos (`event_join_requests`: evento, conta, estado pendente/aceite/recusado); ao aceitar, a pessoa entra como convidado nesse jogo (perfil de jogador no grupo + resposta "Vou") e ve so esse jogo, nao o resto do grupo.
- Pre-requisito: o perfil publico da comunidade (fase 4) - na 3.1 basta conta Footer.
- Antes de ser aceite, quem e de fora ve: data, hora, local, quantos faltam e nome do grupo (sem lista de jogadores).
- Caracteristicas do jogador (opcionais, da conta, so vistas pelo admin de um jogo publico a quem pede para entrar):
  - forma autodeclarada: Descontraido / Regular / Atletico;
  - posicao: So guarda-redes / Misto (vai a baliza e troca) / Jogador de campo;
  - faixa etaria: 18-24, 25-34, 35-44, 45+ (nunca data de nascimento).
- O jogo publico indica o que precisa: Campo / Misto / Redes. A app assinala quem encaixa mas nao esconde os outros; decide o admin.
- Modelo: uma conta por pessoa; em cada grupo a pessoa tem uma ficha de jogador (rating, forma, stats, cartas desse grupo). Jogar em varios grupos e normal; num jogo so entram fichas do grupo desse jogo. Quem vem de fora e e aceite ganha ficha de convidado nesse grupo.

## Falhas de seguranca encontradas em producao (2026-10-23)

- `profiles`: a politica de update deixava qualquer conta mudar o proprio `role` para `admin`. Corrigido na 3.0 com trigger (so admin do grupo muda roles).
- `game_mvp_votes`: em producao estavam ativas politicas antigas que deixavam qualquer conta ler todos os votos (quem votou em quem) e alterar o seu voto; `anon` tinha privilegios de tabela. Corrigido na 3.0: "ler so o proprio voto", sem update.

## Pre-requisito ja feito

- 2026-10-23: convocatoria/`Fazer equipas` simplificado para o admin (ver [[03 - Decisoes e regras]], seccao Equipas).

## Riscos

- Login por username, rate limit/captcha e confirmacao de email antes de abrir a outros grupos.
- Custo de storage de videos por grupo.
- "Visto" das notificacoes passa a ser por grupo.
- Sair/apagar grupo e RGPD.
