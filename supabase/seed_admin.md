# Seed ADMIN — christian.momo@ste-scpb.com

Ne jamais committer le mot de passe utilisateur ni la `service_role` key.

## Migrations d’abord

Depuis la racine du repo (pas besoin de `service_role`) :

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Détails : [`README.md`](README.md).

## Créer l’admin (Dashboard — recommandé)

1. Authentication → Users → Add user  
2. Email : `christian.momo@ste-scpb.com`  
3. Mot de passe : celui que vous choisissez  
4. Puis :

```sql
update public.profiles
set
  role = 'ADMIN',
  full_name = 'Christian Momo',
  email = 'christian.momo@ste-scpb.com',
  updated_at = now()
where email = 'christian.momo@ste-scpb.com';
```

## service_role ?

**Optionnel.** Utile seulement si tu veux créer l’utilisateur via Admin API / script Node.  
Pour migrations CLI + seed Dashboard : **ignore-le**.

## App mobile

Dans `apps/mobile/.env` : `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` seulement.
