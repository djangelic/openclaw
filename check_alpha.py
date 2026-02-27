from PIL import Image
import os
d='pixel-sprites'
for f in sorted(os.listdir(d)):
    if f.endswith('.png'):
        img=Image.open(f'{d}/{f}')
        has_t = img.mode=='RGBA' and img.getextrema()[3][0]==0
        print(f'{f:40s} {img.mode:5s} {"TRANSPARENT" if has_t else "OPAQUE":12s} {os.path.getsize(f"{d}/{f}")//1024}KB')
