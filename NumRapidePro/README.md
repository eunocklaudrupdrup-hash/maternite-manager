# NumRapidePro

Application mobile web (PWA) de demonstration, separee du projet clinique.

Fonctionnalites:

- connexion et creation de compte par numero de telephone + OTP
- depot wallet via MTN, MOOV, Celtis ou Visa
- achat de numeros par pays si le solde est suffisant
- panneau admin pour fixer les prix, valider les depots et filtrer par jour, mois, annee

Important:

- aucune extraction d'API depuis `temp-number.com`
- aucun scraping tiers
- fournisseur de numerotation simule en `demo-safe`

## Lancement

```bash
npm install
npm run dev
```

Puis ouvrir `http://localhost:4010`.

## Comptes demo

- Admin: `+22997000000`
- Client: `+22996000001`

Le code OTP est simule et renvoye par l'API pour la demonstration locale.
