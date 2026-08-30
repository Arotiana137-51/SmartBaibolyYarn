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

## Permission de notification (rappel de lecture optionnel)

Fonctionnalité « Ora famakiana tiana » : rappel(s) de lecture quotidien/hebdomadaire,
programmé(s) localement sur l'appareil (notifee), désactivé par défaut.

### Résumé factuel
- La permission de notification (Android `POST_NOTIFICATIONS`, autorisation
  locale iOS) n'est demandée QUE si l'utilisateur active ce rappel optionnel
  dans le menu — jamais au premier lancement.
- Aucune donnée n'est collectée ni transmise pour cette fonctionnalité : la
  programmation et le déclenchement se font entièrement sur l'appareil, sans
  serveur ni backend.
- Pas de géolocalisation, pas d'identifiant publicitaire, pas de tracking.

### Google Play Console — Data safety
- Ne modifie aucune réponse existante côté « Data collected » : cette
  fonctionnalité ne collecte ni ne transmet rien.
- Si le formulaire de la version Play Console utilisée demande de lister les
  permissions sensibles utilisées : déclarer la notification comme utilisée
  uniquement pour un rappel local optionnel, sans lien avec de la publicité
  ou du tracking.
- Le manifest Android déclare aussi `SCHEDULE_EXACT_ALARM` via la librairie
  notifee, mais elle est explicitement retirée
  (`tools:node="remove"` dans `android/app/src/main/AndroidManifest.xml`)
  car l'app n'utilise que des rappels inexacts — rien à déclarer/justifier
  pour cette permission côté review.

### App Store Connect — App Privacy Details
- Aucune nouvelle Data Type à déclarer : la fonctionnalité ne collecte rien
  (notification locale uniquement, pas d'APNs/push distant).

### In-app disclosure
- Voir la section « Permissions » / « Fahazoan-dalana » de la politique de
  confidentialité (in-app et `privacy-policy.html`).

## In-app disclosure (déjà dans l’UI)

Texte recommandé :
- "En envoyant, tu transmets la référence, le texte affiché et ton commentaire afin de corriger les erreurs. Aucune donnée de localisation n’est collectée."
