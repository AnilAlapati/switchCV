interface MessageFieldProps {
  message: string;
  onChange: (value: string) => void;
  loading: boolean;
}

export function MessageField({ message, onChange, loading }: MessageFieldProps) {
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
        <span className="h-1 w-1 rounded-full bg-cyan-400"></span>
        Personal Message
        <span className="ml-auto text-xs font-normal text-slate-500">(Optional)</span>
      </label>
      <textarea
        value={message}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        placeholder="Hi! I'd love to learn more about your experience with..."
        maxLength={500}
        rows={5}
        className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-500 shadow-inner shadow-black/30 transition-all focus:border-cyan-500/60 focus:bg-slate-900/80 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-slate-500">{message.length}/500 characters</p>
        {message.length > 0 && <span className="text-xs text-emerald-400">✓ Looks good</span>}
      </div>
    </div>
  );
}
