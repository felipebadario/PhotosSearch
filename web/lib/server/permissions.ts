import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

/**
 * Papéis da organização. "member" é o nome técnico do papel exibido como
 * "Editor": cuida de acervos e fotos, mas não de membros nem da assinatura.
 */
export const statements = {
  ...defaultStatements,
  collection: ["create", "update", "delete"],
  photo: ["upload", "delete"],
  billing: ["read", "update"],
} as const;

export const ac = createAccessControl(statements);

const content = {
  collection: ["create", "update", "delete"],
  photo: ["upload", "delete"],
} as const;

export const roles = {
  owner: ac.newRole({
    ...content,
    organization: ["update", "delete"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    billing: ["read", "update"],
    ac: ["create", "read", "update", "delete"],
  }),
  admin: ac.newRole({
    ...content,
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
    billing: ["read"],
    ac: ["read"],
  }),
  member: ac.newRole({
    ...content,
    ac: ["read"],
  }),
};

export type Role = keyof typeof roles;
export type Permission = { [K in keyof typeof statements]?: (typeof statements)[K][number][] };

/** Avaliação local, sem ida ao banco, a partir do papel já carregado no contexto. */
export function can(role: string, permission: Permission): boolean {
  const r = roles[role as Role];
  if (!r) return false;
  return r.authorize(permission as never).success;
}
