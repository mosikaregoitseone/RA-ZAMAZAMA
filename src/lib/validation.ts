// src/lib/validation.ts
// Form validation schemas using Zod

import { z } from "zod";

export const listingSchema = z.object({
  title: z.string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be under 100 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be under 2000 characters"),
  price: z.coerce.number()
    .positive("Price must be a positive number")
    .max(1000000, "Price seems unreasonably high"),
  category: z.enum(["Electronics", "Textbooks", "Furniture", "Food", "Services", "Other"])
    .default("Electronics"),
});

export const profileSetupSchema = z.object({
  full_name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  university: z.string()
    .min(1, "Please select a university"),
  phone: z.string()
    .optional()
    .refine(
      (val) => !val || /^[0-9\s+()-]{7,}$/.test(val),
      "Invalid phone number format"
    ),
});

export const loginSchema = z.object({
  email: z.string()
    .email("Invalid email address"),
  password: z.string()
    .min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  email: z.string()
    .email("Invalid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const messageSchema = z.object({
  message: z.string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
});

export const reportSchema = z.object({
  reason: z.string()
    .min(5, "Please provide more detail")
    .max(1000, "Report description is too long"),
});

// Type inference for form data
export type ListingFormData = z.infer<typeof listingSchema>;
export type ProfileSetupFormData = z.infer<typeof profileSetupSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type MessageFormData = z.infer<typeof messageSchema>;
export type ReportFormData = z.infer<typeof reportSchema>;