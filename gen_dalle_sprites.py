import requests, os, time
from PIL import Image
import io

url = 'https://internal.users.n8n.cloud/webhook/231e2915-e0b4-4fdd-84b2-e7a4edd16712'
headers = {'djangelic': 'croak-borders-pompous-bliss', 'Content-Type': 'application/json'}
outdir = os.path.dirname(os.path.abspath(__file__)) + "/pixel-sprites"
os.makedirs(outdir, exist_ok=True)

# FF6-style pixel art with explicit transparent background request
STYLE = "in the style of Final Fantasy 6 SNES 16-bit pixel art sprite, clean pixel edges, limited color palette, retro JRPG aesthetic, centered on canvas"
TRANSP = "on a solid bright green #00FF00 chroma key background, no shadows on background, no ground, sprite only floating on green"

sprites = {
    # Characters (sprite-sized, no bg)
    "chef": f"A chef character sprite facing forward, white chef hat, white apron, holding a spatula, idle standing pose, {STYLE}, {TRANSP}",
    "chef-stressed": f"A panicking chef character sprite, white chef hat, sweat drops, arms raised in stress, frantic pose, {STYLE}, {TRANSP}",
    "chef-cooking": f"A chef character sprite stirring a pot, white chef hat, cooking action pose, steam rising, {STYLE}, {TRANSP}",
    "customer": f"A male townsperson NPC sprite facing forward, blue tunic, brown pants, idle standing pose, {STYLE}, {TRANSP}",
    "customer-2": f"A female townsperson NPC sprite facing forward, red dress, idle standing pose, {STYLE}, {TRANSP}",
    "customer-3": f"A businessman NPC sprite facing forward, dark suit, briefcase, idle standing pose, {STYLE}, {TRANSP}",
    "developer": f"A young programmer character sprite facing forward, purple hoodie, glasses, holding a laptop, {STYLE}, {TRANSP}",
    "runner-exhausted": f"An exhausted delivery runner character sprite in side-view running pose, carrying a tray of food, sweat drops, {STYLE}, {TRANSP}",

    # Buildings & objects
    "food-truck": f"A small food truck vehicle sprite, side view, orange paint with white trim, serving window open, {STYLE}, {TRANSP}",
    "restaurant": f"A two-story restaurant building sprite, front view, warm glowing windows, door at center, red awning, chimney with smoke, {STYLE}, {TRANSP}",
    "franchise-building": f"A tall corporate skyscraper building sprite, front view, glass windows with purple-blue glow, modern architecture, multiple floors, {STYLE}, {TRANSP}",
    "kitchen-shelf-messy": f"A messy kitchen shelf unit with scattered bottles jars and pans in disarray, items falling off, {STYLE}, {TRANSP}",
    "kitchen-shelf-organized": f"A perfectly organized kitchen shelf unit with neatly sorted jars and ingredients, sparkle effects, {STYLE}, {TRANSP}",
    "ticket-rail": f"A metal restaurant order ticket rail with yellow paper tickets clipped to it, {STYLE}, {TRANSP}",
    "frying-pan": f"A frying pan with food sizzling, steam particles rising, cooking item sprite, {STYLE}, {TRANSP}",
    "wrench-tool": f"A golden glowing wrench tool item sprite with sparkle aura, power-up pickup style, {STYLE}, {TRANSP}",
    "redis-crystal": f"A glowing red magic crystal orb with lightning inside, quest item sprite, {STYLE}, {TRANSP}",
    "test-kitchen": f"A small alchemy lab table with beakers and potion bottles, green glowing liquid, {STYLE}, {TRANSP}",
    "network-cable": f"A horizontal ethernet cable with RJ45 connectors, electricity sparking along it, {STYLE}, {TRANSP}",
    "broken-cable": f"A broken snapped cable with exposed wires and red sparks, danger item, {STYLE}, {TRANSP}",

    # Backgrounds (these keep their backgrounds)
    "bg-street-night": f"A wide nighttime town street scene background, in the style of Final Fantasy 6 SNES town map, dark sky with stars, cobblestone road, building facades on sides, street lamps, no characters, wide 16:9 format",
    "bg-kitchen-interior": f"A wide restaurant kitchen interior background, in the style of Final Fantasy 6 SNES interior, steel counters, brick oven, hanging pots, tiled floor, warm lighting, no characters, wide 16:9 format",
    "bg-parking-lot": f"A wide nighttime parking lot between buildings background, in the style of Final Fantasy 6 SNES world map, dark sky, lamp posts, asphalt, no characters, wide 16:9 format",
}

def remove_green_bg(img_bytes):
    """Remove bright green chroma key background and make it transparent."""
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    data = img.getdata()
    new_data = []
    for pixel in data:
        r, g, b, a = pixel
        # Remove bright green pixels (chroma key)
        if g > 180 and r < 150 and b < 150:
            new_data.append((0, 0, 0, 0))
        # Also remove near-green with some tolerance
        elif g > 160 and g > r * 1.3 and g > b * 1.3:
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append(pixel)
    img.putdata(new_data)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()

for name, prompt in sprites.items():
    outpath = f"{outdir}/{name}.png"
    is_bg = name.startswith("bg-")

    print(f"[{list(sprites.keys()).index(name)+1}/{len(sprites)}] Generating {name}...", flush=True)
    try:
        r = requests.post(url, headers=headers, json={'prompt': prompt, 'size': '1024x1024'}, timeout=120)
        if r.status_code == 200 and r.content[:4] == b'\x89PNG':
            if is_bg:
                # Keep backgrounds as-is
                with open(outpath, 'wb') as f:
                    f.write(r.content)
            else:
                # Remove green chroma key for sprites
                cleaned = remove_green_bg(r.content)
                with open(outpath, 'wb') as f:
                    f.write(cleaned)
            size_kb = os.path.getsize(outpath) // 1024
            print(f"  OK -> {name}.png ({size_kb}KB) {'[bg]' if is_bg else '[transparent]'}", flush=True)
        else:
            print(f"  FAIL: status={r.status_code} body={r.text[:200]}", flush=True)
    except Exception as e:
        print(f"  ERROR: {e}", flush=True)
    time.sleep(2)

print("\nDone!", flush=True)
