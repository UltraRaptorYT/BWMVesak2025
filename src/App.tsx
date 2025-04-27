import React, { useRef, useEffect, useState } from "react";
import * as bodyPix from "@tensorflow-models/body-pix";
import { drawHand } from "@/lib/hand_utils";
import "@tensorflow/tfjs";
import {
  drawKeypoints,
  drawSkeleton,
  detectPraying,
  getMidpoint,
} from "@/lib/pose_utils";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "./App.css";
import { cn, enemyList } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import FlyingBox from "@/components/FlyingBox";
import { FaHeart } from "react-icons/fa";
import bgAudio from "@/assets/bgAudio.mp3";
import popSfxAudio from "@/assets/Pop.wav";
import boingSfxAudio from "@/assets/Boing.mp3";
import { Button } from "@/components/ui/button";

const App: React.FC = () => {
  const debug: boolean = true;
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightSizeRef = useRef<HTMLInputElement>(null);
  const countdownRef = useRef<HTMLInputElement>(null);
  const livesRef = useRef<HTMLInputElement>(null);
  const spawnTimingRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStartBtnRef = useRef<HTMLButtonElement>(null);
  const smokeRef = useRef<HTMLDivElement>(null);
  const hasSetHeartRef = useRef(false);

  const poseColor = "transparent";
  // const [bgImageDataUrl, setBgImageDataUrl] = useState<string | null>(null);
  const [lightPositions, setLightPositions] = useState<
    { x: number; y: number }[]
  >([]);
  const [lightSize, setLightSize] = useState<number>(128);
  const [showAdmin, setShowAdmin] = useState<boolean>(false);
  const commonTimer = 45;
  const [countdown, setCountdown] = useState<number>(commonTimer);
  const [countdownTimer, setCountdownTimer] = useState<number>(commonTimer);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(
    parseInt(localStorage.getItem("highScore") || "0")
  );
  const [isFirstSession, setIsFirstSession] = useState<boolean>(true);
  const commonLives = 3;
  const [lives, setLives] = useState<number>(commonLives);
  const [currentLives, setCurrentLives] = useState<number>(commonLives);
  const [gameStart, setGameStart] = useState<boolean>(false);
  type AfflictionData = {
    id: number;
    shouldHide: boolean;
    wasWhacked: boolean;
    type: string;
    image: string | undefined;
  };
  const [afflictionArr, setAfflictionArr] = useState<AfflictionData[]>([]);
  const hasLifeBeenRemovedRef = useRef(false);
  const [spawnTiming, setSpawnTiming] = useState<number>(750);
  const spawnChance = 35;
  const [gameOver, setGameOver] = useState<boolean>(false);
  const bgAudioRef = useRef<HTMLAudioElement>(null);
  const [heartX, setHeartX] = useState<number>(0);
  const [heartY, setHeartY] = useState<number>(0);
  const smokeCount = 10;
  const smokeSize = 100;

  useEffect(() => {
    const hasPlayedBefore = sessionStorage.getItem("hasPlayed");

    if (hasPlayedBefore === "true") {
      setIsFirstSession(false);
    }
  }, []);

  useEffect(() => {
    if (gameStart) {
      sessionStorage.setItem("hasPlayed", "true");
      setIsFirstSession(false);
    }
  }, [gameStart]);

  useEffect(() => {
    const loadModelAndStart = async () => {
      // const detectorConfig = {
      //   modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      // };
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
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
        backgroundImage.src = "./Game_Background.gif";
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
          const segmentation = await net.segmentPerson(offscreenCanvas, {
            segmentationThreshold: 0.25,
            nmsRadius: 30,
          });
          const poses = await detector.estimatePoses(offscreenCanvas, {
            scoreThreshold: 0.3,
          });

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
          const { isPraying, wrists } = detectPraying(poses[0]);

          if (!hasSetHeartRef.current && !gameStart && isPraying && wrists) {
            const canvas = canvasRef.current;
            if (canvas) {
              const canvasRect = canvas.getBoundingClientRect();
              let { x, y } = getMidpoint(wrists.leftWrist, wrists.rightWrist);

              const xScreen =
                canvasRect.left + (x / canvas.width) * canvasRect.width;
              const yScreen =
                canvasRect.top + (y / canvas.height) * canvasRect.height;

              setHeartX(xScreen);
              setHeartY(yScreen);
            }

            hasSetHeartRef.current = true;
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

  function removeLives() {
    console.log("🔻 removing a life");
    const sfx = new Audio(boingSfxAudio);
    sfx.play().catch((e) => {
      console.error("Boing sound failed:", e);
    });
    setCurrentLives((prev) => Math.max(prev - 1, 0));
  }

  function whackAfflictions(affliction: Element) {
    const idStr = affliction.getAttribute("data-affliction-id");

    if (smokeRef.current) {
      let transformStyle = getComputedStyle(affliction).transform;
      let translateX = 0;
      let translateY = 0;

      if (transformStyle) {
        if (transformStyle.startsWith("translate")) {
          const values = transformStyle.match(
            /translate\(([^,]+)px,\s*([^)]+)px\)/
          );
          if (values) {
            translateX = parseFloat(values[1]);
            translateY = parseFloat(values[2]);
          }
        } else if (transformStyle.startsWith("matrix")) {
          const values = transformStyle.match(
            /matrix\([^,]+,\s*[^,]+,\s*[^,]+,\s*[^,]+,\s*([^,]+),\s*([^)]+)\)/
          );
          if (values) {
            translateX = parseFloat(values[1]);
            translateY = parseFloat(values[2]);
          }
        }
      }
      console.log(translateX, translateY);
      let afflcitionSmoke = document.createElement("div");
      afflcitionSmoke.classList.add("smoke-layer");
      afflcitionSmoke.style.position = "absolute";
      afflcitionSmoke.style.top = `${translateY}px`;
      afflcitionSmoke.style.left = `${translateX}px`;
      afflcitionSmoke.style.width = `${smokeSize}px`;
      afflcitionSmoke.style.height = `${smokeSize}px`;
      for (let i = 0; i < smokeCount; i++) {
        let smokeEl = document.createElement("div");

        const randomX = (Math.random() - 0.5) * (smokeSize * (2 / 3)) + "px";
        const randomY = (Math.random() - 0.5) * (smokeSize * (2 / 3)) + "px";
        smokeEl.style.setProperty("--x", randomX);
        smokeEl.style.setProperty("--y", randomY);
        smokeEl.style.animationDelay = Math.random() * 0.15 + "s";
        smokeEl.classList.add("smoke");
        setTimeout(() => {
          smokeEl.classList.add("poof");
        }, 5);

        afflcitionSmoke.appendChild(smokeEl);
      }

      smokeRef.current.appendChild(afflcitionSmoke);
      setTimeout(() => {
        afflcitionSmoke.remove();
      }, 1000);
    }

    if (!idStr) return;
    const id = parseInt(idStr);

    const sfx = new Audio(popSfxAudio);
    sfx.play().catch((e) => {
      console.error("POP sound failed:", e);
    });

    // Prevent double whack
    setAfflictionArr((prev) => {
      const alreadyWhacked = prev.find((a) => a.id === id)?.wasWhacked;
      if (alreadyWhacked) return prev;

      (window as any)[`whackAffliction_${id}`]?.();
      return prev.map((a) =>
        a.id === id ? { ...a, wasWhacked: true, shouldHide: true } : a
      );
    });
  }

  useEffect(() => {
    if (!gameStart) return;

    const spawnInterval = setInterval(() => {
      const randomType = (() => {
        const types = enemyList.map((e) => e.type);
        return types[Math.floor(Math.random() * types.length)];
      })();

      const correspondingEnemy = enemyList.find((e) => e.type === randomType);
      const newAffliction = {
        id: Date.now(),
        shouldHide: false,
        wasWhacked: false,
        type: randomType,
        image: correspondingEnemy ? correspondingEnemy.image : undefined,
      };
      setAfflictionArr((prev) => [...prev, newAffliction]);
    }, spawnTiming); // spawn every 4 seconds (you can adjust)

    return () => clearInterval(spawnInterval);
  }, [gameStart]);

  const handleRemove = (id: number, wasWhacked: boolean) => {
    console.log("WHACKED", id);

    const shouldSpawnNew = Math.random() < spawnChance / 100;

    setAfflictionArr((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id && !a.wasWhacked) {
          return { ...a, shouldHide: true, wasWhacked: true };
        }
        return a;
      });

      if (shouldSpawnNew) {
        const randomType = (() => {
          const types = enemyList.map((e) => e.type);
          return types[Math.floor(Math.random() * types.length)];
        })();

        const correspondingEnemy = enemyList.find((e) => e.type === randomType);
        const newAffliction = {
          id: Date.now(),
          shouldHide: false,
          wasWhacked: false,
          type: randomType,
          image: correspondingEnemy ? correspondingEnemy.image : undefined,
        };
        return [...updated, newAffliction];
      }

      return updated;
    });

    if (wasWhacked) {
      setScore((p) => p + 1);
    } else {
      removeLives();
    }
  };

  // useEffect(() => {
  //   console.log(afflictionArr, "HELLIOAS");
  // }, [afflictionArr]);

  function gameStartFunc() {
    hasLifeBeenRemovedRef.current = false;
    // activate once
    setScore(0);
    setCurrentLives(lives);
    setGameOver(false);
    if (afflictionArr.length > 0) {
      return;
    }

    // const canvas = canvasRef.current;
    // if (canvas) {
    //   const dataUrl = canvas.toDataURL("image/png");
    //   setBgImageDataUrl(dataUrl);
    // }

    // const afflictions = Array.from({ length: 2 }, (_, i) => ({
    //   id: Date.now() + i,
    //   shouldHide: false,
    //   wasWhacked: false,
    // }));
    // setAfflictionArr((prev) => [...prev, ...afflictions]);
  }

  useEffect(() => {
    if (currentLives <= 0) {
      console.log("💀 Out of lives. Ending game.");
      gameEnded();
    }
  }, [currentLives]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Backquote") {
        console.log("pressed");
        setShowAdmin((prev) => !prev);
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

    // Lives
    if (!livesRef.current) {
      toast.error("Fail to update - Light Size");
      return;
    }
    setLives(parseInt(livesRef.current.value));

    // Spawn Timing
    if (!spawnTimingRef.current) {
      toast.error("Fail to update - Light Size");
      return;
    }
    setSpawnTiming(parseInt(spawnTimingRef.current.value));

    toast.success("Update successful");
    setShowAdmin(false);
    return;
  }

  useEffect(() => {
    setCountdown(countdownTimer);
  }, [countdownTimer]);

  function gameEnded() {
    setGameStart(false);
    setGameOver(true);
    setAfflictionArr([]);
    hasSetHeartRef.current = false;
  }

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (gameStart) {
      gameStartFunc();
      setCountdown(countdownTimer); // reset to full duration at game start
      interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            gameEnded();
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
    if (score > storedHighScore) {
      localStorage.setItem("highScore", score.toString());
      setHighScore(score);
    }
  }, [score]);

  function clearStorage() {
    localStorage.removeItem("highScore");
    sessionStorage.removeItem("hasPlayed");
    setShowAdmin(false);
    toast.success("Cleared Storage");
    window.location.reload();
  }

  useEffect(() => {
    if (gameStart && bgAudioRef.current) {
      bgAudioRef.current.volume = 0;
      bgAudioRef.current.play().catch((e) => {
        console.error("Audio play failed:", e);
      });
    } else if (!gameStart && bgAudioRef.current) {
      bgAudioRef.current.pause();
      bgAudioRef.current.currentTime = 0; // optional: reset playback
    }
  }, [gameStart]);

  return (
    <div className="relative w-full fullHeight overflow-hidden flex items-center justify-center mainBG">
      <video ref={videoRef} className="hidden" />
      <audio ref={bgAudioRef} loop>
        <source src={bgAudio} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* {bgImageDataUrl && gameStart && (
        <img
          src={bgImageDataUrl}
          className="absolute h-full top-0 left-1/2 -translate-x-1/2 object-cover"
          alt="Background"
        />
      )} */}
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
                defaultValue={countdownTimer}
                pattern="\d+"
                required
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="lives">Lives</Label>
              <Input
                ref={livesRef}
                type="text"
                id="lives"
                placeholder="Lives"
                defaultValue={lives}
                pattern="\d+"
                required
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="spawnTiming">Spawn Timing</Label>
              <Input
                ref={spawnTimingRef}
                type="text"
                id="spawnTiming"
                placeholder="Spawn Timing"
                defaultValue={spawnTiming}
                pattern="\d+"
                required
              />
            </div>
            <div className="flex gap-5">
              <Button onClick={handleSubmit}>Submit</Button>
              <Button onClick={clearStorage} variant={"secondary"}>
                Clear storage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="absolute w-full h-full top-0 left-1/2 -translate-x-1/2">
        <canvas
          ref={canvasRef}
          className={cn(
            "h-full transition-opacity duration-500 mx-auto",
            gameStart ? "border-2 border-black" : ""
            // gameStart ? "opacity-[0.85]" : "opacity-100"
          )}
        />

        {!gameStart ? (
          <div className="absolute h-full w-full top-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white">
              {gameOver && <div>GAME OVER!</div>}
              <p>Put your palms together {gameOver && "to play again"}</p>
              {!isFirstSession && (
                <div>
                  {highScore > 0 && <p>High Score: {highScore}</p>}
                  {gameOver && <p>Score: {score}</p>}
                </div>
              )}
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
          <>
            <div className="absolute h-full w-full top-0" id="afflictionDiv">
              {afflictionArr.map((a) => (
                <FlyingBox
                  key={a.id}
                  id={a.id}
                  shouldHide={a.shouldHide}
                  targetPos={{ x: heartX, y: heartY }}
                  fromCorner={
                    (
                      [
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ] as const
                    )[Math.floor(Math.random() * 4)]
                  }
                  type={a.type}
                  speed={enemyList.find((e) => e.type === a.type)?.speed ?? 1}
                  onLanded={handleRemove}
                  content={a.image}
                />
              ))}
            </div>
            <div ref={smokeRef} className="absolute h-full w-full top-0"></div>
          </>
        )}
      </div>

      {gameStart && (
        <div
          className="fixed text-3xl"
          style={{
            left: `${heartX}px`,
            top: `${heartY}px`,
            transform: "translate(-50%, -50%)", // ✅ center align
          }}
        >
          ❤️
        </div>
      )}

      {gameStart && (
        <>
          <div className="absolute top-4 left-4 z-10 flex flex-col items-start justify-center">
            <div className="text-white text-xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
              Time: {countdown}s
            </div>
            <div className="flex gap-2">
              {Array.from({ length: currentLives }).map((_, i) => (
                <FaHeart key={"heart" + i} size={48} color="white" />
              ))}
            </div>
          </div>
          <div className="absolute top-4 right-4 z-10 text-white text-xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded-lg">
            Score: {score}
          </div>
        </>
      )}

      {gameStart &&
        lightPositions.map((pos, i) => {
          return (
            <div
              key={i}
              className={`rounded-full bg-yellow-300 blur-xl pointer-events-none transition-transform duration-100 lightPos `}
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

export default App;
