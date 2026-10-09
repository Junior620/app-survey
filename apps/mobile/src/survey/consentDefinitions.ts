import { CONSENT_POLICY } from './consentPolicy';

const AGENT_TOKEN = "[NOM DE L'AGENT]";

const TEXTS: Record<string, { fr: string; en: string }> = {
  v1: {
    fr: `Bonjour,

Je m'appelle [NOM DE L'AGENT] et je suis ici au nom du Centre commun de recherche de la Commission européenne.

Nous conduisons une étude sur la culture du cacao et sur la filière au Cameroun.

Votre ménage a été sélectionné au hasard pour participer à cette étude.

La participation à cette enquête se fait sur la base du volontariat et vous pouvez arrêter l'entretien quand vous le souhaitez.

Les informations que vous partagerez resteront confidentielles et seront utilisées uniquement dans le cadre de cette étude, notamment pour l'élaboration de statistiques, de documents informatifs et de rapports.

L'objectif de cette enquête est d'aider les organisations à concevoir de meilleurs projets à l'avenir.

Le document DPR-EC-01011 fournit de plus amples informations sur la manière dont la Commission européenne utilise et protège vos données personnelles.`,
    en: `Hello,

My name is [NOM DE L'AGENT] and I am here on behalf of the Joint Research Centre of the European Commission.

We are conducting a study on cocoa farming and the cocoa sector in Cameroon.

Your household was selected at random to take part in this study.

Participation in this survey is voluntary and you may stop the interview whenever you wish.

The information you share will remain confidential and will be used only for this study, in particular to produce statistics, information materials and reports.

The aim of this survey is to help organisations design better projects in the future.

Document DPR-EC-01011 gives further information on how the European Commission uses and protects your personal data.`,
  },
};

export function consentBody(locale: string, agentName: string, version = CONSENT_POLICY.version): string {
  const entry = TEXTS[version] ?? TEXTS.v1!;
  const raw = locale.startsWith('en') ? entry.en : entry.fr;
  const name = agentName.trim() || '—';
  return raw.split(AGENT_TOKEN).join(name);
}
