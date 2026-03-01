import jwt from 'jsonwebtoken';
import { env } from './env';
import { Socket } from 'socket.io';

// Étendre le type SocketData pour y ajouter la propriété user
declare module 'socket.io' {
    interface SocketData {
        user?: {
            userId: number;
            email: string;
        };
    }
}

/**
 * Middleware d'authentification pour Socket.IO
 *
 * Requiert que le client envoie un champ `auth.token` durant la phase de handshake.
 * Si le token est manquant ou invalide, la connexion est rejetée via une erreur.
 * Si le token est valide, les informations extraites du JWT sont injectées
 * dans `socket.data.user` et la connexion est autorisée.
 */
export function authenticateSocket(
    socket: Socket,
    next: (err?: any) => void
) {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
        // aucun token fourni
        return next(new Error('Token manquant'));
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || env.JWT_SECRET
        ) as { userId: number; email: string };

        // Attacher les données utilisateur au socket pour qu'elles soient accessibles via socket.data.user
        socket.data.user = {
            userId: decoded.userId,
            email: decoded.email,
        };

        return next();
    } catch (err) {
        // signature invalide, expiré ou autre erreur
        return next(new Error('Authentification invalide'));
    }
}
