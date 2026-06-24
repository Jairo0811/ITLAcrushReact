# ITLA Crush 

Versión desarrollada con React y Google Firebase

## Información General

**Proyecto:** ITLA Crush React Edition

**Materia:** Programación WEB (SOF-011)

**Cuatrimestre:** 2018-C2

**Profesor:** Raydelto Hernández Perera

### Integrantes del Proyecto Original

* Juan Alberty Fernández Durán - 2015-2724
* Wilmer Vásquez de León - 2015-2946
* Francis Jairo Matías Rosario - 2015-2984
* Gerson Santos Mateo - 2015-3031

---

## Descripción del Proyecto

ITLA Crush React Edition es una reconstrucción moderna del proyecto académico "ITLA Crush", desarrollado originalmente para la asignatura Programación WEB.

La aplicación permite a los estudiantes publicar confesiones y declaraciones de admiración hacia otras personas de manera pública, privada o anónima. El sistema busca proporcionar una experiencia sencilla, segura y amigable para compartir mensajes dentro de la comunidad estudiantil.

Esta nueva versión ha sido rediseñada utilizando tecnologías modernas del ecosistema JavaScript, manteniendo la esencia del proyecto original e incorporando mejoras de arquitectura, seguridad, rendimiento y experiencia de usuario.

---

## Objetivos

### Objetivo General

Desarrollar una aplicación web interactiva utilizando React y Firebase que permita la publicación y consulta de confesiones de manera pública o privada.

### Objetivos Específicos

* Implementar autenticación de usuarios.
* Permitir el registro de nuevos usuarios.
* Gestionar confesiones públicas y privadas.
* Implementar publicaciones anónimas.
* Proporcionar una interfaz moderna y responsive.
* Aplicar buenas prácticas de desarrollo frontend.

---

## Tecnologías Utilizadas

### Frontend

* React
* React Router DOM
* JavaScript ES6+
* HTML5
* CSS3

### Backend

* Firebase Authentication
* Cloud Firestore

### Herramientas de Desarrollo

* Vite
* Visual Studio Code
* Git
* GitHub

---

## Funcionalidades Principales

### Usuarios no autenticados

* Visualizar confesiones públicas.
* Registrarse en la plataforma.
* Iniciar sesión.

### Usuarios autenticados

* Crear confesiones.
* Visualizar confesiones privadas.
* Publicar de forma anónima.
* Publicar con identidad visible.
* Gestionar su sesión.

---

## Mejoras Incorporadas Respecto al Proyecto Original

* Interfaz moderna desarrollada con React.
* Navegación SPA (Single Page Application).
* Integración con Firebase Authentication.
* Base de datos en tiempo real mediante Firestore.
* Diseño responsive para dispositivos móviles.
* Validaciones de formularios mejoradas.
* Dashboard de usuario.
* Buscador de confesiones.
* Filtros avanzados.
* Mejor organización del código mediante componentes reutilizables.

---

## Estructura General del Proyecto

src/

* assets/
* components/
* context/
* pages/
* routes/
* services/
* styles/

---

## Modelo de Datos

### Usuario

* uid
* username
* firstName
* lastName
* email
* createdAt

### Confesión

* authorId
* authorName
* recipient
* message
* isPublic
* isAnonymous
* createdAt

---

## Flujo General del Sistema

1. El usuario accede al sistema.
2. Puede visualizar confesiones públicas sin autenticarse.
3. Puede registrarse o iniciar sesión.
4. Una vez autenticado puede crear confesiones.
5. La confesión puede ser pública o privada.
6. La confesión puede ser anónima o identificada.
7. Los datos son almacenados en Firebase Firestore.
8. Los usuarios autenticados pueden consultar confesiones privadas.

---

## Alcance del Proyecto

El sistema permitirá a los usuarios registrarse e iniciar sesión para publicar declaraciones o confesiones dirigidas a otros usuarios. Las publicaciones podrán configurarse como públicas o privadas, así como mostrarse de forma anónima o identificada.

La aplicación proporcionará mecanismos para la consulta de confesiones, filtrado de contenido y administración de la sesión de usuario, utilizando React para el desarrollo del frontend y Firebase como plataforma de autenticación y almacenamiento de datos.

El proyecto busca aplicar los conceptos fundamentales de desarrollo web moderno mediante el uso de componentes reutilizables, navegación dinámica, persistencia de datos en la nube y control de acceso basado en autenticación.