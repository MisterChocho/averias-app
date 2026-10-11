# Atención de averías — Grupo 04 (Agile Development, UPAO)

Sistema de gestión de técnicos y órdenes de servicio para una empresa de telecomunicaciones.

**Tecnologías:** Next.js 16 (JavaScript) · Supabase (PostgreSQL, login y archivos) · Tailwind CSS · Vercel. Todas tienen plan gratuito, así que el proyecto cuesta S/ 0.

---

## 1. Crear las cuentas (una sola vez)

| Quién | Cuenta | Para qué |
|---|---|---|
| Todos | [GitHub](https://github.com) con el correo UPAO + [Student Developer Pack](https://education.github.com/pack) | Subir y compartir el código |
| Uno (el que crea el proyecto) | [Supabase](https://supabase.com) (entrar con GitHub) | Base de datos y login |
| Uno | [Vercel](https://vercel.com) (entrar con GitHub) | Publicar el sistema en internet |
| Todos | [Node.js LTS](https://nodejs.org) y [VS Code](https://code.visualstudio.com) instalados | Programar en su computadora |

## 2. Configurar Supabase (lo hace una persona)

1. En Supabase: **New project**. Nombre: `averias-grupo04`; región: la más cercana (por ejemplo, São Paulo). Guarden la contraseña de la base de datos.
2. Abran **SQL Editor** y ejecuten los archivos de la carpeta `supabase/` **en este orden**. Para cada uno: copien todo su contenido, péguenlo y pulsen **Run**.
   1. `01_schema.sql` → crea las tablas.
   2. `02_seguridad.sql` → define quién puede ver o modificar cada tabla.
   3. `03_datos_prueba.sql` → carga zonas, tipos de avería, guías, clientes y técnicos de ejemplo.
3. **Crear los usuarios de prueba:** entren a **Authentication → Users → Add user → Create new user**, marquen **Auto Confirm User** y creen estas 4 cuentas:
   - `agente@demo.com`
   - `gerente@demo.com`
   - `tecnico@demo.com`
   - `cliente@demo.com`
4. Vuelvan al **SQL Editor** y ejecuten el bloque comentado que está al final de `03_datos_prueba.sql` (quiten los `--` del inicio de cada línea). Así cada cuenta recibe su rol.
5. Entren a **Project Settings → API** y copien dos valores: **Project URL** y la clave **anon public**.

## 3. Correr el proyecto en su computadora (cada integrante)

> Quien sube el proyecto por primera vez no hace `git clone`: abre la carpeta del proyecto que recibió, ejecuta `npm install`, hace el paso 4 y continúa desde `cp .env.example .env.local`.

```bash
git clone https://github.com/USUARIO/averias-app.git
cd averias-app
npm install
cp .env.example .env.local     # en Windows: copy .env.example .env.local
```

Abran `.env.local` y peguen los dos valores de Supabase del paso 2.5. Luego ejecuten:

```bash
npm run dev
```

Abran http://localhost:3000 e ingresen con cualquiera de las 4 cuentas. Cada rol ve su propio menú.

> **Importante:** `.env.local` no se sube a GitHub (está en `.gitignore`). Cada integrante crea el suyo.

## 4. Subir a GitHub (lo hace una persona, una vez)

1. En GitHub: **New repository** → `averias-app` (privado) → **Create**.
2. En la carpeta del proyecto, ejecuten:
   ```bash
   git add .
   git commit -m "JOJO-52 Preparar entorno de desarrollo"
   git branch -M main
   git remote add origin https://github.com/USUARIO/averias-app.git
   git push -u origin main
   ```
3. En **Settings → Collaborators**, agreguen a los otros 4 integrantes.

## 5. Publicar en Vercel (tareas "Desplegar en la web")

1. En Vercel: **Add New → Project → Import** el repositorio `averias-app`.
2. En **Environment Variables**, agreguen `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los mismos valores del `.env.local`.
3. Pulsen **Deploy**. Desde ahí, cada `push` a `main` se publica solo.
4. En Supabase, entren a **Authentication → URL Configuration** y pongan como **Site URL** la dirección que les dio Vercel.

## 6. Cómo trabajamos en equipo

- **Una rama por subtarea de Jira**, por ejemplo:
  ```bash
  git checkout -b JOJO-44-backend-registrar-averia
  ```
- **El commit empieza con la clave de Jira**, por ejemplo `JOJO-44 Registrar avería con código automático`. Así se puede rastrear cada cambio hasta su subtarea.
- Al terminar: `git push` → en GitHub, **Pull Request** hacia `main` → otro integrante lo revisa y lo acepta.
- Antes de empezar cada día, actualicen su copia:
  ```bash
  git checkout main
  git pull
  ```

## 7. Estructura del proyecto

```
supabase/                    Scripts SQL (ejecutar en orden en Supabase)
src/
  proxy.js                   Protege las rutas: sin sesión → /login
  lib/
    supabase/                Conexión a Supabase (navegador, servidor y proxy)
    auth.js                  getUsuarioActual() y requireRol("agente"…)
    menus.js                 Menú de cada rol y la HU de cada opción
  components/                AppShell (barra + menú), PanelRol, Pendiente
  app/
    login/                   Pantalla de ingreso
    agente/  gerente/  tecnico/  cliente/
             └── una carpeta por módulo (clientes, averias, ordenes…)
```

## 8. Cómo programar una historia de usuario

1. Abran la página del módulo, por ejemplo `src/app/agente/clientes/page.js` (HU01 y HU02).
2. Reemplacen `<Pendiente … />` por su pantalla.
3. Para **leer datos** en una página del servidor:
   ```js
   import { createClient } from "@/lib/supabase/server";

   export default async function Clientes() {
     const supabase = await createClient();
     const { data: clientes, error } = await supabase
       .from("clientes")
       .select("codigo, nombre_completo, documento, telefono")
       .order("nombre_completo");
     // ...mostrar la tabla
   }
   ```
4. Para **guardar datos**, usen una Server Action (un archivo `actions.js` con `"use server"`), igual que en `src/app/login/actions.js`.
5. Los permisos ya están en la base de datos (`02_seguridad.sql`). Por ejemplo, un cliente nunca verá las órdenes de otro aunque el código se equivoque.

## Tablas principales

| Tabla | Historias |
|---|---|
| `clientes` | HU01, HU02 |
| `averias`, `tipos_averia`, `guias`, `guia_pasos` | HU03, HU04, HU15, HU16 |
| `valoraciones` | HU05 |
| `ordenes` | HU06–HU08, HU12, HU17, HU18, HU24 |
| `tecnicos`, `tecnico_zonas`, `historial_zonas` | HU09–HU11 |
| `atenciones`, `evidencias` (+ bucket `evidencias`) | HU13, HU14 |
| `calificaciones` | HU19 |
| `notificaciones` | HU07, HU08 |
| `historial_estados` (se llena solo) | HU20, HU21, HU22 |
