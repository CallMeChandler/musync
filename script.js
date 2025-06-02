console.log("Let's write JavaScript");

const next = document.getElementById("next");
const previous = document.getElementById("previous");
const play = document.getElementById("play");

let currSong = new Audio();
let songs;
let currIndex = 0;
let currFolder;
let timeUpdateHandler = null;
let endedHandler = null;
let loopMode = "playlist";



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

async function getSongs(folder) {
  currFolder = folder;

  try {
    const res = await fetch(`${folder}/info.json`);
    const data = await res.json();
    songs = data.songs;

    const songUL = document.querySelector(".songList").getElementsByTagName('ul')[0];
    songUL.innerHTML = "";

    for (const song of songs) {
      songUL.innerHTML += `
        <li>
          <img class="invert" src="img/music.svg" alt="music icon">
          <div class="info">
            <div>${song.replaceAll("%20", " ").replace(".mp3", "")}</div>
            <div></div>
          </div>
          <div class="playNow">
            <span>Play Now</span>
            <img class="invert" src="img/play.svg" alt="play">
          </div>
        </li>`;
    }

    Array.from(document.querySelector(".songList ul").children).forEach((li, index) => {
      li.addEventListener("click", () => {
        currIndex = index;
        playMusic(songs[currIndex]);
      });
    });

  } catch (e) {
    console.error("🚨 Failed to fetch songs from info.json:", e);
    alert("Couldn't load songs for this album.");
  }
}



const bindEvents = (audio) => {
  if (timeUpdateHandler) audio.removeEventListener("timeupdate", timeUpdateHandler);
  if (endedHandler) audio.removeEventListener("ended", endedHandler);

  timeUpdateHandler = () => {
    const currTime = audio.currentTime;
    const duration = audio.duration;
    if (!isNaN(duration) && duration > 0) {
      document.querySelector(".songTime").innerHTML = `${secondsToMinutesSeconds(currTime)}/${secondsToMinutesSeconds(duration)}`;
      document.querySelector(".circle").style.left = `${(currTime / duration) * 100}%`;
    }
  };
  audio.addEventListener("timeupdate", timeUpdateHandler);

  audio.addEventListener("loadedmetadata", () => {
    const duration = audio.duration;
    if (!isNaN(duration) && duration > 0) {
      document.querySelector(".songTime").innerHTML = `00:00/${secondsToMinutesSeconds(duration)}`;
    }
  });

  endedHandler = () => {
    if (loopMode === "one") {
      playMusic(songs[currIndex]);
    } else if (isShuffle) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * songs.length);
      } while (nextIndex === currIndex && songs.length > 1);
      currIndex = nextIndex;
      playMusic(songs[currIndex]);
    } else {
      currIndex = (currIndex + 1) % songs.length;
      playMusic(songs[currIndex]);
    }
  };

};

const playMusic = async (track) => {
  console.log("▶️ Request to play:", track);

  try {
    if (currSong) {
      currSong.pause();
      currSong.currentTime = 0;
    }

    // Create new Audio
    currSong = new Audio(`${currFolder}/${track}`);
    console.log("🎵 New Audio Source:", currSong.src);

    // UI updates
    play.src = "img/pause.svg";
    document.querySelector(".songInfo").innerHTML = track.replaceAll("%20", " ").replace(".mp3", "");
    document.querySelector(".songTime").innerHTML = "00:00/00:00";
    document.querySelector(".aboveBar").classList.add("playing");
    document.querySelector(".volume").style.display = "flex";

    // Update index
    const index = songs.indexOf(track);
    currIndex = index !== -1 ? index : 0;

    // Volume
    const volumeSlider = document.querySelector(".volume-slider");
    if (volumeSlider) {
      volumeSlider.removeEventListener("input", volumeSlider._handler || (() => { }));
      const handler = (e) => currSong.volume = e.target.value;
      volumeSlider.addEventListener("input", handler);
      volumeSlider._handler = handler;
    }

    // Seekbar
    const seekbar = document.querySelector(".seekbar");
    if (seekbar) {
      seekbar.onclick = (e) => {
        let percent = e.offsetX / seekbar.getBoundingClientRect().width;
        currSong.currentTime = percent * currSong.duration;
        document.querySelector(".circle").style.left = `${percent * 100}%`;
      };
    }


    // Volume icon
    const volumeIcon = document.querySelector(".volume>img");
    if (volumeIcon) {
      volumeIcon.onclick = () => {
        const isMuted = currSong.volume === 0;

        if (isMuted) {
          // Unmute to last volume or 0.5
          const restoreVolume = currSong._lastVolume || 0.5;
          currSong.volume = restoreVolume;
          volumeSlider.value = restoreVolume;
          volumeIcon.src = "img/volume.svg";
        } else {
          // Mute
          currSong._lastVolume = currSong.volume;
          currSong.volume = 0;
          volumeSlider.value = 0;
          volumeIcon.src = "img/mute.svg";
        }
      };
    }


    // Bind fresh event listeners
    bindEvents(currSong);

    // Force reload
    currSong.load();

    // Play and catch
    await currSong.play();
    console.log("✅ Song is now playing.");

  } catch (err) {
    console.error("❌ Failed to play song:", err);
    alert("Playback failed! See console.");
  }

  // Highlight currently playing song in library
  const allLis = document.querySelectorAll(".songList ul li");
  allLis.forEach(li => li.classList.remove("playing-song"));
  if (allLis[currIndex]) {
    allLis[currIndex].classList.add("playing-song");
  }

};



async function displayAlbums() {
  try {
    let res = await fetch("songs/albums.json");
    let albums = await res.json();

    let cardContainer = document.querySelector(".cardContainer");
    cardContainer.innerHTML = "";

    for (const album of albums) {
      try {
        let data = await fetch(`songs/${album.folder}/info.json`).then(r => r.json());

        const cardHTML = `<div data-folder="songs/${album.folder}" class="card">
          <div class="play">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 20V4L19 12L5 20Z" fill="#000" stroke-width="1.5" stroke-linejoin="round" />
            </svg>
          </div>
          <img src="songs/${album.folder}/cover.jpg" alt="">
          <h2>${data.title}</h2>
          <p>${data.description}</p>
        </div>`;

        cardContainer.insertAdjacentHTML("beforeend", cardHTML);
      } catch (err) {
        console.warn(`❌ Could not load info.json for ${album.folder}`);
      }
    }

    document.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", async () => {
        const folderName = card.dataset.folder;
        await getSongs(folderName);
        if (songs.length > 0) {
          currIndex = 0;
          playMusic(songs[currIndex]);
        }
      });
    });

  } catch (err) {
    console.error("🚨 Failed to load albums.json:", err);
  }
}





async function main() {
  await getSongs("songs/Test");

  displayAlbums()

  const repeatBtn = document.getElementById("repeat");

  repeatBtn.addEventListener("click", () => {
    if (loopMode === "playlist") {
      loopMode = "one";
      repeatBtn.src = "img/repeat-one.svg";
    } else {
      loopMode = "playlist";
      repeatBtn.src = "img/repeat.svg";
    }
    console.log("Loop mode is now:", loopMode);
  });

  const shuffleBtn = document.getElementById("shuffle");
  let isShuffle = false;

  shuffleBtn.addEventListener("click", () => {
    isShuffle = !isShuffle;
    shuffleBtn.style.opacity = isShuffle ? "1" : "0.5"; // Visual feedback
    console.log("🔀 Shuffle mode:", isShuffle ? "ON" : "OFF");
  });


  play.addEventListener("click", () => {
    const aboveBar = document.querySelector(".aboveBar");
    if (currSong.paused) {
      currSong.play();
      play.src = "img/pause.svg";
    }
    else {
      currSong.pause();
      play.src = "img/play.svg";
    }
  });

  document.querySelector(".seekbar").addEventListener("click", e => {
    let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
    document.querySelector(".circle").style.left = percent + "%";
    currSong.currentTime = ((currSong.duration) * percent) / 100;
  });

  document.querySelector(".hamburger").addEventListener("click", () => {
    document.querySelector(".left").style.left = "0";
  });

  document.querySelector(".close").addEventListener("click", () => {
    document.querySelector(".left").style.left = "-120%";
  });

  // Previous button functionality
  previous.addEventListener("click", () => {
    if (!songs || songs.length === 0) return;
    currIndex = (currIndex - 1 + songs.length) % songs.length;
    playMusic(songs[currIndex]);
  });

  // Next button functionality
  next.addEventListener("click", () => {
    if (!songs || songs.length === 0) return;
    if (isShuffle) {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * songs.length);
      } while (nextIndex === currIndex && songs.length > 1);
      currIndex = nextIndex;
    } else {
      currIndex = (currIndex + 1) % songs.length;
    }
    playMusic(songs[currIndex]);
  });

}

main();
