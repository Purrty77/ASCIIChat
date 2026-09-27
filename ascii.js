export const palettes = {
  standard: ' .:-=+*#%@',
  simple: ' .:*#@',
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'
};

// Rows are half as tall in count because monospace glyphs are roughly twice as tall as wide.
export function outputHeight(width, sourceWidth, sourceHeight) {
  return Math.max(1, Math.min(300, Math.round(width * sourceHeight / sourceWidth * 0.5)));
}

export function pixelsToAscii(data, width, height, { contrast = 1, invert = false, palette = 'standard' } = {}) {
  const chars = palettes[palette] || palettes.standard;
  const rows = [];
  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const alpha = data[i + 3] / 255;
      let light = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255 * alpha;
      light = Math.max(0, Math.min(1, (light - 0.5) * contrast + 0.5));
      if (invert) light = 1 - light;
      row += chars[Math.round(light * (chars.length - 1))];
    }
    rows.push(row);
  }
  return rows.join('\n');
}

export const TWITCH_LIMIT = 500;
export const BRAILLE_BLANK = '\u2800';

// Stretch the useful tonal range, then sharpen local differences. Keep alpha
// untouched and ignore transparent pixels when estimating the tonal range.
export function enhanceDetails(data, width, height) {
  const luminance = new Float32Array(width * height);
  const visible = [];
  for (let p = 0; p < luminance.length; p++) {
    const i = p * 4;
    luminance[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    if (data[i + 3] > 0) visible.push(luminance[p]);
  }
  visible.sort((a, b) => a - b);
  const low = visible[Math.floor(visible.length * 0.03)] ?? 0;
  const high = visible[Math.min(visible.length - 1, Math.floor(visible.length * 0.97))] ?? 255;
  const range = high - low;
  const normalized = luminance.map(value => range > 20 ? Math.max(0, Math.min(255, (value - low) * 255 / range)) : value);
  const result = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && data[(ny * width + nx) * 4 + 3] > 0) {
          sum += normalized[ny * width + nx];
          count++;
        }
      }
      const p = y * width + x;
      const value = normalized[p] + 0.8 * (normalized[p] - (count ? sum / count : normalized[p]));
      result[p * 4] = result[p * 4 + 1] = result[p * 4 + 2] = value;
    }
  }
  return result;
}

// Each braille cell contains two columns and four rows of pixels.
export function pixelsToBraille(data, columns, rows, { contrast = 1, invert = false, dither = true } = {}) {
  const bits = [[1, 8], [2, 16], [4, 32], [64, 128]];
  // Ordered dithering represents intermediate luminance by dot density,
  // instead of discarding every pixel below one fixed threshold.
  const thresholds = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
  const lines = [];
  for (let y = 0; y < rows; y++) {
    let line = '';
    for (let x = 0; x < columns; x++) {
      let mask = 0;
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const i = ((y * 4 + dy) * columns * 2 + x * 2 + dx) * 4;
          let light = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255 * data[i + 3] / 255;
          light = Math.max(0, Math.min(1, (light - 0.5) * contrast + 0.5));
          if (invert) light = 1 - light;
          const threshold = dither ? (thresholds[(y * 4 + dy) % 4][(x * 2 + dx) % 4] + 0.5) / 16 : 0.5;
          if (light >= threshold) mask |= bits[dy][dx];
        }
      }
      line += String.fromCharCode(0x2800 + mask);
    }
    lines.push(line);
  }
  return lines;
}

export function formatTwitch(lines, padding) {
  // U+2800 is a blank glyph, not ordinary whitespace removed by trim/collapse.
  // A regular space between rows provides a wrapping opportunity in chat.
  // Twitch screenshot calibration: empty braille cells can have a narrower
  // fallback glyph. A single low dot keeps the art aligned on the tested client.
  const artLines = lines.map(line => line.replaceAll(BRAILLE_BLANK, '\u2804'));
  const parts = [BRAILLE_BLANK.repeat(padding), ...artLines].filter(Boolean);
  const message = parts.join(' ');
  return { message, preview: parts.join('\n'), length: message.length, valid: message.length <= TWITCH_LIMIT };
}

export function fitTwitchWidth(width, sourceWidth, sourceHeight, padding) {
  for (let candidate = width; candidate >= 2; candidate--) {
    const rows = outputHeight(candidate, sourceWidth, sourceHeight);
    const length = rows * candidate + rows - 1 + (padding ? padding + 1 : 0);
    if (length <= TWITCH_LIMIT) return candidate;
  }
  return null;
}
