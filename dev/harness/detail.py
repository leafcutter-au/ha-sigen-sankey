import sys
from score import measure_ref, measure_render, norm
ref = measure_ref(); ren = measure_render(sys.argv[1])
for rc, nc in zip(ref, ren):
    for (rn, rm, rf), (nn, nm, nf) in zip(rc, nc):
        r, m = norm(rm), norm(nm)
        print(f'{rn:8s} h ref {r["h"]:.0f} me {m["h"]:.0f} | badge ref', [round(v) for v in r['badge']], 'me', [round(v) for v in m['badge']] if m['badge'] else None)
        for a, b in zip(r['text'], m['text'] + [None] * 5):
            fa = f"y {a['y0']:.0f}-{a['y1']:.0f} (h{a['y1']-a['y0']:.0f}) x {a['x0']:.0f} w{a['x1']-a['x0']:.0f}"
            fb = f"y {b['y0']:.0f}-{b['y1']:.0f} (h{b['y1']-b['y0']:.0f}) x {b['x0']:.0f} w{b['x1']-b['x0']:.0f}" if b else '-'
            print(f'      ref {fa:34s} me {fb}')
