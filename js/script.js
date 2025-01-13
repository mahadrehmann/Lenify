console.log('Lets write JavaScript');
let currentTrack = new Audio();
let tracks;
let currFolder;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');

    return `${formattedMinutes}:${formattedSeconds}`;
}

async function getTracks(folder) {
    currFolder = folder;
    const response = await fetch(`/tracks.json`); // Fetch the JSON file
    const data = await response.json();

    // Filter tracks belonging to the specified folder
    tracks = data[folder] || [];

    // Show all the tracks in the playlist
    let trackUL = document.querySelector(".trackList ul");
    trackUL.innerHTML = "";
    for (const track of tracks) {
        trackUL.innerHTML += `
            <li>
                <img class="invert" width="34" src="img/music.svg" alt="">
                <div class="info">
                    <div>${track.name}</div>
                    <div></div>
                </div>
                <div class="playnow">
                    <span>Play Now</span>
                    <img class="invert" src="img/play.svg" alt="">
                </div>
            </li>`;
    }

    // Attach event listeners
    Array.from(document.querySelectorAll(".trackList li")).forEach(e => {
        e.addEventListener("click", () => {
            playMusic(e.querySelector(".info").firstElementChild.textContent.trim());
        });
    });

    return tracks;
}

const playMusic = (track, pause = false) => {
    currentTrack.src = `/tracks/${currFolder}/` + track; // Added `/tracks/` to the path
    if (!pause) {
        currentTrack.play();
        play.src = "img/pause.svg";
    }
    document.querySelector(".trackinfo").innerHTML = decodeURI(track);
    document.querySelector(".tracktime").innerHTML = "00:00 / 00:00";
}

async function displayAlbums() {
    const response = await fetch(`/tracks.json`);
    const data = await response.json();

    const cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = "";

    for (const [folder, tracks] of Object.entries(data)) {
        const albumInfo = await fetch(`/tracks/${folder}/info.json`).then(res => res.json());
        cardContainer.innerHTML += `
            <div data-folder="${folder}" class="card">
                <div class="play">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
                    </svg>
                </div>
                <img src="/tracks/${folder}/cover.jpg" alt="">
                <h2>${albumInfo.title}</h2>
                <p>${albumInfo.description}</p>
            </div>`;
    }

    // Attach click event listeners to cards
    document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", async () => {
            const folder = card.dataset.folder;
            tracks = await getTracks(folder);
            playMusic(tracks[0].name);
        });
    });
}

async function main() {
    // Get the list of all the tracks
    await getTracks("tracks/1.Nasheeds")
    playMusic(tracks[0], true)

    // Display all the albums on the page
    await displayAlbums()

    // Attach an event listener to play, next and previous
    play.addEventListener("click", () => {
        if (currentTrack.paused) {
            currentTrack.play()
            play.src = "img/pause.svg"
        }
        else {
            currentTrack.pause()
            play.src = "img/play.svg"
        }
    })

    // Listen for timeupdate event
    currentTrack.addEventListener("timeupdate", () => {
        document.querySelector(".tracktime").innerHTML = `${secondsToMinutesSeconds(currentTrack.currentTime)} / ${secondsToMinutesSeconds(currentTrack.duration)}`
        document.querySelector(".circle").style.left = (currentTrack.currentTime / currentTrack.duration) * 100 + "%";
    })

    // Add an event listener to seekbar
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentTrack.currentTime = ((currentTrack.duration) * percent) / 100
    })

    // Add an event listener for hamburger
    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0"
    })

    // Add an event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%"
    })

    // Add an event listener to previous
    previous.addEventListener("click", () => {
        currentTrack.pause()
        console.log("Previous clicked")
        let index = tracks.indexOf(currentTrack.src.split("/").slice(-1)[0])
        if ((index - 1) >= 0) {
            playMusic(tracks[index - 1])
        }
    })

    // Add an event listener to next
    next.addEventListener("click", () => {
        currentTrack.pause()
        console.log("Next clicked")

        let index = tracks.indexOf(currentTrack.src.split("/").slice(-1)[0])
        if ((index + 1) < tracks.length) {
            playMusic(tracks[index + 1])
        }
    })

    // Add an event to volume
    document.querySelector(".range").getElementsByTagName("input")[0].addEventListener("change", (e) => {
        console.log("Setting volume to", e.target.value, "/ 100")
        currentTrack.volume = parseInt(e.target.value) / 100
        if (currentTrack.volume > 0) {
            document.querySelector(".volume>img").src = document.querySelector(".volume>img").src.replace("mute.svg", "volume.svg")
        }
    })

    // Add event listener to mute the track
    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg")
            currentTrack.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg")
            currentTrack.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }

    })
}

main() 