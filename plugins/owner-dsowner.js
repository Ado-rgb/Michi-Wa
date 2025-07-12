import { promises as fs, existsSync } from 'fs'
import path from 'path'

import { promises as fs, existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';

/**
 * @description Comando para el propietario (rowner) para limpiar la carpeta de sesiones,
 * eliminando todos los archivos excepto 'creds.json'.
 * Útil para resolver problemas de sesión o forzar una nueva conexión sin re-escanear QR.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 */
var handler = async (m, { conn }) => {
  // Este comando solo debe ser ejecutado en la instancia principal del bot.
  if (global.conn.user.jid !== conn.user.jid) {
    return conn.reply(m.chat, `⚠️ Este comando solo puede ser utilizado en la instancia principal de ${global.namebot || 'SYA Team Bot'}.`, m, { ...global.rcanal });
  }
  
  const sessionPath = global.sessions || '.sya_sessions'; // Usar la ruta de config.js o el default

  await conn.reply(m.chat, `⏳ Iniciando limpieza de la carpeta de sesiones (\`./${sessionPath}\`)\nSe conservará \`creds.json\`...`, m, { ...global.rcanal });
  await conn.sendMessage(m.chat, { react: { text: '🧹', key: m.key } });

  try {
    if (!existsSync(sessionPath)) {
      await conn.sendMessage(m.chat, { react: { text: '❓', key: m.key } });
      return conn.reply(m.chat, `ℹ️ La carpeta de sesiones \`./${sessionPath}\` no existe. No hay nada que limpiar.`, m, { ...global.rcanal });
    }

    const files = await fs.readdir(sessionPath);
    let deletedCount = 0;
    let credsFound = false;

    for (const file of files) {
      if (file.toLowerCase() === 'creds.json') {
        credsFound = true;
        continue; // No eliminar creds.json
      }
      try {
        await fs.unlink(path.join(sessionPath, file));
        deletedCount++;
      } catch (unlinkError) {
        console.error(chalk.red(`[SESSION CLEAN] Error al eliminar archivo ${file}:`), unlinkError);
        // Podría notificar de errores individuales, pero puede ser muy verboso.
      }
    }

    let resultMessage = '';
    if (deletedCount > 0) {
      resultMessage = `✅ Se eliminaron *${deletedCount}* archivos de la carpeta de sesiones \`./${sessionPath}\`.`;
      if (credsFound) {
        resultMessage += `\n🔑 El archivo \`creds.json\` se ha conservado.`;
      } else {
        resultMessage += `\n⚠️ No se encontró \`creds.json\`. Si tenías una sesión activa, es posible que necesites escanear el QR nuevamente.`;
      }
      resultMessage += `\n\nℹ️ Es posible que necesites reiniciar el bot para que los cambios surtan efecto completamente.`;
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } else {
      if (credsFound) {
        resultMessage = `ℹ️ No se eliminaron archivos. Solo \`creds.json\` estaba presente en \`./${sessionPath}\`.`;
      } else {
        resultMessage = `ℹ️ La carpeta de sesiones \`./${sessionPath}\` estaba vacía o solo contenía archivos que no se pudieron eliminar.`;
      }
      await conn.sendMessage(m.chat, { react: { text: '🤷', key: m.key } });
    }

    await conn.reply(m.chat, resultMessage, m, { ...global.rcanal });

  } catch (error) {
    console.error(chalk.redBright('[SESSION CLEAN ERROR]'), error);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
    await conn.reply(m.chat, `❌ Ocurrió un error durante la limpieza de sesiones:\n\n\`${error.message || 'Error desconocido.'}\``, m, { ...global.rcanal });
  }
};

handler.help = ['clearsessions', 'limpiarsesion (Solo Propietario Principal)'];
handler.tags = ['owner', 'advanced'];
handler.command = ['delai', 'dsowner', 'clearallsession', 'clearsession', 'limpiarsesion', 'clearsesiones'];
handler.rowner = true; // Solo el propietario principal del bot puede usar esto

export default handler;