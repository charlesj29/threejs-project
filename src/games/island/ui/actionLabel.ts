// What the interact button would do right now, as a word under it.
import type { GameState } from '../core/game/gameState';
import { isSoakSeat } from '../core/systems/seat';

/** Things you read rather than look at. */
const READABLE = new Set(['sign', 'mailbox']);

/** What pressing the button would do right now (null: nothing in reach). */
export function actionLabel(game: GameState): string | null {
  const { dialog, player, interactTarget } = game;
  if (dialog) return dialog.page < dialog.pages.length - 1 ? 'Next' : 'Close';
  if (player.sitting) return player.sitting.soaking ? 'Get out' : 'Stand';
  if (!interactTarget) return null;
  if (interactTarget.kind === 'villager') return 'Talk';
  if (interactTarget.sit) return isSoakSeat(interactTarget.object) ? 'Soak' : 'Sit';
  if (interactTarget.panel) return 'Look';
  return READABLE.has(interactTarget.object.kind) ? 'Read' : 'Look';
}
