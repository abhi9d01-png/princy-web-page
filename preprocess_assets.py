"""Preprocess the supplied notebook photo into same-scale book layers."""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageOps


ROOT = Path(__file__).parent
ASSETS = ROOT / "assets"
REFERENCE = ROOT / "imge refrences" / "Download Blank open notebook with ring binder isolated on white ideal for business school art or craft scenes for free.jpg"


def transparent_background(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    alpha = Image.new("L", image.size)
    source = image.convert("RGB").load()
    target = alpha.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue = source[x, y]
            brightness = max(red, green, blue)
            saturation = brightness - min(red, green, blue)
            target[x, y] = 0 if brightness > 247 and saturation < 18 else 255
    image.putalpha(alpha)
    return image


def metal_mask(strip: Image.Image) -> Image.Image:
    rgb = strip.convert("RGB")
    alpha = Image.new("L", rgb.size)
    pixels = rgb.load()
    output = alpha.load()
    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = pixels[x, y]
            brightness = max(red, green, blue)
            saturation = brightness - min(red, green, blue)
            if saturation > 58 or brightness > 250:
                output[x, y] = 0
            else:
                output[x, y] = max(0, min(255, int((248 - brightness) * 3.2)))
    return alpha


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    if not REFERENCE.exists():
        raise FileNotFoundError(f"Missing source image: {REFERENCE}")

    with Image.open(REFERENCE) as opened:
        original = ImageOps.exif_transpose(opened).convert("RGB")
    original.save(ASSETS / "notebook.jpg", quality=95, optimize=True)
    rotated = original.rotate(-90, expand=True)
    width, height = rotated.size

    # These proportions match the supplied photo after its clockwise rotation.
    cover_box = (round(width * .056), round(height * .043), round(width * .944), round(height * .977))
    paper_box = (round(width * .102), round(height * .23), round(width * .908), round(height * .90))
    spiral_box = (round(width * .056), 0, round(width * .944), round(height * .20))
    output_size = (cover_box[2] - cover_box[0], cover_box[3] - cover_box[1])

    cover = rotated.crop(cover_box).resize(output_size, Image.Resampling.LANCZOS)
    cover = transparent_background(cover)
    cover.save(ASSETS / "cover.png", optimize=True)

    paper = rotated.crop(paper_box).resize(output_size, Image.Resampling.LANCZOS)
    paper.save(ASSETS / "paper.jpg", quality=95, optimize=True)

    back = ImageEnhance.Brightness(paper).enhance(.87).convert("RGBA")
    gradient = Image.new("RGBA", output_size)
    gradient_pixels = gradient.load()
    for y in range(output_size[1]):
        darkness = int(24 * y / max(1, output_size[1] - 1))
        for x in range(output_size[0]):
            gradient_pixels[x, y] = (darkness, darkness, darkness, 34)
    Image.alpha_composite(back, gradient).convert("RGB").save(ASSETS / "paper-back.jpg", quality=95, optimize=True)

    strip = rotated.crop(spiral_box).resize((output_size[0], round(output_size[1] * .20)), Image.Resampling.LANCZOS)
    spiral = strip.convert("RGBA")
    spiral.putalpha(metal_mask(strip))
    canvas = Image.new("RGBA", output_size, (0, 0, 0, 0))
    canvas.alpha_composite(spiral, (0, 0))
    canvas.save(ASSETS / "spiral.png", optimize=True)
    print(f"Generated same-scale layers at {output_size[0]}x{output_size[1]}")


if __name__ == "__main__":
    main()
