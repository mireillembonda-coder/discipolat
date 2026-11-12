"""Génère le QR code Discipolat (QR seul, SVG, et carte à projeter).
Usage : python3 presentation/qr/make_qr.py [URL]"""
import sys, segno, io
from PIL import Image, ImageDraw, ImageFont
URL = sys.argv[1] if len(sys.argv) > 1 else 'https://discipolat-psi.vercel.app/'
OUT = 'presentation/qr/'
q = segno.make(URL, error='h')
q.save(OUT + 'discipolat-qr.svg', scale=20, border=2, dark='#22113D')
buf = io.BytesIO(); q.save(buf, kind='png', scale=40, border=2, dark='#22113D'); buf.seek(0)
S = 1100; qr = Image.open(buf).convert('RGB').resize((S, S), Image.NEAREST)
isz = int(S * 0.2); ic = Image.open('icons/icon-512.png').convert('RGBA').resize((isz, isz), Image.LANCZOS)
pad = Image.new('RGBA', (isz + 36, isz + 36), (255, 255, 255, 0)); m = Image.new('L', pad.size, 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, pad.size[0] - 1, pad.size[1] - 1], radius=60, fill=255)
pad.paste(Image.new('RGBA', pad.size, 'white'), (0, 0), m); pad.paste(ic, (18, 18), ic)
qr.paste(pad, ((S - pad.size[0]) // 2, (S - pad.size[1]) // 2), pad)
qr.save(OUT + 'discipolat-qr.png')
W, H = 1500, 2000; card = Image.new('RGB', (W, H), '#F6F1FF'); d = ImageDraw.Draw(card)
F = lambda w, s: ImageFont.truetype(f'/usr/share/fonts/opentype/inter/InterDisplay-{w}.otf', s)
d.rounded_rectangle([150, 330, 1350, 1530], radius=60, fill='white')
card.paste(qr.resize((1080, 1080), Image.LANCZOS), (210, 390))
def ctr(y, t, f, c): d.text(((W - d.textlength(t, font=f)) / 2, y), t, font=f, fill=c)
ctr(110, 'Discipolat', F('Bold', 120), '#22113D')
ctr(255, 'Le suivi des disciples · ICC Yaoundé', F('Medium', 46), '#8676A6')
ctr(1590, "Scannez pour ouvrir l'application", F('Bold', 60), '#6A2BD9')
ctr(1690, 'Puis, dans le menu du navigateur (les 3 points) :', F('Medium', 42), '#22113D')
ctr(1750, "« Ajouter à l'écran d'accueil »", F('Bold', 42), '#22113D')
ctr(1860, URL.replace('https://', '').rstrip('/'), F('Medium', 38), '#8676A6')
card.save(OUT + 'discipolat-qr-carte.png')
print('OK', URL)
