import { BoardProps } from 'boardgame.io/react';
import { ProgrammableCardsState } from './Game';
import { Ctx } from 'boardgame.io';

const getWinner = (ctx: Ctx): string | null => {
  if (!ctx.gameover) return null;
  if (ctx.gameover.draw) return 'Draw';
  return `Player ${ctx.gameover.winner} wins!`;
};

export const ProgrammableCardsBoard = ({ G, ctx, moves }: BoardProps<ProgrammableCardsState>) => {
  let winner = getWinner(ctx);

  return (
    <main>
      <h1>Programmable Cards</h1>
      <p>By SOMAS, MasterTech, and Endless</p>

      {winner && <p>{winner}</p>}
    </main>
  );
};
