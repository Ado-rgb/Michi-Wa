import chalk from 'chalk';

/**
 * @description Comando para que administradores de grupo expulsen a un miembro.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string[]} args Argumentos del comando (puede ser un número de teléfono).
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
const handler = async (m, { conn, args, usedPrefix, command }) => {
  // No es necesario `if (!m.isGroup)` si se usa `handler.group = true`
  // No es necesario verificar `isUserAdmin` si se usa `handler.admin = true`

  let userToKick;
  if (m.mentionedJid && m.mentionedJid[0]) {
    userToKick = m.mentionedJid[0];
  } else if (m.quoted) {
    userToKick = m.quoted.sender;
  } else if (args[0]) {
    const number = args[0].replace(/\D/g, ''); // Limpiar y obtener solo números
    if (!number) {
      return conn.reply(m.chat,
        `🔢 El número proporcionado no es válido. Intenta con un número de teléfono correcto o menciona al usuario.`,
        m, { ...global.rcanal }
      );
    }
    userToKick = `${number}@s.whatsapp.net`;
  } else {
    return conn.reply(m.chat,
      `❓ ¿A quién deseas expulsar?\n\n` +
      `*Uso:* ${usedPrefix}${command} <@mención/número> o responde al mensaje de un usuario.\n` +
      `*Ejemplo:* ${usedPrefix}${command} @${m.sender.split('@')[0]}`,
      m, { mentions: [m.sender], ...global.rcanal }
    );
  }

  const groupMetadata = await conn.groupMetadata(m.chat);
  const botJid = conn.user.jid;
  const ownerGroupJid = groupMetadata.owner || ''; // JID del propietario del grupo

  // Protección: No expulsar al propio bot
  if (userToKick === botJid) {
    await conn.sendMessage(m.chat, { react: { text: '😅', key: m.key } });
    return conn.reply(m.chat, `😅 No puedo expulsarme a mí mismo.`, m, { ...global.rcanal });
  }

  // Protección: No expulsar al propietario del grupo
  if (userToKick === ownerGroupJid) {
    await conn.sendMessage(m.chat, { react: { text: '🛡️', key: m.key } });
    return conn.reply(m.chat, `🛡️ No se puede expulsar al propietario del grupo.`, m, { ...global.rcanal });
  }

  // Protección: No expulsar a los propietarios del bot
  const isBotOwnerTarget = global.owner.some(ownerEntry => userToKick.startsWith(ownerEntry[0]));
  if (isBotOwnerTarget) {
    await conn.sendMessage(m.chat, { react: { text: '🛡️', key: m.key } });
    return conn.reply(m.chat, `🛡️ No se puede expulsar a un propietario de ${global.namebot || 'este Bot'}.`, m, { ...global.rcanal });
  }

  // Verificar si el objetivo es administrador
  const targetUserParticipant = groupMetadata.participants.find(p => p.id === userToKick);
  if (targetUserParticipant?.admin) {
      // Si el que ejecuta el comando no es el owner del grupo, no puede kickear a otro admin
      if (m.sender !== ownerGroupJid) {
        await conn.sendMessage(m.chat, { react: { text: '🔒', key: m.key } });
        return conn.reply(m.chat, `🔒 No puedes expulsar a otro administrador si no eres el propietario del grupo.`, m, { ...global.rcanal });
      }
  }


  try {
    await conn.reply(m.chat, `🚮 Expulsando a @${userToKick.split('@')[0]}...`, m, { mentions: [userToKick] });
    await conn.groupParticipantsUpdate(m.chat, [userToKick], 'remove');
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    // Mensaje de confirmación opcional, el anterior ya notifica.
    // await conn.reply(m.chat, `✅ @${userToKick.split('@')[0]} ha sido expulsado del grupo.`, m, { mentions: [userToKick], ...global.rcanal });

  } catch (e) {
    console.error(chalk.redBright('[KICK ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    conn.reply(m.chat,
      `❌ No se pudo expulsar a @${userToKick.split('@')[0]}.\n\n` +
      `*Posibles causas:*\n` +
      `- ${global.namebot || 'El Bot'} no es administrador del grupo.\n` +
      `- El usuario ya no es miembro del grupo.\n` +
      `- Estás intentando expulsar al propietario del grupo (y no lo eres).\n` +
      `- Error interno: \`${e.message || 'Desconocido'}\``,
      m, { mentions: [userToKick], ...global.rcanal }
    );
  }
};

handler.help = ['kick @usuario/número', 'echar @usuario', 'sacar @usuario (Expulsa miembro)'];
handler.command = ['kick', 'echar', 'sacar', 'ban']; // 'hechar' removido, 'ban' es común
handler.tags = ['group', 'admin'];

handler.group = true;     // Comando solo para grupos
handler.admin = true;     // Requiere que el usuario sea admin del grupo
handler.botAdmin = true;  // Requiere que el bot sea admin del grupo
handler.register = true;
// handler.limit = true; // Opcional, para evitar abuso si se desea

export default handler;