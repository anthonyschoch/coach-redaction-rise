# Coach de rédaction — démonstration Rise

Chatbot de rétroaction formative en français, conçu pour être intégré dans Articulate Rise 360. L’étudiant colle son brouillon, reçoit un premier retour fondé sur la grille, puis peut poser jusqu’à cinq questions. La conversation peut être téléchargée en TXT.

## Périmètre

- Interface texte uniquement, responsive et compatible iframe
- Consigne et critères configurables dans `lib/assessment.js`
- Préprompt pédagogique protégé côté serveur dans `lib/providers.js`
- API de chat dans `server.js`
- Mode démonstration fonctionnant sans clé
- Adaptateur compatible OpenAI Chat Completions
- Aucun compte étudiant, aucune base de données et aucun stockage de conversation

## Lancer localement

Prérequis : Node.js 20 ou version ultérieure.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Configuration

Le mode par défaut ne contacte aucun fournisseur externe :

```dotenv
AI_PROVIDER=mock
```

Pour connecter une API compatible OpenAI :

```dotenv
AI_PROVIDER=openai-compatible
AI_API_KEY=replace-me
AI_MODEL=gpt-5-mini
AI_BASE_URL=https://api.openai.com/v1
MAX_DRAFT_CHARS=15000
MAX_MESSAGE_CHARS=2000
MAX_CHAT_TURNS=5
```

La clé est utilisée exclusivement par le serveur. Elle ne doit jamais être ajoutée au dépôt GitHub.

## Déployer sur Render

1. Créer un dépôt GitHub contenant le projet.
2. Dans Render, sélectionner **New → Web Service** et connecter le dépôt.
3. Choisir une région approuvée par l’établissement.
4. Définir :
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Health Check Path : `/api/health`
5. Ajouter les variables d’environnement.
6. Déployer et tester l’URL HTTPS fournie par Render.

Pour une démonstration gratuite, conserver `AI_PROVIDER=mock`. Pour une démonstration avec une véritable IA, ajouter la clé et les paramètres du fournisseur.

## Intégrer ensuite dans Rise

Dans Rise 360, ajouter **Multimédia → Intégrer**, coller l’URL HTTPS Render, choisir la pleine largeur et une hauteur initiale de 800 à 900 px.

```html
<iframe
  src="https://votre-projet.onrender.com"
  title="Coach de rédaction formative"
  width="100%"
  height="900"
  style="border:0"
  loading="lazy"
></iframe>
```

L’application détecte automatiquement l’iframe et adapte l’en-tête et la mise en page.

## Vérifications avant un pilote étudiant

- Faire valider le préprompt, la consigne et les critères par l’équipe pédagogique.
- Vérifier le DPA, la région de traitement et les paramètres de conservation du fournisseur d’IA.
- Demander aux étudiants de ne pas fournir de données personnelles.
- Ajouter une limitation de débit au niveau de l’hébergeur si l’URL devient publique.
- Tester l’accessibilité et le fonctionnement avec le domaine Rise réel.
- Prévoir une procédure si le modèle ou l’hébergeur est momentanément indisponible.
