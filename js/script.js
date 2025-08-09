// script.js
const CDN_BASE = "https://cdn.jsdelivr.net/gh/mahadrehmann/lenify-tracks@main";
const GITHUB_API_URL = "https://api.github.com/repos/mahadrehmann/lenify-tracks/git/trees/main?recursive=1";
const CACHE_KEY = "nasheedsCache";
const CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

let currentTrack = new Audio();
let tracks = [];
let categories = [];
let currFolder = "";

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

async function fetchNasheedsData() {
    // Try cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
            return parsed.data;
        }
    }

    // Fetch from GitHub
    const resp = await fetch(GITHUB_API_URL);
    if (!resp.ok) throw new Error("Failed to fetch GitHub tree");
    const treeData = await resp.json();

    // Filter .mp3 files
    const mp3Files = treeData.tree.filter(file => file.path.toLowerCase().endsWith(".mp3"));

    const parsedNasheeds = [];
    const categorySet = new Set();

    mp3Files.forEach(file => {
        const parts = file.path.split("/");
        const folder = parts.length > 1 ? parts[0] : "Uncategorized";
        categorySet.add(folder);

        const fileName = parts[parts.length - 1];
        const title = fileName.replace(/\.mp3$/i, "");

        parsedNasheeds.push({
            folder,
            title,
            name: fileName,
            audioUrl: `${CDN_BASE}/${encodeURIComponent(file.path)}`,
            coverUrl: `${CDN_BASE}/${encodeURIComponent(folder)}/cover.jpg`
        });
    });

    const parsedCategories = ["all", ...Array.from(categorySet)];

    const data = { nasheeds: parsedNasheeds, categories: parsedCategories };

    localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data
    }));

    return data;
}

async function getTracks(folder) {
    currFolder = folder;
    const data = await fetchNasheedsData();

    tracks = folder === "all"
        ? data.nasheeds
        : data.nasheeds.filter(n => n.folder.toLowerCase() === folder.toLowerCase());

    const ul = document.querySelector(".trackList ul");
    ul.innerHTML = tracks.map(t => `
        <li data-fullname="${encodeURIComponent(t.name)}" class="track-item">
            <img class="invert" width="34" src="img/music.svg" alt="music icon">
            <div class="info"><div>${t.title}</div></div>
            <div class="playnow"><span>Play Now</span><img class="invert" src="img/play.svg" alt="play button"></div>
        </li>
    `).join("");

    document.querySelectorAll(".trackList li").forEach(el =>
        el.addEventListener("click", () => playMusic(decodeURIComponent(el.dataset.fullname)))
    );
}

async function playMusic(trackName, pause = false) {
    const trackObj = tracks.find(t => t.name === trackName);
    if (!trackObj) return;

    currentTrack.src = trackObj.audioUrl;
    currentTrack.preload = "metadata";

    if (!pause) {
        try { await currentTrack.play(); }
        catch {}
    }

    document.querySelector(".trackinfo").textContent = trackObj.title;
    document.querySelector(".tracktime").textContent = "00:00 / 00:00";
    document.getElementById("play").src = "img/pause.svg";
}

async function displayAlbums() {
  const data = await fetchNasheedsData();
  categories = data.categories;

  const container = document.querySelector(".cardContainer");
  container.innerHTML = "";

  for (const folder of categories.filter(c => c !== "all")) {
      let info = { title: folder, description: "" };

      try {
          const r = await fetch(`${CDN_BASE}/${encodeURIComponent(folder)}/info.json`);
          if (r.ok) {
              info = await r.json();
          }
      } catch {
          // Ignore fetch errors, fallback to default info
      }

      const coverUrl = `${CDN_BASE}/${encodeURIComponent(folder)}/cover.jpg`;

      container.innerHTML += `
          <div data-folder="${folder}" class="card">
              <div class="play">▶</div>
              <img src="${coverUrl}" alt="${info.title}">
              <h2>${info.title}</h2>
              <p>${info.description}</p>
          </div>`;
  }

  document.querySelectorAll(".card").forEach(card =>
      card.addEventListener("click", async () => {
          await getTracks(card.dataset.folder);
          if (tracks.length > 0) playMusic(tracks[0].name);
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
        const idx = tracks.findIndex(t => t.audioUrl === currentTrack.src);
        if (idx > 0) playMusic(tracks[idx - 1].name);
    });

    document.getElementById("next").addEventListener("click", () => {
        currentTrack.pause();
        const idx = tracks.findIndex(t => t.audioUrl === currentTrack.src);
        if (idx >= 0 && idx < tracks.length - 1) playMusic(tracks[idx + 1].name);
    });
}

window.addEventListener("DOMContentLoaded", main);
