const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const stageName = document.getElementById("stageName");
const clearedCount = document.getElementById("clearedCount");
const messageBox = document.getElementById("messageBox");
const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const shapeGrid = document.getElementById("shapeGrid");

const TAU = Math.PI * 2;
const STAGE_CENTER = { x: canvas.width * 0.5, y: canvas.height * 0.52 };
const SHAPE_RADIUS = 150;
const START_OFFSET = { x: 0, y: -210 };
const CLOSE_DISTANCE = 34;
const MIN_PATH_POINTS = 110;
const PATH_MIN_DISTANCE = 5;

const stages = [
  { key: "circle", label: "円", sides: 0, radialVarianceMax: 0.16, cornerRange: [0, 2] },
  { key: "triangle", label: "三角", sides: 3, radialVarianceMax: 0.3, cornerRange: [3, 5] },
  { key: "square", label: "四角", sides: 4, radialVarianceMax: 0.28, cornerRange: [4, 6] },
  { key: "trapezoid", label: "台形", sides: 4, radialVarianceMax: 0.35, cornerRange: [4, 6], asymmetryMin: 0.06 },
  { key: "pentagon", label: "五角形", sides: 5, radialVarianceMax: 0.28, cornerRange: [5, 7] }
];

const state = {
  stageIndex: 0,
  cleared: new Set(),
  allClear: false,
  running: false,
  pointerActive: false,
  attemptFinished: false,
  pointer: { ...STAGE_CENTER },
  startPoint: null,
  herdLead: null,
  fencePath: [],
  cows: [],
  lastSampledPoint: null,
  lastTime: performance.now()
};

function buildTargetPoints(stage) {
  if (stage.key === "circle") {
    const points = [];
    for (let i = 0; i < 120; i += 1) {
      const angle = (i / 120) * TAU - Math.PI / 2;
      points.push({
        x: STAGE_CENTER.x + Math.cos(angle) * SHAPE_RADIUS,
        y: STAGE_CENTER.y + Math.sin(angle) * SHAPE_RADIUS
      });
    }
    return points;
  }

  const polygon = [];
  if (stage.key === "trapezoid") {
    const top = SHAPE_RADIUS * 0.72;
    const bottom = SHAPE_RADIUS * 1.18;
    const height = SHAPE_RADIUS * 1.42;
    polygon.push(
      { x: STAGE_CENTER.x - top * 0.5, y: STAGE_CENTER.y - height * 0.48 },
      { x: STAGE_CENTER.x + top * 0.5, y: STAGE_CENTER.y - height * 0.48 },
      { x: STAGE_CENTER.x + bottom * 0.5, y: STAGE_CENTER.y + height * 0.52 },
      { x: STAGE_CENTER.x - bottom * 0.5, y: STAGE_CENTER.y + height * 0.52 }
    );
    return polygon;
  }

  for (let i = 0; i < stage.sides; i += 1) {
    const angle = (i / stage.sides) * TAU - Math.PI / 2;
    polygon.push({
      x: STAGE_CENTER.x + Math.cos(angle) * SHAPE_RADIUS,
      y: STAGE_CENTER.y + Math.sin(angle) * SHAPE_RADIUS
    });
  }

  return polygon;
}

stages.forEach((stage) => {
  stage.targetPoints = buildTargetPoints(stage);
});

function createCows(startPoint) {
  return [
    { x: startPoint.x, y: startPoint.y, hue: "#fff7f0", patch: "#5b3824" },
    { x: startPoint.x - 22, y: startPoint.y + 20, hue: "#f7efe3", patch: "#7a4a25" },
    { x: startPoint.x + 24, y: startPoint.y + 14, hue: "#fff1d5", patch: "#8d5934" }
  ];
}

function setMessage(text) {
  messageBox.textContent = text;
}

function getStartPoint() {
  return {
    x: STAGE_CENTER.x + START_OFFSET.x,
    y: STAGE_CENTER.y + START_OFFSET.y
  };
}

function resetStage({ keepMessage = false } = {}) {
  const startPoint = getStartPoint();
  state.running = false;
  state.pointerActive = false;
  state.attemptFinished = false;
  state.pointer = { ...startPoint };
  state.startPoint = startPoint;
  state.herdLead = { ...startPoint };
  state.fencePath = [];
  state.cows = createCows(startPoint);
  state.lastSampledPoint = null;
  stageName.textContent = stages[state.stageIndex].label;
  clearedCount.textContent = String(state.cleared.size);

  if (!keepMessage) {
    setMessage(`${stages[state.stageIndex].label}を囲う準備ができました。「はじめる」でスタートできます。`);
  }
  renderShapePills();
}

function startStage() {
  if (state.running) {
    return;
  }
  resetStage({ keepMessage: true });
  state.running = true;
  state.pointerActive = false;
  state.fencePath.push({ ...state.startPoint });
  state.lastSampledPoint = { ...state.startPoint };
  setMessage(`${stages[state.stageIndex].label}の外側をなぞりながら、スタート地点へ戻って柵を閉じよう。`);
}

function renderShapePills() {
  shapeGrid.innerHTML = "";
  stages.forEach((stage, index) => {
    const pill = document.createElement("div");
    pill.className = "shape-pill";
    if (index === state.stageIndex) {
      pill.classList.add("active");
    }
    if (state.cleared.has(stage.key)) {
      pill.classList.add("done");
    }
    pill.textContent = stage.label;
    shapeGrid.appendChild(pill);
  });
}

function canvasPointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (source.clientX - rect.left) * scaleX,
    y: (source.clientY - rect.top) * scaleY
  };
}

function setPointer(event) {
  const point = canvasPointFromEvent(event);
  state.pointer = clampPoint(point);
}

function clampPoint(point) {
  return {
    x: Math.max(40, Math.min(canvas.width - 40, point.x)),
    y: Math.max(40, Math.min(canvas.height - 40, point.y))
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
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
    if (angle > 0.6) {
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
  const topWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.18);
  const bottomWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.82);
  const asymmetry = width > 0 ? Math.abs(bottomWidth - topWidth) / width : 0;

  return {
    centroid,
    radialVariance,
    cornerEstimate: Math.round(corners / 8),
    asymmetry
  };
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

function evaluateFence() {
  if (state.fencePath.length < MIN_PATH_POINTS) {
    setMessage("まだ柵が短いみたい。もう少し大きく図形のまわりを囲ってみよう。");
    state.attemptFinished = true;
    state.running = false;
    return;
  }

  const closedPath = [...state.fencePath];
  const simplified = simplifyPath(closedPath);
  const stage = stages[state.stageIndex];
  const insideCenter = pointInPolygon(STAGE_CENTER, simplified);

  if (!insideCenter) {
    setMessage("図形の中心が柵の外にあります。図形をしっかり包むように囲ってみよう。");
    state.attemptFinished = true;
    state.running = false;
    return;
  }

  const analysis = analyzePath(simplified);
  const cornersOk =
    analysis.cornerEstimate >= stage.cornerRange[0] && analysis.cornerEstimate <= stage.cornerRange[1];
  const radialOk = analysis.radialVariance <= stage.radialVarianceMax;
  const asymmetryOk = stage.key !== "trapezoid" || analysis.asymmetry >= stage.asymmetryMin;

  if (cornersOk && radialOk && asymmetryOk) {
    state.cleared.add(stage.key);
    clearedCount.textContent = String(state.cleared.size);

    if (state.stageIndex === stages.length - 1) {
      state.allClear = true;
      setMessage("おめでとう。5つ全部の図形をきれいに囲えました。もう一度遊ぶならやり直して挑戦できます。");
    } else {
      const nextStage = stages[state.stageIndex + 1];
      setMessage(`${stage.label}クリア。次は${nextStage.label}です。「はじめる」で次のステージへ進もう。`);
      state.stageIndex += 1;
      resetStage({ keepMessage: true });
    }
  } else {
    let tip = `${stage.label}らしさが少し足りませんでした。`;
    if (!radialOk && stage.key === "circle") {
      tip += " 円はもっとなめらかに丸く囲うと近づきます。";
    } else if (!cornersOk) {
      tip += " 角の数を意識して、辺をはっきり作るように動かしてみよう。";
    } else if (!asymmetryOk) {
      tip += " 台形は上辺より下辺を少し長くすると近づきます。";
    } else {
      tip += " 図形の外側をもう少し安定してなぞってみよう。";
    }
    setMessage(tip);
  }

  state.attemptFinished = true;
  state.running = false;
  renderShapePills();
}

function update(delta) {
  if (state.running) {
    const leadSpeed = state.pointerActive ? 84 : 56;
    const step = Math.min(1, (leadSpeed * delta) / Math.max(distance(state.herdLead, state.pointer), 1));
    state.herdLead.x = lerp(state.herdLead.x, state.pointer.x, step);
    state.herdLead.y = lerp(state.herdLead.y, state.pointer.y, step);

    state.cows.forEach((cow, index) => {
      const target =
        index === 0
          ? state.herdLead
          : {
              x: state.cows[index - 1].x + (index % 2 === 0 ? 24 : -24),
              y: state.cows[index - 1].y + 20
            };
      const cowStep = Math.min(1, (delta * (index === 0 ? 2.6 : 2.1)));
      cow.x = lerp(cow.x, target.x, cowStep);
      cow.y = lerp(cow.y, target.y, cowStep);
    });

    if (!state.lastSampledPoint || distance(state.herdLead, state.lastSampledPoint) >= PATH_MIN_DISTANCE) {
      state.fencePath.push({ x: state.herdLead.x, y: state.herdLead.y });
      state.lastSampledPoint = { x: state.herdLead.x, y: state.herdLead.y };
    }

    const closeReady =
      state.fencePath.length >= MIN_PATH_POINTS &&
      distance(state.herdLead, state.startPoint) <= CLOSE_DISTANCE;

    if (closeReady) {
      evaluateFence();
    }
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

function drawTargetShape() {
  const stage = stages[state.stageIndex];
  const points = stage.targetPoints;

  ctx.save();
  ctx.strokeStyle = "#2c65aa";
  ctx.fillStyle = "rgba(44, 101, 170, 0.18)";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawStartPoint() {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#8f4f18";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(state.startPoint.x, state.startPoint.y, 14, 0, TAU);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#8f4f18";
  ctx.font = '700 18px "Zen Maru Gothic"';
  ctx.textAlign = "center";
  ctx.fillText("START", state.startPoint.x, state.startPoint.y - 24);
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

  ctx.strokeStyle = "rgba(255,255,255,0.48)";
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

function drawCows() {
  state.cows.forEach((cow, index) => {
    ctx.save();
    ctx.translate(cow.x, cow.y);
    const direction = index === 0 ? Math.atan2(state.pointer.y - cow.y, state.pointer.x - cow.x) : 0;
    ctx.rotate(direction * 0.18);

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
  });
}

function drawPointerGuide() {
  if (!state.running) {
    return;
  }
  ctx.save();
  ctx.strokeStyle = "rgba(207, 122, 47, 0.38)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(state.herdLead.x, state.herdLead.y);
  ctx.lineTo(state.pointer.x, state.pointer.y);
  ctx.stroke();
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawTargetShape();
  drawStartPoint();
  drawFence();
  drawPointerGuide();
  drawCows();
}

function tick(now) {
  const delta = Math.min(0.05, (now - state.lastTime) / 1000);
  state.lastTime = now;
  update(delta);
  render();
  requestAnimationFrame(tick);
}

canvas.addEventListener("mousedown", (event) => {
  state.pointerActive = true;
  setPointer(event);
});

canvas.addEventListener("mousemove", (event) => {
  if (!state.pointerActive) {
    return;
  }
  setPointer(event);
});

window.addEventListener("mouseup", () => {
  state.pointerActive = false;
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    state.pointerActive = true;
    setPointer(event);
  },
  { passive: false }
);

canvas.addEventListener(
  "touchmove",
  (event) => {
    event.preventDefault();
    if (!state.pointerActive) {
      return;
    }
    setPointer(event);
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  state.pointerActive = false;
});

startButton.addEventListener("click", () => {
  if (state.allClear) {
    state.stageIndex = 0;
    state.cleared.clear();
    state.allClear = false;
  }
  startStage();
});

resetButton.addEventListener("click", () => {
  if (state.allClear) {
    state.stageIndex = 0;
    state.cleared.clear();
    state.allClear = false;
  }
  resetStage();
});

resetStage();
requestAnimationFrame(tick);
