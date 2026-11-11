#!/usr/bin/env python3
"""Appearance round: shaved bases and hairstyles (as layers) for both mannequins. Resumable.

  run_var.py submit base        shaved head, 2 seeds per mannequin
  run_var.py submit penteados   hairstyles on the chosen shaved bases, 2 seeds each
  run_var.py collect
"""

import sys
from pathlib import Path

import run_v2 as v2

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
PREP = VAR / 'prep'
v2.JOBS = VAR / 'jobs'
STYLE = ('pixel art footballer, same face, same eyes, same skin, dark stepped outlines, warm low-colour '
         'shading, crisp pixels, plain flat beige background')
BASE_SEEDS = {'m': [1111202711, 1111202712],
              # retry with the ears left out of the mask (they came out pale)
              'f': [1111202713, 1111202714]}
BASE = {
    'm': 'same man, same moustache, his hair is shaved very short, a close buzz cut with dark stubble showing '
         'the round head shape, same ears',
    'f': 'same woman, her hair is shaved very short, a close buzz cut with dark stubble showing the round '
         'head shape, same ears, no bun',
}
HAIR_SEEDS = [1111202721, 1111202722]
# Second try for two styles: afro with a narrower face box, braids with a longer mask and a clearer prompt.
RETRY = {('m', 'afro-curto'): [1111202723, 1111202724], ('f', 'trancas'): [1111202723, 1111202724, 1111202725]}
HAIR = {
    'm': {
        'encaracolado': 'short curly dark brown hair, tight curls on top, short at the sides',
        'afro-curto': 'short rounded afro, very dark brown hair, tight coils',
        'comprido-apanhado': 'long dark brown hair pulled back and tied in a low ponytail at the back of the '
                             'neck, not touching the shoulders',
    },
    'f': {
        'rabo-de-cavalo': 'dark brown hair tied in a high ponytail hanging behind the head',
        'curto': 'short dark brown pixie cut',
        'encaracolado-solto': 'loose curly dark brown hair falling to the shoulders',
        'trancas': 'two long thick dark brown braids, one on each side, hanging down in front of the shoulders '
                   'to the chest, hair on top tightly braided back',
    },
}


def submit_base():
    for key in 'mf':
        base = v2.up2(PREP / f'manequim-{key}-sem-cabelo-prefill.png', PREP / f'2x-manequim-{key}-sem-cabelo-prefill.png')
        mask = v2.up2(PREP / f'mascara-cabelo-atual-{key}.png', PREP / f'2x-mascara-cabelo-atual-{key}.png')
        for seed in BASE_SEEDS[key]:
            v2.submit_one(f'base-{key}-{seed}', f'base-{key}', seed, f'{STYLE}, {BASE[key]}',
                          {'base': base, 'mask': mask}, [])


def submit_hair():
    for key, styles in HAIR.items():
        base = v2.up2(PREP / f'base-rapada-{key}-flat.png', PREP / f'2x-base-rapada-{key}-flat.png')
        for name, prompt in styles.items():
            own = PREP / f'mascara-penteado-{key}-{name}.png'
            src = own if own.exists() else PREP / f'mascara-penteado-{key}.png'
            mask = v2.up2(src, PREP / f'2x-{src.name}')
            for seed in HAIR_SEEDS + RETRY.get((key, name), []):
                v2.submit_one(f'cabelo-{key}-{name}-{seed}', f'cabelo-{key}-{name}', seed,
                              f'{STYLE}, {prompt}, the face and the body unchanged', {'base': base, 'mask': mask}, [])


if __name__ == '__main__':
    if sys.argv[1] == 'submit':
        submit_base() if sys.argv[2] == 'base' else submit_hair()
    else:
        v2.collect()
