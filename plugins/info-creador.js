let handler = async (m, { conn }) => {
  let ownerName = 'SYA Team';
  let ownerNumber = ''; // Se intentará obtener del config
  let ownerJid = '';

  if (global.owner && global.owner.length > 0) {
    const mainOwner = global.owner.find(owner => owner[2] === true) || global.owner[0]; // Priorizar owner marcado como true o tomar el primero
    ownerNumber = mainOwner[0].replace(/\D/g, ''); // Solo números
    ownerName = mainOwner[1] || ownerName; // Nombre del owner o fallback
    ownerJid = `${ownerNumber}@s.whatsapp.net`;
  } else {
    // Fallback si global.owner no está configurado como se espera
    ownerName = 'Equipo de Desarrollo (SYA Team)';
    ownerNumber = '1234567890'; // Número de placeholder
    ownerJid = `${ownerNumber}@s.whatsapp.net`;
    conn.reply(m.chat, 'ℹ️ La información del propietario principal no está completamente configurada. Mostrando datos de placeholder.', m);
  }

  let vcard = `
BEGIN:VCARD
VERSION:3.0
N:${ownerName};;;
FN:${ownerName}
TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}
X- développement: SYA Team
X-WA-BIZ-NAME: ${global.namebot || 'SYA Team Bot'}
END:VCARD
`.trim();

  await conn.sendMessage(m.chat, {
    contacts: {
      displayName: ownerName,
      contacts: [{ vcard }],
    },
  }, { quoted: m });

  const botRepoUrl = global.packname && global.packname.includes('github.com') ? global.packname : 'https://github.com/SYA-Team/sya-team-bot'; // Asumiendo que el repo puede estar en packname

  await conn.sendMessage(m.chat, {
    text: `
✨🤖 *${global.namebot || 'SYA Team Bot'}* 🤖✨
Desarrollado con ❤️ por *${ownerName}* (${ownerJid.split('@')[0]}) y el equipo *SYA Team*.

🌟 *Contacto Principal:*
  👤 *Nombre:* ${ownerName}
  📞 *WhatsApp:* wa.me/${ownerNumber}

🛠️ *Proyecto y Soporte:*
  Este bot es un proyecto de *SYA Team*.
  Para soporte técnico, sugerencias o reporte de errores, por favor contacta a través de los canales oficiales o al número principal.

🔗 *Repositorio (si aplica):* ${botRepoUrl}

📬 ¡Gracias por usar nuestros servicios!
`.trim(),
    contextInfo: {
      externalAdReply: {
        title: `Desarrollado por ${ownerName} & SYA Team`,
        body: `${global.namebot || 'SYA Team Bot'} - Soluciones Inteligentes`,
        thumbnailUrl: 'https://raw.githubusercontent.com/SYA-Team/Recursos/main/sya_team_bot_logo.png', // Un logo genérico o del bot
        sourceUrl: botRepoUrl,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m });
};

handler.help = ['creador', 'owner'];
handler.tags = ['info']
handler.command = ['creador', 'owner', 'creator']

export default handler