#!/usr/bin/env python3
"""Hairstyles v2 (bald-base generation): candidate layers, the "no stubble visible" check over the shaved
base, and a sheet with 4x busts next to the rejected original. Output: var/v2-penteados/."""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import var_hair as vh
import var_skin as vs
from run_var import HAIR2, HAIR2_SEEDS
from var_export import KIT, SOCKS, BOOTS_FROM, OX, H, wide, over, flatten, half, flat384
from var_prep import HEADS

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
OUT = VAR / 'v2-penteados'
OLD = VAR / 'aparencia' / '512' / 'cabelo'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    socks, _ = vs.strip_skin(np.asarray(Image.open(SOCKS).convert('RGBA')), keep_below=BOOTS_FROM)
    report = {}
    sheet = Image.new('RGB', (5 * 522 + 10, len(HAIR2) * 552 + 10), (40, 40, 40))
    draw = ImageDraw.Draw(sheet)
    for row, ((key, name), _prompt) in enumerate(HAIR2.items()):
        h = HEADS[key]
        fx0, fy0, fx1, fy1 = h['face']
        yy, xx = np.mgrid[:H, :384]
        face = (xx >= fx0) & (xx <= fx1) & (yy >= fy0) & (yy <= fy1)
        bald = flat384(np.asarray(Image.open(VAR / f'base-careca-{key}.png').convert('RGBA')))
        shaved_name = 'base-rapada-m-sem-bigode.png' if key == 'm' else f'base-rapada-{key}.png'
        shaved = np.asarray(Image.open(VAR / shaved_name).convert('RGBA'))
        stubble = (np.abs(flat384(shaved).astype(int) - bald.astype(int)).max(axis=2) > 0) & (shaved[..., 3] > 127)
        own = VAR / 'prep' / f'mascara-penteado-{key}-{name}.png'
        smask = np.asarray(Image.open(own if own.exists() else VAR / 'prep' / f'mascara-penteado-{key}.png')) > 127
        kit = {s: vs.strip_skin(np.asarray(Image.open(p).convert('RGBA')))[0] for s, p in KIT[key].items()}
        extra = [wide(np.asarray(Image.open(VAR / 'barba-bigode-atual.png').convert('RGBA')))] if key == 'm' else []
        cx = OX + h['skull'][0]
        crop = (cx - 128, 0, cx + 128, 256)

        def bust(layer):
            dressed = over(wide(shaved), socks, kit['calcoes'], kit['camisola'], *extra, wide(layer))
            b = Image.fromarray(dressed, 'RGBA').crop(crop).resize((128, 128), Image.BOX)
            return flatten(np.asarray(b)).resize((512, 512), Image.NEAREST)

        old = np.asarray(Image.open(OLD / f'{key}-{name}-castanho-escuro.webp').convert('RGBA'))[:, OX:OX + 384]
        y0 = 10 + row * 552
        sheet.paste(bust(old), (10, y0 + 30))
        draw.text((14, y0 + 8), f'{key} {name}: original (chumbado)', fill=(255, 140, 120))
        for col, seed in enumerate(HAIR2_SEEDS, start=1):
            res = np.asarray(Image.open(VAR / 'jobs' / f'cabelo2-{key}-{name}-{seed}.png').convert('RGB')
                             .resize((384, H), Image.BOX))
            layer = vh.hair_layer(res, bald, smask, face)
            # Over the shaved base no stubble may show outside the new layer: count, then cover what is left
            # with the hair's shadow tone.
            uncovered = stubble & (layer[..., 3] == 0) & ~face
            n_before = int(uncovered.sum())
            if n_before:
                lum = res.astype(float) @ [0.299, 0.587, 0.114]
                sel = (layer[..., 3] > 0) & (lum >= 9)
                shade = np.percentile(res[sel].reshape(-1, 3), 15, axis=0) if sel.any() else (30, 20, 15)
                layer[uncovered, :3] = shade
                layer[uncovered, 3] = 255
            after = int((stubble & (layer[..., 3] == 0) & ~face).sum())
            report[f'{key}-{name}-{seed}'] = {'rente_a_vista_antes_de_tapar': n_before, 'rente_a_vista_final': after,
                                              'pixels_na_cara': int((layer[..., 3] > 0)[face & (shaved[..., 3] > 127)].sum())}
            for colour in vh.COLOURS:
                arr = wide(vh.recolour(layer, colour))
                for size, a in (('512', arr), ('256', half(arr))):
                    p = OUT / size / f'{key}-{name}-{col}-{colour}.webp'
                    p.parent.mkdir(parents=True, exist_ok=True)
                    Image.fromarray(a, 'RGBA').save(p, 'WEBP', quality=90, alpha_quality=100, method=6)
            x = 10 + col * 522
            sheet.paste(bust(vh.recolour(layer, 'castanho-escuro')), (x, y0 + 30))
            draw.text((x + 4, y0 + 8), f'{col}  (seed {seed})', fill=(255, 230, 160))
    sheet.save(OUT / 'folha-bustos-4x.png', optimize=True)
    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
