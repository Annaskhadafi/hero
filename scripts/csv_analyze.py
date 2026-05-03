import csv
depts, sections, levels = set(), set(), set()
rows = 0
with open(r'D:\[01] PROJECT\HERO\datahero.csv', encoding='utf-8-sig') as f:
    r = csv.reader(f, delimiter=';')
    header = next(r)
    for row in r:
        if len(row) < 20: continue
        rows += 1
        depts.add(row[9].strip())
        sections.add(row[13].strip())
        levels.add(row[15].strip())
print(f'Rows: {rows}')
print(f'Depts ({len(depts)}): {sorted(depts)}')
print(f'Sections ({len(sections)}): {sorted(sections)}')
print(f'Levels ({len(levels)}): {sorted(levels)}')
