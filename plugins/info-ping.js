import fs from 'fs';
import path from 'path';
import chalk from 'chalk'; // Para logs

/**
 * @description Calcula y muestra la latencia (ping) del bot.
 * Intenta obtener el nombre del bot específico si es un JadiBot, o usa el global.
 * @param {object} m El objeto mensaje de Baileys.
 * @param {object} conn La instancia de conexión del bot.
 */
const handler = async (m, { conn }) => {
  const startTime = Date.now();

  let currentBotName = global.namebot || 'SYA Team Bot'; // Fallback principal

  // Intentar obtener el nombre específico si es un JadiBot (sub-bot)
  // La carpeta de JadiBots se define en config.js -> global.jadi
  const jadiBotFolder = global.jadi || '.sya_jadibots'; // Usar el valor de config o el default
  const botJid = conn.user?.jid?.split('@')[0]?.replace(/\D/g, '');

  if (botJid) {
    const configPath = path.join(jadiBotFolder, botJid, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.name) {
          currentBotName = config.name;
        }
      } catch (err) {
        console.warn(chalk.yellow(`[PING WARN] No se pudo leer la configuración del sub-bot ${botJid}:`), err);
      }
    }
  }

  const endTime = Date.now();
  const latency = endTime - startTime;

  const pingMessage =
    `Pong! 🏓\n` +
    `Latencia: \`${latency} ms\`\n` +
    `📡 Servidor: ${currentBotName}`;

  await conn.reply(m.chat, pingMessage, m, { ...global.rcanal });
};

handler.command = ['ping', 'p', 'speed', 'velocidad'];
handler.help = ['ping', 'p (Mide la velocidad de respuesta del bot)'];
handler.tags = ['info', 'tools'];
handler.register = true; // Puede ser usado por todos los registrados

export default handler;