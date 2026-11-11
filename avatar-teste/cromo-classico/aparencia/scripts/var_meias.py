#!/usr/bin/env python3
"""Split the shared socks+boots layer into socks and boots (masks, no AI), with the socks continued over the
foot under the boots (small inpainting there only), so that changing the boots never leaves a hole.

  var_meias.py prep | build <seed>
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

import run_v2 as v2
import var_skin as vs
from var_export import SOCKS, BOOTS_FROM, OX, over, flatten

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
PREP = VAR / 'prep'
v2.JOBS = VAR / 'jobs'
SEEDS = [1111202771, 1111202772]
PROMPT = ('pixel art footballer, same pose, same legs, burgundy ribbed football socks that continue down and cover '
          'the whole feet, socked feet with no shoes, no boots, the sock shape follows the foot, dark stepped '
          'outlines, warm low-colour shading, crisp pixels, plain flat beige background')


def split():
    old, _ = vs.strip_skin(np.asarray(Image.open(SOCKS).convert('RGBA')), keep_below=BOOTS_FROM)
    rgb = old[..., :3].astype(int)
    a = old[..., 3] > 0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    burgundy = (r > g + 25) & (r > b + 12) & (g < 60)
    yy = np.arange(old.shape[0])[:, None]
    boots = a & ((yy >= 900) | ((yy >= BOOTS_FROM) & ~burgundy))
    return old, boots


def prep():
    old, boots = split()
    socks = old.copy()
    socks[boots] = 0
    base = np.asarray(Image.open(VAR / 'base-rapada-m-sem-bigode.png').convert('RGBA'))
    canvas = np.zeros((1024, 512, 4), np.uint8)
    canvas[:, OX:OX + 384] = base
    flat = np.asarray(flatten(over(canvas, socks)))[:, OX:OX + 384]
    Image.fromarray(flat).save(PREP / 'base-meias-sem-chuteiras-flat.png')
    sil = np.asarray(Image.fromarray((boots[:, OX:OX + 384] * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 127
    sil[:860] = False
    Image.fromarray((sil * 255).astype(np.uint8)).save(PREP / 'mascara-pe-meia.png')
    bflat = v2.up2(PREP / 'base-meias-sem-chuteiras-flat.png', PREP / '2x-base-meias-sem-chuteiras-flat.png')
    mask = v2.up2(PREP / 'mascara-pe-meia.png', PREP / '2x-mascara-pe-meia.png')
    for seed in SEEDS:
        v2.submit_one(f'meia-pe-{seed}', 'meia-pe', seed, PROMPT, {'base': bflat, 'mask': mask}, [])


def build(seed):
    old, boots = split()
    socks = old.copy()
    socks[boots] = 0
    res = np.asarray(Image.open(VAR / 'jobs' / f'meia-pe-{seed}.png').convert('RGB').resize((384, 1024), Image.BOX))
    foot = np.zeros(boots.shape, bool)
    foot[:, OX:OX + 384] = np.asarray(Image.open(PREP / 'mascara-pe-meia.png')) > 127
    # Sock over the foot: the inpainted pixels inside the boots' own outline (hidden whenever boots are worn).
    wide = np.zeros((1024, 512, 3), np.uint8)
    wide[:, OX:OX + 384] = res
    bg = np.abs(wide.astype(int) - [0xE9, 0xDC, 0xC3]).max(axis=2) <= 22
    add = foot & boots & ~bg & (socks[..., 3] == 0)
    socks[add, :3] = wide[add]
    socks[add, 3] = 255
    out = VAR / 'meias-chuteiras-split'
    out.mkdir(exist_ok=True)
    chuteiras = np.zeros_like(old)
    chuteiras[boots] = old[boots]
    Image.fromarray(socks, 'RGBA').save(out / 'meias.png')
    Image.fromarray(chuteiras, 'RGBA').save(out / 'chuteiras.png')
    together = over(socks, chuteiras)
    diff = int(np.abs(together.astype(int) - old.astype(int)).max())
    # Socks alone on the base: bare foot skin still visible below the sock tops.
    base = np.asarray(Image.open(VAR / 'base-rapada-m-sem-bigode.png').convert('RGBA'))
    canvas = np.zeros((1024, 512, 4), np.uint8)
    canvas[:, OX:OX + 384] = base
    alone = over(canvas, socks)
    skin = (alone[..., 3] > 127) & vs.skinlike(alone[..., :3])
    skin[:900] = False
    flatten(alone).save(out / 'teste-meias-sem-chuteiras.png')
    flatten(over(canvas, socks, chuteiras)).save(out / 'teste-meias-com-chuteiras.png')
    info = {'seed': seed, 'meias_mais_chuteiras_vs_antiga_dif_max': diff, 'pixels_meia_no_pe': int(add.sum()),
            'pele_do_pe_a_vista_so_com_meias': int(skin.sum())}
    (out / 'verificacao.json').write_text(json.dumps(info, indent=2))
    print(json.dumps(info))


if __name__ == '__main__':
    prep() if sys.argv[1] == 'prep' else build(int(sys.argv[2]))
