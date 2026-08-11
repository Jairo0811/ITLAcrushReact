# Arquitectura de ITLA Crush React

ITLA Crush está siendo reconstruido como una **SPA modular con React y Firebase**. La arquitectura objetivo mantiene la interfaz desacoplada de Firebase mediante contextos, hooks y servicios, de forma que autenticación, persistencia y reglas de acceso no queden dispersas entre componentes visuales.

> El repositorio continúa en desarrollo. Este documento describe la arquitectura objetivo que debe guiar la implementación restante.

## Vista general

```mermaid
flowchart LR
    Visitor["Visitante / Usuario"] --> App["React · Vite SPA"]
    App --> Router["React Router"]
    Router --> Public["Rutas públicas"]
    Router --> Protected["Rutas protegidas"]

    Public --> Pages["Pages / Components"]
    Protected --> AuthContext["Auth Context / Hooks"]
    AuthContext --> Pages

    Pages --> Services["Services"]
    Services --> Auth["Firebase Authentication"]
    Services --> Firestore[("Cloud Firestore")]

    Firestore --> Rules["Firestore Security Rules"]
    Auth --> Rules

    Env["Variables VITE_*"] --> Services
```

La SPA no debe acceder a Firebase desde componentes arbitrarios. Los servicios encapsulan operaciones remotas; el contexto de autenticación mantiene la sesión; las reglas de Firestore constituyen la última frontera de autorización sobre los datos.

## Organización del frontend

```mermaid
flowchart TB
    Src["src/"]
    Src --> Assets["assets"]
    Src --> Components["components"]
    Src --> Context["context"]
    Src --> Hooks["hooks"]
    Src --> Pages["pages"]
    Src --> Routes["routes"]
    Src --> Services["services"]
    Src --> Styles["styles"]
    Src --> Utils["utils"]

    Routes --> Pages
    Pages --> Components
    Pages --> Hooks
    Hooks --> Context
    Hooks --> Services
    Services --> Firebase["Firebase SDK"]
    Utils --> Pages
```

| Carpeta | Responsabilidad |
|---|---|
| `components/` | Componentes visuales reutilizables y sin lógica de persistencia directa |
| `context/` | Estado global de autenticación y sesión |
| `hooks/` | Lógica reutilizable y adaptación entre UI y servicios |
| `pages/` | Composición de vistas asociadas a rutas |
| `routes/` | Declaración y protección de navegación |
| `services/` | Integración con Firebase Authentication y Firestore |
| `styles/` | Tokens, estilos globales y comportamiento responsive |
| `utils/` | Validaciones, normalización y funciones auxiliares |

## Autenticación

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as React
    participant C as AuthContext
    participant S as AuthService
    participant F as Firebase Auth
    participant DB as Firestore

    U->>UI: registro / login
    UI->>C: credenciales
    C->>S: autenticar
    S->>F: signIn / createUser
    F-->>S: Firebase User
    S->>DB: obtener / crear perfil
    DB-->>S: datos del perfil
    S-->>C: sesión + perfil
    C-->>UI: estado autenticado
```

El UID de Firebase es el identificador técnico de la cuenta. Los datos públicos o de perfil complementarios deben almacenarse en Firestore y recuperarse mediante el servicio correspondiente.

## Publicación de confesiones

```mermaid
sequenceDiagram
    participant U as Usuario
    participant UI as Formulario
    participant H as Hook / Validación
    participant S as ConfessionService
    participant DB as Firestore
    participant R as Security Rules

    U->>UI: redactar confesión
    UI->>H: datos del formulario
    H->>H: validar destinatario, mensaje y visibilidad
    H->>S: crear confesión
    S->>DB: write
    DB->>R: validar identidad y permisos
    R-->>DB: permitir / rechazar
    DB-->>S: resultado
    S-->>UI: éxito / error
```

Las opciones pública/privada y anónima/identificada afectan la representación y consulta, pero no deben permitir que el cliente suplante a otro autor. El autor real se deriva siempre del usuario autenticado.

## Modelo de acceso

```mermaid
flowchart TD
    Request["Solicitud Firestore"] --> Auth{¿Autenticado?}
    Auth -->|No| PublicRead["Solo lecturas públicas permitidas"]
    Auth -->|Sí| Owner["Validar uid / destinatario / visibilidad"]
    Owner --> Allowed["Operación permitida"]
    Owner --> Denied["Operación rechazada"]
    PublicRead --> Allowed
```

Las **Firestore Security Rules** son obligatorias. Ocultar una vista en React no constituye autorización.

## Dependencias

- React y React Router controlan composición y navegación.
- Firebase SDK permanece detrás de `services/`.
- Los componentes consumen hooks/contextos en lugar de acceder directamente a la infraestructura.
- Las variables de entorno configuran el proyecto Firebase, pero no reemplazan reglas de seguridad.
- La persistencia se concentra en Cloud Firestore; la autenticación en Firebase Authentication.

## Criterio de evolución

Mientras el alcance sea una SPA académica con backend administrado, Firebase es suficiente. Si el dominio creciera hacia moderación compleja, auditoría, procesamiento asíncrono o reglas empresariales sensibles, esas capacidades deberían pasar a funciones/backend confiable en lugar de ejecutarse únicamente en el navegador.
