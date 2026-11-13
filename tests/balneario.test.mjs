import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

// Balneario: escolhas de aparencia validas e iguais as listas da migracao avatar_profiles.
const require = createRequire(import.meta.url);
const F = require("../fantasy-league.js");
const B = require("../balneario.js");
const A = F.AVATAR;
const sql = (await readFile(new URL("../supabase/avatar-profiles-migration.sql", import.meta.url), "utf8")).replaceAll("\r\n", "\n");

test("sem linha guardada comeca no masculino por omissao com bigode", () => {
  const c = B.initialChoice(null, A);
  assert.deepEqual(c, { sx: "m", tone: 4, hair: "penteado-para-tras", color: "castanho-escuro", beard: "bigode" });
});

test("linha guardada e lida tal como esta", () => {
  const c = B.initialChoice({ silhouette: "f", skin_tone: 6, hair_style: "trancas-2", hair_color: "ruivo", facial_hair: "sem" }, A);
  assert.deepEqual(c, { sx: "f", tone: 6, hair: "trancas-2", color: "ruivo" });
});

test("mudar de silhueta troca o penteado e tira a barba", () => {
  let c = B.initialChoice(null, A);
  c = B.applyChoice(c, "hair", "afro-curto", A);
  c = B.applyChoice(c, "sx", "f", A);
  assert.equal(c.hair, "coque");
  assert.equal(c.beard, undefined);
  assert.equal(B.rpcArgs(c).p_facial_hair, "sem");
  c = B.applyChoice(c, "sx", "m", A);
  assert.equal(c.hair, "penteado-para-tras");
  assert.equal(c.beard, "bigode");
});

test("valores invalidos nao mudam nada", () => {
  const c = B.initialChoice(null, A);
  assert.equal(B.applyChoice(c, "tone", "7", A), c);
  assert.equal(B.applyChoice(c, "hair", "coque", A), c);
  assert.equal(B.applyChoice(c, "color", "azul", A), c);
  assert.equal(B.applyChoice({ ...c, sx: "f" }, "beard", "pera", A).beard, "bigode");
});

test("tom vem dos botoes como texto e e guardado como numero", () => {
  const c = B.applyChoice(B.initialChoice(null, A), "tone", "2", A);
  assert.equal(B.rpcArgs(c).p_skin_tone, 2);
});

test("listas da app batem certo com as da migracao", () => {
  for (const h of [...A.hair.m, ...A.hair.f]) assert.ok(sql.includes(`'${h}'`), `penteado ${h} falta na migracao`);
  for (const c of A.colors) assert.ok(sql.includes(`'${c}'`), `cor ${c} falta na migracao`);
  for (const b of A.beards) assert.ok(sql.includes(`'${b}'`), `barba ${b} falta na migracao`);
  assert.equal(B.SKIN.length, 6);
  for (const c of A.colors) assert.ok(B.HAIR_SWATCH[c], `cor ${c} sem amostra`);
});

test("todos os penteados e barbas tem nome legivel", () => {
  for (const h of [...A.hair.m, ...A.hair.f, ...A.beards]) assert.notEqual(B.label(h), h);
});
