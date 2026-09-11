require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
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
const slashCommandsData = [];

// Automatic Command Loader dari folder /commands
const commandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);

    // Kumpulkan data Slash Command jika ada
    if (command.data) {
      slashCommandsData.push(command.data.toJSON());
    }
  }
}

// Register Slash Command saat Bot Ready
client.once('ready', async () => {
  console.log(`🚀 Bot Blaze Squad Aktif & Online sebagai ${client.user.tag}!`);

  const token = process.env.TOKEN || process.env.DISCORD_TOKEN;
  if (token && slashCommandsData.length > 0) {
    const rest = new REST({ version: '10' }).setToken(token);
    try {
      console.log('🔄 Mendaftarkan Slash Commands...');
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: slashCommandsData }
      );
      console.log('✅ Slash Commands berhasil didaftarkan!');
    } catch (error) {
      console.error('❌ Gagal mendaftarkan Slash Commands:', error);
    }
  }
});

// Handler untuk Interaction (Slash Command /say, dll)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    // Menjalankan fungsi execute pada file command
    await command.execute(interaction, db);
  } catch (error) {
    console.error(`Error pada slash command /${interaction.commandName}:`, error);
    
    // Penanganan error aman agar Discord tidak timeout
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: 'Terjadi kesalahan saat menjalankan perintah!' }).catch(() => {});
    } else {
      await interaction.reply({ content: 'Terjadi kesalahan saat menjalankan perintah!', ephemeral: true }).catch(() => {});
    }
  }
});

// Handler untuk Pesan / Prefix Commands (!) & XP
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;

  // Sistem XP Otomatis
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

  // Prefix Command Checker (!)
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command || !command.execute) return;

  try {
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