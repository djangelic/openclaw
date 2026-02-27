from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 700})
    page.goto("file:///C:/Users/djang/.openclaw/workspace/openclaw-share/three-architectures.html")
    page.wait_for_timeout(1000)
    page.locator(".card").screenshot(path="C:/Users/djang/.openclaw/workspace/openclaw-share/three-architectures.png")
    browser.close()
    print("done")
