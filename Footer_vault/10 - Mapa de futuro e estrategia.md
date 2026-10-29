# Footer — Mapa de futuro e estratégia

Documento vivo. Versão 1 — 29 de outubro de 2026 (app 1.13.0).

Esta nota é a fonte do PDF «Footer — Mapa de futuro». O PDF não fica guardado no GitHub: gera-se a pedido (ver Folha 14).

> Onde estamos: Fase 3 — expansão para grupos e jogadores fora dos Futeboleiros. As fundações multi-grupo, os convites, os grupos criados pelo próprio utilizador, os jogos públicos e a disponibilidade já estão em produção. Falta o piloto com um grupo real e as bases para crescer (idiomas, fusos horários, lojas de apps).

## Folha 1 — As últimas 3 semanas (8 a 29 de outubro)

Só mudanças grandes. As versões 1.x são as do changelog da app (Novidades); antes de 22/10 ainda não havia número de versão.

| Data | Versão | Mudança | Pilar |
| --- | --- | --- | --- |
| 08/10 | — | Cartas de prémios com contexto temporal (meses e datas de cada conquista) | Reviver |
| 10/10 | — | Tema visual «Holofote»: escuro, estádio à noite, azul da chama do logo | UI |
| 15/10 | — | Navegação nova (barra em baixo no telemóvel) e Galeria de vídeos | UI |
| 15/10 | — | Momentos nos vídeos (marcar jogadas) e Highlights | Reviver |
| 21/10 | — | Perfil do jogador renovado, com métricas de vídeo (distância, ritmo, sprints) em Beta | Reviver |
| 22/10 | 1.0–1.1 | O perfil passa a ser a casa da app; Novidades com changelog; partilha de momentos | Reviver |
| 23/10 | — | Fase 3 arranca: dados separados por grupo e segurança por grupo em produção; 2 falhas de segurança corrigidas | Base |
| 23/10 | 1.2–1.7 | MVP confidencial, jogos públicos, convites por link, criar grupo, separador Jogos, disponibilidade e convites | Organizar / Encontrar |
| 27/10 | — | Projecto renomeado para Footer (pacote, identificadores das apps, endereço) | Base |
| 28/10 | 1.8–1.10 | Jogos mais simples, Hall of Fame novo em carrosséis, Revisão do mês, números de vídeo no Hall of Fame | Organizar / Reviver |
| 28/10 | 1.11–1.12 | Grupos criados sem aprovação (até 2 por conta), apagar grupo com 30 dias de quarentena, avisos de admin, auditoria de segurança, licença | Organizar / Base |
| 29/10 | 1.13 | Separador A minha disponibilidade, perfil visível, disponibilidade semanal, aviso amarelo/vermelho de jogos públicos | Encontrar |

### Leitura

- Em 3 semanas a app passou de «a app dos Futeboleiros» a uma app que qualquer grupo pode usar sozinho: criar grupo, convidar, organizar, abrir vagas a desconhecidos.
- O ritmo foi muito alto (16 versões em 8 dias, da 1.0 à 1.13). O próximo passo não é mais funcionalidades, é validar com um grupo real e preparar a base para crescer.
- O histórico do Git nesta VM é parcial (clone curto), por isso o detalhe antes de 24/10 vem do vault e do changelog.

## Folha 2 — Mapa de fases

As «fases» são do produto; as versões 1.x são da app. Proposta: alinhar as duas — quando a Fase 3 fechar, a app passa a 2.0.0; a Fase 4 abre a 3.0.0, e assim por diante. Assim o número da versão diz em que fase estamos.

<!-- roadmap -->

| Fase | Nome | Estado | Horizonte (aprox.) | Conteúdo |
| --- | --- | --- | --- | --- |
| 1 | Gerador e grupo privado | Feito | maio–set 2026 | Equipas equilibradas, convocatórias, histórico, pagamentos, MVP, cartas |
| 2 | Vídeo e comunidade do grupo | Feito | set–out 2026 | Câmara 360, momentos, métricas Beta, perfil, Hall of Fame, Revisão do mês |
| 3 | Abertura a outros grupos | Em curso | até dez 2026 | Multi-grupo, convites, criar grupo, jogos públicos, disponibilidade, piloto, idiomas base |
| 4 | Comunidade aberta e internacional | Próximo | 1.º trim. 2027 | Jogadores sozinhos, descobrir jogos perto, perfil global, reputação, 9 idiomas |
| 5 | Footer Pro (rentabilidade) | A pensar | 2.º trim. 2027 | Grupo Pro, análise de vídeo paga, pagamentos integrados |
| 6 | Vídeo e análise à escala | A pensar | 2027 | Processamento na cloud, highlights automáticos, kit de câmara recomendado |
| 7 | Plataforma (campos, ligas, marcas) | Ideia | 2028 | Campos parceiros, torneios e ligas entre grupos, patrocínios locais |

### Fase 3 em detalhe (estás aqui)

| Passo | Estado | Nota |
| --- | --- | --- |
| 3.0 Fundações multi-grupo (dados e segurança por grupo) | Feito | Em produção desde 23/10 |
| 3.1 App com noção de grupo; jogos públicos | Feito | Grupo activo, papéis, pedidos e convites para jogos |
| 3.2 Convites e entrada do jogador | Feito | Link de convite, «Qual destes és tu?», criar o próprio perfil |
| 3.3 Criar grupo e primeiros passos | Feito | Sem aprovação desde 28/10 |
| 3.3b Disponibilidade e convites a jogadores de fora | Feito | Semanal ou por dias, perfil visível (29/10) |
| 3.4 Piloto de 4 a 6 semanas com o grupo do campo ao lado | Próximo | Falta marcar com eles |
| 3.5 Convidado aceite vê a página do jogo e as equipas | Próximo | Hoje só vê data, hora e local |
| 3.6 Base internacional: idiomas, fusos horários, moeda | Próximo | Ver Folha 9 |
| 3.7 Lojas de apps, domínio, notificações push | Próximo | Android primeiro |
| 3.8 Fecho: Footer 2.0 | Próximo | Depois do piloto |

## Folha 3 — Visão: o que é o Footer e para quem

### Proposta de valor numa frase

O Footer organiza o teu futebol de amigos (equipas justas, quem vai, quem paga), ajuda-te a encontrar jogo quando falta gente ou quando estás sozinho, e guarda a memória de cada jogo (cartas, MVP, estatísticas, vídeo).

### Três pilares

Cada funcionalidade nova deve servir um pilar. Se não serve nenhum, não entra.

| Pilar | Pergunta do utilizador | Já existe | Falta |
| --- | --- | --- | --- |
| Organizar | «Quem vai na terça e como ficam as equipas?» | Convocatórias, equipas equilibradas, pagamentos, admins | Convocatória recorrente, lembretes, lista de espera, vários admins |
| Encontrar | «Falta um jogador» / «Quero jogar e não tenho grupo» | Jogos públicos, disponibilidade, convites | Descobrir por distância, perfil global, reputação |
| Reviver | «Como joguei? Quem foi o melhor?» | MVP, cartas, Hall of Fame, Revisão do mês, vídeo, momentos | Partilha para redes, highlights automáticos, evolução |

### Personas

- **O organizador (admin)** — marca o campo, junta a malta, cobra. Dor: trabalho repetido no WhatsApp, faltas à última hora, equipas desequilibradas, dinheiro em atraso. É quem decide se o grupo usa a app e, mais tarde, quem paga.
- **O jogador de grupo** — quer saber se há jogo, responder com um toque, ver estatísticas e cartas. Dor: pouca. Motivação: diversão, ego, memória.
- **O jogador sozinho** — mudou de cidade, o grupo acabou, quer jogar mais vezes. Dor: não conhece ninguém, não sabe o nível dos outros. É o motor do crescimento entre grupos.
- **O campo (mais tarde)** — quer horários cheios. Pode ser cliente B2B na Fase 7.

### O que nos distingue

- Equipas equilibradas automáticas com rating e forma (quase nenhuma app de grupos faz isto bem).
- Gamificação real: cartas estilo FIFA, MVP confidencial, Hall of Fame, Revisão do mês.
- Vídeo barato: uma câmara 360 por jogo, momentos marcados por todos, métricas físicas em Beta.
- Funciona no browser sem instalar (PWA), com apps nas lojas a caminho.

### Concorrência (a confirmar características e preços actuais)

- **WhatsApp + Excel** — o verdadeiro concorrente: grátis, toda a gente já usa. O Footer tem de poupar trabalho ao admin logo na primeira semana.
- **Spond, TeamSnap, Heja** — gestão de equipas e clubes; fortes em calendário e pagamentos, fracos em futebol casual e gamificação.
- **Playtomic** — reserva de campos e jogos abertos por nível (forte no padel); o risco é entrar mais no futebol.
- **Footy Addicts (Reino Unido), Fubles (Itália)** — jogos abertos a quem quiser, pagos por jogo; validam o modelo «jogador sozinho».
- **Veo, Pixellot** — câmaras com IA para clubes; caras, mas mostram que há quem pague por vídeo.

## Folha 4 — Potenciar o uso pelos grupos

Objectivo: o grupo usa o Footer todas as semanas sem esforço do admin. Métrica: percentagem de grupos com jogo registado nas últimas 2 semanas.

| Ideia | Porquê | Funcionalidade | Possíveis problemas |
| --- | --- | --- | --- |
| Convocatória recorrente | O admin repete o mesmo trabalho todas as semanas | «Todas as terças às 21h, abre 4 dias antes», com excepções (feriados) | Campo muda; jogo cancelado tem de ser fácil |
| Lembretes e lista de espera | Faltas à última hora são a maior dor | Push 24 h antes; «Faltam 2»; quem está em espera entra sozinho quando alguém sai | Notificações no iPhone fracas sem app nativa |
| Fiabilidade | O admin quer saber quem falha | Taxa «disse Vou e apareceu», visível só para o admin | Sensível socialmente; nunca público por omissão |
| Pagamentos simples | Cobrar é a tarefa mais chata | Custo do campo dividido automaticamente; links MB Way, Pix, Revolut; quem pagou | Não tocar em dinheiro no início (só registo e links) |
| Épocas e ligas internas | Dá objectivo a longo prazo | Tabela da época, campeão, troféus de fim de época | Grupos com rotação grande de jogadores |
| Formatos de jogo | Muitas peladas têm 3 equipas | «Quem ganha fica», 3 equipas, jogos curtos, torneio de um dia | Complica resultados e estatísticas |
| Restrições nas equipas | O admin conhece a malta | «Separar X e Y», «juntar irmãos», um guarda-redes por equipa, coletes | Demasiadas regras tornam o equilíbrio impossível |
| Cartão de resultado partilhável | Aquisição grátis: cada partilha mostra a marca | Imagem automática do jogo e do MVP para WhatsApp e stories | Privacidade de quem não quer aparecer |
| Vários admins e papéis | O dono não pode fazer tudo | Tesoureiro, capitão; transferir dono (já no backlog) | Conflitos de permissões |
| Página pública do grupo | Grupos precisam de recrutar | Nome, campo, dia e hora, «procuramos jogadores», pedido para entrar | Spam; moderação |
| Desafio entre grupos | Cria uso entre grupos | Grupo A desafia grupo B; resultado conta para os dois | Ratings de grupos diferentes não são comparáveis |
| Calendário e meteorologia | Pequeno, útil | Exportar para o calendário do telemóvel; previsão para jogos ao ar livre | Fusos horários |

### Primeira semana de um grupo novo (activação)

1. Criar grupo e colar a lista de nomes do WhatsApp (já existe).
2. Link de convite no WhatsApp (já existe).
3. Primeira convocatória pré-preenchida com o dia e hora habituais.
4. Equipas automáticas e mensagem pronta para o WhatsApp (já existe).
5. Depois do jogo: resultado em 2 toques, MVP, primeira carta. É aqui que o grupo se agarra.

Métrica: grupo novo com o primeiro jogo registado em 7 dias.

## Folha 5 — Jogadores sozinhos

Objectivo: quem não tem grupo encontra jogo em menos de uma semana. É o motor do crescimento, mas só funciona com densidade (muitos jogos perto).

| Ideia | Porquê | Funcionalidade | Possíveis problemas |
| --- | --- | --- | --- |
| Descobrir jogos perto | Hoje a lista de jogos públicos não tem distância | Lista e mapa por distância, dia, hora, nível, preço; filtros guardados | Precisa da localização dos campos noutros países |
| Alertas que encaixam | Já começou (aviso amarelo/vermelho) | Push quando abre um jogo na tua disponibilidade e zona | Excesso de notificações |
| Perfil global | Hoje tudo é por grupo | «Currículo»: jogos totais, posição, nível, fiabilidade, cartas de todos os grupos | Juntar dados de grupos com escalas diferentes |
| Nível público | Quem recebe um desconhecido quer saber o nível | Começar com nível declarado + confirmação dos admins após jogar; mais tarde rating tipo Elo entre grupos | As notas 1–100 de cada admin não são comparáveis |
| Reputação e segurança | Desconhecidos encontram-se num campo | Confirmação de presença, fair play pós-jogo, denunciar e bloquear, idade mínima | Moderação custa tempo; abuso de avaliações |
| Vaga fixa | Muitos grupos procuram um jogador para sempre | «Procuramos jogador fixo» na página do grupo; o jogador pede para entrar | Mesmo que a página pública do grupo |
| Metas pessoais | Dá razão para voltar | «4 jogos este mês», «10 km este mês», sequência de semanas a jogar | Métricas físicas só existem com vídeo |
| Primeira utilização sem grupo | Hoje vê uma faixa e pouco mais | Ecrã «Encontra jogo perto de ti»: zona, disponibilidade, características em 3 passos | Lista vazia nas primeiras semanas em cada cidade |
| Pagar a parte | O organizador quer receber de quem vem de fora | Mostrar preço por jogador; mais tarde pagamento na app | Regras de pagamentos e comissões |

### O problema da densidade

- Uma app de «encontrar jogo» vazia mata a confiança. Lançar cidade a cidade: primeiro a zona do piloto, depois as cidades onde já houver grupos.
- Internacional desde o início para grupos (cada grupo funciona sozinho em qualquer país); a descoberta de jogos só se promove onde houver densidade.
- Semear: cada grupo que entra traz 10–15 jogadores; alguns jogam noutros grupos e levam o Footer.

## Folha 6 — Melhorar o que já temos

| Área | Melhoria | Porquê |
| --- | --- | --- |
| Equipas | Explicar o equilíbrio («diferença de 2 pontos») e aprender com os resultados (equipas que perdem por muito) | Confiança no algoritmo |
| Equipas | Restrições (ver Folha 4) e trocas por toque no campo | O admin quer ajustar rápido |
| MVP | Prazo visível, lembrete, resultado com animação | Mais votos = MVP mais justo |
| Cartas | Raridade e colecção mais clara; partilhar uma carta | É o elemento mais «viciante» |
| Hall of Fame e Revisão | Partilhar como imagem vertical (stories) | Aquisição e orgulho |
| Perfil | Gráfico de evolução, mapa de calor (já planeados) | Valor do vídeo |
| Convidados | O convidado aceite vê a página do jogo e as equipas | Hoje fica às escuras |
| Avisos | Notificações push nativas em vez de só números na app | O jogador não abre a app todos os dias |
| Mensagens | Trocar os `alert()` por avisos da própria app | Os alertas do browser parecem erros, sobretudo na app nativa |
| Fiabilidade técnica | Testes automáticos de ecrã e um Supabase de testes | Cada versão mexe em muita coisa |
| Desempenho | Partir o `app.js` (cerca de 11 900 linhas) em módulos | Carrega mais depressa, menos erros, mais fácil de traduzir |

### O que deixar como está

- O Hall of Fame e a Revisão do mês acabaram de mudar: esperar pelo feedback do piloto.
- Não acrescentar separadores: novas vistas entram nos grupos que já existem (regra de 15/10).

## Folha 7 — Interface (UI e UX)

| Ideia | Porquê | Como | Possíveis problemas |
| --- | --- | --- | --- |
| Sistema de componentes | O botão «Esta semana» invisível mostrou estilos que se contradizem | Documentar botões, chips, cartões, números (vermelho, amarelo) com os tokens do Holofote | Tempo de arrumação sem novidades visíveis |
| Ecrãs vazios com acção | Grupo novo e jogador sozinho vêem ecrãs vazios | Cada vazio diz o que fazer e tem um botão | — |
| Primeira utilização guiada | Hoje depende de alguém explicar | 3 passos para jogador, 5 para admin (já há Primeiros passos) | Não pode ser intrusivo |
| Seletor de idioma com bandeira | Público internacional | Bandeira + nome na própria língua, no menu da conta e no ecrã de entrada | Bandeira não é idioma (ver Folha 9) |
| Acessibilidade | Lojas de apps e público mais velho | Contraste, áreas de toque de 44 px, leitores de ecrã | Tema escuro exige cuidado com contraste |
| Carregamentos | Ecrãs saltam enquanto carregam | Esqueletos de carregamento em vez de ecrãs vazios | — |
| Textos traduzíveis | Hoje o texto está espalhado pelo código | Todos os textos passam por um dicionário | Grande trabalho inicial |
| Navegação para quem não tem grupo | Os separadores pensam em quem tem grupo | Para quem não tem grupo, Jogos abre em «Jogos perto de ti» | Duas experiências para manter |

### Ecrã de idioma (ideia)

<!-- flags -->

## Folha 8 — Vídeo e análise: o que dá e o que não dá

### Estado actual

- Câmara 360 (Insta360 X5) num ponto do campo; exportação 4K e processamento no PC de casa (RTX 5080); vídeo no YouTube não listado.
- Métricas Beta: distância, ritmo, velocidade máxima, sprints, passes, com etiqueta de qualidade (preliminar, indicativo, detectado).
- Limites: resolução e distorção da 360, oclusões, iluminação nocturna, identificação dos jogadores, tempo de processamento manual.

### Níveis de análise (realista)

| Nível | O quê | Viável hoje? | Valor para o utilizador |
| --- | --- | --- | --- |
| 0 | Vídeo inteiro + momentos marcados por pessoas | Sim | Alto e barato |
| 1 | Métricas físicas aproximadas (distância, sprints) | Sim, Beta | Médio: curiosidade, metas |
| 2 | Eventos automáticos (golos, remates, passes) | Parcial | Alto, mas erros estragam a confiança |
| 3 | Highlights automáticos por jogador | Não ainda | Muito alto: é o que se partilha |
| 4 | Análise táctica (posicionamento, mapas por fase) | Não | Nicho |

### Recomendações

- Vender o que é fiável: vídeo, momentos e highlights. As métricas ficam como «Beta» até a qualidade melhorar.
- Highlights semi-automáticos primeiro: momentos marcados pelos jogadores + golos detectados → montagem automática de um vídeo curto do jogo e de cada jogador.
- Escalar o processamento: hoje depende do PC de casa ligado (Wake-on-LAN). Para muitos grupos é preciso fila de trabalhos e GPU na cloud (custo por hora) ou processar só o que é pago.
- Kit recomendado: câmara, suporte, guia de colocação; mais tarde parcerias com campos que já têm câmaras fixas.

### Possíveis problemas

- Privacidade e direito de imagem: consentimento de todos os filmados (RGPD na UE, LGPD no Brasil); opção de não aparecer nos highlights.
- Dependência do YouTube (regras, remoções, publicidade); armazenamento próprio custa dinheiro.
- Qualidade variável entre campos: a mesma métrica não é comparável entre grupos.

## Folha 9 — Internacionalização

Público de qualquer país desde cedo. Idiomas pedidos: português (Portugal), português (Brasil), inglês, espanhol, francês, alemão, ucraniano, polaco e italiano.

| Bandeira | Idioma | Código | Notas |
| --- | --- | --- | --- |
| PT | Português (Portugal) | pt-PT | Idioma de origem |
| BR | Português (Brasil) | pt-BR | «Pelada», «craque», tratamento por você |
| GB | English | en | Five-a-side; milhas opcionais no Reino Unido e EUA |
| ES | Español | es | «Fútbol 5», «fútbol sala» |
| FR | Français | fr | «Foot à 5» |
| DE | Deutsch | de | Textos ~30% mais longos: testar quebras |
| UA | Українська | uk | Alfabeto cirílico: confirmar fontes |
| PL | Polski | pl | Três formas de plural |
| IT | Italiano | it | «Calcetto» |

### Como fazer

1. Dicionários por idioma (`i18n/pt-PT.json`, ...) e uma função `t("chave")`; o português de Portugal é a base; pt-BR cai para pt-PT, os outros para inglês.
2. Detectar o idioma do telemóvel na primeira visita; a escolha fica na conta e no dispositivo.
3. Datas, dias da semana, números e moeda com as ferramentas do browser (`Intl`). Hoje os dias («Seg», «Ter») estão escritos à mão no código.
4. Plurais correctos (polaco e ucraniano têm várias formas).
5. Fuso horário por grupo ou campo: hoje a base de dados assume a hora de Lisboa. É obrigatório antes de haver grupos noutros fusos.
6. Moeda por grupo (EUR, BRL, GBP, PLN, UAH, CHF).
7. Campos: hoje a lista é de concelhos portugueses; noutros países, campos adicionados pelos admins (com revisão) ou a partir de mapas abertos.
8. Fontes: as do tema (Big Shoulders Display e Archivo) provavelmente não têm cirílico; precisa de uma fonte de recurso para ucraniano.

### Processo de tradução e ordem

- Primeira versão com IA a partir de um glossário (convocatória, MVP, carta, pelada...), revista por um falante nativo (podem ser jogadores da comunidade). Novidades, termos e privacidade também.
- O seletor mostra os 9 desde o início; cada idioma fica «Beta» até estar todo traduzido e revisto.
- Vagas: 1) infraestrutura + pt-PT, pt-BR, inglês, espanhol; 2) francês, italiano, alemão; 3) polaco e ucraniano (revisão nativa obrigatória).

### Possíveis problemas

- Cada texto novo passa a custar 9 traduções: manter os textos curtos e reutilizáveis.
- Bandeira não é idioma (inglês não é só Reino Unido; espanhol não é só Espanha): mostrar sempre o nome do idioma ao lado da bandeira.
- Regras legais por região: RGPD (UE), LGPD (Brasil), RGPD do Reino Unido; idade mínima para consentimento digital varia entre 13 e 16 anos.

## Folha 10 — Rentabilidade

Princípio: o essencial é grátis para sempre (é o que cria a rede); paga-se o que dá trabalho ou custa dinheiro a produzir (vídeo, análise, gestão avançada). Os preços abaixo são hipóteses para testar.

| Modelo | Quem paga | O que inclui | Preço hipótese | Riscos |
| --- | --- | --- | --- | --- |
| Grátis | — | Grupo, convocatórias, equipas, histórico, MVP, cartas base, jogos públicos, disponibilidade | 0 € | Custos de servidor sem receita |
| Grupo Pro | O grupo (o admin cobra na quota) | Pagamentos e quotas avançados, estatísticas de época completas, Revisão do mês para todos, vários admins, temas e cartas especiais, exportações | 3–4 €/mês por grupo (≈ 0,30 € por jogador) | Grupos casuais pagam pouco; o admin não quer cobrar |
| Análise de vídeo por jogo | O grupo ou cada jogador | Processamento, highlights do jogo e de cada jogador, métricas | 5–15 € por jogo (0,50–1,50 € por jogador) | Custo de GPU e tempo; qualidade |
| Jogador Plus | O jogador | Perfil global avançado, evolução, comparações, histórico ilimitado | 1–2 €/mês | Poucos pagam; testar depois |
| Campos (B2B) | O campo | Jogos públicos no campo, encher horários vazios, câmara fixa | Mensalidade | Venda directa, ciclo longo |
| Patrocínios locais | Marcas | Prémio do mês, troféus com marca | Por campanha | Sem publicidade invasiva |

### Custos a conhecer (ordens de grandeza, a confirmar)

- Supabase Pro: cerca de 25 USD/mês (cópias de segurança diárias, mais limites; necessário para crescer).
- Apple Developer: 99 USD/ano. Google Play: 25 USD uma vez.
- Domínio: 10–40 €/ano consoante a extensão.
- Vídeo: armazenamento próprio e GPU na cloud são os custos que crescem com o uso.

### Como validar sem construir tudo

- Oferecer a análise de vídeo «à mão» a 3–5 grupos (processada no PC de casa) e cobrar um preço simbólico: mede-se a vontade de pagar antes de automatizar.
- Grupo Pro: mostrar o preço e um botão «quero» a grupos no piloto; contar os cliques.
- Métrica: percentagem de grupos activos que pagam alguma coisa ao fim de 3 meses.

## Folha 11 — Organização para ter futuro

### Produto

- Três pilares (Organizar, Encontrar, Reviver) e uma métrica principal: **jogos realizados por semana com o Footer**.
- Métricas de apoio: grupos novos com o primeiro jogo em 7 dias; grupos activos nas últimas 2 semanas; jogadores activos por semana; convocatórias completas; vagas preenchidas por jogos públicos.
- Cada fase fecha com uma versão grande (Fase 3 → Footer 2.0).
- Ciclo: piloto → ouvir → ajustar. Ouvir os admins de forma recorrente (um grupo de WhatsApp de admins, por exemplo).

### Técnica

- Partir o `app.js` em módulos por área (jogos, perfil, Hall of Fame, admin, idiomas), aos poucos e com testes.
- Dois ambientes: Supabase de testes e de produção; migrações sempre ensaiadas antes (já é regra).
- Erros e uso: registo de erros (por exemplo Sentry) e estatísticas de uso que respeitem a privacidade (servidor na UE).
- Apps nas lojas (Capacitor já existe): Android primeiro, depois iPhone; notificações push.
- Segurança antes de abrir a desconhecidos: captcha no registo, confirmação de email, protecção contra passwords vazadas (Supabase Pro), limites de pedidos.

### Negócio e legal

- Nome: «Footer» é uma palavra genérica (em inglês significa «rodapé»); difícil de encontrar em pesquisas e de registar como marca noutros países. Decidir cedo: manter, ou usar uma variante distintiva para lojas e domínio.
- Termos de utilização, política de privacidade e consentimento de imagem (vídeo), traduzidos.
- Estrutura: actividade em nome próprio no início; sociedade quando houver receita.
- Suporte: um email, perguntas frequentes e um canal para admins.

### Ritmo de trabalho

- Uma pessoa + IA: a maior ameaça é a manutenção. Preferir menos funcionalidades bem feitas e testadas.
- Cada sessão: ler o vault, trabalhar, actualizar o vault (já é regra) e o Registo de decisões desta nota.

## Folha 12 — Riscos e possíveis problemas

| Risco | Impacto | Probabilidade | Mitigação |
| --- | --- | --- | --- |
| Pouca densidade de jogos públicos | Alto | Alta | Lançar cidade a cidade; foco em grupos primeiro |
| Grupos não pagam | Alto | Alta | Pagar só pelo que custa (vídeo); testar preços cedo |
| Custo do vídeo cresce com o uso | Alto | Média | Processar só o que é pago; fila de trabalhos |
| Privacidade e imagem nos vídeos | Alto | Média | Consentimento, opção de sair, termos claros |
| Segurança entre desconhecidos | Alto | Média | Idade mínima, denúncias, bloqueio, reputação |
| Fusos horários mal tratados | Médio | Alta (fora de Portugal) | Fuso por grupo antes da internacionalização |
| Traduções fracas | Médio | Média | Revisão nativa; etiqueta Beta |
| Marca genérica | Médio | Média | Decidir nome e domínio cedo |
| Notificações no iPhone (PWA) | Médio | Alta | App nativa com push |
| Dependência do YouTube | Médio | Baixa | Plano para armazenamento próprio |
| Código num ficheiro gigante | Médio | Alta | Modularizar com testes |
| Um só programador | Alto | — | Documentação no vault, testes, menos âmbito |
| Concorrentes grandes entram (Playtomic) | Médio | Média | Diferenciar em equipas, gamificação e vídeo |

## Folha 13 — Próximos 90 dias

### Dias 0–30: fechar a Fase 3

- Piloto com o grupo do campo ao lado (4–6 semanas) e observar: tempo até à primeira convocatória, entradas pelo link, uso de Fazer equipas.
- Convidado aceite vê a página do jogo e as equipas.
- Base de idiomas: dicionários, seletor com bandeiras, pt-PT, pt-BR e inglês.
- Fuso horário e moeda por grupo.
- Avisos da app em vez de `alert()`; captcha e confirmação de email.
- Estatísticas de uso básicas (métrica principal).

### Dias 30–60: Footer 2.0

- App Android na loja e notificações push; iPhone a seguir.
- Convocatória recorrente, lembretes, lista de espera.
- Cartão de resultado partilhável.
- Espanhol, francês, italiano e alemão em Beta.
- Página pública do grupo.

### Dias 60–90: arrancar Fases 4 e 5

- Descobrir jogos por distância; perfil global; fiabilidade.
- Teste de preço do Grupo Pro com 3–5 grupos.
- Análise de vídeo «à mão» paga para medir vontade de pagar.
- Polaco e ucraniano com revisão nativa.

## Folha 14 — Decisões em aberto e como continuar

### Decisões para tomar

1. Rating público entre grupos: sim ou não? Começar com nível declarado + confirmação dos admins?
2. Idade mínima: 16 ou 18 anos (jogos públicos com desconhecidos)?
3. Primeiro mercado fora de Portugal: Brasil, Espanha ou outro?
4. Nome e domínio: manter «Footer» ou variante distintiva?
5. Vídeo: continuar no YouTube não listado ou armazenamento próprio?
6. Quem paga primeiro: o grupo (Grupo Pro) ou o jogador (vídeo)?
7. Dinheiro: só registo e links (MB Way, Pix) ou pagamentos dentro da app?
8. Alinhar versões com fases (Fase 3 fecha → app 2.0.0)?

### Como continuar este raciocínio (sem instalar nada)

- **Mudar o mapa com o Claude**: em qualquer chat no orquestrador, pedir «vamos continuar o mapa de futuro». O Claude lê esta nota, discute, regista as decisões abaixo e envia para o GitHub.
- **Mudar o mapa à mão**: abrir esta nota no GitHub, tocar no lápis («Edit»), escrever e carregar em «Commit changes».
- **Ter o PDF em qualquer aparelho**: GitHub → Actions → «Mapa de futuro (PDF)» → «Run workflow»; ao fim de um minuto, abrir a execução e descarregar «footer-mapa-de-futuro» (fica disponível 1 dia).
- Quando uma decisão muda o plano, actualizar a folha respectiva e subir a versão do documento no topo.

### Registo de decisões

| Data | Decisão | Folha |
| --- | --- | --- |
| 29/10/2026 | Mapa criado (versão 1). Fase actual: 3, expansão para outros grupos e jogadores | 2 |
