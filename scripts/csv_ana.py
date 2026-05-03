import csv
depts, sections, jobLevels, locations = set(), set(), set(), set()
rows = 0
with open(r'D:\[01] PROJECT\HERO\datahero.csv', encoding='utf-8-sig') as f:
    r = csv.reader(f, delimiter=';')
    header = next(r)
    print('Header:', [(i, h.strip()) for i, h in enumerate(header)])
    for row in r:
        if len(row) < 25: continue
        rows += 1
        depts.add(row[12].strip())    # col M
        sections.add(row[13].strip())  # col N
        jobLevels.add(row[15].strip()) # col P
        locations.add(row[25].strip()) # col Z
print(f'\nRows: {rows}')
print(f'Depts ({len(depts)}):')
for d in sorted(depts): print(f'  - {d}')
print(f'\nSections ({len(sections)}):')
for s in sorted(sections): print(f'  - {s}')
print(f'\nLevels: {sorted(jobLevels)}')
print(f'\nLocations ({len(locations)}):')
for l in sorted(locations): print(f'  - {l}')
