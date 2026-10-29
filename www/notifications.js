(function exposeNotifications(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.FooterNotifications = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createNotificationsApi() {
  // Versao da app: MAJOR.MINOR.PATCH.
  // MAJOR: mudanca grande na forma de usar a app. MINOR: novidade visivel para os jogadores. PATCH: correcoes e afinacoes.
  // Cada push com mudancas para os jogadores acrescenta uma entrada no topo, em linguagem simples.
  const CHANGELOG = [
    {
      version: "1.15.0",
      date: "2026-10-29",
      title: "Zoom nos vídeos",
      items: [
        "Em ecrã cheio há um botão novo para ampliar o vídeo 2 ou 3 vezes (carrega outra vez para voltar ao normal).",
        "Com zoom, arrasta o dedo para escolher a zona do campo; um toque pausa ou continua o vídeo.",
      ],
    },
    {
      version: "1.14.1",
      date: "2026-10-29",
      title: "Momentos em repetição",
      items: [
        "Ao ver um momento, o pedaço repete-se em vez de parar no fim.",
        "Carrega em Continuar o jogo para o vídeo seguir dali, ou salta para outro ponto do vídeo.",
      ],
    },
    {
      version: "1.14.0",
      date: "2026-10-29",
      title: "Editar momentos",
      items: [
        "Quem marcou um momento num vídeo pode agora corrigi-lo: carrega no lápis ✎ ao lado do momento.",
        "Dá para mudar o texto, o tempo e o início e o fim do pedaço, sem ter de apagar e marcar de novo.",
      ],
    },
    {
      version: "1.13.0",
      date: "2026-10-29",
      title: "A minha disponibilidade",
      items: [
        "Em Jogos há um separador novo, A minha disponibilidade, separado dos Jogos públicos.",
        "Podes escolher se o teu perfil fica visível aos admins de outros grupos.",
        "Disponibilidade semanal: marcas os dias da semana e as horas de cada um, e repete-se todas as semanas. Continua a dar para marcar dias concretos desta semana ou da próxima.",
        "Jogos públicos novos aparecem com um número amarelo; se calharem num período em que estás disponível, o número fica vermelho e o jogo diz Na tua disponibilidade.",
      ],
    },
    {
      version: "1.12.0",
      date: "2026-10-28",
      title: "Avisos de admin e apagar grupos",
      items: [
        "Os admins veem um número vermelho em Admin e em Pedidos quando há pedidos por aprovar.",
        "Em Jogos, o número vermelho aparece também em Os meus jogos (pedidos para jogar) ou em Jogos públicos (convites e jogos novos). Os pedidos para jogar ficam logo visíveis na convocatória.",
        "O dono de um grupo pode apagá-lo no Clube. O grupo fica 30 dias em quarentena e pode ser recuperado em A minha conta; depois é apagado de vez.",
      ],
    },
    {
      version: "1.11.0",
      date: "2026-10-28",
      title: "Criar grupos sem esperar",
      items: [
        "Quem cria um grupo fica logo como dono, sem aprovação. Cada conta pode ser dona de até 2 grupos.",
        "Se não estás na lista do teu grupo, crias o teu perfil e ficas logo ligado; o admin acerta a nota depois.",
        "Escolher um perfil que já existe continua a precisar da aprovação do admin.",
      ],
    },
    {
      version: "1.10.2",
      date: "2026-10-28",
      title: "Primeiros passos do grupo",
      items: [
        "Nos primeiros passos de um grupo novo, \"Criar convocatória\" leva agora ao separador Nova convocatória.",
      ],
    },
    {
      version: "1.10.1",
      date: "2026-10-28",
      title: "Escolher o campo",
      items: [
        "Na Nova convocatória, os admins voltam a poder escolher o concelho e o campo da lista, em vez de escreverem o local à mão.",
      ],
    },
    {
      version: "1.10.0",
      date: "2026-10-28",
      title: "Hall of Fame em carrosséis",
      items: [
        "Cada secção do Hall of Fame (Resultados, Presença e prémios, Combinações e Em campo) é agora um carrossel de cartões coloridos que deslizas para o lado.",
      ],
    },
    {
      version: "1.9.0",
      date: "2026-10-28",
      title: "Revisão do mês e números de vídeo",
      items: [
        "Quando um mês acaba e todos os jogos têm resultado e MVP, abre a tua Revisão do mês: cartões que deslizas com presenças, vitórias, MVP, distância, ritmo, sprints, passes e cartas.",
        "Encontras a revisão no teu perfil e há um aviso quando fica pronta.",
        "O Hall of Fame tem uma secção Em campo (Beta) com o jogador mais rápido, o que mais corre e as ligações de passes.",
        "No mês em curso o Hall of Fame mostra resultados parciais, marcados como Parcial.",
      ],
    },
    {
      version: "1.8.0",
      date: "2026-10-28",
      title: "Jogos mais simples e novo Hall of Fame",
      items: [
        "Em Jogos há \"Os meus jogos\", \"Jogos públicos\" e, para os admins, \"Nova convocatória\".",
        "Cada convocatória é mais compacta e mostra sempre quem vai, quem talvez vá e quem não vai.",
        "Fazer equipas ficou mais direto: confirmar equipas no topo e ajustar com A e B lado a lado.",
        "O Hall of Fame tem um desenho novo, com destaques deslizantes e filtro por mês, época ou sempre.",
        "Saiu o ranking de dívidas do Hall of Fame.",
      ],
    },
    {
      version: "1.7.0",
      date: "2026-10-23",
      title: "Disponibilidade e convites",
      items: [
        "Em Jogos públicos dizes em que dias e horas podes jogar esta semana ou na próxima.",
        "Os admins com vagas veem quem está disponível, primeiro quem encaixa no dia e hora, e podem convidar-te.",
        "Os convites aparecem em Jogos públicos para aceitares ou recusares.",
        "A bolinha vermelha em Jogos avisa de convites, pedidos e jogos públicos novos.",
      ],
    },
    {
      version: "1.6.0",
      date: "2026-10-23",
      title: "Separador Jogos",
      items: [
        "O separador Jogo passa a Jogos: \"O meu grupo\" e \"Jogos públicos\".",
        "As equipas confirmadas aparecem na própria convocatória.",
        "Fazer equipas fica só para os admins.",
      ],
    },
    {
      version: "1.5.0",
      date: "2026-10-23",
      title: "Cria o teu grupo",
      items: [
        "Na Conta podes pedir um grupo novo para os teus amigos.",
        "Depois de aprovado, os primeiros passos ajudam a juntar jogadores, convidar e marcar o primeiro jogo.",
      ],
    },
    {
      version: "1.4.0",
      date: "2026-10-23",
      title: "Convites para o grupo",
      items: [
        "Os admins têm um link de convite para partilhar no WhatsApp.",
        "Quem abre o link entra no grupo e escolhe o seu perfil em \"Qual destes és tu?\".",
        "Se não estás na lista, crias o teu perfil e o admin aprova.",
        "Contas novas só entram num grupo através de um convite.",
      ],
    },
    {
      version: "1.3.0",
      date: "2026-10-23",
      title: "Jogos públicos",
      items: [
        "O admin pode abrir um jogo a quem não é do grupo quando falta alguém.",
        "Vês os jogos públicos de outros grupos e podes dizer que estás disponível.",
        "Na Conta indicas a tua forma, posição e faixa etária; só o admin do jogo a que pedes para ir as vê.",
      ],
    },
    {
      version: "1.2.0",
      date: "2026-10-23",
      title: "Equipas mais rápidas e votos só teus",
      items: [
        "Fazer equipas ficou mais simples: entram só os confirmados, com Auto e Baralhar.",
        "Já não há suplentes: só Equipa A e Equipa B.",
        "As equipas confirmadas seguem direto para o WhatsApp do grupo.",
        "O teu voto de MVP é confidencial: só tu sabes em quem votaste.",
      ],
    },
    {
      version: "1.1.0",
      date: "2026-10-22",
      title: "Partilha os melhores momentos",
      items: [
        "Cada momento dos vídeos tem agora um botão de partilhar.",
        "Quem abre o link vai direto a esse momento na app.",
        "Os momentos começam 8 segundos antes, para se perceber a jogada.",
        "Por baixo do vídeo há uma barra com os momentos marcados; toca num para lá saltares.",
        "Quando um momento acontece, o vídeo acende e mostra o que foi marcado.",
      ],
    },
    {
      version: "1.0.0",
      date: "2026-10-22",
      title: "O teu perfil passa a ser a casa da app",
      items: [
        "Novo separador Jogador na barra de baixo: a app abre logo no teu perfil.",
        "Os teus números têm agora ícones para se lerem num relance.",
        "Cartas mais limpas: só a foto, o nome e a média.",
        "Toca no símbolo do Footer para veres novidades: convocatórias, vídeos, momentos e MVP.",
      ],
    },
  ];

  const APP_VERSION = CHANGELOG[0].version;
  const FEED_LIMIT = 30;
  const FIRST_RUN_LOOKBACK_DAYS = 7;

  function time(value) {
    const t = new Date(value).getTime();
    return Number.isFinite(t) ? t : null;
  }

  // Junta as fontes (ja em formato { id, kind, at, text }) por ordem cronologica inversa.
  function buildFeed(items, now = Date.now()) {
    return items
      .filter((item) => item && time(item.at) != null && time(item.at) <= now)
      .sort((a, b) => time(b.at) - time(a.at))
      .slice(0, FEED_LIMIT);
  }

  // Sem registo (primeira vez neste dispositivo) so conta a ultima semana, para nao aparecer o historico todo.
  function defaultSeenAt(now = Date.now()) {
    return new Date(now - FIRST_RUN_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  }

  function countUnseen(feed, seenAt) {
    const seen = time(seenAt);
    if (seen == null) return feed.length;
    return feed.filter((item) => time(item.at) > seen).length;
  }

  function compareVersions(a, b) {
    const pa = String(a || "0").split(".").map(Number);
    const pb = String(b || "0").split(".").map(Number);
    for (let i = 0; i < 3; i += 1) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff) return diff;
    }
    return 0;
  }

  // Versoes ainda nao vistas: todas as mais recentes do que a ultima vista (so a atual na primeira vez).
  function unseenReleases(lastSeenVersion, changelog = CHANGELOG) {
    if (!lastSeenVersion) return changelog.slice(0, 1);
    return changelog.filter((release) => compareVersions(release.version, lastSeenVersion) > 0);
  }

  return { CHANGELOG, APP_VERSION, buildFeed, defaultSeenAt, countUnseen, compareVersions, unseenReleases };
});
