import {describe, expect, it, beforeEach} from 'vitest'
import request from 'supertest'
import {prismaMock} from "./vitest.setup";
import {app} from "../src/index";

// Tests de l'endpoint POST /api/auth/sign-up
describe('POST /api/auth/sign-up', () => {
    beforeEach(() => {
        prismaMock.user.findUnique.mockReset();
        prismaMock.user.create.mockReset();
    });

    // Test de l'inscription réussie d'un nouvel utilisateur
    it('should create a new user', async () => {
        const newUser = {
            id: 1,
            username: 'Charlie',
            email: 'charlie@example.com',
            password: 'hashedpassword',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Mocks : l'email n'existe pas, puis on crée l'utilisateur
        prismaMock.user.findUnique.mockResolvedValueOnce(null); // Email n'existe pas
        prismaMock.user.create.mockResolvedValueOnce(newUser);
        prismaMock.user.findUnique.mockResolvedValueOnce(newUser); // Récupération après création

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({username: 'Charlie', email: 'charlie@example.com', password: 'password123'});

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Inscription réussie');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toMatchObject({
            id: 1,
            username: 'Charlie',
            email: 'charlie@example.com',
        });
    });

    // Test de l'inscription avec des données manquantes
    it('should return 400 when required fields are missing', async () => {
        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({username: 'Test'}); // Email et password manquants

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Données manquantes / invalides');
    });

    // Test de l'inscription avec email déjà existant
    it('should return 409 when email already exists', async () => {
        const existingUser = {
            id: 2,
            username: 'ExistingUser',
            email: 'existing@example.com',
            password: 'hashed',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prismaMock.user.findUnique.mockResolvedValueOnce(existingUser);

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({username: 'NewUser', email: 'existing@example.com', password: 'password123'});

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error', 'Email incorrecte');
    });

    // Test de l'erreur lors de la création
    it('should return 500 when user creation fails', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        prismaMock.user.create.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({username: 'Test', email: 'test@example.com', password: 'password123'});

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de l'erreur lors de la vérification de la création
    it('should return 500 when user verification after creation fails', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null); // Email n'existe pas
        prismaMock.user.create.mockResolvedValueOnce({id: 1} as any);
        prismaMock.user.findUnique.mockResolvedValueOnce(null); // Vérification échoue

        const response = await request(app)
            .post('/api/auth/sign-up')
            .send({username: 'Test', email: 'test@example.com', password: 'password123'});

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur lors de l\'inscription');
    });
});


// Tests de l'endpoint POST /api/auth/sign-in
describe('POST /api/auth/sign-in', () => {
    beforeEach(() => {
        prismaMock.user.findUnique.mockReset();
    });

    // Test 1 : Connexion réussie avec identifiants valides
    it('should successfully sign in with valid credentials', async () => {
        const existingUser = {
            id: 1,
            username: 'Charlie',
            email: 'charlie@example.com',
            password: 'hashed_password123', // Mocked bcrypt hash
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({email: 'charlie@example.com', password: 'password123'});

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Connexion réussie');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toMatchObject({
            id: 1,
            username: 'Charlie',
            email: 'charlie@example.com',
        });
    });

    // Test 2 : Connexion avec données manquantes
    it('should return 400 when required fields are missing', async () => {
        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({email: 'test@example.com'}); // Password manquant

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Données manquantes / invalides');
    });

    // Test 3 : Connexion avec utilisateur inexistant
    it('should return 401 when user does not exist', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({email: 'nonexistent@example.com', password: 'password123'});

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
    });

    // Test 4 : Connexion avec mot de passe incorrect
    it('should return 401 when password is incorrect', async () => {
        const existingUser = {
            id: 1,
            username: 'Charlie',
            email: 'charlie@example.com',
            password: 'hashed_correctpassword', // Different hash
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({email: 'charlie@example.com', password: 'wrongpassword'});

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Email ou mot de passe incorrect');
    });

    // Test 5 : Erreur serveur lors de la recherche
    it('should return 500 on database error', async () => {
        prismaMock.user.findUnique.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .post('/api/auth/sign-in')
            .send({email: 'test@example.com', password: 'password123'});

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});