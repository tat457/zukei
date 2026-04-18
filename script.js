const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const titleScreen = document.getElementById("titleScreen");
const gameScreen = document.getElementById("gameScreen");
const stageName = document.getElementById("stageName");
const selectedShapeLabel = document.getElementById("selectedShapeLabel");
const clearedCount = document.getElementById("clearedCount");
const messageBox = document.getElementById("messageBox");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const backButton = document.getElementById("backButton");
const shapeGrid = document.getElementById("shapeGrid");

const TAU = Math.PI * 2;
const MIN_PATH_POINTS = 48;
const PATH_MIN_DISTANCE = 6;
const COW_RADIUS = 26;
const PLAY_AREA = {
  minX: 90,
  maxX: canvas.width - 90,
  minY: 120,
  maxY: canvas.height - 86
};

const shapes = [
  { key: "circle", label: "円", sides: 0, radialVarianceMax: 0.18, cornerRange: [0, 2] },
  { key: "triangle", label: "三角", sides: 3, radialVarianceMax: 0.34, cornerRange: [2, 4] },
  { key: "square", label: "四角", sides: 4, radialVarianceMax: 0.3, cornerRange: [3, 5] },
  { key: "trapezoid", label: "台形", sides: 4, radialVarianceMax: 0.36, cornerRange: [3, 5], asymmetryMin: 0.08 },
  { key: "pentagon", label: "五角形", sides: 5, radialVarianceMax: 0.3, cornerRange: [4, 6] }
];

const state = {
  selectedShapeKey: "circle",
  successfulRounds: 0,
  screen: "title",
  running: false,
  drawing: false,
  attemptFinished: false,
  pointer: null,
  fencePath: [],
  lastSampledPoint: null,
  cows: [],
  lastTime: performance.now()
};

function setMessage(text) {
  messageBox.textContent = text;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clampPoint(point) {
  return {
    x: Math.max(24, Math.min(canvas.width - 24, point.x)),
    y: Math.max(24, Math.min(canvas.height - 24, point.y))
  };
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return clampPoint({
    x: (source.clientX - rect.left) * scaleX,
    y: (source.clientY - rect.top) * scaleY
  });
}

function getSelectedShape() {
  return shapes.find((shape) => shape.key === state.selectedShapeKey);
}

function syncShapeLabels() {
  const shape = getSelectedShape();
  stageName.textContent = shape.label;
  selectedShapeLabel.textContent = shape.label;
}

function showTitleScreen() {
  state.screen = "title";
  state.running = false;
  state.drawing = false;
  titleScreen.hidden = false;
  gameScreen.hidden = true;
}

function showGameScreen() {
  state.screen = "game";
  titleScreen.hidden = true;
  gameScreen.hidden = false;
}

function renderShapeButtons() {
  shapeGrid.innerHTML = "";

  shapes.forEach((shape) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shape-pill";
    button.textContent = shape.label;

    if (shape.key === state.selectedShapeKey) {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      state.selectedShapeKey = shape.key;
      syncShapeLabels();
      renderShapeButtons();

      if (state.screen === "title") {
        setMessage(`${shape.label}を選びました。スタートを押すとゲーム画面へ進みます。`);
      } else if (!state.running) {
        setMessage(`${shape.label}を選びました。タイトルへ戻ってスタートし直すとその図形で遊べます。`);
      } else {
        setMessage(`図形を${shape.label}に変更しました。必要なら「牛の動きをリセット」でやり直せます。`);
      }
    });

    shapeGrid.appendChild(button);
  });
}

function createCow(x, y, vx, vy, hue, patch) {
  return { x, y, vx, vy, hue, patch };
}

function createCows() {
  return [
    createCow(300, 220, 58, 38, "#fff7f0", "#5b3824"),
    createCow(520, 310, -46, 42, "#f7efe3", "#7a4a25"),
    createCow(680, 210, 52, -34, "#fff1d5", "#8d5934")
  ];
}

function resetRound({ keepMessage = false } = {}) {
  state.running = false;
  state.drawing = false;
  state.attemptFinished = false;
  state.pointer = null;
  state.fencePath = [];
  state.lastSampledPoint = null;
  state.cows = [];
  syncShapeLabels();
  clearedCount.textContent = String(state.successfulRounds);
  renderShapeButtons();

  if (!keepMessage) {
    setMessage(`${getSelectedShape().label}を選択中です。スタートでゲーム画面に進めます。`);
  }
}

function startRound() {
  state.running = true;
  state.drawing = false;
  state.attemptFinished = false;
  state.pointer = null;
  state.fencePath = [];
  state.lastSampledPoint = null;
  state.cows = createCows();
  setMessage(`${getSelectedShape().label}の形を意識して、三頭ともまとめて囲ってみよう。`);
}

function pointInPolygon(point, polygon) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function measureHorizontalWidth(path, sampleY) {
  const xs = [];

  for (let i = 0; i < path.length; i += 1) {
    const current = path[i];
    const next = path[(i + 1) % path.length];
    const crosses = (current.y <= sampleY && next.y >= sampleY) || (current.y >= sampleY && next.y <= sampleY);

    if (!crosses || current.y === next.y) {
      continue;
    }

    const t = (sampleY - current.y) / (next.y - current.y);
    xs.push(lerp(current.x, next.x, t));
  }

  if (xs.length < 2) {
    return 0;
  }

  xs.sort((a, b) => a - b);
  return xs[xs.length - 1] - xs[0];
}

function simplifyPath(path) {
  const simplified = [];

  for (const point of path) {
    if (simplified.length === 0 || distance(point, simplified[simplified.length - 1]) >= 8) {
      simplified.push(point);
    }
  }

  return simplified;
}

function analyzePath(path) {
  const centroid = path.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= path.length;
  centroid.y /= path.length;

  const distances = path.map((point) => distance(point, centroid));
  const meanRadius = distances.reduce((sum, value) => sum + value, 0) / distances.length;
  const radialVariance =
    distances.reduce((sum, value) => sum + Math.abs(value - meanRadius), 0) / distances.length / meanRadius;

  let corners = 0;
  for (let i = 1; i < path.length - 1; i += 1) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const v1 = { x: current.x - prev.x, y: current.y - prev.y };
    const v2 = { x: next.x - current.x, y: next.y - current.y };
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);

    if (mag1 < 0.0001 || mag2 < 0.0001) {
      continue;
    }

    const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));

    if (angle > 0.75) {
      corners += 1;
    }
  }

  const bounds = path.reduce(
    (acc, point) => ({
      minX: Math.min(acc.minX, point.x),
      maxX: Math.max(acc.maxX, point.x),
      minY: Math.min(acc.minY, point.y),
      maxY: Math.max(acc.maxY, point.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const width = bounds.maxX - bounds.minX;
  const topWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.2);
  const bottomWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.8);
  const asymmetry = width > 0 ? Math.abs(bottomWidth - topWidth) / width : 0;

  return {
    centroid,
    radialVariance,
    cornerEstimate: Math.round(corners / 6),
    asymmetry
  };
}

function evaluateFence() {
  state.drawing = false;
  state.attemptFinished = true;

  if (state.fencePath.length < MIN_PATH_POINTS) {
    setMessage("柵が短すぎます。牛をぐるっと大きく囲うように描いてみよう。");
    return;
  }

  const closedPath = [...state.fencePath];
  const simplified = simplifyPath(closedPath);
  const selectedShape = getSelectedShape();
  const enclosedCount = state.cows.filter((cow) => pointInPolygon(cow, simplified)).length;

  if (enclosedCount < 3) {
    setMessage(`牛を${enclosedCount}頭しか囲えていません。3頭まとめて中に入るように描いてみよう。`);
    return;
  }

  const analysis = analyzePath(simplified);
  const cornersOk =
    analysis.cornerEstimate >= selectedShape.cornerRange[0] &&
    analysis.cornerEstimate <= selectedShape.cornerRange[1];
  const radialOk = analysis.radialVariance <= selectedShape.radialVarianceMax;
  const asymmetryOk = selectedShape.key !== "trapezoid" || analysis.asymmetry >= selectedShape.asymmetryMin;

  if (cornersOk && radialOk && asymmetryOk) {
    state.successfulRounds += 1;
    clearedCount.textContent = String(state.successfulRounds);
    setMessage(`${selectedShape.label}で3頭とも囲えました。クリアです。もう一度遊ぶなら「はじめる」で再挑戦できます。`);
    state.running = false;
    return;
  }

  if (!radialOk && selectedShape.key === "circle") {
    setMessage("3頭は囲えていますが、円らしさが足りません。もっと丸くなめらかに描いてみよう。");
  } else if (!cornersOk) {
    setMessage(`3頭は囲えていますが、${selectedShape.label}の角の数が少し違います。角を意識して描いてみよう。`);
  } else if (!asymmetryOk) {
    setMessage("3頭は囲えていますが、台形らしさが足りません。上辺より下辺を少し長めにしてみよう。");
  } else {
    setMessage(`3頭は囲えていますが、${selectedShape.label}の形にもう少し近づけるとクリアです。`);
  }
}

function updateCows(delta) {
  state.cows.forEach((cow) => {
    cow.x += cow.vx * delta;
    cow.y += cow.vy * delta;

    if (cow.x <= PLAY_AREA.minX || cow.x >= PLAY_AREA.maxX) {
      cow.vx *= -1;
      cow.x = Math.max(PLAY_AREA.minX, Math.min(PLAY_AREA.maxX, cow.x));
    }

    if (cow.y <= PLAY_AREA.minY || cow.y >= PLAY_AREA.maxY) {
      cow.vy *= -1;
      cow.y = Math.max(PLAY_AREA.minY, Math.min(PLAY_AREA.maxY, cow.y));
    }
  });
}

function update(delta) {
  if (!state.running) {
    return;
  }

  updateCows(delta);

  if (!state.drawing || !state.pointer) {
    return;
  }

  if (!state.lastSampledPoint || distance(state.pointer, state.lastSampledPoint) >= PATH_MIN_DISTANCE) {
    state.fencePath.push({ x: state.pointer.x, y: state.pointer.y });
    state.lastSampledPoint = { x: state.pointer.x, y: state.pointer.y };
  }
}

function drawBackground() {
  const horizonY = canvas.height * 0.62;
  ctx.fillStyle = "#f7f1d7";
  ctx.fillRect(0, horizonY - 12, canvas.width, canvas.height - horizonY + 12);

  ctx.fillStyle = "rgba(149, 200, 106, 0.32)";
  for (let i = 0; i < 14; i += 1) {
    const x = (i / 13) * canvas.width;
    ctx.beginPath();
    ctx.arc(x, canvas.height - 6, 90 + (i % 4) * 18, Math.PI, TAU);
    ctx.fill();
  }

  ctx.fillStyle = "#ffffff";
  drawCloud(150, 90, 1);
  drawCloud(720, 116, 1.2);
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, TAU);
  ctx.arc(26, -12, 28, 0, TAU);
  ctx.arc(58, 0, 22, 0, TAU);
  ctx.arc(30, 10, 30, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawTargetPreview() {
  const shape = getSelectedShape();
  const center = { x: canvas.width - 128, y: 120 };
  const radius = 58;

  ctx.save();
  ctx.fillStyle = "rgba(44, 101, 170, 0.18)";
  ctx.strokeStyle = "#2c65aa";
  ctx.lineWidth = 4;
  ctx.setLineDash([8, 8]);

  if (shape.key === "circle") {
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    const points = [];

    if (shape.key === "trapezoid") {
      points.push(
        { x: center.x - radius * 0.55, y: center.y - radius * 0.75 },
        { x: center.x + radius * 0.55, y: center.y - radius * 0.75 },
        { x: center.x + radius * 0.92, y: center.y + radius * 0.8 },
        { x: center.x - radius * 0.92, y: center.y + radius * 0.8 }
      );
    } else {
      for (let i = 0; i < shape.sides; i += 1) {
        const angle = (i / shape.sides) * TAU - Math.PI / 2;
        points.push({
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius
        });
      }
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.fillStyle = "#2c65aa";
  ctx.font = '700 18px "Zen Maru Gothic"';
  ctx.textAlign = "center";
  ctx.fillText(`お題: ${shape.label}`, center.x, center.y + 90);
  ctx.restore();
}

function drawFence() {
  if (state.fencePath.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "#7d5230";
  ctx.lineWidth = 7;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(state.fencePath[0].x, state.fencePath[0].y);
  for (let i = 1; i < state.fencePath.length; i += 1) {
    ctx.lineTo(state.fencePath[i].x, state.fencePath[i].y);
  }
  if (state.attemptFinished) {
    ctx.closePath();
  }
  ctx.stroke();

  if (state.attemptFinished) {
    ctx.fillStyle = "rgba(125, 82, 48, 0.1)";
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.fencePath[0].x, state.fencePath[0].y);
  for (let i = 1; i < state.fencePath.length; i += 1) {
    ctx.lineTo(state.fencePath[i].x, state.fencePath[i].y);
  }
  if (state.attemptFinished) {
    ctx.closePath();
  }
  ctx.stroke();
  ctx.restore();
}

function drawCow(cow) {
  ctx.save();
  ctx.translate(cow.x, cow.y);
  ctx.rotate(Math.atan2(cow.vy, cow.vx) * 0.2);

  ctx.fillStyle = cow.hue;
  ctx.strokeStyle = "#56331a";
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 18, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = cow.patch;
  ctx.beginPath();
  ctx.ellipse(-8, -2, 8, 6, 0.25, 0, TAU);
  ctx.ellipse(7, 5, 7, 5, -0.45, 0, TAU);
  ctx.fill();

  ctx.fillStyle = cow.hue;
  ctx.beginPath();
  ctx.ellipse(22, -4, 11, 9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(26, -12);
  ctx.lineTo(24, -20);
  ctx.lineTo(20, -10);
  ctx.moveTo(16, -12);
  ctx.lineTo(14, -20);
  ctx.lineTo(10, -10);
  ctx.stroke();

  ctx.fillStyle = "#2c1f16";
  ctx.beginPath();
  ctx.arc(26, -5, 1.7, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#56331a";
  ctx.lineWidth = 3;
  [-14, -4, 8, 16].forEach((legX) => {
    ctx.beginPath();
    ctx.moveTo(legX, 16);
    ctx.lineTo(legX, 28);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.moveTo(-26, -6);
  ctx.quadraticCurveTo(-38, -16, -38, -30);
  ctx.stroke();
  ctx.restore();
}

function drawCows() {
  state.cows.forEach(drawCow);
}

function drawIdleGuide() {
  if (state.running) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.strokeStyle = "rgba(125, 82, 48, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(70, 220, 420, 120, 22);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#6c5b45";
  ctx.font = '700 24px "Zen Maru Gothic"';
  ctx.fillText("図形を選んで「はじめる」を押そう", 100, 268);
  ctx.font = '500 18px "Zen Maru Gothic"';
  ctx.fillText("牛が3頭あらわれたら、押したまま囲って離すだけです。", 100, 305);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawTargetPreview();
  drawFence();
  drawCows();
  if (state.screen === "game") {
    drawIdleGuide();
  }
}

function tick(now) {
  const delta = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(delta);
  render();
  requestAnimationFrame(tick);
}

function beginDrawing(event) {
  if (!state.running) {
    return;
  }

  state.drawing = true;
  state.attemptFinished = false;
  state.pointer = canvasPointFromEvent(event);
  state.fencePath = [{ ...state.pointer }];
  state.lastSampledPoint = { ...state.pointer };
}

function moveDrawing(event) {
  if (!state.drawing) {
    return;
  }

  state.pointer = canvasPointFromEvent(event);
}

function endDrawing() {
  if (!state.drawing) {
    return;
  }

  evaluateFence();
}

canvas.addEventListener("mousedown", (event) => {
  beginDrawing(event);
});

canvas.addEventListener("mousemove", (event) => {
  moveDrawing(event);
});

window.addEventListener("mouseup", () => {
  endDrawing();
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    beginDrawing(event);
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    moveDrawing(event);
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  endDrawing();
});

startButton.addEventListener("click", () => {
  showGameScreen();
  startRound();
});

resetButton.addEventListener("click", () => {
  resetRound();
});

backButton.addEventListener("click", () => {
  resetRound({ keepMessage: true });
  showTitleScreen();
  setMessage(`${getSelectedShape().label}を選択中です。スタートでゲーム画面に進めます。`);
});

renderShapeButtons();
syncShapeLabels();
resetRound();
showTitleScreen();
requestAnimationFrame(tick);
