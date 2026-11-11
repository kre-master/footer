#!/usr/bin/env python3
"""Female mannequin from a run_fem.py result: cut out by flood fill from the border (the redrawn
background has a slightly different tone), male pixels kept from mid-shin down, short cross-fade.

  fem_build.py <seed>
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FEM = ROOT / 'fem'
SHIN, FADE, GRAIN = 800, 16, 60


def background(rgb, tol=22):
    """Pixels connected to the border whose colour is within tol of the border's local tone."""
    h, w, _ = rgb.shape
    ref = np.median(np.concatenate([rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)]), axis=0)
    near = np.abs(rgb - ref).max(axis=2) <= tol
    seen = np.zeros((h, w), bool)
    q = deque([(y, x) for y in range(h) for x in (0, w - 1) if near[y, x]] +
              [(y, x) for x in range(w) for y in (0, h - 1) if near[y, x]])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def main(seed):
    male = np.asarray(Image.open(FEM / 'prep' / 'manequim-m-v3-384.png').convert('RGBA')).astype(float)
    res = np.asarray(Image.open(FEM / 'jobs' / f'manequim-f-{seed}.png').convert('RGB')
                     .resize((384, 1024), Image.BOX)).astype(float)
    out = np.zeros_like(male)
    out[..., :3] = res
    out[..., 3] = np.where(background(res), 0, 255)
    # From mid-shin down: the male pixels exactly, so socks and boots can be shared.
    out[SHIN:] = male[SHIN:]
    # The male shins have a fine grain the redrawn legs lack: add the male's high-frequency detail
    # (pixel minus its local average), ramping in over GRAIN rows above the line. Outline unchanged.
    from PIL import ImageFilter
    blur = np.asarray(Image.fromarray(male[..., :3].astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(float)
    detail = male[..., :3] - blur
    for i, y in enumerate(range(SHIN - GRAIN, SHIN)):
        t = (i + 1) / GRAIN
        both = (out[y, :, 3] > 0) & (male[y, :, 3] > 127)
        out[y, both, :3] = np.clip(out[y, both, :3] + t * detail[y, both], 0, 255)
    # Cross-fade the skin just above that line so the tone step does not show.
    for i, y in enumerate(range(SHIN - FADE, SHIN)):
        t = (i + 1) / (FADE + 1)
        both = (out[y, :, 3] > 0) & (male[y, :, 3] > 0)
        out[y, both, :3] = (1 - t) * out[y, both, :3] + t * male[y, both, :3]
    out[out[..., 3] == 0, :3] = 0
    img = Image.fromarray(out.astype(np.uint8), 'RGBA')
    img.save(FEM / 'manequim-feminino.png', optimize=True)
    flat = Image.new('RGB', img.size, (0xE9, 0xDC, 0xC3))
    flat.paste(img, (0, 0), img)
    flat.save(FEM / 'prep' / 'manequim-f-flat.png')
    a = out[..., 3] > 0
    rows = np.where(a.any(axis=1))[0]
    print({'seed': seed, 'topo': int(rows[0]), 'chao': int(rows[-1]),
           'topo_masculino': int(np.where((male[..., 3] > 0).any(axis=1))[0][0]),
           'pes_iguais': bool((out[SHIN:] == male[SHIN:]).all())})


if __name__ == '__main__':
    main(int(sys.argv[1]))
