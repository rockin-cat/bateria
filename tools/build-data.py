"""Genera data/cartes.js a partir de les cartes de bateria de l'app Cartes-rockin.

Es va fer servir una sola vegada (25-9-2026). Entrades:
  /tmp/bat.json  = BATERIA de Cartes-rockin/dades.js
                   (node -e "global.window={};require('./dades.js');require('fs').writeFileSync('/tmp/bat.json',JSON.stringify(window.ROCKIN_DADES.BATERIA))")
  /tmp/geo.json  = on cauen els números 1-4 a cada imatge (x1, dx, ytop), detectats a les imatges.
Correcció: al Break 6 la imatge té el bombo a la «i» del 4 (pas 14), no al 4 (pas 12) com deia dades.js.
Surt data/cartes.json (després convertit a data/cartes.js) i les imatges a assets/cartes/.
"""
import json, numpy as np
from PIL import Image, ImageOps
from scipy import ndimage
B=json.load(open('/tmp/bat.json'))
for c in B:
    if c['num']=='Break 6': c['kk']=[0,8,14]
geo=json.load(open('/tmp/geo.json'))
SRC='/home/claude/Cartes-rockin/imatges/Bateria'
def cls(c):
    r,g,b=c
    if abs(r-g)<25 and abs(g-b)<25: return 'gray'
    if b>200 and r<120: return 'blue'
    if r>220 and g>140 and b<150: return 'yellow'
    if g>r+40 and g>b+40: return 'green'
    if r>150 and g<110: return 'red'
    if r<130 and g>140 and b>140: return 'teal'
    if r>150 and g>110 and b<130: return 'brown'
    return '?'
PIECE_CLS={'kk':'blue','ghostkk':'blue','sn':'green','ghost':'green','hh':'yellow','oh':'yellow','ride':'yellow','crash':'red','t1':'teal','t2':'gray','t3':'brown'}
def ids(c):
    n=c['num']
    if '(shuffle)' in n: return 's'+n.split()[0]
    if '(toms)' in n: return 'toms'+n.split()[0]
    if n.startswith('Break'): return 'break'+n.split()[1]
    if n=='27(2)': return 'p27b'
    return 'p'+n
out=[]
for c in B:
    iid=int(c['id']); g=geo[str(iid)]
    im=ImageOps.exif_transpose(Image.open(f'{SRC}/{iid}.png')).convert('RGB'); a=np.asarray(im).astype(int); H,W,_=a.shape
    lum=a.mean(2); mask=(lum<235)&(lum>70)&((a.max(2)-a.min(2))>15) | ((lum>100)&(lum<200)&((a.max(2)-a.min(2))<=15))
    mask[:int((g['ytop']+0.03)*H),:]=False; mask[:, int(0.88*W):]=False; mask[int(0.85*H):,:]=False
    lab,n=ndimage.label(mask); blobs=[]
    for k,sl in enumerate(ndimage.find_objects(lab),1):
        m=lab[sl]==k; ar=m.sum()
        if ar<120: continue
        ys,xs=np.nonzero(m); col=tuple(a[sl][m].mean(0).astype(int))
        blobs.append(dict(x=(xs.mean()+sl[1].start)/W, y=(ys.mean()+sl[0].start)/H, c=cls(col), r=max(sl[0].stop-sl[0].start, sl[1].stop-sl[1].start)/W/2))
    grid=c.get('grid',16); per=grid/4
    notes={k:v for k,v in c.items() if k in PIECE_CLS}
    marks={}; miss=[]
    for p,steps in notes.items():
        for s in steps:
            x=g['x1']+s/per*g['dx']
            cand=[b for b in blobs if (b['c']==PIECE_CLS[p] or (p in('hh','oh','ride','crash') and b['c'] in('yellow','red','brown'))) and abs(b['x']-x)<g['dx']/per*0.45]
            if cand:
                b=min(cand,key=lambda b:abs(b['x']-x)); marks[f'{p}:{s}']=[round(b['x'],4),round(b['y'],4),round(b['r'],4)]
            else:
                same=[v for kk,v in marks.items() if kk.split(':')[0] in (p, p.replace('ghost','') or 'sn')]
                ys=[b['y'] for b in blobs if b['c']==PIECE_CLS[p]]
                y=float(np.median(ys)) if ys else 0.6
                marks[f'{p}:{s}']=[round(x,4),round(y,4),0.02]; miss.append(f'{p}:{s}')
    rec=dict(id=ids(c), num=c['num'], title=c.get('title',''), grid=grid, img=f'assets/cartes/{ids(c)}.png', brk=bool(c.get('brk')), notes=notes, geo=g, marks=marks)
    out.append(rec)
    if miss: print(rec['id'],'no mark:',miss)
    im.save(f"/home/claude/bateria/assets/cartes/{rec['id']}.png", optimize=True)
json.dump(out,open('/home/claude/bateria/data/cartes.json','w'),ensure_ascii=False)
print(len(out))
