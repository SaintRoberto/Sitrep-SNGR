from pathlib import Path

import pymupdf


root = Path(__file__).resolve().parents[2]
source = root / "output" / "pdf" / "Reporte de estado de cuerpos hídricos.pdf"
output = root / "tmp" / "pdfs" / "water_report_output"
output.mkdir(parents=True, exist_ok=True)
document = pymupdf.open(source)
print(f"pages={document.page_count}")
for index, page in enumerate(document):
    print(f"page={index + 1} size={page.rect.width}x{page.rect.height}")
    page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False).save(output / f"page-{index + 1}.png")
