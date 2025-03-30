import React, { useRef, useEffect, useState, ReactNode } from "react";
import * as bodyPix from "@tensorflow-models/body-pix";
import { drawHand } from "@/lib/hand_utils";
import "@tensorflow/tfjs";
import { drawKeypoints, drawSkeleton, isPraying } from "@/lib/pose_utils";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "./App.css";
import { Affliction } from "@/components/Affliction";
import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";

const PersonExtractor: React.FC = () => {
  const debug: boolean = true;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStartBtnRef = useRef<HTMLButtonElement>(null);

  const [afflictionArr, setAfflictionArr] = useState<ReactNode[]>([]);

  useEffect(() => {
    const loadModelAndStart = async () => {
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };

      const detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      const net = await bodyPix.load();

      const { Hands } = window as any;
      const hands = new Hands({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      const video = videoRef.current;
      if (!video) return;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        video.play();
        runSegmentation();
      };

      // Callback for MediaPipe Hands
      hands.onResults((results: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            drawHand(ctx, landmarks, "rgba(255,0,0,0.3)"); // Check each hand landmark
            for (const point of landmarks) {
              const x = point.x * canvas.width;
              const y = point.y * canvas.height;
              const canvasRect = canvas.getBoundingClientRect();
              const xScreen = point.x * canvasRect.width + canvasRect.left;
              const yScreen = point.y * canvasRect.height + canvasRect.top;

              // gameStartBtn
              const gameStartBtn = gameStartBtnRef.current;
              if (gameStartBtn) {
                const gameStartBtnRect = gameStartBtn.getBoundingClientRect();
                if (
                  gameStartBtnRect.left < xScreen &&
                  xScreen < gameStartBtnRect.right &&
                  gameStartBtnRect.top < yScreen &&
                  yScreen < gameStartBtnRect.bottom &&
                  !gameStart
                ) {
                  console.log("Touched Game Start");
                  gameStartFunc();
                }
              }

              // Afflictions
              const afflictions = document.querySelectorAll(".afflictions");
              afflictions.forEach((affliction) => {
                const afflictionRect = affliction.getBoundingClientRect();

                const circleCenterX =
                  (afflictionRect.left -
                    canvasRect.left +
                    afflictionRect.width / 2) *
                  (canvas.width / canvasRect.width);
                const circleCenterY =
                  (afflictionRect.top -
                    canvasRect.top +
                    afflictionRect.height / 2) *
                  (canvas.height / canvasRect.height);
                const circleRadius =
                  (afflictionRect.width / 2) *
                  (canvas.width / canvasRect.width);

                const distance = Math.sqrt(
                  (x - circleCenterX) ** 2 + (y - circleCenterY) ** 2
                );

                if (distance <= circleRadius) {
                  whackAfflictions(affliction);
                }
              });
            }
          }
        }
      });

      const runSegmentation = async () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const backgroundImage = new Image();
        backgroundImage.src = "./1.jpg";
        await new Promise((res) => (backgroundImage.onload = res));

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Offscreen canvas for flipping video input
        const offscreenCanvas = document.createElement("canvas");
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
        const offscreenCtx = offscreenCanvas.getContext("2d");

        const loop = async () => {
          if (!offscreenCtx) return;

          // 1. Draw flipped video onto offscreen canvas
          offscreenCtx.save();
          offscreenCtx.scale(-1, 1);
          offscreenCtx.translate(-offscreenCanvas.width, 0);
          offscreenCtx.drawImage(
            video,
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height
          );
          offscreenCtx.restore();

          // 2. Run segmentation on flipped frame
          const segmentation = await net.segmentPerson(offscreenCanvas);
          const poses = await detector.estimatePoses(offscreenCanvas);

          // 3. Flip main canvas context
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);

          // 4. Draw flipped background
          ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

          // 5. Get flipped video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const { data } = frame;

          // 6. Mask background using segmentation
          segmentation.data.forEach((val, i) => {
            if (val === 0) {
              data[i * 4 + 3] = 0; // make transparent
            }
          });

          // 7. Put back onto canvas
          ctx.putImageData(frame, 0, 0);

          // 8. Draw pose keypoints and skeleton (optional)
          if (debug && poses.length > 0) {
            const keypoints = poses[0].keypoints;
            const mirroredKeypoints = keypoints.map((kp) => ({
              ...kp,
              x: canvas.width - kp.x,
            }));
            drawKeypoints(mirroredKeypoints, 0.5, ctx, 1, "transparent");
            drawSkeleton(mirroredKeypoints, 0.5, ctx, 1, "transparent");
          }
          if (isPraying(poses[0]) && !gameStart) {
            gameStartFunc();
          }

          ctx.restore(); // Done with flipped drawing

          // 9. Send flipped frame to hand tracking
          if (debug) await hands.send({ image: offscreenCanvas });

          requestAnimationFrame(loop);
        };

        loop();
      };
    };

    const loadTF = async () => {
      await tf.ready();
      await tf.setBackend("webgl");
      await loadModelAndStart();
    };

    loadTF();
  }, []);

  const [gameStart, setGameStart] = useState<boolean>(false);

  function whackAfflictions(affliction: Element) {
    affliction.remove();
    setAfflictionArr((prev) => [...prev, <Affliction></Affliction>]);
  }

  function gameStartFunc() {
    if (gameStart) return; // prevent multiple triggers
    setGameStart(true);

    const afflictions = Array.from({ length: 5 }, (_, i) => (
      <Affliction key={i} />
    ));
    setAfflictionArr((prev) => [...prev, ...afflictions]);
  }

  useEffect(() => {}, [gameStart]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center mainBG">
      <video ref={videoRef} className="hidden" />
      <div className="absolute h-full top-0 left-1/2 -translate-x-1/2 z-10">
        <canvas
          ref={canvasRef}
          className={cn("h-full", gameStart ? "border-2 border-black" : "")}
        />
        {!gameStart ? (
          <div className="absolute h-full w-full top-0">
            <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white">Put your palms together</p>
            {/* <Button
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xl h-16"
              size="lg"
              id="gameStartBtn"
              ref={gameStartBtnRef}
              onClick={() => gameStartFunc()}
            >
              Game Start
            </Button> */}
          </div>
        ) : (
          <div className="absolute h-full w-full top-0" id="afflictionDiv">
            {afflictionArr.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonExtractor;
