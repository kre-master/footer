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


def central(mask, rows, x0, x1):
    """On the given rows keep only the runs of `mask` that touch columns x0..x1 (torso or hips and
    thighs), dropping the separate runs of the arms and hands."""
    out = mask.copy()
    for y in rows:
        row = mask[y]
        keep = np.zeros_like(row)
        x = 0
        while x < row.size:
            if row[x]:
                end = x
                while end < row.size and row[end]:
                    end += 1
                if end > x0 and x <= x1:
                    keep[x:end] = True
                x = end
            else:
                x += 1
        out[y] = keep
    return out


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
    # Below the sleeves only the torso: the slimmer arms sit where the male torso mask was.
    sleeve_end = int(np.where(cam_m[:, :120].any(axis=1))[0][-1])
    cam = central(cam, range(sleeve_end + 1, 1024), 185, 200)

    # Shorts: the male mask plus the briefs, on the hips and thighs only (not the hands).
    cal = (cal_m | grow(briefs, 9)) & silhouette & (yy >= btop - 4)
    cal = central(cal, range(1024), 150, 240)
    # Hips width from the rows just under the waistband, above the hands (which touch the thighs lower down).
    hips = central(body, range(1024), 150, 240)[btop:btop + 40]
    hx = np.where(hips.any(axis=0))[0]
    cal &= (xx >= hx[0] - 6) & (xx <= hx[-1] + 6)

    for name, m in [('mascara-camisola-f.png', cam), ('mascara-calcoes-f.png', cal)]:
        Image.fromarray((m * 255).astype(np.uint8)).save(FEM / name)
    info = {'pescoco': neck, 'fim_das_mangas': sleeve_end, 'topo_das_cuecas': btop, 'cuecas_fora_da_mascara_dos_calcoes': int((briefs & ~cal).sum()),
            'top_fora_da_mascara_da_camisola': int((top & ~cam).sum())}
    (FEM / 'mascaras-f.json').write_text(json.dumps(info, indent=2))
    print(info)


if __name__ == '__main__':
    main()
