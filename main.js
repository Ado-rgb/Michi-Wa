process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1';

import './config.js';
import { createRequire } from 'module';
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import * as ws from 'ws'; // Keep this, as `ws` is imported and used for `ws.OPEN`
import { readdirSync, statSync, unlinkSync, existsSync, readFileSync, watch, mkdirSync } from 'fs';
import yargs from 'yargs';
import chalk from 'chalk';
import syntaxerror from 'syntax-error';
import { tmpdir } from 'os';
import { format } from 'util';
import pino from 'pino';
import { Boom } from '@hapi/boom';

// Only import what's needed from simple.js, and ensure it's called once.
// Do not destructure protoType or serialize if they are global modifying functions.
import { protoType, serialize } from './lib/simple.js';

import { Low, JSONFile } from 'lowdb';
import lodash from 'lodash';
import readline from 'readline';
import NodeCache from 'node-cache';
import qrcode from 'qrcode-terminal';
import { spawn } from 'child_process';

const { proto } = (await import('@whiskeysockets/baileys')).default;
const {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  jidNormalizedUser,
} = await import('@whiskeysockets/baileys');

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

// Call protoType() and serialize() ONLY ONCE here at the beginning.
// They should not be called again during reloads.
protoType();
serialize();

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix ? /file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString();
};
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true));
};
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir);
};

global.API = (name, path = '/', query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  path +
  (query || apikeyqueryname
    ? '?' +
      new URLSearchParams(
        Object.entries({
          ...query,
          ...(apikeyqueryname ? { [apikeyqueryname]: global.APIKeys[name in global.APIs ? global.APIs[name] : name] } : {}),
        })
      )
    : '');

global.timestamp = { start: new Date() };

const __dirname = global.__dirname(import.meta.url);

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse());
global.prefix = new RegExp(
  '^[' +
    (opts['prefix'] || '‎z/#$%.\\-').replace(/[|\\{}()[\]^$+*?.\-\^]/g, '\\$&')
);

global.db = new Low(new JSONFile(`storage/databases/database.json`));

global.DATABASE = global.db;
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ)
    return new Promise((resolve) =>
      setInterval(async function () {
        if (!global.db.READ) {
          clearInterval(this);
          resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
        }
      }, 1 * 1000)
    );
  if (global.db.data !== null) return;
  global.db.READ = true;
  await global.db.read().catch(console.error);
  global.db.READ = null;
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
    ...(global.db.data || {}),
  };
  global.db.chain = lodash.chain(global.db.data);
};

// CONFIGURACIÓN DE AUTENTICACIÓN Y SESIÓN
// global.authFile ahora se define en config.js como global.sessions
const authFile = global.sessions || 'sessions'; // Fallback por si no está en config.js
if (!existsSync(authFile)) {
  mkdirSync(authFile, { recursive: true });
  console.log(chalk.greenBright(`[INFO] Carpeta de sesiones creada en: ./${authFile}`));
}
const { state, saveCreds } = await useMultiFileAuthState(authFile);

const { version } = await fetchLatestBaileysVersion();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver));

const logger = pino({
  timestamp: () => `,"time":"${new Date().toJSON()}"`,
}).child({ class: 'client' });
logger.level = 'fatal';

const connectionOptions = {
  version: version,
  logger,
  printQRInTerminal: false,
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, logger),
  },
  browser: Browsers.ubuntu('Chrome'),
  markOnlineOnclientect: false,
  generateHighQualityLinkPreview: true,
  syncFullHistory: true,
  retryRequestDelayMs: 10,
  transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
  maxMsgRetryCount: 15,
  appStateMacVerification: {
    patch: false,
    snapshot: false,
  },
  getMessage: async (key) => {
    const jid = jidNormalizedUser(key.remoteJid);
    const msg = await store.loadMessage(jid, key.id);
    return msg?.message || '';
  },
};

global.conn = makeWASocket(connectionOptions);

/**
 * Función para reconectar un sub-bot y asignarle un manejador de mensajes.
 * @param {string} botPath - Ruta completa a la carpeta de sesión del sub-bot.
 */
async function reconnectSubBot(botPath) {
    console.log(chalk.yellow(`[SUB-BOT] Intentando reconectar sub-bot en: ${path.basename(botPath)}`));
    try {
        const { state: subBotState, saveCreds: saveSubBotCreds } = await useMultiFileAuthState(botPath);
        // Asegurarse de que logger esté definido para sub-bots también, o usar el logger global.
        const subBotLogger = pino({ timestamp: () => `,"time":"${new Date().toJSON()}"` }).child({ class: `sub-bot-${path.basename(botPath)}` });
        subBotLogger.level = 'silent'; // O 'fatal' como el logger principal

        const subBotConn = makeWASocket({
            version: version,
            logger, // Use global logger or subBotLogger
            printQRInTerminal: false,
            auth: {
                creds: subBotState.creds,
                keys: makeCacheableSignalKeyStore(subBotState.keys, logger),
            },
            browser: Browsers.ubuntu('Chrome'),
            markOnlineOnclientect: false,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            retryRequestDelayMs: 10,
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 10 },
            maxMsgRetryCount: 15,
            appStateMacVerification: {
                patch: false,
                snapshot: false,
            },
            getMessage: async (key) => {
                const jid = jidNormalizedUser(key.remoteJid);
                const msg = await store.loadMessage(jid, key.id);
                return msg?.message || '';
            },
        });

        subBotConn.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'open') {
                console.log(chalk.green(`[SUB-BOT] Conectado correctamente: ${chalk.cyan(path.basename(botPath))}`));
            } else if (connection === 'close') {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
                console.error(chalk.red(`[SUB-BOT] Desconectado: ${chalk.cyan(path.basename(botPath))}. Razón: ${reason}`));
                if (reason === DisconnectReason.loggedOut || reason === 401) { // 401 es un caso común de deslogueo
                  global.conns = global.conns.filter(conn => conn.user?.jid !== subBotConn.user?.jid);
                  console.log(chalk.redBright(`[SUB-BOT] ❌ Sesión cerrada o inválida. Sub-bot ${subBotConn.user?.jid} removido.`));
                  // Opcionalmente, eliminar la carpeta de sesión del sub-bot
                  // fs.rmSync(botPath, { recursive: true, force: true });
                  // console.log(chalk.magentaBright(`[SUB-BOT] Carpeta de sesión eliminada para ${path.basename(botPath)}`));
                }
            }
        });
        subBotConn.ev.on('creds.update', saveSubBotCreds);

        // Asignar el manejador de mensajes al sub-bot
        if (handler && typeof handler.handler === 'function') {
            subBotConn.handler = handler.handler.bind(subBotConn);
            subBotConn.ev.on('messages.upsert', subBotConn.handler);
            console.log(chalk.blue(`[SUB-BOT] Manejador de mensajes asignado a: ${chalk.cyan(path.basename(botPath))}`));
        } else {
            console.warn(chalk.yellow(`[SUB-BOT] ADVERTENCIA: No se encontró el manejador para asignar a: ${chalk.cyan(path.basename(botPath))}`));
        }

        // Almacenar la conexión del sub-bot
        global.subBots = global.subBots || {};
        global.subBots[path.basename(botPath)] = subBotConn;

        // Agregar a global.conns para listado (si no existe ya)
        global.conns = global.conns || [];
        const isAlreadyListed = global.conns.some(c => c.user?.jid === subBotConn.user?.jid);
        if (!isAlreadyListed) {
          global.conns.push(subBotConn);
          console.log(chalk.greenBright(`[SUB-BOT] 🟢 Agregado a la lista de conexiones: ${subBotConn.user?.jid}`));
        }

    } catch (e) {
        console.error(chalk.redBright(`[SUB-BOT] Error crítico al reconectar ${chalk.cyan(path.basename(botPath))}:`), e);
    }
}


/**
 * @description Maneja el proceso de inicio de sesión, ya sea mediante código QR o código de emparejamiento.
 */
async function handleLogin() {
  console.log(chalk.cyanBright('[LOGIN] Iniciando proceso de autenticación...'));
  if (conn.authState.creds.registered) {
    console.log(chalk.greenBright('[LOGIN] ✅ Sesión ya registrada. Omitiendo inicio de sesión manual.'));
    return;
  }

  let loginMethod = await question(
    chalk.bold.rgb(0, 173, 216)( // SYA Team Blue
      `\n🔐 Seleccione el método de inicio de sesión para ${global.namebot}:\n` +
      chalk.rgb(0, 255, 128)('  1. ') + chalk.whiteBright('Escanear Código QR (Opción por defecto)\n') + // SYA Team Green
      chalk.rgb(0, 255, 128)('  2. ') + chalk.whiteBright('Usar Código de Emparejamiento (8 dígitos)\n\n') +
      chalk.rgb(255, 0, 128)('Ingrese su elección (qr/code) o presione Enter para QR: ') // SYA Team Pink
    )
  );

  loginMethod = loginMethod.toLowerCase().trim() || 'qr'; // QR por defecto

  if (loginMethod === 'code' || loginMethod === '2') {
    console.log(chalk.yellowBright('[LOGIN] Iniciando sesión con Código de Emparejamiento...'));
    let phoneNumber = await question(chalk.blueBright('📞 Por favor, ingresa el número de WhatsApp para el bot (incluye código de país, ej: +14155552671):\n> '));
    phoneNumber = phoneNumber.replace(/\D/g, ''); // Eliminar no dígitos

    if (!phoneNumber) {
        console.log(chalk.redBright('[LOGIN] ⚠️ Número de teléfono no proporcionado. Volviendo a QR.'));
        loginMethod = 'qr'; // Fallback a QR si no se provee número
    } else {
        // Ajustes básicos para números comunes (ej. agregar '+' si no está)
        if (!phoneNumber.startsWith('+')) {
            // No se puede asumir el código de país, pero se intenta un formato común
            // Se recomienda al usuario ingresar el '+'
        }
        console.log(chalk.magenta(`[LOGIN] Solicitando código para el número: +${phoneNumber}`));
    }

    if (loginMethod === 'code' && typeof conn.requestPairingCode === 'function') {
      try {
        let code = await conn.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join('-') || code; // Formatear código
        console.log(chalk.cyanBright.bold(`\n✨ Tu código de emparejamiento es: ${chalk.bgCyan.black(` ${code} `)} ✨`));
        console.log(chalk.yellowBright('[LOGIN] Ingresa este código en WhatsApp en la sección "Vincular Dispositivo con Número de Teléfono".'));
      } catch (e) {
        console.error(chalk.redBright('[LOGIN] ❌ Error al solicitar código de emparejamiento:'), e.message || e);
        console.log(chalk.yellowBright('[LOGIN] Asegúrate de que el número de teléfono sea correcto y esté activo en WhatsApp.'));
        console.log(chalk.yellowBright('[LOGIN] Intentando con método QR como alternativa...'));
        loginMethod = 'qr'; // Fallback a QR en caso de error
      }
    } else if (loginMethod === 'code') {
      console.log(chalk.redBright('[LOGIN] ⚠️ Tu versión de Baileys no soporta emparejamiento por código o el número no fue válido.'));
      loginMethod = 'qr'; // Fallback a QR
    }
  }

  // Si es QR (por defecto, elección o fallback)
  if (loginMethod === 'qr' || loginMethod === '1' || loginMethod === '') {
    console.log(chalk.yellowBright('[LOGIN] 📷 Generando código QR, por favor escanéalo con WhatsApp...'));
    conn.ev.on('connection.update', ({ qr }) => {
      if (qr) {
        qrcode.generate(qr, { small: true }, (qrString) => {
            console.log(chalk.whiteBright(qrString)); // Imprime el QR en la terminal
            console.log(chalk.blueBright('[LOGIN] Escanea este QR desde WhatsApp: Más opciones > Dispositivos Vinculados > Vincular un dispositivo.'));
        });
      }
    });
  }
}

// Iniciar el proceso de login
await handleLogin();

conn.isInit = false;
conn.well = false;

if (!opts['test']) {
  if (global.db) {
    setInterval(async () => {
      if (global.db.data) await global.db.write();
      if (opts['autocleartmp']) {
        const tmp = [tmpdir(), 'tmp', 'serbot'];
        tmp.forEach((filename) => {
          spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete']);
        });
      }
    }, 30 * 1000);
  }
}

function clearTmp() {
  const tmp = [join(__dirname, './tmp')];
  const filename = [];
  tmp.forEach((dirname) => readdirSync(dirname).forEach((file) => filename.push(join(dirname, file))));
  return filename.map((file) => {
    const stats = statSync(file);
    if (stats.isFile() && Date.now() - stats.mtimeMs >= 1000 * 60 * 3) return unlinkSync(file);
    return false;
  });
}

setInterval(() => {
  if (global.stopped === 'close' || !conn || !conn.user) return;
  clearTmp();
}, 180000);

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin } = update;
  global.stopped = connection;
  if (isNewLogin) conn.isInit = true;
  const code =
    lastDisconnect?.error?.output?.statusCode ||
    lastDisconnect?.error?.output?.payload?.statusCode;
  if (code && code !== DisconnectReason.loggedOut && conn?.ws.socket == null) {
    // No need to reload handler on every disconnect, only if connection is truly lost.
    // The main ev.on('connection.update') will re-establish events.
    await global.reloadHandler(true).catch(console.error);
    global.timestamp.connect = new Date();
  }
  if (global.db.data == null) await loadDatabase(); // Asegurar que la DB esté cargada

  // Evento principal: Actualización de la conexión
  if (connection === 'open') {
    console.log(chalk.greenBright.bold(`[SYSTEM] ✅ ¡Conectado exitosamente como ${chalk.cyan(conn.user?.name || conn.user?.jid || global.namebot)}!`));
    global.timestamp.connect = new Date();

    // --- Lógica de reconexión de sub-bots al iniciar el bot principal ---
    const rutaJadiBot = join(__dirname, global.jadi || './.sya_jadibots'); // Usar global.jadi de config.js

    if (!existsSync(rutaJadiBot)) {
        mkdirSync(rutaJadiBot, { recursive: true });
        console.log(chalk.yellowBright(`[SUB-BOT] Directorio de JadiBots creado en: ./${rutaJadiBot}`));
    } else {
        console.log(chalk.blueBright(`[SUB-BOT] Directorio de JadiBots encontrado en: ./${rutaJadiBot}`));
    }

    const subBotFolders = readdirSync(rutaJadiBot).filter(file => statSync(join(rutaJadiBot, file)).isDirectory());
    if (subBotFolders.length > 0) {
        console.log(chalk.cyan(`[SUB-BOT] Encontrados ${subBotFolders.length} posibles sub-bots. Intentando reconectar...`));
        const credsFile = 'creds.json';
        for (const subBotDir of subBotFolders) {
            const botPath = join(rutaJadiBot, subBotDir);
            if (existsSync(join(botPath, credsFile))) {
                await reconnectSubBot(botPath);
            } else {
                console.log(chalk.gray(`[SUB-BOT] Omitiendo ${subBotDir}, no se encontró ${credsFile}.`));
            }
        }
    } else {
        console.log(chalk.gray('[SUB-BOT] No se encontraron carpetas de sub-bots para reconectar.'));
    }
    // --- Fin de la lógica de reconexión de sub-bots ---

  }

  const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;

  // Manejo de errores de conexión específicos
  if (reason === DisconnectReason.connectionReplaced) {
    console.log(chalk.redBright.bold('[FATAL] ⚠️ Conexión reemplazada. Otra sesión se ha iniciado con este número. Por favor, cierra la otra sesión.'));
    // Podría ser útil forzar la salida aquí o intentar eliminar la sesión local para force un nuevo QR.
    // process.exit(1); // O manejarlo de forma más elegante
  } else if (reason === DisconnectReason.loggedOut) {
    console.log(chalk.redBright.bold('[FATAL] ⚠️ Dispositivo desconectado (Logged Out). Elimina la carpeta de sesión (./${authFile}) y escanea el QR nuevamente.'));
    // Forzar salida para que el usuario reinicie y re-escanee
    // fs.rmSync(`./${authFile}`, { recursive: true, force: true }); // Opcional: eliminar sesión automáticamente
    process.exit(1);
  } else if (reason === DisconnectReason.restartRequired) {
    console.log(chalk.yellowBright.bold('[SYSTEM] 🔄 Reinicio requerido por Baileys. Intentando reconectar...'));
    await global.reloadHandler(true).catch(e => console.error(chalk.redBright('[ERROR] Fallo al reiniciar el handler durante reinicio requerido: '), e));
  } else if (reason === DisconnectReason.timedOut) {
    console.log(chalk.yellowBright.bold('[SYSTEM] ⌛ Tiempo de conexión agotado. Intentando reconectar...'));
    await global.reloadHandler(true).catch(e => console.error(chalk.redBright('[ERROR] Fallo al reiniciar el handler por timeout: '), e));
  }


  if (connection === 'close') {
    console.log(chalk.redBright(`[SYSTEM] 🔌 Conexión cerrada. Razón: ${DisconnectReason[reason] || reason || 'Desconocida'}. Intentando reconectar...`));
    await global.reloadHandler(true).catch(e => console.error(chalk.redBright('[ERROR] Fallo al reiniciar el handler tras cierre de conexión: '), e));
  }
}


// MANEJO DE EXCEPCIONES NO CAPTURADAS
process.on('uncaughtException', (err) => {
  console.error(chalk.redBright.bold('[FATAL ERROR] Excepción no capturada:'), err);
  // Considerar un reinicio más controlado o loggear a un archivo antes de salir
  // process.exit(1); // Salir en caso de error fatal para evitar comportamiento indefinido
});

let isInit = true;
// La importación de handler.js debe hacerse antes de que se use en reconnectSubBot
let handler = await import('./handler.js');

/**
 * @description Recarga el manejador de mensajes (handler.js) y opcionalmente reinicia la conexión del bot.
 * @param {boolean} restartConn - Si es true, reinicia la conexión de Baileys.
 */
global.reloadHandler = async function (restartConn = false) {
  console.log(chalk.magentaBright('[SYSTEM] Intentando recargar el manejador de mensajes...'));
  try {
    const HandlerModule = await import(`./handler.js?update=${Date.now()}`);
    if (HandlerModule && typeof HandlerModule.handler === 'function') {
      handler = HandlerModule;
      console.log(chalk.greenBright('[SYSTEM] ✅ Manejador de mensajes recargado exitosamente.'));
    } else {
      console.warn(chalk.yellowBright('[SYSTEM] ⚠️  El manejador recargado no parece tener una función handler válida.'));
    }
  } catch (e) {
    console.error(chalk.redBright('[SYSTEM] ❌ Error al recargar el manejador de mensajes:'), e);
  }

  if (restartConn) {
    console.log(chalk.yellowBright('[SYSTEM] Reiniciando conexión del bot...'));
    try {
      if (global.conn?.ws?.close) global.conn.ws.close();
    } catch (e) {
      console.error(chalk.redBright('[SYSTEM] Error al cerrar la conexión WebSocket existente:'), e);
    }
    if (global.conn?.ev) global.conn.ev.removeAllListeners();
    global.conn = makeWASocket(connectionOptions);
    isInit = true; // Marcar para reinicializar eventos
    console.log(chalk.blueBright('[SYSTEM] Nueva instancia de Baileys creada.'));
  }

  // (Re)asignar manejadores de eventos
  // No need to use `!isInit` check here if it's always set to true after new connection.
  // The important part is removing previous listeners before adding new ones.
  if (global.conn?.ev) {
    // Check if handler was previously set to remove only existing ones to avoid errors.
    if (global.conn.handler) {
      global.conn.ev.off('messages.upsert', global.conn.handler);
    }
    if (global.conn.connectionUpdate) {
      global.conn.ev.off('connection.update', global.conn.connectionUpdate);
    }
    if (global.conn.credsUpdate) {
      global.conn.ev.off('creds.update', global.conn.credsUpdate);
    }
  }


  if (global.conn && handler && typeof handler.handler === 'function') {
    global.conn.handler = handler.handler.bind(global.conn);
    global.conn.connectionUpdate = connectionUpdate.bind(global.conn); // Re-bind con la función connectionUpdate de este scope
    global.conn.credsUpdate = saveCreds.bind(global.conn, true);

    global.conn.ev.on('messages.upsert', global.conn.handler);
    global.conn.ev.on('connection.update', global.conn.connectionUpdate);
    global.conn.ev.on('creds.update', global.conn.credsUpdate);
    console.log(chalk.greenBright('[SYSTEM] ✅ Eventos principales (messages.upsert, connection.update, creds.update) re-vinculados.'));
  } else {
     console.error(chalk.redBright('[SYSTEM] ❌ No se pudieron re-vincular los eventos principales. `global.conn` o `handler` no están listos.'));
  }

  isInit = false; // Reset after initialization/re-binding
  return true;
};

// CARGA DE PLUGINS
const pluginFolder = global.__dirname(join(__dirname, './plugins')); // Corregido: apunta a la carpeta plugins
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};

/**
 * @description Inicializa y carga todos los plugins desde la carpeta de plugins.
 */
async function filesInit() {
  console.log(chalk.cyanBright('[PLUGIN LOADER] Iniciando carga de plugins...'));
  const pluginFiles = readdirSync(pluginFolder).filter(pluginFilter);
  let loadedCount = 0;
  for (const filename of pluginFiles) {
    try {
      const filePath = global.__filename(join(pluginFolder, filename));
      // Añadir un timestamp a la importación para evitar problemas de caché al recargar
      const module = await import(`${filePath}?update=${Date.now()}`);
      // Ensure plugin exports a default or the expected structure.
      // If plugins are just functions, you might need to adjust this.
      global.plugins[filename] = module.default || module;
      // console.log(chalk.green(`[PLUGIN] Cargado: ${filename}`));
      loadedCount++;
    } catch (e) {
      console.error(chalk.redBright(`[PLUGIN LOADER] ❌ Error al cargar plugin '${filename}':`), e);
      // It's important to delete the faulty plugin to prevent it from causing issues later.
      delete global.plugins[filename];
    }
  }
  console.log(chalk.greenBright.bold(`[PLUGIN LOADER] ✅ ${loadedCount} plugins cargados exitosamente de ${pluginFiles.length} archivos .js encontrados.`));
}
await filesInit(); // Cargar plugins al inicio

/**
 * @description Recarga un plugin específico o todos los plugins si no se especifica un nombre de archivo.
 * @param {object} _ev - Evento (generalmente de watch).
 * @param {string} filename - Nombre del archivo del plugin a recargar.
 */
global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const filePath = global.__filename(join(pluginFolder, filename), true);
    console.log(chalk.yellowBright(`[PLUGIN RELOADER] Detectado cambio en '${filename}', intentando recargar...`));

    // Handle deletion: if file no longer exists, remove the plugin
    if (!existsSync(filePath)) {
      if (filename in global.plugins) {
        console.warn(chalk.yellow(`[PLUGIN RELOADER] 🔌 Plugin '${filename}' eliminado.`));
        delete global.plugins[filename];
        // Re-order plugins if one was deleted
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
      }
      return;
    }

    const err = syntaxerror(readFileSync(filePath), filename, {
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
    });

    if (err) {
      console.error(chalk.redBright(`[PLUGIN RELOADER] ❌ Error de sintaxis al cargar '${filename}':\n${format(err)}`));
      // Delete the old, broken version if it exists
      delete global.plugins[filename];
      return;
    }

    try {
      // Clear module cache for the specific file before re-importing
      // Note: This is a tricky part with ESM. The `?update=${Date.now()}` appended to the URL
      // is the most common workaround for forcing a re-import in Node.js ESM.
      const module = await import(`${global.__filename(filePath)}?update=${Date.now()}`);
      global.plugins[filename] = module.default || module;
      console.log(chalk.greenBright(`[PLUGIN RELOADER] ✅ Plugin '${filename}' recargado y actualizado.`));
    } catch (e) {
      console.error(chalk.redBright(`[PLUGIN RELOADER] ❌ Error al requerir plugin '${filename}':\n${format(e)}`));
      // Delete the plugin if it fails to load to prevent using a broken version
      delete global.plugins[filename];
    } finally {
      // Reordenar plugins alfabéticamente (opcional, pero puede ser útil para consistencia)
      global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
    }
  }
};
Object.freeze(global.reload); // Congelar para evitar modificaciones accidentales

// VIGILAR CAMBIOS EN LA CARPETA DE PLUGINS
watch(pluginFolder, global.reload);
console.log(chalk.blueBright(`[PLUGIN WATCHER] Vigilando cambios en la carpeta de plugins: ${pluginFolder}`));

// INICIALIZAR/RECARGAR HANDLER PRINCIPAL
await global.reloadHandler();
console.log(chalk.greenBright.bold('[SYSTEM] ✅ Sistema inicializado y listo.'));
