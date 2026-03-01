import {env} from "./env";
import express from "express";
import cors from "cors";
import {authRouter} from "./auth.route";
import {cardsRouter} from "./cards.route";
import {decksRouter} from "./decks.route";
import swaggerUi from 'swagger-ui-express';
import {swaggerDocument} from './docs';
import {Server} from 'socket.io'
import * as http from "node:http";
import { authenticateSocket } from './auth.socket';

// Create Express app
export const app = express();

export const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: '*',
    },
});

io.use(authenticateSocket);

// Middlewares
app.use(
    cors({
        origin: true,  // Autorise toutes les origines
        credentials: true,
    }),
);

app.use(express.json());

// Documentation Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "API Pokémon Documentation"
}))

app.use(authRouter);

app.use(cardsRouter);

app.use(decksRouter);

// Serve static files (Socket.io test client)
app.use(express.static('public'));

// Health check endpoint
app.get("/api/health", (_req, res) => {
    res.json({status: "ok", message: "TCG Backend Server is running"});
});

// Start server only if this file is run directly (not imported for tests)
if (require.main === module) {
    // Start server
    try {
        server.listen(env.PORT, () => {
            console.log(`\n🚀 Server is running on http://localhost:${env.PORT}`);
            console.log(`🧪 Socket.io Test Client available at http://localhost:${env.PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
