import re

try:
    with open('carsales.html', 'r', encoding='utf-8') as f:
        html = f.read()

    urls = re.findall(r'data-src=["\'](.*?)["\']', html)

    for url in urls:
        if url.endswith(('.jpg', '.jpeg', '.png')):
            print(url)
except Exception as e:
    print(f"An error occurred: {e}")