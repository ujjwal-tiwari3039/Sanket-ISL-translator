with open('frontend/src/DemoMode.jsx', 'r') as f:
    content = f.read()

# Add keydown listener
old_logic = '''  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % manifest.length);
  };'''

new_logic = '''  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % manifest.length);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manifest.length]);'''

content = content.replace(old_logic, new_logic)

with open('frontend/src/DemoMode.jsx', 'w') as f:
    f.write(content)

print("Demo keys added!")
