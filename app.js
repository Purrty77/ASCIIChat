import { pixelsToAscii, outputHeight, pixelsToBraille, formatTwitch, fitTwitchWidth, enhanceDetails } from './ascii.js';

const $ = id => document.getElementById(id);
let currentImage = null;
let filename = 'image';
let importVersion = 0;
let ascii = '';
let canExport = false;
const status = message => { $('status').textContent = message; };

function render() {
  $('copy-fallback')?.remove();
  const twitch = !$('twitch').checked;
  $('classic-settings').hidden = twitch;
  const width = Number($(twitch ? 'twitch-width' : 'width').value);
  const padding = Number($('twitch-padding').value);
  const contrast = Number($('contrast').value);
  $('width-value').textContent = `${$('width').value} characters`;
  $('contrast-value').textContent = `${contrast.toFixed(1)}×`;
  $('twitch-width-value').textContent = `${$('twitch-width').value} characters`;
  $('twitch-padding-value').textContent = `${padding} characters`;
  $('twitch-settings').hidden = $('twitch-preview-note').hidden = !twitch;
  $('width').disabled = $('palette').disabled = twitch;
  $('twitch-fit').disabled = !currentImage;
  $('preview-title').textContent = twitch ? 'TWITCH PREVIEW · APPROXIMATE' : 'ASCII PREVIEW';
  $('copy').textContent = twitch ? 'Copy for Twitch ↗' : 'Copy ASCII ↗';
  $('share-tip').textContent = twitch ? 'Twitch: paste directly into chat, without a code block. Adjust padding and width if needed.' : 'Tip: paste into a code block to preserve alignment.';
  if (!currentImage) return;
  const height = outputHeight(width, currentImage.width, currentImage.height);
  const canvas = document.createElement('canvas');
  canvas.width = width * (twitch ? 2 : 1);
  canvas.height = height * (twitch ? 4 : 1);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
  let pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  if (twitch && $('twitch-details').checked) pixels = enhanceDetails(pixels, canvas.width, canvas.height);
  const options = { contrast, invert: $('invert').checked, palette: $('palette').value, dither: $('twitch-dither').checked };
  canExport = true;
  if (twitch) {
    const result = formatTwitch(pixelsToBraille(pixels, width, height, options), padding);
    ascii = result.message;
    canExport = result.valid;
    $('art').textContent = result.preview;
    $('twitch-budget').textContent = result.valid ? `${result.length} / 500 characters · padding and separators included.` : `${result.length} / 500 characters · message too long. Click “Fit to 500 characters” or reduce the width.`;
    $('twitch-budget').classList.toggle('over-budget', !result.valid);
  } else {
    ascii = pixelsToAscii(pixels, width, height, options);
    $('art').textContent = ascii;
  }
  $('empty').hidden = true;
  $('dimensions').textContent = `${width} × ${height}`;
  $('count').textContent = twitch ? `${ascii.length} / 500 characters` : `${ascii.length.toLocaleString('en-US')} characters`;
  $('copy').disabled = $('download').disabled = !canExport;
}

async function load(file) {
  const version = ++importVersion;
  if (!file) return;
  if (!file.type.startsWith('image/')) return status('Choose an image file, such as PNG or JPEG.');
  if (file.size > 20 * 1024 * 1024) return status('This image exceeds 20 MB. Choose a smaller file.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (version !== importVersion) return;
    currentImage = image;
    filename = file.name.replace(/\.[^.]+$/, '') || 'image';
    $('source').src = url;
    $('source').hidden = false;
    render();
    status('Image converted. Adjust the settings to refine your art.');
  } catch {
    if (version === importVersion) status('Could not read this image. Try PNG, JPEG, or WebP.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

$('file').addEventListener('change', event => load(event.target.files[0]));
for (const id of ['width', 'contrast', 'palette', 'invert', 'twitch', 'twitch-width', 'twitch-padding', 'twitch-dither', 'twitch-details']) $(id).addEventListener('input', () => { status(''); render(); });
$('twitch-reset').addEventListener('click', () => {
  for (const id of ['twitch-width', 'twitch-padding']) $(id).value = $(id).defaultValue;
  render();
  status('Twitch defaults restored: 20 characters wide and 12 blank characters after your username.');
});
$('twitch-fit').addEventListener('click', () => {
  if (!currentImage) return;
  const fitted = fitTwitchWidth(Number($('twitch-width').value), currentImage.width, currentImage.height, Number($('twitch-padding').value));
  if (fitted === null) return status('This image is too tall for one message. Crop it before importing.');
  $('twitch-width').value = fitted;
  render();
  status('Width adjusted to fit one message. Check alignment in your chat.');
});
for (const type of ['dragenter', 'dragover']) $('drop').addEventListener(type, event => {
  event.preventDefault();
  $('drop').classList.add('dragging');
});
$('drop').addEventListener('dragleave', () => $('drop').classList.remove('dragging'));
$('drop').addEventListener('drop', event => {
  event.preventDefault();
  $('drop').classList.remove('dragging');
  load(event.dataTransfer.files[0]);
});
$('copy').addEventListener('click', async () => {
  if (!canExport) return;
  try {
    await navigator.clipboard.writeText(ascii);
    status(!$('twitch').checked ? 'Twitch message copied, including padding. Paste directly into chat without a code block.' : 'ASCII copied! Paste into a code block with a monospace font.');
  } catch {
    // Select the actual export, not the preview's simulated line breaks.
    let fallback = $('copy-fallback');
    if (!fallback) {
      fallback = document.createElement('textarea');
      fallback.id = 'copy-fallback';
      fallback.setAttribute('aria-label', 'Message to copy manually');
      $('status').after(fallback);
    }
    fallback.value = ascii;
    fallback.focus();
    fallback.select();
    status('Automatic copying is unavailable. Text selected: press Ctrl+C or Cmd+C.');
  }
});
$('download').addEventListener('click', () => {
  if (!canExport) return;
  const url = URL.createObjectURL(new Blob([ascii], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${!$('twitch').checked ? 'twitch' : 'ascii'}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('Text file downloaded.');
});
$('demo').addEventListener('click', () => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#101315';
  ctx.fillRect(0, 0, 640, 400);
  const gradient = ctx.createRadialGradient(280, 135, 10, 320, 200, 160);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#bac5ae');
  gradient.addColorStop(1, '#202a23');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(320, 200, 155, 0, Math.PI * 2);
  ctx.fill();
  canvas.toBlob(blob => { if (blob) load(new File([blob], 'sphere.png', { type: 'image/png' })); });
});

// Initialize mode-specific controls before an image is imported.
render();
