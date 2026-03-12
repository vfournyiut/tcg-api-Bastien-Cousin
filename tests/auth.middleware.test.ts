import {describe, it, expect, vi, beforeEach} from 'vitest'
import jwt from 'jsonwebtoken'
import {authenticateToken} from '../src/auth.middleware'
import {env} from '../src/env'

// Test du middleware d'authentification
describe('Middleware d\'authentification', () => {
    let req: any
    let res: any
    let next: any

    beforeEach(() => {
        req = { headers: {} };
        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
        };
        next = vi.fn();
    });

    // Test du cas ou le token est valide
    it('should calls next and sets req.user when token is valid', () => {
        const payload = { userId: 64, email: 'test@example.com' };
        const token = jwt.sign(payload, process.env.JWT_SECRET || env.JWT_SECRET, { expiresIn: '7d' });

        req.headers.authorization = `Bearer ${token}`;

        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user).toMatchObject({ userId: 64, email: 'test@example.com' });
    });

    // Test de la vérification de la présence du token
    it('should return 401 when token is missing', () => {
        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({error: 'Token manquant'});
        expect(next).not.toHaveBeenCalled();
    });

    // Test de la vérification de la validité du token
    it('should return 401 when token is invalid', () => {
        req.headers.authorization = 'Bearer invalid token'

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({error: 'Token invalide ou expiré'});
        expect(next).not.toHaveBeenCalled();
    });
});
