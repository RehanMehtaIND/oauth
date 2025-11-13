// CLOCK
const clockText = document.getElementById("ClockTime");
function updateClock() {
  const now = new Date();
  clockText.textContent = now.toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// NAVIGATION
const sections = {
  POMODORO: document.getElementById("POMODORO"),
  TASKS: document.getElementById("TASKS"),
  EXPENSE: document.getElementById("EXPENSE"),
  CHILL: document.getElementById("CHILL")
};
const buttons = {
  expense: document.getElementById("expenseButton"),
  tasks: document.getElementById("tasksButton"),
  pomodoro: document.getElementById("pomodoroButton"),
  chill: document.getElementById("chillButton")
};
Object.keys(buttons).forEach(key => {
  buttons[key].addEventListener("click", () => {
    Object.values(sections).forEach(sec => sec.style.display = "none");
    sections[key.toUpperCase()].style.display = "block";
  });
});

// POMODORO
let timerDisplay = document.getElementById("timer");
let timerInterval, secondsLeft, isWork = true;
let workDuration = 25 * 60;
let breakDuration = 5 * 60;

function updateTimerDisplay() {
  let min = Math.floor(secondsLeft / 60);
  let sec = secondsLeft % 60;
  timerDisplay.textContent = `${min.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
}

function startPomodoro() {
  if (timerInterval) return;
  secondsLeft = secondsLeft || (isWork ? workDuration : breakDuration);
  timerInterval = setInterval(() => {
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      isWork = !isWork;
      const chime = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
      chime.play();
      secondsLeft = isWork ? workDuration : breakDuration;
      alert(isWork ? "Back to work!" : "Break time! ☕");
      startPomodoro();
    } else {
      secondsLeft--;
      updateTimerDisplay();
    }
  }, 1000);
}

function pausePomodoro() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetPomodoro() {
  clearInterval(timerInterval);
  timerInterval = null;
  isWork = true;
  secondsLeft = workDuration;
  updateTimerDisplay();
}

document.getElementById("startBtn").addEventListener("click", startPomodoro);
document.getElementById("pauseBtn").addEventListener("click", pausePomodoro);
document.getElementById("resetBtn").addEventListener("click", resetPomodoro);
resetPomodoro();

// TASKS
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
document.getElementById("addTaskBtn").addEventListener("click", () => {
  const taskText = taskInput.value.trim();
  if (!taskText) return;
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = taskText;
  span.addEventListener("click", () => span.classList.toggle("task-complete"));
  const del = document.createElement("button");
  del.textContent = "X";
  del.onclick = () => li.remove();
  li.appendChild(span);
  li.appendChild(del);
  taskList.appendChild(li);
  taskInput.value = "";
});

// EXPENSE TRACKER
let balance = 0;
const expenseList = document.getElementById("expenseList");
const balanceDisplay = document.getElementById("balanceDisplay");

document.getElementById("addExpenseBtn").addEventListener("click", () => {
  const name = document.getElementById("expenseName").value.trim();
  const amount = parseFloat(document.getElementById("expenseAmount").value);
  const type = document.getElementById("typeSelect").value;
  if (!name || isNaN(amount) || amount <= 0) return;

  const li = document.createElement("li");
  li.textContent = `${type === "income" ? "💰" : "💸"} ${name} - ₹${amount}`;
  li.style.color = type === "income" ? "lightgreen" : "tomato";

  const del = document.createElement("button");
  del.textContent = "X";
  del.onclick = () => {
    li.remove();
    balance -= type === "income" ? amount : -amount;
    updateBalance();
  };
  li.appendChild(del);
  expenseList.appendChild(li);

  balance += type === "income" ? amount : -amount;
  updateBalance();
  document.getElementById("expenseName").value = "";
  document.getElementById("expenseAmount").value = "";
});

function updateBalance() {
  balanceDisplay.textContent = `Balance: ₹${balance}`;
  balanceDisplay.style.color = balance >= 0 ? "lightgreen" : "red";
}

// SPOTIFY FULL PLAYER
const CLIENT_ID = "adb1a8fad0eb4ca586aae5755ff27123"; // from Spotify Developer Dashboard
const REDIRECT_URI = "https://rehanmehtaind.github.io/"; // or your site
const SCOPES = "streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative";

let player, deviceId;

// Auth flow
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map(x => chars[x % chars.length]).join('');
}

async function redirectToSpotifyAuth() {
  const codeVerifier = generateRandomString(128);
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  localStorage.setItem("code_verifier", codeVerifier);

  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
  window.location.href = authUrl;
}

async function getAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code) return;

  const codeVerifier = localStorage.getItem("code_verifier");
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  const data = await res.json();
  localStorage.setItem("access_token", data.access_token);
  window.history.replaceState({}, document.title, "/");
  return data.access_token;
}

window.onSpotifyWebPlaybackSDKReady = () => {
  const token = localStorage.getItem("access_token");
  if (!token) return;

  player = new Spotify.Player({
    name: "Focus Manager+ Player",
    getOAuthToken: cb => cb(token),
    volume: 0.5
  });

  player.addListener("ready", ({ device_id }) => {
    deviceId = device_id;
    document.getElementById("playerControls").style.display = "block";
    loadUserPlaylists();
  });

  player.addListener("player_state_changed", state => {
    if (!state) return;
    const current = state.track_window.current_track;
    document.getElementById("trackInfo").textContent = `${current.name} — ${current.artists[0].name}`;
    const seekBar = document.getElementById("seekBar");
    seekBar.max = state.duration;
    seekBar.value = state.position;
  });

  player.connect();
};

async function loadUserPlaylists() {
  const token = localStorage.getItem("access_token");
  const res = await fetch("https://api.spotify.com/v1/me/playlists", {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  const container = document.getElementById("spotifyContainer");
  container.innerHTML = "";
  data.items.forEach(pl => {
    const btn = document.createElement("button");
    btn.textContent = pl.name;
    btn.onclick = () => playPlaylist(pl.uri);
    container.appendChild(btn);
  });
}

async function playPlaylist(uri) {
  const token = localStorage.getItem("access_token");
  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    body: JSON.stringify({ context_uri: uri }),
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    }
  });
}

document.getElementById("connectSpotify").onclick = () => redirectToSpotifyAuth();
document.getElementById("playPause").onclick = () => player.togglePlay();
document.getElementById("nextTrack").onclick = () => player.nextTrack();
document.getElementById("prevTrack").onclick = () => player.previousTrack();
document.getElementById("volumeBar").oninput = e => player.setVolume(parseFloat(e.target.value));

getAccessToken().then(token => {
  if (token) loadUserPlaylists();
});
