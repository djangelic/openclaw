from google import genai
from google.genai import types
import os, base64

key = open(os.path.expanduser("~/.config/gemini/api_key")).read().strip()
client = genai.Client(api_key=key)

outdir = os.path.dirname(os.path.abspath(__file__)) + "/pixel-sprites"
os.makedirs(outdir, exist_ok=True)

sprites = {
    "food-truck": "Generate pixel art of a cute food truck, 16-bit retro video game style, side view, orange and white color scheme, dark navy background color #0f0f23, clean pixel edges, no text or words",
    "chef": "Generate pixel art of a chef character standing, 16-bit retro RPG style, white chef hat, front-facing idle pose, dark navy background color #0f0f23, clean pixels, no text or words",
    "chef-stressed": "Generate pixel art of a stressed sweating chef character, 16-bit retro RPG style, white chef hat, visible sweat drops, panicking expression, dark navy background color #0f0f23, clean pixels, no text",
    "customer": "Generate pixel art of a casual customer person character standing, 16-bit retro RPG style, blue shirt, front-facing, dark navy background color #0f0f23, clean pixels, no text",
    "restaurant": "Generate pixel art of a restaurant building exterior, 16-bit retro video game style, front view, warm yellow windows, awning over door, dark navy night sky background, clean pixels, no text",
    "franchise-building": "Generate pixel art of a tall modern corporate office building, 16-bit retro video game style, front view, purple glowing accent lights on edges, multiple floors with lit windows, dark navy night sky background, clean pixels, no text",
    "kitchen-shelf-messy": "Generate pixel art of messy disorganized kitchen shelves with scattered bottles jars pans ingredients everywhere, 16-bit retro style, dark navy background, clean pixels, no text",
    "kitchen-shelf-organized": "Generate pixel art of neatly organized kitchen shelves with ingredient jars sorted perfectly by type, sparkle effects, 16-bit retro style, dark navy background, clean pixels, no text",
    "wrench-tool": "Generate pixel art of a large golden wrench tool, 16-bit retro video game power-up item style, glowing yellow aura, dark navy background, clean pixels, no text",
    "ticket-rail": "Generate pixel art of a restaurant kitchen order ticket rail with yellow paper tickets hanging, 16-bit retro style, metal rail, dark navy background, clean pixels, no text",
    "runner-exhausted": "Generate pixel art of an exhausted running messenger character carrying a food tray, 16-bit retro RPG style, sweat drops visible, side view running, dark navy background, clean pixels, no text",
    "test-kitchen": "Generate pixel art of a small laboratory test kitchen with beakers and recipe books, green glowing experiments, 16-bit retro style, dark navy background, clean pixels, no text",
    "bg-night-city": "Generate pixel art wide panoramic background of nighttime city street scene, 16-bit retro video game style, dark starry sky, street with sidewalk, lamp posts, building silhouettes, very dark navy palette, no characters, no text, wide aspect ratio",
    "bg-kitchen-interior": "Generate pixel art wide panoramic background of professional restaurant kitchen interior, 16-bit retro video game style, steel counters, stove, pots hanging, tiled floor, warm lighting, no characters, no text, wide aspect ratio",
    "bg-parking-lot": "Generate pixel art wide panoramic background of a nighttime parking lot between buildings, 16-bit retro video game style, street lamps, asphalt, dark starry sky, no characters, no text, wide aspect ratio",
}

# Use gemini-2.0-flash-preview-image-generation which supports native image output
for name, prompt in sprites.items():
    outpath = f"{outdir}/{name}.png"
    if os.path.exists(outpath):
        print(f"SKIP {name} (exists)", flush=True)
        continue
    print(f"Generating {name}...", flush=True)
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp-image-generation",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_modalities=["IMAGE", "TEXT"],
            )
        )
        # Find image part in response
        saved = False
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                with open(outpath, "wb") as f:
                    f.write(part.inline_data.data)
                print(f"  OK -> {name}.png", flush=True)
                saved = True
                break
        if not saved:
            # Try text response
            print(f"  NO IMAGE in response. Text: {response.text[:200] if response.text else 'none'}", flush=True)
    except Exception as e:
        print(f"  ERROR: {e}", flush=True)

print("\nDone!", flush=True)
