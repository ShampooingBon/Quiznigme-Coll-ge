# Espace Collège — mise en route (à faire une seule fois)

1. **Firebase → Authentication → Sign-in method** : activer **E-mail / Mot de passe** (et seulement celui-là).
2. **Firebase → Firestore Database** : créer la base si ce n'est pas fait.
3. **Firestore → onglet Rules** : tout effacer, puis coller le contenu du fichier `firestore.rules` → **Publish**.
   (Ouvrir le fichier dans un éditeur de texte, Ctrl+A, Ctrl+C. Ne rien ajouter avant `rules_version`.)
4. **Les 4 clés** (Paramètres du projet → Vos applications → Configuration) :
   `apiKey`, `authDomain`, `projectId`, `appId`
   - sur Vercel : Settings → Environment Variables → ajouter `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, puis **Redeploy**
   - en local : copier `.env.example` en `.env` et remplir.
5. Authentication → Settings → Authorized domains : `quiznigme.vercel.app`.

Sans ces clés, le bouton « Espace Collège » affiche un message au lieu de planter ; le reste du jeu fonctionne normalement.

Fichiers : `src/college.ts` (écrans), `src/cloud.ts` (Firebase), `src/ui.ts` (briques partagées avec le jeu).
