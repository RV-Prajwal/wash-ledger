import { describe, it, expect } from 'vitest';
import { normalizePlate } from './normalize';
import { createVoteState, addVote } from './vote';

describe('normalizePlate', () => {
  it('uppercases and strips non-alphanumeric characters', () => {
    expect(normalizePlate('ka-01 ab 1234')).toBe('KA01AB1234');
    expect(normalizePlate('kA 03 mS.6100')).toBe('KA03MS6100');
  });

  it('fixes letter look-alikes in letter positions (0,1 and middle)', () => {
    // 0 is a look-alike for O
    // 1 is a look-alike for I
    // 8 is a look-alike for B
    // 5 is a look-alike for S
    // Position 0 and 1 expect letters
    expect(normalizePlate('K003MS6100')).toBe('KO03MS6100');
    expect(normalizePlate('1A03MS6100')).toBe('IA03MS6100');
    
    // Middle expects letters
    expect(normalizePlate('KA03M56100')).toBe('KA03MS6100');
    expect(normalizePlate('KA038S6100')).toBe('KA03BS6100');
  });

  it('fixes digit look-alikes in digit positions (2,3 and last 4)', () => {
    // Position 2 and 3 expect digits
    expect(normalizePlate('KAA3MS6100')).toBe('KAA3MS6100'); // A is not a look-alike we fix, but O->0
    expect(normalizePlate('KAO3MS6100')).toBe('KA03MS6100');
    expect(normalizePlate('KAI3MS6100')).toBe('KA13MS6100');
    expect(normalizePlate('KABSMS6100')).toBe('KA85MS6100');

    // Last 4 expects digits
    expect(normalizePlate('KA03MS61OO')).toBe('KA03MS6100');
    expect(normalizePlate('KA03MS6IOO')).toBe('KA03MS6100');
    expect(normalizePlate('KA03MSB10S')).toBe('KA03MS8105');
  });

  it('does not touch strings with invalid lengths to avoid wrong mapping', () => {
    // String too short
    expect(normalizePlate('KAO3')).toBe('KAO3');
    // String too long
    expect(normalizePlate('KA03MS6100ABC')).toBe('KA03MS6100ABC');
  });
});

describe('vote rolling window', () => {
  it('accepts a plate after it reaches the threshold', () => {
    let state = createVoteState(5, 3);
    
    // Vote 1
    let res = addVote(state, 'KA01AB1234');
    expect(res.acceptedPlate).toBe(null);
    state = res.newState;
    
    // Vote 2
    res = addVote(state, 'KA01AB1234');
    expect(res.acceptedPlate).toBe(null);
    state = res.newState;
    
    // Vote 3
    res = addVote(state, 'KA01AB1234');
    expect(res.acceptedPlate).toBe('KA01AB1234');
  });

  it('forgets old votes when they fall out of the window', () => {
    let state = createVoteState(3, 3); // Window 3, needs 3
    
    let res = addVote(state, 'KA01AB1234');
    state = res.newState;
    res = addVote(state, 'KA01AB1234');
    state = res.newState;
    
    // Fill window with a bad read
    res = addVote(state, 'XX00XX0000');
    state = res.newState;
    
    // First good read fell out of window! We now have [good, bad, good]. Count is 2.
    res = addVote(state, 'KA01AB1234');
    expect(res.acceptedPlate).toBe(null);
    state = res.newState;
    
    // 5th vote: pushes out first 'good' -> ['XX00XX0000', 'KA01AB1234', 'KA01AB1234']. Count is 2.
    res = addVote(state, 'KA01AB1234');
    expect(res.acceptedPlate).toBe(null);
    state = res.newState;

    // 6th vote: pushes out 'bad' -> ['KA01AB1234', 'KA01AB1234', 'KA01AB1234']. Count is 3.
    res = addVote(state, 'KA01AB1234');
    expect(res.acceptedPlate).toBe('KA01AB1234');
  });
});
