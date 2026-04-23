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
const hpValueDisplay = document.getElementById('hp-value');
const hpBarFill = document.getElementById('hp-bar-fill');

const MAX_HP = 1000000;

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
            updateLeaderboard(); // Fetch initial scores immediately
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
    emperorImg.src = SLAPPED_IMG;
    emperorImg.onerror = () => {
        emperorImg.src = IDLE_IMG;
        emperorImg.onerror = null;
    };

    emperorImg.style.transform = 'scale(0.8) rotate(15deg)';

    // Determine if Heal or Damage
    const isLoyal = selectedParty === 'ฝ่ายภักดีต่อจักรพรรดิ';

    playSlapSound();
    createSlapText(isLoyal);

    // Reset image after delay
    setTimeout(() => {
        emperorImg.src = IDLE_IMG;
        emperorImg.style.transform = 'scale(1) rotate(0deg)';
    }, 80);

    // Update counts
    localClicks++;
    pendingClicks++;

    // Local Prediction: Update UI immediately
    const currentVal = parseInt(globalCounterDisplay.innerText.replace(/,/g, '')) || 0;
    globalCounterDisplay.innerText = (currentVal + 1).toLocaleString();

    // Local HP Update
    const currentHp = parseInt(hpValueDisplay.innerText.replace(/,/g, '')) || MAX_HP;
    const newHp = isLoyal ? Math.min(MAX_HP, currentHp + 1) : Math.max(0, currentHp - 1);
    hpValueDisplay.innerText = newHp.toLocaleString();
    hpBarFill.style.width = `${(newHp / MAX_HP) * 100}%`;
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

function createSlapText(isHeal) {
    const text = document.createElement('div');
    text.className = isHeal ? 'slap-effect heal' : 'slap-effect damage';
    text.innerText = isHeal ? 'HEAL +1' : 'DAMAGE -1';

    // Random position within the character box
    const x = Math.random() * 100 - 50;
    const y = Math.random() * 100 - 50;
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
        let totalDamage = 0;
        let totalHeal = 0;
        parties.forEach((party, index) => {
            if (party.name === 'ฝ่ายภักดีต่อจักรพรรดิ') {
                totalHeal += party.clicks;
            } else {
                totalDamage += party.clicks;
            }

            const item = document.createElement('div');
            item.className = `rank-item ${party.name === selectedParty ? 'active' : ''}`;

            let rankEmoji = '';
            if (index === 0) rankEmoji = '🥇 ';
            else if (index === 1) rankEmoji = '🥈 ';
            else if (index === 2) rankEmoji = '🥉 ';
            else rankEmoji = `${index + 1}. `;

            item.innerHTML = `
                <span>${rankEmoji}${party.name}</span>
                <span>${party.clicks.toLocaleString()}</span>
            `;
            rankList.appendChild(item);

            if (party.name === selectedParty) {
                // Prevent counter from jumping back to old server value if local is ahead
                const serverClicks = party.clicks;
                const currentDisplay = parseInt(globalCounterDisplay.innerText.replace(/,/g, '')) || 0;
                if (serverClicks > currentDisplay) {
                    globalCounterDisplay.innerText = serverClicks.toLocaleString();
                }
            }
        });

        // Update Global HP
        const globalHp = Math.min(MAX_HP, Math.max(0, MAX_HP - totalDamage + totalHeal));
        hpValueDisplay.innerText = globalHp.toLocaleString();
        hpBarFill.style.width = `${(globalHp / MAX_HP) * 100}%`;

        if (globalHp <= 0) {
            document.querySelector('.hp-message').innerText = "ยึดอำนาจสำเร็จแล้ว!!!";
            document.querySelector('.hp-section').style.background = "rgba(0, 255, 0, 0.2)";
        } else {
            document.querySelector('.hp-message').innerText = "ถ้าหมดจะทำการยึดอำนาจไอ้ลิ";
            document.querySelector('.hp-section').style.background = "rgba(255, 0, 0, 0.1)";
        }

    } catch (err) {
        console.error("Leaderboard update error:", err);
    }
}

function startLeaderboardUpdates() {
    updateLeaderboard();
    setInterval(syncSlaps, 1000);
    setInterval(updateLeaderboard, 1000); // More frequent updates
}
