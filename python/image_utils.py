import os
import io
import time
from PIL import Image

def is_valid_image_bytes(data: bytes) -> bool:
    """
    Checks magic bytes and Pillow integrity verification for JPEG, PNG, WEBP, or GIF.
    """
    if not data or len(data) < 8:
        return False
    is_jpeg = data.startswith(b'\xff\xd8\xff')
    is_png = data.startswith(b'\x89PNG\r\n\x1a\n')
    is_webp = data[:4] == b'RIFF' and len(data) >= 12 and data[8:12] == b'WEBP'
    is_gif = data.startswith((b'GIF87a', b'GIF89a'))

    if not (is_jpeg or is_png or is_webp or is_gif):
        return False

    try:
        with Image.open(io.BytesIO(data)) as im:
            im.verify()
        return True
    except Exception:
        return False

def optimize_image_bytes(data: bytes, max_dim: int = 1200, quality: int = 82) -> bytes:
    """
    Resizes image to max_dim (preserving aspect ratio) and compresses with quality=82.
    Returns compressed JPEG bytes (or PNG bytes if transparent).
    """
    try:
        with Image.open(io.BytesIO(data)) as im:
            im.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            out_io = io.BytesIO()
            if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
                im.save(out_io, 'PNG', optimize=True)
            else:
                rgb_im = im.convert('RGB')
                rgb_im.save(out_io, 'JPEG', quality=quality, optimize=True)
            return out_io.getvalue()
    except Exception as e:
        print(f"Pillow optimize_image_bytes fallback: {e}")
        return data

def optimize_image_file(file_path: str, max_dim: int = 1200, quality: int = 82):
    """
    Optimizes a physical image file on disk.
    """
    try:
        if not os.path.exists(file_path):
            return
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in ('.jpg', '.jpeg', '.png', '.webp'):
            return

        with Image.open(file_path) as im:
            orig_w, orig_h = im.size
            im.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
            if ext in ('.jpg', '.jpeg'):
                rgb_im = im.convert('RGB')
                rgb_im.save(file_path, 'JPEG', quality=quality, optimize=True)
            elif ext == '.png':
                if im.mode not in ('RGBA', 'LA'):
                    rgb_im = im.convert('RGB')
                    # If it's a huge PNG photo, save as PNG optimized
                    im.save(file_path, 'PNG', optimize=True)
                else:
                    im.save(file_path, 'PNG', optimize=True)
            elif ext == '.webp':
                im.save(file_path, 'WEBP', quality=quality)
    except Exception as e:
        print(f"Error optimizing {file_path}: {e}")

def optimize_all_static_images():
    """
    Optimizes all static images in:
    - static/src/assets/ui/ (max 1200px, quality 82)
    - static/src/assets/profiles/ (max 400px, quality 82)
    """
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ui_dir = os.path.join(base_dir, 'static', 'src', 'assets', 'ui')
    profiles_dir = os.path.join(base_dir, 'static', 'src', 'assets', 'profiles')

    count_ui = 0
    if os.path.exists(ui_dir):
        for f in os.listdir(ui_dir):
            p = os.path.join(ui_dir, f)
            if os.path.isfile(p) and p.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                optimize_image_file(p, max_dim=1200, quality=82)
                count_ui += 1

    count_prof = 0
    if os.path.exists(profiles_dir):
        for f in os.listdir(profiles_dir):
            p = os.path.join(profiles_dir, f)
            if os.path.isfile(p) and p.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                optimize_image_file(p, max_dim=400, quality=82)
                count_prof += 1

    print(f"Optimized {count_ui} UI images and {count_prof} profile images.")

if __name__ == '__main__':
    optimize_all_static_images()
