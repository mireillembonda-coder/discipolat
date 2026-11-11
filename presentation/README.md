# Vidéo de présentation Discipolat

- `video.html` : la vidéo, scène par scène (HTML animé). Ouvre-la dans un navigateur pour la voir défiler.
- `render.js` : transforme `video.html` en MP4 (`node render.js out/discipolat.mp4`). Il faut Playwright et ffmpeg.
- `texte-voix-off.md` : le texte à lire, avec le minutage de chaque scène.

Les captures d'écran (`shots/`) et la vidéo produite (`out/`) ne sont pas dans le dépôt, parce qu'elles contiennent des noms de disciples et le dépôt est public.
Pour refaire la vidéo, mets les captures recadrées dans `presentation/shots/` : accueil, quotidien, programmes, inscription1, inscription2, sup-semaine, sup-demandes, sup-reglages, sup-criteres.

Pour changer la durée d'une scène, modifie le tableau `SCENES` en bas de `video.html`.

## Musique de fond

`musique.py` crée une musique douce (nappe et piano, en Ré majeur), calculée par le programme, donc sans droits d'auteur :
`python3 presentation/musique.py musique.wav 131`. Elle est ensuite mixée sous la voix avec ffmpeg : la musique baisse automatiquement quand la voix parle.
