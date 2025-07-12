import fetch from 'node-fetch';

/**
 * @description Este plugin se ejecuta antes que otros manejadores de mensajes.
 * Su propósito es definir un objeto `global.rcanal` que contiene `contextInfo`
 * para simular que los mensajes del bot son reenviados desde un canal de WhatsApp.
 * Esto puede usarse para dar un aspecto más "oficial" o estilizado a los mensajes del bot.
 *
 * El `idcanal` y `namecanal` deben estar definidos en `config.js`.
 */
export async function before(m, { conn }) {
  // Define o actualiza el contextInfo global para simular reenvío de canal.
  // Este objeto puede ser añadido a las opciones de conn.sendMessage o m.reply.
  global.rcanal = {
    contextInfo: {
      isForwarded: true, // Simula que el mensaje es reenviado
      forwardingScore: 200, // Un puntaje alto para que parezca más "auténtico" (valor arbitrario)
      forwardedNewsletterMessageInfo: {
        newsletterJid: global.idcanal || '120363025247139269@newsletter', // JID del canal (fallback si no está en config)
        serverMessageId: 100, // ID de mensaje del servidor (valor arbitrario, puede ser -1 o un número incremental si se desea)
        newsletterName: global.namecanal || '📢 Canal Oficial', // Nombre del canal (fallback si no está en config)
      }
    }
  };
  // console.log('[DEBUG] global.rcanal definido:', global.rcanal); // Para depuración
}