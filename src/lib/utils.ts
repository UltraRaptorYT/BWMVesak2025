import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const enemyList = [
  {
    type: "ignorance",
    speed: 0.5,
    image: "/Ignorance.gif",
    filter: "none",
    // filter: "hue-rotate(-50deg) drop-shadow(0px 0px 25px red)",
  },
  {
    type: "greed",
    speed: 1,
    image: "/Greed.gif",
    // filter: "saturate(75%) drop-shadow(0px 0px 25px red)",
  },
  {
    type: "anger",
    speed: 1.5,
    image: "/Anger.gif",
    // filter: "sepia(50%) hue-rotate(-140deg) drop-shadow(0px 0px 25px red)",
  },
];

export function getRandomNumber(min: number, max: number): number {
  if (min > max) throw new Error("Min cannot be greater than Max");
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
