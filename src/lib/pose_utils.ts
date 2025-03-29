import * as poseDetection from "@tensorflow-models/pose-detection";

const lineWidth = 2;

export function drawPoint(
  ctx: CanvasRenderingContext2D,
  y: number,
  x: number,
  r: number,
  color: string
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawSegment(
  [ay, ax]: [number, number],
  [by, bx]: [number, number],
  color: string,
  scale: number,
  ctx: CanvasRenderingContext2D
) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
function eitherPointDoesntMeetConfidence(
  a: number,
  b: number,
  minConfidence: number
): boolean {
  return a < minConfidence || b < minConfidence;
}

function getAdjacentKeyPoints(
  keypoints: poseDetection.Keypoint[],
  minConfidence: number
): poseDetection.Keypoint[][] {
  const connectedPartIndices = poseDetection.util.getAdjacentPairs(
    poseDetection.SupportedModels.MoveNet
  );
  return connectedPartIndices.reduce(
    (
      result: poseDetection.Keypoint[][],
      [leftJoint, rightJoint]
    ): poseDetection.Keypoint[][] => {
      if (
        eitherPointDoesntMeetConfidence(
          keypoints[leftJoint].score || 0,
          keypoints[rightJoint].score || 0,
          minConfidence
        )
      ) {
        return result;
      }
      result.push([keypoints[leftJoint], keypoints[rightJoint]]);

      return result;
    },
    []
  );
}

export function drawSkeleton(
  keypoints: poseDetection.Keypoint[],
  minConfidence: number,
  ctx: CanvasRenderingContext2D,
  scale = 1,
  color = "aqua"
) {
  const adjacentKeyPoints = getAdjacentKeyPoints(keypoints, minConfidence);
  adjacentKeyPoints.forEach((point) => {
    drawSegment(
      [point[0].y, point[0].x],
      [point[1].y, point[1].x],
      color,
      scale,
      ctx
    );
  });
}

/**
 * Draw pose keypoints onto a canvas
 */
export function drawKeypoints(
  keypoints: poseDetection.Keypoint[],
  minConfidence: number,
  ctx: CanvasRenderingContext2D,
  scale = 1,
  color = "aqua"
) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];
    minConfidence;
    drawPoint(ctx, keypoint.y * scale, keypoint.x * scale, 3, color);
  }
}

