# Diagnóstico del Bounded Context: IAM (Identity & Access Management)

**Fecha del análisis:** 17 de noviembre de 2025  
**Branch:** feature/auth  
**Repositorio:** SPA (GreatBuild)

---

## 📋 Resumen Ejecutivo

El bounded context **IAM** es responsable de la autenticación, autorización y gestión de sesiones de usuarios en la aplicación Angular. Implementa un sistema híbrido que soporta:

1. **Autenticación tradicional** (email/password)
2. **OAuth 2.0 con Google** (Social Login)
3. **Gestión de roles dinámicos** (ROLE_CLIENT, ROLE_WORKER)
4. **Sesión persistente** usando `localStorage` con Angular Signals

---

## 🏗️ Arquitectura del Bounded Context

### Estructura de Carpetas

```
src/app/iam/
├── components/          # Componentes reutilizables de UI
│   ├── login-form/
│   └── register-form/
├── guards/              # Route guards para protección de rutas
│   ├── user-type.ts
│   └── user-type.spec.ts
├── model/               # Entidades y Value Objects del dominio
│   ├── account-status.vo.ts
│   ├── auth-token.vo.ts
│   ├── credentials.vo.ts
│   ├── person.entity.ts
│   ├── phone-number.vo.ts
│   ├── professional-id-type.vo.ts
│   ├── professional-id.vo.ts
│   ├── registration-request-status.vo.ts
│   ├── registration-request.entity.ts
│   ├── registration-request.vo.ts
│   ├── user-account.entity.ts
│   ├── user-type.vo.ts
│   └── username.vo.ts
├── pages/               # Componentes de página (routed components)
│   ├── login-page/
│   ├── register-page/
│   ├── select-role-page/
│   └── oauth-callback-page/
├── services/            # Servicios de aplicación e infraestructura
│   ├── auth.service.ts
│   ├── session.service.ts
│   ├── person.service.ts
│   ├── user-account.service.ts
│   └── session.service.spec.ts
└── utils/               # Utilidades y helpers
    └── jwt.utils.ts
```

---

## 🔑 Componentes Principales

### 1. Services (Capa de Aplicación)

#### **AuthService** (`auth.service.ts`)
- **Responsabilidad:** Orquestación de autenticación y registro
- **Endpoints configurados:**
  - `POST /api/auth/login` - Login tradicional
  - `POST /api/auth/register` - Registro de nuevo usuario
  - `POST /api/auth/select-role` - Selección de rol post-OAuth
  - `GET /oauth2/authorization/google` - Inicio de flujo OAuth

**Interfaces clave:**
```typescript
LoginRequest { email, password }
LoginResponse { accessToken, tokenType }
RegisterRequest { email, password, firstName, lastName, roleName }
RegisterResponse { email, message }
SelectRoleRequest { roleName: 'ROLE_CLIENT' | 'ROLE_WORKER' }
SelectRoleResponse { id, email, firstName, lastName, provider, roles[] }
```

**Configuración de URLs:**
- `authBaseUrl`: `http://localhost:8080/api/auth` (Gateway principal)
- `googleAuthBaseUrl`: `http://localhost:8003/api/auth` (Microservicio OAuth)
- `googleOAuthUrl`: `http://localhost:8080/oauth2/authorization/google`

**Implementación de seguridad:**
- Método `authHeaders()`: Inyecta `Authorization: Bearer <token>` en requests
- Integración con `SessionService` para obtener token actual

#### **SessionService** (`session.service.ts`)
- **Responsabilidad:** Estado de sesión reactivo y persistencia
- **Tecnología:** Angular Signals + localStorage
- **Persistencia automática:** Efecto reactivo que sincroniza signals con localStorage

**Señales gestionadas:**
```typescript
personId: signal<number | undefined>
userType: signal<UserType | undefined>
organizationId: signal<number | undefined>
organizationRole: signal<OrganizationMemberType | undefined>
projectId: signal<number | undefined>
projectRole: signal<ProjectRole | undefined>
milestoneId: signal<number | undefined>
token: signal<string | undefined>
```

**Métodos públicos:**
- Setters: `setPersonId()`, `setUserType()`, `setToken()`, etc.
- Getters: `getPersonId()`, `getUserType()`, `getToken()`, etc.
- Limpieza: `clearIdentity()`, `clearOrganization()`, `clearAll()`

**Estrategia de persistencia:**
- Token se guarda como string plano en `localStorage.token`
- Otros valores se serializan como JSON
- `clearToken()` elimina explícitamente el token del storage

#### **PersonService** (`person.service.ts`)
- **Responsabilidad:** CRUD de entidades Person
- **Patrón:** Dynamic Service Factory
- **Endpoints:**
  - `GET /persons` - Listar todas las personas
  - `GET /persons/:id` - Obtener persona por ID
  - `GET /persons?email=` - Buscar por email
  - `POST /persons` - Crear nueva persona
  - `PUT /persons/:id` - Actualizar persona
  - `DELETE /persons/:id` - Eliminar persona

#### **UserAccountService** (`user-account.service.ts`)
- **Responsabilidad:** CRUD de cuentas de usuario
- **Endpoints legacy:**
  - `POST /auth/signin` - Login antiguo (probablemente no usado)
  - `POST /auth/signup` - Registro antiguo (probablemente no usado)
- **Nota:** Este servicio parece tener funcionalidad duplicada con `AuthService`

---

### 2. Pages (Componentes de Ruta)

#### **LoginPageComponent** (`login-page.component.ts`)
**Estado:** ✅ Funcional completo

**Flujo de autenticación:**
1. Usuario ingresa email/password → `onLoginSubmitted()`
2. Llama `authService.login()` → Recibe `accessToken`
3. Almacena token: `session.setToken(accessToken)`
4. Decodifica JWT: `populateSessionFromToken()`
5. Extrae `personId` y `userType` del payload
6. Redirige según rol:
   - `TYPE_WORKER` → `/organizations`
   - `TYPE_CLIENT` → `/projects`

**Flujo OAuth (workaround):**
- `ngOnInit()` detecta params `?token=&email=&needsRoleSelection=`
- Si existen, redirige a `/auth/callback` (fix para backend que redirige mal)

**Integración con Google:**
- Botón "Sign in with Google" → `onGoogleLogin()`
- `window.location.href = authService.getGoogleLoginUrl()`
- Inicia flujo OAuth2 completo

#### **RegisterPageComponent** (`register-page.component.ts`)
**Estado:** ✅ Funcional

**Flujo de registro:**
1. Usuario completa formulario → `onRegisterSubmitted()`
2. Mapea `UserType` a `roleName` ('ROLE_CLIENT' | 'ROLE_WORKER')
3. Llama `authService.register()`
4. Muestra mensaje de éxito/error
5. Usuario debe ir manualmente a login

**Validación:**
- Email se convierte a lowercase
- Campos requeridos: firstName, lastName, email, password, role

#### **SelectRolePageComponent** (`select-role-page.component.ts`)
**Estado:** ✅ Funcional - **PROBLEMA IDENTIFICADO EN BACKEND**

**Propósito:** Permite a usuarios OAuth sin rol asignado elegir ROLE_CLIENT o ROLE_WORKER

**Flujo esperado:**
1. Llega desde `/auth/callback` con `?accessToken=&email=&needsRoleSelection=true`
2. `ngOnInit()` extrae token y lo guarda: `session.setToken(paramToken)`
3. Usuario selecciona rol (radio buttons)
4. Hace clic en "Continuar" → `submitSelection()`
5. POST a `/api/auth/select-role` con header `Authorization: Bearer <token>`
6. Backend debería retornar nuevo token con rol definitivo
7. Redirige según rol seleccionado

**Problema detectado:**
- ❌ Backend responde con `302 redirect` a OAuth en lugar de procesar la petición
- ❌ CORS bloquea el redirect: "Access-Control-Allow-Origin header is present"
- ✅ Frontend ya incluye correctamente el token en header Authorization
- 🔧 **CAUSA RAÍZ:** Spring Security filter rechaza `ROLE_PENDING_SELECTION`

**Estado de implementación:**
- Frontend: ✅ Correcto
- Backend: ❌ Requiere configuración de Spring Security

#### **OauthCallbackPageComponent** (`oauth-callback-page.component.ts`)
**Estado:** ✅ Funcional

**Propósito:** Maneja el callback de Google OAuth

**Flujo:**
1. Google redirige a `/auth/callback?token=&email=&needsRoleSelection=`
2. Valida presencia de token
3. Guarda token: `session.setToken(token)`
4. **Si `needsRoleSelection=true`:**
   - Redirige a `/auth/select-role` con todos los params
5. **Si `needsRoleSelection=false`:**
   - Decodifica token, puebla sesión
   - Redirige según `userType` a `/organizations` o `/projects`

**Manejo de errores:**
- Token faltante → Muestra error traducido
- Rol inválido → Muestra error traducido

---

### 3. Components (UI Reutilizables)

#### **LoginFormComponent** (`login-form.component.ts`)
**Tipo:** Presentational Component  
**Responsabilidad:** Formulario de login con validación básica

**Inputs:** Ninguno  
**Outputs:**
- `@Output() submitted: EventEmitter<{ email, password }>`
- `@Output() googleLogin: EventEmitter<void>`

**Características:**
- Two-way binding con `[(ngModel)]`
- Validación: Email y password requeridos
- Botón Google OAuth integrado

#### **RegisterFormComponent** (`register-form.component.ts`)
**Tipo:** Presentational Component  
**Responsabilidad:** Formulario de registro

**Inputs:** Ninguno  
**Outputs:**
- `@Output() submitted: EventEmitter<{ firstName, lastName, email, password, role }>`

**Características:**
- Select para elegir rol (UserType.TYPE_CLIENT | TYPE_WORKER)
- Validación en componente padre

---

### 4. Guards (Protección de Rutas)

#### **UserTypeGuard** (`user-type.ts`)
**Implementación:** `CanActivate`

**Lógica:**
```typescript
canActivate(route, state): boolean {
  const expectedType = route.data['expectedUserType'];
  const currentType = this.session.getUserType();
  
  if (currentType === expectedType) return true;
  
  this.router.navigate(['/unauthorized']);
  return false;
}
```

**Uso en rutas:**
```typescript
{
  path: 'organizations',
  canActivate: [UserTypeGuard],
  data: { expectedUserType: UserType.TYPE_WORKER }
}
```

---

### 5. Model (Dominio)

#### **Enums (Value Objects)**

**UserType** (`user-type.vo.ts`)
```typescript
enum UserType {
  TYPE_CLIENT = 'TYPE_CLIENT',
  TYPE_WORKER = 'TYPE_WORKER'
}
```

**AccountStatus** (`account-status.vo.ts`)
```typescript
enum AccountStatus {
  ACTIVE, INACTIVE, SUSPENDED
}
```

#### **Entities**

**Person** (`person.entity.ts`)
```typescript
class Person {
  id: number | undefined
  email: string
  phone: PhoneNumber
  professionalId?: ProfessionalId
  profession?: string
  firstName: string
  lastName: string
}
```
- Validación: firstName y lastName no pueden estar vacíos
- Métodos: `getFullName()`, `fromJson()`, `toJson()`

**UserAccount** (`user-account.entity.ts`)
```typescript
class UserAccount {
  id: number
  personId: number
  username: string
  password: string
  role: UserType
}
```
- Validación: Username es requerido

#### **Value Objects**

- **PhoneNumber** - Encapsula número telefónico
- **ProfessionalId** - ID profesional (CIP/CAP)
- **Credentials** - Email + Password
- **AuthToken** - Token JWT
- **Username** - Nombre de usuario validado

---

### 6. Utils (Utilidades)

#### **jwt.utils.ts**

**Función: `decodeJwtPayload(token: string)`**
- Decodifica payload de JWT sin verificar firma
- Compatible con navegador y Node.js
- Maneja encoding base64url correctamente
- Retorna objeto JSON o `undefined` si falla

**Función: `extractRoleClaim(payload: any)`**
- Busca rol en `payload.roles[0]` o `payload.role`
- Retorna primer rol encontrado
- Usado para obtener ROLE_CLIENT o ROLE_WORKER

**Función: `mapRoleNameToUserType(role: string)`**
- Mapea roles del backend a enum del frontend
- `'ROLE_WORKER'` → `UserType.TYPE_WORKER`
- `'ROLE_CLIENT'` → `UserType.TYPE_CLIENT`
- Otros valores → `undefined`

**Uso típico:**
```typescript
const payload = decodeJwtPayload(token);
const roleName = extractRoleClaim(payload);
const userType = mapRoleNameToUserType(roleName);
session.setUserType(userType);
```

---

## 🔄 Flujos Completos

### Flujo 1: Login Tradicional (Email/Password)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant LP as LoginPage
    participant AS as AuthService
    participant SS as SessionService
    participant R as Router
    
    U->>LP: Ingresa email/password
    LP->>AS: login({ email, password })
    AS->>Backend: POST /api/auth/login
    Backend-->>AS: { accessToken, tokenType }
    AS-->>LP: LoginResponse
    LP->>SS: setToken(accessToken)
    LP->>LP: populateSessionFromToken()
    LP->>SS: setPersonId(payload.sub)
    LP->>SS: setUserType(mappedRole)
    
    alt userType === TYPE_WORKER
        LP->>R: navigate(['/organizations'])
    else userType === TYPE_CLIENT
        LP->>R: navigate(['/projects'])
    end
```

### Flujo 2: OAuth con Google (Sin Selección de Rol)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant LP as LoginPage
    participant G as Google OAuth
    participant OC as OAuthCallback
    participant SS as SessionService
    participant R as Router
    
    U->>LP: Click "Sign in with Google"
    LP->>G: Redirect a /oauth2/authorization/google
    G->>U: Autenticación Google
    U->>G: Autoriza
    G->>Backend: Callback con código
    Backend->>OC: Redirect /auth/callback?token=...&needsRoleSelection=false
    OC->>SS: setToken(token)
    OC->>OC: populateSessionFromToken()
    OC->>SS: setPersonId(), setUserType()
    
    alt userType === TYPE_WORKER
        OC->>R: navigate(['/organizations'])
    else userType === TYPE_CLIENT
        OC->>R: navigate(['/projects'])
    end
```

### Flujo 3: OAuth con Google (Con Selección de Rol)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant OC as OAuthCallback
    participant SR as SelectRolePage
    participant AS as AuthService
    participant SS as SessionService
    participant R as Router
    
    OC->>SR: Redirect /auth/select-role?accessToken=...&needsRoleSelection=true
    SR->>SS: setToken(accessToken)
    U->>SR: Selecciona ROLE_CLIENT o ROLE_WORKER
    SR->>AS: selectRole({ roleName })
    AS->>Backend: POST /api/auth/select-role + header Authorization
    
    Note over Backend: ⚠️ PROBLEMA AQUÍ ⚠️
    Backend-->>AS: 302 Redirect a Google OAuth (INCORRECTO)
    Note over AS: CORS bloquea redirect
    
    Note over Backend: DEBERÍA RETORNAR:
    Backend-->>AS: { id, email, roles: [{name: "ROLE_X"}] }
    AS-->>SR: SelectRoleResponse
    SR->>SS: setUserType(), setPersonId()
    
    alt userType === TYPE_WORKER
        SR->>R: navigate(['/organizations'])
    else userType === TYPE_CLIENT
        SR->>R: navigate(['/projects'])
    end
```

### Flujo 4: Registro de Nuevo Usuario

```mermaid
sequenceDiagram
    participant U as Usuario
    participant RP as RegisterPage
    participant AS as AuthService
    participant LP as LoginPage
    
    U->>RP: Completa formulario
    RP->>AS: register({ email, password, firstName, lastName, roleName })
    AS->>Backend: POST /api/auth/register
    Backend-->>AS: { email, message }
    AS-->>RP: RegisterResponse
    RP->>U: Muestra mensaje de éxito
    U->>LP: Navega manualmente a /login
```

---

## 🐛 Problemas Identificados

### 🔴 Crítico: SelectRolePage - Error CORS en Backend

**Ubicación:** `select-role-page.component.ts` línea 85  
**Endpoint afectado:** `POST /api/auth/select-role`

**Síntomas:**
```
Access to XMLHttpRequest at 'https://accounts.google.com/o/oauth2/v2/auth...' 
(redirected from 'http://localhost:8080/api/auth/select-role') 
from origin 'http://localhost:4200' has been blocked by CORS policy
```

**Análisis:**
1. ✅ Frontend incluye correctamente `Authorization: Bearer <token>` en header
2. ✅ Token contiene `ROLE_PENDING_SELECTION` en payload
3. ❌ Backend responde con `302 Found` redirect a Google OAuth
4. ❌ Browser bloquea redirect cross-origin por CORS

**Causa raíz:**
- Spring Security filter detecta `ROLE_PENDING_SELECTION` como no válido
- Redirige automáticamente a OAuth en lugar de procesar la petición
- Endpoint `/api/auth/select-role` no está configurado para permitir este rol temporal

**Solución requerida (Backend):**

```java
// SecurityConfig.java
@Override
protected void configure(HttpSecurity http) throws Exception {
    http
        .authorizeRequests()
            .antMatchers("/api/auth/select-role").hasRole("PENDING_SELECTION")
            .antMatchers("/api/auth/login", "/api/auth/register").permitAll()
        // ...
}

// SelectRoleController.java
@PostMapping("/api/auth/select-role")
@PreAuthorize("hasRole('PENDING_SELECTION')")
public ResponseEntity<AuthResponse> selectRole(@RequestBody SelectRoleRequest request) {
    // Validar token actual
    // Actualizar usuario con rol definitivo
    // Generar nuevo JWT con ROLE_CLIENT o ROLE_WORKER
    String newToken = jwtService.generateToken(user);
    return ResponseEntity.ok(new AuthResponse(newToken));
}
```

**Estado:** ❌ Bloqueado hasta corrección en backend  
**Impacto:** Usuarios OAuth no pueden seleccionar rol → No pueden completar registro

---

### 🟡 Moderado: Servicios Duplicados

**Problema:** `UserAccountService` y `AuthService` tienen funcionalidad solapada

**Evidencia:**
- `UserAccountService`:
  - `POST /auth/signin` (legacy)
  - `POST /auth/signup` (legacy)
- `AuthService`:
  - `POST /api/auth/login` (nuevo)
  - `POST /api/auth/register` (nuevo)

**Recomendación:**
- Deprecar métodos legacy en `UserAccountService`
- Consolidar toda lógica de autenticación en `AuthService`
- Mantener `UserAccountService` solo para CRUD de cuentas

---

### 🟢 Menor: Workaround en LoginPage

**Ubicación:** `login-page.component.ts` línea 38-46

**Problema:** Backend redirige OAuth callback a `/login` en vez de `/auth/callback`

**Solución temporal (ya implementada):**
```typescript
ngOnInit(): void {
  this.route.queryParamMap.subscribe(params => {
    const token = params.get('token');
    if (token) {
      // Redirect to proper callback route
      this.router.navigate(['/auth/callback'], { queryParams: {...} });
    }
  });
}
```

**Estado:** ✅ Mitigado en frontend  
**Recomendación:** Corregir URL de redirect en configuración de Spring Security OAuth

---

## ✅ Buenas Prácticas Implementadas

### 1. **Separación de Responsabilidades**
- Services: Lógica de aplicación y comunicación con backend
- Components: Presentación y UI
- Guards: Seguridad y control de acceso
- Utils: Funciones puras reutilizables

### 2. **Reactive State Management**
- Uso de Angular Signals para estado reactivo
- Persistencia automática con `effect()`
- Single source of truth en `SessionService`

### 3. **Type Safety**
- Interfaces TypeScript para todos los DTOs
- Enums para valores controlados (UserType, AccountStatus)
- Validación en tiempo de compilación

### 4. **Seguridad**
- Tokens JWT almacenados en localStorage
- Headers Authorization en todas las peticiones autenticadas
- Guards para protección de rutas

### 5. **Internacionalización (i18n)**
- Uso de `TranslateService` en todos los componentes
- Mensajes de error y éxito traducibles
- Soporte para español e inglés

### 6. **Modularidad**
- Componentes standalone de Angular
- Importaciones explícitas en cada módulo
- Sin dependencias circulares

---

## 📊 Métricas del Bounded Context

| Métrica | Valor |
|---------|-------|
| **Total de archivos TypeScript** | 31 |
| **Services** | 4 (AuthService, SessionService, PersonService, UserAccountService) |
| **Pages** | 4 (Login, Register, SelectRole, OAuthCallback) |
| **Components** | 2 (LoginForm, RegisterForm) |
| **Guards** | 1 (UserTypeGuard) |
| **Entities** | 3 (Person, UserAccount, RegistrationRequest) |
| **Value Objects** | 10+ |
| **Utilidades** | 1 (jwt.utils) |
| **Endpoints configurados** | 8 |
| **Flujos de autenticación** | 4 (Login, Register, OAuth, SelectRole) |

---

## 🎯 Recomendaciones de Mejora

### Corto Plazo (Urgente)

1. **Corregir backend de SelectRole** ⚠️
   - Configurar Spring Security para permitir `ROLE_PENDING_SELECTION`
   - Retornar JSON en lugar de redirect
   - Configurar CORS para `/api/auth/select-role`

2. **Corregir OAuth callback URL**
   - Backend debe redirigir a `/auth/callback`, no `/login`
   - Eliminar workaround de `login-page.component.ts`

### Mediano Plazo

3. **Consolidar servicios de autenticación**
   - Deprecar `UserAccountService.signIn/signUp`
   - Migrar toda lógica a `AuthService`
   - Documentar API pública del bounded context

4. **Agregar interceptor HTTP global**
   - Inyectar automáticamente token en todas las requests
   - Manejar errores 401/403 centralizadamente
   - Refresh token automático

5. **Mejorar manejo de errores**
   - Servicio centralizado de notificaciones
   - Logging estructurado
   - Retry logic para requests fallidas

### Largo Plazo

6. **Implementar refresh tokens**
   - Tokens de corta duración (15 min)
   - Refresh token de larga duración (7 días)
   - Renovación automática silenciosa

7. **Agregar pruebas unitarias**
   - Tests para `AuthService`
   - Tests para `SessionService`
   - Tests para guards
   - Tests para utilidades JWT

8. **Mejorar seguridad**
   - Migrar tokens a HttpOnly cookies (más seguro que localStorage)
   - Implementar CSRF protection
   - Content Security Policy headers

9. **Optimizar UX**
   - Loading states en todos los flujos
   - Mejor feedback visual en errores
   - Remember me functionality
   - Password strength indicator

---

## 🔗 Dependencias con Otros Bounded Contexts

### Organizations
- `SessionService.setOrganization(id, role)`
- `SessionService.getOrganizationId()`
- Dependencia de `OrganizationMemberType` enum

### Projects
- `SessionService.setProject(id, role)`
- `SessionService.getProjectId()`
- Dependencia de `ProjectRole` enum

### Shared
- `createDynamicService()` utility
- `createEndpointConfig()` utility
- `HttpMethod` enum

---

## 📝 Conclusión

El bounded context **IAM** está **80% completo y funcional**. La implementación del frontend es sólida, con buenas prácticas de arquitectura, separación de responsabilidades y manejo de estado reactivo.

**Bloqueador principal:** Error CORS en endpoint `/api/auth/select-role` que impide completar flujo OAuth con selección de rol. Este es un **problema del backend** que requiere configuración de Spring Security.

**Fortalezas:**
- ✅ Arquitectura limpia y modular
- ✅ Type safety completo
- ✅ Estado reactivo con Signals
- ✅ Soporte OAuth 2.0
- ✅ Internacionalización

**Áreas de mejora:**
- ❌ Falta interceptor HTTP global
- ❌ Falta implementación de refresh tokens
- ❌ Cobertura de tests insuficiente
- ❌ Servicios duplicados (UserAccountService vs AuthService)

**Próximos pasos:**
1. Corregir configuración de Spring Security en backend
2. Validar flujo completo de OAuth con selección de rol
3. Implementar interceptor HTTP
4. Agregar pruebas unitarias

---

**Analista:** GitHub Copilot  
**Versión del documento:** 1.0  
**Última actualización:** 2025-11-17
