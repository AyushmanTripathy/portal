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

export async function createRoom() {
  const roomRef = doc(collection(db, 'rooms'));
  const roomId = roomRef.id;
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
