#!/usr/bin/env python3
"""Socks generated on their own + boots cut from the old layer. Output: var/v2-meias-chuteiras/."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import var_meias as vm
import var_skin as vs
from run_var import SOCK_SEEDS
from var_export import OX, H, over, flatten, half

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
OUT = VAR / 'v2-meias-chuteiras'
BG = np.array([0xE9, 0xDC, 0xC3])
CROP = (OX + 46, 670, OX + 346, 1010)


def save(arr, rel):
    for size, a in (('512', arr), ('256', half(arr))):
        p = OUT / size / f'{rel}.webp'
        p.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(a, 'RGBA').save(p, 'WEBP', quality=90, alpha_quality=100, method=6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    old, boots_m = vm.split()
    boots = np.zeros_like(old)
    boots[boots_m] = old[boots_m]
    save(boots, 'chuteiras')
    base = np.zeros((H, 512, 4), np.uint8)
    base[:, OX:OX + 384] = np.asarray(Image.open(VAR / 'base-rapada-m-sem-bigode.png').convert('RGBA'))
    mask = np.zeros((H, 512), bool)
    mask[:, OX:OX + 384] = np.asarray(Image.open(VAR / 'prep' / 'mascara-meias-inteiras.png')) > 127

    def cell(arr):
        im = flatten(arr).crop(CROP)
        return im.resize((im.width * 2, im.height * 2), Image.NEAREST)

    cw, ch = 600, 680
    sheet = Image.new('RGB', (10 + 3 * (cw + 10), 30 + (len(SOCK_SEEDS) + 1) * (ch + 30)), (40, 40, 40))
    d = ImageDraw.Draw(sheet)
    d.text((14, 8), '(b) so as chuteiras, sem meias', fill=(255, 230, 160))
    sheet.paste(cell(over(base, boots)), (10, 30))
    d.text((24 + cw, 8), 'camada antiga meias-chuteiras', fill=(255, 230, 160))
    sheet.paste(cell(over(base, old)), (20 + cw, 30))
    report = {}
    for i, seed in enumerate(SOCK_SEEDS, start=1):
        res = np.zeros((H, 512, 3), np.uint8)
        res[:, OX:OX + 384] = np.asarray(Image.open(VAR / 'jobs' / f'meias-{seed}.png').convert('RGB')
                                         .resize((384, H), Image.BOX))
        # Inside the leg nothing is background (the cream band is almost the background colour).
        bg = (np.abs(res.astype(int) - BG).max(axis=2) <= 22) & (base[..., 3] < 128)
        sock = mask & ~vs.skinlike(res) & ~bg
        layer = np.zeros((H, 512, 4), np.uint8)
        layer[sock, :3] = res[sock]
        layer[sock, 3] = 255
        save(layer, f'meias-{i}')
        alone = over(base, layer)
        skin = (alone[..., 3] > 127) & vs.skinlike(alone[..., :3]) & mask
        skin[:760] = False  # above the sock top the leg is bare by design
        both = over(base, layer, boots)
        report[f'meias-{i}'] = {'seed': seed, 'pele_a_vista_abaixo_do_topo_da_meia': int(skin.sum())}
        y = 30 + i * (ch + 30)
        d.text((14, y - 22), f'{i} (seed {seed})  (a) so as meias', fill=(255, 230, 160))
        sheet.paste(cell(alone), (10, y))
        d.text((24 + cw, y - 22), f'{i}  (c) meias + chuteiras', fill=(255, 230, 160))
        sheet.paste(cell(both), (20 + cw, y))
        d.text((34 + 2 * cw, y - 22), 'camada antiga', fill=(255, 230, 160))
        sheet.paste(cell(over(base, old)), (30 + 2 * cw, y))
    sheet.save(OUT / 'folha-meias-chuteiras-2x.png', optimize=True)
    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    main()
