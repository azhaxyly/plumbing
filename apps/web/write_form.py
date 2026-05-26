import os, textwrap
target = r"src\components\admin\catalog\product-form.tsx"
content = textwrap.dedent("""
  test content
""").lstrip()
open(target, "w", encoding="utf-8").write(content)
print("written", len(content), "chars")
