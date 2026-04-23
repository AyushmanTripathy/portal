import { 
  createRoom, 
  joinRoom, 
  setOffer, 
  setAnswer, 
  onAnswer, 
  onOffer, 
  addIceCandidate, 
  onIceCandidate 
} from './signaling';

const CHUNK_SIZE = 16384; // 16KB chunks

export class WebRTCTransfer {
  pc: RTCPeerConnection;
  dataChannel: RTCDataChannel | null = null;
  
  status = $state('idle'); // idle, connecting, connected, disconnected
  roomId = $state('');
  progress = $state(0);
  receivedFile = $state<{ name: string, blob: Blob } | null>(null);

  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  constructor() {
    this.pc = new RTCPeerConnection(this.iceServers);
    this.setupListeners();
  }

  private setupListeners() {
    this.pc.oniceconnectionstatechange = () => {
      this.status = this.pc.iceConnectionState;
    };

    this.pc.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };
  }

  private setupDataChannel() {
    if (!this.dataChannel) return;

    let receivedChunks: ArrayBuffer[] = [];
    let fileName = '';
    let fileSize = 0;
    let receivedSize = 0;

    this.dataChannel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const metadata = JSON.parse(event.data);
        fileName = metadata.name;
        fileSize = metadata.size;
        receivedChunks = [];
        receivedSize = 0;
        this.progress = 0;
      } else {
        receivedChunks.push(event.data);
        receivedSize += event.data.byteLength;
        this.progress = Math.round((receivedSize / fileSize) * 100);

        if (receivedSize >= fileSize) {
          const blob = new Blob(receivedChunks);
          this.receivedFile = { name: fileName, blob };
          this.progress = 100;
        }
      }
    };

    this.dataChannel.onopen = () => {
      this.status = 'connected';
    };
  }

  async startAsCaller() {
    const { roomRef, roomId } = await createRoom();
    this.roomId = roomId;

    this.dataChannel = this.pc.createDataChannel('fileTransfer');
    this.setupDataChannel();

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addIceCandidate(roomRef, event.candidate, 'caller');
      }
    };

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await setOffer(roomRef, offer);

    onAnswer(roomRef, async (answer) => {
      if (!this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    onIceCandidate(roomRef, 'caller', async (candidate) => {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  async startAsCallee(roomId: string) {
    this.roomId = roomId;
    const roomRef = await joinRoom(roomId);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        addIceCandidate(roomRef, event.candidate, 'callee');
      }
    };

    onOffer(roomRef, async (offer) => {
      if (!this.pc.currentRemoteDescription) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await setAnswer(roomRef, answer);
      }
    });

    onIceCandidate(roomRef, 'callee', async (candidate) => {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
  }

  async sendFile(file: File) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('Data channel not open');
    }

    // Send metadata
    this.dataChannel.send(JSON.stringify({ name: file.name, size: file.size }));

    const reader = file.stream().getReader();
    let sentSize = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Further chunking if necessary (stream might give large chunks)
      for (let offset = 0; offset < value.byteLength; offset += CHUNK_SIZE) {
        const chunk = value.slice(offset, offset + CHUNK_SIZE);
        
        // Handle backpressure
        if (this.dataChannel.bufferedAmount > this.dataChannel.bufferedAmountLowThreshold) {
          await new Promise(resolve => {
            this.dataChannel!.onbufferedamountlow = () => {
              this.dataChannel!.onbufferedamountlow = null;
              resolve(null);
            };
          });
        }
        
        this.dataChannel.send(chunk);
        sentSize += chunk.byteLength;
        this.progress = Math.round((sentSize / file.size) * 100);
      }
    }
  }
}
