var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = require("http");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_ws = require("ws");
var import_vite = require("vite");

// src/lib/checkersEngine.ts
function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  let pieceCounter = 1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c) % 2 === 1) {
        if (r < 3) {
          board[r][c] = {
            id: `p-${pieceCounter++}`,
            color: "red",
            type: "pawn",
            row: r,
            col: c
          };
        } else if (r > 4) {
          board[r][c] = {
            id: `p-${pieceCounter++}`,
            color: "black",
            type: "pawn",
            row: r,
            col: c
          };
        }
      }
    }
  }
  return board;
}
function isValidPosition(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}
function getDirectionsForPiece(piece) {
  if (piece.type === "king") {
    return [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];
  }
  if (piece.color === "red") {
    return [
      [1, -1],
      [1, 1]
    ];
  } else {
    return [
      [-1, -1],
      [-1, 1]
    ];
  }
}
function findJumpChains(board, piece, currentPos, currentCaptures, currentPath) {
  const results = [];
  const directions = getDirectionsForPiece(piece);
  let foundJump = false;
  for (const [dr, dc] of directions) {
    const midR = currentPos.row + dr;
    const midC = currentPos.col + dc;
    const landR = currentPos.row + dr * 2;
    const landC = currentPos.col + dc * 2;
    if (isValidPosition(landR, landC)) {
      const midPiece = board[midR][midC];
      const landPiece = board[landR][landC];
      if (midPiece && midPiece.color !== piece.color && !currentCaptures.some((p) => p.row === midR && p.col === midC)) {
        const isLandingEmpty = !landPiece || landR === currentPath[0].row && landC === currentPath[0].col;
        if (isLandingEmpty) {
          foundJump = true;
          const nextCaptures = [...currentCaptures, { row: midR, col: midC }];
          const nextPath = [...currentPath, { row: landR, col: landC }];
          const becomesKing = piece.type === "pawn" && (piece.color === "red" && landR === 7 || piece.color === "black" && landR === 0);
          if (becomesKing) {
            results.push({
              from: currentPath[0],
              to: { row: landR, col: landC },
              captures: nextCaptures,
              path: nextPath,
              becomesKing: true
            });
          } else {
            const tempPiece = { ...piece, row: landR, col: landC };
            const subJumps = findJumpChains(
              board,
              tempPiece,
              { row: landR, col: landC },
              nextCaptures,
              nextPath
            );
            if (subJumps.length > 0) {
              results.push(...subJumps);
            } else {
              results.push({
                from: currentPath[0],
                to: { row: landR, col: landC },
                captures: nextCaptures,
                path: nextPath,
                becomesKing: piece.type === "king"
              });
            }
          }
        }
      }
    }
  }
  return results;
}
function getValidMovesForPiece(board, piece) {
  const startPos = { row: piece.row, col: piece.col };
  const jumps = findJumpChains(board, piece, startPos, [], [startPos]);
  const simpleMoves = [];
  const directions = getDirectionsForPiece(piece);
  for (const [dr, dc] of directions) {
    const nr = piece.row + dr;
    const nc = piece.col + dc;
    if (isValidPosition(nr, nc) && !board[nr][nc]) {
      const becomesKing = piece.type === "pawn" && (piece.color === "red" && nr === 7 || piece.color === "black" && nr === 0);
      simpleMoves.push({
        from: startPos,
        to: { row: nr, col: nc },
        captures: [],
        path: [startPos, { row: nr, col: nc }],
        becomesKing
      });
    }
  }
  return [...jumps, ...simpleMoves];
}
function getValidMovesForPlayer(board, color, forcedJumps = true) {
  const movesPerPiece = [];
  const playerPieces = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        playerPieces.push(p);
      }
    }
  }
  for (const piece of playerPieces) {
    const pieceMoves = getValidMovesForPiece(board, piece);
    movesPerPiece.push(...pieceMoves);
  }
  const jumpMoves = movesPerPiece.filter((m) => m.captures && m.captures.length > 0);
  if (forcedJumps && jumpMoves.length > 0) {
    return jumpMoves;
  }
  return movesPerPiece;
}
function executeMove(board, move) {
  const newBoard = board.map(
    (row) => row.map((cell) => cell ? { ...cell } : null)
  );
  const piece = newBoard[move.from.row][move.from.col];
  if (!piece) {
    return { newBoard, capturedPiece: null, becameKing: false };
  }
  newBoard[move.from.row][move.from.col] = null;
  let capturedPiece = null;
  for (const cap of move.captures) {
    if (newBoard[cap.row][cap.col]) {
      capturedPiece = newBoard[cap.row][cap.col];
      newBoard[cap.row][cap.col] = null;
    }
  }
  let becameKing = false;
  let newType = piece.type;
  if (piece.type === "pawn" && (piece.color === "red" && move.to.row === 7 || piece.color === "black" && move.to.row === 0)) {
    becameKing = true;
    newType = "king";
  }
  newBoard[move.to.row][move.to.col] = {
    ...piece,
    row: move.to.row,
    col: move.to.col,
    type: newType
  };
  return { newBoard, capturedPiece, becameKing };
}
function checkGameOver(board, currentTurn) {
  let redCount = 0;
  let blackCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        if (p.color === "red") redCount++;
        if (p.color === "black") blackCount++;
      }
    }
  }
  if (redCount === 0) {
    return { isOver: true, winner: "black", reason: "All Red pieces captured" };
  }
  if (blackCount === 0) {
    return { isOver: true, winner: "red", reason: "All Black pieces captured" };
  }
  const moves = getValidMovesForPlayer(board, currentTurn);
  if (moves.length === 0) {
    const winner = currentTurn === "red" ? "black" : "red";
    return {
      isOver: true,
      winner,
      reason: `${currentTurn.toUpperCase()} has no available moves`
    };
  }
  return { isOver: false, winner: null };
}
function getBestBotMove(board, botColor) {
  const validMoves = getValidMovesForPlayer(board, botColor);
  if (validMoves.length === 0) return null;
  const captureMoves = validMoves.filter((m) => m.captures.length > 0);
  if (captureMoves.length > 0) {
    captureMoves.sort((a, b) => b.captures.length - a.captures.length);
    return captureMoves[0];
  }
  let bestMove = validMoves[0];
  let bestScore = -Infinity;
  for (const move of validMoves) {
    let score = 0;
    if (move.becomesKing) score += 50;
    const centerDist = Math.abs(3.5 - move.to.row) + Math.abs(3.5 - move.to.col);
    score -= centerDist * 2;
    if (botColor === "red") {
      score += move.to.row * 3;
    } else {
      score += (7 - move.to.row) * 3;
    }
    if (botColor === "red" && move.from.row === 0 || botColor === "black" && move.from.row === 7) {
      score -= 5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  return bestMove;
}

// server/pesajetService.ts
var import_crypto = __toESM(require("crypto"), 1);
var PesajetService = class {
  getConfig() {
    return {
      apiKey: process.env.PESAJET_API_KEY || "pk_f89be8bd38a605a5eccb68d5719362410e8235e0a9925f20",
      apiSecret: process.env.PESAJET_API_SECRET || "sk_09c75a891c55e4b755df59dd12a8d80b3199d16736af9712",
      webhookSecret: process.env.PESAJET_WEBHOOK_SECRET || "whsec_bf04d3ace455bc25d12d3bc76ce37d91c40cb1b55eba74d2",
      baseUrl: process.env.PESAJET_BASE_URL || "https://payments.pesajet.com/api/v1"
    };
  }
  isConfigured() {
    const config = this.getConfig();
    return Boolean(config.apiKey && config.apiKey.length > 5);
  }
  /**
   * Format phone number to international standard with leading +256
   */
  formatUgandaPhone(raw) {
    let clean = (raw || "").replace(/\D/g, "");
    if (clean.startsWith("0")) {
      clean = "256" + clean.substring(1);
    } else if (clean.length === 9) {
      clean = "256" + clean;
    }
    return "+" + clean;
  }
  /**
   * Determine provider from Uganda phone number prefix
   */
  detectProvider(raw) {
    const clean = (raw || "").replace(/\D/g, "");
    const num = clean.startsWith("256") ? clean.substring(3) : clean.startsWith("0") ? clean.substring(1) : clean;
    if (num.startsWith("77") || num.startsWith("78") || num.startsWith("76") || num.startsWith("79") || num.startsWith("39")) {
      return "mtn";
    }
    if (num.startsWith("70") || num.startsWith("75") || num.startsWith("74")) {
      return "airtel";
    }
    return "mtn";
  }
  /**
   * Sanitize description for MTN/Airtel gateways: strictly alphanumeric + space, max 30 chars
   */
  sanitizeDescription(desc, maxLen = 30) {
    if (!desc) return "Checkers Arena";
    const cleaned = desc.replace(/[^a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.substring(0, maxLen) || "Checkers Arena";
  }
  /**
   * Initiate a Mobile Money payment (Collection / Deposit) or Disbursement (Cashout / Payout)
   */
  async createPayment(params) {
    const config = this.getConfig();
    const formattedPhone = this.formatUgandaPhone(params.phoneNumber);
    const provider = params.provider || this.detectProvider(params.phoneNumber);
    const currency = params.currency || "UGX";
    const safeDescription = this.sanitizeDescription(params.description || `Deposit ${params.amount} UGX`);
    const url = `${config.baseUrl}/payments`;
    const payload = {
      type: params.type,
      amount: Number(params.amount),
      currency,
      phoneNumber: formattedPhone,
      provider,
      reference: params.reference,
      idempotencyKey: params.idempotencyKey,
      description: safeDescription
    };
    console.log(`[PesaJet] Request to ${url}:`, JSON.stringify(payload));
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey.trim()
      },
      body: JSON.stringify(payload)
    });
    const responseText = await response.text();
    console.log(`[PesaJet] Response (${response.status}):`, responseText);
    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`PesaJet payment request failed (HTTP ${response.status}): ${responseText.substring(0, 120)}`);
    }
    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `PesaJet API error (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }
    const txId = data.transactionId || data.id || data.data?.transactionId || data.data?.id;
    const status = data.status || data.data?.status || "PENDING";
    return {
      id: txId,
      transactionId: txId,
      status,
      reference: params.reference,
      amount: params.amount,
      currency,
      phoneNumber: formattedPhone,
      provider,
      message: data.message
    };
  }
  /**
   * Query status of a transaction by its transactionId
   */
  async getTransactionStatus(transactionId) {
    const config = this.getConfig();
    const url = `${config.baseUrl}/payments/${encodeURIComponent(transactionId)}`;
    console.log(`[PesaJet] Querying status: ${url}`);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey.trim(),
        "Accept": "application/json"
      }
    });
    const responseText = await response.text();
    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      throw new Error(`PesaJet status query failed (HTTP ${response.status})`);
    }
    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `Status query failed (HTTP ${response.status})`;
      throw new Error(errorMsg);
    }
    const result = data.data || data;
    const txId = result.transactionId || result.id || transactionId;
    const status = result.status || "PENDING";
    return {
      id: txId,
      transactionId: txId,
      status,
      reference: result.reference || "",
      amount: Number(result.amount) || 0,
      currency: result.currency || "UGX",
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      message: result.message
    };
  }
  /**
   * Verify HMAC-SHA256 signature on incoming webhook payload
   */
  verifyWebhookSignature(rawBody, receivedSignature) {
    if (!receivedSignature) return true;
    const config = this.getConfig();
    if (!config.webhookSecret) return true;
    try {
      const computed = import_crypto.default.createHmac("sha256", config.webhookSecret.trim()).update(rawBody).digest("hex");
      return import_crypto.default.timingSafeEqual(Buffer.from(computed), Buffer.from(receivedSignature.trim()));
    } catch (err) {
      console.warn("[PesaJet] Webhook signature verification error:", err);
      return true;
    }
  }
};
var pesajetService = new PesajetService();

// server.ts
var app = (0, import_express.default)();
var httpServer = (0, import_http.createServer)(app);
var wss = new import_ws.WebSocketServer({ server: httpServer });
var PORT = 3e3;
app.use(import_express.default.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Api-Version"
  );
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var USERS_FILE = import_path.default.join(DATA_DIR, "users.json");
var GAMES_FILE = import_path.default.join(DATA_DIR, "games.json");
var TRANSACTIONS_FILE = import_path.default.join(DATA_DIR, "transactions.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
var usersMap = /* @__PURE__ */ new Map();
var userSockets = /* @__PURE__ */ new Map();
var activeRooms = /* @__PURE__ */ new Map();
var activeChallenges = /* @__PURE__ */ new Map();
var globalChatMessages = [];
var transactionsList = [];
try {
  if (import_fs.default.existsSync(TRANSACTIONS_FILE)) {
    const rawTx = JSON.parse(import_fs.default.readFileSync(TRANSACTIONS_FILE, "utf-8"));
    if (Array.isArray(rawTx)) {
      transactionsList = rawTx;
      console.log(`Loaded ${transactionsList.length} persisted wallet transactions.`);
    }
  }
} catch (err) {
  console.error("Failed to load transactions file:", err);
}
function persistTransactions() {
  try {
    import_fs.default.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(transactionsList.slice(-1e3), null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save transactions:", err);
  }
}
try {
  if (import_fs.default.existsSync(USERS_FILE)) {
    const rawUsers = JSON.parse(import_fs.default.readFileSync(USERS_FILE, "utf-8"));
    if (Array.isArray(rawUsers)) {
      rawUsers.forEach((u) => {
        if (!u.id.startsWith("usr_arena_")) {
          usersMap.set(u.id, {
            ...u,
            walletBalance: typeof u.walletBalance === "number" ? u.walletBalance : 0,
            totalWon: typeof u.totalWon === "number" ? u.totalWon : 0,
            totalStaked: typeof u.totalStaked === "number" ? u.totalStaked : 0,
            status: "offline",
            isOnline: false
          });
        }
      });
      console.log(`Loaded ${usersMap.size} persisted user accounts.`);
    }
  }
} catch (err) {
  console.error("Failed to load users file:", err);
}
function persistUsers() {
  try {
    const usersArray = Array.from(usersMap.values()).filter((u) => !u.id.startsWith("usr_arena_")).map((u) => ({
      ...u,
      walletBalance: typeof u.walletBalance === "number" ? u.walletBalance : 0,
      status: userSockets.has(u.id) ? "online" : "offline"
    }));
    import_fs.default.writeFileSync(USERS_FILE, JSON.stringify(usersArray, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save users:", err);
  }
}
function recordTransaction(userId, type, amount, description, meta) {
  const tx = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId,
    type,
    amount,
    currency: "UGX",
    status: meta?.status || "completed",
    description,
    reference: meta?.reference,
    transactionReference: meta?.transactionReference,
    pesajetTransactionId: meta?.pesajetTransactionId,
    roomId: meta?.roomId,
    serviceFee: meta?.serviceFee,
    stakeAmount: meta?.stakeAmount,
    metadata: meta?.metadata,
    timestamp: Date.now()
  };
  transactionsList.unshift(tx);
  persistTransactions();
  return tx;
}
function adjustUserWallet(userId, delta, type, description, meta) {
  const user = usersMap.get(userId);
  if (!user) return null;
  user.walletBalance = Math.max(0, (user.walletBalance || 0) + delta);
  if (type === "stake_win") {
    user.totalWon = (user.totalWon || 0) + delta;
  }
  if (type === "stake_entry") {
    user.totalStaked = (user.totalStaked || 0) + Math.abs(delta);
  }
  usersMap.set(user.id, user);
  persistUsers();
  recordTransaction(userId, type, Math.abs(delta), description, meta);
  sendToUser(userId, "wallet:balance_updated", {
    walletBalance: user.walletBalance,
    totalWon: user.totalWon,
    totalStaked: user.totalStaked,
    user
  });
  return user;
}
function validateUsername(username) {
  if (!username || typeof username !== "string") {
    return { valid: false, message: "Username is required." };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 25) {
    return { valid: false, message: "Username must be between 2 and 25 characters." };
  }
  const validCharsRegex = /^[a-zA-Z0-9\s_-]+$/;
  if (!validCharsRegex.test(trimmed)) {
    return {
      valid: false,
      message: "Usernames can only contain letters, numbers, spaces, hyphens, and underscores."
    };
  }
  return { valid: true };
}
function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  userSockets.forEach((ws) => {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}
function sendToUser(userId, type, payload) {
  let ws = userSockets.get(userId);
  if (!ws || ws.readyState !== import_ws.WebSocket.OPEN) {
    const targetUser = usersMap.get(userId);
    for (const [uid, sock] of userSockets.entries()) {
      if (sock.readyState === import_ws.WebSocket.OPEN) {
        if (uid === userId) {
          ws = sock;
          break;
        }
        const u = usersMap.get(uid);
        if (targetUser && u && u.username.toLowerCase() === targetUser.username.toLowerCase()) {
          ws = sock;
          break;
        }
      }
    }
  }
  if (ws && ws.readyState === import_ws.WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}
function broadcastPresence() {
  const onlineUsers = [];
  userSockets.forEach((ws, userId) => {
    if (ws.readyState === import_ws.WebSocket.OPEN) {
      const u = usersMap.get(userId);
      if (u) {
        onlineUsers.push({
          id: u.id,
          username: u.username,
          avatarId: u.avatarId,
          rating: u.rating || u.elo || 1200,
          elo: u.elo || u.rating || 1200,
          status: u.status || "online",
          isOnline: true,
          wins: u.wins || 0,
          losses: u.losses || 0,
          draws: u.draws || 0
        });
      }
    }
  });
  broadcast("presence:list", onlineUsers);
}
function calculateElo(winnerRating, loserRating, isDraw = false) {
  const K = 32;
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;
  if (isDraw) {
    const newWinnerRating2 = Math.round(winnerRating + K * (0.5 - expectedWinner));
    const newLoserRating2 = Math.round(loserRating + K * (0.5 - expectedLoser));
    return { newWinnerRating: newWinnerRating2, newLoserRating: newLoserRating2 };
  }
  const newWinnerRating = Math.round(winnerRating + K * (1 - expectedWinner));
  const newLoserRating = Math.max(
    100,
    Math.round(loserRating + K * (0 - expectedLoser))
  );
  return { newWinnerRating, newLoserRating };
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.get("/api/pesajet/config-status", (req, res) => {
  const isConfigured = pesajetService.isConfigured();
  res.json({
    configured: isConfigured,
    provider: "PesaJet",
    currency: "UGX",
    supportedNetworks: ["MTN Mobile Money", "Airtel Money"],
    baseUrl: "https://payments.pesajet.com/api/v1"
  });
});
app.post(["/api/pesajet/initiate-deposit", "/api/pesajet/initiate-order", "/api/payments/initiate-deposit"], async (req, res) => {
  try {
    const { userId, amount, currency, phoneNumber, provider, description } = req.body;
    const parsedAmount = Number(amount);
    if (!userId || isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Invalid deposit parameters or amount." });
    }
    if (!phoneNumber || phoneNumber.trim().length < 9) {
      return res.status(400).json({ success: false, message: "Please provide a valid MTN or Airtel Mobile Money phone number." });
    }
    const user = usersMap.get(userId);
    const reference = `CHK_DEP_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const idempotencyKey = `dep-${userId}-${Date.now()}`;
    const detectedProvider = (provider || pesajetService.detectProvider(phoneNumber)).toLowerCase();
    console.log(`[PesaJet Deposit] Initiating ${parsedAmount} UGX collection for ${phoneNumber} (${detectedProvider})...`);
    const result = await pesajetService.createPayment({
      type: "COLLECTION",
      amount: parsedAmount,
      currency: currency || "UGX",
      phoneNumber,
      provider: detectedProvider,
      reference,
      idempotencyKey,
      description: description ? pesajetService.sanitizeDescription(description) : `Checkers Arena Deposit ${parsedAmount} UGX`
    });
    const txId = result.transactionId || result.id || reference;
    recordTransaction(
      userId,
      "deposit",
      parsedAmount,
      `Deposit via PesaJet Mobile Money (${parsedAmount} ${currency || "UGX"}) - ${detectedProvider.toUpperCase()}`,
      {
        reference,
        pesajetTransactionId: txId,
        status: "pending"
      }
    );
    return res.json({
      success: true,
      transactionId: txId,
      reference,
      amount: parsedAmount,
      currency: currency || "UGX",
      provider: detectedProvider,
      status: result.status,
      message: `Prompt sent to ${phoneNumber}! Please enter your Mobile Money PIN on your phone to complete payment.`
    });
  } catch (err) {
    console.error("Error initiating PesaJet deposit:", err);
    res.status(500).json({ success: false, message: err.message || "Failed to initiate Mobile Money deposit" });
  }
});
app.get(["/api/pesajet/verify-status", "/api/payments/verify-status"], async (req, res) => {
  try {
    const { transactionId, reference, userId } = req.query;
    if (!transactionId && !reference) {
      return res.status(400).json({ success: false, message: "Missing transactionId or reference" });
    }
    let tx = transactionsList.find(
      (t) => transactionId && t.pesajetTransactionId === transactionId || reference && t.reference === reference
    );
    let statusResult = transactionId ? await pesajetService.getTransactionStatus(transactionId) : null;
    const rawStatus = (statusResult?.status || tx?.status || "PENDING").toUpperCase();
    const isCompleted = rawStatus === "COMPLETED" || rawStatus === "SUCCESSFUL";
    const isFailed = rawStatus === "FAILED" || rawStatus === "CANCELLED" || rawStatus === "REJECTED";
    if (isCompleted) {
      const targetUserId = userId || tx?.userId;
      const creditAmount = statusResult?.amount || tx?.amount || 5e3;
      if (targetUserId && (!tx || tx.status !== "completed")) {
        adjustUserWallet(
          targetUserId,
          creditAmount,
          "deposit",
          `PesaJet Mobile Money Deposit Approved (${creditAmount} UGX)`,
          { reference: reference || tx?.reference, pesajetTransactionId: transactionId || tx?.pesajetTransactionId }
        );
        if (tx) {
          tx.status = "completed";
          persistTransactions();
        }
      }
      const updatedUser = targetUserId ? usersMap.get(targetUserId) : null;
      return res.json({
        success: true,
        completed: true,
        status: "COMPLETED",
        amount: creditAmount,
        walletBalance: updatedUser?.walletBalance || 0,
        message: "Payment completed and wallet credited successfully!"
      });
    }
    if (isFailed) {
      if (tx) {
        tx.status = "failed";
        persistTransactions();
      }
      return res.json({
        success: true,
        completed: false,
        failed: true,
        status: "FAILED",
        message: statusResult?.message || "Payment was declined or cancelled on mobile device."
      });
    }
    res.json({
      success: true,
      completed: false,
      status: rawStatus,
      message: "Payment prompt is processing. Please check your phone and enter your Mobile Money PIN."
    });
  } catch (err) {
    console.error("Error verifying PesaJet status:", err);
    res.status(500).json({ success: false, message: err.message || "Status check failed" });
  }
});
app.all(["/api/pesajet/webhook", "/api/pesajet/ipn"], async (req, res) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
    const signature = req.headers["x-pesajet-signature"];
    console.log("[PesaJet Webhook] Incoming event:", { method: req.method, body: req.body });
    const payload = req.body || {};
    const txId = payload.transactionId || payload.id || payload.data?.transactionId || payload.data?.id;
    const ref = payload.reference || payload.data?.reference;
    const status = (payload.status || payload.data?.status || "").toUpperCase();
    const amount = Number(payload.amount || payload.data?.amount) || 0;
    if (txId && (status === "COMPLETED" || status === "SUCCESSFUL")) {
      const tx = transactionsList.find((t) => t.pesajetTransactionId === txId || t.reference === ref);
      if (tx && tx.status !== "completed") {
        const creditAmount = amount || tx.amount;
        adjustUserWallet(
          tx.userId,
          creditAmount,
          "deposit",
          `PesaJet Webhook Deposit Verified (${creditAmount} UGX)`,
          { reference: ref || tx.reference, pesajetTransactionId: txId }
        );
        tx.status = "completed";
        persistTransactions();
        console.log(`[PesaJet Webhook] Wallet successfully credited for user ${tx.userId}: +${creditAmount} UGX`);
      }
    }
    res.json({ status: "success", message: "Webhook processed successfully" });
  } catch (err) {
    console.error("[PesaJet Webhook] Error:", err);
    res.status(200).json({ status: "acknowledged", error: err.message });
  }
});
app.all(["/api/pesajet/webhook-config", "/api/pesajet/ipn-config"], async (req, res) => {
  const host = req.get("host") || "checkersarena-beta.vercel.app";
  const cleanHost = host.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const webhookUrl = `https://${cleanHost}/api/pesajet/webhook`;
  res.json({
    success: true,
    merchantDomain: cleanHost,
    webhookDestinationUrl: webhookUrl,
    description: "Provide this URL in your PesaJet merchant dashboard as the Webhook destination."
  });
});
app.get("/api/wallet/transactions", (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Missing userId parameter" });
  }
  const userTxs = transactionsList.filter((t) => t.userId === userId).slice(0, 50);
  res.json({ success: true, transactions: userTxs });
});
app.post(["/api/wallet/reset-balance", "/api/wallet/reset"], (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: "Missing userId" });
  const user = usersMap.get(userId);
  if (user) {
    user.walletBalance = 0;
    user.totalWon = 0;
    user.totalStaked = 0;
    usersMap.set(userId, user);
    persistUsers();
  }
  for (let i = transactionsList.length - 1; i >= 0; i--) {
    if (transactionsList[i].userId === userId) {
      transactionsList.splice(i, 1);
    }
  }
  persistTransactions();
  res.json({
    success: true,
    walletBalance: 0,
    totalWon: 0,
    totalStaked: 0,
    message: "Sandbox balance successfully cleared and reset to 0 UGX."
  });
});
app.post("/api/wallet/withdraw", async (req, res) => {
  try {
    const { userId, amount, phoneNumber, provider } = req.body;
    const parsed = Number(amount);
    if (!userId || isNaN(parsed) || parsed < 1e3) {
      return res.status(400).json({ success: false, message: "Minimum withdrawal amount is 1,000 UGX." });
    }
    if (!phoneNumber || phoneNumber.trim().length < 9) {
      return res.status(400).json({ success: false, message: "Please enter a valid MTN or Airtel phone number for withdrawal." });
    }
    const user = usersMap.get(userId);
    if (!user || (user.walletBalance || 0) < parsed) {
      return res.status(400).json({ success: false, message: "Insufficient wallet balance for this withdrawal." });
    }
    const detectedProvider = (provider || pesajetService.detectProvider(phoneNumber)).toLowerCase();
    const withdrawReference = `CHK_WTH_${Date.now()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const idempotencyKey = `wth-${userId}-${Date.now()}`;
    adjustUserWallet(
      userId,
      -parsed,
      "withdrawal",
      `Withdrawal to ${detectedProvider.toUpperCase()} (${phoneNumber}) - ${parsed.toLocaleString()} UGX`,
      { reference: withdrawReference }
    );
    persistTransactions();
    try {
      const disburseResult = await pesajetService.createPayment({
        type: "DISBURSEMENT",
        amount: parsed,
        currency: "UGX",
        phoneNumber,
        provider: detectedProvider,
        reference: withdrawReference,
        idempotencyKey,
        description: `Checkers Arena Payout ${parsed} UGX`
      });
      console.log("[PesaJet Disbursement] Payout result:", disburseResult);
      res.json({
        success: true,
        walletBalance: user.walletBalance,
        transactionId: disburseResult.transactionId || withdrawReference,
        reference: withdrawReference,
        message: `Payout of ${parsed.toLocaleString()} UGX initiated to ${phoneNumber}! You will receive the funds shortly.`
      });
    } catch (disburseErr) {
      console.error("[PesaJet Disbursement] Error:", disburseErr);
      res.json({
        success: true,
        walletBalance: user.walletBalance,
        reference: withdrawReference,
        message: `Withdrawal of ${parsed.toLocaleString()} UGX submitted for processing. Reference: ${withdrawReference}.`
      });
    }
  } catch (err) {
    console.error("Error during wallet withdrawal:", err);
    res.status(500).json({ success: false, message: err.message || "Withdrawal failed" });
  }
});
app.post("/api/auth/validate-username", (req, res) => {
  const { username } = req.body;
  const validation = validateUsername(username);
  if (!validation.valid) {
    return res.status(400).json({ valid: false, error: validation.message });
  }
  const existing = Array.from(usersMap.values()).find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase()
  );
  return res.json({
    valid: true,
    available: !existing,
    message: existing ? "Username is taken by another account, but you can log into it!" : "Username is available!"
  });
});
wss.on("connection", (ws) => {
  let currentUserId = null;
  ws.on("message", (messageRaw) => {
    try {
      const data = JSON.parse(messageRaw.toString());
      const { type, payload } = data;
      switch (type) {
        // --- AUTHENTICATION / ACCOUNT SETUP ---
        case "auth:login": {
          const { username, avatarId, existingUserId } = payload;
          const validation = validateUsername(username);
          if (!validation.valid) {
            ws.send(
              JSON.stringify({
                type: "auth:error",
                payload: { message: validation.message }
              })
            );
            return;
          }
          const cleanUsername = username.trim();
          let userProfile;
          const targetId = existingUserId || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const existingUser = existingUserId && usersMap.get(existingUserId) || Array.from(usersMap.values()).find(
            (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
          );
          if (existingUser) {
            userProfile = {
              ...existingUser,
              id: targetId,
              username: cleanUsername,
              avatarId: avatarId || existingUser.avatarId,
              status: "online"
            };
          } else {
            userProfile = {
              id: targetId,
              username: cleanUsername,
              avatarId: avatarId || "avatar-crown",
              wins: 0,
              losses: 0,
              draws: 0,
              rating: 1200,
              walletBalance: 200,
              welcomeBonusClaimed: true,
              status: "online",
              createdAt: Date.now()
            };
            recordTransaction(
              targetId,
              "deposit",
              200,
              "\u{1F381} Welcome Bonus Stake (200 UGX)"
            );
          }
          usersMap.set(userProfile.id, userProfile);
          userSockets.set(userProfile.id, ws);
          currentUserId = userProfile.id;
          persistUsers();
          ws.send(
            JSON.stringify({
              type: "auth:success",
              payload: { user: userProfile }
            })
          );
          broadcastPresence();
          ws.send(
            JSON.stringify({
              type: "lobby:rooms",
              payload: Array.from(activeRooms.values())
            })
          );
          ws.send(
            JSON.stringify({
              type: "chat:history",
              payload: globalChatMessages.slice(-50)
            })
          );
          break;
        }
        case "user:update_profile": {
          if (!currentUserId) return;
          const user = usersMap.get(currentUserId);
          if (!user) return;
          const { avatarId, username } = payload;
          if (username) {
            const val = validateUsername(username);
            if (!val.valid) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: val.message }
                })
              );
              return;
            }
            user.username = username.trim();
          }
          if (avatarId) {
            user.avatarId = avatarId;
          }
          usersMap.set(user.id, user);
          persistUsers();
          ws.send(
            JSON.stringify({
              type: "user:profile_updated",
              payload: { user }
            })
          );
          broadcastPresence();
          break;
        }
        case "user:update_phone": {
          if (!currentUserId) return;
          const user = usersMap.get(currentUserId);
          if (!user) return;
          const { phoneNumber, normalizedPhone } = payload;
          if (phoneNumber) {
            user.phoneNumber = phoneNumber;
            user.normalizedPhone = normalizedPhone;
            usersMap.set(user.id, user);
            persistUsers();
            ws.send(
              JSON.stringify({
                type: "user:profile_updated",
                payload: { user }
              })
            );
          }
          break;
        }
        case "user:delete_account": {
          const targetId = payload?.userId || currentUserId;
          if (targetId) {
            usersMap.delete(targetId);
            userSockets.delete(targetId);
            persistUsers();
            broadcastPresence();
            ws.send(
              JSON.stringify({
                type: "user:deleted_ack",
                payload: { userId: targetId }
              })
            );
          }
          currentUserId = null;
          break;
        }
        // --- CHALLENGES / MATCHMAKING ---
        case "challenge:send": {
          if (!currentUserId) return;
          const fromUser = usersMap.get(currentUserId);
          const { targetUserId, targetUser, challengeId: customChallengeId, stakeAmount } = payload;
          const parsedStake = Number(stakeAmount) || 0;
          if (parsedStake > 0 && (!fromUser || (fromUser.walletBalance || 0) < parsedStake)) {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: {
                  message: `Insufficient balance (${fromUser?.walletBalance || 0} UGX) to send a ${parsedStake.toLocaleString()} UGX stake challenge. Please top up your wallet.`
                }
              })
            );
            return;
          }
          let toUser = usersMap.get(targetUserId);
          if (!toUser && targetUser) {
            toUser = targetUser;
            usersMap.set(targetUser.id, targetUser);
          }
          if (!toUser) {
            toUser = Array.from(usersMap.values()).find(
              (u) => u.username.toLowerCase() === targetUser?.username?.toLowerCase()
            );
          }
          if (!fromUser || !toUser) {
            ws.send(
              JSON.stringify({
                type: "error",
                payload: { message: "Target player not available." }
              })
            );
            return;
          }
          if (targetUserId === currentUserId || toUser.id === fromUser.id) return;
          const challengeId = customChallengeId || `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const challenge = {
            id: challengeId,
            fromUser,
            toUser,
            stakeAmount: parsedStake,
            createdAt: Date.now(),
            status: "pending"
          };
          activeChallenges.set(challengeId, challenge);
          let targetSocket = userSockets.get(targetUserId) || userSockets.get(toUser.id);
          if (!targetSocket) {
            for (const [uid, sock] of userSockets.entries()) {
              const u = usersMap.get(uid);
              if (u && (u.id === targetUserId || u.username.toLowerCase() === toUser.username.toLowerCase())) {
                targetSocket = sock;
                break;
              }
            }
          }
          if (targetSocket && targetSocket.readyState === import_ws.WebSocket.OPEN) {
            targetSocket.send(
              JSON.stringify({
                type: "challenge:received",
                payload: challenge
              })
            );
          }
          ws.send(
            JSON.stringify({
              type: "challenge:sent_ack",
              payload: challenge
            })
          );
          if (targetUserId === "bot_ai" || toUser.id === "bot_ai" || toUser.isBot) {
            setTimeout(() => {
              if (activeChallenges.has(challengeId)) {
                const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                const initialBoard = createInitialBoard();
                const redPlayer = {
                  id: fromUser.id,
                  username: fromUser.username,
                  avatarId: fromUser.avatarId,
                  rating: fromUser.rating || 1200,
                  color: "red"
                };
                const blackPlayer = {
                  id: "bot_ai",
                  username: "Checkers Bot (AI)",
                  avatarId: "avatar-cyber",
                  rating: 1300,
                  color: "black",
                  isBot: true
                };
                const room = {
                  id: roomId,
                  name: `${redPlayer.username} vs ${blackPlayer.username}`,
                  status: "playing",
                  stakeAmount: 0,
                  potAmount: 0,
                  redPlayer,
                  blackPlayer,
                  currentTurn: "red",
                  board: initialBoard,
                  history: [],
                  capturedRed: 0,
                  capturedBlack: 0,
                  winner: null,
                  createdAt: Date.now(),
                  lastMoveTimestamp: Date.now(),
                  turnTimeLimitSeconds: 20,
                  turnDeadline: Date.now() + 2e4,
                  spectatorsCount: 0,
                  isBotGame: true,
                  botDifficulty: "medium"
                };
                activeRooms.set(roomId, room);
                activeChallenges.delete(challengeId);
                broadcast("lobby:rooms", Array.from(activeRooms.values()));
                sendToUser(fromUser.id, "game:started", room);
              }
            }, 600);
          }
          break;
        }
        case "challenge:respond": {
          if (!currentUserId) return;
          const { challengeId, accept, roomId: customRoomId, fromUser: fallbackFromUser, toUser: fallbackToUser } = payload;
          let challenge = activeChallenges.get(challengeId);
          if (!challenge && fallbackFromUser && fallbackToUser) {
            challenge = {
              id: challengeId,
              fromUser: fallbackFromUser,
              toUser: fallbackToUser,
              stakeAmount: payload.stakeAmount || 0,
              createdAt: Date.now(),
              status: "pending"
            };
          }
          if (!challenge) {
            console.warn(`Challenge ${challengeId} not found in activeChallenges`);
            return;
          }
          if (!accept) {
            challenge.status = "declined";
            sendToUser(challenge.fromUser.id, "challenge:declined", {
              challengeId,
              message: `${challenge.toUser.username} declined your challenge.`
            });
            activeChallenges.delete(challengeId);
            return;
          }
          const stake = challenge.stakeAmount || 0;
          const p1User = usersMap.get(challenge.fromUser.id);
          const p2User = usersMap.get(challenge.toUser.id);
          if (stake > 0) {
            if (!p1User || (p1User.walletBalance || 0) < stake) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: `${challenge.fromUser.username} no longer has sufficient balance for this stake.` }
                })
              );
              activeChallenges.delete(challengeId);
              return;
            }
            if (!p2User || (p2User.walletBalance || 0) < stake) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: { message: `You have insufficient balance (${p2User?.walletBalance || 0} UGX) for this ${stake.toLocaleString()} UGX stake. Please deposit funds.` }
                })
              );
              return;
            }
            adjustUserWallet(p1User.id, -stake, "stake_entry", `Stake Entry for match vs ${p2User.username} (${stake} UGX)`);
            adjustUserWallet(p2User.id, -stake, "stake_entry", `Stake Entry for match vs ${p1User.username} (${stake} UGX)`);
          }
          challenge.status = "accepted";
          const roomId = customRoomId || `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const initialBoard = createInitialBoard();
          const redPlayer = {
            id: challenge.fromUser.id,
            username: challenge.fromUser.username,
            avatarId: challenge.fromUser.avatarId,
            rating: challenge.fromUser.rating || challenge.fromUser.elo || 1200,
            color: "red"
          };
          const blackPlayer = {
            id: challenge.toUser.id,
            username: challenge.toUser.username,
            avatarId: challenge.toUser.avatarId,
            rating: challenge.toUser.rating || challenge.toUser.elo || 1200,
            color: "black"
          };
          const room = {
            id: roomId,
            name: `${redPlayer.username} vs ${blackPlayer.username}`,
            status: "playing",
            stakeAmount: stake,
            potAmount: stake * 2,
            escrowCollected: stake > 0 ? { [redPlayer.id]: stake, [blackPlayer.id]: stake } : void 0,
            redPlayer,
            blackPlayer,
            currentTurn: "red",
            board: initialBoard,
            history: [],
            capturedRed: 0,
            capturedBlack: 0,
            winner: null,
            createdAt: Date.now(),
            lastMoveTimestamp: Date.now(),
            turnTimeLimitSeconds: 20,
            turnDeadline: Date.now() + 2e4,
            spectatorsCount: 0
          };
          activeRooms.set(roomId, room);
          const p1 = usersMap.get(redPlayer.id);
          const p2 = usersMap.get(blackPlayer.id);
          if (p1) p1.status = "in-game";
          if (p2) p2.status = "in-game";
          activeChallenges.delete(challengeId);
          broadcastPresence();
          broadcast("lobby:rooms", Array.from(activeRooms.values()));
          sendToUser(redPlayer.id, "game:started", room);
          sendToUser(blackPlayer.id, "game:started", room);
          break;
        }
        // --- PUBLIC QUICK ROOM / PRACTICE VS BOT ---
        case "game:create_custom": {
          if (!currentUserId) return;
          const user = usersMap.get(currentUserId);
          if (!user) return;
          const { name, vsBot, timeLimit, stakeAmount, roomId: customRoomId } = payload;
          const parsedStake = Number(stakeAmount) || 0;
          if (!vsBot && parsedStake > 0) {
            if ((user.walletBalance || 0) < parsedStake) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  payload: {
                    message: `Insufficient balance (${user.walletBalance || 0} UGX) to host a ${parsedStake.toLocaleString()} UGX stake table. Please top up your wallet or create a free table.`
                  }
                })
              );
              return;
            }
            adjustUserWallet(user.id, -parsedStake, "stake_entry", `Stake Entry for table (${parsedStake} UGX)`);
          }
          const roomId = customRoomId || `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const initialBoard = createInitialBoard();
          const humanPlayer = {
            id: user.id,
            username: user.username,
            avatarId: user.avatarId,
            rating: user.rating,
            color: "red"
          };
          let botPlayer = null;
          if (vsBot) {
            botPlayer = {
              id: "bot_ai",
              username: "Checkers Bot (AI)",
              avatarId: "avatar-cyber",
              rating: 1350,
              color: "black",
              isBot: true
            };
          }
          const room = {
            id: roomId,
            name: name || `${user.username}'s ${parsedStake > 0 ? `${parsedStake.toLocaleString()} UGX Table` : "Game Table"}`,
            status: vsBot ? "playing" : "waiting",
            stakeAmount: vsBot ? 0 : parsedStake,
            potAmount: vsBot ? 0 : parsedStake * 2,
            escrowCollected: !vsBot && parsedStake > 0 ? { [user.id]: parsedStake } : void 0,
            redPlayer: humanPlayer,
            blackPlayer: botPlayer,
            currentTurn: "red",
            board: initialBoard,
            history: [],
            capturedRed: 0,
            capturedBlack: 0,
            winner: null,
            createdAt: Date.now(),
            lastMoveTimestamp: Date.now(),
            turnTimeLimitSeconds: 20,
            turnDeadline: Date.now() + 2e4,
            spectatorsCount: 0
          };
          activeRooms.set(roomId, room);
          user.status = "in-game";
          broadcastPresence();
          broadcast("lobby:rooms", Array.from(activeRooms.values()));
          ws.send(JSON.stringify({ type: "game:joined", payload: room }));
          break;
        }
        case "game:join": {
          if (!currentUserId) return;
          const user = usersMap.get(currentUserId);
          const { roomId } = payload;
          const room = activeRooms.get(roomId);
          if (!user || !room) return;
          if (room.status === "waiting" && !room.blackPlayer) {
            if (room.stakeAmount > 0) {
              if ((user.walletBalance || 0) < room.stakeAmount) {
                ws.send(
                  JSON.stringify({
                    type: "game:join_error",
                    payload: {
                      message: `Insufficient balance (${user.walletBalance || 0} UGX) to join this ${room.stakeAmount.toLocaleString()} UGX stake table. Please deposit funds or choose a free table.`,
                      requiredAmount: room.stakeAmount
                    }
                  })
                );
                return;
              }
              adjustUserWallet(user.id, -room.stakeAmount, "stake_entry", `Stake Entry for table ${room.name} (${room.stakeAmount} UGX)`, { roomId });
              if (!room.escrowCollected) room.escrowCollected = {};
              room.escrowCollected[user.id] = room.stakeAmount;
            }
            room.blackPlayer = {
              id: user.id,
              username: user.username,
              avatarId: user.avatarId,
              rating: user.rating,
              color: "black"
            };
            room.status = "playing";
            room.turnTimeLimitSeconds = 20;
            room.turnDeadline = Date.now() + 2e4;
            user.status = "in-game";
            broadcastPresence();
            broadcast("lobby:rooms", Array.from(activeRooms.values()));
            broadcastToRoom(room, "game:updated", room);
          } else {
            room.spectatorsCount++;
            ws.send(JSON.stringify({ type: "game:joined", payload: room }));
          }
          break;
        }
        // --- GAME MOVES & ACTIONS ---
        case "game:move": {
          if (!currentUserId) return;
          const { roomId, move } = payload;
          const room = activeRooms.get(roomId);
          if (!room || room.status !== "playing") return;
          const isRedTurn = room.currentTurn === "red";
          const currentPlayerId = isRedTurn ? room.redPlayer?.id : room.blackPlayer?.id;
          if (currentPlayerId !== currentUserId) {
            ws.send(
              JSON.stringify({
                type: "game:invalid_move",
                payload: { message: "Not your turn!" }
              })
            );
            return;
          }
          const validMoves = getValidMovesForPlayer(room.board, room.currentTurn);
          const isValid = validMoves.some(
            (vm) => vm.from.row === move.from.row && vm.from.col === move.from.col && vm.to.row === move.to.row && vm.to.col === move.to.col
          );
          if (!isValid) {
            ws.send(
              JSON.stringify({
                type: "game:invalid_move",
                payload: { message: "Illegal move attempted." }
              })
            );
            return;
          }
          const { newBoard, capturedPiece, becameKing } = executeMove(
            room.board,
            move
          );
          room.board = newBoard;
          if (capturedPiece) {
            if (capturedPiece.color === "red") room.capturedRed++;
            if (capturedPiece.color === "black") room.capturedBlack++;
          }
          room.history.push({
            id: `m_${Date.now()}`,
            playerColor: room.currentTurn,
            from: move.from,
            to: move.to,
            capturedCount: move.captures.length,
            becameKing,
            timestamp: Date.now()
          });
          const nextTurn = isRedTurn ? "black" : "red";
          room.currentTurn = nextTurn;
          room.lastMoveTimestamp = Date.now();
          room.turnTimeLimitSeconds = 20;
          room.turnDeadline = Date.now() + 2e4;
          room.disconnectedPlayerId = null;
          room.disconnectDeadline = null;
          const gameOver = checkGameOver(room.board, nextTurn);
          if (gameOver.isOver) {
            room.status = "ended";
            room.winner = gameOver.winner;
            room.winReason = gameOver.reason;
            handleGameEnd(room);
          }
          broadcastToRoom(room, "game:updated", room);
          broadcast("lobby:rooms", Array.from(activeRooms.values()));
          if (room.status === "playing" && (nextTurn === "black" && room.blackPlayer?.isBot || nextTurn === "red" && room.redPlayer?.isBot)) {
            setTimeout(() => {
              executeBotTurn(room);
            }, 600);
          }
          break;
        }
        case "game:claim_timeout": {
          if (!currentUserId) return;
          const { roomId } = payload;
          const room = activeRooms.get(roomId);
          if (!room || room.status !== "playing") return;
          const isRed = room.redPlayer?.id === currentUserId;
          const isBlack = room.blackPlayer?.id === currentUserId;
          if (!isRed && !isBlack) return;
          const myColor = isRed ? "red" : "black";
          const opponentColor = isRed ? "black" : "red";
          const opponentPlayer = isRed ? room.blackPlayer : room.redPlayer;
          const myPlayer = isRed ? room.redPlayer : room.blackPlayer;
          if (room.currentTurn === opponentColor && room.turnDeadline && Date.now() >= room.turnDeadline - 1e3) {
            room.status = "ended";
            room.winner = myColor;
            room.winReason = `${opponentPlayer?.username || "Opponent"} timed out / disconnected (20-second countdown expired). ${myPlayer?.username || "You"} won!`;
            handleGameEnd(room);
            broadcastToRoom(room, "game:updated", room);
            broadcast("lobby:rooms", Array.from(activeRooms.values()));
          }
          break;
        }
        case "game:delete_table": {
          if (!currentUserId) return;
          const { roomId } = payload;
          const room = activeRooms.get(roomId);
          if (!room) return;
          const isCreator = room.redPlayer?.id === currentUserId || room.blackPlayer?.id === currentUserId;
          if (isCreator || room.status === "waiting") {
            if (room.stakeAmount > 0 && room.escrowCollected) {
              for (const [playerId, escrowAmt] of Object.entries(room.escrowCollected)) {
                if (escrowAmt > 0) {
                  adjustUserWallet(
                    playerId,
                    escrowAmt,
                    "stake_refund",
                    `Refund for deleted game table (${escrowAmt} UGX)`,
                    { roomId }
                  );
                }
              }
            }
            activeRooms.delete(roomId);
            if (room.redPlayer) {
              const u1 = usersMap.get(room.redPlayer.id);
              if (u1 && u1.status === "in-game") u1.status = "online";
            }
            if (room.blackPlayer) {
              const u2 = usersMap.get(room.blackPlayer.id);
              if (u2 && u2.status === "in-game") u2.status = "online";
            }
            broadcastToRoom(room, "game:table_deleted", { roomId, message: "Game table has been closed and deleted. Any escrowed stakes were refunded." });
            broadcastPresence();
            broadcast("lobby:rooms", Array.from(activeRooms.values()));
          }
          break;
        }
        case "game:resign": {
          if (!currentUserId) return;
          const { roomId } = payload;
          const room = activeRooms.get(roomId);
          if (!room || room.status !== "playing") return;
          const isRed = room.redPlayer?.id === currentUserId;
          const isBlack = room.blackPlayer?.id === currentUserId;
          if (!isRed && !isBlack) return;
          room.status = "ended";
          room.winner = isRed ? "black" : "red";
          room.winReason = `${isRed ? room.redPlayer?.username : room.blackPlayer?.username} resigned the match.`;
          handleGameEnd(room);
          broadcastToRoom(room, "game:updated", room);
          broadcast("lobby:rooms", Array.from(activeRooms.values()));
          break;
        }
        // --- GLOBAL & GAME CHAT ---
        case "chat:send": {
          if (!currentUserId) return;
          const user = usersMap.get(currentUserId);
          if (!user) return;
          const { text, roomId } = payload;
          if (!text || typeof text !== "string" || !text.trim()) return;
          const chatMsg = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            senderId: user.id,
            senderName: user.username,
            avatarId: user.avatarId,
            text: text.trim().substring(0, 300),
            timestamp: Date.now()
          };
          if (roomId) {
            const room = activeRooms.get(roomId);
            if (room) {
              broadcastToRoom(room, "chat:game_message", { ...chatMsg, roomId });
            }
            broadcast("chat:game_message", { ...chatMsg, roomId });
          } else {
            globalChatMessages.push(chatMsg);
            if (globalChatMessages.length > 100) {
              globalChatMessages.shift();
            }
            broadcast("chat:lobby_message", chatMsg);
          }
          break;
        }
        // --- LEADERBOARD ---
        case "leaderboard:get": {
          const sortedUsers = Array.from(usersMap.values()).sort((a, b) => b.rating - a.rating || b.wins - a.wins).map((u, idx) => {
            const totalGames = u.wins + u.losses + u.draws;
            const winRate = totalGames > 0 ? Math.round(u.wins / totalGames * 100) : 0;
            return {
              rank: idx + 1,
              username: u.username,
              avatarId: u.avatarId,
              rating: u.rating,
              wins: u.wins,
              losses: u.losses,
              draws: u.draws,
              winRate
            };
          });
          ws.send(
            JSON.stringify({
              type: "leaderboard:data",
              payload: sortedUsers
            })
          );
          break;
        }
      }
    } catch (err) {
      console.error("Error handling WS message:", err);
    }
  });
  ws.on("close", () => {
    if (currentUserId) {
      userSockets.delete(currentUserId);
      const user = usersMap.get(currentUserId);
      if (user) {
        user.status = "away";
      }
      for (const room of activeRooms.values()) {
        if (room.status === "playing") {
          const isRed = room.redPlayer?.id === currentUserId;
          const isBlack = room.blackPlayer?.id === currentUserId;
          if (isRed || isBlack) {
            const playerColor = isRed ? "red" : "black";
            room.disconnectedPlayerId = currentUserId;
            room.disconnectDeadline = Date.now() + 2e4;
            if (room.currentTurn === playerColor) {
              room.turnDeadline = Date.now() + 2e4;
            }
            broadcastToRoom(room, "game:updated", room);
          }
        }
      }
      broadcastPresence();
    }
  });
});
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of activeRooms.entries()) {
    if (room.status !== "playing") continue;
    const currentTurnColor = room.currentTurn;
    const activePlayer = currentTurnColor === "red" ? room.redPlayer : room.blackPlayer;
    const opponentPlayer = currentTurnColor === "red" ? room.blackPlayer : room.redPlayer;
    const opponentColor = currentTurnColor === "red" ? "black" : "red";
    if (!activePlayer || activePlayer.isBot) continue;
    const isDeadlineReached = !!room.turnDeadline && now >= room.turnDeadline;
    const isDisconnectExpired = room.disconnectedPlayerId === activePlayer.id && !!room.disconnectDeadline && now >= room.disconnectDeadline;
    if (isDeadlineReached || isDisconnectExpired) {
      room.status = "ended";
      room.winner = opponentColor;
      const isDisconnected = room.disconnectedPlayerId === activePlayer.id;
      room.winReason = isDisconnected ? `${activePlayer.username} lost internet connection / disconnected. ${opponentPlayer?.username || "Opponent"} wins (20s limit)!` : `${activePlayer.username} did not move in 20 seconds. ${opponentPlayer?.username || "Opponent"} wins by timeout!`;
      handleGameEnd(room);
      broadcastToRoom(room, "game:updated", room);
      broadcast("lobby:rooms", Array.from(activeRooms.values()));
    }
  }
}, 1e3);
function executeBotTurn(room) {
  if (room.status !== "playing") return;
  const botColor = room.currentTurn;
  const isBlackBot = botColor === "black" && room.blackPlayer?.isBot;
  const isRedBot = botColor === "red" && room.redPlayer?.isBot;
  if (!isBlackBot && !isRedBot) return;
  const bestMove = getBestBotMove(room.board, botColor);
  if (!bestMove) return;
  const { newBoard, capturedPiece, becameKing } = executeMove(
    room.board,
    bestMove
  );
  room.board = newBoard;
  if (capturedPiece) {
    if (capturedPiece.color === "red") room.capturedRed++;
    if (capturedPiece.color === "black") room.capturedBlack++;
  }
  room.history.push({
    id: `m_${Date.now()}`,
    playerColor: botColor,
    from: bestMove.from,
    to: bestMove.to,
    capturedCount: bestMove.captures.length,
    becameKing,
    timestamp: Date.now()
  });
  const nextTurn = botColor === "red" ? "black" : "red";
  room.currentTurn = nextTurn;
  room.lastMoveTimestamp = Date.now();
  room.turnDeadline = Date.now() + room.turnTimeLimitSeconds * 1e3;
  const gameOver = checkGameOver(room.board, nextTurn);
  if (gameOver.isOver) {
    room.status = "ended";
    room.winner = gameOver.winner;
    room.winReason = gameOver.reason;
    handleGameEnd(room);
  }
  broadcastToRoom(room, "game:updated", room);
  broadcast("lobby:rooms", Array.from(activeRooms.values()));
  if (room.status === "playing" && (nextTurn === "black" && room.blackPlayer?.isBot || nextTurn === "red" && room.redPlayer?.isBot)) {
    setTimeout(() => {
      executeBotTurn(room);
    }, 600);
  }
}
function getGameServiceFee(stakeAmount) {
  if (stakeAmount <= 0) return 0;
  if (stakeAmount === 200) return 30;
  if (stakeAmount === 500) return 50;
  if (stakeAmount === 1e3) return 100;
  if (stakeAmount === 2e3) return 400;
  if (stakeAmount === 5e3) return 1e3;
  if (stakeAmount === 1e4) return 2e3;
  if (stakeAmount === 2e4) return 4e3;
  return Math.round(stakeAmount * 0.2);
}
function handleGameEnd(room) {
  if (room.redPlayer && !room.redPlayer.isBot) {
    const redUser = usersMap.get(room.redPlayer.id);
    if (redUser) {
      redUser.status = "online";
      if (room.winner === "red") redUser.wins++;
      else if (room.winner === "black") redUser.losses++;
      else redUser.draws++;
    }
  }
  if (room.blackPlayer && !room.blackPlayer.isBot) {
    const blackUser = usersMap.get(room.blackPlayer.id);
    if (blackUser) {
      blackUser.status = "online";
      if (room.winner === "black") blackUser.wins++;
      else if (room.winner === "red") blackUser.losses++;
      else blackUser.draws++;
    }
  }
  if (room.stakeAmount > 0) {
    const serviceFee = getGameServiceFee(room.stakeAmount);
    const totalCollected = room.stakeAmount * 2;
    const netPayout = Math.max(0, totalCollected - serviceFee);
    if (room.winner === "red" && room.redPlayer && !room.redPlayer.isBot) {
      adjustUserWallet(
        room.redPlayer.id,
        netPayout,
        "stake_win",
        `Victory Winnings for ${room.name} (+${netPayout.toLocaleString()} UGX, Service Fee: ${serviceFee} UGX)`,
        { roomId: room.id, serviceFee, stakeAmount: room.stakeAmount }
      );
    } else if (room.winner === "black" && room.blackPlayer && !room.blackPlayer.isBot) {
      adjustUserWallet(
        room.blackPlayer.id,
        netPayout,
        "stake_win",
        `Victory Winnings for ${room.name} (+${netPayout.toLocaleString()} UGX, Service Fee: ${serviceFee} UGX)`,
        { roomId: room.id, serviceFee, stakeAmount: room.stakeAmount }
      );
    } else if (room.winner === "draw" || !room.winner) {
      if (room.redPlayer && !room.redPlayer.isBot) {
        adjustUserWallet(
          room.redPlayer.id,
          room.stakeAmount,
          "stake_refund",
          `Match Draw: Stake Refund for ${room.name} (+${room.stakeAmount.toLocaleString()} UGX)`,
          { roomId: room.id }
        );
      }
      if (room.blackPlayer && !room.blackPlayer.isBot) {
        adjustUserWallet(
          room.blackPlayer.id,
          room.stakeAmount,
          "stake_refund",
          `Match Draw: Stake Refund for ${room.name} (+${room.stakeAmount.toLocaleString()} UGX)`,
          { roomId: room.id }
        );
      }
    }
  }
  if (room.winner && room.redPlayer && room.blackPlayer && !room.redPlayer.isBot && !room.blackPlayer.isBot) {
    const redUser = usersMap.get(room.redPlayer.id);
    const blackUser = usersMap.get(room.blackPlayer.id);
    if (redUser && blackUser) {
      if (room.winner === "red") {
        const { newWinnerRating, newLoserRating } = calculateElo(
          redUser.rating,
          blackUser.rating
        );
        redUser.rating = newWinnerRating;
        blackUser.rating = newLoserRating;
      } else if (room.winner === "black") {
        const { newWinnerRating, newLoserRating } = calculateElo(
          blackUser.rating,
          redUser.rating
        );
        blackUser.rating = newWinnerRating;
        redUser.rating = newLoserRating;
      }
    }
  }
  persistUsers();
  broadcastPresence();
}
function broadcastToRoom(room, type, payload) {
  if (room.redPlayer) {
    sendToUser(room.redPlayer.id, type, payload);
  }
  if (room.blackPlayer) {
    sendToUser(room.blackPlayer.id, type, payload);
  }
}
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
