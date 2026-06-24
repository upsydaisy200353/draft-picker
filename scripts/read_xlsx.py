import json
import sys
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'openpyxl', 'pandas', '-q'])
    import pandas as pd

path = Path(r'c:\Users\32828\Desktop\白菜杯S46海斗杯报名表（收集结果）.xlsx')
xl = pd.ExcelFile(path)
print('SHEETS:', xl.sheet_names, file=sys.stderr)
for sheet in xl.sheet_names:
    df = pd.read_excel(path, sheet_name=sheet, header=None)
    print(f'--- {sheet} shape {df.shape} ---', file=sys.stderr)
    print(df.head(30).to_string())
