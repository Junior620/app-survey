# Checklist manuelle — sync APK (EAS / local)

Build de référence EAS : https://expo.dev/accounts/app-survey/projects/scpb-survey/builds/291d2e07-18c4-4513-b38c-4b96c236e2f3

Installer l’APK (EAS ou `android/app/build/outputs/apk/release/app-release.apk`), se connecter avec un compte réel, puis cocher :

## En ligne

1. [ ] Ouvrir l’onglet Sites — la ligne sync (SyncStatusLine) est visible.
2. [ ] Créer un site (ou planteur) — message « envoi automatique ».
3. [ ] Sans appuyer sur Synchroniser, ouvrir l’onglet Synchro sous ~5 s : la file diminue / se vide (auto-sync).
4. [ ] SyncHeroCard affiche « Tout est synchronisé » ou passe de « Données à envoyer » à synced.
5. [ ] Pull-to-refresh Sites : pas de spinner bloquant ; sites locaux restent visibles.

## Hors ligne

6. [ ] Activer le mode avion.
7. [ ] Créer une donnée — reste en file locale (pending).
8. [ ] Hero sync = « hors connexion » ; bouton Synchroniser désactivé / refuse.
9. [ ] Désactiver le mode avion — sous ~30 s (poll) ou au retour app, la file se vide.

## Conflits & CLMRS

10. [ ] Si la sync signale des conflits > 0, le CTA mène à S51 (résolution).
11. [ ] Soumettre une enquête déclenchant un cas critique — alerte enquêteur avec liens S75 / S76.
12. [ ] Sur un cas `RENVOYE_ENQUETEUR`, au focus Sites (rôle agent) : alerte « Retour enquêteur ».
13. [ ] Responsable durabilité : bouton « Accuser réception » sur S76 → ack local + entrée outbox.

## Build local (Windows)

Si Gradle échoue sur chemins > 260 caractères :

```bat
mklink /J C:\as C:\Users\Christian\AndroidStudioProjects\appsurvey
cd /d C:\as\apps\mobile\android
gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a
```
