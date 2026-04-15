// --- 1. TRACKER LOGIC ---
let timerInterval, startTime, isRunning = false;
let selectedCategory = null, myChart = null;

let categories = JSON.parse(localStorage.getItem('trackerCategories')) || [
    { name: 'Working', color: '#0000FF', goal: 4 },
    { name: 'Running', color: '#FF0000', goal: 1 },
    { name: 'Eating', color: '#4CAF50', goal: 1 }
];

const display = document.getElementById('display');
const startStopBtn = document.getElementById('startStopBtn');

function renderActivityTiles() {
    const container = document.getElementById('activityTiles');
    container.innerHTML = '';
    categories.forEach(cat => {
        const div = document.createElement('div');
        div.className = 'activity-tile';
        if (selectedCategory?.name === cat.name) div.classList.add('selected');
        div.style.color = cat.color;
        div.innerText = cat.name;
        div.onclick = () => { 
            selectedCategory = cat; 
            renderActivityTiles(); 
            renderActivities(); 
            updateButtonColor(); 
        };
        container.appendChild(div);
    });
    if (!selectedCategory && categories.length > 0) { 
        selectedCategory = categories[0]; 
        renderActivityTiles(); 
    }
}

function toggleTimer() {
    if (isRunning) {
        const diff = Math.round((new Date() - startTime) / 1000);
        clearInterval(timerInterval);
        isRunning = false;
        startStopBtn.innerText = "Start";
        saveTimeData(selectedCategory.name, diff);
        display.innerText = "00:00:00";
    } else {
        if (!selectedCategory) return alert("Please select an activity to start.");
        isRunning = true;
        startTime = new Date();
        startStopBtn.innerText = "Stop";
        timerInterval = setInterval(() => {
            const elapsed = Math.round((new Date() - startTime) / 1000);
            display.innerText = new Date(elapsed * 1000).toISOString().substr(11, 8);
        }, 1000);
    }
}

function addManualTime() {
    if (!selectedCategory) return alert("Please select an activity first.");
    const mins = prompt(`Add minutes for ${selectedCategory.name}?`);
    if (mins && !isNaN(mins)) saveTimeData(selectedCategory.name, parseInt(mins) * 60);
}

function saveTimeData(category, duration) {
    if (duration < 1) return;
    let data = JSON.parse(localStorage.getItem('timeTrackerData')) || [];
    data.push({ category, duration, date: new Date().toISOString() });
    localStorage.setItem('timeTrackerData', JSON.stringify(data));
    updateChart('week');
    renderHistory();
}

function formatDecimalToTime(decimal) {
    if (decimal <= 0) return "0:00";
    let totalMin = Math.round(decimal * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
}

// --- 2. CHART & GOALS ---
function updateChart(timeframe) {
    const data = JSON.parse(localStorage.getItem('timeTrackerData')) || [];
    const cutoff = new Date();
    
    if (timeframe === 'day') cutoff.setHours(0, 0, 0, 0);
    else if (timeframe === 'week') cutoff.setDate(cutoff.getDate() - 7);
    else if (timeframe === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
    else if (timeframe === 'year') cutoff.setFullYear(cutoff.getFullYear() - 1);

    const totals = {};
    const todayTotals = {};
    const todayStr = new Date().toDateString();
    
    // This line ensures we only show categories that currently exist
    const currentCategoryNames = categories.map(c => c.name);

    data.forEach(s => {
        const sDate = new Date(s.date);
        if (currentCategoryNames.includes(s.category)) {
            if (sDate >= cutoff) {
                totals[s.category] = (totals[s.category] || 0) + (s.duration / 3600);
            }
            if (sDate.toDateString() === todayStr) {
                todayTotals[s.category] = (todayTotals[s.category] || 0) + (s.duration / 3600);
            }
        }
    });

    const ctx = document.getElementById('timeChart').getContext('2d');
    if (myChart) myChart.destroy();
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(totals).map(name => `${name}: ${formatDecimalToTime(totals[name])}`),
            datasets: [{
                data: Object.values(totals),
                backgroundColor: Object.keys(totals).map(n => categories.find(c => c.name === n)?.color || '#ccc'),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            maintainAspectRatio: false,
            layout: { padding: 10 },
            plugins: {
                legend: { position: 'bottom', labels: { font: { size: 14, weight: 'bold' }, padding: 15 } },
                datalabels: { display: false } 
            }
        }
    });

    const goalBox = document.getElementById('goalContainer');
    goalBox.innerHTML = '<h3>Today\'s Goals</h3>';
    categories.forEach(cat => {
        if (cat.goal > 0) {
            const current = todayTotals[cat.name] || 0;
            const percent = Math.min((current / cat.goal) * 100, 100);
            goalBox.innerHTML += `
                <div class="goal-item">
                    <div class="goal-label"><span>${cat.name}</span><span>${current.toFixed(1)} / ${cat.goal}h</span></div>
                    <div class="progress-bg"><div class="progress-fill" style="width:${percent}%; background:${cat.color}"></div></div>
                </div>`;
        }
    });
}

// --- 3. DATA MANAGEMENT ---
function renderHistory() {
    let data = JSON.parse(localStorage.getItem('timeTrackerData')) || [];
    const log = document.getElementById('historyLog');
    log.innerHTML = '';
    [...data].reverse().slice(0, 10).forEach((s, i) => {
        const actualIdx = data.length - 1 - i;
        const time = new Date(s.duration * 1000).toISOString().substr(11, 8);
        log.innerHTML += `<div class="activity-item">
            <span><strong>${s.category}</strong> (${new Date(s.date).toLocaleDateString()})<br>${time}</span>
            <span class="delete-link" onclick="deleteSession(${actualIdx})">Remove</span>
        </div>`;
    });
}

function renderActivities() {
    const list = document.getElementById('activityList');
    list.innerHTML = '';
    categories.forEach((cat, index) => {
        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
            <span><small style="color:${cat.color}">●</small> ${cat.name} (${cat.goal}h)</span>
            <div>
                <span class="edit-link" onclick="editActivityGoal(${index})">Edit</span>
                <span class="delete-link" onclick="deleteActivity(${index})">Delete</span>
            </div>`;
        list.appendChild(li);
    });
    localStorage.setItem('trackerCategories', JSON.stringify(categories));
    updateButtonColor();
}

function editActivityGoal(index) {
    const newGoal = prompt(`Enter new goal (hours) for ${categories[index].name}:`, categories[index].goal);
    if (newGoal !== null && !isNaN(newGoal)) {
        categories[index].goal = parseFloat(newGoal);
        renderActivities();
        updateChart('week');
    }
}

function addActivity() {
    const name = document.getElementById('newActivityName').value;
    const color = document.getElementById('newActivityColor').value;
    const goal = parseFloat(document.getElementById('newActivityGoal').value) || 0;
    if (name) {
        categories.push({ name, color, goal });
        document.getElementById('newActivityName').value = '';
        document.getElementById('newActivityGoal').value = '';
        renderActivityTiles(); renderActivities(); updateChart('week');
    }
}

function deleteActivity(index) {
    if(confirm("Delete activity?")) { 
        categories.splice(index, 1); 
        if (categories.length > 0) selectedCategory = categories[0]; 
        else selectedCategory = null;
        renderActivityTiles(); renderActivities(); updateChart('week'); 
    }
}

function deleteSession(idx) {
    let data = JSON.parse(localStorage.getItem('timeTrackerData')) || [];
    data.splice(idx, 1);
    localStorage.setItem('timeTrackerData', JSON.stringify(data));
    renderHistory(); updateChart('week');
}

function updateButtonColor() { 
    if (selectedCategory && startStopBtn) {
        startStopBtn.style.backgroundColor = selectedCategory.color;
        startStopBtn.style.color = "#ffffff";
    } 
}

function clearAllData() { 
    if(confirm("Clear everything? This will delete all history. This cannot be undone.")) { 
        localStorage.removeItem('timeTrackerData'); 
        renderHistory(); updateChart('week'); 
    } 
}

// --- 4. FOCUS GAME LOGIC ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const livesDisplay = document.getElementById('livesCount');

let gameActive = false;
let gameLives = 3;
let birdY = 100;
let velocity = 0;
let frameCount = 0;
let obstacles = [];
const gravity = 0.25;
const jump = -4.5;

function toggleGame() {
    if (!gameActive) {
        if (gameLives <= 0) resetGame();
        gameActive = true;
        document.getElementById('startGameBtn').innerText = "Pause";
        requestAnimationFrame(gameLoop);
    } else {
        gameActive = false;
        document.getElementById('startGameBtn').innerText = "Resume";
    }
}

function resetGame() {
    gameLives = 3;
    birdY = 100;
    velocity = 0;
    obstacles = [];
    frameCount = 0;
    livesDisplay.innerText = gameLives;
}

// Event Listeners for Game Controls
window.addEventListener('keydown', (e) => { if (e.code === 'Space' && gameActive) velocity = jump; });
canvas.addEventListener('touchstart', (e) => { if (gameActive) { velocity = jump; e.preventDefault(); } }, { passive: false });

function createObstacle() {
    const types = ['branch', 'house', 'pole', 'wire'];
    const type = types[Math.floor(Math.random() * types.length)];
    let obs = { x: canvas.width, type: type, width: 20, hit: false };

    if (type === 'branch') { obs.y = 0; obs.h = 60; obs.w = 40; }
    if (type === 'house') { obs.y = 150; obs.h = 50; obs.w = 50; }
    if (type === 'pole') { obs.y = 100; obs.h = 100; obs.w = 15; }
    if (type === 'wire') { obs.y = 70; obs.h = 2; obs.w = canvas.width; } 

    obstacles.push(obs);
}

function gameLoop() {
    if (!gameActive) return;

    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply Gravity to Bird
    velocity += gravity;
    birdY += velocity;

    // Draw the Bird (Vireo)
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.arc(40, birdY, 10, 0, Math.PI * 2);
    ctx.fill();

    // Check Floor or Ceiling Hit
    if (birdY > canvas.height || birdY < 0) {
        handleCollision();
    }

    // Generate Obstacles
    if (frameCount % 100 === 0) createObstacle();
    
    // Draw and Move Obstacles
    obstacles.forEach((obs, index) => {
        obs.x -= 2;

        ctx.fillStyle = "#8B4513"; 
        if (obs.type === 'branch') ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        if (obs.type === 'pole') ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        
        if (obs.type === 'house') {
            ctx.fillStyle = "#555";
            ctx.fillRect(obs.x, obs.y, obs.w, obs.h); 
            ctx.fillStyle = "#FF3B30";
            ctx.beginPath(); 
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + 25, obs.y - 20);
            ctx.lineTo(obs.x + 50, obs.y);
            ctx.fill();
        }

        if (obs.type === 'wire') {
            ctx.strokeStyle = "#333";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(obs.x, obs.y);
            ctx.lineTo(obs.x + obs.w, obs.y);
            ctx.stroke();
        }

        // Detect Crash
        if (!obs.hit && 40 > obs.x && 40 < obs.x + obs.w && birdY > obs.y && birdY < obs.y + obs.h) {
            obs.hit = true;
            handleCollision();
        }

        // Clean up passed obstacles
        if (obs.x + obs.w < 0) obstacles.splice(index, 1);
    });

    frameCount++;
    livesDisplay.innerText = gameLives;

    if (gameLives > 0) {
        requestAnimationFrame(gameLoop);
    } else {
        gameOver();
    }
}

function handleCollision() {
    gameLives--;
    birdY = 100;
    velocity = 0;
    if (gameLives <= 0) {
        gameActive = false;
    }
}

function gameOver() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FF3B30";
    ctx.font = "bold 20px -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CRASHED!", canvas.width / 2, canvas.height / 2);
    document.getElementById('startGameBtn').innerText = "Try Again";
}

// --- 5. INITIALIZE APP ---
window.onload = () => { 
    renderActivityTiles(); 
    renderActivities(); 
    renderHistory(); 
    updateChart('week'); 
};
startStopBtn.addEventListener('click', toggleTimer);