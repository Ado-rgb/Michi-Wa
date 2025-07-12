import { execSync } from 'child_process';
import util from 'util'; // Para formatear la salida
import chalk from 'chalk';

/**
 * @description Comando para el propietario (rowner) para actualizar el bot desde su repositorio Git.
 * Ejecuta `git pull` y puede especificar una rama.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 * @param {string} text Argumento opcional para especificar la rama u opciones de git pull.
 */
let handler = async (m, { conn, text, usedPrefix, command }) => {
  // La restricción handler.rowner = true ya asegura que solo el owner principal pueda usarlo.
  // No es necesario if (conn.user.jid == conn.user.jid)

  await conn.reply(m.chat, `🔄 Actualizando ${global.namebot || 'el Bot'} desde el repositorio Git...\nPor favor, espera un momento.`, m, { ...global.rcanal });
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    // Construir el comando git pull. Si 'text' está presente, se usa como argumento para git pull (ej. 'origin main').
    // Se asume que el bot se ejecuta desde un repositorio Git.
    const gitCommand = `git pull${text ? ' ' + text.trim() : ''}`;

    console.log(chalk.cyanBright(`[GIT UPDATE] Ejecutando: ${gitCommand}`));
    const stdout = execSync(gitCommand).toString();

    if (stdout.includes('Already up to date.') || stdout.includes('Ya está actualizado.')) {
      await conn.sendMessage(m.chat, { react: { text: '👍', key: m.key } });
      return conn.reply(m.chat, `✅ ${global.namebot || 'El Bot'} ya está en la última versión.\n\`\`\`\n${stdout.trim()}\n\`\`\``, m, { ...global.rcanal });
    }

    const outputMessage =
      `✅ *Actualización desde Git completada.*\n\n` +
      `📄 *Resultado:*\n` +
      `\`\`\`\n${stdout.trim()}\n\`\`\`\n\n` +
      `ℹ️ Es posible que necesites reiniciar el bot para que todos los cambios surtan efecto.\n` +
      `Puedes usar \`${usedPrefix}restart\` si está disponible, o reiniciar manualmente.`;

    await conn.reply(m.chat, outputMessage, m, { ...global.rcanal });
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[GIT UPDATE ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

    let errorMessage = `❌ *Error al actualizar el bot desde Git.*\n\n`;
    if (e.stdout) {
      errorMessage += `📄 *Salida (stdout):*\n\`\`\`\n${e.stdout.toString().trim()}\n\`\`\`\n`;
    }
    if (e.stderr) {
      errorMessage += `❗ *Error (stderr):*\n\`\`\`\n${e.stderr.toString().trim()}\n\`\`\`\n`;
    }
    if (!e.stdout && !e.stderr) {
        errorMessage += `\`${e.message || 'Error desconocido.'}\`\n`;
    }
    errorMessage += `\nVerifica la consola del servidor para más detalles y asegúrate de que Git esté configurado correctamente.`;

    await conn.reply(m.chat, errorMessage, m, { ...global.rcanal });
  }
};

handler.help = ['update [rama]', 'actualizar [rama] (Actualiza el bot desde Git)'];
handler.tags = ['owner', 'advanced'];
handler.command = ['update', 'actualizar', 'gitpull', 'updatebot']; // Nombres más descriptivos
handler.rowner = true; // Solo el propietario principal absoluto

export default handler;
