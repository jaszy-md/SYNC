import { stage01Config } from '../stage01Config.js';

// Add investigation prerequisites here before revealing a phase's puzzle hint.
export const stage01Hints = {
  SYMBOLS: {
    investigated: (stage) => stage.symbolPuzzle.clue.state === 'READ',
    prompt: 'Misschien vertelt de hoge access-terminal je iets. Laat de Explorer die onderzoeken.',
  },
};

export function getStage01Communication(stage) {
  if (!stage.progress.hintUnlocked) return stage01Config.hints.lockedMessage;
  const hint = stage01Hints[stage.phase];
  return hint && !hint.investigated(stage) ? hint.prompt : getStage01Hint(stage).text;
}

export function getStage01Hint(stage) {
  if (stage.phase === 'SYMBOLS')
    return {
      id: 'symbols',
      x: 215,
      y: 562,
      text: 'Explorer: spring naar de hoge terminal en lees de twee symbolen met interactie. Blijf erbij. Tech: match beneden beide symbolen in volgorde om de batterij-kooi te openen.',
    };
  if (stage.phase === 'ENTRY')
    return {
      id: 'entry',
      x: 215,
      y: 562,
      text: 'Tech: pak de gele energiecel met interactie. Explorer: spring vanaf de start op het linker platform en blijf op de drukplaat. Tech kan dan door sluis 1 en de cel in aansluiting I zetten.',
    };
  if (stage.phase === 'TRANSFER' && stage.cell.state === 'SOCKET_A')
    return {
      id: 'climb',
      x: stage.winch.x,
      y: stage.winch.y,
      text: 'Explorer: spring via de gevoede brug naar dit vaste platform. Ga naar de lier rechts en houd interactie vast. Tech kan de cel nu weer meenemen; de brug verdwijnt.',
    };
  if (stage.phase === 'TRANSFER')
    return {
      id: 'transfer',
      x: 798,
      y: 562,
      text: 'Explorer: houd de lier vast om sluis 2 open te houden. Tech: kruip met de cel onder de balk door en zet hem in aansluiting II rechts. Laat de lier pas los wanneer je partner erdoor is.',
    };
  if (stage.phase === 'CHARGE')
    return {
      id: 'charge',
      x: 1017,
      y: 559,
      text: 'P1 op het linker contact, P2 rechts. Houd samen interactie vast tot de batterij opgeladen is. De sleutel komt dan vrij op het hoge platform links.',
    };
  if (stage.phase === 'KEY')
    return {
      id: 'key',
      x: stage.key.x,
      y: stage.key.y,
      text: 'Explorer: pak de autorisatiesleutel uit de beveiligingskluis linksboven. Ga daarna met je partner terug naar de uitgang helemaal rechts.',
    };
  return {
    id: 'exit',
    x: 1135,
    y: 559,
    text: 'De Explorer draagt de sleutel: gebruik interactie bij de deur om te ontgrendelen. Kom daarna allebei bij de uitgang en houd samen interactie vast.',
  };
}
