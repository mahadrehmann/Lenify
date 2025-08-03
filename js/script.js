// script.js

const CDN_BASE    = "https://cdn.jsdelivr.net/gh/mahadrehmann/lenify-tracks@main";
const TRACKS_JSON = `${CDN_BASE}/tracks.json`;

let currentTrack = new Audio();
let tracks = [];
let currFolder = "";

function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

async function getTracks(folder) {
  currFolder = folder;
  const resp = await fetch(TRACKS_JSON);
  if (!resp.ok) throw new Error("Cannot load tracks.json");
  const data = await resp.json();
  tracks = data[folder] || [];

  const ul = document.querySelector(".trackList ul");
  ul.innerHTML = tracks.map(t => {
    const display = t.name.replace(/\.mp3$/, "");
    return `
      <li data-fullname="${encodeURIComponent(t.name)}" class="track-item">
        <img class="invert" width="34" src="img/music.svg" alt="music icon">
        <div class="info"><div>${display}</div></div>
        <div class="playnow"><span>Play Now</span><img class="invert" src="img/play.svg" alt="play button"></div>
      </li>`;
  }).join("");

  document.querySelectorAll(".trackList li").forEach(el =>
    el.addEventListener("click", () => playMusic(decodeURIComponent(el.dataset.fullname)))
  );

  return tracks;
}

async function playMusic(trackName, pause = false) {
  const url = `${CDN_BASE}/${encodeURIComponent(currFolder)}/${encodeURIComponent(trackName)}`;

  currentTrack.src = url;
  currentTrack.preload = "metadata";

  if (!pause) {
    try { await currentTrack.play(); }
    catch { /* autoplay blocked until user interacts */ }
  }

  document.querySelector(".trackinfo").textContent = trackName.replace(/\.mp3$/, "");
  document.querySelector(".tracktime").textContent = "00:00 / 00:00";
  document.getElementById("play").src = "img/pause.svg";
}

async function displayAlbums() {
  const resp = await fetch(TRACKS_JSON);
  const data = await resp.json();

  const container = document.querySelector(".cardContainer");
  container.innerHTML = "";

  for (const folder of Object.keys(data)) {
    let info = { title: folder, description: "" };
    try {
      const r = await fetch(`${CDN_BASE}/${encodeURIComponent(folder)}/info.json`);
      if (r.ok) info = await r.json();
    } catch {}

    const coverUrl = `${CDN_BASE}/${encodeURIComponent(folder)}/cover.jpg`;

    container.innerHTML += `
      <div data-folder="${folder}" class="card">
        <div class="play">▶️</div>
        <img src="${coverUrl}" alt="${info.title}">
        <h2>${info.title}</h2>
        <p>${info.description}</p>
      </div>`;
  }

  document.querySelectorAll(".card").forEach(card =>
    card.addEventListener("click", async () => {
      await getTracks(card.dataset.folder);
      playMusic(tracks[0]?.name);
    })
  );
}

function showNotification(message) {
  const notif = document.createElement("div");
  notif.textContent = message;
  Object.assign(notif.style, {
    position: "fixed", bottom: "110px", left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(0,0,0,0.6)", color: "#fff", padding: "12px 20px",
    borderRadius: "40px", fontSize: "15px", zIndex: 1000
  });
  document.body.appendChild(notif);
  setTimeout(() => {
    notif.style.transition = "opacity 1s"; notif.style.opacity = 0;
    setTimeout(() => notif.remove(), 800);
  }, 2000);
}

async function main() {
  document.querySelector(".trackinfo").textContent = "";
  await displayAlbums();

  document.getElementById("play").addEventListener("click", () => {
    if (currentTrack.paused) {
      currentTrack.play();
      document.getElementById("play").src = "img/pause.svg";
    } else {
      currentTrack.pause();
      document.getElementById("play").src = "img/play.svg";
    }
  });

  currentTrack.addEventListener("timeupdate", () => {
    document.querySelector(".tracktime").textContent =
      `${secondsToMinutesSeconds(currentTrack.currentTime)} / ${secondsToMinutesSeconds(currentTrack.duration)}`;
    document.querySelector(".circle").style.left =
      `${(currentTrack.currentTime / currentTrack.duration) * 100}%`;
  });

  document.querySelector(".seekbar").addEventListener("click", e => {
    const w = e.currentTarget.getBoundingClientRect().width;
    const pct = e.offsetX / w;
    currentTrack.currentTime = currentTrack.duration * pct;
    document.querySelector(".circle").style.left = `${pct * 100}%`;
  });

  document.querySelector(".volume input").addEventListener("input", e => {
    currentTrack.volume = e.target.value / 100;
    const img = document.querySelector(".volume>img");
    img.src = currentTrack.volume > 0 ? img.src.replace("mute.svg","volume.svg")
                                      : img.src.replace("volume.svg","mute.svg");
  });

  document.querySelector(".volume>img").addEventListener("click", e => {
    const img = e.currentTarget;
    if (currentTrack.volume !== 0) {
      currentTrack.volume = 0;
      img.src = img.src.replace("volume.svg","mute.svg");
      document.querySelector(".volume input").value = 0;
    } else {
      currentTrack.volume = 0.1;
      img.src = img.src.replace("mute.svg","volume.svg");
      document.querySelector(".volume input").value = 10;
    }
  });

  document.querySelector(".loop").addEventListener("click", () => {
    currentTrack.loop = !currentTrack.loop;
    const loopImg = document.querySelector(".loop img");
    loopImg.src = currentTrack.loop ? "img/loop-on.svg" : "img/loop.svg";
    showNotification(currentTrack.loop ? "Loop on" : "Loop off");
  });

  document.getElementById("previous").addEventListener("click", () => {
    currentTrack.pause();
    const idx = tracks.findIndex(t => t.name === currentTrack.src.split('/').pop());
    if (idx > 0) playMusic(tracks[idx - 1].name);
  });

  document.getElementById("next").addEventListener("click", () => {
    currentTrack.pause();
    const idx = tracks.findIndex(t => t.name === currentTrack.src.split('/').pop());
    if (idx >= 0 && idx < tracks.length - 1) playMusic(tracks[idx + 1].name);
  });
}

window.addEventListener("DOMContentLoaded", main);
