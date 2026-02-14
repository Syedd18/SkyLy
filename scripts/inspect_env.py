from pathlib import Path
p = Path('c:/Users/acer/Air Pollution/.env')
print('Path exists=', p.exists())
text = p.read_text(encoding='utf-8')
print('RAW FILE:')
for i, l in enumerate(text.splitlines(), 1):
    print(i, repr(l))
