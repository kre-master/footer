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
MANNEQUIN_SEEDS = [1111202671, 1111202672, 1111202673, 1111202674]
PIECE_SEEDS = [1111202681, 1111202682, 1111202683]
MANNEQUIN_PROMPT = (
    'pixel art female footballer mannequin, exactly the same pose, same height and same scale, arms relaxed at '
    'the same angle, athletic woman with a toned fit body, hips slightly wider and shoulders slightly narrower '
    'than a man, natural proportions, feminine face, dark brown hair tied up in a high bun on top of the head, '
    'no hair on the shoulders, wearing only a plain white sports bra top and plain white briefs, bare arms, '
    'bare midriff and bare legs in the same warm tan skin tone, dark stepped outlines, warm low-colour shading, '
    'crisp pixels, plain flat beige background')
FIT = ', women\'s fit, worn by an athletic female footballer'


def submit_mannequin():
    base = v2.up2(PREP / 'manequim-m-v3-flat.png', PREP / '2x-manequim-m-v3-flat.png')
    mask = v2.up2(PREP / 'mascara-corpo-feminino.png', PREP / '2x-mascara-corpo-feminino.png')
    files = {'base': base, 'mask': mask, 'female': PREP / 'referencia-feminina-sepia-2x.png'}
    for seed in MANNEQUIN_SEEDS:
        v2.submit_one(f'manequim-f-{seed}', 'manequim-f', seed, MANNEQUIN_PROMPT, files, ['female'])


def submit_pieces():
    base = v2.up2(PREP / 'manequim-f-flat.png', PREP / '2x-manequim-f-flat.png')
    for slot in ['camisola', 'calcoes']:
        spec = r.SLOTS[slot]
        mask = v2.up2(FEM / f'mascara-{slot}-f.png', PREP / f'2x-mascara-{slot}-f.png')
        files = {'base': base, 'mask': mask, 'player': r.PREP / 'jogador-flat-2x.png', 'icon': r.PREP / spec['icon']}
        prompt = f"{r.STYLE}, {spec['prompt']}{v2.EXTRA[slot]}{FIT}"
        for seed in PIECE_SEEDS:
            v2.submit_one(f'{slot}-f-{seed}', slot, seed, prompt, files, ['player', 'icon'])


if __name__ == '__main__':
    if sys.argv[1] == 'submit':
        submit_mannequin() if sys.argv[2] == 'manequim' else submit_pieces()
    else:
        v2.collect()
