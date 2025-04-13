import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const enemyList = [
  { type: "ignorance", speed: 6 },
  { type: "greed", speed: 5 },
  { type: "anger", speed: 4 },
];

export function getRandomNumber(min: number, max: number): number {
  if (min > max) throw new Error("Min cannot be greater than Max");
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
