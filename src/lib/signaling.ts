import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  addDoc, 
  getDoc,
  updateDoc,
  type DocumentSnapshot,
  type QuerySnapshot
} from 'firebase/firestore';

function generateShortId(length = 4) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createRoom() {
  let roomId = generateShortId();
  let roomRef = doc(db, 'rooms', roomId);
  let roomSnapshot = await getDoc(roomRef);

  // Try until we find a unique ID
  while (roomSnapshot.exists()) {
    roomId = generateShortId();
    roomRef = doc(db, 'rooms', roomId);
    roomSnapshot = await getDoc(roomRef);
  }

  return { roomRef, roomId };
}

export async function joinRoom(roomId: string) {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists()) {
    throw new Error('Room not found');
  }
  return roomRef;
}

export async function setOffer(roomRef: any, offer: RTCSessionDescriptionInit) {
  await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } });
}

export async function setAnswer(roomRef: any, answer: RTCSessionDescriptionInit) {
  await updateDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } });
}

export function onAnswer(roomRef: any, callback: (answer: RTCSessionDescriptionInit) => void) {
  return onSnapshot(roomRef, (snapshot: DocumentSnapshot) => {
    const data = snapshot.data();
    if (data?.answer) {
      callback(data.answer);
    }
  });
}

export function onOffer(roomRef: any, callback: (offer: RTCSessionDescriptionInit) => void) {
  return onSnapshot(roomRef, (snapshot: DocumentSnapshot) => {
    const data = snapshot.data();
    if (data?.offer) {
      callback(data.offer);
    }
  });
}

export async function addIceCandidate(roomRef: any, candidate: RTCIceCandidate, role: 'caller' | 'callee') {
  const candidatesCol = collection(roomRef, role === 'caller' ? 'callerCandidates' : 'calleeCandidates');
  await addDoc(candidatesCol, candidate.toJSON());
}

export function onIceCandidate(roomRef: any, role: 'caller' | 'callee', callback: (candidate: RTCIceCandidateInit) => void) {
  const candidatesCol = collection(roomRef, role === 'caller' ? 'calleeCandidates' : 'callerCandidates');
  return onSnapshot(candidatesCol, (snapshot: QuerySnapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        callback(change.doc.data() as RTCIceCandidateInit);
      }
    });
  });
}
