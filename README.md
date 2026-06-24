# 💘 ITLA Crush

Aplicación web desarrollada con **React**, **Vite** y **Google Firebase**.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Backend-FFCA28?logo=firebase&logoColor=black)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=black)
![Status](https://img.shields.io/badge/Status-In%20Development-success)
![License](https://img.shields.io/badge/License-Academic-blue)

---

# 📚 Información General

**📌 Proyecto:** ITLA Crush

**🎓 Materia:** Programación WEB (SOF-011)

**📅 Cuatrimestre:** 2018-C2

**👨‍🏫 Profesor:** Raydelto Hernández Perera

## 👥 Integrantes del Proyecto Original

* Juan Alberty Fernández Durán - 2015-2724
* Wilmer Vásquez de León - 2015-2946
* Francis Jairo Matías Rosario - 2015-2984
* Gerson Santos Mateo - 2015-3031

---

# 📝 Descripción del Proyecto

ITLA Crush es una aplicación web que permite a los usuarios publicar confesiones y declaraciones dirigidas a otras personas de manera pública, privada o anónima.

El sistema fue concebido originalmente como proyecto final de la asignatura Programación WEB. Esta versión ha sido rediseñada utilizando tecnologías modernas del ecosistema JavaScript, manteniendo la esencia del proyecto original e incorporando mejoras en arquitectura, seguridad, rendimiento y experiencia de usuario.

---

# 🎯 Objetivos

## 🎯 Objetivo General

Desarrollar una aplicación web interactiva utilizando React y Firebase que permita la publicación y consulta de confesiones de manera pública o privada.

## ✅ Objetivos Específicos

* Implementar autenticación de usuarios.
* Permitir el registro de nuevos usuarios.
* Gestionar confesiones públicas y privadas.
* Implementar publicaciones anónimas.
* Proporcionar una interfaz moderna y responsive.
* Aplicar buenas prácticas de desarrollo frontend.

---

# 🛠️ Tecnologías Utilizadas

## 🎨 Frontend

* React
* React Router DOM
* JavaScript ES6+
* HTML5
* CSS3

## ☁️ Backend

* Firebase Authentication
* Cloud Firestore

## 💻 Herramientas de Desarrollo

* Vite
* Visual Studio Code
* Git
* GitHub

---

# 🚀 Funcionalidades Principales

## 🌎 Usuarios no autenticados

* Visualizar confesiones públicas.
* Registrarse en la plataforma.
* Iniciar sesión.

## 🔐 Usuarios autenticados

* Crear confesiones.
* Visualizar confesiones privadas.
* Publicar de forma anónima.
* Publicar con identidad visible.
* Gestionar su sesión.

---

# ✨ Mejoras Incorporadas Respecto al Proyecto Original

* Interfaz moderna desarrollada con React.
* Navegación SPA (Single Page Application).
* Integración con Firebase Authentication.
* Base de datos en tiempo real mediante Firestore.
* Diseño responsive para dispositivos móviles.
* Validaciones de formularios mejoradas.
* Dashboard de usuario.
* Buscador de confesiones.
* Filtros avanzados.
* Componentes reutilizables.

---

# 📂 Estructura General del Proyecto

```text
src/
│
├── assets/
├── components/
├── context/
├── pages/
├── routes/
├── services/
├── styles/
│
├── App.jsx
└── main.jsx
```

---

# 🗄️ Modelo de Datos

## 👤 Usuario

* uid
* username
* firstName
* lastName
* email
* createdAt

## 💌 Confesión

* authorId
* authorName
* recipient
* message
* isPublic
* isAnonymous
* createdAt

---

# 🔄 Flujo General del Sistema

1. Acceso al sistema.
2. Consulta de confesiones públicas.
3. Registro o inicio de sesión.
4. Creación de confesiones.
5. Publicación pública o privada.
6. Publicación anónima o identificada.
7. Almacenamiento en Firestore.
8. Consulta de contenido privado para usuarios autenticados.

---

# 📏 Alcance del Proyecto

El sistema permitirá a los usuarios registrarse e iniciar sesión para publicar declaraciones o confesiones dirigidas a otros usuarios.

Las publicaciones podrán configurarse como públicas o privadas, así como mostrarse de forma anónima o identificada.

La aplicación utilizará React para el frontend y Firebase para la autenticación y almacenamiento de datos.

---

# ⚙️ Requisitos Previos

* Node.js (18 o superior)
* npm
* Git

Verificar instalación:

```bash
node -v
npm -v
git --version
```

---

# 📦 Instalación de Dependencias

```bash
npm install
```

---

# 📚 Dependencias Principales

```bash
npm install react-router-dom firebase
```

---

# ▶️ Ejecución del Proyecto

```bash
npm run dev
```

Aplicación disponible en:

```text
http://localhost:5173
```

---

# 🏗️ Compilación para Producción

```bash
npm run build
```

Vista previa:

```bash
npm run preview
```

---

# 🔥 Configuración de Firebase

Crear un archivo `.env`:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

---

# 🌿 Control de Versiones

Agregar cambios:

```bash
git add .
```

Crear commit:

```bash
git commit -m "Descripción del cambio"
```

Enviar cambios:

```bash
git push origin main
```
