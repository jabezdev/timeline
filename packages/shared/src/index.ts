import { z } from "zod";

export const ReplicacheLicenseKey = "TESTING"; // Fallback key

export const UserSettingsSchema = z.object({
    theme: z.string().optional(),
    systemAccent: z.string().optional(),
    colorMode: z.string().optional(),
    blurEffectsEnabled: z.boolean().optional(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;
