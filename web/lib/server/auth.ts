import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "./db/index.ts";
import * as schema from "./db/schema/index.ts";
import { ac, roles } from "./permissions.ts";

// Na Vercel, cada preview tem seu próprio domínio. Sem BETTER_AUTH_URL, usamos o
// domínio do deploy; os domínios conhecidos entram como origens confiáveis.
const vercelUrls = [process.env.VERCEL_BRANCH_URL, process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

export const auth = betterAuth({
  appName: "NossaFoto",
  baseURL: process.env.BETTER_AUTH_URL ?? vercelUrls[0],
  trustedOrigins: ["https://nossafoto.app", "https://www.nossafoto.app", ...vercelUrls],
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Sem provedor de e-mail ainda: verificação e redefinição de senha entram junto com ele.
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  plugins: [
    organization({
      ac,
      roles,
      creatorRole: "owner",
      // Convites são aceitos por link copiado pelo administrador; envio por e-mail virá depois.
      requireEmailVerificationOnInvitation: false,
      invitationExpiresIn: 60 * 60 * 24 * 7,
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
