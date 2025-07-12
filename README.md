# ✨ SYA Team Bot ✨

<p align="center">
  <img src="https://raw.githubusercontent.com/SYA-Team/Recursos/main/sya_team_bot_logo.png" alt="SYA Team Bot Logo" width="200"/>
</p>

<p align="center">
  Un bot de WhatsApp avanzado y multifuncional desarrollado por <b>SYA Team</b>.
  <br>
  <!-- Badges (ejemplos, añadir reales si se configuran pipelines/servicios) -->
  <!-- <img src="https://img.shields.io/github/v/release/SYA-Team/sya-team-bot?style=for-the-badge" alt="Release"> -->
  <!-- <img src="https://img.shields.io/github/license/SYA-Team/sya-team-bot?style=for-the-badge" alt="License"> -->
  <!-- <img src="https://img.shields.io/github/workflow/status/SYA-Team/sya-team-bot/CI?label=tests&style=for-the-badge" alt="Tests"> -->
</p>

---

## 🚀 Descripción

**SYA Team Bot** es un bot para WhatsApp diseñado para ofrecer una amplia gama de funcionalidades, desde herramientas de utilidad y descargas hasta entretenimiento y administración de grupos. Construido sobre la librería Baileys, este bot es modular, extensible y personalizable.

## 🌟 Características Principales

*   **Sistema de Plugins:** Añade o modifica comandos fácilmente.
*   **Multi-Dispositivo:** Compatible con la vinculación de múltiples dispositivos de WhatsApp.
*   **JadiBots (Sub-Bots):** Permite a otros usuarios generar instancias del bot (si está habilitado).
*   **Base de Datos:** Almacenamiento de datos de usuarios, chats y configuraciones (LowDB/JSON).
*   **Personalización:** Configura el nombre, prefijo, propietarios, y más.
*   **Comandos Variados:** Incluye descargas, búsquedas, herramientas de grupo, IA (OpenAI), stickers, y más.
*   **Manejo de Sesiones:** Guarda y restaura sesiones para evitar re-escaneos frecuentes.
*   **Interfaz de Consola Mejorada:** Logs coloridos y descriptivos para un mejor seguimiento.

## 📋 Requisitos Previos

*   [Node.js](https://nodejs.org/) (versión 16.x o superior recomendada)
*   [Git](https://git-scm.com/)
*   [FFmpeg](https://ffmpeg.org/download.html) (para procesamiento de multimedia, especialmente stickers)
*   Un número de WhatsApp activo para el bot.

## 🛠️ Instalación

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/SYA-Team/sya-team-bot.git
    cd sya-team-bot
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```
    O si prefieres yarn:
    ```bash
    yarn install
    ```

## ⚙️ Configuración

1.  **Renombra `config.js.example` a `config.js` (si existiera un example, si no, edita `config.js` directamente).**
    *   Actualmente, el archivo de configuración principal es `config.js`.

2.  **Edita `config.js` y ajusta las siguientes variables clave:**
    *   `global.owner`: Define el/los número(s) de teléfono de los propietarios del bot.
        ```javascript
        global.owner = [
          ['TUNUMERO1', 'Tu Nombre Alias 1', true], // true para el owner principal
          ['TUNUMERO2', 'Tu Nombre Alias 2', false]
        ];
        ```
        (Reemplaza `TUNUMERO` con el número en formato internacional, ej: `521XXXXXXXXXX`, y `Tu Nombre Alias` con el alias deseado).
    *   `global.namebot`: Nombre que mostrará el bot (ej: `✨ SYA Team Bot ✨`).
    *   `global.packname` y `global.author`: Usados para la metadata de los stickers.
    *   `global.prefix`: El prefijo para los comandos (ej: `.` o `!`). Por defecto es dinámico.
    *   `global.APIKeys`: Si el bot utiliza APIs externas que requieren claves, configúralas aquí (revisar `global.APIs` también).
    *   `global.sessions`: Nombre de la carpeta donde se guardarán las sesiones (por defecto `.sya_sessions`).
    *   `global.jadi`: Nombre de la carpeta para los JadiBots (por defecto `.sya_jadibots`).

3.  **Revisa otras configuraciones en `config.js`** y ajústalas según tus necesidades (canales, mensajes, etc.).

## ▶️ Uso

1.  **Inicia el bot:**
    ```bash
    npm start
    ```
    O si usas yarn:
    ```bash
    yarn start
    ```

2.  **Escanea el código QR:**
    *   La primera vez que inicies el bot, se mostrará un código QR en la terminal (o se te pedirá un código de emparejamiento).
    *   Abre WhatsApp en tu teléfono, ve a `Más opciones` > `Dispositivos vinculados` > `Vincular un dispositivo`.
    *   Escanea el código QR o ingresa el código de emparejamiento.

3.  **¡Listo!** Una vez conectado, el bot debería estar operativo. Puedes probar enviando el comando de menú (ej: `.menu`).

## 📂 Estructura del Proyecto (Simplificada)

```
sya-team-bot/
├── .sya_sessions/      # Carpeta de sesiones del bot principal
├── .sya_jadibots/      # Carpeta para sesiones de JadiBots (sub-bots)
├── config.js           # Archivo de configuración principal
├── database/           # Bases de datos (ej. characters.json)
├── handler.js          # Manejador principal de mensajes y comandos
├── index.js            # Punto de entrada que inicia el bot (maneja cluster)
├── main.js             # Lógica principal del bot (conexión, carga de plugins, etc.)
├── lib/                # Librerías y utilidades personalizadas
├── plugins/            # Carpeta donde residen todos los comandos (plugins)
├── storage/            # Almacenamiento de archivos (ej. database.json, imágenes)
├── package.json        # Dependencias y scripts del proyecto
└── README.md           # Este archivo
```

## ✨ Comandos Destacados

El bot cuenta con una gran variedad de comandos. Algunos ejemplos:

*   `.menu`: Muestra el menú completo de comandos.
*   `.sticker <imagen/video>`: Crea stickers.
*   `.play <nombre canción>`: Descarga y envía canciones.
*   `.ytsearch <término>`: Busca videos en YouTube.
*   `.pinterest <término>`: Busca imágenes en Pinterest.
*   `.openai <pregunta>`: Interactúa con una IA (puede requerir API key).

Para una lista completa y detallada de los comandos, consulta la sección de ayuda dentro del bot o el archivo `plugins/README.md`.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Si deseas contribuir:
1.  Haz un Fork del proyecto.
2.  Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3.  Realiza tus cambios y haz commit (`git commit -m 'Añade nueva funcionalidad'`).
4.  Empuja a la rama (`git push origin feature/nueva-funcionalidad`).
5.  Abre un Pull Request.

## 📜 Licencia

Este proyecto se distribuye bajo la Licencia GPL-3.0-or-later. Ver el archivo `LICENSE` (si existe) o `package.json` para más detalles.

## 📞 Contacto y Soporte

*   **SYA Team**
*   Para problemas, bugs o sugerencias, por favor abre un "Issue" en el repositorio de GitHub.
*   Puedes contactar a los propietarios definidos en `config.js` para soporte directo.

---

Hecho con ❤️ por SYA Team.
