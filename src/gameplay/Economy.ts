import { eventBus } from '@/core/EventBus';

export interface EconomyConfig {
  startingGold: number;
  interestRate: number;
  interestInterval: number;
  maxInterestGold: number;
  killBountyMultiplier: number;
  waveBountyMultiplier: number;
  sellRefundRate: number;
}

export interface Transaction {
  type: 'income' | 'expense';
  amount: number;
  source: string;
  timestamp: number;
}

export class Economy {
  private gold: number;
  private config: EconomyConfig;
  private interestTimer: number = 0;
  private transactions: Transaction[] = [];
  private totalEarned: number = 0;
  private totalSpent: number = 0;

  constructor(config: EconomyConfig) {
    this.config = config;
    this.gold = config.startingGold;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for enemy kills to award bounty
    eventBus.on('enemy:killed', (data: { bounty: number; enemyType: string }) => {
      this.addGold(Math.floor(data.bounty * this.config.killBountyMultiplier), `${data.enemyType} kill`);
    });

    // Listen for wave completion to award bonus
    eventBus.on('wave:completed', (data: { bounty: number; wave: number }) => {
      this.addGold(Math.floor(data.bounty * this.config.waveBountyMultiplier), `Wave ${data.wave} bonus`);
    });

    // Listen for tower purchases
    eventBus.on('tower:purchased', (data: { cost: number; towerType: string }) => {
      this.spendGold(data.cost, `${data.towerType} tower`);
    });

    // Listen for tower upgrades
    eventBus.on('tower:upgraded', (data: { cost: number; towerType: string }) => {
      this.spendGold(data.cost, `${data.towerType} upgrade`);
    });

    // Listen for tower sales
    eventBus.on('tower:sold', (data: { refund: number; towerType: string }) => {
      this.addGold(Math.floor(data.refund * this.config.sellRefundRate), `${data.towerType} sale`);
    });
  }

  update(dt: number): void {
    this.updateInterest(dt);
  }

  private updateInterest(dt: number): void {
    this.interestTimer += dt;

    if (this.interestTimer >= this.config.interestInterval) {
      this.calculateInterest();
      this.interestTimer = 0;
    }
  }

  private calculateInterest(): void {
    if (this.gold <= 0) return;

    // Interest only applies up to max interest gold
    const interestableGold = Math.min(this.gold, this.config.maxInterestGold);
    const interest = Math.floor(interestableGold * this.config.interestRate);

    if (interest > 0) {
      this.addGold(interest, 'Interest');
      eventBus.emit('economy:interest', {
        amount: interest,
        rate: this.config.interestRate,
        interestableGold
      });
    }
  }

  // Public API
  addGold(amount: number, source: string = 'Unknown'): void {
    this.gold += amount;
    this.totalEarned += amount;

    this.recordTransaction('income', amount, source);
    eventBus.emit('economy:goldChanged', {
      gold: this.gold,
      change: amount,
      source
    });
  }

  spendGold(amount: number, source: string = 'Unknown'): boolean {
    if (this.gold < amount) {
      eventBus.emit('economy:insufficientFunds', {
        required: amount,
        available: this.gold,
        source
      });
      return false;
    }

    this.gold -= amount;
    this.totalSpent += amount;

    this.recordTransaction('expense', amount, source);
    eventBus.emit('economy:goldChanged', {
      gold: this.gold,
      change: -amount,
      source
    });

    return true;
  }

  canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  private recordTransaction(type: 'income' | 'expense', amount: number, source: string): void {
    const transaction: Transaction = {
      type,
      amount,
      source,
      timestamp: Date.now()
    };

    this.transactions.push(transaction);

    // Keep only last 100 transactions
    if (this.transactions.length > 100) {
      this.transactions = this.transactions.slice(-100);
    }

    eventBus.emit('economy:transaction', transaction);
  }

  // Getters
  getGold(): number {
    return this.gold;
  }

  getTotalEarned(): number {
    return this.totalEarned;
  }

  getTotalSpent(): number {
    return this.totalSpent;
  }

  getNetWorth(): number {
    return this.totalEarned - this.totalSpent;
  }

  getTransactions(limit: number = 10): Transaction[] {
    return this.transactions.slice(-limit);
  }

  getInterestProgress(): { timer: number; interval: number; progress: number } {
    return {
      timer: this.interestTimer,
      interval: this.config.interestInterval,
      progress: this.interestTimer / this.config.interestInterval
    };
  }

  getNextInterestAmount(): number {
    const interestableGold = Math.min(this.gold, this.config.maxInterestGold);
    return Math.floor(interestableGold * this.config.interestRate);
  }

  // Economic analysis
  getIncomeRate(): number {
    // Calculate income rate based on recent transactions
    const recentTime = 60000; // Last minute
    const cutoff = Date.now() - recentTime;

    const recentIncome = this.transactions
      .filter(t => t.type === 'income' && t.timestamp >= cutoff)
      .reduce((sum, t) => sum + t.amount, 0);

    return recentIncome / (recentTime / 1000); // Gold per second
  }

  getExpenseRate(): number {
    // Calculate expense rate based on recent transactions
    const recentTime = 60000; // Last minute
    const cutoff = Date.now() - recentTime;

    const recentExpenses = this.transactions
      .filter(t => t.type === 'expense' && t.timestamp >= cutoff)
      .reduce((sum, t) => sum + t.amount, 0);

    return recentExpenses / (recentTime / 1000); // Gold per second
  }

  // Special economic events
  applyBonusMultiplier(multiplier: number, duration: number, source: string): void {
    // Temporary bonus multiplier for income
    const originalMultiplier = this.config.killBountyMultiplier;
    this.config.killBountyMultiplier *= multiplier;

    eventBus.emit('economy:bonusActive', {
      multiplier,
      duration,
      source
    });

    // Restore after duration
    setTimeout(() => {
      this.config.killBountyMultiplier = originalMultiplier;
      eventBus.emit('economy:bonusExpired', { source });
    }, duration * 1000);
  }

  // Emergency methods
  resetGold(amount: number): void {
    this.gold = amount;
    eventBus.emit('economy:goldChanged', {
      gold: this.gold,
      change: 0,
      source: 'Reset'
    });
  }

  // Difficulty adjustments
  adjustDifficulty(modifier: number): void {
    // Adjust economy based on performance
    this.config.killBountyMultiplier *= modifier;
    this.config.waveBountyMultiplier *= modifier;

    eventBus.emit('economy:difficultyAdjusted', {
      modifier,
      newKillMultiplier: this.config.killBountyMultiplier,
      newWaveMultiplier: this.config.waveBountyMultiplier
    });
  }

  // Serialize state for save/load
  serialize(): any {
    return {
      gold: this.gold,
      totalEarned: this.totalEarned,
      totalSpent: this.totalSpent,
      interestTimer: this.interestTimer,
      config: this.config,
      transactions: this.transactions.slice(-20) // Save last 20 transactions
    };
  }

  deserialize(data: any): void {
    this.gold = data.gold || this.config.startingGold;
    this.totalEarned = data.totalEarned || 0;
    this.totalSpent = data.totalSpent || 0;
    this.interestTimer = data.interestTimer || 0;
    this.transactions = data.transactions || [];

    if (data.config) {
      this.config = { ...this.config, ...data.config };
    }

    eventBus.emit('economy:goldChanged', {
      gold: this.gold,
      change: 0,
      source: 'Load Game'
    });
  }
}