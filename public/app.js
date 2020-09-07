
let username = prompt("Whats you're username") || `Guest User#${Math.floor(Math.random() * 1000)}`;
const zoo = document.querySelector('main');
const scoreElement = document.querySelector('.score .value');
const logDiv = document.querySelector('.log');
const socket = io();
const chatBox = document.querySelector('#message-input-field');
const chatWindow = document.querySelector('#chatWindow');
const musicPlayer = document.querySelector('audio');
document.querySelector('form').addEventListener('submit', (e) => {
  e.preventDefault();
  socket.emit("message", JSON.stringify({
    username: username,
    msg: chatBox.value
  }));
  console.log(chatBox.value)
  chatBox.value = ``;
});
socket.emit("joined", username);
setupEvents();
let debug = false;
if (window.location.href.indexOf('?debug') > 0) {
  debug = true;
  createMessage("You're in debug mode.", "SERVER");
}

function createMessage(textMessage, username) {

  let msg = document.createElement('p');
  msg.innerHTML = username ? `${generateColoredText(username, "blue")}: ${textMessage}` : `${textMessage}`;
  msg.classList.add(`fadeIn`);
  msg.classList.add(`msg`);
  setTimeout(() => {
    msg.classList.remove(`fadeIn`);
    msg.classList.add(`remove`);
    setTimeout(() => {
      msg.remove();
    }, 200)
  }, 4500);
  chatWindow.appendChild(msg);
}

function generateColoredText(text, color) {
  return `<span style="color: ${color} !important;">${text}</span> `;
}

function addToLog(data) {
  let l = document.createElement('p');
  l.innerHTML = data;
  l.classList.add(`fadeIn`);
  chatWindow.appendChild(l);
  setTimeout(() => {
    l.classList.remove(`fadeIn`);
    l.classList.add(`remove`);
    setTimeout(() => {
      l.remove();
    }, 30)
  }, 3500)
}

function setupEvents() {
  socket.on('message', msgJson => {
    console.log(msgJson);
    let msgObject = JSON.parse(msgJson);
    addToLog(generateColoredText(msgObject.username, "blue") + " : " + msgObject.msg);
  })
  socket.on('userJoined', us => {
    createMessage(`${generateColoredText(us, "blue")} has ${generateColoredText("joined", "blue")} the game!`, "Lobby");
  });
  socket.on('userLeft', us => {
    createMessage(`${generateColoredText(us, "blue")} has ${generateColoredText("left", "red")} the game!`, "Lobby");
  });
  socket.on('scores', data => {
    let msgObject = JSON.parse(data);
    createMessage(msgObject.msg)
  })
  socket.on('newMusicLink', link => {
    musicPlayer.pause();
    musicPlayer.src = link;
    musicPlayer.play();
  });
}