export function formatHex(amount: number): string {
  if (amount === 0) return "0 Hex";
  
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const prefix = isNegative ? "-" : "";

  // 1 chest = 6000 hex
  if (absAmount >= 6000) {
    const chests = Math.floor(absAmount / 6000);
    const remainder = absAmount % 6000;
    if (remainder === 0) {
      return `${prefix}${chests} chest${chests !== 1 ? 's' : ''}`;
    } else {
      const formattedRemainder = formatHex(remainder);
      return `${prefix}${chests} chest${chests !== 1 ? 's' : ''}, ${formattedRemainder}`;
    }
  }

  // 1 bag = 600 hex
  if (absAmount >= 600) {
    const bags = Math.floor(absAmount / 600);
    const remainder = absAmount % 600;
    if (remainder === 0) {
      return `${prefix}${bags} bag${bags !== 1 ? 's' : ''}`;
    } else {
      const formattedRemainder = formatHex(remainder);
      return `${prefix}${bags} bag${bags !== 1 ? 's' : ''}, ${formattedRemainder}`;
    }
  }

  // 1 handful = 60 hex
  if (absAmount >= 60) {
    const handfuls = Math.floor(absAmount / 60);
    const remainder = absAmount % 60;
    if (remainder === 0) {
      return `${prefix}${handfuls} handful${handfuls !== 1 ? 's' : ''}`;
    } else {
      const formattedRemainder = formatHex(remainder);
      return `${prefix}${handfuls} handful${handfuls !== 1 ? 's' : ''}, ${formattedRemainder}`;
    }
  }

  // 1 coin = 6 hex
  if (absAmount >= 6) {
    const coins = Math.floor(absAmount / 6);
    const hex = absAmount % 6;
    if (hex === 0) {
      return `${prefix}${coins} coin${coins !== 1 ? 's' : ''}`;
    } else {
      return `${prefix}${coins} coin${coins !== 1 ? 's' : ''}, ${hex} Hex`;
    }
  }

  // Just hex
  return `${prefix}${absAmount} Hex`;
}

export function parseHexInput(input: string): number {
  // Simple parser - just treat it as a number for now
  // Could be enhanced to parse "1 chest 2 bags" etc.
  const num = parseInt(input);
  return isNaN(num) ? 0 : num;
}