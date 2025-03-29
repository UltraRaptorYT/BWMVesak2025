import React, { useRef, useEffect } from "react";
import * as bodyPix from "@tensorflow-models/body-pix";
import { drawHand } from "@/lib/hand_utils";
import "@tensorflow/tfjs";
import { drawKeypoints, drawSkeleton } from "@/lib/pose_utils";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "./App.css";

const PersonExtractor: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const loadModelAndStart = async () => {
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      };

      let detector = await poseDetection.createDetector(
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

      hands.onResults((results: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            drawHand(ctx, landmarks, "red");
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
        backgroundImage.src = "./1.jpg"; // Your forest background
        await new Promise((res) => (backgroundImage.onload = res));

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const loop = async () => {
          // Step 1: Get segmentation
          const segmentation = await net.segmentPerson(video);
          const poses = await detector.estimatePoses(video);

          // Step 2: Get image data from video
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const { data } = frame;

          // Step 3: Composite the background image first
          ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

          // Step 4: Loop through pixels, draw only person pixels
          segmentation.data.forEach((val, i) => {
            if (val === 1) {
              const j = i * 4;
              // Get RGBA from original frame
              const r = frame.data[j];
              const g = frame.data[j + 1];
              const b = frame.data[j + 2];
              const a = frame.data[j + 3];

              // Put back onto canvas
              data[j] = r;
              data[j + 1] = g;
              data[j + 2] = b;
              data[j + 3] = a;
            } else {
              // If background, make pixel transparent
              data[i * 4 + 3] = 0;
            }
          });

          // Step 5: Put updated person image over background
          ctx.putImageData(frame, 0, 0);

          if (poses.length > 0) {
            const keypoints = poses[0].keypoints;
            drawKeypoints(keypoints, 0.5, ctx, 1, "lime");
            drawSkeleton(keypoints, 0.5, ctx, 1, "aqua");
          }

          await hands.send({ image: video });

          requestAnimationFrame(loop);
        };

        loop();
      };
    };
    async function loadTF() {
      await tf.ready();
      await tf.setBackend("webgl");
      await loadModelAndStart();
    }
    loadTF();
  }, []);

  return (
    <div className="relative w-full fullHeight flex items-center justify-center">
      <video ref={videoRef} className="hidden" />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 bg-transparent object-contain fullHeight"
      />
      <img
        src="./1.jpg"
        className="absolute top-0 left-0 w-full h-full object-cover z-0"
        alt="Forest background"
      />
    </div>
  );
};

export default PersonExtractor;
