// What the villagers and signposts say to guide visitors to the studio.
// `{studio}` becomes the compass direction from the speaker to the studio
// ("east", "north-west", …), worked out for each island.

/**
 * A villager's first words, for what they're doing right now (the greeting
 * comes before their conversation). Wandering, it's just the time of day.
 */
export const ACTIVITY_GREETINGS: Readonly<Record<string, string>> = {
  bake: "Morning! The bread's still warm.",
  water: 'Morning! Just fetching water for the day.',
  sweep: "Keeping the doorstep tidy. Lovely day, isn't it?",
  fish: "Shh... I think something's biting.",
  read: 'Just a few more pages. Slow afternoons are the best.',
  gather: "Lovely evening, isn't it? The lights are coming on.",
  soak: 'Ahh... nothing like a warm soak before the evening. Hop in!',
};

/** By the part of the day: for wandering villagers, and the night owl after dark. */
export const TIME_GREETINGS: Readonly<Record<string, string>> = {
  dawn: "You're up early!",
  morning: 'Good morning!',
  afternoon: 'Good afternoon!',
  evening: "Good evening! Lovely, isn't it?",
  night: "Can't sleep either? The stars are lovely tonight.",
};

/**
 * Each villager's conversations, by look (farmer, girl, baker). Talking again
 * moves on to the next one; each conversation is the pages of one message.
 */
export const VILLAGER_TALKS: readonly (readonly (readonly string[])[])[] = [
  // The farmer.
  [
    [
      'New on the island?',
      "Charles works in his workspace, the log lodge {studio} of here. That's where he keeps his apps.",
    ],
    [
      'The lanterns at the workspace glow late most nights.',
      'If you want to see what Charles builds, head {studio}.',
    ],
    ['Mind the haystacks.'],
  ],
  // The girl.
  [
    [
      "Have you been to Charles's Workspace yet?",
      "It's the log lodge with the cedar roof, {studio} of here. Charles's work is all inside.",
    ],
    ['I love the phones on the shelf in the workspace. Each one is a project of his!'],
    [
      'Have you found the hot spring? It sits out among the trees, with a little stone lantern.',
      'I go for a soak every afternoon. Step in, the water is lovely and warm.',
    ],
    ['Say hello to Charles if you see him.'],
  ],
  // The baker.
  [
    [
      'Fresh bread every morning!',
      "Charles came by for a loaf. He's busy in his workspace, {studio} of here.",
    ],
    ["Looking for Charles's work? Walk {studio} to the log lodge with the carved sign."],
    ['Come back for a cinnamon roll sometime.'],
  ],
];

/** The places signposts point to. */
export const SIGN_LABELS = {
  studio: "Charles's Workspace",
  village: 'The Village',
  cottage: "Charles's Cottage",
} as const;

export type SignPlace = keyof typeof SIGN_LABELS;
