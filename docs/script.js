const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');

// Game constants
const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const GAME_SPEED = 120; // ms

// Game Colors
const COLORS = {
    head: '#ff5c8d',     // Darker pink for head
    body1: '#ff8da1',    // Pink
    body2: '#ffb6c1',    // Light Pink
    eyes: '#ffffff',
    pupil: '#6a4c93',    // Purple pupil
    food: '#ff0055'      // Red/Pink food
};

// Game State
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let gameLoop;
let isGameRunning = false;
let nextDirection = { x: 0, y: 0 }; // Buffer for next move to prevent 180 turns

// Initialize High Score
highScoreElement.textContent = highScore;

// Audio Context (Optional beep)
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'eat') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'over') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    score = 0;
    scoreElement.textContent = score;
    dx = 1;
    dy = 0;
    nextDirection = { x: 1, y: 0 };
    generateFood();
    isGameRunning = true;
    overlay.classList.add('hidden');
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

function generateFood() {
    food.x = Math.floor(Math.random() * TILE_COUNT);
    food.y = Math.floor(Math.random() * TILE_COUNT);
    
    // Don't spawn food on snake
    snake.forEach(segment => {
        if (segment.x === food.x && segment.y === food.y) {
            generateFood();
        }
    });
}

function update() {
    // Update direction
    dx = nextDirection.x;
    dy = nextDirection.y;

    // Move snake
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Collision Check (Walls)
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Collision Check (Self)
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // Eat Food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        playSound('eat');
        generateFood();
        // Don't pop tail, so snake grows
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Food (Heart Shape)
    drawHeart(food.x * GRID_SIZE + GRID_SIZE/2, food.y * GRID_SIZE + GRID_SIZE/2, GRID_SIZE/2, COLORS.food);

    // Draw Snake
    snake.forEach((segment, index) => {
        const x = segment.x * GRID_SIZE;
        const y = segment.y * GRID_SIZE;
        const centerX = x + GRID_SIZE / 2;
        const centerY = y + GRID_SIZE / 2;

        if (index === 0) {
            // Head
            ctx.fillStyle = COLORS.head;
            ctx.beginPath();
            ctx.arc(centerX, centerY, GRID_SIZE / 2 + 2, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            drawEyes(centerX, centerY, dx, dy);
        } else {
            // Body
            ctx.fillStyle = index % 2 === 0 ? COLORS.body1 : COLORS.body2;
            ctx.beginPath();
            ctx.arc(centerX, centerY, GRID_SIZE / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawEyes(x, y, dx, dy) {
    const eyeOffset = 6;
    const eyeSize = 4;
    const pupilSize = 2;

    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

    // Determine eye position based on direction
    if (dx === 1) { // Right
        leftEyeX = x + 2; leftEyeY = y - eyeOffset;
        rightEyeX = x + 2; rightEyeY = y + eyeOffset;
    } else if (dx === -1) { // Left
        leftEyeX = x - 2; leftEyeY = y - eyeOffset;
        rightEyeX = x - 2; rightEyeY = y + eyeOffset;
    } else if (dy === -1) { // Up
        leftEyeX = x - eyeOffset; leftEyeY = y - 2;
        rightEyeX = x + eyeOffset; rightEyeY = y - 2;
    } else { // Down
        leftEyeX = x - eyeOffset; leftEyeY = y + 2;
        rightEyeX = x + eyeOffset; rightEyeY = y + 2;
    }

    // Whites
    ctx.fillStyle = COLORS.eyes;
    ctx.beginPath(); ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2); ctx.fill();

    // Pupils
    ctx.fillStyle = COLORS.pupil;
    ctx.beginPath(); ctx.arc(leftEyeX + dx, leftEyeY + dy, pupilSize, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rightEyeX + dx, rightEyeY + dy, pupilSize, 0, Math.PI * 2); ctx.fill();
    
    // Highlights (Sparkle)
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(leftEyeX + dx - 1, leftEyeY + dy - 1, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(rightEyeX + dx - 1, rightEyeY + dy - 1, 1, 0, Math.PI * 2); ctx.fill();
}

function drawHeart(x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    // Heart shape logic
    // Start at top middle
    ctx.moveTo(0, -size/2); 
    // Cubic bezier curves for the top lobes
    ctx.bezierCurveTo(size/2, -size, size, -size/2, 0, size);
    ctx.bezierCurveTo(-size, -size/2, -size/2, -size, 0, -size/2);
    ctx.fill();
    
    // Add a little shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-size/4, -size/4, size/8, 0, Math.PI*2);
    ctx.fill();
    
    ctx.restore();
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);
    playSound('over');
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreElement.textContent = highScore;
        overlayTitle.textContent = "新纪录！🎉";
    } else {
        overlayTitle.textContent = "游戏结束 🥺";
    }
    
    startBtn.textContent = "再玩一次";
    overlay.classList.remove('hidden');
}

// Input Handling
document.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;

    switch(e.key) {
        case 'ArrowUp':
            if (dy !== 1) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (dy !== -1) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (dx !== 1) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (dx !== -1) nextDirection = { x: 1, y: 0 };
            break;
    }
});

// Mobile Controls
document.getElementById('up-btn').addEventListener('click', () => { if (dy !== 1) nextDirection = { x: 0, y: -1 }; });
document.getElementById('down-btn').addEventListener('click', () => { if (dy !== -1) nextDirection = { x: 0, y: 1 }; });
document.getElementById('left-btn').addEventListener('click', () => { if (dx !== 1) nextDirection = { x: -1, y: 0 }; });
document.getElementById('right-btn').addEventListener('click', () => { if (dx !== -1) nextDirection = { x: 1, y: 0 }; });

startBtn.addEventListener('click', initGame);

// Initial Draw (Static)
ctx.fillStyle = COLORS.gameBg;
ctx.fillRect(0, 0, canvas.width, canvas.height);
