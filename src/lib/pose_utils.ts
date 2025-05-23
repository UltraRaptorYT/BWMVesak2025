import * as poseDetection from "@tensorflow-models/pose-detection";

export function drawKeypoints(
  keypoints: poseDetection.Keypoint[],
  minConfidence: number,
  ctx: CanvasRenderingContext2D,
  scale = 1,
  color = "aqua"
) {
  for (const keypoint of keypoints) {
    if (keypoint.score && keypoint.score > minConfidence) {
      drawPoint(ctx, keypoint.y * scale, keypoint.x * scale, 4, color);
    }
  }
}

export function drawSkeleton(
  keypoints: poseDetection.Keypoint[],
  minConfidence: number,
  ctx: CanvasRenderingContext2D,
  scale = 1,
  color = "aqua"
) {
  const adjacentKeyPoints = getAdjacentKeyPoints(keypoints, minConfidence);
  for (const [kp1, kp2] of adjacentKeyPoints) {
    drawSegment(
      [kp1.y * scale, kp1.x * scale],
      [kp2.y * scale, kp2.x * scale],
      color,
      ctx
    );
  }
}

export function drawSegment(
  [ay, ax]: [number, number],
  [by, bx]: [number, number],
  color: string,
  ctx: CanvasRenderingContext2D
) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function drawPoint(
  ctx: CanvasRenderingContext2D,
  y: number,
  x: number,
  radius: number,
  color: string
) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

export function getAdjacentKeyPoints(
  keypoints: poseDetection.Keypoint[],
  minConfidence: number
): [poseDetection.Keypoint, poseDetection.Keypoint][] {
  const connected: [number, number][] = [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
    [5, 7],
    [7, 9],
    [6, 8],
    [8, 10],
    [5, 6],
    [5, 11],
    [6, 12],
    [11, 12],
    [11, 13],
    [13, 15],
    [12, 14],
    [14, 16],
  ];

  return connected.flatMap(([i, j]) => {
    const kp1 = keypoints[i];
    const kp2 = keypoints[j];
    if (
      kp1.score &&
      kp2.score &&
      kp1.score > minConfidence &&
      kp2.score > minConfidence
    ) {
      return [[kp1, kp2]];
    }
    return [];
  });
}

export type Keypoint = {
  x: number;
  y: number;
  name?: string;
  score?: number;
};

function getKeypoint(pose: poseDetection.Pose, name: string): Keypoint | null {
  const point = pose?.keypoints?.find((k) => k.name === name);
  return point?.score != null && point.score > 0.15 ? point : null;
}

export function detectPraying(pose: poseDetection.Pose) {
  const gotNose = getKeypoint(pose, "nose");
  const leftWrist = getKeypoint(pose, "left_wrist");
  const rightWrist = getKeypoint(pose, "right_wrist");
  const leftShoulder = getKeypoint(pose, "left_shoulder");
  const rightShoulder = getKeypoint(pose, "right_shoulder");

  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
    return { isPraying: false, wrists: null };
  }

  const wristDistance = Math.hypot(
    leftWrist.x - rightWrist.x,
    leftWrist.y - rightWrist.y
  );

  const verticalAlign = Math.abs(leftWrist.y - rightWrist.y);
  const chestCenterX = (leftShoulder.x + rightShoulder.x) / 2;
  const chestCenterY = (leftShoulder.y + rightShoulder.y) / 2;
  const avgHandX = (leftWrist.x + rightWrist.x) / 2;
  const avgHandY = (leftWrist.y + rightWrist.y) / 2;

  const isPraying =
    wristDistance <= 100 &&
    verticalAlign <= 90 &&
    Math.abs(avgHandX - chestCenterX) < 150 &&
    Math.abs(avgHandY - chestCenterY) < 150 &&
    gotNose;

  return {
    isPraying,
    wrists: { leftWrist, rightWrist },
  };
}

export function getMidpoint(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}
