#!/usr/bin/env python3
"""Shaved bases: the edited head from the ComfyUI result, the original mannequin everywhere else.

  var_base.py <male seed> <female seed>
"""

import json
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

from fem_build import background

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
BG = (0xE9, 0xDC, 0xC3)


def components(mask):
    """Label 4-connected components; returns (labels, sizes)."""
    lab = np.zeros(mask.shape, int)
    sizes = [0]
    for y, x in zip(*np.where(mask)):
        if lab[y, x]:
            continue
        n = len(sizes)
        q = deque([(y, x)])
        lab[y, x] = n
        size = 0
        while q:
            cy, cx = q.popleft()
            size += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = cy + dy, cx + dx
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = n
                    q.append((ny, nx))
        sizes.append(size)
    return lab, sizes


def build(key, seed):
    orig = np.asarray(Image.open(VAR / 'prep' / f'manequim-{key}-384.png').convert('RGBA')).copy()
    res = np.asarray(Image.open(VAR / 'jobs' / f'base-{key}-{seed}.png').convert('RGB').resize((384, 1024), Image.BOX))
    m = np.asarray(Image.open(VAR / 'prep' / f'mascara-cabelo-atual-{key}.png')) > 127
    bg = background(res.astype(float))
    out = orig.copy()
    out[m, :3] = res[m]
    out[m, 3] = np.where(bg[m], 0, 255)
    # Drop specks: opaque islands under 20 px that are not part of the figure.
    lab, sizes = components(out[..., 3] > 0)
    small = np.isin(lab, [i for i, s in enumerate(sizes) if 0 < s < 20])
    out[small, 3] = 0
    out[out[..., 3] == 0, :3] = 0
    img = Image.fromarray(out, 'RGBA')
    img.save(VAR / f'base-rapada-{key}.png', optimize=True)
    flat = Image.new('RGB', img.size, BG)
    flat.paste(img, (0, 0), img)
    flat.save(VAR / 'prep' / f'base-rapada-{key}-flat.png')
    return {'seed': seed, 'manchas_removidas_px': int(small.sum()),
            'igual_fora_da_cabeca': bool((out[~m & ~small] == orig[~m & ~small]).all())}


if __name__ == '__main__':
    print(json.dumps({'m': build('m', int(sys.argv[1])), 'f': build('f', int(sys.argv[2]))}))
