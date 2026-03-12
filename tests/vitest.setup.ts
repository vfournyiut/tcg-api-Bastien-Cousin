import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { vi, beforeEach } from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client';

const prismaMock = mockDeep<PrismaClient>();

// Mock du module Prisma
vi.mock('../src/database', () => ({
  prisma: prismaMock,
}));

// Mock du middleware d'authentification
vi.mock('../src/auth/auth.middleware', () => ({
  authenticateToken: vi.fn((req, res, next) => {
    // Simule un utilisateur authentifié
    req.user = {
      userId: 1,
      email: 'test@example.com'
    };
    next();
  }),
}))

// Mock de bcryptjs
vi.mock('bcryptjs', () => {
  return {
    default: {
      hash: vi.fn().mockImplementation((password: string) =>
        Promise.resolve(`hashed_${password}`)
      ),
      compare: vi.fn().mockImplementation((password: string, hash: string) =>
        Promise.resolve(hash === `hashed_${password}`)
      ),
    }
  }
})
// Reset des mocks avant chaque test
beforeEach(() => {
  mockReset(prismaMock as unknown as DeepMockProxy<PrismaClient>);
});

// Export du mock typé
export { prismaMock };
