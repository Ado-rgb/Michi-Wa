import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'


global.owner = [
  ['50493732693', 'SYA Team Admin', true], // Ejemplo, el owner real debe configurarlo
  // ['otrousuario', 'SYA Team Member', false]
]

// global.mods y global.prems pueden ser poblados según sea necesario
global.mods = []
global.prems = []

global.libreria = 'Baileys'
global.baileys = '@whiskeysockets/baileys' // Usar el nombre del paquete
global.vs = '2.0.0' // Versión del bot, coincidente con package.json
global.nameqr = 'sya_team_bot_qr'
global.namebot = '✨ SYA Team Bot ✨'
global.sessions = '.sya_sessions' // Renombrar carpeta de sesiones para evitar conflictos
global.jadi = '.sya_jadibots' // Renombrar carpeta de JadiBots
global.yukiJadibts = true // Mantener si la funcionalidad es deseada

global.packname = '⚜️ SYA Team Bot ⚜️'
// global.namebot ya está definido arriba, se puede eliminar la re-definición o unificar.
// Para evitar confusión, se comentará la siguiente línea y se usará la de arriba.
// global.namebot = '✧ Michi-Wa ✧'
global.author = '© Powered by SYA Team'


global.namecanal = '📢 SYA Team Channel 📢' // Nombre de ejemplo
global.canal = 'https://whatsapp.com/channel/YOUR_SYA_TEAM_CHANNEL_ID' // Reemplazar con el canal real
global.idcanal = 'YOUR_SYA_TEAM_NEWSLETTER_ID@newsletter' // Reemplazar con el ID real

global.ch = { // Canales adicionales si son necesarios
  ch1: 'ID_CANAL_ADICIONAL_1@newsletter',
}

global.multiplier = 69 
global.maxwarn = '2'


let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})