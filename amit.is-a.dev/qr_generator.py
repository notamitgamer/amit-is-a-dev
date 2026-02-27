import os
import requests
import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from qrcode.image.styles.colormasks import SolidFillColorMask

# Your target directory
OUTPUT_DIR = r"C:\Users\PC\Desktop\amit.is-a.dev\assets"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Your specific links
ROUTES = [
    "link-discord-direct", "link-about", "link-orcid", "link-crunchbase", 
    "link-gravatar", "link-github", "link-github-sponsor", "link-linkedin", 
    "link-x", "link-facebook", "link-instagram", "link-reddit", "link-youtube", 
    "link-npm", "link-hackernews", "link-producthunt", "link-pypi", "link-holopin", 
    "link-email-gmail", "link-email-dev", "link-website", "profile-avatar"
]

# 1. Download the profile picture securely
logo_url = "https://amit.is-a.dev/mypic.png"
logo_path = os.path.join(OUTPUT_DIR, "temp_logo.png")
print("Downloading profile picture...")
response = requests.get(logo_url)
if response.status_code == 200:
    with open(logo_path, "wb") as f:
        f.write(response.content)
else:
    print("Failed to download logo.")
    exit()

# Download Google Font (Outfit Bold) - Using Bold for a much better premium look
FONT_URL = "https://github.com/google/fonts/raw/main/ofl/outfit/Outfit-Bold.ttf"
font_path = os.path.join(OUTPUT_DIR, "Outfit-Bold.ttf")
print("Downloading Google Font (Outfit Bold)...")
try:
    response_font = requests.get(FONT_URL)
    if response_font.status_code == 200:
        with open(font_path, "wb") as f:
            f.write(response_font.content)
except Exception as e:
    print(f"Font download error: {e}")

def create_circular_logo_with_border(logo_img, size, border_thickness=15):
    logo_img = logo_img.resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    circular_logo = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    circular_logo.paste(logo_img, (0, 0), mask)

    bg_size = size + (border_thickness * 2)
    border_img = Image.new('RGBA', (bg_size, bg_size), (0, 0, 0, 0))
    bg_draw = ImageDraw.Draw(border_img)
    bg_draw.ellipse((0, 0, bg_size, bg_size), fill=(255, 255, 255, 255))

    border_img.paste(circular_logo, (border_thickness, border_thickness), circular_logo)
    return border_img

logo = Image.open(logo_path)

# 2. Generate each QR code
print("Generating premium QR codes...")
for route_id in ROUTES:
    tracking_url = f"https://amit.is-a.dev/redirect?id={route_id}&ref=qr"
    
    qr = qrcode.QRCode(
        version=5,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=15,
        border=2,
    )
    qr.add_data(tracking_url)
    qr.make(fit=True)
    
    qr_img = qr.make_image(
        image_factory=StyledPilImage,
        module_drawer=RoundedModuleDrawer(),
        color_mask=SolidFillColorMask(front_color=(0, 100, 148), back_color=(255, 255, 255))
    ).convert('RGBA')
    qr_size = qr_img.size[0]
    
    logo_size = int(qr_size * 0.22)
    processed_logo = create_circular_logo_with_border(logo, logo_size, border_thickness=12)
    
    pos = ((qr_size - processed_logo.size[0]) // 2, (qr_size - processed_logo.size[1]) // 2)
    qr_img.paste(processed_logo, pos, processed_logo)
    
    # --- UPDATE PLACEHOLDER SIZE ---
    # We use a substantial multiplier (0.35) to give the text room to be large and centered
    text_space = int(qr_size * 0.09) 
    final_canvas = Image.new('RGBA', (qr_size, qr_size + text_space), "white")
    final_canvas.paste(qr_img, (0, 0))
    
    draw = ImageDraw.Draw(final_canvas)
    
    # --- UPDATE FONT SIZE ---
    # 0.15 is a sweet spot for a large, visible URL
    massive_font_size = int(qr_size * 0.04)
    
    try:
        font = ImageFont.truetype(font_path, massive_font_size) 
    except:
        try:
            font = ImageFont.truetype("arialbd.ttf", massive_font_size) # Bold Arial as fallback
        except:
            font = ImageFont.load_default()
        
    text = "https://amit.is-a.dev" 
    
    # Precise text measurement
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    # Auto-scaling logic: shrink if text is wider than the QR width (90% boundary)
    if text_w > qr_size * 0.90:
        massive_font_size = int(massive_font_size * (qr_size * 0.90 / text_w))
        try:
            font = ImageFont.truetype(font_path, massive_font_size)
        except:
            font = ImageFont.truetype("arialbd.ttf", massive_font_size)
        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]

    # Perfect vertical centering:
    # We take the middle of the 'text_space' area and subtract half the text height.
    # We also apply a small upward nudge (-int(text_h * 0.1)) to fix the baseline bias.
    text_y_position = qr_size + ((text_space - text_h) // 2) - int(text_h * 0.1)
    text_pos = ((qr_size - text_w) // 2, text_y_position)
    
    draw.text(text_pos, text, fill="#006494", font=font)
    
    output_filename = os.path.join(OUTPUT_DIR, f"{route_id}_qr.png")
    final_canvas.save(output_filename)
    print(f"  Saved: {route_id}_qr.png")

if os.path.exists(logo_path):
    os.remove(logo_path)
if os.path.exists(font_path):
    os.remove(font_path)

print(f"\nSuccess! All premium QR codes generated in {OUTPUT_DIR}")