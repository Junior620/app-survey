from PIL import Image
from pathlib import Path

root = Path(r"c:\Users\Christian\AndroidStudioProjects\appsurvey\apps\mobile\assets\branding")
src = Image.open(root / "scpb-logo.png").convert("RGBA")
pixels = src.load()
w, h = src.size

# Knock out near-black background; keep sun (yellow) and greens.
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # Pure / near black → transparent
        if r < 28 and g < 28 and b < 28:
            pixels[x, y] = (0, 0, 0, 0)
        # Very dark gray letters on black: keep slightly lifted for visibility on light UI
        elif r < 55 and g < 55 and b < 55 and abs(r - g) < 8 and abs(g - b) < 8:
            # Soften to mid forest green so "SCPB" remains readable on ivory
            pixels[x, y] = (32, 92, 69, 255)

src.save(root / "scpb-logo-transparent.png", optimize=True)

# Square icon / mark with transparent bg (cover crop of transparent logo)
logo = src


def cover_square(img: Image.Image, size: int) -> Image.Image:
    lw, lh = img.size
    scale = max(size / lw, size / lh)
    nw, nh = int(lw * scale + 0.5), int(lh * scale + 0.5)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left = (nw - size) // 2
    top = (nh - size) // 2
    return resized.crop((left, top, left + size, top + size))


icon = cover_square(logo, 1024)
icon.save(root / "scpb-icon.png", optimize=True)

# Splash: ivory + transparent mark centered (no black tile)
sw, sh = 1284, 2778
splash = Image.new("RGBA", (sw, sh), (246, 247, 244, 255))
mark_size = 520
mark = cover_square(logo, mark_size)
x = (sw - mark_size) // 2
y = int(sh * 0.38) - mark_size // 2
splash.paste(mark, (x, y), mark)
splash.convert("RGB").save(root / "scpb-splash.png", optimize=True)
print("transparent logo + icon + splash updated")
