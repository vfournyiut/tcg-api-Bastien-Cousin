import {describe, expect, it, beforeEach} from 'vitest'
import request from 'supertest'
import {prismaMock} from "./vitest.setup";
import {app} from "../src/index";

// Tests de l'endpoint GET /api/cards
describe('GET /api/cards', () => {
    beforeEach(() => {
        prismaMock.card.findMany.mockReset();
    });

    // Test du renvoie des cartes
    it('should return an array of cards', async () => {
        // Mock de la réponse Prisma
        prismaMock.card.findMany.mockResolvedValue([
            {
                id: 1,
                name: 'Bulbasaur',
                hp: 45,
                attack: 49,
                type: 'Grass',
                pokedexNumber: 1,
                imgUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 2,
                name: "Ivysaur",
                hp: 60,
                attack: 62,
                type: "Grass",
                pokedexNumber: 2,
                imgUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 3,
                name: "Venusaur",
                hp: 80,
                attack: 82,
                type: "Grass",
                pokedexNumber: 3,
                imgUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ]);

        // Requête HTTP via supertest
        const response = await request(app).get('/api/cards');

        // Assertions
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Envoi des cartes réussie');
        expect(response.body).toHaveProperty('cards');
        expect(Array.isArray(response.body.cards)).toBe(true);
        expect(response.body.cards).toHaveLength(3);
        expect(response.body.cards[0]).toMatchObject({id: 1, name: 'Bulbasaur', pokedexNumber: 1});
    });

    // Test du comportement en cas d'erreur serveur
    it('should return 500 on database error', async () => {
        prismaMock.card.findMany.mockRejectedValueOnce(new Error('DB error'));

        const response = await request(app).get('/api/cards');

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty('error', 'Erreur serveur');
    });
});