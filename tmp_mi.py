from pathlib import Path
p = Path('app/server/app/models/__init__.py')
text = p.read_text(encoding='utf-8')
if 'from app.models.availability import Availability' not in text:
    text += '\nfrom app.models.availability import Availability\n'
    p.write_text(text, encoding='utf-8')
    print('ok')
else:
    print('exists')
