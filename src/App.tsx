import { Client } from 'boardgame.io/react';

import { ProgrammableCards } from './Game';
import { ProgrammableCardsBoard } from './Board';

const App = Client({
  game: ProgrammableCards,
  board: ProgrammableCardsBoard
});

export default App;
