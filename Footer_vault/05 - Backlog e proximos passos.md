# Backlog e proximos passos

## Prioridade operacional

Continuar a desenvolver primeiro a versao web/base. Preparar Android/iOS apenas quando for pedido explicitamente.

## Emails de conta e login (2026-11-10)

- [x] Servidor de email (2026-11-10): Gmail `footer.info.app@gmail.com` com palavra-passe de app (verificacao em 2 passos ligada). Teste real entregue na caixa de entrada. Definitivo continua a ser dominio + Resend (3.7).
- [x] Modelos "Confirm signup" e "Reset password" com codigo colados; Email OTP Length = 6.
- [x] Site URL e Redirect URLs confirmados pelo utilizador.
- [ ] Ligar Google (Google Cloud + Supabase) e por `authProviders: ["google"]` em `app-config.js`.
- [ ] Testar no site publicado: criar conta, recuperar por codigo e por link (email de recuperacao real ja verificado).
- [ ] Mais tarde: deep link para Google na app Android/iOS; Apple obrigatorio no iPhone se houver Google; Facebook exige verificacao da Meta.

## Ideias e areas futuras

### Videos e momentos

- Plano B para o video (decisao de 2026-11-02, so se o Funnel nao chegar): guardar os videos no Cloudflare R2 (sem custo de saida; ~0,015 USD/GB/mes; ~8 GB por jogo com as 3 qualidades, ~0,12 USD por jogo por mes; precisa de conta e cartao) em vez de os servir de casa pelo Tailscale Funnel (limite de ~7 Mbps, nao configuravel). Ver [[11 - Leitor de video proprio]]. Sinais para trocar: soluços com 720p ou queixas quando varios veem ao mesmo tempo. Manter o Funnel + varias qualidades como esta por agora.

- Ideia (2026-11-01): frequencia cardiaca do proprio jogador no video. Fase 1: carregar o ficheiro do treino do relogio (.FIT/.GPX; Garmin, Polar, Suunto, Coros; Apple Watch precisa de app para exportar), ligar ao jogo pela hora e mostrar FC media/maxima, calorias e grafico por baixo do video com os momentos marcados. Fase 2: numero a pulsar sincronizado com o video (e em ecra cheio), com ajuste fino de ±1 s (acertar no apito inicial). Fase 3 (depois das lojas, 3.7): ligacao automatica Garmin/Apple/Strava. Cuidados: GPS fraco em recinto coberto (usar FC e calorias; distancia e velocidade continuam a vir da analise de video); dados de saude so visiveis ao proprio, ver os dos colegas so com o OK de cada um. Directos (FC ao vivo durante o jogo) fora do plano, decisao de 2026-11-01. Antes de avancar: o utilizador esta a reunir a lista de aparelhos do grupo (se muitos Apple Watch, o passo de exportar pesa mais); retomar quando a lista estiver pronta.
- Aparelhos do grupo (2026-11-02): Huawei Watch GT 5 Pro, Apple Watch, Garmin, Amazfit. Formatos aceites na fase 1: TCX e GPX (FIT fica para depois; o Garmin Connect tambem exporta TCX/GPX). Como cada um tira o ficheiro: Garmin = Garmin Connect no site (engrenagem da atividade > Exportar para TCX ou GPX); Apple Watch = app de exportacao (ex.: HealthFit, RunGap), o export do app Saude e enorme e sem FC por treino; Huawei e Amazfit = ligar a app (Huawei Health / Zepp) ao Strava e no site do Strava exportar o original ou GPX (confirmar os menus no telemovel de cada um). Modulo `heart-rate.js` (leitura de TCX/GPX, corte pelo jogo, resumo, FC num instante do video com ajuste) com testes `npm run test:heartrate`; agora tambem le FIT e esta ligado ao historico do jogo (versao 1.17.0, ver [[04 - Estado tecnico]]). Feito: pilula com cor da zona por cima do video (1.18.0) e linha de FC sobre o grafico de movimento para acertar (1.19.0). Futuro (ideia do utilizador, 2026-11-02): marcar o inicio do jogo com um botao e registar golos e outros eventos; com isso o acerto dos relogios com o video passa a ser automatico e o ajuste manual so afina. Falta: clicar no grafico para saltar no video, partilha opcional com colegas, ligacao automatica.
- Strava (ideia do utilizador, 2026-11-05; so registada, nao avancar ainda): botao no historico do jogo "Ir buscar o meu treino ao Strava". O jogador autoriza o Strava uma vez; a app procura a atividade do dia do jogo pela hora e guarda so a serie de FC (mesma regra: so o proprio ve, nunca GPS). Cobre COROS, Huawei, Amazfit e Garmin (enviam para o Strava) e Apple Watch se usarem app que envie. Precisa de: app registada no Strava (conta de programador, gratis; o utilizador ainda NAO a tem, e so avanca quando houver app definida, sobretudo para abrir ao grupo todo), funcao no servidor (Supabase) para guardar a autorizacao de cada um, e treino no Strava com FC e visivel. A confirmar antes de construir: limite de contas de uma app nova (pode ser so a do dono ate o Strava rever a app) e termos atuais de uso dos dados (so mostrar ao proprio). Encaixa na fase 3 da FC (ligacao automatica, depois das lojas 3.7); o Strava seria o primeiro a fazer.

- Em curso (2026-10-30): leitor de video proprio em Galeria > Testes (so admin da plataforma). Passos: (1) amostra de 2-3 min do ultimo jogo em 1080p, feita no desktop; (2) guardar na NAS e servir pela VM com https (`tailscale serve`); (3) testar no telemovel; (4) se fizer sentido, escolher onde alojar para todos (Bunny Stream / Cloudflare Stream, confirmar precos) e substituir o YouTube. Acesso da VM ao desktop: so a partilha de ficheiros do Windows esta aberta; falta um utilizador so para a pasta dos videos.
- Em standby (decisao de 2026-10-30): descarregar momentos. So com o leitor de video proprio (fora do YouTube); ideia: a VM recorta o pedaco do video original guardado na NAS, a pedido, em 1080p (~10 MB por momento). Falta saber onde ficam os originais e quem pode descarregar.

### Radar e odds

- Refinar odds/probabilidades com base no radar.
- Garantir que os calculos usam helpers existentes como `clampNumber`.
- Validar historico depois de qualquer mudanca no radar.

### Cartas

- [x] Validar acesso privado ao ComfyUI do desktop Windows / RTX 5080: Wake-on-LAN, API e SSH confirmados em 2026-11-07; Tailscale Serve persistente na porta 18188, destino local 8188. O utilizador tem Parsec, e o assistente ja consegue iniciar o motor sem a janela.
- [x] Validar o primeiro teste de geracao local: chuteira em tecido e carta em papel, a partir dos originais, no FLUX.2 Klein Base 4B FP8. Previas em `/home/joao/maestro/output/footer-comfy-pilot-2026-11-07/`, sem glow e com fundo opaco.
- [ ] Preparar transparencias/camadas e testar familias visuais adicionais e glow independente antes de integrar. Conceito em [[12 - Cartas evolutivas e equipamento RPG]].
- [x] Concluir arranque remoto do ComfyUI a pedido do utilizador: SSH com chave do servidor verificada, servico do Maestro instalado e teste isolado de arranque com RTX 5080 CUDA concluido. Usar `python3 /home/joao/maestro/infra/bin/footer-comfy start`; nao exige repetir guioes nem abrir Parsec.
- [x] Preparar Markdown de passagem para o Claude, com infraestrutura reutilizavel e plano para as cartas/itens: `/home/joao/maestro/output/Footer_Cartas_Equipamento_RPG_Conceito.md`.
- [x] Conciliar contexto/plano com a secao 8 da nota 12 e validar o acesso pelo Claude (2026-11-07): `footer-comfy status` devolveu `ready`, ComfyUI 0.44.2, RTX 5080 CUDA. Fluxo oficial para produzir as imagens da gamificacao (cartas, molduras, fundos, auras, chuteiras, bolas, camisolas, calcoes, galhardetes).
- Plano das cartas evolutivas / equipamento RPG (por etapas, a acordar com o utilizador):
  1. [ ] Definir composicao modular e catalogo: fundo, foto, moldura, ornamentacao, aura e equipamento com identificadores independentes; familia estetica, raridade, evolucao e glow como dimensoes distintas.
  2. [ ] Padronizar recursos: dimensoes, escala, perspetiva, transparencia, nomes e metadados; guardar referencias, modelo, prompt, seed e workflow de cada lote; conservar originais.
  3. [ ] Produzir e rever recursos no sistema local (`footer-comfy start` + API ComfyUI + workflows do piloto); comecar por poucas pecas e familias nao metalicas; bases sem glow quando o glow deva ser independente.
  4. [ ] Prototipar a personalizacao na app: combinar camadas, escolher presenca/cor/intensidade do glow, legibilidade e desempenho em telemovel; textos e numeros desenhados pela app.
  5. [ ] Planear inventario e equipamento: slots, equipado/guardado, variantes e marcos de evolucao (ex.: niveis 1, 5, 10).
  6. [ ] Decidir progressao antes de qualquer bonus: 100% cosmetico, progressao propria, atributos virtuais ou hibrido (ver nota 12, sec. 7). Estatisticas reais intocaveis.
  7. [ ] Integrar por etapas: pequeno conjunto aprovado, transparencias/camadas, validar interface e so depois ampliar catalogo e progressao.
- Consolidar templates em `assets/new cards template`.
- Garantir que as cartas variam correctamente por contexto: base, forma, vitorias, MVP e premios.
- Confirmar que a pagina de jogador comeca pela carta.
- Melhorar/validar montra de premios com desbloqueadas x/y.
- Validar no proximo jogo apos 21 de junho se a carta de campeao de primavera aparece apenas para o campeao e apenas nesse jogo.
- Implementar [[06 - Spec - Historico alargado e revelacao de cartas]] para auditar vitorias seguidas, mostrar ultimos 20 jogos e revelar cartas novas apos jogo.

### Historico

- Manter pagina propria para jogos finalizados.
- Garantir navegacao correcta a partir do perfil do jogador.
- Permitir clicar em cartas no campo do historico para abrir jogador.
- Golos (2026-11-11, migracao aplicada; experimentar no proximo jogo): usar marcadores/assistencias nas estatisticas, no perfil e nas cartas; ligar ao placard quando registar golos sozinho; testar os botoes do video num telemovel.

### Ratings

- Manter rating actual/privado restrito a admin.
- Mostrar ao publico apenas overall/form.
- Rever recalculo automatico de overall a partir dos parciais.

### MVP

- Garantir voto confidencial.
- Impedir alteracao de voto depois de votar.
- Mostrar contagem ao admin sem revelar quem votou em quem.
- Tratar empates de MVP.
- Aplicar beneficio de MVP apenas no jogo seguinte em que o jogador participe.

### Convocatorias e equipas

- Confirmar limite de 12 e bloqueio de novos `Vou`.
- Garantir que `Gerar com confirmados` passa directo para preview/sugestoes.
- Com 12 confirmados, todos devem entrar no campo/equipa sem suplentes visuais.

## Checklist para proximas sessoes

Antes de alterar:

- Ler [[03 - Decisoes e regras]].
- Ver `git status --short`.
- Confirmar se ha alteracoes locais do utilizador.
- Trabalhar primeiro em `app.js`, `index.html`, `styles.css`.

Depois de alterar:

- Actualizar cache-buster se houve mudanca em JS/CSS.
- Correr `node --check app.js`.
- Correr `npm.cmd run build:web` se a copia `www/` deve ser actualizada.
- Correr `node --check www\app.js` depois do build.
- Rever `git status --short`.
- Actualizar este vault com decisoes, bugs e validacoes novas.

## Pendentes (2026-10-28)

- Validar visualmente a nova pagina Jogos (telemovel) e afinar o cartao compacto.
- Decidir se o campo deve permitir trocar jogadores por toque; a caixa de convidados deixou de existir na vista de equipas (usar "Gerir convocatoria").
- Retomar fase 3.1 (jogos publicos).
- Hall of Fame fase 2: categorias de video (ver [[03 - Decisoes e regras]], seccao Hall of Fame). Validar primeiro o novo desenho no telemovel.
- Rever a Revisao do mes no telemovel com um mes real fechado (outubro fecha depois do ultimo jogo + 24 h de MVP e do dia 1 de novembro).
- Opcional: "Transferir dono" de um grupo para outro admin.

## Mapa de futuro (2026-10-29)

- Estrategia, fases e proximos 90 dias em [[10 - Mapa de futuro e estrategia]] (PDF gerado a pedido; nao fica no Git).
- Proximos passos da fase 3: 3.4 piloto, 3.5 convidado ve o jogo e as equipas, 3.6 idiomas/fuso/moeda, 3.7 lojas e push; fecho = Footer 2.0.
- Decisoes em aberto listadas na folha 14 da nota 10; registar la as respostas.

## Placard fisico (ideia, 2026-10-30)

- Plano do Claude em `~/maestro/placard/` (fora do Git): `plano.md`, CSVs, exemplo de dados e o plano original do Codex em `codex-original/`. Pagina visual privada: https://claude.ai/artifact/PvSfF34HaYq77vosMUN2jZ
- Resumo: mala que dobra ao meio (numeros para dentro), telemovel por cima junto a dobra, 3 botoes por equipa por baixo dos seus numeros, sons programaveis (2 colunas), ligacao a Footer por Bluetooth (`@capacitor-community/bluetooth-le`) e eventos numa tabela nova `game_scoreboard_events`.
- Decisoes em aberto (seccao 10 do plano): telemovel dedicado ou pessoal; numeros de 25 ou 20 cm; botoes; cores das equipas; ficha AUX; quem faz a caixa.
- Nada alterado no codigo nem na base de dados.
- Decidido a 2026-10-30: telemovel fica sempre no placard; numeros de 25 cm; golo arcade 30 mm, resto arcade 24 mm; destaque so um; cerebro = Raspberry Pi Zero 2 W (em vez do ESP32-S3). Ver seccao 11 do plano.
- 2026-10-30 (3.a ronda): sem telemovel no placard; relogio LED h:mm:ss e aviso de trocas a cada 5 min; envio para a Footer pelo Wi-Fi do Raspberry Pi. Ver seccao 12 do plano.
- 2026-10-30 (4.a ronda): relogio mm:ss ate 99:59 com numeros de ~5 cm; uma so coluna, do lado direito.
- 2026-10-30: a caixa e feita pelo utilizador na carpintaria do avo.
- 2026-10-30 (5.a ronda): cores fixas com troca de lado; sem AUX; lista de cortes e molde 1:1 em PDF na pasta do plano.
- 2026-10-31: relogio em 3 matrizes 8x8 WS2812 (19,5 x 6,5 cm), com mensagens (GOLO, TROCA, FIM).
- 2026-10-31: plano v2 limpo (plano.md) e enviado por email ao utilizador; documentos no Google Drive.
- 2026-11-02: costas da mala com tampa de correr e ventilacao (ventoinha 5 V opcional); frente 15 mm para dentro; manual de montagem v2.
- 2026-11-02: decidido sem ventoinha para ja; o placard regista temperaturas (chip do Pi e ar da mala) e envia max/media por jogo; ventoinha so se o Pi passar dos 70 C.
- 2026-11-02 (v3): fundo fixo com janela e tampa de correr so na metade B (ideia do utilizador); frente volta a 20 mm; manual de montagem v3.
- 2026-11-08: mantem-se o conversor 15 -> 5 V (uma porta de 5 V do powerbank so da 15 W e a tensao cai). Esquema eletrico desenhado: https://claude.ai/artifact/GEFQvvsZoThzi9zn8m2WWY (fonte `esquema-eletrico.html`, gerada por `esquema.py`). Fixado no desenho: 4 ligadores Wago (2 por lado), condensador de 1000 uF e resistencia de 100 ohm na placa principal; mapa do cabo plano em `ligacoes-raspberry.csv`.

## Nova organizacao e onboarding (decidido 2026-11-05)

Desenho: pagina privada "Planta da App Footer" (https://claude.ai/artifact/9bk3pdinXZh2KWs7YmAcuT). Regras em [[03 - Decisoes e regras]].

- [x] Barra Eu · Jogos · Arquivo · Clube · lupa (mudar `VIEW_GROUPS`, separadores e mini-separadores).
- [x] Ecra Eu em carrosseis, sempre visivel; sem ficha mostra "Cria o teu jogador".
- [x] Admin dentro do Clube (Gerir clube) e dos jogos; bolinha no avatar.
- [x] Lupa (jogadores e clubes; jogos perto por fazer): procurar jogadores e clubes (precisa de RPC no Supabase que respeite a RLS); jogos perto mais tarde.
- [x] Onboarding por convite: convite com cara do grupo, conta num ecra, "Es um destes?" em cartas, criar jogador com caracteristicas, Vou logo.
- [x] "Vou" com ficha por confirmar (mexe no Supabase: respostas de quem tem pedido de associacao pendente).
- [ ] Encontra jogo (jogador sem grupo): onde, quando, posicao num so ecra.
- [ ] Dono da app: eliminar jogadores e contas (Gerir Footer), com cuidado RGPD.
- [x] Micro-interaccoes (feitas na 1.22.0; proposta de 2026-11-05: voar para o carrinho, botao que vira visto, listas em cascata, deslizar para responder, virar carta, sino a balancar).
- [ ] Piloto: enviar o convite ao admin do clube de teste e observar (tempo ate a primeira convocatoria, quem entra sem ajuda).
- [ ] Notas nos clubes novos: pensar numa forma justa e pouco trabalhosa (por agora escondidas; todos iguais e equilibrio pela forma).
- [x] Dono da app: eliminar jogadores e contas (1.27.0).
- [ ] Correr `supabase/no-shows-migration.sql` no projeto "kre-master's Project" e marcar a falta do jogo de 3/11 na pagina do jogo.
- [ ] Correr `supabase/feedback-privacy-migration.sql` (respostas pos-jogo anonimas).
- Atencao: ha outra sessao (autor "Maestro") a trabalhar na mesma pasta `~/maestro/footer`; antes de enviar, confirmar `git status` e o cache-buster de `index.html`.

## Pendentes do painel do dono (2026-11-05)
- [x] Pintar a laranja os botoes de admin gerados por JS (1.27.0).
- [x] Dono da app poder eliminar jogadores e contas a partir do painel (1.27.0; falta correr `supabase/platform-delete-migration.sql`).
- Testar o painel no navegador com a conta do dono.

## Desempenho do arranque (2026-11-06)
- [x] Fase 1: indice de videos sem bloquear, pedidos em paralelo, logo pequeno, `supabase-js` fixo (1.27.1; por enviar).
- [x] Fase 2 no codigo (1.27.2, por enviar): `saveRemoteState` deixou de regravar as fotos em lote (era o risco de apagar tudo); lista de jogadores sem a foto grande; miniatura na base (decisao do utilizador, 2026-11-06); percursos do tracking a pedido. Funciona antes e depois da migracao.
- [ ] **Correr `supabase/photo-thumbs-migration.sql`** no SQL Editor (so acrescenta; testada num Postgres 17 local, duas vezes). Depois abrir a app como admin do clube: as miniaturas gravam-se sozinhas (uma vez). Confirmar com `select count(*) filter (where photo_thumb <> '') from players`.
- [x] Fase 3 (1.28.0, 2026-11-06): arranque a quente com copia local por conta, apagada no logout (ver [[04 - Estado tecnico]]). Falta: o logout continua a nao apagar o `state` antigo (`five-a-side-balancer-state-v1`, com fotos, finanças de admin e jogos), que ja era assim; desenhar so o separador visivel nao e seguro sem reescrever `showView`/`render()` (assume tudo desenhado); a visita sem copia ainda faz ~6 pedidos em serie (segundo lote do `loadRemoteState` so arranca depois do primeiro).
- [ ] Testar a Fase 3 no telemovel com a conta real: abrir, tocar logo num separador, fechar e abrir em modo aviao, sair da conta e entrar com outra.
- [ ] Rever (nao apagar sem ver): RPC `request_group` e `cancel_join_group_request` sem uso; tabela `player_form_snapshots` vazia; regra de edicao de marcadores usa `public.is_admin()` antigo; `saveState` sem protecao contra `localStorage` cheio; bot `vigia.mjs` faz login ~718 vezes por dia.
- [ ] Avisos de seguranca do Supabase: proteger contra palavras-passe expostas (Auth) e rever as 4 funcoes abertas a anonimos (`email_for_login`, `has_any_profile`, `is_admin`, `preview_group_invite`).
