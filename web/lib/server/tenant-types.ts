import type { Role } from "./permissions.ts";

/**
 * Tudo o que uma operação de dados precisa saber sobre quem pede.
 * Repositórios só aceitam este contexto e sempre filtram por organizationId:
 * não existe função de leitura ou escrita sem organização.
 */
export type TenantContext = {
  userId: string;
  organizationId: string;
  role: Role;
};

export class ForbiddenError extends Error {
  constructor(message = "Você não tem permissão para esta ação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Não encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}
