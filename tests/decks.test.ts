import { describe, expect, it, beforeEach } from 'vitest'
import request from 'supertest'
import { prismaMock } from "./vitest.setup";
import { app } from "../src/index";
import jwt from 'jsonwebtoken';
import { env } from "../src/env";

// Générer un token valide
const generateValidToken = (userId: number = 1, email: string = 'test@example.com') => {
    return jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};


// Tests de l'endpoint POST /api/decks
describe('POST /api/decks', () => {
    beforeEach(() => {
        prismaMock.deck.create.mockReset();
        prismaMock.card.aggregate.mockReset();
        prismaMock.card.findMany.mockReset();
        prismaMock.deckCard.createMany.mockReset();
    });

    // Test de la création réussie d'un deck
    it('should successfully create a new deck with 10 valid cards', async () => {
        const mockCards = [
            { id: 1, pokedexNumber: 1, name: 'Bulbasaur', hp: 45, attack: 49, type: 'Grass', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 2, pokedexNumber: 2, name: 'Ivysaur', hp: 60, attack: 62, type: 'Grass', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 3, pokedexNumber: 3, name: 'Venusaur', hp: 80, attack: 82, type: 'Grass', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 4, pokedexNumber: 4, name: 'Charmander', hp: 39, attack: 52, type: 'Fire', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 5, pokedexNumber: 5, name: 'Charmeleon', hp: 58, attack: 64, type: 'Fire', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 6, pokedexNumber: 6, name: 'Charizard', hp: 78, attack: 84, type: 'Fire', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 7, pokedexNumber: 7, name: 'Squirtle', hp: 44, attack: 48, type: 'Water', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 8, pokedexNumber: 8, name: 'Wartortle', hp: 59, attack: 63, type: 'Water', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 9, pokedexNumber: 9, name: 'Blastoise', hp: 79, attack: 83, type: 'Water', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 10, pokedexNumber: 10, name: 'Caterpie', hp: 45, attack: 30, type: 'Bug', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
        ];

        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);
        prismaMock.deck.create.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.findMany.mockResolvedValueOnce(mockCards as any);
        prismaMock.deckCard.createMany.mockResolvedValueOnce({ count: 10 } as any);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('message', 'Deck créé avec succès');
        expect(response.body).toHaveProperty('deck');
        expect(response.body.deck).toMatchObject({
            id: 1,
            name: 'MyDeck',
            userId: 1,
        });
        expect(response.body.deck.cards).toHaveLength(10);
    });

    // Test de la création sans token
    it('should return 401 when token is missing', async () => {
        const response = await request(app)
            .post('/api/decks')
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(401);
    });

    // Test de la création sans nom du deck
    it('should return 400 when deck name is missing', async () => {
        const token = generateValidToken(1);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Nom du deck manquant');
    });

    // Test de la création avec un nombre de cartes incorrect (moins de 10)
    it('should return 400 when deck has less than 10 cards', async () => {
        const token = generateValidToken(1);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck ne possède pas exactement 10 cartes');
    });

    // Test de la création avec un nombre de cartes incorrect (plus de 10)
    it('should return 400 when deck has more than 10 cards', async () => {
        const token = generateValidToken(1);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck ne possède pas exactement 10 cartes');
    });

    // Test de la création avec cards qui n'est pas un array
    it('should return 400 when cards is not an array', async () => {
        const token = generateValidToken(1);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: { 1: 'invalid' }
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck ne possède pas exactement 10 cartes');
    });

    // Test de l'erreur lors de l'agrégation des cartes
    it('should return 500 when card aggregate fails', async () => {
        const token = generateValidToken(1);

        prismaMock.card.aggregate.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de l'erreur lorsque l'agrégation retourne null
    it('should return 500 when max pokedex number is null', async () => {
        const token = generateValidToken(1);

        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: null } } as any);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de l'erreur lors de la création du deck
    it('should return 500 when deck creation fails', async () => {
        const token = generateValidToken(1);

        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);
        prismaMock.deck.create.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de la création avec ID de pokémon invalide (< 1)
    it('should return 400 when card ID is less than 1', async () => {
        const token = generateValidToken(1);

        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Un ou plusieurs id des pokémons du deck sont invalides');
    });

    // Test de la création avec ID de pokémon invalide (> maxPokemon)
    it('should return 400 when card ID is greater than max pokedex number', async () => {
        const token = generateValidToken(1);

        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);

        const response = await request(app)
            .post('/api/decks')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 200]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Un ou plusieurs id des pokémons du deck sont invalides');
    });
});


// Tests de l'endpoint GET /api/decks/mine
describe('GET /api/decks/mine', () => {
    beforeEach(() => {
        prismaMock.deck.findMany.mockReset();
        prismaMock.deckCard.findMany.mockReset();
        prismaMock.card.findMany.mockReset();
    });

    // Test de la récupération réussie des decks de l'utilisateur
    it('should successfully retrieve user\'s decks with cards', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockDeckCards = [{ id: 1, deckId: 1, cardId: 1 }, { id: 2, deckId: 1, cardId: 2 }];
        const mockCards = [
            { id: 1, pokedexNumber: 1, name: 'Bulbasaur', hp: 45, attack: 49, type: 'Grass', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
            { id: 2, pokedexNumber: 2, name: 'Ivysaur', hp: 60, attack: 62, type: 'Grass', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
        ];

        const token = generateValidToken(1);

        prismaMock.deck.findMany.mockResolvedValueOnce([mockDeck] as any);
        prismaMock.deckCard.findMany.mockResolvedValueOnce(mockDeckCards as any);
        prismaMock.card.findMany.mockResolvedValueOnce(mockCards as any);

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Decks récupérés avec succès');
        expect(response.body).toHaveProperty('decks');
        expect(Array.isArray(response.body.decks)).toBe(true);
        expect(response.body.decks).toHaveLength(1);
        expect(response.body.decks[0]).toMatchObject({
            id: 1,
            name: 'MyDeck',
            userId: 1,
        });
        expect(response.body.decks[0].cards).toHaveLength(2);
    });

    // Test de la récupération sans token
    it('should return 401 when token is missing', async () => {
        const response = await request(app).get('/api/decks/mine');

        expect(response.status).toBe(401);
    });

    // Test de la récupération avec aucun deck
    it('should return empty decks array when user has no decks', async () => {
        const token = generateValidToken(1);

        prismaMock.deck.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('decks');
        expect(response.body.decks).toHaveLength(0);
    });

    // Test de l'erreur lors de la récupération des decks
    it('should return 500 on database error', async () => {
        const token = generateValidToken(1);

        prismaMock.deck.findMany.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de la récupération des decks avec un deck vide
    it('should return decks with empty cards array if deck has no cards', async () => {
        const mockDeck = {
            id: 2,
            name: 'EmptyCardsDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findMany.mockResolvedValueOnce([mockDeck] as any);
        prismaMock.deckCard.findMany.mockResolvedValueOnce([]);
        prismaMock.card.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
            .get('/api/decks/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Decks récupérés avec succès');
        expect(response.body).toHaveProperty('decks');
        expect(response.body.decks).toHaveLength(1);
        expect(response.body.decks[0]).toMatchObject({
            id: 2,
            name: 'EmptyCardsDeck',
            userId: 1,
        });
        expect(response.body.decks[0].cards).toHaveLength(0);
    });
});


// Tests de l'endpoint GET /api/decks/:id
describe('GET /api/decks/:id', () => {
    beforeEach(() => {
        prismaMock.deck.findUnique.mockReset();
        prismaMock.deckCard.findMany.mockReset();
        prismaMock.card.findMany.mockReset();
    });

    // Test de la récupération réussie d'un deck
    it('should successfully retrieve a deck by id with its cards', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockDeckCards = [{ id: 1, deckId: 1, cardId: 1 }];
        const mockCards = [
            { id: 1, pokedexNumber: 1, name: 'Bulbasaur', hp: 45, attack: 49, type: 'Grass', imgUrl: null, createdAt: new Date(), updatedAt: new Date() },
        ];

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.deckCard.findMany.mockResolvedValueOnce(mockDeckCards as any);
        prismaMock.card.findMany.mockResolvedValueOnce(mockCards as any);

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Deck récupéré avec succès');
        expect(response.body).toMatchObject({
            id: 1,
            name: 'MyDeck',
            userId: 1,
        });
        expect(response.body.cards).toHaveLength(1);
    });

    // Test de la récupération sans token
    it('should return 401 when token is missing', async () => {
        const response = await request(app).get('/api/decks/1');

        expect(response.status).toBe(401);
    });

    // Test de la récupération avec ID inexistant
    it('should return 404 when deck does not exist', async () => {
        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .get('/api/decks/999')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck inexistant');
    });

    // Test de la récupération d'un deck appartenant à un autre utilisateur
    it('should return 403 when deck belongs to another user', async () => {
        const mockDeck = {
            id: 1,
            name: 'SomeoneDeck',
            userId: 999,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Le deck n\'appartient pas à cet utilisateur');
    });

    // Test de l'erreur lors de la récupération du deck
    it('should return 500 on database error', async () => {
        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de la récupération d'un deck sans cartes associées
    it('should successfully retrieve a deck with no cards', async () => {
        const mockDeck = {
            id: 1,
            name: 'EmptyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.deckCard.findMany.mockResolvedValueOnce([]);
        prismaMock.card.findMany.mockResolvedValueOnce([]);

        const response = await request(app)
            .get('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Deck récupéré avec succès');
        expect(response.body).toMatchObject({
            id: 1,
            name: 'EmptyDeck',
            userId: 1,
        });
        expect(response.body.cards).toHaveLength(0);
    });
});


// Tests de l'endpoint PATCH /api/decks/:id
describe('PATCH /api/decks/:id', () => {
    beforeEach(() => {
        prismaMock.deck.findUnique.mockReset();
        prismaMock.card.aggregate.mockReset();
        prismaMock.card.findMany.mockReset();
        prismaMock.deck.update.mockReset();
        prismaMock.deckCard.deleteMany.mockReset();
        prismaMock.deckCard.createMany.mockReset();
    });

    // Test de la mise à jour réussie avec nom et cartes
    it('should successfully update deck with new name and cards', async () => {
        const mockDeck = {
            id: 1,
            name: 'OldName',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockUpdatedDeck = {
            id: 1,
            name: 'NewName',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockCards = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            pokedexNumber: i + 1,
            name: `Pokemon${i + 1}`,
            hp: 50 + i,
            attack: 50 + i,
            type: 'Normal',
            imgUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);
        prismaMock.card.findMany.mockResolvedValueOnce(mockCards as any);
        prismaMock.deck.update.mockResolvedValueOnce(mockUpdatedDeck as any);
        prismaMock.deckCard.deleteMany.mockResolvedValueOnce({ count: 10 } as any);
        prismaMock.deckCard.createMany.mockResolvedValueOnce({ count: 10 } as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Deck modifié avec succès');
        expect(response.body).toMatchObject({
            id: 1,
            userId: 1,
        });
        expect(response.body.cards).toHaveLength(10);
    });

    // Test de la mise à jour sans token
    it('should return 401 when token is missing', async () => {
        const response = await request(app)
            .patch('/api/decks/1')
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(401);
    });

    // Test de la mise à jour avec ID inexistant
    it('should return 404 when deck does not exist', async () => {
        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .patch('/api/decks/999')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck inexistant');
    });

    // Test de la mise à jour d'un deck appartenant à un autre utilisateur
    it('should return 403 when deck belongs to another user', async () => {
        const mockDeck = {
            id: 1,
            name: 'SomeoneDeck',
            userId: 999,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Le deck n\'appartient pas à cet utilisateur');
    });

    // Test de la mise à jour avec nombre de cartes incorrect (moins de 10)
    it('should return 400 when modified cards has less than 10 cards', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck ne possède pas exactement 10 cartes');
    });

    // Test de la mise à jour avec nombre de cartes incorrect (plus de 10)
    it('should return 400 when modified cards has more than 10 cards', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck ne possède pas exactement 10 cartes');
    });

    // Test de la mise à jour avec modifiedCards qui n'est pas un array
    it('should return 400 when modifiedCards is not an array', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: { 1: 'invalid' }
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Le deck ne possède pas exactement 10 cartes');
    });

    // Test de l'erreur lors de l'agrégation des cartes
    it('should return 500 when card aggregate fails', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.aggregate.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de l'erreur lorsque l'agrégation retourne null
    it('should return 500 when max pokedex number is null', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: null } } as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'NewName',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de la mise à jour avec nom inchangé
    it('should successfully update deck without changing name if same name is provided', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const mockCards = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            pokedexNumber: i + 1,
            name: `Pokemon${i + 1}`,
            hp: 50 + i,
            attack: 50 + i,
            type: 'Normal',
            imgUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }));

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);
        prismaMock.card.findMany.mockResolvedValueOnce(mockCards as any);
        prismaMock.deckCard.deleteMany.mockResolvedValueOnce({ count: 10 } as any);
        prismaMock.deckCard.createMany.mockResolvedValueOnce({ count: 10 } as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Deck modifié avec succès');
        expect(prismaMock.deck.update).not.toHaveBeenCalled();
    });

    // Test de la mise à jour avec ID de pokémon invalide (< 1)
    it('should return 400 when modified card ID is less than 1', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                modifiedCards: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Un ou plusieurs id des pokémons du deck sont invalides');
    });

    // Test de la mise à jour avec ID de pokémon invalide (> maxPokemon)
    it('should return 400 when modified card ID is greater than max pokedex number', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.card.aggregate.mockResolvedValueOnce({ _max: { pokedexNumber: 151 } } as any);

        const response = await request(app)
            .patch('/api/decks/1')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'MyDeck',
                modifiedCards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 200]
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error', 'Un ou plusieurs id des pokémons du deck sont invalides');
    });
});


// Tests de l'endpoint DELETE /api/decks/:id
describe('DELETE /api/decks/:id', () => {
    beforeEach(() => {
        prismaMock.deck.findUnique.mockReset();
        prismaMock.deckCard.deleteMany.mockReset();
        prismaMock.deck.delete.mockReset();
    });

    // Test de la suppression réussie d'un deck
    it('should successfully delete a deck', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.deckCard.deleteMany.mockResolvedValueOnce({ count: 10 } as any);
        prismaMock.deck.delete.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Deck supprimé avec succès');
        expect(response.body).toMatchObject({
            id: 1,
            name: 'MyDeck',
            userId: 1,
        });
    });

    // Test de la suppression sans token
    it('should return 401 when token is missing', async () => {
        const response = await request(app).delete('/api/decks/1');

        expect(response.status).toBe(401);
    });

    // Test de la suppression avec ID inexistant
    it('should return 404 when deck does not exist', async () => {
        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(null);

        const response = await request(app)
            .delete('/api/decks/999')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Deck inexistant');
    });

    // Test de la suppression d'un deck appartenant à un autre utilisateur
    it('should return 403 when deck belongs to another user', async () => {
        const mockDeck = {
            id: 1,
            name: 'SomeoneDeck',
            userId: 999,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error', 'Le deck n\'appartient pas à cet utilisateur');
    });

    // Test de l'erreur lors de la suppression du deck
    it('should return 500 on database error when deleting deck', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.deckCard.deleteMany.mockResolvedValueOnce({ count: 10 } as any);
        prismaMock.deck.delete.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });

    // Test de l'erreur lors de la suppression des deckCards
    it('should return 500 on database error when deleting deckCards', async () => {
        const mockDeck = {
            id: 1,
            name: 'MyDeck',
            userId: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const token = generateValidToken(1);

        prismaMock.deck.findUnique.mockResolvedValueOnce(mockDeck as any);
        prismaMock.deckCard.deleteMany.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app)
            .delete('/api/decks/1')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});