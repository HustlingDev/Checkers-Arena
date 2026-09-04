import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  limit,
  orderBy,
} from 'firebase/firestore';
import { UserProfile, Challenge, GameRoom, ChatMessage, GamePlayer, WalletTransaction } from '../types';
import { createInitialBoard } from './checkersEngine';
import { validateUgandaPhoneNumber } from './ugandaPhone';

// Web App's Firebase Configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBGLFB8enRtpk9LXDzxJQZtz9iM_L-LEkY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "checkers-game-ug.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "checkers-game-ug",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "checkers-game-ug.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "726155928996",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:726155928996:web:4e4cd4d3160e2fd5514d31"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let firestoreDb: any;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch (e) {
  firestoreDb = getFirestore(app);
}
export const db = firestoreDb;

// Normalize phone number for consistent uniqueness matching (removes spaces, dashes, parentheses)
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-\(\)\.]/g, '').trim();
}

// Check if a phone number was ever used for a welcome bonus claim in Firestore registry
export async function isBonusClaimedForPhone(phone: string): Promise<boolean> {
  try {
    const val = validateUgandaPhoneNumber(phone);
    const key = val.isValid ? val.normalized : normalizePhoneNumber(phone);
    if (!key || key.length < 6) return false;

    // Check claimed_bonus_phones collection
    const bonusDocRef = doc(db, 'claimed_bonus_phones', key);
    const snap = await getDoc(bonusDocRef);
    if (snap.exists()) {
      return true;
    }

    // Secondary check: look in users collection if any user previously had this normalized phone
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('normalizedPhone', '==', key));
    const userSnap = await getDocs(q);
    if (!userSnap.empty) {
      for (const d of userSnap.docs) {
        const u = d.data() as UserProfile;
        if (u.welcomeBonusClaimed === true) {
          return true;
        }
      }
    }
    return false;
  } catch (err) {
    console.warn('isBonusClaimedForPhone check error:', err);
    return false;
  }
}

// Record that a phone number has claimed the welcome bonus
export async function recordBonusClaimedForPhone(phone: string, userId: string): Promise<void> {
  try {
    const val = validateUgandaPhoneNumber(phone);
    const key = val.isValid ? val.normalized : normalizePhoneNumber(phone);
    if (!key || key.length < 6) return;

    const bonusDocRef = doc(db, 'claimed_bonus_phones', key);
    await setDoc(bonusDocRef, {
      normalizedPhone: key,
      originalPhone: phone,
      claimedByUserId: userId,
      claimedAt: Date.now(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    console.log(`[Firestore] Welcome bonus phone ${key} marked as claimed.`);
  } catch (err) {
    console.warn('recordBonusClaimedForPhone error:', err);
  }
}

// Update User Phone Number in Firestore with Uganda Validation & Bonus Eligibility Check
export async function updateUserPhoneNumber(
  userId: string,
  rawPhone: string
): Promise<{ success: boolean; message: string; updatedProfile?: UserProfile; bonusDisqualified?: boolean }> {
  try {
    const validation = validateUgandaPhoneNumber(rawPhone);
    if (!validation.isValid) {
      return { success: false, message: validation.error || 'Invalid Ugandan phone number.' };
    }

    // Check if phone number is in use by another active account
    const phoneTaken = await isPhoneNumberTaken(validation.formatted, userId);
    if (phoneTaken) {
      return { success: false, message: 'This phone number is already registered to another active account.' };
    }

    // Check if this phone number was ever used for a welcome bonus
    const alreadyClaimed = await isBonusClaimedForPhone(validation.normalized);

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { success: false, message: 'User profile not found.' };
    }

    const currentProfile = userSnap.data() as UserProfile;
    const shouldRevokeBonus = alreadyClaimed && currentProfile.walletBalance === 200 && currentProfile.gamesPlayed === 0;

    const updatedProfile: UserProfile = {
      ...currentProfile,
      phoneNumber: validation.formatted,
      normalizedPhone: validation.normalized,
      walletBalance: shouldRevokeBonus ? 0 : currentProfile.walletBalance,
      welcomeBonusClaimed: true,
      lastActiveTimestamp: Date.now(),
    };

    await saveUserProfileToFirestore(updatedProfile);
    localStorage.setItem('checkers_user_profile', JSON.stringify(updatedProfile));

    // Mark in bonus registry
    await recordBonusClaimedForPhone(validation.normalized, userId);

    const bonusMsg = alreadyClaimed
      ? `Phone linked: ${validation.formatted} (${validation.operator}). Note: This phone previously received a welcome bonus.`
      : `Phone updated: ${validation.formatted} (${validation.operator})!`;

    return {
      success: true,
      message: bonusMsg,
      updatedProfile,
      bonusDisqualified: alreadyClaimed,
    };
  } catch (err: any) {
    console.error('updateUserPhoneNumber error:', err);
    return { success: false, message: err?.message || 'Failed to update phone number.' };
  }
}

// Check if a phone number is already registered to another account
export async function isPhoneNumberTaken(phoneNumber: string, excludeUid?: string): Promise<boolean> {
  try {
    const clean = normalizePhoneNumber(phoneNumber);
    if (!clean || clean.length < 6) return false;

    const usersRef = collection(db, 'users');
    
    // 1. Query by normalizedPhone
    const qNorm = query(usersRef, where('normalizedPhone', '==', clean));
    const snapNorm = await getDocs(qNorm);
    if (!snapNorm.empty) {
      for (const docSnap of snapNorm.docs) {
        if (!excludeUid || docSnap.id !== excludeUid) {
          return true;
        }
      }
    }

    // 2. Query by raw phoneNumber as well
    const qRaw = query(usersRef, where('phoneNumber', '==', phoneNumber.trim()));
    const snapRaw = await getDocs(qRaw);
    if (!snapRaw.empty) {
      for (const docSnap of snapRaw.docs) {
        if (!excludeUid || docSnap.id !== excludeUid) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.warn('Firestore isPhoneNumberTaken query error:', err);
    return false;
  }
}

// Check if username is already taken by another user in Firestore
export async function isUsernameTaken(username: string, excludeUid?: string): Promise<boolean> {
  try {
    const normalized = username.trim().toLowerCase();
    if (!normalized) return false;
    const q = query(collection(db, 'users'), where('usernameLowercase', '==', normalized));
    const querySnap = await getDocs(q);
    
    if (querySnap.empty) return false;
    if (excludeUid && querySnap.docs.length === 1 && querySnap.docs[0].id === excludeUid) {
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Firestore isUsernameTaken query fallback:', err);
    return false;
  }
}

// Save or Update User Profile in Firestore
export async function saveUserProfileToFirestore(profile: UserProfile): Promise<void> {
  try {
    const userRef = doc(db, 'users', profile.id);
    const cleanPhone = profile.phoneNumber ? profile.phoneNumber.trim() : '';
    const normPhone = normalizePhoneNumber(cleanPhone);
    const isGuestUser = Boolean(profile.isGuest || profile.id.startsWith('guest_'));

    const dataToSave = {
      ...profile,
      phoneNumber: cleanPhone,
      normalizedPhone: normPhone,
      isGuest: isGuestUser,
      usernameLowercase: (profile.username || '').toLowerCase(),
      isOnline: profile.isOnline ?? true,
      lastActiveTimestamp: Date.now(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, dataToSave, { merge: true });
    console.log(`[Firestore] Profile saved successfully for ${profile.username} (${profile.id})`);
  } catch (err) {
    console.error('Firestore saveUserProfileToFirestore error:', err);
    throw err;
  }
}

// Delete a guest player's data from Firestore immediately
export async function deleteGuestPlayerFromFirestore(guestId: string): Promise<void> {
  try {
    if (!guestId || (!guestId.startsWith('guest_') && !guestId.includes('guest'))) return;
    const userRef = doc(db, 'users', guestId);
    await deleteDoc(userRef);
    console.log(`[Firestore] Guest player ${guestId} data cleared on exit.`);
  } catch (err) {
    console.warn('deleteGuestPlayerFromFirestore warning:', err);
  }
}

// Clean up all guest player accounts from Firestore database
export async function cleanUpAllGuestPlayersFromFirestore(): Promise<number> {
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    let deletedCount = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as UserProfile;
      const isGuest =
        data.isGuest ||
        docSnap.id.startsWith('guest_') ||
        (data.username && data.username.toLowerCase().startsWith('guest'));

      if (isGuest) {
        await deleteDoc(docSnap.ref);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      console.log(`[Firestore] Cleaned up ${deletedCount} guest player records from database.`);
    }
    return deletedCount;
  } catch (err) {
    console.warn('cleanUpAllGuestPlayersFromFirestore error:', err);
    return 0;
  }
}

// Helper to construct profile object from Firebase User
function createProfileFromFirebaseUser(user: any): UserProfile {
  const emailPrefix = user.email ? user.email.split('@')[0] : '';
  const rawName = user.displayName || emailPrefix || 'player';
  // Keep lowercase letters only for username to match app conventions
  const alphaOnly = rawName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanUsername = (alphaOnly.length >= 3 ? alphaOnly.slice(0, 15) : (alphaOnly + 'player')).slice(0, 15);

  return {
    id: user.uid,
    username: cleanUsername,
    realName: user.displayName || cleanUsername,
    phoneNumber: user.phoneNumber || '',
    normalizedPhone: normalizePhoneNumber(user.phoneNumber || ''),
    isGuest: false,
    avatarId: 'avatar-crown',
    termsAccepted: true,
    elo: 1200,
    rating: 1200,
    walletBalance: 200,
    welcomeBonusClaimed: true,
    status: 'online',
    createdAt: Date.now(),
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    isOnline: true,
    lastActiveTimestamp: Date.now(),
  };
}

// Google Sign In (Native Google Play Services on Android APK, Web Popup on browser)
export async function signInWithGoogle(rememberMe: boolean = true): Promise<UserProfile> {
  await setAuthRememberMe(rememberMe);

  let user: any = null;

  if (Capacitor.isNativePlatform()) {
    try {
      await GoogleAuth.initialize({
        clientId: '726155928996-e6fadk0324f1tkbq40dp3ms8dmlsp9ra.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: false,
      });

      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken || (googleUser as any)?.idToken;
      if (!idToken) {
        throw new Error('Google Sign-In did not return an ID token.');
      }
      const credential = GoogleAuthProvider.credential(idToken);
      const res = await signInWithCredential(auth, credential);
      user = res.user;
    } catch (nativeErr: any) {
      console.error('Native Google Auth error:', nativeErr);
      const errMsg = nativeErr?.message || String(nativeErr || '');
      const isUserCancel =
        errMsg.includes('canceled') ||
        errMsg.includes('12501') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('popup-closed-by-user');

      if (isUserCancel) {
        throw new Error('Sign in was canceled.');
      }

      if (
        errMsg.includes('10') ||
        errMsg.includes('12500') ||
        errMsg.includes('Something went wrong') ||
        errMsg.includes('DEVELOPER_ERROR')
      ) {
        throw new Error(
          'Google Sign-In configuration error (Developer Error 10). The APK must be rebuilt with the updated google-services.json so Google Play Services can verify the SHA-1 key.'
        );
      }

      throw new Error(errMsg || 'Google Sign-In failed on this device.');
    }
  } else {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });
    const result = await signInWithPopup(auth, provider);
    user = result.user;
  }

  let existingProfile = await getUserProfileFromFirestore(user.uid);
  if (!existingProfile) {
    existingProfile = createProfileFromFirebaseUser(user);
    await saveUserProfileToFirestore(existingProfile);
  } else {
    existingProfile.isOnline = true;
    existingProfile.lastActiveTimestamp = Date.now();
    await saveUserProfileToFirestore(existingProfile);
  }

  localStorage.setItem('checkers_user_profile', JSON.stringify(existingProfile));
  return existingProfile;
}

// Helper to format Firebase Auth error codes into clean user messages
export function formatFirebaseAuthError(error: any): string {
  if (!error) return 'Authentication failed. Please try again.';
  const code = error?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Access temporarily restricted. Try again later or reset password.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection.';
    default:
      return error?.message || 'Authentication failed. Please try again.';
  }
}

// 100% In-App Firebase Sign Up with Email & Password
export async function signUpWithFirebaseEmail(params: {
  email: string;
  password: string;
  username: string;
  realName: string;
  phoneNumber: string;
  avatarId?: string;
  rememberMe?: boolean;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanUsername = params.username.trim().toLowerCase();
  const cleanRealName = params.realName.trim();
  const cleanPhone = params.phoneNumber ? params.phoneNumber.trim() : '';

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // Pre-validate username uniqueness and lowercase letters in Firestore
  if (!/^[a-z]+$/.test(cleanUsername)) {
    throw new Error('Username must contain lowercase letters only (a-z).');
  }

  const usernameTaken = await isUsernameTaken(cleanUsername);
  if (usernameTaken) {
    throw new Error('This username is already taken. Please choose another username.');
  }

  if (cleanPhone) {
    const phoneTaken = await isPhoneNumberTaken(cleanPhone);
    if (phoneTaken) {
      throw new Error('This phone number is already linked to another account.');
    }
  }

  await setAuthRememberMe(params.rememberMe ?? true);

  // 1. Create Firebase Auth user
  let userCred;
  try {
    userCred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
  } catch (err: any) {
    throw new Error(formatFirebaseAuthError(err));
  }

  const fbUser = userCred.user;

  // 2. Set Firebase Auth Display Name
  try {
    await updateProfile(fbUser, { displayName: cleanUsername });
  } catch (e) {
    console.warn('updateProfile warning:', e);
  }

  // 3. Create or save comprehensive user profile in Firestore
  const newProfile: UserProfile = {
    id: fbUser.uid,
    username: cleanUsername,
    realName: cleanRealName || cleanUsername,
    phoneNumber: cleanPhone,
    normalizedPhone: normalizePhoneNumber(cleanPhone),
    isGuest: false,
    avatarId: params.avatarId || 'avatar-crown',
    termsAccepted: true,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    rating: 1200,
    elo: 1200,
    walletBalance: 200,
    welcomeBonusClaimed: true,
    status: 'online',
    isOnline: true,
    lastActiveTimestamp: Date.now(),
    createdAt: Date.now(),
  };

  await saveUserProfileToFirestore(newProfile);
  localStorage.setItem('checkers_user_profile', JSON.stringify(newProfile));
  return newProfile;
}

// 100% In-App Firebase Sign In with Email & Password
export async function signInWithFirebaseEmail(params: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<UserProfile> {
  const cleanEmail = params.email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address.');
  }
  if (!params.password) {
    throw new Error('Please enter your password.');
  }

  await setAuthRememberMe(params.rememberMe ?? true);

  let userCred;
  try {
    userCred = await signInWithEmailAndPassword(auth, cleanEmail, params.password);
  } catch (err: any) {
    throw new Error(formatFirebaseAuthError(err));
  }

  const fbUser = userCred.user;
  let profile = await getUserProfileFromFirestore(fbUser.uid);

  if (!profile) {
    profile = createProfileFromFirebaseUser(fbUser);
    await saveUserProfileToFirestore(profile);
  } else {
    profile.isOnline = true;
    profile.lastActiveTimestamp = Date.now();
    await saveUserProfileToFirestore(profile);
  }

  localStorage.setItem('checkers_user_profile', JSON.stringify(profile));
  return profile;
}

// Send Firebase Password Reset Email In-App
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Please enter a valid email address.');
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err: any) {
    throw new Error(formatFirebaseAuthError(err));
  }
}

// Register a new user in-app directly into Firestore
export async function registerInAppUser(params: {
  username: string;
  realName: string;
  phoneNumber: string;
  avatarId: string;
}): Promise<UserProfile> {
  const cleanUsername = params.username.trim().toLowerCase();
  if (!/^[a-z]+$/.test(cleanUsername)) {
    throw new Error('Username must contain lowercase letters only (a-z).');
  }
  const taken = await isUsernameTaken(cleanUsername);
  if (taken) {
    throw new Error('This username is already taken. Please choose another username.');
  }

  const cleanPhone = params.phoneNumber ? params.phoneNumber.trim() : '';
  if (cleanPhone) {
    const phoneTaken = await isPhoneNumberTaken(cleanPhone);
    if (phoneTaken) {
      throw new Error('This phone number is already registered with another account. Please use a different phone number.');
    }
  }

  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const newProfile: UserProfile = {
    id: userId,
    username: cleanUsername,
    realName: params.realName.trim(),
    phoneNumber: cleanPhone,
    normalizedPhone: normalizePhoneNumber(cleanPhone),
    isGuest: false,
    avatarId: params.avatarId || 'avatar-crown',
    termsAccepted: true,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    rating: 1200,
    elo: 1200,
    status: 'online',
    isOnline: true,
    lastActiveTimestamp: Date.now(),
    createdAt: Date.now(),
  };

  await saveUserProfileToFirestore(newProfile);
  localStorage.setItem('checkers_user_profile', JSON.stringify(newProfile));
  return newProfile;
}

// Direct In-App User Login by Username or Phone Number from Firestore
export async function loginWithUsernameOrPhone(identifier: string): Promise<UserProfile | null> {
  try {
    const clean = identifier.trim();
    if (!clean) return null;

    const lower = clean.toLowerCase();
    const usersRef = collection(db, 'users');

    // 1. Query by lowercase username
    const qUser = query(usersRef, where('usernameLowercase', '==', lower));
    let snap = await getDocs(qUser);

    // 2. Query by phone number if not found
    if (snap.empty) {
      const qPhone = query(usersRef, where('phoneNumber', '==', clean));
      snap = await getDocs(qPhone);
    }

    if (!snap.empty) {
      const userDoc = snap.docs[0];
      const profile = userDoc.data() as UserProfile;
      const updatedProfile: UserProfile = {
        ...profile,
        status: 'online',
        isOnline: true,
        lastActiveTimestamp: Date.now(),
      };
      await saveUserProfileToFirestore(updatedProfile);
      localStorage.setItem('checkers_user_profile', JSON.stringify(updatedProfile));
      return updatedProfile;
    }
  } catch (err) {
    console.error('In-app login lookup error:', err);
    throw err;
  }
  return null;
}

// Fetch Top Leaderboard Entries from Firestore
export async function getLeaderboardFromFirestore(): Promise<UserProfile[]> {
  try {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);
    const list: UserProfile[] = [];
    snap.forEach((docSnap) => {
      const u = docSnap.data() as UserProfile;
      if (u && u.username) {
        list.push(u);
      }
    });
    // Sort by rating descending
    list.sort((a, b) => (b.rating || b.elo || 1200) - (a.rating || a.elo || 1200));
    return list.slice(0, 50);
  } catch (err) {
    console.warn('Firestore leaderboard fetch warning:', err);
    return [];
  }
}

// Subscribe to Realtime Leaderboard from Firestore
export function subscribeToLeaderboard(callback: (leaderboard: UserProfile[]) => void) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(100));
    return onSnapshot(q, (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data && data.username) {
          list.push(data);
        }
      });
      list.sort((a, b) => (b.rating || b.elo || 1200) - (a.rating || a.elo || 1200));
      callback(list);
    }, (err) => {
      console.warn('Realtime leaderboard listener warning:', err);
    });
  } catch (err) {
    console.warn('Realtime leaderboard listener failed:', err);
    return () => {};
  }
}

// Fetch User Profile from Firestore
export async function getUserProfileFromFirestore(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    console.warn('Firestore getDoc warning:', err);
  }
  return null;
}

// Configure Auth Persistence
export async function setAuthRememberMe(remember: boolean): Promise<void> {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
  } catch (e) {
    console.warn('Auth persistence warning:', e);
  }
}

// Subscribe to Realtime Online Users in Firestore (Real-Time Only)
export function subscribeToOnlineUsers(callback: (users: UserProfile[]) => void) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, limit(100));
    return onSnapshot(q, (snapshot) => {
      const active: UserProfile[] = [];
      const now = Date.now();
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data && data.id && data.username) {
          // Strictly check real-time active heartbeat (within past 60s) and isOnline flag
          const isRecentlyActive = !!data.lastActiveTimestamp && (now - data.lastActiveTimestamp < 60000);
          if (data.isOnline === true && isRecentlyActive) {
            active.push(data);
          }
        }
      });
      callback(active);
    }, (err) => {
      console.warn('Realtime online users listener warning:', err);
    });
  } catch (err) {
    console.warn('Realtime listener failed:', err);
    return () => {};
  }
}

// Update presence heartbeat in Firestore
export async function updatePresenceHeartbeat(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline: true,
      lastActiveTimestamp: Date.now(),
    });
  } catch (e) {
    // If document doesn't exist or offline, ignore heartbeat error
  }
}

// Mark user offline in Firestore
export async function setUserOfflineInFirestore(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isOnline: false,
      lastActiveTimestamp: Date.now(),
    });
  } catch (e) {
    // ignore
  }
}

// ==========================================
// REAL-TIME FIRESTORE CHALLENGE SYSTEM
// ==========================================

// Helper to serialize GameRoom for Firestore (encodes 2D board to avoid nested array rejection)
export function serializeRoomForFirestore(room: GameRoom): any {
  return {
    id: room.id,
    name: room.name,
    status: room.status,
    redPlayer: room.redPlayer || null,
    blackPlayer: room.blackPlayer || null,
    currentTurn: room.currentTurn || 'red',
    boardJson: JSON.stringify(room.board || []),
    history: room.history || [],
    capturedRed: room.capturedRed || 0,
    capturedBlack: room.capturedBlack || 0,
    winner: room.winner || null,
    winReason: room.winReason || null,
    createdAt: room.createdAt || Date.now(),
    lastMoveTimestamp: room.lastMoveTimestamp || Date.now(),
    turnTimeLimitSeconds: room.turnTimeLimitSeconds || 900,
    turnDeadline: room.turnDeadline || Date.now() + 900000,
    spectatorsCount: room.spectatorsCount || 0,
    isBotGame: !!room.isBotGame,
    botDifficulty: room.botDifficulty || null,
  };
}

// Helper to deserialize GameRoom from Firestore
export function deserializeRoomFromFirestore(data: any): GameRoom | null {
  if (!data) return null;
  let board = data.board;
  if (data.boardJson && typeof data.boardJson === 'string') {
    try {
      board = JSON.parse(data.boardJson);
    } catch (e) {
      console.warn('Failed to parse boardJson:', e);
    }
  }
  if (!board || !Array.isArray(board) || board.length !== 8) {
    board = createInitialBoard();
  }
  return {
    ...data,
    board,
  } as GameRoom;
}

export async function sendChallengeToFirestore(
  fromUser: UserProfile,
  toUser: UserProfile,
  customChallengeId?: string,
  stakeAmount: number = 0
): Promise<string> {
  const challengeId = customChallengeId || `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const challengeDoc = doc(db, 'challenges', challengeId);
  const challengeData = {
    id: challengeId,
    fromUser,
    toUser,
    targetUserId: toUser.id,
    targetUsername: toUser.username,
    stakeAmount: Number(stakeAmount) || 0,
    status: 'pending',
    createdAt: Date.now(),
  };
  await setDoc(challengeDoc, challengeData);
  console.log(`[Firestore] Challenge created ${challengeId} from ${fromUser.username} to ${toUser.username} (${stakeAmount} UGX)`);
  return challengeId;
}

export function subscribeToIncomingChallenges(userId: string, callback: (challenge: Challenge | null) => void) {
  try {
    const q = query(
      collection(db, 'challenges'),
      where('targetUserId', '==', userId),
      where('status', '==', 'pending'),
      limit(5)
    );
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Find most recent valid pending challenge
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data() as Challenge;
          if (Date.now() - (data.createdAt || 0) < 120000 && data.status === 'pending') {
            callback(data);
            return;
          }
        }
      }
      callback(null);
    });
  } catch (err) {
    console.warn('subscribeToIncomingChallenges error:', err);
    return () => {};
  }
}

export function subscribeToChallengeDoc(
  challengeId: string,
  callback: (challenge: { status: string; roomId?: string; room?: GameRoom } | null) => void
) {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    return onSnapshot(challengeRef, (snap) => {
      if (snap.exists()) {
        const raw = snap.data();
        let room: GameRoom | null = null;
        if (raw.roomSerialized) {
          room = deserializeRoomFromFirestore(raw.roomSerialized);
        } else if (raw.room) {
          room = deserializeRoomFromFirestore(raw.room);
        }
        callback({
          status: raw.status,
          roomId: raw.roomId,
          room: room || undefined,
        });
      }
    });
  } catch (err) {
    console.warn('subscribeToChallengeDoc error:', err);
    return () => {};
  }
}

export async function respondToChallengeInFirestore(
  challengeId: string,
  accept: boolean,
  fromUser: UserProfile,
  toUser: UserProfile,
  existingRoomId?: string,
  stakeAmount: number = 0
): Promise<{ roomId: string; room: GameRoom } | null> {
  try {
    const challengeRef = doc(db, 'challenges', challengeId);
    if (!accept) {
      await updateDoc(challengeRef, { status: 'declined' });
      return null;
    }

    const roomId = existingRoomId || `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Challenger (fromUser) is Red (moves first), Opponent who accepts (toUser) is Black
    const redPlayer: GamePlayer = {
      id: fromUser.id,
      username: fromUser.username,
      avatarId: fromUser.avatarId,
      rating: fromUser.rating || fromUser.elo || 1200,
      color: 'red',
    };

    const blackPlayer: GamePlayer = {
      id: toUser.id,
      username: toUser.username,
      avatarId: toUser.avatarId,
      rating: toUser.rating || toUser.elo || 1200,
      color: 'black',
    };

    const newRoom: GameRoom = {
      id: roomId,
      name: `${redPlayer.username} vs ${blackPlayer.username}`,
      status: 'playing',
      stakeAmount: Number(stakeAmount) || 0,
      potAmount: (Number(stakeAmount) || 0) * 2,
      redPlayer,
      blackPlayer,
      currentTurn: 'red',
      board: createInitialBoard(),
      history: [],
      capturedRed: 0,
      capturedBlack: 0,
      winner: null,
      createdAt: Date.now(),
      lastMoveTimestamp: Date.now(),
      turnTimeLimitSeconds: 20,
      turnDeadline: Date.now() + 20000,
      spectatorsCount: 0,
    };

    const serializedRoom = serializeRoomForFirestore(newRoom);
    await saveGameRoomToFirestore(newRoom);
    await setDoc(
      challengeRef,
      {
        status: 'accepted',
        roomId,
        roomSerialized: serializedRoom,
      },
      { merge: true }
    );
    return { roomId, room: newRoom };
  } catch (e) {
    console.error('respondToChallengeInFirestore error:', e);
    return null;
  }
}

// ==========================================
// REAL-TIME FIRESTORE GAME ROOM & CHAT
// ==========================================

export async function saveGameRoomToFirestore(room: GameRoom): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', room.id);
    const serialized = serializeRoomForFirestore(room);
    await setDoc(roomRef, serialized, { merge: true });
    console.log(`[Firestore] Game table room saved: ${room.id}`);
  } catch (e) {
    console.warn('saveGameRoomToFirestore error:', e);
  }
}

export async function deleteGameRoomFromFirestore(roomId: string): Promise<void> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await deleteDoc(roomRef);
    console.log(`[Firestore] Game table room ${roomId} deleted.`);
  } catch (e) {
    console.warn('deleteGameRoomFromFirestore error:', e);
  }
}

export function subscribeToAllGameRooms(callback: (rooms: GameRoom[]) => void) {
  try {
    const q = query(collection(db, 'rooms'), limit(30));
    return onSnapshot(q, (snapshot) => {
      const rooms: GameRoom[] = [];
      snapshot.forEach((docSnap) => {
        const room = deserializeRoomFromFirestore(docSnap.data());
        if (room && (room.status === 'waiting' || room.status === 'playing')) {
          rooms.push(room);
        }
      });
      rooms.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      callback(rooms);
    });
  } catch (e) {
    console.warn('subscribeToAllGameRooms error:', e);
    return () => {};
  }
}

export function subscribeToGameRoom(roomId: string, callback: (room: GameRoom | null) => void) {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    return onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const room = deserializeRoomFromFirestore(snap.data());
        callback(room);
      } else {
        callback(null);
      }
    });
  } catch (e) {
    console.warn('subscribeToGameRoom error:', e);
    return () => {};
  }
}

export async function sendGameChatToFirestore(roomId: string, message: ChatMessage): Promise<void> {
  try {
    const msgRef = doc(db, 'rooms', roomId, 'messages', message.id);
    await setDoc(msgRef, message);
  } catch (e) {
    console.warn('sendGameChatToFirestore error:', e);
  }
}

export function subscribeToGameChat(roomId: string, callback: (messages: ChatMessage[]) => void) {
  try {
    const q = query(collection(db, 'rooms', roomId, 'messages'), limit(50));
    return onSnapshot(q, (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push(docSnap.data() as ChatMessage);
      });
      msgs.sort((a, b) => a.timestamp - b.timestamp);
      callback(msgs);
    });
  } catch (e) {
    console.warn('subscribeToGameChat error:', e);
    return () => {};
  }
}

// ==========================================
// DELETE ACCOUNT
// ==========================================

export async function deleteUserAccount(userId: string): Promise<void> {
  // 1. Delete user document from Firestore
  try {
    if (userId) {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      console.log(`[Firestore] User ${userId} document deleted.`);
    }
  } catch (e) {
    console.warn('deleteDoc user warning:', e);
  }

  // 2. Try deleting from Firebase Auth (will safely ignore if requires recent login)
  if (auth.currentUser) {
    try {
      await auth.currentUser.delete();
      console.log('[Auth] Firebase Auth user deleted successfully.');
    } catch (e: any) {
      console.warn('auth delete warning (non-fatal):', e?.message || e);
    }
  }

  // 3. Clear all browser persistence & sign out
  try {
    localStorage.removeItem('checkers_user_profile');
    localStorage.removeItem('checkers_google_user');
    localStorage.removeItem('checkers_board_theme');
    sessionStorage.clear();
  } catch (e) {
    // ignore
  }

  try {
    await signOut(auth);
  } catch (e) {
    // ignore
  }
}

// Logout
export async function logOutUser(): Promise<void> {
  if (auth.currentUser) {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { isOnline: false, lastActiveTimestamp: Date.now() });
    } catch (e) {
      // ignore
    }
  }
  try {
    const raw = localStorage.getItem('checkers_user_profile');
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.id) {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { isOnline: false, lastActiveTimestamp: Date.now() });
      }
    }
  } catch (e) {
    // ignore
  }
  try {
    localStorage.removeItem('checkers_user_profile');
    sessionStorage.clear();
    await signOut(auth);
  } catch (e) {
    // ignore
  }
}

// -------------------------------------------------------------
// WALLET TRANSACTIONS & BALANCE PERSISTENCE IN FIRESTORE
// -------------------------------------------------------------

export async function recordWalletTransactionInFirestore(tx: WalletTransaction): Promise<void> {
  try {
    const txRef = doc(db, 'transactions', tx.id);
    await setDoc(txRef, {
      ...tx,
      createdAt: serverTimestamp(),
    }, { merge: true });

    // Also cache locally for instant offline display
    try {
      const stored = localStorage.getItem(`checkers_tx_${tx.userId}`);
      const list: WalletTransaction[] = stored ? JSON.parse(stored) : [];
      const filtered = list.filter((item) => item.id !== tx.id);
      filtered.unshift(tx);
      localStorage.setItem(`checkers_tx_${tx.userId}`, JSON.stringify(filtered.slice(0, 50)));
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('Failed to save transaction to Firestore:', err);
  }
}

export async function getUserTransactionsFromFirestore(userId: string): Promise<WalletTransaction[]> {
  try {
    const txRef = collection(db, 'transactions');
    const q = query(
      txRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    const results: WalletTransaction[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      results.push({
        id: d.id,
        userId: data.userId || userId,
        type: data.type || 'deposit',
        amount: Number(data.amount) || 0,
        currency: data.currency || 'UGX',
        status: data.status || 'completed',
        description: data.description || '',
        reference: data.reference,
        transactionReference: data.transactionReference,
        pesajetTransactionId: data.pesajetTransactionId,
        timestamp: data.timestamp || Date.now(),
      });
    });

    if (results.length > 0) {
      try {
        localStorage.setItem(`checkers_tx_${userId}`, JSON.stringify(results));
      } catch {
        // ignore
      }
      return results;
    }
  } catch (err) {
    console.warn('Querying transactions with orderBy failed, trying fallback without index:', err);
    try {
      const txRef = collection(db, 'transactions');
      const qFallback = query(txRef, where('userId', '==', userId), limit(50));
      const snap = await getDocs(qFallback);
      const results: WalletTransaction[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        results.push({
          id: d.id,
          userId: data.userId || userId,
          type: data.type || 'deposit',
          amount: Number(data.amount) || 0,
          currency: data.currency || 'UGX',
          status: data.status || 'completed',
          description: data.description || '',
          reference: data.reference,
          transactionReference: data.transactionReference,
          pesajetTransactionId: data.pesajetTransactionId,
          timestamp: data.timestamp || Date.now(),
        });
      });
      results.sort((a, b) => b.timestamp - a.timestamp);
      return results;
    } catch (e2) {
      console.warn('Fallback query also failed, using local storage:', e2);
    }
  }

  try {
    const stored = localStorage.getItem(`checkers_tx_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export async function updateUserWalletBalanceInFirestore(
  userId: string,
  newBalance: number,
  deltaStats?: { totalWonDelta?: number; totalStakedDelta?: number }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const updates: Record<string, any> = {
      walletBalance: Math.max(0, newBalance),
      lastActiveTimestamp: Date.now(),
    };
    if (deltaStats?.totalWonDelta) {
      const currentDoc = await getDoc(userRef);
      const currentWon = currentDoc.exists() ? currentDoc.data().totalWon || 0 : 0;
      updates.totalWon = currentWon + deltaStats.totalWonDelta;
    }
    if (deltaStats?.totalStakedDelta) {
      const currentDoc = await getDoc(userRef);
      const currentStaked = currentDoc.exists() ? currentDoc.data().totalStaked || 0 : 0;
      updates.totalStaked = currentStaked + deltaStats.totalStakedDelta;
    }
    await updateDoc(userRef, updates);
  } catch (err) {
    console.warn('Error updating user walletBalance in Firestore:', err);
  }
}


