import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC_ICON = path.join(ROOT, 'assets/icon-source.svg');
const SRC_MASKABLE = path.join(ROOT, 'assets/icon-maskable.svg');
const OUT_DIR = path.join(ROOT, 'public/icons');
const PUBLIC_DIR = path.join(ROOT, 'public');

// 标准 PWA 图标尺寸
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
// Apple Touch Icon 尺寸
const APPLE_SIZES = [120, 152, 167, 180];
// Favicon 尺寸
const FAVICON_SIZES = [16, 32, 48];

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function generate() {
  console.log('🎨 生成图标资源...\n');

  await ensureDir(OUT_DIR);
  const srcBuffer = await fs.readFile(SRC_ICON);
  const maskableBuffer = await fs.readFile(SRC_MASKABLE);

  // 1. 标准 PWA 图标
  for (const size of SIZES) {
    const out = path.join(OUT_DIR, `${size}.png`);
    await sharp(srcBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9, quality: 90 })
      .toFile(out);
    console.log(`  ✔ icons/${size}.png`);
  }

  // 2. Maskable 图标（Android 自适应）
  const maskableOut = path.join(OUT_DIR, 'maskable.png');
  await sharp(maskableBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(maskableOut);
  console.log(`  ✔ icons/maskable.png`);

  // 3. Apple Touch Icons
  for (const size of APPLE_SIZES) {
    const out = path.join(OUT_DIR, `apple-${size}.png`);
    await sharp(srcBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  ✔ icons/apple-${size}.png`);
  }

  // 4. Favicons
  for (const size of FAVICON_SIZES) {
    const out = path.join(OUT_DIR, `favicon-${size}.png`);
    await sharp(srcBuffer)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`  ✔ icons/favicon-${size}.png`);
  }

  // 5. favicon.ico（合并 16/32/48）
  const icoBuffers = await Promise.all(
    FAVICON_SIZES.map(size => sharp(srcBuffer).resize(size, size).png().toBuffer())
  );
  // 简易做法：使用 32x32 作为 favicon.ico
  await sharp(srcBuffer).resize(32, 32).toFile(path.join(PUBLIC_DIR, 'favicon.ico'));
  console.log(`  ✔ favicon.ico`);

  // 6. 复制 favicon.svg 到 public（保留矢量版本）
  await fs.copyFile(SRC_ICON, path.join(PUBLIC_DIR, 'favicon.svg'));
  console.log(`  ✔ favicon.svg`);

  // 7. Safari 固定标签图标（monochrome mask）
  const svgMono = await fs.readFile(SRC_ICON, 'utf-8');
  const monoSvg = svgMono
    .replace(/<linearGradient[\s\S]*?<\/linearGradient>/, '')
    .replace(/fill="url\(#bg\)"/, 'fill="black"')
    .replace(/fill="white"/g, 'fill="black"')
    .replace(/opacity="[\d.]+"/g, '');
  await fs.writeFile(path.join(PUBLIC_DIR, 'safari-pinned-tab.svg'), monoSvg);
  console.log(`  ✔ safari-pinned-tab.svg`);

  // 8. Open Graph 图（社交分享预览）
  const ogOut = path.join(PUBLIC_DIR, 'og-image.png');
  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: { r: 79, g: 70, b: 229, alpha: 1 },
    },
  })
    .composite([{
      input: await sharp(srcBuffer).resize(400, 400).toBuffer(),
      top: 115,
      left: 400,
    }])
    .png()
    .toFile(ogOut);
  console.log(`  ✔ og-image.png`);

  console.log('\n✅ 图标资源生成完成！');
  console.log(`📁 输出目录：${OUT_DIR}`);
}

generate().catch(err => {
  console.error('❌ 生成失败：', err);
  process.exit(1);
});