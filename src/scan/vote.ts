export interface VoteState {
  history: string[];
  windowSize: number;
  threshold: number;
}

export const createVoteState = (windowSize = 10, threshold = 3): VoteState => ({
  history: [],
  windowSize,
  threshold
});

export const addVote = (state: VoteState, plate: string): { newState: VoteState, acceptedPlate: string | null } => {
  if (!plate || plate.length < 4) {
    return { newState: state, acceptedPlate: null };
  }

  const newHistory = [...state.history, plate];
  if (newHistory.length > state.windowSize) {
    newHistory.shift();
  }

  const newState = { ...state, history: newHistory };

  // Count occurrences
  const counts: Record<string, number> = {};
  for (const p of newHistory) {
    counts[p] = (counts[p] || 0) + 1;
    if (counts[p] >= state.threshold) {
      return { newState, acceptedPlate: p };
    }
  }

  return { newState, acceptedPlate: null };
};
