import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const enemyList = [
  { type: "ignorance", speed: 5 },
  { type: "greed", speed: 4 },
  { type: "anger", speed: 3 },
];
