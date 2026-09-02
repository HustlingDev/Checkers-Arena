import React, { useState } from 'react';
import { UserProfile, GameRoom, STAKE_TIERS, StakeTier } from '../types';
import { AvatarBadge } from './AvatarBadge';
import {
  Users,
  Swords,
  Bot,
  PlusCircle,
  Eye,
  Trophy,
  Flame,
  Settings,
  X,
  Sparkles,
  Zap,
  Trash2,
  Wallet,
  Coins,
  ArrowLeft,
  ChevronRight,
  Plus,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { BOT_DIFFICULTIES, BotDifficulty } from '../lib/botEngine';

interface OnlineLobbyProps {
  currentUser: UserProfile;
  onlineUsers: UserProfile[];
  gameRooms: GameRoom[];
  onInitiateChallenge: (targetUser: UserProfile, preselectedStake?: number) => void;
  onCreateCustomGame: (vsBot: boolean, botDifficulty?: BotDifficulty) => void;
  onOpenCreateTableModal: (preselectedStake?: number) => void;
  onJoinGameRoom: (roomId: string) => void;
  onDeleteGameRoom?: (roomId: string) => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onOpenWallet: () => void;
  onNotify?: (message: string, type?: 'info' | 'error') => void;
}

type LobbyViewMode = 'stake_cards' | 'stake_section' | 'all_players' | 'all_tables';

interface StakeCardConfig {
  amount: number;
  label: string;
  badge: string;
  watermark: string;
  badgeColor: string;
  gradient: string;
  borderColor: string;
  textColor: string;
  description: string;
  isPopular?: boolean;
}

const STAKE_CARD_TEMPLATES: StakeCardConfig[] = [
  {
    amount: 200,
    label: '200 UGX',
    badge: '🎁 A Layisi',
    watermark: 'A LAYISI',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    gradient: 'from-amber-950/60 via-slate-900 to-amber-950/40',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    textColor: 'text-amber-400',
    description: 'Use your 200 UGX welcome bonus • Service Fee: 30 UGX',
    isPopular: true,
  },
  {
    amount: 500,
    label: '500 UGX',
    badge: '⚔️ The Streets',
    watermark: 'THE STREETS',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    textColor: 'text-emerald-400',
    description: 'Competitive street match arena • Service Fee: 30 UGX',
  },
  {
    amount: 1000,
    label: '1,000 UGX',
    badge: '⚡ Kawajyi',
    watermark: 'KAWAJYI',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    gradient: 'from-cyan-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    textColor: 'text-cyan-400',
    description: 'Standard challenger arena • Service Fee: 55 UGX',
  },
  {
    amount: 2000,
    label: '2,000 UGX',
    badge: '🏆 Kagujje',
    watermark: 'KAGUJJE',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    gradient: 'from-indigo-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400',
    textColor: 'text-indigo-400',
    description: 'Champion arena for seasoned strategists • Service Fee: 150 UGX',
  },
  {
    amount: 5000,
    label: '5,000 UGX',
    badge: '👑 Abanene',
    watermark: 'ABANENE',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    gradient: 'from-purple-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    textColor: 'text-purple-400',
    description: 'Master tier arena for big players • Service Fee: 300 UGX',
  },
  {
    amount: 10000,
    label: '10,000 UGX',
    badge: '💎 The Streets',
    watermark: 'THE STREETS',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    gradient: 'from-rose-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    textColor: 'text-rose-400',
    description: 'High stake street arena showdown • Service Fee: 550 UGX',
  },
  {
    amount: 20000,
    label: '20,000 UGX',
    badge: '🔥 The Experts',
    watermark: 'THE EXPERTS',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    gradient: 'from-yellow-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-yellow-500/50 hover:border-yellow-400',
    textColor: 'text-yellow-400',
    description: 'The maximum expert arena • Service Fee: 1,000 UGX',
  },
  {
    amount: 0,
    label: 'Free Play (0 UGX)',
    badge: '⚡ Practice',
    watermark: 'PRACTICE',
    badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    gradient: 'from-blue-950/40 via-slate-900 to-slate-950',
    borderColor: 'border-blue-500/30 hover:border-blue-400',
    textColor: 'text-blue-400',
    description: 'Play casual matches for ELO rating & leaderboard position.',
  },
];

export const OnlineLobby: React.FC<OnlineLobbyProps> = ({
  currentUser,
  onlineUsers,
  gameRooms,
  onInitiateChallenge,
  onCreateCustomGame,
  onOpenCreateTableModal,
  onJoinGameRoom,
  onDeleteGameRoom,
  onOpenLeaderboard,
  onOpenSettings,
  onOpenWallet,
  onNotify,
}) => {
  const [viewMode, setViewMode] = useState<LobbyViewMode>('stake_cards');
  const [selectedStakeSection, setSelectedStakeSection] = useState<number>(500);
  const [showBotModal, setShowBotModal] = useState(false);
  const [allPlayersStakeFilter, setAllPlayersStakeFilter] = useState<number | 'all'>('all');
  const [playerStakeMap, setPlayerStakeMap] = useState<Record<string, number>>({});

  // Filter out self from online players list
  const otherOnlinePlayers = onlineUsers.filter((u) => u.id !== currentUser.id);

  const handleStartBotGame = (difficulty: BotDifficulty) => {
    setShowBotModal(false);
    onCreateCustomGame(true, difficulty);
  };

  const handleEnterStakeSection = (stakeAmount: number) => {
    setSelectedStakeSection(stakeAmount);
    setViewMode('stake_section');
  };

  // Safe action: checks wallet balance before allowing challenge in stake section
  const handleChallengeWithStakeCheck = (player: UserProfile, stakeAmount: number) => {
    const balance = currentUser.walletBalance ?? 0;
    if (stakeAmount > 0 && balance < stakeAmount) {
      const message = `⚠️ Insufficient Balance: You need at least ${stakeAmount.toLocaleString()} UGX to challenge for this stake. Please deposit money on your account.`;
      if (onNotify) {
        onNotify(message, 'error');
      }
      onOpenWallet();
      return;
    }
    onInitiateChallenge(player, stakeAmount);
  };

  // Safe action: checks wallet balance before joining a staked table
  const handleJoinTableWithStakeCheck = (roomId: string, stakeAmount: number) => {
    const balance = currentUser.walletBalance ?? 0;
    if (stakeAmount > 0 && balance < stakeAmount) {
      const message = `⚠️ Insufficient Balance: You need at least ${stakeAmount.toLocaleString()} UGX to join this table. Please deposit money on your account.`;
      if (onNotify) {
        onNotify(message, 'error');
      }
      onOpenWallet();
      return;
    }
    onJoinGameRoom(roomId);
  };

  // Safe action: checks wallet balance before opening table creation for a stake
  const handleHostTableWithStakeCheck = (stakeAmount: number) => {
    const balance = currentUser.walletBalance ?? 0;
    if (stakeAmount > 0 && balance < stakeAmount) {
      const message = `⚠️ Insufficient Balance: You need at least ${stakeAmount.toLocaleString()} UGX to host this table. Please deposit money on your account.`;
      if (onNotify) {
        onNotify(message, 'error');
      }
      onOpenWallet();
      return;
    }
    onOpenCreateTableModal(stakeAmount);
  };

  // Rooms matching selected stake section
  const sectionRooms = gameRooms.filter(
    (room) => (room.stakeAmount || 0) === selectedStakeSection
  );

  const walletBalance = currentUser.walletBalance ?? 500;
  const currentStakeConfig =
    STAKE_CARD_TEMPLATES.find((t) => t.amount === selectedStakeSection) ||
    STAKE_CARD_TEMPLATES[0];

  return (
    <div
      id="online-lobby-container"
      className="w-full max-w-7xl mx-auto h-full max-h-full p-2 sm:p-3 flex flex-col justify-between gap-1.5 sm:gap-2 overflow-hidden select-none"
    >
      {/* 1. TOP HEADER & PROMINENT DEPOSIT BAR (Optimized for Landscape) */}
      <div
        id="lobby-top-bar"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/35 to-slate-900 border border-slate-800 p-2 sm:p-2.5 shadow-xl shrink-0"
      >
        <div className="relative z-10 flex flex-row items-center justify-between gap-2">
          {/* User Status Tag */}
          <div className="flex items-center gap-2 min-w-0">
            <AvatarBadge avatarId={currentUser.avatarId} size="sm" showStatus status="online" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[120px] sm:max-w-[180px]">
                  {currentUser.username}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                  {currentUser.rating || currentUser.elo || 1200} ELO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate hidden md:block">
                Select a stake card to find opponents with matching stakes. 15s turn limit.
              </p>
            </div>
          </div>

          {/* Action Center: High-Visibility Deposit Button, Balance, Practice Bot & Host */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Highly Visible Deposit Button */}
            <button
              id="lobby-deposit-funds-btn"
              onClick={onOpenWallet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md shadow-emerald-950/50 transition transform hover:scale-[1.02] active:scale-95 cursor-pointer border border-emerald-300"
              title="Deposit Funds via MTN / Airtel Mobile Money"
            >
              <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="font-extrabold uppercase tracking-wide">Deposit</span>
            </button>

            {/* Practice vs AI Bot */}
            <button
              id="lobby-practice-bot-btn"
              onClick={() => setShowBotModal(true)}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 transition"
              title="Practice vs AI Bot"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>Practice Bot</span>
            </button>

            {/* Host Table */}
            <button
              id="lobby-host-table-btn"
              onClick={() =>
                handleHostTableWithStakeCheck(
                  viewMode === 'stake_section' ? selectedStakeSection : 500
                )
              }
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Host Table</span>
              <span className="sm:hidden">Host</span>
            </button>

            {/* Settings */}
            <button
              id="lobby-settings-btn"
              onClick={onOpenSettings}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700 transition shadow"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION SUB-TABS (Landscape Horizontal Strip) */}
      <div
        id="lobby-nav-tabs"
        className="flex items-center justify-between gap-2 border-b border-slate-800/90 pb-1 shrink-0"
      >
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <button
            id="tab-stake-arenas"
            onClick={() => setViewMode('stake_cards')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap border ${
              viewMode === 'stake_cards'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Stake Arenas</span>
          </button>

          {viewMode === 'stake_section' && (
            <button
              id="tab-stake-section-active"
              onClick={() => setViewMode('stake_section')}
              className="px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap bg-amber-500 text-slate-950 border border-amber-400 shadow animate-fade-in"
            >
              <span>🎯 {selectedStakeSection === 0 ? 'Free Play' : `${selectedStakeSection.toLocaleString()} UGX Section`}</span>
            </button>
          )}

          <button
            id="tab-all-players"
            onClick={() => setViewMode('all_players')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap border ${
              viewMode === 'all_players'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Players ({otherOnlinePlayers.length})</span>
          </button>

          <button
            id="tab-all-tables"
            onClick={() => setViewMode('all_tables')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap border ${
              viewMode === 'all_tables'
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>All Tables ({gameRooms.length})</span>
          </button>
        </div>

        <button
          id="btn-lobby-leaderboard"
          onClick={onOpenLeaderboard}
          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition shrink-0"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Leaderboard</span>
        </button>
      </div>

      {/* 3. MAIN CONTENT VIEWS (Tailored for Landscape Density & Responsiveness) */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* VIEW 1: REDUCED-SIZE STAKE SELECTION CARDS (No Pot word, No win amounts, Compact Landscape Grid) */}
        {viewMode === 'stake_cards' && (
          <div
            id="stake-cards-grid-view"
            className="h-full overflow-y-auto custom-scrollbar space-y-2 pr-1"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                  <span>Match Stake Selection</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                    Click a Card to Enter Section
                  </span>
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400">
                  Select your desired stake card to match with opponents and join tables with the same stake.
                </p>
              </div>
            </div>

            {/* Compact Landscape Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
              {STAKE_CARD_TEMPLATES.map((tier) => {
                const tablesInTier = gameRooms.filter(
                  (r) => (r.stakeAmount || 0) === tier.amount
                ).length;

                return (
                  <div
                    key={tier.amount}
                    id={`stake-card-${tier.amount}`}
                    onClick={() => handleEnterStakeSection(tier.amount)}
                    className={`relative group bg-gradient-to-br ${tier.gradient} border ${tier.borderColor} rounded-xl p-2 sm:p-2.5 flex flex-col justify-between gap-1.5 sm:gap-2 shadow hover:shadow-lg transition duration-150 cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.98] min-h-[125px] sm:min-h-[135px] overflow-hidden`}
                  >
                    {/* Visual Card Watermark */}
                    <div className="absolute -right-1 bottom-4 pointer-events-none select-none opacity-[0.14] group-hover:opacity-[0.24] text-[16px] sm:text-[20px] font-black italic uppercase tracking-wider leading-none z-0 transition-opacity transform -rotate-12 text-white">
                      {tier.watermark}
                    </div>

                    {tier.isPopular && (
                      <div className="relative z-10 self-end -mt-1 -mr-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 text-[8px] font-black shadow uppercase tracking-wider flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2" /> Welcome Bonus
                      </div>
                    )}

                    <div className="space-y-1 relative z-10">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-black border ${tier.badgeColor}`}
                        >
                          {tier.badge}
                        </span>
                        <div className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                          <Flame className="w-2.5 h-2.5 text-rose-400" />
                          <span>{tablesInTier}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-base sm:text-lg font-black text-white tracking-tight flex items-baseline gap-1">
                          <span className={tier.textColor}>{tier.label}</span>
                        </div>
                        <div className="text-[10px] font-semibold text-slate-300 mt-0.5">
                          {tier.amount > 0 ? `Entry: ${tier.label}` : 'Free Practice'}
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 leading-tight line-clamp-2">
                        {tier.description}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Users className="w-2.5 h-2.5 text-amber-400" />
                        <span>{otherOnlinePlayers.length} Online</span>
                      </span>

                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-amber-300 text-[10px] font-black transition flex items-center gap-0.5 shadow"
                      >
                        <span>Enter</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: DEDICATED STAKE SECTION VIEW (Landscape 2-Column with prominent deposit and insufficient funds check) */}
        {viewMode === 'stake_section' && (
          <div
            id="stake-section-view"
            className="h-full flex flex-col justify-between gap-2 overflow-hidden"
          >
            {/* Section Header with Easy-to-See Deposit Button */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  id="btn-back-to-cards"
                  onClick={() => setViewMode('stake_cards')}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs font-bold shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">All Stakes</span>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-black text-white truncate">
                      {selectedStakeSection === 0
                        ? 'Free Play Arena (0 UGX)'
                        : `${selectedStakeSection.toLocaleString()} UGX Stake Section`}
                    </h3>
                    <span className={`text-[9px] px-2 py-0.2 rounded-full font-black border ${currentStakeConfig.badgeColor}`}>
                      {currentStakeConfig.badge}
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-400/90 font-medium truncate">
                    {selectedStakeSection > 0
                      ? `Players in this section play for ${selectedStakeSection.toLocaleString()} UGX stake • 15s Turn Clock`
                      : 'Casual / Practice matches with no monetary stakes'}
                  </p>
                </div>
              </div>

              {/* Action Buttons: Prominent Deposit Button + Host Table */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="btn-stake-section-deposit"
                  onClick={onOpenWallet}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs shadow-md transition active:scale-95 flex items-center gap-1 cursor-pointer border border-emerald-300"
                  title="Deposit Funds via Mobile Money"
                >
                  <Wallet className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Deposit Funds</span>
                </button>

                <button
                  id="btn-stake-section-host"
                  onClick={() => handleHostTableWithStakeCheck(selectedStakeSection)}
                  className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow transition active:scale-95 flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Host {selectedStakeSection === 0 ? 'Free' : `${selectedStakeSection.toLocaleString()} UGX`} Table</span>
                </button>
              </div>
            </div>

            {/* Split Columns in Landscape: Available Opponents on Left, Active Tables on Right */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 min-h-0 overflow-hidden">
              {/* Left Column: Online Players labeled with current stake on the right */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between shadow overflow-hidden min-h-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                    <h4 className="text-xs font-black text-white">
                      Available Opponents ({otherOnlinePlayers.length})
                    </h4>
                  </div>
                  <span className="text-[9px] text-slate-400">
                    Stake labeled on right side of tags
                  </span>
                </div>

                {/* Players List with right-hand labeled stake amount */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 py-1.5 min-h-0 pr-1">
                  {otherOnlinePlayers.length === 0 ? (
                    <div className="py-6 text-center space-y-2 flex flex-col items-center justify-center h-full">
                      <Users className="w-8 h-8 text-slate-600" />
                      <p className="text-slate-300 text-xs font-bold">
                        No opponents active right now
                      </p>
                      <p className="text-slate-500 text-[10px] max-w-xs">
                        Create a {selectedStakeSection.toLocaleString()} UGX table above or practice against the AI Bot.
                      </p>
                      <button
                        onClick={() => setShowBotModal(true)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold border border-slate-700"
                      >
                        Practice vs Bot
                      </button>
                    </div>
                  ) : (
                    otherOnlinePlayers.map((player) => (
                      <div
                        key={player.id}
                        id={`player-row-${player.id}`}
                        className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 rounded-xl p-2 flex items-center justify-between gap-2 transition shadow-sm"
                      >
                        {/* Left Side: Avatar, Name & ELO */}
                        <div className="flex items-center gap-2 min-w-0">
                          <AvatarBadge
                            avatarId={player.avatarId}
                            size="sm"
                            showStatus
                            status={player.status}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-100 truncate">
                              {player.username}
                            </div>
                            <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                              <span>{player.rating || player.elo || 1200} ELO</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">
                                {player.wins}W / {player.losses}L
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right-Hand Side: Prominently Labeled Stake Tag + Direct Challenge Action */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-right">
                            <div className="text-[8px] text-slate-400 uppercase font-black tracking-wider leading-none">
                              Stake
                            </div>
                            <div className="text-xs font-black text-amber-300 leading-tight">
                              {selectedStakeSection === 0 ? 'Free' : `${selectedStakeSection.toLocaleString()} UGX`}
                            </div>
                          </div>

                          <button
                            id={`btn-challenge-${player.id}`}
                            onClick={() => handleChallengeWithStakeCheck(player, selectedStakeSection)}
                            disabled={player.status === 'in-game'}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition shadow ${
                              player.status === 'in-game'
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 cursor-pointer'
                            }`}
                          >
                            <Swords className="w-3 h-3" />
                            <span>{player.status === 'in-game' ? 'In Match' : 'Challenge'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Active Tables in this stake section */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl p-2 sm:p-2.5 flex flex-col justify-between shadow overflow-hidden min-h-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <h4 className="text-xs font-black text-white">
                      {selectedStakeSection === 0 ? 'Free Play' : `${selectedStakeSection.toLocaleString()} UGX`} Tables ({sectionRooms.length})
                    </h4>
                  </div>

                  <button
                    onClick={() => handleHostTableWithStakeCheck(selectedStakeSection)}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3 h-3" />
                    <span>Host Table</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 py-1.5 min-h-0 pr-1">
                  {sectionRooms.length === 0 ? (
                    <div className="py-6 text-center space-y-2 flex flex-col items-center justify-center h-full">
                      <Coins className="w-8 h-8 text-slate-600" />
                      <p className="text-slate-300 text-xs font-medium">
                        No active tables in the {selectedStakeSection.toLocaleString()} UGX section.
                      </p>
                      <button
                        onClick={() => handleHostTableWithStakeCheck(selectedStakeSection)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 hover:bg-amber-500/30 transition"
                      >
                        Create the First {selectedStakeSection.toLocaleString()} UGX Table
                      </button>
                    </div>
                  ) : (
                    sectionRooms.map((room) => (
                      <div
                        key={room.id}
                        id={`section-room-${room.id}`}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 space-y-1.5 shadow-sm hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-black text-slate-200 truncate">
                            {room.name}
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                              room.status === 'waiting'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : room.status === 'playing'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {room.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-around bg-slate-900/90 py-1 px-2 rounded-lg border border-slate-800/80 text-[11px]">
                          <div className="text-center font-bold text-rose-400 truncate max-w-[40%]">
                            {room.redPlayer ? room.redPlayer.username : 'Waiting...'}
                          </div>
                          <span className="text-slate-600 font-extrabold text-[9px]">VS</span>
                          <div className="text-center font-bold text-slate-300 truncate max-w-[40%]">
                            {room.blackPlayer ? room.blackPlayer.username : 'Waiting for Opponent'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            id={`btn-join-section-table-${room.id}`}
                            onClick={() => handleJoinTableWithStakeCheck(room.id, selectedStakeSection)}
                            className="flex-1 py-1 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border border-amber-400 transition flex items-center justify-center gap-1 cursor-pointer active:scale-98"
                          >
                            {room.status === 'waiting' && !room.blackPlayer ? (
                              <>
                                <Swords className="w-3 h-3" />
                                <span>Join Table ({selectedStakeSection === 0 ? 'Free' : `${selectedStakeSection.toLocaleString()} UGX`})</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" /> Spectate
                              </>
                            )}
                          </button>

                          {(room.redPlayer?.id === currentUser.id ||
                            room.blackPlayer?.id === currentUser.id) &&
                            onDeleteGameRoom && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteGameRoom(room.id);
                                }}
                                className="py-1 px-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800/80 transition flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                                title="Delete this Table"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: ALL PLAYERS (Users can see each other, filter & challenge with their chosen stake labeled on the right side) */}
        {viewMode === 'all_players' && (
          <div
            id="all-players-view"
            className="h-full bg-slate-900/70 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between shadow overflow-hidden"
          >
            {/* Filter by Stake Header Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-sm font-black text-white">
                  All Online Players ({otherOnlinePlayers.length})
                </h3>
              </div>

              {/* Stake Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5">
                <span className="text-[10px] text-slate-400 font-bold mr-1 shrink-0">Filter Stake:</span>
                <button
                  onClick={() => setAllPlayersStakeFilter('all')}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition ${
                    allPlayersStakeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  All
                </button>
                {STAKE_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setAllPlayersStakeFilter(tier.amount)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black border transition whitespace-nowrap ${
                      allPlayersStakeFilter === tier.amount
                        ? 'bg-amber-500 text-slate-950 border-amber-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Players List with Per-Player Stake Selection & Right-Hand Stake Label */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 py-1.5 min-h-0 pr-1">
              {otherOnlinePlayers.length === 0 ? (
                <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center h-full">
                  <Users className="w-10 h-10 text-slate-600" />
                  <p className="text-slate-300 text-xs font-bold">No other players online right now</p>
                  <p className="text-slate-500 text-[11px]">Invite opponents or practice against the AI bot.</p>
                </div>
              ) : (
                otherOnlinePlayers.map((player) => {
                  const currentStake =
                    allPlayersStakeFilter !== 'all'
                      ? (allPlayersStakeFilter as number)
                      : (playerStakeMap[player.id] ?? 500);

                  return (
                    <div
                      key={player.id}
                      id={`all-players-row-${player.id}`}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 flex items-center justify-between gap-2 hover:border-slate-700 transition"
                    >
                      {/* Avatar, Username & Rating */}
                      <div className="flex items-center gap-2 min-w-0">
                        <AvatarBadge
                          avatarId={player.avatarId}
                          size="sm"
                          showStatus
                          status={player.status}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-100 truncate">
                            {player.username}
                          </div>
                          <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                            <span>{player.rating || player.elo || 1200} ELO</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-slate-400">
                              {player.wins}W / {player.losses}L
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Hand Stake Selector & Challenge Button */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Inline Stake Selector / Label */}
                        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                          <label className="text-[9px] text-slate-400 font-bold uppercase hidden sm:inline">
                            Stake:
                          </label>
                          <select
                            value={currentStake}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPlayerStakeMap((prev) => ({ ...prev, [player.id]: val }));
                            }}
                            className="bg-slate-950 text-amber-300 font-black text-[11px] rounded px-1.5 py-0.5 border border-slate-700 focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value={0}>Free (0 UGX)</option>
                            <option value={500}>500 UGX</option>
                            <option value={1000}>1,000 UGX</option>
                            <option value={2000}>2,000 UGX</option>
                            <option value={5000}>5,000 UGX</option>
                            <option value={10000}>10,000 UGX</option>
                            <option value={20000}>20,000 UGX</option>
                          </select>
                        </div>

                        {/* Challenge with chosen stake */}
                        <button
                          id={`btn-all-players-challenge-${player.id}`}
                          onClick={() => handleChallengeWithStakeCheck(player, currentStake)}
                          disabled={player.status === 'in-game'}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-black transition shadow ${
                            player.status === 'in-game'
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 cursor-pointer'
                          }`}
                        >
                          <Swords className="w-3 h-3" />
                          <span>{player.status === 'in-game' ? 'In Match' : 'Challenge'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: ALL ACTIVE TABLES */}
        {viewMode === 'all_tables' && (
          <div
            id="all-tables-view"
            className="h-full bg-slate-900/70 border border-slate-800/90 rounded-xl p-2.5 flex flex-col justify-between shadow overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 shrink-0">
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs sm:text-sm font-black text-white">All Active Game Tables</h3>
                <span className="px-2 py-0.2 rounded-full bg-slate-800 text-rose-400 text-[10px] font-bold border border-slate-700">
                  {gameRooms.length}
                </span>
              </div>
              <button
                id="btn-all-tables-host"
                onClick={() => handleHostTableWithStakeCheck(500)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Host Table</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 py-1.5 min-h-0 pr-1">
              {gameRooms.length === 0 ? (
                <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center h-full">
                  <Coins className="w-8 h-8 text-slate-600" />
                  <p className="text-slate-400 text-xs font-medium">
                    No active game tables created yet.
                  </p>
                  <button
                    onClick={() => handleHostTableWithStakeCheck(500)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 hover:bg-amber-500/30 transition"
                  >
                    Host a 500 UGX Game Table
                  </button>
                </div>
              ) : (
                gameRooms.map((room) => (
                  <div
                    key={room.id}
                    id={`all-table-room-${room.id}`}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-2 space-y-1.5 shadow-sm hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-slate-200 truncate">
                        {room.name}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {room.stakeAmount && room.stakeAmount > 0 ? (
                          <span className="px-2 py-0.2 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Stake: {room.stakeAmount.toLocaleString()} UGX
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded-md text-[9px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Free Play
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                            room.status === 'waiting'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : room.status === 'playing'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-around bg-slate-900/90 py-1 px-2 rounded-lg border border-slate-800/80 text-xs">
                      <div className="text-center font-bold text-rose-400 truncate max-w-[40%]">
                        {room.redPlayer ? room.redPlayer.username : 'Waiting...'}
                      </div>
                      <span className="text-slate-600 font-extrabold text-[10px]">VS</span>
                      <div className="text-center font-bold text-slate-300 truncate max-w-[40%]">
                        {room.blackPlayer ? room.blackPlayer.username : 'Waiting for Opponent'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        id={`btn-join-all-table-${room.id}`}
                        onClick={() => handleJoinTableWithStakeCheck(room.id, room.stakeAmount || 0)}
                        className="flex-1 py-1 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {room.status === 'waiting' && !room.blackPlayer ? (
                          <>
                            <Swords className="w-3 h-3" />
                            <span>
                              {(room.stakeAmount || 0) > 0
                                ? `Join (${(room.stakeAmount || 0).toLocaleString()} UGX Stake)`
                                : 'Join Free Table'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 text-amber-400" /> Spectate
                          </>
                        )}
                      </button>

                      {(room.redPlayer?.id === currentUser.id ||
                        room.blackPlayer?.id === currentUser.id) &&
                        onDeleteGameRoom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteGameRoom(room.id);
                            }}
                            className="py-1 px-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800/80 transition flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                            title="Delete Table"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bot Difficulty Selection Modal */}
      {showBotModal && (
        <div
          id="bot-difficulty-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-3 shadow-2xl relative">
            <button
              onClick={() => setShowBotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-1">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Select Bot Difficulty
              </h3>
              <p className="text-xs text-slate-400">
                Choose your AI opponent level to practice your strategies.
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(BOT_DIFFICULTIES) as BotDifficulty[]).map((diffKey) => {
                const config = BOT_DIFFICULTIES[diffKey];
                return (
                  <button
                    key={diffKey}
                    id={`bot-diff-${diffKey}`}
                    onClick={() => handleStartBotGame(diffKey)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/60 transition group flex items-center justify-between gap-3 shadow active:scale-98"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="text-xl shrink-0 p-1.5 rounded-lg bg-slate-900 border border-slate-800 group-hover:scale-110 transition">
                        {config.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs sm:text-sm text-white group-hover:text-amber-400 transition">
                            {config.name}
                          </span>
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${config.badgeColor}`}
                          >
                            {config.rating} ELO
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {config.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition font-bold text-xs">
                      Play &rarr;
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
