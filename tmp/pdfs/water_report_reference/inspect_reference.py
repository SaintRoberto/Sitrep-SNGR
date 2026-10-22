from pathlib import Path

import pymupdf


source = Path(r"C:\Users\administrator\Desktop\Infografia\Reporte de estado de cuerpos hídricos 22102026 07h00.pdf")
output = Path(__file__).resolve().parent
document = pymupdf.open(source)
texts = []
print(f"pages {document.page_count}")
for index, page in enumerate(document):
    print(
        f"page {index + 1} size {page.rect.width}x{page.rect.height} "
        f"images {len(page.get_images(full=True))} drawings {len(page.get_drawings())}"
    )
    texts.append(f"\n===== PAGE {index + 1} =====\n{page.get_text('text')}")
    page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False).save(output / f"page-{index + 1}.png")

(output / "reference.txt").write_text("".join(texts), encoding="utf-8")
