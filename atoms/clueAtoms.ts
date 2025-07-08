import { atom } from 'jotai';

export const currentClueAtom = atom<number>(1);     // initial clue index
export const totalCluesAtom   = atom<number>(7);    // locked-map has 7 clues
