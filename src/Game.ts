import { Ctx, Game, LongFormMove } from 'boardgame.io';
import { INVALID_MOVE, PlayerView } from 'boardgame.io/core';

import { ICardStack, createDeck, moveCard, shuffleCards, CardStack, dealCards, peekCard, pushCard, popCard, moveCardFromTop, takeCard, countCards } from './Cards';

// TODO: Add a complete CardStack object.
// TODO: Replace most of these moves with "MoveCard".
// TODO: Put all of the evaluation stuff into phases with endIf conditions.
//       The player won't be able to end their turn until they have achieved
//       the correct state.

const INITIAL_CARDS_COUNT = 7;

const PLAYER_STACK_ID = "player";
const DECK_STACK_ID = "player";

export interface PlayerState {
  cards: ICardStack;
}

export interface ProgrammableCardsState {
  secret: { deck: ICardStack };
  players: { [id: string]: PlayerState };
  trash: ICardStack;
  processorValue: ICardStack;
  processorOperator: ICardStack;
  processorInstruction: ICardStack;
  localMemory: ICardStack;
  globalMemory: ICardStack;
};

export interface ProcessorState {
  value?: number,
  operator?: string,
  instruction?: string
}

function getProcessorState(G: ProgrammableCardsState): ProcessorState {
  const processorValue = peekCard(G.processorValue);
  const processorOperator = peekCard(G.processorOperator);
  const processorInstruction = peekCard(G.processorInstruction);
  return {
    value: processorValue ? processorValue.value : undefined,
    operator: processorOperator ? processorOperator.operator : undefined,
    instruction: processorInstruction ? processorInstruction.instruction : undefined,
  };
}

function isProcessorEmpty(G: ProgrammableCardsState): boolean {
  const processorState = getProcessorState(G);
  return (
    processorState.value === undefined
    && processorState.operator === undefined
    && processorState.instruction === undefined
  );
}

function getPlayerStack(G: ProgrammableCardsState, ctx: Ctx): ICardStack {
  return G.players[ctx.currentPlayer].cards;
}

function getStack(G: ProgrammableCardsState, ctx: Ctx, stackId: string): ICardStack {
  if (stackId === PLAYER_STACK_ID) {
    return G.players[ctx.currentPlayer].cards;
  } else if (stackId === DECK_STACK_ID) {
    return G.secret.deck;
  } else if (stackId === "trash") {
    return G.trash;
  } else if (stackId === "processorValue") {
    return G.processorValue;
  } else if (stackId === "processorOperator") {
    return G.processorOperator;
  } else if (stackId === "processorInstruction") {
    return G.processorInstruction;
  } else if (stackId === "localMemory") {
    return G.localMemory;
  } else if (stackId === "globalMemory") {
    return G.globalMemory;
  } else {
    throw new Error("Unknown stack ID");
  }
}

function moveCardFromPlayerMoveFn(G: ProgrammableCardsState, ctx: Ctx, cardId: string, toStackId: string) {
  const fromStack = getStack(G, ctx, PLAYER_STACK_ID);
  const toStack = getStack(G, ctx, toStackId);

  if (fromStack === undefined || toStack === undefined) {
    return INVALID_MOVE;
  }
  
  if (!moveCard(fromStack, cardId, toStack)) {
    return INVALID_MOVE;
  }
}

function drawCardMoveFn(G: ProgrammableCardsState, ctx: Ctx) {
  const fromStack = getStack(G, ctx, DECK_STACK_ID);
  const toStack = getStack(G, ctx, PLAYER_STACK_ID);

  if (fromStack === undefined || toStack === undefined) {
    return INVALID_MOVE;
  }

  moveCardFromTop(fromStack, toStack);

  ctx.events!.endTurn();
}

export const ProgrammableCards: Game<ProgrammableCardsState> = {
  setup: (ctx, setupData) => {
    console.log("Start setup...");
    // Create the card deck
    const deck = createDeck();
    if (ctx.random) {
      shuffleCards(deck, ctx.random);
    }

    const G: ProgrammableCardsState = {
      secret: {
        deck: { ...deck },
      },
      players: {},
      trash: CardStack(),
      processorValue: CardStack(),
      processorOperator: CardStack(),
      processorInstruction: CardStack(),
      localMemory: CardStack(),
      globalMemory: CardStack(),
    }

    console.log("Generated G", G);

    // Create player state objects
    for (const playerId of ctx.playOrder) {
      G.players[playerId] = {
        cards: CardStack()
      };
    }

    // Deal INITIAL_CARDS_COUNT cards to each player
    for (const player of Object.values(G.players)) {
      const result = dealCards(deck, player.cards, INITIAL_CARDS_COUNT);
      console.log("EXTRA CARDS", result);
    }

    // Add the top card to globalMemory
    dealCards(deck, G.globalMemory, 1);

    return G;
  },

  playerView: PlayerView.STRIP_SECRETS,

  phases: {
    setup: {
      moves: {
        writeToGlobalMemory: (G, ctx, cardId) => {
          const playerStack = getPlayerStack(G, ctx);
          if (!moveCard(playerStack, cardId, G.globalMemory)) {
            return INVALID_MOVE;
          }
        },
      },
      turn: {
        minMoves: 1,
      },
      start: true,
      endIf: (G, ctx) => {
        return peekCard(G.globalMemory) !== undefined;
      }
    }
  },

  turn: {
    onBegin: (G, ctx) => {
      const processorState = getProcessorState(G);
      if (processorState.instruction === "VAR") {
        ctx.events!.setActivePlayers({
          currentPlayer: "fulfillVarCondition",
          minMoves: 1
        });
      } else if (processorState.instruction === "IF") {
        ctx.events!.setActivePlayers({
          currentPlayer: "fulfillIfCondition",
          minMoves: 1
        });
      } else if (processorState.instruction === "LOOP") {
        ctx.events!.setActivePlayers({
          currentPlayer: "fulfillLoopCondition",
          minMoves: 1
        });
      // } else if (processorState.instruction === "DEF") {
      //   ctx.events!.setActivePlayers({
      //     currentPlayer: "fulfillDefCondition",
      //     minMoves: 1
      //   });
      // } else if (processorState.instruction === "RETURN") {
      //   ctx.events!.setActivePlayers({
      //     currentPlayer: "fulfillReturnCondition",
      //     minMoves: 1
      //   });
      } else {
        ctx.events!.setActivePlayers({
          currentPlayer: "fulfillBaseCondition",
          minMoves: 1
        });
      }
      console.log("Set a stage?");
    },
    stages: {
      fulfillVarCondition: {
        moves: {
          trashCard: (G, ctx, stackId) => {
            let fromStack: ICardStack;

            if (stackId === "localMemory") {
              fromStack = G.localMemory;
            } else if (stackId === "globalMemory") {
              fromStack = G.globalMemory;
            } else {
              return INVALID_MOVE;
            }

            const card = popCard(fromStack);

            if (card === undefined) {
              return INVALID_MOVE;
            }

            pushCard(G.trash, card);
          },
          writeToGlobalMemory: (G, ctx, cardId) => {
            const playerStack = getPlayerStack(G, ctx);
            const newCard = takeCard(playerStack, cardId);
            const oldCard = popCard(G.globalMemory);

            if (newCard === undefined) {
              return INVALID_MOVE;
            }

            if (oldCard) {
              pushCard(G.trash, oldCard);
            }

            pushCard(G.globalMemory, newCard);

            ctx.events!.endStage();
          },
        },
        next: 'cleanProcessor',
      },
      fulfillIfCondition: {
        moves: {
        },
        next: 'cleanProcessor',
      },
      fulfillLoopCondition: {
        moves: {
        },
        next: 'cleanProcessor',
      },
      fulfillBaseCondition: {
        moves: {
          drawCard: {
            move: drawCardMoveFn,
            undoable: false,
            client: false,
          },
          writeToGlobalMemory: (G, ctx, cardId) => {
            const playerStack = getPlayerStack(G, ctx);
            const newCard = takeCard(playerStack, cardId);
            const oldCard = popCard(G.globalMemory);

            if (newCard === undefined) {
              return INVALID_MOVE;
            }

            if (oldCard && newCard.value < oldCard.value) {
              return INVALID_MOVE;
            }

            if (oldCard) {
              pushCard(G.trash, oldCard);
            }

            pushCard(G.globalMemory, newCard);

            ctx.events!.endStage();
          },
        },
        next: 'updateProcessor',
      },
      cleanProcessor: {
        moves: {
          trashCard: (G, ctx, stackId) => {
            let fromStack: ICardStack;

            if (stackId === "processorValue") {
              fromStack = G.processorValue;
            } else if (stackId === "processorOperator") {
              fromStack = G.processorOperator;
            } else if (stackId === "processorInstruction") {
              fromStack = G.processorInstruction;
            } else {
              return INVALID_MOVE;
            }

            const card = popCard(fromStack);

            if (card === undefined) {
              return INVALID_MOVE;
            }

            pushCard(G.trash, card);

            if (isProcessorEmpty(G)) {
              ctx.events!.endStage();
            }
          },
        },
        next: 'updateProcessor',
      },
      updateProcessor: {
        moves: {
          writeToProcessorValue: {
            move: (G, ctx, cardId) => moveCardFromPlayerMoveFn(G, ctx, cardId, "processorValue"),
          },
          writeToProcessorOperator: {
            move: (G, ctx, cardId) => moveCardFromPlayerMoveFn(G, ctx, cardId, "processorOperator"),
          },
          writeToProcessorInstruction: {
            move: (G, ctx, cardId) => moveCardFromPlayerMoveFn(G, ctx, cardId, "processorInstruction"),
          },
        },
      },
    }
  },

  // ai: {
  //   enumerate: (G, ctx) => {
  //     const moves = [];
  //     const myCards = G.players[ctx.currentPlayer].cards;
  //     for (const cardId of myCards) {
  //       moves.push({ move: 'writeGlobalMemory', args: [cardId] });
  //     }
  //     return moves;
  //   },
  // },
};
