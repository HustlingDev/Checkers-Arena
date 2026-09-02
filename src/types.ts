export type PieceColor = 'red' | 'black';
export type PieceType = 'pawn' | 'king';

export interface CheckersPiece {
  id: string;
  color: PieceColor;
  type: PieceType;
  row: number;
  col: number;
}

export interface Position {
  row: number;
  col: number;
}

export interface MoveOption {
  from: Position;
  to: Position;
  captures: Position[]; //Positions of pieces captured in this move/jump chain
  path: Position[];     //Step-by-step positions for multi-jump sequence
  becomesKing: boolean;
}

export interface GameMove {
  id: string;
  playerColor: PieceColor;
  from: Position;
  to: Position;
  capturedCount: number;
  becameKing: boolean;
  timestamp: number;
}

export interface AvatarOption {
  id: string;
  name: string;
  bgGradient: string;
  iconSvg: string; // SVG icon or emblem name
  accentColor: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'stake_entry' | 'stake_win' | 'stake_refund';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  reference?: string;
  transactionReference?: string;
  pesajetTransactionId?: string;
  roomId?: string;
  serviceFee?: number;
  stakeAmount?: number;
  metadata?: Record<string, any>;
  timestamp: number;
}

export function getGameServiceFee(stakeAmount: number): number {
  if (stakeAmount <= 0) return 0;
  if (stakeAmount === 200) return 30;
  if (stakeAmount === 500) return 50;
  if (stakeAmount === 1000) return 100;
  if (stakeAmount === 2000) return 400;
  if (stakeAmount === 5000) return 1000;
  if (stakeAmount === 10000) return 2000;
  if (stakeAmount === 20000) return 4000;
  return Math.round(stakeAmount * 0.20);
}

export function getNetGameWinnings(stakeAmount: number): number {
  if (stakeAmount <= 0) return 0;
  const total = stakeAmount * 2;
  const fee = getGameServiceFee(stakeAmount);
  return Math.max(0, total - fee);
}

export interface StakeTier {
  id: string;
  name: string;
  amount: number;
  label: string;
  badge: string;
  watermark: string;
  category?: string;
  description: string;
  isFree?: boolean;
}

export const STAKE_TIERS: StakeTier[] = [
  {
    id: 'free',
    name: 'Free / Practice',
    amount: 0,
    label: 'Free (0 UGX)',
    badge: 'Practice Mode',
    watermark: 'Practice',
    category: 'Free Play',
    description: 'Play for ratings & practice with 0 cash required',
    isFree: true,
  },
  {
    id: '200',
    name: '200 UGX Stake',
    amount: 200,
    label: '200 UGX',
    badge: 'A Layisi',
    watermark: 'A Layisi',
    category: 'Welcome Stake',
    description: 'Entry: 200 UGX match arena • Service Fee: 30 UGX (Win: 370 UGX)',
  },
  {
    id: '500',
    name: '500 UGX Stake',
    amount: 500,
    label: '500 UGX',
    badge: 'The Streets',
    watermark: 'The Streets',
    category: 'Street Arena',
    description: 'Entry: 500 UGX match arena • Service Fee: 50 UGX (Win: 950 UGX)',
  },
  {
    id: '1000',
    name: '1,000 UGX Stake',
    amount: 1000,
    label: '1,000 UGX',
    badge: 'Kawajyi',
    watermark: 'Kawajyi',
    category: 'Challenger',
    description: 'Entry: 1,000 UGX match arena • Service Fee: 100 UGX (Win: 1,900 UGX)',
  },
  {
    id: '2000',
    name: '2,000 UGX Stake',
    amount: 2000,
    label: '2,000 UGX',
    badge: 'Kagujje',
    watermark: 'Kagujje',
    category: 'Champion',
    description: 'Entry: 2,000 UGX match arena • Service Fee: 400 UGX (Win: 3,600 UGX)',
  },
  {
    id: '5000',
    name: '5,000 UGX Stake',
    amount: 5000,
    label: '5,000 UGX',
    badge: 'Abanene',
    watermark: 'Abanene',
    category: 'Master Arena',
    description: 'Entry: 5,000 UGX match arena • Service Fee: 1,000 UGX (Win: 9,000 UGX)',
  },
  {
    id: '10000',
    name: '10,000 UGX Stake',
    amount: 10000,
    label: '10,000 UGX',
    badge: 'The Streets',
    watermark: 'The Streets',
    category: 'High Stakes',
    description: 'Entry: 10,000 UGX match arena • Service Fee: 2,000 UGX (Win: 18,000 UGX)',
  },
  {
    id: '20000',
    name: '20,000 UGX Stake',
    amount: 20000,
    label: '20,000 UGX',
    badge: 'The Experts',
    watermark: 'The Experts',
    category: 'Elite Grandmaster',
    description: 'Entry: 20,000 UGX match arena • Service Fee: 4,000 UGX (Win: 36,000 UGX)',
  },
];

export interface UserProfile {
  id: string;
  username: string;
  realName?: string;
  phoneNumber?: string;
  normalizedPhone?: string;
  isGuest?: boolean;
  termsAccepted?: boolean;
  avatarId: string;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed?: number;
  rating: number; // Elo rating, default 1200
  elo?: number;
  walletBalance?: number; // In UGX, default 500 (Welcome Bonus)
  welcomeBonusClaimed?: boolean;
  totalWon?: number;
  totalStaked?: number;
  status: 'online' | 'in-game' | 'away' | 'offline';
  isOnline?: boolean;
  lastActiveTimestamp?: number;
  createdAt: number;
}

export interface GamePlayer {
  id: string;
  username: string;
  avatarId: string;
  rating: number;
  color: PieceColor;
  isBot?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export type GameStatus = 'waiting' | 'playing' | 'ended';

export interface GameRoom {
  id: string;
  name: string;
  status: GameStatus;
  stakeAmount?: number; // 0 for free/practice, or 500, 1000, 2000, 5000, 10000, 20000 UGX
  potAmount?: number; // 2x stakeAmount
  escrowCollected?: {
    [userId: string]: number;
  };
  redPlayer: GamePlayer | null;
  blackPlayer: GamePlayer | null;
  currentTurn: PieceColor;
  board: (CheckersPiece | null)[][];
  history: GameMove[];
  capturedRed: number; // Number of red pieces captured by black
  capturedBlack: number; // Number of black pieces captured by red
  winner: PieceColor | 'draw' | null;
  winReason?: string;
  createdAt: number;
  lastMoveTimestamp: number;
  turnTimeLimitSeconds: number; // e.g. 20 seconds per turn
  turnDeadline: number | null;
  disconnectedPlayerId?: string | null;
  disconnectDeadline?: number | null;
  spectatorsCount: number;
  isPrivate?: boolean;
  isBotGame?: boolean;
  botDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface Challenge {
  id: string;
  fromUser: UserProfile;
  toUser: UserProfile;
  stakeAmount: number; // 0 for free, or specific stake tier
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

export interface YoPaymentInitResponse {
  success: boolean;
  status: string;
  transactionReference?: string;
  externalReference?: string;
  amount: number;
  currency: string;
  message?: string;
  isSandboxDemo?: boolean;
}

export interface PesajetPaymentInitResponse {
  success: boolean;
  transactionId?: string;
  reference?: string;
  status?: string;
  amount: number;
  currency: string;
  message?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  avatarId: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatarId: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}
