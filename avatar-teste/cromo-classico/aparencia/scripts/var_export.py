#!/usr/bin/env python3
"""Appearance export: bases per skin tone, hairstyles per hair colour, kit layers without skin,
at 512x1024 and 256x512 (WebP q90), grids, checks and weights.

  var_export.py <chosen.json>    {"m": {"encaracolado": seed, ...}, "f": {...}}
"""

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import var_hair as vh
import var_skin as vs
from var_prep import HEADS

ROOT = Path(__file__).resolve().parent
VAR = ROOT / 'var'
OUT = VAR / 'aparencia'
REPO = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico'
BG = np.array([0xE9, 0xDC, 0xC3])
CW, H, OX = 512, 1024, 64
CURRENT = {'m': 'penteado-para-tras', 'f': 'coque'}
KIT = {
    'm': {'camisola': REPO / 'resultado-comfy-v3' / 'camadas' / 'camisola.png',
          'calcoes': REPO / 'resultado-comfy-v3' / 'camadas' / 'calcoes.png'},
    'f': {'camisola': REPO / 'resultado-comfy-feminino-v2' / 'camadas' / 'camisola.png',
          'calcoes': REPO / 'resultado-comfy-feminino-v2' / 'camadas' / 'calcoes.png'},
}
SOCKS = REPO / 'resultado-comfy-feminino-v2' / 'camadas' / 'meias-chuteiras-partilhada.png'
BOOTS_FROM = 876  # rows of the boots: brown leather/studs are not skin


def wide(a384):
    out = np.zeros((H, CW, 4), np.uint8)
    out[:, OX:OX + 384] = a384
    return out


def flat384(a):
    return np.where(a[..., 3:] > 127, a[..., :3], BG).astype(np.uint8)


def half(arr):
    """256x512 by area with premultiplied alpha (no dark fringes)."""
    a = arr[..., 3:].astype(float) / 255
    pre = np.dstack([arr[..., :3] * a, a * 255]).astype(np.uint8)
    small = np.asarray(Image.fromarray(pre, 'RGBA').resize((CW // 2, H // 2), Image.BOX)).astype(float)
    al = small[..., 3:] / 255
    rgb = np.where(al > 0, small[..., :3] / np.maximum(al, 1e-6), 0)
    return np.dstack([np.clip(rgb, 0, 255), small[..., 3:]]).astype(np.uint8)


def save(arr, rel, weights):
    for size, a in (('512', arr), ('256', half(arr))):
        path = OUT / size / f'{rel}.webp'
        path.parent.mkdir(parents=True, exist_ok=True)
        Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=90, alpha_quality=100, method=6)
        weights.setdefault(size, {})[rel] = round(path.stat().st_size / 1024, 1)


def over(*layers):
    out = Image.fromarray(layers[0], 'RGBA')
    for l in layers[1:]:
        out.alpha_composite(Image.fromarray(l, 'RGBA'))
    return np.asarray(out)


def flatten(arr):
    img = Image.new('RGB', (arr.shape[1], arr.shape[0]), tuple(int(c) for c in BG))
    img.paste(Image.fromarray(arr, 'RGBA'), (0, 0), Image.fromarray(arr, 'RGBA'))
    return img


def main(chosen):
    OUT.mkdir(parents=True, exist_ok=True)
    weights, report = {}, {'escolhidas': chosen, 'pele_removida_das_camadas_px': {}, 'pele_do_tom_antigo_a_vista': {}}
    socks, n = vs.strip_skin(np.asarray(Image.open(SOCKS).convert('RGBA')), keep_below=BOOTS_FROM)
    report['pele_removida_das_camadas_px']['meias-chuteiras'] = n
    save(socks, 'kit/meias-chuteiras', weights)
    grids = {}
    for key in 'mf':
        h = HEADS[key]
        x0, y0, x1, y1 = h['head']
        fx0, fy0, fx1, fy1 = h['face']
        base384 = np.asarray(Image.open(VAR / f'base-rapada-{key}.png').convert('RGBA'))
        base_flat = flat384(base384)
        yy, xx = np.mgrid[:H, :384]
        face = (xx >= fx0) & (xx <= fx1) & (yy >= fy0) & (yy <= fy1)

        # Hair layers: the current style (original mannequin minus the shaved base) and the new ones.
        orig = np.asarray(Image.open(VAR / 'prep' / f'manequim-{key}-384.png').convert('RGBA'))
        cur_mask = np.asarray(Image.open(VAR / 'prep' / f'mascara-cabelo-atual-{key}.png')) > 127
        styles = {CURRENT[key]: vh.hair_layer(flat384(orig), base_flat, cur_mask, face)}
        smask = np.asarray(Image.open(VAR / 'prep' / f'mascara-penteado-{key}.png')) > 127
        for name, seed in chosen[key].items():
            own = VAR / 'prep' / f'mascara-penteado-{key}-{name}.png'
            smask = np.asarray(Image.open(own if own.exists() else VAR / 'prep' / f'mascara-penteado-{key}.png')) > 127
            res = np.asarray(Image.open(VAR / 'jobs' / f'cabelo-{key}-{name}-{seed}.png').convert('RGB')
                             .resize((384, H), Image.BOX))
            styles[name] = vh.hair_layer(res, base_flat, smask, face)

        # Kit without skin.
        kit = {}
        for slot, path in KIT[key].items():
            kit[slot], n = vs.strip_skin(np.asarray(Image.open(path).convert('RGBA')))
            report['pele_removida_das_camadas_px'][f'{key}-{slot}'] = n
            save(kit[slot], f'kit/{key}-{slot}', weights)

        # Skin tones on the shaved base.
        head = (x0 - 10, y0, x1 + 10, y1 + 10)
        skin = vs.skin_mask(base384, head=head)
        bases = {}
        for t in range(1, 7):
            bases[t] = wide(vs.remap(base384, skin, t))
            save(bases[t], f'bases/{key}-pele-{t}', weights)
            dressed = over(bases[t], socks, kit['calcoes'], kit['camisola'])
            if t != 4:
                left = (dressed[..., 3] > 127) & vs.skinlike(dressed[..., :3]) & \
                       (np.abs(dressed[..., :3].astype(int) - bases[t][..., :3].astype(int)).max(axis=2) > 40)
                left[BOOTS_FROM:] = False
                report['pele_do_tom_antigo_a_vista'][f'{key}-{t}'] = int(left.sum())

        for name, layer in styles.items():
            for colour in vh.COLOURS:
                save(wide(vh.recolour(layer, colour)), f'cabelo/{key}-{name}-{colour}', weights)
        report.setdefault('penteados', {})[key] = list(styles)

        # Grid: skin tones (rows) x hairstyles (columns), dressed, half scale, top 300 px.
        names = list(styles)
        cols = ['rapado'] + names if key == 'm' else names
        cell_w, cell_h = 256, 300
        grid = Image.new('RGB', (len(cols) * cell_w, 24 + 6 * cell_h), (40, 40, 40))
        draw = ImageDraw.Draw(grid)
        colours = list(vh.COLOURS)
        for c, name in enumerate(cols):
            draw.text((c * cell_w + 6, 6), name, fill=(255, 230, 160))
            for t in range(1, 7):
                colour = colours[(c + t) % len(colours)]
                layers = [bases[t], socks, kit['calcoes'], kit['camisola']]
                if name != 'rapado':
                    layers.append(wide(vh.recolour(styles[name], colour)))
                img = flatten(half(over(*layers))).crop((0, 0, cell_w, cell_h))
                grid.paste(img, (c * cell_w, 24 + (t - 1) * cell_h))
        grid.save(OUT / f'grelha-{key}-tons-x-penteados.png', optimize=True)
        grids[key] = grid

        # Hairstyles x hair colours, head and shoulders at 512 scale (tone 4).
        sheet = Image.new('RGB', (len(colours) * 200, 24 + len(names) * 220), (40, 40, 40))
        draw = ImageDraw.Draw(sheet)
        for c, colour in enumerate(colours):
            draw.text((c * 200 + 6, 6), colour, fill=(255, 230, 160))
            for r, name in enumerate(names):
                img = flatten(over(bases[4], kit['camisola'], wide(vh.recolour(styles[name], colour))))
                cx = OX + (x0 + x1) // 2
                sheet.paste(img.crop((cx - 100, 0, cx + 100, 220)), (c * 200, 24 + r * 220))
        sheet.save(OUT / f'grelha-{key}-penteados-x-cores.png', optimize=True)

        # Busts for the card and the lists, centred on the head (the male head sits ~34 px right of the
        # canvas centre): 256x256 crop from the top of the canvas, reduced 2:1 to 128x128.
        cx = OX + h['skull'][0]
        crop = (cx - 128, 0, cx + 128, 256)
        report.setdefault('busto_recorte_512', {})[key] = {'centro_x': cx, 'caixa': list(crop)}
        for t in range(1, 7):
            dressed = over(bases[t], socks, kit['calcoes'], kit['camisola'],
                           wide(vh.recolour(styles[CURRENT[key]], 'castanho-escuro')))
            bust = np.asarray(Image.fromarray(dressed, 'RGBA').crop(crop))
            b128 = Image.fromarray(bust, 'RGBA').resize((128, 128), Image.BOX)
            path = OUT / 'busto' / f'{key}-pele-{t}.webp'
            path.parent.mkdir(parents=True, exist_ok=True)
            b128.save(path, 'WEBP', quality=90, alpha_quality=100, method=6)
            weights.setdefault('busto', {})[f'{key}-pele-{t}'] = round(path.stat().st_size / 1024, 1)

        # Layers stay off the face.
        skinface = face & (base384[..., 3] > 127)  # the face itself, not the background inside its box
        report.setdefault('cabelo_na_cara_px', {})[key] = {n: int((l[..., 3] > 0)[skinface].sum()) for n, l in styles.items()}

    report['pesos_kb'] = weights
    totals = {size: round(sum(v.values()), 1) for size, v in weights.items()}
    report['pesos_total_kb'] = totals
    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps({k: v for k, v in report.items() if k != 'pesos_kb'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(json.loads(Path(sys.argv[1]).read_text()))
