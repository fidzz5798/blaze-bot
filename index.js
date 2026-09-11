require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const { createCanvas, loadImage } = require('canvas');
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

const cooldowns = new Set();

client.once('ready', () => {
    console.log(`🔥 Bot Blaze Squad Aktif sebagai ${client.user.tag}!`);
});

// 1. SISTEM PENAMBAHAN XP DARI CHAT
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Perintah untuk menampilkan Leaderboard Top 10
    if (message.content.toLowerCase() === '!top' || message.content.toLowerCase() === '!leaderboard') {
        return generateLeaderboard(message);
    }

    // Cooldown 60 detik agar tidak di-spam
    if (cooldowns.has(message.author.id)) return;

    const xpToAdd = Math.floor(Math.random() * 10) + 15; // Random 15-25 XP per chat
    const userKey = `xp_${message.guild.id}_${message.author.id}`;
    
    let currentXP = (await db.get(userKey)) || 0;
    currentXP += xpToAdd;
    await db.set(userKey, currentXP);

    cooldowns.add(message.author.id);
    setTimeout(() => cooldowns.delete(message.author.id), 60000);
});

// 2. GENERATE GAMBAR TOP 10 LEADERBOARD
async function generateLeaderboard(message) {
    const loadingMsg = await message.reply("⚡ Mengambil data & merender Leaderboard Top 10...");

    try {
        const allData = await db.all();
        const prefix = `xp_${message.guild.id}_`;
        
        let leaderboardData = allData
            .filter(data => data.id.startsWith(prefix))
            .map(data => ({
                userId: data.id.replace(prefix, ''),
                xp: data.value
            }))
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);

        if (leaderboardData.length === 0) {
            return loadingMsg.edit("Belum ada data XP tercatat. Mulailah mengobrol di channel!");
        }

        const canvas = createCanvas(800, 1000);
        const ctx = canvas.getContext('2d');

        const bgPath = path.join(__dirname, 'assets', 'leaderboard.png');
        try {
            const background = await loadImage(bgPath);
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        } catch (e) {
            ctx.fillStyle = '#111113';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(30, 140, 740, 820);

        ctx.fillStyle = '#FF4500';
        ctx.font = 'bold 36px Sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BLAZE SQUAD LEADERBOARD', canvas.width / 2, 80);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Sans-serif';
        ctx.fillText('TOP 10 MEMBER TERAKTIF', canvas.width / 2, 115);

        let startY = 180;
        ctx.textAlign = 'left';

        for (let i = 0; i < leaderboardData.length; i++) {
            const item = leaderboardData[i];
            let member;
            try {
                member = await message.guild.members.fetch(item.userId);
            } catch (err) {
                member = null;
            }

            const username = member ? member.user.displayName : 'Unknown User';
            const avatarUrl = member 
                ? member.user.displayAvatarURL({ extension: 'png', size: 128 })
                : 'https://cdn.discordapp.com/embed/avatars/0.png';

            ctx.fillStyle = i < 3 ? 'rgba(255, 69, 0, 0.25)' : 'rgba(255, 255, 255, 0.05)';
            ctx.fillRect(50, startY - 30, 700, 65);

            ctx.fillStyle = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#FFFFFF';
            ctx.font = 'bold 24px Sans-serif';
            ctx.fillText(`#${i + 1}`, 70, startY + 10);

            try {
                const avatarImg = await loadImage(avatarUrl);
                ctx.save();
                ctx.beginPath();
                ctx.arc(160, startY + 2, 22, 0, Math.PI * 2, true);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(avatarImg, 138, startY - 20, 44, 44);
                ctx.restore();
            } catch (err) {}

            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 22px Sans-serif';
            ctx.fillText(username.length > 18 ? username.substring(0, 15) + '...' : username, 200, startY + 10);

            ctx.fillStyle = '#FF6347';
            ctx.font = 'bold 20px Sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`${item.xp.toLocaleString()} XP`, 720, startY + 10);
            ctx.textAlign = 'left';

            startY += 75;
        }

        const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'top10-leaderboard.png' });
        await loadingMsg.delete();
        await message.channel.send({ files: [attachment] });

    } catch (error) {
        console.error(error);
        loadingMsg.edit("❌ Terjadi kesalahan saat merender gambar leaderboard.");
    }
}

// PEMBACAAN TOKEN & LOGGING ERROR LOGIN
const token = process.env.DISCORD_TOKEN || process.env.DiscordToken;

if (!token) {
    console.error("❌ ERROR: TOKEN BOT TIDAK DITEMUKAN DI FILE .env!");
    console.error("Pastikan file .env kamu berisi baris: DISCORD_TOKEN=token_bot_kamu");
} else {
    client.login(token).catch(err => {
        console.error("❌ GAGAL LOGIN KE DISCORD:");
        console.error(err.message);
    });
}