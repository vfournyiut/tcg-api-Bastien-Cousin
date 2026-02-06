import {Request, Response, Router} from 'express'
import {prisma} from "../src/database";
import {authenticateToken} from "./auth.middleware";

export const decksRouter = Router()

// POST /api/decks
// Accessible via POST /api/decks
decksRouter.post('/api/decks', authenticateToken, async (req: Request, res: Response) => {
    const {name, cards} = req.body

    try {
        // 1. Vérifier que le token est présent et valide
        if (!req.user) {
            return res.status(401).json({error: 'Token manquant / invalide'})
        }

        // 2. Vérifier que le nom est présent
        if (!name) {
            return res.status(400).json({error: 'Nom du deck manquant'})
        }

        // 3. Vérifier le type de cards et le nombre de cartes dans le deck
        if (!Array.isArray(cards) || cards.length !== 10) {
            return res.status(400).json({error: 'Le deck ne possède pas exactement 10 cartes'})
        }

        // 4. Vérifier si les numéros de pokédex des pokémons du deck sont valides
        const result = await prisma.card.aggregate({
            _max: {
                pokedexNumber: true,
            },
        })

        const numMaxPokemon = result._max.pokedexNumber
        if (!numMaxPokemon) {
            return res.status(500).json({error: 'Erreur serveur'})
        }

        for(let i: number = 0; i < cards.length; i++) {
            if (cards[i] < 1 && cards[i] > numMaxPokemon) {
                return res.status(400).json({error: 'Un ou plusieurs id des pokémons du deck sont invalides'})
            }
        }

        // 5. Créer le deck avec les 10 cartes en base de données
        const deck = await prisma.deck.create({
            data: {
                name: name,
                userId: req.user.userId,
            }
        });

        const deckCards = await prisma.card.findMany({
            where: {
                pokedexNumber: {
                    in: cards,
                },
            },
        });

        await prisma.deckCard.createMany({
            data: deckCards.map(card => ({
                cardId: card.id,
                deckId: deck.id,
            })),
        });

        // 6. Retourner le deck créé
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
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// GET /api/decks/mine
// Accessible via GET /api/decks/mine
decksRouter.get('/api/decks/mine', authenticateToken, async (req: Request, res: Response) => {
    try {
        // 1. Vérifier que le token est présent et valide
        if (!req.user) {
            return res.status(401).json({error: 'Token manquant / invalide'})
        }

        // 2. Récupérer la liste des decks de cet utilisateur
        const userId = req.user.userId

        const decks = await prisma.deck.findMany({
            where: {userId},
        });

        // 3. Vérifier si la liste des decks est vide ou non
        if (!decks) {
            return res.status(200).json({
                message: '[]',
            })
        }

        // 4. Retourner les decks de l'utilisateur avec leurs cartes
        const decksWithCards = await Promise.all(
            decks.map(async (deck) => {
                const deckCards = await prisma.deckCard.findMany({
                    where: { deckId: deck.id },
                });

                const cards = await prisma.card.findMany({
                    where: {
                        id: {
                            in: deckCards.map(deckCard => deckCard.cardId),
                        },
                    },
                });

                return {
                    id: deck.id,
                    name: deck.name,
                    cards: cards,
                    userId: deck.userId,
                };
            })
        );

        return res.status(200).json({
            message: 'Decks récupérés avec succès',
            decks: decksWithCards,
        })
    } catch (error) {
        console.error('Erreur lors de la récupération des decks :', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// GET /api/decks/:id
// Accessible via GET /api/decks/:id
decksRouter.get('/api/decks/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        // 1. Vérifier que le token est présent et valide
        if (!req.user) {
            return res.status(401).json({error: 'Token manquant / invalide'})
        }

        // 2. Récupérer l'id en paramètre, puis récupérer le deck et vérifier si l'id de ce deck existe
        const deckId = parseInt(req.params.id)

        const deck = await prisma.deck.findUnique({
            where: {id: deckId},
        });

        if (!deck) {
            return res.status(404).json({error: 'Deck inexistant'})
        }

        // 3. Vérifier si le deck appartient à l'utilisateur
        const userId = req.user.userId

        if (deck.userId !== userId) {
            return res.status(403).json({error: 'Le deck n\'appartient pas à cet utilisateur'})
        }

        // 4. Retourner le deck de l'utilisateur avec ses cartes
        const deckCards = await prisma.deckCard.findMany({
            where: { deckId: deck.id },
        });

        const cards = await prisma.card.findMany({
            where: {
                id: {
                    in: deckCards.map(deckCard => deckCard.cardId),
                },
            },
        });

        return res.status(200).json({
            message: 'Deck récupéré avec succès',
            id: deck.id,
            name: deck.name,
            cards: cards,
            userId: deck.userId,
        })
    } catch (error) {
        console.error('Erreur lors de la récupération du deck :', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// PATCH /api/decks/:id
// Accessible via PATCH /api/decks/:id
decksRouter.patch('/api/decks/:id', authenticateToken, async (req: Request, res: Response) => {
    const {name, modifiedCards} = req.body
    
    try {
        // 1. Vérifier que le token est présent et valide
        if (!req.user) {
            return res.status(401).json({error: 'Token manquant / invalide'})
        }

        // 2. Récupérer l'id en paramètre, puis récupérer le deck et vérifier si l'id de ce deck existe
        const deckId = parseInt(req.params.id)

        const deck = await prisma.deck.findUnique({
            where: {id: deckId},
        });

        if (!deck) {
            return res.status(404).json({error: 'Deck inexistant'})
        }

        // 3. Vérifier si le deck appartient à l'utilisateur
        const userId = req.user.userId

        if (deck.userId !== userId) {
            return res.status(403).json({error: 'Le deck n\'appartient pas à cet utilisateur'})
        }

        // 4. Vérifier le type de cards et le nombre de cartes dans le deck
        if (!Array.isArray(modifiedCards) || modifiedCards.length !== 10) {
            return res.status(400).json({error: 'Le deck ne possède pas exactement 10 cartes'})
        }
        
        // 5. Vérifier si les numéros de pokédex des pokémons du deck sont valides
        const result = await prisma.card.aggregate({
            _max: {
                pokedexNumber: true,
            },
        })

        const numMaxPokemon = result._max.pokedexNumber
        if (!numMaxPokemon) {
            return res.status(500).json({error: 'Erreur serveur'})
        }

        for(let i: number = 0; i < modifiedCards.length; i++) {
            if (modifiedCards[i] < 1 && modifiedCards[i] > numMaxPokemon) {
                return res.status(400).json({error: 'Un ou plusieurs id des pokémons du deck sont invalides'})
            }
        }

        // 6. Modifier le deck de l'utilisateur et lui renvoyer
        const newCards = await prisma.card.findMany({
            where: {
                pokedexNumber: {
                    in: modifiedCards,
                },
            },
        });

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

        await prisma.deckCard.deleteMany({
            where: {
                deckId: deck.id,
            },
        })

        await prisma.deckCard.createMany({
            data: newCards.map(card => ({
                deckId: deck.id,
                cardId: card.id,
            })),
        })

        return res.status(200).json({
            message: 'Deck modifié avec succès',
            id: deck.id,
            name: deck.name,
            cards: newCards,
            userId: deck.userId,
        })
    } catch (error) {
        console.error('Erreur lors de la modification du deck :', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

// DELETE /api/decks/:id
// Accessible via DELETE /api/decks/:id
decksRouter.delete('/api/decks/:id', authenticateToken, async (req: Request, res: Response) => {
    
    try {
        // 1. Vérifier que le token est présent et valide
        if (!req.user) {
            return res.status(401).json({error: 'Token manquant / invalide'})
        }

        // 2. Récupérer l'id en paramètre, puis récupérer le deck et vérifier si l'id de ce deck existe
        const deckId = parseInt(req.params.id)

        const deck = await prisma.deck.findUnique({
            where: {id: deckId},
        });

        if (!deck) {
            return res.status(404).json({error: 'Deck inexistant'})
        }

        // 3. Vérifier si le deck appartient à l'utilisateur
        const userId = req.user.userId

        if (deck.userId !== userId) {
            return res.status(403).json({error: 'Le deck n\'appartient pas à cet utilisateur'})
        }

        // 4. Supprimer le deck de l'utilisateur et les deckCards associés
        await prisma.deckCard.deleteMany({
            where: {
                deckId: deck.id,
            },
        })

        await prisma.deck.delete({
            where: {
                id: deck.id,
            },
        })

        return res.status(200).json({
            message: 'Deck supprimé avec succès',
            id: deck.id,
            name: deck.name,
            userId: deck.userId,
        })
    } catch (error) {
        console.error('Erreur lors de la supression du deck :', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})