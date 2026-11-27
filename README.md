# Quiznigme
`npm install` puis `npm run dev` (test) ou `npm run build` (version à publier dans `dist/`).

- `public/cat.png` : mascotte (détourée de votre image) · `public/logo.jpg` : logo officiel
- `src/mascot.ts` : animation yeux/bouche · `src/engine.ts` : niveaux, maths générées, progression
- `src/data/francais.ts`, `src/data/enigmes.ts` : questions `[question, bonne réponse, faux 1, faux 2]`

## Thèmes saisonniers
- Halloween : du 1er octobre au 2 novembre · Noël : du 1er au 31 décembre (le reste de l'année : thème normal)
- Réglage des dates et des positions yeux/bouche : `src/seasons.ts`
- Pour tester : ajouter `?theme=halloween` ou `?theme=noel` à l'adresse du site
