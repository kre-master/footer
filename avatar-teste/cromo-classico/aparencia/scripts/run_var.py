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


BEARD_SEEDS = [1111202751, 1111202752]
# Second try: the whole-jaw mask invited full beards. Stubble with a lighter prompt; goatee on the chin only.
BEARD_RETRY = {'barba-por-fazer': [1111202753, 1111202754, 1111202755], 'pera': [1111202753, 1111202754, 1111202755]}
BEARD = {
    'barba-por-fazer': 'very light two-day stubble: sparse tiny dark dots of stubble on the jaw, chin and upper lip, the skin '
                       'clearly visible through it, not a beard, no moustache',
    'barba-curta': 'a short neat full beard on the jaw and chin with a short moustache joined to it',
    'pera': 'a small pointed goatee on the chin only, the rest of the face clean-shaven, no moustache, no jaw beard',
}


def submit_beard():
    base = v2.up2(PREP / 'base-rapada-m-sem-bigode-flat.png', PREP / '2x-base-rapada-m-sem-bigode-flat.png')
    for name, prompt in BEARD.items():
        own = PREP / f'mascara-barba-m-{name}.png'
        src = own if own.exists() else PREP / 'mascara-barba-m.png'
        mask = v2.up2(src, PREP / f'2x-{src.name}')
        for seed in BEARD_SEEDS + BEARD_RETRY.get(name, []):
            v2.submit_one(f'barba-m-{name}-{seed}', f'barba-m-{name}', seed,
                          f'{STYLE}, same man, same face shape, eyes, nose and mouth, dark brown facial hair: {prompt}',
                          {'base': base, 'mask': mask}, [])


# Hairstyles redone on a bald base (Jon: the shaved hair showed under the new one; the ponytails looked
# stuck to the side). Each layer has the whole hair, crown included.
HAIR2_SEEDS = [1111202761, 1111202762, 1111202763, 1111202764]
HAIR2 = {
    ('m', 'comprido-apanhado'): 'long dark brown hair combed straight back from the forehead with volume on top, '
                                'covering the whole top of the head, gathered into a ponytail at the back of the '
                                'head, the ponytail hangs behind the head and the neck, not on the side',
    ('f', 'rabo-de-cavalo'): 'dark brown hair pulled back from the forehead with volume on top, covering the whole '
                             'head, tied into a high ponytail at the back of the head, the ponytail hangs behind '
                             'the head, not on the side',
    ('f', 'curto'): 'short dark brown pixie cut covering the whole head including the crown, full hair, not shaved',
    ('f', 'encaracolado-solto'): 'voluminous loose curly dark brown hair covering the whole head from the hairline, '
                                 'falling to the shoulders',
    ('f', 'trancas'): 'long dark brown box braids starting at the hairline and covering the whole head, two long '
                      'braids falling in front of the shoulders to the chest',
}


def submit_hair2():
    for (key, name), prompt in HAIR2.items():
        base = v2.up2(PREP / f'base-careca-{key}-flat.png', PREP / f'2x-base-careca-{key}-flat.png')
        own = PREP / f'mascara-penteado-{key}-{name}.png'
        src = own if own.exists() else PREP / f'mascara-penteado-{key}.png'
        mask = v2.up2(src, PREP / f'2x-{src.name}')
        for seed in HAIR2_SEEDS:
            v2.submit_one(f'cabelo2-{key}-{name}-{seed}', f'cabelo2-{key}-{name}', seed,
                          f'{STYLE}, {prompt}, the face and the body unchanged', {'base': base, 'mask': mask}, [])


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
        if sys.argv[2] != 'meias':
            {'base': submit_base, 'penteados': submit_hair, 'barbas': submit_beard, 'penteados2': submit_hair2}[sys.argv[2]]()
    else:
        v2.collect()


# Socks generated on their own (Jon): whole socks from the knee down, covering the feet, on the bare-foot base.
SOCK_SEEDS = [1111202781, 1111202782, 1111202783, 1111202784]
SOCK_PROMPT = ('pixel art footballer, same pose, same legs, vintage burgundy ribbed football socks pulled up to just '
               'below the knee with a warm cream band near the top, exactly like the socks in the reference, the '
               'socks continue down and cover the whole feet, socked feet, no shoes, no boots')


def submit_socks():
    base = v2.up2(PREP / 'base-descalca-m-flat.png', PREP / '2x-base-descalca-m-flat.png')
    mask = v2.up2(PREP / 'mascara-meias-inteiras.png', PREP / '2x-mascara-meias-inteiras.png')
    files = {'base': base, 'mask': mask, 'ref': PREP / 'ref-meias-atuais-2x.png'}
    for seed in SOCK_SEEDS:
        v2.submit_one(f'meias-{seed}', 'meias', seed, f'{STYLE}, {SOCK_PROMPT}', files, ['ref'])


if __name__ == '__main__' and sys.argv[1:3] == ['submit', 'meias']:
    submit_socks()
