const THEME_STORAGE_KEY = "footer-theme";
const DEFAULT_THEME = "caderneta";
const THEMES = {
  caderneta: { label: "Caderneta", hint: "Cromos em papel claro e vermelho vivo.", color: "#eef1f6" },
  holofote: { label: "Holofote", hint: "Estádio à noite com projetores azuis.", color: "#0a1222" },
  natal: { label: "Natal", hint: "Verde pinheiro, neve e luzes douradas.", color: "#122923", variant: "dark" },
  relvado: { label: "Relvado", hint: "Verde fresco com linhas de campo.", color: "#e0f0db", variant: "light" },
  arcade: { label: "Arcade", hint: "Roxo escuro com néon ciano e rosa.", color: "#17102a", variant: "dark" },
};

function getActiveTheme() {
  return document.documentElement.dataset.theme || DEFAULT_THEME;
}

function applyTheme(theme) {
  const name = Object.hasOwn(THEMES, theme) ? theme : DEFAULT_THEME;
  const { color, variant } = THEMES[name];
  const { dataset } = document.documentElement;
  dataset.theme = name;
  if (variant) dataset.themeVariant = variant;
  else delete dataset.themeVariant;

  document.querySelector("#theme-caderneta-link").disabled = name !== DEFAULT_THEME && variant !== "light";
  document.querySelector('meta[name="theme-color"]').content = color;
}

// Corre no <head> para aplicar a preferência antes do primeiro desenho.
try {
  applyTheme(localStorage.getItem(THEME_STORAGE_KEY));
} catch {
  applyTheme(DEFAULT_THEME);
}
