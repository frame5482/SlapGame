let selectedParty = null;
let localClicks = 0;
let pendingClicks = 0;
const API_URL = ''; // Relative to same origin

const selectionScreen = document.getElementById('selection-screen');
const gameContainer = document.getElementById('game-container');
const emperorImg = document.getElementById('emperor-img');
const slapTarget = document.getElementById('slap-target');
const slapSound = document.getElementById('slap-sound');
const globalCounterDisplay = document.getElementById('global-counter');
const currentPartyLabel = document.getElementById('current-party-label');
const rankList = document.getElementById('rank-list');
const volumeSlider = document.getElementById('volume-slider');
const volumeIcon = document.getElementById('volume-icon');

// Image paths - User: Please ensure these exist in public/assets/
const IDLE_IMG = 'assets/Gali.png';
const SLAPPED_IMG = 'assets/slapped.png'; // If this doesn't exist, image will disappear

// Setup Volume Control
volumeSlider.addEventListener('input', (e) => {
    const val = e.target.value;
    slapSound.volume = val;
    volumeIcon.innerText = val == 0 ? '🔈' : (val < 0.5 ? '🔉' : '🔊');
});

// Setup Party Selection
document.querySelectorAll('.party-card').forEach(card => {
    card.addEventListener('click', () => {
        selectedParty = card.getAttribute('data-party');
        currentPartyLabel.innerText = `ฝ่าย: ${selectedParty}`;
        selectionScreen.style.opacity = '0';
        setTimeout(() => {
            selectionScreen.style.display = 'none';
            gameContainer.style.display = 'flex';
            startLeaderboardUpdates();
        }, 500);
    });
});

// Slap Logic
slapTarget.addEventListener('mousedown', slap);
slapTarget.addEventListener('touchstart', (e) => {
    e.preventDefault();
    slap();
});

function slap() {
    if (!selectedParty) return;

    // Visual feedback
    // Try to change to slapped image
    emperorImg.src = SLAPPED_IMG;
    // If it doesn't exist, it will trigger onerror in HTML or just show nothing.
    // To prevent "nothing", we use a small trick:
    emperorImg.onerror = () => {
        emperorImg.src = IDLE_IMG;
        emperorImg.onerror = null;
    };

    emperorImg.style.transform = 'scale(0.8) rotate(15deg)';
    
    playSlapSound();
    createSlapText();

    // Reset image after delay
    setTimeout(() => {
        emperorImg.src = IDLE_IMG;
        emperorImg.style.transform = 'scale(1) rotate(0deg)';
    }, 80);

    // Update counts
    localClicks++;
    pendingClicks++;
}

function playSlapSound() {
    slapSound.currentTime = 0;
    const playPromise = slapSound.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.log("Playback failed:", error);
        });
    }
}

function createSlapText() {
    const text = document.createElement('div');
    text.className = 'slap-effect';
    text.innerText = 'TROP!';
    
    // Random position within the character box
    const x = Math.random() * 60 - 30; // Closer to center
    const y = Math.random() * 60 - 30;
    text.style.left = `calc(50% + ${x}px)`;
    text.style.top = `calc(50% + ${y}px)`;
    
    slapTarget.appendChild(text);
    setTimeout(() => text.remove(), 400);
}

// Server Sync
async function syncSlaps() {
    if (pendingClicks <= 0) return;

    const countToSend = pendingClicks;
    pendingClicks = 0;

    try {
        const response = await fetch('/api/slap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partyName: selectedParty, count: countToSend })
        });
        const data = await response.json();
        updateLeaderboard();
    } catch (err) {
        console.error("Sync error:", err);
        pendingClicks += countToSend; // retry later
    }
}

async function updateLeaderboard() {
    try {
        const response = await fetch('/api/parties');
        const parties = await response.json();
        
        rankList.innerHTML = '';
        let totalClicks = 0;

        parties.forEach((party, index) => {
            const item = document.createElement('div');
            item.className = `rank-item ${party.name === selectedParty ? 'active' : ''}`;
            item.innerHTML = `
                <span>${index + 1}. ${party.name}</span>
                <span>${party.clicks.toLocaleString()}</span>
            `;
            rankList.appendChild(item);
            
            if (party.name === selectedParty) {
                globalCounterDisplay.innerText = party.clicks.toLocaleString();
            }
            totalClicks += party.clicks;
        });
        
    } catch (err) {
        console.error("Leaderboard update error:", err);
    }
}

function startLeaderboardUpdates() {
    updateLeaderboard();
    setInterval(syncSlaps, 1000);
    setInterval(updateLeaderboard, 3000);
}
