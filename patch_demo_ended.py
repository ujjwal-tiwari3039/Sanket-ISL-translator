with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

old_logic = '''          if (time < nextStart || video.ended) {
            activeWord = w;
            break;
          }'''

new_logic = '''          if (time < nextStart || (video.ended && i === entry.words.length - 1)) {
            activeWord = w;
            break;
          }'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("DemoMode video ended logic fixed!")
