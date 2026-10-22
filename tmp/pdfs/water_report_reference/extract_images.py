from pathlib import Path

import pymupdf


source = Path(r"C:\Users\administrator\Desktop\Infografia\Reporte de estado de cuerpos hídricos 22102026 07h00.pdf")
output = Path(__file__).resolve().parent / "images"
output.mkdir(exist_ok=True)
document = pymupdf.open(source)
seen = set()
for page_index, page in enumerate(document):
    for image_index, image in enumerate(page.get_images(full=True)):
        xref = image[0]
        if xref in seen:
            continue
        seen.add(xref)
        payload = document.extract_image(xref)
        path = output / f"xref-{xref}-{payload['width']}x{payload['height']}.{payload['ext']}"
        path.write_bytes(payload["image"])
        print(f"page={page_index + 1} xref={xref} size={payload['width']}x{payload['height']} path={path}")
        smask = image[1]
        if smask:
            base = pymupdf.Pixmap(document, xref)
            if base.alpha:
                base = pymupdf.Pixmap(base, 0)
            mask = pymupdf.Pixmap(document, smask)
            composed = pymupdf.Pixmap(base, mask)
            alpha_path = output / f"xref-{xref}-{payload['width']}x{payload['height']}-alpha.png"
            composed.save(alpha_path)
            print(f"page={page_index + 1} xref={xref} smask={smask} alpha_path={alpha_path}")
