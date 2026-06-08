import re

# Fix LandingPage
path = 'frontend/src/pages/LandingPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('const { t, isUrdu } = useLanguage();', 'const { t } = useLanguage();')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix Contexts
contexts = [
    'AuthContext.jsx', 'ConnectionContext.jsx', 'LanguageContext.jsx',
    'NotificationContext.jsx', 'SocketContext.jsx', 'ThemeContext.jsx'
]
for ctx in contexts:
    p = 'frontend/src/contexts/' + ctx
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('// eslint-disable-next-line react-refresh/only-export-components\n', '')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

# Fix Listing pages
for page in ['CreateListing.jsx', 'EditListing.jsx']:
    p = 'frontend/src/pages/' + page
    with open(p, 'r', encoding='utf-8') as f:
        c = f.read()
    c = c.replace('// eslint-disable-next-line no-unused-vars\n', '')
    with open(p, 'w', encoding='utf-8') as f:
        f.write(c)

print('Lint issues fixed')
