import pdfplumber, sys

pdf = pdfplumber.open(r"D:\[01] PROJECT\HERO\Org. Chart Chitra Paratama Jan 2026.pdf")
print(f"Pages: {len(pdf.pages)}")
for i, page in enumerate(pdf.pages):
    text = page.extract_text()
    print(f"\n=== PAGE {i+1} ===")
    if text:
        print(text)
    else:
        print("[No text extracted]")

    # Also try table extraction
    tables = page.extract_tables()
    if tables:
        for ti, table in enumerate(tables):
            print(f"\n  --- TABLE {ti+1} ---")
            for row in table:
                print(f"  | {' | '.join(str(c or '') for c in row)} |")
