// ====== GAME VARIABLES ======
let state = 'START'; // START, PLAYING, CAUGHT, GAMEOVER
let score = 0;
let highScore = 0;
let gameSpeed = 6;
let gravity = 0.8;
let groundY = 320;
let nextSpawn = 0;
let deathTimer = 0;

let bgOffsetBack = 0;
let bgOffsetFront = 0;

// Entities
let player;
let chaser;
let obstacles = [];
let lavaDrops = [];
let particles = [];
let bgEmbers = [];

// ====== INITIALIZATION ======
function setup() {
  createCanvas(800, 400);
  textFont('monospace');
  
  // Generar brasas iniciales para el fondo
  for(let i = 0; i < 50; i++) spawnBgEmber(true);
  
  resetGame();
  state = 'START';
}

// ====== MAIN LOOP ======
function draw() {
  drawEnvironment();
  
  if (state === 'START') {
    player.show();
    chaser.show(false);
    drawStartScreen();
  } else if (state === 'PLAYING') {
    updateGame();
    drawGame();
  } else if (state === 'CAUGHT') {
    updateCaught();
    drawGame();
  } else if (state === 'GAMEOVER') {
    updateGameOver();
    drawGame();
    drawGameOverScreen();
  }
}

// ====== GAME LOGIC ======
function resetGame() {
  player = new Player();
  chaser = new Chaser();
  obstacles = [];
  particles = [];
  lavaDrops = [];
  score = 0;
  gameSpeed = 6;
  bgOffsetBack = 0;
  bgOffsetFront = 0;
  nextSpawn = frameCount + 60;
  deathTimer = 0;
}

function updateGame() {
  score += 0.1;
  gameSpeed += 0.002; 
  
  bgOffsetBack += gameSpeed * 0.15;
  bgOffsetFront += gameSpeed * 0.5;
  
  player.update();
  chaser.update(player.x);
  
  // Spawn Obstacles
  if (frameCount > nextSpawn) {
    let type = random() > 0.4 ? 'WOOD_SPIKES' : 'LAVA_ROCK';
    obstacles.push(new Obstacle(type));
    nextSpawn = frameCount + random(50, 100) * (7 / gameSpeed);
  }
  
  // Update Obstacles & Collision
  for (let i = obstacles.length - 1; i >= 0; i--) {
    let obs = obstacles[i];
    obs.update();
    
    if (player.hits(obs)) {
      state = 'CAUGHT';
      player.isTripped = true;
      // Polvo al tropezar
      for (let j = 0; j < 10; j++) spawnParticle(player.x, groundY, '#A5D6A7', true);
    }
    
    if (obs.x + obs.w < -20) obstacles.splice(i, 1);
  }
  
  // Polvo al correr
  if (!player.isJumping && frameCount % 5 === 0) {
    spawnParticle(player.x - 10, groundY, '#7f8c8d', true);
  }
}

function updateCaught() {
  // El juego se ralentiza dramáticamente
  gameSpeed *= 0.92;
  bgOffsetBack += gameSpeed * 0.15;
  bgOffsetFront += gameSpeed * 0.5;
  
  player.update(); // Sigue aplicando gravedad si tropezó en el aire
  
  for (let obs of obstacles) obs.update();
  
  // El cazador se acerca rápidamente
  chaser.x = lerp(chaser.x, player.x, 0.08);
  
  // Transición a Game Over cuando el monstruo lo alcanza
  if (abs(chaser.x - player.x) < 15) {
    state = 'GAMEOVER';
    if (floor(score) > highScore) highScore = floor(score);
    // Explosión de partículas rojas al ser atrapado
    for (let i = 0; i < 30; i++) spawnParticle(player.x, groundY - 15, '#FF0000');
  }
}

function updateGameOver() {
  deathTimer++;
  // Las partículas y el fondo siguen moviéndose ligeramente
}

function drawGame() {
  for (let obs of obstacles) obs.show();
  
  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].show();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
  
  // Draw Characters
  if (state !== 'GAMEOVER') {
    player.show();
  }
  
  chaser.show(state === 'CAUGHT' || state === 'GAMEOVER');

  // Draw HUD
  fill(255); noStroke();
  textSize(16); textAlign(LEFT);
  text("INSTRUCTIONS: Space or Click to Jump!", 20, 30);
  fill('#FF5722');
  text("If you crash, the Beast catches you!", 20, 55);
  
  fill(255);
  textSize(24); textAlign(RIGHT);
  text(`SCORE: ${floor(score)}`, width - 20, 30);
  fill('#FF5722');
  text(`HIGH: ${highScore}`, width - 20, 60);
}

// ====== INPUT ======
function keyPressed() {
  if (key === ' ' || keyCode === UP_ARROW) handleInput();
}
function mousePressed() {
  handleInput();
}

function handleInput() {
  if (state === 'START') {
    state = 'PLAYING';
    resetGame();
  } else if (state === 'PLAYING') {
    player.jump();
  } else if (state === 'GAMEOVER' && deathTimer > 30) {
    state = 'START';
  }
}

// ====== CLASSES ======
class Player {
  constructor() {
    this.x = 220;
    this.y = groundY;
    this.vy = 0;
    this.isJumping = false;
    this.isTripped = false;
    this.w = 16;  
    this.h = 45;  
  }
  
  jump() {
    if (!this.isJumping && !this.isTripped) {
      this.vy = -13.5;
      this.isJumping = true;
      for (let i = 0; i < 5; i++) spawnParticle(this.x, groundY, '#A5D6A7', true);
    }
  }
  
  update() {
    this.y += this.vy;
    this.vy += gravity;
    
    if (this.y >= groundY) {
      this.y = groundY;
      this.vy = 0;
      if (this.isJumping) {
        this.isJumping = false;
        if (!this.isTripped) {
          for (let i = 0; i < 5; i++) spawnParticle(this.x, groundY, '#A5D6A7', true);
        }
      }
    }
  }
  
  show() {
    stroke('#FFFFFF');
    strokeWeight(3);
    noFill();
    strokeCap(ROUND);
    strokeJoin(ROUND);
    
    if (this.isTripped) {
      // Pose de caída/tropezón
      let px = this.x;
      let py = this.y - 6;
      circle(px + 18, py, 14); // Cabeza
      line(px - 20, py, px + 11, py); // Torso horizontal
      line(px - 5, py, px + 5, py - 15); // Brazo 1
      line(px - 5, py, px + 10, py + 5); // Brazo 2
      line(px - 20, py, px - 35, py - 10); // Pierna 1
      line(px - 20, py, px - 30, py + 5);  // Pierna 2
      return;
    }
    
    let hipY = this.y - 25;
    let headY = this.y - 45;
    
    circle(this.x, headY, 14); // Cabeza
    line(this.x, headY + 7, this.x, hipY); // Torso
    
    if (this.isJumping) {
      line(this.x, hipY, this.x - 15, this.y - 10); 
      line(this.x, hipY, this.x + 15, this.y - 15); 
      line(this.x, headY + 12, this.x - 15, headY); 
      line(this.x, headY + 12, this.x + 15, headY - 10);
    } else {
      let swing = sin(frameCount * 0.4);
      line(this.x, hipY, this.x + swing * 18, this.y); // Piernas
      line(this.x, hipY, this.x - swing * 18, this.y);
      line(this.x, headY + 12, this.x - swing * 15, headY + 25); // Brazos
      line(this.x, headY + 12, this.x + swing * 15, headY + 25);
    }
  }
  
  hits(obs) {
    if (this.isTripped) return false;
    let px = this.x - this.w / 2;
    let py = this.y - this.h;
    
    return (
      px < obs.x + obs.w &&
      px + this.w > obs.x &&
      py < obs.y + obs.h &&
      py + this.h > obs.y
    );
  }
}

class Chaser {
  constructor() {
    this.x = -50; 
    this.targetX = 60; 
  }
  
  update(playerX) {
    if (state === 'PLAYING') {
      // Movimiento acechante
      this.targetX = 60 + sin(frameCount * 0.05) * 20;
      this.x = lerp(this.x, this.targetX, 0.1);
    }
  }
  
  show(isCatching) {
    let cx = this.x;
    let cy = groundY - 10;
    
    cy += sin(frameCount * 0.3) * 8; // Efecto de respiración/flote
    
    // Aura brillante
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = '#FF0000';
    stroke('#FF3D00');
    strokeWeight(4);
    noFill();
    
    // Cuerpo caótico
    for (let i = 0; i < 7; i++) {
      let nx = cx + random(-20, 20);
      let ny = cy + random(-65, 0);
      line(cx + random(-5, 5), cy - 30, nx, ny);
    }
    
    // Brazos largos
    let reachY = cy - 40 + sin(frameCount * 0.2) * 15;
    let armStretch = isCatching ? 40 : 0; 
    
    line(cx, cy - 40, cx + 60 + armStretch, reachY);
    line(cx, cy - 45, cx + 75 + armStretch, reachY + 10);
    
    if (isCatching) {
      // Abre las fauces
      line(cx + 10, cy - 60, cx + 40, cy - 80); 
      line(cx + 10, cy - 60, cx + 40, cy - 40); 
    }
    
    // Cabeza y ojos
    fill('#000');
    stroke('#FF0000');
    circle(cx + 10, cy - 70, 25);
    
    fill(255); noStroke();
    drawingContext.shadowBlur = 0; 
    circle(cx + 16, cy - 73, 5);
    circle(cx + 22, cy - 70, 4);
  }
}

class Obstacle {
  constructor(type) {
    this.type = type;
    this.x = width + 50;
    
    if (this.type === 'WOOD_SPIKES') {
      this.w = 20;
      this.h = 40;
      this.y = groundY - this.h;
    } else { // LAVA_ROCK
      this.w = 35;
      this.h = 30;
      this.y = groundY - this.h;
    }
  }
  
  update() {
    this.x -= gameSpeed;
  }
  
  show() {
    strokeWeight(3);
    strokeJoin(ROUND);
    noFill();
    
    if (this.type === 'WOOD_SPIKES') {
      // Estacas de madera quemada
      stroke('#3e2723'); 
      beginShape();
      vertex(this.x, groundY);
      vertex(this.x + this.w / 2, this.y);
      vertex(this.x + this.w, groundY);
      endShape();
      line(this.x + 5, groundY, this.x + 15, this.y + 10);
      
      // Puntas al rojo vivo
      stroke('#e74c3c');
      point(this.x + this.w / 2, this.y);
    } else {
      // Roca volcánica
      stroke('#795548');
      fill('#3E2723');
      beginShape();
      vertex(this.x, groundY);
      vertex(this.x + 5, this.y + 10);
      vertex(this.x + 20, this.y);
      vertex(this.x + 35, this.y + 15);
      vertex(this.x + this.w, groundY);
      endShape(CLOSE);
      
      // Grieta brillante
      stroke('#FF5722');
      strokeWeight(2);
      line(this.x + 10, this.y + 10, this.x + 25, this.y + 25);
    }
  }
}

// ====== ENVIRONMENT & PARTICLES ======
function drawEnvironment() {
  // --- Cielo Degradado Fuego/Humo (del 2do juego) ---
  for (let y = 0; y < height; y += 4) {
    let inter = map(y, 0, height, 0, 1);
    let c = lerpColor(color('#1a0f14'), color('#a02500'), inter);
    if (y > height * 0.6) c = lerpColor(color('#a02500'), color('#d35400'), map(y, height*0.6, height, 0, 1));
    fill(c); noStroke(); rect(0, y, width, 4);
  }
  
  // --- Árboles en llamas estilo Parallax (del 2do juego) ---
  drawTrees(bgOffsetBack, groundY - 10, 120, 0.008, '#3d0c0c'); // Capa fondo
  drawTrees(bgOffsetFront, groundY + 10, 90, 0.015, '#0d0202');  // Capa frente
  
  // --- Cenizas Flotantes (del 2do juego) ---
  if (state !== 'GAMEOVER' && frameCount % 2 === 0) spawnBgEmber();
  
  for (let i = bgEmbers.length - 1; i >= 0; i--) {
    let e = bgEmbers[i];
    fill(e.col); noStroke();
    drawingContext.globalAlpha = e.alpha / 255;
    rect(e.x, e.y, e.size, e.size);
    
    if (state !== 'GAMEOVER') {
      e.x += e.vx - gameSpeed * 0.2;
      e.y += e.vy;
    } else {
      e.x += e.vx * 0.2;
      e.y += e.vy * 0.2;
    }
    if (e.x < -10 || e.y < -10) bgEmbers.splice(i, 1);
  }
  drawingContext.globalAlpha = 1.0;

  // --- Lluvia de Lava (del 3er juego) ---
  if (state !== 'GAMEOVER' || deathTimer < 60) {
    if (random() < 0.3 + (gameSpeed * 0.05)) {
      lavaDrops.push({
        x: random(0, width + 400),
        y: -20,
        vx: -gameSpeed * 0.8,
        vy: random(7, 12),
        len: random(10, 25)
      });
    }
  }
  
  stroke('#FF5722');
  strokeWeight(2);
  for (let i = lavaDrops.length - 1; i >= 0; i--) {
    let drop = lavaDrops[i];
    line(drop.x, drop.y, drop.x - drop.vx, drop.y - drop.vy);
    
    if (state !== 'GAMEOVER') {
      drop.x += drop.vx;
      drop.y += drop.vy;
    } else {
      drop.x += drop.vx * 0.2;
      drop.y += drop.vy * 0.2;
    }
    
    if (drop.y >= groundY) {
      for (let k = 0; k < 3; k++) spawnParticle(drop.x, groundY, '#FF5722');
      lavaDrops.splice(i, 1);
    }
  }
  
  // --- El Suelo (Estilo quemado del 2do juego) ---
  noStroke();
  fill('#0d0505');
  rect(0, groundY, width, height - groundY);
  
  // Línea candente en la tierra
  stroke('#e67e22'); strokeWeight(3);
  line(0, groundY, width, groundY);
  
  // Líneas de velocidad del suelo
  stroke('#c0392b'); strokeWeight(1);
  for (let i = 0; i < width; i += 50) {
    let x = (i - (bgOffsetFront * 3) % 50 + 50) % 50 + i;
    line(x, groundY, x - 30, height);
  }
}

// Función que dibuja los árboles quemados
function drawTrees(offset, yBase, amplitude, noiseScale, col) {
  fill(col); noStroke();
  beginShape();
  vertex(0, height);
  for (let x = 0; x <= width + 20; x += 10) {
    let n1 = noise((x + offset) * noiseScale);
    let n2 = noise((x + offset) * noiseScale * 4);
    let y = yBase - (n1 * amplitude) - (n2 * 40);
    vertex(x, y);
  }
  vertex(width, height);
  endShape(CLOSE);
}

// Función que emite cenizas al fondo
function spawnBgEmber(randomX = false) {
  bgEmbers.push({
    x: randomX ? random(width) : width + 20,
    y: random(groundY + 20),
    vx: random(-4, -1),
    vy: random(-3, -0.5),
    size: random(2, 5),
    col: random(['#e67e22', '#f1c40f', '#d35400', '#c0392b']),
    alpha: random(100, 255)
  });
}

function spawnParticle(x, y, col, isDust = false) {
  particles.push({
    x: x, y: y,
    vx: random(-3, 1) - (isDust ? gameSpeed * 0.4 : 0),
    vy: random(-4, 0),
    life: 255,
    col: col,
    isDust: isDust,
    update: function() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= 15;
    },
    show: function() {
      if (this.isDust) {
        noStroke();
        fill(color(this.col));
        drawingContext.globalAlpha = max(0, this.life / 255);
        circle(this.x, this.y, 6);
        drawingContext.globalAlpha = 1.0;
      } else {
        stroke(this.col);
        strokeWeight(3);
        let alphaHex = hex(max(0, floor(this.life)), 2);
        stroke(this.col + alphaHex);
        point(this.x, this.y);
      }
    }
  });
}

// ====== UI SCREENS ======
function drawStartScreen() {
  fill(0, 180); noStroke();
  rect(0, 0, width, height);
  
  fill(255); textAlign(CENTER);
  textSize(48); text("LAVA CHASER", width / 2, height / 2 - 40);
  
  textSize(18); fill('#FF5722');
  text("Don't let the Lava Beast catch you!", width / 2, height / 2 + 10);
  
  textSize(22); fill('#A5D6A7');
  text("PRESS SPACE OR CLICK TO START", width / 2, height / 2 + 60);
}

function drawGameOverScreen() {
  fill(0, 200); noStroke();
  rect(0, 0, width, height);
  
  fill('#FF3D00'); textAlign(CENTER);
  textSize(54); text("CAUGHT!", width / 2, height / 2 - 30);
  
  textSize(24); fill(255);
  text(`FINAL SCORE: ${floor(score)}`, width / 2, height / 2 + 20);
  
  if (deathTimer > 30) {
    textSize(20); fill('#A5D6A7');
    text("PRESS SPACE OR CLICK TO RESTART", width / 2, height / 2 + 70);
  }
}