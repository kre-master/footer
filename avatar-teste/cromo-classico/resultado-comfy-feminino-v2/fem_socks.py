#!/usr/bin/env python3
"""Shared socks+boots: the male v3 layer without the calf skin above the sock tops, and the fit test
over the female mannequin (skin visible around the socks)."""

import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
FEM = ROOT / 'fem'
V3 = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico' / 'resultado-comfy-v3' / 'camadas'
CW, OX = 512, 64


def sock_layer():
    L = np.asarray(Image.open(V3 / 'meias-chuteiras.png').convert('RGBA')).copy()
    rgb = L[..., :3].astype(int)
    a = L[..., 3] > 0
    skin = a & (rgb[..., 0] - rgb[..., 2] > 70) & (rgb.mean(axis=2) > 70) & (rgb[..., 1] > 60)
    tops = {}
    for name, (x0, x1) in {'direita': (0, CW // 2), 'esquerda': (CW // 2, CW)}.items():
        for y in range(690, 800):
            width = a[y, x0:x1].sum()
            if width and skin[y, x0:x1].sum() < 0.4 * width:
                tops[name] = y
                break
        L[:tops[name] - 1, x0:x1, 3] = 0  # keep one row above for the sock's top outline
    L[L[..., 3] == 0, :3] = 0
    return Image.fromarray(L, 'RGBA'), tops


def main():
    layer, tops = sock_layer()
    layer.save(FEM / 'meias-chuteiras-partilhada.png', optimize=True)
    def around(mannequin):
        """Skin-coloured pixels (not the dark outline) beside the socks, from the sock tops to the boots
        (below that the studs and leather are brown and the feet are the same male pixels)."""
        canvas = Image.new('RGBA', (CW, 1024), (0, 0, 0, 0))
        canvas.paste(mannequin, (OX, 0))
        px = np.asarray(canvas).astype(int)
        skin = (px[..., 3] > 127) & (px[..., 0] - px[..., 2] > 70) & (px[..., :3].mean(axis=2) > 70)
        sock = np.asarray(layer)[..., 3] > 0
        count = 0
        for y in range(min(tops.values()), 876):
            for x0, x1 in [(0, CW // 2), (CW // 2, CW)]:
                xs = np.where(sock[y, x0:x1])[0]
                if len(xs):
                    row = skin[y, x0:x1] & ~sock[y, x0:x1]
                    count += int(row[:xs[0]].sum() + row[xs[-1] + 1:].sum())
        return canvas, count

    fem, visible = around(Image.open(FEM / 'manequim-feminino.png').convert('RGBA'))
    _, visible_male = around(Image.open(FEM / 'prep' / 'manequim-m-v3-384.png').convert('RGBA'))
    report = {'topo_das_meias': tops, 'pele_a_volta_das_meias_feminino': visible,
              'pele_a_volta_das_meias_masculino': visible_male}
    (FEM / 'teste-partilha-meias.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(report)
    out = fem.copy()
    out.alpha_composite(layer)
    flat = Image.new('RGB', out.size, (0xE9, 0xDC, 0xC3))
    flat.paste(out, (0, 0), out)
    flat.save(FEM / 'teste-partilha-meias.png')


if __name__ == '__main__':
    main()
