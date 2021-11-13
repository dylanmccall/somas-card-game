import { RandomAPI } from "boardgame.io/dist/types/src/plugins/random/random";

const OPERATORS = ["TRUE", "FALSE", "==", "!=", ">", "<", "+", "-", "/", "*", "AND", "OR", "XOR", "NOT"];
const INSTRUCTIONS = ["VAR", "LOOP", "IF", "DEF", "RETURN"];

export interface ICardDetail {
  /*
   * A card for the Programmable Cards game. Each card has a value and either
   * an operator or an instruction.
   */

  value: number;
  operator?: string;
  instruction?: string;
}

export function CardDetail(cardId: string): ICardDetail {
  const [top, extra] = cardId.toUpperCase().split(':');
  const self: ICardDetail = {
    value: Number(top)
  };
  if (OPERATORS.includes(extra)) {
    self.operator = extra;
  } else if (INSTRUCTIONS.includes(extra)) {
    self.instruction = extra;
  }
  return self
}

export function CardDetailEquals(self: ICardDetail, other: ICardDetail): boolean {
  return (
    self.value === other.value
    && self.operator === other.operator
    && self.instruction === other.instruction
  );
}

export function CardDetailGetId(self: ICardDetail): string {
  return [String(self.value), self.operator || self.instruction || ""].join(":");
}

export interface ICardStack {
  /*
   * A stack of cards. The last element is the top of the stack.
   */

  cards: Array<ICardDetail>;
}

export function CardStack(cards: Array<ICardDetail> = []): ICardStack {
  return {
    cards: cards.slice()
  }
}

export function shuffleCards(self: ICardStack, random: RandomAPI) {
  self.cards = random.Shuffle(self.cards);
}

export function countCards(self: ICardStack): number {
  return self.cards.length;
}

export function popCard(self: ICardStack): ICardDetail | undefined {
  return self.cards.pop();
}

export function peekCard(self: ICardStack): ICardDetail | undefined {
  return self.cards[self.cards.length - 1];
}

export function pushCard(self: ICardStack, card: ICardDetail): number {
  return self.cards.push(card);
}

export function takeCard(self: ICardStack, card: ICardDetail | string): ICardDetail | undefined {
  if (typeof card === "string") {
    return _takeCardById(self, card);
  } else {
    return _takeCard(self, card);
  }
}

function _takeCard(self: ICardStack, card: ICardDetail): ICardDetail | undefined {
  const cardIndex = self.cards.findIndex(
    testCard => CardDetailEquals(testCard, card)
  );

  if (cardIndex === -1) {
    return undefined;
  } else {
    self.cards.splice(cardIndex, 1);
    return card;
  }
}

function _takeCardById(self: ICardStack, cardId: string): ICardDetail | undefined {
  const card = CardDetail(cardId);
  return _takeCard(self, card);
}

export function moveCard(self: ICardStack, card: ICardDetail | string, toStack: ICardStack): boolean {
  const fromCard = takeCard(self, card);

  if (fromCard === undefined) {
    return false;
  } else {
    pushCard(toStack, fromCard);
    return true;
  }
}

export function moveCardFromTop(self: ICardStack, toStack: ICardStack): boolean {
  const fromCard = popCard(self);

  if (fromCard === undefined) {
    return false;
  } else {
    pushCard(toStack, fromCard);
    return true;
  }
}

export function dealCards(self: ICardStack, toStack: ICardStack, count: number): number {
  let missingCards = 0;
  for (let n = 0; n < count; n++) {
    const fromCard = popCard(self);
    if (!fromCard) {
      missingCards = count - n - 1;
      break;
    }
    pushCard(toStack, fromCard);
  }
  return missingCards;
}

// For the moment, LOOP, DEF, and RETURN are not implemented.

const CARD_IDS: Array<string> = [
  "1:TRUE",
  "1:>",
  "1:==",
  "1:FALSE",
  "1:VAR",
  "1:+",
  // "1:LOOP",
  "2:VAR",
  // "2:LOOP",
  "2:IF",
  "2:TRUE",
  "2:<",
  "2:+",
  // "2:DEF",
  "4:VAR",
  // "4:RETURN",
  "4:-",
  "4:AND",
  "4:TRUE",
  "4:>",
  // "4:LOOP",
  "8:VAR",
  "8:==",
  "8:IF",
  "8:<",
  // "8:LOOP",
  "8:FALSE",
  "8:TRUE",
  "16:XOR",
  "16:NOT",
  "16:==",
  "16:*",
  "16:VAR",
  // "16:LOOP",
  // "16:DEF",
  "32:VAR",
  // "32:LOOP",
  "32:IF",
  // "32:RETURN",
  "32:==",
  "32:*",
  "64:VAR",
  "64:FALSE",
  "64:!=",
  "64:/",
  "64:OR",
  // "64:LOOP",
  "64:==",
  "128:/",
  // "128:DEF",
  "128:!=",
  // "128:LOOP",
  "128:VAR",
  "128:IF",
  "128:FALSE",
];

const ALL_CARDS = CARD_IDS.map(cardId => CardDetail(cardId));

export function createDeck(): ICardStack {
  return CardStack(ALL_CARDS);
}
