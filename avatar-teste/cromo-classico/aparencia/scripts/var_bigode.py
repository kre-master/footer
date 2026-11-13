#!/usr/bin/env python3
"""Male base without the moustache (no AI): moustache mask, filled from the surrounding skin.
Writes var/base-rapada-m-sem-bigode.png and the current moustache as a facial-hair layer."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
BOX = (214, 101, 263, 111)  # x0, y0, x1, y1 (384 grid): moustache, below the nostrils, above the mouth line


def main():
    base = np.asarray(Image.open(VAR / 'base-rapada-m.png').convert('RGBA')).copy()
    rgb = base[..., :3].astype(float)
    lum = rgb @ [0.299, 0.587, 0.114]
    x0, y0, x1, y1 = BOX
    yy, xx = np.mgrid[:1024, :384]
    inbox = (xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1)
    m = inbox & (lum < 85)
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 127
    m &= (yy >= y0) & (yy < y1) & (xx >= x0 - 1) & (xx <= x1)
    Image.fromarray((m * 255).astype(np.uint8)).save(VAR / 'prep' / 'mascara-bigode.png')
    # Current moustache as a layer (the original pixels under the mask).
    layer = np.zeros_like(base)
    layer[m] = base[m]
    Image.fromarray(layer, 'RGBA').save(VAR / 'barba-bigode-atual.png')
    # Fill: each row interpolated between the skin just left and just right of the moustache, so the
    # face's own gradient carries across (taking from above would bring the light tip of the nose).
    col = rgb.copy()
    for y in range(y0, y1):
        xs = np.where(m[y])[0]
        if not len(xs):
            continue
        l, r = xs[0] - 1, xs[-1] + 1
        while l > 0 and lum[y, l] < 85:
            l -= 1
        while r < 383 and lum[y, r] < 85:
            r += 1
        for x in xs:
            t = (x - l) / max(r - l, 1)
            col[y, x] = (1 - t) * rgb[y, l] + t * rgb[y, r]
    out = base.copy()
    out[m, :3] = np.clip(col[m], 0, 255).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(VAR / 'base-rapada-m-sem-bigode.png', optimize=True)
    diff_fora = int(np.abs(out.astype(int) - base.astype(int))[~m].max())
    print(json.dumps({'pixels_bigode': int(m.sum()), 'diferenca_fora_da_mascara': diff_fora}))


if __name__ == '__main__':
    main()
