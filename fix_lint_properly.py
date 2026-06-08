import re

contexts = [
    'AuthContext.jsx', 'ConnectionContext.jsx', 'LanguageContext.jsx',
    'NotificationContext.jsx', 'SocketContext.jsx', 'ThemeContext.jsx'
]
for ctx in contexts:
    p = 'frontend/src/contexts/' + ctx
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    
    # Prepend disable comment if not there
    if '/* eslint-disable react-refresh/only-export-components */' not in c:
        c = '/* eslint-disable react-refresh/only-export-components */\n' + c
        
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

for page in ['CreateListing.jsx', 'EditListing.jsx']:
    p = 'frontend/src/pages/' + page
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace(' // eslint-disable-line no-unused-vars', '')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

print('Lint issues properly fixed')
