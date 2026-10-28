const STORAGE_KEY = "five-a-side-balancer-state-v1";
const PostgameRules = window.FooterPostgame || {
  isScaleValue: (value) => Number.isInteger(value) && value >= 1 && value <= 10,
  isCheckinRequired: ({ hasVote = false, hasFeedback = false, isTransitionGame = false, isAfterRollout = false, isBeforeRollout = false } = {}) => !hasFeedback && !isBeforeRollout && (isTransitionGame ? !hasVote : Boolean(isAfterRollout)),
  sortPendingCheckins: (items) => [...items].sort((a, b) => new Date(a.date) - new Date(b.date)),
  INTENSITY_SCALE: { question: "Intensidade do jogo: Velhinhos ou Champions?", anchors: { 1: "Velhinhos", 5: "Bom ritmo", 10: "Champions" } },
  ENERGY_SCALE: { question: "Morreste ou jogavas mais meia hora?", anchors: { 1: "Morri", 5: "Ainda dava uns minutos", 10: "Mais meia hora facil" } },
};
const FooterMonthly = window.FooterMonthly || {
  activeMinutesForSquad: (size) => 50 * Math.min(1, 5 / (Number(size) || 5)),
  metForIntensity: (score) => Number.isFinite(Number(score)) && Number(score) >= 1 && Number(score) <= 10 ? 5 + ((Number(score) - 1) / 9) * 5 : 7,
  estimateCalories: ({ weightKg, minutes, met }) => Math.round(Number(met) * Number(weightKg) * Number(minutes) / 60),
  average: (values) => values.length ? values.reduce((sum, value) => sum + Number(value), 0) / values.length : null,
};
const FooterStats = window.FooterStats || {
  summarizePlayerGoals: (rows) => { const appearances = rows.length; const goalsFor = rows.reduce((s, r) => s + Number(r.goalsFor || 0), 0); const goalsAgainst = rows.reduce((s, r) => s + Number(r.goalsAgainst || 0), 0); return { appearances, goalsFor, goalsAgainst, averageGoalsFor: appearances ? goalsFor / appearances : 0, averageGoalsAgainst: appearances ? goalsAgainst / appearances : 0 }; },
  calculateBestWinStreak: (records) => { let running = 0; let best = 0; (records || []).forEach((record) => { if (record?.valid !== true) return; running = record.outcome === "win" ? running + 1 : 0; best = Math.max(best, running); }); return best; },
  countLeadingAbsences: (rows) => { let count = 0; for (const row of rows) { if (row === "absent") count += 1; else break; } return count; },
  isGoalAverageEligible: ({ appearances, recentAbsences }) => appearances >= 5 && recentAbsences <= 5,
  sortGoalsForAverage: (a, b, name) => b.goalsForAverage - a.goalsForAverage || b.goalsFor - a.goalsFor || b.appearances - a.appearances || name(a).localeCompare(name(b)),
  sortGoalsAgainstAverage: (a, b, name) => a.goalsAgainstAverage - b.goalsAgainstAverage || a.goalsAgainst - b.goalsAgainst || b.appearances - a.appearances || name(a).localeCompare(name(b)),
};
const PAYMENT_RULES = {
  playerFeePerGame: 4,
  monthlyCap: 15,
  fieldCostPerGame: 38,
};
const DEBT_NOTE_PREFIX = "[DIVIDA]";

const FORM_LEVELS = {
  hot: { label: "Em grande forma", className: "form-hot" },
  good: { label: "Boa forma", className: "form-good" },
  normal: { label: "Normal", className: "form-normal" },
  bad: { label: "Ma fase", className: "form-bad" },
  recovery: { label: "A recuperar", className: "form-recovery" },
};

const PLAYER_CARD_VARIANTS = {
  rookie: { key: "rookie", asset: "assets/new cards template/card_rookie.png", label: "Rookie", description: "Jogador ainda sem jogos registados pela equipa." },
  base: { key: "base", asset: "assets/new cards template/card_base.png", label: "Base", description: "Carta normal quando nao existe outro destaque ativo." },
  win_1x: { key: "win_1x", asset: "assets/new cards template/card_win_1x.png", label: "Primeira vitoria", description: "Jogador venceu o primeiro jogo desde que ha historico registado." },
  win_2x: { key: "win_2x", asset: "assets/new cards template/card_win_2x.png", label: "2 vitorias seguidas", description: "Jogador venceu dois jogos consecutivos da equipa, sem ausencia pelo meio." },
  win_3x: { key: "win_3x", asset: "assets/new cards template/card_win_3x.png", label: "3 vitorias seguidas", description: "Jogador venceu tres jogos consecutivos da equipa, sem ausencia pelo meio." },
  win_4x: { key: "win_4x", asset: "assets/new cards template/card_win_4x.png", label: "4 vitorias seguidas", description: "Jogador venceu quatro jogos consecutivos da equipa, sem ausencia pelo meio." },
  win_5x: { key: "win_5x", asset: "assets/new cards template/card_win_5x.png", label: "5+ vitorias seguidas", description: "Jogador venceu cinco ou mais jogos consecutivos da equipa, sem ausencia pelo meio." },
  form_3w_5: { key: "form_3w_5", asset: "assets/new cards template/card_form_3w_5.png", label: "3 em 5", description: "Jogador venceu 3 dos ultimos 5 jogos em que participou." },
  form_4w_5: { key: "form_4w_5", asset: "assets/new cards template/card_form_4w_5.png", label: "4 em 5", description: "Jogador venceu 4 dos ultimos 5 jogos em que participou." },
  form_5w_5: { key: "form_5w_5", asset: "assets/new cards template/card_form_5w_5.png", label: "5 em 5", description: "Jogador venceu os ultimos 5 jogos em que participou." },
  mvp: { key: "mvp", asset: "assets/new cards template/card_mvp.png", label: "MVP", description: "Jogador foi eleito MVP oficial de um jogo. A carta fica ativa no jogo seguinte, se participar." },
  mvp_2x: { key: "mvp_2x", asset: "assets/new cards template/card_mvp_2x.png", label: "MVP 2x", description: "Jogador foi MVP oficial em dois jogos consecutivos." },
  mvp_3x: { key: "mvp_3x", asset: "assets/new cards template/card_mvp_3x.png", label: "MVP 3x", description: "Jogador foi MVP oficial em tres ou mais jogos consecutivos." },
  mvp_month: { key: "mvp_month", asset: "assets/new cards template/card_mvp_month.png", label: "MVP do mês", description: "Prémio de MVP de um mês fechado, por MVPs oficiais, vitórias e win rate. A carta fica ativa no primeiro jogo elegível do mês seguinte." },
  champion_spring: { key: "champion_spring", asset: "assets/new cards template/card_champion_spring.png", label: "Campeao primavera", description: "Jogador foi campeao da primavera por vitorias, com win rate como desempate." },
  champion_summer: { key: "champion_summer", asset: "assets/new cards template/card_champion_summer.png", label: "Campeao verao", description: "Jogador foi campeao do verao por vitorias, com win rate como desempate." },
  champion_autumn: { key: "champion_autumn", asset: "assets/new cards template/card_champion_autumn.png", label: "Campeao outono", description: "Jogador foi campeao do outono por vitorias, com win rate como desempate." },
  champion_winter: { key: "champion_winter", asset: "assets/new cards template/card_champion_winter.png", label: "Campeao inverno", description: "Jogador foi campeao do inverno por vitorias, com win rate como desempate." },
  ironman_month: { key: "ironman_month", asset: "assets/new cards template/card_ironman_month.png", label: "Ironman do mes", description: "Jogador participou em todos os jogos finalizados do mes." },
  regular: { key: "regular", asset: "assets/new cards template/card_regular.png", label: "Regular", description: "Jogador teve presenca elevada nos jogos recentes da equipa." },
  return: { key: "return", asset: "assets/new cards template/card_return.png", label: "Regresso", description: "Jogador voltou a jogar depois de uma ausencia longa." },
  rising: { key: "rising", asset: "assets/new cards template/card_rising.png", label: "A subir", description: "Jogador esta com subida forte de forma/rating recente." },
  hot: { key: "hot", asset: "assets/new cards template/card_hot.png", label: "Em alta", description: "Jogador esta em grande forma recente." },
  recovery: { key: "recovery", asset: "assets/new cards template/card_recovery.png", label: "Recuperacao", description: "Jogador esta em fase negativa ou de recuperacao." },
};
const CARD_AWARD_PRIORITY = [
  "mvp_3x", "mvp_2x", "mvp", "mvp_month",
  "champion_spring", "champion_summer", "champion_autumn", "champion_winter",
  "win_5x", "win_4x", "win_3x", "win_2x", "win_1x",
  "form_5w_5", "form_4w_5", "form_3w_5",
  "ironman_month", "rising", "hot", "regular", "return", "recovery", "rookie", "base",
];
const FIELD_ONLY_CARD_KEYS = new Set(["champion_spring", "champion_summer", "champion_autumn", "champion_winter"]);

const FORM_LOOKBACK_GAMES = 5;
const PROFILE_HISTORY_LIMIT = 20;
const AWARD_REVEAL_STORAGE_KEY = "footer-award-reveals-v1";
const FORM_RATING_CAP = 7;
const TEAM_RADAR_MIN = 55;
const TEAM_RADAR_MAX = 75;
const TEAM_RADAR_DYNAMIC_MAX = true;
const TEAM_RADAR_AGGREGATION = "power";
const TEAM_RADAR_POWER = 1.35;
const MVP_MIN_VOTES = 5;
const MVP_LOCK_HOURS = 24;
const SEASON_DEFINITIONS = {
  spring: { label: "primavera", startMonth: 2, startDay: 20, endMonth: 5, endDay: 21 },
  summer: { label: "verao", startMonth: 5, startDay: 21, endMonth: 8, endDay: 22 },
  autumn: { label: "outono", startMonth: 8, startDay: 22, endMonth: 11, endDay: 21 },
  winter: { label: "inverno", startMonth: 11, startDay: 21, endMonth: 2, endDay: 20 },
};
const TEAM_RADAR_STATS = [
  { key: "pace", label: "PAC" },
  { key: "shooting", label: "SHO" },
  { key: "passing", label: "PAS" },
  { key: "dribbling", label: "DRI" },
  { key: "defending", label: "DEF" },
  { key: "physical", label: "PHY" },
];

const INITIAL_FINANCE_BALANCES = {};

const defaultFinanceSettings = {
  startMonth: "2026-05",
  cashBalance: 0,
  playerBalances: { ...INITIAL_FINANCE_BALANCES },
};

const samplePlayers = [
  player("p-demo-01", "Jogador 1", 49, 46, 47, 39, 52, 45, 46),
  player("p-demo-02", "Jogador 2", 76, 81, 78, 83, 77, 78, 79),
  player("p-demo-03", "Jogador 3", 74, 81, 73, 78, 74, 80, 77),
  player("p-demo-04", "Jogador 4", 60, 69, 67, 71, 52, 56, 62),
  player("p-demo-05", "Jogador 5", 58, 58, 62, 53, 67, 61, 60),
  player("p-demo-06", "Jogador 6", 63, 59, 60, 57, 65, 66, 62),
  player("p-demo-07", "Jogador 7", 66, 71, 73, 72, 75, 74, 72),
  player("p-demo-08", "Jogador 8", 59, 58, 60, 51, 63, 46, 56),
  player("p-demo-09", "Jogador 9", 58, 58, 58, 51, 64, 64, 59),
  player("p-demo-10", "Jogador 10", 50, 73, 69, 75, 52, 56, 62),
  player("p-demo-11", "Jogador 11", 48, 52, 53, 46, 52, 43, 49),
  player("p-demo-12", "Jogador 12", 74, 62, 60, 63, 70, 79, 68),
  player("p-demo-13", "Jogador 13", 72, 88, 83, 82, 70, 70, 77),
  player("p-demo-14", "Jogador 14", 85, 78, 73, 70, 78, 70, 76),
  player("p-demo-15", "Jogador 15", 68, 82, 83, 91, 70, 68, 77),
];

const config = window.FIVE5_CONFIG || {};
let state = loadState();
let supabaseClient = null;
let remoteEnabled = false;
let isAdmin = false;
let currentSession = null;
let currentProfile = null;
let knownProfiles = [];
// Grupos da conta (fase 3): o grupo ativo decide que dados se veem e quem e admin.
const ACTIVE_GROUP_KEY = "footer-active-group-v1";
const LEGACY_GROUP_SLUG = "futeboleiros";
let myGroups = [];
let activeGroupId = null;
// Papel de cada conta no grupo ativo (so carregado para admins, para a lista de contas).
let groupMemberRoles = new Map();
// Jogos publicos (fase 3.1.3): pedidos aos jogos do grupo (admin), jogos de outros grupos e caracteristicas.
let joinRequests = [];
let requesterTraits = new Map();
let publicEvents = [];
let myTraits = null;
// Disponibilidade semanal e "Procurar jogadores" na convocatoria.
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
const PUBLIC_SEEN_KEY = "footer-public-games-seen-v1";
let myAvailability = [];
let availabilityWeekOffset = 0;
const recruitOpen = new Set();
// Blocos abertos nos cartoes de convocatoria; sobrevivem aos re-renders.
const openEventDetails = new Set();
// Declarada aqui porque bindEvents() (no fim do ficheiro de arranque) chama loadPitchCatalog antes do resto do codigo correr.
let pitchCatalogPromise = null;
const availableByEvent = new Map();
const TRAIT_LABELS = {
  fitness: { relaxed: "Descontraido", regular: "Regular", athletic: "Atletico" },
  position: { goalkeeper: "So guarda-redes", mixed: "Misto (vai a baliza e troca)", outfield: "Jogador de campo" },
  age_band: { "18-24": "18-24", "25-34": "25-34", "35-44": "35-44", "45+": "45+" },
};
const NEEDS_LABELS = { outfield: "Jogador de campo", mixed: "Misto", goalkeeper: "Guarda-redes" };
// Convites (fase 3.2): o codigo do link ?convite= fica guardado ate a pessoa entrar e aceitar.
const PENDING_INVITE_KEY = "footer-pending-invite-v1";
let pendingInvite = null;
let groupsLoadedOk = false;
let currentInviteCode = null;
// Grupos novos (fase 3.3): pedidos da propria conta e, para o dono da app, todos os pendentes.
let isPlatformAdmin = false;
let groupRequests = [];
// Quarentena de grupos: os que esta conta pode recuperar e, para o dono da app, todos os grupos.
let deletedGroups = [];
let allGroups = [];
let newGroupFormOpen = false;
const PUBLIC_GAME_ERRORS = {
  traits_required: "Preenche primeiro as tuas caracteristicas na Conta.",
  event_full: "O jogo ja esta cheio.",
  request_rejected: "O admin deste jogo recusou o teu pedido.",
  event_not_public: "Este jogo ja nao esta aberto.",
  already_group_member: "Ja fazes parte deste grupo.",
  request_already_decided: "Este pedido ja foi decidido.",
  invite_not_found: "Este convite ja nao esta ativo.",
  player_not_available: "Este jogador ja nao esta disponivel.",
  event_not_open: "Esta convocatoria ja nao esta aberta.",
};
let playerClaims = [];
let eventResponses = [];
let gameMvpVotes = state.gameMvpVotes || [];
let gameFeedback = state.gameFeedback || [];
let featureRollouts = state.featureRollouts || [];
// Perfil: periodo escolhido ("month:AAAA-MM", "3m", "season", "all") e separador de detalhe.
let profilePeriod = null;
let profileTab = "games";
let privateWeightHistory = [];
let mvpVoteCounts = [];
let payments = state.payments || [];
let attendanceOverrides = state.attendanceOverrides || [];
let gameFinanceOverrides = state.gameFinanceOverrides || [];
let financeSettings = state.financeSettings || { ...defaultFinanceSettings, playerBalances: { ...defaultFinanceSettings.playerBalances } };
let currentEventId = null;
let currentPaymentsMonth = monthKey(new Date());
let selectedIds = new Set();
// Divisoes equilibradas por ordem de qualidade: "Auto" mostra a primeira, "Baralhar" percorre as seguintes.
let currentSuggestions = [];
let currentSuggestionIndex = 0;
let finishingGame = false; // id do jogo cujo resultado esta a ser inserido
let currentGameId = null;
let currentHistoryGameId = null;
let currentGenerationDateIso = new Date().toISOString();
let previewGame = null;
let authActionBusy = false;
let currentPlayerProfileId = null;
let currentViewName = "events";
let currentMonthlyMonth = null;
let navigationHistoryReady = false;
let awardRevealSessionSeenKeys = new Set();

const els = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  myProfileTab: document.querySelector("#my-profile-tab"),
  playerList: document.querySelector("#player-list"),
  playerSearch: document.querySelector("#player-search"),
  selectedCount: document.querySelector("#selected-count"),
  selectionHint: document.querySelector("#selection-hint"),
  clearSelection: document.querySelector("#clear-selection"),
  guestName: document.querySelector("#guest-name"),
  guestScore: document.querySelector("#guest-score"),
  addGuest: document.querySelector("#add-guest"),
  gameDate: document.querySelector("#game-date"),
  generateTeams: document.querySelector("#generate-teams"),
  shuffleTeams: document.querySelector("#shuffle-teams"),
  teamMakerActions: document.querySelector("#team-maker-actions"),
  gamePanelTitle: document.querySelector("#game-panel-title"),
  otherPlayers: document.querySelector("#other-players"),
  otherPlayerList: document.querySelector("#other-player-list"),
  currentGameEmpty: document.querySelector("#current-game-empty"),
  currentGame: document.querySelector("#current-game"),
  fieldCard: document.querySelector("#field-card"),
  stepConfirm: document.querySelector("#step-confirm"),
  stepDate: document.querySelector("#step-date"),
  stepShare: document.querySelector("#step-share"),
  stepFinish: document.querySelector("#step-finish"),
  confirmGame: document.querySelector("#confirm-game"),
  shareTeams: document.querySelector("#share-teams"),
  exportImage: document.querySelector("#export-image"),
  finishGame: document.querySelector("#finish-game"),
  scoreRow: document.querySelector("#score-row"),
  scoreA: document.querySelector("#score-a"),
  scoreB: document.querySelector("#score-b"),
  saveScore: document.querySelector("#save-score"),
  rosterEditor: document.querySelector("#roster-editor"),
  addPlayerToGame: document.querySelector("#add-player-to-game"),
  addPlayerGameBtn: document.querySelector("#add-player-game-btn"),
  playersTable: document.querySelector("#players-table"),
  playerForm: document.querySelector("#player-form"),
  playerId: document.querySelector("#player-id"),
  formName: document.querySelector("#form-name"),
  formPace: document.querySelector("#form-pace"),
  formShooting: document.querySelector("#form-shooting"),
  formPassing: document.querySelector("#form-passing"),
  formDribbling: document.querySelector("#form-dribbling"),
  formDefending: document.querySelector("#form-defending"),
  formPhysical: document.querySelector("#form-physical"),
  formOverall: document.querySelector("#form-overall"),
  formPhoto: document.querySelector("#form-photo"),
  clearPlayerPhoto: document.querySelector("#clear-player-photo"),
  cancelPlayerEdit: document.querySelector("#cancel-player-edit"),
  exportData: document.querySelector("#export-data"),
  importData: document.querySelector("#import-data"),
  resetData: document.querySelector("#reset-data"),
  gamesList: document.querySelector("#games-list"),
  historyGameDetail: document.querySelector("#history-game-detail"),
  playerProfile: document.querySelector("#player-profile"),
  exportCanvas: document.querySelector("#export-canvas"),
  dataStatus: document.querySelector("#data-status"),
  adminLogin: document.querySelector("#admin-login"),
  accountSignup: document.querySelector("#account-signup"),
  adminLogout: document.querySelector("#admin-logout"),
  mvpGate: document.querySelector("#mvp-gate"),
  monthlyAutoGate: document.querySelector("#monthly-auto-gate"),
  monthReview: document.querySelector("#month-review"),
  accountPanel: document.querySelector("#account-panel"),
  claimsList: document.querySelector("#claims-list"),
  accountsList: document.querySelector("#accounts-list"),
  paymentsPanel: document.querySelector("#payments-panel"),
  statsPanel: document.querySelector("#stats-panel"),
  monthlyPanel: document.querySelector("#monthly-panel"),
  monthlyMonth: document.querySelector("#monthly-month"),
  eventForm: document.querySelector("#event-form"),
  eventTitle: document.querySelector("#event-title"),
  eventDate: document.querySelector("#event-date"),
  eventLocation: document.querySelector("#event-location"),
  eventMaxPlayers: document.querySelector("#event-max-players"),
  eventsList: document.querySelector("#events-list"),
  loadEventGoing: document.querySelector("#load-event-going"),
};

let pendingPhotoDataUrl = null;
const photoCache = new Map();
const cardAssetCache = new Map();
const pendingGuestPlayers = new Map();

window.addEventListener("error", (event) => {
  if (els.playerList) {
    els.playerList.innerHTML = `
      <div class="hint warn">
        A app encontrou um erro ao carregar. Faz Ctrl + F5. Se continuar, usa "Repor exemplo" na aba Jogadores.
      </div>
    `;
  }
  console.error(event.error || event.message);
});

bindEvents();
initApp();

function player(id, name, pace, shooting, passing, dribbling, defending, physical, overall) {
  return {
    id,
    name,
    pace,
    shooting,
    passing,
    dribbling,
    defending,
    physical,
    overall,
    photoDataUrl: "",
    linkedUserId: null,
    isGuest: false,
    guestScore0To10: null,
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.players) && Array.isArray(saved.games)) {
      return migrateState(saved);
    }
  } catch (error) {
    console.warn("Could not load saved state", error);
  }
  return migrateState({
    players: samplePlayers,
    games: [],
    events: [],
    gameMvpVotes: [],
    payments: [],
    attendanceOverrides: [],
    gameFinanceOverrides: [],
    financeSettings: { ...defaultFinanceSettings, playerBalances: { ...defaultFinanceSettings.playerBalances } },
  });
}

function getSeenAwardReveals() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AWARD_REVEAL_STORAGE_KEY) || "[]");
    const storedKeys = Array.isArray(parsed) ? parsed.map(String) : [];
    return new Set([...storedKeys, ...awardRevealSessionSeenKeys]);
  } catch {
    return new Set(awardRevealSessionSeenKeys);
  }
}

function saveSeenAwardReveals(keys) {
  awardRevealSessionSeenKeys = new Set([...keys].map(String));
  try {
    localStorage.setItem(AWARD_REVEAL_STORAGE_KEY, JSON.stringify([...awardRevealSessionSeenKeys]));
    return true;
  } catch (error) {
    console.warn("Could not save seen award reveals", error);
    return false;
  }
}

function getAwardRevealKey(playerId, gameId, awardKey) {
  return `${playerId}:${gameId}:${awardKey}`;
}

// Os jogadores de exemplo so servem o modo local; um grupo remoto vazio fica vazio.
function migrateState(saved, options = {}) {
  saved.players = saved.players
    .map((p, index) => normalizePlayerRecord(p, index))
    .filter(Boolean);
  if (!saved.players.length && options.allowSample !== false) {
    saved.players = samplePlayers.map((p) => ({ ...p }));
  }
  saved.games = saved.games.map((game) => ensureGameShape({ ...game }));
  saved.events = Array.isArray(saved.events) ? saved.events.map(normalizeEventRecord).filter(Boolean) : [];
  saved.gameMvpVotes = Array.isArray(saved.gameMvpVotes) ? saved.gameMvpVotes.map(normalizeMvpVoteRecord).filter(Boolean) : [];
  saved.gameFeedback = Array.isArray(saved.gameFeedback) ? saved.gameFeedback.map(normalizeGameFeedbackRecord).filter(Boolean) : [];
  saved.featureRollouts = Array.isArray(saved.featureRollouts) ? saved.featureRollouts.map(normalizeFeatureRolloutRecord).filter(Boolean) : [];
  saved.payments = Array.isArray(saved.payments) ? saved.payments.map(normalizePaymentRecord).filter(Boolean) : [];
  saved.attendanceOverrides = Array.isArray(saved.attendanceOverrides) ? saved.attendanceOverrides.map(normalizeAttendanceOverrideRecord).filter(Boolean) : [];
  saved.gameFinanceOverrides = Array.isArray(saved.gameFinanceOverrides) ? saved.gameFinanceOverrides.map(normalizeGameFinanceOverrideRecord).filter(Boolean) : [];
  saved.financeSettings = normalizeFinanceSettings(saved.financeSettings);
  return saved;
}

function normalizeGameFeedbackRecord(record) {
  if (!record || typeof record !== "object") return null;
  const gameId = record.gameId || record.game_id;
  const playerId = record.playerId || record.player_id;
  const intensity = Number(record.gameIntensity ?? record.game_intensity);
  const energy = Number(record.remainingEnergy ?? record.remaining_energy);
  if (!gameId || !playerId || !PostgameRules.isScaleValue(intensity) || !PostgameRules.isScaleValue(energy)) return null;
  return { id: String(record.id || createUuid()), gameId: String(gameId), playerId: String(playerId), userId: record.userId || record.user_id || null, gameIntensity: intensity, remainingEnergy: energy, calculationVersion: Number(record.calculationVersion ?? record.calculation_version ?? 1), createdAt: record.createdAt || record.created_at || new Date().toISOString() };
}

function gameFeedbackFromRow(row) { return normalizeGameFeedbackRecord(row); }

function normalizeFeatureRolloutRecord(record) {
  if (!record || typeof record !== "object") return null;
  return { key: String(record.key || "postgame_feedback"), activatedAt: record.activatedAt || record.activated_at || null, transitionGameId: record.transitionGameId || record.transition_game_id || null };
}

function normalizePrivateMetricRecord(record) {
  if (!record || typeof record !== "object") return null;
  const weightKg = Number(record.weightKg ?? record.weight_kg);
  const playerId = record.playerId || record.player_id;
  if (!playerId || !Number.isFinite(weightKg) || weightKg < 30 || weightKg > 250) return null;
  return { id: String(record.id || createUuid()), playerId: String(playerId), userId: record.userId || record.user_id || null, weightKg, effectiveFrom: String(record.effectiveFrom || record.effective_from || todayInputDate()), createdAt: record.createdAt || record.created_at || new Date().toISOString() };
}

function normalizePlayerRecord(record, index) {
  if (!record || typeof record !== "object") return null;
  const quickRating = Number(record.guestScore0To10);
  const fallbackRating = clampRating(record.overall ?? (Number.isNaN(quickRating) ? 50 : quickRating * 10));
  return {
    id: String(record.id || `p-imported-${index}-${Date.now()}`),
    name: String(record.name || `Jogador ${index + 1}`).trim() || `Jogador ${index + 1}`,
    pace: clampRating(record.pace ?? fallbackRating),
    shooting: clampRating(record.shooting ?? fallbackRating),
    passing: clampRating(record.passing ?? fallbackRating),
    dribbling: clampRating(record.dribbling ?? fallbackRating),
    defending: clampRating(record.defending ?? fallbackRating),
    physical: clampRating(record.physical ?? fallbackRating),
    overall: fallbackRating,
    photoDataUrl: String(record.photoDataUrl || ""),
    linkedUserId: record.linkedUserId || null,
    isGuest: Boolean(record.isGuest),
    guestScore0To10: record.guestScore0To10,
  };
}

function playerFromRow(row) {
  return normalizePlayerRecord({
    id: row.id,
    name: row.name,
    pace: row.pace,
    shooting: row.shooting,
    passing: row.passing,
    dribbling: row.dribbling,
    defending: row.defending,
    physical: row.physical,
    overall: row.overall,
    photoDataUrl: row.photo_data_url,
    linkedUserId: row.linked_user_id,
    isGuest: Boolean(row.is_guest),
    guestScore0To10: row.guest_score_0_to_10,
  }, 0);
}

function playerToRow(playerData) {
  return {
    id: playerData.id,
    name: playerData.name,
    pace: playerData.pace,
    shooting: playerData.shooting,
    passing: playerData.passing,
    dribbling: playerData.dribbling,
    defending: playerData.defending,
    physical: playerData.physical,
    overall: playerData.overall,
    photo_data_url: playerData.photoDataUrl || "",
    linked_user_id: playerData.linkedUserId || null,
    is_guest: Boolean(playerData.isGuest),
    guest_score_0_to_10: playerData.guestScore0To10 ?? null,
    ...activeGroupColumn(),
    updated_at: new Date().toISOString(),
  };
}

function gameFromRow(row) {
  return ensureGameShape({
    id: row.id,
    date: row.date,
    status: row.status,
    teamA: row.team_a || [],
    teamB: row.team_b || [],
    benchA: row.bench_a || [],
    benchB: row.bench_b || [],
    scoreA: row.score_a,
    scoreB: row.score_b,
    scoreSavedAt: row.score_saved_at || null,
    notes: row.notes || "",
  });
}

function gameToRow(game) {
  const clean = ensureGameShape({ ...game });
  return {
    id: clean.id,
    date: clean.date,
    status: clean.status,
    team_a: clean.teamA,
    team_b: clean.teamB,
    bench_a: clean.benchA,
    bench_b: clean.benchB,
    score_a: clean.scoreA,
    score_b: clean.scoreB,
    score_saved_at: clean.scoreSavedAt || null,
    notes: clean.notes || "",
    ...activeGroupColumn(),
    updated_at: new Date().toISOString(),
  };
}

function normalizeEventRecord(record) {
  if (!record || typeof record !== "object") return null;
  const startsAt = record.startsAt || record.starts_at || new Date().toISOString();
  return {
    id: String(record.id || `e-${Date.now()}`),
    title: String(record.title || "Jogo 5v5").trim() || "Jogo 5v5",
    sport: String(record.sport || "futsal"),
    startsAt,
    location: String(record.location || ""),
    minPlayers: Number(record.minPlayers ?? record.min_players ?? 10),
    maxPlayers: Number(record.maxPlayers ?? record.max_players ?? 12),
    status: String(record.status || "open"),
    visibility: (record.visibility || "group") === "public" ? "public" : "group",
    // Lista fixa: corre ao carregar o estado, antes das constantes dos jogos publicos.
    publicNeeds: ["outfield", "mixed", "goalkeeper"].includes(record.publicNeeds ?? record.public_needs) ? (record.publicNeeds ?? record.public_needs) : null,
    createdBy: record.createdBy || record.created_by || null,
    createdAt: record.createdAt || record.created_at || null,
  };
}

function eventFromRow(row) {
  return normalizeEventRecord({
    id: row.id,
    title: row.title,
    sport: row.sport,
    startsAt: row.starts_at,
    location: row.location,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    status: row.status,
    visibility: row.visibility,
    publicNeeds: row.public_needs,
    createdBy: row.created_by,
    createdAt: row.created_at,
  });
}

function eventToRow(eventData) {
  const clean = normalizeEventRecord(eventData);
  return {
    id: clean.id,
    title: clean.title,
    sport: clean.sport,
    starts_at: clean.startsAt,
    location: clean.location,
    min_players: clean.minPlayers,
    max_players: clean.maxPlayers,
    status: clean.status,
    visibility: clean.visibility,
    public_needs: clean.publicNeeds,
    created_by: clean.createdBy,
    ...activeGroupColumn(),
    updated_at: new Date().toISOString(),
  };
}

function responseFromRow(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    playerId: row.player_id,
    userId: row.user_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function normalizeMvpVoteRecord(record) {
  if (!record || typeof record !== "object") return null;
  const gameId = record.gameId || record.game_id;
  const voterPlayerId = record.voterPlayerId || record.voter_player_id;
  const candidatePlayerId = record.candidatePlayerId || record.candidate_player_id;
  if (!gameId || !voterPlayerId || !candidatePlayerId || voterPlayerId === candidatePlayerId) return null;
  return {
    id: String(record.id || createUuid()),
    gameId: String(gameId),
    voterPlayerId: String(voterPlayerId),
    candidatePlayerId: String(candidatePlayerId),
    userId: record.userId || record.user_id || null,
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
    updatedAt: record.updatedAt || record.updated_at || new Date().toISOString(),
  };
}

function mvpVoteFromRow(row) {
  return normalizeMvpVoteRecord({
    id: row.id,
    gameId: row.game_id,
    voterPlayerId: row.voter_player_id,
    candidatePlayerId: row.candidate_player_id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mvpVoteToRow(vote) {
  const clean = normalizeMvpVoteRecord(vote);
  return {
    id: clean.id,
    game_id: clean.gameId,
    voter_player_id: clean.voterPlayerId,
    candidate_player_id: clean.candidatePlayerId,
    user_id: clean.userId || currentSession?.user?.id || null,
    updated_at: new Date().toISOString(),
  };
}

function mvpVoteCountFromRow(row) {
  return {
    gameId: String(row.game_id),
    candidatePlayerId: String(row.candidate_player_id),
    voteCount: Number(row.vote_count || 0),
  };
}

function normalizePaymentRecord(record) {
  if (!record || typeof record !== "object") return null;
  const amount = Number(record.amount);
  if (!record.playerId && !record.player_id) return null;
  if (Number.isNaN(amount) || amount < 0) return null;
  return {
    id: String(record.id || `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`),
    playerId: String(record.playerId || record.player_id),
    amount,
    paidAt: record.paidAt || record.paid_at || new Date().toISOString(),
    note: String(record.note || ""),
    createdBy: record.createdBy || record.created_by || null,
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
  };
}

function paymentFromRow(row) {
  return normalizePaymentRecord({
    id: row.id,
    playerId: row.player_id,
    amount: row.amount,
    paidAt: row.paid_at,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
  });
}

function paymentToRow(payment) {
  const clean = normalizePaymentRecord(payment);
  return {
    id: clean.id,
    player_id: clean.playerId,
    amount: clean.amount,
    paid_at: clean.paidAt,
    note: clean.note || "",
    created_by: clean.createdBy || currentSession?.user?.id || null,
    ...activeGroupColumn(),
    updated_at: new Date().toISOString(),
  };
}

function normalizeAttendanceOverrideRecord(record) {
  if (!record || typeof record !== "object") return null;
  const gameId = record.gameId || record.game_id;
  const playerId = record.playerId || record.player_id;
  if (!gameId || !playerId) return null;
  return {
    id: String(record.id || attendanceOverrideId(gameId, playerId)),
    gameId: String(gameId),
    playerId: String(playerId),
    attended: Boolean(record.attended),
    updatedBy: record.updatedBy || record.updated_by || null,
    updatedAt: record.updatedAt || record.updated_at || new Date().toISOString(),
  };
}

function attendanceOverrideFromRow(row) {
  return normalizeAttendanceOverrideRecord({
    id: row.id,
    gameId: row.game_id,
    playerId: row.player_id,
    attended: row.attended,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  });
}

function attendanceOverrideToRow(override) {
  const clean = normalizeAttendanceOverrideRecord(override);
  return {
    id: clean.id,
    game_id: clean.gameId,
    player_id: clean.playerId,
    attended: clean.attended,
    updated_by: currentSession?.user?.id || clean.updatedBy || null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeGameFinanceOverrideRecord(record) {
  if (!record || typeof record !== "object") return null;
  const gameId = record.gameId || record.game_id;
  if (!gameId) return null;
  const fieldCost = Number(record.fieldCost ?? record.field_cost ?? PAYMENT_RULES.fieldCostPerGame);
  return {
    id: String(record.id || gameFinanceOverrideId(gameId)),
    gameId: String(gameId),
    fieldPaid: record.fieldPaid ?? record.field_paid ?? true,
    chargePlayers: record.chargePlayers ?? record.charge_players ?? true,
    fieldCost: Number.isNaN(fieldCost) || fieldCost < 0 ? PAYMENT_RULES.fieldCostPerGame : fieldCost,
    updatedBy: record.updatedBy || record.updated_by || null,
    updatedAt: record.updatedAt || record.updated_at || new Date().toISOString(),
  };
}

function gameFinanceOverrideFromRow(row) {
  return normalizeGameFinanceOverrideRecord({
    id: row.id,
    gameId: row.game_id,
    fieldPaid: row.field_paid,
    chargePlayers: row.charge_players,
    fieldCost: row.field_cost,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  });
}

function gameFinanceOverrideToRow(override) {
  const clean = normalizeGameFinanceOverrideRecord(override);
  return {
    id: clean.id,
    game_id: clean.gameId,
    field_paid: clean.fieldPaid,
    charge_players: clean.chargePlayers,
    field_cost: clean.fieldCost,
    updated_by: currentSession?.user?.id || clean.updatedBy || null,
    updated_at: new Date().toISOString(),
  };
}

function normalizeFinanceSettings(record) {
  const base = {
    ...defaultFinanceSettings,
    playerBalances: { ...defaultFinanceSettings.playerBalances },
  };
  if (!record || typeof record !== "object") return base;
  const rawBalances = record.playerBalances || record.player_balances || {};
  const playerBalances = { ...base.playerBalances };
  Object.entries(rawBalances).forEach(([playerId, value]) => {
    const amount = Number(value);
    if (!Number.isNaN(amount)) playerBalances[playerId] = amount;
  });
  return {
    startMonth: String(record.startMonth || record.start_month || base.startMonth),
    cashBalance: Number(record.cashBalance ?? record.cash_balance ?? base.cashBalance) || 0,
    playerBalances,
  };
}

function financeSettingsFromRow(row) {
  return normalizeFinanceSettings({
    startMonth: row.start_month,
    cashBalance: row.cash_balance,
    playerBalances: row.player_balances,
  });
}

function financeSettingsToRow(settings) {
  const clean = normalizeFinanceSettings(settings);
  return {
    id: getFinanceSettingsId(),
    ...activeGroupColumn(),
    start_month: clean.startMonth,
    cash_balance: clean.cashBalance,
    player_balances: clean.playerBalances,
    updated_by: currentSession?.user?.id || null,
    updated_at: new Date().toISOString(),
  };
}

function saveState() {
  state.gameMvpVotes = gameMvpVotes;
  state.gameFeedback = gameFeedback;
  state.featureRollouts = featureRollouts;
  state.payments = payments;
  state.attendanceOverrides = attendanceOverrides;
  state.gameFinanceOverrides = gameFinanceOverrides;
  state.financeSettings = financeSettings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function persistState() {
  saveState();
  if (remoteEnabled && isAdmin) {
    await saveRemoteState();
  }
  updateAccessUi();
}

async function persistMvpVote(vote) {
  saveState();
  if (remoteEnabled && supabaseClient && currentSession?.user) {
    const { error } = await supabaseClient.from("game_mvp_votes").insert(mvpVoteToRow(vote));
    if (error) throw error;
  }
  updateAccessUi();
}

async function saveRemoteState() {
  if (!supabaseClient) return;
  const players = state.players.map(playerToRow);
  const games = state.games.map(gameToRow);
  const events = (state.events || []).map(eventToRow);
  const paymentRows = payments.map(paymentToRow);
  const attendanceOverrideRows = attendanceOverrides.map(attendanceOverrideToRow);
  const gameFinanceOverrideRows = gameFinanceOverrides.map(gameFinanceOverrideToRow);
  const financeSettingsRow = financeSettingsToRow(financeSettings);

  if (players.length) {
    const { error } = await supabaseClient.from("players").upsert(players);
    if (error) throw error;
  }

  if (games.length) {
    const { error } = await supabaseClient.from("games").upsert(games);
    if (error) throw error;
  }

  if (events.length) {
    const { error } = await supabaseClient.from("events").upsert(events);
    if (error) throw error;
  }

  if (paymentRows.length) {
    const { error } = await supabaseClient.from("payments").upsert(paymentRows);
    if (error) throw error;
  }

  if (attendanceOverrideRows.length) {
    const { error } = await supabaseClient.from("attendance_overrides").upsert(attendanceOverrideRows);
    if (error) throw error;
  }

  if (gameFinanceOverrideRows.length) {
    const { error } = await supabaseClient.from("game_finance_overrides").upsert(gameFinanceOverrideRows);
    if (error) {
      const legacyRows = gameFinanceOverrideRows.map(({ field_cost, ...row }) => row);
      const { error: legacyError } = await supabaseClient.from("game_finance_overrides").upsert(legacyRows);
      if (legacyError) throw error;
      console.warn("game_finance_overrides.field_cost is not available yet. Run supabase/schema.sql to persist custom field costs.");
    }
  }

  const { error: financeError } = await supabaseClient.from("finance_settings").upsert(financeSettingsRow);
  if (financeError) throw financeError;
}

function canWriteOfficialData() {
  return !remoteEnabled || isAdmin;
}

function requireAdmin() {
  if (canWriteOfficialData()) return true;
  alert("Modo visitante: podes experimentar fazer equipas e exportar PNG, mas so o admin pode guardar/editar dados.");
  return false;
}

function bindEvents() {
  bindPitchPicker(document.querySelector("#pitch-picker"), els.eventLocation);
  els.tabs.forEach((tab) => on(tab, "click", () => {
    if (tab === els.myProfileTab) {
      const linkedPlayer = getLinkedPlayer();
      if (linkedPlayer) openPlayerProfile(linkedPlayer.id);
      return;
    }
    showView(tab.dataset.view);
  }));

  on(els.playerSearch, "input", renderPlayerList);
  on(els.clearSelection, "click", () => {
    selectedIds.clear();
    renderPlayerList();
  });
  on(els.addGuest, "click", addGuest);
  on(els.gameDate, "input", updatePreviewGameDate);
  on(els.gameDate, "change", updatePreviewGameDate);
  on(els.generateTeams, "click", generateAndRenderSuggestions);
  on(els.shuffleTeams, "click", shuffleTeams);
  on(els.confirmGame, "click", confirmPreviewGame);
  on(els.shareTeams, "click", shareTeamsOnWhatsApp);
  on(els.exportImage, "click", exportCurrentGameImage);
  on(els.finishGame, "click", startFinishingGame);
  on(els.saveScore, "click", saveCurrentScore);
  on(els.addPlayerGameBtn, "click", addSelectedPlayerToGame);
  on(els.playerForm, "submit", savePlayerFromForm);
  [els.formPace, els.formShooting, els.formPassing, els.formDribbling, els.formDefending, els.formPhysical]
    .forEach((input) => on(input, "input", updateOverallFromPartialRatings));
  on(els.formPhoto, "change", handlePhotoSelection);
  on(els.clearPlayerPhoto, "click", clearPendingPhoto);
  on(els.cancelPlayerEdit, "click", clearPlayerForm);
  on(els.exportData, "click", exportData);
  on(els.importData, "change", importData);
  on(els.resetData, "click", resetData);
  on(els.adminLogin, "click", adminLogin);
  on(els.accountSignup, "click", createAccount);
  on(els.adminLogout, "click", adminLogout);
  bindLoginModal();
  bindSignupModal();
  bindNavigation();
  on(els.eventForm, "submit", saveEventFromForm);
  on(els.loadEventGoing, "click", loadCurrentEventGoingPlayers);
  on(els.monthlyMonth, "change", () => { currentMonthlyMonth = els.monthlyMonth.value; renderMonthlyRecap(); });
}

async function initApp() {
  capturePendingInviteFromUrl();
  await initRemote();
  applyLandingRoute();
  render();
  setupNavigationHistory();
}

// ---- Partilhar momentos: link da app com ?momento=<id>, que abre esse pedaco do video ----
const SHARE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4"/></svg>';
let pendingSharedMomentId = new URLSearchParams(window.location.search).get("momento");

function renderMomentShareButton(item) {
  return `<button type="button" class="moment-share" data-moment-share="${escapeHtml(item.id)}" aria-label="Partilhar momento" title="Partilhar">${SHARE_ICON}</button>`;
}

function getMomentShareUrl(item) {
  const url = new URL(window.location.pathname, window.location.origin);
  url.searchParams.set("momento", item.id);
  return url.toString();
}

async function shareMoment(item, button) {
  const game = state.games.find((entry) => entry.id === item.gameId);
  const text = `🔖 ${item.note} (${item.authorName || "Jogador"}${game ? ` · ${getGameTitle(game)}` : ""})`;
  const url = getMomentShareUrl(item);
  if (navigator.share) {
    try {
      await navigator.share({ title: "Footer", text, url });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    button.classList.add("copied");
    button.setAttribute("title", "Link copiado");
    setTimeout(() => {
      button.classList.remove("copied");
      button.setAttribute("title", "Partilhar");
    }, 1800);
  } catch {
    window.prompt("Copia o link do momento:", url);
  }
}

// So abre quando os momentos ja estao carregados (pode ser so depois de entrar na conta).
function openPendingSharedMoment() {
  if (!pendingSharedMomentId) return;
  const item = videoBookmarks.find((entry) => entry.id === pendingSharedMomentId);
  if (!item || !state.games.some((game) => game.id === item.gameId)) return;
  pendingSharedMomentId = null;
  const url = new URL(window.location.href);
  url.searchParams.delete("momento");
  history.replaceState(history.state, "", url.toString());
  galleryMode = "highlights";
  showView("gallery");
  renderGallery();
  openVideoLightbox(item.gameId, { clip: item });
}

// O perfil do proprio jogador e a pagina inicial; convocatorias e jogos novos chegam pelas notificacoes.
function applyLandingRoute() {
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) return;
  currentPlayerProfileId = linkedPlayer.id;
  showView("player-profile", { push: false });
}

async function initRemote() {
  const hasConfig = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  if (!hasConfig || !window.supabase?.createClient) {
    updateAccessUi();
    return;
  }

  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  remoteEnabled = true;
  await loadAccountState();
  await loadRemoteState();
  await refreshPendingInvite();
  updateAccessUi();
}

function getActiveGroup() {
  return myGroups.find((group) => group.id === activeGroupId) || null;
}

function isGroupAdminRole(role) {
  return role === "owner" || role === "admin";
}

// Sem grupo conhecido (modo local ou base sem grupos) o Supabase usa o grupo por defeito.
function activeGroupColumn() {
  return activeGroupId ? { group_id: activeGroupId } : {};
}

function scopeToActiveGroup(query) {
  return activeGroupId ? query.eq("group_id", activeGroupId) : query;
}

// Os Futeboleiros mantem o id antigo "main"; cada outro grupo tem a sua linha.
function getFinanceSettingsId() {
  const group = getActiveGroup();
  return !group || group.slug === LEGACY_GROUP_SLUG ? "main" : `group-${group.id}`;
}

function readActiveGroupId() {
  try {
    return window.localStorage.getItem(`${ACTIVE_GROUP_KEY}:${currentSession?.user?.id}`);
  } catch {
    return null;
  }
}

function writeActiveGroupId(groupId) {
  try {
    window.localStorage.setItem(`${ACTIVE_GROUP_KEY}:${currentSession?.user?.id}`, groupId);
  } catch {
    // Sem armazenamento local: volta ao primeiro grupo na proxima visita.
  }
}

async function loadMyGroups() {
  myGroups = [];
  activeGroupId = null;
  if (!supabaseClient || !currentSession?.user) return false;
  const query = (columns) => supabaseClient
    .from("group_members")
    .select(columns)
    .eq("user_id", currentSession.user.id)
    .order("joined_at", { ascending: true });
  // Sem a migracao group-profile-migration.sql ainda nao existem bio, logo nem favorito.
  let { data, error } = await query("group_id, role, joined_at, is_favorite, groups(id, slug, name, bio, logo, profile_public, default_location)");
  if (error) ({ data, error } = await query("group_id, role, joined_at, groups(id, slug, name)"));
  if (error) {
    console.warn("Group load failed. Run supabase/groups-migration.sql.", error);
    return false;
  }
  myGroups = (data || [])
    .filter((row) => row.groups)
    .map((row) => ({
      id: row.group_id,
      slug: row.groups.slug,
      name: row.groups.name,
      bio: row.groups.bio || "",
      logo: row.groups.logo || "",
      isPublic: row.groups.profile_public !== false,
      defaultLocation: row.groups.default_location || "",
      isFavorite: Boolean(row.is_favorite),
      role: row.role,
    }));
  const savedId = readActiveGroupId();
  activeGroupId = (myGroups.find((group) => group.isFavorite) || myGroups.find((group) => group.id === savedId) || myGroups[0])?.id || null;
  return true;
}

async function loadGroupMemberRoles() {
  groupMemberRoles = new Map();
  if (!supabaseClient || !activeGroupId || !isAdmin) return;
  const { data, error } = await supabaseClient
    .from("group_members")
    .select("user_id, role")
    .eq("group_id", activeGroupId);
  if (error) {
    console.warn("Group members load failed", error);
    return;
  }
  (data || []).forEach((row) => groupMemberRoles.set(row.user_id, row.role));
}

// Com grupos, o papel vem do grupo ativo; sem grupos, do perfil antigo.
function getAccountRole(profile) {
  if (groupMemberRoles.size) return groupMemberRoles.get(profile.id) || "player";
  return profile.role || "player";
}

const ROLE_LABELS = { owner: "dono", admin: "admin", player: "jogador" };

async function switchActiveGroup(groupId) {
  if (groupId === activeGroupId || !myGroups.some((group) => group.id === groupId)) return;
  activeGroupId = groupId;
  writeActiveGroupId(groupId);
  isAdmin = isGroupAdminRole(getActiveGroup()?.role);
  currentInviteCode = null;
  await loadGroupMemberRoles();
  selectedIds.clear();
  previewGame = null;
  currentGameId = null;
  currentHistoryGameId = null;
  currentEventId = null;
  currentSuggestions = [];
  finishingGame = false;
  await loadRemoteState();
  applyLandingRoute();
  render();
  updateAccessUi();
}

async function loadAccountState() {
  currentSession = null;
  currentProfile = null;
  knownProfiles = [];
  playerClaims = [];
  groupsLoadedOk = false;
  currentInviteCode = null;
  isPlatformAdmin = false;
  groupRequests = [];
  myGroups = [];
  activeGroupId = null;
  isAdmin = false;

  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  currentSession = data?.session || null;
  if (!currentSession?.user) return;

  const user = currentSession.user;
  const { data: profiles, error: profilesError } = await supabaseClient
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  if (profilesError) {
    console.warn("Profile load failed", profilesError);
    return;
  }

  const profileRows = profiles || [];
  knownProfiles = profileRows;
  currentProfile = profileRows.find((profile) => profile.id === user.id) || null;
  if (!currentProfile) {
    const role = await hasAnyRemoteProfile(profileRows) ? "player" : "admin";
    const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Jogador";
    const username = normalizeUsername(user.user_metadata?.username || displayName);
    const { data: createdProfile, error } = await supabaseClient
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        username,
        display_name: displayName,
        role,
      })
      .select()
      .single();
    if (error) {
      console.warn("Profile create failed", error);
    } else {
      currentProfile = createdProfile;
      knownProfiles = [...profileRows, createdProfile];
    }
  }

  const groupsLoaded = await loadMyGroups();
  groupsLoadedOk = groupsLoaded;
  isAdmin = groupsLoaded ? isGroupAdminRole(getActiveGroup()?.role) : currentProfile?.role === "admin";
  await loadGroupMemberRoles();
  await loadMyTraits();
  await loadMyAvailability();
  await loadGroupRequests();
  await loadPlayerClaims();
}

async function hasAnyRemoteProfile(visibleProfiles = []) {
  if (!supabaseClient || !currentSession?.user) return visibleProfiles.length > 0;
  const { data, error } = await supabaseClient.rpc("has_any_profile");
  if (error) {
    console.warn("Profile bootstrap check failed", error);
    return true;
  }
  return Boolean(data);
}

async function loadPlayerClaims() {
  if (!currentSession?.user || !supabaseClient) {
    playerClaims = [];
    return;
  }

  const { data, error } = await supabaseClient
    .from("player_claims")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Claims load failed", error);
    playerClaims = [];
    return;
  }
  playerClaims = data || [];
}

async function loadRemoteState() {
  if (!remoteEnabled) return;
  if (!currentSession?.user) {
    eventResponses = [];
    gameMvpVotes = [];
    gameFeedback = [];
    featureRollouts = [];
    privateWeightHistory = [];
    mvpVoteCounts = [];
    updateAccessUi();
    return;
  }

  const [
    { data: players, error: playerError },
    { data: games, error: gameError },
    { data: events, error: eventError },
    { data: responses, error: responseError },
    { data: mvpRows, error: mvpError },
    { data: mvpCountRows, error: mvpCountError },
    { data: feedbackRows, error: feedbackError },
    { data: rolloutRows, error: rolloutError },
    { data: privateMetricRows, error: privateMetricError },
  ] = await Promise.all([
    scopeToActiveGroup(supabaseClient.from("players").select("*")).order("name", { ascending: true }),
    scopeToActiveGroup(supabaseClient.from("games").select("*")).order("date", { ascending: false }),
    scopeToActiveGroup(supabaseClient.from("events").select("*")).order("starts_at", { ascending: true }),
    supabaseClient.from("event_responses").select("*").order("updated_at", { ascending: false }),
    supabaseClient.from("game_mvp_votes").select("*").order("updated_at", { ascending: false }),
    supabaseClient.rpc("mvp_vote_counts"),
    supabaseClient.from("game_feedback").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("feature_rollouts").select("*").eq("key", "postgame_feedback"),
    supabaseClient.from("player_private_metrics").select("*").eq("user_id", currentSession.user.id).order("effective_from", { ascending: false }),
  ]);

  if (playerError || gameError || eventError || responseError) {
    console.warn("Remote load failed", playerError || gameError || eventError || responseError);
    remoteEnabled = false;
    updateAccessUi("Supabase indisponivel, modo local");
    return;
  }
  if (mvpError) console.warn("MVP vote load failed. Run supabase/schema.sql again.", mvpError);
  if (mvpCountError) console.warn("MVP vote count load failed. Run supabase/schema.sql again.", mvpCountError);
  if (feedbackError) console.warn("Postgame feedback load failed. Run supabase/postgame-feedback-migration.sql.", feedbackError);
  if (rolloutError) console.warn("Postgame rollout load failed. Run supabase/postgame-feedback-migration.sql.", rolloutError);
  if (privateMetricError) console.warn("Private weight load failed. Run supabase/monthly-recap-migration.sql.", privateMetricError);

  let remotePayments = [];
  let remoteAttendanceOverrides = [];
  let remoteGameFinanceOverrides = [];
  // As financas de outro grupo nunca ficam em memoria; sem linha propria, o grupo comeca do zero.
  if (activeGroupId) {
    financeSettings = { startMonth: monthKey(new Date()), cashBalance: 0, playerBalances: {} };
  }
  if (isAdmin) {
    const [
      { data: paymentRows, error: paymentError },
      { data: attendanceRows, error: attendanceError },
      { data: gameFinanceRows, error: gameFinanceError },
      { data: financeRows, error: financeError },
    ] = await Promise.all([
      scopeToActiveGroup(supabaseClient.from("payments").select("*")).order("paid_at", { ascending: false }),
      supabaseClient.from("attendance_overrides").select("*").order("updated_at", { ascending: false }),
      supabaseClient.from("game_finance_overrides").select("*").order("updated_at", { ascending: false }),
      activeGroupId
        ? supabaseClient.from("finance_settings").select("*").eq("group_id", activeGroupId)
        : supabaseClient.from("finance_settings").select("*").eq("id", "main"),
    ]);
    if (paymentError || attendanceError || financeError) {
      console.warn("Finance load failed. Run supabase/schema.sql again.", paymentError || attendanceError || financeError);
    } else {
      remotePayments = paymentRows || [];
      remoteAttendanceOverrides = attendanceRows || [];
      if (financeRows?.[0]) financeSettings = financeSettingsFromRow(financeRows[0]);
    }
    if (gameFinanceError) {
      console.warn("Game finance rules load failed. Run supabase/schema.sql again.", gameFinanceError);
    } else {
      remoteGameFinanceOverrides = gameFinanceRows || [];
    }
  }

  // So na base antiga sem grupos: um grupo novo vazio nunca recebe dados guardados no dispositivo.
  if (!groupsLoadedOk && !players.length && isAdmin && state.players.length) {
    await saveRemoteState();
    updateAccessUi("Online: dados locais publicados");
    return;
  }

  if (!groupsLoadedOk && !players.length && state.players.length) {
    updateAccessUi("Online: sem dados remotos");
    return;
  }

  // As RLS devolvem linhas de todos os grupos da conta; ficam so as do grupo ativo.
  const groupGameIds = new Set((games || []).map((row) => row.id));
  const groupEventIds = new Set((events || []).map((row) => row.id));
  const inGroupGame = (row) => !activeGroupId || groupGameIds.has(row.game_id);
  state = migrateState({
    players: players.map(playerFromRow),
    games: games.map(gameFromRow),
    events: (events || []).map(eventFromRow),
    gameMvpVotes: (mvpRows || []).filter(inGroupGame).map(mvpVoteFromRow).filter(Boolean),
    gameFeedback: (feedbackRows || []).filter(inGroupGame).map(gameFeedbackFromRow).filter(Boolean),
    featureRollouts: (rolloutRows || []).map(normalizeFeatureRolloutRecord).filter(Boolean),
    payments: (remotePayments || []).map(paymentFromRow).filter(Boolean),
    attendanceOverrides: (remoteAttendanceOverrides || []).filter(inGroupGame).map(attendanceOverrideFromRow).filter(Boolean),
    gameFinanceOverrides: (remoteGameFinanceOverrides || []).filter(inGroupGame).map(gameFinanceOverrideFromRow).filter(Boolean),
    financeSettings,
  }, { allowSample: !groupsLoadedOk });
  await repairDuplicatePlayerLinks();
  eventResponses = (responses || [])
    .filter((row) => !activeGroupId || groupEventIds.has(row.event_id))
    .map(responseFromRow);
  gameMvpVotes = state.gameMvpVotes || [];
  gameFeedback = state.gameFeedback || [];
  featureRollouts = state.featureRollouts || [];
  privateWeightHistory = (privateMetricRows || []).map(normalizePrivateMetricRecord).filter(Boolean);
  mvpVoteCounts = (mvpCountRows || []).filter(inGroupGame).map(mvpVoteCountFromRow).filter((row) => row.gameId && row.candidatePlayerId);
  payments = state.payments || [];
  attendanceOverrides = state.attendanceOverrides || [];
  gameFinanceOverrides = state.gameFinanceOverrides || [];
  financeSettings = state.financeSettings || financeSettings;
  currentEventId = getNextEvent()?.id || state.events[0]?.id || null;
  currentGameId = null;
  await loadRemoteTracking();
  await loadRemoteVideos();
  await loadRemoteBookmarks();
  await loadJoinRequests();
  await loadPublicEvents();
  await refreshPendingInvite();
  saveState();
}

function capturePendingInviteFromUrl() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get("convite");
  if (!code) return;
  try {
    window.localStorage.setItem(PENDING_INVITE_KEY, code.trim().toLowerCase());
  } catch {
    // Sem armazenamento local: o convite vale so nesta visita.
    pendingInvite = { code: code.trim().toLowerCase() };
  }
  url.searchParams.delete("convite");
  history.replaceState(history.state, "", url.toString());
}

function readPendingInviteCode() {
  try {
    return window.localStorage.getItem(PENDING_INVITE_KEY) || pendingInvite?.code || null;
  } catch {
    return pendingInvite?.code || null;
  }
}

function clearPendingInvite() {
  pendingInvite = null;
  try {
    window.localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // Nada a limpar.
  }
}

// Mostra o nome do grupo mesmo antes de entrar; com conta, a pessoa confirma e entra.
async function refreshPendingInvite() {
  const code = readPendingInviteCode();
  if (!code || !supabaseClient) {
    pendingInvite = null;
    return;
  }
  const { data, error } = await supabaseClient.rpc("preview_group_invite", { p_code: code });
  if (error) {
    console.warn("Invite preview failed. Run supabase/group-invites-migration.sql.", error);
    pendingInvite = null;
    return;
  }
  const row = data?.[0] || { valid: false };
  if (row.valid && row.already_member) {
    clearPendingInvite();
    return;
  }
  pendingInvite = { code, groupName: row.group_name, valid: Boolean(row.valid) };
}

async function acceptPendingInvite() {
  if (!pendingInvite?.code || !supabaseClient || !currentSession?.user) return;
  const { data: groupId, error } = await supabaseClient.rpc("accept_group_invite", { p_code: pendingInvite.code });
  if (error) {
    alert(String(error.message || "").includes("invite_not_valid")
      ? "Este convite ja nao e valido. Pede um link novo ao admin."
      : `Nao consegui entrar no grupo: ${error.message}`);
    clearPendingInvite();
    render();
    return;
  }
  clearPendingInvite();
  try {
    window.localStorage.setItem(`${ACTIVE_GROUP_KEY}:${currentSession.user.id}`, groupId);
  } catch {
    // Fica no primeiro grupo.
  }
  await loadAccountState();
  await loadRemoteState();
  // A seguir escolhe o seu perfil na lista do grupo ("Qual destes es tu?").
  showView(getLinkedPlayer() ? "player-profile" : "account");
  updateAccessUi();
  render();
}

// Faixa no topo: convite por aceitar, ou conta ainda sem grupo.
function renderGroupBanner() {
  const banner = document.querySelector("#group-banner");
  if (!banner) return;
  let html = "";
  if (pendingInvite && !pendingInvite.valid) {
    html = `
      <div><strong>Este convite ja nao e valido.</strong><p>Pede um link novo ao admin do grupo.</p></div>
      <div class="actions"><button class="ghost-btn" data-invite-dismiss>Fechar</button></div>`;
  } else if (pendingInvite && !currentSession?.user) {
    html = `
      <div><strong>Foste convidado para ${escapeHtml(pendingInvite.groupName || "um grupo")}.</strong><p>Entra ou cria conta para aceitar.</p></div>
      <div class="actions">
        <button class="primary-btn" data-invite-login>Entrar</button>
        <button class="ghost-btn" data-invite-signup>Criar conta</button>
      </div>`;
  } else if (pendingInvite) {
    html = `
      <div><strong>Foste convidado para ${escapeHtml(pendingInvite.groupName || "um grupo")}.</strong><p>Entras como jogador; depois escolhes o teu perfil.</p></div>
      <div class="actions">
        <button class="primary-btn" data-invite-accept>Entrar no grupo</button>
        <button class="ghost-btn" data-invite-dismiss>Agora nao</button>
      </div>`;
  } else if (remoteEnabled && currentSession?.user && groupsLoadedOk && !myGroups.length) {
    html = `
      <div><strong>Ainda nao pertences a nenhum grupo.</strong><p>Pede ao admin do teu grupo o link de convite, ou cria um grupo novo. Entretanto podes ver os jogos publicos.</p></div>
      <div class="actions">
        <button class="ghost-btn" data-open-public-games>Ver jogos publicos</button>
        <button class="ghost-btn" data-open-new-group>Criar um grupo</button>
      </div>`;
  }
  banner.classList.toggle("hidden", !html);
  banner.innerHTML = html;
  banner.querySelector("[data-invite-accept]")?.addEventListener("click", acceptPendingInvite);
  banner.querySelector("[data-open-public-games]")?.addEventListener("click", () => showView("public-games"));
  banner.querySelector("[data-open-new-group]")?.addEventListener("click", () => {
    newGroupFormOpen = true;
    showView("account");
    renderNewGroupPanel();
  });
  banner.querySelector("[data-invite-login]")?.addEventListener("click", openLoginModal);
  banner.querySelector("[data-invite-signup]")?.addEventListener("click", createAccount);
  banner.querySelector("[data-invite-dismiss]")?.addEventListener("click", () => {
    clearPendingInvite();
    renderGroupBanner();
  });
}

// Admin: link de convite do grupo ativo, carregado so quando o admin o pede.
function renderInvitePanel() {
  const panel = document.querySelector("#invite-panel");
  if (!panel) return;
  if (!isAdmin || !activeGroupId || !remoteEnabled) {
    panel.innerHTML = `<div class="empty-state">So admins de um grupo conseguem convidar.</div>`;
    return;
  }
  const link = currentInviteCode ? getInviteLink(currentInviteCode) : "";
  panel.innerHTML = `
    <div class="account-card">
      <p>Partilha o link no grupo do WhatsApp. Quem entrar fica como jogador de ${escapeHtml(getActiveGroup()?.name || "o grupo")} e escolhe o seu perfil; tu aprovas em Pedidos.</p>
      ${link ? `
        <input class="invite-link" type="text" readonly value="${escapeHtml(link)}" aria-label="Link de convite">
        <div class="actions">
          <button class="primary-btn" data-invite-share>Enviar para WhatsApp</button>
          <button class="ghost-btn" data-invite-copy>Copiar</button>
          <button class="ghost-btn" data-invite-renew>Gerar novo link</button>
        </div>
        <p class="hint">Gerar um novo link anula o anterior.</p>
      ` : `<div class="actions"><button class="primary-btn" data-invite-load>Mostrar link de convite</button></div>`}
    </div>
  `;
  panel.querySelector("[data-invite-load]")?.addEventListener("click", () => loadInviteCode(false));
  panel.querySelector("[data-invite-renew]")?.addEventListener("click", () => {
    if (confirm("Gerar um novo link? O link atual deixa de funcionar.")) loadInviteCode(true);
  });
  panel.querySelector("[data-invite-copy]")?.addEventListener("click", async (event) => {
    try {
      await navigator.clipboard.writeText(link);
      event.currentTarget.textContent = "Copiado";
    } catch {
      window.prompt("Copia o link de convite:", link);
    }
  });
  panel.querySelector("[data-invite-share]")?.addEventListener("click", () => {
    const text = `Junta-te a ${getActiveGroup()?.name || "nos"} no Footer: ${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  });
}

async function loadInviteCode(renew) {
  if (!requireAdmin() || !supabaseClient || !activeGroupId) return;
  const { data, error } = await supabaseClient.rpc("get_group_invite", { p_group_id: activeGroupId, p_renew: renew });
  if (error) {
    alert(`Nao consegui obter o link: ${error.message}`);
    return;
  }
  currentInviteCode = data;
  renderInvitePanel();
}

// Conta: pedir um grupo novo (o dono da app aprova).
function renderNewGroupPanel() {
  const panel = document.querySelector("#new-group-panel");
  if (!panel) return;
  if (!remoteEnabled || !currentSession?.user) {
    panel.innerHTML = "";
    return;
  }
  const mine = groupRequests.filter((row) => row.requested_by === currentSession.user.id);
  const pending = mine.find((row) => row.status === "pending");
  const lastDecided = mine.find((row) => row.status === "approved" || row.status === "rejected");
  let body;
  if (pending) {
    body = `
      <p>Pediste o grupo <strong>${escapeHtml(pending.name)}</strong>. Fica ativo quando o dono da app aprovar.</p>
      <div class="actions"><button class="ghost-btn" data-cancel-group-request="${pending.id}">Cancelar pedido</button></div>`;
  } else if (newGroupFormOpen) {
    body = `
      <div class="new-group-form">
        <input data-new-group="name" maxlength="60" placeholder="Nome do grupo">
        <input data-new-group="location" maxlength="80" placeholder="Campo / local">
        <input data-new-group="schedule" maxlength="80" placeholder="Dia e hora habituais (ex.: quartas 21h)">
        <textarea data-new-group="notes" maxlength="300" rows="2" placeholder="Notas (opcional)"></textarea>
      </div>
      <div class="actions">
        <button class="primary-btn" data-submit-new-group>Criar grupo</button>
        <button class="ghost-btn" data-close-new-group>Cancelar</button>
      </div>`;
  } else {
    body = `
      ${lastDecided?.status === "approved" ? `<p class="hint good">O grupo ${escapeHtml(lastDecided.name)} foi aprovado.</p>` : ""}
      ${lastDecided?.status === "rejected" ? `<p class="hint warn">O pedido do grupo ${escapeHtml(lastDecided.name)} nao foi aprovado.</p>` : ""}
      <p>Tens um grupo de amigos que joga com regularidade? Cria um grupo proprio, com convocatorias e perfis privados. Ficas logo como dono e convidas os teus amigos.</p>
      <div class="actions"><button class="ghost-btn" data-open-new-group>Criar um grupo novo</button></div>`;
  }
  panel.innerHTML = `<div class="account-card"><h3>Criar um grupo</h3>${body}</div>`;
  panel.querySelector("[data-open-new-group]")?.addEventListener("click", () => {
    newGroupFormOpen = true;
    renderNewGroupPanel();
  });
  panel.querySelector("[data-close-new-group]")?.addEventListener("click", () => {
    newGroupFormOpen = false;
    renderNewGroupPanel();
  });
  panel.querySelector("[data-submit-new-group]")?.addEventListener("click", submitNewGroup);
  panel.querySelector("[data-cancel-group-request]")?.addEventListener("click", async (event) => {
    if (!confirm("Cancelar o pedido do grupo?")) return;
    await supabaseClient.rpc("cancel_group_request", { p_request_id: event.currentTarget.dataset.cancelGroupRequest });
    await loadGroupRequests();
    renderNewGroupPanel();
    renderGroupRequestsList();
  });
}

// Cria o grupo na hora (sem aprovacao); quem cria fica dono e passa logo para o grupo novo.
async function submitNewGroup() {
  const panel = document.querySelector("#new-group-panel");
  const value = (field) => panel?.querySelector(`[data-new-group="${field}"]`)?.value.trim() || "";
  if (value("name").length < 2) {
    alert("Escreve o nome do grupo.");
    return;
  }
  const { data: groupId, error } = await supabaseClient.rpc("create_group", {
    p_name: value("name"),
    p_location: value("location"),
    p_schedule: value("schedule"),
    p_notes: value("notes"),
  });
  if (error) {
    alert(String(error.message || "").includes("group_limit_reached")
      ? "Ja es dono de 2 grupos. Nao da para criar mais."
      : `Nao consegui criar o grupo: ${error.message}`);
    return;
  }
  newGroupFormOpen = false;
  writeActiveGroupId(groupId);
  await loadAccountState();
  await loadRemoteState();
  await loadGroupRequests();
  updateAccessUi();
  showView("events");
  render();
}

// Dono da app: aprovar ou recusar grupos novos.
function renderGroupRequestsList() {
  const section = document.querySelector("#group-requests-section");
  const list = document.querySelector("#group-requests-list");
  if (!section || !list) return;
  section.classList.toggle("hidden", !isPlatformAdmin);
  if (!isPlatformAdmin) {
    list.innerHTML = "";
    return;
  }
  const pending = groupRequests.filter((row) => row.status === "pending");
  list.innerHTML = pending.length ? pending.map((row) => `
    <div class="join-request-row">
      <div>
        <strong>${escapeHtml(row.name)}</strong> <span class="metric">${escapeHtml(row.requester_name || "Jogador")}</span>
        <p>${escapeHtml([row.location, row.schedule].filter(Boolean).join(" · ") || "Sem local nem horario")}</p>
        ${row.notes ? `<p>${escapeHtml(row.notes)}</p>` : ""}
      </div>
      <div class="roster-actions">
        <button class="mini-btn" data-group-request-decide="${row.id}" data-approve="true">Aprovar</button>
        <button class="mini-btn" data-group-request-decide="${row.id}" data-approve="false">Recusar</button>
      </div>
    </div>
  `).join("") : `<div class="empty-state">Nao ha pedidos de grupos.</div>`;
  list.querySelectorAll("[data-group-request-decide]").forEach((button) => {
    button.addEventListener("click", () => decideGroupRequest(button.dataset.groupRequestDecide, button.dataset.approve === "true"));
  });
}

async function decideGroupRequest(requestId, approve) {
  const row = groupRequests.find((item) => item.id === requestId);
  if (!row || !confirm(`${approve ? "Aprovar" : "Recusar"} o grupo ${row.name}?`)) return;
  const { error } = await supabaseClient.rpc("decide_group_request", { p_request_id: requestId, p_approve: approve });
  if (error) {
    alert(`Nao consegui decidir: ${error.message}`);
    return;
  }
  await loadGroupRequests();
  renderGroupRequestsList();
}

// Admin de um grupo novo: primeiros passos ate ter jogadores e a primeira convocatoria.
function renderOnboardingPanel() {
  const panel = document.querySelector("#onboarding-panel");
  if (!panel) return;
  const group = getActiveGroup();
  const hasPlayers = state.players.length >= 6;
  const hasGame = Boolean((state.events || []).length || state.games.length);
  const show = remoteEnabled && isAdmin && group && group.slug !== LEGACY_GROUP_SLUG && (!hasPlayers || !hasGame);
  panel.classList.toggle("hidden", !show);
  if (!show) {
    panel.innerHTML = "";
    return;
  }
  panel.innerHTML = `
    <div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(group.name)}</p>
        <h2>Primeiros passos</h2>
      </div>
    </div>
    <ol class="onboarding-steps">
      <li class="${hasPlayers ? "done" : ""}">
        <strong>Adicionar jogadores</strong> <span class="metric">${state.players.length} no grupo</span>
        <p class="hint">Um por linha. Podes juntar a nota de 1 a 100 no fim (ex.: "Rui 75"). Sem nota, todos comecam iguais e a forma ajusta com os jogos.</p>
        <textarea data-onboarding-players rows="5" placeholder="Rui 75&#10;Tiago&#10;Andre 68"></textarea>
        <div class="actions"><button class="primary-btn" data-onboarding-add>Adicionar</button></div>
      </li>
      <li>
        <strong>Convidar o grupo</strong>
        <p class="hint">Cada um entra pelo link e escolhe o seu perfil.</p>
        <div class="actions"><button class="ghost-btn" data-onboarding-invite>Ver link de convite</button></div>
      </li>
      <li class="${hasGame ? "done" : ""}">
        <strong>Primeira convocatoria</strong>
        <p class="hint">No separador "Nova convocatoria".</p>
        <div class="actions"><button class="ghost-btn" data-onboarding-event>Criar convocatoria</button></div>
      </li>
    </ol>
  `;
  panel.querySelector("[data-onboarding-add]")?.addEventListener("click", addOnboardingPlayers);
  panel.querySelector("[data-onboarding-invite]")?.addEventListener("click", async () => {
    showView("claims");
    await loadInviteCode(false);
  });
  panel.querySelector("[data-onboarding-event]")?.addEventListener("click", () => showView("new-game"));
}

// "Nome 75" -> nota 75; sem nota usa a media das notas dadas (ou 60 se nenhuma).
function parseOnboardingPlayers(text) {
  const rows = String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = line.match(/^(.*?)[\s\-:]+(\d{1,3})$/);
    const name = (match ? match[1] : line).trim().slice(0, 40);
    const rating = match ? Math.min(100, Math.max(1, Number(match[2]))) : null;
    return { name, rating };
  }).filter((row) => row.name.length >= 2);
  const rated = rows.filter((row) => row.rating != null);
  const fallback = rated.length ? Math.round(rated.reduce((sum, row) => sum + row.rating, 0) / rated.length) : 60;
  return rows.map((row) => ({ name: row.name, rating: row.rating ?? fallback }));
}

async function addOnboardingPlayers() {
  if (!requireAdmin()) return;
  const textarea = document.querySelector("[data-onboarding-players]");
  const existing = new Set(state.players.map((p) => normalizeGuestPlayerName(p.name)));
  const rows = parseOnboardingPlayers(textarea?.value).filter((row) => !existing.has(normalizeGuestPlayerName(row.name)));
  if (!rows.length) {
    alert("Escreve pelo menos um nome novo.");
    return;
  }
  const newPlayers = rows.map((row) => ({
    id: `p-${createUuid()}`,
    name: row.name,
    pace: row.rating, shooting: row.rating, passing: row.rating, dribbling: row.rating, defending: row.rating, physical: row.rating,
    overall: row.rating,
    photoDataUrl: "",
    linkedUserId: null,
    isGuest: false,
    guestScore0To10: row.rating / 10,
  }));
  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("players").insert(newPlayers.map(playerToRow));
    if (error) {
      alert(`Nao consegui adicionar: ${error.message}`);
      return;
    }
  }
  state.players.push(...newPlayers);
  saveState();
  render();
}

function getInviteLink(code) {
  const url = new URL(getShareAppUrl());
  url.search = "";
  url.searchParams.set("convite", code);
  return url.toString();
}

async function loadGroupRequests() {
  isPlatformAdmin = false;
  groupRequests = [];
  if (!supabaseClient || !currentSession?.user) return;
  const { data: platformAdmin, error: platformError } = await supabaseClient.rpc("is_platform_admin");
  if (platformError) {
    console.warn("Platform admin check failed. Run supabase/group-requests-migration.sql.", platformError);
    return;
  }
  isPlatformAdmin = Boolean(platformAdmin);
  const { data, error } = await supabaseClient.from("group_requests").select("*").order("created_at", { ascending: false });
  if (error) {
    console.warn("Group requests load failed", error);
    return;
  }
  groupRequests = data || [];
}

async function loadMyAvailability() {
  myAvailability = [];
  if (!supabaseClient || !currentSession?.user) return;
  const { data, error } = await supabaseClient
    .from("player_availability")
    .select("*")
    .gte("day", toLocalDateKey(new Date()))
    .order("day", { ascending: true });
  if (error) {
    console.warn("Availability load failed. Run supabase/availability-migration.sql.", error);
    return;
  }
  myAvailability = data || [];
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Segunda-feira da semana pedida (0 = esta semana).
function getWeekDays(offset) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    return day;
  });
}

// "Jogos publicos": disponibilidade da semana. Ver tambem list_available_players no Supabase.
function renderAvailabilityPanel() {
  const panel = document.querySelector("#availability-panel");
  if (!panel) return;
  if (!remoteEnabled || !currentSession?.user) {
    panel.innerHTML = "";
    return;
  }
  const days = getWeekDays(availabilityWeekOffset);
  const todayKey = toLocalDateKey(new Date());
  const weekKeys = days.map(toLocalDateKey);
  const weekRows = myAvailability.filter((row) => weekKeys.includes(row.day));
  const selected = new Set(weekRows.map((row) => row.day));
  const from = weekRows[0]?.from_hour ?? 19;
  const to = weekRows[0]?.to_hour ?? 23;
  const hours = (min, max, value) => Array.from({ length: max - min + 1 }, (_, i) => min + i)
    .map((hour) => `<option value="${hour}" ${hour === value ? "selected" : ""}>${hour}h</option>`).join("");
  const hasTraits = Boolean(myTraits?.fitness && myTraits?.position && myTraits?.age_band);
  panel.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Queres jogar?</p>
          <h2>A minha disponibilidade</h2>
        </div>
      </div>
      <div class="availability-body">
        <p class="hint">Diz em que dias e horas podes jogar. Os admins de grupos com vagas veem o teu nome, as tuas caracteristicas e a tua disponibilidade, e podem convidar-te.</p>
        <div class="week-switch">
          <button class="ghost-btn ${availabilityWeekOffset === 0 ? "selected" : ""}" data-avail-week="0">Esta semana</button>
          <button class="ghost-btn ${availabilityWeekOffset === 1 ? "selected" : ""}" data-avail-week="1">Proxima semana</button>
        </div>
        <div class="day-chips">
          ${days.map((day) => {
            const key = toLocalDateKey(day);
            const past = key < todayKey;
            return `<label class="day-chip ${selected.has(key) ? "selected" : ""} ${past ? "disabled" : ""}">
              <input type="checkbox" data-avail-day="${key}" ${selected.has(key) ? "checked" : ""} ${past ? "disabled" : ""}>
              ${WEEKDAY_SHORT[day.getDay()]} ${day.getDate()}
            </label>`;
          }).join("")}
        </div>
        <div class="traits-row">
          <label class="game-date-control"><span>Das</span><select data-avail-from>${hours(7, 23, from)}</select></label>
          <label class="game-date-control"><span>As</span><select data-avail-to>${hours(8, 24, to)}</select></label>
        </div>
        ${hasTraits ? "" : `<p class="hint warn">Preenche tambem as tuas caracteristicas na Conta, para os admins saberem como jogas.</p>`}
        <div class="actions"><button class="primary-btn" data-save-availability>Guardar disponibilidade</button></div>
      </div>
    </section>
  `;
  panel.querySelectorAll("[data-avail-week]").forEach((button) => {
    button.addEventListener("click", () => {
      availabilityWeekOffset = Number(button.dataset.availWeek);
      renderAvailabilityPanel();
    });
  });
  panel.querySelectorAll("[data-avail-day]").forEach((input) => {
    input.addEventListener("change", () => input.closest(".day-chip")?.classList.toggle("selected", input.checked));
  });
  panel.querySelector("[data-save-availability]")?.addEventListener("click", saveMyAvailability);
}

async function saveMyAvailability() {
  if (!supabaseClient || !currentSession?.user) return;
  const panel = document.querySelector("#availability-panel");
  const fromHour = Number(panel?.querySelector("[data-avail-from]")?.value);
  const toHour = Number(panel?.querySelector("[data-avail-to]")?.value);
  if (!(toHour > fromHour)) {
    alert("A hora de fim tem de ser depois da hora de inicio.");
    return;
  }
  const weekKeys = getWeekDays(availabilityWeekOffset).map(toLocalDateKey);
  const todayKey = toLocalDateKey(new Date());
  const days = [...(panel?.querySelectorAll("[data-avail-day]:checked") || [])].map((input) => input.dataset.availDay);
  // A semana e substituida inteira: tira os dias desmarcados e grava os marcados.
  const { error: deleteError } = await supabaseClient
    .from("player_availability")
    .delete()
    .eq("user_id", currentSession.user.id)
    .gte("day", weekKeys[0] < todayKey ? todayKey : weekKeys[0])
    .lte("day", weekKeys[6]);
  if (deleteError) {
    alert(`Nao consegui guardar: ${deleteError.message}`);
    return;
  }
  if (days.length) {
    const rows = days.map((day) => ({ user_id: currentSession.user.id, day, from_hour: fromHour, to_hour: toHour }));
    const { error } = await supabaseClient.from("player_availability").insert(rows);
    if (error) {
      alert(`Nao consegui guardar: ${error.message}`);
      return;
    }
  }
  await loadMyAvailability();
  renderAvailabilityPanel();
}

function readPublicSeen() {
  try {
    return new Set(JSON.parse(window.localStorage.getItem(PUBLIC_SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function markPublicGamesSeen() {
  const seen = readPublicSeen();
  publicEvents.forEach((row) => seen.add(row.event_id));
  try {
    window.localStorage.setItem(PUBLIC_SEEN_KEY, JSON.stringify([...seen].slice(-200)));
  } catch {
    // Sem armazenamento local: a bolinha volta na proxima visita.
  }
  renderGamesTabBadge();
  renderAdminBadges();
}

// Bolinha vermelha em Jogos: pedidos por decidir (admin), convites recebidos e jogos publicos novos.
// Pedidos para jogar nos jogos do grupo (admins) ficam em "Os meus jogos"; convites e jogos novos de outros grupos em "Jogos publicos".
function getGamesAttention() {
  const pendingRequests = isAdmin ? joinRequests.filter((row) => row.status === "pending").length : 0;
  const invites = publicEvents.filter((row) => row.my_status === "invited").length;
  const seen = readPublicSeen();
  const newGames = publicEvents.filter((row) => !row.my_status && !seen.has(row.event_id)).length;
  return { mine: pendingRequests, public: invites + newGames };
}

function getGamesAttentionCount() {
  const attention = getGamesAttention();
  return attention.mine + attention.public;
}

// Numero vermelho em Admin e em Pedidos: perfis por aprovar e (dono da app) grupos pedidos.
function getAdminPendingCount() {
  const claims = isAdmin ? playerClaims.filter((claim) => claim.status === "pending").length : 0;
  const groups = isPlatformAdmin ? groupRequests.filter((row) => row.status === "pending").length : 0;
  return claims + groups;
}

function renderAdminBadges() {
  const count = getAdminPendingCount();
  setBadgeCount("#admin-tab-badge", count);
  setBadgeCount("#claims-subtab-badge", count);
}

function setBadgeCount(selector, count) {
  const badge = document.querySelector(selector);
  if (!badge) return;
  badge.classList.toggle("hidden", !count);
  badge.textContent = count > 9 ? "9+" : String(count || "");
}

function renderGamesTabBadge() {
  const attention = getGamesAttention();
  setBadgeCount("#games-tab-badge", attention.mine + attention.public);
  setBadgeCount("#mygames-subtab-badge", attention.mine);
  setBadgeCount("#public-subtab-badge", attention.public);
}

async function loadMyTraits() {
  myTraits = null;
  if (!supabaseClient || !currentSession?.user) return;
  const { data, error } = await supabaseClient
    .from("player_traits")
    .select("*")
    .eq("user_id", currentSession.user.id);
  if (error) {
    console.warn("Traits load failed. Run supabase/public-games-migration.sql.", error);
    return;
  }
  myTraits = data?.[0] || null;
}

// Pedidos aos jogos publicos do grupo ativo, com as caracteristicas de quem pede (so admins).
async function loadJoinRequests() {
  joinRequests = [];
  requesterTraits = new Map();
  if (!supabaseClient || !currentSession?.user || !isAdmin) return;
  const { data, error } = await supabaseClient
    .from("event_join_requests")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("Join requests load failed. Run supabase/public-games-migration.sql.", error);
    return;
  }
  const groupEventIds = new Set((state.events || []).map((eventData) => eventData.id));
  joinRequests = (data || []).filter((row) => groupEventIds.has(row.event_id));
  const userIds = [...new Set(joinRequests.map((row) => row.user_id))];
  if (!userIds.length) return;
  const { data: traitRows, error: traitError } = await supabaseClient.from("player_traits").select("*").in("user_id", userIds);
  if (traitError) {
    console.warn("Requester traits load failed", traitError);
    return;
  }
  (traitRows || []).forEach((row) => requesterTraits.set(row.user_id, row));
}

async function loadPublicEvents() {
  publicEvents = [];
  if (!supabaseClient || !currentSession?.user) return;
  const { data, error } = await supabaseClient.rpc("list_public_events");
  if (error) {
    console.warn("Public events load failed. Run supabase/public-games-migration.sql.", error);
    return;
  }
  publicEvents = data || [];
}

function getPublicGameErrorMessage(error) {
  const key = Object.keys(PUBLIC_GAME_ERRORS).find((code) => String(error?.message || "").includes(code));
  return key ? PUBLIC_GAME_ERRORS[key] : error?.message || "erro inesperado.";
}

async function repairDuplicatePlayerLinks() {
  if (!remoteEnabled || !supabaseClient || !isAdmin) return;
  const byUser = new Map();
  state.players.forEach((playerData) => {
    if (!playerData.linkedUserId) return;
    const list = byUser.get(playerData.linkedUserId) || [];
    list.push(playerData);
    byUser.set(playerData.linkedUserId, list);
  });

  for (const [userId, linkedPlayers] of byUser.entries()) {
    if (linkedPlayers.length <= 1) continue;
    const approvedClaims = playerClaims
      .filter((claim) => claim.user_id === userId && claim.status === "approved")
      .sort((a, b) => new Date(b.reviewed_at || b.created_at) - new Date(a.reviewed_at || a.created_at));
    const keepId = approvedClaims[0]?.player_id || linkedPlayers.sort((a, b) => a.name.localeCompare(b.name))[0].id;
    state.players = state.players.map((playerData) => ({
      ...playerData,
      linkedUserId: playerData.linkedUserId === userId && playerData.id !== keepId ? null : playerData.linkedUserId,
    }));
    const { error } = await scopeToActiveGroup(supabaseClient
      .from("players")
      .update({ linked_user_id: null, updated_at: new Date().toISOString() })
      .eq("linked_user_id", userId)
      .neq("id", keepId));
    if (error) console.warn("Duplicate link repair failed", error);
  }
}

function updateAccessUi(message) {
  const linkedPlayer = getLinkedPlayer();
  let defaultMode = "Modo local";
  if (remoteEnabled) {
    if (!currentSession) defaultMode = "Online: visitante";
    else if (isAdmin) defaultMode = "Online: admin";
    else if (linkedPlayer) defaultMode = `Online: ${linkedPlayer.name}`;
    else defaultMode = "Online: conta sem perfil";
  }
  const activeGroup = myGroups.length > 1 ? getActiveGroup() : null;
  const mode = message || (activeGroup ? `${activeGroup.name} · ${defaultMode.replace(/^Online: /, "")}` : defaultMode);
  if (els.dataStatus) els.dataStatus.textContent = mode;
  document.body.classList.toggle("visitor-mode", remoteEnabled && !isAdmin);
  document.body.classList.toggle("admin-mode", canWriteOfficialData());
  document.body.classList.toggle("non-admin-mode", !canWriteOfficialData());
  if (els.adminLogin) els.adminLogin.classList.toggle("hidden", Boolean(currentSession));
  if (els.accountSignup) els.accountSignup.classList.toggle("hidden", Boolean(currentSession) || !remoteEnabled);
  if (els.adminLogout) els.adminLogout.classList.toggle("hidden", !currentSession);
  if (els.myProfileTab) els.myProfileTab.classList.toggle("hidden", !linkedPlayer);
  updateAccountMenu();
  renderGroupSwitcher();
}

// So aparece a quem pertence a mais de um grupo.
function renderGroupSwitcher() {
  const switcher = document.querySelector("#group-switcher");
  if (!switcher) return;
  const show = myGroups.length > 1;
  switcher.classList.toggle("hidden", !show);
  if (!show) {
    switcher.innerHTML = "";
    return;
  }
  switcher.innerHTML = `
    <p class="menu-label">Grupo</p>
    ${myGroups.map((group) => `
      <button class="menu-item ${group.id === activeGroupId ? "selected" : ""}" type="button" role="menuitemradio"
        aria-checked="${group.id === activeGroupId}" data-switch-group="${escapeHtml(group.id)}">${escapeHtml(group.name)}</button>
    `).join("")}
  `;
  switcher.querySelectorAll("[data-switch-group]").forEach((button) => {
    button.addEventListener("click", async () => {
      toggleAccountMenu(false);
      await switchActiveGroup(button.dataset.switchGroup);
    });
  });
}

function adminLogin() {
  if (!remoteEnabled || !supabaseClient) {
    alert("Configura primeiro o Supabase em app-config.js.");
    return;
  }
  openLoginModal();
}

// Formulario real (em vez de prompt) para o gestor de passwords do browser poder guardar e preencher.
// Contas lembradas neste dispositivo: so o login e o nome, nunca a password
// (a password fica no gestor de passwords do browser).
const REMEMBERED_LOGINS_KEY = "footer-remembered-logins-v1";
const MAX_REMEMBERED_LOGINS = 5;

function getRememberedLogins() {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMEMBERED_LOGINS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.login === "string") : [];
  } catch (error) {
    return [];
  }
}

function saveRememberedLogins(list) {
  try {
    localStorage.setItem(REMEMBERED_LOGINS_KEY, JSON.stringify(list.slice(0, MAX_REMEMBERED_LOGINS)));
  } catch (error) {
    // Armazenamento indisponivel: o login continua a funcionar sem lembrar contas.
  }
}

function rememberLogin(login) {
  const key = login.toLowerCase();
  const entry = {
    login,
    label: currentProfile?.display_name || currentProfile?.username || login,
    admin: Boolean(isAdmin),
  };
  const others = getRememberedLogins().filter((item) => item.login.toLowerCase() !== key);
  saveRememberedLogins([entry, ...others]);
}

function forgetLogin(login) {
  const key = login.toLowerCase();
  saveRememberedLogins(getRememberedLogins().filter((item) => item.login.toLowerCase() !== key));
  renderRememberedLogins();
}

function renderRememberedLogins() {
  const wrap = document.querySelector("#login-remembered");
  if (!wrap) return;
  const list = getRememberedLogins();
  wrap.classList.toggle("hidden", !list.length);
  wrap.innerHTML = list.length
    ? `<span class="auth-remembered-title">Contas neste dispositivo</span>
      <div class="auth-remembered-list">
        ${list.map((item) => `
          <div class="auth-account">
            <button type="button" class="auth-account-pick" data-pick-login="${escapeHtml(item.login)}">
              <span class="auth-account-avatar">${escapeHtml(initials(item.label))}</span>
              <span class="auth-account-text">
                <strong>${escapeHtml(item.label)}</strong>
                <small>${escapeHtml(item.login)}${item.admin ? " · admin" : ""}</small>
              </span>
            </button>
            <button type="button" class="auth-account-forget" data-forget-login="${escapeHtml(item.login)}" aria-label="Esquecer ${escapeHtml(item.label)}">&times;</button>
          </div>`).join("")}
      </div>`
    : "";
  wrap.querySelectorAll("[data-pick-login]").forEach((button) => on(button, "click", () => {
    const user = document.querySelector("#login-user");
    const password = document.querySelector("#login-password");
    if (user) user.value = button.dataset.pickLogin;
    if (password) password.value = "";
    wrap.querySelectorAll(".auth-account").forEach((row) => row.classList.toggle("selected", row.contains(button)));
    password?.focus();
  }));
  wrap.querySelectorAll("[data-forget-login]").forEach((button) => on(button, "click", () => forgetLogin(button.dataset.forgetLogin)));
}

function openLoginModal() {
  const modal = document.querySelector("#login-modal");
  if (!modal) return;
  setLoginError("");
  renderRememberedLogins();
  modal.classList.remove("hidden");
  document.body.classList.add("mvp-gate-open");
  const user = document.querySelector("#login-user");
  const password = document.querySelector("#login-password");
  (user?.value ? password : user)?.focus();
}

function closeLoginModal() {
  const modal = document.querySelector("#login-modal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  document.body.classList.remove("mvp-gate-open");
  const password = document.querySelector("#login-password");
  if (password) password.value = "";
}

function setLoginError(message) {
  const error = document.querySelector("#login-error");
  if (!error) return;
  error.textContent = message;
  error.classList.toggle("hidden", !message);
}

async function submitLoginForm(event) {
  event.preventDefault();
  const submit = document.querySelector("#login-submit");
  const login = document.querySelector("#login-user")?.value.trim() || "";
  const password = document.querySelector("#login-password")?.value || "";
  if (!login || !password) {
    setLoginError("Preenche o email ou username e a password.");
    return;
  }
  setLoginError("");
  if (submit) {
    submit.disabled = true;
    submit.textContent = "A entrar...";
  }
  try {
    const email = await resolveLoginEmail(login);
    if (!email) {
      setLoginError("Nao encontrei esse email ou username.");
      return;
    }
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(`Login falhou: ${formatAuthError(error)}`);
      return;
    }
    closeLoginModal();
    await loadAccountState();
    if (document.querySelector("#login-remember")?.checked) {
      rememberLogin(login);
    } else {
      forgetLogin(login);
    }
    await loadRemoteState();
    updateAccessUi();
    render();
  } finally {
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  }
}

function bindLoginModal() {
  on(document.querySelector("#login-form"), "submit", submitLoginForm);
  document.querySelectorAll("[data-close-login]").forEach((el) => on(el, "click", closeLoginModal));
  on(document.querySelector("#login-forgot"), "click", () => {
    const login = document.querySelector("#login-user")?.value.trim() || "";
    closeLoginModal();
    requestPasswordReset(login);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLoginModal();
  });
}

function createAccount() {
  if (!remoteEnabled || !supabaseClient) {
    alert("Configura primeiro o Supabase em app-config.js.");
    return;
  }
  if (authActionBusy) return;
  closeLoginModal();
  const modal = document.querySelector("#signup-modal");
  if (!modal) return;
  setSignupMessage("");
  modal.classList.remove("hidden");
  document.body.classList.add("mvp-gate-open");
  document.querySelector("#signup-name")?.focus();
}

function closeSignupModal() {
  const modal = document.querySelector("#signup-modal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  document.body.classList.remove("mvp-gate-open");
  const password = document.querySelector("#signup-password");
  if (password) password.value = "";
}

function setSignupMessage(message, tone = "error") {
  const box = document.querySelector("#signup-message");
  if (!box) return;
  box.textContent = message;
  box.classList.toggle("hidden", !message);
  box.classList.toggle("auth-success", tone === "success");
}

async function submitSignupForm(event) {
  event.preventDefault();
  if (authActionBusy) return;
  const submit = document.querySelector("#signup-submit");
  const email = document.querySelector("#signup-email")?.value.trim() || "";
  const usernameInput = document.querySelector("#signup-username");
  const username = normalizeUsername(usernameInput?.value || email.split("@")[0] || "");
  const password = document.querySelector("#signup-password")?.value || "";
  const displayName = document.querySelector("#signup-name")?.value.trim() || email.split("@")[0];
  if (!email || !password) {
    setSignupMessage("Preenche o email e a password.");
    return;
  }
  if (!username) {
    setSignupMessage("Escolhe um username valido.");
    usernameInput?.focus();
    return;
  }
  setSignupMessage("");
  setAuthActionBusy(true);
  if (submit) {
    submit.disabled = true;
    submit.textContent = "A criar conta...";
  }
  let data;
  let error;
  try {
    ({ data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName, username } },
    }));
  } finally {
    setAuthActionBusy(false);
    if (submit) {
      submit.disabled = false;
      submit.textContent = "Criar conta";
    }
  }
  if (error) {
    setSignupMessage(`Nao consegui criar conta: ${formatAuthError(error)}`);
    return;
  }
  if (!data.session) {
    setSignupMessage("Conta criada. Confirma o email que te enviamos e depois entra na app.", "success");
    return;
  }
  closeSignupModal();
  await loadAccountState();
  rememberLogin(username);
  await loadRemoteState();
  showView("account");
  updateAccessUi();
  render();
}

function bindSignupModal() {
  on(document.querySelector("#signup-form"), "submit", submitSignupForm);
  document.querySelectorAll("[data-close-signup]").forEach((el) => on(el, "click", closeSignupModal));
  on(document.querySelector("#signup-to-login"), "click", () => {
    closeSignupModal();
    openLoginModal();
  });
  on(document.querySelector("#login-to-signup"), "click", createAccount);
  const email = document.querySelector("#signup-email");
  const username = document.querySelector("#signup-username");
  // Sugere o username a partir do email enquanto o utilizador nao o escrever.
  on(email, "input", () => {
    if (username && !username.dataset.touched) username.value = normalizeUsername(email.value.split("@")[0] || "");
  });
  on(username, "input", () => { username.dataset.touched = "1"; });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSignupModal();
  });
}

async function resolveLoginEmail(login) {
  const clean = String(login || "").trim();
  if (!clean) return "";
  if (clean.includes("@") || !remoteEnabled || !supabaseClient) return clean.toLowerCase();
  const { data, error } = await supabaseClient.rpc("email_for_login", { login_value: clean });
  if (error) {
    console.warn("Login lookup failed", error);
    return "";
  }
  return data || "";
}

async function requestPasswordReset(prefilledLogin) {
  if (!remoteEnabled || !supabaseClient) {
    alert("Configura primeiro o Supabase.");
    return;
  }
  if (authActionBusy) return;
  const login = typeof prefilledLogin === "string" && prefilledLogin
    ? prefilledLogin
    : prompt("Email ou username para recuperar password:");
  if (!login) {
    alert("Escreve o email ou username da conta.");
    return;
  }
  const email = await resolveLoginEmail(login);
  if (!email) {
    alert("Nao encontrei esse email/username.");
    return;
  }
  const redirectTo = window.location.href.split("#")[0].split("?")[0];
  setAuthActionBusy(true);
  let error;
  try {
    ({ error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo }));
  } finally {
    setAuthActionBusy(false);
  }
  if (error) {
    alert(`Nao consegui enviar recuperacao: ${formatAuthError(error)}`);
    return;
  }
  alert("Email de recuperacao enviado.");
}

function setAuthActionBusy(isBusy) {
  authActionBusy = isBusy;
  document.querySelectorAll("#account-signup, [data-account-signup], [data-password-reset]").forEach((button) => {
    button.disabled = isBusy;
    button.classList.toggle("is-busy", isBusy);
  });
}

function formatAuthError(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (message.includes("email rate limit") || message.includes("rate limit exceeded")) {
    return "o limite de emails de confirmacao/recuperacao foi atingido. Tenta novamente mais tarde ou pede ao organizador para configurar o SMTP no Supabase.";
  }
  if (message.includes("error sending confirmation email") || message.includes("error sending recovery email")) {
    return "o Supabase tentou enviar o email, mas o SMTP falhou. Confirma no Supabase se o host, porta, username, API key e sender email do SendGrid estao corretos.";
  }
  if (message.includes("password")) {
    return "confirma se a password tem pelo menos 6 caracteres.";
  }
  if (message.includes("invalid login credentials")) {
    return "email/username ou password incorretos.";
  }
  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "este email ainda nao foi confirmado. Confirma o email recebido ou verifica no Supabase se a confirmacao esta ativa.";
  }
  if (message.includes("invalid email")) {
    return "confirma se o email esta bem escrito.";
  }
  if (message.includes("already registered") || message.includes("already exists")) {
    return "este email ja tem conta. Usa Entrar ou Recuperar password.";
  }
  return error?.message || "erro inesperado do Supabase.";
}

async function changeCurrentPassword() {
  if (!currentSession || !supabaseClient) {
    alert("Entra primeiro.");
    return;
  }
  const password = prompt("Nova password:");
  if (!password) return;
  const { error } = await supabaseClient.auth.updateUser({ password });
  if (error) {
    alert(`Nao consegui mudar password: ${error.message}`);
    return;
  }
  alert("Password alterada.");
}

async function setCurrentUsername() {
  if (!currentSession || !supabaseClient) {
    alert("Entra primeiro.");
    return;
  }
  const username = normalizeUsername(prompt("Novo username:", currentProfile?.username || "") || "");
  if (!username) {
    alert("Escolhe um username valido.");
    return;
  }
  const { data, error } = await supabaseClient
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", currentSession.user.id)
    .select()
    .single();
  if (error) {
    const message = String(error.message || "").toLowerCase().includes("duplicate")
      ? "Esse username ja esta em uso."
      : `Nao consegui guardar username: ${error.message}`;
    alert(message);
    return;
  }
  currentProfile = data;
  knownProfiles = knownProfiles.map((profile) => profile.id === data.id ? data : profile);
  updateAccessUi();
  render();
}

async function unlinkOwnPlayerProfile() {
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) {
    alert("Esta conta nao tem perfil associado.");
    return;
  }
  if (!confirm(`Desassociar a tua conta do perfil ${linkedPlayer.name}?`)) return;
  await unlinkPlayerProfile(linkedPlayer.id);
}

async function adminLogout() {
  if (supabaseClient) await supabaseClient.auth.signOut();
  isAdmin = false;
  currentSession = null;
  currentProfile = null;
  knownProfiles = [];
  playerClaims = [];
  updateAccessUi();
  render();
}

function on(element, eventName, handler) {
  if (element) element.addEventListener(eventName, handler);
}

// Separadores principais agrupam varias vistas. "Jogo" mostra a convocatoria e o gerar na mesma pagina.
const VIEW_GROUPS = {
  "player-profile": "profile",
  events: "game",
  today: "game",
  "public-games": "game",
  "new-game": "game",
  games: "history",
  "history-game": "history",
  "my-games": "history",
  gallery: "gallery",
  club: "stats",
  stats: "stats",
  players: "stats",
  monthly: "stats",
  payments: "admin",
  claims: "admin",
};

function showView(viewName, options = {}) {
  // "O meu mes" vive agora no perfil do proprio jogador, no periodo deste mes.
  const linkedForMonthly = viewName === "monthly" ? getLinkedPlayer() : null;
  if (linkedForMonthly) {
    profilePeriod = `month:${monthKey(new Date())}`;
    openPlayerProfile(linkedForMonthly.id);
    return;
  }
  const group = VIEW_GROUPS[viewName] || viewName;
  if (group !== "game") {
    previewGame = null;
  }
  currentViewName = viewName;
  const visibleViews = [viewName];
  els.tabs.forEach((tab) => tab.classList.toggle("active", VIEW_GROUPS[tab.dataset.view] === group));
  els.views.forEach((view) => view.classList.toggle("active", visibleViews.includes(view.id.replace(/^view-/, ""))));
  document.querySelectorAll(".subtabs").forEach((nav) => nav.classList.toggle("hidden", nav.dataset.group !== group));
  // "Fazer equipas" (today) conta como "Os meus jogos" no mini-separador.
  const activeSubtab = viewName === "today" ? "events" : viewName;
  document.querySelectorAll(".subtab").forEach((button) => button.classList.toggle("active", button.dataset.view === activeSubtab));
  if (viewName === "public-games") markPublicGamesSeen();
  if (viewName === "my-games") loadMyGames();
  if (viewName === "club") renderClubPanel();
  if (viewName === "account") loadDeletedGroups();
  if (viewName === "claims") loadAllGroups();
  if (viewName === "today") {
    // Vindo de "abrir jogo" ou de importar confirmados: leva o utilizador ate as equipas.
    requestAnimationFrame(() => document.querySelector("#generate-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  if (navigationHistoryReady && options.push !== false) {
    pushNavigationState();
  }
}

function toggleAccountMenu(force) {
  const dropdown = document.querySelector("#account-dropdown");
  const button = document.querySelector("#account-menu-btn");
  if (!dropdown || !button) return;
  const open = typeof force === "boolean" ? force : dropdown.classList.contains("hidden");
  dropdown.classList.toggle("hidden", !open);
  button.setAttribute("aria-expanded", String(open));
}

function bindNavigation() {
  document.querySelectorAll(".subtab").forEach((button) => on(button, "click", () => showView(button.dataset.view)));
  on(document.querySelector("#back-to-events"), "click", () => showView("events"));
  on(document.querySelector("#account-menu-btn"), "click", (event) => {
    event.stopPropagation();
    toggleAccountMenu();
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#account-menu")) toggleAccountMenu(false);
    if (!event.target.closest("#notify-menu")) toggleNotifyPanel(false);
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    toggleAccountMenu(false);
    toggleNotifyPanel(false);
  });
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-moment-share]");
    if (!button) return;
    event.stopPropagation();
    const item = videoBookmarks.find((entry) => entry.id === button.dataset.momentShare);
    if (item) shareMoment(item, button);
  });
  on(document.querySelector("#notify-btn"), "click", (event) => {
    event.stopPropagation();
    toggleNotifyPanel();
  });
  document.querySelectorAll("#account-dropdown .menu-item").forEach((item) => on(item, "click", () => toggleAccountMenu(false)));
  document.querySelectorAll("#account-dropdown .menu-item[data-view]").forEach((item) => on(item, "click", () => {
    if (item === els.myProfileTab) {
      const linkedPlayer = getLinkedPlayer();
      if (linkedPlayer) openPlayerProfile(linkedPlayer.id);
      return;
    }
    showView(item.dataset.view);
  }));
  on(document.querySelector("#switch-account"), "click", async () => {
    await adminLogout();
    openLoginModal();
  });
  on(document.querySelector("#toggle-generator"), "click", (event) => {
    const view = document.querySelector("#view-today");
    const open = !view.classList.contains("show-generator");
    view.classList.toggle("show-generator", open);
    event.currentTarget.setAttribute("aria-expanded", String(open));
    event.currentTarget.textContent = open ? "Esconder" : "Experimentar fazer equipas";
  });
  bindVideoLightbox();
}

function updateAccountMenu() {
  const name = document.querySelector("#account-name");
  const avatar = document.querySelector("#account-avatar");
  const linkedPlayer = getLinkedPlayer();
  const label = currentSession
    ? currentProfile?.display_name || linkedPlayer?.name || currentProfile?.username || "Conta"
    : remoteEnabled ? "Entrar" : "Footer";
  if (name) name.textContent = label;
  if (avatar) avatar.textContent = currentSession ? initials(label) : "?";
  document.querySelector("#switch-account")?.classList.toggle("hidden", !currentSession);
}

// ---- Notificacoes no simbolo do Footer (notifications.js) ----
// Vermelho: novidades do grupo (convocatorias, videos, momentos, MVP). Verde: versao nova da app.
// O "visto" fica neste dispositivo; abrir o painel poe os dois contadores a zero.
const NOTIFY_SEEN_KEY = "footer-notifications-seen-v1";
const NOTIFY_ICONS = {
  event: '<circle cx="12" cy="12" r="9"/><path d="M12 7l3.5 2.5-1.3 4h-4.4l-1.3-4z"/>',
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
  moment: '<path d="M7 4h10v16l-5-3.5L7 20z"/>',
  mvp: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  review: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
};

// As novidades sao por grupo (os Futeboleiros mantem a chave antiga); a versao vista e do dispositivo.
function getNotifyFeedKey() {
  const group = getActiveGroup();
  return !group || group.slug === LEGACY_GROUP_SLUG ? NOTIFY_SEEN_KEY : `${NOTIFY_SEEN_KEY}:${group.id}`;
}

function readNotifyStore(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function readNotifySeen() {
  const seen = {
    appVersion: readNotifyStore(NOTIFY_SEEN_KEY).appVersion,
    feedSeenAt: readNotifyStore(getNotifyFeedKey()).feedSeenAt,
  };
  if (!seen.feedSeenAt) {
    seen.feedSeenAt = FooterNotifications.defaultSeenAt();
    writeNotifySeen(seen);
  }
  return seen;
}

function writeNotifySeen(seen) {
  try {
    const feedKey = getNotifyFeedKey();
    const base = readNotifyStore(NOTIFY_SEEN_KEY);
    if (seen.appVersion !== undefined) base.appVersion = seen.appVersion;
    if (feedKey === NOTIFY_SEEN_KEY) {
      base.feedSeenAt = seen.feedSeenAt;
    } else {
      window.localStorage.setItem(feedKey, JSON.stringify({ feedSeenAt: seen.feedSeenAt }));
    }
    window.localStorage.setItem(NOTIFY_SEEN_KEY, JSON.stringify(base));
  } catch {
    // Sem armazenamento local: os contadores voltam a aparecer na proxima visita.
  }
}

function getNotificationFeed() {
  const userId = currentSession?.user?.id || null;
  const items = [];
  (state.events || []).forEach((eventData) => {
    if (eventData.status !== "open" || !eventData.createdAt || (userId && eventData.createdBy === userId)) return;
    items.push({ id: `event:${eventData.id}`, kind: "event", at: eventData.createdAt, eventId: eventData.id,
      text: `Convocatória: ${eventData.title} · ${formatDate(eventData.startsAt)}` });
  });
  state.games.forEach((game) => {
    const firstVideoAt = getGameVideoParts(game.id).map((part) => part.createdAt).filter(Boolean).sort()[0];
    if (firstVideoAt) {
      items.push({ id: `video:${game.id}`, kind: "video", at: firstVideoAt, gameId: game.id, text: `Vídeo novo: ${getGameTitle(game)}` });
    }
    const mvpNames = [...getOfficialMvpIdsForGame(game)].map((id) => findPlayer(id)?.name).filter(Boolean);
    if (mvpNames.length) {
      items.push({ id: `mvp:${game.id}`, kind: "mvp", at: getMvpLockAt(game)?.toISOString(), gameId: game.id,
        text: `MVP: ${mvpNames.join(" e ")} · ${getGameTitle(game)}` });
    }
  });
  const reviewer = getLinkedPlayer();
  const reviewKey = reviewer ? getReadyReviewMonths(reviewer.id)[0] : null;
  if (reviewKey) {
    items.push({ id: `review:${reviewKey}`, kind: "review", at: getMonthReviewStatus(reviewKey).readyAt.toISOString(), monthKey: reviewKey,
      text: `A tua revisão de ${getShortMonthName(reviewKey)} está pronta` });
  }
  const gameIds = new Set(state.games.map((game) => game.id));
  videoBookmarks.forEach((item) => {
    if (!gameIds.has(item.gameId) || (userId && item.createdBy === userId)) return;
    items.push({ id: `moment:${item.id}`, kind: "moment", at: item.createdAt, gameId: item.gameId, bookmarkId: item.id,
      text: `${item.authorName || "Jogador"}: ${item.note}` });
  });
  return FooterNotifications.buildFeed(items);
}

function setNotifyBadge(element, count) {
  if (!element) return;
  element.textContent = count > 9 ? "9+" : String(count);
  element.classList.toggle("hidden", !count);
}

function renderNotifyBadges() {
  const seen = readNotifySeen();
  const feedCount = FooterNotifications.countUnseen(getNotificationFeed(), seen.feedSeenAt);
  const appCount = FooterNotifications.unseenReleases(seen.appVersion).length;
  setNotifyBadge(document.querySelector("#notify-badge"), feedCount);
  setNotifyBadge(document.querySelector("#notify-badge-app"), appCount);
  const button = document.querySelector("#notify-btn");
  if (button) {
    const parts = [feedCount ? `${feedCount} por ver` : "", appCount ? "versão nova da app" : ""].filter(Boolean);
    button.setAttribute("aria-label", parts.length ? `Novidades: ${parts.join(", ")}` : "Novidades");
  }
}

function formatRelativeTime(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ontem" : `há ${days} dias`;
}

function renderNotifyPanel(seen) {
  const panel = document.querySelector("#notify-panel");
  if (!panel) return;
  const feed = getNotificationFeed();
  const seenTime = new Date(seen.feedSeenAt).getTime();
  const releases = FooterNotifications.unseenReleases(seen.appVersion);
  panel.innerHTML = `
    ${releases.map((release) => `
      <section class="notify-release">
        <p class="notify-release-head"><span class="notify-version">v${escapeHtml(release.version)}</span> ${escapeHtml(release.title)}</p>
        <ul>${release.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>`).join("")}
    <p class="notify-heading">Novidades</p>
    ${feed.length ? `
      <div class="notify-list">
        ${feed.map((item) => `
          <button type="button" class="notify-item ${new Date(item.at).getTime() > seenTime ? "is-new" : ""}" data-notify-id="${escapeHtml(item.id)}">
            <svg class="notify-icon notify-icon-${item.kind}" viewBox="0 0 24 24" aria-hidden="true">${NOTIFY_ICONS[item.kind]}</svg>
            <span class="notify-text">${escapeHtml(item.text)}</span>
            <small>${escapeHtml(formatRelativeTime(item.at))}</small>
          </button>`).join("")}
      </div>` : `<p class="notify-empty">Sem novidades por agora.</p>`}
    <p class="notify-footer">Footer v${escapeHtml(FooterNotifications.APP_VERSION)}</p>`;
  panel.querySelectorAll("[data-notify-id]").forEach((button) => on(button, "click", () => {
    const item = feed.find((entry) => entry.id === button.dataset.notifyId);
    toggleNotifyPanel(false);
    if (item) openNotification(item);
  }));
}

function toggleNotifyPanel(force) {
  const panel = document.querySelector("#notify-panel");
  const button = document.querySelector("#notify-btn");
  if (!panel || !button) return;
  const open = typeof force === "boolean" ? force : panel.classList.contains("hidden");
  if (open === !panel.classList.contains("hidden")) return;
  if (open) {
    toggleAccountMenu(false);
    const seen = readNotifySeen();
    // Mostra o que era novo antes de marcar tudo como visto.
    renderNotifyPanel(seen);
    writeNotifySeen({ feedSeenAt: new Date().toISOString(), appVersion: FooterNotifications.APP_VERSION });
    renderNotifyBadges();
  }
  panel.classList.toggle("hidden", !open);
  button.setAttribute("aria-expanded", String(open));
}

function openNotification(item) {
  if (item.kind === "review") {
    toggleNotifyPanel(false);
    const reviewer = getLinkedPlayer();
    if (reviewer) openMonthReview(reviewer.id, item.monthKey);
    return;
  }
  if (item.kind === "event") {
    currentEventId = item.eventId;
    showView("events");
    renderEventsList();
    return;
  }
  if (item.kind === "mvp") {
    currentHistoryGameId = item.gameId;
    currentGameId = null;
    showView("history-game");
    renderHistoryGameDetail();
    return;
  }
  const clip = item.kind === "moment" ? videoBookmarks.find((entry) => entry.id === item.bookmarkId) : null;
  galleryMode = clip ? "highlights" : "games";
  showView("gallery");
  renderGallery();
  openVideoLightbox(item.gameId, clip ? { clip } : {});
}

// ---- Galeria: todos os jogos com video, no mesmo leitor do historico ----
let galleryGameId = null;
let galleryMode = "games";

function getGalleryGames() {
  return state.games
    .filter((game) => getGameVideoParts(game.id).length)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getGalleryHighlights() {
  const gameIds = new Set(state.games.map((game) => game.id));
  return videoBookmarks
    .filter((item) => gameIds.has(item.gameId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderGalleryFilter(gamesCount, highlightsCount) {
  return `
    <div class="gallery-filter" role="group" aria-label="Mostrar">
      <button type="button" class="subtab ${galleryMode === "games" ? "active" : ""}" data-gallery-mode="games" aria-pressed="${galleryMode === "games"}">Jogos <span>${gamesCount}</span></button>
      <button type="button" class="subtab ${galleryMode === "highlights" ? "active" : ""}" data-gallery-mode="highlights" aria-pressed="${galleryMode === "highlights"}">Highlights <span>${highlightsCount}</span></button>
    </div>`;
}

function renderGalleryGames(games) {
  if (!games.length) return `<div class="empty-state">Ainda nao ha videos. Quando o admin juntar o video de um jogo no historico, aparece aqui.</div>`;
  const byMonth = new Map();
  games.forEach((game) => {
    const date = new Date(game.date);
    const key = Number.isNaN(date.getTime()) ? "Sem data" : date.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(game);
  });
  return [...byMonth.entries()].map(([month, monthGames]) => `
    <section class="gallery-month">
      <h3>${escapeHtml(month)}</h3>
      <div class="gallery-grid">
        ${monthGames.map((game) => {
          const parts = getGameVideoParts(game.id);
          const moments = getGameBookmarks(game.id).length;
          return `
            <button type="button" class="gallery-card" data-gallery-game="${escapeHtml(game.id)}">
              <span class="gallery-thumb">
                <img src="https://i.ytimg.com/vi/${encodeURIComponent(parts[0].youtubeId)}/hqdefault.jpg" alt="" loading="lazy">
                <span class="gallery-play" aria-hidden="true"></span>
                ${parts.length > 1 ? `<span class="gallery-parts">${parts.length} partes</span>` : ""}
                ${moments ? `<span class="gallery-moments">🔖 ${moments}</span>` : ""}
              </span>
              <span class="gallery-meta">
                <strong>${escapeHtml(getGameResultText(game))}</strong>
                <small>${escapeHtml(formatDate(game.date))}</small>
                <small class="gallery-title">${escapeHtml(getGameTitle(game))}</small>
              </span>
            </button>`;
        }).join("")}
      </div>
    </section>`).join("");
}

function renderGalleryHighlights(items) {
  if (!items.length) return `<div class="empty-state">Ainda nao ha highlights. Abre um video e carrega em "Marcar momento" quando vires uma jogada boa.</div>`;
  // Agrupados por jogo (mais recente primeiro), cada grupo com o cabecalho do jogo para se perceber de onde sao.
  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.gameId)) groups.set(item.gameId, []);
    groups.get(item.gameId).push(item);
  });
  const games = [...groups.keys()]
    .map((gameId) => state.games.find((entry) => entry.id === gameId))
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return games.map((game) => {
    const moments = groups.get(game.id).sort((a, b) => a.momentS - b.momentS);
    const parts = getGameVideoParts(game.id);
    const date = new Date(game.date);
    const validDate = !Number.isNaN(date.getTime());
    return `
      <section class="highlight-game">
        <button type="button" class="highlight-game-head" data-gallery-game="${escapeHtml(game.id)}" title="Ver o video completo">
          <span class="highlight-game-thumb">
            <img src="https://i.ytimg.com/vi/${encodeURIComponent((parts[0] || moments[0]).youtubeId)}/mqdefault.jpg" alt="" loading="lazy">
          </span>
          <span class="highlight-game-date" aria-hidden="true">
            <b>${validDate ? date.getDate() : "?"}</b>
            <small>${validDate ? date.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "") : ""}</small>
          </span>
          <span class="highlight-game-info">
            <strong>${escapeHtml(getGameResultText(game))}</strong>
            <small>${escapeHtml(formatDate(game.date))} · ${escapeHtml(getGameTitle(game))}</small>
          </span>
          <span class="highlight-game-count">🔖 ${moments.length}</span>
        </button>
        <div class="highlight-moments">
          ${moments.map((item) => `
            <div class="highlight-moment-wrap">
            <button type="button" class="highlight-moment" data-gallery-highlight="${escapeHtml(item.id)}">
              <span class="moment-time">▶ ${escapeHtml(formatVideoClock(item.momentS))}</span>
              <span class="moment-text">
                <strong>${escapeHtml(item.note)}</strong>
                <small>${escapeHtml(item.authorName || "Jogador")} · ${Math.round(item.endS - getClipStart(item))} s</small>
              </span>
            </button>
            ${renderMomentShareButton(item)}
            </div>`).join("")}
        </div>
      </section>`;
  }).join("");
}

function renderGallery() {
  const panel = document.querySelector("#gallery-panel");
  if (!panel) return;
  if (remoteEnabled && !currentSession?.user) {
    panel.innerHTML = `<div class="empty-state">Entra na tua conta para veres os videos do grupo.</div>`;
    return;
  }
  const games = getGalleryGames();
  const highlights = getGalleryHighlights();
  panel.innerHTML = `
    ${renderGalleryFilter(games.length, highlights.length)}
    ${galleryMode === "highlights" ? renderGalleryHighlights(highlights) : renderGalleryGames(games)}`;
  panel.querySelectorAll("[data-gallery-mode]").forEach((button) => on(button, "click", () => {
    galleryMode = button.dataset.galleryMode;
    renderGallery();
  }));
  panel.querySelectorAll("[data-gallery-game]").forEach((button) => on(button, "click", () => openVideoLightbox(button.dataset.galleryGame)));
  panel.querySelectorAll("[data-gallery-highlight]").forEach((button) => on(button, "click", () => {
    const item = videoBookmarks.find((entry) => entry.id === button.dataset.galleryHighlight);
    if (item) openVideoLightbox(item.gameId, { clip: item });
  }));
}

function getLightboxFrame() {
  return document.querySelector("#video-lightbox-frame iframe");
}

function playLightboxPart(index, youtubeId, start = 0, end = null) {
  const holder = document.querySelector("#video-lightbox-frame");
  if (!holder) return;
  holder.innerHTML = `<iframe src="${gameVideoEmbedUrl(youtubeId, start, true, end)}" data-youtube-id="${escapeHtml(youtubeId)}" title="Video do jogo"
    referrerpolicy="strict-origin-when-cross-origin" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  listenToVideoClock(getLightboxFrame());
  document.querySelectorAll("#video-lightbox-parts [data-lightbox-part]").forEach((button) => {
    const active = Number(button.dataset.lightboxIndex) === index;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function playLightboxClip(game, item) {
  const parts = getGameVideoParts(game.id);
  const index = Math.max(0, parts.findIndex((part) => part.youtubeId === item.youtubeId));
  playLightboxPart(index, item.youtubeId, getClipStart(item), item.endS);
}

function openVideoLightbox(gameId, options = {}) {
  const game = state.games.find((item) => item.id === gameId);
  const parts = game ? getGameVideoParts(game.id) : [];
  const modal = document.querySelector("#video-lightbox");
  if (!game || !parts.length || !modal) return;
  galleryGameId = game.id;
  document.querySelector("#video-lightbox-eyebrow").textContent = `${formatDate(game.date)} · ${getGameTitle(game)}`;
  document.querySelector("#video-lightbox-title").textContent = options.clip ? options.clip.note : getGameResultText(game);
  const partsNav = document.querySelector("#video-lightbox-parts");
  partsNav.classList.toggle("hidden", parts.length < 2);
  partsNav.innerHTML = parts.map((part, index) => `
    <button type="button" data-lightbox-index="${index}" data-lightbox-part="${escapeHtml(part.youtubeId)}" data-lightbox-start="${part.videoStartS || 0}" aria-pressed="false">${escapeHtml(part.label || `Parte ${index + 1}`)}</button>`).join("");
  partsNav.querySelectorAll("[data-lightbox-part]").forEach((button) => on(button, "click", () => {
    playLightboxPart(Number(button.dataset.lightboxIndex), button.dataset.lightboxPart, Number(button.dataset.lightboxStart) || 0);
  }));
  if (options.clip) playLightboxClip(game, options.clip);
  else playLightboxPart(0, parts[0].youtubeId, parts[0].videoStartS || 0);
  const stageControls = document.querySelector("#video-lightbox-stage-controls");
  if (stageControls) {
    stageControls.innerHTML = renderStageControls();
    bindVideoStage(document.querySelector("#video-lightbox-stage"));
  }
  const playLightboxMoment = (item) => {
    document.querySelector("#video-lightbox-title").textContent = item.note;
    playLightboxClip(game, item);
  };
  const moments = document.querySelector("#video-lightbox-moments");
  if (moments) {
    moments.innerHTML = renderMomentsBlock(game);
    bindMomentsBlock(moments, game, { getFrame: getLightboxFrame, playClip: playLightboxMoment });
  }
  attachMomentTracker(document.querySelector("#video-lightbox-stage"), game, { getFrame: getLightboxFrame, playClip: playLightboxMoment });
  modal.classList.remove("hidden");
  document.body.classList.add("mvp-gate-open");
}

function closeVideoLightbox() {
  const modal = document.querySelector("#video-lightbox");
  if (!modal || modal.classList.contains("hidden")) return;
  exitStageFullscreen(document.querySelector("#video-lightbox-stage"));
  modal.classList.add("hidden");
  document.body.classList.remove("mvp-gate-open");
  // Remove o iframe para o video parar.
  const frame = document.querySelector("#video-lightbox-frame");
  if (frame) frame.innerHTML = "";
}

function bindVideoLightbox() {
  document.querySelectorAll("[data-close-video]").forEach((el) => on(el, "click", closeVideoLightbox));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeVideoLightbox();
  });
  on(document.querySelector("#video-lightbox-open-game"), "click", () => {
    const game = state.games.find((item) => item.id === galleryGameId);
    closeVideoLightbox();
    if (!game) return;
    if (isFinishedGame(game)) {
      currentHistoryGameId = game.id;
      currentGameId = null;
      showView("history-game");
      renderHistoryGameDetail();
      return;
    }
    currentGameId = game.id;
    currentHistoryGameId = null;
    showView("today");
    renderCurrentGame();
  });
}

function setupNavigationHistory() {
  if (navigationHistoryReady || !window.history?.pushState) return;
  navigationHistoryReady = true;
  history.replaceState({ footerExitGuard: true }, "", location.href);
  history.pushState(captureNavigationState(), "", location.href);
  window.addEventListener("popstate", handleNavigationPopState);
}

function captureNavigationState() {
  return {
    footerApp: true,
    viewName: currentViewName,
    currentPlayerProfileId,
    currentGameId,
    currentHistoryGameId,
  };
}

function pushNavigationState() {
  history.pushState(captureNavigationState(), "", location.href);
}

function handleNavigationPopState(event) {
  if (event.state?.footerExitGuard) {
    if (confirm("Queres sair do Footer?")) {
      history.back();
    } else {
      history.pushState(captureNavigationState(), "", location.href);
    }
    return;
  }

  if (!event.state?.footerApp) {
    if (!confirm("Queres sair do Footer?")) {
      history.pushState(captureNavigationState(), "", location.href);
    }
    return;
  }

  currentPlayerProfileId = event.state.currentPlayerProfileId || currentPlayerProfileId;
  currentGameId = event.state.currentGameId || null;
  currentHistoryGameId = event.state.currentHistoryGameId || null;
  showView(event.state.viewName || "events", { push: false });
  render();
}

function render() {
  ensureGameDateInput();
  renderPlayerList();
  renderPlayersTable();
  renderCurrentGame();
  renderGamesList();
  renderHistoryGameDetail();
  renderClubTab();
  prefillEventLocation();
  renderGallery();
  renderAccountPanel();
  renderClaimsList();
  renderAccountsList();
  renderPaymentsPanel();
  renderStatsPanel();
  renderMonthlyRecap();
  renderEventsList();
  renderPublicGames();
  renderAvailabilityPanel();
  renderGamesTabBadge();
  renderAdminBadges();
  renderTraitsPanel();
  renderGroupBanner();
  renderInvitePanel();
  renderNewGroupPanel();
  renderGroupRequestsList();
  renderOnboardingPanel();
  renderPlayerProfile();
  renderMvpVoteGate();
  renderNotifyBadges();
  openPendingSharedMoment();
}

function getLinkedPlayer() {
  if (!currentSession?.user) return null;
  return [...state.players]
    .filter((playerData) => playerData.linkedUserId === currentSession.user.id)
    .sort((a, b) => a.name.localeCompare(b.name))[0] || null;
}

function getMyPendingClaim() {
  if (!currentSession?.user) return null;
  return playerClaims.find((claim) => claim.user_id === currentSession.user.id && claim.status === "pending") || null;
}

function renderAccountPanel() {
  if (!els.accountPanel) return;
  if (!remoteEnabled) {
    els.accountPanel.innerHTML = `<div class="empty-state">Configura o Supabase para usar contas e perfis.</div>`;
    return;
  }

  if (!currentSession?.user) {
    els.accountPanel.innerHTML = `
      <div class="account-card">
        <h3>Entra ou cria conta</h3>
        <p>Depois de entrares, podes associar a tua conta ao perfil de jogador que ja existe na base.</p>
        <div class="actions">
          <button class="primary-btn" data-account-login>Entrar</button>
          <button class="ghost-btn" data-account-signup>Criar conta</button>
          <button class="ghost-btn" data-password-reset>Recuperar password</button>
        </div>
      </div>
    `;
    bindAccountPanelActions();
    return;
  }

  const user = currentSession.user;
  const linkedPlayer = getLinkedPlayer();
  const pendingClaim = getMyPendingClaim();
  const availablePlayers = state.players
    .filter((p) => !p.linkedUserId)
    .sort((a, b) => a.name.localeCompare(b.name));

  if (linkedPlayer) {
    const form = getPlayerForm(linkedPlayer);
    els.accountPanel.innerHTML = `
      <div class="account-card good-card">
        <div>
          <p class="eyebrow">${isAdmin ? "Admin" : "Jogador"}</p>
          <h3>${escapeHtml(linkedPlayer.name)}</h3>
          <p>${escapeHtml(user.email || "")}</p>
          <p>Username: <strong>${escapeHtml(currentProfile?.username || "por definir")}</strong></p>
        </div>
        <div class="profile-summary">
          ${renderAvatar(linkedPlayer)}
          <strong>${canSeeCurrentRatings() ? form.currentRating : linkedPlayer.overall}</strong>
          <span>${canSeeCurrentRatings() ? renderFormChip(form) : renderFormSign(form)}</span>
        </div>
        <div class="actions">
          <label class="file-btn">
            Alterar foto
            <input data-own-player-photo type="file" accept="image/*">
          </label>
        </div>
        ${renderSecurityActions()}
      </div>
    `;
    els.accountPanel.querySelector("[data-own-player-photo]")?.addEventListener("change", handleOwnPlayerPhotoSelection);
    bindAccountPanelActions();
    return;
  }

  if (pendingClaim) {
    const playerData = findPlayer(pendingClaim.player_id);
    els.accountPanel.innerHTML = `
      <div class="account-card warn-card">
        <h3>Pedido pendente</h3>
        <p>Pediste para associar esta conta ao perfil ${escapeHtml(playerData?.name || "selecionado")}. Aguarda aprovacao do admin.</p>
        ${renderSecurityActions()}
      </div>
    `;
    bindAccountPanelActions();
    return;
  }

  els.accountPanel.innerHTML = `
    <div class="account-card">
      <h3>Qual destes es tu?</h3>
      <p>Escolhe o teu perfil${getActiveGroup() ? ` em ${escapeHtml(getActiveGroup().name)}` : ""}. O admin aprova antes de ficares ligado.</p>
      ${renderSecurityActions()}
      <div class="claim-grid">
        ${availablePlayers.map((p) => `
          <button class="claim-card" data-claim-player="${p.id}">
            ${renderAvatar(p)}
            <span>
              <strong>${escapeHtml(p.name)}</strong>
              <small>OVR ${p.overall}</small>
            </span>
          </button>
        `).join("") || `<div class="hint">Nao ha perfis livres para reclamar.</div>`}
      </div>
      ${activeGroupId ? `
        <div class="create-own-player">
          <strong>Nao estas na lista?</strong>
          <p class="hint">Cria o teu perfil e ficas logo ligado, com uma nota provisoria que o admin acerta depois.</p>
          <div class="add-guest-row">
            <input data-own-player-name maxlength="40" placeholder="O teu nome" value="${escapeHtml(currentProfile?.display_name || "")}">
            <button class="ghost-btn" data-create-own-player>Criar o meu perfil</button>
          </div>
        </div>
      ` : ""}
    </div>
  `;

  els.accountPanel.querySelectorAll("[data-claim-player]").forEach((button) => {
    button.addEventListener("click", () => requestPlayerClaim(button.dataset.claimPlayer));
  });
  els.accountPanel.querySelector("[data-create-own-player]")?.addEventListener("click", createOwnPlayer);
  bindAccountPanelActions();
}

// Membro novo que nao esta na lista: cria a ficha e fica logo ligado (o admin acerta a nota depois).
async function createOwnPlayer() {
  if (!supabaseClient || !currentSession?.user || !activeGroupId) return;
  const name = els.accountPanel?.querySelector("[data-own-player-name]")?.value.trim() || "";
  if (name.length < 2) {
    alert("Escreve o teu nome.");
    return;
  }
  const { error } = await supabaseClient.rpc("create_own_player", { p_group_id: activeGroupId, p_name: name });
  if (error) {
    const message = String(error.message || "");
    alert(message.includes("claim_pending")
      ? "Ja tens um pedido pendente. Espera pela aprovacao do admin."
      : message.includes("already_linked")
        ? "Ja tens um perfil neste grupo."
        : `Nao consegui criar o perfil: ${message}`);
    return;
  }
  await loadAccountState();
  await loadRemoteState();
  showView(getLinkedPlayer() ? "player-profile" : "account");
  render();
}

function renderSecurityActions() {
  return `
    <div class="actions account-actions">
      <button class="ghost-btn" data-set-username>Definir username</button>
      <button class="ghost-btn" data-change-password>Mudar password</button>
      <button class="danger-btn" data-unlink-own-player>Desassociar perfil</button>
    </div>
  `;
}

async function handleOwnPlayerPhotoSelection(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) {
    alert("Esta conta nao tem perfil de jogador associado.");
    return;
  }
  try {
    const photoDataUrl = await resizePhoto(file);
    await updateOwnPlayerPhoto(linkedPlayer.id, photoDataUrl);
  } catch (error) {
    alert(`Nao consegui atualizar a foto: ${error.message}`);
  } finally {
    event.target.value = "";
  }
}

async function updateOwnPlayerPhoto(playerId, photoDataUrl) {
  const playerIndex = state.players.findIndex((playerData) => playerData.id === playerId);
  if (playerIndex < 0) return;
  const updatedPlayer = { ...state.players[playerIndex], photoDataUrl };
  state.players[playerIndex] = updatedPlayer;
  saveState();

  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient
      .from("players")
      .update({
        photo_data_url: photoDataUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);
    if (error) throw error;
  }

  render();
}

function openPlayerProfile(playerId) {
  const playerData = findPlayer(playerId);
  if (!playerData) return;
  currentPlayerProfileId = playerId;
  showView("player-profile");
  renderPlayerProfile();
}

function renderPlayerProfile() {
  if (!els.playerProfile) return;
  const playerData = currentPlayerProfileId ? findPlayer(currentPlayerProfileId) : null;
  if (!playerData) {
    els.playerProfile.innerHTML = `
      <div class="empty-state">Escolhe um jogador na convocatoria, no gerador ou na lista de jogadores.</div>
    `;
    return;
  }
  const summary = getPlayerMatchSummary(playerData.id);
  const finishedGames = summary.games.filter((item) => item.outcome !== "open").length;
  const winRate = finishedGames ? Math.round((summary.wins / finishedGames) * 100) : 0;
  const form = getPlayerForm(playerData);
  const synergies = getPlayerSynergies(playerData.id);
  const variant = getPlayerCardVariant(playerData, form);
  const teamRecentItems = getPlayerTeamRecord(playerData.id, PROFILE_HISTORY_LIMIT);
  const teamRecentRecord = teamRecentItems.map((item) => item.outcome);
  const playerRecentItems = getPlayerAppearanceRecord(playerData.id, PROFILE_HISTORY_LIMIT);
  const playerRecentRecord = playerRecentItems.map((item) => item.outcome);
  const awardAudit = getPlayerWinAwardAudit(playerData.id);
  const awards = getPlayerAwardShowcase(playerData);

  const months = getProfileMonths(playerData.id);
  if (!profilePeriod || (profilePeriod.startsWith("month:") && !months.includes(profilePeriod.slice(6)))) {
    profilePeriod = months.length ? `month:${months[0]}` : "all";
  }
  const period = getProfilePeriodData(playerData.id, profilePeriod);
  const periodAwards = getPeriodAwards(playerData.id, period.games);
  const isOwnProfile = Boolean(currentSession?.user?.id) && playerData.linkedUserId === currentSession.user.id;

  els.playerProfile.innerHTML = `
    ${renderProfileHero(playerData, form, variant)}
    ${isOwnProfile ? renderMonthReviewCard(playerData) : ""}
    ${renderProfilePeriodNav(months)}
    ${renderProfileSummary(playerData, period, { isOwnProfile })}

    <nav class="pp-tabs" role="tablist" aria-label="Detalhes do jogador">
      ${[["games", "Jogo a jogo"], ["cards", "Cartas"], ["history", "Histórico"], ["people", "Com quem"]].map(([key, label]) => `
        <button type="button" class="subtab ${profileTab === key ? "active" : ""}" role="tab" aria-selected="${profileTab === key}" data-profile-tab="${key}">${label}</button>`).join("")}
    </nav>

    <div class="pp-tab-panel" data-profile-panel="games" ${profileTab === "games" ? "" : "hidden"}>
      ${renderProfileGameList(playerData, period)}
    </div>

    <div class="pp-tab-panel" data-profile-panel="history" ${profileTab === "history" ? "" : "hidden"}>
    <section class="profile-section">
      <h3>Historico</h3>
      ${renderHistorySummaryCard(summary, winRate)}
      <div class="recent-summary-grid">
        ${renderSummaryCard("Ult. 20 equipa", renderRecordDots(teamRecentRecord, { chronological: true, wrap: true }))}
        ${renderSummaryCard("Ult. 20 jogador", renderRecordDots(playerRecentRecord, { chronological: true, wrap: true }))}
      </div>
    </section>

    <section class="profile-section">
      <h3>Ultimos 20 da equipa</h3>
      ${teamRecentItems.length ? `
        <div class="profile-games">
          ${teamRecentItems.map((item) => renderTeamRecentGameRow(item)).join("")}
        </div>
      ` : `<div class="empty-state">Ainda nao ha jogos finalizados.</div>`}
    </section>

    <section class="profile-section">
      <h3>Ultimos 20 jogos do jogador</h3>
      ${playerRecentItems.length ? `
        <div class="profile-games">
          ${playerRecentItems.map((item) => renderPlayerGameRow(item)).join("")}
        </div>
      ` : `<div class="empty-state">Ainda nao ha jogos registados para este jogador.</div>`}
    </section>
    </div>

    <div class="pp-tab-panel" data-profile-panel="cards" ${profileTab === "cards" ? "" : "hidden"}>
    <section class="profile-section">
      <div class="section-title-row">
        <h3>Cartas ${escapeHtml(getProfilePeriodLabel(profilePeriod).toLowerCase())}</h3>
        <span class="unlock-progress">${periodAwards.filter((award) => award.isFirst).length} novas · ${periodAwards.filter((award) => !award.isFirst).length} repetidas</span>
      </div>
      ${periodAwards.length ? `
        <div class="award-grid">
          ${periodAwards.map((award) => renderAwardShowcaseCard(playerData, award)).join("")}
        </div>
      ` : `<div class="empty-state compact">Nenhuma carta neste período.</div>`}
    </section>

    <section class="profile-section">
      <h3>Auditoria de cartas</h3>
      <div class="award-audit-grid">
        <article class="award-audit-card">
          <span>Sequencia atual</span>
          <strong>${awardAudit.currentWinStreak} vitorias</strong>
          <small>Jogos consecutivos da equipa com presenca e vitoria.</small>
        </article>
        <article class="award-audit-card">
          <span>Melhor sequencia valida</span>
          <strong>${awardAudit.bestWinStreak} vitorias</strong>
          <small>Melhor serie historica sem faltas pelo meio.</small>
        </article>
        <article class="award-audit-card">
          <span>Forma por participacoes</span>
          <strong>${awardAudit.bestWinsInFive}/5</strong>
          <small>Melhor janela de 5 jogos em que participou.</small>
        </article>
      </div>
    </section>

    <section class="profile-section">
      <div class="section-title-row">
        <h3>Montra de premios</h3>
        <span class="unlock-progress">${awards.length}/${getTotalAwardCardTypes()} cartas desbloqueadas</span>
      </div>
      ${awards.length ? `
        <div class="award-grid">
          ${awards.map((award) => renderAwardShowcaseCard(playerData, award)).join("")}
        </div>
      ` : `<div class="empty-state compact">Ainda nao ha cartas especiais registadas.</div>`}
    </section>
    </div>

    <div class="pp-tab-panel" data-profile-panel="people" ${profileTab === "people" ? "" : "hidden"}>
    <section class="profile-section">
      <h3>Melhores sinergias</h3>
      ${synergies.length ? `
        <div class="synergy-grid">
          ${synergies.map((item) => renderSynergyCard(item)).join("")}
        </div>
      ` : `<div class="empty-state compact">Ainda nao ha jogos suficientes para medir sinergias.</div>`}
    </section>
    </div>

    ${isOwnProfile ? `
      <section class="profile-section">
        <label class="private-weight">Peso estimado (kg, privado)<input type="number" min="30" max="250" step="0.1" value="${getPlayerWeight(playerData.id)}" data-player-weight><small>Só tu tens acesso. Uma nova medição não altera meses anteriores.</small></label>
      </section>
    ` : ""}
  `;

  els.playerProfile.querySelectorAll("[data-open-player]").forEach((button) => {
    button.addEventListener("click", () => openPlayerProfile(button.dataset.openPlayer));
  });
  els.playerProfile.querySelectorAll("[data-profile-open-game]").forEach((button) => {
    button.addEventListener("click", () => {
      const game = state.games.find((item) => item.id === button.dataset.profileOpenGame);
      if (isFinishedGame(game)) {
        currentHistoryGameId = game.id;
        currentGameId = null;
        showView("history-game");
        renderHistoryGameDetail();
        return;
      }
      currentGameId = game?.id || button.dataset.profileOpenGame;
      currentHistoryGameId = null;
      showView("today");
      renderCurrentGame();
    });
  });
  bindAwardDetailCards(els.playerProfile, playerData, [...awards, ...periodAwards]);
  bindProfileOverview(playerData, period);
  els.playerProfile.querySelector("[data-player-weight]")?.addEventListener("change", async (event) => {
    const value = Number(event.target.value);
    if (value < 30 || value > 250) {
      alert("Indica um peso entre 30 e 250 kg.");
      return;
    }
    event.target.disabled = true;
    await savePrivateWeight(playerData.id, value);
    event.target.disabled = false;
  });
}

// ---- Perfil: periodo, resumo e indicadores (calculos em player-insights.js) ----

const PROFILE_METRIC_NOTES = {
  measured: "Medido pelo tracking de vídeo.",
  preliminary: "Preliminar: ainda por validar contra uma medição de referência.",
  indicative: "Indicativo: uma falha de deteção pode afetar este valor. Não é um recorde validado.",
  detected: "Detetado automaticamente pelo tracking, ainda sem auditoria.",
  estimate: "Estimativa.",
};

function getProfileMonths(playerId) {
  return [...new Set(getFinishedGames().filter((game) => getPlayerParticipation(game, playerId)).map((game) => monthKey(game.date)))].sort().reverse();
}

function getProfilePeriodLabel(period) {
  if (String(period).startsWith("month:")) {
    const key = period.slice(6);
    return key === monthKey(new Date()) ? "Este mês" : formatMonthLabel(key);
  }
  if (period === "3m") return "Últimos 3 meses";
  if (period === "season") {
    const { startYear } = FooterInsights.periodRange("season");
    return `Época ${String(startYear).slice(2)}/${String(startYear + 1).slice(2)}`;
  }
  return "Desde sempre";
}

// Tracking do jogador num jogo: so resultados publicados (rascunhos apenas para admins).
function getProfileTrackingFor(gameId, playerId) {
  const entry = getTrackingEntry(gameId);
  if (!entry?.result?.players || (entry.status === "draft" && !isAdmin)) return null;
  const label = getTrackingLabelFor(entry, playerId);
  const p = label ? entry.result.players.find((item) => item.label === label) : null;
  return p ? { entry, p } : null;
}

function getProfilePeriodData(playerId, period) {
  const range = FooterInsights.periodRange(period);
  const teamGames = getFinishedGames().filter((game) => FooterInsights.inPeriod(game.date, range));
  const games = teamGames.filter((game) => getPlayerParticipation(game, playerId));
  const rows = games.map((game) => {
    const participation = getPlayerParticipation(game, playerId);
    const tracking = getProfileTrackingFor(game.id, playerId);
    return FooterInsights.buildGameRow({
      gameId: game.id,
      date: game.date,
      outcome: getPlayerOutcome(game, participation.side),
      mvp: getOfficialMvpIdsForGame(game).has(playerId),
      tracking: tracking?.p || null,
      metricStatus: tracking?.entry.result.metricStatus || {},
      videoAvailable: getGameVideoParts(game.id).length > 0,
    });
  });
  const summary = FooterInsights.summarize(rows, { teamGames: teamGames.length });
  return { period, range, games, rows, summary, facts: FooterInsights.highlights(rows, summary) };
}

function getPeriodAwards(playerId, games) {
  const alreadySeen = new Set();
  const first = games.length ? games.reduce((min, game) => (new Date(game.date) < new Date(min.date) ? game : min), games[0]) : null;
  if (first) {
    getFinishedGamesAsc().filter((game) => new Date(game.date) < new Date(first.date))
      .forEach((game) => getAwardsUnlockedByGame(playerId, game).forEach((award) => alreadySeen.add(award.key)));
  }
  const awards = [];
  games.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((game) => {
    getAwardsUnlockedByGame(playerId, game).forEach((award) => {
      awards.push({ ...award, gameId: game.id, date: game.date, isFirst: !alreadySeen.has(award.key) });
      alreadySeen.add(award.key);
    });
  });
  return awards;
}

function renderProfileHero(playerData, form, variant) {
  const rating = canSeeCurrentRatings() ? form.currentRating : playerData.overall;
  const lastFive = getPlayerAppearanceRecord(playerData.id, 5).map((item) => item.outcome);
  return `
    <section class="pp-hero">
      <div class="pp-card-col">
        <button type="button" class="pp-card-thumb" data-profile-card aria-label="Ver a carta de ${escapeHtml(playerData.name)}">
          ${renderPlayerCard(playerData, { mode: "field", form, variant })}
        </button>
        ${lastFive.length ? `<span class="pp-last5"><small>Ult. ${lastFive.length}</small>${renderRecordDots(lastFive, { chronological: true })}</span>` : ""}
      </div>
      <div class="pp-identity">
        <p class="eyebrow">Jogador</p>
        <h2>${escapeHtml(playerData.name)}</h2>
        <div class="pp-meta">
          <span class="pp-ovr"><b>${rating}</b> OVR</span>
        </div>
        ${renderClubBadge(getActiveGroup())}
      </div>
    </section>`;
}

function renderProfilePeriodNav(months) {
  const isMonth = String(profilePeriod).startsWith("month:");
  return `
    <div class="pp-periods" role="group" aria-label="Período">
      <label class="pp-month ${isMonth ? "active" : ""}">
        <span class="sr-only">Mês</span>
        <select data-profile-month ${months.length ? "" : "disabled"}>
          ${months.length ? months.map((key) => `<option value="${key}" ${profilePeriod === `month:${key}` ? "selected" : ""}>${escapeHtml(key === monthKey(new Date()) ? "Este mês" : formatMonthLabel(key))}</option>`).join("") : `<option>Sem jogos</option>`}
          ${months.length && !isMonth ? `<option value="" selected hidden>Mês</option>` : ""}
        </select>
      </label>
      ${[["3m", "3 meses"], ["season", "Época"], ["all", "Tudo"]].map(([value, label]) => `
        <button type="button" class="subtab ${profilePeriod === value ? "active" : ""}" data-profile-period="${value}" aria-pressed="${profilePeriod === value}">${label}</button>`).join("")}
    </div>`;
}

// Icones dos numeros do jogador, no traco dos separadores; a cor vem de .stat-icon-<chave> no CSS.
const STAT_ICONS = {
  distance: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
  pace: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  speed: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>',
  sprints: '<path d="m5 6 6 6-6 6M13 6l6 6-6 6"/>',
  passes: '<circle cx="6" cy="17" r="2.5"/><circle cx="18" cy="7" r="2.5"/><path d="M8.5 15.5 15.5 8.5M11 8h5v5"/>',
  games: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16M9 15l2 2 4-4"/>',
  wins: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
  mvp: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  calories: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.8-8.8 2 1.3 2.6 3.3 2.4 5 1.1-.6 2-1.9 2.2-3.4 2.4 2 4.6 4.6 4.6 7.4 0 3.5-2.6 6-6.5 6z"/>',
  energy: '<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M21 10.5v3M11.5 9l-2 3.2h3L10.5 15"/>',
};

function statIcon(key) {
  return STAT_ICONS[key] ? `<svg class="stat-icon stat-icon-${key}" viewBox="0 0 24 24" aria-hidden="true">${STAT_ICONS[key]}</svg>` : "";
}

function renderProfileKpi({ label, icon = "", value, unit, approx = false, games, played, status, context = "", action = "" }) {
  const note = status ? PROFILE_METRIC_NOTES[status] || "" : "";
  return `
    <article class="pp-kpi ${value == null ? "is-empty" : ""}">
      <div class="pp-kpi-top">
        <span class="pp-kpi-label">${statIcon(icon)}${escapeHtml(label)}</span>
        ${note ? `<button type="button" class="pp-kpi-info" data-kpi-info aria-label="Qualidade do valor: ${escapeHtml(FooterInsights.statusText(status) || "")}">ⓘ</button>` : ""}
      </div>
      <strong class="pp-kpi-value">${value == null ? `<span class="pp-kpi-none">sem dados</span>` : `${approx ? "≈" : ""}${value}${unit ? `<small>${unit}</small>` : ""}`}</strong>
      <small class="pp-kpi-cover">${games ? `${games} de ${played} ${played === 1 ? "jogo" : "jogos"}` : "sem jogos analisados"}${context ? ` · ${context}` : ""}</small>
      ${action}
      ${note ? `<p class="pp-kpi-note" hidden>${escapeHtml(note)}</p>` : ""}
    </article>`;
}

function getProfileMomentTarget(gameId, seconds) {
  if (!gameId || seconds == null || !window.FooterTracking) return null;
  return window.FooterTracking.videoSeekTarget(getGameVideoParts(gameId), seconds) || null;
}

function renderProfileSummary(playerData, period, { isOwnProfile }) {
  const s = period.summary;
  if (!s.played) {
    return `<section class="pp-summary"><div class="empty-state compact">Sem jogos ${escapeHtml(getProfilePeriodLabel(profilePeriod).toLowerCase())}.</div></section>`;
  }
  const speedMoment = getProfileMomentTarget(s.maxSpeed.gameId, s.maxSpeed.atS);
  const kpis = [
    renderProfileKpi({ label: "Distância", icon: "distance", value: s.distance.totalM == null ? null : formatTrackingNumber(s.distance.totalM / 1000, 1), unit: "km", games: s.distance.games, played: s.played, status: s.distance.status }),
    renderProfileKpi({
      label: "Ritmo", icon: "pace", value: s.pace.value == null ? null : formatTrackingNumber(s.pace.value), unit: "m/min", games: s.pace.games, played: s.played, status: s.pace.status,
      context: s.pace.goalkeeperMin >= 1 ? `inclui ${formatTrackingNumber(s.pace.goalkeeperMin)} min na baliza` : "",
    }),
    renderProfileKpi({
      label: "Velocidade máx.", icon: "speed", value: s.maxSpeed.value == null ? null : formatTrackingNumber(s.maxSpeed.value, 1), unit: "km/h", approx: true, games: s.maxSpeed.games, played: s.played, status: s.maxSpeed.status,
      action: speedMoment ? `<button type="button" class="pp-kpi-action" data-profile-moment="${escapeHtml(s.maxSpeed.gameId)}" data-profile-moment-at="${s.maxSpeed.atS}">▶ Ver o momento</button>` : "",
    }),
    renderProfileKpi({ label: "Sprints", icon: "sprints", value: s.sprints.total == null ? null : formatTrackingNumber(s.sprints.total), unit: "", games: s.sprints.games, played: s.played, status: s.sprints.status }),
  ];
  return `
    <section class="pp-summary">
      <div class="pp-record">
        <span class="pp-record-item">${statIcon("games")}<b>${s.played}</b>${s.teamGames ? `<i>/${s.teamGames}</i>` : ""} <small>presenças</small></span>
        <span class="pp-record-item pp-wdl">${statIcon("wins")}<b class="win">${s.wins}V</b> <b class="draw">${s.draws}E</b> <b class="loss">${s.losses}D</b></span>
        <span class="pp-record-item">${statIcon("mvp")}<b>${s.mvps}</b> <small>MVP</small></span>
      </div>
      <div class="pp-kpis">${kpis.join("")}</div>
      ${period.facts.length ? `<div class="pp-highlight">${period.facts.map((fact) => `<p>${escapeHtml(fact)}</p>`).join("")}</div>` : ""}
      ${s.trackedGames
        ? `<p class="pp-beta"><span class="tracking-badge">Beta</span> Números do tracking de vídeo, ainda em validação. Toca em ⓘ para ver a qualidade de cada um.</p>`
        : `<p class="pp-beta">Nenhum jogo deste período foi analisado por vídeo.</p>`}
      ${isOwnProfile ? renderProfilePrivateExtras(playerData, period) : ""}
    </section>`;
}

// So para o proprio: usa o peso privado e as respostas pos-jogo.
// Estimativas privadas do jogador (peso e respostas pos-jogo); so aparecem no proprio perfil e na revisao do mes.
function getPeriodEffort(playerData, period) {
  const feedback = period.games.map((game) => gameFeedback.find((item) => item.gameId === game.id && item.playerId === playerData.id)).filter(Boolean);
  const calories = period.games.reduce((sum, game) => {
    const row = period.rows.find((item) => item.gameId === game.id);
    const participation = getPlayerParticipation(game, playerData.id);
    const minutes = row?.minutes ?? FooterMonthly.activeMinutesForSquad(participation ? getGameSidePlayerIds(game, participation.side).length : 5);
    const answer = feedback.find((item) => item.gameId === game.id);
    return sum + FooterMonthly.estimateCalories({ weightKg: getPlayerWeight(playerData.id, game.date), minutes, met: FooterMonthly.metForIntensity(answer?.gameIntensity) });
  }, 0);
  return {
    calories,
    energy: FooterMonthly.average(feedback.map((item) => item.remainingEnergy)),
    intensity: FooterMonthly.average(feedback.map((item) => item.gameIntensity)),
  };
}

function renderProfilePrivateExtras(playerData, period) {
  const { calories, energy } = getPeriodEffort(playerData, period);
  return `
    <div class="pp-extras">
      <span>${statIcon("calories")}≈ ${formatTrackingNumber(calories)} kcal <small>estimativa com o teu peso</small></span>
      <span>${statIcon("energy")}${energy == null ? "Sem respostas" : `${formatTrackingNumber(energy, 1)}/10`} <small>forma física que sentiste</small></span>
    </div>`;
}

function renderProfileGameList(playerData, period) {
  if (!period.games.length) return `<div class="empty-state compact">Sem jogos neste período.</div>`;
  const ordered = period.games.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  return `
    <div class="pp-games">
      ${ordered.map((game) => {
        const row = period.rows.find((item) => item.gameId === game.id);
        const participation = getPlayerParticipation(game, playerData.id);
        const tracking = getProfileTrackingFor(game.id, playerData.id);
        const date = new Date(game.date);
        const outcomeLabel = { win: "V", draw: "E", loss: "D" }[row.outcome] || "–";
        const metric = (value, unit, digits = 0, approx = false, icon = "") => value == null ? "" : `<span>${statIcon(icon)}<b>${approx ? "≈" : ""}${formatTrackingNumber(value, digits)}</b> ${unit}</span>`;
        return `
          <article class="pp-game">
            <div class="pp-game-head">
              <span class="pp-game-date"><b>${date.getDate()}</b><small>${date.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "")}</small></span>
              <div class="pp-game-main">
                <strong>${escapeHtml(getPlayerResultText(game, participation?.side))}</strong>
                <small>${escapeHtml(getGameTitle(game))}</small>
              </div>
              ${row.mvp ? `<span class="pp-mvp">MVP</span>` : ""}
              <span class="pp-outcome ${row.outcome}">${outcomeLabel}</span>
            </div>
            ${row.tracked ? `
              <div class="pp-game-metrics">
                ${row.distanceM == null ? "" : `<span>${statIcon("distance")}<b>${formatTrackingNumber(row.distanceM / 1000, 1)}</b> km</span>`}
                ${metric(row.pace, "m/min", 0, false, "pace")}
                ${metric(row.maxSpeed, "km/h", 1, true, "speed")}
                ${metric(row.sprints, "sprints", 0, false, "sprints")}
                ${metric(row.passes, "passes", 0, false, "passes")}
              </div>` : `<p class="pp-game-none">Sem análise de vídeo</p>`}
            <div class="pp-game-actions">
              <button type="button" class="ghost-btn" data-profile-open-game="${escapeHtml(game.id)}">Abrir jogo</button>
              ${row.videoAvailable ? `<button type="button" class="ghost-btn" data-profile-video="${escapeHtml(game.id)}">▶ Vídeo</button>` : ""}
            </div>
            ${tracking ? `
              <details class="pp-game-detail">
                <summary>Análise completa do jogo</summary>
                ${renderPlayerTrackingBlock(tracking.entry, tracking.p, {})}
              </details>` : ""}
          </article>`;
      }).join("")}
    </div>`;
}

function openProfileCardModal(playerData) {
  document.querySelector(".pp-card-modal")?.remove();
  const form = getPlayerForm(playerData);
  const variant = getPlayerCardVariant(playerData, form);
  const modal = document.createElement("div");
  modal.className = "auth-modal pp-card-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", `Carta de ${playerData.name}`);
  modal.innerHTML = `
    <div class="auth-modal-backdrop" data-close-card></div>
    <div class="pp-card-modal-body">
      <button type="button" class="auth-close" data-close-card aria-label="Fechar">&times;</button>
      ${renderPlayerCard(playerData, { mode: "profile", form, variant })}
      <button type="button" class="primary-btn" data-card-collection>Ver coleção de cartas</button>
    </div>`;
  const close = () => {
    modal.remove();
    document.body.classList.remove("mvp-gate-open");
    window.removeEventListener("keydown", onKey);
  };
  const onKey = (event) => { if (event.key === "Escape") close(); };
  modal.querySelectorAll("[data-close-card]").forEach((el) => el.addEventListener("click", close));
  modal.querySelector("[data-card-collection]").addEventListener("click", () => {
    close();
    profileTab = "cards";
    renderPlayerProfile();
    els.playerProfile.querySelector(".pp-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  window.addEventListener("keydown", onKey);
  document.body.appendChild(modal);
  document.body.classList.add("mvp-gate-open");
  modal.querySelector("[data-card-collection]").focus();
}

function bindProfileOverview(playerData) {
  const root = els.playerProfile;
  root.querySelectorAll("[data-profile-tab]").forEach((button) => button.addEventListener("click", () => {
    profileTab = button.dataset.profileTab;
    root.querySelectorAll("[data-profile-tab]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    root.querySelectorAll("[data-profile-panel]").forEach((panel) => { panel.hidden = panel.dataset.profilePanel !== profileTab; });
  }));
  root.querySelector("[data-profile-month]")?.addEventListener("change", (event) => {
    if (!event.target.value) return;
    profilePeriod = `month:${event.target.value}`;
    renderPlayerProfile();
  });
  root.querySelectorAll("[data-profile-period]").forEach((button) => button.addEventListener("click", () => {
    profilePeriod = button.dataset.profilePeriod;
    renderPlayerProfile();
  }));
  root.querySelectorAll("[data-kpi-info]").forEach((button) => button.addEventListener("click", () => {
    const note = button.closest(".pp-kpi")?.querySelector(".pp-kpi-note");
    if (note) note.hidden = !note.hidden;
  }));
  root.querySelectorAll("[data-profile-moment]").forEach((button) => button.addEventListener("click", () => {
    openSpeedMoment(button.dataset.profileMoment, Number(button.dataset.profileMomentAt));
  }));
  root.querySelectorAll("[data-profile-video]").forEach((button) => button.addEventListener("click", () => openVideoLightbox(button.dataset.profileVideo)));
  root.querySelector("[data-month-review]")?.addEventListener("click", (event) => openMonthReview(playerData.id, event.currentTarget.dataset.monthReview));
  root.querySelector("[data-month-review-pick]")?.addEventListener("change", (event) => {
    if (event.target.value) openMonthReview(playerData.id, event.target.value);
    event.target.value = "";
  });
  root.querySelector("[data-profile-card]")?.addEventListener("click", () => openProfileCardModal(playerData));
}

function renderProfileStat(label, value) {
  return `
    <div class="profile-stat">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderHistorySummaryCard(summary, winRate) {
  return `
    <div class="history-summary-card">
      <div>
        <span>Jogos</span>
        <strong>${summary.appearances}</strong>
      </div>
      <dl>
        <div><dt>V</dt><dd>${summary.wins}</dd></div>
        <div><dt>E</dt><dd>${summary.draws}</dd></div>
        <div><dt>D</dt><dd>${summary.losses}</dd></div>
        <div><dt>Wrate</dt><dd>${winRate}%</dd></div>
      </dl>
    </div>
  `;
}

function renderSummaryCard(label, value) {
  return `
    <div class="summary-card">
      <span>${label}</span>
      <strong>${value}</strong>
    </div>
  `;
}

function renderAwardShowcaseCard(playerData, award) {
  const variant = PLAYER_CARD_VARIANTS[award.key] || PLAYER_CARD_VARIANTS.base;
  const count = FooterMonthly.awardCount(award.count);
  return `
    <article class="award-card" data-award-key="${variant.key}"${award.date ? ` data-award-date="${escapeHtml(award.date)}"` : ""}${count == null ? "" : ` data-award-count="${count}"`} tabindex="0" role="button" aria-label="${escapeHtml(variant.label)}">
      <div class="award-card-preview">
        ${renderPlayerCard(playerData, { mode: "award", variant })}
        ${count == null ? "" : `<span class="award-count">x${count}</span>`}
      </div>
      <strong>${escapeHtml(variant.label)}</strong>
      ${renderAwardContext(playerData.id, award, { compact: true })}
    </article>
  `;
}

function getTotalAwardCardTypes() {
  return Object.keys(PLAYER_CARD_VARIANTS).filter(isShowcaseAwardKey).length;
}

function bindAwardDetailCards(container, playerData, awards) {
  container.querySelectorAll("[data-award-key]").forEach((card) => {
    const openAward = () => {
      const award = awards.find((item) => item.key === card.dataset.awardKey && (!card.dataset.awardDate || item.date === card.dataset.awardDate));
      if (award) showAwardDetail(playerData, award);
    };
    card.addEventListener("click", openAward);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openAward();
      }
    });
  });
}

function showAwardDetail(playerData, award) {
  const variant = PLAYER_CARD_VARIANTS[award.key] || PLAYER_CARD_VARIANTS.base;
  const count = FooterMonthly.awardCount(award.count);
  const existing = document.querySelector(".award-modal");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.className = "award-modal";
  modal.innerHTML = `
    <div class="award-modal-backdrop" data-close-award></div>
    <section class="award-modal-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(variant.label)}">
      <button class="award-modal-close" data-close-award type="button" aria-label="Fechar">x</button>
      <div class="award-modal-card">
        ${renderPlayerCard(playerData, { mode: "profile", variant })}
        ${count == null ? "" : `<span class="award-count award-count-large">x${count}</span>`}
      </div>
      <div class="award-modal-copy">
        <p class="eyebrow">Premio</p>
        <h3>${escapeHtml(variant.label)}</h3>
        <p>${escapeHtml(variant.description || "Carta especial obtida pelo jogador.")}</p>
        ${renderAwardContext(playerData.id, award)}
      </div>
    </section>
  `;
  document.body.appendChild(modal);
  const handleKey = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };
  const close = () => {
    modal.remove();
    window.removeEventListener("keydown", handleKey);
  };
  modal.querySelectorAll("[data-close-award]").forEach((button) => button.addEventListener("click", close));
  window.addEventListener("keydown", handleKey);
}

function getPlayerMonthlyAwardMonths(playerId, key) {
  return getCompletedMonthIds().filter((monthId) => {
    if (key === "mvp_month") return getOfficialMvpWinnersByMonth(monthId).includes(playerId);
    if (key === "ironman_month") {
      const games = state.games.filter((game) => isFinishedGame(game) && getMonthId(game.date) === monthId);
      return games.length >= 2 && games.every((game) => getPlayerParticipation(game, playerId));
    }
    return false;
  }).reverse();
}

function getPlayerAwardContext(playerId, award, game = null) {
  if (award.key === "mvp_month" || award.key === "ironman_month") {
    return { label: "Meses conquistados", periods: getPlayerMonthlyAwardMonths(playerId, award.key).map(formatMonthLabel) };
  }
  const formatAwardDate = (date) => new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date));
  const date = award.date || game?.date;
  if (date) return { label: "Conquistada em", periods: [formatAwardDate(date)] };
  if (["mvp", "mvp_2x", "mvp_3x"].includes(award.key)) {
    let streak = [];
    const periods = [];
    getFinishedGamesAsc().forEach((item) => {
      if (!getOfficialMvpIdsForGame(item).has(playerId)) {
        streak = [];
        return;
      }
      streak.push(item);
      if (award.key === "mvp") periods.push(formatAwardDate(item.date));
      else if (award.key === "mvp_2x" && streak.length === 2) periods.push(`${formatAwardDate(streak[0].date)} – ${formatAwardDate(item.date)}`);
      else if (award.key === "mvp_3x" && streak.length >= 3) periods.push(`${formatAwardDate(streak[0].date)} – ${formatAwardDate(item.date)}`);
    });
    return { label: award.key === "mvp" ? "Jogos MVP" : "Sequências MVP", periods: periods.reverse() };
  }
  if (award.key === "win_1x") {
    const firstWin = getPlayerAppearanceRecord(playerId, Number.MAX_SAFE_INTEGER).reverse().find((item) => item.outcome === "win");
    return { label: "Primeira vitória em", periods: firstWin ? [formatAwardDate(firstWin.game.date)] : [] };
  }
  return { label: "", periods: [] };
}

function renderAwardContext(playerId, award, options = {}) {
  const { label, periods } = getPlayerAwardContext(playerId, award, options.game);
  if (!periods.length) return "";
  if (options.compact) {
    return `<small class="award-context-summary" aria-label="${escapeHtml(label)}">${escapeHtml(periods.join(" · "))}</small>`;
  }
  return `<div class="award-context"><strong>${escapeHtml(label)}</strong><ul>${periods.map((period) => `<li>${escapeHtml(period)}</li>`).join("")}</ul></div>`;
}

function addAwardCount(counts, key, amount = 1) {
  if (!isShowcaseAwardKey(key)) return;
  counts.set(key, (counts.get(key) || 0) + amount);
}

function isShowcaseAwardKey(key) {
  return Boolean(PLAYER_CARD_VARIANTS[key] && !FIELD_ONLY_CARD_KEYS.has(key));
}

function getAwardsUnlockedByGame(playerId, game) {
  if (!isFinishedGame(game) || !getPlayerParticipation(game, playerId)) return [];
  const orderedGames = getFinishedGamesAsc(state.games);
  const targetIndex = orderedGames.findIndex((item) => item.id === game.id);
  if (targetIndex < 0) return [];
  const gamesUntilBefore = orderedGames.slice(0, targetIndex);
  const gamesUntilThis = orderedGames.slice(0, targetIndex + 1);
  const before = new Set(getAwardKeysForGames(playerId, gamesUntilBefore));
  return getAwardKeysForGames(playerId, gamesUntilThis)
    .filter((key) => !before.has(key))
    .filter(isShowcaseAwardKey)
    .map((key) => PLAYER_CARD_VARIANTS[key])
    .filter(Boolean);
}

function getAwardKeysForGames(playerId, games) {
  const counts = new Map();
  const audit = getPlayerWinAwardAudit(playerId, games);
  for (let streak = 1; streak <= Math.min(audit.bestWinStreak, 5); streak += 1) {
    addAwardCount(counts, `win_${streak}x`);
  }

  const appearances = getPlayerAppearanceRecord(playerId, Number.MAX_SAFE_INTEGER, games).reverse();
  appearances.forEach((item, index) => {
    const windowItems = appearances.slice(Math.max(0, index - 4), index + 1);
    if (windowItems.length === FORM_LOOKBACK_GAMES) {
      const wins = windowItems.filter((entry) => entry.outcome === "win").length;
      if (wins >= 5) addAwardCount(counts, "form_5w_5");
      else if (wins >= 4) addAwardCount(counts, "form_4w_5");
      else if (wins >= 3) addAwardCount(counts, "form_3w_5");
    }
  });

  return [...counts.keys()];
}

function getFinishedGamesAsc(games = state.games) {
  return [...games].filter(isFinishedGame).sort((a, b) => {
    const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    return timeDiff || String(a.id).localeCompare(String(b.id));
  });
}

function getFinishedGamesDesc(games = state.games) {
  return [...games].filter(isFinishedGame).sort((a, b) => {
    const timeDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    return timeDiff || String(b.id).localeCompare(String(a.id));
  });
}

function getPlayerTeamRecord(playerId, limit = PROFILE_HISTORY_LIMIT, games = state.games) {
  return getFinishedGamesDesc(games)
    .slice(0, limit)
    .map((game) => {
      const participation = getPlayerParticipation(game, playerId);
      return {
        game,
        participation,
        outcome: participation ? getPlayerOutcome(game, participation.side) : "absent",
      };
    });
}

function getPlayerAppearanceRecord(playerId, limit = PROFILE_HISTORY_LIMIT, games = state.games) {
  return getFinishedGamesDesc(games)
    .map((game) => {
      const participation = getPlayerParticipation(game, playerId);
      if (!participation) return null;
      return {
        game,
        participation,
        side: participation.side,
        teamLabel: participation.teamLabel,
        wasBench: participation.wasBench,
        outcome: getPlayerOutcome(game, participation.side),
      };
    })
    .filter(Boolean)
    .slice(0, limit);
}

function getPlayerWinAwardAudit(playerId, games = state.games) {
  let currentWinStreak = 0;
  let bestWinStreak = 0;
  let runningWinStreak = 0;
  const finishedAsc = getFinishedGamesAsc(games);

  finishedAsc.forEach((game) => {
    const participation = getPlayerParticipation(game, playerId);
    if (!participation || getPlayerOutcome(game, participation.side) !== "win") {
      runningWinStreak = 0;
      return;
    }
    runningWinStreak += 1;
    bestWinStreak = Math.max(bestWinStreak, runningWinStreak);
  });

  for (const game of getFinishedGamesDesc(games)) {
    const participation = getPlayerParticipation(game, playerId);
    if (!participation || getPlayerOutcome(game, participation.side) !== "win") break;
    currentWinStreak += 1;
  }

  const appearancesAsc = getPlayerAppearanceRecord(playerId, Number.MAX_SAFE_INTEGER, games).reverse();
  let bestWinsInFive = 0;
  appearancesAsc.forEach((item, index) => {
    const windowItems = appearancesAsc.slice(Math.max(0, index - 4), index + 1);
    if (windowItems.length === FORM_LOOKBACK_GAMES) {
      bestWinsInFive = Math.max(bestWinsInFive, windowItems.filter((entry) => entry.outcome === "win").length);
    }
  });

  return { currentWinStreak, bestWinStreak, bestWinsInFive };
}

function getPlayerAwardShowcase(playerData) {
  const counts = new Map();
  const appearances = getPlayerFinishedAppearances(playerData.id, state.games, "asc");

  if (!appearances.length) {
    addAwardCount(counts, "rookie");
  }

  const awardAudit = getPlayerWinAwardAudit(playerData.id);
  const cappedBestWinStreak = Math.min(awardAudit.bestWinStreak, 5);
  for (let streak = 1; streak <= cappedBestWinStreak; streak += 1) {
    addAwardCount(counts, `win_${streak}x`);
  }

  appearances.forEach((item, index) => {
    const windowItems = appearances.slice(Math.max(0, index - 4), index + 1);
    if (windowItems.length === FORM_LOOKBACK_GAMES) {
      const wins = windowItems.filter((entry) => entry.outcome === "win").length;
      if (wins >= 5) addAwardCount(counts, "form_5w_5");
      else if (wins >= 4) addAwardCount(counts, "form_4w_5");
      else if (wins >= 3) addAwardCount(counts, "form_3w_5");
    }
  });

  countPlayerMvpAwards(playerData.id, counts);
  countPlayerAttendanceAwards(playerData.id, counts);

  const form = getPlayerForm(playerData);
  if (form.adjustment >= 4) addAwardCount(counts, "rising");
  if (form.levelKey === "hot") addAwardCount(counts, "hot");
  if (form.levelKey === "bad" || form.levelKey === "recovery") addAwardCount(counts, "recovery");
  if (hasRecentReturn(playerData.id)) addAwardCount(counts, "return");
  if (hasRegularRecentAttendance(playerData.id)) addAwardCount(counts, "regular");
  if (!counts.size && appearances.length) addAwardCount(counts, "base");

  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => CARD_AWARD_PRIORITY.indexOf(a.key) - CARD_AWARD_PRIORITY.indexOf(b.key));
}

function countPlayerMvpAwards(playerId, counts) {
  let streak = 0;
  state.games
    .filter(isFinishedGame)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((game) => {
      const mvpIds = getOfficialMvpIdsForGame(game);
      if (mvpIds.has(playerId)) {
        streak += 1;
        addAwardCount(counts, "mvp");
        if (streak === 2) addAwardCount(counts, "mvp_2x");
        if (streak >= 3) addAwardCount(counts, "mvp_3x");
      } else {
        streak = 0;
      }
    });

  getPlayerMonthlyAwardMonths(playerId, "mvp_month").forEach(() => addAwardCount(counts, "mvp_month"));
}

function countPlayerSeasonAwards(playerId, counts) {
  const seasons = new Set(state.games.filter((game) => isFinishedGame(game) && isSeasonComplete(getSeasonId(game.date))).map((game) => getSeasonId(game.date)));
  seasons.forEach((seasonId) => {
    if (!getSeasonChampionIds(seasonId).includes(playerId)) return;
    const seasonKey = seasonId.split("-")[0];
    addAwardCount(counts, `champion_${seasonKey}`);
  });
}

function countPlayerAttendanceAwards(playerId, counts) {
  getPlayerMonthlyAwardMonths(playerId, "ironman_month").forEach(() => addAwardCount(counts, "ironman_month"));
  const months = new Set(state.games.filter((game) => isFinishedGame(game) && isMonthComplete(getMonthId(game.date))).map((game) => getMonthId(game.date)));
  months.forEach((monthId) => {
    const games = state.games.filter((game) => isFinishedGame(game) && getMonthId(game.date) === monthId);
    if (games.length >= 5 && games.filter((game) => getPlayerParticipation(game, playerId)).length / games.length >= 0.8) addAwardCount(counts, "regular");
  });

  const gamesAsc = [...state.games].filter(isFinishedGame).sort((a, b) => new Date(a.date) - new Date(b.date));
  for (let index = 3; index < gamesAsc.length; index += 1) {
    const absentBefore = gamesAsc.slice(index - 3, index).every((game) => !getPlayerParticipation(game, playerId));
    if (absentBefore && getPlayerParticipation(gamesAsc[index], playerId)) addAwardCount(counts, "return");
  }
}

function renderFormChip(form) {
  return `<span class="form-chip ${form.className}">${form.level} ${formatSigned(form.adjustment)}</span>`;
}

function renderFormSign(form, options = {}) {
  const className = form.adjustment > 0 ? "positive" : form.adjustment < 0 ? "negative" : "neutral";
  const label = options.compact ? formatSigned(form.adjustment) : `${formatSigned(form.adjustment)} forma`;
  return `<span class="form-sign ${className}">${label}</span>`;
}

function renderRatingBadge(playerData, form = getPlayerForm(playerData)) {
  const variant = getPlayerCardVariant(playerData, form);
  if (canSeeCurrentRatings()) {
    return `<span class="rating-badge admin-rating ${renderCardHaloClass(playerData, variant)}">${playerData.overall}&rarr;${form.currentRating}</span>`;
  }
  return `<span class="rating-badge public-rating ${renderCardHaloClass(playerData, variant)}"><strong>${playerData.overall}</strong>${renderFormSign(form, { compact: true })}</span>`;
}

function renderCardHaloClass(playerData, variant = getPlayerCardVariant(playerData)) {
  if (!playerData || !variant) return "";
  return `card-halo card-halo-${variant.key}`;
}

function getPlayerCardVariant(playerData, form = getPlayerForm(playerData), game = null) {
  if (!playerData) return PLAYER_CARD_VARIANTS.base;
  const award = getActivePlayerCardAward(playerData, form, game);
  return PLAYER_CARD_VARIANTS[award] || PLAYER_CARD_VARIANTS.base;
}

function isLightTextCardVariant(variant) {
  return ["hot", "mvp", "mvp_2x", "mvp_3x", "mvp_month", "champion_autumn", "champion_winter", "ironman_month"].includes(variant?.key);
}

function getCardTextColor(variant) {
  if (variant?.key === "ironman_month") return "#dfe4e7";
  return isLightTextCardVariant(variant) ? "#f8eecb" : "#201809";
}

function getActivePlayerCardAward(playerData, form = getPlayerForm(playerData), game = null) {
  if (!playerData) return "base";
  if (game) {
    const seasonChampionCard = getSeasonChampionCardKeyForGame(playerData.id, game);
    if (seasonChampionCard) return seasonChampionCard;

    const monthMvpCard = getMonthMvpCardKeyForGame(playerData.id, game);
    if (monthMvpCard) return monthMvpCard;

    const nextGameMvpIds = getNextGameMvpIds(game);
    if (nextGameMvpIds.has(playerData.id)) {
      return getMvpStreakCardKey(playerData.id, getPreviousFinishedGameFor(game));
    }
  }

  if (form.winStreak >= 5) return "win_5x";
  if (form.winStreak >= 4) return "win_4x";
  if (form.winStreak >= 3) return "win_3x";
  if (form.winStreak >= 2) return "win_2x";
  if (form.recentGamesCount >= FORM_LOOKBACK_GAMES && form.wins >= 5) return "form_5w_5";
  if (form.recentGamesCount >= FORM_LOOKBACK_GAMES && form.wins >= 4) return "form_4w_5";
  if (form.recentGamesCount >= FORM_LOOKBACK_GAMES && form.wins >= 3) return "form_3w_5";
  if (isLatestCompletedMonthIronman(playerData.id)) return "ironman_month";
  if (form.adjustment >= 4) return "rising";
  if (hasRecentReturn(playerData.id)) return "return";
  if (hasRegularRecentAttendance(playerData.id)) return "regular";
  if (!getPlayerFinishedAppearances(playerData.id).length) return "rookie";
  if (form.levelKey === "hot") return "hot";
  if (form.levelKey === "bad" || form.levelKey === "recovery") return "recovery";
  return "base";
}

function getLatestOfficialMvpIds() {
  const finishedGames = [...state.games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const game of finishedGames) {
    const winners = getOfficialMvpWinners(getMvpVoteCountsForGame(game.id));
    if (winners.length) return new Set(winners.map((playerData) => playerData.id));
  }

  return new Set();
}

function getPreviousFinishedGameFor(game) {
  if (!game?.date) return null;
  const gameTime = new Date(game.date).getTime();
  const finishedGames = [...state.games]
    .filter((item) => isFinishedGame(item) && item.id !== game.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return finishedGames.find((item) => new Date(item.date).getTime() < gameTime) || null;
}

function getOfficialMvpIdsForGame(game) {
  if (!isMvpVotingClosed(game)) return new Set();
  const counts = getMvpVoteCountsForGame(game?.id);
  return new Set(getOfficialMvpWinners(counts).map((playerData) => playerData.id));
}

function getNextGameMvpIds(game) {
  const previousGame = getPreviousFinishedGameFor(game);
  if (!previousGame) return new Set();
  const mvpIds = getOfficialMvpIdsForGame(previousGame);
  if (!mvpIds.size) return new Set();
  const previousMvpPlaysThisGame = getGamePlayerIds(game).some((playerId) => mvpIds.has(playerId));
  return previousMvpPlaysThisGame ? mvpIds : new Set();
}

function getPlayerFinishedAppearances(playerId, games = state.games, direction = "desc") {
  return [...games]
    .filter(isFinishedGame)
    .sort((a, b) => direction === "asc" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date))
    .map((game) => {
      const participation = getPlayerParticipation(game, playerId);
      if (!participation) return null;
      return { game, ...participation, outcome: getPlayerOutcome(game, participation.side) };
    })
    .filter(Boolean);
}

function getMvpStreakCardKey(playerId, game) {
  const streak = getOfficialMvpStreakEndingAt(playerId, game);
  if (streak >= 3) return "mvp_3x";
  if (streak >= 2) return "mvp_2x";
  return "mvp";
}

function getOfficialMvpStreakEndingAt(playerId, game) {
  if (!game) return 0;
  const gameTime = new Date(game.date).getTime();
  let streak = 0;
  const finishedGames = [...state.games]
    .filter((item) => isFinishedGame(item) && new Date(item.date).getTime() <= gameTime)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const item of finishedGames) {
    const ids = getOfficialMvpIdsForGame(item);
    if (!ids.size || !ids.has(playerId)) break;
    streak += 1;
  }
  return streak;
}

function getMonthId(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getSeasonInfo(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const springStart = getSeasonStart("spring", year);
  const summerStart = getSeasonStart("summer", year);
  const autumnStart = getSeasonStart("autumn", year);
  const winterStart = getSeasonStart("winter", year);

  if (date >= winterStart) return buildSeasonInfo("winter", year);
  if (date >= autumnStart) return buildSeasonInfo("autumn", year);
  if (date >= summerStart) return buildSeasonInfo("summer", year);
  if (date >= springStart) return buildSeasonInfo("spring", year);
  return buildSeasonInfo("winter", year - 1);
}

function getSeasonId(value) {
  const season = getSeasonInfo(value);
  return `${season.key}-${season.year}`;
}

function getSeasonChampionCardKey(value) {
  return `champion_${getSeasonInfo(value).key}`;
}

function buildSeasonInfo(key, year) {
  return { key, year, label: SEASON_DEFINITIONS[key]?.label || key };
}

function getSeasonStart(key, year) {
  const definition = SEASON_DEFINITIONS[key] || SEASON_DEFINITIONS.spring;
  return new Date(year, definition.startMonth, definition.startDay, 0, 0, 0, 0);
}

function getSeasonEndFromInfo(season) {
  const definition = SEASON_DEFINITIONS[season.key] || SEASON_DEFINITIONS.spring;
  const endYear = season.key === "winter" ? season.year + 1 : season.year;
  return new Date(endYear, definition.endMonth, definition.endDay, 0, 0, 0, 0);
}

function getMonthEnd(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getSeasonEnd(value) {
  const season = getSeasonInfo(value);
  return getSeasonEndFromInfo(season);
}

function isMonthComplete(monthId) {
  const games = state.games.filter((game) => monthKey(game.date) === monthId);
  if (!games.some(isFinishedGame)) return false;
  if (games.some((game) => !isFinishedGame(game))) return false;
  return getMonthEnd(monthIdToDate(monthId)).getTime() <= Date.now();
}

function isSeasonComplete(seasonId) {
  const games = state.games.filter((game) => getSeasonId(game.date) === seasonId);
  if (!games.some(isFinishedGame)) return false;
  if (games.some((game) => !isFinishedGame(game))) return false;
  return getSeasonEnd(seasonIdToDate(seasonId)).getTime() <= Date.now();
}

function getCompletedMonthIds() {
  return [...new Set(state.games.map((game) => monthKey(game.date)))]
    .filter(isMonthComplete)
    .sort();
}

function getLatestCompletedMonthId() {
  const months = getCompletedMonthIds();
  return months[months.length - 1] || null;
}

function monthIdToDate(monthId) {
  const [yearText, monthText] = String(monthId).split("-");
  const year = Number(yearText) || new Date().getFullYear();
  const month = Math.max(1, Math.min(12, Number(monthText) || 1));
  return new Date(year, month - 1, 1, 12);
}

function getNextMonthId(monthId) {
  const date = monthIdToDate(monthId);
  date.setMonth(date.getMonth() + 1);
  return getMonthId(date);
}

function getCompletedSeasonIds() {
  return [...new Set(state.games.map((game) => getSeasonId(game.date)))]
    .filter(isSeasonComplete)
    .sort((a, b) => getSeasonEnd(seasonIdToDate(a)) - getSeasonEnd(seasonIdToDate(b)));
}

function getLatestCompletedSeasonId() {
  const seasons = getCompletedSeasonIds();
  return seasons[seasons.length - 1] || null;
}

function seasonIdToDate(seasonId) {
  const [key, yearText] = seasonId.split("-");
  const year = Number(yearText) || new Date().getFullYear();
  return getSeasonStart(key, year);
}

function getLatestCompletedSeasonDate() {
  const seasonId = getLatestCompletedSeasonId();
  return seasonId ? seasonIdToDate(seasonId) : new Date();
}

function getOfficialMvpWinnersByMonth(monthId) {
  const rows = getMonthlyMvpRows(monthId);
  if (!rows.length) return [];
  const best = rows[0];
  return rows
    .filter((row) =>
      row.mvpCount === best.mvpCount &&
      row.wins === best.wins &&
      row.winRate === best.winRate
    )
    .map((row) => row.playerId);
}

function getMonthlyMvpRows(monthId) {
  const stats = new Map();
  const monthGames = state.games.filter((game) => isFinishedGame(game) && getMonthId(game.date) === monthId);

  monthGames.forEach((game) => {
    getGamePlayerIds(game).forEach((playerId) => {
      const participation = getPlayerParticipation(game, playerId);
      if (!participation) return;
      const row = stats.get(playerId) || { playerId, mvpCount: 0, games: 0, wins: 0, winRate: 0 };
      row.games += 1;
      if (getPlayerOutcome(game, participation.side) === "win") row.wins += 1;
      stats.set(playerId, row);
    });

    getOfficialMvpIdsForGame(game).forEach((playerId) => {
      const row = stats.get(playerId) || { playerId, mvpCount: 0, games: 0, wins: 0, winRate: 0 };
      row.mvpCount += 1;
      stats.set(playerId, row);
    });
  });

  return [...stats.values()]
    .filter((row) => row.mvpCount > 0)
    .map((row) => ({ ...row, winRate: row.games ? row.wins / row.games : 0 }))
    .sort((a, b) =>
      b.mvpCount - a.mvpCount ||
      b.wins - a.wins ||
      b.winRate - a.winRate
    );
}

function isCurrentMonthMvpLeader(playerId) {
  return getOfficialMvpWinnersByMonth(getMonthId(new Date())).includes(playerId);
}

function isLatestCompletedMonthMvpLeader(playerId) {
  const monthId = getLatestCompletedMonthId();
  return Boolean(monthId && getOfficialMvpWinnersByMonth(monthId).includes(playerId));
}

function getMonthMvpCardKeyForGame(playerId, game) {
  if (!game || !getPlayerParticipation(game, playerId)) return null;
  const gameMonthId = getMonthId(game.date);
  const monthId = getCompletedMonthIds()
    .filter((id) => getNextMonthId(id) === gameMonthId)
    .reverse()
    .find((id) => {
      if (!getOfficialMvpWinnersByMonth(id).includes(playerId)) return false;
      return isFirstPlayerGameAfterMonth(id, playerId, game);
    });
  return monthId ? "mvp_month" : null;
}

function isFirstPlayerGameAfterMonth(monthId, playerId, game) {
  const monthEndTime = getMonthEnd(monthIdToDate(monthId)).getTime();
  const gameTime = new Date(game.date).getTime();
  if (gameTime < monthEndTime || getMonthId(game.date) !== getNextMonthId(monthId) || !getPlayerParticipation(game, playerId)) return false;

  return !state.games.some((candidate) => {
    if (candidate.id === game.id || !getPlayerParticipation(candidate, playerId)) return false;
    const candidateTime = new Date(candidate.date).getTime();
    return candidateTime >= monthEndTime && candidateTime < gameTime && getMonthId(candidate.date) === getNextMonthId(monthId);
  });
}

function getSeasonChampionIds(seasonId) {
  const stats = new Map();
  state.games
    .filter((game) => isFinishedGame(game) && getSeasonId(game.date) === seasonId)
    .forEach((game) => {
      getGamePlayerIds(game).forEach((playerId) => {
        const participation = getPlayerParticipation(game, playerId);
        if (!participation) return;
        const record = stats.get(playerId) || { playerId, games: 0, wins: 0 };
        record.games += 1;
        if (getPlayerOutcome(game, participation.side) === "win") record.wins += 1;
        stats.set(playerId, record);
      });
    });

  const rows = [...stats.values()].filter((row) => row.wins > 0);
  if (!rows.length) return [];
  rows.sort((a, b) =>
    b.wins - a.wins ||
    (b.wins / b.games) - (a.wins / a.games) ||
    b.games - a.games ||
    (findPlayer(a.playerId)?.name || "").localeCompare(findPlayer(b.playerId)?.name || "")
  );
  const best = rows[0];
  return best ? [best.playerId] : [];
}

function getSeasonChampionCardKeyForGame(playerId, game) {
  if (!game || !getPlayerParticipation(game, playerId)) return null;
  const gameTime = new Date(game.date).getTime();
  const seasonId = getCompletedSeasonIds()
    .filter((id) => getSeasonEnd(seasonIdToDate(id)).getTime() <= gameTime)
    .reverse()
    .find((id) => {
      const championId = getSeasonChampionIds(id)[0];
      return championId === playerId && isFirstPlayerGameAfterSeason(id, playerId, game);
    });
  return seasonId ? `champion_${seasonId.split("-")[0]}` : null;
}

function isFirstPlayerGameAfterSeason(seasonId, playerId, game) {
  const seasonEndTime = getSeasonEnd(seasonIdToDate(seasonId)).getTime();
  const gameTime = new Date(game.date).getTime();
  if (gameTime < seasonEndTime || !getPlayerParticipation(game, playerId)) return false;

  return !state.games.some((candidate) => {
    if (candidate.id === game.id || !getPlayerParticipation(candidate, playerId)) return false;
    const candidateTime = new Date(candidate.date).getTime();
    return candidateTime >= seasonEndTime && candidateTime < gameTime;
  });
}

function isCurrentSeasonChampion(playerId) {
  return getSeasonChampionIds(getSeasonId(new Date())).includes(playerId);
}

function isLatestCompletedSeasonChampion(playerId) {
  const seasonId = getLatestCompletedSeasonId();
  return Boolean(seasonId && getSeasonChampionIds(seasonId).includes(playerId));
}

function isCurrentMonthIronman(playerId) {
  const monthId = getMonthId(new Date());
  const games = state.games.filter((game) => isFinishedGame(game) && getMonthId(game.date) === monthId);
  return games.length >= 2 && games.every((game) => getPlayerParticipation(game, playerId));
}

function isLatestCompletedMonthIronman(playerId) {
  const monthId = getLatestCompletedMonthId();
  if (!monthId) return false;
  const games = state.games.filter((game) => isFinishedGame(game) && getMonthId(game.date) === monthId);
  return games.length >= 2 && games.every((game) => getPlayerParticipation(game, playerId));
}

function hasRegularRecentAttendance(playerId) {
  const recentGames = [...state.games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);
  if (recentGames.length < 5) return false;
  const attended = recentGames.filter((game) => getPlayerParticipation(game, playerId)).length;
  return attended / recentGames.length >= 0.8;
}

function hasRecentReturn(playerId) {
  const recentGames = [...state.games].filter(isFinishedGame).sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!recentGames.length || !getPlayerParticipation(recentGames[0], playerId)) return false;
  return recentGames.slice(1, 4).length >= 3 && recentGames.slice(1, 4).every((game) => !getPlayerParticipation(game, playerId));
}

function canSeeCurrentRatings() {
  return canWriteOfficialData();
}

function formatSigned(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : String(number);
}

function renderRecordDots(record, options = {}) {
  if (!record.length) return `<span class="record-empty">Sem jogos</span>`;
  const labels = { win: "V", draw: "E", loss: "D", absent: "-" };
  const titles = { win: "Vitoria", draw: "Empate", loss: "Derrota", absent: "Nao jogou" };
  const visibleRecord = options.chronological ? [...record].reverse() : record;
  const wrapClass = options.wrap ? " record-dots-wrap" : "";
  return `<span class="record-dots${wrapClass}">${visibleRecord.map((outcome) => `<span class="record-dot ${outcome}" title="${titles[outcome] || ""}">${labels[outcome] || "-"}</span>`).join("")}</span>`;
}

function renderTeamRecentGameRow(item) {
  const resultText = item.participation ? getPlayerResultText(item.game, item.participation.side) : getGameResultText(item.game);
  const outcomeLabel = {
    win: "Vitoria",
    draw: "Empate",
    loss: "Derrota",
    absent: "Nao foi",
  }[item.outcome] || "Nao foi";
  const detail = item.participation
    ? `${item.participation.teamLabel}${item.participation.wasBench ? " suplente" : ""}`
    : "Ausente";
  return `
    <article class="profile-game-row">
      <div>
        <strong>${formatDate(item.game.date)} - ${resultText}</strong>
        <span>${detail}</span>
      </div>
      <span class="metric ${item.outcome === "win" ? "good-pill" : item.outcome === "loss" ? "warn-pill" : item.outcome === "absent" ? "muted-pill" : ""}">${outcomeLabel}</span>
      <button class="ghost-btn" data-profile-open-game="${item.game.id}">Abrir</button>
    </article>
  `;
}

function renderPlayerGameRow(item) {
  const resultText = getPlayerResultText(item.game, item.side);
  const outcomeLabel = {
    win: "Vitoria",
    draw: "Empate",
    loss: "Derrota",
    open: "Em aberto",
  }[item.outcome] || "Em aberto";
  return `
    <article class="profile-game-row">
      <div>
        <strong>${formatDate(item.game.date)} - ${resultText}</strong>
        <span>${item.teamLabel}${item.wasBench ? " suplente" : ""}</span>
      </div>
      <span class="metric ${item.outcome === "win" ? "good-pill" : item.outcome === "loss" ? "warn-pill" : ""}">${outcomeLabel}</span>
      <button class="ghost-btn" data-profile-open-game="${item.game.id}">Abrir</button>
    </article>
  `;
}

function renderSynergyCard(item) {
  const playerData = findPlayer(item.playerId);
  if (!playerData) return "";
  return `
    <article class="synergy-card">
      <button class="player-open-link ${renderCardHaloClass(playerData)}" data-open-player="${playerData.id}" type="button">${renderAvatar(playerData)}</button>
      <div>
        <strong>${escapeHtml(playerData.name)}</strong>
        <span>${item.wins}V em ${item.gamesTogether} jogos juntos</span>
        <small>${item.winMarginTotal > 0 ? `+${item.winMarginTotal}` : item.winMarginTotal} saldo da equipa nas vitorias</small>
      </div>
      <span class="metric good-pill">${item.winRate}%</span>
    </article>
  `;
}

function getPlayerMatchSummary(playerId) {
  const summary = {
    appearances: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    games: [],
  };

  [...state.games]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach((game) => {
      const participation = getPlayerParticipation(game, playerId);
      if (!participation) return;
      summary.appearances += 1;
      const outcome = getPlayerOutcome(game, participation.side);
      if (outcome === "win") summary.wins += 1;
      if (outcome === "draw") summary.draws += 1;
      if (outcome === "loss") summary.losses += 1;
      summary.games.push({ game, ...participation, outcome });
    });

  return summary;
}

function getPlayerSynergies(playerId) {
  const byPlayer = new Map();

  state.games
    .filter(isFinishedGame)
    .forEach((game) => {
      const participation = getPlayerParticipation(game, playerId);
      if (!participation) return;
      const sameSideIds = getGameSidePlayerIds(game, participation.side).filter((id) => id !== playerId);
      const outcome = getPlayerOutcome(game, participation.side);
      const margin = outcome === "win" ? Math.max(0, getTeamGoalDiff(game, participation.side)) : 0;

      sameSideIds.forEach((teammateId) => {
        const stats = byPlayer.get(teammateId) || {
          playerId: teammateId,
          gamesTogether: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          winMarginTotal: 0,
        };
        stats.gamesTogether += 1;
        if (outcome === "win") {
          stats.wins += 1;
          stats.winMarginTotal += margin;
        }
        if (outcome === "draw") stats.draws += 1;
        if (outcome === "loss") stats.losses += 1;
        byPlayer.set(teammateId, stats);
      });
    });

  return [...byPlayer.values()]
    .map((stats) => ({
      ...stats,
      winRate: stats.gamesTogether ? Math.round((stats.wins / stats.gamesTogether) * 100) : 0,
      score: stats.wins * 12 + stats.winMarginTotal * 2 + stats.gamesTogether + (stats.gamesTogether ? stats.wins / stats.gamesTogether : 0),
    }))
    .sort((a, b) =>
      b.score - a.score ||
      b.wins - a.wins ||
      b.winMarginTotal - a.winMarginTotal ||
      b.gamesTogether - a.gamesTogether ||
      (findPlayer(a.playerId)?.name || "").localeCompare(findPlayer(b.playerId)?.name || "")
    )
    .slice(0, 4);
}

function getGameSidePlayerIds(game, side) {
  return side === "A"
    ? [...(game.teamA || []), ...(game.benchA || [])]
    : [...(game.teamB || []), ...(game.benchB || [])];
}

function getTeamGoalDiff(game, side) {
  if (game.scoreA == null || game.scoreB == null) return 0;
  const diff = Number(game.scoreA) - Number(game.scoreB);
  return side === "A" ? diff : -diff;
}

function getPlayerParticipation(game, playerId) {
  if ((game.teamA || []).includes(playerId)) return { side: "A", teamLabel: "Equipa A", wasBench: false };
  if ((game.teamB || []).includes(playerId)) return { side: "B", teamLabel: "Equipa B", wasBench: false };
  if ((game.benchA || []).includes(playerId)) return { side: "A", teamLabel: "Equipa A", wasBench: true };
  if ((game.benchB || []).includes(playerId)) return { side: "B", teamLabel: "Equipa B", wasBench: true };
  return null;
}

function getPlayerOutcome(game, side) {
  if (game.scoreA == null || game.scoreB == null) return "open";
  if (Number(game.scoreA) === Number(game.scoreB)) return "draw";
  const teamAWon = Number(game.scoreA) > Number(game.scoreB);
  return (side === "A" && teamAWon) || (side === "B" && !teamAWon) ? "win" : "loss";
}

function getFinishedGames(limit = null) {
  const games = [...state.games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return limit ? games.slice(0, limit) : games;
}

function getPlayerTeamRecentItems(playerId, limit = FORM_LOOKBACK_GAMES) {
  return getFinishedGames(limit).map((game) => {
    const participation = getPlayerParticipation(game, playerId);
    return {
      game,
      participation,
      outcome: participation ? getPlayerOutcome(game, participation.side) : "absent",
    };
  });
}

function getPlayerTeamRecentRecord(playerId, limit = FORM_LOOKBACK_GAMES) {
  return getPlayerTeamRecentItems(playerId, limit).map((item) => item.outcome);
}

function bindAccountPanelActions() {
  els.accountPanel?.querySelector("[data-account-login]")?.addEventListener("click", adminLogin);
  els.accountPanel?.querySelector("[data-account-signup]")?.addEventListener("click", createAccount);
  els.accountPanel?.querySelector("[data-password-reset]")?.addEventListener("click", requestPasswordReset);
  els.accountPanel?.querySelector("[data-change-password]")?.addEventListener("click", changeCurrentPassword);
  els.accountPanel?.querySelector("[data-set-username]")?.addEventListener("click", setCurrentUsername);
  els.accountPanel?.querySelector("[data-unlink-own-player]")?.addEventListener("click", unlinkOwnPlayerProfile);
}

function renderClaimsList() {
  if (!els.claimsList) return;
  if (!isAdmin) {
    els.claimsList.innerHTML = `<div class="empty-state">So admins conseguem ver pedidos.</div>`;
    return;
  }

  const pendingClaims = playerClaims.filter((claim) => claim.status === "pending");
  if (!pendingClaims.length) {
    els.claimsList.innerHTML = `<div class="empty-state">Nao ha pedidos pendentes.</div>`;
    return;
  }

  els.claimsList.innerHTML = pendingClaims.map((claim) => {
    const playerData = findPlayer(claim.player_id);
    const profile = knownProfiles.find((item) => item.id === claim.user_id);
    return `
      <article class="claim-row">
        <div>
          <strong>${escapeHtml(playerData?.name || "Jogador removido")}</strong>
          <span>${escapeHtml(profile?.display_name || profile?.email || claim.user_id)} - ${formatDate(claim.created_at)}</span>
        </div>
        <div class="actions">
          <button class="primary-btn" data-approve-claim="${claim.id}">Aprovar</button>
          <button class="danger-btn" data-reject-claim="${claim.id}">Rejeitar</button>
        </div>
      </article>
    `;
  }).join("");

  els.claimsList.querySelectorAll("[data-approve-claim]").forEach((button) => {
    button.addEventListener("click", () => reviewPlayerClaim(button.dataset.approveClaim, "approved"));
  });
  els.claimsList.querySelectorAll("[data-reject-claim]").forEach((button) => {
    button.addEventListener("click", () => reviewPlayerClaim(button.dataset.rejectClaim, "rejected"));
  });
}

function renderAccountsList() {
  if (!els.accountsList) return;
  if (!isAdmin) {
    els.accountsList.innerHTML = `<div class="empty-state">So admins conseguem ver contas.</div>`;
    return;
  }

  // Com grupos, so as contas do grupo ativo.
  const profiles = groupMemberRoles.size
    ? knownProfiles.filter((profile) => groupMemberRoles.has(profile.id))
    : knownProfiles;
  if (!profiles.length) {
    els.accountsList.innerHTML = `<div class="empty-state">Ainda nao ha contas criadas.</div>`;
    return;
  }

  els.accountsList.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Jogador</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${profiles.map((profile) => {
            const linkedPlayer = state.players.find((p) => p.linkedUserId === profile.id);
            const role = getAccountRole(profile);
            const canToggle = role !== "owner" && profile.id !== currentSession?.user?.id;
            return `
              <tr>
                <td><strong>${escapeHtml(profile.display_name || "-")}</strong></td>
                <td>${escapeHtml(profile.username || "-")}</td>
                <td>${escapeHtml(profile.email || "-")}</td>
                <td><span class="metric">${escapeHtml(ROLE_LABELS[role] || role)}</span></td>
                <td>${linkedPlayer ? `${renderAvatar(linkedPlayer)} <strong>${escapeHtml(linkedPlayer.name)}</strong>` : "<span class=\"metric\">Sem perfil</span>"}</td>
                <td>
                  ${canToggle ? `<button class="mini-btn" data-toggle-admin="${profile.id}">
                    ${role === "admin" ? "Remover admin" : "Tornar admin"}
                  </button>` : ""}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  els.accountsList.querySelectorAll("[data-toggle-admin]").forEach((button) => {
    button.addEventListener("click", () => toggleProfileAdminRole(button.dataset.toggleAdmin));
  });
}

function renderPaymentsPanel() {
  if (!els.paymentsPanel) return;
  if (!isAdmin) {
    els.paymentsPanel.innerHTML = `<div class="empty-state">So admins conseguem gerir pagamentos.</div>`;
    return;
  }

  const report = buildMonthlyPaymentReport(currentPaymentsMonth);
  const paymentOptions = report.rows
    .slice()
    .sort((a, b) => a.player.name.localeCompare(b.player.name))
    .map((row) => `<option value="${row.player.id}">${escapeHtml(row.player.name)} - saldo ${euro(row.currentBalance)}</option>`)
    .join("");
  els.paymentsPanel.innerHTML = `
    <div class="payments-toolbar">
      <label>
        Mes
        <input id="payments-month" type="month" value="${escapeHtml(currentPaymentsMonth)}">
      </label>
      <button class="ghost-btn" data-payments-whatsapp>WhatsApp</button>
    </div>

    <section class="payments-form primary-payment-form">
      <div class="payments-form-title">
        <strong>Registar pagamento ou ajuste</strong>
        <span>Usa divida para aumentar o saldo a pagar sem mexer nas presencas.</span>
      </div>
      <select data-payment-player>
        <option value="">Jogador</option>
        ${paymentOptions}
      </select>
      <input data-payment-amount type="number" min="0" step="0.5" placeholder="Valor">
      <input data-payment-date type="date" value="${escapeHtml(todayInputDate())}">
      <input data-payment-note placeholder="Nota">
      <div class="payments-form-actions">
        <button class="primary-btn" data-add-payment>Registar pagamento</button>
        <button class="ghost-btn" data-add-debt>Adicionar divida</button>
      </div>
    </section>

    <section class="payments-toolbar payments-cashbar">
        <label>
          Caixa registada
          <input data-finance-cash type="number" step="0.5" value="${financeSettings.cashBalance}">
        </label>
        <button class="ghost-btn" data-save-finance-settings>Guardar caixa</button>
    </section>

    <div class="finance-summary">
      ${renderSummaryCard("Jogos", report.games.length)}
      ${renderSummaryCard("Campo pago", euro(report.fieldCost))}
      ${renderSummaryCard("A cobrar", euro(report.totalDue))}
      ${renderSummaryCard("Recebido", euro(report.totalPaidMonth))}
      ${renderSummaryCard("Dif. caixa mes", euro(report.cashMonthDelta))}
      ${renderSummaryCard("Caixa", euro(financeSettings.cashBalance))}
    </div>

    ${renderGameFinanceControls(report)}

    <div class="table-wrap payments-table-wrap">
      <table class="payments-table">
        <colgroup>
          <col class="payment-name-col">
          ${report.games.map(() => `<col class="payment-game-col">`).join("")}
          <col class="payment-small-col">
          <col class="payment-money-col">
          <col class="payment-money-col">
          <col class="payment-balance-col">
          <col class="payment-balance-col">
        </colgroup>
        <thead>
          <tr>
            <th>Nome</th>
            ${report.games.map((game) => `<th>${dayOfMonth(game.date)}</th>`).join("")}
            <th>Idas</th>
            <th>A pagar</th>
            <th>Pag./aj.</th>
            <th>Saldo anterior</th>
            <th>Saldo atual</th>
          </tr>
        </thead>
        <tbody>
          ${report.rows.map((row) => renderPaymentRow(row, report.games)).join("")}
        </tbody>
      </table>
    </div>

    <section class="profile-section">
      <h3>Pagamentos do mes</h3>
      ${renderPaymentsHistory(report.monthPayments)}
    </section>
  `;

  els.paymentsPanel.querySelector("#payments-month")?.addEventListener("change", (event) => {
    currentPaymentsMonth = event.target.value || monthKey(new Date());
    renderPaymentsPanel();
  });
  els.paymentsPanel.querySelector("[data-save-finance-settings]")?.addEventListener("click", saveFinanceSettingsFromPanel);
  els.paymentsPanel.querySelector("[data-payments-whatsapp]")?.addEventListener("click", sharePaymentsOnWhatsApp);
  els.paymentsPanel.querySelector("[data-add-payment]")?.addEventListener("click", () => addManualPayment("payment"));
  els.paymentsPanel.querySelector("[data-add-debt]")?.addEventListener("click", () => addManualPayment("debt"));
  els.paymentsPanel.querySelectorAll("[data-open-payment-player]").forEach((button) => {
    button.addEventListener("click", () => openPlayerProfile(button.dataset.openPaymentPlayer));
  });
  els.paymentsPanel.querySelectorAll("[data-attendance-game]").forEach((input) => {
    input.addEventListener("change", () => updateAttendanceOverride(input.dataset.attendanceGame, input.dataset.attendancePlayer, input.checked));
  });
  els.paymentsPanel.querySelectorAll("[data-game-finance-toggle]").forEach((input) => {
    input.addEventListener("change", () => updateGameFinanceOverride(input.dataset.gameFinanceToggle, input.dataset.gameFinanceField, input.checked));
  });
  els.paymentsPanel.querySelectorAll("[data-game-field-cost]").forEach((input) => {
    input.addEventListener("change", () => updateGameFinanceOverride(input.dataset.gameFieldCost, "fieldCost", Number(input.value || 0)));
  });
  els.paymentsPanel.querySelectorAll("[data-edit-payment]").forEach((button) => {
    button.addEventListener("click", () => editPayment(button.dataset.editPayment));
  });
}

// Hall of Fame: periodo escolhido no seletor e listas abertas sobrevivem aos re-renders.
let statsPeriod = "all";
const STATS_PERIODS = [["month", "Este mes"], ["season", "Epoca"], ["all", "Sempre"]];
const HOF_ICONS = {
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6M10 17h4",
  chart: "M4 20h16M7 16v-5M12 16V6M17 16v-8",
  calendar: "M5 5h14v15H5zM5 9h14M9 3v4M15 3v4M9 14l2 2 4-4",
  star: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6L3.3 9.3l6.1-.7z",
  flame: "M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  target: "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1z",
  shield: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z",
  people: "M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 11a2.5 2.5 0 1 0 0-5M16 15c3 0 5 1.5 5 4",
  history: "M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v4l3 2",
};

function hofIcon(name) {
  return `<svg class="hof-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${HOF_ICONS[name]}"/></svg>`;
}

function getStatsPeriodKey() {
  return statsPeriod === "month" ? `month:${monthKey(new Date())}` : statsPeriod;
}

function openSpeedMoment(gameId, seconds) {
  const target = getProfileMomentTarget(gameId, seconds);
  if (!target) return;
  openVideoLightbox(gameId, {
    clip: { youtubeId: target.part.youtubeId, startS: Math.max(0, Math.floor(target.seconds - 4)), endS: Math.ceil(target.seconds + 4), note: "Velocidade máxima" },
  });
}

// Resultados do tracker visiveis para este utilizador (rascunhos so para admins).
function getVisibleTrackingEntry(gameId) {
  const entry = getTrackingEntry(gameId);
  return entry?.result?.players && !(entry.status === "draft" && !isAdmin) ? entry : null;
}

// Passes detetados entre dois jogadores no periodo (nos dois sentidos).
function getHallPassPairs(range, limit = 5) {
  const totals = new Map();
  getFinishedGames().filter((game) => isGameInStatsRange(game, range)).forEach((game) => {
    const entry = getVisibleTrackingEntry(game.id);
    (entry?.result?.ball?.passLinks || []).forEach((link) => {
      const a = entry.mapping?.[link.from];
      const b = entry.mapping?.[link.to];
      if (!a || !b || a === b) return;
      const key = [a, b].sort().join("::");
      totals.set(key, (totals.get(key) || 0) + link.count);
    });
  });
  return [...totals]
    .map(([key, count]) => ({ players: key.split("::").map(findPlayer).filter(Boolean), count }))
    .filter((row) => row.players.length === 2)
    .sort((x, y) => y.count - x.count || x.players[0].name.localeCompare(y.players[0].name, "pt-PT"))
    .slice(0, limit);
}

// Seccao "Em campo": numeros do tracker de video, so jogadores com minutos observados suficientes e fora da baliza.
function renderStatsVideoSection(range, partial) {
  const periodKey = getStatsPeriodKey();
  const rows = state.players
    .map((playerData) => ({ player: playerData, summary: getProfilePeriodData(playerData.id, periodKey).summary }))
    .filter((row) => row.summary.trackedGames > 0)
    .filter((row) => (row.summary.minutes.total ?? 0) >= 10 && (row.summary.pace.goalkeeperMin ?? 0) < row.summary.minutes.total / 2);
  const finished = getFinishedGames().filter((game) => hasValidFinalScore(game) && isGameInStatsRange(game, range));
  const analysed = finished.filter((game) => getVisibleTrackingEntry(game.id)).length;
  const head = `
    <h3 class="hof-section-title">Em campo <span class="hof-beta">Beta</span>${partial ? ` <span class="hof-partial">Parcial</span>` : ""}</h3>
    <p class="hof-note">Números do tracking de vídeo · ${analysed} de ${finished.length} jogos analisados. Só entram jogadores com 10 min ou mais observados e fora da baliza.</p>`;
  if (!rows.length) {
    return `<section class="hof-section">${head}<div class="hof-rail"><article class="hof-card hof-tone-slate"><p class="hof-empty">Ainda não há jogos analisados por vídeo neste período.</p></article></div></section>`;
  }
  const tagOf = (list) => {
    const status = FooterInsights.weakestOf(list);
    return status && status !== "measured" ? FooterInsights.statusText(status) : "";
  };
  const top = (value, status) => rows
    .filter((row) => value(row.summary) != null)
    .sort((a, b) => value(b.summary) - value(a.summary) || a.player.name.localeCompare(b.player.name, "pt-PT"))
    .slice(0, 5)
    .map((row) => ({ ...row, status: status(row.summary) }));
  const motor = top((s) => s.pace.value, (s) => s.pace.status);
  const marathon = top((s) => s.distance.totalM, (s) => s.distance.status);
  const lightning = top((s) => s.maxSpeed.value, (s) => s.maxSpeed.status);
  const sprinter = rows
    .filter((row) => row.summary.sprints.total != null && row.summary.sprints.games)
    .map((row) => ({ ...row, avg: row.summary.sprints.total / row.summary.sprints.games, status: row.summary.sprints.status }))
    .sort((a, b) => b.avg - a.avg || a.player.name.localeCompare(b.player.name, "pt-PT")).slice(0, 5);
  const passer = top((s) => s.passes.total, (s) => s.passes.status);
  const pairs = getHallPassPairs(range);
  const card = (icon, title, list, valueOf, extraOf, emptyMessage) =>
    renderStatsList(icon, title, list, (row, index) => renderStatsPlayerRow(row, index, valueOf(row), extraOf ? extraOf(row) : ""), emptyMessage, tagOf(list.map((row) => row.status)));
  return `
    <section class="hof-section">
      ${head}
      <div class="hof-rail" data-hof-rail>
      ${card("pace", "Motor · m/min", motor, (row) => `${formatTrackingNumber(row.summary.pace.value)} m/min`, null, "Sem dados.")}
      ${card("distance", "Maratonista · distância", marathon, (row) => `${formatTrackingNumber(row.summary.distance.totalM / 1000, 1)} km`, null, "Sem dados.")}
      ${card("speed", "Relâmpago · velocidade máx.", lightning, (row) => `${formatTrackingNumber(row.summary.maxSpeed.value, 1)} km/h`,
        (row) => (getProfileMomentTarget(row.summary.maxSpeed.gameId, row.summary.maxSpeed.atS)
          ? ` <button type="button" class="hof-moment" data-stats-moment="${escapeHtml(row.summary.maxSpeed.gameId)}" data-stats-moment-at="${row.summary.maxSpeed.atS}" aria-label="Ver o momento">▶</button>` : ""), "Sem dados.")}
      ${card("sprints", "Sprinter · sprints por jogo", sprinter, (row) => formatTrackingNumber(row.avg, 1), null, "Sem dados.")}
      ${card("passes", "Passador · passes detetados", passer, (row) => `${formatTrackingNumber(row.summary.passes.total)} passes`, null, "Sem dados.")}
      ${renderStatsList("people", "Ligação · mais passes entre dois", pairs, (row, index) => renderPassPairRow(row, index), "Sem ligações detetadas.", FooterInsights.statusText("detected"))}
      </div>
    </section>`;
}

function renderPassPairRow(row, index) {
  return `
    <div class="hof-row hof-rank-${index + 1}">
      <span class="hof-rank">${index + 1}</span>
      <span class="hof-combo">${row.players.map((playerData) => `
        <button class="hof-row-player" data-open-stats-player="${playerData.id}" type="button">${renderAvatar(playerData)}<span>${escapeHtml(playerData.name)}</span></button>
      `).join("")}</span>
      <strong class="hof-value">${row.count} passes</strong>
    </div>
  `;
}

function getStatsRange() {
  const key = statsPeriod === "month" ? `month:${monthKey(new Date())}` : statsPeriod;
  return FooterInsights.periodRange(key);
}

function renderStatsPanel() {
  if (!els.statsPanel) return;
  const range = getStatsRange();
  const rows = getPlayerHistoryStatsRows(range);
  const activeRows = rows.filter((row) => row.appearances > 0 || row.mvpCount > 0);
  const winRateBaseRows = activeRows.filter((row) => row.appearances >= 5);
  const winRateRows = (winRateBaseRows.length ? winRateBaseRows : activeRows)
    .slice()
    .sort(sortByWinRate)
    .slice(0, 5);
  const pairRows = getBestPairStats(5, range);
  const trioRows = getBestTrioStats(5, range);
  const goalEligibleRows = activeRows.filter((row) => row.goalAverageEligible);
  const goalsForRows = goalEligibleRows.slice().sort(sortByGoalsForAverage).slice(0, 5);
  const goalsAgainstRows = goalEligibleRows.slice().sort(sortByGoalsAgainstAverage).slice(0, 5);
  const mvpHistoryRows = getMvpHistoryRows(999, range);
  const gamesCount = getFinishedGames().filter((game) => isGameInStatsRange(game, range)).length;
  const monthOpen = statsPeriod === "month" && !getMonthReviewStatus(monthKey(new Date())).ready;
  const partialGoals = statsPeriod === "month" && goalEligibleRows.some((row) => row.appearances < 5);

  const periodControl = `
    <div class="hof-segmented" role="tablist" aria-label="Periodo">
      ${STATS_PERIODS.map(([key, label]) => `<button type="button" role="tab" aria-selected="${key === statsPeriod}" class="${key === statsPeriod ? "active" : ""}" data-stats-period="${key}">${label}</button>`).join("")}
    </div>
  `;

  if (!activeRows.length) {
    els.statsPanel.innerHTML = `${periodControl}<div class="empty-state">Ainda nao ha jogos neste periodo.</div>`;
  } else {
    const mostWins = activeRows.slice().sort(sortByWins)[0];
    const mostAppearances = activeRows.slice().sort(sortByAppearances)[0];
    const mostMvps = activeRows.slice().sort(sortByMvps)[0];
    const bestStreak = activeRows.slice().sort(sortByWinStreak)[0];
    els.statsPanel.innerHTML = `
      ${periodControl}
      <p class="hof-summary">${activeRows.length} jogadores · ${gamesCount} ${gamesCount === 1 ? "jogo" : "jogos"} · ${mvpHistoryRows.length} MVPs${monthOpen ? ` <span class="hof-partial">Parcial · mês em curso</span>` : ""}</p>

      <div class="hof-carousel" data-hof-rail aria-label="Destaques">
        ${renderStatsHighlight("trophy", "Mais vitorias", mostWins?.wins || 0, mostWins?.player, `${mostWins?.appearances || 0} presencas`, "gold")}
        ${renderStatsHighlight("star", "Mais MVPs", mostMvps?.mvpCount || 0, mostMvps?.player, `${mostMvps?.appearances || 0} jogos`, "violet")}
        ${renderStatsHighlight("flame", "Maior sequencia", bestStreak?.bestWinStreak || 0, bestStreak?.player, "vitorias seguidas", "coral")}
        ${renderStatsHighlight("calendar", "Mais presencas", mostAppearances?.appearances || 0, mostAppearances?.player, `${mostAppearances?.wins || 0} vitorias`, "blue")}
      </div>

      <section class="hof-section">
        <h3 class="hof-section-title">Resultados</h3>
        <div class="hof-rail" data-hof-rail>
        ${renderStatsRanking("trophy", "Mais vitorias", activeRows.slice().sort(sortByWins).slice(0, 5), (row) => `${row.wins}V em ${row.appearances}J`)}
        ${renderStatsRanking("chart", "Melhor win rate", winRateRows, (row) => `${row.winRate}% · ${row.wins}V/${row.appearances}J`)}
        ${renderStatsRanking("flame", "Vitorias seguidas", activeRows.slice().sort(sortByWinStreak).slice(0, 5), (row) => `${row.bestWinStreak} seguidas`)}
        ${renderStatsRanking("target", "Golos marcados por jogo", goalsForRows, (row) => formatStatsAverage(row.goalsForAverage), statsPeriod === "month" ? "Ainda sem jogos neste mes." : "Precisa de 5 jogos e de nao estar ausente ha mais de 5 jogos.", partialGoals ? "Parcial" : "")}
        ${renderStatsRanking("shield", "Menos golos sofridos por jogo", goalsAgainstRows, (row) => formatStatsAverage(row.goalsAgainstAverage), statsPeriod === "month" ? "Ainda sem jogos neste mes." : "Precisa de 5 jogos e de nao estar ausente ha mais de 5 jogos.", partialGoals ? "Parcial" : "")}
        </div>
      </section>

      <section class="hof-section">
        <h3 class="hof-section-title">Presenca e premios</h3>
        <div class="hof-rail" data-hof-rail>
        ${renderStatsRanking("calendar", "Mais presencas", activeRows.slice().sort(sortByAppearances).slice(0, 5), (row) => `${row.appearances} jogos`)}
        ${renderStatsRanking("star", "Mais MVPs", activeRows.slice().sort(sortByMvps).slice(0, 5), (row) => `${row.mvpCount} MVP${row.mvpCount === 1 ? "" : "s"}`)}
        ${renderMvpHistoryRanking(mvpHistoryRows)}
        </div>
      </section>

      <section class="hof-section">
        <h3 class="hof-section-title">Combinacoes</h3>
        <div class="hof-rail" data-hof-rail>
        ${renderPairRanking(pairRows)}
        ${renderTrioRanking(trioRows)}
        </div>
      </section>

      ${renderStatsVideoSection(range, monthOpen)}
    `;
  }

  els.statsPanel.querySelectorAll("[data-stats-period]").forEach((button) => {
    button.addEventListener("click", () => {
      statsPeriod = button.dataset.statsPeriod;
      renderStatsPanel();
    });
  });
  els.statsPanel.querySelectorAll("[data-open-stats-player]").forEach((button) => {
    button.addEventListener("click", () => openPlayerProfile(button.dataset.openStatsPlayer));
  });
  els.statsPanel.querySelectorAll("[data-stats-moment]").forEach((button) => {
    button.addEventListener("click", () => openSpeedMoment(button.dataset.statsMoment, Number(button.dataset.statsMomentAt)));
  });
  els.statsPanel.querySelectorAll("[data-hof-rail]").forEach(bindHofRail);
}

// Pontos de pagina por baixo de cada carrossel; acompanham o cartao mais proximo do inicio.
function bindHofRail(rail) {
  const cards = [...rail.children];
  if (cards.length < 2) return;
  const dots = document.createElement("div");
  dots.className = "hof-dots";
  dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = cards.map((_, index) => `<i class="${index ? "" : "active"}"></i>`).join("");
  rail.after(dots);
  const update = () => {
    const atEnd = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
    const index = atEnd ? cards.length - 1 : cards.reduce((best, card, i) => (
      Math.abs(card.offsetLeft - rail.scrollLeft) < Math.abs(cards[best].offsetLeft - rail.scrollLeft) ? i : best
    ), 0);
    [...dots.children].forEach((dot, i) => dot.classList.toggle("active", i === index));
  };
  rail.addEventListener("scroll", update, { passive: true });
}

function hasValidFinalScore(game) {
  return [game?.scoreA, game?.scoreB].every(
    (score) =>
      score !== null
      && score !== undefined
      && String(score).trim() !== ""
      && Number.isFinite(Number(score))
  );
}

// "range" (FooterInsights.periodRange) limita as contas a um periodo; sem ele contam todos os jogos.
function isGameInStatsRange(game, range) {
  return !range || FooterInsights.inPeriod(game.date, range);
}

function getPlayerHistoryStatsRows(range = null) {
  return state.players.map((playerData) => {
    const summary = getPlayerMatchSummary(playerData.id);
    const finishedGames = summary.games.filter(
      (item) => item.outcome !== "open" && hasValidFinalScore(item.game) && isGameInStatsRange(item.game, range)
    );
    const appearances = finishedGames.length;
    const outcomes = finishedGames.reduce(
      (counts, item) => {
        if (item.outcome === "win") counts.wins += 1;
        if (item.outcome === "draw") counts.draws += 1;
        if (item.outcome === "loss") counts.losses += 1;
        return counts;
      },
      { wins: 0, draws: 0, losses: 0 }
    );
    const goalSummary = FooterStats.summarizePlayerGoals(
      finishedGames.map((item) => {
        const goalsFor = item.side === "A" ? Number(item.game.scoreA) : Number(item.game.scoreB);
        const goalsAgainst = item.side === "A" ? Number(item.game.scoreB) : Number(item.game.scoreA);
        return { playerId: playerData.id, goalsFor, goalsAgainst };
      })
    );
    const mvpCount = getFinishedGames().filter((game) => isGameInStatsRange(game, range)).reduce((count, game) => count + (getOfficialMvpIdsForGame(game).has(playerData.id) ? 1 : 0), 0);
    const bestWinStreak = FooterStats.calculateBestWinStreak(
      getFinishedGamesAsc().filter((game) => isGameInStatsRange(game, range)).map((game) => {
        const valid = hasValidFinalScore(game);
        if (!valid) return { valid, outcome: "absent" };
        const participation = getPlayerParticipation(game, playerData.id);
        return {
          valid,
          outcome: participation ? getPlayerOutcome(game, participation.side) : "absent",
        };
      })
    );
    const recentAbsences = FooterStats.countLeadingAbsences(getPlayerTeamRecord(playerData.id, Number.MAX_SAFE_INTEGER).map((item) => item.outcome));
    return {
      player: playerData,
      appearances,
      wins: outcomes.wins,
      draws: outcomes.draws,
      losses: outcomes.losses,
      winRate: appearances ? Math.round((outcomes.wins / appearances) * 100) : 0,
      mvpCount,
      bestWinStreak,
      goalsFor: goalSummary.goalsFor,
      goalsAgainst: goalSummary.goalsAgainst,
      goalsForAverage: goalSummary.averageGoalsFor,
      goalsAgainstAverage: goalSummary.averageGoalsAgainst,
      recentAbsences,
      // No mes em curso mostram-se resultados parciais: basta 1 jogo (a lista avisa "Parcial").
      goalAverageEligible: FooterStats.isGoalAverageEligible({ appearances, recentAbsences, minimumGames: range?.kind === "month" ? 1 : 5 }),
    };
  });
}

function getFinishedTeamPerformances(range = null) {
  return getFinishedGames().filter((game) => hasValidFinalScore(game) && isGameInStatsRange(game, range)).flatMap((game) =>
    ["A", "B"].map((side) => {
      const outcome = getPlayerOutcome(game, side);
      return {
        playerIds: getGameSidePlayerIds(game, side).filter((id) => findPlayer(id)).sort(),
        outcome,
        winMargin: outcome === "win" ? Math.max(0, getTeamGoalDiff(game, side)) : 0,
      };
    })
  );
}

function compareCanonicalIdKeys(aIds, bIds) {
  const aKey = aIds.map(String).join("::");
  const bKey = bIds.map(String).join("::");
  if (aKey < bKey) return -1;
  if (aKey > bKey) return 1;
  return 0;
}

function sortCombinationStats(a, b) {
  const numericDifference =
    b.score - a.score
    || b.wins - a.wins
    || b.winMarginTotal - a.winMarginTotal
    || b.gamesTogether - a.gamesTogether;
  if (numericDifference) return numericDifference;

  const compareNames = (left, right) => left.localeCompare(right, "pt-PT");
  const aNameKey = a.players.map((playerData) => playerData.name).sort(compareNames).join(" + ");
  const bNameKey = b.players.map((playerData) => playerData.name).sort(compareNames).join(" + ");
  return aNameKey.localeCompare(bNameKey, "pt-PT")
    || compareCanonicalIdKeys(a.playerIds, b.playerIds);
}

function getBestCombinationStats(groupSize, minimumGames, limit, range = null) {
  const ranking = FooterStats.buildCombinationRanking(
    getFinishedTeamPerformances(range),
    groupSize,
    minimumGames,
    undefined,
    (playerId) => findPlayer(playerId)?.name
  )
    .map((stats) => ({
      ...stats,
      players: stats.playerIds.map(findPlayer).filter(Boolean),
    }))
    .filter((stats) => stats.players.length === groupSize)
    .sort(sortCombinationStats);

  return Number.isInteger(limit) ? ranking.slice(0, Math.max(0, limit)) : ranking;
}

function getBestPairStats(limit = 5, range = null) {
  return getBestCombinationStats(2, 2, limit, range);
}

function getBestTrioStats(limit = 5, range = null) {
  return getBestCombinationStats(3, 3, limit, range);
}

function getMvpHistoryRows(limit = 10, range = null) {
  return getFinishedGames()
    .filter((game) => isGameInStatsRange(game, range))
    .map((game) => {
      const winners = [...getOfficialMvpIdsForGame(game)].map(findPlayer).filter(Boolean);
      return { game, winners, totalVotes: getMvpTotalVotes(game.id) };
    })
    .filter((row) => row.winners.length)
    .slice(0, limit);
}

function sortByWins(a, b) {
  return b.wins - a.wins || b.appearances - a.appearances || a.player.name.localeCompare(b.player.name);
}

function sortByWinRate(a, b) {
  return b.winRate - a.winRate || b.wins - a.wins || b.appearances - a.appearances || a.player.name.localeCompare(b.player.name);
}

function sortByAppearances(a, b) {
  return b.appearances - a.appearances || b.wins - a.wins || a.player.name.localeCompare(b.player.name);
}

function sortByMvps(a, b) {
  return b.mvpCount - a.mvpCount || b.wins - a.wins || a.player.name.localeCompare(b.player.name);
}

function sortByWinStreak(a, b) {
  return b.bestWinStreak - a.bestWinStreak || b.wins - a.wins || a.player.name.localeCompare(b.player.name);
}

function sortByGoalsForAverage(a, b) {
  return b.goalsForAverage - a.goalsForAverage
    || b.goalsFor - a.goalsFor
    || b.appearances - a.appearances
    || a.player.name.localeCompare(b.player.name, "pt-PT")
    || compareCanonicalIdKeys([a.player.id], [b.player.id]);
}

function sortByGoalsAgainstAverage(a, b) {
  return a.goalsAgainstAverage - b.goalsAgainstAverage
    || a.goalsAgainst - b.goalsAgainst
    || b.appearances - a.appearances
    || a.player.name.localeCompare(b.player.name, "pt-PT")
    || compareCanonicalIdKeys([a.player.id], [b.player.id]);
}

function formatStatsAverage(value) {
  return new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function renderStatsHighlight(icon, label, value, playerData, detail, tone) {
  return `
    <article class="hof-hero hof-tone-${tone}">
      <span class="hof-hero-label">${hofIcon(icon)}${escapeHtml(label)}</span>
      <strong class="hof-hero-value">${escapeHtml(value)}</strong>
      ${playerData ? `
        <button class="hof-hero-player" data-open-stats-player="${playerData.id}" type="button">
          ${renderAvatar(playerData)}<span>${escapeHtml(playerData.name)}</span>
        </button>
      ` : "<em>-</em>"}
      <small>${escapeHtml(detail || "")}</small>
    </article>
  `;
}

const HOF_TONES = {
  trophy: "gold", chart: "blue", flame: "coral", target: "green", shield: "teal", calendar: "blue",
  star: "violet", people: "teal", history: "slate", pace: "teal", distance: "blue", speed: "orange", sprints: "coral", passes: "gold",
};
const STATS_LIST_LIMIT = 5;

// Cartao de um carrossel: cor propria, icone, titulo e as primeiras linhas da lista.
function renderStatsList(icon, title, items, renderRow, emptyMessage, badge = "") {
  return `
    <article class="hof-card hof-tone-${HOF_TONES[icon] || "blue"}">
      <h4 class="hof-card-title">${hofIcon(icon)}${escapeHtml(title)}${badge ? ` <span class="hof-badge">${escapeHtml(badge)}</span>` : ""}</h4>
      <div class="hof-list">
        ${items.length ? items.slice(0, STATS_LIST_LIMIT).map((item, index) => renderRow(item, index)).join("") : `<p class="hof-empty">${escapeHtml(emptyMessage)}</p>`}
      </div>
    </article>
  `;
}

function renderStatsPlayerRow(row, index, valueText, extraHtml = "") {
  return `
    <div class="hof-row hof-rank-${index + 1}">
      <span class="hof-rank">${index + 1}</span>
      <button class="hof-row-player" data-open-stats-player="${row.player.id}" type="button">
        ${renderAvatar(row.player)}<span>${escapeHtml(row.player.name)}</span>
      </button>
      <strong class="hof-value">${escapeHtml(valueText)}${extraHtml}</strong>
    </div>
  `;
}

function renderStatsRanking(icon, title, rows, valueRenderer, emptyMessage = "Sem dados.", badge = "") {
  return renderStatsList(icon, title, rows, (row, index) => renderStatsPlayerRow(row, index, valueRenderer(row)), emptyMessage, badge);
}

function renderCombinationRow(row, index) {
  return `
    <div class="hof-row hof-rank-${index + 1}">
      <span class="hof-rank">${index + 1}</span>
      <span class="hof-combo">${row.players.map((playerData) => `
        <button class="hof-row-player" data-open-stats-player="${playerData.id}" type="button">${renderAvatar(playerData)}<span>${escapeHtml(playerData.name)}</span></button>
      `).join("")}</span>
      <strong class="hof-value">${row.winRate}% · ${row.wins}V/${row.gamesTogether}J</strong>
    </div>
  `;
}

function renderPairRanking(rows) {
  return renderStatsList("people", "Melhor dupla", rows, renderCombinationRow, "Ainda nao ha duplas com 2 jogos.");
}

function renderTrioRanking(rows) {
  return renderStatsList("people", "Melhores triplas", rows, renderCombinationRow, "Ainda nao ha triplas com 3 jogos.");
}

function renderMvpHistoryRanking(rows) {
  return renderStatsList("history", "Historico de MVPs", rows.slice(0, 6), (row) => `
    <div class="hof-row hof-row-history">
      <span class="hof-date">${escapeHtml(formatDate(row.game.date))}</span>
      <span class="hof-winners">${row.winners.map((playerData) => `<button class="hof-row-player" data-open-stats-player="${playerData.id}" type="button">${renderAvatar(playerData)}<span>${escapeHtml(playerData.name)}</span></button>`).join("")}</span>
      <small class="hof-value">${row.totalVotes} votos</small>
    </div>
  `, "Ainda nao ha MVPs fechados.");
}

function renderPaymentRow(row, games) {
  const balanceClass = row.currentBalance > 0 ? "debt-cell" : row.currentBalance < 0 ? "credit-cell" : "";
  return `
    <tr>
      <td><button class="player-name-link" data-open-payment-player="${row.player.id}" type="button"><strong>${escapeHtml(row.player.name)}</strong></button></td>
      ${games.map((game) => `
        <td>
          <input type="checkbox"
            data-attendance-game="${game.id}"
            data-attendance-player="${row.player.id}"
            ${row.attendanceByGame.get(game.id) ? "checked" : ""}
            ${getGameFinanceSettings(game).chargePlayers ? "" : "disabled"}>
        </td>
      `).join("")}
      <td>${row.attendanceCount}</td>
      <td>${euro(row.due)}</td>
      <td>${euro(row.paidMonth)}</td>
      <td>${euro(row.previousBalance)}</td>
      <td class="${balanceClass}"><strong>${euro(row.currentBalance)}</strong></td>
    </tr>
  `;
}

function renderGameFinanceControls(report) {
  if (!report.games.length) {
    return `<section class="profile-section"><div class="empty-state">Ainda nao ha jogos neste mes.</div></section>`;
  }
  return `
    <section class="profile-section finance-games-section">
      <div class="finance-settings-head">
        <div>
          <h3>Regras dos jogos</h3>
          <p>Se o jogo nao se realizou mas o campo foi pago, deixa Campo pago ligado e desliga Cobrar jogadores.</p>
        </div>
      </div>
      <div class="finance-games">
        ${report.games.map((game) => {
          const settings = getGameFinanceSettings(game);
          return `
            <article class="finance-game-row">
              <div>
                <strong>${formatDate(game.date)}</strong>
                <span>${escapeHtml(game.title || "Jogo")}</span>
              </div>
              <label>
                <input type="checkbox" data-game-finance-toggle="${game.id}" data-game-finance-field="fieldPaid" ${settings.fieldPaid ? "checked" : ""}>
                Campo pago
              </label>
              <label>
                <input type="checkbox" data-game-finance-toggle="${game.id}" data-game-finance-field="chargePlayers" ${settings.chargePlayers ? "checked" : ""}>
                Cobrar jogadores
              </label>
              <label>
                Campo
                <input class="finance-cost-input" type="number" min="0" step="0.5" data-game-field-cost="${game.id}" value="${settings.fieldCost}">
              </label>
            </article>
          `;
        }).join("")}
      </div>
    </section>
  `;
}

function renderPaymentsHistory(monthPayments) {
  if (!monthPayments.length) return `<div class="empty-state">Ainda nao ha movimentos registados neste mes.</div>`;
  return `
    <div class="profile-games">
      ${monthPayments.map((payment) => {
        const playerData = findPlayer(payment.playerId);
        const isDebt = isDebtAdjustment(payment);
        const visibleNote = getVisiblePaymentNote(payment);
        return `
          <article class="profile-game-row">
            <div>
              <strong>${escapeHtml(playerData?.name || "Jogador removido")} - ${isDebt ? "Divida" : "Pagamento"} ${euro(payment.amount)}</strong>
              <span>${formatDate(payment.paidAt)}${visibleNote ? ` - ${escapeHtml(visibleNote)}` : ""}</span>
            </div>
            <button class="mini-btn" data-edit-payment="${payment.id}" type="button">Editar</button>
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function isDebtAdjustment(payment) {
  return String(payment?.note || "").startsWith(DEBT_NOTE_PREFIX);
}

function getPaymentSignedAmount(payment) {
  return isDebtAdjustment(payment) ? -Math.abs(Number(payment.amount) || 0) : Number(payment.amount) || 0;
}

function getVisiblePaymentNote(payment) {
  const note = String(payment?.note || "");
  if (!note.startsWith(DEBT_NOTE_PREFIX)) return note;
  return note.slice(DEBT_NOTE_PREFIX.length).trim();
}

function makePaymentNote(note, type) {
  const clean = String(note || "").trim();
  if (type !== "debt") return clean;
  return clean ? `${DEBT_NOTE_PREFIX} ${clean}` : DEBT_NOTE_PREFIX;
}

async function addManualPayment(type = "payment") {
  if (!requireAdmin()) return;
  const playerId = els.paymentsPanel.querySelector("[data-payment-player]")?.value;
  const amount = Number(els.paymentsPanel.querySelector("[data-payment-amount]")?.value);
  const paidAtValue = els.paymentsPanel.querySelector("[data-payment-date]")?.value;
  const note = els.paymentsPanel.querySelector("[data-payment-note]")?.value.trim() || "";
  if (!playerId || Number.isNaN(amount) || amount <= 0 || !paidAtValue) {
    alert("Escolhe jogador, valor e data do movimento.");
    return;
  }
  const payment = {
    id: `${type === "debt" ? "debt" : "pay"}-${Date.now()}-${slug(playerId)}`,
    playerId,
    amount,
    paidAt: new Date(`${paidAtValue}T12:00:00`).toISOString(),
    note: makePaymentNote(note, type),
    createdBy: currentSession?.user?.id || null,
    createdAt: new Date().toISOString(),
  };
  const previousPayments = payments;
  payments = [payment, ...payments];
  currentPaymentsMonth = monthKey(new Date(payment.paidAt));
  try {
    await persistState();
  } catch (error) {
    payments = previousPayments;
    saveState();
    alert(`Nao consegui guardar pagamento. Confirma se executaste o schema.sql no Supabase. Detalhe: ${error.message}`);
  }
  renderPaymentsPanel();
}

async function editPayment(paymentId) {
  if (!requireAdmin()) return;
  const payment = payments.find((item) => item.id === paymentId);
  if (!payment) return;
  const isDebt = isDebtAdjustment(payment);
  const amountText = prompt(isDebt ? "Novo valor da divida:" : "Novo valor pago:", String(payment.amount));
  if (amountText === null) return;
  const nextAmount = Number(amountText);
  if (Number.isNaN(nextAmount) || nextAmount <= 0) {
    alert("Valor invalido.");
    return;
  }
  const currentDate = toDateInputValue(payment.paidAt);
  const nextDateValue = prompt("Nova data do pagamento (YYYY-MM-DD):", currentDate);
  if (nextDateValue === null) return;
  const parsedDate = new Date(`${nextDateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    alert("Data invalida.");
    return;
  }
  const nextNote = prompt(isDebt ? "Nota da divida:" : "Nota do pagamento:", getVisiblePaymentNote(payment)) ?? "";
  const editNote = prompt("Nota da edicao:", "Corrigido pelo admin") ?? "";
  const previousPayments = payments.map((item) => ({ ...item }));
  payment.amount = nextAmount;
  payment.paidAt = parsedDate.toISOString();
  payment.note = appendPaymentEditNote(makePaymentNote(nextNote.trim(), isDebt ? "debt" : "payment"), editNote.trim());
  try {
    await persistState();
  } catch (error) {
    payments = previousPayments;
    saveState();
    alert(`Nao consegui editar pagamento. Confirma se executaste o schema.sql no Supabase. Detalhe: ${error.message}`);
  }
  renderPaymentsPanel();
}

function appendPaymentEditNote(note, editNote) {
  const stamp = `Editado ${new Date().toLocaleDateString("pt-PT")}${editNote ? `: ${editNote}` : ""}`;
  return note ? `${note} | ${stamp}` : stamp;
}

function toDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return todayInputDate();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

async function saveFinanceSettingsFromPanel() {
  if (!requireAdmin()) return;
  const cashBalance = Number(els.paymentsPanel.querySelector("[data-finance-cash]")?.value || 0);
  const previous = financeSettings;
  financeSettings = {
    ...financeSettings,
    cashBalance: Number.isNaN(cashBalance) ? 0 : cashBalance,
  };
  try {
    await persistState();
  } catch (error) {
    financeSettings = previous;
    saveState();
    alert(`Nao consegui guardar caixa. Confirma se executaste o schema.sql no Supabase. Detalhe: ${error.message}`);
  }
  renderPaymentsPanel();
}

async function updateAttendanceOverride(gameId, playerId, attended) {
  if (!requireAdmin()) return;
  const id = attendanceOverrideId(gameId, playerId);
  const next = {
    id,
    gameId,
    playerId,
    attended,
    updatedBy: currentSession?.user?.id || null,
    updatedAt: new Date().toISOString(),
  };
  const index = attendanceOverrides.findIndex((item) => item.id === id);
  const previousOverrides = [...attendanceOverrides];
  if (index >= 0) attendanceOverrides[index] = next;
  else attendanceOverrides.push(next);
  try {
    await persistState();
  } catch (error) {
    attendanceOverrides = previousOverrides;
    saveState();
    alert(`Nao consegui guardar ajuste de presenca. Confirma se executaste o schema.sql no Supabase. Detalhe: ${error.message}`);
  }
  renderPaymentsPanel();
}

async function updateGameFinanceOverride(gameId, field, value) {
  if (!requireAdmin()) return;
  if (!["fieldPaid", "chargePlayers", "fieldCost"].includes(field)) return;
  if (field === "fieldCost" && (Number.isNaN(value) || value < 0)) {
    alert("Insere um valor valido para o campo.");
    renderPaymentsPanel();
    return;
  }
  const existing = gameFinanceOverrides.find((item) => item.gameId === gameId) || getGameFinanceSettings({ id: gameId });
  const next = {
    ...existing,
    id: gameFinanceOverrideId(gameId),
    gameId,
    [field]: field === "fieldCost" ? Number(value) : value,
    updatedBy: currentSession?.user?.id || null,
    updatedAt: new Date().toISOString(),
  };
  const index = gameFinanceOverrides.findIndex((item) => item.gameId === gameId);
  const previousOverrides = [...gameFinanceOverrides];
  if (index >= 0) gameFinanceOverrides[index] = next;
  else gameFinanceOverrides.push(next);
  try {
    await persistState();
  } catch (error) {
    gameFinanceOverrides = previousOverrides;
    saveState();
    alert(`Nao consegui guardar regra do jogo. Confirma se executaste o schema.sql no Supabase. Detalhe: ${error.message}`);
  }
  renderPaymentsPanel();
}

async function toggleProfileAdminRole(profileId) {
  if (!requireAdmin()) return;
  const profile = knownProfiles.find((item) => item.id === profileId);
  if (!profile) return;
  const currentRole = getAccountRole(profile);
  if (currentRole === "owner") return;
  if (profile.id === currentSession?.user?.id && currentRole === "admin") {
    alert("Nao removo o admin da conta com sessao iniciada.");
    return;
  }
  const nextRole = currentRole === "admin" ? "player" : "admin";
  if (!confirm(`${nextRole === "admin" ? "Promover" : "Remover admin de"} ${profile.email || profile.username || profile.id}?`)) return;
  if (remoteEnabled && supabaseClient && activeGroupId) {
    // Papel no grupo ativo; nos Futeboleiros o Supabase atualiza tambem profiles.role.
    const { error } = await supabaseClient.rpc("set_group_member_role", {
      p_group_id: activeGroupId,
      p_user_id: profileId,
      p_role: nextRole,
    });
    if (error) {
      alert(`Nao consegui atualizar role: ${error.message}`);
      return;
    }
    groupMemberRoles.set(profileId, nextRole);
    if (getActiveGroup()?.slug === LEGACY_GROUP_SLUG) profile.role = nextRole;
  } else {
    if (remoteEnabled && supabaseClient) {
      const { error } = await supabaseClient
        .from("profiles")
        .update({ role: nextRole, updated_at: new Date().toISOString() })
        .eq("id", profileId);
      if (error) {
        alert(`Nao consegui atualizar role: ${error.message}`);
        return;
      }
    }
    profile.role = nextRole;
  }
  renderAccountsList();
  updateAccessUi();
}

function buildMonthlyPaymentReport(month) {
  const games = getGamesInMonth(month);
  const rows = getFinancePlayers(games, month).map((playerData) => {
    const attendanceByGame = new Map();
    games.forEach((game) => {
      attendanceByGame.set(game.id, shouldChargePlayerForGame(game, playerData.id));
    });
    const attendanceCount = [...attendanceByGame.values()].filter(Boolean).length;
    const due = Math.min(attendanceCount * PAYMENT_RULES.playerFeePerGame, PAYMENT_RULES.monthlyCap);
    const paidMonth = getPlayerPaymentsInMonth(playerData.id, month).reduce((sum, payment) => sum + getPaymentSignedAmount(payment), 0);
    const previousBalance = getPlayerBalanceBeforeMonth(playerData.id, month);
    const currentBalance = previousBalance + due - paidMonth;
    return {
      player: playerData,
      attendanceByGame,
      attendanceCount,
      due,
      paidMonth,
      previousBalance,
      currentBalance,
    };
  });
  const monthPayments = payments
    .filter((payment) => monthKey(payment.paidAt) === month)
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  const fieldPaidGames = games.filter((game) => getGameFinanceSettings(game).fieldPaid);
  const fieldCost = fieldPaidGames.reduce((sum, game) => sum + getGameFinanceSettings(game).fieldCost, 0);
  const totalPaidMonth = monthPayments
    .filter((payment) => !isDebtAdjustment(payment))
    .reduce((sum, payment) => sum + payment.amount, 0);
  return {
    month,
    games,
    fieldPaidGames,
    rows,
    monthPayments,
    fieldCost,
    totalDue: rows.reduce((sum, row) => sum + row.due, 0),
    totalPaidMonth,
    totalCurrentBalance: rows.reduce((sum, row) => sum + row.currentBalance, 0),
    cashMonthDelta: totalPaidMonth - fieldCost,
  };
}

function getFinancePlayers(games, month) {
  const ids = new Set();
  state.players.filter((p) => !p.isGuest).forEach((p) => ids.add(p.id));
  games.forEach((game) => {
    state.players.forEach((playerData) => {
      if (didPlayerAttendGame(game, playerData.id)) ids.add(playerData.id);
    });
  });
  payments.forEach((payment) => {
    if (monthKey(payment.paidAt) <= month) ids.add(payment.playerId);
  });
  return [...ids]
    .map((id) => findPlayer(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getGamesInMonth(month) {
  return [...state.games]
    .filter((game) => monthKey(game.date) === month)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function getPlayerPaymentsInMonth(playerId, month) {
  return payments.filter((payment) => payment.playerId === playerId && monthKey(payment.paidAt) === month);
}

function getPlayerBalanceBeforeMonth(playerId, month) {
  const initial = Number(financeSettings.playerBalances?.[playerId] || 0);
  if (month <= financeSettings.startMonth) return initial;
  const months = new Set();
  state.games.forEach((game) => {
    const key = monthKey(game.date);
    if (key > financeSettings.startMonth && key < month) months.add(key);
  });
  payments.forEach((payment) => {
    const key = monthKey(payment.paidAt);
    if (key > financeSettings.startMonth && key < month) months.add(key);
  });
  return [...months].sort().reduce((balance, key) => {
    const games = getGamesInMonth(key);
    const attendanceCount = games.filter((game) => shouldChargePlayerForGame(game, playerId)).length;
    const due = Math.min(attendanceCount * PAYMENT_RULES.playerFeePerGame, PAYMENT_RULES.monthlyCap);
    const paid = getPlayerPaymentsInMonth(playerId, key).reduce((sum, payment) => sum + getPaymentSignedAmount(payment), 0);
    return balance + due - paid;
  }, initial);
}

function shouldChargePlayerForGame(game, playerId) {
  if (!getGameFinanceSettings(game).chargePlayers) return false;
  return didPlayerAttendGame(game, playerId);
}

function didPlayerAttendGame(game, playerId) {
  const override = attendanceOverrides.find((item) => item.gameId === game.id && item.playerId === playerId);
  if (override) return override.attended;
  return getGamePlayerIds(game).includes(playerId);
}

function getGameFinanceSettings(game) {
  const gameId = typeof game === "string" ? game : game?.id;
  const override = gameFinanceOverrides.find((item) => item.gameId === gameId);
  return {
    id: gameFinanceOverrideId(gameId),
    gameId,
    fieldPaid: override?.fieldPaid ?? true,
    chargePlayers: override?.chargePlayers ?? true,
    fieldCost: override?.fieldCost ?? PAYMENT_RULES.fieldCostPerGame,
    updatedBy: override?.updatedBy || null,
    updatedAt: override?.updatedAt || new Date().toISOString(),
  };
}

function getGamePlayerIds(game) {
  return [...new Set([...(game.teamA || []), ...(game.teamB || []), ...(game.benchA || []), ...(game.benchB || [])])];
}

function attendanceOverrideId(gameId, playerId) {
  return `att-${gameId}-${playerId}`;
}

function gameFinanceOverrideId(gameId) {
  return `gfin-${gameId}`;
}

function sharePaymentsOnWhatsApp() {
  const report = buildMonthlyPaymentReport(currentPaymentsMonth);
  const debtors = report.rows.filter((row) => row.currentBalance > 0.009);
  const lines = [
    debtors.length ? "Jogadores em divida:" : "Nao ha jogadores em divida.",
    ...debtors.map((row) => `${row.player.name}: ${euro(row.currentBalance)}`),
  ];
  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
}

function getNextEvent() {
  const now = Date.now();
  return [...(state.events || [])]
    .filter((eventData) => eventData.status !== "completed" && eventData.status !== "cancelled")
    .sort((a, b) => {
      const aFuture = new Date(a.startsAt).getTime() >= now ? 0 : 1;
      const bFuture = new Date(b.startsAt).getTime() >= now ? 0 : 1;
      return aFuture - bFuture || new Date(a.startsAt) - new Date(b.startsAt);
    })[0] || null;
}

function getCurrentEvent() {
  return (state.events || []).find((eventData) => eventData.id === currentEventId) || getNextEvent();
}

function getEventResponses(eventId, status) {
  return eventResponses.filter((response) => response.eventId === eventId && (!status || response.status === status));
}

function getEventPlayers(eventId, status) {
  return getEventResponses(eventId, status)
    .map((response) => findPlayer(response.playerId))
    .filter(Boolean)
    .sort((a, b) => b.overall - a.overall || a.name.localeCompare(b.name));
}

function getResponseForPlayer(eventId, playerId) {
  return eventResponses.find((response) => response.eventId === eventId && response.playerId === playerId) || null;
}

function getEventGoingCount(eventId, exceptPlayerId = null) {
  return getEventResponses(eventId, "going")
    .filter((response) => response.playerId !== exceptPlayerId)
    .length;
}

function isEventFullForPlayer(eventData, playerId) {
  const currentResponse = playerId ? getResponseForPlayer(eventData.id, playerId) : null;
  if (currentResponse?.status === "going") return false;
  return getEventGoingCount(eventData.id, playerId) >= eventData.maxPlayers;
}

function renderEventsList() {
  if (!els.eventsList) return;
  if (els.eventDate && !els.eventDate.value) {
    els.eventDate.value = toDateTimeLocalInput(defaultEventDate());
  }

  document.body.classList.toggle("player-linked", Boolean(getLinkedPlayer()));
  const events = [...(state.events || [])]
    .filter((eventData) => eventData.status !== "completed")
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  if (!events.length) {
    els.eventsList.innerHTML = `<div class="empty-state">Ainda nao ha convocatorias. O admin pode lancar o proximo jogo.</div>`;
    return;
  }

  els.eventsList.innerHTML = events.map((eventData) => renderEventCard(eventData)).join("");

  els.eventsList.querySelectorAll("details[data-event-details]").forEach((details) => {
    details.addEventListener("toggle", () => {
      if (details.open) openEventDetails.add(details.dataset.eventDetails);
      else openEventDetails.delete(details.dataset.eventDetails);
    });
  });
  els.eventsList.querySelectorAll("[data-event-response]").forEach((button) => {
    button.addEventListener("click", () => saveEventResponse(button.dataset.eventId, button.dataset.eventResponse));
  });
  els.eventsList.querySelectorAll("[data-event-admin-response]").forEach((button) => {
    button.addEventListener("click", () => saveAdminEventResponse(button.dataset.eventId, button.dataset.playerId, button.dataset.eventAdminResponse));
  });
  els.eventsList.querySelectorAll("[data-event-open-game]").forEach((button) => {
    button.addEventListener("click", () => {
      currentEventId = button.dataset.eventId;
      currentGameId = button.dataset.eventOpenGame;
      previewGame = null;
      showView("today");
      render();
    });
  });
  els.eventsList.querySelectorAll("[data-event-generate]").forEach((button) => {
    button.addEventListener("click", () => {
      currentEventId = button.dataset.eventGenerate;
      loadCurrentEventGoingPlayers({ autoGenerate: true });
    });
  });
  els.eventsList.querySelectorAll("[data-event-cancel]").forEach((button) => {
    button.addEventListener("click", () => updateEventStatus(button.dataset.eventCancel, "cancelled"));
  });
  els.eventsList.querySelectorAll("[data-event-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteEvent(button.dataset.eventDelete));
  });
  els.eventsList.querySelectorAll("[data-save-event-date]").forEach((button) => {
    button.addEventListener("click", () => saveEventDateFromList(button.dataset.saveEventDate));
  });
  els.eventsList.querySelectorAll("[data-event-share]").forEach((button) => {
    button.addEventListener("click", () => shareEventOnWhatsApp(button.dataset.eventShare));
  });
  els.eventsList.querySelectorAll("[data-event-add-existing-btn]").forEach((button) => {
    button.addEventListener("click", () => addExistingPlayerToEvent(button.dataset.eventAddExistingBtn));
  });
  els.eventsList.querySelectorAll("[data-event-add-guest-btn]").forEach((button) => {
    button.addEventListener("click", () => addGuestToEvent(button.dataset.eventAddGuestBtn));
  });
  els.eventsList.querySelectorAll("[data-open-player]").forEach((button) => {
    button.addEventListener("click", () => openPlayerProfile(button.dataset.openPlayer));
  });
  els.eventsList.querySelectorAll("[data-recruit-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleRecruit(button.dataset.recruitToggle));
  });
  els.eventsList.querySelectorAll("[data-event-public-toggle], [data-event-needs]").forEach((input) => {
    input.addEventListener("change", () => saveEventPublicSettings(input.dataset.eventPublicToggle || input.dataset.eventNeeds));
  });
  els.eventsList.querySelectorAll("[data-invite-player]").forEach((button) => {
    button.addEventListener("click", () => invitePlayerToEvent(button.dataset.eventId, button.dataset.invitePlayer));
  });
  els.eventsList.querySelectorAll("[data-join-decide]").forEach((button) => {
    button.addEventListener("click", () => decideJoinRequest(button.dataset.joinDecide, button.dataset.accept === "true"));
  });
}

// Depois de o admin confirmar, todos veem as equipas na propria convocatoria.
function renderEventTeams(game) {
  const team = (label, ids, className) => {
    const players = hydrate(ids);
    return `
      <div class="event-team ${className}">
        <strong>${label} (${players.length})</strong>
        <span>${players.map((p) => escapeHtml(p.name)).join(", ") || "-"}</span>
      </div>
    `;
  };
  return `
    <div class="event-teams">
      <p class="eyebrow">Equipas confirmadas</p>
      <div class="event-teams-grid">
        ${team("Equipa A", [...(game.teamA || []), ...getBenchA(game)], "team-a")}
        ${team("Equipa B", [...(game.teamB || []), ...getBenchB(game)], "team-b")}
      </div>
    </div>
  `;
}

// Admin: "Faltam X - Procurar jogadores". Abre pedidos recebidos, disponiveis (compativeis primeiro),
// convites e a opcao de mostrar o jogo em "Jogos publicos".
function renderEventPublicSection(eventData) {
  if (!isAdmin || !remoteEnabled || ["cancelled", "completed"].includes(eventData.status)) return "";
  const open = recruitOpen.has(eventData.id);
  const missing = Math.max(0, eventData.maxPlayers - getEventGoingCount(eventData.id));
  const requests = joinRequests.filter((row) => row.event_id === eventData.id);
  const pending = requests.filter((row) => row.status === "pending");
  const accepted = requests.filter((row) => row.status === "accepted");
  const summary = [
    pending.length ? `${pending.length} ${pending.length === 1 ? "pedido" : "pedidos"} por decidir` : "",
    eventData.visibility === "public" ? "Visivel em Jogos publicos" : "",
  ].filter(Boolean).join(" · ");
  return `
    <div class="event-recruit admin-actions ${missing ? "needs-players" : ""}">
      <div class="recruit-head">
        <div>
          <strong>${missing ? `Faltam ${missing} ${missing === 1 ? "jogador" : "jogadores"}` : "Precisas de mais alguem?"}</strong>
          ${summary ? `<p>${summary}</p>` : ""}
        </div>
        <button class="${missing || pending.length ? "primary-btn" : "ghost-btn"}" data-recruit-toggle="${eventData.id}">${open ? "Fechar" : "Procurar jogadores"}</button>
      </div>
      ${open ? renderRecruitBody(eventData, pending, accepted) : pending.length ? `
        <div class="join-requests">
          <strong>Pedidos recebidos (${pending.length})</strong>
          ${pending.map((row) => renderJoinRequestRow(row, eventData)).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderRecruitBody(eventData, pending, accepted) {
  const isPublic = eventData.visibility === "public";
  const available = availableByEvent.get(eventData.id);
  const compatible = (available || []).filter((row) => row.compatible);
  const others = (available || []).filter((row) => !row.compatible);
  const availableList = (rows) => rows.map((row) => renderAvailableRow(row, eventData)).join("");
  return `
    <div class="recruit-body">
      <div class="event-public-row">
        <label class="game-date-control">
          <span>Precisamos de</span>
          <select data-event-needs="${eventData.id}">
            <option value="">Qualquer</option>
            ${Object.entries(NEEDS_LABELS).map(([value, label]) => `<option value="${value}" ${eventData.publicNeeds === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </label>
        <label class="recruit-switch">
          <input type="checkbox" data-event-public-toggle="${eventData.id}" ${isPublic ? "checked" : ""}>
          <span>Mostrar em Jogos publicos</span>
        </label>
      </div>
      <p class="hint">${isPublic
        ? "Quem nao e do grupo ve a data, hora, local e quantos faltam, e pode pedir para vir."
        : "Podes convidar quem esta disponivel, ou mostrar o jogo em Jogos publicos para receberes pedidos."}</p>
      ${pending.length ? `
        <div class="join-requests">
          <strong>Pedidos recebidos (${pending.length})</strong>
          ${pending.map((row) => renderJoinRequestRow(row, eventData)).join("")}
        </div>
      ` : ""}
      ${available === undefined ? `<p class="hint">A procurar jogadores disponiveis...</p>` : `
        <div class="join-requests">
          <strong>Disponiveis para este dia e hora (${compatible.length})</strong>
          ${availableList(compatible) || `<p class="hint">Ninguem disponivel a esta hora.</p>`}
        </div>
        ${others.length ? `
          <div class="join-requests">
            <strong>Disponiveis noutras horas ou dias desta semana (${others.length})</strong>
            ${availableList(others)}
          </div>
        ` : ""}
      `}
      ${accepted.length ? `<p class="hint good">Vem jogar: ${accepted.map((row) => escapeHtml(row.requester_name)).join(", ")}</p>` : ""}
    </div>
  `;
}

function renderAvailableRow(row, eventData) {
  const fits = eventData.publicNeeds && traitsFitNeeds(row.player_position, eventData.publicNeeds);
  const traitText = [
    TRAIT_LABELS.position[row.player_position],
    TRAIT_LABELS.fitness[row.fitness],
    row.age_band ? `${row.age_band} anos` : "",
  ].filter(Boolean).join(" · ") || "Sem caracteristicas";
  const status = row.request_status;
  const action = status === "invited"
    ? `<span class="metric">Convite enviado</span>`
    : status === "pending"
      ? `<span class="metric warn-pill">Pediu - ve acima</span>`
      : status === "accepted"
        ? `<span class="metric good-pill">Vem jogar</span>`
        : `<button class="mini-btn" data-invite-player="${escapeHtml(row.user_id)}" data-event-id="${eventData.id}">Convidar</button>`;
  return `
    <div class="join-request-row">
      <div>
        <strong>${escapeHtml(row.name || "Jogador")}</strong>
        ${fits ? `<span class="metric good-pill">Encaixa</span>` : ""}
        <p>${escapeHtml(formatAvailabilitySlot(row))} · ${escapeHtml(traitText)}</p>
      </div>
      <div class="roster-actions">${action}</div>
    </div>
  `;
}

function formatAvailabilitySlot(row) {
  const day = new Date(`${row.day}T12:00:00`);
  return `${WEEKDAY_SHORT[day.getDay()]} ${day.getDate()} · ${row.from_hour}h-${row.to_hour}h`;
}

async function toggleRecruit(eventId) {
  if (recruitOpen.has(eventId)) {
    recruitOpen.delete(eventId);
    renderEventsList();
    return;
  }
  recruitOpen.add(eventId);
  renderEventsList();
  await loadAvailableForEvent(eventId);
  renderEventsList();
}

async function loadAvailableForEvent(eventId) {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient.rpc("list_available_players", { p_event_id: eventId });
  if (error) {
    console.warn("Available players load failed. Run supabase/availability-migration.sql.", error);
    availableByEvent.set(eventId, []);
    return;
  }
  availableByEvent.set(eventId, data || []);
}

async function invitePlayerToEvent(eventId, userId) {
  if (!requireAdmin() || !supabaseClient) return;
  const { error } = await supabaseClient.rpc("invite_to_event", { p_event_id: eventId, p_user_id: userId });
  if (error) {
    alert(`Nao consegui convidar: ${getPublicGameErrorMessage(error)}`);
    return;
  }
  await loadAvailableForEvent(eventId);
  await loadJoinRequests();
  renderEventsList();
}

function renderJoinRequestRow(row, eventData) {
  const traits = requesterTraits.get(row.user_id) || {};
  const fits = !eventData.publicNeeds || traitsFitNeeds(traits.position, eventData.publicNeeds);
  const traitText = [
    TRAIT_LABELS.position[traits.position],
    TRAIT_LABELS.fitness[traits.fitness],
    traits.age_band ? `${TRAIT_LABELS.age_band[traits.age_band]} anos` : "",
  ].filter(Boolean).join(" · ") || "Sem caracteristicas";
  return `
    <div class="join-request-row">
      <div>
        <strong>${escapeHtml(row.requester_name || "Jogador")}</strong>
        ${eventData.publicNeeds && fits ? `<span class="metric good-pill">Encaixa</span>` : ""}
        <p>${escapeHtml(traitText)}</p>
      </div>
      <div class="roster-actions">
        <button class="mini-btn" data-join-decide="${row.id}" data-accept="true">Aceitar</button>
        <button class="mini-btn" data-join-decide="${row.id}" data-accept="false">Recusar</button>
      </div>
    </div>
  `;
}

// Misto serve para tudo; campo e redes servem para o que dizem.
function traitsFitNeeds(position, needs) {
  if (!position || !needs) return false;
  return position === "mixed" || position === needs;
}

async function saveEventPublicSettings(eventId) {
  if (!requireAdmin()) return;
  const eventData = (state.events || []).find((item) => item.id === eventId);
  if (!eventData) return;
  const visibility = els.eventsList?.querySelector(`[data-event-public-toggle="${eventId}"]`)?.checked ? "public" : "group";
  const needs = els.eventsList?.querySelector(`[data-event-needs="${eventId}"]`)?.value || null;
  const previous = { visibility: eventData.visibility, publicNeeds: eventData.publicNeeds };
  eventData.visibility = visibility;
  eventData.publicNeeds = needs;
  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("events").upsert(eventToRow(eventData));
    if (error) {
      Object.assign(eventData, previous);
      alert(`Nao consegui guardar: ${error.message}`);
      return;
    }
  }
  saveState();
  renderEventsList();
}

async function decideJoinRequest(requestId, accept) {
  if (!requireAdmin() || !supabaseClient) return;
  const row = joinRequests.find((item) => item.id === requestId);
  if (!row) return;
  if (!confirm(`${accept ? "Aceitar" : "Recusar"} ${row.requester_name || "este pedido"}?`)) return;
  const { error } = await supabaseClient.rpc("decide_public_event_request", { p_request_id: requestId, p_accept: accept });
  if (error) {
    alert(`Nao consegui decidir: ${getPublicGameErrorMessage(error)}`);
    return;
  }
  // Ao aceitar entra uma ficha de convidado e a resposta "Vou": volta a carregar o grupo.
  await loadRemoteState();
  render();
}

// Jogos publicos de outros grupos; o painel so aparece quando ha algum.
function renderPublicGames() {
  const panel = document.querySelector("#public-games-panel");
  const list = document.querySelector("#public-games-list");
  if (!panel || !list) return;
  // So o texto: o numero vermelho fica no mesmo botao.
  const subtabLabel = document.querySelector("#public-games-subtab [data-subtab-label]");
  if (subtabLabel) subtabLabel.textContent = publicEvents.length ? `Jogos publicos (${publicEvents.length})` : "Jogos publicos";
  if (!publicEvents.length) {
    list.innerHTML = `<div class="empty-state">${currentSession?.user
      ? "Sem jogos publicos de momento. Quando um grupo abrir um jogo a quem nao e do grupo, aparece aqui."
      : "Entra na tua conta para veres jogos publicos."}</div>`;
    return;
  }
  const hasTraits = Boolean(myTraits?.fitness && myTraits?.position && myTraits?.age_band);
  list.innerHTML = `
    ${hasTraits ? "" : `<div class="hint warn">Para pedires um lugar, preenche primeiro as tuas caracteristicas na Conta.</div>`}
    ${[...publicEvents].sort((a, b) => (b.my_status === "invited") - (a.my_status === "invited")).map((row) => {
      const status = row.my_status;
      const fits = row.needs && traitsFitNeeds(myTraits?.position, row.needs);
      return `
        <article class="event-card public-game-card">
          <div class="event-top">
            <div>
              <p class="eyebrow">${escapeHtml(row.group_name || "Grupo")}</p>
              <h3>${escapeHtml(row.title || "Jogo")}</h3>
              <p>${formatDate(row.starts_at)}${row.location ? ` - ${escapeHtml(row.location)}` : ""}</p>
            </div>
            <strong class="counter">${row.spots_left > 0 ? `Faltam ${row.spots_left}` : "Cheio"}</strong>
          </div>
          <div class="event-counts">
            ${row.needs ? `<span class="metric">Precisam de: ${escapeHtml(NEEDS_LABELS[row.needs] || row.needs)}</span>` : ""}
            ${fits ? `<span class="metric good-pill">Encaixas</span>` : ""}
            ${status === "invited" ? `<span class="metric warn-pill">Convidaram-te</span>` : ""}
            ${status === "pending" ? `<span class="metric warn-pill">Pedido enviado</span>` : ""}
            ${status === "accepted" ? `<span class="metric good-pill">Aceite - contamos contigo</span>` : ""}
          </div>
          <div class="actions">
            ${status === "invited"
              ? `<button class="primary-btn" data-invite-respond="${escapeHtml(row.event_id)}" data-accept="true">Aceitar convite</button>
                 <button class="ghost-btn" data-invite-respond="${escapeHtml(row.event_id)}" data-accept="false">Recusar</button>`
              : status === "pending"
              ? `<button class="ghost-btn" data-public-cancel="${escapeHtml(row.event_id)}">Cancelar pedido</button>`
              : status === "accepted"
                ? ""
                : `<button class="primary-btn" data-public-request="${escapeHtml(row.event_id)}" ${hasTraits && row.spots_left > 0 ? "" : "disabled"}>Estou disponivel</button>`}
          </div>
        </article>
      `;
    }).join("")}
  `;
  list.querySelectorAll("[data-public-request]").forEach((button) => {
    button.addEventListener("click", () => changePublicRequest(button.dataset.publicRequest, true));
  });
  list.querySelectorAll("[data-public-cancel]").forEach((button) => {
    button.addEventListener("click", () => changePublicRequest(button.dataset.publicCancel, false));
  });
  list.querySelectorAll("[data-invite-respond]").forEach((button) => {
    button.addEventListener("click", () => respondToInvite(button.dataset.inviteRespond, button.dataset.accept === "true"));
  });
}

async function respondToInvite(eventId, accept) {
  if (!supabaseClient) return;
  if (!accept && !confirm("Recusar este convite?")) return;
  const { error } = await supabaseClient.rpc("respond_event_invite", { p_event_id: eventId, p_accept: accept });
  if (error) {
    alert(getPublicGameErrorMessage(error));
    return;
  }
  await loadPublicEvents();
  renderPublicGames();
  renderGamesTabBadge();
  renderAdminBadges();
}

async function changePublicRequest(eventId, request) {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.rpc(request ? "request_public_event" : "cancel_public_event_request", { p_event_id: eventId });
  if (error) {
    alert(getPublicGameErrorMessage(error));
    return;
  }
  await loadPublicEvents();
  renderPublicGames();
}

// Caracteristicas da conta: so o admin de um jogo a que pedes para ir as ve.
function renderTraitsPanel() {
  const panel = document.querySelector("#traits-panel");
  if (!panel) return;
  if (!remoteEnabled || !currentSession?.user) {
    panel.innerHTML = "";
    return;
  }
  const select = (field, label) => `
    <label class="game-date-control">
      <span>${label}</span>
      <select data-trait="${field}">
        <option value="">-</option>
        ${Object.entries(TRAIT_LABELS[field]).map(([value, text]) => `<option value="${value}" ${myTraits?.[field] === value ? "selected" : ""}>${text}</option>`).join("")}
      </select>
    </label>
  `;
  panel.innerHTML = `
    <div class="account-card">
      <h3>As minhas caracteristicas</h3>
      <p>Para jogos publicos de outros grupos. So o admin do jogo a que pedes para ir as ve.</p>
      <div class="traits-row">
        ${select("fitness", "Forma")}
        ${select("position", "Posicao")}
        ${select("age_band", "Idade")}
      </div>
      <div class="actions"><button class="primary-btn" data-save-traits>Guardar</button></div>
    </div>
  `;
  panel.querySelector("[data-save-traits]")?.addEventListener("click", saveMyTraits);
}

async function saveMyTraits() {
  if (!supabaseClient || !currentSession?.user) return;
  const panel = document.querySelector("#traits-panel");
  const value = (field) => panel?.querySelector(`[data-trait="${field}"]`)?.value || null;
  const row = {
    user_id: currentSession.user.id,
    fitness: value("fitness"),
    position: value("position"),
    age_band: value("age_band"),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseClient.from("player_traits").upsert(row);
  if (error) {
    alert(`Nao consegui guardar: ${error.message}`);
    return;
  }
  myTraits = row;
  renderTraitsPanel();
  renderPublicGames();
}

function renderEventCard(eventData) {
  const linkedPlayer = getLinkedPlayer();
  const myResponse = linkedPlayer ? getResponseForPlayer(eventData.id, linkedPlayer.id) : null;
  const going = getEventPlayers(eventData.id, "going");
  const maybe = getEventPlayers(eventData.id, "maybe");
  const notGoing = getEventPlayers(eventData.id, "not_going");
  const missing = Math.max(0, eventData.minPlayers - going.length);
  const isFull = going.length >= eventData.maxPlayers;
  const isSelected = eventData.id === currentEventId;
  const eventGame = findGameForEventData(eventData);
  const confirmedGame = eventGame && !isFinishedGame(eventGame) ? eventGame : null;
  const detailsAttrs = (key) => `data-event-details="${eventData.id}:${key}" ${openEventDetails.has(`${eventData.id}:${key}`) ? "open" : ""}`;
  const isCancelled = eventData.status === "cancelled";
  const pendingJoins = isAdmin ? joinRequests.filter((row) => row.event_id === eventData.id && row.status === "pending").length : 0;
  return `
    <article class="event-card ${isSelected ? "selected" : ""}">
      <div class="event-top">
        <div>
          ${isCancelled ? `<p class="eyebrow">Cancelada</p>` : ""}
          <h3>${escapeHtml(eventData.title)}</h3>
          <p>${formatDate(eventData.startsAt)}${eventData.location ? ` - ${escapeHtml(eventData.location)}` : ""}</p>
        </div>
        <strong class="counter">${going.length}/${eventData.maxPlayers}</strong>
      </div>
      <div class="event-counts">
        <span class="metric good-pill">Vou ${going.length}</span>
        <span class="metric">Talvez ${maybe.length}</span>
        <span class="metric">Nao vou ${notGoing.length}</span>
        ${isFull ? `<span class="metric warn-pill">Cheio</span>` : ""}
        <span class="metric ${missing ? "warn-pill" : "good-pill"}">${missing ? `Faltam ${missing}` : "Pronto"}</span>
      </div>
      ${renderResponseActions(eventData, myResponse)}
      <div class="event-roster">
        ${renderRosterMini("Vou", going, eventData, "going")}
        ${renderRosterMini("Talvez", maybe, eventData, "maybe")}
        ${renderRosterMini("Nao vou", notGoing, eventData, "not_going")}
      </div>
      ${confirmedGame ? renderEventTeams(confirmedGame) : ""}
      <div class="actions admin-actions">
        ${isCancelled ? "" : confirmedGame ? `
          <button class="primary-btn" data-event-open-game="${confirmedGame.id}" data-event-id="${eventData.id}">Ver equipas</button>
        ` : `<button class="primary-btn" data-event-generate="${eventData.id}" ${going.length < eventData.minPlayers || going.length > Math.min(eventData.maxPlayers, 12) ? "disabled" : ""}>Fazer equipas</button>`}
        <button class="ghost-btn" data-event-share="${eventData.id}">WhatsApp</button>
      </div>
      <details class="event-more admin-actions" ${detailsAttrs("manage")} ${pendingJoins ? "open" : ""}>
        <summary>Gerir convocatoria${pendingJoins ? ` <span class="subtab-badge">${pendingJoins}</span> ${pendingJoins === 1 ? "pedido para jogar" : "pedidos para jogar"}` : ""}</summary>
        <div class="event-date-edit">
          <label class="game-date-control">
            <span>Data/hora</span>
            <input type="datetime-local" data-event-date-edit="${eventData.id}" value="${toDateTimeLocalInput(eventData.startsAt)}">
          </label>
          <button class="ghost-btn" data-save-event-date="${eventData.id}">Guardar data</button>
        </div>
        ${renderEventAdminAdds(eventData)}
        ${renderEventPublicSection(eventData)}
        <div class="actions">
          ${isCancelled
            ? `<button class="danger-btn" data-event-delete="${eventData.id}">Apagar convocatoria</button>`
            : `<button class="danger-btn" data-event-cancel="${eventData.id}">Cancelar convocatoria</button>`}
        </div>
      </details>
    </article>
  `;
}

function renderResponseActions(eventData, myResponse) {
  if (eventData.status === "cancelled") {
    return `<div class="hint warn">Convocatoria cancelada. Podes apagar esta convocatoria do historico de convocatorias.</div>`;
  }
  const linkedPlayer = getLinkedPlayer();
  if (!currentSession) {
    return `<div class="hint">Entra para responder a esta convocatoria.</div>`;
  }
  if (!linkedPlayer && !isAdmin) {
    return `<div class="hint warn">Associa primeiro a tua conta a um perfil de jogador.</div>`;
  }
  if (isAdmin && !linkedPlayer) {
    return `<div class="hint">Admin sem perfil associado. Podes acompanhar e fazer equipas.</div>`;
  }
  const status = myResponse?.status || "";
  const goingDisabled = status !== "going" && isEventFullForPlayer(eventData, linkedPlayer.id);
  return `
    <div class="response-row">
      <button class="ghost-btn ${status === "going" ? "selected" : ""}" data-event-id="${eventData.id}" data-event-response="going" ${goingDisabled ? "disabled" : ""}>Vou</button>
      <button class="ghost-btn ${status === "maybe" ? "selected" : ""}" data-event-id="${eventData.id}" data-event-response="maybe">Talvez</button>
      <button class="ghost-btn ${status === "not_going" ? "selected" : ""}" data-event-id="${eventData.id}" data-event-response="not_going">Nao vou</button>
      ${goingDisabled ? `<span class="hint warn">Limite de ${eventData.maxPlayers} jogadores atingido.</span>` : ""}
    </div>
  `;
}

function renderRosterMini(label, players, eventData, status) {
  const canAdjust = isAdmin && eventData && !["cancelled", "completed"].includes(eventData.status);
  const nextStatus = status === "going" ? "not_going" : "going";
  const actionLabel = status === "going" ? "Remover" : "Confirmar";
  const isFull = canAdjust && getEventGoingCount(eventData.id) >= eventData.maxPlayers;
  const roster = players.length
    ? players.map((p) => `
      <span class="roster-player-entry">
      <button class="roster-player-chip ${renderCardHaloClass(p)}" data-open-player="${p.id}" type="button">
        ${renderAvatar(p)}
        <span>${escapeHtml(p.name)}</span>
      </button>
      ${canAdjust ? `<button class="mini-btn admin-actions" type="button" data-event-id="${eventData.id}" data-player-id="${p.id}" data-event-admin-response="${nextStatus}" aria-label="${actionLabel} ${escapeHtml(p.name)} na convocatoria" ${nextStatus === "going" && isFull ? 'disabled title="Convocatoria cheia"' : ""}>${actionLabel}</button>` : ""}
      </span>
    `).join("")
    : `<span>-</span>`;
  return `<div><strong>${label}</strong><span class="roster-player-list">${roster}</span></div>`;
}

function renderEventAdminAdds(eventData) {
  if (!isAdmin || eventData.status === "cancelled") return "";
  const isFull = getEventGoingCount(eventData.id) >= eventData.maxPlayers;
  const assignedIds = new Set(getEventResponses(eventData.id).map((response) => response.playerId));
  const availablePlayers = state.players
    .filter((p) => !assignedIds.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return `
    <div class="event-admin-adds admin-actions">
      <div class="add-existing-row">
        <select data-event-add-existing="${eventData.id}">
          <option value="">Adicionar jogador existente</option>
          ${availablePlayers.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} - ${p.overall}</option>`).join("")}
        </select>
        <button class="ghost-btn" data-event-add-existing-btn="${eventData.id}" ${isFull ? "disabled" : ""}>Adicionar como Vou</button>
      </div>
      <div class="add-guest-row">
        <input data-event-guest-name="${eventData.id}" placeholder="Amigo novo">
        <input data-event-guest-score="${eventData.id}" type="number" min="1" max="100" step="1" placeholder="1-100" title="Nota de 1 a 100, obrigatoria para jogadores novos">
        <button class="ghost-btn" data-event-add-guest-btn="${eventData.id}" ${isFull ? "disabled" : ""}>Adicionar convidado</button>
      </div>
      <p class="hint">O convidado fica guardado como jogador para os proximos jogos. Se ja existir, reutilizamos o perfil.</p>
      ${isFull ? `<div class="hint warn">Limite de ${eventData.maxPlayers} jogadores atingido.</div>` : ""}
    </div>
  `;
}

async function saveEventFromForm(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  const title = els.eventTitle.value.trim();
  const startsAt = fromDateTimeLocalInput(els.eventDate.value);
  const location = els.eventLocation.value.trim();
  const maxPlayers = clampNumber(Number(els.eventMaxPlayers.value || 12), 10, 12);
  if (!title || !startsAt) return;

  const eventData = normalizeEventRecord({
    id: `e-${Date.now()}-${slug(title)}`,
    title,
    sport: "futsal",
    startsAt,
    location,
    minPlayers: 10,
    maxPlayers,
    status: "open",
    createdBy: currentSession?.user?.id || null,
  });

  state.events = [eventData, ...(state.events || [])];
  currentEventId = eventData.id;
  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("events").upsert(eventToRow(eventData));
    if (error) {
      alert(`Nao consegui lancar evento: ${error.message}`);
      return;
    }
  }
  saveState();
  els.eventForm.reset();
  els.eventDate.value = toDateTimeLocalInput(defaultEventDate());
  render();
  showView("events");
}

async function saveEventDateFromList(eventId) {
  if (!requireAdmin()) return;
  const input = [...(els.eventsList?.querySelectorAll("[data-event-date-edit]") || [])]
    .find((item) => item.dataset.eventDateEdit === eventId);
  const startsAt = fromDateTimeLocalInput(input?.value);
  if (!startsAt) {
    alert("Escolhe uma data e hora valida.");
    return;
  }
  await updateEventDate(eventId, startsAt);
}

async function updateEventDate(eventId, startsAt) {
  const eventData = (state.events || []).find((item) => item.id === eventId);
  if (!eventData) return false;
  const linkedGame = findGameForEventData(eventData);
  const previousEventDate = eventData.startsAt;
  const previousGameDate = linkedGame?.date || null;

  eventData.startsAt = startsAt;
  if (linkedGame) {
    linkedGame.date = startsAt;
    currentGenerationDateIso = startsAt;
    currentPaymentsMonth = monthKey(startsAt);
  }

  try {
    await persistState();
  } catch (error) {
    eventData.startsAt = previousEventDate;
    if (linkedGame) linkedGame.date = previousGameDate;
    saveState();
    alert(`Nao consegui guardar a nova data: ${error.message}`);
    return false;
  }
  render();
  return true;
}

async function saveEventResponse(eventId, status) {
  if (!currentSession?.user) {
    alert("Entra primeiro para responder.");
    return;
  }
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) {
    alert("Associa primeiro a tua conta a um perfil.");
    showView("account");
    return;
  }

  try {
    await saveEventResponseForPlayer(eventId, linkedPlayer.id, status, currentSession.user.id);
  } catch (error) {
    alert(`Nao consegui guardar resposta: ${formatEventResponseError(error)}`);
    return;
  }
  currentEventId = eventId;
  render();
}

async function saveEventResponseForPlayer(eventId, playerId, status, userId = null) {
  const eventData = (state.events || []).find((item) => item.id === eventId);
  const existing = getResponseForPlayer(eventId, playerId);
  if (eventData && status === "going" && existing?.status !== "going" && getEventGoingCount(eventId, playerId) >= eventData.maxPlayers) {
    throw new Error(`Limite de ${eventData.maxPlayers} jogadores atingido.`);
  }

  const row = {
    event_id: eventId,
    player_id: playerId,
    user_id: userId ?? existing?.userId ?? null,
    status,
    updated_at: new Date().toISOString(),
  };

  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient
      .from("event_responses")
      .upsert(row, { onConflict: "event_id,player_id" });
    if (error) throw error;
    await loadRemoteState();
    return;
  }

  if (existing) {
    existing.status = status;
    existing.updatedAt = row.updated_at;
  } else {
    eventResponses.unshift(responseFromRow({ ...row, id: `r-${Date.now()}-${playerId}` }));
  }
}

async function saveAdminEventResponse(eventId, playerId, status) {
  if (!isAdmin || !requireAdmin()) return;
  const eventData = (state.events || []).find((item) => item.id === eventId);
  if (!eventData || ["cancelled", "completed"].includes(eventData.status) || !findPlayer(playerId)) return;
  if (!["going", "not_going"].includes(status)) return;
  const buttons = [...(els.eventsList?.querySelectorAll("[data-event-admin-response]") || [])]
    .filter((button) => button.dataset.eventId === eventId);
  const previousDisabled = buttons.map((button) => button.disabled);
  if (buttons.some((button) => button.dataset.busy === "true")) return;
  buttons.forEach((button) => { button.disabled = true; button.dataset.busy = "true"; });
  try {
    await saveEventResponseForPlayer(eventId, playerId, status);
    currentEventId = eventId;
    render();
  } catch (error) {
    alert(`Nao consegui ajustar a convocatoria: ${formatEventResponseError(error)}`);
  } finally {
    buttons.forEach((button, index) => { button.disabled = previousDisabled[index]; delete button.dataset.busy; });
  }
}

async function addExistingPlayerToEvent(eventId) {
  if (!requireAdmin()) return;
  const select = els.eventsList?.querySelector(`[data-event-add-existing="${eventId}"]`);
  const playerId = select?.value;
  if (!playerId) return;
  try {
    await saveEventResponseForPlayer(eventId, playerId, "going");
    currentEventId = eventId;
    render();
  } catch (error) {
    alert(`Nao consegui adicionar jogador: ${formatEventResponseError(error)}`);
  }
}

async function addGuestToEvent(eventId) {
  if (!requireAdmin()) return;
  const nameInput = els.eventsList?.querySelector(`[data-event-guest-name="${eventId}"]`);
  const scoreInput = els.eventsList?.querySelector(`[data-event-guest-score="${eventId}"]`);
  const button = els.eventsList?.querySelector(`[data-event-add-guest-btn="${eventId}"]`);
  if (button?.disabled) return;
  if (button) button.disabled = true;
  let guest;
  try {
    guest = await createOrReuseGuestPlayer(nameInput?.value, scoreInput?.value);
    await saveEventResponseForPlayer(eventId, guest.id, "going");
    currentEventId = eventId;
    saveState();
    render();
  } catch (error) {
    const savedMessage = guest ? `O perfil de ${guest.name} ficou guardado. ` : "";
    alert(`${savedMessage}Nao consegui adicionar a convocatoria: ${formatEventResponseError(error)}`);
  } finally {
    if (button) button.disabled = false;
  }
}

function formatEventResponseError(error) {
  if (String(error?.message || "").includes("event_max_players_reached")) {
    return "a convocatoria ja atingiu o limite de jogadores.";
  }
  return error?.message || "erro inesperado.";
}

function shareEventOnWhatsApp(eventId) {
  const eventData = (state.events || []).find((item) => item.id === eventId);
  if (!eventData) return;
  const going = getEventPlayers(eventId, "going");
  const maybe = getEventPlayers(eventId, "maybe");
  const notGoing = getEventPlayers(eventId, "not_going");
  const missing = Math.max(0, eventData.minPlayers - going.length);
  const appUrl = getShareAppUrl();
  const lines = [
    `Convocatoria: ${eventData.title}`,
    formatDate(eventData.startsAt),
    eventData.location ? `Local: ${eventData.location}` : "",
    "",
    `Confirmados: ${going.length}/${eventData.maxPlayers}`,
    `Vou: ${going.length ? going.map((p) => p.name).join(", ") : "-"}`,
    maybe.length ? `Talvez: ${maybe.map((p) => p.name).join(", ")}` : "",
    notGoing.length ? `Nao vou: ${notGoing.map((p) => p.name).join(", ")}` : "",
    missing ? `Faltam ${missing} para fechar o minimo.` : "Ja temos minimo para jogar.",
    "",
    `Responder aqui: ${appUrl}`,
  ].filter(Boolean);

  const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
  window.open(url, "_blank", "noopener");
}

function shareTeamsOnWhatsApp() {
  const game = getCurrentGame();
  if (!game) return;
  const eventData = game.status === "preview" ? getCurrentEvent() : findEventForGame(game);
  const title = eventData?.title || game.title || "";
  const teamLine = (label, ids) => {
    const players = hydrate(ids);
    return `${label} (${players.length}): ${players.map((p) => p.name).join(", ") || "-"}`;
  };
  const lines = [
    title ? `Equipas: ${title}` : "Equipas",
    formatDate(game.date),
    eventData?.location ? `Local: ${eventData.location}` : "",
    "",
    teamLine("Equipa A", [...(game.teamA || []), ...getBenchA(game)]),
    teamLine("Equipa B", [...(game.teamB || []), ...getBenchB(game)]),
    "",
    `Ver no Footer: ${getShareAppUrl()}`,
  ].filter((line, index, all) => line || all[index - 1]);

  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener");
}

function getShareAppUrl() {
  if (location.protocol === "file:" || location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    return "https://kre-master.github.io/footer/";
  }
  return location.href.split("#")[0];
}

async function updateEventStatus(eventId, status) {
  if (!requireAdmin()) return;
  const eventData = state.events.find((item) => item.id === eventId);
  if (!eventData) return;
  if (status === "cancelled" && !confirm(`Cancelar a convocatoria "${eventData.title}"?`)) return;
  eventData.status = status;
  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("events").upsert(eventToRow(eventData));
    if (error) {
      alert(`Nao consegui atualizar evento: ${error.message}`);
      return;
    }
  }
  saveState();
  render();
}

async function deleteEvent(eventId) {
  if (!requireAdmin()) return;
  const eventData = state.events.find((item) => item.id === eventId);
  if (!eventData) return;
  if (!confirm(`Apagar definitivamente a convocatoria "${eventData.title}"?`)) return;

  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("events").delete().eq("id", eventId);
    if (error) {
      alert(`Nao consegui apagar convocatoria: ${error.message}`);
      return;
    }
  }

  state.events = (state.events || []).filter((item) => item.id !== eventId);
  eventResponses = eventResponses.filter((response) => response.eventId !== eventId);
  if (currentEventId === eventId) {
    currentEventId = getNextEvent()?.id || state.events[0]?.id || null;
  }
  saveState();
  render();
}

function loadCurrentEventGoingPlayers(options = {}) {
  const eventData = getCurrentEvent();
  if (!eventData) {
    setHint("Ainda nao ha convocatoria para carregar.", "warn");
    showView("today");
    return;
  }
  const goingPlayers = getEventPlayers(eventData.id, "going");
  selectedIds = new Set(goingPlayers.map((p) => p.id));
  currentEventId = eventData.id;
  currentGameId = null;
  previewGame = null;
  currentSuggestions = [];
  finishingGame = false;
  setGameDateInput(eventData.startsAt);
  showView("today");
  render();
  setHint(`${goingPlayers.length} confirmados carregados da convocatoria "${eventData.title}".`, goingPlayers.length >= 10 && goingPlayers.length <= 12 ? "good" : "warn");
  if (options.autoGenerate) {
    generateAndRenderSuggestions({ autoPreviewBest: true });
  }
}

async function requestPlayerClaim(playerId) {
  if (!remoteEnabled || !supabaseClient || !currentSession?.user) {
    alert("Entra primeiro para reclamar um perfil.");
    return;
  }

  const playerData = findPlayer(playerId);
  if (!playerData || playerData.linkedUserId) {
    alert("Este perfil ja esta associado.");
    return;
  }

  const { error } = await supabaseClient.from("player_claims").insert({
    user_id: currentSession.user.id,
    player_id: playerId,
    status: "pending",
  });

  if (error) {
    alert(`Nao consegui criar o pedido: ${error.message}`);
    return;
  }

  await loadAccountState();
  updateAccessUi();
  render();
}

async function reviewPlayerClaim(claimId, status) {
  if (!isAdmin || !supabaseClient) return;
  const claim = playerClaims.find((item) => item.id === claimId);
  if (!claim) return;

  const updates = {
    status,
    reviewed_at: new Date().toISOString(),
    reviewed_by: currentSession?.user?.id || null,
  };
  const { error: claimError } = await supabaseClient
    .from("player_claims")
    .update(updates)
    .eq("id", claimId);
  if (claimError) {
    alert(`Nao consegui atualizar o pedido: ${claimError.message}`);
    return;
  }

  if (status === "approved") {
    const playerIndex = state.players.findIndex((p) => p.id === claim.player_id);
    if (playerIndex >= 0) {
      state.players = state.players.map((playerData) => ({
        ...playerData,
        linkedUserId: playerData.id === claim.player_id
          ? claim.user_id
          : playerData.linkedUserId === claim.user_id
            ? null
            : playerData.linkedUserId,
      }));
      const { error: unlinkError } = await scopeToActiveGroup(supabaseClient
        .from("players")
        .update({ linked_user_id: null, updated_at: new Date().toISOString() })
        .eq("linked_user_id", claim.user_id)
        .neq("id", claim.player_id));
      if (unlinkError) {
        alert(`Nao consegui limpar ligacoes antigas: ${unlinkError.message}`);
        return;
      }
      await persistState();
    }
    await supabaseClient
      .from("player_claims")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentSession?.user?.id || null,
      })
      .eq("player_id", claim.player_id)
      .eq("status", "pending")
      .neq("id", claimId);
  }

  await loadAccountState();
  await loadRemoteState();
  updateAccessUi();
  render();
}

// Em cima ficam so os que vao a jogo; o resto da base fica escondido em "Adicionar outro jogador".
function renderPlayerList() {
  if (!els.playerList) return;
  const query = normalize(els.playerSearch?.value || "");
  const byRating = (a, b) => b.overall - a.overall || a.name.localeCompare(b.name);
  const selectedPlayers = state.players.filter((p) => selectedIds.has(p.id)).sort(byRating);
  const otherPlayers = state.players
    .filter((p) => !selectedIds.has(p.id) && normalize(p.name).includes(query))
    .sort(byRating);

  els.playerList.innerHTML = selectedPlayers.map(renderPlayerChip).join("")
    || `<div class="hint">Ninguem selecionado. Usa os confirmados da convocatoria ou adiciona jogadores abaixo.</div>`;
  if (els.otherPlayerList) {
    els.otherPlayerList.innerHTML = otherPlayers.map(renderPlayerChip).join("")
      || `<div class="hint">Sem jogadores para adicionar.</div>`;
  }
  if (els.otherPlayers && !selectedPlayers.length) els.otherPlayers.open = true;

  [els.playerList, els.otherPlayerList].filter(Boolean).forEach((list) => {
    list.querySelectorAll("[data-select-player]").forEach((input) => {
      input.addEventListener("change", (event) => {
        if (event.target.checked) {
          selectedIds.add(event.target.dataset.selectPlayer);
        } else {
          selectedIds.delete(event.target.dataset.selectPlayer);
        }
        renderPlayerList();
      });
    });
    list.querySelectorAll("[data-open-player]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openPlayerProfile(button.dataset.openPlayer);
      });
    });
  });

  const count = selectedIds.size;
  els.selectedCount.textContent = `${count}/12`;
  els.selectionHint.className = "hint";
  if (count < 10) {
    els.selectionHint.textContent = `Faltam ${10 - count} jogadores para fazer equipas.`;
  } else if (count > 12) {
    els.selectionHint.textContent = "No maximo 12 jogadores por jogo.";
    els.selectionHint.classList.add("warn");
  } else {
    els.selectionHint.textContent = `${count} jogadores vao a jogo. Pronto para fazer equipas.`;
    els.selectionHint.classList.add("good");
  }
}

function renderPlayerChip(p) {
  const selected = selectedIds.has(p.id);
  const form = getPlayerForm(p);
  const variant = getPlayerCardVariant(p, form);
  return `
    <label class="player-chip ${renderCardHaloClass(p, variant)} ${selected ? "selected" : ""}">
      <input type="checkbox" data-select-player="${p.id}" ${selected ? "checked" : ""}>
      <button class="player-open-link" data-open-player="${p.id}" type="button">${renderAvatar(p)}</button>
      <button class="player-meta player-open-link" data-open-player="${p.id}" type="button">
        <strong>${escapeHtml(p.name)}</strong>
        <span>${p.isGuest ? "Convidado" : "Jogador"} - PAC ${p.pace} - DEF ${p.defending} - PHY ${p.physical}</span>
      </button>
      ${renderRatingBadge(p, form)}
    </label>
  `;
}

function normalizeGuestPlayerName(name) {
  return String(name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-PT").trim().replace(/\s+/g, " ");
}

async function createOrReuseGuestPlayer(rawName, rawScore) {
  if (!canWriteOfficialData()) throw new Error("So o admin pode guardar jogadores.");
  const name = String(rawName || "").trim().replace(/\s+/g, " ");
  const key = normalizeGuestPlayerName(name);
  if (!key) throw new Error("Escreve o nome do jogador.");
  if (pendingGuestPlayers.has(key)) return pendingGuestPlayers.get(key);

  const operation = (async () => {
    let players = state.players;
    if (remoteEnabled) {
      if (!supabaseClient) throw new Error("Sem ligacao ao Supabase. Tenta novamente.");
      const { data, error } = await scopeToActiveGroup(supabaseClient.from("players").select("*"));
      if (error) throw error;
      players = (data || []).map(playerFromRow);
    }
    const matches = players.filter((p) => normalizeGuestPlayerName(p.name) === key);
    if (matches.length > 1) {
      throw new Error("Ha varios perfis com este nome. Seleciona o jogador existente na lista.");
    }

    let playerData = matches[0];
    if (!playerData) {
      const score = rawScore === null || rawScore === undefined || String(rawScore).trim() === "" ? NaN : Number(rawScore);
      if (!Number.isFinite(score) || score < 1 || score > 100) {
        throw new Error("Para um jogador novo, indica uma nota entre 1 e 100.");
      }
      const overall = Math.round(score);
      playerData = { id: `p-${createUuid()}`, name, pace: overall, shooting: overall,
        passing: overall, dribbling: overall, defending: overall, physical: overall,
        overall, photoDataUrl: "", linkedUserId: null, isGuest: false, guestScore0To10: overall / 10 };
      if (remoteEnabled) {
        const { data, error } = await supabaseClient.from("players")
          .insert(playerToRow(playerData)).select("*").single();
        if (error) throw error;
        playerData = playerFromRow(data);
      }
    } else if (playerData.isGuest) {
      if (remoteEnabled) {
        const { data, error } = await supabaseClient.from("players")
          .update({ is_guest: false, updated_at: new Date().toISOString() })
          .eq("id", playerData.id).select("*").single();
        if (error) throw error;
        playerData = playerFromRow(data);
      } else {
        playerData = { ...playerData, isGuest: false };
      }
    }
    const index = state.players.findIndex((p) => p.id === playerData.id);
    if (index < 0) state.players.push(playerData);
    else state.players[index] = playerData;
    saveState();
    return playerData;
  })();

  pendingGuestPlayers.set(key, operation);
  try {
    return await operation;
  } finally {
    pendingGuestPlayers.delete(key);
  }
}

async function addGuest() {
  if (!requireAdmin() || els.addGuest.disabled) return;
  els.addGuest.disabled = true;
  try {
    const guest = await createOrReuseGuestPlayer(els.guestName.value, els.guestScore.value);
    selectedIds.add(guest.id);
    els.guestName.value = "";
    els.guestScore.value = "";
    render();
    setHint(`${guest.name} selecionado. Perfil guardado para os proximos jogos.`, "good");
  } catch (error) {
    setHint(`Nao consegui adicionar jogador: ${formatEventResponseError(error)}`, "warn");
  } finally {
    els.addGuest.disabled = false;
  }
}

function setHint(message, level) {
  els.selectionHint.textContent = message;
  els.selectionHint.className = `hint ${level || ""}`.trim();
}

function generateAndRenderSuggestions(options = {}) {
  ensureGameDateInput();
  previewGame = null;
  currentGameId = null;
  renderCurrentGame();

  const selected = getSelectedPlayers();
  if (selected.length < 10 || selected.length > 12) {
    currentSuggestions = [];
    renderCurrentGame();
    setHint("Seleciona entre 10 e 12 jogadores para fazer equipas.", "warn");
    return;
  }

  currentSuggestions = generateSuggestions(selected, state.games).slice(0, 6);
  currentSuggestionIndex = 0;
  finishingGame = false;
  if (!currentSuggestions.length) {
    setHint("Nao encontrei uma divisao valida.", "warn");
    return;
  }
  previewSuggestion(0);
}

function shuffleTeams() {
  const game = getCurrentGame();
  if (!currentSuggestions.length || (game && game.status !== "preview")) {
    generateAndRenderSuggestions();
    return;
  }
  currentSuggestionIndex = (currentSuggestionIndex + 1) % currentSuggestions.length;
  previewSuggestion(currentSuggestionIndex);
}

function getTeamFormStats(players) {
  return players.reduce((stats, playerData) => {
    const form = getPlayerForm(playerData);
    stats.totalAdjustment += form.adjustment;
    stats[form.levelKey] = (stats[form.levelKey] || 0) + 1;
    return stats;
  }, { totalAdjustment: 0, hot: 0, good: 0, normal: 0, bad: 0, recovery: 0 });
}

function getFormBalancePenalty(teamA, teamB) {
  const a = getTeamFormStats(teamA);
  const b = getTeamFormStats(teamB);
  const strongDiff = Math.abs((a.hot + a.good) - (b.hot + b.good));
  const weakDiff = Math.abs((a.bad + a.recovery) - (b.bad + b.recovery));
  const adjustmentDiff = Math.abs(a.totalAdjustment - b.totalAdjustment);
  return strongDiff * 5 + weakDiff * 7 + adjustmentDiff * 1.5;
}

function generateSuggestions(players, games) {
  const pairHistory = buildPairHistory(games);
  const teamHistory = buildTeamHistory(games);
  const suggestions = [];
  const seen = new Set();

  const teamASize = Math.floor(players.length / 2);
  const teamCombos = combinations(players, teamASize);
  for (const teamA of teamCombos) {
    const teamAIds = new Set(teamA.map((p) => p.id));
    const teamB = players.filter((p) => !teamAIds.has(p.id));
    const keyA = keyForIds(teamA);
    const keyB = keyForIds(teamB);
    const divisionKey = [keyA, keyB].sort().join("|");
    if (seen.has(divisionKey)) continue;
    seen.add(divisionKey);

    const ratingOptions = { ratingFor: getPlayerRatingForBalance };
    const teamAStats = getTeamStats(teamA, ratingOptions);
    const teamBStats = getTeamStats(teamB, ratingOptions);
    const diffTotal = Math.abs(teamAStats.total - teamBStats.total);
    const squadDiff = Math.abs(teamAStats.average - teamBStats.average);
    const attrDiff =
      Math.abs(teamAStats.attack - teamBStats.attack) +
      Math.abs(teamAStats.defense - teamBStats.defense) * 1.25 +
      Math.abs(teamAStats.physical - teamBStats.physical) +
      Math.abs(teamAStats.pace - teamBStats.pace) * 0.7;
    const pairPenalty = sameTeamPairPenalty(teamA, pairHistory) + sameTeamPairPenalty(teamB, pairHistory);
    const exactPenalty = (teamHistory.get(keyA) || 0) * 12 + (teamHistory.get(keyB) || 0) * 12;
    const historyPenalty = Math.round(pairPenalty + exactPenalty);
    const formPenalty = getFormBalancePenalty(teamA, teamB);
    const score = diffTotal * 3 + squadDiff * 1.7 + attrDiff * 0.45 + historyPenalty + formPenalty;

    suggestions.push({
      teamA,
      teamB,
      benchA: [],
      benchB: [],
      teamAStats,
      teamBStats,
      squadAStats: teamAStats,
      squadBStats: teamBStats,
      diffTotal,
      squadDiff,
      historyPenalty,
      formPenalty: Number(formPenalty.toFixed(2)),
      score: Number(score.toFixed(2)),
    });
  }

  return suggestions.sort((a, b) => a.score - b.score || a.diffTotal - b.diffTotal || a.squadDiff - b.squadDiff);
}

function getBenchSplits(bench) {
  if (!bench.length) return [{ benchA: [], benchB: [] }];
  if (bench.length === 1) return [{ benchA: bench, benchB: [] }, { benchA: [], benchB: bench }];

  const splits = [];
  const minA = Math.floor(bench.length / 2);
  const maxA = Math.ceil(bench.length / 2);
  for (let size = minA; size <= maxA; size += 1) {
    combinations(bench, size).forEach((benchA) => {
      const benchAIds = new Set(benchA.map((p) => p.id));
      const benchB = bench.filter((p) => !benchAIds.has(p.id));
      splits.push({ benchA, benchB });
    });
  }
  return splits;
}

function getThirdWorstPlayer(players) {
  return [...players].sort((a, b) => a.overall - b.overall || a.name.localeCompare(b.name))[2] || players[0];
}

function createGameFromSuggestion(suggestion, options = {}) {
  return {
    id: options.id || `preview-${Date.now()}`,
    date: options.date || getGenerationDateIso(),
    status: options.status || "preview",
    teamA: suggestion.teamA.map((p) => p.id),
    teamB: suggestion.teamB.map((p) => p.id),
    benchA: suggestion.benchA.map((p) => p.id),
    benchB: suggestion.benchB.map((p) => p.id),
    scoreA: null,
    scoreB: null,
    notes: "",
  };
}

function previewSuggestion(index) {
  const suggestion = currentSuggestions[index];
  if (!suggestion) return;

  previewGame = createGameFromSuggestion(suggestion, { date: getGenerationDateIso() });
  currentGameId = null;
  renderCurrentGame();
  const optionText = currentSuggestions.length > 1 ? ` (divisao ${index + 1} de ${currentSuggestions.length})` : "";
  setHint(`Equipas no campo${optionText}. Ajusta se for preciso e confirma.`, "good");
}

function ensureGameDateInput() {
  if (!els.gameDate || els.gameDate.value) return;
  setGameDateInput(currentGenerationDateIso || new Date().toISOString());
}

function setGameDateInput(value) {
  if (!els.gameDate || !value) return;
  const iso = normalizeGenerationDate(value);
  if (!iso) return;
  currentGenerationDateIso = iso;
  els.gameDate.value = toDateTimeLocalInput(iso);
}

function getGenerationDateIso() {
  ensureGameDateInput();
  syncGenerationDateFromInput();
  return currentGenerationDateIso || new Date().toISOString();
}

function normalizeGenerationDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function syncGenerationDateFromInput() {
  const iso = fromDateTimeLocalInput(els.gameDate?.value);
  if (iso) {
    currentGenerationDateIso = iso;
  }
  return currentGenerationDateIso;
}

async function updatePreviewGameDate(event) {
  const iso = syncGenerationDateFromInput();
  const game = getCurrentGame();
  if (!game || !iso) return;
  if (previewGame || game.status === "preview") {
    game.date = iso;
    if (previewGame) previewGame.date = iso;
    renderCurrentGame();
    return;
  }
  if (event?.type === "input") return;
  await updateGameDate(game.id, iso);
}

async function confirmPreviewGame() {
  if (!requireAdmin()) return;
  const game = getCurrentGame();
  if (!game) return;
  const officialGame = {
    ...ensureGameShape({ ...game }),
    id: `game-${Date.now()}`,
    status: game.scoreA == null || game.scoreB == null ? "open" : "finished",
  };
  state.games.unshift(officialGame);
  currentGameId = officialGame.id;
  previewGame = null;
  await persistState();
  selectedIds.clear();
  currentSuggestions = [];
  finishingGame = false;
  render();
  setHint("Equipas confirmadas. Envia-as para o WhatsApp.", "good");
}

function startFinishingGame() {
  if (!requireAdmin()) return;
  finishingGame = getCurrentGame()?.id || false;
  renderCurrentGame();
  els.scoreA?.focus();
}

// Ecra do jogo por etapas: equipas por confirmar -> confirmadas (WhatsApp) -> terminar e inserir resultado.
function renderCurrentGame() {
  const game = getCurrentGame();
  const hasGame = Boolean(game);
  const isPreview = hasGame && game.status === "preview";
  els.currentGameEmpty.classList.toggle("hidden", hasGame);
  els.currentGame.classList.toggle("hidden", !hasGame);
  els.exportImage.disabled = !hasGame;
  if (els.confirmGame) els.confirmGame.disabled = !isPreview;
  els.teamMakerActions?.classList.toggle("hidden", hasGame && !isPreview);
  if (els.shuffleTeams) els.shuffleTeams.disabled = !isPreview || currentSuggestions.length < 2;
  if (els.gamePanelTitle) {
    els.gamePanelTitle.textContent = !hasGame || isPreview ? "Equipas" : isFinishedGame(game) ? "Jogo terminado" : "Equipas confirmadas";
  }
  if (!game) return;

  els.stepConfirm?.classList.toggle("hidden", !isPreview);
  els.stepDate?.classList.toggle("hidden", !isPreview);
  els.stepShare?.classList.toggle("hidden", isPreview && isAdmin);
  els.stepFinish?.classList.toggle("hidden", isPreview);
  const isFinishing = finishingGame === game.id;
  els.finishGame?.classList.toggle("hidden", isFinishing || isFinishedGame(game));
  els.scoreRow?.classList.toggle("hidden", !isFinishing && !isFinishedGame(game));

  if (game.date && document.activeElement !== els.gameDate) {
    setGameDateInput(game.date);
  }
  els.scoreA.value = game.scoreA ?? "";
  els.scoreB.value = game.scoreB ?? "";
  els.fieldCard.innerHTML = renderField(game);
  bindMvpPanelActions(game);
  renderRosterEditor(game);
  renderAddPlayerSelect(game);
}

function renderMvpPanel(game) {
  if (game.scoreA == null || game.scoreB == null) return "";
  const participants = hydrate(getGamePlayerIds(game));
  const linkedPlayer = getLinkedPlayer();
  const canVote = linkedPlayer && participants.some((p) => p.id === linkedPlayer.id);
  const counts = getMvpVoteCountsForGame(game.id);
  const totalVotes = getMvpTotalVotes(game.id);
  const votingClosed = isMvpVotingClosed(game);
  const winners = votingClosed ? getOfficialMvpWinners(counts) : [];
  const myVote = linkedPlayer ? getMvpVoteForPlayer(game.id, linkedPlayer.id) : null;
  const lockAt = getMvpLockAt(game);
  const statusText = votingClosed
    ? "Votacao fechada"
    : totalVotes < MVP_MIN_VOTES
      ? `${totalVotes} votos (min. ${MVP_MIN_VOTES})`
      : lockAt ? `Fecha ${formatDate(lockAt.toISOString())}` : `${totalVotes} votos`;
  return `
    <section class="mvp-panel">
      <div>
        <p class="eyebrow">MVP interno</p>
        <strong>${winners.length ? winners.map((p) => escapeHtml(p.name)).join(", ") : statusText}</strong>
        ${renderMvpAdminVoteBreakdown(game, counts)}
      </div>
      ${canVote && myVote ? `
        <span class="metric good-pill">Voto registado</span>
      ` : canVote && remoteEnabled ? `
        <span class="metric">Completa o questionário pós-jogo no topo.</span>
      ` : canVote ? `
        <select data-mvp-candidate="${game.id}">
          <option value="">Escolher MVP</option>
          ${participants.filter((p) => p.id !== linkedPlayer.id).map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("")}
        </select>
        <button class="ghost-btn" data-save-mvp-vote="${game.id}">Votar</button>
      ` : `<span class="metric">So participantes votam</span>`}
      ${renderPostgameAdminInsights(game)}
    </section>
  `;
}

function renderPostgameAdminInsights(game) {
  if (!isAdmin) return "";
  const rows = gameFeedback.filter((item) => item.gameId === game.id);
  if (!rows.length) return `<div class="postgame-admin"><strong>Respostas pós-jogo</strong><span>0 respostas</span></div>`;
  const intensity = FooterMonthly.average(rows.map((item) => item.gameIntensity));
  const energy = FooterMonthly.average(rows.map((item) => item.remainingEnergy));
  return `<div class="postgame-admin"><strong>Respostas pós-jogo · ${rows.length}</strong><span>Jogo ${intensity.toFixed(1)}/10 · Forma percebida ${energy.toFixed(1)}/10</span><div>${rows.map((item) => `<small>${escapeHtml(findPlayer(item.playerId)?.name || "Jogador")}: jogo ${item.gameIntensity}, forma ${item.remainingEnergy}</small>`).join("")}</div></div>`;
}

function getLatestFinishedGame() {
  return [...state.games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}

function getPostgameRollout() {
  return featureRollouts.find((item) => item.key === "postgame_feedback") || (() => {
    const transition = getLatestFinishedGame();
    return transition ? { key: "postgame_feedback", activatedAt: transition.date, transitionGameId: transition.id } : null;
  })();
}

function getPrivateWeightKey(playerId) { return `footer-weight-${currentSession?.user?.id || "local"}-${playerId}`; }
function getPlayerWeight(playerId, effectiveDate = new Date().toISOString()) {
  const dateKey = String(effectiveDate).slice(0, 10);
  const stored = privateWeightHistory
    .filter((item) => item.playerId === playerId && item.effectiveFrom <= dateKey)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom) || new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (stored) return stored.weightKg;
  const value = Number(localStorage.getItem(getPrivateWeightKey(playerId)) || "75");
  return Number.isFinite(value) && value >= 35 && value <= 200 ? value : 75;
}
async function savePrivateWeight(playerId, weightKg) {
  localStorage.setItem(getPrivateWeightKey(playerId), String(weightKg));
  if (remoteEnabled && supabaseClient && currentSession?.user) {
    const row = { player_id: playerId, user_id: currentSession.user.id, weight_kg: weightKg, effective_from: todayInputDate() };
    const { data, error } = await supabaseClient.from("player_private_metrics").insert(row).select().single();
    if (error) {
      alert(`O peso ficou guardado neste dispositivo, mas ainda nao no Supabase. Executa monthly-recap-migration.sql. Detalhe: ${error.message}`);
      return false;
    }
    const normalized = normalizePrivateMetricRecord(data);
    if (normalized) privateWeightHistory.push(normalized);
  }
  renderMonthlyRecap();
  return true;
}
function getPreviousMonthKey() { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - 1); return monthKey(date); }
function getMonthlyGames(playerId, key) { return getFinishedGames().filter((game) => monthKey(game.date) === key && getPlayerParticipation(game, playerId)); }
function getMonthlyRecapData(playerId, key) {
  const games = getMonthlyGames(playerId, key);
  const awards = [];
  const alreadySeen = new Set();
  getFinishedGamesAsc().filter((game) => monthKey(game.date) < key).forEach((game) => getAwardsUnlockedByGame(playerId, game).forEach((award) => alreadySeen.add(award.key)));
  games.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).forEach((game) => getAwardsUnlockedByGame(playerId, game).forEach((award) => {
    const isFirst = !alreadySeen.has(award.key);
    awards.push({ ...award, gameId: game.id, date: game.date, isFirst });
    alreadySeen.add(award.key);
  }));
  const feedback = games.map((game) => gameFeedback.find((item) => item.gameId === game.id && item.playerId === playerId)).filter(Boolean);
  const activeMinutes = games.reduce((sum, game) => {
    const participation = getPlayerParticipation(game, playerId);
    const squadSize = participation ? getGameSidePlayerIds(game, participation.side).length : 5;
    return sum + FooterMonthly.activeMinutesForSquad(squadSize);
  }, 0);
  const avgIntensity = FooterMonthly.average(feedback.map((item) => item.gameIntensity));
  const avgEnergy = FooterMonthly.average(feedback.map((item) => item.remainingEnergy));
  const calories = games.reduce((sum, game) => {
    const participation = getPlayerParticipation(game, playerId);
    const squadSize = participation ? getGameSidePlayerIds(game, participation.side).length : 5;
    const minutes = FooterMonthly.activeMinutesForSquad(squadSize);
    const answer = feedback.find((item) => item.gameId === game.id);
    return sum + FooterMonthly.estimateCalories({ weightKg: getPlayerWeight(playerId, game.date), minutes, met: FooterMonthly.metForIntensity(answer?.gameIntensity) });
  }, 0);
  const outcomes = games.map((game) => { const participation = getPlayerParticipation(game, playerId); return participation ? getPlayerOutcome(game, participation.side) : "open"; });
  const wins = outcomes.filter((outcome) => outcome === "win").length;
  const draws = outcomes.filter((outcome) => outcome === "draw").length;
  const losses = outcomes.filter((outcome) => outcome === "loss").length;
  const mvps = games.filter((game) => getOfficialMvpIdsForGame(game).has(playerId)).length;
  const teamGamesInMonth = getFinishedGames().filter((game) => monthKey(game.date) === key).length;
  return { games, wins, draws, losses, attendedAll: Boolean(teamGamesInMonth && games.length === teamGamesInMonth), awards, firstAwards: awards.filter((award) => award.isFirst), repeatedAwards: awards.filter((award) => !award.isFirst), mvps, activeMinutes, calories, feedback, avgIntensity, avgEnergy };
}
function getMonthlyMessage(data) {
  if (!data.games.length) return "Este mês passaste ao lado — até o banco sentiu a tua falta.";
  if (data.wins === data.games.length) return `Perfeito: ${data.games.length} jogos, ${data.games.length} vitórias. O balneário está a pedir autógrafos.`;
  if (data.losses === data.games.length) return `${data.games.length} jogos, ${data.games.length} derrotas. Pelo menos a consistência esteve lá.`;
  if (data.games.length === 1) return "Uma aparição especial. Tipo concerto esgotado, mas com chuteiras.";
  if (data.attendedAll) return `Não falhaste um jogo. As pernas podem discordar, mas a folha de presenças confirma.`;
  return `${data.wins} vitórias em ${data.games.length} jogos. Nem sempre Champions, mas raramente Velhinhos.`;
}
function renderMonthlyRecap() {
  if (!els.monthlyPanel) return;
  const playerData = getLinkedPlayer();
  if (!playerData) { els.monthlyPanel.innerHTML = `<div class="empty-state">Liga a tua conta a um jogador para veres o teu resumo.</div>`; return; }
  const months = [...new Set(getFinishedGames().filter((game) => getPlayerParticipation(game, playerData.id)).map((game) => monthKey(game.date)))].sort().reverse();
  if (!currentMonthlyMonth || !months.includes(currentMonthlyMonth)) currentMonthlyMonth = months[0] || monthKey(new Date());
  if (els.monthlyMonth) { els.monthlyMonth.innerHTML = months.map((key) => `<option value="${key}" ${key === currentMonthlyMonth ? "selected" : ""}>${formatMonthLabel(key)}</option>`).join(""); els.monthlyMonth.disabled = !months.length; }
  if (!months.length) { els.monthlyPanel.innerHTML = `<div class="empty-state">Ainda não há um mês com jogos teus.</div>`; return; }
  const data = getMonthlyRecapData(playerData.id, currentMonthlyMonth);
  const year = Number(currentMonthlyMonth.slice(0, 4));
  const gamesInYear = getFinishedGames().filter((game) => new Date(game.date).getFullYear() === year).sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstMonthIndex = gamesInYear.length ? new Date(gamesInYear[0].date).getMonth() : 0;
  const now = new Date();
  const lastMonthIndex = year === now.getFullYear() ? now.getMonth() : 11;
  const yearMonths = Array.from({ length: Math.max(1, lastMonthIndex - firstMonthIndex + 1) }, (_, index) => `${year}-${String(firstMonthIndex + index + 1).padStart(2, "0")}`);
  els.monthlyPanel.innerHTML = `
    <section class="monthly-hero"><p class="eyebrow">${formatMonthLabel(currentMonthlyMonth)}</p><h3>${escapeHtml(getMonthlyMessage(data))}</h3><div class="monthly-hero-stats"><span>${data.games.length} jogos</span><span>${data.wins}V · ${data.draws}E · ${data.losses}D</span><span>${data.mvps} MVP${data.mvps === 1 ? "" : "s"}</span></div></section>
    <div class="monthly-stat-grid"><article><strong>${Math.round(data.activeMinutes)} min</strong><span>atividade estimada</span></article><article><strong>${data.calories} kcal</strong><span>estimadas com ${getPlayerWeight(playerData.id)} kg</span></article><article><strong>${data.avgIntensity == null ? "—" : `${data.avgIntensity.toFixed(1)}/10`}</strong><span>Velhinhos ↔ Champions</span></article><article><strong>${data.avgEnergy == null ? "—" : `${data.avgEnergy.toFixed(1)}/10`}</strong><span>forma física percebida</span></article></div>
    <section class="monthly-section"><h3>Cartas recebidas</h3><p>${data.firstAwards.length} novas pela primeira vez · ${data.repeatedAwards.length} repetidas</p><div class="award-grid">${data.awards.length ? data.awards.map((award) => renderAwardShowcaseCard(playerData, award)).join("") : `<div class="empty-state compact">Nenhuma carta este mês — ainda.</div>`}</div></section>
    <section class="monthly-section"><h3>${year} desde o primeiro jogo</h3><p>Altura da barra: presenças. Ponto: forma física percebida.</p><div class="monthly-bars">${yearMonths.map((key) => { const monthData = getMonthlyRecapData(playerData.id, key); const height = Math.min(100, monthData.games.length * 20); const energy = monthData.avgEnergy == null ? null : monthData.avgEnergy * 10; return `<button class="monthly-bar" aria-label="${formatMonthLabel(key)}: ${monthData.games.length} jogos${monthData.avgEnergy == null ? ", sem resposta de forma física" : `, forma física ${monthData.avgEnergy.toFixed(1)} em 10`}" style="--bar-height:${height}%;--energy-height:${energy ?? 0}%" data-month-select="${key}"><span></span>${energy == null ? "" : `<i aria-hidden="true"></i>`}<small>${key.slice(5)}</small></button>`; }).join("")}</div></section>`;
  els.monthlyPanel.querySelectorAll("[data-month-select]").forEach((button) => button.addEventListener("click", () => { currentMonthlyMonth = button.dataset.monthSelect; renderMonthlyRecap(); }));
  bindAwardDetailCards(els.monthlyPanel, playerData, data.awards);
  maybeOpenMonthlyRecap(playerData.id, currentMonthlyMonth, months, data);
}
// ---- Revisao do mes: abre quando o mes acabou e todos os jogos tem resultado e MVP fechado ----
function getMonthReviewStatus(key) {
  const games = state.games
    .filter((game) => monthKey(game.date) === key)
    .map((game) => ({
      date: game.date,
      finished: isFinishedGame(game) && hasValidFinalScore(game),
      // O MVP fecha quando passa o prazo de votacao, mesmo com poucos votos, ou quando ja ha um MVP oficial.
      mvpClosed: getOfficialMvpIdsForGame(game).size > 0 || Boolean(getMvpLockAt(game) && Date.now() >= getMvpLockAt(game).getTime()),
      closedAt: getMvpLockAt(game)?.toISOString() || game.date,
    }));
  return FooterMonthReview.reviewStatus({ key, games });
}

function getReadyReviewMonths(playerId) {
  return getProfileMonths(playerId).filter((key) => getMonthReviewStatus(key).ready);
}

function getShortMonthName(key) {
  const [year, month] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "long" }).format(new Date(year, month - 1, 1));
}

function getMonthReviewData(playerData, key) {
  const period = getProfilePeriodData(playerData.id, `month:${key}`);
  const s = period.summary;
  const prevKey = FooterMonthReview.previousKey(key);
  const prevSummary = getProfilePeriodData(playerData.id, `month:${prevKey}`).summary;
  const kmOf = (summary) => (summary.trackedGames && summary.distance.totalM != null ? summary.distance.totalM / 1000 : null);
  const awards = getPeriodAwards(playerData.id, period.games);
  const moment = getProfileMomentTarget(s.maxSpeed.gameId, s.maxSpeed.atS) ? { gameId: s.maxSpeed.gameId, atS: s.maxSpeed.atS } : null;
  const effort = getPeriodEffort(playerData, period);
  return {
    playerName: playerData.name,
    monthTitle: formatMonthLabel(key),
    message: getMonthlyMessage(getMonthlyRecapData(playerData.id, key)),
    played: s.played,
    teamGames: s.teamGames,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    mvps: s.mvps,
    tracked: {
      games: s.trackedGames,
      distanceKm: kmOf(s),
      paceMpm: s.pace.value,
      maxSpeedKmh: s.maxSpeed.value,
      sprints: s.sprints.total,
      passes: s.passes.total,
      status: { distance: s.distance.status, pace: s.pace.status, maxSpeed: s.maxSpeed.status, sprints: s.sprints.status, passes: s.passes.status },
      moment,
    },
    previous: prevSummary.played ? {
      label: getShortMonthName(prevKey),
      played: prevSummary.played,
      distanceKm: kmOf(prevSummary),
      paceMpm: prevSummary.trackedGames ? prevSummary.pace.value : null,
      maxSpeedKmh: prevSummary.trackedGames ? prevSummary.maxSpeed.value : null,
      sprints: prevSummary.trackedGames ? prevSummary.sprints.total : null,
      passes: prevSummary.trackedGames ? prevSummary.passes.total : null,
    } : null,
    awards: { count: awards.length, firstCount: awards.filter((award) => award.isFirst).length },
    effort,
    facts: period.facts,
  };
}

function renderMonthReviewCard(playerData) {
  const months = getReadyReviewMonths(playerData.id);
  if (!months.length) return "";
  const [latest, ...others] = months;
  return `
    <section class="pp-review">
      <button type="button" class="pp-review-open" data-month-review="${latest}">
        <span class="pp-review-eyebrow">Revisão do mês</span>
        <strong>${escapeHtml(formatMonthLabel(latest))}</strong>
        <span class="pp-review-cta">Ver a minha revisão <i aria-hidden="true">›</i></span>
      </button>
      ${others.length ? `
        <label class="pp-review-others">
          <span class="sr-only">Outros meses</span>
          <select data-month-review-pick>
            <option value="">Outros meses</option>
            ${others.map((key) => `<option value="${key}">${escapeHtml(formatMonthLabel(key))}</option>`).join("")}
          </select>
        </label>` : ""}
    </section>`;
}

function renderReviewSlide(slide, index) {
  const status = slide.status && slide.status !== "measured" ? FooterInsights.statusText(slide.status) : null;
  return `
    <section class="mr-slide mr-tone-${slide.tone}" data-slide="${index}" aria-label="${escapeHtml(slide.eyebrow || slide.title || "")}">
      <div class="mr-slide-inner">
        ${slide.eyebrow ? `<p class="mr-eyebrow">${escapeHtml(slide.eyebrow)}</p>` : ""}
        ${slide.big != null ? `<p class="mr-big">${escapeHtml(slide.big)}<small>${escapeHtml(slide.unit || "")}</small></p>` : ""}
        ${slide.title ? `<h2 class="mr-title">${escapeHtml(slide.title)}</h2>` : ""}
        ${slide.caption ? `<p class="mr-caption">${escapeHtml(slide.caption)}</p>` : ""}
        ${slide.delta ? `<p class="mr-delta">${escapeHtml(slide.delta)}</p>` : ""}
        ${status ? `<span class="mr-tag">Beta · ${escapeHtml(status)}</span>` : ""}
        ${slide.action ? `<button type="button" class="mr-action" data-review-action="${slide.action.type}" ${slide.action.gameId ? `data-game="${escapeHtml(slide.action.gameId)}" data-at="${slide.action.atS}"` : ""}>${escapeHtml(slide.action.label)}</button>` : ""}
      </div>
    </section>`;
}

let monthReviewKeyHandler = null;

function closeMonthReview() {
  els.monthReview?.classList.add("hidden");
  document.body.classList.remove("mr-open");
  if (monthReviewKeyHandler) window.removeEventListener("keydown", monthReviewKeyHandler);
  monthReviewKeyHandler = null;
}

function openMonthReview(playerId, key) {
  const playerData = findPlayer(playerId);
  if (!els.monthReview || !playerData || !getMonthReviewStatus(key).ready) return;
  const slides = FooterMonthReview.buildSlides(getMonthReviewData(playerData, key));
  els.monthReview.innerHTML = `
    <button type="button" class="mr-close" data-review-close aria-label="Fechar">&times;</button>
    <div class="mr-track" tabindex="0">${slides.map(renderReviewSlide).join("")}</div>
    <button type="button" class="mr-nav mr-prev" data-review-step="-1" aria-label="Anterior">‹</button>
    <button type="button" class="mr-nav mr-next" data-review-step="1" aria-label="Seguinte">›</button>
    <div class="mr-dots" aria-hidden="true">${slides.map((_, index) => `<i class="${index ? "" : "active"}"></i>`).join("")}</div>`;
  els.monthReview.classList.remove("hidden");
  document.body.classList.add("mr-open");

  const track = els.monthReview.querySelector(".mr-track");
  const dots = [...els.monthReview.querySelectorAll(".mr-dots i")];
  const current = () => Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
  const goTo = (index) => track.scrollTo({ left: Math.max(0, Math.min(slides.length - 1, index)) * track.clientWidth, behavior: "smooth" });
  track.addEventListener("scroll", () => {
    const active = current();
    dots.forEach((dot, index) => dot.classList.toggle("active", index === active));
  }, { passive: true });
  els.monthReview.querySelector("[data-review-close]").addEventListener("click", closeMonthReview);
  els.monthReview.querySelectorAll("[data-review-step]").forEach((button) => button.addEventListener("click", () => goTo(current() + Number(button.dataset.reviewStep))));
  els.monthReview.querySelectorAll("[data-review-action]").forEach((button) => button.addEventListener("click", () => {
    closeMonthReview();
    if (button.dataset.reviewAction === "profile") {
      profilePeriod = `month:${key}`;
      openPlayerProfile(playerData.id);
      return;
    }
    openSpeedMoment(button.dataset.game, Number(button.dataset.at));
  }));
  monthReviewKeyHandler = (event) => {
    if (event.key === "Escape") closeMonthReview();
    if (event.key === "ArrowRight") goTo(current() + 1);
    if (event.key === "ArrowLeft") goTo(current() - 1);
  };
  window.addEventListener("keydown", monthReviewKeyHandler);
  track.focus({ preventScroll: true });
}

// Aviso unico quando a revisao do mes anterior fica pronta; depois fica sempre no perfil.
function maybeOpenMonthlyRecap(playerId, key, months, data) {
  if (key !== getPreviousMonthKey() || !months.includes(key) || !data.games.length || !els.monthlyAutoGate) return;
  if (!getMonthReviewStatus(key).ready) return;
  if (getPendingPostgameCheckins().length || getPendingOfficialMvpRevealRequirement() || getPendingAwardRevealRequirement()) return;
  const storageKey = `footer-monthly-open-${playerId}-${key}`;
  if (localStorage.getItem(storageKey)) return;
  localStorage.setItem(storageKey, "1");
  els.monthlyAutoGate.classList.remove("hidden"); document.body.classList.add("mvp-gate-open");
  els.monthlyAutoGate.innerHTML = `<div class="mvp-gate-card"><p class="eyebrow">A tua revisão de ${escapeHtml(getShortMonthName(key))} está pronta</p><h2>${escapeHtml(getMonthlyMessage(data))}</h2><p>${data.games.length} jogos · ${data.wins} vitórias</p><button class="primary-btn" data-open-monthly>Ver a minha revisão</button></div>`;
  els.monthlyAutoGate.querySelector("[data-open-monthly]").addEventListener("click", () => {
    els.monthlyAutoGate.classList.add("hidden");
    document.body.classList.remove("mvp-gate-open");
    openMonthReview(playerId, key);
  });
}

function getPendingPostgameCheckins() {
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) return [];
  const rollout = getPostgameRollout();
  const transitionGame = rollout?.transitionGameId ? state.games.find((item) => item.id === rollout.transitionGameId) : null;
  const rolloutTime = rollout?.activatedAt ? Date.parse(rollout.activatedAt) : Infinity;
  const pending = getFinishedGamesDesc(state.games).filter((game) => {
    if (!getPlayerParticipation(game, linkedPlayer.id)) return false;
    const hasVote = Boolean(getMvpVoteForPlayer(game.id, linkedPlayer.id));
    const hasFeedback = gameFeedback.some((item) => item.gameId === game.id && item.playerId === linkedPlayer.id);
    const gameTime = Date.parse(game.date);
    const isTransitionGame = Boolean(transitionGame && game.id === transitionGame.id);
    const isAfterRollout = Number.isFinite(gameTime) && gameTime >= rolloutTime && !isTransitionGame;
    const isBeforeRollout = Number.isFinite(gameTime) && gameTime < rolloutTime && !isTransitionGame;
    return PostgameRules.isCheckinRequired({ hasVote, hasFeedback, isTransitionGame, isAfterRollout, isBeforeRollout });
  }).map((game) => {
    const participants = hydrate(getGamePlayerIds(game));
    const existingVote = getMvpVoteForPlayer(game.id, linkedPlayer.id);
    return { game, linkedPlayer, existingVote, candidates: participants.filter((playerData) => playerData.id !== linkedPlayer.id) };
  }).filter((item) => item.existingVote || item.candidates.length);
  return pending.sort((a, b) => new Date(a.game.date) - new Date(b.game.date) || String(a.game.id).localeCompare(String(b.game.id)));
}

function renderMvpVoteGate() {
  if (!els.mvpGate) return;
  const pendingCheckins = getPendingPostgameCheckins();
  const requirement = pendingCheckins[0] || null;
  document.body.classList.toggle("mvp-gate-open", Boolean(requirement) || !els.monthlyAutoGate?.classList.contains("hidden"));
  els.mvpGate.classList.toggle("hidden", !requirement);
  if (!requirement) {
    els.mvpGate.innerHTML = "";
    if (renderOfficialMvpRevealGate()) return;
    renderAwardRevealGate();
    return;
  }

  const { game, candidates, existingVote } = requirement;
  els.mvpGate.innerHTML = `
    <div class="mvp-gate-card">
      <p class="eyebrow">Fecho do jogo · 1 de ${pendingCheckins.length}</p>
      <h2>${existingVote ? "Conta como foi o jogo" : "Vota no MVP e conta como foi o jogo"}</h2>
      <p>${formatDate(game.date)} - ${game.scoreA} - ${game.scoreB}</p>
      ${existingVote ? `<p class="hint">O teu voto MVP já está registado e será mantido.</p>` : `<select data-gate-mvp-candidate="${game.id}">
        <option value="">Escolher MVP</option>
        ${candidates.map((playerData) => `<option value="${playerData.id}">${escapeHtml(playerData.name)}</option>`).join("")}
      </select>`}
      ${renderPostgameScale("intensity", PostgameRules.INTENSITY_SCALE)}
      ${renderPostgameScale("energy", PostgameRules.ENERGY_SCALE)}
      <button class="primary-btn" data-gate-save-postgame="${game.id}" disabled>Guardar e continuar</button>
      <span class="hint">O voto MVP e confidencial. As respostas ficam visiveis apenas para ti e para o admin.</span>
    </div>
  `;

  const select = els.mvpGate.querySelector(`[data-gate-mvp-candidate="${game.id}"]`);
  const saveButton = els.mvpGate.querySelector("[data-gate-save-postgame]");
  const updateSaveState = () => {
    const intensity = els.mvpGate.querySelector('[data-scale-button="intensity"][aria-checked="true"]');
    const energy = els.mvpGate.querySelector('[data-scale-button="energy"][aria-checked="true"]');
    saveButton.disabled = !((existingVote || select?.value) && intensity && energy);
  };
  select?.addEventListener("change", updateSaveState);
  els.mvpGate.querySelectorAll("[data-scale-button]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.scaleButton;
    els.mvpGate.querySelectorAll(`[data-scale-button="${key}"]`).forEach((item) => { item.setAttribute("aria-checked", "false"); item.classList.remove("selected"); });
    button.setAttribute("aria-checked", "true");
    button.classList.add("selected");
    updateSaveState();
  }));
  els.mvpGate.querySelector("[data-gate-save-postgame]")?.addEventListener("click", async () => {
    const linkedPlayer = getLinkedPlayer();
    const candidateId = existingVote ? null : select?.value;
    const intensityButton = els.mvpGate.querySelector('[data-scale-button="intensity"][aria-checked="true"]');
    const energyButton = els.mvpGate.querySelector('[data-scale-button="energy"][aria-checked="true"]');
    if (!linkedPlayer || (!existingVote && !candidateId) || !intensityButton || !energyButton) {
      const missingControl = !existingVote && !candidateId ? select : !intensityButton ? els.mvpGate.querySelector('[data-scale-button="intensity"]') : els.mvpGate.querySelector('[data-scale-button="energy"]');
      missingControl?.focus();
      return;
    }
    const intensity = Number(intensityButton.dataset.value);
    const energy = Number(energyButton.dataset.value);
    saveButton.disabled = true;
    saveButton.textContent = "A guardar...";
    const ok = await submitPostgameCheckin(game, linkedPlayer, candidateId, intensity, energy);
    if (ok) render();
    else { saveButton.textContent = "Tentar novamente"; updateSaveState(); }
  });
}

function renderPostgameScale(key, scale) {
  return `<fieldset class="postgame-scale"><legend>${escapeHtml(scale.question)}</legend><div class="postgame-scale-options" role="radiogroup" aria-label="${escapeHtml(scale.question)}">${Array.from({ length: 10 }, (_, index) => { const value = index + 1; const anchor = scale.anchors[value]; return `<button type="button" role="radio" aria-checked="false" aria-label="${value}${anchor ? `, ${escapeHtml(anchor)}` : ""}" data-scale-button="${key}" data-value="${value}">${value}</button>`; }).join("")}</div><small>1 ${escapeHtml(scale.anchors[1])} · 5 ${escapeHtml(scale.anchors[5])} · 10 ${escapeHtml(scale.anchors[10])}</small></fieldset>`;
}

async function submitPostgameCheckin(game, linkedPlayer, candidateId, gameIntensity, remainingEnergy) {
  const participants = new Set(getGamePlayerIds(game));
  const existingVote = linkedPlayer ? getMvpVoteForPlayer(game.id, linkedPlayer.id) : null;
  if (!linkedPlayer || !participants.has(linkedPlayer.id)) return false;
  if (!existingVote && (!candidateId || linkedPlayer.id === candidateId || !participants.has(candidateId))) return false;
  if (!PostgameRules.isScaleValue(gameIntensity) || !PostgameRules.isScaleValue(remainingEnergy)) return false;
  if (gameFeedback.some((item) => item.gameId === game.id && item.playerId === linkedPlayer.id)) return false;
  if (remoteEnabled && supabaseClient && currentSession?.user) {
    const { error } = await supabaseClient.rpc("submit_postgame_checkin", { p_game_id: game.id, p_candidate_player_id: existingVote ? null : candidateId, p_game_intensity: gameIntensity, p_remaining_energy: remainingEnergy });
    if (error) { alert(`Nao consegui guardar o fecho do jogo. Confirma a migration do Supabase. Detalhe: ${error.message}`); return false; }
    await loadRemoteState();
    return true;
  }
  const now = new Date().toISOString();
  const feedback = { id: createUuid(), gameId: game.id, playerId: linkedPlayer.id, userId: currentSession?.user?.id || null, gameIntensity, remainingEnergy, calculationVersion: 1, createdAt: now };
  if (!existingVote) {
    const vote = { id: createUuid(), gameId: game.id, voterPlayerId: linkedPlayer.id, candidatePlayerId: candidateId, userId: currentSession?.user?.id || null, createdAt: now, updatedAt: now };
    gameMvpVotes.push(vote);
    incrementMvpVoteCount(game.id, candidateId);
  }
  gameFeedback.push(feedback); saveState(); updateAccessUi(); return true;
}

function getPendingAwardRevealRequirement() {
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) return null;
  const seen = getSeenAwardReveals();
  const game = getFinishedGamesDesc(state.games)
    .find((item) => getPlayerParticipation(item, linkedPlayer.id));
  if (!game || !getMvpVoteForPlayer(game.id, linkedPlayer.id)) return null;
  const awards = getAwardsUnlockedByGame(linkedPlayer.id, game)
    .filter((award) => !seen.has(getAwardRevealKey(linkedPlayer.id, game.id, award.key)));
  return awards.length ? { playerData: linkedPlayer, game, awards, seen } : null;
}

function getPendingOfficialMvpRevealRequirement() {
  const linkedPlayer = getLinkedPlayer();
  if (!linkedPlayer) return null;
  const game = getFinishedGamesDesc(state.games)
    .find((item) => getPlayerParticipation(item, linkedPlayer.id));
  if (!game || !isMvpVotingClosed(game)) return null;
  const mvpIds = getOfficialMvpIdsForGame(game);
  if (!mvpIds.has(linkedPlayer.id)) return null;
  const seen = getSeenAwardReveals();
  const revealKey = getAwardRevealKey(linkedPlayer.id, game.id, "official_mvp");
  if (seen.has(revealKey)) return null;
  const variantKey = getMvpStreakCardKey(linkedPlayer.id, game);
  const variant = PLAYER_CARD_VARIANTS[variantKey] || PLAYER_CARD_VARIANTS.mvp;
  return { playerData: linkedPlayer, game, variant, seen, revealKey };
}

function renderOfficialMvpRevealGate() {
  if (!els.mvpGate) return false;
  const requirement = getPendingOfficialMvpRevealRequirement();
  if (!requirement) return false;
  document.body.classList.add("mvp-gate-open");
  els.mvpGate.classList.remove("hidden");
  const { playerData, game, variant, seen, revealKey } = requirement;
  els.mvpGate.innerHTML = `
    <div class="award-reveal-card mvp-reveal-card">
      <p class="eyebrow">MVP interno</p>
      <h2>Foste eleito MVP</h2>
      <p>${formatDate(game.date)} - ${game.scoreA} - ${game.scoreB}</p>
      <div class="award-reveal-track single">
        <article class="award-reveal-item">
          ${renderPlayerCard(playerData, { mode: "award", variant })}
          <div class="award-reveal-copy">
            <strong class="award-reveal-title">${escapeHtml(variant.label)}</strong>
            <p class="award-reveal-description">Foste eleito MVP deste jogo pelos votos fechados.</p>
            ${renderAwardContext(playerData.id, variant, { game })}
          </div>
        </article>
      </div>
      <button class="primary-btn" data-dismiss-mvp-reveal>Continuar</button>
    </div>
  `;
  els.mvpGate.querySelector("[data-dismiss-mvp-reveal]")?.addEventListener("click", () => {
    seen.add(revealKey);
    saveSeenAwardReveals(seen);
    render();
  });
  return true;
}

function renderAwardRevealGate() {
  if (!els.mvpGate) return;
  const requirement = getPendingAwardRevealRequirement();
  if (!requirement) return;
  document.body.classList.add("mvp-gate-open");
  els.mvpGate.classList.remove("hidden");
  const { playerData, game, awards, seen } = requirement;
  els.mvpGate.innerHTML = `
    <div class="award-reveal-card">
      <p class="eyebrow">Carta desbloqueada</p>
      <h2>${awards.length > 1 ? "Novas cartas desbloqueadas" : "Nova carta desbloqueada"}</h2>
      ${awards.length > 1 ? `<p class="award-reveal-count" data-award-reveal-count>${awards.length} cartas desbloqueadas</p>` : ""}
      <p>${formatDate(game.date)}</p>
      <div class="award-reveal-track" aria-label="Cartas desbloqueadas">
        ${awards.map((award) => renderAwardRevealItem(playerData, award, game)).join("")}
      </div>
      <button class="primary-btn" data-dismiss-award-reveal>Continuar</button>
    </div>
  `;
  els.mvpGate.querySelector("[data-dismiss-award-reveal]")?.addEventListener("click", () => {
    awards.forEach((award) => seen.add(getAwardRevealKey(playerData.id, game.id, award.key)));
    saveSeenAwardReveals(seen);
    render();
  });
}

function renderAwardRevealItem(playerData, award, game = null) {
  return `
    <article class="award-reveal-item">
      ${renderPlayerCard(playerData, { mode: "award", variant: award })}
      <div class="award-reveal-copy">
        <strong class="award-reveal-title">${escapeHtml(award.label)}</strong>
        <p class="award-reveal-description">${escapeHtml(award.description)}</p>
        ${renderAwardContext(playerData.id, award, { game })}
      </div>
    </article>
  `;
}

function countMvpVotes(votes) {
  const counts = new Map();
  votes.forEach((vote) => counts.set(vote.candidatePlayerId, (counts.get(vote.candidatePlayerId) || 0) + 1));
  return counts;
}

function getMvpVoteCountsForGame(gameId) {
  if (!gameId) return new Map();
  if (remoteEnabled && currentSession?.user) {
    const counts = new Map();
    mvpVoteCounts
      .filter((row) => row.gameId === gameId)
      .forEach((row) => counts.set(row.candidatePlayerId, row.voteCount));
    return counts;
  }
  return countMvpVotes(gameMvpVotes.filter((vote) => vote.gameId === gameId));
}

function getMvpTotalVotes(gameId) {
  return [...getMvpVoteCountsForGame(gameId).values()].reduce((sum, count) => sum + count, 0);
}

function getMvpVoteForPlayer(gameId, playerId) {
  return gameMvpVotes.find((vote) => vote.gameId === gameId && vote.voterPlayerId === playerId) || null;
}

function incrementMvpVoteCount(gameId, candidatePlayerId) {
  const index = mvpVoteCounts.findIndex((row) => row.gameId === gameId && row.candidatePlayerId === candidatePlayerId);
  if (index >= 0) {
    mvpVoteCounts[index] = { ...mvpVoteCounts[index], voteCount: mvpVoteCounts[index].voteCount + 1 };
  } else {
    mvpVoteCounts.push({ gameId, candidatePlayerId, voteCount: 1 });
  }
}

function getOfficialMvpWinners(counts) {
  const entries = [...counts.entries()];
  const totalVotes = entries.reduce((sum, [, count]) => sum + count, 0);
  if (totalVotes < MVP_MIN_VOTES) return [];
  const max = Math.max(...entries.map(([, count]) => count));
  return entries.filter(([, count]) => count === max).map(([id]) => findPlayer(id)).filter(Boolean);
}

function getMvpLockAt(game) {
  const referenceDate = game?.scoreSavedAt || game?.date;
  if (!referenceDate) return null;
  const time = new Date(referenceDate).getTime();
  if (Number.isNaN(time)) return null;
  return new Date(time + MVP_LOCK_HOURS * 60 * 60 * 1000);
}

function hasMinimumMvpVotes(game) {
  return getMvpTotalVotes(game?.id) >= MVP_MIN_VOTES;
}

function isMvpVotingClosed(game) {
  const lockAt = getMvpLockAt(game);
  return Boolean(lockAt && hasMinimumMvpVotes(game) && Date.now() >= lockAt.getTime());
}

function renderMvpAdminVoteBreakdown(game, counts) {
  if (!isAdmin || !counts.size) return "";
  const rows = [...counts.entries()]
    .map(([playerId, count]) => ({ playerData: findPlayer(playerId), count }))
    .filter((item) => item.playerData)
    .sort((a, b) => b.count - a.count || a.playerData.name.localeCompare(b.playerData.name));
  if (!rows.length) return "";
  return `
    <div class="mvp-breakdown admin-only">
      ${rows.map((item) => `<span>${escapeHtml(item.playerData.name)}: <strong>${item.count}</strong></span>`).join("")}
    </div>
  `;
}

function bindMvpPanelActions(game, root = els.fieldCard) {
  root?.querySelector("[data-save-mvp-vote]")?.addEventListener("click", async () => {
    const linkedPlayer = getLinkedPlayer();
    const select = root.querySelector(`[data-mvp-candidate="${game.id}"]`);
    const candidateId = select?.value;
    if (!linkedPlayer || !candidateId) return;
    const ok = await saveMvpVote(game, linkedPlayer, candidateId);
    if (ok) {
      if (currentHistoryGameId === game.id) renderHistoryGameDetail();
      else renderCurrentGame();
    }
  });
}

async function saveMvpVote(game, linkedPlayer, candidateId) {
  const participants = new Set(getGamePlayerIds(game));
  if (!linkedPlayer || !candidateId || linkedPlayer.id === candidateId) return false;
  if (!participants.has(linkedPlayer.id) || !participants.has(candidateId)) return false;

  let vote = getMvpVoteForPlayer(game.id, linkedPlayer.id);
  if (vote) {
    alert("O teu voto MVP ja foi registado e nao pode ser alterado.");
    return false;
  } else {
    vote = {
      id: createUuid(),
      gameId: game.id,
      voterPlayerId: linkedPlayer.id,
      candidatePlayerId: candidateId,
      userId: currentSession?.user?.id || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const previousVotes = [...gameMvpVotes];
    gameMvpVotes.push(vote);
    try {
      await persistMvpVote(vote);
      incrementMvpVoteCount(game.id, candidateId);
    } catch (error) {
      gameMvpVotes = previousVotes;
      saveState();
      alert(`Nao consegui guardar voto MVP. Confirma se executaste o schema.sql no Supabase. Detalhe: ${error.message}`);
      return false;
    }
  }
  return true;
}

function renderField(game, options = {}) {
  const teamA = hydrate(game.teamA);
  const teamB = hydrate(game.teamB);
  const benchA = hydrate(getBenchA(game));
  const benchB = hydrate(getBenchB(game));
  const squadA = [...teamA, ...benchA];
  const squadB = [...teamB, ...benchB];
  const result = game.scoreA == null || game.scoreB == null ? "vs" : `${game.scoreA} - ${game.scoreB}`;
  const date = formatDate(game.date);
  const radar = renderTeamRadarChart(squadA, squadB, { inlineOdds: Boolean(options.radarInlineOdds) });
  const radarPosition = options.radarPosition || "top";

  return `
    <div class="field-head">
      <div>
        <strong>Equipa A</strong>
      </div>
      <div class="score-block">
        <span>${date}</span>
        <strong>${result}</strong>
      </div>
      <div class="right">
        <strong>Equipa B</strong>
      </div>
    </div>
    ${radarPosition === "top" ? radar : ""}
    <div class="pitch">
      ${orderTeamForField(squadA).map((p, i) => renderDot(p, "team-a", getPosition("a", i, squadA.length), game, options)).join("")}
      ${orderTeamForField(squadB).map((p, i) => renderDot(p, "team-b", getPosition("b", i, squadB.length), game, options)).join("")}
    </div>
    ${renderMvpPanel(game)}
    ${radarPosition === "bottom" ? radar : ""}
  `;
}

function renderDot(playerData, teamClass, pos, game = null, options = {}) {
  const form = getPlayerForm(playerData);
  const variant = getPlayerCardVariant(playerData, form, game);
  const playerAttr = options.clickablePlayers ? ` data-open-field-player="${playerData.id}" role="button" tabindex="0"` : "";
  return `
    <div class="player-dot ${teamClass} card-variant-${variant.key}"${playerAttr} style="left:${pos.x}%;top:${pos.y}%;--field-offset-x:${pos.offsetXPx || 0}px">
      ${renderPlayerCard(playerData, { mode: "field", form, variant })}
    </div>
  `;
}

function getGameResultText(game) {
  return game.scoreA == null || game.scoreB == null ? "Resultado em aberto" : `${game.scoreA} - ${game.scoreB}`;
}

function getPlayerResultText(game, side) {
  if (game.scoreA == null || game.scoreB == null) return "Resultado em aberto";
  return side === "B" ? `${game.scoreB} - ${game.scoreA}` : `${game.scoreA} - ${game.scoreB}`;
}

function renderPlayerCard(playerData, options = {}) {
  const form = options.form || getPlayerForm(playerData);
  const variant = options.variant || getPlayerCardVariant(playerData, form);
  const mode = options.mode || "field";
  const rating = canSeeCurrentRatings() ? form.currentRating : playerData.overall;
  return `
    <article class="player-card player-card-${mode} card-variant-${variant.key}" style="--card-bg: url('${variant.asset}')">
      <div class="card-rating">
        <strong>${rating}</strong>
      </div>
      <div class="card-photo">
        ${renderPlayerCardPhoto(playerData)}
      </div>
      <strong class="card-name">${escapeHtml(shortName(playerData.name, mode === "profile" ? 15 : 11))}</strong>
    </article>
  `;
}

function renderPlayerCardPhoto(playerData) {
  if (playerData.photoDataUrl) {
    return `<img src="${escapeHtml(playerData.photoDataUrl)}" alt="">`;
  }
  return `<span>${escapeHtml(initials(playerData.name))}</span>`;
}

function orderTeamForField(players) {
  const remaining = [...players];
  if (remaining.length <= 5) return orderFiveForField(remaining);
  const takeBest = (scoreFn) => {
    let bestIndex = 0;
    for (let i = 1; i < remaining.length; i += 1) {
      if (scoreFn(remaining[i]) > scoreFn(remaining[bestIndex])) bestIndex = i;
    }
    return remaining.splice(bestIndex, 1)[0];
  };

  const backOne = takeBest((p) => p.defending * 2 + p.physical + p.overall * 0.1);
  const backTwo = takeBest((p) => p.defending * 1.6 + p.physical * 1.2 + p.passing * 0.3);
  const wingOne = takeBest((p) => p.dribbling * 2 + p.passing + p.pace * 0.4);
  const wingTwo = takeBest((p) => p.dribbling * 2 + p.passing + p.pace * 0.4);
  const frontOne = takeBest((p) => p.shooting * 2 + p.dribbling + p.overall * 0.2);
  const frontTwo = takeBest((p) => p.shooting * 1.4 + p.pace + p.dribbling * 0.8);

  return [backOne, backTwo, wingOne, wingTwo, frontOne, frontTwo, ...remaining].filter(Boolean);
}

function orderFiveForField(players) {
  const remaining = [...players];
  const takeBest = (scoreFn) => {
    let bestIndex = 0;
    for (let i = 1; i < remaining.length; i += 1) {
      if (scoreFn(remaining[i]) > scoreFn(remaining[bestIndex])) bestIndex = i;
    }
    return remaining.splice(bestIndex, 1)[0];
  };

  const defender = takeBest((p) => p.defending * 2 + p.physical + p.overall * 0.1);
  const wingOne = takeBest((p) => p.dribbling * 2 + p.passing + p.pace * 0.4);
  const wingTwo = takeBest((p) => p.dribbling * 2 + p.passing + p.pace * 0.4);
  const shooter = takeBest((p) => p.shooting * 2 + p.dribbling + p.overall * 0.2);
  const support = remaining[0];

  return [defender, wingOne, wingTwo, shooter, support].filter(Boolean);
}

function renderBenchCards(label, players, teamClass, game = null) {
  if (!players.length) return `<span class="bench-empty">${label}: sem suplente</span>`;
  return players.map((p) => `
    <div class="bench-card">
      ${renderDot(p, teamClass, { x: 50, y: 50 }, game).replace("player-dot", "player-dot bench-dot")}
      <span class="bench-label">${label}</span>
    </div>
  `).join("");
}

function renderAvatar(playerData) {
  if (playerData.photoDataUrl) {
    return `<img class="avatar" src="${escapeHtml(playerData.photoDataUrl)}" alt="">`;
  }
  return `<span class="avatar avatar-fallback">${escapeHtml(initials(playerData.name))}</span>`;
}

function getPosition(side, index, teamSize = 5) {
  const leftFive = [
    { x: 11, y: 50 },
    { x: 27, y: 18 },
    { x: 27, y: 82 },
    { x: 41, y: 38, offsetXPx: -12 },
    { x: 41, y: 62, offsetXPx: -12 },
  ];
  const leftSix = [
    { x: 14, y: 38 },
    { x: 14, y: 62 },
    { x: 28, y: 20 },
    { x: 28, y: 80 },
    { x: 42, y: 38, offsetXPx: -12 },
    { x: 42, y: 62, offsetXPx: -12 },
    { x: 35, y: 50, offsetXPx: -12 },
  ];
  const left = teamSize > 5 ? leftSix : leftFive;
  const right = left.map((p) => ({ x: 100 - p.x, y: p.y, offsetXPx: p.offsetXPx ? Math.abs(p.offsetXPx) : 0 }));
  return (side === "a" ? left : right)[index] || { x: side === "a" ? 45 : 55, y: 50 };
}

function renderRosterEditor(game) {
  const groups = getRosterEditorGroups(game);

  els.rosterEditor.innerHTML = groups.map(([key, label]) => {
    const players = hydrate(game[key]);
    return `
      <div class="roster-column">
        <h4>${label} (${players.length})</h4>
        ${players.map((p) => renderRosterRow(p, key)).join("") || `<p class="eyebrow">Vazio</p>`}
      </div>
    `;
  }).join("");

  els.rosterEditor.querySelectorAll("[data-move-player]").forEach((button) => {
    button.addEventListener("click", () => movePlayerInGame(button.dataset.movePlayer, button.dataset.toGroup));
  });
  els.rosterEditor.querySelectorAll("[data-remove-player]").forEach((button) => {
    button.addEventListener("click", () => removePlayerFromGame(button.dataset.removePlayer));
  });
}

// Jogos antigos podem ter suplentes; so mostramos essas colunas quando tem jogadores.
function getRosterEditorGroups(game) {
  return [
    ["teamA", "Equipa A"],
    ["teamB", "Equipa B"],
    ["benchA", "Supl. A"],
    ["benchB", "Supl. B"],
  ].filter(([key]) => key === "teamA" || key === "teamB" || (game[key] || []).length);
}

function getRosterMoveActions(currentGroup) {
  if (currentGroup === "teamA") return [["teamB", "Passar para B"]];
  if (currentGroup === "teamB") return [["teamA", "Passar para A"]];
  return [["teamA", "Para A"], ["teamB", "Para B"]];
}

function renderRosterRow(playerData, currentGroup) {
  const actions = getRosterMoveActions(currentGroup);

  return `
    <div class="roster-row">
      <div class="roster-row-head">
        <strong>${renderAvatar(playerData)} ${escapeHtml(playerData.name)} - ${playerData.overall}</strong>
        <button class="roster-remove" type="button" data-remove-player="${playerData.id}" aria-label="Remover ${escapeHtml(playerData.name)}" title="Remover">&times;</button>
      </div>
      <div class="roster-actions">
        ${actions.map(([key, label]) => `<button class="mini-btn" data-move-player="${playerData.id}" data-to-group="${key}">${label}</button>`).join("")}
      </div>
    </div>
  `;
}

function renderAddPlayerSelect(game) {
  const inGame = new Set(getGamePlayerIds(game));
  const available = state.players.filter((p) => !inGame.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  els.addPlayerToGame.innerHTML = available.length
    ? available.map((p) => `<option value="${p.id}">${escapeHtml(p.name)} - ${p.overall}</option>`).join("")
    : `<option value="">Sem jogadores disponiveis</option>`;
}

function movePlayerInGame(playerId, toGroup) {
  if (!requireAdmin()) return;
  const game = getCurrentGame();
  if (!game) return;
  ensureGameShape(game);
  ["teamA", "teamB", "benchA", "benchB"].forEach((group) => {
    game[group] = game[group].filter((id) => id !== playerId);
  });
  game[toGroup].push(playerId);
  if (game.status !== "preview") persistState();
  render();
}

function removePlayerFromGame(playerId) {
  if (!requireAdmin()) return;
  const game = getCurrentGame();
  if (!game) return;
  ensureGameShape(game);
  ["teamA", "teamB", "benchA", "benchB"].forEach((group) => {
    game[group] = game[group].filter((id) => id !== playerId);
  });
  if (game.status !== "preview") persistState();
  render();
}

function addSelectedPlayerToGame() {
  if (!requireAdmin()) return;
  const game = getCurrentGame();
  const playerId = els.addPlayerToGame.value;
  if (!game || !playerId) return;
  ensureGameShape(game);
  (game.teamA.length <= game.teamB.length ? game.teamA : game.teamB).push(playerId);
  if (game.status !== "preview") persistState();
  render();
}

async function saveCurrentScore() {
  if (!requireAdmin()) return;
  const game = getCurrentGame();
  if (!game) return;
  const scoreA = els.scoreA.value === "" ? null : Number(els.scoreA.value);
  const scoreB = els.scoreB.value === "" ? null : Number(els.scoreB.value);
  const wasFinished = isFinishedGame(game);
  game.scoreA = Number.isNaN(scoreA) ? null : scoreA;
  game.scoreB = Number.isNaN(scoreB) ? null : scoreB;
  game.status = game.scoreA == null || game.scoreB == null ? "open" : "finished";
  if (game.status === "finished" && !wasFinished) {
    game.scoreSavedAt = new Date().toISOString();
  }
  if (game.status === "finished") {
    completeOriginEventForGame(game);
  }
  if (game.status !== "finished") {
    game.scoreSavedAt = null;
  }
  if (game.status !== "preview") await persistState();
  if (game.status === "finished") {
    currentGameId = null;
    previewGame = null;
    currentSuggestions = [];
    finishingGame = false;
  }
  render();
}

function completeOriginEventForGame(game) {
  const originEvent = findOriginEventForGame(game);
  if (!originEvent || originEvent.status === "completed") return;
  originEvent.status = "completed";
}

function getGameTitle(game) {
  const title = String(game?.title || game?.name || "").trim();
  if (title) return title;
  const eventData = findEventForGame(game);
  if (eventData?.title) return eventData.title;
  return `Jogo de ${formatDate(game?.date || new Date().toISOString())}`;
}

function findEventForGame(game, options = {}) {
  if (!game) return null;
  const statuses = options.statuses ? new Set(options.statuses) : null;
  const directEvent = game.eventId ? (state.events || []).find((eventData) => eventData.id === game.eventId) : null;
  if (directEvent && (!statuses || statuses.has(directEvent.status))) return directEvent;

  const gameDate = new Date(game.date).getTime();
  const gamePlayerIds = new Set(getGamePlayerIds(game));
  return (state.events || []).find((eventData) => {
    if (statuses && !statuses.has(eventData.status)) return false;
    const eventDate = new Date(eventData.startsAt).getTime();
    if (Math.abs(eventDate - gameDate) > 60 * 1000) return false;
    const goingIds = getEventResponses(eventData.id, "going").map((response) => response.playerId);
    return goingIds.length ? goingIds.every((playerId) => gamePlayerIds.has(playerId)) : true;
  }) || null;
}

function findGameForEventData(eventData) {
  if (!eventData) return null;
  const eventDate = new Date(eventData.startsAt).getTime();
  if (Number.isNaN(eventDate)) return null;
  const goingIds = getEventResponses(eventData.id, "going").map((response) => response.playerId);
  return state.games.find((game) => {
    const gameDate = new Date(game.date).getTime();
    if (Number.isNaN(gameDate) || Math.abs(gameDate - eventDate) > 60 * 1000) return false;
    if (game.eventId && game.eventId === eventData.id) return true;
    const gamePlayerIds = new Set(getGamePlayerIds(game));
    return goingIds.length ? goingIds.every((playerId) => gamePlayerIds.has(playerId)) : true;
  }) || null;
}

async function updateGameDate(gameId, date) {
  if (!requireAdmin()) return false;
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return false;
  const originEvent = findEventForGame(game);
  const previousGameDate = game.date;
  const previousEventDate = originEvent?.startsAt || null;

  game.date = date;
  currentGenerationDateIso = date;
  currentPaymentsMonth = monthKey(date);
  if (originEvent) originEvent.startsAt = date;

  try {
    await persistState();
  } catch (error) {
    game.date = previousGameDate;
    if (originEvent) originEvent.startsAt = previousEventDate;
    saveState();
    alert(`Nao consegui guardar a nova data: ${error.message}`);
    return false;
  }
  render();
  return true;
}

function findOriginEventForGame(game) {
  return findEventForGame(game, { statuses: ["open"] });
}

async function handlePhotoSelection(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    pendingPhotoDataUrl = await resizePhoto(file);
  } catch (error) {
    alert("Nao consegui carregar essa foto.");
    pendingPhotoDataUrl = null;
  }
}

function clearPendingPhoto() {
  pendingPhotoDataUrl = "";
  if (els.formPhoto) els.formPhoto.value = "";
}

function resizePhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSide = 720;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPlayersTable() {
  if (!els.playersTable) return;
  const players = [...state.players].sort((a, b) => a.name.localeCompare(b.name));
  els.playersTable.innerHTML = players.map((p) => {
    const form = getPlayerForm(p);
    const variant = getPlayerCardVariant(p, form);
    return `
      <tr class="player-table-row ${renderCardHaloClass(p, variant)}">
        <td><button class="player-open-link ${renderCardHaloClass(p, variant)}" data-open-player="${p.id}" type="button">${renderAvatar(p)}</button></td>
        <td><button class="player-name-link" data-open-player="${p.id}" type="button"><strong>${escapeHtml(p.name)}</strong>${p.isGuest ? " <span class=\"metric\">Guest</span>" : ""}</button></td>
        <td class="ovr-col">${renderRatingBadge(p, form)}</td>
        <td class="stat-col">${p.pace}</td>
        <td class="stat-col">${p.shooting}</td>
        <td class="stat-col">${p.passing}</td>
        <td class="stat-col">${p.dribbling}</td>
        <td class="stat-col">${p.defending}</td>
        <td class="stat-col">${p.physical}</td>
        <td class="admin-only">${renderLinkedAccountCell(p)}</td>
        <td class="admin-only">
          <button class="mini-btn" data-edit-player="${p.id}">Editar</button>
          ${p.linkedUserId ? `<button class="mini-btn" data-unlink-player="${p.id}">Desassociar</button>` : ""}
          <button class="mini-btn" data-delete-player="${p.id}">Apagar</button>
        </td>
        <td class="form-col">${renderRecordDots(form.recentRecord, { chronological: true })}</td>
      </tr>
    `;
  }).join("");

  els.playersTable.querySelectorAll("[data-edit-player]").forEach((button) => {
    button.addEventListener("click", () => editPlayer(button.dataset.editPlayer));
  });
  els.playersTable.querySelectorAll("[data-delete-player]").forEach((button) => {
    button.addEventListener("click", () => deletePlayer(button.dataset.deletePlayer));
  });
  els.playersTable.querySelectorAll("[data-unlink-player]").forEach((button) => {
    button.addEventListener("click", () => unlinkPlayerAsAdmin(button.dataset.unlinkPlayer));
  });
  els.playersTable.querySelectorAll("[data-open-player]").forEach((button) => {
    button.addEventListener("click", () => openPlayerProfile(button.dataset.openPlayer));
  });
}

function renderLinkedAccountCell(playerData) {
  if (!playerData.linkedUserId) return "<span class=\"metric\">Livre</span>";
  const profile = knownProfiles.find((item) => item.id === playerData.linkedUserId);
  if (!profile) return "<span class=\"metric\">Ligado</span>";
  return `
    <span class="linked-account">
      <strong>${escapeHtml(profile.username || profile.display_name || "Conta")}</strong>
      <small>${escapeHtml(profile.email || "")}</small>
    </span>
  `;
}

function getPartialRatingInputs() {
  return [els.formPace, els.formShooting, els.formPassing, els.formDribbling, els.formDefending, els.formPhysical].filter(Boolean);
}

function updateOverallFromPartialRatings() {
  if (!els.formOverall) return;
  const values = getPartialRatingInputs().map((input) => clampRating(input.value));
  if (values.length !== 6) return;
  const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  els.formOverall.value = average;
}

async function savePlayerFromForm(event) {
  event.preventDefault();
  if (!requireAdmin()) return;
  updateOverallFromPartialRatings();
  const values = {
    id: els.playerId.value || `p-${Date.now()}-${slug(els.formName.value)}`,
    name: els.formName.value.trim(),
    pace: clampRating(els.formPace.value),
    shooting: clampRating(els.formShooting.value),
    passing: clampRating(els.formPassing.value),
    dribbling: clampRating(els.formDribbling.value),
    defending: clampRating(els.formDefending.value),
    physical: clampRating(els.formPhysical.value),
    overall: clampRating(els.formOverall.value),
    photoDataUrl: pendingPhotoDataUrl || "",
    isGuest: false,
  };
  if (!values.name) return;

  const index = state.players.findIndex((p) => p.id === values.id);
  if (index >= 0) {
    state.players[index] = { ...state.players[index], ...values };
  } else {
    state.players.push(values);
  }
  clearPlayerForm();
  await persistState();
  render();
}

function editPlayer(playerId) {
  if (!requireAdmin()) return;
  const p = findPlayer(playerId);
  if (!p) return;
  els.playerId.value = p.id;
  els.formName.value = p.name;
  els.formPace.value = p.pace;
  els.formShooting.value = p.shooting;
  els.formPassing.value = p.passing;
  els.formDribbling.value = p.dribbling;
  els.formDefending.value = p.defending;
  els.formPhysical.value = p.physical;
  els.formOverall.value = p.overall;
  updateOverallFromPartialRatings();
  pendingPhotoDataUrl = p.photoDataUrl || "";
  showView("players");
}

async function deletePlayer(playerId) {
  if (!requireAdmin()) return;
  const playerData = findPlayer(playerId);
  if (!playerData) return;
  if (!confirm(`Apagar o jogador ${playerData.name}?`)) return;
  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("players").delete().eq("id", playerId);
    if (error) {
      alert(`Nao consegui apagar jogador: ${error.message}`);
      return;
    }
  }
  state.players = state.players.filter((p) => p.id !== playerId);
  selectedIds.delete(playerId);
  state.games.forEach((game) => {
    ensureGameShape(game);
    ["teamA", "teamB", "benchA", "benchB"].forEach((group) => {
      game[group] = game[group].filter((id) => id !== playerId);
    });
  });
  saveState();
  render();
}

async function unlinkPlayerAsAdmin(playerId) {
  if (!requireAdmin()) return;
  const playerData = findPlayer(playerId);
  if (!playerData?.linkedUserId) return;
  if (!confirm(`Desassociar a conta ligada ao perfil ${playerData.name}?`)) return;
  await unlinkPlayerProfile(playerId);
}

async function unlinkPlayerProfile(playerId) {
  const index = state.players.findIndex((p) => p.id === playerId);
  if (index < 0) return;
  state.players[index].linkedUserId = null;
  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient
      .from("players")
      .update({ linked_user_id: null, updated_at: new Date().toISOString() })
      .eq("id", playerId);
    if (error) {
      alert(`Nao consegui desassociar perfil: ${error.message}`);
      return;
    }
  }
  await loadAccountState();
  saveState();
  updateAccessUi();
  render();
}

function clearPlayerForm() {
  if (els.playerForm) els.playerForm.reset();
  if (els.playerId) els.playerId.value = "";
  pendingPhotoDataUrl = null;
}

function renderGamesList() {
  if (!state.games.length) {
    els.gamesList.innerHTML = `<div class="empty-state">Ainda nao ha jogos confirmados.</div>`;
    return;
  }

  els.gamesList.innerHTML = state.games.map((game) => {
    const teamA = hydrate([...(game.teamA || []), ...(getBenchA(game) || [])]);
    const teamB = hydrate([...(game.teamB || []), ...(getBenchB(game) || [])]);
    const result = game.scoreA == null || game.scoreB == null ? "Resultado em aberto" : `${game.scoreA} - ${game.scoreB}`;
    const gameTitle = getGameTitle(game);
    return `
      <article class="game-card">
        <div>
          <p class="eyebrow">${escapeHtml(gameTitle)}</p>
          <strong>${formatDate(game.date)} - ${result}</strong>
          <span>A ${getTeamStats(teamA).total} vs B ${getTeamStats(teamB).total} - ${game.status === "finished" ? "finalizado" : "em aberto"}</span>
          ${renderTeamRadarChart(teamA, teamB, { compact: true, inlineOdds: true })}
        </div>
        <div class="game-actions">
          <button class="primary-btn" data-open-game="${game.id}">Abrir</button>
          <button class="danger-btn admin-only" data-delete-game="${game.id}">Apagar</button>
        </div>
      </article>
    `;
  }).join("");

  els.gamesList.querySelectorAll("[data-open-game]").forEach((button) => {
    button.addEventListener("click", () => {
      const game = state.games.find((item) => item.id === button.dataset.openGame);
      if (isFinishedGame(game)) {
        currentHistoryGameId = game.id;
        currentGameId = null;
        showView("history-game");
        renderHistoryGameDetail();
        return;
      }
      currentGameId = game?.id || button.dataset.openGame;
      currentHistoryGameId = null;
      showView("today");
      renderCurrentGame();
    });
  });
  els.gamesList.querySelectorAll("[data-delete-game]").forEach((button) => {
    button.addEventListener("click", () => deleteGame(button.dataset.deleteGame));
  });
}

// ---- Clube: simbolo, bio, plantel e os meus clubes ----
// Emblemas da lista: desenhados a 24x24, legiveis a tamanho de icone. O valor guardado e "preset:<chave>".
const CLUB_EMBLEMS = {
  shield: { label: "Escudo", color: "#4da3ff", path: '<path d="M12 3 5 6v5c0 4.5 3 7.7 7 10 4-2.3 7-5.5 7-10V6z"/>' },
  star: { label: "Estrela", color: "#ffc247", path: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>' },
  bolt: { label: "Raio", color: "#ffd93d", path: '<path d="M13 3 5 14h6l-1 7 8-11h-6z"/>' },
  flame: { label: "Chama", color: "#ff7a45", path: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.4 2.6-5.3 3.8-8.8 2 1.3 2.6 3.3 2.4 5 1.1-.6 2-1.9 2.2-3.4 2.4 2 4.6 4.6 4.6 7.4 0 3.5-2.6 6-6.5 6z"/>' },
  crown: { label: "Coroa", color: "#f0b429", path: '<path d="M4 18 3 7l5 4 4-6 4 6 5-4-1 11z"/>' },
  ball: { label: "Bola", color: "#e8eefc", path: '<circle cx="12" cy="12" r="9"/><path d="m12 8 3.2 2.3-1.2 3.7h-4l-1.2-3.7z" fill="#0b1630" stroke="#0b1630"/>' },
  diamond: { label: "Diamante", color: "#59d3e0", path: '<path d="M12 3 21 12 12 21 3 12z"/>' },
  heart: { label: "Coracao", color: "#ff5a7a", path: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20z"/>' },
  mountain: { label: "Monte", color: "#7ed6a5", path: '<path d="M2 19 9 7l4 6 3-4 6 10z"/>' },
  moon: { label: "Lua", color: "#b69cff", path: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>' },
  wave: { label: "Onda", color: "#4fc3f7", path: '<path d="M2 14c3 0 3-4 6-4s3 4 6 4 3-4 8-4v8H2z"/>' },
  triangle: { label: "Triangulo", color: "#ff9a4d", path: '<path d="M12 3 22 20H2z"/>' },
};

function groupInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] || "?").slice(0, 2)).toUpperCase();
}

// Simbolo do clube a qualquer tamanho: imagem enviada, emblema da lista ou, sem nada, as iniciais.
function renderClubSymbol(group, extraClass = "") {
  const cls = `club-symbol ${extraClass}`.trim();
  const logo = group?.logo || "";
  if (logo.startsWith("data:image/")) return `<span class="${cls}"><img src="${escapeHtml(logo)}" alt=""></span>`;
  const emblem = logo.startsWith("preset:") ? CLUB_EMBLEMS[logo.slice(7)] : null;
  if (emblem) {
    return `<span class="${cls}"><svg viewBox="0 0 24 24" aria-hidden="true"><g fill="${emblem.color}" stroke="${emblem.color}" stroke-width="1" stroke-linejoin="round">${emblem.path}</g></svg></span>`;
  }
  return `<span class="${cls} club-symbol-initials" aria-hidden="true">${group ? escapeHtml(groupInitials(group.name)) : "?"}</span>`;
}

// O separador usa o simbolo do clube ativo; sem clube mantem o icone de estatisticas.
// Lista de campos da regiao Norte (OpenStreetMap, scripts/fetch-pitches.mjs): concelho -> campo -> campo de texto.
function loadPitchCatalog() {
  if (!pitchCatalogPromise) {
    pitchCatalogPromise = fetch("data/pitches-norte.json")
      .then((response) => (response.ok ? response.json() : { pitches: [] }))
      .then((data) => data.pitches || [])
      .catch(() => []);
  }
  return pitchCatalogPromise;
}

// Liga um seletor [data-pitch-picker] (concelho + campo) a um campo de texto; esconde-o se nao houver lista.
async function bindPitchPicker(picker, input) {
  const municipalitySelect = picker?.querySelector("[data-pitch-municipality]");
  const pitchSelect = picker?.querySelector("[data-pitch-select]");
  if (!municipalitySelect || !pitchSelect || !input) return;
  const pitches = await loadPitchCatalog();
  if (!pitches.length || !picker.isConnected) return;

  const byDistrict = new Map();
  pitches.forEach((pitch) => {
    if (!byDistrict.has(pitch.district)) byDistrict.set(pitch.district, new Set());
    byDistrict.get(pitch.district).add(pitch.municipality);
  });
  municipalitySelect.innerHTML = `<option value="">Concelho</option>${[...byDistrict].map(([district, municipalities]) => `
    <optgroup label="${escapeHtml(district)}">${[...municipalities].sort((a, b) => a.localeCompare(b, "pt")).map((name) =>
      `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}</optgroup>`).join("")}`;
  picker.classList.remove("hidden");

  on(municipalitySelect, "change", () => {
    const list = pitches.filter((pitch) => pitch.municipality === municipalitySelect.value);
    pitchSelect.disabled = !list.length;
    pitchSelect.innerHTML = `<option value="">Campo</option>${list.map((pitch) => {
      const kind = pitch.kind === "pavilhao" ? "Pavilhao" : "Campo";
      const label = pitch.name || `${kind} sem nome (${pitch.surface || pitch.lat + ", " + pitch.lon})`;
      return `<option value="${escapeHtml(pitch.id)}">${escapeHtml(label)}</option>`;
    }).join("")}`;
  });
  on(pitchSelect, "change", () => {
    const pitch = pitches.find((item) => item.id === pitchSelect.value);
    if (!pitch) return;
    input.value = (pitch.name ? `${pitch.name}, ${pitch.municipality}` : `Campo em ${pitch.municipality}`).slice(0, 80);
  });
}

// Local habitual do clube: pre-preenche a convocatoria enquanto o campo estiver vazio.
function prefillEventLocation() {
  const field = els.eventLocation;
  const habitual = getActiveGroup()?.defaultLocation;
  if (field && habitual && !field.value && document.activeElement !== field) field.value = habitual;
}

function renderClubTab() {
  const tab = document.querySelector("#club-tab");
  if (!tab) return;
  const group = getActiveGroup();
  const icon = tab.querySelector("[data-club-tab-icon]");
  if (icon) {
    icon.innerHTML = group
      ? renderClubSymbol(group, "club-symbol-tab")
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>';
  }
  if (currentViewName === "club") renderClubPanel();
}

function renderClubBadge(group) {
  return `
    <div class="pp-club">
      ${renderClubSymbol(group, "club-symbol-md")}
      <div class="pp-club-text">
        <small>Clube</small>
        <strong>${escapeHtml(group?.name || "Sem clube")}</strong>
      </div>
    </div>`;
}

let clubEditing = false;
let clubDraftLogo = "";

// 128x128 em corte central: chega para ecras 3x a 40 px e fica abaixo de ~15 KB.
function resizeClubLogo(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const size = 128;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const side = Math.min(img.width, img.height);
        canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        let url = canvas.toDataURL("image/webp", 0.9);
        if (!url.startsWith("data:image/webp")) url = canvas.toDataURL("image/png");
        resolve(url);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderClubEditor(group) {
  const draft = clubDraftLogo;
  const preview = { logo: draft, name: group.name };
  return `
    <form class="club-editor" data-club-editor>
      <label class="auth-field"><span>Bio (ate 300 caracteres)</span>
        <textarea name="bio" maxlength="300" rows="3">${escapeHtml(group.bio)}</textarea></label>
      <div class="pitch-picker hidden" data-pitch-picker>
        <select data-pitch-municipality aria-label="Concelho"><option value="">Concelho</option></select>
        <select data-pitch-select aria-label="Campo" disabled><option value="">Campo</option></select>
      </div>
      <label class="auth-field"><span>Local habitual (entra automatico nas convocatorias)</span>
        <input name="location" type="text" maxlength="80" value="${escapeHtml(group.defaultLocation)}" placeholder="Ex.: Pavilhao Municipal, Maia"></label>
      <label class="club-check"><input name="public" type="checkbox" ${group.isPublic ? "checked" : ""}>
        <span>Perfil publico: qualquer pessoa pode encontrar o clube e ver so o nome, simbolo e bio.</span></label>
      <div class="club-editor-block">
        <span class="club-editor-label">Simbolo</span>
        <div class="club-emblem-grid">
          ${Object.entries(CLUB_EMBLEMS).map(([key, emblem]) => `
            <button type="button" class="club-emblem ${draft === `preset:${key}` ? "selected" : ""}" data-emblem="${key}" aria-label="${emblem.label}" aria-pressed="${draft === `preset:${key}`}">
              ${renderClubSymbol({ logo: `preset:${key}` })}</button>`).join("")}
        </div>
        <div class="club-upload">
          <label class="ghost-btn club-upload-btn">Carregar imagem
            <input type="file" accept="image/png,image/jpeg,image/webp" data-club-upload hidden></label>
          ${draft ? '<button type="button" class="ghost-btn" data-clear-logo>Remover simbolo</button>' : ""}
          <span class="hint">Melhor: imagem <b>quadrada, 256x256 px ou mais</b>, simbolo centrado, forma simples e sem letras pequenas, com fundo transparente ou liso. Fica reduzida a 128x128 e e vista a 24-40 px.</span>
        </div>
        <div class="club-draft-preview">${renderClubSymbol(preview, "club-symbol-lg")}${renderClubSymbol(preview, "club-symbol-md")}${renderClubSymbol(preview, "club-symbol-tab")}</div>
      </div>
      <div class="actions">
        <button type="submit" class="primary-btn">Guardar</button>
        <button type="button" class="ghost-btn" data-cancel-club-edit>Cancelar</button>
      </div>
    </form>`;
}

function renderClubPanel() {
  const panel = document.querySelector("#club-panel");
  if (!panel) return;
  const group = getActiveGroup();
  if (!group) {
    panel.innerHTML = `
      <div class="club-empty">
        ${renderClubSymbol(null, "club-symbol-lg")}
        <h3>Ainda nao tens clube</h3>
        <p>Procura um clube e pede para entrar, ou pede um convite a um admin.</p>
      </div>
      ${renderClubSearchSection()}`;
    bindClubSearch(panel);
    return;
  }
  const canEdit = isGroupAdminRole(group.role) && remoteEnabled;
  const roster = state.players.filter((item) => !item.isGuest).slice().sort((a, b) => (b.overall || 0) - (a.overall || 0));
  const finished = getFinishedGames().length;
  panel.innerHTML = `
    <section class="club-hero">
      ${renderClubSymbol(group, "club-symbol-xl")}
      <div class="club-hero-text">
        <p class="eyebrow">${group.isFavorite ? "Clube favorito" : "Clube"}</p>
        <h3>${escapeHtml(group.name)}</h3>
        <span class="club-role">${escapeHtml(ROLE_LABELS[group.role] || "jogador")}</span>
      </div>
      ${canEdit && !clubEditing ? '<button type="button" class="ghost-btn" data-edit-club>Editar</button>' : ""}
    </section>
    ${clubEditing && canEdit ? renderClubEditor(group) : (group.bio ? `<p class="club-bio">${escapeHtml(group.bio)}</p>` : (canEdit ? '<p class="hint">Sem bio ainda. Usa Editar para escrever uma.</p>' : ""))}
    <section class="club-stats">
      <div class="club-stat"><b>${roster.length}</b><span>jogadores</span></div>
      <div class="club-stat"><b>${finished}</b><span>jogos</span></div>
      <div class="club-stat"><b>${getMvpHistoryRows(999).length}</b><span>MVPs</span></div>
    </section>
    <section class="club-block">
      <h4>Plantel</h4>
      ${roster.length ? `<div class="club-roster">${roster.map((item) => `
        <button type="button" class="club-player" data-club-player="${escapeHtml(item.id)}"><strong>${escapeHtml(item.name)}</strong><small>${item.overall ?? "-"}</small></button>`).join("")}</div>` : '<p class="hint">Sem jogadores.</p>'}
    </section>
    <div class="actions"><button type="button" class="ghost-btn" data-club-hof>Ver Hall of Fame</button></div>
    <section class="club-block">
      <h4>Os meus clubes</h4>
      <div class="club-list">
        ${myGroups.map((item) => `
          <div class="club-row ${item.id === group.id ? "active" : ""}">
            ${renderClubSymbol(item, "club-symbol-md")}
            <div class="club-row-text"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(ROLE_LABELS[item.role] || "jogador")}${item.id === group.id ? " - ativo" : ""}</small></div>
            ${remoteEnabled ? `<button type="button" class="club-fav ${item.isFavorite ? "on" : ""}" data-club-fav="${escapeHtml(item.id)}" aria-pressed="${item.isFavorite}" aria-label="${item.isFavorite ? "Clube favorito" : "Definir como favorito"}">${item.isFavorite ? "★" : "☆"}</button>` : ""}
            ${item.id !== group.id ? `<button type="button" class="ghost-btn" data-club-switch="${escapeHtml(item.id)}">Mudar</button>` : ""}
            ${item.role !== "owner" && remoteEnabled ? `<button type="button" class="ghost-btn danger" data-club-leave="${escapeHtml(item.id)}">Sair</button>` : ""}
          </div>`).join("")}
      </div>
    </section>
    ${canEdit ? '<section class="club-block" id="club-join-requests"></section>' : ""}
    ${renderClubSearchSection()}
    ${group.role === "owner" && remoteEnabled ? `
      <section class="club-block club-danger">
        <h4>Apagar grupo</h4>
        <p class="hint">O grupo desaparece logo para todos os membros. Podes recupera-lo durante 30 dias em "A minha conta"; depois e apagado de vez, com jogadores, jogos e estatisticas.</p>
        <button type="button" class="danger-btn" data-club-delete="${escapeHtml(group.id)}">Apagar ${escapeHtml(group.name)}</button>
      </section>` : ""}`;
  bindClubSearch(panel);
  if (canEdit) loadClubJoinRequests(group);

  panel.querySelector("[data-edit-club]")?.addEventListener("click", () => {
    clubEditing = true;
    clubDraftLogo = group.logo;
    renderClubPanel();
  });
  panel.querySelector("[data-club-hof]")?.addEventListener("click", () => showView("stats"));
  panel.querySelectorAll("[data-club-player]").forEach((button) => button.addEventListener("click", () => openPlayerProfile(button.dataset.clubPlayer)));
  panel.querySelectorAll("[data-club-switch]").forEach((button) => button.addEventListener("click", () => switchActiveGroup(button.dataset.clubSwitch)));
  panel.querySelectorAll("[data-club-fav]").forEach((button) => button.addEventListener("click", () => setFavoriteClub(button.dataset.clubFav)));
  panel.querySelectorAll("[data-club-leave]").forEach((button) => button.addEventListener("click", () => leaveClub(button.dataset.clubLeave)));
  panel.querySelector("[data-club-delete]")?.addEventListener("click", () => deleteGroup(group.id, group.name));

  const editor = panel.querySelector("[data-club-editor]");
  if (!editor) return;
  bindPitchPicker(editor.querySelector("[data-pitch-picker]"), editor.querySelector("[name=location]"));
  const keepBio = () => {
    const data = new FormData(editor);
    group.bio = String(data.get("bio") || "");
    group.defaultLocation = String(data.get("location") || "");
    group.isPublic = data.has("public");
  };
  editor.querySelectorAll("[data-emblem]").forEach((button) => button.addEventListener("click", () => {
    clubDraftLogo = `preset:${button.dataset.emblem}`;
    keepBio();
    renderClubPanel();
  }));
  editor.querySelector("[data-clear-logo]")?.addEventListener("click", () => {
    clubDraftLogo = "";
    keepBio();
    renderClubPanel();
  });
  editor.querySelector("[data-club-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      clubDraftLogo = await resizeClubLogo(file);
    } catch (error) {
      alert("Nao consegui ler essa imagem.");
      return;
    }
    keepBio();
    renderClubPanel();
  });
  editor.querySelector("[data-cancel-club-edit]")?.addEventListener("click", () => {
    clubEditing = false;
    renderClubPanel();
  });
  editor.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(editor);
    const bio = String(data.get("bio") || "");
    const defaultLocation = String(data.get("location") || "").trim().slice(0, 80);
    const isPublic = data.has("public");
    const { error } = await supabaseClient.rpc("update_group_profile", {
      p_group_id: group.id, p_bio: bio, p_logo: clubDraftLogo, p_public: isPublic, p_default_location: defaultLocation,
    });
    if (error) {
      alert(`Nao consegui guardar: ${error.message}. Confirma que a migracao group-profile-migration.sql foi aplicada.`);
      return;
    }
    Object.assign(group, { bio: bio.trim().slice(0, 300), logo: clubDraftLogo, isPublic, defaultLocation });
    clubEditing = false;
    renderClubTab();
    renderClubPanel();
  });
}

// ---- Pesquisa de clubes e pedidos de entrada ----
let clubSearchResults = null;
let clubSearchQuery = "";

function renderClubSearchSection() {
  const results = clubSearchResults;
  return `
    <section class="club-block club-search">
      <h4>Procurar clubes</h4>
      ${remoteEnabled ? `
        <form class="club-search-form" data-club-search>
          <input type="search" name="q" value="${escapeHtml(clubSearchQuery)}" placeholder="Nome do clube" maxlength="40" aria-label="Nome do clube">
          <button type="submit" class="ghost-btn">Procurar</button>
        </form>
        <div class="club-list" data-club-results>
          ${results === null ? "" : results.length ? results.map((club) => `
            <div class="club-row">
              ${renderClubSymbol(club, "club-symbol-md")}
              <div class="club-row-text"><strong>${escapeHtml(club.name)}</strong>
                <small>${club.member_count} membros${club.bio ? ` - ${escapeHtml(club.bio)}` : ""}</small></div>
              ${club.is_member ? '<small class="hint">Ja es membro</small>'
                : club.request_status === "pending" ? '<small class="hint">Pedido enviado</small>'
                : `<button type="button" class="ghost-btn" data-join-club="${escapeHtml(club.id)}">Pedir para entrar</button>`}
            </div>`).join("") : '<p class="hint">Nenhum clube encontrado.</p>'}
        </div>` : '<p class="hint">A pesquisa precisa de ligacao ao Supabase e de sessao iniciada.</p>'}
    </section>`;
}

async function searchClubs(query) {
  clubSearchQuery = query;
  const { data, error } = await supabaseClient.rpc("search_clubs", { p_query: query });
  if (error) {
    alert(`Nao consegui pesquisar clubes: ${error.message}. Confirma que a migracao group-profile-migration.sql foi aplicada.`);
    return;
  }
  clubSearchResults = (data || []).map((row) => ({ ...row, logo: row.logo || "" }));
  renderClubPanel();
}

function bindClubSearch(panel) {
  panel.querySelector("[data-club-search]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    searchClubs(String(new FormData(event.currentTarget).get("q") || "").trim());
  });
  panel.querySelectorAll("[data-join-club]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    const { error } = await supabaseClient.rpc("request_join_group", { p_group_id: button.dataset.joinClub });
    if (error) {
      alert(`Nao consegui enviar o pedido: ${error.message}`);
      button.disabled = false;
      return;
    }
    await searchClubs(clubSearchQuery);
  }));
}

// Admins: pedidos de entrada pendentes no clube ativo.
async function loadClubJoinRequests(group) {
  const section = document.querySelector("#club-join-requests");
  if (!section || !supabaseClient) return;
  const { data, error } = await supabaseClient
    .from("group_join_requests")
    .select("id, requester_name, created_at")
    .eq("group_id", group.id)
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  if (error || !data?.length || group.id !== activeGroupId) return;
  section.innerHTML = `
    <h4>Pedidos para entrar (${data.length})</h4>
    <div class="club-list">
      ${data.map((request) => `
        <div class="club-row">
          <div class="club-row-text"><strong>${escapeHtml(request.requester_name || "Jogador")}</strong><small>${escapeHtml(formatDate(request.created_at))}</small></div>
          <button type="button" class="primary-btn" data-join-decide="${escapeHtml(request.id)}" data-approve="1">Aceitar</button>
          <button type="button" class="ghost-btn" data-join-decide="${escapeHtml(request.id)}" data-approve="0">Recusar</button>
        </div>`).join("")}
    </div>`;
  section.querySelectorAll("[data-join-decide]").forEach((button) => button.addEventListener("click", async () => {
    const { error: decideError } = await supabaseClient.rpc("decide_join_group_request", {
      p_request_id: button.dataset.joinDecide, p_approve: button.dataset.approve === "1",
    });
    if (decideError) {
      alert(`Nao consegui decidir o pedido: ${decideError.message}`);
      return;
    }
    renderClubPanel();
  }));
}

async function setFavoriteClub(groupId) {
  const { error } = await supabaseClient.rpc("set_favorite_group", { p_group_id: groupId });
  if (error) {
    alert(`Nao consegui definir o favorito: ${error.message}`);
    return;
  }
  myGroups.forEach((group) => { group.isFavorite = group.id === groupId; });
  renderClubPanel();
}

async function leaveClub(groupId) {
  const group = myGroups.find((item) => item.id === groupId);
  if (!group || !confirm(`Sair de ${group.name}? Perdes o acesso aos jogos e dados deste grupo e o teu perfil de jogador deixa de estar ligado a esta conta.`)) return;
  const { error } = await supabaseClient.rpc("leave_group", { p_group_id: groupId });
  if (error) {
    alert(String(error.message || "").includes("owner_cannot_leave") ? "O dono do grupo nao pode sair." : `Nao consegui sair: ${error.message}`);
    return;
  }
  window.location.reload();
}

// ---- Apagar grupos com quarentena de 30 dias (dono do grupo ou dono da app) ----
async function deleteGroup(groupId, name) {
  const typed = prompt(`Para apagar, escreve o nome do grupo: ${name}\n\nO grupo desaparece logo para todos. Podes recupera-lo durante 30 dias.`);
  if (typed == null) return;
  if (typed.trim().toLowerCase() !== String(name).trim().toLowerCase()) {
    alert("O nome nao coincide. O grupo nao foi apagado.");
    return;
  }
  const { data: purgeAt, error } = await supabaseClient.rpc("delete_group", { p_group_id: groupId });
  if (error) {
    const message = String(error.message || "");
    alert(message.includes("legacy_group_protected")
      ? "Este grupo e o original da app e esta protegido."
      : message.includes("group_owner_required")
        ? "So o dono do grupo pode apaga-lo."
        : `Nao consegui apagar o grupo: ${message}`);
    return;
  }
  alert(`${name} foi apagado. Podes recupera-lo ate ${formatDate(purgeAt)} em "A minha conta".`);
  window.location.reload();
}

async function restoreGroup(groupId) {
  const { error } = await supabaseClient.rpc("restore_group", { p_group_id: groupId });
  if (error) {
    alert(String(error.message || "").includes("restore_window_over")
      ? "Ja passaram os 30 dias. O grupo nao pode ser recuperado."
      : `Nao consegui recuperar o grupo: ${error.message}`);
    return;
  }
  window.location.reload();
}

async function loadDeletedGroups() {
  if (!remoteEnabled || !supabaseClient || !currentSession?.user) return;
  const { data, error } = await supabaseClient.rpc("list_deleted_groups");
  // Sem a migracao group-quarantine-migration.sql a funcao nao existe: o painel fica vazio.
  deletedGroups = error ? [] : data || [];
  renderDeletedGroupsPanel();
}

function renderDeletedGroupsPanel() {
  const panel = document.querySelector("#deleted-groups-panel");
  if (!panel) return;
  if (!deletedGroups.length) {
    panel.innerHTML = "";
    return;
  }
  panel.innerHTML = `
    <div class="account-card">
      <h3>Grupos apagados</h3>
      <p class="hint">Estao em quarentena. Recupera-os antes da data indicada; depois sao apagados de vez.</p>
      <div class="club-list">
        ${deletedGroups.map((item) => `
          <div class="club-row">
            <div class="club-row-text"><strong>${escapeHtml(item.name)}</strong><small>Apagado de vez a ${escapeHtml(formatDate(item.purge_at))}</small></div>
            <button type="button" class="primary-btn" data-restore-group="${escapeHtml(item.id)}">Recuperar</button>
          </div>`).join("")}
      </div>
    </div>`;
  panel.querySelectorAll("[data-restore-group]").forEach((button) => button.addEventListener("click", () => restoreGroup(button.dataset.restoreGroup)));
}

async function loadAllGroups() {
  if (!isPlatformAdmin || !supabaseClient) {
    renderAllGroupsList();
    return;
  }
  const { data, error } = await supabaseClient.rpc("list_all_groups");
  allGroups = error ? [] : data || [];
  renderAllGroupsList();
}

function renderAllGroupsList() {
  const section = document.querySelector("#all-groups-section");
  const list = document.querySelector("#all-groups-list");
  if (!section || !list) return;
  section.classList.toggle("hidden", !isPlatformAdmin || !allGroups.length);
  list.innerHTML = allGroups.map((item) => `
    <div class="club-row">
      <div class="club-row-text">
        <strong>${escapeHtml(item.name)}</strong>
        <small>${escapeHtml(item.owner_name || "Sem dono")} · ${item.member_count} ${item.member_count === 1 ? "membro" : "membros"}${item.deleted_at ? ` · apagado, de vez a ${escapeHtml(formatDate(item.purge_at))}` : ""}</small>
      </div>
      ${item.deleted_at
        ? `<button type="button" class="primary-btn" data-restore-group="${escapeHtml(item.id)}">Recuperar</button>`
        : item.protected ? `<span class="metric">Protegido</span>` : `<button type="button" class="ghost-btn danger" data-delete-group="${escapeHtml(item.id)}" data-group-name="${escapeHtml(item.name)}">Apagar</button>`}
    </div>`).join("");
  list.querySelectorAll("[data-restore-group]").forEach((button) => button.addEventListener("click", () => restoreGroup(button.dataset.restoreGroup)));
  list.querySelectorAll("[data-delete-group]").forEach((button) => button.addEventListener("click", () => deleteGroup(button.dataset.deleteGroup, button.dataset.groupName)));
}

// Historico do jogador: jogos de todos os grupos a que pertence (o RLS ja limita aos seus grupos).
let myGamesAll = null;
let myGamesLoading = false;

async function loadMyGames() {
  renderMyGames();
  if (myGamesLoading) return;
  const userId = currentSession?.user?.id;
  if (!remoteEnabled || !supabaseClient || !userId) {
    myGamesAll = getLinkedPlayer()
      ? getPlayerAppearanceRecord(getLinkedPlayer().id).map((item) => ({ game: item.game, outcome: item.outcome, groupId: activeGroupId }))
      : [];
    renderMyGames();
    return;
  }
  myGamesLoading = true;
  try {
    const [{ data: playerRows, error: playerError }, { data: gameRows, error: gameError }] = await Promise.all([
      supabaseClient.from("players").select("id, group_id").eq("linked_user_id", userId),
      supabaseClient.from("games").select("*").eq("status", "finished").order("date", { ascending: false }),
    ]);
    if (playerError || gameError) throw playerError || gameError;
    const playerByGroup = new Map((playerRows || []).map((row) => [row.group_id, row.id]));
    myGamesAll = (gameRows || []).map((row) => {
      const playerId = playerByGroup.get(row.group_id);
      if (!playerId) return null;
      const game = gameFromRow(row);
      const participation = getPlayerParticipation(game, playerId);
      if (!participation) return null;
      return { game, outcome: getPlayerOutcome(game, participation.side), groupId: row.group_id };
    }).filter(Boolean);
  } catch (error) {
    console.warn("My games load failed", error);
    myGamesAll = [];
  } finally {
    myGamesLoading = false;
    renderMyGames();
  }
}

function renderMyGames() {
  const list = document.querySelector("#my-games-list");
  if (!list) return;
  if (myGamesAll === null) {
    list.innerHTML = `<div class="empty-state">A carregar...</div>`;
    return;
  }
  if (!myGamesAll.length) {
    list.innerHTML = `<div class="empty-state">Ainda nao tens jogos no historico.</div>`;
    return;
  }
  const outcomeLabel = { win: "V", draw: "E", loss: "D" };
  list.innerHTML = myGamesAll.map(({ game, outcome, groupId }) => {
    const group = myGroups.find((item) => item.id === groupId);
    const result = game.scoreA == null || game.scoreB == null ? "Resultado em aberto" : `${game.scoreA} - ${game.scoreB}`;
    return `
      <article class="game-card">
        <div>
          <p class="eyebrow">${escapeHtml(group?.name || "Grupo")}</p>
          <strong>${formatDate(game.date)} - ${result}</strong>
          <span><span class="record-dot ${outcome || "absent"}">${outcomeLabel[outcome] || "-"}</span></span>
        </div>
        ${state.games.some((item) => item.id === game.id) ? `<div class="game-actions"><button class="primary-btn" data-open-my-game="${escapeHtml(game.id)}">Abrir</button></div>` : ""}
      </article>`;
  }).join("");
  list.querySelectorAll("[data-open-my-game]").forEach((button) => {
    button.addEventListener("click", () => {
      currentHistoryGameId = button.dataset.openMyGame;
      currentGameId = null;
      showView("history-game");
      renderHistoryGameDetail();
    });
  });
}

// ---- Tracking de vídeo: teste local (claude/tracking-teste) ----
// Com a tabela public.game_tracking_results (supabase/tracking-migration.sql) os resultados ficam no
// Supabase: um admin importa (rascunho), associa etiquetas do vídeo a jogadores e publica; os outros só
// leem o publicado. Sem a tabela ou sem sessão, cai no modo local de teste (localStorage).
// O nome do vídeo só pré-preenche a associação. Cada jogador vê a sua própria análise; não há tabela de todos.
let trackingStore = window.FooterTracking ? window.FooterTracking.loadStore(window.localStorage) : {};
let trackingRemote = false;
const trackingPreviewByGame = {};

function trackingEntryFromRow(row) {
  return {
    id: row.id, revision: row.revision, status: row.status, result: row.result, mapping: row.mapping || {},
    importedAt: row.imported_at, publishedAt: row.published_at, fileName: row.source_file,
  };
}

async function loadRemoteTracking() {
  if (!window.FooterTracking || !remoteEnabled || !supabaseClient || !currentSession?.user) return;
  const statuses = isAdmin ? ["draft", "published"] : ["published"];
  const { data, error } = await supabaseClient
    .from("game_tracking_results")
    .select("*")
    .in("status", statuses)
    .order("revision", { ascending: false });
  if (error) {
    console.warn("Tracking load failed. Run supabase/tracking-migration.sql.", error);
    trackingRemote = false;
    return;
  }
  trackingRemote = true;
  const remote = {};
  const live = {};
  (data || []).filter(isActiveGroupGameRow).forEach((row) => {
    // Admins see the newest revision (draft or published); everyone else only the published one.
    if (!remote[row.game_id]) remote[row.game_id] = trackingEntryFromRow(row);
    if (row.status === "published" && !live[row.game_id]) live[row.game_id] = { revision: row.revision, publishedAt: row.published_at };
  });
  // What the group sees, even while an admin looks at a newer draft.
  Object.entries(remote).forEach(([gameId, entry]) => { entry.live = live[gameId] || null; });
  trackingStore = remote;
}

async function importTrackingResult(game, result, mapping, fileName) {
  if (!trackingRemote) {
    trackingStore[game.id] = { result, mapping, importedAt: new Date().toISOString(), fileName, status: "local" };
    if (!saveTrackingStore()) throw new Error("Não foi possível guardar neste dispositivo (armazenamento cheio ou bloqueado).");
    return;
  }
  const { data: last, error: lastError } = await supabaseClient
    .from("game_tracking_results").select("revision").eq("game_id", game.id).order("revision", { ascending: false }).limit(1);
  if (lastError) throw new Error("Não foi possível ler as revisões deste jogo.");
  const revision = (last?.[0]?.revision || 0) + 1;
  const { data, error } = await supabaseClient.from("game_tracking_results").insert({
    game_id: game.id, revision, schema_version: window.FooterTracking.SCHEMA, run_id: result.runId || null,
    status: "draft", result, mapping, source_file: fileName || null,
  }).select("*").single();
  if (error) throw new Error(`Não foi possível guardar no servidor: ${error.message}`);
  const live = trackingStore[game.id]?.status === "published"
    ? { revision: trackingStore[game.id].revision, publishedAt: trackingStore[game.id].publishedAt }
    : trackingStore[game.id]?.live || null;
  trackingStore[game.id] = { ...trackingEntryFromRow(data), live };
}

async function saveTrackingMapping(game, entry) {
  if (!trackingRemote || !entry.id) {
    saveTrackingStore();
    return;
  }
  const { error } = await supabaseClient.from("game_tracking_results").update({ mapping: entry.mapping }).eq("id", entry.id);
  if (error) throw new Error(`Não foi possível guardar a associação: ${error.message}`);
}

async function publishTrackingResult(game, entry) {
  if (!trackingRemote || !entry.id) return;
  const { error: archiveError } = await supabaseClient.from("game_tracking_results")
    .update({ status: "archived" }).eq("game_id", game.id).eq("status", "published");
  if (archiveError) throw new Error(`Não foi possível arquivar a versão anterior: ${archiveError.message}`);
  const { data, error } = await supabaseClient.from("game_tracking_results")
    .update({ status: "published", published_at: new Date().toISOString() }).eq("id", entry.id).select("*").single();
  if (error) throw new Error(`Não foi possível publicar: ${error.message}`);
  trackingStore[game.id] = { ...trackingEntryFromRow(data), live: { revision: data.revision, publishedAt: data.published_at } };
}

async function removeTrackingResult(game, entry) {
  if (trackingRemote && entry.id) {
    const { error } = await supabaseClient.from("game_tracking_results").delete().eq("id", entry.id);
    if (error) throw new Error(`Não foi possível remover: ${error.message}`);
    await loadRemoteTracking();
    return;
  }
  delete trackingStore[game.id];
  saveTrackingStore();
}

function getTrackingBadge(entry) {
  if (!trackingRemote) return `<span class="tracking-badge">Teste local</span>`;
  if (entry?.status === "draft") return `<span class="tracking-badge">Rascunho · só admins veem</span>`;
  return `<span class="tracking-badge">Beta</span>`;
}

function saveTrackingStore() {
  return window.FooterTracking?.saveStore(window.localStorage, trackingStore);
}

function getTrackingEntry(gameId) {
  return trackingStore[gameId] || null;
}

function getTrackingPlayerName(entry, label) {
  const id = entry.mapping?.[label];
  const playerData = id ? findPlayer(id) : null;
  return playerData ? playerData.name : `${label} (por associar)`;
}

function getTrackingLabelFor(entry, playerId) {
  return Object.entries(entry.mapping || {}).find(([, id]) => id === playerId)?.[0] || null;
}

function formatTrackingNumber(value, digits = 0) {
  if (value == null || !Number.isFinite(Number(value))) return "–";
  return Number(value).toLocaleString("pt-PT", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function formatVideoClock(seconds) {
  if (seconds == null) return "";
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

let trackingHeatmapSeq = 0;

function renderTrackingHeatmap(heatmap, { label = "Mapa de calor", color = "var(--accent-2)" } = {}) {
  if (!heatmap?.values?.length) return "";
  const { rows, cols, values } = heatmap;
  const positive = values.filter((v) => v > 0).sort((x, y) => x - y);
  if (!positive.length) return "";
  // Scale against the 98th percentile so a few busy cells do not wash out the rest; soft blur for a heat look.
  const cap = positive[Math.min(positive.length - 1, Math.floor(positive.length * 0.98))] || positive[positive.length - 1];
  const id = `tracking-heat-${trackingHeatmapSeq += 1}`;
  let cells = "";
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const v = values[r * cols + c];
      if (v <= 0) continue;
      const level = Math.pow(Math.min(1, v / cap), 0.75);
      if (level < 0.04) continue;
      cells += `<rect x="${c}" y="${rows - r - 1}" width="1" height="1" fill="${color}" fill-opacity="${(0.05 + 0.95 * level).toFixed(2)}"/>`;
    }
  }
  const lines = `<g fill="none" stroke="var(--line-strong)" stroke-width="0.15"><rect x="0" y="0" width="${cols}" height="${rows}"/><line x1="${cols / 2}" x2="${cols / 2}" y1="0" y2="${rows}"/><circle cx="${cols / 2}" cy="${rows / 2}" r="3"/><rect x="0" y="${rows / 2 - 3}" width="1.2" height="6"/><rect x="${cols - 1.2}" y="${rows / 2 - 3}" width="1.2" height="6"/></g>`;
  return `<svg class="tracking-heatmap" viewBox="-0.5 -0.5 ${cols + 1} ${rows + 1}" role="img" aria-label="${escapeHtml(label)}; câmara do lado de baixo">
    <defs><filter id="${id}-blur" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="0.6"/></filter><clipPath id="${id}-clip"><rect x="0" y="0" width="${cols}" height="${rows}"/></clipPath></defs>
    <rect x="0" y="0" width="${cols}" height="${rows}" fill="var(--surface-opaque)"/>
    <g clip-path="url(#${id}-clip)"><g filter="url(#${id}-blur)">${cells}</g></g>${lines}</svg>`;
}

function renderTrackingBands(p) {
  const bands = window.FooterTracking?.speedBands(p);
  if (!bands) return "";
  const colors = ["rgba(89,176,255,.28)", "rgba(89,176,255,.45)", "rgba(89,176,255,.65)", "var(--accent)", "var(--orange)"];
  return `
    <div class="tracking-bands" aria-label="Tempo por velocidade">
      <div class="tracking-bands-bar">${bands.map((b, i) => b.pct > 0.2 ? `<i style="flex:${b.pct};background:${colors[i]}" title="${b.name}: ${formatTrackingNumber(b.pct, 1)}%"></i>` : "").join("")}</div>
      <div class="tracking-bands-key">${bands.map((b, i) => `<span><i style="background:${colors[i]}"></i>${b.name} ${formatTrackingNumber(b.pct, 0)}%</span>`).join("")}</div>
    </div>
  `;
}

function getTrackingVideoTeamName(entry, game, videoTeam) {
  // The video teams are labelled A/B by the tracker; show them by the Footer side of their mapped players.
  const sides = entry.result.players
    .filter((p) => p.team === videoTeam && entry.mapping?.[p.label])
    .map((p) => getPlayerParticipation(game, entry.mapping[p.label])?.side)
    .filter(Boolean);
  const counts = sides.reduce((acc, side) => ({ ...acc, [side]: (acc[side] || 0) + 1 }), {});
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best ? `Equipa ${best[0]}` : `Equipa do vídeo ${videoTeam}`;
}

function renderPlayerTrackingBlock(entry, p, { gameLink = null, videoGameId = null } = {}) {
  const tracking = window.FooterTracking;
  const others = entry.result.players;
  const rank = (key) => {
    const r = tracking.rankIn(others, p.label, key);
    return r ? `${r.position}.º de ${r.of} no jogo` : "";
  };
  const partner = p.partner ? escapeHtml(getTrackingPlayerName(entry, p.partner.label)) : null;
  const rival = p.rival ? escapeHtml(getTrackingPlayerName(entry, p.rival.label)) : null;
  const late = p.lateRatio != null ? Math.round((p.lateRatio - 1) * 100) : null;
  const tag = (key) => tracking.statusTag(entry.result, key);
  return `
    <div class="tracking-player">
      <p class="tracking-note">${gameLink ? `${gameLink} · ` : ""}${formatTrackingNumber(p.validMinutes, 1)} min vistos pela câmara (não são minutos jogados).</p>
      <div class="tracking-highlights">
        ${trackingCard("Distância observada", p.distanceM == null ? null : p.distanceM / 1000, "km", { digits: 2, note: rank("distanceM"), tag: tag("distance") })}
        ${trackingCard(`Mais rápido (${formatTrackingNumber(p.maxSustainedWindowS, 0)} s)`, p.maxSustainedKmh, "km/h", { digits: 1, note: p.maxSustainedAtS != null ? `aos ${videoClockLink(videoGameId, p.maxSustainedAtS)} do vídeo` : "", tag: tag("max_speed") })}
        ${trackingCard("Sprints ≥20 km/h", p.sprints, "", { note: p.highRuns != null ? `${formatTrackingNumber(p.highRuns)} arranques ≥15 km/h` : "", tag: tag("sprints") })}
        ${p.passesMade != null
          ? trackingCard("Passes detetados", p.passesMade, "", { note: rank("passesMade"), tag: tag("passes") })
          : trackingCard("Ritmo", p.metersPerMin, "m/min", { digits: 1, note: rank("metersPerMin"), tag: tag("pace") })}
      </div>
      ${renderTrackingStories(entry, p, videoGameId)}
      ${renderTrackingBands(p)}
      ${renderPlayerTimeline(entry, p, videoGameId)}
      <div class="tracking-profile-map">
        ${renderPlayerPitch(entry, p)}
        <dl>
          ${p.passesMade != null ? `<dt>Ritmo</dt><dd>${formatTrackingNumber(p.metersPerMin, 1)} m/min · ${rank("metersPerMin")}</dd>` : ""}
          <dt>Papel em campo</dt><dd>${escapeHtml(tracking.roleLabel(p) || "–")}</dd>
          ${p.zoneSharePct ? `<dt>Defesa / meio / ataque</dt><dd>${formatTrackingNumber(p.zoneSharePct.defensiva, 0)} / ${formatTrackingNumber(p.zoneSharePct.media, 0)} / ${formatTrackingNumber(p.zoneSharePct.ofensiva, 0)}%</dd>` : ""}
          ${p.goalkeeperMin ? `<dt>Na baliza</dt><dd>${formatTrackingNumber(p.goalkeeperMin, 1)} min</dd>` : ""}
          ${late != null ? `<dt>Ritmo no fim vs início</dt><dd>${late > 0 ? "+" : ""}${late}%</dd>` : ""}
          ${partner ? `<dt>Parceiro de jogo</dt><dd>${partner} · ${formatTrackingNumber(p.partner.sharePct, 0)}% do tempo a &lt;5 m</dd>` : ""}
          ${rival ? `<dt>Rival do jogo</dt><dd>${rival} · ${formatTrackingNumber(p.rival.seconds / 60, 1)} min a &lt;3 m</dd>` : ""}
        </dl>
      </div>
      ${renderPlayerPassBlock(entry, p, rank)}
    </div>
  `;
}

function renderBallZones(entry, game) {
  // "Onde se jogou": share of ball time in 3 thirds x 3 corridors, camera side at the bottom (as the heatmaps).
  const zones = entry.result.ball?.zonesPct;
  if (!zones) return "";
  const max = Math.max(...zones) || 1;
  const w = 39.5 / 3, h = 19.5 / 3;
  let cells = "";
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      const pct = zones[r * 3 + c];
      const x = c * w, y = (2 - r) * h;
      cells += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="var(--accent)" fill-opacity="${(0.08 + 0.8 * pct / max).toFixed(2)}"/>`;
      cells += `<text x="${(x + w / 2).toFixed(2)}" y="${(y + h / 2 + 1).toFixed(2)}" text-anchor="middle" font-size="3" font-weight="700" fill="var(--ink)">${formatTrackingNumber(pct, 0)}%</text>`;
    }
  }
  const lines = `<g fill="none" stroke="var(--line-strong)" stroke-width="0.15"><rect x="0" y="0" width="39.5" height="19.5"/><line x1="19.75" x2="19.75" y1="0" y2="19.5"/><circle cx="19.75" cy="9.75" r="3"/></g>`;
  return `
    <div class="tracking-zones">
      <strong>Onde se jogou</strong>
      <svg class="tracking-heatmap" viewBox="-0.5 -0.5 40.5 20.5" role="img" aria-label="Percentagem do tempo da bola em cada zona do campo; câmara do lado de baixo">
        <rect x="0" y="0" width="39.5" height="19.5" fill="var(--surface-opaque)"/>${cells}${lines}</svg>
      <div class="tracking-zones-key"><span>← ${escapeHtml(getTrackingVideoTeamName(entry, game, "A"))} ataca</span><span>${escapeHtml(getTrackingVideoTeamName(entry, game, "B"))} ataca →</span></div>
    </div>
  `;
}

function renderTrackingStories(entry, p, videoGameId = null) {
  // Short sentences, each only when the data support it; neutral wording (admins also preview other players).
  const f = window.FooterTracking.storyFacts(entry.result, p);
  const lines = [];
  if (f.bestMinute) lines.push(`Minuto mais intenso: o ${f.bestMinute.minute}.º, a ${formatTrackingNumber(f.bestMinute.metersPerMin, 0)} m/min.`);
  if (f.peakAtS != null) lines.push(`Pico de velocidade aos ${videoClockLink(videoGameId, f.peakAtS)} do vídeo.`);
  if (f.lane) lines.push(`Mais tempo no corredor ${f.lane.name} (${formatTrackingNumber(f.lane.pct, 0)}% do tempo).`);
  if (f.lateChangePct != null) {
    lines.push(f.lateChangePct <= -15 ? `O ritmo caiu ${-f.lateChangePct}% no último terço do jogo.`
      : f.lateChangePct >= 10 ? `Acabou mais forte: +${f.lateChangePct}% no último terço.`
      : `Ritmo mantido até ao fim (${f.lateChangePct > 0 ? "+" : ""}${f.lateChangePct}%).`);
  }
  if (f.passPartner) lines.push(`Mais passes trocados com ${escapeHtml(getTrackingPlayerName(entry, f.passPartner.label))} (${formatTrackingNumber(f.passPartner.passes)}).`);
  if (!lines.length) return "";
  return `<ul class="tracking-stories">${lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

let trackingTimelineSeq = 0;

function renderPlayerTimeline(entry, p, videoGameId = null) {
  // "Ao longo do jogo": one period filter drives the period totals, the per-minute chart and the path (CSS-only).
  const tracking = window.FooterTracking;
  const tl = p.timeline;
  const periods = tracking.gamePeriods(entry.result);
  if (!tl || !periods.length) return "";
  const id = `tracking-time-${trackingTimelineSeq += 1}`;
  const n = tl.distanceM.length;
  const rates = tl.distanceM.map((d, i) => (tl.seenS[i] >= 20 ? d / (tl.seenS[i] / 60) : null));
  const maxRate = Math.max(...rates.filter((r) => r != null), 1);
  const hasVideo = Boolean(videoGameId && getGameVideoParts(videoGameId).length);
  const canSeek = (sec) => hasVideo && Boolean(tracking.videoSeekTarget(getGameVideoParts(videoGameId), sec));
  const seekAttr = (sec) => (canSeek(sec) ? ` data-video-seek="${sec.toFixed(1)}"` : "");
  const inPeriod = (sec) => periods.slice(1).filter((q) => sec >= q.from && sec < q.to).map((q) => `tp-m-${q.key}`).join(" ");
  let bars = "";
  rates.forEach((r, i) => {
    const h = r == null ? 0.8 : Math.max(0.8, (30 * r) / maxRate);
    bars += `<rect class="tp-bar ${inPeriod(i * 60 + 30)} ${r == null ? "tp-none" : ""}"${seekAttr(i * 60)} x="${i * 4 + 0.5}" y="${(34 - h).toFixed(2)}" width="3" height="${h.toFixed(2)}" rx="0.4"><title>Minuto ${i + 1}: ${r == null ? "pouco visto pela câmara" : `${formatTrackingNumber(r, 0)} m/min`}</title></rect>`;
  });
  tl.sprints.forEach((s) => {
    const x = (s.start / 60) * 4;
    bars += `<circle class="tp-bar ${inPeriod(s.start)}"${seekAttr(Math.max(0, s.start - 3))} cx="${x.toFixed(2)}" cy="2.2" r="1.1" fill="var(--orange)"><title>Sprint aos ${formatVideoClock(s.start)} · ${formatTrackingNumber(s.kmh, 1)} km/h</title></circle>`;
  });
  let ticks = "";
  for (let m = 0; m <= n; m += 5) ticks += `<text x="${m * 4}" y="39" font-size="3" text-anchor="middle" fill="var(--muted)">${m}′</text>`;
  const chart = `<svg class="tracking-rhythm" viewBox="-2 0 ${n * 4 + 4} 40" role="img" aria-label="Metros por minuto observado em cada minuto do jogo; pontos laranja são sprints">${bars}${ticks}</svg>`;
  const variants = periods.map((q) => {
    const st = tracking.periodStats(p, q.from, q.to, entry.result.durationS ?? Infinity);
    return `
      <div class="tp-v tp-v-${q.key}">
        <p class="tracking-period-stats">${st ? `<b>${formatTrackingNumber(st.metres / 1000, 2)} km</b> em ${formatTrackingNumber(st.seenMin, 1)} min vistos · <b>${st.metersPerMin == null ? "sem dados" : `${formatTrackingNumber(st.metersPerMin, 0)} m/min`}</b> · <b>${st.sprints}</b> sprint${st.sprints === 1 ? "" : "s"}` : "sem dados"}</p>
        ${renderSprintVideoLinks(tl, q.from, q.to, videoGameId)}
        ${renderPlayerPath(tl, q.from, q.to)}
      </div>`;
  }).join("");
  return `
    <div class="tracking-timeline">
      <h4>Ao longo do jogo</h4>
      ${periods.map((q) => `<input type="radio" class="tp-in tp-in-${q.key}" name="${id}" id="${id}-${q.key}" ${q.key === 0 ? "checked" : ""}>`).join("")}
      <div class="tracking-pitch-tabs tp-tabs" role="group" aria-label="Período do jogo">
        ${periods.map((q) => `<label for="${id}-${q.key}" class="tp-tab-${q.key}">${escapeHtml(q.label)}</label>`).join("")}
      </div>
      <div class="tp-body">
        ${chart}
        ${variants}
      </div>
      <p class="tracking-fineprint">Barras: metros por minuto visto pela câmara (barras rasas = minuto pouco visto). Pontos laranja: sprints. No campo, o percurso com os sprints a laranja.${hasVideo ? " Carrega numa barra ou num sprint para o ver no vídeo." : ""}</p>
    </div>
  `;
}

function renderSprintVideoLinks(tl, from, to, videoGameId) {
  // With a game video: each sprint of the period as a jump to 3 s before it, to see the run start.
  if (!videoGameId || !getGameVideoParts(videoGameId).length) return "";
  const parts = getGameVideoParts(videoGameId);
  const sprints = tl.sprints.filter((s) => s.start >= from && s.start < to && window.FooterTracking.videoSeekTarget(parts, s.start));
  if (!sprints.length) return "";
  return `<p class="tracking-sprint-links">Ver sprints: ${sprints.map((s) => `<button type="button" class="link-btn video-seek" data-video-seek="${Math.max(0, s.start - 3).toFixed(1)}" title="Ver no vídeo">▶ ${formatVideoClock(s.start)}</button> <small>${formatTrackingNumber(s.kmh, 1)} km/h</small>`).join(" · ")}</p>`;
}

function renderPlayerPath(tl, from, to) {
  // Path sampled every 2 s; a gap > 4 s is a stretch not seen by the camera and stays unlinked.
  const pts = tl.path.filter(([t]) => t >= from && t < to);
  if (pts.length < 2) return `<p class="tracking-fineprint">Sem percurso neste período.</p>`;
  const H = 19.5;
  const inSprint = (t) => tl.sprints.some((s) => t >= s.start - 1 && t <= s.end + 1);
  let walk = "", fast = "", segWalk = [], segFast = [];
  const closeFast = () => {
    if (segFast.length > 1) fast += `<polyline points="${segFast.join(" ")}"/>`;
    segFast = [];
  };
  const flush = () => {
    if (segWalk.length > 1) walk += `<polyline points="${segWalk.join(" ")}"/>`;
    segWalk = [];
    closeFast();
  };
  pts.forEach(([t, x, y], i) => {
    if (i && t - pts[i - 1][0] > 4) flush();
    const pt = `${x.toFixed(1)},${(H - y).toFixed(1)}`;
    segWalk.push(pt);
    if (inSprint(t)) segFast.push(pt); else closeFast();
  });
  flush();
  return `
    <svg class="tracking-heatmap" viewBox="-0.5 -0.5 40.5 20.5" role="img" aria-label="Percurso no campo neste período; câmara do lado de baixo">
      <rect x="0" y="0" width="39.5" height="19.5" fill="var(--surface-opaque)"/>
      <g fill="none" stroke="var(--line-strong)" stroke-width="0.15"><rect x="0" y="0" width="39.5" height="19.5"/><line x1="19.75" x2="19.75" y1="0" y2="19.5"/><circle cx="19.75" cy="9.75" r="3"/></g>
      <g fill="none" stroke="var(--accent)" stroke-opacity="0.55" stroke-width="0.18" stroke-linejoin="round">${walk}</g>
      <g fill="none" stroke="var(--orange)" stroke-width="0.5" stroke-linecap="round">${fast}</g>
    </svg>
  `;
}

function renderTeamFaceOff(entry, game) {
  // Paired bars, each row scaled to its larger value; "sem dados" instead of 0.
  const tracking = window.FooterTracking;
  const f = tracking.teamFaceOff(entry.result);
  if (!f.A || !f.B) return "";
  const rows = [
    ["Metros por jogador-minuto", "metersPerPlayerMin", 1, "", tracking.statusTag(entry.result, "distance")],
    ["Passes detetados", "passes", 0, "", tracking.statusTag(entry.result, "passes")],
    ["Ataques", "attacks", 0, "", tracking.statusTag(entry.result, "attacks")],
    ["Largura média", "widthM", 1, " m", null],
    ["Compactação (menor = mais junta)", "compactnessM", 1, " m", null],
  ].filter(([, key]) => f.A[key] != null || f.B[key] != null);
  const bar = (v, max, side) => v == null
    ? `<span class="tf-bar tf-${side} tf-empty">sem dados</span>`
    : `<span class="tf-bar tf-${side}"><i style="width:${max ? (100 * v / max).toFixed(1) : 0}%"></i></span>`;
  return `
    <div class="tracking-faceoff">
      <div class="tf-head"><strong class="tf-a">${escapeHtml(getTrackingVideoTeamName(entry, game, "A"))}</strong><strong class="tf-b">${escapeHtml(getTrackingVideoTeamName(entry, game, "B"))}</strong></div>
      ${rows.map(([label, key, digits, unit, tag]) => {
        const a = f.A[key], b = f.B[key], max = Math.max(a ?? 0, b ?? 0);
        return `
          <div class="tf-row">
            <div class="tf-label">${escapeHtml(label)}${tag ? ` <i class="tracking-tag">${escapeHtml(tag)}</i>` : ""}</div>
            <div class="tf-values">
              <b class="tf-a">${a == null ? "–" : formatTrackingNumber(a, digits) + unit}</b>
              ${bar(a, max, "a")}${bar(b, max, "b")}
              <b class="tf-b">${b == null ? "–" : formatTrackingNumber(b, digits) + unit}</b>
            </div>
          </div>`;
      }).join("")}
    </div>
  `;
}

function trackingCard(title, value, unit, { digits = 0, note = "", tag = null } = {}) {
  // A missing value reads "sem dados", never 0.
  const has = value != null && Number.isFinite(Number(value));
  return `
    <article class="tracking-highlight">
      <span>${escapeHtml(title)}</span>
      <strong>${has ? `${formatTrackingNumber(value, digits)}${unit ? ` <small>${escapeHtml(unit)}</small>` : ""}` : `<small>sem dados</small>`}</strong>
      ${note ? `<em>${note}</em>` : ""}
      ${tag && has ? `<i class="tracking-tag">${escapeHtml(tag)}</i>` : ""}
    </article>
  `;
}

let trackingPitchSeq = 0;

function renderPlayerPitch(entry, p) {
  // One pitch, two modes (CSS-only tabs): heatmap, and detected passes with each teammate.
  const heat = renderTrackingHeatmap(p.heatmap, { label: "Mapa de calor do jogador" });
  const passes = renderPassMap(entry, p);
  if (!passes) return heat;
  const id = `tracking-pitch-${trackingPitchSeq += 1}`;
  return `
    <div class="tracking-pitch">
      <input type="radio" class="pm-heat-in" name="${id}" id="${id}-heat" checked>
      <input type="radio" class="pm-pass-in" name="${id}" id="${id}-pass">
      <div class="tracking-pitch-tabs" role="group" aria-label="Modo do campo">
        <label for="${id}-heat" class="pm-heat-tab">Mapa de calor</label>
        <label for="${id}-pass" class="pm-pass-tab">Passes</label>
      </div>
      <div class="pm-heat">${heat}</div>
      <div class="pm-pass">${passes}</div>
    </div>
  `;
}

function renderPassMap(entry, p) {
  // Pass network: the player in the centre, teammates around, thicker lines with more detected passes (both ways).
  // Mean positions over a whole game all sit near the halfway line, so they made an unreadable map.
  const partners = window.FooterTracking.passPartners(entry.result, p.label);
  if (!partners.length) return "";
  const max = Math.max(...partners.map((r) => r.total));
  const cx = 20, cy = 10, rx = 13, ry = 5.6;
  const short = (label) => escapeHtml(getTrackingPlayerName(entry, label).split(" ")[0]);
  let lines = "", dots = "";
  partners.forEach((r, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / partners.length;
    const x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
    lines += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="var(--accent)" stroke-opacity="0.85" stroke-linecap="round" stroke-width="${(0.3 + 1.4 * r.total / max).toFixed(2)}"/>`;
    dots += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.3" fill="var(--surface-opaque)" stroke="var(--accent)" stroke-width="0.3"/>`;
    const below = y > cy;
    dots += `<text x="${x.toFixed(2)}" y="${(below ? y + 3.2 : y - 2).toFixed(2)}" text-anchor="middle" font-size="1.8" fill="var(--ink)">${short(r.label)} <tspan font-weight="700">${r.total}</tspan></text>`;
  });
  dots += `<circle cx="${cx}" cy="${cy}" r="2.4" fill="var(--accent)"/><text x="${cx}" y="${cy + 0.4}" text-anchor="middle" font-size="1.05" font-weight="700" fill="var(--bg, #05080f)">${short(p.label)}</text>`;
  return `
    <svg class="tracking-heatmap tracking-passnet" viewBox="0 0 40 20" role="img" aria-label="Rede de passes detetados com cada colega">
      <rect x="0" y="0" width="40" height="20" rx="1" fill="var(--surface-opaque)"/>${lines}${dots}
    </svg>
    <p class="tracking-fineprint">Passes detetados com cada colega (dados + recebidos); a linha é mais grossa com mais passes.</p>
  `;
}

function renderPlayerPassBlock(entry, p, rank) {
  // Ball metrics exist from revision 2 on; only passes passed the human audit. Passes made are in the top cards.
  if (p.passesMade == null) return "";
  const audit = entry.result.ball?.passAudit;
  const partner = p.passPartner ? escapeHtml(getTrackingPlayerName(entry, p.passPartner.label)) : null;
  return `
    <div class="tracking-ball">
      <h4>Com bola</h4>
      <div class="tracking-highlights">
        ${trackingCard("Passes recebidos", p.passesReceived, "", { note: rank("passesReceived"), tag: window.FooterTracking.statusTag(entry.result, "passes") })}
        ${partner ? `<article class="tracking-highlight"><span>Parceiro de passe</span><strong>${formatTrackingNumber(p.passPartner.passes)} <small>passes</small></strong><em>trocados com ${partner}</em></article>` : ""}
      </div>
      <p class="tracking-fineprint">Contados automaticamente pela bola no vídeo${audit ? ` (${audit.correct} de ${audit.judged} certos numa verificação)` : ""}. O número real é maior: a bola nem sempre é vista.</p>
    </div>
  `;
}

function renderTrackingTestSection(game) {
  if (!window.FooterTracking) return "";
  const entry = getTrackingEntry(game.id);
  if (!entry) {
    return `
      <section class="profile-section tracking-section admin-only">
        <div class="tracking-head"><h3>Tracking de vídeo</h3>${getTrackingBadge(null)}</div>
        <p class="tracking-note">Escolhe o ficheiro do tracker (<code>tracking-result.json</code>) para ver distâncias, velocidades e mapas deste jogo. ${trackingRemote ? "Fica em rascunho, só os admins o veem, até carregares em Publicar." : "Fica só neste dispositivo; nada é gravado na base de dados."}</p>
        <label class="primary-btn tracking-import">Escolher ficheiro do tracker<input type="file" accept=".json,application/json" data-tracking-import="${game.id}"></label>
        <p class="tracking-error" data-tracking-error hidden></p>
      </section>
    `;
  }
  const { result, mapping } = entry;
  const tracking = window.FooterTracking;
  const problems = tracking.mappingProblems(mapping);
  const isDraft = trackingRemote && entry.status === "draft";
  const live = entry.live || null;
  const roster = new Set(getGamePlayerIds(game));
  const outsideRoster = Object.entries(mapping).filter(([, id]) => id && !roster.has(id)).map(([label]) => label);
  const highlights = tracking.gameHighlights(result);
  const name = (label) => escapeHtml(getTrackingPlayerName(entry, label));
  const highlight = (title, h, unit, digits = 0, tag = null) => `
    <article class="tracking-highlight">
      <span>${title}</span>
      <strong>${h ? `${formatTrackingNumber(h.value, digits)} <small>${unit}</small>` : "<small>sem dados</small>"}</strong>
      <em>${h ? h.labels.map(name).join(", ") : "Sem dados suficientes"}</em>
      ${tag && h ? `<i class="tracking-tag">${escapeHtml(tag)}</i>` : ""}
    </article>
  `;
  const teamName = (key) => escapeHtml(getTrackingVideoTeamName(entry, game, key));
  const attacksA = result.teams.A?.attacks, attacksB = result.teams.B?.attacks;
  // Whose analysis is shown: the signed-in player's own; an admin can preview any associated player.
  const linked = getLinkedPlayer();
  const mappedPlayers = result.players.filter((p) => mapping[p.label]);
  const linkedMapped = linked && getTrackingLabelFor(entry, linked.id) ? linked.id : null;
  const previewId = isAdmin ? (trackingPreviewByGame[game.id] || linkedMapped || (mappedPlayers[0] ? mapping[mappedPlayers[0].label] : null)) : linked?.id;
  const viewLabel = previewId ? getTrackingLabelFor(entry, previewId) : null;
  const viewP = viewLabel ? result.players.find((p) => p.label === viewLabel) : null;
  const viewName = previewId ? findPlayer(previewId)?.name : null;
  const isOwn = linked && previewId === linked.id;
  const allPlayers = [...state.players].sort((a, b) => {
    const inA = roster.has(a.id) ? 0 : 1;
    const inB = roster.has(b.id) ? 0 : 1;
    return inA - inB || a.name.localeCompare(b.name, "pt");
  });
  return `
    <section class="profile-section tracking-section">
      <div class="tracking-head"><h3>Tracking de vídeo</h3>${getTrackingBadge(entry)}</div>
      <p class="tracking-note">${escapeHtml(result.label)} · ${trackingRemote ? (entry.status === "published" ? `versão ${entry.revision}, publicada a ${formatDate(entry.publishedAt)}` : `estás a ver o rascunho da versão ${entry.revision} (só os admins o veem)`) : `carregado neste dispositivo a ${formatDate(entry.importedAt)}, não gravado na base de dados`}. Valores ainda por validar.</p>
      ${result.ball ? `
        <div class="tracking-summary">
          ${trackingCard("Passes detetados", result.ball.passesTotal, "", { note: "no jogo todo", tag: tracking.statusTag(result, "passes") })}
          ${trackingCard("Bola localizada", result.ball.coveragePct, "% do vídeo", { note: "o resto do tempo não conta" })}
          ${attacksA || attacksB ? `
            <article class="tracking-highlight">
              <span>Ataques</span>
              <strong>${attacksA ? attacksA.count : "–"} <small>·</small> ${attacksB ? attacksB.count : "–"}</strong>
              <em>${teamName("A")} · ${teamName("B")}</em>
              <i class="tracking-tag">${escapeHtml(tracking.statusTag(result, "attacks") || "estimativa")}</i>
            </article>` : ""}
        </div>` : ""}
      <div class="tracking-highlights">
        ${highlight("Motor do jogo", highlights.motor, "m/min", 1, tracking.statusTag(result, "pace"))}
        ${highlight(`Mais rápido (${formatTrackingNumber(result.players[0]?.maxSustainedWindowS ?? 1, 0)} s)`, highlights.lightning, "km/h", 1, tracking.statusTag(result, "max_speed"))}
        ${highlight("Mais sprints", highlights.sprinter, "sprints")}
        ${highlight("Mais metros", highlights.distance, "m")}
        ${result.ball ? highlight("Mais passes", highlights.passer, "passes") : ""}
      </div>
      <p class="tracking-fineprint">Destaques entre quem teve pelo menos ${tracking.MIN_MINUTES_FOR_HIGHLIGHT} min observados e não esteve na baliza a maior parte do tempo.${result.ball ? " Passes detetados automaticamente; o total real é maior." : ""}</p>
    </section>

    <section class="profile-section tracking-section">
      <div class="tracking-head">
        <h3>${isOwn ? "A tua análise" : viewName ? `Análise de ${escapeHtml(viewName)}` : "A tua análise"}</h3>
        ${isAdmin && mappedPlayers.length ? `
          <label class="tracking-preview admin-only">Ver como
            <select data-tracking-preview="${game.id}">
              ${mappedPlayers.map((p) => `<option value="${escapeHtml(mapping[p.label])}" ${mapping[p.label] === previewId ? "selected" : ""}>${name(p.label)}</option>`).join("")}
            </select>
          </label>` : ""}
      </div>
      ${viewP ? renderPlayerTrackingBlock(entry, viewP, { videoGameId: game.id }) : `<p class="tracking-note">${linked ? "Não estás associado a nenhum jogador neste vídeo." : "Entra com uma conta ligada a um jogador para veres a tua análise."}</p>`}
    </section>

    <section class="profile-section tracking-section">
      <div class="tracking-head"><h3>Equipas no vídeo</h3></div>
      ${renderTeamFaceOff(entry, game)}
      <div class="tracking-teams">
        ${Object.entries(result.teams).map(([key, t]) => `
          <article class="tracking-team">
            <strong>${escapeHtml(getTrackingVideoTeamName(entry, game, key))}</strong>
            ${renderTrackingHeatmap(tracking.teamHeatmap(result, key), { label: `Mapa de calor da equipa ${key}`, color: key === "A" ? "var(--accent-2)" : "var(--orange)" })}
            <dl>
              <dt>Centro da equipa no meio-campo adversário</dt><dd>${formatTrackingNumber(t.attackingHalfPct, 0)}% do tempo</dd>
              <dt>Distância média à própria baliza</dt><dd>${formatTrackingNumber(t.fromOwnGoalM, 1)} m</dd>
              ${t.ballAttackingThirdPct != null ? `<dt>Bola no terço de ataque</dt><dd>${formatTrackingNumber(t.ballAttackingThirdPct, 0)}% do tempo</dd>` : ""}
            </dl>
          </article>
        `).join("")}
      </div>
      ${renderBallZones(entry, game)}
      <p class="tracking-fineprint">Mapas por tempo passado em cada metro quadrado; a câmara está do lado de baixo.${result.ball?.middleThirdPct != null ? ` A bola esteve ${formatTrackingNumber(result.ball.middleThirdPct, 0)}% do tempo no terço do meio.` : ""}</p>
    </section>

    <section class="profile-section tracking-section admin-only">
      <details class="tracking-mapping tracking-admin" ${isDraft || problems.unmapped.length ? "open" : ""}>
        <summary>Atualizar a análise de vídeo · só admin</summary>
        <dl class="tracking-admin-status">
          <dt>Os jogadores veem</dt><dd>${!trackingRemote ? "nada (modo local, sem base de dados)" : live ? `versão ${live.revision}, publicada a ${formatDate(live.publishedAt)}` : "nada publicado ainda"}</dd>
          <dt>Por publicar</dt><dd>${isDraft ? `<strong>versão ${entry.revision}</strong>, carregada a ${formatDate(entry.importedAt)} — é o que estás a ver nesta página` : "nada"}</dd>
        </dl>
        <ol class="tracking-admin-steps">
          <li>
            <strong>1. Carregar o ficheiro novo</strong>
            <p class="tracking-fineprint">O ficheiro <code>tracking-result.json</code> que recebeste do tracker. Fica em rascunho: ninguém o vê até publicares, e os jogadores já associados mantêm-se.</p>
            <label class="ghost-btn tracking-import">Escolher ficheiro do tracker<input type="file" accept=".json,application/json" data-tracking-import="${game.id}"></label>
          </li>
          <li>
            <strong>2. Confirmar os jogadores</strong> <span class="tracking-fineprint">(${result.players.length - problems.unmapped.length} de ${result.players.length} associados)</span>
            <details ${problems.unmapped.length || problems.duplicates.length ? "open" : ""}>
              <summary>Ver nomes do vídeo → jogadores</summary>
        ${problems.duplicates.length || outsideRoster.length ? `<p class="tracking-warning">${problems.duplicates.length ? "Há jogadores associados a dois nomes do vídeo. " : ""}${outsideRoster.length ? `${outsideRoster.map(escapeHtml).join(", ")} associado(s) a quem não está neste jogo.` : ""}</p>` : ""}
        <p class="tracking-fineprint">O nome do vídeo só pré-preenche a escolha. Confirma cada linha; jogadores deste jogo aparecem primeiro.</p>
        <div class="tracking-mapping-grid">
          ${result.players.map((p) => `
            <label>
              <span>${escapeHtml(p.label)}${p.automaticSharePct != null ? ` <small>${formatTrackingNumber(p.automaticSharePct, 0)}% nome automático</small>` : ""}</span>
              <select data-tracking-map="${escapeHtml(p.label)}">
                <option value="">— por associar —</option>
                ${allPlayers.map((pl) => `<option value="${escapeHtml(pl.id)}" ${mapping[p.label] === pl.id ? "selected" : ""}>${escapeHtml(pl.name)}${roster.has(pl.id) ? "" : " (fora deste jogo)"}</option>`).join("")}
              </select>
            </label>
          `).join("")}
        </div>
        <div class="tracking-actions">
          <button class="ghost-btn" type="button" data-tracking-save-map="${game.id}">Guardar jogadores</button>
        </div>
            </details>
          </li>
          <li>
            <strong>3. Publicar</strong>
            ${isDraft ? `
              <p class="tracking-fineprint">Os jogadores passam a ver a versão ${entry.revision}${live ? ` em vez da versão ${live.revision}` : ""}.</p>
              <div class="tracking-actions">
                <button class="primary-btn" type="button" data-tracking-publish="${game.id}" ${problems.unmapped.length || problems.duplicates.length ? "disabled title=\"Associa todos os jogadores primeiro\"" : ""}>Publicar a versão ${entry.revision} para o grupo</button>
                <button class="danger-btn" type="button" data-tracking-remove="${game.id}">Descartar este rascunho</button>
              </div>` : `<p class="tracking-fineprint">${trackingRemote ? "Nada por publicar. Carrega um ficheiro novo no passo 1." : "No modo local nada é publicado."}</p>`}
          </li>
        </ol>
        ${!isDraft ? `
          <details class="tracking-danger-zone">
            <summary>Mais opções</summary>
            <p class="tracking-fineprint">${trackingRemote ? `Apagar a versão ${entry.revision} publicada: os jogadores deixam de ver a análise deste jogo.` : "Remover a análise guardada neste dispositivo."}</p>
            <button class="danger-btn" type="button" data-tracking-remove="${game.id}">${trackingRemote ? `Apagar a versão ${entry.revision} publicada` : "Remover deste dispositivo"}</button>
          </details>` : ""}
        <p class="tracking-error" data-tracking-error hidden></p>
      </details>
    </section>
  `;
}

function bindTrackingTestSection(game, container) {
  if (!window.FooterTracking || !container) return;
  const input = container.querySelector("[data-tracking-import]");
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    const errorBox = container.querySelector("[data-tracking-error]");
    if (!file) return;
    try {
      const result = window.FooterTracking.parseResult(await file.text());
      const labels = result.players.map((p) => p.label);
      const proposed = window.FooterTracking.proposeMapping(labels, state.players);
      result.players.forEach((p) => {
        if (p.playerId && findPlayer(p.playerId)) proposed[p.label] = p.playerId;
      });
      const mapping = window.FooterTracking.inheritMapping(labels, getTrackingEntry(game.id)?.mapping, proposed);
      input.disabled = true;
      await importTrackingResult(game, result, mapping, file.name);
      renderHistoryGameDetail();
    } catch (error) {
      input.disabled = false;
      if (errorBox) {
        errorBox.textContent = error.message || "Não foi possível ler o ficheiro.";
        errorBox.hidden = false;
      }
    }
  });
  container.querySelector("[data-tracking-preview]")?.addEventListener("change", (event) => {
    trackingPreviewByGame[game.id] = event.target.value;
    renderHistoryGameDetail();
  });
  const showTrackingError = (error) => {
    const box = container.querySelector(".tracking-mapping [data-tracking-error]");
    if (box) {
      box.textContent = error.message || "Não foi possível concluir.";
      box.hidden = false;
    }
  };
  container.querySelector("[data-tracking-save-map]")?.addEventListener("click", async (event) => {
    const entry = getTrackingEntry(game.id);
    if (!entry) return;
    container.querySelectorAll("[data-tracking-map]").forEach((select) => {
      entry.mapping[select.dataset.trackingMap] = select.value || null;
    });
    event.currentTarget.disabled = true;
    try {
      await saveTrackingMapping(game, entry);
      renderHistoryGameDetail();
    } catch (error) {
      event.currentTarget.disabled = false;
      showTrackingError(error);
    }
  });
  container.querySelector("[data-tracking-publish]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (button.dataset.confirming !== "1") {
      button.dataset.confirming = "1";
      button.textContent = "Carrega outra vez para publicar ao grupo";
      return;
    }
    button.disabled = true;
    try {
      await publishTrackingResult(game, getTrackingEntry(game.id));
      renderHistoryGameDetail();
    } catch (error) {
      button.disabled = false;
      showTrackingError(error);
    }
  });
  container.querySelector("[data-tracking-remove]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    if (button.dataset.confirming !== "1") {
      button.dataset.confirming = "1";
      button.textContent = "Carrega outra vez para remover";
      return;
    }
    button.disabled = true;
    try {
      await removeTrackingResult(game, getTrackingEntry(game.id));
      renderHistoryGameDetail();
    } catch (error) {
      button.disabled = false;
      showTrackingError(error);
    }
  });
}

// ---- Vídeo do jogo (YouTube «não listado», supabase/video-migration.sql) ----
// Só o ID do vídeo fica guardado. Cada parte diz em que segundo do tracker começa (gameStartS) e que segundo
// do vídeo lhe corresponde (videoStartS), para os tempos da análise saltarem para o momento certo.
// Sem a tabela ou sem sessão, fica neste dispositivo (localStorage), como o tracking.
const GAME_VIDEOS_KEY = "footer-game-videos-v1";
let gameVideos = (() => {
  try {
    return JSON.parse(window.localStorage.getItem(GAME_VIDEOS_KEY) || "{}") || {};
  } catch {
    return {};
  }
})();
let gameVideosRemote = false;

function gameVideoPartFromRow(row) {
  return {
    id: row.id, position: row.position, youtubeId: row.youtube_id, label: row.label || "",
    gameStartS: Number(row.game_start_s) || 0, videoStartS: Number(row.video_start_s) || 0,
    gameEndS: row.game_end_s == null ? null : Number(row.game_end_s),
    createdAt: row.created_at || null,
  };
}

function isActiveGroupGameRow(row) {
  return !activeGroupId || state.games.some((game) => game.id === row.game_id);
}

async function loadRemoteVideos() {
  if (!remoteEnabled || !supabaseClient || !currentSession?.user) return;
  const { data, error } = await supabaseClient.from("game_videos").select("*").order("position");
  if (error) {
    console.warn("Game videos load failed. Run supabase/video-migration.sql.", error);
    gameVideosRemote = false;
    return;
  }
  gameVideosRemote = true;
  const byGame = {};
  (data || []).filter(isActiveGroupGameRow).forEach((row) => { (byGame[row.game_id] ||= []).push(gameVideoPartFromRow(row)); });
  gameVideos = byGame;
}

function saveLocalVideos() {
  try {
    window.localStorage.setItem(GAME_VIDEOS_KEY, JSON.stringify(gameVideos));
    return true;
  } catch {
    return false;
  }
}

function getGameVideoParts(gameId) {
  return [...(gameVideos[gameId] || [])].sort((a, b) => a.position - b.position);
}

async function addGameVideoPart(game, part) {
  const parts = getGameVideoParts(game.id);
  const position = (parts.length ? Math.max(...parts.map((v) => v.position)) : 0) + 1;
  if (!gameVideosRemote) {
    gameVideos[game.id] = [...parts, { ...part, id: `local-${Date.now()}`, position, createdAt: new Date().toISOString() }];
    if (!saveLocalVideos()) throw new Error("Não foi possível guardar neste dispositivo.");
    return;
  }
  const { data, error } = await supabaseClient.from("game_videos").insert({
    game_id: game.id, position, youtube_id: part.youtubeId, label: part.label || null,
    game_start_s: part.gameStartS, video_start_s: part.videoStartS, game_end_s: part.gameEndS,
  }).select("*").single();
  if (error) throw new Error(`Não foi possível guardar o vídeo: ${error.message}`);
  gameVideos[game.id] = [...parts, gameVideoPartFromRow(data)];
}

async function removeGameVideoPart(game, partId) {
  if (gameVideosRemote) {
    const { error } = await supabaseClient.from("game_videos").delete().eq("id", partId);
    if (error) throw new Error(`Não foi possível remover o vídeo: ${error.message}`);
  }
  gameVideos[game.id] = getGameVideoParts(game.id).filter((v) => v.id !== partId);
  if (!gameVideosRemote) saveLocalVideos();
}

function gameVideoEmbedUrl(youtubeId, start = 0, autoplay = false, end = null) {
  // fs=0: o ecra cheio e o nosso (data-video-stage), para os momentos poderem ser marcados por cima.
  const params = new URLSearchParams({ enablejsapi: "1", playsinline: "1", rel: "0", fs: "0" });
  if (start > 0) params.set("start", String(Math.floor(start)));
  if (end != null && end > start) params.set("end", String(Math.ceil(end)));
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}?${params}`;
}

// ---- Momentos (bookmarks) nos videos: supabase/bookmarks-migration.sql ----
// Qualquer jogador com conta marca um momento com comentario; tocar no momento mostra so esse pedaco.
// Os tempos sao do video do YouTube (nao da analise). Sem a tabela, ficam neste dispositivo.
const VIDEO_BOOKMARKS_KEY = "footer-video-bookmarks-v1";
const BOOKMARK_BEFORE_S = 8;
const BOOKMARK_AFTER_S = 5;
const LEGACY_BOOKMARK_BEFORE_S = 5;
// Destaque no video: de 1 s antes ate 2 s depois do momento marcado.
const MOMENT_LIVE_BEFORE_S = 1;
const MOMENT_LIVE_AFTER_S = 2;

// Momentos antigos guardados com o inicio por defeito (-5 s) tambem passam a comecar 8 s antes.
// Um inicio ajustado a mao mantem-se.
function getClipStart(item) {
  if (Math.abs(item.momentS - item.startS - LEGACY_BOOKMARK_BEFORE_S) < 0.5) return Math.max(0, item.momentS - BOOKMARK_BEFORE_S);
  return item.startS;
}
let videoBookmarks = (() => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(VIDEO_BOOKMARKS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
})();
let videoBookmarksRemote = false;

function videoBookmarkFromRow(row) {
  return {
    id: row.id, gameId: row.game_id, youtubeId: row.youtube_id,
    momentS: Number(row.moment_s) || 0, startS: Number(row.start_s) || 0, endS: Number(row.end_s) || 0,
    note: row.note || "", authorName: row.author_name || "", createdBy: row.created_by, createdAt: row.created_at,
  };
}

async function loadRemoteBookmarks() {
  if (!remoteEnabled || !supabaseClient || !currentSession?.user) return;
  const { data, error } = await supabaseClient.from("game_video_bookmarks").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) {
    console.warn("Video bookmarks load failed. Run supabase/bookmarks-migration.sql.", error);
    videoBookmarksRemote = false;
    return;
  }
  videoBookmarksRemote = true;
  videoBookmarks = (data || []).filter(isActiveGroupGameRow).map(videoBookmarkFromRow);
}

function saveLocalBookmarks() {
  try {
    window.localStorage.setItem(VIDEO_BOOKMARKS_KEY, JSON.stringify(videoBookmarks));
    return true;
  } catch {
    return false;
  }
}

function getGameBookmarks(gameId) {
  return videoBookmarks.filter((item) => item.gameId === gameId).sort((a, b) => a.momentS - b.momentS);
}

function getBookmarkAuthorName() {
  return currentProfile?.display_name || getLinkedPlayer()?.name || currentProfile?.username || "Jogador";
}

async function addVideoBookmark(bookmark) {
  const authorName = getBookmarkAuthorName();
  if (!videoBookmarksRemote) {
    videoBookmarks = [{ ...bookmark, id: `local-${Date.now()}`, authorName, createdBy: currentSession?.user?.id || "local", createdAt: new Date().toISOString() }, ...videoBookmarks];
    if (!saveLocalBookmarks()) throw new Error("Nao foi possivel guardar neste dispositivo.");
    return;
  }
  const { data, error } = await supabaseClient.from("game_video_bookmarks").insert({
    game_id: bookmark.gameId, youtube_id: bookmark.youtubeId, moment_s: bookmark.momentS,
    start_s: bookmark.startS, end_s: bookmark.endS, note: bookmark.note, author_name: authorName,
  }).select("*").single();
  if (error) throw new Error(`Nao foi possivel guardar o momento: ${error.message}`);
  videoBookmarks = [videoBookmarkFromRow(data), ...videoBookmarks];
}

async function removeVideoBookmark(id) {
  if (videoBookmarksRemote) {
    const { error } = await supabaseClient.from("game_video_bookmarks").delete().eq("id", id);
    if (error) throw new Error(`Nao foi possivel apagar o momento: ${error.message}`);
  }
  videoBookmarks = videoBookmarks.filter((item) => item.id !== id);
  if (!videoBookmarksRemote) saveLocalBookmarks();
}

function canDeleteBookmark(bookmark) {
  if (isAdmin) return true;
  const userId = currentSession?.user?.id || "local";
  return bookmark.createdBy === userId;
}

// Relogio do leitor: o YouTube envia o tempo atual por postMessage depois de um pedido "listening".
const videoClocks = new WeakMap();
window.addEventListener("message", (event) => {
  let host = "";
  try {
    host = new URL(event.origin).hostname;
  } catch {
    return;
  }
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return;
  let data = event.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return;
    }
  }
  const info = data?.info;
  if (!info || !event.source) return;
  const previous = videoClocks.get(event.source) || {};
  videoClocks.set(event.source, {
    time: typeof info.currentTime === "number" ? info.currentTime : previous.time,
    duration: typeof info.duration === "number" && info.duration > 0 ? info.duration : previous.duration,
    playing: typeof info.playerState === "number" ? info.playerState === 1 : previous.playing,
    at: performance.now(),
  });
});

function listenToVideoClock(frame) {
  if (!frame) return;
  const hello = () => frame.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: "footer-video", channel: "widget" }), "*");
  frame.addEventListener("load", () => {
    hello();
    // O leitor pode ainda nao estar pronto no load; repete o pedido algumas vezes.
    [500, 1500, 3000].forEach((delay) => setTimeout(hello, delay));
  });
}

function getVideoCurrentTime(frame) {
  const clock = frame?.contentWindow ? videoClocks.get(frame.contentWindow) : null;
  if (!clock || typeof clock.time !== "number") return null;
  return clock.playing ? clock.time + (performance.now() - clock.at) / 1000 : clock.time;
}

function getVideoDuration(frame) {
  const clock = frame?.contentWindow ? videoClocks.get(frame.contentWindow) : null;
  return clock?.duration || null;
}

// ---- Momentos durante o video ----
// A barra do YouTube nao pode ser alterada (o leitor e um iframe de outro dominio). Por isso, por baixo
// do video ha uma barra propria com os momentos, e o video ganha um destaque quando o momento acontece.
const momentTrackers = new Map();
let momentTrackerTimer = null;

function attachMomentTracker(stage, game, { getFrame, playClip }) {
  if (!stage) return;
  let timeline = stage.nextElementSibling;
  if (!timeline?.matches?.("[data-moment-timeline]")) {
    timeline = document.createElement("div");
    timeline.className = "moment-timeline hidden";
    timeline.dataset.momentTimeline = "";
    stage.after(timeline);
  }
  let live = stage.querySelector("[data-moment-live]");
  if (!live) {
    live = document.createElement("div");
    live.className = "moment-live hidden";
    live.dataset.momentLive = "";
    live.setAttribute("aria-live", "polite");
    stage.append(live);
  }
  timeline.onclick = (event) => {
    const marker = event.target.closest("[data-timeline-moment]");
    const item = marker && videoBookmarks.find((entry) => entry.id === marker.dataset.timelineMoment);
    if (item) playClip(item);
  };
  momentTrackers.set(stage, { game, getFrame, timeline, live, key: "", liveId: null });
  if (!momentTrackerTimer) momentTrackerTimer = setInterval(tickMomentTrackers, 250);
}

function tickMomentTrackers() {
  momentTrackers.forEach((tracker, stage) => {
    if (!stage.isConnected) {
      tracker.timeline.remove();
      momentTrackers.delete(stage);
      return;
    }
    if (!stage.offsetParent && !stage.classList.contains("is-fullscreen")) return;
    const frame = tracker.getFrame();
    const youtubeId = frame?.dataset.youtubeId;
    const duration = getVideoDuration(frame);
    const now = getVideoCurrentTime(frame);
    const items = youtubeId ? getGameBookmarks(tracker.game.id).filter((item) => item.youtubeId === youtubeId) : [];

    const key = `${youtubeId}|${duration}|${items.map((item) => item.id).join(",")}`;
    if (key !== tracker.key) {
      tracker.key = key;
      tracker.timeline.classList.toggle("hidden", !duration || !items.length);
      tracker.timeline.innerHTML = duration ? `
        <span class="moment-timeline-track"><span class="moment-timeline-head" data-timeline-head></span></span>
        ${items.map((item) => `
          <button type="button" class="moment-timeline-mark" data-timeline-moment="${escapeHtml(item.id)}"
            style="left:${Math.min(100, (item.momentS / duration) * 100).toFixed(2)}%"
            title="${escapeHtml(`${formatVideoClock(item.momentS)} · ${item.note}`)}" aria-label="${escapeHtml(`Ver momento: ${item.note}`)}"></button>`).join("")}` : "";
    }
    const head = tracker.timeline.querySelector("[data-timeline-head]");
    if (head && duration && now != null) head.style.width = `${Math.min(100, (now / duration) * 100).toFixed(2)}%`;

    const current = now == null ? null : items.find((item) => now >= item.momentS - MOMENT_LIVE_BEFORE_S && now <= item.momentS + MOMENT_LIVE_AFTER_S);
    if ((current?.id || null) !== tracker.liveId) {
      tracker.liveId = current?.id || null;
      stage.classList.toggle("moment-live-on", Boolean(current));
      tracker.live.classList.toggle("hidden", !current);
      tracker.live.innerHTML = current ? `<span class="moment-live-dot" aria-hidden="true"></span><strong>${escapeHtml(current.note)}</strong><small>${escapeHtml(current.authorName || "Jogador")}</small>` : "";
      tracker.timeline.querySelectorAll("[data-timeline-moment]").forEach((mark) => mark.classList.toggle("active", mark.dataset.timelineMoment === tracker.liveId));
    }
  });
  if (!momentTrackers.size) {
    clearInterval(momentTrackerTimer);
    momentTrackerTimer = null;
  }
}

function sendVideoCommand(frame, func, args = []) {
  frame?.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
}

function renderMomentsList(game) {
  const items = getGameBookmarks(game.id);
  const parts = getGameVideoParts(game.id);
  if (!items.length) return `<p class="moments-empty">Ainda sem momentos. Carrega em "Marcar momento" enquanto ves o video.</p>`;
  return `<ul class="moments-list">
    ${items.map((item) => {
      const partIndex = parts.findIndex((part) => part.youtubeId === item.youtubeId);
      const partLabel = parts.length > 1 && partIndex >= 0 ? `${parts[partIndex].label || `Parte ${partIndex + 1}`} · ` : "";
      return `
        <li class="moment-item">
          <button type="button" class="moment-play" data-moment-play="${escapeHtml(item.id)}">
            <span class="moment-time">▶ ${escapeHtml(formatVideoClock(item.momentS))}</span>
            <span class="moment-text">
              <strong>${escapeHtml(item.note)}</strong>
              <small>${escapeHtml(partLabel)}${escapeHtml(item.authorName || "Jogador")}</small>
            </span>
          </button>
          ${renderMomentShareButton(item)}
          ${canDeleteBookmark(item) ? `<button type="button" class="moment-delete" data-moment-delete="${escapeHtml(item.id)}" aria-label="Apagar momento">&times;</button>` : ""}
        </li>`;
    }).join("")}
  </ul>`;
}

function canMarkMoments() {
  return !remoteEnabled || Boolean(currentSession?.user);
}

function renderMomentForm(extraClass = "") {
  return `
    <form class="moment-form ${extraClass} hidden" data-moment-form>
      <div class="moment-form-time">
        <label>Momento <input type="text" name="moment" inputmode="numeric" placeholder="mm:ss" required></label>
        <span class="moment-window" data-moment-window></span>
      </div>
      <div class="moment-adjust" role="group" aria-label="Ajustar pedaco">
        <span>Inicio</span><button type="button" data-moment-adjust="start:-5">−5 s</button><button type="button" data-moment-adjust="start:5">+5 s</button>
        <span>Fim</span><button type="button" data-moment-adjust="end:-5">−5 s</button><button type="button" data-moment-adjust="end:5">+5 s</button>
      </div>
      <input type="text" name="note" maxlength="140" placeholder="Ex.: Golaco do Cunha" required autocomplete="off">
      <p class="tracking-error" data-moment-error hidden></p>
      <div class="moment-form-actions">
        <button type="button" class="ghost-btn" data-moment-cancel>Cancelar</button>
        <button type="submit" class="primary-btn">Guardar momento</button>
      </div>
    </form>`;
}

function renderMomentsBlock(game) {
  if (!getGameVideoParts(game.id).length) return "";
  return `
    <div class="moments" data-moments>
      <div class="moments-head">
        <h4>Momentos</h4>
        <div class="moments-actions">
          <button type="button" class="ghost-btn moments-fs" data-stage-open>${STAGE_FS_ICON}<span>Ecra cheio</span></button>
          ${canMarkMoments() ? `<button type="button" class="primary-btn moments-mark" data-moment-mark>🔖 Marcar momento</button>` : `<small class="moments-hint">Entra para marcar momentos</small>`}
        </div>
      </div>
      ${renderMomentForm()}
      <div data-moments-list>${renderMomentsList(game)}</div>
    </div>`;
}

// Ecra cheio proprio (em vez do do YouTube) para se poder marcar momentos por cima do video.
const STAGE_FS_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>`;
const STAGE_EXIT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>`;

function renderStageControls() {
  return `
    <button type="button" class="stage-btn stage-fs" data-stage-fullscreen aria-label="Ecra cheio">${STAGE_FS_ICON}</button>
    ${canMarkMoments() ? `
      <button type="button" class="stage-btn stage-mark" data-stage-mark aria-label="Marcar momento">🔖</button>
      ${renderMomentForm("stage-form")}` : ""}`;
}

function isStageFullscreen(stage) {
  return stage.classList.contains("is-fullscreen");
}

function setStageFullscreenUi(stage, active) {
  stage.classList.toggle("is-fullscreen", active);
  const button = stage.querySelector("[data-stage-fullscreen]");
  if (button) {
    button.innerHTML = active ? STAGE_EXIT_ICON : STAGE_FS_ICON;
    button.setAttribute("aria-label", active ? "Sair do ecra cheio" : "Ecra cheio");
  }
  if (!active) stage.querySelector(".stage-form")?.classList.add("hidden");
}

async function toggleStageFullscreen(stage) {
  const nativeElement = document.fullscreenElement || document.webkitFullscreenElement;
  if (isStageFullscreen(stage)) {
    if (nativeElement) {
      await Promise.resolve((document.exitFullscreen || document.webkitExitFullscreen).call(document)).catch(() => {});
    }
    stage.classList.remove("pseudo-fullscreen");
    document.body.classList.remove("stage-open");
    setStageFullscreenUi(stage, false);
    return;
  }
  const request = stage.requestFullscreen || stage.webkitRequestFullscreen;
  try {
    if (!request) throw new Error("no fullscreen");
    await request.call(stage);
    screen.orientation?.lock?.("landscape").catch(() => {});
  } catch {
    // iPhone: sem ecra cheio para elementos; o video ocupa a pagina toda.
    stage.classList.add("pseudo-fullscreen");
    document.body.classList.add("stage-open");
  }
  setStageFullscreenUi(stage, true);
}

document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement) return;
  document.querySelectorAll("[data-video-stage].is-fullscreen:not(.pseudo-fullscreen)").forEach((stage) => setStageFullscreenUi(stage, false));
});
document.addEventListener("webkitfullscreenchange", () => {
  if (document.webkitFullscreenElement) return;
  document.querySelectorAll("[data-video-stage].is-fullscreen:not(.pseudo-fullscreen)").forEach((stage) => setStageFullscreenUi(stage, false));
});

function bindVideoStage(stage) {
  // Um re-render pode tirar da pagina um palco que estava em ecra cheio falso; limpa o estado da pagina.
  if (!document.querySelector("[data-video-stage].pseudo-fullscreen")) document.body.classList.remove("stage-open");
  if (!stage) return;
  on(stage.querySelector("[data-stage-fullscreen]"), "click", () => toggleStageFullscreen(stage));
}

function exitStageFullscreen(stage) {
  if (stage && isStageFullscreen(stage)) toggleStageFullscreen(stage);
}

// Liga um formulario de momento a um leitor. Devolve open() para o abrir com o tempo atual do video.
function wireMomentForm(form, game, { getFrame, onSaved, resumeAfter = false }) {
  const windowLabel = form.querySelector("[data-moment-window]");
  const errorBox = form.querySelector("[data-moment-error]");
  let offsets = { before: BOOKMARK_BEFORE_S, after: BOOKMARK_AFTER_S };
  let youtubeId = null;

  const readMoment = () => window.FooterTracking.parseClock(form.moment.value);
  const updateWindow = () => {
    const moment = readMoment();
    if (moment == null) {
      windowLabel.textContent = "";
      return;
    }
    const start = Math.max(0, moment - offsets.before);
    windowLabel.textContent = `Pedaco: ${formatVideoClock(start)} – ${formatVideoClock(moment + offsets.after)}`;
  };
  const showError = (message) => {
    errorBox.textContent = message;
    errorBox.hidden = !message;
  };
  const close = () => {
    form.classList.add("hidden");
    showError("");
    if (resumeAfter) sendVideoCommand(getFrame(), "playVideo");
  };

  on(form.moment, "input", updateWindow);
  form.querySelectorAll("[data-moment-adjust]").forEach((button) => on(button, "click", () => {
    const [edge, delta] = button.dataset.momentAdjust.split(":");
    const change = Number(delta);
    if (edge === "start") offsets.before = Math.min(60, Math.max(0, offsets.before - change));
    else offsets.after = Math.min(60, Math.max(1, offsets.after + change));
    updateWindow();
  }));
  on(form.querySelector("[data-moment-cancel]"), "click", close);
  on(form, "submit", async (event) => {
    event.preventDefault();
    const moment = readMoment();
    const note = form.note.value.trim();
    if (moment == null) return showError("Escreve o momento como mm:ss (por exemplo 23:41).");
    if (!note) return showError("Escreve um comentario curto.");
    const submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    try {
      await addVideoBookmark({
        gameId: game.id,
        youtubeId: youtubeId || getGameVideoParts(game.id)[0]?.youtubeId,
        momentS: Math.round(moment * 10) / 10,
        startS: Math.max(0, Math.floor(moment - offsets.before)),
        endS: Math.ceil(moment + offsets.after),
        note,
      });
      close();
      onSaved();
    } catch (error) {
      showError(error.message || "Nao foi possivel guardar o momento.");
    } finally {
      submit.disabled = false;
    }
  });

  return {
    open() {
      const frame = getFrame();
      youtubeId = frame?.dataset.youtubeId || getGameVideoParts(game.id)[0]?.youtubeId;
      const now = getVideoCurrentTime(frame);
      sendVideoCommand(frame, "pauseVideo");
      offsets = { before: BOOKMARK_BEFORE_S, after: BOOKMARK_AFTER_S };
      form.moment.value = now == null ? "" : formatVideoClock(now);
      form.note.value = "";
      showError(now == null ? "Nao consegui ler o tempo do video. Escreve o momento (mm:ss)." : "");
      form.classList.remove("hidden");
      updateWindow();
      (now == null ? form.moment : form.note).focus();
    },
  };
}

// Liga o bloco de momentos a um leitor. getFrame devolve o iframe atual; playClip mostra um pedaco.
function bindMomentsBlock(root, game, { getFrame, playClip }) {
  const block = root?.querySelector("[data-moments]");
  if (!block) return;
  const refreshList = () => {
    block.querySelector("[data-moments-list]").innerHTML = renderMomentsList(game);
    bindList();
    if (galleryMode === "highlights") renderGallery();
  };
  const bindList = () => {
    block.querySelectorAll("[data-moment-play]").forEach((button) => on(button, "click", () => {
      const item = videoBookmarks.find((entry) => entry.id === button.dataset.momentPlay);
      if (item) playClip(item);
    }));
    block.querySelectorAll("[data-moment-delete]").forEach((button) => on(button, "click", async () => {
      if (button.dataset.confirming !== "1") {
        button.dataset.confirming = "1";
        button.textContent = "Apagar?";
        button.classList.add("confirming");
        return;
      }
      button.disabled = true;
      try {
        await removeVideoBookmark(button.dataset.momentDelete);
        refreshList();
      } catch (error) {
        button.disabled = false;
        alert(error.message);
      }
    }));
  };

  const mainForm = block.querySelector("[data-moment-form]");
  if (mainForm) {
    const main = wireMomentForm(mainForm, game, { getFrame, onSaved: refreshList });
    on(block.querySelector("[data-moment-mark]"), "click", () => main.open());
  }
  const stage = getFrame()?.closest("[data-video-stage]");
  on(block.querySelector("[data-stage-open]"), "click", () => {
    if (stage) toggleStageFullscreen(stage);
  });
  const stageForm = stage?.querySelector(".stage-form");
  if (stageForm) {
    const overlay = wireMomentForm(stageForm, game, { getFrame, onSaved: refreshList, resumeAfter: true });
    on(stage.querySelector("[data-stage-mark]"), "click", () => overlay.open());
  }
  bindList();
}

// A tracker time as a button that jumps the game video there; plain text when the game has no video.
function videoClockLink(gameId, seconds) {
  const text = formatVideoClock(seconds);
  if (!gameId || !window.FooterTracking.videoSeekTarget(getGameVideoParts(gameId), seconds)) return text;
  return `<button type="button" class="link-btn video-seek" data-video-seek="${Number(seconds).toFixed(1)}" title="Ver no vídeo">▶ ${text}</button>`;
}

function renderGameVideoSection(game) {
  const parts = getGameVideoParts(game.id);
  if (!parts.length && !isAdmin) return "";
  const first = parts[0];
  const timeText = (s) => formatVideoClock(s);
  return `
    <section class="profile-section tracking-section game-video-section${parts.length ? "" : " admin-only"}" data-game-video-section>
      <div class="tracking-head"><h3>Vídeo do jogo</h3>${parts.length ? "" : `<span class="tracking-badge">Só admins veem</span>`}</div>
      ${parts.length ? `
        ${parts.length > 1 ? `
          <div class="tracking-pitch-tabs game-video-parts" role="group" aria-label="Parte do vídeo">
            ${parts.map((v, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-video-part="${escapeHtml(v.youtubeId)}" aria-pressed="${i === 0}">${escapeHtml(v.label || `Parte ${i + 1}`)}</button>`).join("")}
          </div>` : ""}
        <div class="video-stage" data-video-stage>
          <div class="game-video-frame">
            <iframe data-game-video data-youtube-id="${escapeHtml(first.youtubeId)}" src="${gameVideoEmbedUrl(first.youtubeId, first.videoStartS)}"
              title="Vídeo do jogo" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>
          </div>
          ${renderStageControls()}
        </div>
        <p class="tracking-fineprint">Vídeo não listado no YouTube: só quem tem a ligação o encontra.${getTrackingEntry(game.id) ? " Os tempos com ▶ na análise abaixo saltam para esse momento." : ""}</p>
        ${renderMomentsBlock(game)}` : `
        <p class="tracking-note">Ainda sem vídeo. Envia o jogo para o YouTube como <strong>não listado</strong> e cola aqui a ligação.</p>`}
      ${isAdmin ? `
        <details class="tracking-admin admin-only" ${parts.length ? "" : "open"}>
          <summary>${parts.length ? "Gerir vídeo · só admin" : "Juntar vídeo · só admin"}</summary>
          ${parts.length ? `
            <ul class="game-video-list">
              ${parts.map((v, i) => `
                <li>
                  <span><strong>${escapeHtml(v.label || `Parte ${i + 1}`)}</strong> · <code>${escapeHtml(v.youtubeId)}</code> · começa aos ${timeText(v.gameStartS)} da análise${v.videoStartS ? `, que no vídeo é ${timeText(v.videoStartS)}` : ""}${v.gameEndS != null ? `, acaba aos ${timeText(v.gameEndS)}` : ""}</span>
                  <button class="danger-btn" type="button" data-video-remove="${escapeHtml(v.id)}">Remover</button>
                </li>`).join("")}
            </ul>` : ""}
          <form class="game-video-form" data-video-form>
            <label>Ligação do YouTube<input type="text" name="url" required placeholder="https://youtu.be/…" autocomplete="off"></label>
            <label>Nome da parte <small>(opcional)</small><input type="text" name="label" maxlength="60" placeholder="${parts.length ? `Parte ${parts.length + 1}` : "Jogo todo"}"></label>
            <label>Começa aos … da análise<input type="text" name="gameStart" inputmode="numeric" value="${parts.length ? "" : "0:00"}" placeholder="mm:ss" ${parts.length ? "required" : ""}></label>
            <label>Esse momento no vídeo é aos<input type="text" name="videoStart" inputmode="numeric" value="0:00" placeholder="mm:ss"></label>
            <label>Acaba aos … da análise <small>(opcional)</small><input type="text" name="gameEnd" inputmode="numeric" placeholder="mm:ss"></label>
            <p class="tracking-fineprint">Se enviaste para o YouTube o mesmo ficheiro que foi analisado, deixa 0:00 nos dois. Num vídeo com outro início, indica onde está no vídeo o primeiro momento analisado. Com o jogo em duas gravações, junta uma parte de cada vez; a 2.ª começa onde a 1.ª acabou na análise.</p>
            <div class="tracking-actions"><button class="primary-btn" type="submit">Guardar vídeo</button></div>
          </form>
          <p class="tracking-error" data-video-error hidden></p>
        </details>` : ""}
    </section>
  `;
}

function seekGameVideo(container, game, seconds) {
  const target = window.FooterTracking.videoSeekTarget(getGameVideoParts(game.id), seconds);
  const frame = container.querySelector("[data-game-video]");
  if (!target || !frame) return;
  showGameVideoPart(container, target.part.youtubeId);
  if (frame.dataset.youtubeId === target.part.youtubeId && frame.dataset.ready === "1") {
    // Same video already loaded: move it without reloading (YouTube iframe API by postMessage).
    const send = (func, args = []) => frame.contentWindow?.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    send("seekTo", [target.seconds, true]);
    send("playVideo");
  } else {
    frame.dataset.ready = "0";
    frame.dataset.youtubeId = target.part.youtubeId;
    frame.src = gameVideoEmbedUrl(target.part.youtubeId, target.seconds, true);
  }
  frame.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showGameVideoPart(container, youtubeId) {
  container.querySelectorAll("[data-video-part]").forEach((button) => {
    const on = button.dataset.videoPart === youtubeId;
    button.classList.toggle("active", on);
    button.setAttribute("aria-pressed", String(on));
  });
}

function bindGameVideoSection(game, container) {
  const section = container?.querySelector("[data-game-video-section]");
  if (!section) return;
  const frame = section.querySelector("[data-game-video]");
  frame?.addEventListener("load", () => { frame.dataset.ready = "1"; });
  listenToVideoClock(frame);
  bindVideoStage(section.querySelector("[data-video-stage]"));
  const playSectionClip = (item) => {
    if (!frame) return;
    showGameVideoPart(section, item.youtubeId);
    frame.dataset.ready = "0";
    frame.dataset.youtubeId = item.youtubeId;
    frame.src = gameVideoEmbedUrl(item.youtubeId, getClipStart(item), true, item.endS);
    frame.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  bindMomentsBlock(section, game, { getFrame: () => frame, playClip: playSectionClip });
  attachMomentTracker(section.querySelector("[data-video-stage]"), game, { getFrame: () => frame, playClip: playSectionClip });
  // Time links live in the tracking sections below, so listen on the whole game page. The page element
  // outlives each render, so the listener is added once and reads the game shown at click time.
  if (container.dataset.videoSeekBound !== "1") {
    container.dataset.videoSeekBound = "1";
    container.addEventListener("click", (event) => {
      const seek = event.target.closest?.("[data-video-seek]");
      const shown = state.games.find((item) => item.id === currentHistoryGameId);
      if (seek && shown) seekGameVideo(container, shown, Number(seek.dataset.videoSeek));
    });
  }
  section.querySelectorAll("[data-video-part]").forEach((button) => {
    button.addEventListener("click", () => {
      const part = getGameVideoParts(game.id).find((v) => v.youtubeId === button.dataset.videoPart);
      if (!part || !frame) return;
      showGameVideoPart(section, part.youtubeId);
      frame.dataset.ready = "0";
      frame.dataset.youtubeId = part.youtubeId;
      frame.src = gameVideoEmbedUrl(part.youtubeId, part.videoStartS);
    });
  });
  const showError = (message) => {
    const box = section.querySelector("[data-video-error]");
    if (box) {
      box.textContent = message;
      box.hidden = false;
    }
  };
  section.querySelector("[data-video-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const tracking = window.FooterTracking;
    const youtubeId = tracking.parseYoutubeId(form.url.value);
    const gameStartS = tracking.parseClock(form.gameStart.value);
    const videoStartS = tracking.parseClock(form.videoStart.value);
    const gameEndS = form.gameEnd.value.trim() ? tracking.parseClock(form.gameEnd.value) : null;
    if (!youtubeId) return showError("Não reconheço essa ligação do YouTube. Copia-a do botão Partilhar do vídeo.");
    if (gameStartS == null || videoStartS == null || Number.isNaN(gameEndS) || (form.gameEnd.value.trim() && gameEndS == null)) return showError("Escreve os tempos como mm:ss (por exemplo 26:29).");
    if (gameEndS != null && gameEndS <= gameStartS) return showError("O fim tem de ser depois do começo.");
    if (getGameVideoParts(game.id).some((v) => v.gameStartS === gameStartS)) return showError("Já há uma parte que começa nesse momento da análise.");
    const button = form.querySelector("button[type=submit]");
    button.disabled = true;
    try {
      await addGameVideoPart(game, { youtubeId, label: form.label.value.trim(), gameStartS, videoStartS, gameEndS });
      renderHistoryGameDetail();
    } catch (error) {
      button.disabled = false;
      showError(error.message || "Não foi possível guardar o vídeo.");
    }
  });
  section.querySelectorAll("[data-video-remove]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.confirming !== "1") {
        button.dataset.confirming = "1";
        button.textContent = "Carrega outra vez para remover";
        return;
      }
      button.disabled = true;
      try {
        await removeGameVideoPart(game, button.dataset.videoRemove);
        renderHistoryGameDetail();
      } catch (error) {
        button.disabled = false;
        showError(error.message);
      }
    });
  });
}


function renderHistoryGameDetail() {
  if (!els.historyGameDetail) return;
  const game = state.games.find((item) => item.id === currentHistoryGameId);
  if (!game) {
    els.historyGameDetail.innerHTML = `<div class="empty-state">Escolhe um jogo finalizado no historico.</div>`;
    return;
  }
  const gameTitle = getGameTitle(game);
  els.historyGameDetail.innerHTML = `
    <div class="history-game-title">
      <p class="eyebrow">Historico de jogo</p>
      <h3>${escapeHtml(gameTitle)}</h3>
      <div class="history-game-date-edit admin-actions">
        <label class="game-date-control">
          <span>Data/hora</span>
          <input type="datetime-local" data-history-game-date="${game.id}" value="${toDateTimeLocalInput(game.date)}">
        </label>
        <button class="ghost-btn" data-save-history-game-date="${game.id}">Guardar data</button>
      </div>
    </div>
    <div class="field-card history-field-card">
      ${renderField(game, { radarPosition: "none", clickablePlayers: true })}
    </div>
    <section class="profile-section history-radar-section">
      <h3>Equipas em comparação</h3>
      ${renderTeamRadarChart([...hydrate(game.teamA), ...hydrate(getBenchA(game))], [...hydrate(game.teamB), ...hydrate(getBenchB(game))], { inlineOdds: true })}
    </section>
    ${renderHistoryRosterEditor(game)}
    ${renderGameVideoSection(game)}
    ${renderTrackingTestSection(game)}
  `;
  els.historyGameDetail.querySelector("[data-save-history-game-date]")?.addEventListener("click", async (buttonEvent) => {
    const gameId = buttonEvent.currentTarget.dataset.saveHistoryGameDate;
    const input = [...els.historyGameDetail.querySelectorAll("[data-history-game-date]")]
      .find((item) => item.dataset.historyGameDate === gameId);
    const date = fromDateTimeLocalInput(input?.value);
    if (!date) {
      alert("Escolhe uma data e hora valida.");
      return;
    }
    await updateGameDate(gameId, date);
  });
  els.historyGameDetail.querySelectorAll("[data-open-field-player]").forEach((card) => {
    card.addEventListener("click", () => openPlayerProfile(card.dataset.openFieldPlayer));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPlayerProfile(card.dataset.openFieldPlayer);
      }
    });
  });
  bindHistoryRosterEditorActions(game);
  bindMvpPanelActions(game, els.historyGameDetail);
  bindTrackingTestSection(game, els.historyGameDetail);
  bindGameVideoSection(game, els.historyGameDetail);
}

function renderHistoryRosterEditor(game) {
  if (!isAdmin) return "";
  const groups = getRosterEditorGroups(game);
  const inGame = new Set(getGamePlayerIds(game));
  const availablePlayers = state.players
    .filter((playerData) => !inGame.has(playerData.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return `
    <section class="profile-section history-roster-section admin-actions">
      <div class="finance-settings-head">
        <div>
          <h3>Editar equipas do jogo</h3>
          <p>Alterar a equipa corrige historico, forma e cartas. Pagamentos seguem os participantes atuais se nao houver override manual.</p>
        </div>
      </div>
      <div class="roster-editor history-roster-editor">
        ${groups.map(([key, label]) => {
          const players = hydrate(game[key] || []);
          return `
            <div class="roster-column">
              <h4>${label} (${players.length})</h4>
              ${players.map((playerData) => renderHistoryRosterRow(game.id, playerData, key)).join("") || `<p class="eyebrow">Vazio</p>`}
            </div>
          `;
        }).join("")}
      </div>
      <div class="history-roster-tools">
        <select data-history-add-player="${game.id}">
          <option value="">Adicionar jogador ao jogo</option>
          ${availablePlayers.map((playerData) => `<option value="${playerData.id}">${escapeHtml(playerData.name)} - ${playerData.overall}</option>`).join("")}
        </select>
        <button class="ghost-btn" data-history-add-to-team="${game.id}" data-to-group="teamA" ${availablePlayers.length ? "" : "disabled"}>Adicionar A</button>
        <button class="ghost-btn" data-history-add-to-team="${game.id}" data-to-group="teamB" ${availablePlayers.length ? "" : "disabled"}>Adicionar B</button>
        <button class="ghost-btn" data-reset-attendance-overrides="${game.id}">Recalcular presencas/pagamentos</button>
      </div>
    </section>
  `;
}

function renderHistoryRosterRow(gameId, playerData, currentGroup) {
  const actions = getRosterMoveActions(currentGroup);

  return `
    <div class="roster-row">
      <strong>${renderAvatar(playerData)} ${escapeHtml(playerData.name)} - ${playerData.overall}</strong>
      <div class="roster-actions">
        ${actions.map(([key, label]) => `<button class="mini-btn" data-history-move-player="${playerData.id}" data-game-id="${gameId}" data-to-group="${key}">${label}</button>`).join("")}
        <button class="mini-btn" data-history-remove-player="${playerData.id}" data-game-id="${gameId}">Remover</button>
      </div>
    </div>
  `;
}

function bindHistoryRosterEditorActions(game) {
  if (!isAdmin || !els.historyGameDetail) return;
  els.historyGameDetail.querySelectorAll("[data-history-move-player]").forEach((button) => {
    button.addEventListener("click", () => movePlayerInHistoryGame(button.dataset.gameId, button.dataset.historyMovePlayer, button.dataset.toGroup));
  });
  els.historyGameDetail.querySelectorAll("[data-history-remove-player]").forEach((button) => {
    button.addEventListener("click", () => removePlayerFromHistoryGame(button.dataset.gameId, button.dataset.historyRemovePlayer));
  });
  els.historyGameDetail.querySelectorAll("[data-history-add-to-team]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = els.historyGameDetail.querySelector(`[data-history-add-player="${button.dataset.historyAddToTeam}"]`);
      addPlayerToHistoryGame(button.dataset.historyAddToTeam, select?.value, button.dataset.toGroup);
    });
  });
  els.historyGameDetail.querySelector("[data-reset-attendance-overrides]")?.addEventListener("click", () => {
    resetAttendanceOverridesForGame(game.id);
  });
}

async function mutateHistoryGame(gameId, mutation) {
  if (!requireAdmin()) return false;
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return false;
  ensureGameShape(game);
  const previousGame = {
    ...game,
    teamA: [...(game.teamA || [])],
    teamB: [...(game.teamB || [])],
    benchA: [...(game.benchA || [])],
    benchB: [...(game.benchB || [])],
  };
  const previousOverrides = attendanceOverrides.map((item) => ({ ...item }));
  mutation(game);
  currentPaymentsMonth = monthKey(game.date);
  try {
    await persistState();
  } catch (error) {
    Object.assign(game, previousGame);
    attendanceOverrides = previousOverrides;
    saveState();
    alert(`Nao consegui guardar alteracao do jogo: ${error.message}`);
    return false;
  }
  render();
  return true;
}

async function movePlayerInHistoryGame(gameId, playerId, toGroup) {
  if (!["teamA", "teamB", "benchA", "benchB"].includes(toGroup)) return;
  await mutateHistoryGame(gameId, (game) => {
    ["teamA", "teamB", "benchA", "benchB"].forEach((group) => {
      game[group] = (game[group] || []).filter((id) => id !== playerId);
    });
    game[toGroup].push(playerId);
  });
}

async function removePlayerFromHistoryGame(gameId, playerId) {
  if (!confirm("Remover este jogador deste jogo? Isto pode alterar pagamentos se nao houver override manual.")) return;
  await mutateHistoryGame(gameId, (game) => {
    ["teamA", "teamB", "benchA", "benchB"].forEach((group) => {
      game[group] = (game[group] || []).filter((id) => id !== playerId);
    });
  });
}

async function addPlayerToHistoryGame(gameId, playerId, toGroup) {
  if (!playerId || !["teamA", "teamB"].includes(toGroup)) return;
  await mutateHistoryGame(gameId, (game) => {
    ["teamA", "teamB", "benchA", "benchB"].forEach((group) => {
      game[group] = (game[group] || []).filter((id) => id !== playerId);
    });
    game[toGroup].push(playerId);
  });
}

async function resetAttendanceOverridesForGame(gameId) {
  if (!confirm("Recalcular presencas deste jogo a partir das equipas atuais? Overrides manuais deste jogo serao removidos.")) return;
  await mutateHistoryGame(gameId, () => {
    attendanceOverrides = attendanceOverrides.filter((item) => item.gameId !== gameId);
  });
}

async function deleteGame(gameId) {
  if (!requireAdmin()) return;
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return;
  if (!confirm(`Apagar o jogo de ${formatDate(game.date)} do historico?`)) return;

  if (remoteEnabled && supabaseClient) {
    const { error } = await supabaseClient.from("games").delete().eq("id", gameId);
    if (error) {
      alert(`Nao consegui apagar jogo: ${error.message}`);
      return;
    }
  }
  state.games = state.games.filter((item) => item.id !== gameId);
  if (currentGameId === gameId) {
    currentGameId = null;
    previewGame = null;
  }
  if (currentHistoryGameId === gameId) {
    currentHistoryGameId = null;
  }
  saveState();
  render();
}

async function exportCurrentGameImage() {
  const game = getCurrentGame();
  if (!game) return;
  await drawGameCanvas(game);
  const link = document.createElement("a");
  link.download = `jogo-5v5-${formatDateForFile(game.date)}.png`;
  link.href = els.exportCanvas.toDataURL("image/png");
  link.click();
}

async function drawGameCanvas(game) {
  const canvas = els.exportCanvas;
  const ctx = canvas.getContext("2d");
  const teamA = hydrate(game.teamA);
  const teamB = hydrate(game.teamB);
  const benchA = hydrate(getBenchA(game));
  const benchB = hydrate(getBenchB(game));
  const squadA = [...teamA, ...benchA];
  const squadB = [...teamB, ...benchB];
  const result = game.scoreA == null || game.scoreB == null ? "vs" : `${game.scoreA} - ${game.scoreB}`;

  await loadExportFonts();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawExportBackground(ctx, canvas.width, canvas.height);

  ctx.fillStyle = "#eef4ff";
  ctx.font = `900 76px ${EXPORT_DISPLAY_FONT}`;
  ctx.fillText("JOGO 5V5", 90, 112);
  ctx.font = `500 32px ${EXPORT_BODY_FONT}`;
  ctx.fillStyle = "#8a9bbb";
  ctx.fillText(formatDate(game.date), 90, 158);

  ctx.save();
  ctx.shadowColor = "rgba(59, 140, 255, .35)";
  ctx.shadowBlur = 40;
  ctx.fillStyle = "#0d1a33";
  roundRect(ctx, 90, 200, 1420, 170, 24);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(130, 175, 255, .3)";
  ctx.lineWidth = 2;
  roundRect(ctx, 90, 200, 1420, 170, 24);
  ctx.stroke();

  drawTeamHeader(ctx, "EQUIPA A", 140, 305, "#34c78a");
  drawTeamHeader(ctx, "EQUIPA B", 1460, 305, "#ff9a4d", "right");
  ctx.textAlign = "center";
  ctx.fillStyle = "#8a9bbb";
  ctx.font = `600 28px ${EXPORT_BODY_FONT}`;
  ctx.fillText(formatDate(game.date), 800, 262);
  ctx.save();
  ctx.fillStyle = "#8cc4ff";
  ctx.shadowColor = "rgba(89, 176, 255, .7)";
  ctx.shadowBlur = 28;
  ctx.font = `900 84px ${EXPORT_DISPLAY_FONT}`;
  ctx.fillText(result.toUpperCase(), 800, 340);
  ctx.restore();
  ctx.textAlign = "left";

  const pitch = { x: 90, y: 410, w: 1420, h: 1230 };
  drawPitch(ctx, pitch);
  for (const [i, p] of orderTeamForField(squadA).entries()) {
    await drawPlayerDot(ctx, p, getCanvasPos(pitch, getPosition("a", i, squadA.length)), "#1f7a4d", game);
  }
  for (const [i, p] of orderTeamForField(squadB).entries()) {
    await drawPlayerDot(ctx, p, getCanvasPos(pitch, getPosition("b", i, squadB.length)), "#c86422", game);
  }
}

const EXPORT_DISPLAY_FONT = '"Big Shoulders Display", "Bahnschrift Condensed", "Arial Narrow", Arial';
const EXPORT_BODY_FONT = 'Archivo, "Segoe UI", Arial';

async function loadExportFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`900 76px "Big Shoulders Display"`),
      document.fonts.load(`600 28px Archivo`),
    ]);
  } catch (error) {
    // Sem rede, o canvas usa as fontes de recurso.
  }
}

function drawExportBackground(ctx, width, height) {
  ctx.fillStyle = "#05080f";
  ctx.fillRect(0, 0, width, height);
  const glow = ctx.createRadialGradient(width / 2, -height * 0.08, 0, width / 2, -height * 0.08, height * 0.6);
  glow.addColorStop(0, "rgba(40, 92, 190, .7)");
  glow.addColorStop(1, "rgba(40, 92, 190, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawTeamHeader(ctx, label, x, y, color, align = "left") {
  ctx.fillStyle = color;
  ctx.font = `900 48px ${EXPORT_DISPLAY_FONT}`;
  ctx.textAlign = align;
  ctx.fillText(label, x, y);
  ctx.textAlign = "left";
}

function drawPitch(ctx, pitch) {
  ctx.fillStyle = "#17603c";
  roundRect(ctx, pitch.x, pitch.y, pitch.w, pitch.h, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,.8)";
  ctx.lineWidth = 5;
  ctx.strokeRect(pitch.x + 18, pitch.y + 18, pitch.w - 36, pitch.h - 36);
  ctx.beginPath();
  ctx.moveTo(pitch.x + pitch.w / 2, pitch.y + 18);
  ctx.lineTo(pitch.x + pitch.w / 2, pitch.y + pitch.h - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(pitch.x + pitch.w / 2, pitch.y + pitch.h / 2, 140, 0, Math.PI * 2);
  ctx.stroke();
}

function getCanvasPos(pitch, pos) {
  return {
    x: pitch.x + pitch.w * (pos.x / 100) + (pos.offsetXPx || 0) * 2,
    y: pitch.y + pitch.h * (pos.y / 100),
  };
}

async function drawPlayerDot(ctx, playerData, pos, color, game = null) {
  const width = pos.cardWidth || 188;
  const height = pos.cardHeight || 258;
  const x = pos.x - width / 2;
  const y = pos.y - height / 2;
  const form = getPlayerForm(playerData);
  const variant = getPlayerCardVariant(playerData, form, game);

  try {
    const cardImg = await loadCardAsset(variant.asset);
    ctx.drawImage(cardImg, x, y, width, height);
  } catch (error) {
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#fff2b8");
    gradient.addColorStop(0.52, "#d6aa45");
    gradient.addColorStop(1, "#8a6420");
    ctx.save();
    cardPath(ctx, x, y, width, height);
    ctx.clip();
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.18;
    ctx.fillRect(x, y, width, height);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  const photo = getCardPhotoRect(x, y, width, height);
  ctx.save();
  roundRect(ctx, photo.x, photo.y, photo.w, photo.h, Math.max(6, width * 0.05));
  ctx.clip();
  if (playerData.photoDataUrl) {
    try {
      const img = await loadPhoto(playerData.photoDataUrl);
      drawSoftImageCover(ctx, img, photo.x, photo.y, photo.w, photo.h, 6);
    } catch (error) {
      drawInitials(ctx, playerData.name, photo.x + photo.w / 2, photo.y + photo.h / 2, Math.min(photo.w, photo.h));
    }
  } else {
    drawInitials(ctx, playerData.name, photo.x + photo.w / 2, photo.y + photo.h / 2, Math.min(photo.w, photo.h));
  }
  ctx.restore();

  ctx.fillStyle = getCardTextColor(variant);
  ctx.shadowColor = isLightTextCardVariant(variant) ? "rgba(0,0,0,.62)" : "rgba(255,255,255,.58)";
  ctx.shadowBlur = Math.max(2, width * 0.018);
  ctx.shadowOffsetY = Math.max(1, width * 0.004);
  ctx.textAlign = "left";
  ctx.font = `900 ${Math.round(width * 0.086)}px Bahnschrift Condensed, Arial Narrow, Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(canSeeCurrentRatings() ? form.currentRating : playerData.overall), x + width * 0.1820, y + height * 0.2482);

  const nameBox = {
    x: x + width * 0.12,
    y: y + height * 0.592,
    w: width * 0.76,
    h: height * 0.105,
  };
  ctx.save();
  roundRect(ctx, nameBox.x, nameBox.y, nameBox.w, nameBox.h, Math.max(8, width * 0.035));
  ctx.fillStyle = isLightTextCardVariant(variant) ? "rgba(14, 20, 22, .38)" : "rgba(255, 241, 208, .45)";
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = `900 ${Math.round(width * 0.092)}px Bahnschrift Condensed, Arial Narrow, Segoe UI, Arial`;
  ctx.fillStyle = getCardTextColor(variant);
  ctx.fillText(shortName(playerData.name, 12).toUpperCase(), x + width * 0.5, y + height * 0.645);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function getCardPhotoRect(x, y, width, height) {
  const photoW = width * 0.49335;
  const photoH = height * 0.426075;
  return {
    x: x + width * 0.3155 - 5,
    y: y + height * 0.66 - photoH,
    w: photoW,
    h: photoH,
  };
}

function cardPath(ctx, x, y, width, height) {
  roundRect(ctx, x, y, width, height, Math.min(22, width * 0.12));
}

function drawImageCover(ctx, img, x, y, width, height) {
  const scale = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = x + (width - drawWidth) / 2;
  const dy = y + (height - drawHeight) * 0.38;
  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
}

function drawSoftImageCover(ctx, img, x, y, width, height, fadePx = 20) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const softCtx = canvas.getContext("2d");
  const scale = Math.max(width / img.width, height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) * 0.38;
  softCtx.drawImage(img, dx, dy, drawWidth, drawHeight);

  const fade = Math.min(fadePx, width / 4, height / 4);
  softCtx.globalCompositeOperation = "destination-in";
  const horizontal = softCtx.createLinearGradient(0, 0, width, 0);
  horizontal.addColorStop(0, "rgba(0,0,0,0)");
  horizontal.addColorStop(fade / width, "rgba(0,0,0,1)");
  horizontal.addColorStop(1 - fade / width, "rgba(0,0,0,1)");
  horizontal.addColorStop(1, "rgba(0,0,0,0)");
  softCtx.fillStyle = horizontal;
  softCtx.fillRect(0, 0, width, height);

  const vertical = softCtx.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, "rgba(0,0,0,0)");
  vertical.addColorStop(fade / height, "rgba(0,0,0,1)");
  vertical.addColorStop(1 - fade / height, "rgba(0,0,0,1)");
  vertical.addColorStop(1, "rgba(0,0,0,0)");
  softCtx.fillStyle = vertical;
  softCtx.fillRect(0, 0, width, height);
  softCtx.globalCompositeOperation = "source-over";

  ctx.drawImage(canvas, x, y, width, height);
}

async function drawBenchGroup(ctx, label, players, x, y, color, game = null) {
  if (!players.length) {
    ctx.fillStyle = "#fff4d7";
    roundRect(ctx, x, y + 95, 130, 42, 20);
    ctx.fill();
    ctx.fillStyle = "#16201d";
    ctx.font = "700 22px Segoe UI, Arial";
    ctx.fillText(`${label}: vazio`, x + 14, y + 123);
    return;
  }

  for (const [index, playerData] of players.entries()) {
    const cardWidth = 188;
    const cardHeight = 258;
    const centerX = x + cardWidth / 2 + index * (cardWidth + 28);
    const centerY = y + cardHeight / 2;
    await drawPlayerDot(ctx, playerData, { x: centerX, y: centerY, cardWidth, cardHeight }, color, game);
    ctx.fillStyle = "#fff4d7";
    roundRect(ctx, centerX - 70, y + cardHeight + 18, 140, 46, 22);
    ctx.fill();
    ctx.fillStyle = "#16201d";
    ctx.textAlign = "center";
    ctx.font = "900 25px Segoe UI, Arial";
    ctx.fillText(label, centerX, y + cardHeight + 49);
    ctx.textAlign = "left";
  }
}

async function drawPlayerPhoto(ctx, playerData, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.clip();

  if (playerData.photoDataUrl) {
    try {
      const img = await loadPhoto(playerData.photoDataUrl);
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    } catch (error) {
      drawInitials(ctx, playerData.name, x, y, size);
    }
  } else {
    drawInitials(ctx, playerData.name, x, y, size);
  }

  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(3, size / 16);
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawInitials(ctx, name, x, y, size) {
  ctx.fillStyle = "#dce6e2";
  ctx.fillRect(x - size / 2, y - size / 2, size, size);
  ctx.fillStyle = "#16201d";
  ctx.font = `900 ${Math.round(size * 0.34)}px Segoe UI, Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials(name), x, y + 1);
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function loadPhoto(src) {
  if (photoCache.has(src)) return photoCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  photoCache.set(src, promise);
  return promise;
}

function loadCardAsset(src) {
  if (cardAssetCache.has(src)) return cardAssetCache.get(src);
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
  cardAssetCache.set(src, promise);
  return promise;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `footer-${formatDateForFile(new Date().toISOString())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importData(event) {
  if (!requireAdmin()) return;
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported.players) || !Array.isArray(imported.games)) {
        throw new Error("Invalid file");
      }
      const migrated = migrateState(imported);
      state.players = migrated.players;
      state.games = migrated.games;
      state.events = migrated.events;
      payments = migrated.payments;
      attendanceOverrides = migrated.attendanceOverrides;
      gameFinanceOverrides = migrated.gameFinanceOverrides;
      financeSettings = migrated.financeSettings;
      selectedIds.clear();
      currentGameId = null;
      persistState();
      render();
    } catch (error) {
      alert("Nao consegui importar esse ficheiro JSON.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

async function resetData() {
  if (!requireAdmin()) return;
  state.players = samplePlayers.map((p) => ({ ...p }));
  state.games = [];
  state.events = [];
  payments = [];
  attendanceOverrides = [];
  gameFinanceOverrides = [];
  financeSettings = { ...defaultFinanceSettings, playerBalances: { ...defaultFinanceSettings.playerBalances } };
  selectedIds.clear();
  currentSuggestions = [];
  currentGameId = null;
  await persistState();
  render();
}

function getSelectedPlayers() {
  return [...selectedIds].map(findPlayer).filter(Boolean);
}

function getCurrentGame() {
  if (previewGame) return ensureGameShape(previewGame);
  const game = state.games.find((item) => item.id === currentGameId) || null;
  return game ? ensureGameShape(game) : null;
}

function isFinishedGame(game) {
  return Boolean(game && (game.status === "finished" || (game.scoreA != null && game.scoreB != null)));
}

function getPlayerForm(playerData, games = state.games) {
  const baseOverall = clampRating(playerData?.overall ?? 0);
  const finishedAppearances = [...games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map((game) => {
      const participation = getPlayerParticipation(game, playerData.id);
      if (!participation) return null;
      return { game, outcome: getPlayerOutcome(game, participation.side) };
    })
    .filter(Boolean);

  const recent = finishedAppearances.slice(0, FORM_LOOKBACK_GAMES);
  const wins = recent.filter((item) => item.outcome === "win").length;
  const losses = recent.filter((item) => item.outcome === "loss").length;
  const draws = recent.filter((item) => item.outcome === "draw").length;
  const winStreak = countConsecutiveTeamOutcomeStreak(playerData.id, games, "win");
  const lossStreak = countConsecutiveTeamOutcomeStreak(playerData.id, games, "loss");
  const absenceCount = countRecentAbsences(playerData.id, games);

  let adjustment = 0;
  adjustment += wins - losses;
  adjustment += Math.min(2, winStreak);
  adjustment -= Math.min(3, lossStreak);
  if (draws >= 2) adjustment += 1;
  if (absenceCount >= 3) adjustment -= 1;
  adjustment = clampNumber(adjustment, -FORM_RATING_CAP, FORM_RATING_CAP);

  const currentRating = clampRating(baseOverall + adjustment);
  const levelKey = formLevelForAdjustment(adjustment);

  return {
    baseOverall,
    currentRating,
    adjustment,
    levelKey,
    level: FORM_LEVELS[levelKey].label,
    className: FORM_LEVELS[levelKey].className,
    recentGamesCount: recent.length,
    wins,
    draws,
    losses,
    winStreak,
    lossStreak,
    absenceCount,
    recentRecord: recent.map((item) => item.outcome),
  };
}

function countConsecutiveTeamOutcomeStreak(playerId, games, outcome) {
  let streak = 0;
  const finishedGames = [...games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  for (const game of finishedGames) {
    const participation = getPlayerParticipation(game, playerId);
    if (!participation) break;
    if (getPlayerOutcome(game, participation.side) !== outcome) break;
    streak += 1;
  }
  return streak;
}

function countRecentAbsences(playerId, games) {
  return [...games]
    .filter(isFinishedGame)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, FORM_LOOKBACK_GAMES)
    .filter((game) => !getPlayerParticipation(game, playerId))
    .length;
}

function formLevelForAdjustment(adjustment) {
  if (adjustment >= 5) return "hot";
  if (adjustment >= 2) return "good";
  if (adjustment <= -5) return "recovery";
  if (adjustment <= -2) return "bad";
  return "normal";
}

function getPlayerRatingForBalance(playerData) {
  return getPlayerForm(playerData).currentRating;
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function findPlayer(id) {
  return state.players.find((p) => p.id === id);
}

function hydrate(ids) {
  return (ids || []).map(findPlayer).filter(Boolean);
}

function ensureGameShape(game) {
  game.teamA = game.teamA || [];
  game.teamB = game.teamB || [];
  game.benchA = game.benchA || [];
  game.benchB = game.benchB || [];
  game.scoreSavedAt = game.scoreSavedAt || null;

  if (Array.isArray(game.bench) && game.bench.length && !game.benchA.length && !game.benchB.length) {
    game.bench.forEach((id, index) => {
      (index % 2 === 0 ? game.benchA : game.benchB).push(id);
    });
  }
  delete game.bench;
  return game;
}

function getBenchA(game) {
  return ensureGameShape(game).benchA;
}

function getBenchB(game) {
  return ensureGameShape(game).benchB;
}

function getGamePlayerIds(game) {
  ensureGameShape(game);
  return [...game.teamA, ...game.teamB, ...game.benchA, ...game.benchB];
}

function getTeamRadarStats(players) {
  return TEAM_RADAR_STATS.map((stat) => ({
    ...stat,
    value: aggregateTeamRadarStat(players, stat.key),
  }));
}

function aggregateTeamRadarStat(players, key) {
  if (!players.length) return 0;
  if (TEAM_RADAR_AGGREGATION !== "power") return avg(players, key);
  const power = TEAM_RADAR_POWER;
  const poweredAverage = players.reduce((sum, playerData) => {
    return sum + Math.pow(Number(playerData[key] || 0), power);
  }, 0) / players.length;
  return Math.round(Math.pow(poweredAverage, 1 / power));
}

function getTeamRadarMax(statsA, statsB) {
  if (!TEAM_RADAR_DYNAMIC_MAX) return TEAM_RADAR_MAX;
  const highestStat = Math.max(
    TEAM_RADAR_MIN,
    ...statsA.map((item) => item.value),
    ...statsB.map((item) => item.value)
  );
  return clampNumber(Math.ceil(highestStat * 1.05), TEAM_RADAR_MIN + 1, 100);
}

function getTeamRadarGridRings(maxValue) {
  const range = Math.max(1, maxValue - TEAM_RADAR_MIN);
  return [0, 0.25, 0.5, 0.75, 1].map((step) => Math.round(TEAM_RADAR_MIN + range * step));
}

function radarPoint(centerX, centerY, radius, index, total, value = 100, maxValue = TEAM_RADAR_MAX) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  const scaleMax = Math.max(TEAM_RADAR_MIN + 1, maxValue);
  const normalizedValue = (clampNumber(value, TEAM_RADAR_MIN, scaleMax) - TEAM_RADAR_MIN) / (scaleMax - TEAM_RADAR_MIN);
  const scaledRadius = radius * normalizedValue;
  return {
    x: centerX + Math.cos(angle) * scaledRadius,
    y: centerY + Math.sin(angle) * scaledRadius,
  };
}

function radarPolygonPoints(values, centerX, centerY, radius, maxValue) {
  return values.map((item, index) => {
    const point = radarPoint(centerX, centerY, radius, index, values.length, item.value, maxValue);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }).join(" ");
}

function renderTeamRadarChart(teamA, teamB, options = {}) {
  const compact = Boolean(options.compact);
  const inlineOdds = Boolean(options.inlineOdds);
  const statsA = getTeamRadarStats(teamA);
  const statsB = getTeamRadarStats(teamB);
  const odds = getTeamWinProbabilities(statsA, statsB);
  const centerX = 110;
  const centerY = compact ? 88 : 98;
  const radius = compact ? 44 : 56;
  const radarMax = getTeamRadarMax(statsA, statsB);
  const gridRings = getTeamRadarGridRings(radarMax);
  const labels = TEAM_RADAR_STATS.map((stat, index) => {
    const point = radarPoint(centerX, centerY, radius + (compact ? 24 : 30), index, TEAM_RADAR_STATS.length, radarMax, radarMax);
    const valueA = statsA[index]?.value ?? 0;
    const valueB = statsB[index]?.value ?? 0;
    return `
      <text class="team-radar-axis-label" x="${point.x.toFixed(1)}" y="${point.y.toFixed(1)}" text-anchor="middle" dominant-baseline="middle">
        <tspan class="axis-name" x="${point.x.toFixed(1)}" dy="-0.65em">${stat.label}</tspan>
        <tspan class="team-a-value" x="${point.x.toFixed(1)}" dy="1.25em">${valueA}</tspan>
        <tspan class="team-b-value" dx="5">${valueB}</tspan>
      </text>
    `;
  }).join("");
  const axes = TEAM_RADAR_STATS.map((stat, index) => {
    const point = radarPoint(centerX, centerY, radius, index, TEAM_RADAR_STATS.length, radarMax, radarMax);
    return `<line x1="${centerX}" y1="${centerY}" x2="${point.x.toFixed(1)}" y2="${point.y.toFixed(1)}" />`;
  }).join("");
  const rings = gridRings.map((ring) => {
    const points = TEAM_RADAR_STATS.map((stat, index) => {
      const point = radarPoint(centerX, centerY, radius, index, TEAM_RADAR_STATS.length, ring, radarMax);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }).join(" ");
    return `<polygon points="${points}" />`;
  }).join("");
  const aAverage = Math.round(statsA.reduce((sum, item) => sum + item.value, 0) / TEAM_RADAR_STATS.length);
  const bAverage = Math.round(statsB.reduce((sum, item) => sum + item.value, 0) / TEAM_RADAR_STATS.length);

  return `
    <div class="team-radar ${compact ? "team-radar-compact" : ""} ${inlineOdds ? "team-radar-inline-odds" : ""}" aria-label="Radar das equipas">
      <div class="team-radar-legend">
        <span class="team-a">Equipa A ${aAverage}${inlineOdds ? ` <em>Prob. A ${odds.teamA}%</em>` : ""}</span>
        <span class="team-b">Equipa B ${bAverage}${inlineOdds ? ` <em>Prob. B ${odds.teamB}%</em>` : ""}</span>
      </div>
      ${inlineOdds ? "" : `<div class="team-radar-odds">
        <span class="team-a">Prob. A ${odds.teamA}%</span>
        <span class="team-b">Prob. B ${odds.teamB}%</span>
      </div>`}
      <svg viewBox="0 0 220 ${compact ? 176 : 204}" role="img" aria-label="Comparacao PAC SHO PAS DRI DEF PHY">
        <g class="team-radar-grid">
          ${rings}
          ${axes}
        </g>
        <polygon class="team-radar-area team-a" points="${radarPolygonPoints(statsA, centerX, centerY, radius, radarMax)}" />
        <polygon class="team-radar-area team-b" points="${radarPolygonPoints(statsB, centerX, centerY, radius, radarMax)}" />
        <g class="team-radar-labels">${labels}</g>
      </svg>
    </div>
  `;
}

function getTeamWinProbabilities(statsA, statsB) {
  const averageA = statsA.reduce((sum, item) => sum + item.value, 0) / TEAM_RADAR_STATS.length;
  const averageB = statsB.reduce((sum, item) => sum + item.value, 0) / TEAM_RADAR_STATS.length;
  const diff = averageA - averageB;
  const teamA = clampNumber(Math.round(50 + diff * 3), 8, 92);
  return { teamA, teamB: 100 - teamA };
}

function getTeamStats(players, options = {}) {
  const count = Math.max(players.length, 1);
  const ratingFor = options.ratingFor || ((p) => p.overall);
  const total = players.reduce((sum, p) => sum + ratingFor(p), 0);
  const average = Math.round(total / count);
  return {
    total,
    average,
    pace: avg(players, "pace"),
    attack: Math.round((avg(players, "shooting") + avg(players, "passing") + avg(players, "dribbling")) / 3),
    defense: avg(players, "defending"),
    physical: avg(players, "physical"),
  };
}

function avg(players, key) {
  if (!players.length) return 0;
  return Math.round(players.reduce((sum, p) => sum + Number(p[key] || 0), 0) / players.length);
}

function combinations(items, size) {
  if (size === 0) return [[]];
  const result = [];
  const walk = (start, combo) => {
    if (combo.length === size) {
      result.push(combo);
      return;
    }
    for (let i = start; i <= items.length - (size - combo.length); i += 1) {
      walk(i + 1, combo.concat(items[i]));
    }
  };
  walk(0, []);
  return result;
}

function buildPairHistory(games) {
  const map = new Map();
  games.forEach((game) => {
    ensureGameShape(game);
    [[...game.teamA, ...game.benchA], [...game.teamB, ...game.benchB]].forEach((team) => {
      combinations(team, 2).forEach(([a, b]) => {
        const key = [a, b].sort().join("|");
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
  });
  return map;
}

function buildTeamHistory(games) {
  const map = new Map();
  games.forEach((game) => {
    [game.teamA, game.teamB].forEach((team) => {
      const key = keyForIds(team);
      map.set(key, (map.get(key) || 0) + 1);
    });
  });
  return map;
}

function buildBenchHistory(games) {
  const map = new Map();
  games.forEach((game) => {
    [...getBenchA(game), ...getBenchB(game)].forEach((id) => map.set(id, (map.get(id) || 0) + 1));
  });
  return map;
}

function sameTeamPairPenalty(team, pairHistory) {
  return combinations(team.map((p) => p.id), 2).reduce((total, [a, b]) => {
    const key = [a, b].sort().join("|");
    return total + (pairHistory.get(key) || 0) * 2;
  }, 0);
}

function keyForIds(items) {
  return items.map((item) => typeof item === "string" ? item : item.id).sort().join(",");
}

function shortName(name, max = 10) {
  const clean = name.trim();
  if (clean.length <= max) return clean;
  const parts = clean.split(/\s+/);
  if (parts.length > 1) return `${parts[0]} ${parts[1][0]}.`;
  return clean.slice(0, max - 1) + ".";
}

function roleFromPlayer(playerData) {
  const attack = (Number(playerData.shooting) + Number(playerData.dribbling)) / 2;
  const control = (Number(playerData.passing) + Number(playerData.dribbling)) / 2;
  const defense = (Number(playerData.defending) + Number(playerData.physical)) / 2;
  if (defense >= attack + 6 && defense >= control) return "DEF";
  if (attack >= defense + 7 && attack >= control) return "ATT";
  if (control >= defense && control >= attack) return "MID";
  return "5V5";
}

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function slug(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "jogador";
}

function createUuid() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (Number(char) ^ window.crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(char) / 4).toString(16)
  );
}

function normalizeUsername(value) {
  return normalize(value).replace(/[^a-z0-9_.-]+/g, "").slice(0, 32);
}

function clampRating(value) {
  const number = Math.round(Number(value));
  if (Number.isNaN(number)) return 0;
  return Math.min(100, Math.max(0, number));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function monthKey(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

function formatMonthLabel(month) {
  const [year, monthNumber] = String(month || monthKey(new Date())).split("-").map(Number);
  return new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
}

function todayInputDate() {
  const date = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayOfMonth(value) {
  return new Intl.DateTimeFormat("pt-PT", { day: "2-digit" }).format(new Date(value));
}

function euro(value) {
  const number = Number(value) || 0;
  const formatted = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number);
  return `${formatted}€`;
}

function defaultEventDate() {
  const date = new Date();
  date.setDate(date.getDate() + ((2 + 7 - date.getDay()) % 7 || 7));
  date.setHours(21, 0, 0, 0);
  return date;
}

function toDateTimeLocalInput(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatDateForFile(value) {
  return new Date(value).toISOString().slice(0, 16).replace(/[:T]/g, "-");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
