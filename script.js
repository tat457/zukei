
const shapeGrid = document.getElementById("shapeGrid");

const TAU = Math.PI * 2;
const STAGE_CENTER = { x: canvas.width * 0.5, y: canvas.height * 0.52 };
const SHAPE_RADIUS = 150;
const START_OFFSET = { x: 0, y: -210 };
const CLOSE_DISTANCE = 34;
const MIN_PATH_POINTS = 110;
const PATH_MIN_DISTANCE = 5;
const MIN_PATH_POINTS = 48;
const PATH_MIN_DISTANCE = 6;
const COW_RADIUS = 26;
const PLAY_AREA = {
  minX: 90,
  maxX: canvas.width - 90,
  minY: 120,
  maxY: canvas.height - 86
};

const stages = [
  { key: "circle", label: "円", sides: 0, radialVarianceMax: 0.16, cornerRange: [0, 2] },
  { key: "triangle", label: "三角", sides: 3, radialVarianceMax: 0.3, cornerRange: [3, 5] },
  { key: "square", label: "四角", sides: 4, radialVarianceMax: 0.28, cornerRange: [4, 6] },
  { key: "trapezoid", label: "台形", sides: 4, radialVarianceMax: 0.35, cornerRange: [4, 6], asymmetryMin: 0.06 },
  { key: "pentagon", label: "五角形", sides: 5, radialVarianceMax: 0.28, cornerRange: [5, 7] }
const shapes = [
  { key: "circle", label: "円", sides: 0, radialVarianceMax: 0.18, cornerRange: [0, 2] },
  { key: "triangle", label: "三角", sides: 3, radialVarianceMax: 0.34, cornerRange: [2, 4] },
  { key: "square", label: "四角", sides: 4, radialVarianceMax: 0.3, cornerRange: [3, 5] },
  { key: "trapezoid", label: "台形", sides: 4, radialVarianceMax: 0.36, cornerRange: [3, 5], asymmetryMin: 0.08 },
  { key: "pentagon", label: "五角形", sides: 5, radialVarianceMax: 0.3, cornerRange: [4, 6] }
];

const state = {
  stageIndex: 0,
  cleared: new Set(),
  allClear: false,
  selectedShapeKey: "circle",
  successfulRounds: 0,
  running: false,
  pointerActive: false,
  drawing: false,
  attemptFinished: false,
  pointer: { ...STAGE_CENTER },
  startPoint: null,
  herdLead: null,
  pointer: null,
  fencePath: [],
  lastSampledPoint: null,
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
function setMessage(text) {
  messageBox.textContent = text;
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
function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function setMessage(text) {
  messageBox.textContent = text;
function lerp(a, b, t) {
  return a + (b - a) * t;
}

function getStartPoint() {
function clampPoint(point) {
  return {
    x: STAGE_CENTER.x + START_OFFSET.x,
    y: STAGE_CENTER.y + START_OFFSET.y
    x: Math.max(24, Math.min(canvas.width - 24, point.x)),
    y: Math.max(24, Math.min(canvas.height - 24, point.y))
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
function getSelectedShape() {
  return shapes.find((shape) => shape.key === state.selectedShapeKey);
}

function renderShapePills() {
function renderShapeButtons() {
  shapeGrid.innerHTML = "";
  stages.forEach((stage, index) => {
    const pill = document.createElement("div");
    pill.className = "shape-pill";
    if (index === state.stageIndex) {
      pill.classList.add("active");
    }
    if (state.cleared.has(stage.key)) {
      pill.classList.add("done");

  shapes.forEach((shape) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "shape-pill";
    button.textContent = shape.label;

    if (shape.key === state.selectedShapeKey) {
      button.classList.add("active");
    }
    pill.textContent = stage.label;
    shapeGrid.appendChild(pill);

    button.addEventListener("click", () => {
      state.selectedShapeKey = shape.key;
      stageName.textContent = shape.label;
      renderShapeButtons();

      if (!state.running) {
        setMessage(`${shape.label}を選びました。「はじめる」を押すと三頭の牛が動き出します。`);
      } else {
        setMessage(`図形を${shape.label}に変更しました。必要なら「牛の動きをリセット」でやり直せます。`);
      }
    });

    shapeGrid.appendChild(button);
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
function createCow(x, y, vx, vy, hue, patch) {
  return { x, y, vx, vy, hue, patch };
}

function setPointer(event) {
  const point = canvasPointFromEvent(event);
  state.pointer = clampPoint(point);
function createCows() {
  return [
    createCow(300, 220, 58, 38, "#fff7f0", "#5b3824"),
    createCow(520, 310, -46, 42, "#f7efe3", "#7a4a25"),
    createCow(680, 210, 52, -34, "#fff1d5", "#8d5934")
  ];
}

function clampPoint(point) {
  return {
    x: Math.max(40, Math.min(canvas.width - 40, point.x)),
    y: Math.max(40, Math.min(canvas.height - 40, point.y))
  };
}
function resetRound({ keepMessage = false } = {}) {
  state.running = false;
  state.drawing = false;
  state.attemptFinished = false;
  state.pointer = null;
  state.fencePath = [];
  state.lastSampledPoint = null;
  state.cows = [];
  stageName.textContent = getSelectedShape().label;
  clearedCount.textContent = String(state.successfulRounds);
  renderShapeButtons();

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
  if (!keepMessage) {
    setMessage(`${getSelectedShape().label}を選択中です。「はじめる」を押して牛を動かそう。`);
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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
    const intersect =
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersect) {

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
    const v2 = { x: next.x - current.x, y: next.y - current.y };
    const mag1 = Math.hypot(v1.x, v1.y);
    const mag2 = Math.hypot(v2.x, v2.y);

    if (mag1 < 0.0001 || mag2 < 0.0001) {
      continue;
    }

    const dot = (v1.x * v2.x + v1.y * v2.y) / (mag1 * mag2);
    const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
    if (angle > 0.6) {

    if (angle > 0.75) {
      corners += 1;
    }
  }
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  const width = bounds.maxX - bounds.minX;
  const topWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.18);
  const bottomWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.82);
  const topWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.2);
  const bottomWidth = measureHorizontalWidth(path, bounds.minY + (bounds.maxY - bounds.minY) * 0.8);
  const asymmetry = width > 0 ? Math.abs(bottomWidth - topWidth) / width : 0;

  return {
    centroid,
    radialVariance,
    cornerEstimate: Math.round(corners / 8),
    cornerEstimate: Math.round(corners / 6),
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
  state.drawing = false;
  state.attemptFinished = true;

function evaluateFence() {
  if (state.fencePath.length < MIN_PATH_POINTS) {
    setMessage("まだ柵が短いみたい。もう少し大きく図形のまわりを囲ってみよう。");
    state.attemptFinished = true;
    state.running = false;
    setMessage("柵が短すぎます。牛をぐるっと大きく囲うように描いてみよう。");
    return;
  }

  const closedPath = [...state.fencePath];
  const simplified = simplifyPath(closedPath);
  const stage = stages[state.stageIndex];
  const insideCenter = pointInPolygon(STAGE_CENTER, simplified);
  const selectedShape = getSelectedShape();
  const enclosedCount = state.cows.filter((cow) => pointInPolygon(cow, simplified)).length;

  if (!insideCenter) {
    setMessage("図形の中心が柵の外にあります。図形をしっかり包むように囲ってみよう。");
    state.attemptFinished = true;
    state.running = false;
  if (enclosedCount < 3) {
    setMessage(`牛を${enclosedCount}頭しか囲えていません。3頭まとめて中に入るように描いてみよう。`);
    return;
  }

  const analysis = analyzePath(simplified);
  const cornersOk =
    analysis.cornerEstimate >= stage.cornerRange[0] && analysis.cornerEstimate <= stage.cornerRange[1];
  const radialOk = analysis.radialVariance <= stage.radialVarianceMax;
  const asymmetryOk = stage.key !== "trapezoid" || analysis.asymmetry >= stage.asymmetryMin;
    analysis.cornerEstimate >= selectedShape.cornerRange[0] &&
    analysis.cornerEstimate <= selectedShape.cornerRange[1];
  const radialOk = analysis.radialVariance <= selectedShape.radialVarianceMax;
  const asymmetryOk = selectedShape.key !== "trapezoid" || analysis.asymmetry >= selectedShape.asymmetryMin;

  if (cornersOk && radialOk && asymmetryOk) {
    state.cleared.add(stage.key);
    clearedCount.textContent = String(state.cleared.size);
    state.successfulRounds += 1;
    clearedCount.textContent = String(state.successfulRounds);
    setMessage(`${selectedShape.label}で3頭とも囲えました。クリアです。もう一度遊ぶなら「はじめる」で再挑戦できます。`);
    state.running = false;
    return;
  }

    if (state.stageIndex === stages.length - 1) {
      state.allClear = true;
      setMessage("おめでとう。5つ全部の図形をきれいに囲えました。もう一度遊ぶならやり直して挑戦できます。");
    } else {
      const nextStage = stages[state.stageIndex + 1];
      setMessage(`${stage.label}クリア。次は${nextStage.label}です。「はじめる」で次のステージへ進もう。`);
      state.stageIndex += 1;
      resetStage({ keepMessage: true });
    }
  if (!radialOk && selectedShape.key === "circle") {
    setMessage("3頭は囲えていますが、円らしさが足りません。もっと丸くなめらかに描いてみよう。");
  } else if (!cornersOk) {
    setMessage(`3頭は囲えていますが、${selectedShape.label}の角の数が少し違います。角を意識して描いてみよう。`);
  } else if (!asymmetryOk) {
    setMessage("3頭は囲えていますが、台形らしさが足りません。上辺より下辺を少し長めにしてみよう。");
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
    setMessage(`3頭は囲えていますが、${selectedShape.label}の形にもう少し近づけるとクリアです。`);
  }
}

function updateCows(delta) {
  state.cows.forEach((cow) => {
    cow.x += cow.vx * delta;
    cow.y += cow.vy * delta;

  state.attemptFinished = true;
  state.running = false;
  renderShapePills();
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
  if (!state.running) {
    return;
  }

    if (!state.lastSampledPoint || distance(state.herdLead, state.lastSampledPoint) >= PATH_MIN_DISTANCE) {
      state.fencePath.push({ x: state.herdLead.x, y: state.herdLead.y });
      state.lastSampledPoint = { x: state.herdLead.x, y: state.herdLead.y };
    }
  updateCows(delta);

    const closeReady =
      state.fencePath.length >= MIN_PATH_POINTS &&
      distance(state.herdLead, state.startPoint) <= CLOSE_DISTANCE;
  if (!state.drawing || !state.pointer) {
    return;
  }

    if (closeReady) {
      evaluateFence();
    }
  if (!state.lastSampledPoint || distance(state.pointer, state.lastSampledPoint) >= PATH_MIN_DISTANCE) {
    state.fencePath.push({ x: state.pointer.x, y: state.pointer.y });
    state.lastSampledPoint = { x: state.pointer.x, y: state.pointer.y };
  }
}

  ctx.restore();
}

function drawTargetShape() {
  const stage = stages[state.stageIndex];
  const points = stage.targetPoints;
function drawTargetPreview() {
  const shape = getSelectedShape();
  const center = { x: canvas.width - 128, y: 120 };
  const radius = 58;

  ctx.save();
  ctx.strokeStyle = "#2c65aa";
  ctx.fillStyle = "rgba(44, 101, 170, 0.18)";
  ctx.strokeStyle = "#2c65aa";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
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
  ctx.setLineDash([]);
  ctx.fillStyle = "#2c65aa";
  ctx.font = '700 18px "Zen Maru Gothic"';
  ctx.textAlign = "center";
  ctx.fillText("START", state.startPoint.x, state.startPoint.y - 24);
  ctx.fillText(`お題: ${shape.label}`, center.x, center.y + 90);
  ctx.restore();
}

  }
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  if (state.attemptFinished) {
    ctx.fillStyle = "rgba(125, 82, 48, 0.1)";
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.fencePath[0].x, state.fencePath[0].y);
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
function drawCow(cow) {
  ctx.save();
  ctx.translate(cow.x, cow.y);
  ctx.rotate(Math.atan2(cow.vy, cow.vx) * 0.2);

    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 18, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  ctx.fillStyle = cow.hue;
  ctx.strokeStyle = "#56331a";
  ctx.lineWidth = 2.2;

    ctx.fillStyle = cow.patch;
    ctx.beginPath();
    ctx.ellipse(-8, -2, 8, 6, 0.25, 0, TAU);
    ctx.ellipse(7, 5, 7, 5, -0.45, 0, TAU);
    ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 18, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

    ctx.fillStyle = cow.hue;
    ctx.beginPath();
    ctx.ellipse(22, -4, 11, 9, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  ctx.fillStyle = cow.patch;
  ctx.beginPath();
  ctx.ellipse(-8, -2, 8, 6, 0.25, 0, TAU);
  ctx.ellipse(7, 5, 7, 5, -0.45, 0, TAU);
  ctx.fill();

    ctx.beginPath();
    ctx.moveTo(26, -12);
    ctx.lineTo(24, -20);
    ctx.lineTo(20, -10);
    ctx.moveTo(16, -12);
    ctx.lineTo(14, -20);
    ctx.lineTo(10, -10);
    ctx.stroke();
  ctx.fillStyle = cow.hue;
  ctx.beginPath();
  ctx.ellipse(22, -4, 11, 9, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

    ctx.fillStyle = "#2c1f16";
    ctx.beginPath();
    ctx.arc(26, -5, 1.7, 0, TAU);
    ctx.fill();
  ctx.beginPath();
  ctx.moveTo(26, -12);
  ctx.lineTo(24, -20);
  ctx.lineTo(20, -10);
  ctx.moveTo(16, -12);
  ctx.lineTo(14, -20);
  ctx.lineTo(10, -10);
  ctx.stroke();

    ctx.strokeStyle = "#56331a";
    ctx.lineWidth = 3;
    [-14, -4, 8, 16].forEach((legX) => {
      ctx.beginPath();
      ctx.moveTo(legX, 16);
      ctx.lineTo(legX, 28);
      ctx.stroke();
    });
  ctx.fillStyle = "#2c1f16";
  ctx.beginPath();
  ctx.arc(26, -5, 1.7, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#56331a";
  ctx.lineWidth = 3;
  [-14, -4, 8, 16].forEach((legX) => {
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.quadraticCurveTo(-38, -16, -38, -30);
    ctx.moveTo(legX, 16);
    ctx.lineTo(legX, 28);
    ctx.stroke();
    ctx.restore();
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

function drawPointerGuide() {
  if (!state.running) {
function drawIdleGuide() {
  if (state.running) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(207, 122, 47, 0.38)";
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.strokeStyle = "rgba(125, 82, 48, 0.12)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(state.herdLead.x, state.herdLead.y);
  ctx.lineTo(state.pointer.x, state.pointer.y);
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
  drawTargetShape();
  drawStartPoint();
  drawTargetPreview();
  drawFence();
  drawPointerGuide();
  drawCows();
  drawIdleGuide();
}

function tick(now) {
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
  state.pointerActive = true;
  setPointer(event);
  beginDrawing(event);
});

canvas.addEventListener("mousemove", (event) => {
  if (!state.pointerActive) {
    return;
  }
  setPointer(event);
  moveDrawing(event);
});

window.addEventListener("mouseup", () => {
  state.pointerActive = false;
  endDrawing();
});

canvas.addEventListener(
  "touchstart",
  (event) => {
    event.preventDefault();
    state.pointerActive = true;
    setPointer(event);
    beginDrawing(event);
  },
  { passive: false }
);
  "touchmove",
  (event) => {
    event.preventDefault();
    if (!state.pointerActive) {
      return;
    }
    setPointer(event);
    moveDrawing(event);
  },
  { passive: false }
);

window.addEventListener("touchend", () => {
  state.pointerActive = false;
  endDrawing();
});

startButton.addEventListener("click", () => {
  if (state.allClear) {
    state.stageIndex = 0;
    state.cleared.clear();
    state.allClear = false;
  }
  startStage();
  startRound();
});

resetButton.addEventListener("click", () => {
  if (state.allClear) {
    state.stageIndex = 0;
    state.cleared.clear();
    state.allClear = false;
  }
  resetStage();
  resetRound();
});

resetStage();
renderShapeButtons();
resetRound();
requestAnimationFrame(tick);
