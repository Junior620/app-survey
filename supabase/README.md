# Supabase — migrations depuis ce repo

## Important

| Secret | Pour migrations CLI ? | Dans l’app mobile ? |
|--------|----------------------|---------------------|
| `anon` key | Non | Oui (`EXPO_PUBLIC_…`) |
| `service_role` | **Non** (inutile pour `db push`) | **Jamais** |
| Mot de passe DB | Oui (`supabase link`) | Non |
| Access token CLI | Oui (`supabase login`) | Non |

Le `service_role` ne sert qu’à l’**Admin API** (créer des users en script). Pour appliquer le SQL ici, tu n’en as pas besoin.

## 1. Prérequis

```bash
# déjà dispo via npx
npx supabase --version
```

Une fois :

```bash
npx supabase login
```

(ouvre le navigateur → access token personnel)

## 2. Lier le projet distant

Project ref = sous-domaine de l’URL  
`https://tsttdhoecetcouywjjsf.supabase.co` → `tsttdhoecetcouywjjsf`

Mot de passe DB : Dashboard → **Project Settings → Database → Database password**  
(si oublié : Reset database password)

```bash
cd c:\Users\Christian\AndroidStudioProjects\appsurvey
npx supabase link --project-ref tsttdhoecetcouywjjsf
```

## 3. Pousser les migrations

Fichiers dans [`migrations/`](migrations/) :

- `001_profiles.sql`
- `002_sync_mirrors.sql`

```bash
npx supabase db push
```

Ça applique uniquement les migrations pas encore enregistrées sur le remote.

## 4. Seed admin (sans service_role)

Après les migrations :

1. Dashboard → Authentication → Users → **Add user**  
   `christian.momo@ste-scpb.com` + ton mot de passe  
2. SQL Editor (ou Table Editor) :

```sql
update public.profiles
set role = 'ADMIN', full_name = 'Christian Momo', email = 'christian.momo@ste-scpb.com', updated_at = now()
where email = 'christian.momo@ste-scpb.com';
```

Voir aussi [`seed_admin.md`](seed_admin.md).

## App mobile

`apps/mobile/.env` : URL + **anon** uniquement. Puis `npx expo start --clear`.
