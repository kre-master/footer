#!/usr/bin/env python3
"""Avatar «Cromo clássico»: masked edit per clothing slot through the private ComfyUI API.

Resumable: each job writes jobs/<slot>-<seed>.job.json; `status` collects results.
"""

import argparse
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'repo' / 'avatar-teste' / 'cromo-classico'
PREP = ROOT / 'work' / 'prep'
JOBS = ROOT / 'jobs'
BASE_URL = 'http://100.108.104.97:18188'
OPENER = urllib.request.build_opener(urllib.request.ProxyHandler({}))
BG = (0xE9, 0xDC, 0xC3)
SCALE = 2  # generate at 768x2048, then reduce back to the 384x1024 grid
W, H = 384 * SCALE, 1024 * SCALE
SEEDS = [1111202601, 1111202602, 1111202603, 1111202604]
STYLE = ('pixel art footballer, same pose, same body, same face and skin, dark stepped outlines, '
         'warm low-colour shading, crisp pixels, plain flat beige background')
SLOTS = {
    'camisola': {
        'mask': 'mascara-camisola.png',
        'icon': 'icone-camisola.png',
        'prompt': ('wearing a vintage burgundy polo jersey with thin gold vertical pinstripes, cream ribbed collar '
                   'and cream cuff stripes, short sleeves, small crest on the chest'),
    },
    'calcoes': {
        'mask': 'mascara-calcoes.png',
        'icon': 'icone-calcoes.png',
        'prompt': 'wearing navy football shorts with cream side stripes and burgundy waistband',
    },
    'meias-chuteiras': {
        'mask': 'mascara-meias-chuteiras.png',
        'icon': 'icone-chuteiras.png',
        'prompt': ('wearing burgundy socks with cream band below the knee, vintage black leather lace-up football '
                   'boots with cream laces and brown studs'),
    },
}


def request(route, payload=None, body=None, headers=None, timeout=40):
    if payload is not None:
        body = json.dumps(payload).encode()
        headers = {'Content-Type': 'application/json'}
    req = urllib.request.Request(BASE_URL + route, data=body, headers=headers or {})
    try:
        with OPENER.open(req, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise RuntimeError(f'{route}: HTTP {error.code}: {error.read().decode(errors="replace")}') from error


def flat(path, size=None):
    im = Image.open(path).convert('RGBA')
    out = Image.new('RGB', im.size, BG)
    out.paste(im, (0, 0), im)
    if size:
        out = out.resize(size, Image.NEAREST)
    return out


def prepare():
    PREP.mkdir(parents=True, exist_ok=True)
    flat(SRC / 'manequim-base.png').save(PREP / 'manequim-flat.png')
    flat(SRC / 'manequim-base.png', (W, H)).save(PREP / 'manequim-flat-2x.png')
    flat(SRC / 'jogador-equipado.png', (W, H)).save(PREP / 'jogador-flat-2x.png')
    for spec in SLOTS.values():
        icon = flat(SRC / spec['icon'])
        icon.save(PREP / spec['icon'])
        Image.open(SRC / spec['mask']).convert('L').resize((W, H), Image.NEAREST).save(PREP / ('2x-' + spec['mask']))


def upload(path, cache={}):
    if path in cache:
        return cache[path]
    data = path.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    boundary = 'footer-' + uuid.uuid4().hex
    parts = []
    for key, value in [('type', 'input'), ('subfolder', 'footer-avatar/2026-11-11'), ('overwrite', 'true')]:
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="image"; '
                 f'filename="{path.stem}-{digest[:10]}.png"\r\nContent-Type: image/png\r\n\r\n'.encode())
    parts += [data, f'\r\n--{boundary}--\r\n'.encode()]
    response = request('/upload/image', body=b''.join(parts),
                       headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    cache[path] = (str(Path(response.get('subfolder', '')) / response['name']).replace('\\', '/'), digest)
    return cache[path]


def make_graph(slot, seed, names):
    def node(kind, **inputs):
        return {'class_type': kind, 'inputs': inputs}

    prompt = f"{STYLE}, {SLOTS[slot]['prompt']}"
    # Loaders, sampler, steps and CFG as in the 07/11 pilot (official 4B Base edit template).
    # Extra: base latent with SetLatentNoiseMask (noise only inside the slot mask), three
    # reference latents (mannequin for pose, equipped player and icon for the kit) and a
    # final ImageCompositeMasked so outside the mask the pixels are the mannequin's.
    g = {
        '1': node('UNETLoader', unet_name='flux-2-klein-base-4b-fp8.safetensors', weight_dtype='default'),
        '2': node('CLIPLoader', clip_name='qwen_3_4b.safetensors', type='flux2', device='default'),
        '3': node('VAELoader', vae_name='flux2-vae.safetensors'),
        '4': node('LoadImage', image=names['base']),
        '5': node('LoadImage', image=names['mask']),
        '6': node('ImageToMask', image=['5', 0], channel='red'),
        '7': node('LoadImage', image=names['player']),
        '8': node('LoadImage', image=names['icon']),
        '9': node('VAEEncode', pixels=['4', 0], vae=['3', 0]),
        '10': node('VAEEncode', pixels=['7', 0], vae=['3', 0]),
        '11': node('VAEEncode', pixels=['8', 0], vae=['3', 0]),
        '12': node('CLIPTextEncode', clip=['2', 0], text=prompt),
        '13': node('CLIPTextEncode', clip=['2', 0], text=''),
        '14': node('ReferenceLatent', conditioning=['12', 0], latent=['9', 0]),
        '15': node('ReferenceLatent', conditioning=['14', 0], latent=['10', 0]),
        '16': node('ReferenceLatent', conditioning=['15', 0], latent=['11', 0]),
        '17': node('ReferenceLatent', conditioning=['13', 0], latent=['9', 0]),
        '18': node('ReferenceLatent', conditioning=['17', 0], latent=['10', 0]),
        '19': node('ReferenceLatent', conditioning=['18', 0], latent=['11', 0]),
        '20': node('CFGGuider', model=['1', 0], positive=['16', 0], negative=['19', 0], cfg=5.0),
        '21': node('KSamplerSelect', sampler_name='euler'),
        '22': node('Flux2Scheduler', steps=20, width=W, height=H),
        '23': node('SetLatentNoiseMask', samples=['9', 0], mask=['6', 0]),
        '24': node('RandomNoise', noise_seed=seed),
        '25': node('SamplerCustomAdvanced', noise=['24', 0], guider=['20', 0], sampler=['21', 0],
                   sigmas=['22', 0], latent_image=['23', 0]),
        '26': node('VAEDecode', samples=['25', 0], vae=['3', 0]),
        '27': node('ImageCompositeMasked', destination=['4', 0], source=['26', 0], x=0, y=0,
                   resize_source=False, mask=['6', 0]),
        '28': node('SaveImage', images=['27', 0], filename_prefix=f'Footer/avatar-2026-11-11/{slot}-{seed}'),
    }
    return g, prompt


def submit(slot, seed):
    JOBS.mkdir(exist_ok=True)
    key = f'{slot}-{seed}'
    job_path = JOBS / f'{key}.job.json'
    if job_path.exists():
        print(json.dumps({'job': key, 'existing': True}), flush=True)
        return
    spec = SLOTS[slot]
    names, hashes = {}, {}
    for role, path in [('base', PREP / 'manequim-flat-2x.png'), ('mask', PREP / ('2x-' + spec['mask'])),
                       ('player', PREP / 'jogador-flat-2x.png'), ('icon', PREP / spec['icon'])]:
        names[role], hashes[role] = upload(path)
    graph, prompt = make_graph(slot, seed, names)
    (JOBS / f'{key}.api.json').write_text(json.dumps(graph, ensure_ascii=False, indent=2))
    result = request('/prompt', payload={'prompt': graph, 'client_id': 'footer-avatar-' + key})
    if not result.get('prompt_id') or result.get('node_errors'):
        raise RuntimeError(json.dumps(result, ensure_ascii=False))
    job = {'job': key, 'slot': slot, 'seed': seed, 'prompt': prompt, 'prompt_id': result['prompt_id'],
           'inputs': names, 'sha256': hashes, 'width': W, 'height': H, 'steps': 20, 'cfg': 5.0,
           'model': 'flux-2-klein-base-4b-fp8.safetensors', 'submitted_at_unix': time.time()}
    job_path.write_text(json.dumps(job, ensure_ascii=False, indent=2))
    print(json.dumps({'job': key, 'prompt_id': result['prompt_id']}), flush=True)


def collect(key):
    job = json.loads((JOBS / f'{key}.job.json').read_text())
    record = request('/history/' + job['prompt_id']).get(job['prompt_id'])
    if not record:
        return None
    state = record.get('status', {})
    if state.get('status_str') == 'error':
        return {'job': key, 'status': 'error', 'messages': state.get('messages')}
    destination = JOBS / f'{key}.png'
    for output in record.get('outputs', {}).values():
        for image in output.get('images', []):
            params = urllib.parse.urlencode({k: image[k] for k in ('filename', 'subfolder', 'type') if k in image})
            with OPENER.open(BASE_URL + '/view?' + params, timeout=60) as response:
                destination.write_bytes(response.read())
    times = {n: d.get('timestamp') for n, d in state.get('messages', []) if isinstance(d, dict)}
    seconds = None
    if times.get('execution_start') and times.get('execution_success'):
        seconds = (times['execution_success'] - times['execution_start']) / 1000
    result = {'job': key, 'slot': job['slot'], 'seed': job['seed'], 'status': state.get('status_str'),
              'seconds': seconds, 'file': destination.name if destination.exists() else None}
    (JOBS / f'{key}.result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['prepare', 'submit', 'collect'])
    args = parser.parse_args()
    if args.action == 'prepare':
        prepare()
    elif args.action == 'submit':
        for slot in SLOTS:
            for seed in SEEDS:
                submit(slot, seed)
    else:
        for slot in SLOTS:
            for seed in SEEDS:
                key = f'{slot}-{seed}'
                if (JOBS / f'{key}.job.json').exists() and not (JOBS / f'{key}.result.json').exists():
                    print(json.dumps(collect(key) or {'job': key, 'status': 'pending'}), flush=True)


if __name__ == '__main__':
    main()
