var stringSimilarity = require('string-similarity');
const express = require('express');
const fs = require('fs');
var unirest = require("unirest");
const { clearTimeout } = require('timers');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
let port = process.env.PORT || 80;
app.use(express.static('public'));
http.listen(port, () => {
    console.log(`server is running on port ${port}`);
});

class Player {


    constructor(player_id, player_username, player_score) {
        this.player_id = player_id;
        this.player_username = player_username;
        this.player_score = player_score;
    }
    iScore() {
        this.player_score++;
        console.log(this.player_username + "'s score is now " + this.player_score);
    }
    getScore() {
        return { score: this.player_score, username: this.player_username };
    }
    changeUsername(newUsername) {
        this.player_username = newUsername;
    }
}

var latestSong = "",
    playedSongs = [],
    songs = [];
const players = [];
loadSongs(4721934964); // 7484359444
function loadSongs(playlist_id) {
    var req = unirest("GET", `https://deezerdevs-deezer.p.rapidapi.com/playlist/${playlist_id}`);
    req.headers({
        "x-rapidapi-host": "deezerdevs-deezer.p.rapidapi.com",
        "x-rapidapi-key": "epKRh3U4VEmshtTMlMl0V98ulwYjp1ayryGjsnhtqnT9aeyXs3"
    });
    req.end(function (res) {
        if (res.error) console.error(new Error(res.error));
        else {
            songs = res.body.tracks.data;
            console.log(songs.length);
        }
    });
}
let x;
let playersGuessed = 0;
function playNewSong() {
    io.emit('stopSong', latestSong);
    playersGuessed = 0;
    let link;
    let randomChoice = Math.floor(Math.random() * songs.length);
    clearTimeout(x);
    while (playedSongs.includes(randomChoice, 0) && playedSongs.length <= songs.length) {
        console.log(playedSongs.includes(randomChoice, 0));
        randomChoice = Math.floor(Math.random() * 25);
    }
    playedSongs.push(randomChoice);
    latestSong = songs[randomChoice].title.replace(/ *\([^)]*\) */g, "").toUpperCase().trim();
    link = songs[randomChoice].preview
    io.emit('newMusicLink', link);
    x = setTimeout(() => {
        io.emit('stopSong', latestSong);
        io.emit('message', JSON.stringify({
            username: "Server",
            msg: `The correct answer is ${latestSong}`,
            background: "red"
        }))
        playNewSong();
    }, 15000);
    console.log(latestSong);
}

io.on('connection', function (player) {
    console.log('Session created');
    player.on('disconnect', () => {
        console.log(player.id + ' has disconnected')
        for (var i = 0; i < players.length; i++) {
            if (players[i].player_id === player.id) {
                io.emit('userLeft', players[i].player_username);
                players.splice(i, 1);
            }
        }

    });
    player.on('joined', data => {

        console.log(data);
        let user = new Player(player.id, data, 0);
        players.push(user);
        io.emit('userJoined', data);
    })

    player.on('message', data => {
        let newData = JSON.parse(data);
        let msg = newData.msg;

        if (stringSimilarity.compareTwoStrings(msg.toUpperCase().trim(), latestSong) >= 0.75) {
            console.log(`${newData.username} is correct! the answer is ${latestSong}`);
            addScore(player.id);
            io.emit('message', JSON.stringify({
                username: "Server",
                msg: `${newData.username} is correct!`,
                background: "green"
            }))
            playersGuessed++;
            console.log(playersGuessed);
            console.log(players.length);
            console.log(players.length == playersGuessed)
            if (playersGuessed == players.length) {
                playNewSong();
            }
        }
        else {
            handleMessages(player, data);
        }
        // if (msg.trim().indexOf('!changeUsername' == 0)) {
        //     let params = msg.split(' ');
        //     changeuser(player.id, params[1]);
        //     player.emit('changeUsername',players[players.findIndex(p => p.player_id == player.id)].player_username);
        // }
        console.log(player.id + ' : ' + data);
    })
});
function addScore(player_id) {
    //players[players.findIndex(player => player.player_id == player_id)].iScore();
}
function changeuser(player_id, newusername) {
    players[players.findIndex(player => player.player_id == player_id)].changeUsername(newusername);
}
function getScores() {
    let res = '';
    players.forEach(player => {
        res += `${generateColoredText(player.player_username, "blue")} : ${player.player_score} <hr>`;
    })
    return res;
}


function generateColoredText(text, color) {
    return `<span style="color: ${color} !important;">${text}</span> `;
}


//Handle all requests and messages
function handleMessages(player, data) {
    let newData = JSON.parse(data);
    let msg = newData.msg;

    switch (msg) {
        case "!players":
            let x = "";
            players.forEach((player, index) => {
                if (players.length == 1) {
                    x += generateColoredText(player.player_username, "blue");
                }
                else if (index != players.length - 1) {
                    x += generateColoredText(player.player_username, "blue") + ", ";
                }
                else {
                    x += "and " + generateColoredText(player.player_username, "blue");
                }
            })
            io.emit('message', JSON.stringify({
                username: "Server",
                msg: `There are ${generateColoredText(players.length, "green")} currently online! They're ${x}`,
                background: "red"
            }));
            break;
        case "!n":
            playNewSong();
            io.emit('message', JSON.stringify({
                username: "Server",
                msg: `${newData.username} has requested a new song ♥`,
                background: "red"
            }))
            break;
        case "!addScore":
            addScore(player.id);
            break;
        case "!getScores":
            io.emit('scores', JSON.stringify({
                username: "Lobby",
                msg: getScores(),
                background: "red",
            }));
        default:
            io.emit('message', data);
            break;
    }
}