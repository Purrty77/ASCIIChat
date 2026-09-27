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
  const twitch = $('twitch').checked;
  const width = Number($(twitch ? 'twitch-width' : 'width').value);
  const padding = Number($('twitch-padding').value);
  const contrast = Number($('contrast').value);
  $('width-value').textContent = `${$('width').value} caractères`;
  $('contrast-value').textContent = `${contrast.toFixed(1)}×`;
  $('twitch-width-value').textContent = `${$('twitch-width').value} caractères`;
  $('twitch-padding-value').textContent = `${padding} caractères`;
  $('twitch-settings').hidden = $('twitch-preview-note').hidden = !twitch;
  $('width').disabled = $('palette').disabled = twitch;
  $('twitch-fit').disabled = !currentImage;
  $('preview-title').textContent = twitch ? 'APERÇU TWITCH · INDICATIF' : 'APERÇU ASCII';
  $('copy').textContent = twitch ? 'Copier pour Twitch ↗' : 'Copier l’ASCII ↗';
  $('share-tip').textContent = twitch ? 'Twitch : colle directement le message, sans bloc de code. Ajuste le blanc et la largeur si nécessaire.' : 'Astuce : colle le résultat dans un bloc de code pour garder l’alignement.';
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
    $('twitch-budget').textContent = result.valid ? `${result.length} / 500 caractères · remplissage et séparateurs inclus.` : `${result.length} / 500 caractères · message trop long. Clique sur « Adapter à 500 caractères » ou réduis la largeur.`;
    $('twitch-budget').classList.toggle('over-budget', !result.valid);
  } else {
    ascii = pixelsToAscii(pixels, width, height, options);
    $('art').textContent = ascii;
  }
  $('empty').hidden = true;
  $('dimensions').textContent = `${width} × ${height}`;
  $('count').textContent = twitch ? `${ascii.length} / 500 caractères` : `${ascii.length.toLocaleString('fr-FR')} caractères`;
  $('copy').disabled = $('download').disabled = !canExport;
}

async function load(file) {
  const version = ++importVersion;
  if (!file) return;
  if (!file.type.startsWith('image/')) return status('Choisis un fichier image, par exemple PNG ou JPEG.');
  if (file.size > 20 * 1024 * 1024) return status('Cette image dépasse 20 Mo. Choisis une image plus légère.');
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
    status('Image convertie. Ajuste les réglages pour affiner le résultat.');
  } catch {
    if (version === importVersion) status('Impossible de lire cette image. Essaie un fichier PNG, JPEG ou WebP.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

$('file').addEventListener('change', event => load(event.target.files[0]));
for (const id of ['width', 'contrast', 'palette', 'invert', 'twitch', 'twitch-width', 'twitch-padding', 'twitch-dither', 'twitch-details']) $(id).addEventListener('input', () => { status(''); render(); });
$('twitch-reset').addEventListener('click', () => {
  for (const id of ['twitch-width', 'twitch-padding']) $(id).value = $(id).defaultValue;
  render();
  status('Réglages Twitch rétablis : largeur de 20 caractères et 12 blancs après le pseudo.');
});
$('twitch-fit').addEventListener('click', () => {
  if (!currentImage) return;
  const fitted = fitTwitchWidth(Number($('twitch-width').value), currentImage.width, currentImage.height, Number($('twitch-padding').value));
  if (fitted === null) return status('Image trop verticale pour un seul message. Recadre l’image avant de l’importer.');
  $('twitch-width').value = fitted;
  render();
  status('Largeur ajustée pour tenir dans un message. Vérifie ensuite l’alignement dans ton chat.');
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
    status($('twitch').checked ? 'Message Twitch copié, remplissage inclus. Colle-le directement dans le chat, sans bloc de code.' : 'ASCII copié ! Colle-le dans un bloc de code avec une police à chasse fixe.');
  } catch {
    // Select the actual export, not the preview's simulated line breaks.
    let fallback = $('copy-fallback');
    if (!fallback) {
      fallback = document.createElement('textarea');
      fallback.id = 'copy-fallback';
      fallback.setAttribute('aria-label', 'Message à copier manuellement');
      $('status').after(fallback);
    }
    fallback.value = ascii;
    fallback.focus();
    fallback.select();
    status('Copie automatique indisponible. Le texte est sélectionné : utilise Ctrl+C ou Cmd+C.');
  }
});
$('download').addEventListener('click', () => {
  if (!canExport) return;
  const url = URL.createObjectURL(new Blob([ascii], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${$('twitch').checked ? 'twitch' : 'ascii'}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('Fichier texte téléchargé.');
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
