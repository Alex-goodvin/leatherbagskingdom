
import json
from pathlib import Path
from urllib.parse import urlparse
import xml.etree.ElementTree as ET

BASE_URL = "https://leatherbagskingdom.com"


def main():
    catalog_path = Path("products.json")
    if not catalog_path.is_file():
        raise SystemExit("ERROR: products.json not found.")

    try:
        with catalog_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError) as exc:
        raise SystemExit(f"ERROR: cannot read products.json: {exc}")

    products = data.get("products")
    if not isinstance(products, dict) or not products:
        raise SystemExit("ERROR: products catalog is missing or empty.")

    urls = [f"{BASE_URL}/"]
    seen = set(urls)

    for product_id, product in products.items():
        if not isinstance(product, dict):
            raise SystemExit(f"ERROR: invalid product entry: {product_id}")

        path = product.get("url")
        if not isinstance(path, str) or not path.strip():
            raise SystemExit(f"ERROR: missing URL for product {product_id}")

        path = path.strip()
        parsed = urlparse(path)

        if (
            parsed.scheme or parsed.netloc
            or not path.startswith("products/")
            or not path.endswith(".html")
            or ".." in Path(path).parts
            or "?" in path or "#" in path
        ):
            raise SystemExit(f"ERROR: invalid product URL: {path}")

        url = f"{BASE_URL}/{path}"
        if url in seen:
            raise SystemExit(f"ERROR: duplicate URL: {url}")

        seen.add(url)
        urls.append(url)

    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "",
    ]

    for url in urls:
        lines.extend([
            "    <url>",
            f"        <loc>{url}</loc>",
            "    </url>",
            "",
        ])

    lines.append("</urlset>")
    content = "\n".join(lines) + "\n"

    # Validate XML before changing the existing sitemap.
    ET.fromstring(content)

    Path("sitemap.xml").write_text(content, encoding="utf-8")

    print()
    print("=" * 60)
    print("LeatherBagsKingdom - CREATE SITEMAP")
    print("=" * 60)
    print(f"Product URLs  : {len(urls) - 1}")
    print(f"Total URLs    : {len(urls)}")
    print("Sitemap       : sitemap.xml")
    print()
    print("Sitemap created successfully.")


if __name__ == "__main__":
    main()
