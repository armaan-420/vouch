export const MIN_WINNER_VOTES=5;

export function canShareWinner(top,runnerUp,publicCount) {
  return top?.score!=null&&Number(top.score)>Number(runnerUp?.score??-1)&&publicCount>=MIN_WINNER_VOTES;
}
