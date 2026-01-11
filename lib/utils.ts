import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { randomUUID } from "crypto"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID for recordings and other entities
 * Uses crypto.randomUUID() for a UUID v4 string
 */
export function generateId(): string {
  return randomUUID()
}
