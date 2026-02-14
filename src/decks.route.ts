import { Request, Response, Router } from 'express'
import { prisma } from "../src/database";
import { authenticateToken } from "./auth.middleware";

export const decksRouter = Router()

/**
 * POST /api/decks
 * 
 * Crée un nouveau deck pour l'utilisateur authentifié.
 * 
 * Valide que le deck contient exactement 10 cartes avec des IDs pokédex valides,
 * puis crée le deck en base de données avec les associations deckCard correspondantes.
 * Seul un utilisateur authentifié via JWT peut créer un deck.
 * 
 * @route POST /api/decks
 * @middleware authenticateToken - Vérifie le token JWT et ajoute req.user
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.name - Nom du deck à créer (requis, non-vide)
 * @param {number[]} req.body.cards - Tableau de 10 numéros pokédex (requis, length === 10)
 * @returns {Object} Response d'Express
 * @returns {number} 201 - Deck créé avec succès
 * @returns {Object} response.body.deck - Le deck créé avec ses cartes
 * @returns {number} response.body.deck.id - ID du deck
 * @returns {string} response.body.deck.name - Nom du deck
 * @returns {Array} response.body.deck.cards - Array des objets Card du deck
 * @returns {number} response.body.deck.userId - ID de l'utilisateur propriétaire
 * 
 * @throws {400} - Validation échouée : nom manquant
 * @throws {400} - Validation échouée : pas exactement 10 cartes
 * @throws {400} - Validation échouée : IDs pokédex invalides (< 1 ou > maxPokedex)
 * @throws {401} - Token manquant ou invalide
 * @throws {500} - Erreur serveur lors de l'agrégation des cartes
 * @throws {500} - Erreur serveur lors de la création du deck
 * @throws {500} - Erreur serveur lors de l'association des cartes
 * 
 * @example
 * // Créer un deck avec 10 pokémons
 * fetch('/api/decks', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGc...',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     name: 'Deck Legendaires',
 *     cards: [144, 145, 146, 149, 150, 151, 243, 244, 245, 249]
 *   })
 * })
 */
decksRouter.post('/api/decks', authenticateToken, async (req: Request, res: Response) => {
    const { name, cards } = req.body

    try {
        // 1. Vérifier que le token JWT est valide (déjà fait par middleware)
        // Le middleware ajoute req.user contenant userId et email si token valide
        if (!req.user) {
            return res.status(401).json({ error: 'Token manquant / invalide' })
        }

        // 2. Vérifier que le nom du deck est fourni et n'est pas vide
        // Un deck sans nom n'est pas pertinent
        if (!name) {
            return res.status(400).json({ error: 'Nom du deck manquant' })
        }

        // 3. Vérifier que exactement 10 cartes sont fournies
        // Les decks doivent toujours contenir 10 pokémons (règle du jeu)
        if (!Array.isArray(cards) || cards.length !== 10) {
            return res.status(400).json({ error: 'Le deck ne possède pas exactement 10 cartes' })
        }

        // 4. Vérifier que les IDs pokédex fournis sont valides (entre 1 et max)
        // Récupérer le numéro pokédex maximum disponible en base de données
        const result = await prisma.card.aggregate({
            _max: {
                pokedexNumber: true,
            },
        })

        const numMaxPokemon = result._max.pokedexNumber
        if (!numMaxPokemon) {
            return res.status(500).json({ error: 'Erreur serveur' })
        }

        // Vérifier chaque ID pokédex fourni est valide
        for (let i: number = 0; i < cards.length; i++) {
            // Rejeter si ID < 1 (invalide, les pokédex commencent à 1)
            // Ou si ID > max (dépasse les pokédex disponibles)
            if (cards[i] < 1 || cards[i] > numMaxPokemon) {
                return res.status(400).json({ error: 'Un ou plusieurs id des pokémons du deck sont invalides' })
            }
        }

        // 5. Créer le deck en base de données
        // Créer d'abord le deck sans cartes
        const deck = await prisma.deck.create({
            data: {
                name: name,
                userId: req.user.userId,
            }
        });

        // Récupérer les cartes correspondant aux pokédex fournis
        const deckCards = await prisma.card.findMany({
            where: {
                pokedexNumber: {
                    in: cards,
                },
            },
        });

        // Créer les associations deckCard pour lier le deck à ses cartes
        await prisma.deckCard.createMany({
            data: deckCards.map(card => ({
                cardId: card.id,
                deckId: deck.id,
            })),
        });

        // 6. Retourner le deck créé avec ses cartes au client
        return res.status(201).json({
            message: 'Deck créé avec succès',
            deck: {
                id: deck.id,
                name: deck.name,
                cards: deckCards,
                userId: deck.userId,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la création du deck :', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * GET /api/decks/mine
 * 
 * Récupère tous les decks de l'utilisateur authentifié avec leurs cartes associées.
 * 
 * Retourne un tableau vide si l'utilisateur n'a aucun deck.
 * Chaque deck inclut toutes ses cartes associées via les relations deckCard.
 * 
 * @route GET /api/decks/mine
 * @middleware authenticateToken - Vérifie le token JWT et ajoute req.user
 * @returns {Object} Response d'Express
 * @returns {number} 200 - Decks récupérés avec succès
 * @returns {string} response.body.message - Message de confirmation
 * @returns {Array} response.body.decks - Tableau des decks de l'utilisateur
 * @returns {number} response.body.decks[].id - ID du deck
 * @returns {string} response.body.decks[].name - Nom du deck
 * @returns {number} response.body.decks[].userId - ID du propriétaire
 * @returns {Array} response.body.decks[].cards - Tableau des cartes du deck (peut être vide)
 * @returns {number} response.body.decks[].cards[].id - ID de la carte
 * @returns {number} response.body.decks[].cards[].pokedexNumber - Numéro pokédex
 * @returns {string} response.body.decks[].cards[].name - Nom de la carte
 * 
 * @throws {401} - Token manquant ou invalide
 * @throws {500} - Erreur serveur lors de la récupération des decks
 * @throws {500} - Erreur serveur lors de la récupération des deckCards
 * @throws {500} - Erreur serveur lors de la récupération des cartes associées
 * 
 * @example
 * // Récupérer tous les decks de l'utilisateur
 * const response = await fetch('/api/decks/mine', {
 *   headers: { 'Authorization': 'Bearer eyJhbGc...' }
 * })
 * const data = await response.json()
 * console.log(data.decks) // [{ id: 1, name: '...', cards: [...] }, ...]
 */
decksRouter.get('/api/decks/mine', authenticateToken, async (req: Request, res: Response) => {
    try {
        // 1. Vérifier que le token JWT valide est présent
        // Le middleware authenticateToken garantit req.user est défini avec userId
        if (!req.user) {
            return res.status(401).json({ error: 'Token manquant / invalide' })
        }

        // 2. Récupérer tous les decks appartenant à cet utilisateur
        // findMany retourne toujours un array, jamais null (vide [] si aucun deck)
        const userId = req.user.userId

        const decks = await prisma.deck.findMany({
            where: { userId },
        });

        // 3. Si l'utilisateur n'a aucun deck, retourner une liste vide
        // (pas besoin de requêtes supplémentaires dans ce cas)
        if (decks.length === 0) {
            return res.status(200).json({
                message: 'Decks récupérés avec succès',
                decks: [],
            })
        }

        // 4. Pour chaque deck récupéré, chercher ses cartes associées
        // Utiliser Promise.all pour paralléliser les requêtes pour chaque deck
        const decksWithCards = await Promise.all(
            decks.map(async (deck) => {
                // Récupérer les IDs des cartes associées via la table deckCard
                const deckCards = await prisma.deckCard.findMany({
                    where: { deckId: deck.id },
                });

                // Récupérer les détails complets des cartes (nom, HP, attaque, etc.)
                const cards = await prisma.card.findMany({
                    where: {
                        id: {
                            in: deckCards.map(deckCard => deckCard.cardId),
                        },
                    },
                });

                // Construire l'objet deck avec ses cartes
                return {
                    id: deck.id,
                    name: deck.name,
                    cards: cards,
                    userId: deck.userId,
                };
            })
        );

        // 5. Retourner les decks avec toutes leurs cartes
        return res.status(200).json({
            message: 'Decks récupérés avec succès',
            decks: decksWithCards,
        })
    } catch (error) {
        console.error('Erreur lors de la récupération des decks :', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * GET /api/decks/:id
 * 
 * Récupère un deck spécifique de l'utilisateur par son ID avec toutes ses cartes.
 * 
 * Vérifie que le deck appartient bien à l'utilisateur authentifié avant de tirer les données.
 * Retourne les cartes associées au deck via les relations deckCard.
 * 
 * @route GET /api/decks/:id
 * @middleware authenticateToken - Vérifie le token JWT et ajoute req.user
 * @param {number} req.params.id - ID du deck à récupérer (converti en entier)
 * @returns {Object} Response d'Express
 * @returns {number} 200 - Deck récupéré avec succès
 * @returns {string} response.body.message - Message de confirmation
 * @returns {number} response.body.id - ID du deck
 * @returns {string} response.body.name - Nom du deck
 * @returns {number} response.body.userId - ID du propriétaire
 * @returns {Array} response.body.cards - Tableau des cartes du deck
 * @returns {number} response.body.cards[].id - ID de la carte
 * @returns {number} response.body.cards[].pokedexNumber - Numéro pokédex
 * @returns {string} response.body.cards[].name - Nom de la carte
 * @returns {number} response.body.cards[].hp - Points de vie
 * @returns {number} response.body.cards[].attack - Attaque
 * @returns {string} response.body.cards[].type - Type de pokémon
 * 
 * @throws {401} - Token manquant ou invalide
 * @throws {403} - Forbidden : le deck n'appartient pas à l'utilisateur authentifié
 * @throws {404} - Not Found : le deck avec cet ID n'existe pas
 * @throws {500} - Erreur serveur lors de la récupération du deck
 * @throws {500} - Erreur serveur lors de la récupération des deckCards
 * @throws {500} - Erreur serveur lors de la récupération des cartes associées
 * 
 * @example
 * // Récupérer le deck avec l'ID 5
 * const response = await fetch('/api/decks/5', {
 *   headers: { 'Authorization': 'Bearer eyJhbGc...' }
 * })
 * const deck = await response.json()
 * console.log(deck) // { id: 5, name: '...', cards: [{ id: 1, pokedexNumber: 4, ... }, ...] }
 */
decksRouter.get('/api/decks/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        // 1. Vérifier que le token JWT valide est présent
        // Le middleware authenticateToken garantit req.user est défini avec userId
        if (!req.user) {
            return res.status(401).json({ error: 'Token manquant / invalide' })
        }

        // 2. Récupérer l'ID du deck en paramètre et le convertir en entier
        // Chercher le deck dans la base de données
        const deckId = parseInt(req.params.id)

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        // Si le deck n'existe pas, retourner 404
        if (!deck) {
            return res.status(404).json({ error: 'Deck inexistant' })
        }

        // 3. Vérifier que le deck appartient à l'utilisateur authentifié
        // Évite que les utilisateurs accèdent aux decks d'autres utilisateurs
        const userId = req.user.userId

        if (deck.userId !== userId) {
            return res.status(403).json({ error: 'Le deck n\'appartient pas à cet utilisateur' })
        }

        // 4. Récupérer toutes les cartes associées au deck
        // Chercher d'abord les associations deckCard
        const deckCards = await prisma.deckCard.findMany({
            where: { deckId: deck.id },
        });

        // Récupérer les détails complets des cartes (nom, HP, attaque, type, etc.)
        const cards = await prisma.card.findMany({
            where: {
                id: {
                    in: deckCards.map(deckCard => deckCard.cardId),
                },
            },
        });

        // 5. Retourner le deck avec toutes ses cartes associées
        return res.status(200).json({
            message: 'Deck récupéré avec succès',
            id: deck.id,
            name: deck.name,
            cards: cards,
            userId: deck.userId,
        })
    } catch (error) {
        console.error('Erreur lors de la récupération du deck :', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * PATCH /api/decks/:id
 * 
 * Met à jour un deck existant : son nom et/ou ses cartes associées.
 * 
 * Valide que le deck appartient à l'utilisateur, que le nouveau nom n'est pas vide,
 * et que les cartes remplacées contiennent exactement 10 IDs pokédex valides.
 * Seule l'étape de modification nécessaire est effectuée (pas de UPDATE inutile du nom).
 * Supprime les anciennes relations deckCard et les remplace par les nouvelles.
 * 
 * @route PATCH /api/decks/:id
 * @middleware authenticateToken - Vérifie le token JWT et ajoute req.user
 * @param {number} req.params.id - ID du deck à modifier (converti en entier)
 * @param {Object} req.body - Corps de la requête
 * @param {string} [req.body.name] - Nouveau nom du deck (optionnel, mais si envoyé doit être non-vide)
 * @param {number[]} req.body.modifiedCards - Nouveau tableau de 10 numéros pokédex (requis)
 * @returns {Object} Response d'Express
 * @returns {number} 200 - Deck modifié avec succès
 * @returns {string} response.body.message - Message de confirmation
 * @returns {number} response.body.id - ID du deck
 * @returns {string} response.body.name - Nom du deck (ancien ou nouveau)
 * @returns {number} response.body.userId - ID du propriétaire
 * @returns {Array} response.body.cards - Nouvelle liste des cartes du deck
 * @returns {number} response.body.cards[].id - ID de la carte
 * @returns {number} response.body.cards[].pokedexNumber - Numéro pokédex
 * @returns {string} response.body.cards[].name - Nom de la carte
 * 
 * @throws {400} - Validation échouée : pas exactement 10 cartes modifiées
 * @throws {400} - Validation échouée : modifiedCards n'est pas un array
 * @throws {400} - Validation échouée : IDs pokédex invalides (< 1 ou > maxPokedex)
 * @throws {401} - Token manquant ou invalide
 * @throws {403} - Forbidden : le deck n'appartient pas à l'utilisateur authentifié
 * @throws {404} - Not Found : le deck avec cet ID n'existe pas
 * @throws {500} - Erreur serveur lors de la récupération du deck
 * @throws {500} - Erreur serveur lors de l'agrégation des cartes
 * @throws {500} - Erreur serveur lors de la mise à jour du nom (si différent)
 * @throws {500} - Erreur serveur lors de la suppression des anciennes deckCards
 * @throws {500} - Erreur serveur lors de la création des nouvelles deckCards
 * 
 * @example
 * // Modifier le nom et les cartes d'un deck
 * const response = await fetch('/api/decks/5', {
 *   method: 'PATCH',
 *   headers: {
 *     'Authorization': 'Bearer eyJhbGc...',
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({
 *     name: 'Nouveau Nom du Deck',
 *     modifiedCards: [1, 4, 7, 25, 39, 52, 58, 69, 77, 100]
 *   })
 * })
 */
decksRouter.patch('/api/decks/:id', authenticateToken, async (req: Request, res: Response) => {
    const { name, modifiedCards } = req.body

    try {
        // 1. Vérifier que le token JWT valide est présent
        // Le middleware authenticateToken garantit req.user est défini avec userId
        if (!req.user) {
            return res.status(401).json({ error: 'Token manquant / invalide' })
        }

        // 2. Récupérer l'ID du deck en paramètre et chercher le deck en base
        // Convertir l'ID en entier (params arrivent comme strings)
        const deckId = parseInt(req.params.id)

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        // Si le deck n'existe pas, retourner 404
        if (!deck) {
            return res.status(404).json({ error: 'Deck inexistant' })
        }

        // 3. Vérifier que le deck appartient à l'utilisateur authentifié
        // Évite que les utilisateurs modifient les decks d'autres utilisateurs
        const userId = req.user.userId

        if (deck.userId !== userId) {
            return res.status(403).json({ error: 'Le deck n\'appartient pas à cet utilisateur' })
        }

        // 4. Vérifier que exactement 10 cartes modifiées sont fournies
        // Les decks doivent toujours contenir 10 pokémons
        if (!Array.isArray(modifiedCards) || modifiedCards.length !== 10) {
            return res.status(400).json({ error: 'Le deck ne possède pas exactement 10 cartes' })
        }

        // 5. Vérifier que les IDs pokédex fournis sont valides
        // Récupérer le numéro pokédex maximum disponible en base de données
        const result = await prisma.card.aggregate({
            _max: {
                pokedexNumber: true,
            },
        })

        const numMaxPokemon = result._max.pokedexNumber
        if (!numMaxPokemon) {
            return res.status(500).json({ error: 'Erreur serveur' })
        }

        // Vérifier chaque ID pokédex fourni est valide (entre 1 et max)
        for (let i: number = 0; i < modifiedCards.length; i++) {
            if (modifiedCards[i] < 1 || modifiedCards[i] > numMaxPokemon) {
                return res.status(400).json({ error: 'Un ou plusieurs id des pokémons du deck sont invalides' })
            }
        }

        // 6. Récupérer les cartes correspondant aux nouveaux pokédex
        // Chercher les cartes par leurs numéros pokédex fournis
        const newCards = await prisma.card.findMany({
            where: {
                pokedexNumber: {
                    in: modifiedCards,
                },
            },
        });

        // 7. Mettre à jour le nom du deck SEULEMENT s'il a changé
        // Évite une requête UPDATE inutile si le nom est identique
        if (name !== deck.name) {
            await prisma.deck.update({
                where: {
                    id: deck.id,
                },
                data: {
                    name: name,
                },
            })
        }

        // 8. Supprimer les anciennes associations deckCard
        // Important: Supprimer avant créer les nouvelles pour éviter les doublons
        await prisma.deckCard.deleteMany({
            where: {
                deckId: deck.id,
            },
        })

        // 9. Créer les nouvelles associations deckCard avec les cartes modifiées
        // Lier chaque carte aux nouvelles cartes du deck
        await prisma.deckCard.createMany({
            data: newCards.map(card => ({
                deckId: deck.id,
                cardId: card.id,
            })),
        })

        // 10. Retourner le deck modifié avec les nouvelles cartes
        return res.status(200).json({
            message: 'Deck modifié avec succès',
            id: deck.id,
            name: deck.name,
            cards: newCards,
            userId: deck.userId,
        })
    } catch (error) {
        console.error('Erreur lors de la modification du deck :', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})

/**
 * DELETE /api/decks/:id
 * 
 * Supprime un deck existant et toutes ses associations de cartes (deckCards).
 * 
 * Vérifie que le deck appartient à l'utilisateur authentifié avant suppression.
 * Supprime d'abord les lignes deckCard associées, puis le deck lui-même.
 * Cette opération est irréversible.
 * 
 * @route DELETE /api/decks/:id
 * @middleware authenticateToken - Vérifie le token JWT et ajoute req.user
 * @param {number} req.params.id - ID du deck à supprimer (converti en entier)
 * @returns {Object} Response d'Express
 * @returns {number} 200 - Deck supprimé avec succès
 * @returns {string} response.body.message - Message de confirmation
 * @returns {number} response.body.id - ID du deck supprimé
 * @returns {string} response.body.name - Nom du deck supprimé
 * @returns {number} response.body.userId - ID du propriétaire (pour confirmation)
 * 
 * @throws {401} - Token manquant ou invalide
 * @throws {403} - Forbidden : le deck n'appartient pas à l'utilisateur authentifié
 * @throws {404} - Not Found : le deck avec cet ID n'existe pas
 * @throws {500} - Erreur serveur lors de la récupération du deck
 * @throws {500} - Erreur serveur lors de la suppression des deckCards associées
 * @throws {500} - Erreur serveur lors de la suppression du deck
 * 
 * @example
 * // Supprimer le deck avec l'ID 5
 * const response = await fetch('/api/decks/5', {
 *   method: 'DELETE',
 *   headers: { 'Authorization': 'Bearer eyJhbGc...' }
 * })
 * const result = await response.json()
 * console.log(result.message) // 'Deck supprimé avec succès'
 */
decksRouter.delete('/api/decks/:id', authenticateToken, async (req: Request, res: Response) => {

    try {
        // 1. Vérifier que le token JWT valide est présent
        // Le middleware authenticateToken garantit req.user est défini avec userId
        if (!req.user) {
            return res.status(401).json({ error: 'Token manquant / invalide' })
        }

        // 2. Récupérer l'ID du deck en paramètre et chercher le deck en base
        // Convertir l'ID en entier (params arrivent comme strings)
        const deckId = parseInt(req.params.id)

        const deck = await prisma.deck.findUnique({
            where: { id: deckId },
        });

        // Si le deck n'existe pas, retourner 404
        if (!deck) {
            return res.status(404).json({ error: 'Deck inexistant' })
        }

        // 3. Vérifier que le deck appartient à l'utilisateur authentifié
        // Évite que les utilisateurs suppriment les decks d'autres utilisateurs
        const userId = req.user.userId

        if (deck.userId !== userId) {
            return res.status(403).json({ error: 'Le deck n\'appartient pas à cet utilisateur' })
        }

        // 4. Supprimer les associations deckCard du deck
        // IMPORTANT: Supprimer en premier (clés étrangères)
        // Si on supprime le deck en premier, les deckCards deviendraient orphelines
        await prisma.deckCard.deleteMany({
            where: {
                deckId: deck.id,
            },
        })

        // 5. Supprimer le deck lui-même de la base de données
        // Toutes les associations étant supprimées, c'est maintenant sûr
        await prisma.deck.delete({
            where: {
                id: deck.id,
            },
        })

        // 6. Retourner une confirmation de suppression
        // Inclure l'ID et le nom pour confirmation par le client
        return res.status(200).json({
            message: 'Deck supprimé avec succès',
            id: deck.id,
            name: deck.name,
            userId: deck.userId,
        })
    } catch (error) {
        console.error('Erreur lors de la supression du deck :', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
})