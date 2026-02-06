import {mockDeep, mockReset, DeepMockProxy} from 'vitest-mock-extended';
import {vi, beforeEach} from 'vitest';
import {PrismaClient} from '../src/generated/prisma/client';

const prismaMock = mockDeep<PrismaClient>();

// Mock du module Prisma
vi.mock('../src/database', () => ({
    prisma: prismaMock,
}));

// Mock du middleware d'authentification
vi.mock('../src/auth/auth.middleware', () => ({
    authenticateToken: vi.fn((req, res, next) => {
        // Simule un utilisateur authentifié
        req.userId = 1
        next()
    }),
}))

// Mock de bcryptjs
vi.mock('bcryptjs', () => ({
    hash: vi.fn(async (password: string) => {
        return `hashed_${password}`;
    }),
    compare: vi.fn(async (password: string, hash: string) => {
        return hash === `hashed_${password}`;
    }),
}))

// Reset des mocks avant chaque test
beforeEach(() => {
    mockReset(prismaMock as unknown as DeepMockProxy<PrismaClient>);
});

// Export du mock typé
export {prismaMock};
