# Catálogo CT

Catálogo de produtos com carrinho e pedido via WhatsApp. Painel em `/admin`.

Stack: Vue 3 + Vite + Supabase + deploy na [Vercel](https://vercel.com).

---

## Variáveis de ambiente

Copie `.env.example` para `.env` (local) ou cadastre na Vercel em **Settings → Environment Variables**:

| Variável | Onde pegar | Exemplo |
|----------|------------|---------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → API → `anon` `public` | `eyJhbG...` |
| `VITE_SUPPLIER_SLUG` | Slug da loja na tabela `suppliers` (único por deploy) | `acme-pecas` |

> Use só a chave **anon**. Nunca coloque a `service_role` no front nem na Vercel.

---

## 1. Supabase (banco)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **SQL Editor** → rode as migrations **nesta ordem** (arquivo por arquivo em `supabase/migrations/`):
   - `20250528000000_init_catalog.sql`
   - `20250528120000_must_change_password.sql`
   - `20250528130000_security_constraints.sql`
   - `20250528140000_fix_products_rls.sql`
   - `20250528150000_product_multiple_images.sql`
3. Confirme o bucket **`product-images`** em Storage (público para leitura).
4. **Authentication → Users → Add user**:
   - E-mail e senha do cliente (admin).
   - **User Metadata** (JSON), alinhado ao slug do deploy:
     ```json
     { "slug": "acme-pecas", "name": "Acme Peças" }
     ```
   - O trigger cria a linha em `suppliers` com `must_change_password = true` (troca de senha no 1º login).
5. Em **Table Editor → `suppliers`**, preencha para a loja:
   - `whatsapp` (com DDD; ex.: `5511999998888`)
   - `phone`, `instagram`, `logo_url` (opcionais)
6. (Opcional) **Authentication → URL Configuration**: adicione a URL da Vercel em **Site URL** e **Redirect URLs** se for usar links de e-mail do Supabase.

---

## 2. Local

```bash
npm install
cp .env.example .env
# edite o .env
npm run dev
```

- Catálogo: `http://localhost:5173/`
- Admin: `http://localhost:5173/admin`

---

## 3. Deploy na Vercel

1. Suba o código para um repositório Git (GitHub, GitLab, etc.).
2. [vercel.com/new](https://vercel.com/new) → **Import** do repositório.
3. A Vercel detecta Vite; confira:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. **Environment Variables** → as três `VITE_*` (Production; repita em Preview se quiser).
5. **Deploy**.
6. Teste: `/` (catálogo) e `/admin` (login). Passkey exige **HTTPS** (já vem na Vercel).

Domínio próprio: **Project → Settings → Domains**.

O arquivo `vercel.json` já redireciona rotas do Vue Router para `index.html`.

---

## Checklist — o que **pedir ao cliente**

| Item | Detalhe |
|------|---------|
| Nome da loja | Aparece no site e no título |
| Slug | Só letras minúsculas, números e hífen (ex.: `loja-joao`). **Tem que ser igual** ao `VITE_SUPPLIER_SLUG` |
| E-mail do admin | Para criar o usuário no Supabase |
| Senha inicial | Você define e entrega; ele troca no 1º acesso |
| WhatsApp com DDD | Ex.: `5511987654321` (com código do país 55) |
| Telefone / Instagram | Opcionais (header) |
| Logo | URL ou arquivo para você subir no Storage |
| Produtos iniciais | Código, descrição, estoque, preço, fotos |
| Domínio | Se quiser `www.loja.com.br` em vez do `*.vercel.app` |

**Quem cria a conta Supabase?** Defina antes: sua conta (você repassa acesso) ou conta do cliente (ele te convida como colaborador).

---

## Checklist — o que **entregar ao cliente**

| Item | Exemplo |
|------|---------|
| URL do catálogo | `https://loja.vercel.app` |
| URL do admin | `https://loja.vercel.app/admin` |
| Login | E-mail + senha temporária |
| Primeiro acesso | Trocar senha; opcional: cadastrar **passkey** no admin |
| Como cadastrar produtos | Admin → formulário + fotos |
| WhatsApp | Pedido sai pelo botão do carrinho (número vem do cadastro da loja no banco) |
| Suporte | Seu contato para alterar slug, migração ou novo ambiente |

**Não envie:** `service_role`, senha do painel Supabase, `.env` com chaves.

---

## Um deploy = uma loja

Cada instalação na Vercel usa **um** `VITE_SUPPLIER_SLUG` e aponta para **um** registro em `suppliers`. Várias lojas no mesmo Supabase = vários projetos Vercel (ou slugs diferentes com builds separados).

---

## Scripts

| Comando | Uso |
|---------|-----|
| `npm run dev` | Desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Testar build local |
