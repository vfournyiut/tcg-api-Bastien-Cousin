import { Request, Response, Router } from "express"
import { prisma } from "../src/database"

export const cardsRouter = Router()

// GET /api/cards
// Accessible via GET /api/cards
cardsRouter.get("/api/cards", async (_req: Request, res: Response) => {
    try {
        // 5. Retourner les cartes
        const cards = await prisma.card.findMany({
            orderBy: {
                pokedexNumber: "asc",
            },
        })
        return res.status(200).json({
            message: "Envoi des cartes réussie",
            cards,
        })
    } catch (error) {
        console.error("Erreur lors de l'envoi des cartes :", error)
        return res.status(500).json({ error: "Erreur serveur" })
    }
})
