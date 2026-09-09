from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path('/Users/hebertribeiro/laudo')
SRC = ROOT / 'tutorial-assets' / 'screenshots'
OUT = ROOT / 'tutorial-assets' / 'scenes'
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1920, 1080
GREEN = '#064e2a'
MINT = '#10b981'
INK = '#10231a'
MUTED = '#617068'
WHITE = '#ffffff'
PALE = '#eef8f2'

FONT = '/System/Library/Fonts/SFNS.ttf'
FONT_BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT, size)

def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

def cover(img, box):
    w, h = box
    ratio = min(w / img.width, h / img.height)
    resized = img.resize((int(img.width * ratio), int(img.height * ratio)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (w, h), '#ffffff')
    canvas.paste(resized, ((w - resized.width)//2, (h - resized.height)//2))
    return canvas

def backdrop():
    im = Image.new('RGB', (W, H), '#f3f7f5')
    d = ImageDraw.Draw(im)
    d.ellipse((1320, -300, 2200, 580), fill='#d8f4e5')
    d.ellipse((-430, 760, 390, 1580), fill='#e1f5ea')
    for x in range(0, W, 80):
        d.line((x, 0, x, H), fill='#e8efeb', width=1)
    for y in range(0, H, 80):
        d.line((0, y, W, y), fill='#e8efeb', width=1)
    return im

def brand(draw, step=None):
    rounded(draw, (66, 48, 354, 98), 25, GREEN)
    draw.text((91, 61), 'SOLUBIO ON FARM', font=font(23, True), fill=WHITE)
    if step:
        rounded(draw, (1655, 48, 1852, 98), 25, '#dff7ea')
        draw.text((1687, 62), step, font=font(22, True), fill=GREEN)

def screenshot_scene(name, title, subtitle, image_name, step, crop=None):
    im = backdrop()
    d = ImageDraw.Draw(im)
    brand(d, step)
    d.text((78, 135), title, font=font(48, True), fill=INK)
    d.text((80, 198), subtitle, font=font(26), fill=MUTED)

    shadow = Image.new('RGBA', (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    rounded(sd, (77, 278, 1843, 935), 26, (0,0,0,75))
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    im = Image.alpha_composite(im.convert('RGBA'), shadow)
    d = ImageDraw.Draw(im)
    rounded(d, (68, 268, 1852, 943), 24, WHITE, '#cbdad2', 2)

    shot = Image.open(SRC / image_name).convert('RGB')
    if crop:
        shot = shot.crop(crop)
    shot = cover(shot, (1740, 631))
    im.paste(shot, (90, 290))

    rounded(d, (80, 969, 1840, 1040), 22, GREEN)
    d.text((118, 987), subtitle, font=font(27, True), fill=WHITE)
    im.convert('RGB').save(OUT / name, quality=96)

def title_scene(name, title, subtitle, closing=False):
    im = Image.new('RGB', (W, H), GREEN)
    d = ImageDraw.Draw(im)
    d.ellipse((1240, -300, 2200, 660), fill='#0d6b3c')
    d.ellipse((-480, 660, 480, 1620), fill='#085d34')
    for x in range(0, W, 96):
        d.line((x, 0, x, H), fill='#0b5a35', width=1)
    for y in range(0, H, 96):
        d.line((0, y, W, y), fill='#0b5a35', width=1)
    rounded(d, (110, 104, 385, 166), 31, MINT)
    d.text((146, 119), 'SOLUBIO ON FARM', font=font(28, True), fill=WHITE)
    y = 352 if not closing else 374
    d.text((112, y), title, font=font(74, True), fill=WHITE)
    d.multiline_text((116, y+112), subtitle, font=font(34), fill='#c9f3db', spacing=14)
    if not closing:
        rounded(d, (116, 805, 662, 878), 36, '#ffffff')
        d.text((158, 823), 'GUIA RÁPIDO • CONSULTOR(A)', font=font(28, True), fill=GREEN)
    else:
        rounded(d, (116, 790, 1035, 878), 36, '#ffffff')
        d.text((157, 808), 'Dúvidas? Fale com a coordenação ou administração.', font=font(28, True), fill=GREEN)
    im.save(OUT / name, quality=96)

title_scene('00-abertura.png', 'Sistema de Laudos', 'Como preencher, gerar o PDF e consultar\nseus laudos com segurança.')
screenshot_scene('01-login.png', '1. Entre com seu acesso', 'Use o e-mail e a senha fornecidos pela administração.', '01-login.png', 'PASSO 1')
screenshot_scene('02-exemplo.png', '2. Comece um novo laudo', 'Preencha os campos ou use “Exemplo” como referência.', '02-exemplo.png', 'PASSO 2')
screenshot_scene('03-preenchimento.png', '3. Revise os dados técnicos', 'Confira amostra, produto, datas, pH, responsáveis e resultados.', '03-preenchimento.png', 'PASSO 3')
screenshot_scene('04-fotos.png', '4. Adicione as fotos', 'Selecione as imagens de microscopia em 40x e 100x.', '04-fotos.png', 'PASSO 4')
screenshot_scene('05-gerar.png', '5. Gere o laudo', 'Revise a folha A4 e clique em “Gerar Laudo” para abrir o PDF.', '05-gerar.png', 'PASSO 5')
screenshot_scene('06-repositorio.png', '6. Consulte seus laudos', 'Em “Laudos”, você pode editar, abrir o PDF ou excluir.', '06-repositorio.png', 'PASSO 6')

im = backdrop()
d = ImageDraw.Draw(im)
brand(d, 'RESULTADO')
d.text((78, 135), 'Seu laudo pronto', font=font(52, True), fill=INK)
d.text((80, 204), 'A visualização A4 mostra exatamente como o documento será apresentado.', font=font(27), fill=MUTED)
shot = Image.open(SRC / '07-laudo.png').convert('RGB')
ratio = min(720 / shot.width, 770 / shot.height)
shot = shot.resize((int(shot.width*ratio), int(shot.height*ratio)), Image.Resampling.LANCZOS)
shadow = Image.new('RGBA', (W,H), (0,0,0,0))
sd = ImageDraw.Draw(shadow)
rounded(sd, (125, 279, 125+shot.width+18, 279+shot.height+18), 24, (0,0,0,70))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
im = Image.alpha_composite(im.convert('RGBA'), shadow)
im.paste(shot, (116,270))
d = ImageDraw.Draw(im)
rounded(d, (1000, 350, 1790, 764), 30, WHITE, '#d3e1da', 2)
items = [
    ('✓', 'Dados atualizados em tempo real'),
    ('✓', 'PDF pronto para compartilhar'),
    ('✓', 'Fotos sincronizadas entre dispositivos'),
    ('✓', 'Acesso conforme a função da pessoa'),
]
y = 405
for icon, text in items:
    rounded(d, (1052, y, 1106, y+54), 27, '#dff7ea')
    d.text((1066, y+8), icon, font=font(30, True), fill=GREEN)
    d.text((1132, y+10), text, font=font(29, True), fill=INK)
    y += 82
im.convert('RGB').save(OUT / '07-resultado.png', quality=96)

title_scene('08-encerramento.png', 'Pronto para começar!', 'Preencha com atenção, confira a prévia\ne mantenha a internet ativa para sincronizar.', closing=True)

print(OUT)
