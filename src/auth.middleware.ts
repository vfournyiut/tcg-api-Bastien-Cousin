import {NextFunction, Request, Response} from 'express'
import jwt from 'jsonwebtoken'

// Étendre le type Request pour ajouter userId
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: number,
                email: string
            }
        }
    }
}

/**
 * Middleware d'authentification JWT pour routes protégées
 * 
 * Valide la présence et la validité d'un token JWT dans l'en-tête Authorization.
 * Si le token est valide, ajoute les informations de l'utilisateur (userId, email) à req.user
 * et appelle next() pour continuer vers la route.
 * Si le token est invalide/manquant/expiré, retourne une erreur 401.
 * 
 * @middleware authenticateToken
 * @param {Request} req - Objet requête Express
 * @param {string} [req.headers.authorization] - Header Authorization au format "Bearer <token>"
 * @param {Response} res - Objet réponse Express
 * @param {NextFunction} next - Fonction callback pour passer au middleware suivant ou à la route
 * 
 * @returns {void} Appelle next() si succès, retourne une réponse 401 sinon
 * @returns {number} 401 - Token manquant ou invalide
 * 
 * @throws {401} - Token manquant : l'en-tête Authorization n'est pas présent
 * @throws {401} - Token invalide : la signature JWT est incorrecte
 * @throws {401} - Token expiré : la date d'expiration du token est passée
 * @throws {401} - Erreur lors de la vérification du token JWT
 * 
 * @example
 * // Utilisation dans une route protégée
 * router.get('/api/protected', authenticateToken, (req, res) => {\n *   // req.user est maintenant disponible et contient { userId, email }\n *   console.log(req.user.userId) // 123\n *   console.log(req.user.email)  // 'user@example.com'\n * })\n * \n * @example\n * // Format du header Authorization requis\n * // Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQ...\n * \n * @example\n * // Contenu du token décodé (payload)\n * // {\n * //   userId: 123,\n * //   email: 'user@example.com',\n * //   iat: 1702389600,\n * //   exp: 1703080800\n * // }\n */
export const authenticateToken = (   
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    // 1. Récupérer le token depuis l'en-tête Authorization
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Format: "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({error: 'Token manquant'})
    }

    try {
        // 2. Vérifier et décoder le token JWT
        // jwt.verify valide la signature et vérifie l'expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: number
            email: string
        }

        // 3. Ajouter les informations utilisateur à l'objet request
        // Ces données seront disponibles dans les routes protégées via req.user
        req.user = {
            userId: decoded.userId,
            email: decoded.email
        }

        // 4. Passer au prochain middleware ou à la route
        // Le code de la route peut maintenant utiliser req.user
        return next()
    } catch (error) {
        // jwt.verify lève une exception si:
        // - La signature est invalide
        // - Le token a expiré
        // - Le token est malformé
        return res.status(401).json({error: 'Token invalide ou expiré'})
    }
}
