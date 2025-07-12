import chalk from 'chalk';

/**
 * @description Permite a los usuarios enviar sugerencias al propietario del bot.
 * La sugerencia se envía al JID del propietario principal definido en `global.owner`.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text El texto de la sugerencia.
 * @param {string} usedPrefix El prefijo utilizado.
 * @param {string} command El comando invocado.
 */
let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text || !text.trim()) {
    return conn.reply(m.chat,
      `📝 *Enviar Sugerencia*\n\n` +
      `Por favor, escribe la sugerencia que deseas enviar al propietario de ${global.namebot || 'este Bot'}.\n\n` +
      `*Uso:* \`${usedPrefix}${command} <tu sugerencia>\`\n` +
      `*Ejemplo:* \`${usedPrefix}${command} Me gustaría que el bot tuviera un comando para X cosa.\``,
      m, { ...global.rcanal }
    );
  }

  if (text.length < 10) {
    return conn.reply(m.chat, `⚠️ Tu sugerencia es demasiado corta. Por favor, describe con un poco más de detalle (mínimo 10 caracteres).`, m, { ...global.rcanal });
  }
  if (text.length > 1000) {
    return conn.reply(m.chat, `⚠️ Tu sugerencia es demasiado larga (máximo 1000 caracteres). Por favor, intenta resumirla.`, m, { ...global.rcanal });
  }

  // Obtener el JID del propietario principal
  let ownerJid = '';
  if (global.owner && global.owner.length > 0) {
    const mainOwner = global.owner.find(owner => owner[2] === true) || global.owner[0];
    if (mainOwner && mainOwner[0]) {
      ownerJid = mainOwner[0].replace(/\D/g, '') + '@s.whatsapp.net';
    }
  }

  if (!ownerJid) {
    console.error(chalk.redBright('[SUGGESTION ERROR] No se encontró un JID de propietario válido en config.js.'));
    return conn.reply(m.chat, `❌ No se pudo enviar la sugerencia. El propietario del bot no ha sido configurado correctamente.`, m, { ...global.rcanal });
  }

  const senderName = await conn.getName(m.sender);
  const senderJid = m.sender;

  const suggestionTextForOwner =
    `📬 *Nueva Sugerencia Recibida*\n\n` +
    `👤 *De:* ${senderName} (${senderJid})\n` +
    `⏰ *Fecha:* ${new Date().toLocaleString('es-ES', { timeZone: 'America/Tegucigalpa' })}\n\n` + // Ajustar timezone si es necesario
    `💡 *Sugerencia:*\n` +
    `${text}\n\n` +
    `💬 *Chat ID:* ${m.chat}\n` +
    `🤖 *Bot:* ${global.namebot || 'SYA Team Bot'} (${conn.user.jid})`;

  try {
    await conn.reply(ownerJid, m.quoted ? suggestionTextForOwner + '\n\n📝 *Contexto del mensaje citado:*\n' + m.quoted.text : suggestionTextForOwner, null, { // Enviar sin citar al owner, pero sí con el contexto si el usuario citó.
      // mentions: conn.parseMention(suggestionTextForOwner) // No es necesario mencionar al owner en su propio chat.
    });

    await conn.reply(m.chat, `✅ ¡Tu sugerencia ha sido enviada exitosamente al propietario de ${global.namebot || 'este Bot'}! Gracias por tu feedback. 👍`, m, { ...global.rcanal });
    await conn.sendMessage(m.chat, { react: { text: '📨', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[SUGGESTION SEND ERROR]'), e);
    await conn.reply(m.chat, `❌ Ocurrió un error al enviar tu sugerencia. Por favor, inténtalo de nuevo más tarde.`, m, { ...global.rcanal });
    await conn.sendMessage(m.chat, { react: { text: '⚠️', key: m.key } });
  }
};

handler.help = ['sugerir <tu sugerencia>', 'sug <tu sugerencia>'];
handler.tags = ['info', 'main'];
handler.command = ['sugerir', 'sug', 'suggest', 'suggestion'];
handler.register = true;
handler.limit = true; // Para evitar spam de sugerencias

export default handler;