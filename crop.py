
from PIL import Image
def to_4_3_with_white_bg(input_path, output_path):
    # 打开原图
    img = Image.open(input_path)
    w, h = img.size
    target_ratio = 16 / 9

    # 计算新画布尺寸（尽量不缩放原图）
    if w / h > target_ratio:
        # 原图偏宽 -> 以宽为基准
        new_w = w
        new_h = int(w / target_ratio)
    else:
        # 原图偏高 -> 以高为基准
        new_h = h
        new_w = int(h * target_ratio)

    # 创建白底画布
    canvas = Image.new("RGB", (new_w, new_h), (255, 255, 255))

    # 计算居中粘贴位置
    paste_x = (new_w - w) // 2
    paste_y = (new_h - h) // 2
    canvas.paste(img, (paste_x, paste_y))

    # 保存结果
    canvas.save(output_path)

# 用法
to_4_3_with_white_bg("image.png", "cover4.png")