/**
 * @description Comando para obtener el JID (identificador de usuario) del remitente sin el dominio @s.whatsapp.net.
 * Útil para desarrolladores o para que los usuarios obtengan su ID numérico.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 */
const handler = async (m, { conn }) => {
  const sender = m.sender; // JID completo: numero@s.whatsapp.net
  const number = sender.split('@')[0]; // Extraer solo la parte numérica del JID

  const responseText = `✨ *Tu ID de Usuario*\n\n🆔 JID: \`${sender}\`\n🔢 Número: \`${number}\``;

  // Enviar respuesta con el JID y el número
  await conn.reply(m.chat, responseText, m, { mentions: [m.sender], ...global.rcanal });
};

handler.command = ["lid", "getid", "myid", "miid"]; // Añadidos alias comunes
handler.tags = ["tools", "info"]; // Añadido tag "info"
handler.help = ["lid", "getid", "myid (Obtiene tu ID)"]; // Mejorada la descripción de ayuda
handler.register = true; // Solo usuarios registrados pueden usarlo (opcional, pero buena práctica para comandos de info personal)

export default handler;