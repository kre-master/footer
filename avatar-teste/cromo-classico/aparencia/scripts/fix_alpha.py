#!/usr/bin/env python3
"""Make every avatar layer fully opaque where it is drawn: alpha >= 200 -> 255 (the male mannequin's body
was ~1-2 % transparent, which let the app's background lines show through the legs as grey stripes) and
alpha < 16 -> 0 (the near-invisible halo around the original mannequin). Rewrites WebP q90 in place.

  fix_alpha.py <folder> [<folder> ...]
"""

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def fix(path):
    im = Image.open(path).convert('RGBA')
    a = np.asarray(im).copy()
    al = a[..., 3]
    before = int(((al >= 200) & (al < 255)).sum() + ((al > 0) & (al < 16)).sum())
    if not before:
        return 0
    al[al >= 200] = 255
    al[al < 16] = 0
    a[al == 0, :3] = 0
    Image.fromarray(a, 'RGBA').save(path, 'WEBP', quality=90, alpha_quality=100, method=6)
    return before


if __name__ == '__main__':
    report = {}
    for folder in sys.argv[1:]:
        for p in sorted(Path(folder).rglob('*.webp')):
            n = fix(p)
            if n:
                report[str(p)] = n
    print(json.dumps({'ficheiros_corrigidos': len(report), 'pixels': sum(report.values())}))
