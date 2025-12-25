interface MessageFieldProps {
  message: string;
  onChange: (value: string) => void;
  loading: boolean;
}

export function MessageField({ message, onChange, loading }: MessageFieldProps) {
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm font-bold text-[#1A2F25]">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        Personal Message
        <span className="ml-auto text-xs font-normal text-[#1A2F25]/40">(Optional)</span>
      </label>
      <textarea
        value={message}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        placeholder="Hi! I'd love to learn more about your experience with..."
        maxLength={500}
        rows={5}
        className="w-full resize-none rounded-xl border border-emerald-100 bg-emerald-50/30 px-4 py-3 text-[#1A2F25] placeholder-emerald-800/30 shadow-inner transition-all focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-[#1A2F25]/40">{message.length}/500 characters</p>
        {message.length > 0 && <span className="text-xs text-emerald-600 font-medium">✓ Looks good</span>}
      </div>
    </div>
  );
}
