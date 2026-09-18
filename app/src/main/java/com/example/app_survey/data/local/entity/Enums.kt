package com.example.app_survey.data.local.entity

/**
 * Axe d'évaluation pour le moteur de détection AFREXIA
 */
enum class AxeSignal {
    PROTECTION_ENFANT,
    TRACABILITE,
    QUALITE_DONNEES
}

/**
 * Priorité / Sévérité du signal
 */
enum class PrioriteSignal {
    CRITIQUE,
    ELEVE,
    MODERE,
    FAIBLE,
    NON_EVALUABLE,
    NON_EVALUE
}

/**
 * Qualification administrative ou terrain du signal
 */
enum class QualificationSignal {
    A_VERIFIER,
    EN_VERIFICATION,
    CONFIRME,
    REFUTE
}

/**
 * Statut du suivi de la remédiation
 */
enum class StatutSuivi {
    OUVERT,
    EN_COURS,
    RESOLU,
    A_REEVALUER
}

/**
 * Statut logistique du lot de cacao / récolte
 */
enum class StatutLogistique {
    EN_TRANSIT,
    MAGASIN,
    EXPEDIE
}

/**
 * Méthode de mesure de la superficie de plantation
 */
enum class MethodeMesure {
    GPS,
    MANUEL,
    ESTIMATION
}

/**
 * Type de visite sur le terrain
 */
enum class TypeVisite {
    ROUTINE,
    SIGNALEMENT,
    SUIVI,
    ANNUELLE
}

/**
 * Rôle de l'utilisateur de l'application (Masquage RBAC)
 */
enum class RoleUtilisateur {
    CDC,                   // Agent Terrain / Agent de Plaine
    RESPONSABLE_DURABILITE // Responsable / Manager Durabilité
}

/**
 * Mode de renseignement de l'âge de l'enfant
 */
enum class TypeAge {
    DATE_NAISSANCE_EXACTE,
    INTERVALLE_AGE_ESTIME
}

/**
 * Réponse pour les tâches et activités à risque (Cards Oui/Non/Inconnu)
 */
enum class ReponseRisque {
    OUI,
    NON,
    INCONNU
}

