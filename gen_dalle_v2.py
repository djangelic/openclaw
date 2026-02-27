import requests, os, time
from PIL import Image
import io

url = 'https://internal.users.n8n.cloud/webhook/231e2915-e0b4-4fdd-84b2-e7a4edd16712'
headers = {'djangelic': 'croak-borders-pompous-bliss', 'Content-Type': 'application/json'}
outdir = os.path.dirname(os.path.abspath(__file__)) + "/pixel-sprites"
os.makedirs(outdir, exist_ok=True)

# Much tighter FF6 prompts - emphasize LOW resolution, actual pixel grid
STYLE = "16-bit SNES Final Fantasy 6 sprite, actual pixel art on a visible pixel grid, exactly 15 colors maximum, hard pixel edges with zero anti-aliasing, no gradients, no smooth shading, every pixel hand-placed and deliberate, tiny sprite scaled up to show individual square pixels clearly"
BG = "on a perfectly flat solid magenta #FF00FF background with absolutely nothing else, no shadows, no ground, no effects, just the sprite floating on pure magenta"

sprites = {
    # Characters - emphasize small sprite scale
    "chef": f"A tiny chef character sprite, 16x24 pixel scale blown up large, white pixelated chef hat, white apron, holding spatula, front-facing idle pose like a Final Fantasy 6 NPC town sprite, {STYLE}, {BG}",
    "chef-stressed": f"A tiny panicking chef character sprite, 16x24 pixel scale blown up large, white chef hat, pixel sweat drops, arms up in distress, like an FF6 battle sprite in pain pose, {STYLE}, {BG}",
    "chef-cooking": f"A tiny chef character sprite cooking, 16x24 pixel scale blown up large, white chef hat, stirring motion, pixel steam particles, like an FF6 NPC animation frame, {STYLE}, {BG}",
    "customer": f"A tiny male townsperson NPC sprite, 16x24 pixel scale blown up large, blue tunic brown pants, front-facing idle, like a generic FF6 town NPC, {STYLE}, {BG}",
    "customer-2": f"A tiny female townsperson NPC sprite, 16x24 pixel scale blown up large, red pixel dress, front-facing idle, like a generic FF6 town NPC woman, {STYLE}, {BG}",
    "customer-3": f"A tiny businessman NPC sprite, 16x24 pixel scale blown up large, dark suit, front-facing idle, like a Figaro Castle NPC from FF6, {STYLE}, {BG}",
    "developer": f"A tiny programmer character sprite, 16x24 pixel scale blown up large, purple hoodie, pixel glasses, holding tiny laptop, like an FF6 scholar NPC, {STYLE}, {BG}",
    "runner-exhausted": f"A tiny exhausted runner sprite in side-view, 16x24 pixel scale blown up large, carrying a tray, pixel sweat drops, running pose, like an FF6 battle escape animation, {STYLE}, {BG}",

    # Buildings & objects - slightly larger but same pixel style
    "food-truck": f"A small food truck pixel art, 48x32 pixel scale blown up large, side view, orange body white trim, serving window, like a vehicle sprite from FF6 world map, {STYLE}, {BG}",
    "restaurant": f"A two-story restaurant building pixel art, 48x48 pixel scale blown up large, front view, warm yellow window squares, red door, chimney with 3 pixel smoke puffs, like an FF6 town building, {STYLE}, {BG}",
    "franchise-building": f"A tall corporate tower pixel art, 32x64 pixel scale blown up large, front view, blue-purple glowing window grid, like a Vector city building from FF6, {STYLE}, {BG}",
    "kitchen-shelf-messy": f"A messy shelf pixel art with scattered bottles and pans, 32x24 pixel scale blown up large, items at angles, like an FF6 interior furniture sprite, {STYLE}, {BG}",
    "kitchen-shelf-organized": f"A neat organized shelf pixel art with sorted jars, 32x24 pixel scale blown up large, pixel sparkle stars, like an FF6 interior furniture sprite, {STYLE}, {BG}",
    "ticket-rail": f"A metal order ticket rail with yellow paper tickets, 32x16 pixel scale blown up large, simple horizontal bar with hanging rectangles, like an FF6 item sprite, {STYLE}, {BG}",
    "frying-pan": f"A frying pan with pixel fire underneath, 16x16 pixel scale blown up large, simple round pan shape, 2 pixel steam puffs, like an FF6 item icon, {STYLE}, {BG}",
    "wrench-tool": f"A golden glowing wrench, 16x16 pixel scale blown up large, simple tool shape with 2 pixel sparkles, like an FF6 key item icon, {STYLE}, {BG}",
    "redis-crystal": f"A glowing red crystal orb, 16x16 pixel scale blown up large, faceted gem with white highlight pixel, like an FF6 magicite esper crystal, {STYLE}, {BG}",
    "test-kitchen": f"An alchemy workbench with beakers, 32x24 pixel scale blown up large, small table with 3 bottles and green pixel liquid, like FF6 Zozo interior furniture, {STYLE}, {BG}",
    "network-cable": f"A horizontal cable with connectors on each end, 48x8 pixel scale blown up large, simple line with rectangular ends and pixel electricity sparks, like an FF6 dungeon prop, {STYLE}, {BG}",
    "broken-cable": f"A snapped broken cable with exposed pixel sparks, 48x8 pixel scale blown up large, two halves separated with red spark pixels between, like a broken bridge in FF6, {STYLE}, {BG}",

    # Backgrounds (keep full)
    "bg-street-night": "A wide nighttime pixel art town street, Final Fantasy 6 SNES style town exterior tilemap, dark blue sky, pixel stars, cobblestone road tiles, building facades on both sides, warm yellow window pixels, street lamp with glow, visible tile grid, 15 color palette per tile, no characters, wide format, no UI elements",
    "bg-kitchen-interior": "A wide restaurant kitchen interior pixel art, Final Fantasy 6 SNES style indoor tilemap, steel counter tiles, brick oven with orange glow, hanging pot sprites, checkered floor tiles, warm amber lighting, visible tile grid, 15 color palette, no characters, wide format",
    "bg-parking-lot": "A wide nighttime parking lot pixel art between two buildings, Final Fantasy 6 SNES world map style, dark sky with pixel stars, gray asphalt tiles, yellow parking line pixels, lamp posts with glow circles, visible tile grid, 15 color palette, no characters, wide format",
}

def remove_magenta_bg(img_bytes):
    """Remove magenta #FF00FF background with tight tolerance using Pillow only."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    pixels = list(img.getdata())
    new_pixels = []
    for r, g, b, a in pixels:
        # Magenta: high R, low G, high B
        if r > 180 and g < 100 and b > 180:
            new_pixels.append((0, 0, 0, 0))
        # Near-magenta/pink fringes
        elif r > 150 and g < 80 and b > 150 and abs(r - b) < 60:
            new_pixels.append((0, 0, 0, 0))
        else:
            new_pixels.append((r, g, b, a))
    img.putdata(new_pixels)
    # Crop to content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

total = len(sprites)
for idx, (name, prompt) in enumerate(sprites.items()):
    outpath = f"{outdir}/{name}.png"
    is_bg = name.startswith("bg-")

    print(f"[{idx+1}/{total}] Generating {name}...", end=" ", flush=True)
    try:
        r = requests.post(url, headers=headers, json={'prompt': prompt, 'size': '1024x1024'}, timeout=120)
        if r.status_code == 200 and r.content[:4] == b'\x89PNG':
            if is_bg:
                with open(outpath, 'wb') as f:
                    f.write(r.content)
            else:
                cleaned = remove_magenta_bg(r.content)
                with open(outpath, 'wb') as f:
                    f.write(cleaned)
            size_kb = os.path.getsize(outpath) // 1024
            print(f"OK -> {name}.png ({size_kb}KB) {'[bg]' if is_bg else '[transparent]'}", flush=True)
        else:
            print(f"FAIL: status={r.status_code} body={r.text[:200]}", flush=True)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
    time.sleep(2)

print("\nDone!", flush=True)
