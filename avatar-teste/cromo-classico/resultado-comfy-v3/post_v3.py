#!/usr/bin/env python3
"""Round 3: patch the v2 mannequin/jersey/socks with the new abdomen, collar and sock band,
then rebuild compositions, swaps, half size, bust and weights.

  post_v3.py <abdomen seed> <gola seed> <meias seed>
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

import post_v2 as p

ROOT = Path(__file__).resolve().parent
V3 = ROOT / 'v3'
JOBS = V3 / 'jobs'
OUT = V3 / 'resultado-comfy-v3'
W, H, CW, OX = p.W, p.H, p.CW, p.OX
V2_CHOSEN = {'camisola': 1111202621, 'calcoes': 1111202621, 'meias-chuteiras': 1111202601}
SEEDS = {'abdomen': [1111202631, 1111202632, 1111202633, 1111202634],
         'abdomen2': [1111202635, 1111202636, 1111202637, 1111202638],
         'abdomen3': [1111202661, 1111202662, 1111202663, 1111202664],
         'gola': [1111202641, 1111202642, 1111202643], 'meias': [1111202651, 1111202652, 1111202653]}
MASKS = {'abdomen': 'mascara-abdomen.png', 'gola': 'mascara-gola-punhos.png', 'meias': 'mascara-meias.png'}


def result(name, seed):
    return np.asarray(Image.open(JOBS / f'{name}-{seed}.png').convert('RGB').resize((W, H), Image.BOX))


def patch(layer, name, seed, job=None):
    """Replace the layer's pixels inside the round-3 mask with the new result (384-wide grid)."""
    px = np.asarray(layer).copy()
    m = np.asarray(Image.open(V3 / 'prep' / MASKS[name])) > 127
    rgb = result(job or name, seed)
    differs = (np.abs(rgb.astype(int) - p.BG).max(axis=2) > 12) | (np.asarray(layer)[:, OX:OX + W, 3] > 0)
    sub = px[:, OX:OX + W]
    if name == 'abdomen':
        differs &= sub[..., 3] > 0  # keep the mannequin's silhouette: no skin in the arm gaps
    if name == 'gola':
        m &= sub[..., 3] > 0  # collar and cuffs stay inside the jersey's own outline
    sub[m, :3] = rgb[m]
    sub[m, 3] = np.where(differs[m], 255, 0)
    sub[sub[..., 3] == 0, :3] = 0
    return Image.fromarray(px, 'RGBA')


CREAM = np.array([0xE8, 0xD9, 0xB5])


def recolour(layer, name):
    """Colour correction to warm cream (#E8D9B5): keeps the light and shade (softer contrast)
    and leaves outlines, stripes, burgundy and skin alone."""
    px = np.asarray(layer).copy()
    sub = px[:, OX:OX + W]
    rgb = sub[..., :3].astype(float)
    a = sub[..., 3] > 0
    lum = rgb @ [0.299, 0.587, 0.114]
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    sel = a & (lum > 150) & (sat < 60)  # white/cream pixels: not outlines, stripes, burgundy or skin
    if name == 'gola':
        sel &= np.asarray(Image.open(V3 / 'prep' / MASKS[name])) > 127
    else:
        rows = np.zeros(H, bool)
        rows[728:770] = True  # the band below the knee
        sel &= rows[:, None]
    ref = np.percentile(lum[sel], 75)
    soft = 0.5 * ref + 0.5 * lum[sel]
    sub[sel, :3] = np.clip(CREAM * (soft / ref)[:, None], 0, 255).astype(np.uint8)
    return Image.fromarray(px, 'RGBA')


def main(chosen):
    for sub in ['', 'camadas', 'seeds']:
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    base_v2 = p.wide(Image.open(p.V2 / 'manequim-cuecas-brancas.png').convert('RGBA'))
    v2_layers = {s: p.layer(s, V2_CHOSEN[s]) for s in p.SLOTS}

    variants = {
        'abdomen': lambda seed: patch(base_v2, 'abdomen', seed),
        'abdomen2': lambda seed: patch(base_v2, 'abdomen', seed, 'abdomen2'),
        'abdomen3': lambda seed: patch(base_v2, 'abdomen', seed, 'abdomen3'),
        'gola': lambda seed: patch(v2_layers['camisola'], 'gola', seed),
        'meias': lambda seed: patch(v2_layers['meias-chuteiras'], 'meias', seed),
    }
    base = variants[chosen['abdomen_job']](chosen['abdomen'])
    # Collar and sock band: the AI retries came out speckled (see the contact sheet); the chosen v2
    # pieces, cut out again without the holes, get a colour correction instead.
    layers = dict(v2_layers, camisola=recolour(v2_layers['camisola'], 'gola'),
                  **{'meias-chuteiras': recolour(v2_layers['meias-chuteiras'], 'meias')})

    # Contact sheet, cropped to the zone each change touches, 2x nearest.
    crops = {'abdomen': (100, 160, 300, 440), 'abdomen2': (100, 160, 300, 440), 'abdomen3': (100, 160, 300, 440), 'gola': (100, 130, 380, 330), 'meias': (100, 680, 380, 1000)}
    sheet = Image.new('RGB', (10 + 4 * 570, 10 + 5 * 680), (40, 40, 40))
    draw = ImageDraw.Draw(sheet)
    y = 10
    for name, seeds in SEEDS.items():
        x0, y0, x1, y1 = crops[name]
        rowh = 0
        for col, seed in enumerate(seeds):
            im = variants[name](seed)
            im.save(OUT / 'seeds' / f'{name}-{seed}.png', optimize=True)
            shown = p.flat(im if name.startswith('abdomen') else p.on(base, *[
                (im if (name == 'gola' and s == 'camisola') or (name == 'meias' and s == 'meias-chuteiras')
                 else layers[s]) for s in p.ORDER]))
            tile = shown.crop((OX + x0, y0, OX + x1, y1))
            tile = tile.resize((tile.width * 2, tile.height * 2), Image.NEAREST)
            sheet.paste(tile, (10 + col * (tile.width + 10), y + 24))
            mark = ' (escolhida)' if name == chosen['abdomen_job'] and seed == chosen['abdomen'] else ''
            draw.text((14 + col * (tile.width + 10), y + 6), f'{name} {seed}{mark}', fill=(255, 230, 160))
            rowh = tile.height
        y += rowh + 34
    sheet.crop((0, 0, sheet.width, y)).save(OUT / 'folha-contacto-seeds.png', optimize=True)

    base.save(OUT / 'camadas' / 'manequim-cuecas-brancas.png', optimize=True)
    base.save(OUT / 'camadas' / 'manequim-cuecas-brancas.webp', lossless=True, method=6)
    report = {'escolhidas': chosen, 'webp_kb': {'manequim': p.webp_kb(base)}, 'png_kb': {'manequim': p.png_kb(base)}}
    for slot in p.SLOTS:
        layers[slot].save(OUT / 'camadas' / f'{slot}.png', optimize=True)
        layers[slot].save(OUT / 'camadas' / f'{slot}.webp', lossless=True, method=6)
        report['webp_kb'][slot] = p.webp_kb(layers[slot])
        report['png_kb'][slot] = p.png_kb(layers[slot])

    canvas = Image.new('RGBA', (CW, H), (0, 0, 0, 0))
    pennant = Image.open(p.SRC / 'icone-galhardete.png').convert('RGBA')
    pennant = pennant.crop(pennant.getbbox())
    pennant = pennant.resize((round(pennant.width * 110 / pennant.height), 110), Image.LANCZOS)
    canvas.alpha_composite(pennant, (OX + 330, 140))
    canvas.alpha_composite(base)
    for slot in p.ORDER:
        canvas.alpha_composite(layers[slot])
    ball = Image.open(p.SRC / 'icone-bola.png').convert('RGBA')
    ball = ball.crop(ball.getbbox()).resize((80, 80), Image.LANCZOS)
    canvas.alpha_composite(ball, (OX + 372, H - 100))
    canvas.save(OUT / 'a-composicao-completa.png', optimize=True)
    p.flat(canvas).save(OUT / 'a-composicao-completa-fundo.png', optimize=True)
    report['webp_kb']['composicao'] = p.webp_kb(canvas)
    report['png_kb']['composicao'] = p.png_kb(canvas)

    # The new abdomen must not show with the jersey on: every changed mannequin pixel is under a layer.
    covered = np.zeros((H, CW), bool)
    for slot in p.SLOTS:
        covered |= np.asarray(layers[slot])[..., 3] > 0
    nb, ob = np.asarray(base).astype(int), np.asarray(base_v2).astype(int)
    changed = (np.abs(nb - ob).max(axis=2) > 0) & ((nb[..., 3] > 0) | (ob[..., 3] > 0))
    report['abdomen_novo_a_vista_com_camisola'] = int((changed & ~(np.asarray(layers['camisola'])[..., 3] > 0)
                                                        & ~(np.asarray(layers['calcoes'])[..., 3] > 0)).sum())
    rgb = np.asarray(base).astype(int)
    report['branco_das_cuecas_a_vista_vestido'] = int((~covered & (rgb[..., 3] > 0) & (rgb[..., :3].min(axis=2) > 170)
                                                       & np.pad(p.mask('calcoes'), ((0, 0), (OX, CW - W - OX)))).sum())

    swaps = Image.new('RGB', (10 + 4 * (CW + 10), H), (40, 40, 40))
    for i, im in enumerate([base] + [p.on(base, layers[s]) for s in p.SLOTS]):
        swaps.paste(p.flat(im), (10 + i * (CW + 10), 0))
    swaps.save(OUT / 'b-trocas.png', optimize=True)
    proof = {}
    for slot in p.SLOTS:
        diff = np.abs(np.asarray(p.on(base, layers[slot])).astype(int) - np.asarray(base).astype(int))
        proof[slot] = int(diff[np.asarray(layers[slot])[..., 3] == 0].max())
    report['diferenca_max_fora_da_camada'] = proof

    half = canvas.resize((CW // 2, H // 2), Image.BOX)
    half.save(OUT / 'c-metade-256x512.png', optimize=True)
    p.flat(half).resize((CW, H), Image.NEAREST).save(OUT / 'c-metade-ampliada-2x.png', optimize=True)
    report['webp_kb']['metade'] = p.webp_kb(half)
    bust = p.flat(canvas).crop((OX + 64, 0, OX + 320, 256)).resize((128, 128), Image.BOX)
    bust.save(OUT / 'c-busto-128.png', optimize=True)
    bust.resize((512, 512), Image.NEAREST).save(OUT / 'c-busto-ampliado-4x.png', optimize=True)
    report['webp_kb']['busto'] = p.webp_kb(bust)

    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    # post_v3.py <abdomen job> <abdomen seed>, e.g. abdomen2 1111202636
    main({'abdomen_job': sys.argv[1], 'abdomen': int(sys.argv[2]), 'gola': None, 'meias': None})
