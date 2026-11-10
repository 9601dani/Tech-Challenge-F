# ShopCart Frontend

Frontend de ShopCart desarrollado con React, TypeScript, Vite y Tailwind CSS.

## Instalación y ejecución

### Requisitos

- Node.js 24 LTS o superior.
- npm.
- Backend ejecutándose en `http://localhost:3000`.

### Clonar e instalar

```bash
git clone https://github.com/9601dani/Tech-Challenge-F.git
cd Tech-Challenge-F
npm install
```

Crear `.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_COMPANY_ID=1
```

### Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible normalmente en `http://localhost:5173`.

### Validar y generar producción

```bash
npm run build
npm run lint
```

## Librerías principales

| Librería | Uso |
|---|---|
| `react` y `react-dom` | Construcción de la interfaz. |
| `react-router-dom` | Rutas y navegación entre módulos. |
| `sweetalert2` | Alertas, confirmaciones y formularios modales. |
| `pdfmake` | Generación de reportes en PDF. |
| `xlsx` | Exportación de reportes a Excel. |
| `tailwindcss` | Diseño visual y responsive. |
| `vite` | Servidor de desarrollo y empaquetado. |

Las imágenes se muestran usando `VITE_S3_PUBLIC_BASE_URL` más el `imageKey`
devuelto por el backend.
