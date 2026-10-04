# SuscriPet

Aplicación monolítica de suscripciones para mascotas: Express sirve las páginas HTML y la API REST; Mongoose conecta los datos de usuarios, mascotas, planes, suscripciones, productos, órdenes, promociones, servicios, costos y notificaciones a MongoDB.

## Requisitos

- Node.js 18 o posterior y npm.
- MongoDB local o una URI de MongoDB Atlas.

## Instalación

```bash
npm install
```

Copia `.env.example` como `.env` y configura al menos `MONGODB_URI` y `JWT_SECRET`. Usa un secreto aleatorio largo y cambia la contraseña administrativa antes de un despliegue.

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/suscripet
JWT_SECRET=secreto-aleatorio-largo
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@suscripet.co
ADMIN_PASSWORD=ChangeMe123!
```

## Tailwind y servidor

En una terminal ejecuta `npm run css:watch` mientras desarrollas o `npm run css:build` para generar el CSS de producción. En otra terminal:

```bash
npm run seed
npm run dev
```

Abre `http://localhost:3000`. El servidor también está disponible con `npm start`.

## Cuentas de demostración

- Administración: el correo configurado en `ADMIN_EMAIL` en `.env` (en esta instalación, `admin123@gmail.com`) / valor de `ADMIN_PASSWORD` en `.env`.
- Cliente: `cliente@suscripet.co` / `Cliente123!`.

El seeder actualiza la contraseña del administrador cada vez que lo ejecutas, usando `ADMIN_PASSWORD` del archivo `.env`; así también permite restablecer el acceso. En la configuración de ejemplo, el acceso es `admin@suscripet.co` / `ChangeMe123!`. Cambia esa contraseña antes de usar el proyecto fuera de tu equipo.

Los planes que crea el seeder son Básico ($39.900 COP/mes), Premium ($69.900 COP/mes) y VIP ($89.900 COP/mes). El catálogo público consulta sus precios y beneficios desde MongoDB.

## API principal

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`.
- `GET /api/plans`, `/api/products`, `/api/promotions`, `/api/services`.
- Rutas autenticadas: `/api/users/me`, `/api/pets`, `/api/subscriptions/me`, `/api/subscriptions`, `/api/orders`.
- Administración protegida por rol: `/api/admin/overview`, `/api/admin/initialize` y CRUD en `/api/admin/{users,pets,plans,products,subscriptions,promotions,services,costs,orders,notifications}`.
- Diagnóstico: `GET /health`.

## Estructura

```text
server/       configuración MongoDB, modelos, middleware, rutas y seeder
public/       páginas HTML públicas, de usuario y administración
public/css/   entrada Tailwind y salida compilada
public/js/    cliente API y módulos vanilla por área
```

Desde `/admin/index.html` puedes inicializar los datos de demostración sin restablecer la contraseña del administrador. En los módulos administrativos puedes crear, editar y eliminar registros; para editar una suscripción puedes ajustar el estado, plan, mascota, precio, fechas e historial.

Los pagos son de demostración: el usuario puede solicitar una suscripción, que se registra como pendiente; no se cobra dinero. En desarrollo, el token de recuperación se imprime en la consola del servidor. Configura un proveedor de correo antes de ofrecer recuperación de cuenta a usuarios reales.
