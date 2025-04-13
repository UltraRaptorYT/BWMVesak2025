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
