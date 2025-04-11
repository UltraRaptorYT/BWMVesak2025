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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

const PersonExtractor: React.FC = () => {
  const debug: boolean = true;
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightSizeRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStartBtnRef = useRef<HTMLButtonElement>(null);
  const poseColor = "transparent";
  const [bgImageDataUrl, setBgImageDataUrl] = useState<string | null>(null);
  const [lightPositions, setLightPositions] = useState<
    { x: number; y: number }[]
  >([]);
  const [lightSize, setLightSize] = useState<number>(128);
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [countdownTimer, setCountdownTimer] = useState<number>(5);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(
    parseInt(localStorage.getItem("highScore") || "0")
  );

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
        minDetectionConfidence: 0.35,
        minTrackingConfidence: 0.35,
        num_hands: 100,
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
        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          for (const landmarks of results.multiHandLandmarks) {
            const canvasRect = canvas.getBoundingClientRect();
            drawHand(ctx, landmarks, poseColor); // Check each hand landmark
            for (const point of landmarks) {
              const x = point.x * canvas.width;
              const y = point.y * canvas.height;
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
                  setGameStart(true);
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
            const newPositions = results.multiHandLandmarks.map(
              (landmarks: any) => {
                const tip = landmarks[9];
                return {
                  x: tip.x * canvasRect.width + canvasRect.left,
                  y: tip.y * canvasRect.height + canvasRect.top,
                };
              }
            );
            setLightPositions(newPositions);
          }
        } else {
          setLightPositions([]);
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
          ctx.save(); // ⬅️ Save original state
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear before drawing

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
            drawKeypoints(mirroredKeypoints, 0.5, ctx, 1, poseColor);
            drawSkeleton(mirroredKeypoints, 0.5, ctx, 1, poseColor);
          }
          if (isPraying(poses[0]) && !gameStart) {
            setGameStart(true);
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
    setScore((prev) => prev + 1);
    affliction.remove();
    setAfflictionArr((prev) => [...prev, <Affliction></Affliction>]);
  }

  function gameStartFunc() {
    // activate once
    setScore(0);
    if (afflictionArr.length > 0) {
      return;
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      setBgImageDataUrl(dataUrl);
    }

    const afflictions = Array.from({ length: 5 }, (_, i) => (
      <Affliction key={i} />
    ));
    setAfflictionArr((prev) => [...prev, ...afflictions]);
  }

  useEffect(() => {
    if (gameStart) {
      gameStartFunc();
    }
  }, [gameStart]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Backquote") {
        console.log("pressed");
        setShowAdmin((prev) => !prev);
      } else if (e.ctrlKey && e.shiftKey) {
        setGameStart(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSubmit() {
    // Light Size
    if (!lightSizeRef.current) {
      toast.error("Fail to update - Light Size");
      return;
    }
    setLightSize(parseInt(lightSizeRef.current.value));

    // CountdownTimer
    if (!countdownRef.current) {
      toast.error("Fail to update - Light Size");
      return;
    }
    setCountdownTimer(parseInt(countdownRef.current.value));

    toast.success("Update successful");
    setShowAdmin(false);
    return;
  }

  useEffect(() => {
    setCountdown(countdownTimer);
  }, [countdownTimer]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameStart) {
      gameStartFunc();
      setCountdown(countdownTimer); // reset to full duration at game start

      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setAfflictionArr([]);
            setGameStart(false);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [gameStart]);

  useEffect(() => {
    const storedHighScore = parseInt(localStorage.getItem("highScore") || "0");
    console.log(highScore, score, storedHighScore);
    if (score > storedHighScore) {
      localStorage.setItem("highScore", score.toString());
      setHighScore(score);
    }
  }, [score]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center mainBG">
      <video ref={videoRef} className="hidden" />
      {bgImageDataUrl && gameStart && (
        <img
          src={bgImageDataUrl}
          className="absolute h-full top-0 left-1/2 -translate-x-1/2 object-cover"
          alt="Background"
        />
      )}
      {showAdmin && (
        <Card className="absolute z-10 w-md">
          <CardHeader>
            <CardTitle>Admin Config</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center items-center gap-5">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="lightSize">Light Size</Label>
              <Input
                ref={lightSizeRef}
                type="text"
                id="lightSize"
                placeholder="Light Size"
                defaultValue={lightSize}
                pattern="\d+"
                required
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="countdown">Countdown</Label>
              <Input
                ref={countdownRef}
                type="text"
                id="countdown"
                placeholder="Countdown"
                defaultValue={countdown}
                pattern="\d+"
                required
              />
            </div>
            <Button onClick={handleSubmit}>Submit</Button>
          </CardContent>
        </Card>
      )}
      <div className="absolute h-full top-0 left-1/2 -translate-x-1/2">
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full transition-opacity duration-500",
            gameStart ? "border-2 border-black" : "",
            gameStart ? "opacity-[0.85]" : "opacity-100"
          )}
        />

        {!gameStart ? (
          <div className="absolute h-full w-full top-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white">
              <p>Put your palms together</p>
              {highScore > 0 && <p>High Score: {highScore}</p>}
              {score > 0 && <p>Score: {score}</p>}
            </div>
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

      {gameStart && (
        <div className="absolute top-4 left-4 z-10 text-white text-xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          Time: {countdown}s
        </div>
      )}

      {gameStart && (
        <div className="absolute top-4 right-4 z-10 text-white text-xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          Score: {score}
        </div>
      )}

      {bgImageDataUrl &&
        gameStart &&
        lightPositions.map((pos, i) => {
          return (
            <div
              key={i}
              className={`rounded-full bg-yellow-300 blur-xl pointer-events-none transition-transform duration-100`}
              style={{
                position: "fixed",
                left: pos.x - lightSize / 2,
                top: pos.y - lightSize / 2,
                width: `${lightSize}px`,
                height: `${lightSize}px`,
              }}
            />
          );
        })}
      <Toaster richColors />
    </div>
  );
};

export default PersonExtractor;
