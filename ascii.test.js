import test from 'node:test';
import assert from 'node:assert/strict';
import { pixelsToAscii, outputHeight, pixelsToBraille, formatTwitch, fitTwitchWidth, BRAILLE_BLANK, enhanceDetails } from './ascii.js';

test('detail enhancement expands weak contrast without modifying the source or alpha', () => {
  const input = Uint8ClampedArray.from([100,100,100,255, 150,150,150,255, 255,255,255,0]);
  const before = input.slice();
  const result = enhanceDetails(input, 3, 1);
  assert.equal(result[0], 0);
  assert.equal(result[4], 255);
  assert.equal(result[11], 0);
  assert.deepEqual(input, before);
  const flat = Uint8ClampedArray.from([90,90,90,255]);
  assert.deepEqual(enhanceDetails(flat, 1, 1), flat);
  assert.deepEqual(enhanceDetails(new Uint8ClampedArray(4), 1, 1), new Uint8ClampedArray(4));
});
test('black, white and transparent pixels map to expected density', () => {
  const pixels = new Uint8ClampedArray([0,0,0,255, 255,255,255,255, 255,255,255,0]);
  assert.equal(pixelsToAscii(pixels, 3, 1), ' @ ');
  assert.equal(pixelsToAscii(pixels, 3, 1, { invert: true }), '@ @');
});

test('braille dot positions follow the Unicode 2 by 4 layout', () => {
  const expected = [1, 8, 2, 16, 4, 32, 64, 128];
  for (let dot = 0; dot < 8; dot++) {
    const pixels = new Uint8ClampedArray(32);
    pixels.fill(255, dot * 4, dot * 4 + 4);
    assert.equal(pixelsToBraille(pixels, 1, 1)[0].charCodeAt(0), 0x2800 + expected[dot]);
  }
  const white = new Uint8ClampedArray(32).fill(255);
  assert.deepEqual(pixelsToBraille(white, 1, 1), ['⣿']);
  assert.deepEqual(pixelsToBraille(white, 1, 1, { invert: true }), [BRAILLE_BLANK]);
  assert.deepEqual(pixelsToBraille(new Uint8ClampedArray(32), 1, 1), [BRAILLE_BLANK]);
});

test('Twitch payload preserves invisible padding and has no newlines', () => {
  const result = formatTwitch(['⣿⠀', '⠀⣿'], 5);
  assert.equal(result.message, BRAILLE_BLANK.repeat(5) + ' ⣿⠄ ⠄⣿');
  assert.equal(result.preview, BRAILLE_BLANK.repeat(5) + '\n⣿⠄\n⠄⣿');
  assert.equal(result.length, 11);
  assert.equal(result.message.trim(), result.message);
  assert.equal(formatTwitch(['⣿'], 0).message, '⣿');
});

test('photo dithering preserves midtones with increasing dot density', () => {
  function image(gray) {
    return Uint8ClampedArray.from(Array.from({ length: 16 }, () => [gray, gray, gray, 255]).flat());
  }
  function dots(lines) {
    return [...lines.join('')].reduce((sum, char) => sum + (char.charCodeAt(0) - 0x2800).toString(2).replaceAll('0', '').length, 0);
  }
  const dark = pixelsToBraille(image(64), 2, 1);
  const mid = pixelsToBraille(image(128), 2, 1);
  const light = pixelsToBraille(image(192), 2, 1);
  assert.equal(dots(dark), 4);
  assert.equal(dots(mid), 8);
  assert.equal(dots(light), 12);
  assert.equal(dots(pixelsToBraille(image(64), 2, 1, { dither: false })), 0);
  assert.equal(dots(pixelsToBraille(image(64), 2, 1, { invert: true })), 12);
  assert.equal(formatTwitch(dark, 12).length, formatTwitch(mid, 12).length);
});

test('500 character limit includes prefix and row separators', () => {
  assert.equal(formatTwitch(['⣿'.repeat(486)], 13).valid, true);
  assert.equal(formatTwitch(['⣿'.repeat(487)], 13).valid, false);
  const width = fitTwitchWidth(40, 640, 400, 12);
  const rows = outputHeight(width, 640, 400);
  assert.ok(width < 40);
  assert.ok(formatTwitch(Array(rows).fill('⣿'.repeat(width)), 12).valid);
  assert.equal(fitTwitchWidth(24, 640, 400, 12), 24);
  assert.equal(fitTwitchWidth(40, 1, 10000, 40), null);
});
test('rows preserve spaces and line breaks for chat alignment', () => {
  assert.equal(pixelsToAscii(new Uint8ClampedArray([255,255,255,255, 0,0,0,255]), 1, 2), '@\n ');
});
test('aspect ratio accounts for character height and bounds extreme images', () => {
  assert.equal(outputHeight(80, 400, 400), 40);
  assert.equal(outputHeight(80, 400, 200), 20);
  assert.equal(outputHeight(80, 1, 10000), 300);
  assert.equal(outputHeight(20, 10000, 1), 1);
});
