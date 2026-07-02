// Centraliza a leitura do segredo JWT. Em produção, um segredo ausente
// não pode cair silenciosamente num valor padrão público no repositório —
// isso permitiria forjar tokens válidos para qualquer usuário.
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar em produção.',
    );
  }

  return 'dev-only-insecure-secret';
}
