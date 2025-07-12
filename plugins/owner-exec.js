/**
 * @description Comando de propietario para ejecutar código directamente en el servidor.
 * ADVERTENCIA: Esta funcionalidad es extremadamente peligrosa si no se maneja con cuidado.
 * Actualmente, este plugin está vacío y no tiene funcionalidad implementada.
 * Implementar con extrema precaución y solo para uso del propietario principal (rowner).
 */
import { exec } from 'child_process';
import util from 'util';
import chalk from 'chalk';

const execAsync = util.promisify(exec);

const handler = async (m, { conn, text, usedPrefix, command, isROwner }) => {
  if (!isROwner) {
    return global.dfail('rowner', m, conn);
  }

  if (!text) {
    return conn.reply(m.chat,
      `💻 *Ejecutor de Comandos del Servidor (Owner)*\n\n` +
      `Por favor, ingresa el comando que deseas ejecutar en el servidor.\n` +
      `*Uso:* \`${usedPrefix}${command} <comando>\`\n\n` +
      `⚠️ *ADVERTENCIA:* Este comando ejecuta código directamente en el servidor donde corre el bot. Úsalo con extrema precaución. Un comando incorrecto puede dañar el sistema o comprometer la seguridad.`,
      m, { ...global.rcanal }
    );
  }

  await conn.reply(m.chat, `⚙️ Ejecutando comando en el servidor: \`$ ${text}\`\nPor favor, espera...`, m);
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

  try {
    const { stdout, stderr } = await execAsync(text);
    let output = '';
    if (stdout) output += `✅ *Salida Estándar (stdout):*\n\`\`\`\n${stdout.trim()}\n\`\`\`\n\n`;
    if (stderr) output += `❌ *Salida de Error (stderr):*\n\`\`\`\n${stderr.trim()}\n\`\`\`\n\n`;
    if (!stdout && !stderr) output = 'ℹ️ El comando se ejecutó sin salida estándar ni de error.';

    await conn.reply(m.chat, output.trim(), m, { ...global.rcanal });
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

  } catch (e) {
    console.error(chalk.redBright('[EXEC COMMAND ERROR]'), e);
    await conn.sendMessage(m.chat, { react: { text: '💥', key: m.key } });
    await conn.reply(m.chat,
      `💥 *Error al ejecutar el comando:*\n\n` +
      `\`\`\`\n${e.message || 'Error desconocido.'}\n\`\`\`\n` +
      (e.stdout ? `\n*stdout:*\n\`\`\`\n${e.stdout}\n\`\`\`` : '') +
      (e.stderr ? `\n*stderr:*\n\`\`\`\n${e.stderr}\n\`\`\`` : ''),
      m, { ...global.rcanal }
    );
  }
};

handler.help = ['exec <comando>', '$ <comando> (Ejecuta comandos en el servidor - SOLO OWNER)'];
handler.command = ['$', 'exec'];
handler.tags = ['owner', 'advanced'];
handler.rowner = true; // Solo el propietario principal absoluto del bot
handler.register = false; // No es para usuarios registrados

export default handler;
