// File: features/tictactoe.js

const boardSymbols = {
    X: "❌", O: "⭕",
    1: "1️⃣", 2: "2️⃣", 3: "3️⃣",
    4: "4️⃣", 5: "5️⃣", 6: "6️⃣",
    7: "7️⃣", 8: "8️⃣", 9: "9️⃣",
};

class TicTacToe {
    constructor(playerX = "x", playerO = "o") {
        this.playerX = playerX;
        this.playerO = playerO;
        this._currentTurn = false;
        this._x = 0;
        this._o = 0;
        this.turns = 0;
    }

    get board() { return this._x | this._o; }
    get currentTurn() { return this._currentTurn ? this.playerO : this.playerX; }
    get enemyTurn() { return this._currentTurn ? this.playerX : this.playerO; }

    static check(state) {
        for (let combo of [7, 56, 73, 84, 146, 273, 292, 448])
            if ((state & combo) === combo) return true;
        return false;
    }

    static toBinary(x = 0, y = 0) {
        if (x < 0 || x > 2 || y < 0 || y > 2) throw new Error("invalid position");
        return 1 << (x + 3 * y);
    }

    turn(player = 0, x = 0, y) {
        if (this.board === 511) return -3;
        let pos = 0;
        if (y == null) {
            if (x < 0 || x > 8) return -1;
            pos = 1 << x;
        } else {
            if (x < 0 || x > 2 || y < 0 || y > 2) return -1;
            pos = TicTacToe.toBinary(x, y);
        }
        if (this._currentTurn ^ player) return -2;
        if (this.board & pos) return 0;
        this[this._currentTurn ? "_o" : "_x"] |= pos;
        this._currentTurn = !this._currentTurn;
        this.turns++;
        return 1;
    }

    static render(boardX = 0, boardO = 0) {
        let x = parseInt(boardX.toString(2), 4);
        let y = parseInt(boardO.toString(2), 4) * 2;
        return [...(x + y).toString(4).padStart(9, "0")]
            .reverse()
            .map((value, index) => (value == 1 ? "X" : value == 2 ? "O" : ++index));
    }

    render() {
        return TicTacToe.render(this._x, this._o);
    }

    get winner() {
        let x = TicTacToe.check(this._x);
        let o = TicTacToe.check(this._o);
        return x ? this.playerX : o ? this.playerO : false;
    }
}

function renderBoard(arr) {
    const cells = arr.map((cell) => boardSymbols[String(cell)] || cell);
    return `┌───┬───┬───┐\n│ ${cells[0]} │ ${cells[1]} │ ${cells[2]} │\n├───┼───┼───┤\n│ ${cells[3]} │ ${cells[4]} │ ${cells[5]} │\n├───┼───┼───┤\n│ ${cells[6]} │ ${cells[7]} │ ${cells[8]} │\n└───┴───┴───┘`;
}

if (!global.tictactoeGames) global.tictactoeGames = {};

// Handler 
async function handleTictactoeCommand(sock, msg, from, sender) {
    const existingRoom = Object.values(global.tictactoeGames).find(
        (room) => room.id.startsWith("ttt_") && [room.game.playerX, room.game.playerO].includes(sender)
    );

    if (existingRoom) {
        return sock.sendMessage(from, { text: `❌ Kamu masih dalam game!\nSelesaikan atau ketik *nyerah*.` }, { quoted: msg });
    }

    // Cari room 
    let room = Object.values(global.tictactoeGames).find(
        (r) => r.state === "WAITING" && r.chat === from
    );

    if (room) {
        // Gabung game
        room.game.playerO = sender;
        room.state = "PLAYING";
        const board = renderBoard(room.game.render());

        const txt = `🎮 *𝗧𝗜𝗖 𝗧𝗔𝗖 𝗧𝗢𝗘*\n\nPartner ditemukan!\n\n❌ @${room.game.playerX.split("@")[0]}\n⭕ @${room.game.playerO.split("@")[0]}\n\n${board}\n\n> Giliran: @${room.game.currentTurn.split("@")[0]}\n> Reply/Ketik angka 1-9 untuk jalan.\n> Ketik *nyerah* untuk menyerah.`;
        
        await sock.sendMessage(from, { text: txt, mentions: [room.game.playerX, room.game.playerO] }, { quoted: msg });
    } else {
        // Buat room 
        const roomId = "ttt_" + Date.now();
        global.tictactoeGames[roomId] = {
            id: roomId,
            chat: from,
            game: new TicTacToe(sender, null),
            state: "WAITING",
            createdAt: Date.now(),
        };

        await sock.sendMessage(from, { text: `🎮 *𝗧𝗜𝗖 𝗧𝗔𝗖 𝗧𝗢𝗘*\n\nRoom dibuat! Menunggu partner...\n\n> Ketik *.ttt* untuk bergabung!\n> Game batal otomatis dalam 2 menit jika tidak ada lawan.` }, { quoted: msg });

        // delete 2 menit
        setTimeout(() => {
            if (global.tictactoeGames[roomId]?.state === "WAITING") {
                sock.sendMessage(from, { text: `⏳ Waktu habis, game TicTacToe dibatalkan karena tidak ada lawan.` });
                delete global.tictactoeGames[roomId];
            }
        }, 120000);
    }
}

async function handleTictactoeMove(sock, msg, from, sender, text) {
    if (!text) return false;
    const body = text.trim().toLowerCase();

    const room = Object.values(global.tictactoeGames).find(
        (r) => r.state === "PLAYING" && r.chat === from && [r.game.playerX, r.game.playerO].includes(sender)
    );

    if (!room) return false; 

    // Nyerah
    if (body === "nyerah" || body === "surrender") {
        const winner = sender === room.game.playerX ? room.game.playerO : room.game.playerX;
        await sock.sendMessage(from, { 
            text: `🏳️ *MENYERAH!*\n\n@${sender.split("@")[0]} menyerah!\n🎉 @${winner.split("@")[0]} menang!`,
            mentions: [sender, winner] 
        }, { quoted: msg });
        delete global.tictactoeGames[room.id];
        return true;
    }

    // Filter 
    const move = parseInt(body);
    if (isNaN(move) || move < 1 || move > 9) return false;

    // Giliran
    if (room.game.currentTurn !== sender) {
        await sock.sendMessage(from, { text: "❌ Sabar, belum giliranmu!" }, { quoted: msg });
        return true;
    }

    // Maju
    const player = room.game.playerX === sender ? 0 : 1;
    const result = room.game.turn(player, move - 1);

    if (result === 0) {
        await sock.sendMessage(from, { text: "❌ Posisi sudah terisi, pilih angka lain!" }, { quoted: msg });
        return true;
    }

    if (result === -1) return true; 

    const board = renderBoard(room.game.render());
    const winner = room.game.winner;
    const isTie = room.game.board === 511 && !winner;

    // Menang
    if (winner) {
        const loser = winner === room.game.playerX ? room.game.playerO : room.game.playerX;
        await sock.sendMessage(from, { 
            text: `🎉 *MENANG*\n\n${board}\n\n🏆 @${winner.split("@")[0]} Menang!\n💀 @${loser.split("@")[0]} Kalah!`,
            mentions: [winner, loser] 
        }, { quoted: msg });
        delete global.tictactoeGames[room.id];
        return true;
    }

    // Seri
    if (isTie) {
        await sock.sendMessage(from, { 
            text: `🤝 *SERI!*\n\n${board}\n\nPermainan sengit, tidak ada pemenang!`,
            mentions: [room.game.playerX, room.game.playerO] 
        }, { quoted: msg });
        delete global.tictactoeGames[room.id];
        return true;
    }

    // Giliran Berikutnya
    await sock.sendMessage(from, { 
        text: `🎮 *𝗧𝗜𝗖 𝗧𝗔𝗖 𝗧𝗢𝗘*\n\n${board}\n\n> Giliran: @${room.game.currentTurn.split("@")[0]}`,
        mentions: [room.game.currentTurn] 
    }, { quoted: msg });

    return true;
}

module.exports = { handleTictactoeCommand, handleTictactoeMove };