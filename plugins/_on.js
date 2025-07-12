import fetch from 'node-fetch'

let linkRegex = /chat\.whatsapp\.com\/[0-9A-Za-z]{20,24}/i
let linkRegex1 = /whatsapp\.com\/channel\/[0-9A-Za-z]{20,24}/i
const defaultImage = 'https://files.catbox.moe/ubftco.jpg'


async function isAdminOrOwner(m, conn) {
  try {
    const groupMetadata = await conn.groupMetadata(m.chat)
    const participant = groupMetadata.participants.find(p => p.id === m.sender)
    return participant?.admin || m.fromMe
  } catch {
    return false
  }
}


const handler = async (m, { conn, command, args, isAdmin, isOwner }) => {
  if (!m.isGroup) return m.reply('🔒 Solo funciona en grupos.')

  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  const chat = global.db.data.chats[m.chat]
  const type = (args[0] || '').toLowerCase()
  const enable = command === 'on'

  const availableOptions = ['antilink', 'welcome', 'antiarabe', 'antifake']; // Añadido antifake como ejemplo
  const optionDescriptions = {
    antilink: '🔗 Bloquea enlaces de invitación a otros grupos/canales.',
    welcome: '👋 Activa mensajes de bienvenida y despedida.',
    antiarabe: '🌍 (Experimental) Bloquea la entrada de números con ciertos prefijos internacionales. (Precaución: puede ser impreciso).',
    antifake: '🛡️ (Experimental) Bloquea la entrada de números virtuales/falsos (requiere lógica adicional no implementada aquí).'
  };

  if (!type || !availableOptions.includes(type)) {
    let helpText = `⚙️ *Configuración de Funciones del Grupo*\n\nUsa ${command} seguido de la función y 'on' o 'off'.\nEjemplo: \`${usedPrefix}${command} welcome on\`\n\n*Funciones disponibles:*\n`;
    availableOptions.forEach(opt => {
      helpText += `\n🔹 *${opt}*: ${optionDescriptions[opt] || ''}`;
      const currentStatus = chat[opt] ? chalk.greenBright('Activado') : chalk.redBright('Desactivado');
      helpText += ` (Actual: ${currentStatus})`;
    });
    return m.reply(helpText);
  }

  if (!(isAdmin || isOwner)) return global.dfail('admin', m, conn); // Usar global.dfail

  chat[type] = enable;
  await m.reply(`✨ La función *${type}* ha sido ${enable ? chalk.greenBright('ACTIVADA') : chalk.redBright('DESACTIVADA')} para este grupo.`);
}

handler.command = ['on', 'off', 'enable', 'disable', 'activar', 'desactivar']; // Más alias
handler.group = true;
handler.tags = ['group', 'admin']; // Añadido admin tag
handler.help = ['on <opcion>', 'off <opcion> (Ver lista de opciones con .on)']; // Ayuda mejorada


handler.before = async (m, { conn }) => {
  if (!m.isGroup) return;
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}; // Asegurar que chat exista
  const chat = global.db.data.chats[m.chat];

  // --- Lógica Antiarabe / PrefixBlock ---
  // ADVERTENCIA: Esta lógica es propensa a falsos positivos y puede ser considerada discriminatoria.
  // Se recomienda usar con extrema precaución y considerar alternativas o desactivarla.
  if (chat.antiarabe && m.messageStubType === 27) { // 27 = ADD_PARTICIPANT
    const newJid = m.messageStubParameters?.[0];
    if (!newJid) return;

    const number = newJid.split('@')[0].replace(/\D/g, '');
    // Lista de prefijos a bloquear (ejemplo, el usuario debería poder configurarla)
    const blockedPrefixes = global.blockedPrefixes || ['212', '20', '971', '965', '966', '974', '973', '962'];

    const isBlocked = blockedPrefixes.some(prefix => number.startsWith(prefix));

    if (isBlocked) {
      try {
        await conn.sendMessage(m.chat, {
          text: `🛡️ *Control de Acceso*\nEl usuario @${newJid.split('@')[0]} ha sido removido debido a restricciones de prefijo.\n\n_(Función 'antiarabe' activada)_`,
          mentions: [newJid]
        }, { quoted: m });
        await conn.groupParticipantsUpdate(m.chat, [newJid], 'remove');
        console.log(chalk.yellow(`[ANTIFOREIGN] Usuario ${newJid} removido del grupo ${m.chat} por prefijo bloqueado.`));
        return true; // Detener procesamiento adicional si se remueve
      } catch (e) {
        console.error(chalk.redBright(`[ANTIFOREIGN ERROR] No se pudo remover a ${newJid}:`), e);
        await conn.reply(m.chat, `⚠️ No se pudo remover a @${newJid.split('@')[0]}. Asegúrate de que ${global.namebot} tenga permisos de administrador.`, { mentions: [newJid] });
      }
    }
  }

  // --- Lógica Antilink ---
  if (chat.antilink) {
    const isUserAdmin = await isAdminOrOwner(m, conn); // Usar la función mejorada
    const text = m?.text || '';

    if (!isUserAdmin && (linkRegex.test(text) || linkRegex1.test(text))) {
      const userTag = `@${m.sender.split('@')[0]}`;
      const messageKey = m.key;

      try {
        // Evitar actuar sobre el propio enlace de invitación del grupo
        const ownGroupLink = `https://chat.whatsapp.com/${await conn.groupInviteCode(m.chat)}`;
        if (text.includes(ownGroupLink)) {
          // console.log(chalk.blue(`[ANTILINK] Enlace del propio grupo detectado, no se tomarán acciones para: ${m.sender}`));
          return; // No hacer nada si es el enlace del grupo actual
        }
      } catch (e) {
        console.error(chalk.redBright('[ANTILINK ERROR] Error al obtener el código de invitación del grupo:'), e);
      }

      try {
        await conn.reply(m.chat, `🚫 ${userTag}, los enlaces de invitación a otros grupos/canales no están permitidos aquí.`, m, { mentions: [m.sender] });

        // Eliminar el mensaje con el enlace
        await conn.sendMessage(m.chat, { delete: messageKey });
        console.log(chalk.yellow(`[ANTILINK] Mensaje con enlace eliminado de ${m.sender} en el grupo ${m.chat}.`));

        // Opcional: Expulsar al usuario (descomentar si se desea esta acción más estricta)
        // await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
        // console.log(chalk.red(`[ANTILINK] Usuario ${m.sender} expulsado del grupo ${m.chat} por enviar enlace.`));

      } catch (e) {
        console.error(chalk.redBright(`[ANTILINK ERROR] No se pudo eliminar el mensaje o expulsar a ${userTag}:`), e);
        await conn.reply(m.chat, `⚠️ No pude eliminar el mensaje de @${m.sender.split('@')[0]}. Asegúrate de que ${global.namebot || 'el Bot'} tenga permisos de administrador.`, m, { mentions: [m.sender] });
      }
      return true; // Detener procesamiento adicional
    }
  }

  // --- Lógica de Bienvenida y Despedida ---
  if (chat.welcome && (m.messageStubType === 27 || m.messageStubType === 28 || m.messageStubType === 31 || m.messageStubType === 32)) {
    // 27: ADD_PARTICIPANT (alguien es añadido o se une)
    // 28: REMOVE_PARTICIPANT (alguien es eliminado o sale)
    // 31: GROUP_PARTICIPANT_PROMOTE (alguien es promovido a admin) -> Podría tener su propio mensaje
    // 32: GROUP_PARTICIPANT_DEMOTE (alguien es degradado de admin) -> Podría tener su propio mensaje

    const groupMetadata = await conn.groupMetadata(m.chat).catch(e => console.error("[WELCOME ERROR] No se pudo obtener metadata del grupo:", e));
    if (!groupMetadata) return;

    const groupName = groupMetadata.subject;
    const groupSize = groupMetadata.participants.length;
    // `m.messageStubParameters` contiene los JIDs de los usuarios afectados.
    // Para welcome/bye, usualmente es un solo usuario.
    const affectedUsers = m.messageStubParameters || [m.sender]; // Fallback a m.sender si no hay parámetros (aunque para estos stubTypes debería haber)

    for (const userId of affectedUsers) {
      const userMention = `@${userId.split('@')[0]}`;
      let profilePicUrl = defaultImage; // Imagen por defecto

      try {
        profilePicUrl = await conn.profilePictureUrl(userId, 'image');
      } catch (e) {
        // console.log(chalk.yellow(`[WELCOME WARN] No se pudo obtener la foto de perfil para ${userId}, usando imagen por defecto.`));
      }

      let eventText = '';
      let messageBody = '';

      switch (m.messageStubType) {
        case 27: // Usuario añadido o se unió
          eventText = `🎉 ¡Nuevo Miembro! 🎉`;
          messageBody = `¡Hola ${userMention}!\nBienvenid@ al grupo *${groupName}*.\n\nEsperamos que disfrutes tu estadía.\nRecuerda leer las reglas del grupo.\n\nAhora somos *${groupSize}* miembros.\n\nPowered by ${global.namebot || 'SYA Team Bot'}`;
          break;
        case 28: // Usuario eliminado o salió
          eventText = `👋 ¡Hasta Luego! 👋`;
          messageBody = `Lamentamos ver que ${userMention} ya no está con nosotros en *${groupName}*.\n\n¡Esperamos verte de nuevo pronto!\n\nQuedamos *${groupSize}* miembros.\n\nPowered by ${global.namebot || 'SYA Team Bot'}`;
          break;
        case 31: // Usuario promovido (Opcional: mensaje diferente)
          eventText = `✨ ¡Ascenso! ✨`;
          messageBody = `¡Felicidades ${userMention} por tu ascenso a administrador en *${groupName}*!\n\nPowered by ${global.namebot || 'SYA Team Bot'}`;
          break;
        case 32: // Usuario degradado (Opcional: mensaje diferente)
          eventText = `📉 ¡Cambio de Rol! 📉`;
          messageBody = `${userMention} ya no es administrador en *${groupName}*.\n\nPowered by ${global.namebot || 'SYA Team Bot'}`;
          break;
        default:
          continue; // Si es otro tipo de stub, no hacer nada aquí
      }

      // Enviar mensaje con imagen y texto
      await conn.sendMessage(m.chat, {
        image: { url: profilePicUrl },
        caption: `${eventText}\n\n${messageBody}`,
        mentions: [userId] // Asegurar que se mencione al usuario
      }, { quoted: m }); // Citar el mensaje del evento del grupo
    }
    return true; // Detener procesamiento adicional
  }
}

/**
 * @description Helper para verificar si el remitente es admin o propietario del bot.
 * @param {object} m El objeto mensaje.
 * @param {object} conn La instancia de conexión.
 * @returns {Promise<boolean>} True si es admin u owner, false de lo contrario.
 */
async function isAdminOrOwner(m, conn) {
  if (m.fromMe) return true; // El propio bot es owner
  if (!m.isGroup) return false; // No aplica fuera de grupos
  try {
    const groupMetadata = await conn.groupMetadata(m.chat);
    const participant = groupMetadata.participants.find(p => p.id === m.sender);
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
  } catch (e) {
    console.error(chalk.redBright('[AUTH ERROR] Error al verificar admin status:'), e);
    return false;
  }
}

export default handler;