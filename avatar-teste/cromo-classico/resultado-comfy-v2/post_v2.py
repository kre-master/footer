#!/usr/bin/env python3
"""Round 2 layers and compositions: 512x1024 canvas, half-size and bust versions, WebP weights.

  post_v2.py <camisola seed> <calcoes seed> <meias-chuteiras seed>
"""

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico'
V2 = ROOT / 'v2'
JOBS = V2 / 'jobs'
OUT = V2 / 'resultado-comfy-v2'
BG = np.array([0xE9, 0xDC, 0xC3])
W, H = 384, 1024
CW, OX = 512, 64  # wider canvas, mannequin centred at the same scale
SLOTS = ['camisola', 'calcoes', 'meias-chuteiras']
ORDER = ['calcoes', 'camisola', 'meias-chuteiras']  # bottom to top
SEEDS = {'camisola': [1111202601, 1111202621], 'calcoes': [1111202604, 1111202621],
         'meias-chuteiras': [1111202601, 1111202621]}
MANNEQUIN_SEEDS = [1111202611, 1111202612, 1111202613, 1111202614]


def mask(slot):
    return np.asarray(Image.open(V2 / f'mascara-{slot}-v2.png').convert('L')) > 127


def layer(slot, seed):
    rgb = np.asarray(Image.open(JOBS / f'{slot}-{seed}.png').convert('RGB').resize((W, H), Image.BOX)).astype(int)
    differs = np.abs(rgb - BG).max(axis=2) > 12
    keep = mask(slot) & differs
    if slot == 'camisola':
        # Where jersey and shorts overlap, keep only what the jersey actually painted: the
        # mannequin's own skin or briefs there would cover the shorts' waistband.
        base = np.asarray(Image.open(V2 / 'prep' / 'manequim-v2-flat.png').convert('RGB')).astype(int)
        unchanged = np.abs(rgb - base).max(axis=2) < 40
        bright = rgb.min(axis=2) > 170
        keep &= ~(mask('calcoes') & (unchanged | bright))
    if slot == 'calcoes':
        # Where the shorts came out slimmer than the briefs, close the gap with the dark outline.
        man = np.asarray(Image.open(V2 / 'manequim-cuecas-brancas.png').convert('RGBA')).astype(int)
        gap = mask(slot) & ~keep & (man[..., 3] > 0) & (man[..., :3].min(axis=2) > 170)
        rgb[gap] = (24, 20, 30)
        keep |= gap
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    rgb[alpha == 0] = 0  # hidden pixels carry no colour, so the files compress
    return wide(Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), 'RGBA'))


def wide(im):
    out = Image.new('RGBA', (CW, H), (0, 0, 0, 0))
    out.paste(im, (OX, 0))
    return out


def webp_kb(im):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', lossless=True, method=6)
    return round(buf.tell() / 1024, 1)


def png_kb(im):
    buf = io.BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return round(buf.tell() / 1024, 1)


def on(base, *layers):
    out = base.copy()
    for lay in layers:
        out.alpha_composite(lay)
    return out


def flat(im):
    out = Image.new('RGBA', im.size, tuple(BG) + (255,))
    out.alpha_composite(im)
    return out.convert('RGB')


def main(chosen):
    for sub in ['', 'camadas', 'seeds']:
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    base = wide(Image.open(V2 / 'manequim-cuecas-brancas.png').convert('RGBA'))
    base.save(OUT / 'camadas' / 'manequim-cuecas-brancas.png', optimize=True)
    base.save(OUT / 'camadas' / 'manequim-cuecas-brancas.webp', lossless=True, method=6)
    report = {'escolhidas': chosen, 'webp_kb': {'manequim': webp_kb(base)}, 'png_kb': {'manequim': png_kb(base)}}

    # Contact sheet: the 4 mannequins on top, then the 2 seeds of each piece.
    tile = 260
    th = round(tile * H / W)
    sheet = Image.new('RGB', (10 + 4 * (tile + 10), 4 * (th + 40)), (40, 40, 40))
    draw = ImageDraw.Draw(sheet)
    rows = [('manequim', MANNEQUIN_SEEDS)] + [(s, SEEDS[s]) for s in SLOTS]
    for row, (slot, seeds) in enumerate(rows):
        for col, seed in enumerate(seeds):
            if slot == 'manequim':
                im = Image.open(JOBS / f'manequim-{seed}.png').convert('RGB').resize((W, H), Image.BOX)
                mark = ' (escolhida)' if seed == chosen['manequim'] else ''
            else:
                lay = layer(slot, seed)
                lay.save(OUT / 'seeds' / f'{slot}-{seed}.png', optimize=True)
                im = flat(on(base, lay)).crop((OX, 0, OX + W, H))
                mark = ' (escolhida)' if seed == chosen[slot] else ''
            x, y = 10 + col * (tile + 10), row * (th + 40)
            sheet.paste(im.resize((tile, th), Image.BOX), (x, y + 30))
            draw.text((x + 4, y + 10), f'{slot} {seed}{mark}', fill=(255, 230, 160))
    sheet.save(OUT / 'folha-contacto-seeds.png', optimize=True)

    layers = {}
    for slot in SLOTS:
        layers[slot] = layer(slot, chosen[slot])
        layers[slot].save(OUT / 'camadas' / f'{slot}.png', optimize=True)
        layers[slot].save(OUT / 'camadas' / f'{slot}.webp', lossless=True, method=6)
        report['webp_kb'][slot] = webp_kb(layers[slot])
        report['png_kb'][slot] = png_kb(layers[slot])

    # Full composition: pennant behind, right of the shoulder; ball by the left foot (right side of the image).
    canvas = Image.new('RGBA', (CW, H), (0, 0, 0, 0))
    pennant = Image.open(SRC / 'icone-galhardete.png').convert('RGBA')
    pennant = pennant.crop(pennant.getbbox())
    pennant = pennant.resize((round(pennant.width * 110 / pennant.height), 110), Image.LANCZOS)
    canvas.alpha_composite(pennant, (OX + 330, 140))
    canvas.alpha_composite(base)
    for slot in ORDER:
        canvas.alpha_composite(layers[slot])
    ball = Image.open(SRC / 'icone-bola.png').convert('RGBA')
    ball = ball.crop(ball.getbbox()).resize((80, 80), Image.LANCZOS)
    canvas.alpha_composite(ball, (OX + 372, H - 100))
    canvas.save(OUT / 'a-composicao-completa.png', optimize=True)
    flat(canvas).save(OUT / 'a-composicao-completa-fundo.png', optimize=True)
    report['webp_kb']['composicao'] = webp_kb(canvas)
    report['png_kb']['composicao'] = png_kb(canvas)

    # Gaps: pixels of the dressed figure (no props) that are still the mannequin's skin or briefs
    # inside the waist zone, where jersey and shorts meet.
    dressed = on(base, *[layers[s] for s in ORDER])
    covered = np.zeros((H, CW), bool)
    for slot in SLOTS:
        covered |= np.asarray(layers[slot])[..., 3] > 0
    cam, cal = np.pad(mask('camisola'), ((0, 0), (OX, CW - W - OX))), np.pad(mask('calcoes'), ((0, 0), (OX, CW - W - OX)))
    rows = np.where(cal.any(axis=1))[0]
    zone = np.zeros_like(cam)
    zone[rows[0] - 10:rows[0] + 40] = True
    zone &= (cam | cal) & (np.asarray(base)[..., 3] > 0)
    report['pixels_de_manequim_a_vista_na_cintura'] = int((zone & ~covered).sum())
    waist = flat(dressed).crop((OX + 60, rows[0] - 60, OX + 330, rows[0] + 80))
    waist.resize((waist.width * 2, waist.height * 2), Image.NEAREST).save(OUT / 'zoom-cintura.png', optimize=True)

    # Single-piece swaps over the new mannequin.
    swaps = Image.new('RGB', (10 + 4 * (CW + 10), H), (40, 40, 40))
    for i, im in enumerate([base] + [on(base, layers[s]) for s in SLOTS]):
        swaps.paste(flat(im), (10 + i * (CW + 10), 0))
    swaps.save(OUT / 'b-trocas.png', optimize=True)
    proof = {}
    for slot in SLOTS:
        diff = np.abs(np.asarray(on(base, layers[slot])).astype(int) - np.asarray(base).astype(int))
        proof[slot] = int(diff[np.asarray(layers[slot])[..., 3] == 0].max())
    report['diferenca_max_fora_da_camada'] = proof

    # (a) half size: area reduction to 256x512 (192x512 figure area), shown 2x with nearest neighbour.
    half = canvas.resize((CW // 2, H // 2), Image.BOX)
    half.save(OUT / 'c-metade-256x512.png', optimize=True)
    flat(half).resize((CW, H), Image.NEAREST).save(OUT / 'c-metade-ampliada-2x.png', optimize=True)
    report['webp_kb']['metade'] = webp_kb(half)
    # (b) bust for lists: 256x256 around head and collar, reduced 2:1 to 128x128.
    bust = flat(canvas).crop((OX + 64, 0, OX + 320, 256)).resize((128, 128), Image.BOX)
    bust.save(OUT / 'c-busto-128.png', optimize=True)
    bust.resize((512, 512), Image.NEAREST).save(OUT / 'c-busto-ampliado-4x.png', optimize=True)
    report['webp_kb']['busto'] = webp_kb(bust)

    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    seeds = list(map(int, sys.argv[1:5]))
    main(dict(zip(['camisola', 'calcoes', 'meias-chuteiras', 'manequim'], seeds)))
