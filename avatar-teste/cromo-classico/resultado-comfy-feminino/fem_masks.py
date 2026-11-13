#!/usr/bin/env python3
"""Jersey and shorts masks on the female silhouette (same rule as v2: the jersey reaches 35 px over the shorts)."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
FEM = ROOT / 'fem'
V2 = ROOT / 'v2'


def grow(m, size):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(size))) > 127


def close(m, size):
    img = Image.fromarray((m * 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))) > 127


def main():
    f = np.asarray(Image.open(FEM / 'manequim-feminino.png').convert('RGBA')).astype(int)
    body = f[..., 3] > 127
    rgb = f[..., :3]
    white = body & (rgb.min(axis=2) > 170) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 45)
    yy, xx = np.mgrid[:1024, :384]
    centre = (xx >= 105) & (xx <= 310)  # torso columns, away from the arm highlights
    top = close(white & centre & (yy >= 200) & (yy <= 340), 7)
    briefs = close(white & centre & (yy >= 400) & (yy <= 575), 7)
    btop = int(np.where(briefs.sum(axis=1) >= 60)[0][0])  # first full row of the waistband

    cam_m = np.asarray(Image.open(V2 / 'mascara-camisola-v2.png')) > 127
    cal_m = np.asarray(Image.open(V2 / 'mascara-calcoes-v2.png')) > 127
    silhouette = grow(body, 7)

    # Start at the neck (narrowest row under the chin) so the collar never covers the face.
    widths = [body[y].sum() for y in range(150, 200)]
    neck = 150 + int(np.argmin(widths))
    cam = (grow(cam_m, 13) | grow(top, 9)) & silhouette & (yy >= neck)
    cols = np.where(briefs[btop + 3])[0]
    cam[btop:btop + 36, cols[0]:cols[-1] + 1] = True

    # Shorts: the male mask plus the briefs, widened per row only around the briefs (not the hands).
    cal = (cal_m | grow(briefs, 9)) & silhouette
    for y in range(btop - 4, 1024):
        xs = np.where(briefs[y])[0]
        if len(xs):
            cal[y, :max(xs[0] - 8, 0)] = False
            cal[y, xs[-1] + 9:] = False
    cal &= yy >= btop - 4

    for name, m in [('mascara-camisola-f.png', cam), ('mascara-calcoes-f.png', cal)]:
        Image.fromarray((m * 255).astype(np.uint8)).save(FEM / name)
    info = {'pescoco': neck, 'topo_das_cuecas': btop, 'cuecas_fora_da_mascara_dos_calcoes': int((briefs & ~cal).sum()),
            'top_fora_da_mascara_da_camisola': int((top & ~cam).sum())}
    (FEM / 'mascaras-f.json').write_text(json.dumps(info, indent=2))
    print(info)


if __name__ == '__main__':
    main()
