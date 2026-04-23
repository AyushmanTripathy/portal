<script lang="ts">
  import { WebRTCTransfer } from '$lib/transfer.svelte';
  import { toast } from 'svelte-sonner';
  import { onMount } from 'svelte';
  import { Plus, Copy, Check, LogIn, Send, File as FileIcon, ShieldCheck, Loader2, Heart, ArrowUp, Download, Moon, Sun } from '@lucide/svelte';
  import { toggleMode } from 'mode-watcher';
  import { mode } from 'mode-watcher';

  let transfer = $state<WebRTCTransfer | null>(null);
  let roomIdInput = $state('');
  let selectedFile = $state<File | null>(null);
  let isActionPending = $state(false);
  let isDragging = $state(false);
  let isHovering = $state(false);
  let copiedState = $state<'idle' | 'copied'>('idle');
  let sendState = $state<'idle' | 'sending' | 'sent'>('idle');
  let downloadState = $state<'idle' | 'downloading' | 'downloaded'>('idle');

  onMount(() => {
    transfer = new WebRTCTransfer();
  });

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave() {
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      toast.success(`Selected: ${selectedFile.name}`);
    }
  }

  async function handleCreateRoom() {
    if (!transfer) return;
    isActionPending = true;
    try {
      await transfer.startAsCaller();
      toast.success('Room created');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      isActionPending = false;
    }
  }

  async function handleJoinRoom() {
    if (!roomIdInput || !transfer) return;
    isActionPending = true;
    try {
      await transfer.startAsCallee(roomIdInput);
      toast.success('Connected');
    } catch (e) {
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      isActionPending = false;
    }
  }

  async function handleSendFile() {
    if (!selectedFile || !transfer) return;
    sendState = 'sending';
    try {
      await transfer.sendFile(selectedFile);
      sendState = 'sent';
      toast.success('Sent');
      setTimeout(() => {
        sendState = 'idle';
      }, 2000);
    } catch (e) {
      sendState = 'idle';
      toast.error('Error: ' + (e instanceof Error ? e.message : String(e)));
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
    downloadState = 'downloading';
    const url = URL.createObjectURL(transfer.receivedFile.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.receivedFile.name;
    a.click();
    URL.revokeObjectURL(url);
    downloadState = 'downloaded';
    toast.success('Downloaded');
    setTimeout(() => {
      downloadState = 'idle';
    }, 2000);
  }

  async function copyRoomId() {
    if (!transfer?.roomId) return;
    try {
      await navigator.clipboard.writeText(transfer.roomId);
      copiedState = 'copied';
      toast.success('Copied');
      setTimeout(() => {
        copiedState = 'idle';
      }, 2000);
    } catch (err) {
      toast.error('Failed');
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
</script>

<main class="min-h-screen flex flex-col">
  <div class="flex-1 flex flex-col items-center justify-center p-6">
    <div class="w-full max-w-sm animate-[fadeIn_0.5s_ease-out]">
      <header class="flex items-center justify-between mb-12 animate-[fadeInUp_0.5s_ease-out_0.1s_both]">
        <div class="flex-1 text-left">
          <h1 class="text-2xl font-medium tracking-tight text-[--surface-900]">Portal</h1>
          <p class="text-xs text-[--surface-400] mt-1">Secure P2P transfer</p>
        </div>
        <button 
          type="button"
          onclick={() => toggleMode()}
          class="p-2 rounded-full text-[--surface-500] hover:text-[--surface-700] hover:bg-[--surface-100] transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {#if mode.current === 'dark'}
            <Sun size={18} />
          {:else}
            <Moon size={18} />
          {/if}
        </button>
      </header>

      {#if transfer}
        <div class="bg-[--surface-0] shadow-monolith rounded-lg p-6 space-y-6 animate-[fadeInUp_0.4s_ease-out_0.2s_both]">
          {#if !transfer.roomId}
            <div class="space-y-4">
              <button 
                onclick={handleCreateRoom}
                disabled={isActionPending}
                class="group w-full py-3 bg-[--surface-900] text-[--surface-0] rounded font-medium text-sm hover:bg-[--surface-800] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {#if isActionPending}
                  <Loader2 size={18} class="animate-spin" />
                {:else}
                  <Plus size={18} class="group-hover:rotate-90 transition-transform duration-300" />
                {/if}
                Create Room
              </button>

              <div class="flex items-center gap-3">
                <div class="flex-1 h-px bg-[--surface-200]"></div>
                <span class="text-[10px] text-[--surface-400] uppercase tracking-widest">or</span>
                <div class="flex-1 h-px bg-[--surface-200]"></div>
              </div>

              <div class="flex gap-2">
                <input 
                  type="text" 
                  bind:value={roomIdInput} 
                  disabled={isActionPending}
                  placeholder="Room ID"
                  class="flex-1 px-3 py-2.5 bg-[--surface-50] border border-[--surface-200] rounded text-sm focus:outline-none focus:border-[--surface-500] transition-all duration-200 disabled:opacity-50"
                />
                <button 
                  onclick={handleJoinRoom}
                  disabled={isActionPending || !roomIdInput}
                  class="px-4 py-2.5 bg-[--surface-100] text-[--surface-700] rounded hover:bg-[--surface-200] active:scale-[0.98] transition-all flex items-center gap-2 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <LogIn size={18} />
                </button>
              </div>
            </div>
          {:else}
            <div class="p-4 bg-[--surface-50] rounded space-y-4 animate-[fadeIn_0.3s_ease-out]">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full {transfer.status === 'connected' ? 'bg-[--surface-900] animate-pulse' : 'bg-[--surface-400]'}"></div>
                  <span class="text-[10px] text-[--surface-500] uppercase tracking-wider">
                    {transfer.status === 'connected' ? 'Connected' : 'Waiting...'}
                  </span>
                </div>
                <button 
                  type="button"
                  onclick={copyRoomId}
                  class="group flex items-center gap-1.5 px-2 py-1 text-[--surface-500] hover:text-[--surface-700] transition-colors text-xs cursor-pointer"
                >
                  {#if copiedState === 'copied'}
                    <Check size={12} class="text-[--surface-700] animate-[scaleIn_0.2s_ease-out]" />
                    <span class="animate-[fadeIn_0.2s_ease-out]">Copied</span>
                  {:else}
                    <Copy size={12} class="group-hover:scale-110 transition-transform" />
                    <span>Copy</span>
                  {/if}
                </button>
              </div>
              
              <div class="p-3 bg-[--surface-0] border border-[--surface-200] rounded">
                <p class="text-[11px] text-[--surface-600] font-mono break-all">{transfer.roomId}</p>
              </div>
              
              <div class="flex items-center gap-1.5 text-[9px] text-[--surface-400]">
                <ShieldCheck size={10} />
                End-to-end encrypted
              </div>
            </div>
          {/if}

          {#if transfer.status === 'connected'}
            <div class="space-y-4 pt-4 border-t border-[--surface-200] animate-[fadeIn_0.3s_ease-out_0.1s_both]">
              <div>
                <label for="file-upload" class="block text-[10px] text-[--surface-400] uppercase tracking-widest mb-2">
                  Select file
                </label>
                <div 
                  role="region"
                  aria-label="File drop zone"
                  class="group relative border-2 border-dashed {isDragging ? 'border-[--surface-700] bg-[--surface-100] scale-[1.02]' : isHovering ? 'border-[--surface-500] bg-[--surface-50]' : 'border-[--surface-300]'} rounded-lg p-6 transition-all duration-200 text-center cursor-pointer"
                  ondragover={handleDragOver}
                  ondragleave={handleDragLeave}
                  ondrop={handleDrop}
                  onmouseenter={() => isHovering = true}
                  onmouseleave={() => isHovering = false}
                >
                  <input 
                    id="file-upload"
                    type="file" 
                    onchange={handleFileChange}
                    class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {#if selectedFile}
                    <FileIcon size={24} class="mx-auto text-[--surface-600] mb-2 group-hover:scale-110 transition-transform" />
                    <p class="text-sm text-[--surface-800] truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                    <p class="text-xs text-[--surface-400] mt-0.5">{formatBytes(selectedFile.size)}</p>
                  {:else}
                    <FileIcon size={24} class="mx-auto text-[--surface-400] mb-2 group-hover:scale-110 transition-transform" />
                    <p class="text-sm text-[--surface-600]">Drop file here</p>
                    <p class="text-xs text-[--surface-400] mt-0.5">or click to browse</p>
                  {/if}
                </div>
              </div>

              <button 
                type="button"
                onclick={handleSendFile}
                disabled={!selectedFile || sendState !== 'idle'}
                class="group w-full py-3 bg-[--surface-900] text-[--surface-0] rounded font-medium text-sm hover:bg-[--surface-800] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer {sendState === 'sent' ? 'animate-[scaleIn_0.3s_ease-out]' : ''}"
              >
                {#if sendState === 'sending'}
                  <Loader2 size={18} class="animate-spin" />
                  <span>Sending...</span>
                {:else if sendState === 'sent'}
                  <ArrowUp size={18} class="animate-[translateYUp_0.5s_ease-out]" />
                  <span>Sent!</span>
                {:else}
                  <Send size={18} class="group-hover:-translate-y-0.5 transition-transform" />
                  <span>Send File</span>
                {/if}
              </button>

              {#if transfer.progress > 0}
                <div class="space-y-1">
                  <div class="flex justify-between text-[10px]">
                    <span class="text-[--surface-500]">Transferring</span>
                    <span class="text-[--surface-700]">{transfer.progress}%</span>
                  </div>
                  <div class="h-1 bg-[--surface-200] rounded-full overflow-hidden">
                    <div class="h-full bg-[--surface-800] transition-all duration-300 ease-out" style="width: {transfer.progress}%"></div>
                  </div>
                </div>
              {/if}

              {#if transfer.receivedFile}
                <div class="p-4 bg-[--surface-100] rounded flex items-center justify-between gap-3 animate-[fadeInUp_0.3s_ease-out]">
                  <div class="min-w-0">
                    <p class="text-[9px] text-[--surface-500] uppercase tracking-wider mb-0.5">Received</p>
                    <p class="text-sm text-[--surface-800] truncate">{transfer.receivedFile.name}</p>
                  </div>
                  <button 
                    type="button"
                    onclick={downloadFile}
                    disabled={downloadState !== 'idle'}
                    class="group px-4 py-2.5 bg-[--surface-900] text-[--surface-0] rounded text-xs font-medium hover:bg-[--surface-800] active:scale-[0.98] transition-all shadow-monolith shrink-0 cursor-pointer disabled:opacity-70 {downloadState === 'downloaded' ? 'animate-[scaleIn_0.3s_ease-out]' : ''}"
                  >
                    {#if downloadState === 'downloading'}
                      <Loader2 size={14} class="animate-spin" />
                    {:else if downloadState === 'downloaded'}
                      <Check size={14} class="animate-[scaleIn_0.2s_ease-out]" />
                    {:else}
                      <Download size={14} class="group-hover:scale-110 transition-transform" />
                    {/if}
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {:else}
        <div class="bg-[--surface-0] shadow-monolith rounded-lg p-10 flex flex-col items-center gap-6 animate-[fadeIn_0.4s_ease-out]">
          <div class="relative">
            <div class="w-16 h-16 border-[3px] border-[--surface-200] rounded-full flex items-center justify-center animate-[fadeIn_0.3s_ease-out_0.1s_both]">
              <div class="w-10 h-10 border-[2px] border-[--surface-300] border-t-[--surface-600] rounded-full animate-spin"></div>
            </div>
          </div>
          <div class="text-center space-y-1 animate-[fadeIn_0.3s_ease-out_0.2s_both]">
            <p class="text-sm font-medium text-[--surface-700]">Initializing</p>
            <p class="text-xs text-[--surface-400]">Setting up secure connection</p>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <footer class="py-8 text-center">
    <p class="text-[10px] text-[--surface-300] tracking-widest uppercase">P2P File Transfer</p>
    <div class="flex items-center justify-center gap-1.5 mt-2 text-xs text-[--surface-400]">
      <span>Made by</span>
      <a href="https://github.com/AyushmanTripathy" target="_blank" rel="noopener noreferrer" class="text-[--surface-600] hover:text-[--surface-800] transition-colors">
        @AyushmanTripathy
      </a>
      <span>with</span>
      <Heart size={12} class="text-[--surface-400]" />
      <span>WebRTC</span>
    </div>
  </footer>
</main>