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
  ShieldAlert,
  Trash2,
  Wallet,
  Coins,
  ArrowRight,
  Filter,
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Crown,
  Play,
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
}

type LobbyViewMode = 'stake_cards' | 'stake_section' | 'all_players' | 'all_tables';

interface StakeCardConfig {
  amount: number;
  label: string;
  badge: string;
  badgeColor: string;
  gradient: string;
  borderColor: string;
  textColor: string;
  description: string;
  isPopular?: boolean;
}

const STAKE_CARD_TEMPLATES: StakeCardConfig[] = [
  {
    amount: 500,
    label: '500 UGX',
    badge: '🎁 Welcome Bonus Stake',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    gradient: 'from-amber-950/60 via-slate-900 to-amber-950/40',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    textColor: 'text-amber-400',
    description: 'Use your 500 UGX welcome bonus to compete and win 1,000 UGX!',
    isPopular: true,
  },
  {
    amount: 1000,
    label: '1,000 UGX',
    badge: '⚔️ Challenger Tier',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-emerald-500/40 hover:border-emerald-400',
    textColor: 'text-emerald-400',
    description: 'Standard competitive stake. Winner takes 2,000 UGX pot.',
  },
  {
    amount: 2000,
    label: '2,000 UGX',
    badge: '🏆 Champion Arena',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    gradient: 'from-cyan-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-cyan-500/40 hover:border-cyan-400',
    textColor: 'text-cyan-400',
    description: 'Elevated stakes for seasoned checkers strategists (4,000 UGX Pot).',
  },
  {
    amount: 5000,
    label: '5,000 UGX',
    badge: '👑 Master Tier',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    gradient: 'from-purple-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-purple-500/40 hover:border-purple-400',
    textColor: 'text-purple-400',
    description: 'High-stake master games with a 10,000 UGX prize pot.',
  },
  {
    amount: 10000,
    label: '10,000 UGX',
    badge: '💎 Grandmaster Tier',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    gradient: 'from-rose-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-rose-500/40 hover:border-rose-400',
    textColor: 'text-rose-400',
    description: 'Elite showdowns for serious players (20,000 UGX Pot).',
  },
  {
    amount: 20000,
    label: '20,000 UGX',
    badge: '🔥 High Roller',
    badgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    gradient: 'from-yellow-950/50 via-slate-900 to-slate-950',
    borderColor: 'border-yellow-500/50 hover:border-yellow-400',
    textColor: 'text-yellow-400',
    description: 'The arena maximum stake. Winner takes 40,000 UGX.',
  },
  {
    amount: 0,
    label: 'Free Play (0 UGX)',
    badge: '⚡ Casual & Practice',
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
}) => {
  const [viewMode, setViewMode] = useState<LobbyViewMode>('stake_cards');
  const [selectedStakeSection, setSelectedStakeSection] = useState<number>(500);
  const [showBotModal, setShowBotModal] = useState(false);

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

  // Rooms matching selected stake section
  const sectionRooms = gameRooms.filter(
    (room) => (room.stakeAmount || 0) === selectedStakeSection
  );

  const walletBalance = currentUser.walletBalance ?? 500;
  const currentStakeConfig =
    STAKE_CARD_TEMPLATES.find((t) => t.amount === selectedStakeSection) ||
    STAKE_CARD_TEMPLATES[0];

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] p-2 sm:p-4 flex flex-col justify-between gap-2 overflow-hidden select-none">
      {/* Top Banner / User Quick Bar */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-slate-800 p-2 sm:p-3 shadow-xl shrink-0">
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarBadge avatarId={currentUser.avatarId} size="sm" showStatus status="online" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-base font-black text-white truncate">
                  {currentUser.username}
                </h2>
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                  {currentUser.rating || currentUser.elo || 1200} ELO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                Choose a stake card below to enter its section & challenge players with matching stakes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
            {/* Wallet Balance with Instant Deposit action */}
            <button
              onClick={onOpenWallet}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-500/50 hover:border-amber-400 text-amber-300 text-xs font-bold transition shadow"
              title="Wallet Balance & Deposits"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400" />
              <span>{walletBalance.toLocaleString()} UGX</span>
              <span className="text-[9px] font-black bg-amber-500 text-slate-950 px-1 rounded ml-0.5">
                + Top Up
              </span>
            </button>

            {/* Practice vs Bot */}
            <button
              onClick={() => setShowBotModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs border border-slate-700 transition"
              title="Practice vs AI Bot"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Practice Bot</span>
            </button>

            {/* Host Table */}
            <button
              onClick={() =>
                onOpenCreateTableModal(
                  viewMode === 'stake_section' ? selectedStakeSection : 500
                )
              }
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-slate-950 font-black text-xs shadow-md transition active:scale-95 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Host Table</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-amber-400 border border-slate-700 transition shadow"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5">
          <button
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
              onClick={() => setViewMode('stake_section')}
              className="px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 whitespace-nowrap bg-amber-500 text-slate-950 border border-amber-400 shadow animate-fade-in"
            >
              <span>🎯 {selectedStakeSection === 0 ? 'Free Play' : `${selectedStakeSection.toLocaleString()} UGX Section`}</span>
            </button>
          )}

          <button
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
          onClick={onOpenLeaderboard}
          className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300 transition shrink-0"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Leaderboard</span>
        </button>
      </div>

      {/* MAIN CONTENT VIEWS */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* VIEW 1: STAKE CARDS GRID TEMPLATE */}
        {viewMode === 'stake_cards' && (
          <div className="h-full overflow-y-auto custom-scrollbar space-y-2.5 pr-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                  <span>Match Stake Arenas</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700 font-bold">
                    Select a Stake Card to Enter Section
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Click any card template below to find opponents and challenge players with that exact stake.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {STAKE_CARD_TEMPLATES.map((tier) => {
                const tablesInTier = gameRooms.filter(
                  (r) => (r.stakeAmount || 0) === tier.amount
                ).length;
                const potAmount = tier.amount === 0 ? 0 : tier.amount * 2;

                return (
                  <div
                    key={tier.amount}
                    onClick={() => handleEnterStakeSection(tier.amount)}
                    className={`relative group bg-gradient-to-br ${tier.gradient} border ${tier.borderColor} rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg hover:shadow-2xl transition duration-200 cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.99]`}
                  >
                    {tier.isPopular && (
                      <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-red-600 text-slate-950 text-[9px] font-black shadow uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Welcome Bonus Stake
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${tier.badgeColor}`}
                        >
                          {tier.badge}
                        </span>
                        <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>{tablesInTier} Tables</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-baseline gap-1">
                          <span className={tier.textColor}>{tier.label}</span>
                        </div>
                        {tier.amount > 0 ? (
                          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                            <span>Winner Takes:</span>
                            <strong className="text-white">{potAmount.toLocaleString()} UGX Pot</strong>
                          </div>
                        ) : (
                          <div className="text-xs font-bold text-blue-400 mt-0.5">
                            Practice & ELO Rating Matches
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {tier.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                        <Users className="w-3 h-3 text-amber-400" />
                        <span>{otherOnlinePlayers.length} Challengers</span>
                      </span>

                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 text-amber-300 text-xs font-black transition flex items-center gap-1 shadow"
                      >
                        <span>Enter Section</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: DEDICATED STAKE SECTION VIEW */}
        {viewMode === 'stake_section' && (
          <div className="h-full flex flex-col justify-between gap-2 overflow-hidden">
            {/* Stake Section Header Bar */}
            <div className="bg-gradient-to-r from-slate-900 via-amber-950/50 to-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setViewMode('stake_cards')}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs font-bold shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">All Stake Cards</span>
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-base font-black text-white truncate">
                      {selectedStakeSection === 0
                        ? 'Free Play Arena (0 UGX)'
                        : `${selectedStakeSection.toLocaleString()} UGX Stake Section`}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${currentStakeConfig.badgeColor}`}>
                      {currentStakeConfig.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400 font-bold truncate">
                    {selectedStakeSection > 0
                      ? `Winner takes ${(selectedStakeSection * 2).toLocaleString()} UGX Pot • 15s Turn Clock`
                      : 'Casual / Practice matches with no monetary stakes'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => onOpenCreateTableModal(selectedStakeSection)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Host {selectedStakeSection === 0 ? 'Free' : `${selectedStakeSection.toLocaleString()} UGX`} Table</span>
                </button>
              </div>
            </div>

            {/* Split Columns: Challengers on Left with Right-Hand Stake Label, Tables on Right */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 min-h-0 overflow-hidden">
              {/* Left Column: Online Players available in this stake section */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-lg overflow-hidden min-h-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      Available Opponents ({otherOnlinePlayers.length})
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Stake labeled on right side of tags
                  </span>
                </div>

                {/* Players List with right-hand labeled stake amount */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-2 min-h-0 pr-1">
                  {otherOnlinePlayers.length === 0 ? (
                    <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center h-full">
                      <Users className="w-10 h-10 text-slate-600" />
                      <p className="text-slate-300 text-xs font-bold">
                        No other players online in this moment
                      </p>
                      <p className="text-slate-500 text-[11px] max-w-xs">
                        Create a {selectedStakeSection.toLocaleString()} UGX table above or practice against the AI Bot.
                      </p>
                      <button
                        onClick={() => setShowBotModal(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold border border-slate-700"
                      >
                        Practice vs Bot
                      </button>
                    </div>
                  ) : (
                    otherOnlinePlayers.map((player) => (
                      <div
                        key={player.id}
                        className="bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-2 transition shadow-sm"
                      >
                        {/* Left Side: Avatar, Name & ELO */}
                        <div className="flex items-center gap-2.5 min-w-0">
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
                            <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1.5">
                              <span>{player.rating || player.elo || 1200} ELO</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-slate-400">
                                {player.wins}W / {player.losses}L
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right-Hand Side: Prominently Labeled Stake Amount Tag + Direct Challenge Action */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Labeled Stake Amount on the right-hand side of player's tag */}
                          <div className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-right">
                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider leading-none">
                              Stake
                            </div>
                            <div className="text-xs font-black text-amber-300 leading-tight">
                              {selectedStakeSection === 0 ? 'Free' : `${selectedStakeSection.toLocaleString()} UGX`}
                            </div>
                          </div>

                          {/* Challenge button */}
                          <button
                            onClick={() => onInitiateChallenge(player, selectedStakeSection)}
                            disabled={player.status === 'in-game'}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition shadow ${
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
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-lg overflow-hidden min-h-0">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-rose-400" />
                    <h4 className="text-xs sm:text-sm font-black text-white">
                      {selectedStakeSection === 0 ? 'Free Play' : `${selectedStakeSection.toLocaleString()} UGX`} Tables ({sectionRooms.length})
                    </h4>
                  </div>

                  <button
                    onClick={() => onOpenCreateTableModal(selectedStakeSection)}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Host Table</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-2 min-h-0 pr-1">
                  {sectionRooms.length === 0 ? (
                    <div className="py-8 text-center space-y-2 flex flex-col items-center justify-center h-full">
                      <Coins className="w-8 h-8 text-slate-600" />
                      <p className="text-slate-300 text-xs font-medium">
                        No active tables in the {selectedStakeSection.toLocaleString()} UGX section.
                      </p>
                      <button
                        onClick={() => onOpenCreateTableModal(selectedStakeSection)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 hover:bg-amber-500/30 transition"
                      >
                        Create the First {selectedStakeSection.toLocaleString()} UGX Table
                      </button>
                    </div>
                  ) : (
                    sectionRooms.map((room) => (
                      <div
                        key={room.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-black text-slate-200 truncate">
                            {room.name}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
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

                        <div className="flex items-center justify-around bg-slate-900/90 py-1.5 px-3 rounded-lg border border-slate-800/80 text-xs">
                          <div className="text-center font-bold text-rose-400 text-xs truncate max-w-[40%]">
                            {room.redPlayer ? room.redPlayer.username : 'Waiting...'}
                          </div>
                          <span className="text-slate-600 font-extrabold text-[10px]">VS</span>
                          <div className="text-center font-bold text-slate-300 text-xs truncate max-w-[40%]">
                            {room.blackPlayer ? room.blackPlayer.username : 'Waiting for Opponent'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            onClick={() => onJoinGameRoom(room.id)}
                            className="flex-1 py-1.5 rounded-lg font-bold text-xs bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 border border-amber-400 transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                          >
                            {room.status === 'waiting' && !room.blackPlayer ? (
                              <>
                                <Swords className="w-3.5 h-3.5" />
                                <span>Join Table ({selectedStakeSection === 0 ? 'Free' : `${selectedStakeSection.toLocaleString()} UGX`})</span>
                              </>
                            ) : (
                              <>
                                <Eye className="w-3.5 h-3.5" /> Spectate
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
                                className="py-1.5 px-2.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800/80 transition flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                                title="Delete this Table"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

        {/* VIEW 3: ALL PLAYERS */}
        {viewMode === 'all_players' && (
          <div className="h-full bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs sm:text-base font-black text-white">Online Checkers Arena Players</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-bold border border-slate-700">
                  {otherOnlinePlayers.length}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-2 min-h-0 pr-1">
              {otherOnlinePlayers.length === 0 ? (
                <div className="py-12 text-center space-y-3 flex flex-col items-center justify-center h-full">
                  <Users className="w-12 h-12 text-slate-600" />
                  <p className="text-slate-300 text-xs font-bold">No other players online right now</p>
                </div>
              ) : (
                otherOnlinePlayers.map((player) => (
                  <div
                    key={player.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1.5">
                          <span>{player.rating || player.elo || 1200} ELO</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-slate-400">
                            {player.wins}W / {player.losses}L
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onInitiateChallenge(player)}
                      disabled={player.status === 'in-game'}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition shadow ${
                        player.status === 'in-game'
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 cursor-pointer'
                      }`}
                    >
                      <Swords className="w-3 h-3" />
                      <span>{player.status === 'in-game' ? 'In Match' : 'Challenge'}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: ALL TABLES */}
        {viewMode === 'all_tables' && (
          <div className="h-full bg-slate-900/70 border border-slate-800/90 rounded-2xl p-3 flex flex-col justify-between shadow-lg overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 shrink-0">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs sm:text-base font-black text-white">All Active Game Tables</h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-rose-400 text-[10px] font-bold border border-slate-700">
                  {gameRooms.length}
                </span>
              </div>
              <button
                onClick={() => onOpenCreateTableModal(500)}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Host Table</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 py-2 min-h-0 pr-1">
              {gameRooms.length === 0 ? (
                <div className="py-12 text-center space-y-2 flex flex-col items-center justify-center h-full">
                  <Coins className="w-8 h-8 text-slate-600" />
                  <p className="text-slate-400 text-xs font-medium">
                    No active game tables created yet.
                  </p>
                  <button
                    onClick={() => onOpenCreateTableModal(500)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 hover:bg-amber-500/30 transition"
                  >
                    Host a 500 UGX Game Table
                  </button>
                </div>
              ) : (
                gameRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 space-y-2 shadow-sm hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black text-slate-200 truncate">
                        {room.name}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {room.stakeAmount && room.stakeAmount > 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Stake: {room.stakeAmount.toLocaleString()} UGX | Pot: {(room.potAmount || room.stakeAmount * 2).toLocaleString()} UGX
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800">
                            Free Play
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
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

                    <div className="flex items-center justify-around bg-slate-900/90 py-1.5 px-3 rounded-lg border border-slate-800/80 text-xs">
                      <div className="text-center font-bold text-rose-400 text-xs truncate max-w-[40%]">
                        {room.redPlayer ? room.redPlayer.username : 'Waiting...'}
                      </div>
                      <span className="text-slate-600 font-extrabold text-[10px]">VS</span>
                      <div className="text-center font-bold text-slate-300 text-xs truncate max-w-[40%]">
                        {room.blackPlayer ? room.blackPlayer.username : 'Waiting for Opponent'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 pt-0.5">
                      <button
                        onClick={() => onJoinGameRoom(room.id)}
                        className="flex-1 py-1.5 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {room.status === 'waiting' && !room.blackPlayer ? (
                          <>
                            <Swords className="w-3.5 h-3.5" />
                            <span>
                              {(room.stakeAmount || 0) > 0
                                ? `Join (${(room.stakeAmount || 0).toLocaleString()} UGX Stake)`
                                : 'Join Free Table'}
                            </span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5 text-amber-400" /> Spectate
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
                            className="py-1.5 px-2.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-bold text-xs border border-rose-800/80 transition flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                            title="Delete Table"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowBotModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mb-1">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Select Bot Difficulty
              </h3>
              <p className="text-xs text-slate-400">
                Choose your AI opponent level to practice your strategies.
              </p>
            </div>

            <div className="space-y-2.5">
              {(Object.keys(BOT_DIFFICULTIES) as BotDifficulty[]).map((diffKey) => {
                const config = BOT_DIFFICULTIES[diffKey];
                return (
                  <button
                    key={diffKey}
                    onClick={() => handleStartBotGame(diffKey)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/60 transition group flex items-center justify-between gap-3 shadow active:scale-98"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-2xl shrink-0 p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:scale-110 transition">
                        {config.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-white group-hover:text-amber-400 transition">
                            {config.name}
                          </span>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${config.badgeColor}`}
                          >
                            {config.rating} ELO
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {config.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition font-bold text-sm">
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
