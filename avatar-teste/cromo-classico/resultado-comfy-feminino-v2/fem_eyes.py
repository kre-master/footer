#!/usr/bin/env python3
"""Put the new eyes into the female mannequin: skin inside the eye area matched to the surrounding
skin tone, border softened, so the edited rectangle does not show.

  fem_eyes.py <seed>      (run after fem_build.py)
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent
FEM = ROOT / 'fem'


def main(seed):
    man = np.asarray(Image.open(FEM / 'manequim-feminino.png').convert('RGBA')).astype(float)
    res = np.asarray(Image.open(FEM / 'jobs' / f'olhos-f-{seed}.png').convert('RGB')
                     .resize((384, 1024), Image.BOX)).astype(float)
    m = np.asarray(Image.open(FEM / 'prep' / 'mascara-olhos.png')) > 127
    img = Image.fromarray((m * 255).astype(np.uint8))
    inner = np.asarray(img.filter(ImageFilter.MinFilter(5))) > 127
    outer = np.asarray(img.filter(ImageFilter.MaxFilter(5))) > 127
    skin_ref = np.median(man[132:140, 180:225, :3].reshape(-1, 3), axis=0)

    def skinlike(px):
        return np.abs(px - skin_ref).max(axis=-1) < 30

    ring_in = m & ~inner & skinlike(res)
    ring_out = outer & ~m & skinlike(man[..., :3])
    delta = man[ring_out, :3].mean(axis=0) - res[ring_in].mean(axis=0)
    new = res.copy()
    sk = m & skinlike(res)
    new[sk] = np.clip(res[sk] + delta, 0, 255)
    out = man.copy()
    out[m, :3] = new[m]
    border = m & ~inner
    out[border, :3] = 0.5 * new[border] + 0.5 * man[border, :3]
    imgout = Image.fromarray(out.astype(np.uint8), 'RGBA')
    imgout.save(FEM / 'manequim-feminino.png', optimize=True)
    flat = Image.new('RGB', imgout.size, (0xE9, 0xDC, 0xC3))
    flat.paste(imgout, (0, 0), imgout)
    flat.save(FEM / 'prep' / 'manequim-f-flat.png')
    print({'olhos_seed': seed, 'ajuste_de_tom': [round(v, 1) for v in delta]})


if __name__ == '__main__':
    main(int(sys.argv[1]))
