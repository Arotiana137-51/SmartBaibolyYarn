# Store Privacy Declarations — SmartBaibolyYarn

Ce document sert d’aide-mémoire pour remplir :
- Google Play Console → Data safety
- App Store Connect → App Privacy Details

## Résumé factuel (à utiliser dans les formulaires)

- La fonctionnalité « Signaler » permet d’envoyer des rapports d’erreurs de contenu.
- Les rapports sont **anonymes** : pas de compte, pas de nom/email collectés.
- Les rapports contiennent uniquement :
  - Une référence (livre/chapitre/verset ou numéro de cantique/couplet)
  - Le texte concerné affiché dans l’app
  - Le commentaire saisi par l’utilisateur
  - Un identifiant technique de rapport + date/heure
- Aucune collecte de localisation.
- Pas de tracking publicitaire, pas d’identifiant publicitaire (IDFA/AAID).

## Google Play Console — Data safety (suggestion)

### Data collected
- User provided content
  - Commentaire de signalement
- (Optionnel selon interprétation) Other content
  - Texte biblique/cantique transmis avec le signalement

### Purposes
- App functionality
- Developer communications / Support (si cette option existe dans ta version du formulaire)

### Data processing
- Data is collected (transmitted off device)
- Not used for advertising
- Not used for tracking

### Data sharing
- Si tu envoies vers une infrastructure Google (Apps Script/Sheets) : considérer que c’est un tiers « service provider ». Selon les questions Play, tu peux déclarer comme partagé si cela sort de ton entité.

## App Store Connect — App Privacy Details (suggestion)

### Data Types
- User Content
  - Customer Support (signalement)

### Linked to the User
- **No** (pas de compte/identité, pas d’email/nom)

### Tracking
- **No**

### Notes
- "Collect" chez Apple = envoyé hors de l’app et stocké au-delà du temps nécessaire à la requête. Ici oui, car le signalement est stocké côté serveur pour correction.

## In-app disclosure (déjà dans l’UI)

Texte recommandé :
- "En envoyant, tu transmets la référence, le texte affiché et ton commentaire afin de corriger les erreurs. Aucune donnée de localisation n’est collectée."
