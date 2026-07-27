const GAME_DURATION = 30;
const BAD_LUCK = [
  "加班霉",
  "KPI压力",
  "被老板盯上",
  "月光霉",
  "冲动消费",
  "拖延症",
  "熬夜霉",
  "内耗严重",
  "单身霉",
  "已读不回",
  "暧昧翻车",
  "水逆",
  "电量焦虑",
  "WiFi断连",
];
const GOOD_LUCK = ["桃花运", "升职运", "意外之财", "锦鲤附体"];
const FORTUNES = ["好运加载中", "转运中", "今日大吉", "万事如意", "霉运全消"];

const startScreen = document.querySelector("#start-screen");
const gameScreen = document.querySelector("#game-screen");
const resultScreen = document.querySelector("#result-screen");
const startButton = document.querySelector("#start-button");
const restartButton = document.querySelector("#restart-button");
const shareButton = document.querySelector("#share-button");
const shareFeedback = document.querySelector("#share-feedback");
const timeLeft = document.querySelector("#time-left");
const scoreElement = document.querySelector("#score");
const comboElement = document.querySelector("#combo");
const comboCount = document.querySelector("#combo-count");
const gameHint = document.querySelector("#game-hint");
const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

let screen = "start";
let animationId = 0;
let timerId = 0;
let spawnId = 0;
let startedAt = 0;
let lastFrame = 0;
let objects = [];
let fragments = [];
let particles = [];
let floaters = [];
let trail = [];
let pointerDown = false;
let score = 0;
let totalBad = 0;
let goodLuckCut = 0;
let combo = 0;
let lastCutAt = 0;
let result = { cleared: 0, total: 0, goodLuckCut: 0, remain: 100 };
let audioContext = null;

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function setScreen(next) {
  screen = next;
  [startScreen, gameScreen, resultScreen].forEach((element) => {
    element.classList.toggle("is-active", element.id.startsWith(next));
  });
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function canvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function initAudio() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioContext = new AudioContextClass();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
}

function playTone(type = "slice") {
  if (!audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = type === "good" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(type === "good" ? 240 : 820, now);
  oscillator.frequency.exponentialRampToValueAtTime(type === "good" ? 430 : 120, now + 0.1);
  gain.gain.setValueAtTime(type === "good" ? 0.18 : 0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.12);
}

function resetGame() {
  cancelAnimationFrame(animationId);
  clearInterval(timerId);
  clearInterval(spawnId);
  objects = [];
  fragments = [];
  particles = [];
  floaters = [];
  trail = [];
  pointerDown = false;
  score = 0;
  totalBad = 0;
  goodLuckCut = 0;
  combo = 0;
  lastCutAt = 0;
  scoreElement.textContent = "0";
  timeLeft.textContent = String(GAME_DURATION);
  comboElement.classList.remove("is-visible");
  gameHint.style.display = "";
}

function startGame() {
  initAudio();
  resetGame();
  setScreen("game");
  resizeCanvas();
  const { width, height } = canvasSize();
  startedAt = performance.now();
  lastFrame = startedAt;

  for (let index = 0; index < 3; index += 1) {
    setTimeout(() => {
      if (screen === "game") spawnTofu(width * (0.34 + index * 0.16), height + 70, false);
    }, index * 180);
  }

  spawnId = window.setInterval(() => {
    if (screen === "game") spawnTofu();
  }, 820);

  timerId = window.setInterval(updateTimer, 200);
  animationId = requestAnimationFrame(gameLoop);
}

function updateTimer() {
  const elapsed = (performance.now() - startedAt) / 1000;
  const remaining = Math.max(0, Math.ceil(GAME_DURATION - elapsed));
  timeLeft.textContent = String(remaining);
  if (remaining <= GAME_DURATION - 3) gameHint.style.display = "none";
  if (remaining <= 0) finishGame();
}

function finishGame() {
  if (screen !== "game") return;
  clearInterval(timerId);
  clearInterval(spawnId);
  cancelAnimationFrame(animationId);
  const clearedPercent = totalBad === 0 ? 0 : Math.min(100, Math.round((score / totalBad) * 100));
  result = {
    cleared: score,
    total: totalBad,
    goodLuckCut,
    remain: 100 - clearedPercent,
  };
  renderResult();
  setScreen("result");
  celebrate(clearedPercent);
}

function spawnTofu(forcedX, forcedY, forcedGood = null) {
  const { width, height } = canvasSize();
  if (!width || !height) return;
  const isGood = forcedGood ?? Math.random() < 0.15;
  const size = Math.max(74, Math.min(116, width * 0.12 + Math.random() * 22));
  const x = forcedX ?? size / 2 + Math.random() * Math.max(1, width - size);
  const y = forcedY ?? height + size;
  const targetX = width * (0.28 + Math.random() * 0.44);
  const flightTime = 1.25 + Math.random() * 0.55;
  const vx = (targetX - x) / (flightTime * 60);
  const vy = -(12.8 + Math.random() * 6.5);
  objects.push({
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    x,
    y,
    width: size,
    height: size * 0.84,
    vx,
    vy,
    rotation: (Math.random() - 0.5) * 0.75,
    rotationSpeed: (Math.random() - 0.5) * 0.055,
    label: randomItem(isGood ? GOOD_LUCK : BAD_LUCK),
    isGood,
    cut: false,
  });
  if (!isGood) totalBad += 1;
}

function gameLoop(now) {
  if (screen !== "game") return;
  const dt = Math.min(2, Math.max(0.35, (now - lastFrame) / 16.667));
  lastFrame = now;
  updateObjects(dt, now);
  drawScene(now);
  animationId = requestAnimationFrame(gameLoop);
}

function updateObjects(dt, now) {
  const { width, height } = canvasSize();
  for (const object of objects) {
    object.x += object.vx * dt;
    object.y += object.vy * dt;
    object.vy += 0.32 * dt;
    object.rotation += object.rotationSpeed * dt;
  }
  objects = objects.filter((object) => (
    object.y < height + object.height * 2
    && object.x > -object.width * 2
    && object.x < width + object.width * 2
  ));

  for (const fragment of fragments) {
    fragment.x += fragment.vx * dt;
    fragment.y += fragment.vy * dt;
    fragment.vy += 0.39 * dt;
    fragment.rotation += fragment.rotationSpeed * dt;
    fragment.life -= 0.012 * dt;
  }
  fragments = fragments.filter((fragment) => fragment.life > 0 && fragment.y < height + 180);

  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 0.14 * dt;
    particle.life -= 0.025 * dt;
  }
  particles = particles.filter((particle) => particle.life > 0);

  for (const floater of floaters) {
    floater.y -= 0.7 * dt;
    floater.life -= 0.018 * dt;
  }
  floaters = floaters.filter((floater) => floater.life > 0);

  trail = trail.filter((point) => now - point.time < 170);
}

function drawScene(now) {
  const { width, height } = canvasSize();
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.22, 20, width * 0.5, height * 0.5, Math.max(width, height));
  gradient.addColorStop(0, "#c82323");
  gradient.addColorStop(1, "#a91414");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (const object of objects) drawTofu(object);
  for (const fragment of fragments) drawFragment(fragment);
  for (const particle of particles) drawParticle(particle);
  for (const floater of floaters) drawFloater(floater);
  drawTrail(now);
}

function drawTofu(object) {
  const w = object.width;
  const h = object.height;
  ctx.save();
  ctx.translate(object.x, object.y);
  ctx.rotate(object.rotation);

  ctx.shadowColor = "rgba(55, 0, 0, 0.36)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 12;
  roundedRect(-w / 2, -h / 2, w, h, 12);
  ctx.fillStyle = object.isGood ? "#ffe27b" : "#f5e8bd";
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.fillStyle = object.isGood ? "#e2bd3e" : "#cfbd87";
  ctx.beginPath();
  ctx.moveTo(w / 2 - 12, -h / 2);
  ctx.lineTo(w / 2, -h / 2 + 12);
  ctx.lineTo(w / 2, h / 2 - 12);
  ctx.lineTo(w / 2 - 12, h / 2);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = object.isGood ? "#8c6500" : "#7e4f34";
  ctx.lineWidth = 2.2;
  roundedRect(-w / 2, -h / 2, w, h, 12);
  ctx.stroke();

  const spotColor = object.isGood ? "rgba(255,255,255,.62)" : "rgba(80,112,51,.74)";
  ctx.fillStyle = spotColor;
  const spots = [
    [-0.28, -0.25, 0.055],
    [0.24, -0.16, 0.075],
    [-0.12, 0.24, 0.065],
  ];
  for (const [sx, sy, sr] of spots) {
    ctx.beginPath();
    ctx.arc(w * sx, h * sy, w * sr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = object.isGood ? "#724f00" : "#64352d";
  ctx.font = `800 ${Math.max(13, w * 0.145)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(object.label, -4, 3, w * 0.78);
  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawFragment(fragment) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, fragment.life);
  ctx.translate(fragment.x, fragment.y);
  ctx.rotate(fragment.rotation);
  ctx.fillStyle = fragment.isGood ? "#ffe27b" : "#f5e8bd";
  ctx.strokeStyle = fragment.isGood ? "#8c6500" : "#7e4f34";
  ctx.lineWidth = 2;
  const direction = fragment.side;
  ctx.beginPath();
  ctx.moveTo(0, -fragment.height / 2);
  ctx.lineTo(direction * fragment.width / 2, -fragment.height / 2 + 6);
  ctx.lineTo(direction * fragment.width / 2, fragment.height / 2 - 6);
  ctx.lineTo(0, fragment.height / 2);
  ctx.lineTo(direction * 6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParticle(particle) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, particle.life);
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFloater(floater) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, floater.life);
  ctx.fillStyle = floater.color;
  ctx.font = '900 22px "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,.4)";
  ctx.shadowBlur = 8;
  ctx.fillText(floater.text, floater.x, floater.y);
  ctx.restore();
}

function drawTrail(now) {
  if (trail.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = 1; index < trail.length; index += 1) {
    const previous = trail[index - 1];
    const current = trail[index];
    const alpha = Math.max(0, 1 - (now - current.time) / 170);
    ctx.strokeStyle = `rgba(255, 244, 155, ${alpha * 0.88})`;
    ctx.shadowColor = `rgba(255, 219, 65, ${alpha})`;
    ctx.shadowBlur = 13;
    ctx.lineWidth = 2 + alpha * 8;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
  }
  ctx.restore();
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    time: performance.now(),
  };
}

function onPointerDown(event) {
  if (screen !== "game") return;
  pointerDown = true;
  canvas.setPointerCapture?.(event.pointerId);
  trail = [pointerPosition(event)];
  event.preventDefault();
}

function onPointerMove(event) {
  if (!pointerDown || screen !== "game") return;
  const point = pointerPosition(event);
  const previous = trail[trail.length - 1] ?? point;
  trail.push(point);
  if (trail.length > 18) trail.shift();
  detectCuts(previous, point);
  event.preventDefault();
}

function onPointerUp(event) {
  pointerDown = false;
  canvas.releasePointerCapture?.(event.pointerId);
}

function detectCuts(start, end) {
  for (const object of [...objects]) {
    if (object.cut) continue;
    const radius = Math.max(object.width, object.height) * 0.52;
    if (distanceToSegment(object.x, object.y, start.x, start.y, end.x, end.y) <= radius) {
      cutObject(object);
    }
  }
}

function distanceToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  return Math.hypot(px - nearestX, py - nearestY);
}

function cutObject(object) {
  object.cut = true;
  objects = objects.filter((item) => item !== object);
  const now = performance.now();
  if (now - lastCutAt < 850) combo += 1;
  else combo = 1;
  lastCutAt = now;

  if (object.isGood) {
    goodLuckCut += 1;
    combo = 0;
    playTone("good");
    floaters.push({ x: object.x, y: object.y - 24, text: "好运 -1", color: "#ffe46d", life: 1 });
  } else {
    score += 1;
    scoreElement.textContent = String(score);
    playTone("slice");
    floaters.push({ x: object.x, y: object.y - 24, text: `${object.label} 已切除`, color: "#fff1a7", life: 1 });
    if (combo > 1) showCombo(combo);
  }

  for (const side of [-1, 1]) {
    fragments.push({
      x: object.x + side * 5,
      y: object.y,
      width: object.width,
      height: object.height,
      vx: object.vx + side * (2.2 + Math.random() * 2.2),
      vy: object.vy * 0.35 - 1.6,
      rotation: object.rotation,
      rotationSpeed: object.rotationSpeed + side * 0.08,
      side,
      isGood: object.isGood,
      life: 1,
    });
  }

  const color = object.isGood ? "#ffd940" : "#728b4f";
  for (let index = 0; index < 16; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 5;
    particles.push({
      x: object.x,
      y: object.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      size: 2 + Math.random() * 4,
      color,
      life: 0.7 + Math.random() * 0.4,
    });
  }

  if (navigator.vibrate) navigator.vibrate(object.isGood ? [24, 22, 24] : 18);
}

function showCombo(value) {
  comboCount.textContent = String(value);
  comboElement.classList.remove("is-visible");
  void comboElement.offsetWidth;
  comboElement.classList.add("is-visible");
}

function renderResult() {
  document.querySelector("#result-cleared").textContent = String(result.cleared);
  document.querySelector("#result-remain").textContent = String(result.remain);
  document.querySelector("#result-good-cut").textContent = String(result.goodLuckCut);
  document.querySelector("#good-luck-note").hidden = result.goodLuckCut === 0;
  document.querySelector("#fortune-text").textContent = randomItem(FORTUNES);
  shareFeedback.textContent = "";
}

function celebrate(clearedPercent) {
  if (clearedPercent < 45) return;
  const burst = document.createElement("div");
  burst.setAttribute("aria-hidden", "true");
  burst.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:20;overflow:hidden";
  for (let index = 0; index < 70; index += 1) {
    const piece = document.createElement("i");
    const left = Math.random() * 100;
    const delay = Math.random() * 0.7;
    const duration = 1.6 + Math.random() * 1.5;
    const color = randomItem(["#ffd83d", "#fff", "#ff6f61"]);
    piece.style.cssText = `position:absolute;left:${left}%;top:-20px;width:7px;height:12px;background:${color};transform:rotate(${Math.random() * 180}deg);animation:confetti-fall ${duration}s ${delay}s ease-in forwards`;
    burst.appendChild(piece);
  }
  if (!document.querySelector("#confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = "@keyframes confetti-fall{to{transform:translateY(110vh) rotate(760deg);opacity:.15}}";
    document.head.appendChild(style);
  }
  document.body.appendChild(burst);
  setTimeout(() => burst.remove(), 3600);
}

async function shareResult() {
  const text = `我在《切霉豆腐》里斩断了 ${result.cleared} 份霉运，霉运残留率 ${result.remain}%！愿你霉运全消，万事胜意。`;
  const data = { title: "切霉豆腐｜去霉报告", text, url: window.location.href };
  try {
    if (navigator.share) {
      await navigator.share(data);
      shareFeedback.textContent = "好运已分享 ✨";
    } else {
      await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      shareFeedback.textContent = "分享文案和链接已复制";
    }
  } catch (error) {
    if (error.name !== "AbortError") shareFeedback.textContent = "复制失败，请直接分享当前网址";
  }
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
shareButton.addEventListener("click", shareResult);
canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
canvas.addEventListener("pointermove", onPointerMove, { passive: false });
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
window.addEventListener("resize", () => {
  if (screen === "game") resizeCanvas();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "game") pointerDown = false;
});
