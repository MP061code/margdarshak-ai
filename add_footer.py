import os
import glob

footer_html = """
    <!-- Professional Footer -->
    <footer class="footer mt-auto py-3 bg-dark text-white text-center border-top border-secondary border-opacity-25 w-100" style="position: relative; z-index: 10; margin-top: auto;">
        <div class="container">
            <span class="text-muted" style="font-size: 0.9rem;">&copy; 2026 | Developed by DeepQNova Pvt. Ltd.</span>
        </div>
    </footer>
"""

html_files = glob.glob('d:/mgd-ai/frontend/**/*.html', recursive=True)

for file in html_files:
    with open(file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    if "DeepQNova Pvt. Ltd." not in content:
        last_body_index = content.rfind('</body>')
        if last_body_index != -1:
            new_content = content[:last_body_index] + footer_html + content[last_body_index:]
            with open(file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Added footer to {file}")
