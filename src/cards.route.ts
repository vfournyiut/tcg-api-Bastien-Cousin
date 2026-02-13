import {Request, Response, Router} from 'express'
import {prisma} from "../src/database";

export const cardsRouter = Router()

/**
 * GET /api/cards
 * 
 * Récupère la liste complète de toutes les cartes Pokémon disponibles dans le jeu.
 * 
 * Retourne un tableau de toutes les cartes triées par numéro pokédex en ordre croissant.
 * Cet endpoint est public et n'a pas besoin d'authentification.
 * Idéal pour afficher le catalogue des cartes disponibles aux utilisateurs.
 * 
 * @route GET /api/cards
 * @returns {Object} Response d'Express
 * @returns {number} 200 - Liste des cartes récupérée avec succès
 * @returns {string} response.body.message - Message de confirmation
 * @returns {Array} response.body.cards - Tableau de toutes les cartes disponibles
 * @returns {number} response.body.cards[].id - ID unique de la carte en base de données\n * @returns {number} response.body.cards[].pokedexNumber - Numéro pokédex du pokémon (1-151)\n * @returns {string} response.body.cards[].name - Nom du pokémon\n * @returns {number} response.body.cards[].hp - Points de vie\n * @returns {number} response.body.cards[].attack - Valeur d'attaque\n * @returns {string} response.body.cards[].type - Type du pokémon (Fire, Water, Grass, etc.)\n * @returns {string|null} response.body.cards[].imgUrl - URL de l'image de la carte (peut être null)\n * @returns {Date} response.body.cards[].createdAt - Date/heure de création\n * @returns {Date} response.body.cards[].updatedAt - Date/heure de dernière modification\n * \n * @throws {500} - Erreur serveur lors de la récupération des cartes de la base de données\n * @throws {500} - Erreur serveur lors du tri des cartes\n * \n * @example\n * // Récupérer la liste de toutes les cartes\n * const response = await fetch('/api/cards')\n * const data = await response.json()\n * console.log(data.cards)\n * // [\n * //   {\n * //     id: 1,\n * //     pokedexNumber: 1,\n * //     name: 'Bulbasaur',\n * //     hp: 45,\n * //     attack: 49,\n * //     type: 'Grass',\n * //     imgUrl: null,\n * //     createdAt: '2024-01-22T...',\n * //     updatedAt: '2024-01-22T...'\n * //   },\n * //   ...\n * // ]\n */
cardsRouter.get('/api/cards', async (_req: Request, res: Response) => {
    try {
        // 1. Récupérer toutes les cartes (pokémon) depuis la base de données
        // Cet endpoint n'a pas besoin d'authentification car c'est juste un catalogue public
        const cards = await prisma.card.findMany({
            // Ordonner les cartes par numéro pokédex croissant (1 à 151)
            // Cela garantit une cohérence dans la présentation des cartes
            orderBy: {
                pokedexNumber: 'asc'
            }
        })

        // 2. Retourner la liste des cartes avec un message de succès
        return res.status(200).json({
            message: 'Envoi des cartes réussie',
            cards,
        })
    } catch (error) {
        // En cas d'erreur lors de la requête à la base, retourner une erreur 500
        // Log l'erreur pour debugging en développement
        console.error('Erreur lors de l\'envoi des cartes :', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})