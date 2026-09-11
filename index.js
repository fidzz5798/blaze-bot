require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// 1. Inisialisasi Database (SQLite)
const db = new QuickDB();

// 2. Inisialisasi Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

const cooldowns = new Set();

// Event ketika bot berhasil login
client.once('ready', () => {
  console.log(`🚀 Bot Blaze Squad Aktif & Online sebagai ${client.user.tag}!`);
});

// Helper untuk membersihkan karakter non-ASCII/Emoji agar tidak bikin kotak-kotak di Linux Canvas
function cleanUsername(name) {
  const cleaned = name.replace(/[^\x00-\x7F]/g, "").trim();
  return cleaned.length > 0 ? cleaned : "User";
}

// 3. Sistem Penambahan XP dari Chat
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;

  // Anti-spam cooldown (1 menit per XP)
  if (!cooldowns.has(userId)) {
    cooldowns.add(userId);
    setTimeout(() => cooldowns.delete(userId), 60000);

    const xpToAdd = Math.floor(Math.random() * 11) + 15; // 15 - 25 XP
    await db.add(`xp_${userId}`, xpToAdd);

    // Pastikan user tercatat di daftar member
    let userList = (await db.get('user_list')) || [];
    if (!userList.includes(userId)) {
      await db.push('user_list', userId);
    }
  }

  // 4. Perintah Leaderboard (!top)
  if (message.content.toLowerCase() === '!top') {
    try {
      const userList = (await db.get('user_list')) || [];
      const leaderData = [];

      for (const id of userList) {
        const xp = (await db.get(`xp_${id}`)) || 0;
        leaderData.push({ id, xp });
      }

      // Urutkan XP dari tertinggi ke terendah
      leaderData.sort((a, b) => b.xp - a.xp);
      const top5 = leaderData.slice(0, 5);

      if (top5.length === 0) {
        return message.reply('Belum ada data XP yang tercatat!');
      }

      // MEMBUAT CANVAS LEADERBOARD
      const canvas = createCanvas(800, 500);
      const ctx = canvas.getContext('2d');

      // Load gambar background dari folder assets
      const bgPath = path.join(__dirname, 'assets', 'leaderboard.png');
      try {
        const background = await loadImage(bgPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
      } catch (err) {
        // Fallback jika gambar background tidak ada
        ctx.fillStyle = '#1e1e2f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Gunakan font Linux standar yang pasti ter-render dengan rapi
      const mainFont = 'serif';

      // Render Judul
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 32px ${mainFont}`;
      ctx.fillText('BLAZE SQUAD LEADERBOARD', 180, 60);

      ctx.font = `bold 22px ${mainFont}`;
      let yPos = 130;

      for (let i = 0; i < top5.length; i++) {
        const item = top5[i];
        let memberName = 'Unknown User';

        try {
          const fetchedMember = await message.guild.members.fetch(item.id);
          memberName = cleanUsername(fetchedMember.displayName);
        } catch {
          memberName = `User (${item.id.slice(0, 5)}...)`;
        }

        // Warna Rank
        ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#ffffff';
        ctx.fillText(`#${i + 1}  ${memberName}`, 80, yPos);

        // Warna XP
        ctx.fillStyle = '#ffaa00';
        ctx.fillText(`${item.xp} XP`, 600, yPos);

        yPos += 70;
      }

      const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'leaderboard.png' });
      await message.reply({ files: [attachment] });

    } catch (error) {
      console.error('Error saat membuat leaderboard:', error);
      message.reply('Terjadi kesalahan saat memproses leaderboard.');
    }
  }
});

// 5. PENANGANAN TOKEN FLEKSIBEL (RAILWAY / LOCAL)
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (!token) {
  console.error("❌ ERROR CRITICAL: Token tidak ditemukan di Environment Variables / Railway Variables!");
  process.exit(1);
}

client.login(token);