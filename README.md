# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b2cf308e-cfa7-488d-ba9e-f3d1d24e98d2

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b2cf308e-cfa7-488d-ba9e-f3d1d24e98d2) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b2cf308e-cfa7-488d-ba9e-f3d1d24e98d2) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Deploy em VPS com Docker

O app é uma SPA Vite pura — o "backend" fica no Supabase (externo). O container
só serve os estáticos via nginx.

### Requisitos na VPS
- Docker 24+ e docker compose v2
- Porta 80/443 disponível (ou proxy reverso como Traefik/Caddy/Nginx na frente)

### 1. Clonar e configurar env

```sh
git clone git@github.com:Eryk-dev/levertalents.git
cd levertalents
cp .env.example .env
# edite .env com as credenciais do seu projeto Supabase
```

### 2. Build e subir

```sh
docker compose up -d --build
```

A aplicação fica em `http://<ip-da-vps>:8080`. Mude `HTTP_PORT` no `.env` para
outra porta se precisar.

### 3. Secrets de Edge Functions

Edge Functions (Supabase) NÃO rodam na VPS — rodam na própria Supabase. Defina
suas secrets via CLI (uma vez só):

```sh
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... OPENAI_API_KEY=... LOVABLE_API_KEY=...
```

### 4. HTTPS / domínio

Recomendo um proxy reverso na frente. Exemplo rápido com Caddy:

```caddy
app.seudominio.com {
  reverse_proxy localhost:8080
}
```

O Caddy cuida do TLS automaticamente via Let's Encrypt.

### Observações
- As `VITE_*` são compiladas no bundle — cada mudança de env exige rebuild
  (`docker compose up -d --build`).
- O nginx já inclui SPA fallback, gzip, cache longo em `/assets/*` e
  `no-store` em `index.html`.
- Health check do container: `GET /healthz` devolve `ok`.
