import {Request, Response, Router} from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {prisma} from "../src/database";

export const authRouter = Router()

/**
 * POST /api/auth/sign-up
 * 
 * Crée un nouveau compte utilisateur et retourne un JWT pour la session initiale.
 * 
 * Valide la présence des données requises, vérifie que l'email n'est pas déjà enregistré,
 * hash le mot de passe, crée l'utilisateur en base de données et génère un token JWT.
 * Le token expire après 7 jours.
 * 
 * @route POST /api/auth/sign-up
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Email unique de l'utilisateur (requis, validation basique)
 * @param {string} req.body.username - Nom d'utilisateur (requis, non-vide)
 * @param {string} req.body.password - Mot de passe en clair (requis, sera hashé avec bcryptjs)
 * @returns {Object} Response d'Express
 * @returns {number} 201 - Inscription réussie
 * @returns {string} response.body.message - Message de confirmation
 * @returns {string} response.body.token - JWT token valide pour 7 jours
 * @returns {Object} response.body.user - Informations publiques de l'utilisateur créé
 * @returns {number} response.body.user.id - ID unique de l'utilisateur
 * @returns {string} response.body.user.username - Nom d'utilisateur choisi
 * @returns {string} response.body.user.email - Email enregistré
 * 
 * @throws {400} - Données manquantes ou invalides (email, username ou password missing)
 * @throws {409} - Conflict : l'email est déjà utilisé par un autre utilisateur
 * @throws {500} - Erreur serveur lors du hash du mot de passe
 * @throws {500} - Erreur serveur lors de la création de l'utilisateur en base
 * @throws {500} - Erreur serveur lors de la génération du JWT
 * @throws {500} - Erreur serveur lors de la vérification de création
 * 
 * @example
 * // Créer un nouveau compte utilisateur
 * const response = await fetch('/api/auth/sign-up', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     email: 'john.doe@example.com',
 *     username: 'JohnDoe',
 *     password: 'SecurePassword123!'
 *   })
 * })
 * const data = await response.json()
 * // data.token est utilisable dans Authorization header pour requêtes protégées
 */
authRouter.post('/api/auth/sign-up', async (req: Request, res: Response) => {
    const {email, username, password} = req.body

    try {
        // 1. Vérifier que toutes les données requises soient présentes et valides
        if (!email || !username || !password) {
            return res.status(400).json({error: 'Données manquantes / invalides'})
        }

        // 2. Vérifier si un utilisateur avec cet email existe déjà
        // Prévient les doublons et les enregistrements multiples du même email
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (user) {
            return res.status(409).json({error: 'Email incorrecte'})
        }

        // 3. Hash le mot de passe avec bcryptjs
        // Le mot de passe original ne doit jamais être stocké en base
        const hashedPassword = await bcrypt.hash(password, 10);

        // Créer l'enregistrement utilisateur avec les données fournies et le mot de passe hashé
        await prisma.user.create({
            data: {
                username: username,
                email: email,
                password: hashedPassword,
            }
        });

        // Vérifier que l'utilisateur a bien été créé en base
        const createdUser = await prisma.user.findUnique({
            where: {email},
        })

        if (!createdUser) {
            return res.status(500).json({error: 'Erreur lors de l\'inscription'})
        }

        // 4. Générer un JWT pour l'utilisateur nouvellement créé
        // Le token encode userId et email et expire après 7 jours
        const token = jwt.sign(
            {
                userId: createdUser.id,
                email: createdUser.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 5. Retourner le token et les informations publiques de l'utilisateur
        return res.status(201).json({
            message: 'Inscription réussie',
            token,
            user: {
                id: createdUser.id,
                username: createdUser.username,
                email: createdUser.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})

/**
 * POST /api/auth/sign-in
 * 
 * Authentifie un utilisateur existant et retourne un JWT pour accéder aux ressources protégées.
 * 
 * Valide la présence des données, recherche l'utilisateur par email, compare le mot de passe
 * fourni avec le hash stocké en base, et génère un token JWT en cas de succès.
 * Le token expire après 7 jours.
 * 
 * @route POST /api/auth/sign-in
 * @param {Object} req.body - Corps de la requête
 * @param {string} req.body.email - Email de l'utilisateur (requis)
 * @param {string} req.body.password - Mot de passe en clair (requis)
 * @returns {Object} Response d'Express
 * @returns {number} 200 - Connexion réussie
 * @returns {string} response.body.message - Message de confirmation
 * @returns {string} response.body.token - JWT token valide pour 7 jours
 * @returns {Object} response.body.user - Informations publiques de l'utilisateur
 * @returns {number} response.body.user.id - ID unique de l'utilisateur
 * @returns {string} response.body.user.username - Nom d'utilisateur
 * @returns {string} response.body.user.email - Email de l'utilisateur
 * 
 * @throws {400} - Données manquantes ou invalides (email ou password missing)
 * @throws {401} - Authentification échouée : email non trouvé OU mot de passe incorrect
 * @throws {500} - Erreur serveur lors de la recherche de l'utilisateur
 * @throws {500} - Erreur serveur lors de la vérification du mot de passe
 * @throws {500} - Erreur serveur lors de la génération du JWT
 * 
 * @note Le message d'erreur 401 ne précise pas si c'est l'email ou le mot de passe qui est incorrect
 *       pour des raisons de sécurité (prévention de énumération d'emails)
 * 
 * @example
 * // Connexion avec email et mot de passe
 * const response = await fetch('/api/auth/sign-in', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     email: 'john.doe@example.com',
 *     password: 'SecurePassword123!'
 *   })
 * })
 * const data = await response.json()
 * // Utiliser data.token dans header Authorization: "Bearer <token>"
 */
authRouter.post('/api/auth/sign-in', async (req: Request, res: Response) => {
    const {email, password} = req.body

    try {
        // 1. Vérifier que les données requises sont présentes et valides
        if (!email || !password) {
            return res.status(400).json({error: 'Données manquantes / invalides'})
        }

        // 2. Rechercher l'utilisateur dans la base de données par email
        // Si l'utilisateur n'existe pas, findUnique retourne null
        const user = await prisma.user.findUnique({
            where: {email},
        })

        if (!user) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 3. Comparer le mot de passe fourni avec le hash stocké en base
        const isPasswordValid = await bcrypt.compare(password, user.password)

        if (!isPasswordValid) {
            return res.status(401).json({error: 'Email ou mot de passe incorrect'})
        }

        // 4. Générer un JWT pour cette session de connexion
        // Le token encode userId et email et expire après 7 jours
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.JWT_SECRET as string,
            {expiresIn: '7d'}, // Le token expire dans 7 jours
        )

        // 5. Retourner le token et les informations publiques de l'utilisateur
        return res.status(200).json({
            message: 'Connexion réussie',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        })
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)
        return res.status(500).json({error: 'Erreur serveur'})
    }
})