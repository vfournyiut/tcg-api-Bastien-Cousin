import YAML from 'js-yaml'
import path from 'path'
import fs from 'fs'

/**
 * Charge la documentation Swagger complète en fusionnant la configuration principale
 * avec les documentations de chaque module (auth, cards, decks).
 * 
 * La configuration principale définit les infos générales, les serveurs,
 * les schémas réutilisables, et les schémas de sécurité.
 * 
 * Chaque fichier de documentation de module contient les paths (endpoints) spécifiques.
 * Cette agrégation permet une maintenabilité meilleure avec une séparation claire
 * des responsabilités par module.
 */

/**
 * Helper pour charger les fichiers YAML depuis le répertoire docs
 * Fonctionne en développement (charge depuis src/docs) et en production
 */
function loadYamlFile(filename: string): Record<string, any> {
    // Essayer d'abord depuis le répertoire source (développement)
    let filePath = path.join(process.cwd(), 'src', 'docs', filename)
    
    // Si le fichier n'existe pas, essayer depuis dist (production après compilation)
    if (!fs.existsSync(filePath)) {
        filePath = path.join(process.cwd(), 'dist', 'docs', filename)
    }

    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8')
        const loaded = YAML.load(fileContent) as Record<string, any>
        return loaded || {}
    } catch (error) {
        console.error(`Erreur lors du chargement de ${filename}:`, error)
        return {}
    }
}

// Charger la configuration principale (info, serveurs, composants, tags)
const swaggerConfig = loadYamlFile('swagger.config.yml')

// Charger les documentations des modules (endpoints)
const authDoc = loadYamlFile('auth.doc.yml')
const cardsDoc = loadYamlFile('cards.doc.yml')
const decksDoc = loadYamlFile('decks.doc.yml')

/**
 * Construit le document Swagger/OpenAPI complet en fusionnant :
 * - La configuration principale (info, serveurs, composants, tags)
 * - Les paths de tous les modules (auth, cards, decks)
 */
export const swaggerDocument = {
    // Copier toute la configuration principale
    ...swaggerConfig,
    // Fusionner tous les paths depuis les modules
    paths: {
        ...(authDoc?.paths || {}),
        ...(cardsDoc?.paths || {}),
        ...(decksDoc?.paths || {})
    }
}