// Presentation data only. Player abilities, weapon permissions and puzzles stay
// owned by their existing gameplay modules. Add future stage briefings here.
export const STAGE_BRIEFINGS = {
  1: {
    id: 1,
    label: 'STAGE 01',
    name: 'ABANDONED FACILITY',
    subtitle: 'Different strengths. One way out.',
    teamwork: 'Combine your strengths to escape.',
    players: [
      {
        role: 'Explorer',
        skill: {
          icon: 'jump',
          title: 'HIGH JUMP',
          description: 'Great at reaching higher places.',
        },
        weakness: {
          icon: 'battery',
          title: 'TECH PUZZLES',
          description: 'Not great with batteries and electrical systems.',
        },
      },
      {
        role: 'Tech',
        skill: {
          icon: 'shoot',
          title: 'SHOOTING',
          description: 'Skilled at handling weapons and electrical systems.',
        },
        weakness: {
          icon: 'low-jump',
          title: 'LOW JUMP',
          description: 'Has trouble reaching higher platforms.',
        },
      },
    ],
  },
  2: {
    id: 2,
    label: 'STAGE 02',
    name: 'JUNGLE',
    subtitle: 'De jungle wacht op jullie.',
    teamwork: 'Ga samen op verkenning.',
    players: Array.from({ length: 2 }, () => ({
      role: 'Jungle',
      skill: { icon: 'pending', title: 'To be determined' },
      weakness: { icon: 'pending', title: 'To be determined' },
    })),
  },
};

export function getStageBriefing(id) {
  const briefing = STAGE_BRIEFINGS[id];
  if (!briefing) throw new Error(`No briefing configured for stage ${id}`);
  return briefing;
}
