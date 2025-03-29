export const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
];

export function drawHand(
  ctx: CanvasRenderingContext2D,
  landmarks: any[],
  color = "red"
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  HAND_CONNECTIONS.forEach(([start, end]) => {
    const s = landmarks[start];
    const e = landmarks[end];
    ctx.beginPath();
    ctx.moveTo(s.x * ctx.canvas.width, s.y * ctx.canvas.height);
    ctx.lineTo(e.x * ctx.canvas.width, e.y * ctx.canvas.height);
    ctx.stroke();
  });

  landmarks.forEach((point) => {
    ctx.beginPath();
    ctx.arc(
      point.x * ctx.canvas.width,
      point.y * ctx.canvas.height,
      5,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = color;
    ctx.fill();
  });
}
