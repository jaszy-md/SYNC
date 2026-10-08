export function helperCharacterView() {
  return (
    '<svg viewBox="0 0 64 64" aria-hidden="true" shape-rendering="crispEdges" class="helper-character">' +
    '<path fill="#142026" d="M8 51h48v6H8zM13 25h38v25H13z"/>' +
    '<path fill="#798886" d="M28 6h8v5h-8zM31 11h2v9h-2zM12 21h40v26H12zM8 27h4v15H8zM52 27h4v15h-4z"/>' +
    '<path fill="#bac3ac" d="M15 23h34v3H15zM18 49h28v8H18z"/>' +
    '<path fill="#192b32" d="M16 28h32v15H16zM22 52h20v3H22z"/>' +
    '<path fill="#9dcfc5" d="M21 31h6v5h-6zM37 31h6v5h-6z"/>' +
    '<path class="helper-mouth-closed" fill="#9dcfc5" d="M28 39h8v2h-8z"/>' +
    '<path class="helper-mouth-open" fill="#9dcfc5" d="M28 38h8v5h-8z"/>' +
    '<path class="helper-link-light" fill="#a69d6e" d="M28 6h8v5h-8z"/></svg>'
  );
}

export function facilityHudView() {
  return (
    '<span id="gem-flight" class="gem-flight" aria-hidden="true" hidden>◆</span>' +
    '<nav id="game-controls" aria-label="Facility HUD">' +
    '<div class="helper-station"><button id="helper" class="hud-object" aria-label="Praat met Mica, de hint-helper" title="Praat met Mica">' +
    helperCharacterView() +
    '<span class="helper-label" aria-hidden="true">HINT</span></button><i class="hud-link" aria-hidden="true"></i></div>' +
    '<span class="hud-cable" aria-hidden="true"></span>' +
    '<div class="hidden-gems" role="group" aria-label="Hidden Gems"><span id="gem-blue" class="gem-slot blue" role="img" aria-label="Blue Gem: niet verzameld">◇</span><span id="gem-green" class="gem-slot green" role="img" aria-label="Green Gem: niet verzameld">◇</span><span id="gem-gold" class="gem-slot gold" role="img" aria-label="Gold Gem: niet verzameld">◇</span></div>' +
    '<span class="hud-navigation" aria-hidden="true">TAB / VIEW · ESC / B</span>' +
    '<div class="hud-tools"><button id="map" class="hud-object map-object" aria-label="Open de Escape Chain-wereldkaart" aria-haspopup="dialog" aria-expanded="false" title="Escape Chain-wereldkaart">' +
    '<span class="map-icon-fallback" aria-hidden="true"><svg viewBox="0 0 56 56"><path fill="#a7ab94" stroke="#4f5951" stroke-width="2" d="m8 15 13-4 13 4 14-4v30l-14 4-13-4-13 4z"/><path stroke="#687769" fill="none" d="M21 11v30m13-26v30M12 33l13-9 10 8 9-12"/><circle cx="25" cy="24" r="3" fill="#344d4d"/></svg></span><img class="hud-map-image" alt="" hidden /></button>' +
    '<button id="pause" class="hud-object system-object" aria-label="Open systeem en instellingen" title="Systeem en instellingen" hidden>' +
    '<svg viewBox="0 0 56 56" aria-hidden="true" shape-rendering="crispEdges"><path fill="#677676" d="M23 6h10v6h9v9h7v14h-7v9h-9v6H23v-6h-9v-9H7V21h7v-9h9z"/><path fill="#17272d" d="M17 17h22v22H17z"/><path stroke="#b4c5b9" stroke-width="2" fill="none" d="M28 18v13m-7-9a11 11 0 1 0 14 0"/></svg></button></div></nav>' +
    '<aside id="helper-bubble" class="helper-bubble" hidden aria-label="Mica spreekt"><span class="helper-name">MICA <small>/ onderhoudseenheid</small></span><button id="close-speech" aria-label="Sluit praatwolkje" class="bubble-close">×</button><p id="helper-text" aria-hidden="true"></p><span id="helper-announcement" class="sr-only" role="status" aria-live="polite"></span></aside>' +
    '<dialog id="facility-map" aria-labelledby="map-title"><article class="map-document"><header class="map-heading"><div><small>SYNC / WERELDATLAS</small><h2 id="map-title">Escape Chain</h2></div><button id="close-map" class="map-close" aria-label="Sluit de kaart"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 6 13 13 24 25M6 8 17 18 25 24M25 6 18 14 7 26M23 7 15 17 8 24" /></svg></button></header><div class="map-image-frame"><img id="map-image" alt="Kaart van de volledige Escape Chain-wereld" hidden /><div id="map-fallback">' +
    mapFallbackView() +
    '</div></div><p class="map-caption">ESCAPE CHAIN · WERELDKAART <span>ESC / B · terug naar de wereld</span></p></article></dialog>'
  );
}

function mapFallbackView() {
  return '<p class="map-unavailable" role="status">Wereldkaart tijdelijk niet beschikbaar.</p>';
}
