# ASCCI

Une application de bureau Windows en français pour transformer une image en art ASCII et la partager dans un chat. Les images sont traitées localement. L’interface web reste disponible pour le développement.

## Démarrer

Pour utiliser l’application, ouvrir l’exécutable portable `ASCCI-0.1.0-Windows.exe` produit dans `dist/`. Aucun serveur ni installation de Node.js n’est nécessaire pour l’utilisateur.

Pour développer, avec une version LTS récente de Node.js :

```sh
npm ci
npm start
```

Une fenêtre ASCCI s’ouvre. Importer une image ou essayer la démo, régler la largeur, le contraste et la palette, puis copier le résultat ou télécharger le fichier `.txt`.

Pour produire l’exécutable Windows : `npm run build:win`. Cette première version n’est pas signée numériquement. Pour lancer la version navigateur : `npm run web`, puis ouvrir http://localhost:3000.

## Partager dans un chat

Coller le texte dans un bloc de code (trois accents graves avant et après le texte) pour préserver les espaces et l’alignement. Une largeur de 40 à 80 caractères convient mieux aux petits écrans. Les plateformes peuvent limiter la longueur des messages ; réduire la largeur si nécessaire. L’aperçu utilise du texte clair sur fond sombre : inverser les nuances pour un fond clair.

## Fonctionnement

### Mode Twitch (bêta)

**Renforcer les traits**, activé par défaut, étire la plage de luminosité utile puis accentue les différences locales. Il aide à distinguer les traits des photos peu contrastées sans augmenter la taille du message. Pour un rendu moins pointillé, comparer avec **Préserver les nuances** désactivé. Une source minuscule reste limitée : l’accentuation ne recrée pas les détails absents.

**Préserver les nuances de l’image**, activé par défaut, utilise un tramage ordonné : la densité des points traduit la luminosité au lieu de transformer tous les tons sombres en cellules vides. Ce réglage convient aux photos et peut être désactivé pour retrouver le seuil noir/blanc, utile aux logos. Il ne change ni les dimensions ni le nombre de caractères du message.

Cocher **Compatible Twitch** active une conversion en braille Unicode (2 × 4 pixels par caractère), avec une largeur indépendante de l’ASCII classique. Un préfixe de caractères braille vides U+2800 sert à remplir la fin de la ligne du pseudo. Régler **Blanc après le pseudo** selon la place restante après le pseudo et les badges ; régler **Largeur du dessin** selon le chat.

Le réglage initial est de **20 caractères de large et 12 caractères de remplissage**, testé manuellement dans le chat de l’utilisateur. Dans le dessin uniquement, les cellules vides sont remplacées par un point bas `⠄` (U+2804) : les captures de calibration montrent que cela corrige le décalage des bords sur ce client. Le préfixe reste invisible et la conversion ASCII classique reste inchangée.

Le bouton **Rétablir les valeurs par défaut** restaure ces deux réglages et recalcule immédiatement le résultat, sans changer l’image ni le contraste.

L’export est **un seul message sans retours à la ligne**, avec un espace entre les rangées pour permettre le retour automatique. Coller directement dans Twitch, sans bloc de code. L’aperçu montre les lignes souhaitées, pas une simulation exacte du chat. Aucune largeur ne peut garantir un alignement identique pour tous : fenêtre, police, zoom, badges et client peuvent changer le rendu, y compris celui des caractères braille vides.

La [documentation Twitch](https://dev.twitch.tv/docs/api/reference/#send-chat-message) limite le message à **500 caractères**. Le compteur inclut le préfixe et les séparateurs ; copie et téléchargement sont bloqués au-delà. **Adapter à 500 caractères** réduit la largeur en conservant les proportions de conversion. Les images trop verticales peuvent nécessiter un recadrage. Aucun message n’est envoyé automatiquement.

### Conversion classique

Canvas redimensionne l’image, calcule la luminosité de chaque pixel et la remplace par un caractère de densité correspondante. La hauteur tient compte des proportions des caractères monospace. La transparence est composée sur fond noir. Les fichiers sont limités à 20 Mo et le résultat à 300 lignes ; les images très verticales peuvent donc être comprimées.

## Vérifier

```sh
npm test
```

## Hébergement

Les fichiers `index.html`, `style.css`, `app.js` et `ascii.js` sont statiques et peuvent être hébergés sur GitHub Pages. Aucun serveur applicatif ni clé API n’est nécessaire. Le serveur Node fourni sert uniquement au développement local.
