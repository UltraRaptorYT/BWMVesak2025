import * as poseDetection from "@tensorflow-models/pose-detection";

const lineWidth = 2;

// export function drawPoint(
//   ctx: CanvasRenderingContext2D,
//   y: number,
//   x: number,
//   r: number,
//   color: string
// ) {
//   ctx.beginPath();
//   ctx.arc(x, y, r, 0, 2 * Math.PI);
//   ctx.fillStyle = color;
//   ctx.fill();
// }

// export function drawSegment(
//   [ay, ax]: [number, number],
//   [by, bx]: [number, number],
//   color: string,
//   scale: number,
//   ctx: CanvasRenderingContext2D
// ) {
//   ctx.beginPath();
//   ctx.moveTo(ax * scale, ay * scale);
//   ctx.lineTo(bx * scale, by * scale);
//   ctx.lineWidth = lineWidth;
//   ctx.strokeStyle = color;
//   ctx.stroke();
// }

// /**
//  * Draws a pose skeleton by looking up all adjacent keypoints/joints
//  */
// function eitherPointDoesntMeetConfidence(
//   a: number,
//   b: number,
//   minConfidence: number
// ): boolean {
//   return a < minConfidence || b < minConfidence;
// }

// function getAdjacentKeyPoints(
//   keypoints: poseDetection.Keypoint[],
//   minConfidence: number
// ): poseDetection.Keypoint[][] {
//   const connectedPartIndices = poseDetection.util.getAdjacentPairs(
//     poseDetection.SupportedModels.MoveNet
//   );
//   return connectedPartIndices.reduce(
//     (
//       result: poseDetection.Keypoint[][],
//       [leftJoint, rightJoint]
//     ): poseDetection.Keypoint[][] => {
//       if (
//         eitherPointDoesntMeetConfidence(
//           keypoints[leftJoint].score || 0,
//           keypoints[rightJoint].score || 0,
//           minConfidence
//         )
//       ) {
//         return result;
//       }
//       result.push([keypoints[leftJoint], keypoints[rightJoint]]);

//       return result;
//     },
//     []
//   );
// }

// export function drawSkeleton(
//   keypoints: poseDetection.Keypoint[],
//   minConfidence: number,
//   ctx: CanvasRenderingContext2D,
//   scale = 1,
//   color = "aqua"
// ) {
//   const adjacentKeyPoints = getAdjacentKeyPoints(keypoints, minConfidence);
//   adjacentKeyPoints.forEach((point) => {
//     drawSegment(
//       [point[0].y, point[0].x],
//       [point[1].y, point[1].x],
//       color,
//       scale,
//       ctx
//     );
//   });
// }

// /**
//  * Draw pose keypoints onto a canvas
//  */
// export function drawKeypoints(
//   keypoints: poseDetection.Keypoint[],
//   minConfidence: number,
//   ctx: CanvasRenderingContext2D,
//   scale = 1,
//   color = "aqua"
// ) {
//   for (let i = 0; i < keypoints.length; i++) {
//     const keypoint = keypoints[i];
//     minConfidence;
//     drawPoint(ctx, keypoint.y * scale, keypoint.x * scale, 3, color);
//   }
// }

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
