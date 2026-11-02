"""Regenerate every SCPB brand asset from the logo master.

Single source of truth for assets/branding/*. Run from anywhere:

    python apps/mobile/scripts/make-brand-assets.py

Master: scpb-logo.png (despite the extension it is a 1024x681 JPEG with the
mark on a near-black background). The output is deterministic.

Outputs:
  scpb-logo-transparent.png  1024x681 mark on transparency (same canvas as master)
  scpb-icon.png              1024² legacy icon: mark on opaque ivory, ~80% width
  scpb-adaptive-fg.png       1024² adaptive-icon foreground: mark inside the
                             66dp safe-zone circle, transparent background
  scpb-splash-mark.png       512² splash mark, transparent; fits the Android 12+
                             splash icon circle (192dp of a 288dp canvas)

Knockout: the mark is flat colour on black, so each pixel is treated as
palette_colour * alpha over black. Alpha comes from brightness relative to
the palette colour and RGB is snapped to the exact palette colour, which
removes the dark JPEG fringe instead of keeping it as semi-opaque black.
The near-black "SCPB" lettering (~#06070A on #000) cannot be recovered from
the JPEG and is dropped; a vector master is needed to bring it back.
"""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "assets" / "branding"

IVORY = (0xF6, 0xF7, 0xF4)
PALETTE = np.array(
    [
        (0xF6, 0xAD, 0x22),  # sun
        (0x93, 0xA5, 0x37),  # light olive
        (0x70, 0x74, 0x30),  # dark olive
    ],
    dtype=np.float32,
)

NOISE_FLOOR = 14  # max-channel value treated as pure background (JPEG noise, lettering)
SOLID_AT = 0.9  # fraction of the palette brightness that counts as fully opaque
MIN_SPECK = 200  # opaque components smaller than this (px) are dropped


def knockout(master: Image.Image) -> Image.Image:
    rgb = np.asarray(master.convert("RGB"), dtype=np.float32)
    bright = rgb.max(axis=2)
    pal_bright = PALETTE.max(axis=1)

    # Label pixels that are (nearly) exactly a palette colour…
    dist = ((rgb[:, :, None, :] - PALETTE[None, None]) ** 2).sum(axis=3)
    nearest = dist.argmin(axis=2)
    confident = dist.min(axis=2) < 20**2
    labels = np.where(confident, nearest + 1, 0).astype(np.uint8)

    # …then grow labels outwards over the anti-aliased edge: a dim sun edge
    # is closer in RGB to dark olive than to the sun, so it must inherit its
    # colour from its neighbours, not from its own value.
    # One ring per pass and per colour, so each edge pixel takes the nearest
    # seed rather than the highest label.
    for _ in range(4):
        ring = np.zeros_like(labels)
        for k in range(1, len(PALETTE) + 1):
            mask = Image.fromarray(((labels == k) * 255).astype(np.uint8))
            reach = np.asarray(mask.filter(ImageFilter.MaxFilter(3))) > 0
            ring[reach & (labels == 0) & (ring == 0)] = k
        labels += ring
    idx = np.where(labels > 0, labels - 1, nearest)

    target = pal_bright[idx] * SOLID_AT
    alpha = np.clip((bright - NOISE_FLOOR) / (target - NOISE_FLOOR), 0.0, 1.0)
    alpha = drop_specks(alpha)

    out = np.zeros((*alpha.shape, 4), dtype=np.uint8)
    out[:, :, :3] = PALETTE[idx].astype(np.uint8)
    out[:, :, 3] = np.round(alpha * 255).astype(np.uint8)
    out[out[:, :, 3] == 0, :3] = 0
    return Image.fromarray(out, "RGBA")


def drop_specks(alpha: np.ndarray) -> np.ndarray:
    """Zero out isolated blobs (JPEG artefacts, clipped stripe tips)."""
    solid = alpha > 0
    seen = np.zeros_like(solid)
    h, w = solid.shape
    for y0, x0 in zip(*np.nonzero(solid)):
        if seen[y0, x0]:
            continue
        comp = []
        queue = deque([(y0, x0)])
        seen[y0, x0] = True
        while queue:
            y, x = queue.popleft()
            comp.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(comp) < MIN_SPECK:
            ys, xs = zip(*comp)
            alpha[list(ys), list(xs)] = 0
    return alpha


def trim(img: Image.Image) -> Image.Image:
    return img.crop(img.getchannel("A").point(lambda a: 255 if a > 4 else 0).getbbox())


def max_radius(mark: Image.Image) -> float:
    """Farthest visible pixel from the mark's bbox centre, in mark pixels."""
    a = np.asarray(mark.getchannel("A")) > 4
    ys, xs = np.nonzero(a)
    cy, cx = (mark.height - 1) / 2, (mark.width - 1) / 2
    return float(np.sqrt((ys - cy) ** 2 + (xs - cx) ** 2).max())


def place(mark: Image.Image, size: int, max_width: float, circle_radius: float | None,
          background=None) -> tuple[Image.Image, float]:
    """Contain-fit the mark centred on a size² canvas.

    Width is capped at max_width·size and, when circle_radius is given, the
    scale is reduced further so every visible pixel stays inside a centred
    circle of circle_radius·size.
    """
    scale = max_width * size / mark.width
    if circle_radius is not None:
        scale = min(scale, circle_radius * size / max_radius(mark))
    nw, nh = round(mark.width * scale), round(mark.height * scale)
    resized = mark.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (*background, 255) if background else (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - nw) // 2, (size - nh) // 2))
    return canvas, nw / size


def main() -> None:
    logo = knockout(Image.open(ROOT / "scpb-logo.png"))
    logo.save(ROOT / "scpb-logo-transparent.png", optimize=True)
    mark = trim(logo)

    icon, w_icon = place(mark, 1024, 0.80, None, background=IVORY)
    icon.convert("RGB").save(ROOT / "scpb-icon.png", optimize=True)

    # Adaptive icon: 108dp canvas, guaranteed-visible circle is 66dp wide
    # (radius 0.3056 of the canvas). Keep a small margin inside it.
    fg, w_fg = place(mark, 1024, 0.60, 0.29)
    fg.save(ROOT / "scpb-adaptive-fg.png", optimize=True)

    # Splash: expo-splash-screen contain-fits this square into imageWidth dp
    # (180) on a 288dp canvas; Android 12+ masks that to a 192dp circle, i.e.
    # radius 96/180 = 0.533 of this image. 0.49 keeps a margin.
    splash, w_splash = place(mark, 512, 0.94, 0.49)
    splash.save(ROOT / "scpb-splash-mark.png", optimize=True)

    print(f"mark {mark.width}x{mark.height}; icon width {w_icon:.0%}, "
          f"adaptive fg width {w_fg:.0%}, splash mark width {w_splash:.0%}")


if __name__ == "__main__":
    main()
