export function getStage01Hint(stage) {
  if (stage.phase === 'TRANSFER' && !stage.coolingRepair.complete)
    return {
      id: 'cooling',
      x: 660,
      y: 267,
      text: 'Explorer: spring via de brug naar de diagnosemonitor. Lees de systeemnaam voor en houd interactie vast. Tech: open de koelterminal beneden, kies met links/rechts het genoemde systeem en bevestig met interactie. Bukken sluit het scherm. Bij drie resets werkt de lier.',
    };
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
      x: 670,
      y: 267,
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
      text: 'Generatorstart: P1 op het linker contact, P2 rechts. P1 drukt interactie, wacht op groen en drukt nogmaals. P2 bevestigt met interactie. Houd daarna beiden vast tot het systeem online is. Ga daarna terug naar de beveiligingskamer links voor de laatste archiefstoring.',
    };
  if (stage.phase === 'ARCHIVE')
    return {
      id: 'archive',
      x: 120,
      y: 562,
      text: 'De generator voedt nu de retourtrap en brug. Keer terug naar het archief links. Explorer: spring vanaf het eerste platform naar de beveiligingskamer erboven en houd de diagnosemonitor actief. Tech: open de archiefterminal op de begane grond. Herstel samen drie fouten om de sleutelkluis te openen.',
    };
  if (stage.phase === 'KEY')
    return {
      id: 'key',
      x: 202,
      y: 284,
      text: 'Explorer: pak de autorisatiesleutel uit de beveiligingskluis linksboven. Ga daarna met je partner terug naar de uitgang helemaal rechts.',
    };
  return {
    id: 'exit',
    x: 1135,
    y: 559,
    text: 'De Explorer draagt de sleutel: gebruik interactie bij de deur om te ontgrendelen. Kom daarna allebei bij de uitgang en houd samen interactie vast.',
  };
}
