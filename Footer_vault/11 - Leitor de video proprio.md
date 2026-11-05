# Leitor de vídeo próprio (novo player)

Estado a 2026-10-31. Fonte única sobre o leitor novo que vai substituir o do YouTube. Ver também [[04 - Estado tecnico]] (detalhes por commit) e [[05 - Backlog e proximos passos]].

## Decisão de 2026-11-01: os vídeos dos jogos passam a ser servidos de casa

- **Daqui em diante, os vídeos dos jogos da Galeria vêm da NAS (casa)**, não do YouTube nem do Bunny. O jogo de 28/10 já usa o vídeo de casa.
- **Os jogos antigos continuam no YouTube** (só mudam quando houver vídeo de casa para a data deles).
- **Separadores 🧪 Testes e 🏠 Testes 2: só o admin da plataforma** (João) os vê.
- **Descarregar momentos:** botão ⬇ em cada momento; a VM recorta o pedaço e devolve um MP4 (~13 s, ~7 MB, ~9 s a preparar; pedidos repetidos são instantâneos).

### Como um vídeo novo chega à Galeria

```
Desktop: exporta 1080p H.264 (faststart) → scp para a VM: /srv/videos-entrada/<grupo>_<AAAA-MM-DD>.mp4
VM (de 5 em 5 min): publicar-videos.py → confirma H.264 + faststart → /srv/videos-publicos/<grupo>/<AAAA-MM-DD>.mp4
                    + capa .jpg + index.json
App: lê index.json → jogo do grupo nessa data passa a ter vídeo de casa (leitor novo, capa, momentos, ⬇)
```

- Texto para o Footer Tracker (desktop) com estes passos: `~/maestro/videos/prompt-footer-tracker.md` na VM (envia como `.part` e só depois muda o nome).
- Nome do ficheiro: `<grupo>_<AAAA-MM-DD>.mp4` (data do jogo, hora de Lisboa). Sem grupo assume `futeboleiros`.
- Momentos de vídeos só de casa ficam na mesma tabela com `youtube_id = "casa-footer"` (a coluna exige 11 caracteres).
- Scripts na VM (fora do Git): `~/maestro/videos/publicar-videos.py` (log em `publicar.log`) e `~/maestro/videos/cortes-server.py` (recortes em `/srv/videos-cortes`, só escuta em `127.0.0.1:8089`). NGINX: `/v/index.json`, `/v/…` e `/corte`.
- Espaço: cada jogo ~4,4 GB. A 2026-11-01 o disco virtual da VM passou de 40 para **200 GB** (no SSD da NAS; ~175 GB livres, ~40 jogos). A swap passou a ficheiro (`/swapfile`, 2 GB); cópia da tabela de partições antiga em `~/maestro/videos/vda-particoes-antes.txt`. O HDD fica para arquivo dos jogos antigos.
- Arranque automático: publicador no `crontab` do utilizador `joao` (de 5 em 5 min, ficheiro `~/maestro/videos/crontab.txt`); recortes no serviço `footer-cortes.service` (systemd do utilizador, arranca com a VM); NGINX e Funnel também arrancam sozinhos.

## Bot de WhatsApp (2026-11-01)

- Escreve no grupo **Futeboleiros** como "aparelho ligado" (Baileys, não oficial; risco de bloqueio do número aceite pelo João). Na VM, fora do Git: `~/maestro/whatsapp/` (`bot.mjs`, `mensagens.json` com os modelos, `config.json`, sessão em `sessao/`). Só escuta em `127.0.0.1:8091`; serviço `footer-whatsapp.service` (arranca com a VM).
- Automático: **vídeo novo** (o publicador avisa depois de publicar), **convocatória nova** (estado `open`, ainda por jogar) e **MVP fechado** (24 h após o resultado e ≥ 5 votos, como na app; empates com todos os nomes).
- Convocatória e MVP: `~/maestro/whatsapp/vigia.mjs`, de 2 em 2 min (crontab). Entra no Supabase com a conta "Footer Bot" (membro do grupo, papel de jogador: só vê o que um jogador vê); credenciais em `~/.config/footer-bot/` (600). `vistos.json` guarda o que já foi avisado; na primeira passagem (2026-11-01) marcou 19 convocatórias e 23 jogos sem enviar nada. Log em `vigia.log`.
- Textos em `~/maestro/whatsapp/mensagens.json` ({data}, {hora}, {titulo}, {local}, {mvp}, {link}). Por fazer: página para o João os editar e enviar um teste.
- Para desligar: no telemóvel, Aparelhos ligados > terminar a sessão "Chrome (Ubuntu)".

## Dois leitores no mesmo jogo (2026-11-05)

- Se um jogo tiver vídeo de casa **e** vídeo do YouTube (o admin junta o link como antes, 0:00/0:00), aparece o seletor **Leitor Footer | YouTube** na janela da Galeria e na página do jogo. Por defeito usa o de casa; a escolha fica guardada no telemóvel (`footer-player-youtube`). Os momentos são os mesmos nos dois (mesmo vídeo, mesmo início).
- Para isso, o desktop também envia o 1080p para o YouTube (não listado) como reserva.

## Em resumo

- **O que é:** um leitor de vídeo feito por nós, fora do YouTube, com zoom, câmara lenta, imagem a imagem e marcação de momentos ao alcance do polegar.
- **Onde está:** Galeria > **🧪 Testes**.
- **Quem vê:** os jogadores dos **Futeboleiros** com sessão iniciada, e o admin da plataforma (João). Os outros grupos não veem, porque o vídeo de teste é de um jogo dos Futeboleiros.
- **O jogo de 28/10 já usa o leitor novo em toda a app** (desde 2026-10-31): Galeria (Jogos, Highlights, All Highlights), página do jogo no Histórico (incluindo os tempos ▶ da análise), links partilhados de momentos, "Ver o momento" das estatísticas e vídeos do perfil.
- **Os outros jogos continuam no leitor do YouTube.** O vídeo do YouTube de 28/10 não foi apagado (continua a dar as miniaturas).
- **Vídeos:** o **jogo de 28/10 completo** (1080p, 74 min) com os **momentos do grupo**, e o trecho de 3 minutos (35:38 a 38:38) em 1080p e 4K para comparar a nitidez.

## Como os vídeos chegam aos jogadores

```
Câmara Insta360 X5 (.insv)
   │
   ▼
Desktop (RTX 5080) ── reframe 360º → vídeo 4K do campo → versão 1080p
   │
   ├──► NAS (cópia em casa)
   ├──► Google Drive (arquivo dos originais 4K)
   └──► VM maestro ──► Bunny Stream ──► app Footer (qualquer rede, qualidade automática)
```

- **Bunny Stream** guarda e entrega os vídeos. Cria sozinho várias qualidades (480p, 720p, 1080p e, se o vídeo for 4K, 1440p e 2160p). O telemóvel vai mudando de qualidade conforme a rede.
- **A VM** é quem envia para o Bunny. A chave da biblioteca do Bunny só existe na VM, num ficheiro privado; nunca passou pelo chat nem está no GitHub.
- **Google Drive não serve para os jogadores verem os vídeos.** Bloqueia ficheiros vistos por muita gente ao mesmo tempo e não ajusta a qualidade. Fica só como arquivo.

## O que o leitor já faz

| Função | Como se usa |
|---|---|
| Tocar / pausa | Botão ▶, ou tocar no vídeo |
| Andar 10 s | −10 / +10 |
| Imagem a imagem | ‹ › (pausa e anda 1/30 s, bom para faltas e foras de jogo) |
| Mais rápido | ⏩: 1× → 2× → 4× → 1× |
| Câmara lenta | 🐢: 1× → ½× → ¼× → 1× |
| Zoom até 5× | 🔍 (1×, 2×, 3×, 5×), dois dedos, ou roda do rato; arrastar escolhe a zona |
| Qualidade | Auto (pela rede, mostra a que está a dar, ex. "Auto · 1440p") ou fixa |
| Ecrã cheio | ⛶; no iPhone ocupa a página toda |
| Marcar momento | 🔖: pausa, abre uma caixa pequena e transparente em cima; ✓ guarda e o vídeo continua |
| Lista de momentos | Por baixo do vídeo, com autor; tocar toca o pedaço (8 s antes a 5 s depois) e repete até "Continuar o jogo ▶" |
| All Highlights | Toca todos os momentos seguidos; barra amarela ◀ 1/29 ▶ ✕ no canto de cima |
| Editar / apagar | ✎ e × na lista, só para quem marcou ou para admins; ao editar aparecem os ajustes do pedaço (início e fim ±5 s) |
| Teclado (computador) | Espaço pausa, setas ±5 s, vírgula e ponto andam uma imagem |
| Diagnóstico (só João) | Modo, resolução a tocar, rede estimada, imagens perdidas, erros |

### Ecrã cheio: o "L" do polegar

```
                                                    [⏩]
                                                    [🐢]
                                                    [🔖]
[▶][−10][+10][‹][›] ━━━━━━━━━━━━ 0:15 [Auto][⛶]    [🔍]
```

- Barra fina numa só linha por cima do vídeo; coluna no canto direito.
- **5 s sem mexer** (com o vídeo a dar): fica tudo quase invisível, só as silhuetas dos botões. Tocar ou mexer volta a mostrar.

### Ecrã pequeno (telemóvel em pé)

```
[━━━━━━━━ barra de posição ━━━━━━━━]  0:15 / 3:00
[▶] [−10] [+10] [‹] [›]                       [⛶]
[Auto · 1080p]                  [⏩] [🐢] [🔖] [🔍 1×]
```

## Testes 2: vídeo servido de casa (NAS), sem Bunny

- Separador **🏠 Testes 2** (mesmos jogadores que o Testes): o jogo de 28/10 em 1080p (MP4, 8 Mbps), com os momentos do grupo.
- Caminho: telemóvel → **Tailscale Funnel** (endereço público https, porta 8443) → **NGINX na VM** (só escuta dentro da VM, `127.0.0.1:8088`) → `/srv/videos-publicos`. **Nenhuma porta aberta no router**; os jogadores não instalam nada.
- O NGINX só entrega a quem vem da app (Referer), como o Bunny. Não é controlo de acesso forte: o código da app é público. Para uso a sério: links temporários por jogador/grupo (NGINX `secure_link` + função no Supabase).
- Medido a 2026-11-01 (a partir da própria VM, passando duas vezes pela ligação de casa): arranque ~0,36 s; ~18–21 Mbps. Dá ~2 jogadores em simultâneo a 1080p, ou ~5 a 720p. O teste real é com os jogadores.
- Ligar/desligar: `sudo tailscale funnel --bg --https=8443 http://127.0.0.1:8088` / `sudo tailscale funnel --https=8443 off` (autorizados em `/home/joao/maestro/.claude/settings.local.json`). Configuração NGINX: `/etc/nginx/sites-available/footer-videos`.
- Ao ligar o Funnel pela primeira vez, o endereço público demorou ~2 min a responder (DNS e certificado).
- Cloudflare Tunnel posto de lado (as regras da Cloudflare não permitem servir vídeo por lá); abrir portas no router também (regra do projeto).

## Medições do teste (trecho de 3 min)

| | Enviado | Envio para o Bunny | Espaço no Bunny |
|---|---|---|---|
| 1080p | 361 MB | 33 s | 0,91 GB (0,36 original + 0,55 versões) |
| 4K | 1,52 GB | 2 min 19 s | 3,30 GB (1,52 original + 1,78 versões) |

- Internet de casa: envio a ~90 Mbps (contrato 80–100 Mbps).
- Conversão no Bunny: poucos minutos.
- Débito das versões: 480p 1,4 · 720p 3,6 · 1080p 7,4 · 1440p 11,9 · 2160p 37 Mbps.
- Nitidez com zoom 3–5×: o 4K vê-se claramente melhor (ex.: lê-se o cartaz "Holmes Place" a 5×).

## Custos (1 jogo por semana, ~75 min)

| Ao fim de 1 ano | 1080p | 4K (até 2160p) |
|---|---|---|
| Guardando também o original | ~11 $/mês | ~37 $/mês |
| Sem guardar o original | **~6,5 $/mês** | ~20 $/mês |

- Ver os vídeos custa pouco: menos de 1 $/mês para o grupo.
- Os custos crescem com os jogos acumulados; apagar jogos antigos ou guardar só os highlights baixa a conta.

## Decisões tomadas

- 2026-10-30: desenvolver o leitor novo **sem tirar o do YouTube**, num separador à parte.
- 2026-10-31: **Bunny Stream** para os jogadores verem; **NAS** cópia local; **Google Drive** arquivo dos 4K; **desktop** prepara os vídeos.
- 2026-10-31: enviar **1080p feito no desktop** (não o 4K original): envio ~10× mais rápido e ~3× mais barato.
- 2026-10-31: separador Testes aberto a **todos os jogadores dos Futeboleiros** para recolher opiniões.
- 2026-10-31: o **jogo de 28/10 passa a usar só o leitor novo** em toda a app; os restantes jogos ficam no YouTube.
- Sugerido (falta o João confirmar no Bunny): desligar **"Keep original files"**, porque o original já fica na NAS e no Drive.

## Limitações conhecidas

- Nos **trechos de teste** (3 min), os momentos ficam só no telemóvel. No **jogo completo** são os do grupo.
- O jogo completo no leitor novo está ligado à mão (lista `VIDEO_LAB_GAMES` em `app.js`); falta guardar o vídeo do Bunny na base de dados para cada jogo.
- **Aviso "Para sair do ecrã inteiro…"**: é o Chrome/Brave que o mostra sempre; não se tira num site. Alternativas: ecrã cheio "falso" (sem aviso, mas com a barra de cima do telemóvel) ou a app instalada (versão de loja).
- **O Bunny só entrega a quem vem da app** (proteção contra cópias). A app Android/iOS vai precisar de ser autorizada também.
- O teste via NAS + Tailscale foi lento porque a ligação passou por um servidor do Tailscale em Madrid; com o Bunny isso não acontece.

## Próximos passos

1. ✅ **Jogo de 28/10 completo** no Bunny (export 1080p NVENC 7 min 40 s, 4,14 GiB, 8 Mbps; duração 4455,58 s = YouTube 4456 s).
2. ✅ **Momentos partilhados:** mesmo vídeo que o YouTube, por isso o leitor novo usa os mesmos momentos do grupo; marcar, editar e apagar valem para os dois leitores.
3. ✅ **All Highlights** e edição de momentos no leitor novo.
4. Recolher opiniões dos jogadores e afinar o estilo.
5. Guardar na base de dados o vídeo do Bunny de cada jogo (em vez da lista à mão) e partilhar momentos com link.
6. Decidir a troca: o leitor novo passa a ser o de todos e o YouTube sai.
7. Automatizar: depois de cada jogo, o desktop prepara, a VM envia para o Bunny, e a cópia vai para o Drive.
8. Mais tarde: descarregar momentos (recortes a pedido), ligar à app de loja, reserva de IP da VM no router.

## Parte técnica

- Código: `video-lab.js` (`window.FooterVideoLab.mount(container, { admin, games, moments, embedded })`, devolve `{ playClip, playReel, seek }`); jogos no leitor novo: `getBunnyGame` / `mountGamePlayer` / `openBunnyLightbox` em `app.js` (janela da Galeria e `renderGameVideoSection` / `bindGameVideoSection` / `seekGameVideo` no Histórico); integração em `app.js` (`canSeeVideoLab`, `renderGallery`, `VIDEO_LAB_GAMES`, `videoLabMoments` que usa `getGameBookmarks` / `addVideoBookmark` / `updateVideoBookmark` / `removeVideoBookmark` / `canDeleteBookmark`); estilos `.lab-*` em `styles.css`.
- Envio para o Bunny a partir da VM: usar `curl -T ficheiro` (lê aos bocados). `--data-binary @ficheiro` carrega o ficheiro todo para a memória e a VM só tem 4 GB.
- HLS: hls.js 1.5.20 (versão light), carregado só quando o endereço é `.m3u8`; no iPhone antigo usa o HLS do Safari.
- Bunny: biblioteca `footer-teste` (Frankfurt), CDN `vz-fdc7df5c-b0e.b-cdn.net`, só serve com o Referer da app. Chave em `~/.config/bunny/stream.env` na VM. Lista dos vídeos enviados: `~/maestro/bunny/videos.txt`.
- Vídeos de teste locais: `~/videos-teste` na VM (servidos só no Tailscale em `https://maestro.tail85c4b5.ts.net/videos/`).
- Commits: `a135889` separador Testes · `d3fd7f3` HLS + qualidade · `bf4aa3d` barra que se esbate · `7ea2ea9` "L", duas velocidades, momentos · `b845373` aberto aos Futeboleiros · (videolab6) jogo completo com momentos do grupo, All Highlights e edição.


## Soluços no vídeo de casa e várias qualidades (2026-11-02)

- **Sintoma:** no telemóvel o jogo de 28/10 (mp4 de casa, 1080p, ~8 Mbps) ficava sempre a carregar.
- **Causa medida na VM:** o disco e o NGINX dão ~3,4 GB/s e a ligação de casa envia ~90 Mbps, mas **pelo Tailscale Funnel só passam ~0,85 MB/s (~6,8 Mbps)**, menos que o vídeo (~8 Mbps). O Funnel tem limite de largura de banda e é a parte lenta.
- **Solução:** `~/maestro/videos/gerar-hls.py` (chamado de 5 em 5 min pelo `publicar-videos.py`, um jogo de cada vez, prioridade baixa) cria `/<grupo>/<AAAA-MM-DD>-hls/master.m3u8` com 3 qualidades (1080p a 4 Mbps, 720p a 2,2 Mbps, 480p a 1,1 Mbps; segmentos de 6 s, chaves a cada 2 s). Demora ~1,2× a duração do vídeo na VM (2 CPUs) e ocupa ~4 GB por jogo. O `index.json` passa a ter `hls` e a app (`getHomeVideo`) usa-o; o leitor já sabia tocar HLS (hls.js, escolha automática e manual da qualidade). O mp4 original fica para os recortes (⬇). O vídeo não tem áudio.
- **Se continuar a engasgar:** o Funnel é partilhado por todos os que veem ao mesmo tempo. Alternativas: Cloudflare R2 (sem custo de saída, ~0,015 USD/GB/mês de armazenamento) ou voltar a um CDN.
