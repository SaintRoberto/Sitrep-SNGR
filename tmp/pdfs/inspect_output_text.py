from pathlib import Path

import pymupdf


source = Path(__file__).resolve().parents[2] / "output" / "pdf" / "Reporte de estado de cuerpos hídricos.pdf"
document = pymupdf.open(source)
for index, page in enumerate(document):
    print(f"\nPAGE {index + 1}")
    for block in page.get_text("blocks"):
        text = block[4].replace("\n", " | ")
        print(tuple(round(value, 1) for value in block[:4]), text[:180])
