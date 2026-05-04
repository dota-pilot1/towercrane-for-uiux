import { z } from 'zod';

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
  name: z.string().trim().min(2).max(40),
  verifiedToken: z.string().min(16),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72),
});

export const emailSchema = z.object({
  email: z.email(),
});

export const verifyEmailCodeSchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
});

export const resetPasswordWithCodeSchema = z.object({
  email: z.email(),
  verifiedToken: z.string().min(16),
  newPassword: z.string().min(8).max(72),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type VerifyEmailCodeInput = z.infer<typeof verifyEmailCodeSchema>;
export type ResetPasswordWithCodeInput = z.infer<
  typeof resetPasswordWithCodeSchema
>;
