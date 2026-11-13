#!/usr/bin/env python3
"""Appearance round: hair masks and pre-filled bases for the shaved heads (384x1024 grid)."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
REPO = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico'
BG = np.array([0xE9, 0xDC, 0xC3])
OX = 64
HEADS = {
    # head box where hair can be, face box kept intact, skull ellipse (cx, cy, rx, ry); 384 grid
    'm': {'src': REPO / 'resultado-comfy-v3' / 'camadas' / 'manequim-cuecas-brancas.png',
          'head': (140, 0, 300, 140), 'face': (198, 62, 262, 150), 'skull': (226, 78, 54, 58)},
    'f': {'src': REPO / 'resultado-comfy-feminino-v2' / 'camadas' / 'manequim-feminino.png',
          'head': (120, 0, 270, 165), 'face': (162, 96, 236, 186), 'skull': (192, 122, 49, 60)},
}


def grow(m, n):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(n))) > 127


def main():
    (VAR / 'prep').mkdir(parents=True, exist_ok=True)
    info = {}
    for key, h in HEADS.items():
        im = Image.open(h['src']).convert('RGBA').crop((OX, 0, OX + 384, 1024))
        im.save(VAR / 'prep' / f'manequim-{key}-384.png')
        px = np.asarray(im).astype(int)
        rgb, a = px[..., :3], px[..., 3] > 127
        yy, xx = np.mgrid[:1024, :384]
        x0, y0, x1, y1 = h['head']
        fx0, fy0, fx1, fy1 = h['face']
        face = (xx >= fx0) & (xx <= fx1) & (yy >= fy0) & (yy <= fy1)
        inhead = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
        lum = rgb.mean(axis=2)
        skin = (rgb[..., 0] - rgb[..., 2] > 60) & (rgb[..., 1] - rgb[..., 2] > 20) & (lum > 90)
        hair = a & inhead & ~face & (lum < 120) & ~skin
        hair = grow(hair, 7) & inhead & ~face
        Image.fromarray((hair * 255).astype(np.uint8)).save(VAR / 'prep' / f'mascara-cabelo-atual-{key}.png')
        # Pre-filled base: skull in the face's skin tone, background elsewhere in the hair mask.
        cx, cy, rx, ry = h['skull']
        skull = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        tone = np.median(rgb[fy0 + 40:fy0 + 55, fx0 + 8:fx0 + 24].reshape(-1, 3), axis=0)  # cheek
        flat = np.where(a[..., None], rgb, BG).astype(np.uint8).copy()
        flat[hair & skull] = tone
        flat[hair & ~skull] = BG
        Image.fromarray(flat).save(VAR / 'prep' / f'manequim-{key}-sem-cabelo-prefill.png')
        base = np.where(a[..., None], rgb, BG).astype(np.uint8)
        Image.fromarray(base).save(VAR / 'prep' / f'manequim-{key}-flat.png')
        # Generous mask for new hairstyles: around the head and down to the shoulders, never the face.
        style = (xx >= x0 - 30) & (xx <= x1 + 30) & (yy <= y1 + 70) & ~face
        Image.fromarray((style * 255).astype(np.uint8)).save(VAR / 'prep' / f'mascara-penteado-{key}.png')
        if key == 'f':
            # Braids hang to the chest: a longer mask for that style only.
            longer = (xx >= x0 - 30) & (xx <= x1 + 30) & (yy <= 300) & ~face
            Image.fromarray((longer * 255).astype(np.uint8)).save(VAR / 'prep' / 'mascara-penteado-f-trancas.png')
        info[key] = {'pixels_cabelo_atual': int(hair.sum()), 'tom_pele_cara': tone.astype(int).tolist()}
    print(json.dumps(info))


if __name__ == '__main__':
    main()
