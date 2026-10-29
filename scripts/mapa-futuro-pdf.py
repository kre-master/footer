"""Gera o PDF "Footer - Mapa de futuro" a partir da nota do vault.

Normalmente corre sozinho no GitHub (.github/workflows/mapa-futuro-pdf.yml chama scripts/mapa-futuro-pdf.sh)
sempre que a nota muda,
ou no botao "Run workflow" do separador Actions.

Para correr na VM (precisa de reportlab e das fontes DejaVu):
    python3 -m venv ~/.venvs/footer-pdf && ~/.venvs/footer-pdf/bin/pip install reportlab
    ~/.venvs/footer-pdf/bin/python scripts/mapa-futuro-pdf.py

A nota e a fonte: cada "## " e uma folha nova; "<!-- roadmap -->" desenha a faixa de fases a partir
da tabela seguinte; "<!-- flags -->" desenha o seletor de idioma.
"""

import re
import sys
from pathlib import Path

try:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import mm
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.platypus import (
        BaseDocTemplate, CondPageBreak, Flowable, Frame, NextPageTemplate, PageBreak, PageTemplate,
        Paragraph, Spacer, Table, TableStyle,
    )
except ImportError:
    sys.exit("Falta o reportlab. Ver o topo deste ficheiro.")

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "Footer_vault" / "10 - Mapa de futuro e estrategia.md"
OUTPUT = ROOT / "Footer_vault" / "pdf" / "Footer - Mapa de futuro.pdf"

# DejaVu: tem acentos, cirilico (ucraniano) e setas. Linux (Debian/Ubuntu) ou macOS com Homebrew.
FONT_DIRS = [Path("/usr/share/fonts/truetype/dejavu"), Path("/opt/homebrew/share/fonts"), Path.home() / "Library/Fonts"]
FONT_DIR = next((folder for folder in FONT_DIRS if (folder / "DejaVuSans.ttf").exists()), None)
if FONT_DIR is None:
    sys.exit("Faltam as fontes DejaVu (Debian/Ubuntu: apt install fonts-dejavu-core).")
pdfmetrics.registerFont(TTFont("Body", str(FONT_DIR / "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("Body-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Mono", str(FONT_DIR / "DejaVuSansMono.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body", boldItalic="Body-Bold")

# Cores do tema Holofote.
NIGHT = colors.HexColor("#05080f")
NAVY = colors.HexColor("#0d1526")
ACCENT = colors.HexColor("#3b8cff")
ACCENT_SOFT = colors.HexColor("#e6f0ff")
INK = colors.HexColor("#141a26")
MUTED = colors.HexColor("#5b6578")
LINE = colors.HexColor("#d5dbe6")
ZEBRA = colors.HexColor("#f5f7fb")

STATUS_COLORS = {
    "Feito": (colors.HexColor("#d9f5e3"), colors.HexColor("#17663a")),
    "Em curso": (colors.HexColor("#3b8cff"), colors.white),
    "Próximo": (colors.HexColor("#fff1cc"), colors.HexColor("#7a5600")),
    "A pensar": (colors.HexColor("#ece6ff"), colors.HexColor("#4b3a8f")),
    "Ideia": (colors.HexColor("#eef0f4"), colors.HexColor("#4a5263")),
    "Alto": (colors.HexColor("#ffe0e0"), colors.HexColor("#9b1c1c")),
    "Alta": (colors.HexColor("#ffe0e0"), colors.HexColor("#9b1c1c")),
    "Médio": (colors.HexColor("#fff1cc"), colors.HexColor("#7a5600")),
    "Média": (colors.HexColor("#fff1cc"), colors.HexColor("#7a5600")),
    "Baixa": (colors.HexColor("#d9f5e3"), colors.HexColor("#17663a")),
}

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

styles = {
    "body": ParagraphStyle("body", fontName="Body", fontSize=9.4, leading=12.8, textColor=INK, spaceAfter=4),
    "small": ParagraphStyle("small", fontName="Body", fontSize=8.2, leading=10.2, textColor=INK),
    "small_head": ParagraphStyle("small_head", fontName="Body-Bold", fontSize=8.2, leading=10.8, textColor=colors.white),
    "bullet": ParagraphStyle("bullet", fontName="Body", fontSize=9.4, leading=12.6, textColor=INK,
                             leftIndent=13, bulletIndent=3, spaceAfter=3),
    "sheet": ParagraphStyle("sheet", fontName="Body-Bold", fontSize=20, leading=24, textColor=INK, spaceAfter=10),
    "h3": ParagraphStyle("h3", fontName="Body-Bold", fontSize=12.5, leading=16, textColor=ACCENT,
                         spaceBefore=10, spaceAfter=6),
    "h4": ParagraphStyle("h4", fontName="Body-Bold", fontSize=10.5, leading=14, textColor=INK, spaceBefore=6, spaceAfter=4),
    "callout": ParagraphStyle("callout", fontName="Body", fontSize=10, leading=14.5, textColor=INK),
    "cover_title": ParagraphStyle("cover_title", fontName="Body-Bold", fontSize=34, leading=40, textColor=colors.white),
    "cover_text": ParagraphStyle("cover_text", fontName="Body", fontSize=10.5, leading=15, textColor=colors.HexColor("#c9d4e8")),
    "cover_index": ParagraphStyle("cover_index", fontName="Body", fontSize=9.5, leading=14, textColor=colors.white),
}


def inline(text):
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"\[\[([^\]|]+)(\|[^\]]+)?\]\]", r"\1", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font face="Mono" size="8.6">\1</font>', text)
    return text


# ---------- Desenhos ----------

class RoadmapStrip(Flowable):
    """Faixa de fases com o estado de cada uma e a marca "estas aqui"."""

    def __init__(self, rows):
        super().__init__()
        self.rows = rows
        self.height = 34 * mm

    def wrap(self, avail_w, avail_h):
        self.width = avail_w
        return avail_w, self.height

    def draw(self):
        c = self.canv
        gap = 2.2 * mm
        box_w = (self.width - gap * (len(self.rows) - 1)) / len(self.rows)
        box_h = 22 * mm
        for index, (number, name, status) in enumerate(self.rows):
            x = index * (box_w + gap)
            fill, ink = STATUS_COLORS.get(status, (ZEBRA, INK))
            c.setFillColor(fill)
            c.roundRect(x, 0, box_w, box_h, 3 * mm, stroke=0, fill=1)
            c.setFillColor(ink)
            c.setFont("Body-Bold", 15)
            c.drawString(x + 3 * mm, box_h - 7.5 * mm, number)
            c.setFont("Body", 6.4)
            for line_index, line in enumerate(wrap_words(name, 17)[:3]):
                c.drawString(x + 3 * mm, box_h - 11.6 * mm - line_index * 2.9 * mm, line)
            if status == "Em curso":
                c.setFillColor(ACCENT)
                c.setFont("Body-Bold", 7)
                c.drawCentredString(x + box_w / 2, box_h + 6.5 * mm, "ESTÁS AQUI")
                path = c.beginPath()
                path.moveTo(x + box_w / 2 - 2 * mm, box_h + 5 * mm)
                path.lineTo(x + box_w / 2 + 2 * mm, box_h + 5 * mm)
                path.lineTo(x + box_w / 2, box_h + 1.5 * mm)
                path.close()
                c.drawPath(path, stroke=0, fill=1)


def wrap_words(text, width):
    lines, current = [], ""
    for word in text.split():
        if current and len(current) + 1 + len(word) > width:
            lines.append(current)
            current = word
        else:
            current = f"{current} {word}".strip()
    if current:
        lines.append(current)
    return lines


def draw_flag(c, code, x, y, w, h):
    c.saveState()
    clip = c.beginPath()
    clip.rect(x, y, w, h)
    c.clipPath(clip, stroke=0, fill=0)

    def band(fill, bx, by, bw, bh):
        c.setFillColor(colors.HexColor(fill))
        c.rect(bx, by, bw, bh, stroke=0, fill=1)

    if code == "PT":
        band("#006600", x, y, w * 0.4, h)
        band("#ff0000", x + w * 0.4, y, w * 0.6, h)
        c.setFillColor(colors.HexColor("#ffcc00"))
        c.circle(x + w * 0.4, y + h / 2, h * 0.24, stroke=0, fill=1)
    elif code == "BR":
        band("#009c3b", x, y, w, h)
        c.setFillColor(colors.HexColor("#ffdf00"))
        p = c.beginPath()
        p.moveTo(x + w * 0.08, y + h / 2)
        p.lineTo(x + w / 2, y + h * 0.9)
        p.lineTo(x + w * 0.92, y + h / 2)
        p.lineTo(x + w / 2, y + h * 0.1)
        p.close()
        c.drawPath(p, stroke=0, fill=1)
        c.setFillColor(colors.HexColor("#002776"))
        c.circle(x + w / 2, y + h / 2, h * 0.22, stroke=0, fill=1)
    elif code == "GB":
        band("#012169", x, y, w, h)
        c.setStrokeColor(colors.white)
        c.setLineWidth(h * 0.2)
        c.line(x, y, x + w, y + h)
        c.line(x, y + h, x + w, y)
        c.setStrokeColor(colors.HexColor("#c8102e"))
        c.setLineWidth(h * 0.07)
        c.line(x, y, x + w, y + h)
        c.line(x, y + h, x + w, y)
        band("#ffffff", x + w / 2 - h * 0.17, y, h * 0.34, h)
        band("#ffffff", x, y + h / 2 - h * 0.17, w, h * 0.34)
        band("#c8102e", x + w / 2 - h * 0.1, y, h * 0.2, h)
        band("#c8102e", x, y + h / 2 - h * 0.1, w, h * 0.2)
    elif code == "ES":
        band("#aa151b", x, y, w, h)
        band("#f1bf00", x, y + h * 0.25, w, h * 0.5)
    elif code == "FR":
        band("#002395", x, y, w / 3, h)
        band("#ffffff", x + w / 3, y, w / 3, h)
        band("#ed2939", x + 2 * w / 3, y, w / 3, h)
    elif code == "DE":
        band("#ffce00", x, y, w, h / 3)
        band("#dd0000", x, y + h / 3, w, h / 3)
        band("#000000", x, y + 2 * h / 3, w, h / 3)
    elif code == "UA":
        band("#ffd500", x, y, w, h / 2)
        band("#005bbb", x, y + h / 2, w, h / 2)
    elif code == "PL":
        band("#dc143c", x, y, w, h / 2)
        band("#ffffff", x, y + h / 2, w, h / 2)
    elif code == "IT":
        band("#009246", x, y, w / 3, h)
        band("#ffffff", x + w / 3, y, w / 3, h)
        band("#ce2b37", x + 2 * w / 3, y, w / 3, h)
    c.restoreState()
    c.setStrokeColor(LINE)
    c.setLineWidth(0.4)
    c.rect(x, y, w, h, stroke=1, fill=0)


LANGUAGES = [
    ("PT", "Português (Portugal)", "pt-PT"),
    ("BR", "Português (Brasil)", "pt-BR"),
    ("GB", "English", "en"),
    ("ES", "Español", "es"),
    ("FR", "Français", "fr"),
    ("DE", "Deutsch", "de"),
    ("UA", "Українська", "uk"),
    ("PL", "Polski", "pl"),
    ("IT", "Italiano", "it"),
]


class LanguagePicker(Flowable):
    """Maqueta do seletor de idioma no tema escuro da app."""

    row_h = 7.4 * mm

    def wrap(self, avail_w, avail_h):
        self.width = min(avail_w, 92 * mm)
        self.height = self.row_h * len(LANGUAGES) + 16 * mm
        return self.width, self.height

    def draw(self):
        c = self.canv
        c.setFillColor(NAVY)
        c.roundRect(0, 0, self.width, self.height, 4 * mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont("Body-Bold", 9.5)
        c.drawString(5 * mm, self.height - 8 * mm, "Idioma")
        c.setFillColor(colors.HexColor("#8fa3c4"))
        c.setFont("Body", 7)
        c.drawRightString(self.width - 5 * mm, self.height - 8 * mm, "detectado: Português (Portugal)")
        for index, (flag, name, code) in enumerate(LANGUAGES):
            y = self.height - 13 * mm - (index + 1) * self.row_h
            if index == 0:
                c.setFillColor(colors.HexColor("#1b2c4d"))
                c.roundRect(2.5 * mm, y + 0.6 * mm, self.width - 5 * mm, self.row_h - 1.2 * mm, 2 * mm, stroke=0, fill=1)
            draw_flag(c, flag, 5 * mm, y + 1.9 * mm, 6 * mm, 4 * mm)
            c.setFillColor(colors.white)
            c.setFont("Body", 8.6)
            c.drawString(14 * mm, y + 2.6 * mm, name)
            c.setFillColor(colors.HexColor("#8fa3c4"))
            c.setFont("Mono", 7.2)
            label = code + ("  ✓" if index == 0 else "")
            c.drawRightString(self.width - 5 * mm, y + 2.6 * mm, label)


# ---------- Leitura da nota ----------

def parse(markdown):
    lines = markdown.splitlines()
    title = lines[0].lstrip("# ").strip()
    intro, sheets, current = [], [], None
    for line in lines[1:]:
        if line.startswith("## "):
            current = {"title": line[3:].strip(), "lines": []}
            sheets.append(current)
        elif current is None:
            intro.append(line)
        else:
            current["lines"].append(line)
    return title, intro, sheets


def split_row(line):
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def build_table(rows):
    header, body = rows[0], rows[1:]
    columns = len(header)
    # Cada coluna tem pelo menos a largura da palavra mais comprida; o resto reparte-se pelo texto.
    minimum, weights = [], []
    for col in range(columns):
        cells = [row[col] if col < len(row) else "" for row in rows]
        words = [word for cell in cells for word in re.sub(r"[*`]", "", cell).split()] or [""]
        minimum.append(max(pdfmetrics.stringWidth(word, "Body-Bold", 8.2) for word in words) + 12)
        weights.append(min(max(max(len(cell) for cell in cells), 4), 70))
    spare = max(CONTENT_W - sum(minimum), 0)
    widths = [minimum[col] + spare * weights[col] / sum(weights) for col in range(columns)]
    if sum(widths) > CONTENT_W:
        widths = [width * CONTENT_W / sum(widths) for width in widths]

    data = [[Paragraph(inline(cell), styles["small_head"]) for cell in header]]
    commands = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 2.6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.6),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]
    for r, row in enumerate(body, start=1):
        cells = []
        for col in range(columns):
            text = row[col] if col < len(row) else ""
            status = STATUS_COLORS.get(text)
            if status:
                style = ParagraphStyle(f"st{r}{col}", parent=styles["small"], fontName="Body-Bold", textColor=status[1])
                commands.append(("BACKGROUND", (col, r), (col, r), status[0]))
                cells.append(Paragraph(inline(text), style))
            else:
                cells.append(Paragraph(inline(text), styles["small"]))
        data.append(cells)
        if r % 2 == 0:
            commands.append(("BACKGROUND", (0, r), (-1, r), ZEBRA))
            # O fundo do estado tem de ficar por cima da zebra.
            for col in range(columns):
                status = STATUS_COLORS.get(row[col] if col < len(row) else "")
                if status:
                    commands.append(("BACKGROUND", (col, r), (col, r), status[0]))
        if "Em curso" in row:
            commands.append(("BOX", (0, r), (-1, r), 1.2, ACCENT))
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle(commands))
    return table


def callout(text):
    table = Table([[Paragraph(inline(text), styles["callout"])]], colWidths=[CONTENT_W])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ACCENT_SOFT),
        ("LINEBEFORE", (0, 0), (0, -1), 3, ACCENT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def render_lines(lines):
    story, paragraph, table_rows = [], [], []
    pending_roadmap = False
    index = 0

    def flush_paragraph():
        if paragraph:
            story.append(Paragraph(inline(" ".join(paragraph)), styles["body"]))
            paragraph.clear()

    def flush_table():
        nonlocal pending_roadmap
        if not table_rows:
            return
        rows = [row for row in table_rows if not all(re.fullmatch(r":?-{3,}:?", cell) for cell in row)]
        if pending_roadmap:
            story.append(RoadmapStrip([(row[0], row[1], row[2]) for row in rows[1:]]))
            story.append(Spacer(1, 5 * mm))
            pending_roadmap = False
        story.append(build_table(rows))
        story.append(Spacer(1, 4 * mm))
        table_rows.clear()

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if stripped.startswith("|"):
            flush_paragraph()
            table_rows.append(split_row(stripped))
            index += 1
            continue
        flush_table()
        if not stripped:
            flush_paragraph()
        elif stripped == "<!-- roadmap -->":
            flush_paragraph()
            pending_roadmap = True
        elif stripped == "<!-- flags -->":
            flush_paragraph()
            story.append(LanguagePicker())
            story.append(Spacer(1, 4 * mm))
        elif stripped.startswith("#### "):
            flush_paragraph()
            story.append(Paragraph(inline(stripped[5:]), styles["h4"]))
        elif stripped.startswith("### "):
            flush_paragraph()
            story.append(CondPageBreak(30 * mm))
            story.append(Paragraph(inline(stripped[4:]), styles["h3"]))
        elif stripped.startswith("> "):
            flush_paragraph()
            story.append(callout(stripped[2:]))
            story.append(Spacer(1, 4 * mm))
        elif re.match(r"^- ", stripped):
            flush_paragraph()
            story.append(Paragraph(inline(stripped[2:]), styles["bullet"], bulletText="•"))
        elif re.match(r"^\d+\. ", stripped):
            flush_paragraph()
            number, text = stripped.split(". ", 1)
            story.append(Paragraph(inline(text), styles["bullet"], bulletText=f"{number}."))
        else:
            paragraph.append(stripped)
        index += 1
    flush_paragraph()
    flush_table()
    return story


# ---------- Paginas ----------

def build(markdown, output):
    title, intro, sheets = parse(markdown)
    version_line = next((line for line in intro if line.startswith("Documento vivo")), "")

    def draw_cover(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NIGHT)
        canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        # Luz de projector, como no tema da app.
        for radius, alpha in ((170 * mm, 0.05), (120 * mm, 0.07), (70 * mm, 0.09)):
            canvas.setFillColor(colors.Color(0.23, 0.55, 1, alpha=alpha))
            canvas.circle(PAGE_W * 0.82, PAGE_H * 0.92, radius, stroke=0, fill=1)
        canvas.setFillColor(ACCENT)
        canvas.rect(MARGIN, PAGE_H - 46 * mm, 26 * mm, 2.2 * mm, stroke=0, fill=1)
        canvas.restoreState()

    def draw_sheet(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NAVY)
        canvas.rect(0, PAGE_H - 12 * mm, PAGE_W, 12 * mm, stroke=0, fill=1)
        canvas.setFillColor(ACCENT)
        canvas.rect(0, PAGE_H - 12.8 * mm, PAGE_W, 0.8 * mm, stroke=0, fill=1)
        canvas.setFillColor(colors.white)
        canvas.setFont("Body-Bold", 8.5)
        canvas.drawString(MARGIN, PAGE_H - 7.6 * mm, "FOOTER")
        canvas.setFont("Body", 8.5)
        canvas.drawString(MARGIN + 17 * mm, PAGE_H - 7.6 * mm, "Mapa de futuro e estratégia")
        canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 7.6 * mm, getattr(doc, "current_sheet", ""))
        canvas.setFillColor(MUTED)
        canvas.setFont("Body", 7.5)
        canvas.drawString(MARGIN, 9 * mm, version_line)
        canvas.drawRightString(PAGE_W - MARGIN, 9 * mm, f"{doc.page}")
        canvas.restoreState()

    class Doc(BaseDocTemplate):
        def afterFlowable(self, flowable):
            # O marcador vem antes da quebra de pagina, para o cabecalho da folha nova ja ter o nome certo.
            upcoming = getattr(flowable, "_next_sheet", None)
            if upcoming:
                self.current_sheet = upcoming.split(" — ")[0]
            sheet = getattr(flowable, "_sheet_title", None)
            if sheet:
                key = f"sheet{len(self.seen_sheets)}"
                self.seen_sheets.append(sheet)
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(sheet, key, level=0)

    # invariant: o mesmo texto gera sempre o mesmo ficheiro (sem data nem id aleatorio).
    doc = Doc(str(output), pagesize=A4, title=title, author="Footer", invariant=1,
              leftMargin=MARGIN, rightMargin=MARGIN, topMargin=20 * mm, bottomMargin=16 * mm)
    doc.seen_sheets = []
    doc.current_sheet = ""
    cover_frame = Frame(MARGIN, MARGIN, CONTENT_W, PAGE_H - 2 * MARGIN, id="cover")
    sheet_frame = Frame(MARGIN, 16 * mm, CONTENT_W, PAGE_H - 36 * mm, id="sheet")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover),
        PageTemplate(id="sheet", frames=[sheet_frame], onPage=draw_sheet),
    ])

    story = [Spacer(1, 40 * mm), Paragraph(inline(title).replace(" — ", "<br/>"), styles["cover_title"]), Spacer(1, 8 * mm)]
    for line in intro:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("> "):
            box = Table([[Paragraph(inline(stripped[2:]), ParagraphStyle(
                "cover_callout", parent=styles["cover_text"], textColor=colors.white))]], colWidths=[CONTENT_W])
            box.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#122340")),
                ("LINEBEFORE", (0, 0), (0, -1), 3, ACCENT),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ]))
            story += [Spacer(1, 4 * mm), box, Spacer(1, 4 * mm)]
        else:
            story.append(Paragraph(inline(stripped), styles["cover_text"]))
            story.append(Spacer(1, 2 * mm))
    story.append(Spacer(1, 8 * mm))
    story.append(Paragraph("<b>FOLHAS</b>", ParagraphStyle("idx_head", parent=styles["cover_index"], textColor=ACCENT)))
    story.append(Spacer(1, 2 * mm))
    half = (len(sheets) + 1) // 2
    index_rows = []
    for row in range(half):
        cells = []
        for col in (row, row + half):
            cells.append(Paragraph(inline(sheets[col]["title"]), styles["cover_index"]) if col < len(sheets) else "")
        index_rows.append(cells)
    index_table = Table(index_rows, colWidths=[CONTENT_W / 2] * 2)
    index_table.setStyle(TableStyle([("LEFTPADDING", (0, 0), (-1, -1), 0), ("TOPPADDING", (0, 0), (-1, -1), 1)]))
    story.append(index_table)
    story.append(NextPageTemplate("sheet"))

    for sheet in sheets:
        marker = Spacer(0, 0)
        marker._next_sheet = sheet["title"]
        story.append(marker)
        story.append(PageBreak())
        heading = Paragraph(inline(sheet["title"]), styles["sheet"])
        heading._sheet_title = sheet["title"]
        story.append(heading)
        story += render_lines(sheet["lines"])

    output.parent.mkdir(parents=True, exist_ok=True)
    doc.build(story)
    return len(sheets)


if __name__ == "__main__":
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else OUTPUT
    count = build(SOURCE.read_text(encoding="utf-8"), out)
    print(f"PDF com {count} folhas: {out}")
