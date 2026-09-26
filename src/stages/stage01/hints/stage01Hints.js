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
      text: 'Ga op jullie eigen gemarkeerde vloercontact staan: P1 links, P2 rechts. Houd allebei interactie vast tot de ring gevuld is. Daarmee verschijnen het sleutelplatform en de sleutel, niet een open deur.',
    };
  if (stage.phase === 'KEY')
    return {
      id: 'key',
      x: 922,
      y: 562,
      text: 'Explorer: neem links van het nieuwe platform een aanloop en spring naar de sleutel. Pak hem met interactie. Neem hem mee naar de deur en ontgrendel die daar.',
    };
  return {
    id: 'exit',
    x: 1135,
    y: 559,
    text: 'De Explorer draagt de sleutel: gebruik interactie bij de deur om te ontgrendelen. Kom daarna allebei bij de uitgang en houd samen interactie vast.',
  };
}
