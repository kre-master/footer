#!/usr/bin/env python3
"""Bald bases, only for generating hairstyles: the stubble of the shaved base painted in the face's skin
tone (with a soft top-to-bottom shade), the head outline kept."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from var_prep import HEADS

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
BG = np.array([0xE9, 0xDC, 0xC3])


def main():
    for key, h in HEADS.items():
        base = np.asarray(Image.open(VAR / f'base-rapada-{key}.png').convert('RGBA')).copy()
        rgb = base[..., :3].astype(float)
        a = base[..., 3] > 127
        hair = np.asarray(Image.open(VAR / 'prep' / f'mascara-cabelo-atual-{key}.png')) > 127
        fx0, fy0, fx1, fy1 = h['face']
        # Interior of the head inside the old hair area (outline = 2 px band at the edge stays).
        inner = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) > 127
        scalp = hair & inner
        tone = np.median(rgb[fy0 + 40:fy0 + 55, fx0 + 8:fx0 + 24].reshape(-1, 3), axis=0)
        ys = np.where(scalp.any(axis=1))[0]
        out = base.copy()
        for y in ys:
            t = (y - ys[0]) / max(ys[-1] - ys[0], 1)
            out[y, scalp[y], :3] = np.clip(tone * (1.04 - 0.10 * t), 0, 255).astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(VAR / f'base-careca-{key}.png')
        flat = np.where(out[..., 3:] > 127, out[..., :3], BG).astype(np.uint8)
        Image.fromarray(flat).save(VAR / 'prep' / f'base-careca-{key}-flat.png')
        print(key, int(scalp.sum()))


if __name__ == '__main__':
    main()
