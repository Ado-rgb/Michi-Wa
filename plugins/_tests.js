/**
 * @description Envía un mensaje con un botón para unirse al grupo oficial del bot.
 * El enlace del grupo y los textos deberían ser configurables idealmente.
 * TODO: Considerar renombrar este plugin a algo como `info-grupooficial.js`.
 * TODO: Hacer el enlace del grupo, frases, etc., configurables desde config.js.
 */

// Frases de invitación más profesionales
const frases = [
  `✨ ¡Únete a nuestra comunidad oficial de ${global.namebot || 'SYA Team Bot'}! ✨`,
  `💬 Participa en nuestro grupo de WhatsApp y mantente al tanto de las novedades.`,
  `🤝 Conecta con otros usuarios y el equipo de desarrollo. ¡Te esperamos!`,
  `🚀 Descubre más sobre ${global.namebot || 'SYA Team Bot'} uniéndote a nuestro grupo.`
];

// Enlace del grupo (debería venir de config.js)
const grupoOficialEnlace = global.linkGrupoOficial || 'https://chat.whatsapp.com/URL_DEL_GRUPO_AQUI';
// Placeholder, el usuario DEBE configurar global.linkGrupoOficial en config.js

const handler = async (m, { conn }) => {
  const texto = frases[Math.floor(Math.random() * frases.length)];

  const buttons = [
    {
      buttonId: 'join_official_group', // ID más descriptivo
      buttonText: { displayText: '🔗 Unirme al Grupo Oficial' },
      type: 1
    }
  ];

  const buttonMessage = {
    text: texto,
    footer: global.namebot || 'SYA Team Bot',
    buttons: buttons,
    headerType: 1,
    // ContextInfo para que el botón abra el enlace directamente
    contextInfo: {
      externalAdReply: {
        showAdAttribution: true, // Mostrar que es un anuncio/enlace externo
        mediaUrl: grupoOficialEnlace, // URL que se abre al tocar
        mediaType: 1, // Tipo de media (1 para URL)
        description: `Canal de comunicación y soporte de ${global.namebot || 'SYA Team Bot'}.`, // Descripción breve
        title: `Comunidad Oficial de ${global.namebot || 'SYA Team Bot'}`, // Título de la vista previa
        thumbnailUrl: global.imagenGrupoOficial || 'https://raw.githubusercontent.com/SYA-Team/Recursos/main/sya_team_bot_logo.png', // URL de una imagen miniatura (logo del bot o del grupo)
        sourceUrl: grupoOficialEnlace // URL de origen
      }
    }
  };

  await conn.sendMessage(m.chat, buttonMessage, { quoted: m, ...global.rcanal });
};

handler.command = ['grupo', 'comunidad', 'grupooficial']; // Comando para invitar al grupo
handler.help = ['grupo (Únete a la comunidad oficial)'];
handler.tags = ['info']; // Tag apropiado
handler.register = true; // Opcional: solo usuarios registrados

export default handler;
