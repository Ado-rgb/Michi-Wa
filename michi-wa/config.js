import { watchFile, unwatchFile } from 'fs' 
import chalk from 'chalk'
import { fileURLToPath } from 'url'


global.owner = [
  ['50493732693', 'Wirk', true],
]


global.mods = []
global.prems = []

global.libreria = 'Baileys'
global.baileys = 'V 6.7.16' 
global.vs = '2.2.0'
global.nameqr = 'MichiWaMD'
global.namebot = '✿◟ʏᴜʀᴜ ʏᴜʀɪ ᴍᴅ◞✿'
global.sessions = 'Sessions'
global.jadi = 'JadiBots' 
global.yukiJadibts = true

global.packname = '✦ Michi-Wa ✦'
global.namebot = '✧ Michi-Wa ✧'
global.author = '© Made with ☁︎ Wirk ✧'


global.namecanal = '✧ Ado Channel ☎︎'
global.canal = 'https://whatsapp.com/channel/0029Vb5pM031CYoMvQi2I02D'
global.idcanal = '120363403739366547@newsletter'

global.ch = {
ch1: '120363420941524030@newsletter',
}

global.multiplier = 69 
global.maxwarn = '2'


let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  import(`${file}?update=${Date.now()}`)
})