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

export function formatHexDenomination(amount: number): string {
  if (amount === 0) return "0 Hex";
  
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;
  const prefix = isNegative ? "-" : "";

  // 1 chest = 6000 hex - show only if there are chests
  if (absAmount >= 6000) {
    const chests = Math.floor(absAmount / 6000);
    const remainder = absAmount % 6000;
    if (remainder === 0) {
      return `${prefix}${chests} chest${chests !== 1 ? 's' : ''}`;
    } else {
      // For mixed denominations, show the largest denomination only
      return `${prefix}${chests} chest${chests !== 1 ? 's' : ''}`;
    }
  }

  // 1 bag = 600 hex
  if (absAmount >= 600) {
    const bags = Math.floor(absAmount / 600);
    return `${prefix}${bags} bag${bags !== 1 ? 's' : ''}`;
  }

  // 1 handful = 60 hex
  if (absAmount >= 60) {
    const handfuls = Math.floor(absAmount / 60);
    return `${prefix}${handfuls} handful${handfuls !== 1 ? 's' : ''}`;
  }

  // 1 coin = 6 hex
  if (absAmount >= 6) {
    const coins = Math.floor(absAmount / 6);
    return `${prefix}${coins} coin${coins !== 1 ? 's' : ''}`;
  }

  // Just hex
  return `${prefix}${absAmount} Hex`;
}

export function getHexBreakdown(amount: number): { 
  total: number, 
  breakdown: string, 
  colorClass: string 
} {
  const isPositive = amount > 0;
  const colorClass = isPositive ? "text-green-400" : "text-red-400";
  
  if (amount === 0) {
    return {
      total: 0,
      breakdown: "0 Hex",
      colorClass: "text-red-400"
    };
  }
  
  const absAmount = Math.abs(amount);
  const prefix = amount < 0 ? "-" : "";
  
  // Calculate all denominations
  const chests = Math.floor(absAmount / 6000);
  const bagsRemainder = absAmount % 6000;
  const bags = Math.floor(bagsRemainder / 600);
  const handfulRemainder = bagsRemainder % 600;
  const handfuls = Math.floor(handfulRemainder / 60);
  const coinRemainder = handfulRemainder % 60;
  const coins = Math.floor(coinRemainder / 6);
  const hex = coinRemainder % 6;
  
  // Build breakdown string
  const parts = [];
  if (chests > 0) parts.push(`${chests} chest${chests !== 1 ? 's' : ''}`);
  if (bags > 0) parts.push(`${bags} bag${bags !== 1 ? 's' : ''}`);
  if (handfuls > 0) parts.push(`${handfuls} handful${handfuls !== 1 ? 's' : ''}`);
  if (coins > 0) parts.push(`${coins} coin${coins !== 1 ? 's' : ''}`);
  if (hex > 0) parts.push(`${hex} Hex`);
  
  const breakdown = parts.length > 0 ? `${prefix}${parts.join(', ')}` : `${prefix}0 Hex`;
  
  return {
    total: amount,
    breakdown,
    colorClass
  };
}

export function parseHexInput(input: string): number {
  // Simple parser - just treat it as a number for now
  // Could be enhanced to parse "1 chest 2 bags" etc.
  const num = parseInt(input);
  return isNaN(num) ? 0 : num;
}