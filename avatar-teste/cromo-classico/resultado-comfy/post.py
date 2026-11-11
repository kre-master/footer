#!/usr/bin/env python3
"""Layers, compositions, contact sheet and weights from the ComfyUI results."""

import io
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico'
JOBS = ROOT / 'jobs'
OUT = ROOT / 'resultado-comfy'
BG = np.array([0xE9, 0xDC, 0xC3])
W, H = 384, 1024
SLOTS = {'camisola': 'mascara-camisola.png', 'calcoes': 'mascara-calcoes.png',
         'meias-chuteiras': 'mascara-meias-chuteiras.png'}
ORDER = ['calcoes', 'camisola', 'meias-chuteiras']  # bottom to top
SEEDS = [1111202601, 1111202602, 1111202603, 1111202604]


def layer(slot, seed):
    result = Image.open(JOBS / f'{slot}-{seed}.png').convert('RGB').resize((W, H), Image.BOX)
    rgb = np.asarray(result).astype(int)
    mask = np.asarray(Image.open(SRC / SLOTS[slot]).convert('L')) > 127
    differs = np.abs(rgb - BG).max(axis=2) > 12
    alpha = np.where(mask & differs, 255, 0).astype(np.uint8)
    rgb[alpha == 0] = 0  # hidden pixels carry no colour, so the PNG compresses
    return Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), 'RGBA')


def weights(im):
    png, webp = io.BytesIO(), io.BytesIO()
    im.save(png, 'PNG', optimize=True)
    im.save(webp, 'WEBP', lossless=True, method=6)
    return round(png.tell() / 1024, 1), round(webp.tell() / 1024, 1)


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
    OUT.mkdir(exist_ok=True)
    (OUT / 'camadas').mkdir(exist_ok=True)
    (OUT / 'seeds').mkdir(exist_ok=True)
    base = Image.open(SRC / 'manequim-base.png').convert('RGBA')
    report = {'pesos_kb': {}, 'escolhidas': chosen}

    # (d) contact sheet: full result per seed, with a crop of the slot area beneath.
    sheet = Image.new('RGB', (W * 4 + 50, H * 3 + 40 * 3), (40, 40, 40))
    draw = ImageDraw.Draw(sheet)
    for row, slot in enumerate(SLOTS):
        for col, seed in enumerate(SEEDS):
            lay = layer(slot, seed)
            lay.save(OUT / 'seeds' / f'{slot}-{seed}.png', optimize=True)
            x, y = 10 + col * (W + 10), row * (H + 40)
            sheet.paste(flat(on(base, lay)), (x, y + 30))
            mark = ' (escolhida)' if seed == chosen[slot] else ''
            draw.text((x + 4, y + 10), f'{slot}  seed {seed}{mark}', fill=(255, 230, 160))
    sheet.save(OUT / 'folha-contacto-seeds.png', optimize=True)

    layers = {}
    for slot in SLOTS:
        layers[slot] = layer(slot, chosen[slot])
        layers[slot].save(OUT / 'camadas' / f'{slot}.png', optimize=True)
        layers[slot].save(OUT / 'camadas' / f'{slot}.webp', lossless=True, method=6)
        report['pesos_kb'][slot] = dict(zip(['png', 'webp'], weights(layers[slot])))
    report['pesos_kb']['manequim'] = dict(zip(['png', 'webp'], weights(base)))

    # (a) full composition with pennant behind (right of the shoulder) and ball by the left foot.
    canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    pennant = Image.open(SRC / 'icone-galhardete.png').convert('RGBA')
    pennant = pennant.crop(pennant.getbbox())
    pennant = pennant.resize((round(pennant.width * 110 / pennant.height), 110), Image.LANCZOS)
    canvas.alpha_composite(pennant, (W - pennant.width - 4, 150))
    canvas.alpha_composite(base)
    for slot in ORDER:
        canvas.alpha_composite(layers[slot])
    ball = Image.open(SRC / 'icone-bola.png').convert('RGBA')
    ball = ball.crop(ball.getbbox()).resize((80, 80), Image.LANCZOS)
    # The viewer's left foot is the mannequin's right foot; "left foot" = mannequin's left, right side of the image.
    canvas.alpha_composite(ball, (W - 84, H - 92))
    canvas.save(OUT / 'a-composicao-completa.png', optimize=True)
    flat(canvas).save(OUT / 'a-composicao-completa-fundo.png', optimize=True)
    report['pesos_kb']['composicao'] = dict(zip(['png', 'webp'], weights(canvas)))

    # (b) single-piece swaps.
    swaps = Image.new('RGB', (W * 4 + 50, H), (40, 40, 40))
    for i, im in enumerate([base] + [on(base, layers[s]) for s in ['camisola', 'calcoes', 'meias-chuteiras']]):
        swaps.paste(flat(im), (10 + i * (W + 10), 0))
    for slot in SLOTS:
        on(base, layers[slot]).save(OUT / f'b-so-{slot}.png', optimize=True)
    swaps.save(OUT / 'b-trocas.png', optimize=True)
    # Proof: pixels outside each layer's alpha are identical to the mannequin.
    proof = {}
    for slot in SLOTS:
        diff = np.asarray(on(base, layers[slot])).astype(int) - np.asarray(base).astype(int)
        outside = np.asarray(layers[slot])[..., 3] == 0
        proof[slot] = int(np.abs(diff[outside]).max())
    report['diferenca_max_fora_da_camada'] = proof

    # (c) 54x144, 32 colours, enlarged 4x nearest.
    small = flat(canvas).resize((54, 144), Image.BOX).quantize(32, method=Image.MEDIANCUT)
    small.save(OUT / 'c-miniatura-54x144-32cores.png', optimize=True)
    small.convert('RGB').resize((216, 576), Image.NEAREST).save(OUT / 'c-miniatura-4x.png', optimize=True)
    report['pesos_kb']['miniatura_54x144'] = dict(zip(['png', 'webp'], weights(small.convert('RGB'))))

    (OUT / 'relatorio.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main(dict(zip(SLOTS, map(int, sys.argv[1:4]))))
