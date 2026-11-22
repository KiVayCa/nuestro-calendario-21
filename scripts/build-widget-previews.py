"""Generate picker previews from the widget layouts, using only fictional examples.

Run from the repository root with Python 3 and Pillow when previews change.
The PNGs are the fallback for launchers that do not support previewLayout.
"""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageFont

res = Path('android/app/src/main/res')
palette = json.loads(Path('android/app/src/main/assets/widget-themes.json').read_text())['romance']
ns = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ns)
def attr(name): return '{' + ns + '}' + name
def put(node, **attrs):
    for key, value in attrs.items(): node.set(attr(key), str(value))
def node(parent, tag, **attrs):
    child = ET.SubElement(parent, tag)
    put(child, **attrs)
    return child

# layout, indicative size, heading, title, body
specs = {
    'next_plan': ('widget', 250, 160, 'NUESTRO PRÓXIMO CAPÍTULO ♡', 'Cena juntos', 'Mañana · 19:00'),
    'countdown': ('widget', 250, 160, 'JUNTOS, HACIA ESE DÍA ♡', '12 días', 'Para nuestro viaje · 21/12/2028'),
    'month': ('widget_month', 250, 390, 'NUESTRO MES ♡', 'Junio 2028', '3 días con eventos'),
    'relationship': ('widget_relationship', 250, 180, 'DOS FECHAS, UNA HISTORIA ♡', 'Cada día, tú y yo', 'Desde 21 ene · Novios desde 21 abr'),
    'week': ('widget_week', 250, 230, 'LOS PRÓXIMOS SIETE DÍAS ♡', '3 planes', 'Hoy · 19:00 Cena\nVie 5 · Cine\nDom 7 · Paseo'),
    'today': ('widget_week', 250, 230, 'NUESTRO DÍA ♡', '2 eventos hoy', '10:00 · Desayuno\n19:00 · Cena juntos'),
    'important_date': ('widget', 250, 160, 'NUESTRA PRÓXIMA FECHA ♡', '7 días', 'Aniversario · 21 jun 2028'),
    'monthly_summary': ('widget', 250, 160, 'ASÍ VA NUESTRO MES ♡', '5 realizados', '3 pendientes · 8 planes en junio'),
}
events = {5: 'Cena', 14: 'Cine', 21: 'Día ♡'}
grid = [list(range(29, 32)) + [1, 2, 3, 4], list(range(5, 12)), list(range(12, 19)), list(range(19, 26)), list(range(26, 31)) + [1, 2], list(range(3, 10))]

def calendar_preview(parent):
    header = node(parent, 'LinearLayout', layout_width='match_parent', layout_height='20dp', orientation='horizontal')
    for day in 'LMXJVSD':
        node(header, 'TextView', layout_width='0dp', layout_weight='1', layout_height='match_parent', text=day, gravity='center', textSize='11sp', textColor=palette['ink'])
    for row, days in enumerate(grid):
        line = node(parent, 'LinearLayout', layout_width='match_parent', layout_height='0dp', layout_weight='1', orientation='horizontal')
        for col, day in enumerate(days):
            active = not (row == 0 and col < 3 or row == 4 and col >= 5 or row == 5)
            cell = node(line, 'LinearLayout', layout_width='0dp', layout_weight='1', layout_height='match_parent', orientation='vertical', padding='1dp')
            if active and day == 14: put(cell, background='@drawable/widget_today_romance')
            node(cell, 'TextView', layout_width='match_parent', layout_height='wrap_content', gravity='center', text=str(day), textSize='11sp', textColor=palette['ink'] if active else palette['muted'])
            if active and day in events:
                node(cell, 'TextView', layout_width='match_parent', layout_height='wrap_content', text=events[day], textSize='8sp', maxLines='1', gravity='center', background='@drawable/widget_event_romance', textColor=palette['ink'])

def xml_preview(key, spec):
    layout, _, height, heading, title, body = spec
    root = ET.parse(res / 'layout' / (layout + '.xml')).getroot()
    put(root, background='@drawable/widget_theme_romance', paddingLeft='18dp', paddingRight='18dp', paddingTop='10dp', paddingBottom='6dp')
    by_id = {child.get(attr('id'), '').split('/')[-1]: child for child in root.iter()}
    for child in root.iter('TextView'): put(child, textColor=palette['ink'])
    for field, value in [('heading', heading), ('title', title), ('detail', body), ('updated', 'Ejemplo · vista previa')]:
        put(by_id['widget_' + field], text=value)
    put(by_id['widget_updated'], textColor=palette['widgetMuted'])
    if key == 'month':
        put(by_id['widget_detail'], visibility='gone')
        put(by_id['calendar_agenda'], text='Mié 14 · Cine', textColor=palette['ink'])
        calendar_preview(by_id['calendar_grid'])
    elif key == 'relationship':
        put(by_id['widget_title'], textSize='18sp')
        put(by_id['together_number'], text='300', textSize='38sp')
        put(by_id['dating_number'], text='210', textSize='38sp')
        put(by_id['widget_detail'], visibility='gone')
    else:
        put(by_id['widget_title'], textSize='28sp' if key not in ('countdown', 'important_date') else '38sp')
        if layout == 'widget_week': put(by_id['widget_detail'], maxLines='5', textSize='15sp')
    ET.indent(root)
    ET.ElementTree(root).write(res / 'layout' / ('preview_' + key + '.xml'), encoding='utf-8', xml_declaration=True)
    provider_file = res / 'xml' / (key + '_widget.xml')
    if provider_file.exists(): provider = ET.parse(provider_file).getroot()
    else:
        provider = ET.Element('appwidget-provider')
        put(provider, minWidth='250dp', minHeight=f'{height}dp', minResizeWidth='160dp', minResizeHeight='180dp' if layout == 'widget_week' else '130dp', targetCellWidth='4', targetCellHeight='3' if layout == 'widget_week' else '2', updatePeriodMillis='1800000', initialLayout='@layout/' + layout, resizeMode='horizontal|vertical', widgetCategory='home_screen')
    put(provider, previewLayout='@layout/preview_' + key, previewImage='@drawable/preview_' + key)
    ET.ElementTree(provider).write(provider_file, encoding='utf-8', xml_declaration=True)

def png_preview(key, spec):
    layout, _, height, heading, title, body = spec
    w, h = 600, height * 2
    img = Image.new('RGBA', (w, h))
    draw = ImageDraw.Draw(img)
    ink, bg = palette['ink'], palette['widgetBackground']
    draw.rounded_rectangle((1, 1, w-2, h-2), radius=48, fill=bg, outline=palette['line'], width=2)
    def text(x, y, value, size, bold=False, anchor='la', color=ink):
        font = ImageFont.truetype('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf', size)
        draw.text((x, y), value, font=font, fill=color, anchor=anchor)
    text(34, 20, heading, 21, True)
    if key == 'month':
        text(34, 60, '‹', 48, True)
        text(w/2, 66, title, 40, True, 'ma')
        text(w-34, 60, '›', 48, True, 'ra')
        cw = (w-68)/7
        for col, day in enumerate('LMXJVSD'): text(34+cw*(col+.5), 130, day, 22, True, 'ma')
        for row, days in enumerate(grid):
            for col, day in enumerate(days):
                x, y = 34+cw*col, 165+row*76
                active = not (row == 0 and col < 3 or row == 4 and col >= 5 or row == 5)
                if active and day == 14: draw.rounded_rectangle((x+2,y,x+cw-2,y+70),radius=8,fill=palette['soft'],outline=palette['rose'],width=3)
                text(x+cw/2,y+6,str(day),22,False,'ma',ink if active else palette['muted'])
                if active and day in events:
                    draw.rounded_rectangle((x+2,y+33,x+cw-2,y+60),radius=7,fill=palette['soft'])
                    text(x+cw/2,y+36,events[day],14,False,'ma')
        text(34,h-102,'Mié 14 · Cine',23)
    elif key == 'relationship':
        text(34, 56, title, 32, True)
        for x, number, label in [(w/4,'300','días juntos ♡'),(w*3/4,'210','días de novios ♡')]:
            text(x, 99, number, 76, True, 'ma')
            text(x, 196, label, 24, False, 'ma')
    else:
        text(34, 61, title, 56 if key not in ('countdown','important_date') else 74, True)
        for i, line in enumerate(body.split('\n')):
            text(34, (151 if layout == 'widget' else 145)+i*42, line, 26)
    text(34,h-60,'Ejemplo · vista previa',21,color=palette['widgetMuted'])
    text(w-110,h-77,'↻',43,anchor='ma')
    text(w-45,h-77,'⚙',40,anchor='ma')
    img.save(res / 'drawable-nodpi' / ('preview_' + key + '.png'), optimize=True)

(res / 'drawable-nodpi').mkdir(exist_ok=True)
for key, spec in specs.items():
    xml_preview(key, spec)
    png_preview(key, spec)
