# Backlog e proximos passos

## Prioridade operacional

Continuar a desenvolver primeiro a versao web/base. Preparar Android/iOS apenas quando for pedido explicitamente.

## Ideias e areas futuras

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
