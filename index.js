require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { QuickDB } = require('quick.db');
const fs = require('fs');
const path = require('path');

const db = new QuickDB();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();
const cooldowns = new Set();

// Automatic Command Loader dari folder /commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
  }
}

client.once('ready', () => {
  console.log(`🚀 Bot Blaze Squad Aktif & Online sebagai ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;

  // 1. Sistem XP Otomatis dari Chat
  if (!cooldowns.has(userId)) {
    cooldowns.add(userId);
    setTimeout(() => cooldowns.delete(userId), 60000);

    const xpToAdd = Math.floor(Math.random() * 11) + 15;
    await db.add(`xp_${userId}`, xpToAdd);

    let userList = (await db.get('user_list')) || [];
    if (!userList.includes(userId)) {
      await db.push('user_list', userId);
    }
  }

  // 2. Pembaca Perintah Prefix (!)
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    // Eksekusi file command secara independen
    await command.execute(message, args, db);
  } catch (error) {
    console.error(`Error pada perintah !${commandName}:`, error);
    message.reply('Terjadi kesalahan saat menjalankan perintah tersebut!');
  }
});

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
if (!token) {
  console.error("❌ ERROR CRITICAL: Token tidak ditemukan!");
  process.exit(1);
}

client.login(token);