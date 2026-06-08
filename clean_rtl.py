import os
import re

files = [
    'frontend/src/pages/LandingPage.jsx',
    'frontend/src/components/Footer.jsx',
    'frontend/src/components/GuestNavbar.jsx',
    'frontend/src/components/Navbar.jsx'
]

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()

    content = re.sub(r'\$\{isUrdu \? \'[^\']*\' : \'\'\}', '', content)
    content = re.sub(r'\$\{isUrdu \? \'[^\']*\' : \'text-center sm:text-left\'\}', 'text-center sm:text-left', content)
    content = re.sub(r'\$\{isUrdu \? \'[^\']*\' : \'text-left\'\}', 'text-left', content)
    content = re.sub(r'\$\{isUrdu \? \'[^\']*\' : \'flex-row\'\}', 'flex-row', content)
    content = re.sub(r'isUrdu \? \'bg-gradient-to-l\' : \'bg-gradient-to-r\'', "'bg-gradient-to-r'", content)
    content = re.sub(r'dir=\{isUrdu \? "rtl" : "ltr"\}', '', content)
    content = re.sub(r'style=\{isUrdu \? \{[^}]+\} : \{\}\}', '', content)
    content = re.sub(r'className=\{isUrdu \? \'text-right\' : \'text-left\'\}', 'className="text-left"', content)
    
    # Also replace raw {isUrdu ? 'text-right' : 'text-left'} in classNames:
    content = re.sub(r'isUrdu \? \'text-right\' : \'text-left\'', "'text-left'", content)

    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)

print('Cleaned RTL classes')
