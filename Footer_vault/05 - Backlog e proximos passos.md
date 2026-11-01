# Backlog e proximos passos

## Prioridade operacional

Continuar a desenvolver primeiro a versao web/base. Preparar Android/iOS apenas quando for pedido explicitamente.

## Ideias e areas futuras

### Videos e momentos

- Ideia (2026-11-01): frequencia cardiaca do proprio jogador no video. Fase 1: carregar o ficheiro do treino do relogio (.FIT/.GPX; Garmin, Polar, Suunto, Coros; Apple Watch precisa de app para exportar), ligar ao jogo pela hora e mostrar FC media/maxima, calorias e grafico por baixo do video com os momentos marcados. Fase 2: numero a pulsar sincronizado com o video (e em ecra cheio), com ajuste fino de ±1 s (acertar no apito inicial). Fase 3 (depois das lojas, 3.7): ligacao automatica Garmin/Apple/Strava. Cuidados: GPS fraco em recinto coberto (usar FC e calorias; distancia e velocidade continuam a vir da analise de video); dados de saude so visiveis ao proprio, ver os dos colegas so com o OK de cada um. Directos (FC ao vivo durante o jogo) fora do plano, decisao de 2026-11-01. Antes de avancar: o utilizador esta a reunir a lista de aparelhos do grupo (se muitos Apple Watch, o passo de exportar pesa mais); retomar quando a lista estiver pronta.
- Aparelhos do grupo (2026-11-02): Huawei Watch GT 5 Pro, Apple Watch, Garmin, Amazfit. Formatos aceites na fase 1: TCX e GPX (FIT fica para depois; o Garmin Connect tambem exporta TCX/GPX). Como cada um tira o ficheiro: Garmin = Garmin Connect no site (engrenagem da atividade > Exportar para TCX ou GPX); Apple Watch = app de exportacao (ex.: HealthFit, RunGap), o export do app Saude e enorme e sem FC por treino; Huawei e Amazfit = ligar a app (Huawei Health / Zepp) ao Strava e no site do Strava exportar o original ou GPX (confirmar os menus no telemovel de cada um). Modulo `heart-rate.js` (leitura de TCX/GPX, corte pelo jogo, resumo, FC num instante do video com ajuste) com testes `npm run test:heartrate`; agora tambem le FIT e esta ligado ao historico do jogo (versao 1.17.0, ver [[04 - Estado tecnico]]). Falta: numero a pulsar por cima do video (ecra cheio), clicar no grafico para saltar no video, partilha opcional com colegas, ligacao automatica.

- Em curso (2026-10-30): leitor de video proprio em Galeria > Testes (so admin da plataforma). Passos: (1) amostra de 2-3 min do ultimo jogo em 1080p, feita no desktop; (2) guardar na NAS e servir pela VM com https (`tailscale serve`); (3) testar no telemovel; (4) se fizer sentido, escolher onde alojar para todos (Bunny Stream / Cloudflare Stream, confirmar precos) e substituir o YouTube. Acesso da VM ao desktop: so a partilha de ficheiros do Windows esta aberta; falta um utilizador so para a pasta dos videos.
- Em standby (decisao de 2026-10-30): descarregar momentos. So com o leitor de video proprio (fora do YouTube); ideia: a VM recorta o pedaco do video original guardado na NAS, a pedido, em 1080p (~10 MB por momento). Falta saber onde ficam os originais e quem pode descarregar.

### Radar e odds

- Refinar odds/probabilidades com base no radar.
- Garantir que os calculos usam helpers existentes como `clampNumber`.
- Validar historico depois de qualquer mudanca no radar.

### Cartas

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
