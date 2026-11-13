#!/usr/bin/env python3
"""Female «Cromo clássico» mannequin and kit. Resumable like run_v2.py.

  run_fem.py submit manequim           4 seeds, everything above mid-shin redrawn
  run_fem.py submit pecas              camisola and calcoes on the chosen female mannequin, 3 seeds each
  run_fem.py collect
"""

import sys
from pathlib import Path

import run_layers as r
import run_v2 as v2

ROOT = Path(__file__).resolve().parent
FEM = ROOT / 'fem'
PREP = FEM / 'prep'
v2.JOBS = FEM / 'jobs'
# Round 1 (11/11, chosen 1111202671): seeds 1111202671-74 with MANNEQUIN_PROMPT_1; pieces 1111202681-83.
# Round 2: smaller eyes like the male figure, toned rather than muscular (Jon's feedback).
MANNEQUIN_SEEDS = [1111202691, 1111202692, 1111202693, 1111202694]
PIECE_SEEDS = {'camisola': [1111202682, 1111202695], 'calcoes': [1111202681, 1111202695]}
MANNEQUIN_PROMPT_1 = (
    'pixel art female footballer mannequin, exactly the same pose, same height and same scale, arms relaxed at '
    'the same angle, athletic woman with a toned fit body, hips slightly wider and shoulders slightly narrower '
    'than a man, natural proportions, feminine face, dark brown hair tied up in a high bun on top of the head, '
    'no hair on the shoulders, wearing only a plain white sports bra top and plain white briefs, bare arms, '
    'bare midriff and bare legs in the same warm tan skin tone, dark stepped outlines, warm low-colour shading, '
    'crisp pixels, plain flat beige background')
MANNEQUIN_PROMPT = (
    'pixel art female footballer mannequin, exactly the same pose, same height and same scale, arms relaxed at '
    'the same angle, slim fit woman, toned and shapely but not muscular, slender smooth arms and legs with no '
    'visible muscle definition, smooth flat stomach without a six-pack, slightly wider hips and narrower '
    'shoulders, natural feminine curves, feminine face with small eyes the same small size as a man\'s eyes in '
    'this pixel art style, calm expression, dark brown hair tied up in a high bun on top of the head, no hair on '
    'the shoulders, wearing only a plain white sports bra top and plain white briefs, same warm tan skin tone, '
    'dark stepped outlines, warm low-colour shading, crisp pixels, plain flat beige background')
FIT = ', women\'s fit, worn by an athletic female footballer'


def submit_mannequin():
    base = v2.up2(PREP / 'manequim-m-v3-flat.png', PREP / '2x-manequim-m-v3-flat.png')
    mask = v2.up2(PREP / 'mascara-corpo-feminino.png', PREP / '2x-mascara-corpo-feminino.png')
    files = {'base': base, 'mask': mask, 'female': PREP / 'referencia-feminina-sepia-2x.png'}
    for seed in MANNEQUIN_SEEDS:
        v2.submit_one(f'manequim-f-{seed}', 'manequim-f', seed, MANNEQUIN_PROMPT, files, ['female'])


EYES_SEEDS = [1111202701, 1111202702, 1111202703]
EYES_PROMPT = (
    'pixel art, the same young woman\'s face, same skin, same nose and mouth, redraw only the eyes and eyebrows: '
    'small narrow eyes drawn exactly in the same pixel style and the same small size as the reference man\'s '
    'eyes, a thin dark upper eyelid line, a small dark brown iris, very little white, calm natural expression, '
    'slim dark eyebrows, no anime eyes, no eyelashes blocks, warm low-colour shading, crisp pixels')


def submit_eyes():
    # Eyes area pre-filled with skin so the current (large) eyes are not copied back; the male face
    # is the reference for the eye drawing.
    base = v2.up2(PREP / 'manequim-f-sem-olhos.png', PREP / '2x-manequim-f-sem-olhos.png')
    mask = v2.up2(PREP / 'mascara-olhos.png', PREP / '2x-mascara-olhos.png')
    files = {'base': base, 'mask': mask, 'male_face': PREP / 'referencia-cara-masculina-4x.png'}
    for seed in EYES_SEEDS:
        v2.submit_one(f'olhos-f-{seed}', 'olhos', seed, EYES_PROMPT, files, ['male_face'])


def submit_pieces():
    base = v2.up2(PREP / 'manequim-f-flat.png', PREP / '2x-manequim-f-flat.png')
    for slot in ['camisola', 'calcoes']:
        spec = r.SLOTS[slot]
        mask = v2.up2(FEM / f'mascara-{slot}-f.png', PREP / f'2x-mascara-{slot}-f.png')
        files = {'base': base, 'mask': mask, 'player': r.PREP / 'jogador-flat-2x.png', 'icon': r.PREP / spec['icon']}
        prompt = f"{r.STYLE}, {spec['prompt']}{v2.EXTRA[slot]}{FIT}"
        for seed in PIECE_SEEDS[slot]:
            v2.submit_one(f'{slot}-f-{seed}', slot, seed, prompt, files, ['player', 'icon'])


if __name__ == '__main__':
    if sys.argv[1] == 'submit':
        {'manequim': submit_mannequin, 'olhos': submit_eyes, 'pecas': submit_pieces}[sys.argv[2]]()
    else:
        v2.collect()
