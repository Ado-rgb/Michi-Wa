import { smsg } from './lib/simple.js'
import { format } from 'util' 
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'

const { proto } = (await import('@whiskeysockets/baileys')).default;

// Funciones de utilidad
const isNumber = x => typeof x === 'number' && !isNaN(x);
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms));

/**
 * @description Función principal que maneja las actualizaciones de chat (mensajes entrantes).
 * Se ejecuta para cada mensaje nuevo o actualización recibida por el bot.
 * @param {object} chatUpdate - El objeto de actualización de chat de Baileys.
 */
export async function handler(chatUpdate) {
    // Inicializar la cola de mensajes si no existe
    this.msgqueque = this.msgqueque || [];
    if (!chatUpdate) return;

    // Empujar el mensaje a la cola y procesar el último mensaje
    this.pushMessage(chatUpdate.messages).catch(console.error)
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    if (global.db.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m // Procesar y serializar el mensaje con funciones de simple.js
        if (!m) return; // Si el mensaje no es válido o es de un tipo no manejado, salir

        // Inicializar propiedades del mensaje para experiencia y límites
        m.exp = 0;
        // m.limit = false; // Ya no se usa m.limit de esta forma, el costo se define en el plugin

        // --- INICIALIZACIÓN Y ACTUALIZACIÓN DE DATOS DEL USUARIO, CHAT Y BOT ---
        try {
            // Datos del usuario
            let user = global.db.data.users[m.sender];
            if (typeof user !== 'object') global.db.data.users[m.sender] = {};
            user = global.db.data.users[m.sender]; // Reasignar para asegurar la referencia correcta

            // Valores por defecto para el usuario si no existen
            if (!isNumber(user.exp)) user.exp = 0; // Experiencia
            if (!isNumber(user.limit)) user.limit = 25; // Límite/créditos iniciales
            if (!('premium' in user)) user.premium = false; // ¿Es usuario premium?
            if (!user.premium) user.premiumTime = 0; // Tiempo de premium restante
            if (!('registered' in user)) user.registered = false; // ¿Está registrado?

            if (!user.registered) { // Si no está registrado
                if (!('name' in user)) user.name = m.name; // Nombre por defecto del perfil de WhatsApp
                if (!isNumber(user.age)) user.age = -1; // Edad (sin especificar)
                if (!isNumber(user.regTime)) user.regTime = -1; // Timestamp de registro
            }

            if (!isNumber(user.afk)) user.afk = -1; // Timestamp de AFK
            if (!('afkReason' in user)) user.afkReason = ''; // Razón del AFK
            if (!('banned' in user)) user.banned = false; // ¿Está baneado?
            if (!('useDocument' in user)) user.useDocument = false; // ¿Prefiere mensajes como documento?
            if (!isNumber(user.level)) user.level = 0; // Nivel del usuario
            if (!isNumber(user.bank)) user.bank = 0; // Dinero en el banco (si hay economía)
            // Añadir más campos según sea necesario (ej. warnCounter, lastCmdTime, etc.)

            // Datos del chat
            let chat = global.db.data.chats[m.chat];
            if (typeof chat !== 'object') global.db.data.chats[m.chat] = {};
            chat = global.db.data.chats[m.chat]; // Reasignar

            // Valores por defecto para el chat si no existen
            if (!('isBanned' in chat)) chat.isBanned = false; // ¿Chat baneado?
            if (!('bienvenida' in chat)) chat.bienvenida = true; // ¿Mensajes de bienvenida activados?
            if (!('antiLink' in chat)) chat.antiLink = false; // ¿Anti-links activado?
            // if (!('antiToxic' in chat)) chat.antiToxic = false; // Ejemplo: ¿Anti-toxicidad activado?
            if (!('onlyLatinos' in chat)) chat.onlyLatinos = false; // Restricción específica (revisar si es necesaria)
            if (!('nsfw' in chat)) chat.nsfw = false; // ¿Chat NSFW permitido?
            if (!isNumber(chat.expired)) chat.expired = 0; // Timestamp de expiración del chat (para bots temporales en grupos)

            // Configuraciones globales del bot (específicas de esta instancia/JID)
            var settings = global.db.data.settings[this.user.jid];
            if (typeof settings !== 'object') global.db.data.settings[this.user.jid] = {};
            settings = global.db.data.settings[this.user.jid]; // Reasignar

            // Valores por defecto para las configuraciones del bot
            if (!('self' in settings)) settings.self = false; // ¿Modo "self" (solo el bot responde a sí mismo)?
            if (!('autoread' in settings)) settings.autoread = false; // ¿Leer mensajes automáticamente?
            // if (!('restrict' in settings)) settings.restrict = false; // Ejemplo: ¿Restringir comandos peligrosos?

        } catch (e) {
            console.error(chalk.redBright('[DB ERROR] Error al inicializar datos de usuario/chat:'), e);
        }
        // --- FIN DE INICIALIZACIÓN DE DATOS ---

        // Opciones de ejecución y filtros globales
        if (opts['nyimak']) return; // Si está en modo "nyimak" (solo escuchar, no responder)
        if (!m.fromMe && opts['self']) return
        if (opts['swonly'] && m.chat !== 'status@broadcast') return
        if (typeof m.text !== 'string') m.text = ''

        let _user = global.db.data?.users?.[m.sender]; // Acceso seguro a _user

        // --- DETERMINACIÓN DE PERMISOS DEL USUARIO ---
        // ROwner: Root Owner, el propietario principal del bot (generalmente el número del bot mismo o el primer owner en config.js)
        const isROwner = global.owner.map(entry => entry[0].replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender) || conn.decodeJid(this.user.id) === m.sender;
        // Owner: Usuarios definidos como 'owner' en config.js o si el mensaje es del propio bot (fromMe)
        const isOwner = isROwner || global.owner.map(entry => entry[0].replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender) || m.fromMe;
        // Mods: Usuarios definidos como 'mods' en config.js
        const isMods = isOwner || global.mods.map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender);
        // Prems: Usuarios premium (ya sea por config.js o por flag en la base de datos)
        const isPrems = isMods || global.prems.map(v => v.replace(/\D/g, '') + '@s.whatsapp.net').includes(m.sender) || _user?.premium === true;
        // --- FIN DE DETERMINACIÓN DE PERMISOS ---

        // Lógica de cola de mensajes (queque) para usuarios no privilegiados (opcional, revisar si es necesaria)
        if (opts['queque'] && m.text && !(isMods || isPrems)) {
            let queque = this.msgqueque, time = 1000 * 5; // Tiempo de espera en la cola
            const previousID = queque[queque.length - 1];
            queque.push(m.id || m.key.id)
            setInterval(async function () {
                if (queque.indexOf(previousID) === -1) clearInterval(this)
                await delay(time)
            }, time)
        }

        if (m.isBaileys) return; // Ignorar mensajes de Baileys (sincronización, etc.)
        m.exp += Math.ceil(Math.random() * 10); // Añadir una pequeña cantidad de XP por cada mensaje (opcional)

        let usedPrefix; // Variable para almacenar el prefijo utilizado

        // --- METADATOS DE GRUPO Y PARTICIPANTES (SI APLICA) ---
        const groupMetadata = (m.isGroup ? ((conn.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}) || {};
        const participants = (m.isGroup ? groupMetadata.participants : []) || [];
        const user = (m.isGroup ? participants.find(u => conn.decodeJid(u.id) === m.sender) : {}) || {}; // Datos del usuario en el grupo
        const bot = (m.isGroup ? participants.find(u => conn.decodeJid(u.id) == this.user.jid) : {}) || {}; // Datos del bot en el grupo
        const isRAdmin = user?.admin == 'superadmin' || false; // ¿Es el usuario superadmin del grupo?
        const isAdmin = isRAdmin || user?.admin == 'admin' || false; // ¿Es el usuario admin del grupo?
        const isBotAdmin = bot?.admin || false; // ¿Es el bot admin del grupo?
        // --- FIN DE METADATOS DE GRUPO ---

        // --- BUCLE PRINCIPAL PARA PROCESAR PLUGINS ---
        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins'); // Directorio de plugins
        for (let name in global.plugins) { // Iterar sobre cada plugin cargado
            let plugin = global.plugins[name];
            if (!plugin) continue; // Si el plugin no existe, saltar
            if (plugin.disabled) continue; // Si el plugin está deshabilitado, saltar

            const __filename = join(___dirname, name); // Ruta completa del archivo del plugin

            // Ejecutar la función 'all' del plugin si existe (para todos los mensajes)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename });
                } catch (e) {
                    console.error(chalk.redBright(`[PLUGIN ERROR] Error en plugin.all (${name}):`), e);
                }
            }

            // Restricción de comandos de administrador (si opts['restrict'] no está activado)
            if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) {
                // conn.reply(m.chat, 'Los comandos de admin están globalmente restringidos.', m); // Opcional: notificar
                continue;
            }

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'); // Escapar caracteres especiales para RegExp

            // Determinar el prefijo a utilizar (custom del plugin, del bot, o global)
            let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix;

            // Intentar hacer match del texto del mensaje con el prefijo
            let match = (_prefix instanceof RegExp ?
                [[_prefix.exec(m.text), _prefix]] : // Si es RegExp
                Array.isArray(_prefix) ? // Si es un array de prefijos
                    _prefix.map(p => {
                        let re = p instanceof RegExp ? p : new RegExp(str2Regex(p));
                        return [re.exec(m.text), re];
                    }) :
                    typeof _prefix === 'string' ? // Si es un string
                        [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                        [[[], new RegExp]] // Default, no match
            ).find(p => p[1]); // Encontrar el primer match exitoso

            // Ejecutar la función 'before' del plugin si existe (antes de procesar el comando)
            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match, conn: this, participants, groupMetadata, user, bot,
                    isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems,
                    chatUpdate, __dirname: ___dirname, __filename
                })) {
                    continue; // Si plugin.before devuelve true, saltar el resto del procesamiento del plugin
                }
            }

            // Si el plugin no es una función (es decir, no es un comando ejecutable), saltar
            if (typeof plugin !== 'function') continue;

            // Si se encontró un prefijo y el comando coincide
            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, ''); // Texto sin el prefijo
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v); // Obtener comando y argumentos
                args = args || [];
                let _args = noPrefix.trim().split` `.slice(1);
                let text = _args.join` `; // Texto completo después del comando
                command = (command || '').toLowerCase(); // Comando en minúsculas

                let fail = plugin.fail || global.dfail; // Función de fallo (específica del plugin o global)

                // Verificar si el comando es aceptado por el plugin
                let isAccept = plugin.command instanceof RegExp ? // Si plugin.command es RegExp
                    plugin.command.test(command) :
                    Array.isArray(plugin.command) ? // Si es un array de comandos
                        plugin.command.some(cmd => cmd instanceof RegExp ?
                            cmd.test(command) :
                            cmd === command
                        ) :
                        typeof plugin.command === 'string' ? // Si es un string
                            plugin.command === command :
                            false;

                if (!isAccept) continue; // Si el comando no es aceptado, saltar

                m.plugin = name; // Guardar el nombre del plugin que se está ejecutando

                // --- VERIFICACIONES DE BANEO (USUARIO, CHAT, BOT) ---
                if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
                    let chat = global.db.data.chats[m.chat];
                    let user = global.db.data.users[m.sender];
                    let setting = global.db.data.settings[this.user.jid]; // Configuraciones del bot
                    // Excepciones para comandos de desbaneo
                    if (name != 'group-unbanchat.js' && chat?.isBanned) return; // Chat baneado
                    if (name != 'owner-unbanuser.js' && user?.banned) return; // Usuario baneado
                    if (name != 'owner-unbanbot.js' && setting?.banned) return; // Bot baneado (si existe tal setting)
                }
                // --- FIN DE VERIFICACIONES DE BANEO ---

                // --- VERIFICACIONES DE PERMISOS Y CONDICIONES DEL PLUGIN ---
                // Estas verificaciones llaman a `fail(type, m, this)` si no se cumplen
                if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail('owner', m, this); continue; }
                if (plugin.rowner && !isROwner) { fail('rowner', m, this); continue; }
                if (plugin.owner && !isOwner) { fail('owner', m, this); continue; }
                if (plugin.mods && !isMods) { fail('mods', m, this); continue; }
                if (plugin.premium && !isPrems) { fail('premium', m, this); continue; }
                if (plugin.group && !m.isGroup) { fail('group', m, this); continue; }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this); continue; }
                if (plugin.admin && !isAdmin) { fail('admin', m, this); continue; }
                if (plugin.private && m.isGroup) { fail('private', m, this); continue; }
                if (plugin.register && !_user?.registered) { fail('unreg', m, this); continue; }
                if (plugin.nsfw && !global.db.data.chats[m.chat]?.nsfw && !m.isPv) { fail('nsfw', m, this); continue; } // NSFW check
                // --- FIN DE VERIFICACIONES DE PERMISOS Y CONDICIONES ---

                m.isCommand = true; // Marcar que el mensaje es un comando
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17 // Experiencia por comando
                if (xp > 200) { // Límite de XP por comando para evitar abusos
                    // console.warn(chalk.yellow(`[XP WARN] Plugin ${name} intenta otorgar ${xp} XP. Limitado a 200.`));
                    // m.reply(`⚠️ Se ha detectado una cantidad excesiva de XP para este comando. Se ha limitado.`) // Opcional: notificar al usuario
                    xp = 200; // Limitar XP
                }
                m.exp += xp

                // Verificación de límite de comandos
                if (!isPrems && plugin.limit) {
                    const userLimit = global.db.data.users[m.sender].limit;
                    if (userLimit < plugin.limit * 1) { // plugin.limit es el costo del comando
                        conn.reply(m.chat, `🚫 *Límites Agotados*\nNo tienes suficientes créditos para usar este comando.\n\nNecesitas: ${plugin.limit * 1} | Tienes: ${userLimit}\n\nCompra más créditos o espera a que se recarguen.`, m, global.rcanal);
                        continue;
                    }
                    // No se descuenta el límite aquí, se hace en el `finally` después de ejecutar el comando.
                }

                // Objeto 'extra' con datos útiles para pasar al plugin
                let extra = {
                    match, usedPrefix, noPrefix, _args, args, command, text, conn: this,
                    participants, groupMetadata, user, bot,
                    isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems,
                    chatUpdate, __dirname: ___dirname, __filename
                };

                // --- EJECUCIÓN DEL PLUGIN ---
                try {
                    await plugin.call(this, m, extra); // Ejecutar la función principal del plugin
                    // if (!isPrems) m.limit = m.limit || plugin.limit || false; // Esta línea ya no es necesaria aquí
                } catch (e) {
                    m.error = e; // Guardar el error en el objeto mensaje
                    console.error(chalk.redBright(`[PLUGIN EXECUTION ERROR] Error en plugin '${name}':`), e);
                    if (e) { // Enviar mensaje de error al chat (ocultando API keys)
                        let errorText = format(e);
                        for (let key of Object.values(global.APIKeys || {})) { // Manejar APIKeys undefined
                            if (key) errorText = errorText.replace(new RegExp(key, 'g'), '#HIDDEN_API_KEY#');
                        }
                        m.reply(errorText);
                    }
                } finally {
                    // Ejecutar la función 'after' del plugin si existe (después de procesar el comando)
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra);
                        } catch (e) {
                            console.error(chalk.redBright(`[PLUGIN ERROR] Error en plugin.after (${name}):`), e);
                        }
                    }
                    // Registrar uso de límite (costo del comando)
                    if (plugin.limit && !isPrems) { // Solo si el comando tiene costo y el usuario no es premium
                         global.db.data.users[m.sender].limit -= plugin.limit * 1;
                         // Notificar al usuario sobre el costo y su límite restante podría ser útil aquí o globalmente
                         // conn.reply(m.chat, `Comando ejecutado. Costo: ${plugin.limit * 1} créditos. Créditos restantes: ${global.db.data.users[m.sender].limit}`, m);
                    }
                    // Ya no es necesario m.limit porque el costo se define en el plugin y se descuenta arriba.
                    // if (m.limit) conn.reply(m.chat, `Utilizaste *${+m.limit}* créditos.`, m, global.rcanal)
                }
                // --- FIN DE EJECUCIÓN DEL PLUGIN ---

                break; // Salir del bucle de plugins una vez que se ejecuta un comando
            }
        }
        // --- FIN DEL BUCLE DE PLUGINS ---
    } catch (e) {
        console.error(chalk.redBright('[HANDLER ERROR] Error general en el manejador de mensajes:'), e);
    } finally {
        // Limpiar de la cola de mensajes si la opción está activada
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id);
            if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1);
        }

        // --- ACTUALIZACIÓN DE ESTADÍSTICAS Y DATOS DEL USUARIO ---
        let userDb, stats = global.db.data.stats;
        if (m) { // Solo si hay un mensaje válido
            // Actualizar XP y límite del usuario en la DB (límite ya fue descontado si aplicaba)
            if (m.sender && (userDb = global.db.data.users[m.sender])) {
                userDb.exp += m.exp;
                // userDb.limit -= m.limit * 1; // Ya no se usa m.limit, el descuento es directo
            }

            // Registrar estadísticas del plugin ejecutado
            if (m.plugin) {
                let now = +new Date();
                let stat = stats[m.plugin] || {
                    total: 0,
                    success: 0,
                    last: 0,
                    lastSuccess: 0
                };

                stat.total = (stat.total || 0) + 1;
                stat.last = now;
                if (m.error == null) { // Si no hubo error en la ejecución del plugin
                    stat.success = (stat.success || 0) + 1;
                    stat.lastSuccess = now;
                }
                stats[m.plugin] = stat;
            }
        }
        // --- FIN DE ACTUALIZACIÓN DE ESTADÍSTICAS ---

        // Imprimir detalles del mensaje en consola (si no está deshabilitado)
        try {
            if (!opts['noprint']) {
                const print = await import(`./lib/print.js`); // Módulo para imprimir formateado
                await print.default(m, this);
            }
        } catch (e) {
            console.log(chalk.yellowBright('[PRINT WARN] Error al imprimir detalles del mensaje:'), m, m.quoted, e);
        }

        // Auto-lectura de mensajes (si está activado globalmente o por setting del bot)
        const settingsREAD = global.db.data.settings[this.user.jid] || {};
        if (opts['autoread']) await this.readMessages([m.key]);
        if (settingsREAD.autoread) await this.readMessages([m.key]);
    }
}

/**
 * @description Función global para manejar fallos de comandos (permisos, condiciones, etc.).
 * @param {string} type - El tipo de fallo (ej. 'owner', 'admin', 'premium').
 * @param {object} m - El objeto mensaje.
 * @param {object} conn - La instancia de conexión del bot.
 * @param {string} usedPrefix - El prefijo utilizado en el comando.
 */
global.dfail = (type, m, conn, usedPrefix) => {
    const botName = global.namebot || 'este Bot';
    const contactOwner = `Contacta al propietario para más información.`; // Puedes personalizar esto

    const mensajes = {
        rowner: `👑 *Acceso Denegado*\nSolo el Propietario Principal (ROwner) de ${botName} puede usar este comando.`,
        owner: `🔑 *Acceso Denegado*\nSolo el Propietario (Owner) de ${botName} puede usar este comando.`,
        mods: `🛡️ *Acceso Denegado*\nSolo los Moderadores (Mods) de ${botName} pueden usar este comando.`,
        premium: `💎 *Función Premium*\nEste comando es exclusivo para usuarios Premium. ${contactOwner}`,
        group: `👥 *Solo para Grupos*\nEste comando solo puede ser utilizado dentro de grupos.`,
        private: `👤 *Solo para Chat Privado*\nEste comando solo puede ser utilizado en chats privados.`,
        admin: `🧑‍💼 *Solo para Admins*\nEste comando requiere que seas Administrador del grupo.`,
        botAdmin: `🤖 *Bot Necesita Admin*\n${botName} necesita ser Administrador del grupo para ejecutar este comando.`,
        unreg: `📝 *Registro Requerido*\nDebes registrarte para usar este comando. Usa \`${usedPrefix}registrar <nombre>.<edad>\` para registrarte.`,
        restrict: `⛔ *Función Restringida*\nEsta función ha sido deshabilitada por el propietario de ${botName}.`,
        nsfw: `🔞 *Contenido NSFW*\nEste comando solo puede ser usado en chats marcados como NSFW. Habilítalo con \`${usedPrefix}enable nsfw\`.`
        // Puedes añadir más tipos de fallos aquí si es necesario
    };

    const msg = mensajes[type];
    if (msg) {
        // Usar m.reply para responder directamente al mensaje original si es posible
        return conn.reply(m.chat, msg, m, { mentions: [m.sender], ...global.rcanal }).then(() => m.react('🚫')).catch(e => console.error("Error en dfail reply o react:", e));
    }
    // Fallback para tipos no definidos
    return conn.reply(m.chat, ` Ocurrió un error desconocido al procesar el comando. Tipo de fallo: ${type}`, m, global.rcanal).then(() => m.react('⚠️')).catch(e => console.error("Error en dfail fallback reply o react:", e));
};

// Observador de cambios en handler.js para recarga automática
const file = fileURLToPath(import.meta.url)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magentaBright.bold(`[HANDLER WATCHER] 🔄 'handler.js' actualizado. Recargando...`));
    if (global.reloadHandler) {
        try {
            await global.reloadHandler();
            console.log(chalk.greenBright.bold(`[HANDLER WATCHER] ✅ 'handler.js' recargado exitosamente.`));
        } catch (e) {
            console.error(chalk.redBright.bold(`[HANDLER WATCHER] ❌ Error al recargar 'handler.js':`), e);
        }
    }
})