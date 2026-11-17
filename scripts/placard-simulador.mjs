#!/usr/bin/env node
// Simulador do placard (2026-11-17): imita os botoes do Raspberry Pi para testar sem hardware.
// Faz o mesmo que o Pi vai fazer: grava cada evento num ficheiro local e envia os que faltam
// para public.placard_ingest (supabase/scoreboard-migration.sql). Sem rede, guarda e envia depois.
//
// Uso:
//   node scripts/placard-simulador.mjs --seco            # so mostra os eventos, nao envia
//   PLACARD_CHAVE=... node scripts/placard-simulador.mjs # envia para o Supabase de app-config.js
// Teclas: i inicio · a golo A · b golo B · z anular A · x anular B · d destaque · t troca de lado
//         p pausa/retoma · f fim · e reenviar fila · q sair
// A fila fica em .placard-fila.json (fora do Git).

import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { emitKeypressEvents } from "node:readline";

const DRY = process.argv.includes("--seco");
const QUEUE_FILE = new URL("../.placard-fila.json", import.meta.url);

function readConfig() {
  const text = readFileSync(new URL("../app-config.js", import.meta.url), "utf8");
  return {
    url: process.env.SUPABASE_URL || text.match(/supabaseUrl:\s*"([^"]+)"/)?.[1],
    anonKey: process.env.SUPABASE_ANON_KEY || text.match(/supabaseAnonKey:\s*"([^"]+)"/)?.[1],
  };
}

const config = readConfig();
const key = process.env.PLACARD_CHAVE || "";
if (!DRY && !key) {
  console.error("Falta PLACARD_CHAVE (a chave criada pelo admin). Ou corre com --seco.");
  process.exit(1);
}

const state = existsSync(QUEUE_FILE)
  ? JSON.parse(readFileSync(QUEUE_FILE, "utf8"))
  : { sessao: null, seq: 0, inicioMs: null, pausadoMs: 0, pausaDesde: null, trocado: false, a: 0, b: 0, golos: { A: [], B: [] }, fila: [] };

function save() {
  writeFileSync(QUEUE_FILE, JSON.stringify(state, null, 2));
}

function clockSeconds(now = Date.now()) {
  if (!state.inicioMs) return 0;
  const paused = state.pausadoMs + (state.pausaDesde ? now - state.pausaDesde : 0);
  return Math.max(0, Math.round((now - state.inicioMs - paused) / 100) / 10);
}

function record(tipo, lado = null) {
  const now = Date.now();
  if (tipo === "inicio") {
    Object.assign(state, { sessao: new Date(now).toISOString().slice(0, 16), seq: 0, inicioMs: now, pausadoMs: 0, pausaDesde: null, a: 0, b: 0, golos: { A: [], B: [] } });
  } else if (!state.sessao) {
    console.log("Carrega primeiro em i (inicio).");
    return;
  }
  if (tipo === "golo") {
    state.golos[lado].push(now);
    if (lado === "A") state.a += 1; else state.b += 1;
  }
  if (tipo === "anular") {
    if (!state.golos[lado].length) return console.log(`Sem golo de ${lado} para anular.`);
    state.golos[lado].pop();
    if (lado === "A") state.a -= 1; else state.b -= 1;
  }
  if (tipo === "pausa") state.pausaDesde = now;
  if (tipo === "retoma" && state.pausaDesde) { state.pausadoMs += now - state.pausaDesde; state.pausaDesde = null; }
  if (tipo === "troca_lado") state.trocado = !state.trocado;

  state.seq += 1;
  const event = {
    id: randomUUID(),
    sessao: state.sessao,
    seq: state.seq,
    tipo,
    lado,
    relogio_s: clockSeconds(now),
    hora: new Date(now).toISOString(),
    resultado: [state.a, state.b],
  };
  state.fila.push(event);
  save();
  console.log(`${String(Math.floor(event.relogio_s / 60)).padStart(2, "0")}:${String(Math.floor(event.relogio_s % 60)).padStart(2, "0")}  ${tipo}${lado ? " " + lado : ""}  ${state.a}-${state.b}`);
  if (tipo === "fim") state.sessao = null;
  flush();
}

let sending = false;
async function flush() {
  if (DRY) {
    if (state.fila.length) console.log(JSON.stringify(state.fila.splice(0)));
    save();
    return;
  }
  if (sending || !state.fila.length) return;
  sending = true;
  const batch = state.fila.slice(0, 500);
  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/placard_ingest`, {
      method: "POST",
      headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_key: key, p_events: batch }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || `HTTP ${response.status}`);
    // Aceites e repetidos ja estao no servidor; rejeitados nao adianta reenviar.
    state.fila.splice(0, batch.length);
    save();
    if (body.rejeitados?.length) console.log("Rejeitados:", JSON.stringify(body.rejeitados));
  } catch (error) {
    console.log(`Sem envio (${error.message}); fica na fila: ${state.fila.length}`);
  } finally {
    sending = false;
  }
}

const KEYS = {
  i: () => record("inicio"),
  a: () => record("golo", state.trocado ? "B" : "A"),
  b: () => record("golo", state.trocado ? "A" : "B"),
  z: () => record("anular", state.trocado ? "B" : "A"),
  x: () => record("anular", state.trocado ? "A" : "B"),
  d: () => record("destaque"),
  t: () => record("troca_lado"),
  p: () => record(state.pausaDesde ? "retoma" : "pausa"),
  f: () => record("fim"),
  e: () => flush(),
};

console.log(DRY ? "Placard simulado (seco)." : `Placard simulado -> ${config.url}`);
console.log("i inicio · a/b golo · z/x anular · d destaque · t troca · p pausa · f fim · e reenviar · q sair");
if (state.fila.length) flush();
setInterval(flush, 15000).unref();

emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.on("keypress", (str, keyInfo) => {
  if (str === "q" || (keyInfo?.ctrl && keyInfo.name === "c")) process.exit(0);
  KEYS[str]?.();
});
