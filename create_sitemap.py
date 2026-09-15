from pathlib import Path


BASE_URL = "https://leatherbagskingdom.com"


def main():
    products_dir = Path("products")

    if not products_dir.exists():
        raise SystemExit("ERROR: products directory not found.")

    product_files = sorted(
        products_dir.glob("*.html"),
        key=lambda path: path.name
    )

    urls = [
        f"{BASE_URL}/"
    ]

    urls.extend(
        f"{BASE_URL}/products/{path.name}"
        for path in product_files
    )

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

    Path("sitemap.xml").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8"
    )

    print()
    print("=" * 60)
    print("LeatherBagsKingdom - CREATE SITEMAP")
    print("=" * 60)
    print(f"Product pages : {len(product_files)}")
    print(f"Total URLs    : {len(urls)}")
    print("Sitemap       : sitemap.xml")
    print()
    print("Sitemap created successfully.")


if __name__ == "__main__":
    main()