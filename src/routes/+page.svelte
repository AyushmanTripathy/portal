<script lang="ts">
  import { WebRTCTransfer } from '$lib/transfer.svelte';
  import { toast } from 'svelte-sonner';
  import { onMount } from 'svelte';
  import { Plus, Copy, LogIn, Send, Download, File as FileIcon, Share2, ShieldCheck, Activity } from '@lucide/svelte';

  let transfer = $state<WebRTCTransfer | null>(null);
  let roomIdInput = $state('');
  let selectedFile = $state<File | null>(null);

  onMount(() => {
    transfer = new WebRTCTransfer();
  });

  async function handleCreateRoom() {
    if (!transfer) return;
    try {
      await transfer.startAsCaller();
      toast.success('Room created successfully!');
    } catch (e) {
      toast.error('Error creating room: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleJoinRoom() {
    if (!roomIdInput || !transfer) return;
    try {
      await transfer.startAsCallee(roomIdInput);
      toast.success('Joined room successfully!');
    } catch (e) {
      toast.error('Error joining room: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleSendFile() {
    if (!selectedFile || !transfer) return;
    try {
      await transfer.sendFile(selectedFile);
      toast.success('File sent successfully!');
    } catch (e) {
      toast.error('Error sending file: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      selectedFile = target.files[0];
    }
  }

  function downloadFile() {
    if (!transfer?.receivedFile) return;
    const url = URL.createObjectURL(transfer.receivedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.receivedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyRoomId() {
    if (!transfer?.roomId) return;
    try {
      await navigator.clipboard.writeText(transfer.roomId);
      toast.success('Room ID copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy Room ID');
    }
  }
</script>

<main class="min-h-screen p-4 md:p-8 bg-gray-50 flex flex-col items-center">
  <div class="flex items-center gap-3 mb-8">
    <div class="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-200">
      <Share2 size={28} strokeWidth={2.5} />
    </div>
    <h1 class="text-3xl font-black text-gray-900 tracking-tight">Portal</h1>
  </div>

  {#if transfer}
    <div class="w-full max-w-md bg-white p-6 md:p-8 rounded-2xl shadow-xl shadow-gray-200/50 space-y-8 border border-gray-100">
      <!-- Connection Section -->
      {#if !transfer.roomId}
        <div class="space-y-6">
          <button 
            onclick={handleCreateRoom}
            class="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-bold shadow-lg shadow-blue-100 group"
          >
            <Plus size={22} strokeWidth={3} class="group-hover:rotate-90 transition-transform" />
            Create Share Room
          </button>

          <div class="relative flex items-center">
            <div class="flex-grow border-t border-gray-100"></div>
            <span class="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Secure Peer Access</span>
            <div class="flex-grow border-t border-gray-100"></div>
          </div>

          <div class="flex gap-2">
            <input 
              type="text" 
              bind:value={roomIdInput} 
              placeholder="Paste Room ID..." 
              class="flex-1 px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-mono text-sm"
            />
            <button 
              onclick={handleJoinRoom}
              class="px-5 py-3 bg-gray-900 text-white rounded-xl hover:bg-black active:scale-[0.95] transition-all flex items-center gap-2 font-bold shadow-lg shadow-gray-200"
              title="Join Room"
            >
              <LogIn size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      {:else}
        <div class="p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-4">
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <div class="relative flex items-center justify-center">
                <div class="w-2 h-2 rounded-full {transfer.status === 'connected' ? 'bg-green-500' : 'bg-amber-500'}"></div>
                {#if transfer.status === 'connected'}
                  <div class="absolute w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                {/if}
              </div>
              <p class="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Activity size={10} />
                {transfer.status}
              </p>
            </div>
            <button 
              onclick={copyRoomId}
              class="flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 hover:text-blue-700 border border-blue-100 rounded-lg transition-all active:scale-95 text-[10px] font-black shadow-sm"
            >
              <Copy size={12} strokeWidth={2.5} />
              COPY ID
            </button>
          </div>
          <div class="group relative">
            <p class="text-xs text-gray-600 font-mono break-all bg-white p-4 rounded-xl border border-blue-100 shadow-sm leading-relaxed">
              {transfer.roomId}
            </p>
          </div>
          <div class="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase tracking-tighter">
            <ShieldCheck size={10} />
            End-to-End Encrypted Signaling
          </div>
        </div>
      {/if}

      <!-- Transfer Section -->
      {#if transfer.status === 'connected'}
        <div class="space-y-6 pt-6 border-t border-gray-100 animate-in fade-in zoom-in duration-300">
          <div class="space-y-3">
            <label for="file-upload" class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
              <FileIcon size={14} />
              Payload Selection
            </label>
            <div class="relative group">
              <input 
                id="file-upload"
                type="file" 
                onchange={handleFileChange}
                class="w-full text-xs text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-gray-900 file:text-white hover:file:bg-black transition-all cursor-pointer bg-gray-50 rounded-xl border border-dashed border-gray-200 p-2"
              />
            </div>
          </div>

          <button 
            onclick={handleSendFile}
            disabled={!selectedFile}
            class="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-3 font-bold shadow-lg shadow-blue-100 active:scale-[0.98]"
          >
            <Send size={20} strokeWidth={2.5} />
            Initialize Transfer
          </button>

          {#if transfer.progress > 0}
            <div class="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div class="flex justify-between items-center mb-1">
                <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data Stream</span>
                <p class="text-xs font-black text-blue-600">{transfer.progress}%</p>
              </div>
              <div class="h-2 w-full bg-white rounded-full overflow-hidden border border-gray-100">
                <div class="h-full bg-blue-600 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(37,99,235,0.4)]" style="width: {transfer.progress}%"></div>
              </div>
            </div>
          {/if}

          {#if transfer.receivedFile}
            <div class="p-5 bg-green-50 border border-green-100 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4 duration-500">
              <div class="flex items-center gap-4 min-w-0">
                <div class="p-3 bg-white rounded-xl text-green-600 shadow-sm border border-green-100">
                  <FileIcon size={24} strokeWidth={2.5} />
                </div>
                <div class="min-w-0">
                  <p class="text-[9px] font-black text-green-600 uppercase tracking-widest mb-0.5">Incoming File</p>
                  <p class="text-xs font-bold text-gray-900 truncate">{transfer.receivedFile.name}</p>
                </div>
              </div>
              <button 
                onclick={downloadFile}
                class="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100 active:scale-95 shrink-0"
              >
                <Download size={16} strokeWidth={3} />
                SAVE
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <div class="w-full max-w-md bg-white p-16 rounded-3xl shadow-xl shadow-gray-100 flex flex-col items-center gap-6 border border-gray-50">
      <div class="relative flex items-center justify-center">
        <div class="w-16 h-16 border-[6px] border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
        <Share2 size={24} class="absolute text-blue-600 animate-pulse" />
      </div>
      <div class="text-center space-y-1">
        <p class="text-sm font-black text-gray-900 uppercase tracking-widest">Handshaking</p>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initializing RTC Subsystem</p>
      </div>
    </div>
  {/if}

  <p class="mt-8 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">P2P Protocol Layer v1.0</p>
</main>

<style>
  :global(body) {
    background-color: #f9fafb;
  }
</style>
