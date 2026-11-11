#!/usr/bin/env python3
"""Round 3: abdomen of the mannequin, cream collar/cuffs, cream sock band. Resumable.

  run_v3.py submit | collect
"""

import sys
from pathlib import Path

from PIL import Image

import run_layers as r
import run_v2 as v2

ROOT = Path(__file__).resolve().parent
V3 = ROOT / 'v3'
PREP = V3 / 'prep'
v2.JOBS = V3 / 'jobs'
CREAM = 'warm cream (soft ivory beige, like old parchment), clearly not white and not pink'
JOBS = {
    'abdomen': {
        'seeds': [1111202631, 1111202632, 1111202633, 1111202634],
        'base': 'manequim-v2-flat.png', 'mask': 'mascara-abdomen.png', 'refs': {},
        'prompt': ('pixel art footballer mannequin, same pose, lean athletic male torso, flat stomach with subtle '
                   'clearly defined six-pack abs, clean pixel-art shading consistent with the chest and arms, '
                   'same warm tan skin tone, no folds or rolls, white boxer briefs waistband unchanged, '
                   'dark stepped outlines, crisp pixels'),
    },
    # Retry: without the old torso as reference latent (it was copied back) and the area pre-filled flat.
    'abdomen2': {
        'seeds': [1111202635, 1111202636, 1111202637, 1111202638],
        'base': 'manequim-abdomen-liso.png', 'mask': 'mascara-abdomen.png', 'refs': {}, 'base_ref': False,
        'prompt': ('pixel art, shirtless lean athletic young man, flat toned stomach with a clearly defined '
                   'six-pack, two neat columns of three abdominal muscle blocks separated by a straight vertical '
                   'line, smooth warm tan skin, clean simple pixel-art shading consistent with the chest above, '
                   'no folds, no rolls, no wrinkles, top of white boxer briefs waistband at the bottom, '
                   'dark stepped outlines on the sides, crisp pixels'),
    },
    # Retry 2: the torso as reference again, but with the belly smoothed and the side outlines kept.
    'abdomen3': {
        'seeds': [1111202661, 1111202662, 1111202663, 1111202664],
        'base': 'manequim-abdomen-liso2.png', 'mask': 'mascara-abdomen.png', 'refs': {},
        'prompt': ('pixel art footballer mannequin, same pose, same body, lean athletic male torso, flat toned '
                   'stomach with subtle clearly defined six-pack abs, softly shaded abdominal blocks in the same '
                   'warm tan skin tone and the same pixel-art shading as the chest and arms, no folds, no rolls, '
                   'no wrinkles, white boxer briefs waistband at the bottom, dark stepped outlines, crisp pixels'),
    },
    'gola': {
        'seeds': [1111202641, 1111202642, 1111202643],
        'base': 'vestido-v2-flat.png', 'mask': 'mascara-gola-punhos.png',
        'refs': {'icon': r.PREP / 'icone-camisola.png'},
        'prompt': (f'pixel art footballer, same pose, vintage burgundy polo jersey with thin gold pinstripes, '
                   f'the ribbed polo collar and the cuff stripes are {CREAM}, same shapes, '
                   f'dark stepped outlines, warm low-colour shading, crisp pixels'),
    },
    'meias': {
        'seeds': [1111202651, 1111202652, 1111202653],
        'base': 'vestido-v2-flat.png', 'mask': 'mascara-meias.png',
        'refs': {'player': r.PREP / 'jogador-flat-2x.png'},
        'prompt': (f'pixel art footballer, same pose, ribbed burgundy football socks pulled up below the knee '
                   f'with a band of {CREAM} near the top, the same cream as the jersey collar, '
                   f'dark stepped outlines, warm low-colour shading, crisp pixels'),
    },
}


def submit():
    for name, spec in JOBS.items():
        base = v2.up2(PREP / spec['base'] if (PREP / spec['base']).exists() else ROOT / 'v2' / 'prep' / spec['base'],
                      PREP / ('2x-' + spec['base']))
        mask = v2.up2(PREP / spec['mask'], PREP / ('2x-' + spec['mask']))
        files = {'base': base, 'mask': mask, **spec['refs']}
        for seed in spec['seeds']:
            v2.submit_one(f'{name}-{seed}', name, seed, spec['prompt'], files, list(spec['refs']),
                          spec.get('base_ref', True))


if __name__ == '__main__':
    submit() if sys.argv[1] == 'submit' else v2.collect()
